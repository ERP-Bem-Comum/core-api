\section*{Monitoring Buffer Pool Load Progress Using Performance Schema}

You can monitor buffer pool load progress using Performance Schema.
The following example demonstrates how to enable the stage/innodb/buffer pool load stage event instrument and related consumer tables to monitor buffer pool load progress.

For information about buffer pool dump and load procedures used in this example, see Section 17.8.3.6, "Saving and Restoring the Buffer Pool State". For information about Performance Schema stage event instruments and related consumers, see Section 29.12.5, "Performance Schema Stage Event Tables".
1. Enable the stage/innodb/buffer pool load instrument:
```
mysql> UPDATE performance_schema.setup_instruments SET ENABLED = 'YES'
    WHERE NAME LIKE 'stage/innodb/buffer%';
```

2. Enable the stage event consumer tables, which include events_stages_current, events_stages_history, and events_stages_history_long.
```
mysql> UPDATE performance_schema.setup_consumers SET ENABLED = 'YES'
    WHERE NAME LIKE '%stages%';
```

3. Dump the current buffer pool state by enabling innodb_buffer_pool_dump_now.
```
mysql> SET GLOBAL innodb_buffer_pool_dump_now=ON;
```

4. Check the buffer pool dump status to ensure that the operation has completed.
```
mysql> SHOW STATUS LIKE 'Innodb_buffer_pool_dump_status'\G
*************************** 1. row *****************************
Variable_name: Innodb_buffer_pool_dump_status
    Value: Buffer pool(s) dump completed at 150202 16:38:58
```

5. Load the buffer pool by enabling innodb_buffer_pool_load_now:
```
mysql> SET GLOBAL innodb_buffer_pool_load_now=ON;
```

6. Check the current status of the buffer pool load operation by querying the Performance Schema events_stages_current table. The WORK_COMPLETED column shows the number of buffer pool pages loaded. The WORK_ESTIMATED column provides an estimate of the remaining work, in pages.
```
mysql> SELECT EVENT_NAME, WORK_COMPLETED, WORK_ESTIMATED
```

```
    FROM performance_schema.events_stages_current;
+---------------------------------+----------------+-----------------
| EVENT_NAME | WORK_COMPLETED | WORK_ESTIMATED |
+---------------------------------+----------------+------------------
| stage/innodb/buffer pool load | 5353 | 7167 |
```


The events_stages_current table returns an empty set if the buffer pool load operation has completed. In this case, you can check the events_stages_history table to view data for the completed event. For example:
```
mysql> SELECT EVENT_NAME, WORK_COMPLETED, WORK_ESTIMATED
    FROM performance_schema.events_stages_history;
+---------------------------------+---------------+-----------------
| EVENT_NAME | WORK_COMPLETED | WORK_ESTIMATED |
+---------------------------------+----------------+-----------------
| stage/innodb/buffer pool load | 7167 | 7167 |
+---------------------------------+----------------+----------------
```


\section*{Note}

You can also monitor buffer pool load progress using Performance Schema when loading the buffer pool at startup using innodb_buffer_pool_load_at_startup. In this case, the stage/ innodb/buffer pool load instrument and related consumers must be enabled at startup. For more information, see Section 29.3, "Performance Schema Startup Configuration".

\subsection*{17.8.3.7 Excluding or Including Buffer Pool Pages from Core Files}

A core file records the status and memory image of a running process. Because the buffer pool resides in main memory, and the memory image of a running process is dumped to the core file, systems with large buffer pools can produce large core files when the mysqld process dies.

Large core files can be problematic for a number of reasons including the time it takes to write them, the amount of disk space they consume, and the challenges associated with transferring large files.

Excluding buffer pool pages may also be desirable from a security perspective if you have concerns about dumping database pages to core files that may be shared inside or outside of your organization for debugging purposes.

\section*{Note}

Access to the data present in buffer pool pages at the time the mysqld process died may be beneficial in some debugging scenarios. If in doubt whether to include or exclude buffer pool pages, consult MySQL Support.

The innodb_buffer_pool_in_core_file option is only relevant if the core_file variable is enabled and the operating system supports the MADV_DONTDUMP non-POSIX extension to the madvise() system call, which is supported in Linux 3.4 and later. The MADV_DONTDUMP extension causes pages in a specified range to be excluded from core dumps. The innodb_buffer_pool_in_core_file option is disabled by default on systems that support MADV_DONTDUMP, otherwise it defaults to ON.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3103.jpg?height=127&width=99&top_left_y=2325&top_left_x=370)

\section*{Note}

Before MySQL 8.4, innodb_buffer_pool_in_core_file was enabled by default instead of disabled.

To generate core files with buffer pool pages, start the server with the --core-file and --innodb-buffer-pool-in-core-file=ON options.
```
$> mysqld --core-file --innodb-buffer-pool-in-core-file=ON
```


The core_file variable is read-only and disabled by default. It is enabled by specifying the --corefile option at startup. The innodb_buffer_pool_in_core_file variable is dynamic. It can be specified at startup or configured at runtime using a SET statement.
mysql> SET GLOBAL innodb_buffer_pool_in_core_file=OFF;
If the innodb_buffer_pool_in_core_file variable is disabled but MADV_DONTDUMP is not supported by the operating system, or an madvise ( ) failure occurs, a warning is written to the MySQL server error log and the core_file variable is disabled to prevent writing core files that unintentionally include buffer pool pages. If the read-only core_file variable becomes disabled, the server must be restarted to enable it again.

The following table shows configuration and MADV_DONTDUMP support scenarios that determine whether core files are generated and whether they include buffer pool pages.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.4 Core File Configuration Scenarios}
\begin{tabular}{|l|l|l|l|}
\hline core_file variable & innodb_buffer_pool variable & madvose() file MADV_DONTDUMP Support & Outcome \\
\hline OFF (default) & Not relevant to outcome & Not relevant to outcome & Core file is not generated \\
\hline ON & ON (default on systems without MADV_DONTDUMP support) & Not relevant to outcome & Core file is generated with buffer pool pages \\
\hline ON & OFF (default on systems with MADV_DONTDUMP support) & Yes & Core file is generated without buffer pool pages \\
\hline ON & OFF & No & Core file is not generated, core_file is disabled, and a warning is written to the server error log \\
\hline
\end{tabular}
\end{table}

The reduction in core file size achieved by disabling the innodb_buffer_pool_in_core_file variable depends on the size of the buffer pool, but it is also affected by the InnoDB page size. A smaller page size means more pages are required for the same amount of data, and more pages means more page metadata. The following table provides size reduction examples that you might see for a 1 GB buffer pool with different pages sizes.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.5 Core File Size with Buffer Pool Pages Included and Excluded}
\begin{tabular}{|l|l|l|}
\hline innodb_page_size Setting & Buffer Pool Pages Included (innodb_buffer_pool_in_co & Buffer Pool Pages Excluded (i_nfriblebjo(d)ffer_pool_in_core_file=00 \\
\hline 4 KB & 2.1 GB & 0.9 GB \\
\hline 64 KB & 1.7 GB & 0.7 GB \\
\hline
\end{tabular}
\end{table}

\subsection*{17.8.4 Configuring Thread Concurrency for InnoDB}

InnoDB uses operating system threads to process requests from user transactions. (Transactions may issue many requests to InnoDB before they commit or roll back.) On modern operating systems and servers with multi-core processors, where context switching is efficient, most workloads run well without any limit on the number of concurrent threads.

In situations where it is helpful to minimize context switching between threads, InnoDB can use a number of techniques to limit the number of concurrently executing operating system threads (and thus the number of requests that are processed at any one time). When InnoDB receives a new request
from a user session, if the number of threads concurrently executing is at a pre-defined limit, the new request sleeps for a short time before it tries again. Threads waiting for locks are not counted in the number of concurrently executing threads.

You can limit the number of concurrent threads by setting the configuration parameter innodb_thread_concurrency. Once the number of executing threads reaches this limit, additional threads sleep for a number of microseconds, set by the configuration parameter innodb_thread_sleep_delay, before being placed into the queue.

You can set the configuration option innodb_adaptive_max_sleep_delay to the highest value you would allow for innodb_thread_sleep_delay, and InnoDB automatically adjusts innodb_thread_sleep_delay up or down depending on the current thread-scheduling activity. This dynamic adjustment helps the thread scheduling mechanism to work smoothly during times when the system is lightly loaded and when it is operating near full capacity.

The default value for innodb_thread_concurrency and the implied default limit on the number of concurrent threads has been changed in various releases of MySQL and InnoDB. The default value of innodb_thread_concurrency is 0 , so that by default there is no limit on the number of concurrently executing threads.

InnoDB causes threads to sleep only when the number of concurrent threads is limited. When there is no limit on the number of threads, all contend equally to be scheduled. That is, if innodb_thread_concurrency is 0, the value of innodb_thread_sleep_delay is ignored.

When there is a limit on the number of threads (when innodb_thread_concurrency is > 0 ), InnoDB reduces context switching overhead by permitting multiple requests made during the execution of a single SQL statement to enter InnoDB without observing the limit set by innodb_thread_concurrency. Since an SQL statement (such as a join) may comprise multiple row operations within InnoDB, InnoDB assigns a specified number of "tickets" that allow a thread to be scheduled repeatedly with minimal overhead.

When a new SQL statement starts, a thread has no tickets, and it must observe innodb_thread_concurrency. Once the thread is entitled to enter InnoDB, it is assigned a number of tickets that it can use for subsequently entering InnoDB to perform row operations. If the tickets run out, the thread is evicted, and innodb_thread_concurrency is observed again which may place the thread back into the first-in/first-out queue of waiting threads. When the thread is once again entitled to enter InnoDB, tickets are assigned again. The number of tickets assigned is specified by the global option innodb_concurrency_tickets, which is 5000 by default. A thread that is waiting for a lock is given one ticket once the lock becomes available.

The correct values of these variables depend on your environment and workload. Try a range of different values to determine what value works for your applications. Before limiting the number of concurrently executing threads, review configuration options that may improve the performance of InnoDB on multi-core and multi-processor computers, such as innodb_adaptive_hash_index.

For general performance information about MySQL thread handling, see Section 7.1.12.1, "Connection Interfaces".

\subsection*{17.8.5 Configuring the Number of Background InnoDB I/O Threads}

InnoDB uses background threads to service various types of I/O requests. You can configure the number of background threads that service read and write I/O on data pages using the innodb_read_io_threads and innodb_write_io_threads configuration parameters. These parameters signify the number of background threads used for read and write requests, respectively. They are effective on all supported platforms. You can set values for these parameters in the MySQL option file (my.cnf or my.ini); you cannot change values dynamically. The default value for innodb_read_io_threads is the number of available logical processors on the system divided by 2 , with a minimum default value of 4 . The default value for innodb_write_io_threads is 4 . The permissible values range from 1-64 for both options.

The purpose of these configuration options to make InnoDB more scalable on high end systems. Each background thread can handle up to 256 pending I/O requests. A major source of background I/O is read-ahead requests. InnoDB tries to balance the load of incoming requests in such way that most background threads share work equally. InnoDB also attempts to allocate read requests from the same extent to the same thread, to increase the chances of coalescing the requests. If you have a high end I/O subsystem and you see more than $64 \times$ innodb_read_io_threads pending read requests in SHOW ENGINE INNODB STATUS output, you might improve performance by increasing the value of innodb_read_io_threads.

On Linux systems, InnoDB uses the asynchronous I/O subsystem by default to perform read-ahead and write requests for data file pages, which changes the way that InnoDB background threads service these types of I/O requests. For more information, see Section 17.8.6, "Using Asynchronous I/O on Linux".

For more information about InnoDB I/O performance, see Section 10.5.8, "Optimizing InnoDB Disk I/ O".

\subsection*{17.8.6 Using Asynchronous I/O on Linux}

InnoDB uses the asynchronous I/O subsystem (native AIO) on Linux to perform read-ahead and write requests for data file pages. This behavior is controlled by the innodb_use_native_aio configuration option, which applies to Linux systems only and is enabled by default. On other Unixlike systems, InnoDB uses synchronous I/O only. Historically, InnoDB only used asynchronous I/O on Windows systems. Using the asynchronous I/O subsystem on Linux requires the libaio library.

With synchronous I/O, query threads queue I/O requests, and InnoDB background threads retrieve the queued requests one at a time, issuing a synchronous I/O call for each. When an I/O request is completed and the I/O call returns, the InnoDB background thread that is handling the request calls an I/O completion routine and returns to process the next request. The number of requests that can be processed in parallel is $n$, where $n$ is the number of InnoDB background threads. The number of InnoDB background threads is controlled by innodb_read_io_threads and innodb_write_io_threads. See Section 17.8.5, "Configuring the Number of Background InnoDB I/ O Threads".

With native AIO, query threads dispatch I/O requests directly to the operating system, thereby removing the limit imposed by the number of background threads. InnoDB background threads wait for I/O events to signal completed requests. When a request is completed, a background thread calls an I/ O completion routine and resumes waiting for I/O events.

The advantage of native AIO is scalability for heavily I/O-bound systems that typically show many pending reads and writes in SHOW ENGINE INNODB STATUS output. The increase in parallel processing when using native AIO means that the type of I/O scheduler or properties of the disk array controller have a greater influence on I/O performance.

A potential disadvantage of native AIO for heavily I/O-bound systems is lack of control over the number of I/O write requests dispatched to the operating system at once. Too many I/O write requests dispatched to the operating system for parallel processing could, in some cases, result in I/O read starvation, depending on the amount of I/O activity and system capabilities.

If a problem with the asynchronous I/O subsystem in the OS prevents InnoDB from starting, you can start the server with innodb_use_native_aio=0. This option may also be disabled automatically during startup if InnoDB detects a potential problem such as a combination of tmpdir location, tmpfs file system, and Linux kernel that does not support asynchronous I/O on tmpfs.

\subsection*{17.8.7 Configuring InnoDB I/O Capacity}

The InnoDB master thread and other threads perform various tasks in the background, most of which are I/O related, such as flushing dirty pages from the buffer pool and writing changes from the change buffer to the appropriate secondary indexes. InnoDB attempts to perform these tasks in a way
that does not adversely affect the normal working of the server. It tries to estimate the available I/O bandwidth and tune its activities to take advantage of available capacity.

The innodb_io_capacity variable defines the overall I/O capacity available to InnoDB. It should be set to approximately the number of I/O operations that the system can perform per second (IOPS). When innodb_io_capacity is set, InnoDB estimates the I/O bandwidth available for background tasks based on the set value.

You can set innodb_io_capacity to a value of 100 or greater. The default value is 10000 . Typically, faster hard drives, RAID configurations, and solid state drives (SSDs) benefit from higher values than do lower-end storage devices, such as hard drives up to 7200 RPMs.

Ideally, keep the setting as low as practical, but not so low that background activities fall behind. If the value is too high, data is removed from the buffer pool and change buffer too quickly for caching to provide a significant benefit. For busy systems capable of higher I/O rates, you can set a higher value to help the server handle the background maintenance work associated with a high rate of row changes. Generally, you can increase the value as a function of the number of drives used for InnoDB I/O. For example, you can increase the value on systems that use multiple disks or SSDs.

Although you can specify a high value such as a million, in practice such large values have little benefit. Generally, a value higher than 20000 is not recommended unless you are certain that lower values are insufficient for your workload. See also the innodb_io_capacity_max option that automatically increases this value when flushing falls behind.

Consider write workload when tuning innodb_io_capacity. Systems with large write workloads are likely to benefit from a higher setting. A lower setting may be sufficient for systems with a small write workload.

The innodb_io_capacity setting is not a per buffer pool instance setting. Available I/O capacity is distributed equally among buffer pool instances for flushing activities.

You can set the innodb_io_capacity value in the MySQL option file (my.cnf or my.ini) or modify it at runtime using a SET GLOBAL statement, which requires privileges sufficient to set global system variables. See Section 7.1.9.1, "System Variable Privileges".

\section*{Ignoring I/O Capacity at Checkpoints}

The innodb_flush_sync variable, which is enabled by default, causes the innodb_io_capacity setting to be ignored during bursts of I/O activity that occur at checkpoints. To adhere to the I/O rate defined by the innodb_io_capacity and innodb_io_capacity_max settings, disable innodb_flush_sync.

You can set the innodb_flush_sync value in the MySQL option file (my. cnf or my. ini) or modify it at runtime using a SET GLOBAL statement, which requires privileges sufficient to set global system variables. See Section 7.1.9.1, "System Variable Privileges".

\section*{Configuring an I/O Capacity Maximum}

If flushing activity falls behind, InnoDB can flush more aggressively, at a higher rate of I/ O operations per second (IOPS) than defined by the innodb_io_capacity variable. The innodb_io_capacity_max variable defines a maximum number of IOPS performed by InnoDB background tasks in such situations.

If you specify an innodb_io_capacity setting at startup but do not specify a value for innodb_io_capacity_max, innodb_io_capacity_max defaults to twice the value of innodb_io_capacity.

When configuring innodb_io_capacity_max, twice the innodb_io_capacity is often a good starting point. As with the innodb_io_capacity setting, keep the setting as low as practical, but not so low that InnoDB cannot sufficiently extend rate of IOPS beyond the innodb_io_capacity setting.

Consider write workload when tuning innodb_io_capacity_max. Systems with large write workloads may benefit from a higher setting. A lower setting may be sufficient for systems with a small write workload.
innodb_io_capacity_max cannot be set to a value lower than the innodb_io_capacity value.
Setting innodb_io_capacity_max to DEFAULT using a SET statement (SET GLOBAL innodb_io_capacity_max=DEFAULT) sets innodb_io_capacity_max to the default value. Before MySQL 8.4, this set it to the maximum value instead of the default value.

The innodb_io_capacity_max limit applies to all buffer pool instances. It is not a per buffer pool instance setting.

\subsection*{17.8.8 Configuring Spin Lock Polling}

InnoDB mutexes and rw-locks are typically reserved for short intervals. On a multi-core system, it can be more efficient for a thread to continuously check if it can acquire a mutex or rw-lock for a period of time before it sleeps. If the mutex or rw-lock becomes available during this period, the thread can continue immediately, in the same time slice. However, too-frequent polling of a shared object such as a mutex or rw-lock by multiple threads can cause "cache ping pong", which results in processors invalidating portions of each other's cache. InnoDB minimizes this issue by forcing a random delay between polls to desynchronize polling activity. The random delay is implemented as a spin-wait loop.

The duration of a spin-wait loop is determined by the number of PAUSE instructions that occur in the loop. That number is generated by randomly selecting an integer ranging from 0 up to but not including the innodb_spin_wait_delay value, and multiplying that value by 50 . For example, an integer is randomly selected from the following range for an innodb_spin_wait_delay setting of 6:
\{0,1,2,3,4,5\}
The selected integer is multiplied by 50 , resulting in one of six possible PAUSE instruction values:
$\{0,50,100,150,200,250\}$
For that set of values, 250 is the maximum number of PAUSE instructions that can occur in a spinwait loop. An innodb_spin_wait_delay setting of 5 results in a set of five possible values $\{0,50,100,150,200\}$, where 200 is the maximum number of PAUSE instructions, and so on. In this way, the innodb_spin_wait_delay setting controls the maximum delay between spin lock polls.

On a system where all processor cores share a fast cache memory, you might reduce the maximum delay or disable the busy loop altogether by setting innodb_spin_wait_delay=0. On a system with multiple processor chips, the effect of cache invalidation can be more significant and you might increase the maximum delay.

In the 100 MHz Pentium era, an innodb_spin_wait_delay unit was calibrated to be equivalent to one microsecond. That time equivalence did not hold, but PAUSE instruction duration remained fairly constant in terms of processor cycles relative to other CPU instructions until the introduction of the Skylake generation of processors, which have a comparatively longer PAUSE instruction. The innodb_spin_wait_pause_multiplier variable provides a way to account for differences in PAUSE instruction duration.

The innodb_spin_wait_pause_multiplier variable controls the size of PAUSE instruction values. For example, assuming an innodb_spin_wait_delay setting of 6, decreasing the innodb_spin_wait_pause_multiplier value from 50 (the default and previously hardcoded value) to 5 generates a set of smaller PAUSE instruction values:
\{0,5,10,15,20,25\}
The ability to increase or decrease PAUSE instruction values permits fine tuning InnoDB for different processor architectures. Smaller PAUSE instruction values would be appropriate for processor architectures with a comparatively longer PAUSE instruction, for example.

The innodb_spin_wait_delay and innodb_spin_wait_pause_multiplier variables are dynamic. They can be specified in a MySQL option file or modified at runtime using a SET GLOBAL statement. Modifying the variables at runtime requires privileges sufficient to set global system variables. See Section 7.1.9.1, "System Variable Privileges".

\subsection*{17.8.9 Purge Configuration}

InnoDB does not physically remove a row from the database immediately when you delete it with an SQL statement. A row and its index records are only physically removed when InnoDB discards the undo log record written for the deletion. This removal operation, which only occurs after the row is no longer required for multi-version concurrency control (MVCC) or rollback, is called a purge.

Purge runs on a periodic schedule. It parses and processes undo log pages from the history list, which is a list of undo log pages for committed transactions that is maintained by the InnoDB transaction system. Purge frees the undo log pages from the history list after processing them.

\section*{Configuring Purge Threads}

Purge operations are performed in the background by one or more purge threads. The number of purge threads is controlled by the innodb_purge_threads variable. The default value is 1 if the number of available logical processors is <= 16, otherwise the default is 4.

If DML action is concentrated on a single table, purge operations for the table are performed by a single purge thread, which can result in slowed purge operations, increased purge lag, and increased tablespace file size if the DML operations involve large object values. If the innodb_max_purge_lag setting is exceeded, purge work is automatically redistributed among available purge threads. Too many active purge threads in this scenario can cause contention with user threads, so manage the innodb_purge_threads setting accordingly. The innodb_max_purge_lag variable is set to 0 by default, which means that there is no maximum purge lag by default.

If DML action is concentrated on few tables, keep the innodb_purge_threads setting low so that the threads do not contend with each other for access to the busy tables. If DML operations are spread across many tables, consider a higher innodb_purge_threads setting. The maximum number of purge threads is 32.

The innodb_purge_threads setting is the maximum number of purge threads permitted. The purge system automatically adjusts the number of purge threads that are used.

\section*{Configuring Purge Batch Size}

The innodb_purge_batch_size variable defines the number of undo log pages that purge parses and processes in one batch from the history list. The default value is 300 . In a multithreaded purge configuration, the coordinator purge thread divides innodb_purge_batch_size by innodb_purge_threads and assigns that number of pages to each purge thread.

The purge system also frees the undo log pages that are no longer required. It does so every 128 iterations through the undo logs. In addition to defining the number of undo log pages parsed and processed in a batch, the innodb_purge_batch_size variable defines the number of undo log pages that purge frees every 128 iterations through the undo logs.

The innodb_purge_batch_size variable is intended for advanced performance tuning and experimentation. Most users need not change innodb_purge_batch_size from its default value.

\section*{Configuring the Maximum Purge Lag}

The innodb_max_purge_lag variable defines the desired maximum purge lag. When the purge lag exceeds the innodb_max_purge_lag threshold, a delay is imposed on INSERT, UPDATE, and DELETE operations to allow time for purge operations to catch up. The default value is 0 , which means there is no maximum purge lag and no delay.

The InnoDB transaction system maintains a list of transactions that have index records delete-marked by UPDATE or DELETE operations. The length of the list is the purge lag.

The purge lag delay is calculated by the following formula:
```
(purge_lag/innodb_max_purge_lag - 0.9995) * 10000
```


The delay is calculated at the beginning of a purge batch.
A typical innodb_max_purge_lag setting for a problematic workload might be 1000000 (1 million), assuming that transactions are small, only 100 bytes in size, and it is permissible to have 100 MB of unpurged table rows.

The purge lag is presented as the History list length value in the TRANSACTIONS section of SHOW ENGINE INNODB STATUS output.
```
mysql> SHOW ENGINE INNODB STATUS;
...
-------------
TRANSACTIONS
-------------
Trx id counter 0 290328385
Purge done for trx's n:o < 0 290315608 undo n:o < 0 17
History list length 20
```


The History list length is typically a low value, usually less than a few thousand, but a writeheavy workload or long running transactions can cause it to increase, even for transactions that are read only. The reason that a long running transaction can cause the History list length to increase is that under a consistent read transaction isolation level such as REPEATABLE READ, a transaction must return the same result as when the read view for that transaction was created. Consequently, the InnoDB multi-version concurrency control (MVCC) system must keep a copy of the data in the undo log until all transactions that depend on that data have completed. The following are examples of long running transactions that could cause the History list length to increase:
- A mysqldump operation that uses the --single-transaction option while there is a significant amount of concurrent DML.
- Running a SELECT query after disabling autocommit, and forgetting to issue an explicit COMMIT or ROLLBACK.

To prevent excessive delays in extreme situations where the purge lag becomes huge, you can limit the delay by setting the innodb_max_purge_lag_delay variable. The innodb_max_purge_lag_delay variable specifies the maximum delay in microseconds for the delay imposed when the innodb_max_purge_lag threshold is exceeded. The specified innodb_max_purge_lag_delay value is an upper limit on the delay period calculated by the innodb_max_purge_lag formula.

\section*{Purge and Undo Tablespace Truncation}

The purge system is also responsible for truncating undo tablespaces. You can configure the innodb_purge_rseg_truncate_frequency variable to control the frequency with which the purge system looks for undo tablespaces to truncate. For more information, see Truncating Undo Tablespaces.

\subsection*{17.8.10 Configuring Optimizer Statistics for InnoDB}

This section describes how to configure persistent and non-persistent optimizer statistics for InnoDB tables.

Persistent optimizer statistics are persisted across server restarts, allowing for greater plan stability and more consistent query performance. Persistent optimizer statistics also provide control and flexibility with these additional benefits:
- You can use the innodb_stats_auto_recalc configuration option to control whether statistics are updated automatically after substantial changes to a table.
- You can use the STATS_PERSISTENT, STATS_AUTO_RECALC, and STATS_SAMPLE_PAGES clauses with CREATE TABLE and ALTER TABLE statements to configure optimizer statistics for individual tables.
- You can query optimizer statistics data in the mysql.innodb_table_stats and mysql.innodb_index_stats tables.
- You can view the last_update column of the mysql.innodb_table_stats and mysql.innodb_index_stats tables to see when statistics were last updated.
- You can manually modify the mysql.innodb_table_stats and mysql.innodb_index_stats tables to force a specific query optimization plan or to test alternative plans without modifying the database.

The persistent optimizer statistics feature is enabled by default (innodb_stats_persistent=ON).
Non-persistent optimizer statistics are cleared on each server restart and after some other operations, and recomputed on the next table access. As a result, different estimates could be produced when recomputing statistics, leading to different choices in execution plans and variations in query performance.

This section also provides information about estimating ANALYZE TABLE complexity, which may be useful when attempting to achieve a balance between accurate statistics and ANALYZE TABLE execution time.

\subsection*{17.8.10.1 Configuring Persistent Optimizer Statistics Parameters}

The persistent optimizer statistics feature improves plan stability by storing statistics to disk and making them persistent across server restarts so that the optimizer is more likely to make consistent choices each time for a given query.

Optimizer statistics are persisted to disk when innodb_stats_persistent=ON or when individual tables are defined with STATS_PERSISTENT=1. innodb_stats_persistent is enabled by default.

Formerly, optimizer statistics were cleared when restarting the server and after some other types of operations, and recomputed on the next table access. Consequently, different estimates could be produced when recalculating statistics leading to different choices in query execution plans and variation in query performance.

Persistent statistics are stored in the mysql.innodb_table_stats and mysql.innodb_index_stats tables. See InnoDB Persistent Statistics Tables.

If you prefer not to persist optimizer statistics to disk, see Section 17.8.10.2, "Configuring NonPersistent Optimizer Statistics Parameters"

\section*{Configuring Automatic Statistics Calculation for Persistent Optimizer Statistics}

The innodb_stats_auto_recalc variable, which is enabled by default, controls whether statistics are calculated automatically when a table undergoes changes to more than $10 \%$ of its rows. You can also configure automatic statistics recalculation for individual tables by specifying the STATS_AUTO_RECALC clause when creating or altering a table.

Because of the asynchronous nature of automatic statistics recalculation, which occurs in the background, statistics may not be recalculated instantly after running a DML operation that affects more than $10 \%$ of a table, even when innodb_stats_auto_recalc is enabled. Statistics recalculation can be delayed by few seconds in some cases. If up-to-date statistics are required immediately, run ANALYZE TABLE to initiate a synchronous (foreground) recalculation of statistics.

If innodb_stats_auto_recalc is disabled, you can ensure the accuracy of optimizer statistics by executing the ANALYZE TABLE statement after making substantial changes to indexed columns. You might also consider adding ANALYZE TABLE to setup scripts that you run after loading data, and running ANALYZE TABLE on a schedule at times of low activity.

When an index is added to an existing table, or when a column is added or dropped, index statistics are calculated and added to the innodb_index_stats table regardless of the value of innodb_stats_auto_recalc.

For a histogram with AUTO UPDATE enabled (see Histogram Statistics Analysis), automatic recalculation of persistent statistics also causes the histogram to be updated.

\section*{Configuring Optimizer Statistics Parameters for Individual Tables}
innodb_stats_persistent, innodb_stats_auto_recalc, and innodb_stats_persistent_sample_pages are global variables. To override these systemwide settings and configure optimizer statistics parameters for individual tables, you can define STATS_PERSISTENT, STATS_AUTO_RECALC, and STATS_SAMPLE_PAGES clauses in CREATE TABLE or ALTER TABLE statements.
- STATS_PERSISTENT specifies whether to enable persistent statistics for an InnoDB table. The value DEFAULT causes the persistent statistics setting for the table to be determined by the innodb_stats_persistent setting. A value of 1 enables persistent statistics for the table, while a value of 0 disables the feature. After enabling persistent statistics for an individual table, use ANALYZE TABLE to calculate statistics after table data is loaded.
- STATS_AUTO_RECALC specifies whether to automatically recalculate persistent statistics. The value DEFAULT causes the persistent statistics setting for the table to be determined by the innodb_stats_auto_recalc setting. A value of 1 causes statistics to be recalculated when $10 \%$ of table data has changed. A value 0 prevents automatic recalculation for the table. When using a value of 0 , use ANALYZE TABLE to recalculate statistics after making substantial changes to the table.
- STATS_SAMPLE_PAGES specifies the number of index pages to sample when cardinality and other statistics are calculated for an indexed column, by an ANALYZE TABLE operation, for example.

All three clauses are specified in the following CREATE TABLE example:
```
CREATE TABLE ˋt1ˋ (
ˋidˋ int(8) NOT NULL auto_increment,
ˋdataˋ varchar(255),
ˋdateˋ datetime,
PRIMARY KEY (ˋidˋ),
INDEX ˋDATE_IXˋ (ˋdateˋ)
) ENGINE=InnoDB,
    STATS_PERSISTENT=1,
    STATS_AUTO_RECALC=1,
    STATS_SAMPLE_PAGES=25;
```


\section*{Configuring the Number of Sampled Pages for InnoDB Optimizer Statistics}

The optimizer uses estimated statistics about key distributions to choose the indexes for an execution plan, based on the relative selectivity of the index. Operations such as ANALYZE TABLE cause InnoDB to sample random pages from each index on a table to estimate the cardinality of the index. This sampling technique is known as a random dive.

The innodb_stats_persistent_sample_pages controls the number of sampled pages. You can adjust the setting at runtime to manage the quality of statistics estimates used by the optimizer. The default value is 20 . Consider modifying the setting when encountering the following issues:
1. Statistics are not accurate enough and the optimizer chooses suboptimal plans, as shown in EXPLAIN output. You can check the accuracy of statistics by comparing the actual cardinality of an
index (determined by running SELECT DISTINCT on the index columns) with the estimates in the mysql.innodb_index_stats table.

If it is determined that statistics are not accurate enough, the value of innodb_stats_persistent_sample_pages should be increased until the statistics estimates are sufficiently accurate. Increasing innodb_stats_persistent_sample_pages too much, however, could cause ANALYZE TABLE to run slowly.
2. ANALYZE TABLE is too slow. In this case innodb_stats_persistent_sample_pages should be decreased until ANALYZE TABLE execution time is acceptable. Decreasing the value too much, however, could lead to the first problem of inaccurate statistics and suboptimal query execution plans.

If a balance cannot be achieved between accurate statistics and ANALYZE TABLE execution time, consider decreasing the number of indexed columns in the table or limiting the number of partitions to reduce ANALYZE TABLE complexity. The number of columns in the table's primary key is also important to consider, as primary key columns are appended to each nonunique index.

For related information, see Section 17.8.10.3, "Estimating ANALYZE TABLE Complexity for InnoDB Tables".

\section*{Including Delete-marked Records in Persistent Statistics Calculations}

By default, InnoDB reads uncommitted data when calculating statistics. In the case of an uncommitted transaction that deletes rows from a table, delete-marked records are excluded when calculating row estimates and index statistics, which can lead to non-optimal execution plans for other transactions that are operating on the table concurrently using a transaction isolation level other than READ UNCOMMITTED. To avoid this scenario, innodb_stats_include_delete_marked can be enabled to ensure that delete-marked records are included when calculating persistent optimizer statistics.

When innodb_stats_include_delete_marked is enabled, ANALYZE TABLE considers deletemarked records when recalculating statistics.
innodb_stats_include_delete_marked is a global setting that affects all InnoDB tables, and it is only applicable to persistent optimizer statistics.

\section*{InnoDB Persistent Statistics Tables}

The persistent statistics feature relies on the internally managed tables in the mysql database, named innodb_table_stats and innodb_index_stats. These tables are set up automatically in all install, upgrade, and build-from-source procedures.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.6 Columns of innodb_table_stats}
\begin{tabular}{|l|l|}
\hline Column name & Description \\
\hline database_name & Database name \\
\hline table_name & Table name, partition name, or subpartition name \\
\hline last_update & A timestamp indicating the last time that InnoDB updated this row \\
\hline n_rows & The number of rows in the table \\
\hline clustered_index_size & The size of the primary index, in pages \\
\hline sum_of_other_index_sizes & The total size of other (non-primary) indexes, in pages \\
\hline
\end{tabular}
\end{table}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.7 Columns of innodb_index_stats}
\begin{tabular}{|l|l|}
\hline Column name & Description \\
\hline database_name & Database name \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Column name & Description \\
\hline table_name & Table name, partition name, or subpartition name \\
\hline index_name & Index name \\
\hline last_update & A timestamp indicating the last time the row was updated \\
\hline stat_name & The name of the statistic, whose value is reported in the stat_value column \\
\hline stat_value & The value of the statistic that is named in stat_name column \\
\hline sample_size & The number of pages sampled for the estimate provided in the stat_value column \\
\hline stat_description & Description of the statistic that is named in the stat_name column \\
\hline
\end{tabular}

The innodb_table_stats and innodb_index_stats tables include a last_update column that shows when index statistics were last updated:
```
mysql> SELECT * FROM innodb_table_stats \G
************************** 1. row ******************************
                database_name: sakila
                            table_name: actor
                        last_update: 2014-05-28 16:16:44
                                n_rows: 200
    clustered_index_size: 1
sum_of_other_index_sizes: 1
...
mysql> SELECT * FROM innodb_index_stats \G
************************** 1. row ******************************
    database_name: sakila
                table_name: actor
                index_name: PRIMARY
            last_update: 2014-05-28 16:16:44
                    stat_name: n_diff_pfx01
                stat_value: 200
            sample_size: 1
            ...
```


The innodb_table_stats and innodb_index_stats tables can be updated manually, which makes it possible to force a specific query optimization plan or test alternative plans without modifying the database. If you manually update statistics, use the FLUSH TABLE tbl_name statement to load the updated statistics.

Persistent statistics are considered local information, because they relate to the server instance. The innodb_table_stats and innodb_index_stats tables are therefore not replicated when automatic statistics recalculation takes place. If you run ANALYZE TABLE to initiate a synchronous recalculation of statistics, the statement is replicated (unless you suppressed logging for it), and recalculation takes place on replicas.

\section*{InnoDB Persistent Statistics Tables Example}

The innodb_table_stats table contains one row for each table. The following example demonstrates the type of data collected.

Table t1 contains a primary index (columns a, b) secondary index (columns c, d), and unique index (columns e, f):
```
CREATE TABLE t1 (
a INT, b INT, c INT, d INT, e INT, f INT,
PRIMARY KEY (a, b), KEY i1 (c, d), UNIQUE KEY i2uniq (e, f)
) ENGINE=INNODB;
```


After inserting five rows of sample data, table t1 appears as follows:
```
mysql> SELECT * FROM t1;
+---+---+------+------+------+------+
| a | b | c | d | e | f |
+---+---+-------+------+------+------+

\begin{tabular}{llll|l|l|l|l|}
$\mid$ & 1 & 1 & 1 & 10 & 11 & 100 & 101 \\
$\mid$ & 1 & 2 & 10 & 11 & 200 & 102 \\
$\mid$ & 1 & 3 & 10 & 11 & 100 & 103 \\
$\mid$ & 1 & 4 & 10 & 12 & 200 & 104 \\
$\mid$ & 1 & 5 & 10 & 12 & 100 & 105
\end{tabular}
```


To immediately update statistics, run ANALYZE TABLE (if innodb_stats_auto_recalc is enabled, statistics are updated automatically within a few seconds assuming that the $10 \%$ threshold for changed table rows is reached):
```
mysql> ANALYZE TABLE t1;
+---------+----------+----------+----------+
| Table | Op | Msg_type | Msg_text |
+---------+----------+----------+----------+
| test.t1 | analyze | status | OK |
+---------+----------+----------+----------+
```


Table statistics for table t1 show the last time InnoDB updated the table statistics (2014-03-14 $14: 36: 34$ ), the number of rows in the table (5), the clustered index size (1 page), and the combined size of the other indexes (2 pages).
```
mysql> SELECT * FROM mysql.innodb_table_stats WHERE table_name like 't1'\G
*************************** 1. row ****************************************
        database_name: test
                table_name: t1
            last_update: 2014-03-14 14:36:34
                    n_rows: 5
    clustered_index_size: 1
sum_of_other_index_sizes: 2
```


The innodb_index_stats table contains multiple rows for each index. Each row in the innodb_index_stats table provides data related to a particular index statistic which is named in the stat_name column and described in the stat_description column. For example:
```
mysql> SELECT index_name, stat_name, stat_value, stat_description
    FROM mysql.innodb_index_stats WHERE table_name like 't1';
+-------------+---------------+------------+----------------------------------
| index_name | stat_name | stat_value | stat_description |
+------------+--------------+------------+-----------------------------------
| PRIMARY | n_diff_pfx01 | 1 | a
| PRIMARY | n_diff_pfx02 | 5 | a,b
| PRIMARY | n_leaf_pages | 1 | Number of leaf pages in the index
| PRIMARY | size | 1 | Number of pages in the index
| i1 | n_diff_pfx01 | 1 | c
| i1 | n_diff_pfx02 | 2 | c,d
| i1 | n_diff_pfx03 | 2 | c,d,a
| i1 | n_diff_pfx04 | 5 | c,d,a,b
| i1 | n_leaf_pages | 1 | Number of leaf pages in the index
| i1 | size | 1 | Number of pages in the index
| i2uniq | n_diff_pfx01 | 2 | e
| i2uniq | n_diff_pfx02 | 5 | e,f
| i2uniq | n_leaf_pages | 1 | Number of leaf pages in the index
| i2uniq | size | 1 | Number of pages in the index |
```


The stat_name column shows the following types of statistics:
- size: Where stat_name=size, the stat_value column displays the total number of pages in the index.
- n_leaf_pages: Where stat_name=n_leaf_pages, the stat_value column displays the number of leaf pages in the index.
- n_diff_pfxNN: Where stat_name=n_diff_pfx01, the stat_value column displays the number of distinct values in the first column of the index. Where stat_name=n_diff_pfx02, the stat_value column displays the number of distinct values in the first two columns of the index, and so on. Where stat_name=n_diff_pfxNN, the stat_description column shows a comma separated list of the index columns that are counted.

To further illustrate the n_diff_pfxNN statistic, which provides cardinality data, consider once again the t1 table example that was introduced previously. As shown below, the t1 table is created with a primary index (columns a, b), a secondary index (columns c, d), and a unique index (columns e, f):
```
CREATE TABLE t1 (
    a INT, b INT, c INT, d INT, e INT, f INT,
    PRIMARY KEY (a, b), KEY i1 (c, d), UNIQUE KEY i2uniq (e, f)
) ENGINE=INNODB;
```


After inserting five rows of sample data, table t1 appears as follows:
```
mysql> SELECT * FROM t1;
+---+---+------+------+------+------+
| a | b | c | d | e | f |
+---+---+------+------+------+------+

\begin{tabular}{llll|l|l|l|l|}
$\mid$ & 1 & 1 & 1 & 10 & 11 & 100 & 101 \\
$\mid$ & 1 & 2 & $\mid$ & 10 & 11 & 200 & 102 \\
$\mid$ & 1 & 3 & 10 & 11 & 100 & 103 \\
$\mid$ & 1 & 4 & 10 & 12 & 200 & 104 \\
$\mid$ & 1 & 5 & 10 & 12 & 100 & 105 & $\mid$ \\
\hline
\end{tabular}
```


When you query the index_name, stat_name, stat_value, and stat_description, where stat_name LIKE 'n_diff\%', the following result set is returned:
```
mysql> SELECT index_name, stat_name, stat_value, stat_description
        FROM mysql.innodb_index_stats
        WHERE table_name like 't1' AND stat_name LIKE 'n_diff%';
+-------------+---------------+------------+------------------+
| index_name | stat_name | stat_value | stat_description |
+-------------+---------------+------------+------------------
| PRIMARY | n_diff_pfx01 | 1 | a
| PRIMARY | n_diff_pfx02 | 5 | a,b
| i1 | n_diff_pfx01 | 1 | c
| i1 | n_diff_pfx02 | 2 | c,d
| i1 | n_diff_pfx03 | 2 | c,d,a
| i1 | n_diff_pfx04 | 5 | c,d,a,b
| i2uniq | n_diff_pfx01 | 2 | e
| i2uniq | n_diff_pfx02 | 5 | e,f
+-------------+---------------+------------+-----------------+
```


For the PRIMARY index, there are two $\mathrm{n} \_\mathrm{diff} \%$ rows. The number of rows is equal to the number of columns in the index.

1

\section*{Note}

For nonunique indexes, InnoDB appends the columns of the primary key.
- Where index_name=PRIMARY and stat_name=n_diff_pfx01, the stat_value is 1 , which indicates that there is a single distinct value in the first column of the index (column a). The number of distinct values in column a is confirmed by viewing the data in column a in table t1, in which there is a single distinct value (1). The counted column (a) is shown in the stat_description column of the result set.
- Where index_name=PRIMARY and stat_name=n_diff_pfx02, the stat_value is 5 , which indicates that there are five distinct values in the two columns of the index ( $\mathrm{a}, \mathrm{b}$ ). The number of distinct values in columns $a$ and $b$ is confirmed by viewing the data in columns $a$ and $b$ in table $t 1$, in which there are five distinct values: $(1,1),(1,2),(1,3),(1,4)$ and $(1,5)$. The counted columns $(\mathrm{a}, \mathrm{b})$ are shown in the stat_description column of the result set.

For the secondary index (i1), there are four n_diff\% rows. Only two columns are defined for the secondary index ( $\mathrm{c}, \mathrm{d}$ ) but there are four $\mathrm{n} \_\mathrm{diff} \%$ rows for the secondary index because InnoDB suffixes all nonunique indexes with the primary key. As a result, there are four n_diff\% rows instead of two to account for the both the secondary index columns ( $\mathrm{c}, \mathrm{d}$ ) and the primary key columns ( $\mathrm{a}, \mathrm{b}$ ).
- Where index_name=i1 and stat_name=n_diff_pfx01, the stat_value is 1 , which indicates that there is a single distinct value in the first column of the index (column c). The number of distinct values in column c is confirmed by viewing the data in column c in table t1, in which there is a single distinct value: (10). The counted column (c) is shown in the stat_description column of the result set.
- Where index_name=i1 and stat_name=n_diff_pfx02, the stat_value is 2 , which indicates that there are two distinct values in the first two columns of the index ( $\mathrm{c}, \mathrm{d}$ ). The number of distinct values in columns c an d is confirmed by viewing the data in columns c and d in table t1, in which there are two distinct values: $(10,11)$ and $(10,12)$. The counted columns $(c, d)$ are shown in the stat_description column of the result set.
- Where index_name=i1 and stat_name=n_diff_pfx03, the stat_value is 2, which indicates that there are two distinct values in the first three columns of the index ( $\mathrm{c}, \mathrm{d}, \mathrm{a}$ ). The number of distinct values in columns c, d, and a is confirmed by viewing the data in column c, d, and a in table t 1 , in which there are two distinct values: $(10,11,1)$ and $(10,12,1)$. The counted columns $(\mathrm{c}, \mathrm{d}, \mathrm{a})$ are shown in the stat_description column of the result set.
- Where index_name=i1 and stat_name=n_diff_pfx04, the stat_value is 5, which indicates that there are five distinct values in the four columns of the index ( $\mathrm{c}, \mathrm{d}, \mathrm{a}, \mathrm{b}$ ). The number of distinct values in columns $\mathrm{c}, \mathrm{d}, \mathrm{a}$ and b is confirmed by viewing the data in columns $c, d, a$ and $b$ in table $t 1$, in which there are five distinct values: $(10,11,1,1),(10,11,1,2)$, $(10,11,1,3),(10,12,1,4)$, and $(10,12,1,5)$. The counted columns $(c, d, a, b)$ are shown in the stat_description column of the result set.

For the unique index (i2uniq), there are two n_diff\% rows.
- Where index_name=i2uniq and stat_name=n_diff_pfx01, the stat_value is 2 , which indicates that there are two distinct values in the first column of the index (column e). The number of distinct values in column e is confirmed by viewing the data in column e in table t1, in which there are two distinct values: (100) and (200). The counted column (e) is shown in the stat_description column of the result set.
- Where index_name=i2uniq and stat_name=n_diff_pfx02, the stat_value is 5 , which indicates that there are five distinct values in the two columns of the index ( $\mathrm{e}, \mathrm{f}$ ). The number of distinct values in columns e and $f$ is confirmed by viewing the data in columns e and $f$ in table t1, in which there are five distinct values: $(100,101),(200,102),(100,103),(200,104)$, and $(100,105)$. The counted columns (e, f) are shown in the stat_description column of the result set.

\section*{Retrieving Index Size Using the innodb_index_stats Table}

You can retrieve the index size for tables, partitions, or subpartitions can using the innodb_index_stats table. In the following example, index sizes are retrieved for table t1. For a definition of table t1 and corresponding index statistics, see InnoDB Persistent Statistics Tables Example.
```
mysql> SELECT SUM(stat_value) pages, index_name,
    SUM(stat_value)*@@innodb_page_size size
    FROM mysql.innodb_index_stats WHERE table_name='t1'
    AND stat_name = 'size' GROUP BY index_name;
+-------+-------------+-------+
| pages | index_name | size |
+-------+-------------+-------+
| 1 | PRIMARY | 16384 |
| 1 | i1 \ 16384 |
+-------+-------------+-------+
```


For partitions or subpartitions, you can use the same query with a modified WHERE clause to retrieve index sizes. For example, the following query retrieves index sizes for partitions of table t1:
```
mysql> SELECT SUM(stat_value) pages, index_name,
    SUM(stat_value)*@@innodb_page_size size
    FROM mysql.innodb_index_stats WHERE table_name like 't1#P%'
    AND stat_name = 'size' GROUP BY index_name;
```


\subsection*{17.8.10.2 Configuring Non-Persistent Optimizer Statistics Parameters}

This section describes how to configure non-persistent optimizer statistics. Optimizer statistics are not persisted to disk when innodb_stats_persistent=0FF or when individual tables are created or altered with STATS_PERSISTENT=0. Instead, statistics are stored in memory, and are lost when the server is shut down. Statistics are also updated periodically by certain operations and under certain conditions.

Optimizer statistics are persisted to disk by default, enabled by the innodb_stats_persistent configuration option. For information about persistent optimizer statistics, see Section 17.8.10.1, "Configuring Persistent Optimizer Statistics Parameters".

\section*{Optimizer Statistics Updates}

Non-persistent optimizer statistics are updated when:
- Running ANALYZE TABLE.
- Running SHOW TABLE STATUS, SHOW INDEX, or querying the Information Schema TABLES or STATISTICS tables with the innodb_stats_on_metadata option enabled.

The default setting for innodb_stats_on_metadata is OFF. Enabling innodb_stats_on_metadata may reduce access speed for schemas that have a large number of tables or indexes, and reduce stability of execution plans for queries that involve InnoDB tables. innodb_stats_on_metadata is configured globally using a SET statement.

SET GLOBAL innodb_stats_on_metadata=ON

\section*{Note}
innodb_stats_on_metadata only applies when optimizer statistics are configured to be non-persistent (when innodb_stats_persistent is disabled).
- Starting a mysql client with the - -auto-rehash option enabled, which is the default. The autorehash option causes all InnoDB tables to be opened, and the open table operations cause statistics to be recalculated.

To improve the start up time of the mysql client and to updating statistics, you can turn off autorehash using the --disable-auto-rehash option. The auto-rehash feature enables automatic name completion of database, table, and column names for interactive users.
- A table is first opened.
- InnoDB detects that 1 / 16 of table has been modified since the last time statistics were updated.

\section*{Configuring the Number of Sampled Pages}

The MySQL query optimizer uses estimated statistics about key distributions to choose the indexes for an execution plan, based on the relative selectivity of the index. When InnoDB updates optimizer statistics, it samples random pages from each index on a table to estimate the cardinality of the index. (This technique is known as random dives.)

To give you control over the quality of the statistics estimate (and thus better information for the query optimizer), you can change the number of sampled pages using the parameter
innodb_stats_transient_sample_pages. The default number of sampled pages is 8, which could be insufficient to produce an accurate estimate, leading to poor index choices by the query optimizer. This technique is especially important for large tables and tables used in joins. Unnecessary full table scans for such tables can be a substantial performance issue. See Section 10.2.1.23, "Avoiding Full Table Scans" for tips on tuning such queries. innodb_stats_transient_sample_pages is a global parameter that can be set at runtime.

The value of innodb_stats_transient_sample_pages affects the index sampling for all InnoDB tables and indexes when innodb_stats_persistent=0. Be aware of the following potentially significant impacts when you change the index sample size:
- Small values like 1 or 2 can result in inaccurate estimates of cardinality.
- Increasing the innodb_stats_transient_sample_pages value might require more disk reads. Values much larger than 8 (say, 100), can cause a significant slowdown in the time it takes to open a table or execute SHOW TABLE STATUS.
- The optimizer might choose very different query plans based on different estimates of index selectivity.

Whatever value of innodb_stats_transient_sample_pages works best for a system, set the option and leave it at that value. Choose a value that results in reasonably accurate estimates for all tables in your database without requiring excessive I/O. Because the statistics are automatically recalculated at various times other than on execution of ANALYZE TABLE, it does not make sense to increase the index sample size, run ANALYZE TABLE, then decrease sample size again.

Smaller tables generally require fewer index samples than larger tables. If your database has many large tables, consider using a higher value for innodb_stats_transient_sample_pages than if you have mostly smaller tables.

\subsection*{17.8.10.3 Estimating ANALYZE TABLE Complexity for InnoDB Tables}

ANALYZE TABLE complexity for InnoDB tables is dependent on:
- The number of pages sampled, as defined by innodb_stats_persistent_sample_pages.
- The number of indexed columns in a table
- The number of partitions. If a table has no partitions, the number of partitions is considered to be 1 .

Using these parameters, an approximate formula for estimating ANALYZE TABLE complexity would be:
The value of innodb_stats_persistent_sample_pages * number of indexed columns in a table * the number of partitions

Typically, the greater the resulting value, the greater the execution time for ANALYZE TABLE.

> Note
> innodb_stats_persistent_sample_pages defines the number of pages sampled at a global level. To set the number of pages sampled for an individual table, use the STATS_SAMPLE_PAGES option with CREATE TABLE or ALTER TABLE. For more information, see Section 17.8.10.1, "Configuring Persistent Optimizer Statistics Parameters".

> If innodb_stats_persistent=0FF, the number of pages sampled is defined by innodb_stats_transient_sample_pages. See Section 17.8.10.2, "Configuring Non-Persistent Optimizer Statistics Parameters" for additional information.

For a more in-depth approach to estimating ANALYZE TABLE complexity, consider the following example.

In Big O notation, ANALYZE TABLE complexity is described as:
```
O(n_sample
    * (n_cols_in_uniq_i
        + n_cols_in_non_uniq_i
        + n_cols_in_pk * (1 + n_non_uniq_i))
    * n_part)
```

where:
- n_sample is the number of pages sampled (defined by innodb_stats_persistent_sample_pages)
- n_cols_in_uniq_i is total number of all columns in all unique indexes (not counting the primary key columns)
- n_cols_in_non_uniq_i is the total number of all columns in all nonunique indexes
- n_cols_in_pk is the number of columns in the primary key (if a primary key is not defined, InnoDB creates a single column primary key internally)
- n_non_uniq_i is the number of nonunique indexes in the table
- n_part is the number of partitions. If no partitions are defined, the table is considered to be a single partition.

Now, consider the following table (table t ), which has a primary key ( 2 columns), a unique index ( 2 columns), and two nonunique indexes (two columns each):
```
CREATE TABLE t (
    a INT,
    b INT,
    c INT,
    d INT,
    e INT,
    f INT,
    g INT,
    h INT,
    PRIMARY KEY (a, b),
    UNIQUE KEY i1uniq (c, d),
    KEY i2nonuniq (e, f),
    KEY i3nonuniq (g, h)
);
```


For the column and index data required by the algorithm described above, query the mysql.innodb_index_stats persistent index statistics table for table t. The n_diff_pfx\% statistics show the columns that are counted for each index. For example, columns $a$ and $b$ are counted for the primary key index. For the nonunique indexes, the primary key columns (a,b) are counted in addition to the user defined columns.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3120.jpg?height=131&width=99&top_left_y=2037&top_left_x=306)

\section*{Note}

For additional information about the InnoDB persistent statistics tables, see Section 17.8.10.1, "Configuring Persistent Optimizer Statistics Parameters"
```
mysql> SELECT index_name, stat_name, stat_description
        FROM mysql.innodb_index_stats WHERE
        database_name='test' AND
        table_name='t' AND
        stat_name like 'n_diff_pfx%';
    +-------------+--------------+------------------
    | index_name | stat_name | stat_description |
    +-------------+--------------+-----------------+
    | PRIMARY | n_diff_pfx01 | a
    | PRIMARY | n_diff_pfx02 | a,b
    | i1uniq | n_diff_pfx01 | c
    | i1uniq | n_diff_pfx02 | c,d
    | i2nonuniq | n_diff_pfx01 | e
```

```
| i2nonuniq | n_diff_pfx02 | e,f
| i2nonuniq | n_diff_pfx03 | e,f,a
| i2nonuniq | n_diff_pfx04 | e,f,a,b
| i3nonuniq | n_diff_pfx01 | g
| i3nonuniq | n_diff_pfx02 | g,h
| i3nonuniq | n_diff_pfx03 | g,h,a
| i3nonuniq | n_diff_pfx04 | g,h,a,b
+-------------+--------------+-----------------+
```


Based on the index statistics data shown above and the table definition, the following values can be determined:
- n_cols_in_uniq_i, the total number of all columns in all unique indexes not counting the primary key columns, is 2 (c and d)
- n_cols_in_non_uniq_i, the total number of all columns in all nonunique indexes, is 4 (e, f, g and h)
- n_cols_in_pk, the number of columns in the primary key, is $2(\mathrm{a}$ and b$)$
- n_non_uniq_i, the number of nonunique indexes in the table, is 2 (i2nonuniq and i3nonuniq))
- n_part, the number of partitions, is 1 .

You can now calculate innodb_stats_persistent_sample_pages * ( 2 + $4+2 *(1+2)) * 1$ to determine the number of leaf pages that are scanned. With innodb_stats_persistent_sample_pages set to the default value of 20 , and with a default page size of 16 KiB (innodb_page_size=16384), you can then estimate that 20 * 12 * 16384 bytes are read for table t , or about 4 MiB .

Note
All 4 MiB may not be read from disk, as some leaf pages may already be cached in the buffer pool.

\subsection*{17.8.11 Configuring the Merge Threshold for Index Pages}

You can configure the MERGE_THRESHOLD value for index pages. If the "page-full" percentage for an index page falls below the MERGE_THRESHOLD value when a row is deleted or when a row is shortened by an UPDATE operation, InnoDB attempts to merge the index page with a neighboring index page. The default MERGE_THRESHOLD value is 50, which is the previously hardcoded value. The minimum MERGE_THRESHOLD value is 1 and the maximum value is 50 .

When the "page-full" percentage for an index page falls below $50 \%$, which is the default MERGE_THRESHOLD setting, InnoDB attempts to merge the index page with a neighboring page. If both pages are close to $50 \%$ full, a page split can occur soon after the pages are merged. If this mergesplit behavior occurs frequently, it can have an adverse affect on performance. To avoid frequent merge-splits, you can lower the MERGE_THRESHOLD value so that InnoDB attempts page merges at a lower "page-full" percentage. Merging pages at a lower page-full percentage leaves more room in index pages and helps reduce merge-split behavior.

The MERGE_THRESHOLD for index pages can be defined for a table or for individual indexes. A MERGE_THRESHOLD value defined for an individual index takes priority over a MERGE_THRESHOLD value defined for the table. If undefined, the MERGE_THRESHOLD value defaults to 50.

\section*{Setting MERGE_THRESHOLD for a Table}

You can set the MERGE_THRESHOLD value for a table using the table_option COMMENT clause of the CREATE TABLE statement. For example:
```
CREATE TABLE t1 (
        id INT,
    KEY id_index (id)
) COMMENT='MERGE_THRESHOLD=45';
```


You can also set the MERGE_THRESHOLD value for an existing table using the table_option COMMENT clause with ALTER TABLE:
```
CREATE TABLE t1 (
    id INT,
    KEY id_index (id)
);
ALTER TABLE t1 COMMENT='MERGE_THRESHOLD=40';
```


\section*{Setting MERGE_THRESHOLD for Individual Indexes}

To set the MERGE_THRESHOLD value for an individual index, you can use the index_option COMMENT clause with CREATE TABLE, ALTER TABLE, or CREATE INDEX, as shown in the following examples:
- Setting MERGE_THRESHOLD for an individual index using CREATE TABLE:
```
CREATE TABLE t1 (
        id INT,
    KEY id_index (id) COMMENT 'MERGE_THRESHOLD=40'
);
```

- Setting MERGE_THRESHOLD for an individual index using ALTER TABLE:
```
CREATE TABLE t1 (
        id INT,
    KEY id_index (id)
);
ALTER TABLE t1 DROP KEY id_index;
ALTER TABLE t1 ADD KEY id_index (id) COMMENT 'MERGE_THRESHOLD=40';
```

- Setting MERGE_THRESHOLD for an individual index using CREATE INDEX:
```
CREATE TABLE t1 (id INT);
CREATE INDEX id_index ON t1 (id) COMMENT 'MERGE_THRESHOLD=40';
```


\section*{Note}

You cannot modify the MERGE_THRESHOLD value at the index level for GEN_CLUST_INDEX, which is the clustered index created by InnoDB when an InnoDB table is created without a primary key or unique key index. You can only modify the MERGE_THRESHOLD value for GEN_CLUST_INDEX by setting MERGE_THRESHOLD for the table.

\section*{Querying the MERGE_THRESHOLD Value for an Index}

The current MERGE_THRESHOLD value for an index can be obtained by querying the INNODB_INDEXES table. For example:
```
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_INDEXES WHERE NAME='id_index' \G
*************************** 1. row ***************************************
    INDEX_ID: 91
        NAME: id_index
    TABLE_ID: 68
        TYPE: 0
    N_FIELDS: 1
        PAGE_NO: 4
            SPACE: 57
MERGE_THRESHOLD: 40
```


You can use SHOW CREATE TABLE to view the MERGE_THRESHOLD value for a table, if explicitly defined using the table_option COMMENT clause:
```
mysql> SHOW CREATE TABLE t2 \G
************************** 1. row
    Table: t2
```

```
Create Table: CREATE TABLE ˋt2ˋ (
    ˋidˋ int(11) DEFAULT NULL,
    KEY ˋid_indexˋ (ˋidˋ) COMMENT 'MERGE_THRESHOLD=40'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
```


\section*{Note \\ A MERGE_THRESHOLD value defined at the index level takes priority over a MERGE_THRESHOLD value defined for the table. If undefined, MERGE_THRESHOLD defaults to 50\% (MERGE_THRESHOLD=50, which is the previously hardcoded value.}

Likewise, you can use SHOW INDEX to view the MERGE_THRESHOLD value for an index, if explicitly defined using the index_option COMMENT clause:
```
mysql> SHOW INDEX FROM t2 \G
************************** 1. row ****************************************
                Table: t2
        Non_unique: 1
            Key_name: id_index
Seq_in_index: 1
    Column_name: id
        Collation: A
    Cardinality: 0
            Sub_part: NULL
                Packed: NULL
                    Null: YES
        Index_type: BTREE
                Comment:
Index_comment: MERGE_THRESHOLD=40
```


\section*{Measuring the Effect of MERGE_THRESHOLD Settings}

The INNODB_METRICS table provides two counters that can be used to measure the effect of a MERGE_THRESHOLD setting on index page merges.
```
mysql> SELECT NAME, COMMENT FROM INFORMATION_SCHEMA.INNODB_METRICS
    WHERE NAME like '%index_page_merge%';
+-------------------------------+--------------------------------------------+
```


When lowering the MERGE_THRESHOLD value, the objectives are:
- A smaller number of page merge attempts and successful page merges
- A similar number of page merge attempts and successful page merges

A MERGE_THRESHOLD setting that is too small could result in large data files due to an excessive amount of empty page space.

For information about using INNODB_METRICS counters, see Section 17.15.6, "InnoDB INFORMATION_SCHEMA Metrics Table".

\subsection*{17.8.12 Enabling Automatic InnoDB Configuration for a Dedicated MySQL Server}

When the server is started with --innodb-dedicated-server, InnoDB automatically calculates values for and sets the following system variables:
- innodb_buffer_pool_size
- innodb_redo_log_capacity

\section*{Note}
innodb_redo_log_capacity supersedes both innodb_log_file_size and innodb_log_files_in_group, which were set by --innodb -dedicated-server in older versions of MySQL, but which have since been deprecated. You should expect innodb_log_file_size and innodb_log_files_in_group to be removed in a future version of MySQL.

In MySQL 8.0, innodb_flush_method was also set automatically by this option, but in MySQL 8.4, this is no longer the case.

You should consider using --innodb-dedicated-server only if the MySQL instance resides on a dedicated server where it can use all available system resources-for example, if you run MySQL Server in a Docker container or dedicated VM that runs MySQL only. using - - innodb - dedicated server is not recommended if the MySQL instance shares system resources with other applications.

The value for each affected variable is determined and applied by --innodb-dedicated-server as described in the following list:
- innodb_buffer_pool_size

Buffer pool size is calculated according to the amount of memory detected on the server, as shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.8 Automatically Configured Buffer Pool Size}
\begin{tabular}{|l|l|}
\hline Detected Server Memory & Buffer Pool Size \\
\hline Less than 1 GB & 128 MB (the default value) \\
\hline 1 GB to 4 GB & detected server memory ${ }^{*} 0.5$ \\
\hline Greater than 4 GB & detected server memory ${ }^{*} 0.75$ \\
\hline
\end{tabular}
\end{table}
- innodb_redo_log_capacity

Redo log capacity is calculated according to the number of logical processors available on the server. The formula is (number of available logical processors / 2) GB, with a maximum dynamic default value of 16 GB .
- innodb_log_file_size (deprecated)

Log file size is set according to the automatically configured buffer pool size, as shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.9 Automatically Configured Log File Size}
\begin{tabular}{|l|l|}
\hline Buffer Pool Size & Log File Size \\
\hline Less than 8 GB & 512 MB \\
\hline 8 GB to 128 GB & 1024 MB \\
\hline Greater than 128 GB & 2048 MB \\
\hline
\end{tabular}
\end{table}
- innodb_log_files_in_group (deprecated)

The number of log files is determined according to the automatically configured buffer pool size, as shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.10 Automatically Configured Number of Log Files}
\begin{tabular}{|l|l|}
\hline Buffer Pool Size & Number of Log Files \\
\hline Less than 8 GB & round $($ buffer pool size $)$ \\
\hline 8 GB to 128 GB & round $\left(\right.$ buffer pool size $\left.{ }^{*} 0.75\right)$ \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Buffer Pool Size & Number of Log Files \\
\hline Greater than 128 GB & 64 \\
\hline
\end{tabular}

\section*{Note}

The minimum value for innodb_log_files_in_group value is 2; this lower limit is enforced if the rounded buffer pool size value is less than this number.

If one of the variables listed previously is set explicitly in an option file or elsewhere, this explicit value is used, and a startup warning similar to this one is printed to stderr:
[Warning] [000000] InnoDB: Option innodb_dedicated_server is ignored for innodb_buffer_pool_size because innodb_buffer_pool_size=134217728 is specified explicitly.

Setting one variable explicitly does not prevent the automatic configuration of other options.
If the server is started with --innodb-dedicated-server and innodb_buffer_pool_size is set explicitly, variable settings based on buffer pool size use the buffer pool size value calculated according to the amount of memory detected on the server rather than the explicitly defined buffer pool size value.

\section*{Note}

Automatic configuration settings are applied by --innodb-dedicatedserver only when the MySQL server is started. If you later set any of the affected variables explicitly, this overrides its predetermined value, and the value that was explicitly set is applied. Setting one of these variables to DEFAULT causes it to be set to the actual default value as shown in the variable's description in the Manual, and does not cause it to revert to the value set by --innodb-dedicated-server. The corresponding system variable innodb_dedicated_server is changed only by starting the server with - -innodb-dedicated-server (or with --innodb-dedicated-server=ON or --innodb-dedicated-server=0FF); it is otherwise read-only.

\subsection*{17.9 InnoDB Table and Page Compression}

This section provides information about the InnoDB table compression and InnoDB page compression features. The page compression feature is also referred to as transparent page compression.

Using the compression features of InnoDB, you can create tables where the data is stored in compressed form. Compression can help to improve both raw performance and scalability. The compression means less data is transferred between disk and memory, and takes up less space on disk and in memory. The benefits are amplified for tables with secondary indexes, because index data is compressed also. Compression can be especially important for SSD storage devices, because they tend to have lower capacity than HDD devices.

\subsection*{17.9.1 InnoDB Table Compression}

This section describes InnoDB table compression, which is supported with InnoDB tables that reside in file_per_table tablespaces or general tablespaces. Table compression is enabled using the ROW_FORMAT=COMPRESSED attribute with CREATE TABLE or ALTER TABLE.

\subsection*{17.9.1.1 Overview of Table Compression}

Because processors and cache memories have increased in speed more than disk storage devices, many workloads are disk-bound. Data compression enables smaller database size, reduced I/O, and improved throughput, at the small cost of increased CPU utilization. Compression is especially valuable for read-intensive applications, on systems with enough RAM to keep frequently used data in memory.

An InnoDB table created with ROW_FORMAT=COMPRESSED can use a smaller page size on disk than the configured innodb_page_size value. Smaller pages require less I/O to read from and write to disk, which is especially valuable for SSD devices.

The compressed page size is specified through the CREATE TABLE or ALTER TABLE KEY_BLOCK_SIZE parameter. The different page size requires that the table be placed in a file-per-table tablespace or general tablespace rather than in the system tablespace, as the system tablespace cannot store compressed tables. For more information, see Section 17.6.3.2, "File-PerTable Tablespaces", and Section 17.6.3.3, "General Tablespaces".

The level of compression is the same regardless of the KEY_BLOCK_SIZE value. As you specify smaller values for KEY_BLOCK_SIZE, you get the I/O benefits of increasingly smaller pages. But if you specify a value that is too small, there is additional overhead to reorganize the pages when data values cannot be compressed enough to fit multiple rows in each page. There is a hard limit on how small KEY_BLOCK_SIZE can be for a table, based on the lengths of the key columns for each of its indexes. Specify a value that is too small, and the CREATE TABLE or ALTER TABLE statement fails.

In the buffer pool, the compressed data is held in small pages, with a page size based on the KEY_BLOCK_SIZE value. For extracting or updating the column values, MySQL also creates an uncompressed page in the buffer pool with the uncompressed data. Within the buffer pool, any updates to the uncompressed page are also re-written back to the equivalent compressed page. You might need to size your buffer pool to accommodate the additional data of both compressed and uncompressed pages, although the uncompressed pages are evicted from the buffer pool when space is needed, and then uncompressed again on the next access.

\subsection*{17.9.1.2 Creating Compressed Tables}

Compressed tables can be created in file-per-table tablespaces or in general tablespaces. Table compression is not available for the InnoDB system tablespace. The system tablespace (space 0 , the .ibdata files) can contain user-created tables, but it also contains internal system data, which is never compressed. Thus, compression applies only to tables (and indexes) stored in file-per-table or general tablespaces.

\section*{Creating a Compressed Table in File-Per-Table Tablespace}

To create a compressed table in a file-per-table tablespace, innodb_file_per_table must be enabled (the default). You can set this parameter in the MySQL configuration file (my. cnf or my. ini) or dynamically, using a SET statement.

After the innodb_file_per_table option is configured, specify the ROW_FORMAT=COMPRESSED clause or KEY_BLOCK_SIZE clause, or both, in a CREATE TABLE or ALTER TABLE statement to create a compressed table in a file-per-table tablespace.

For example, you might use the following statements:
```
SET GLOBAL innodb_file_per_table=1;
CREATE TABLE t1
    (c1 INT PRIMARY KEY)
    ROW_FORMAT=COMPRESSED
    KEY_BLOCK_SIZE=8;
```


\section*{Creating a Compressed Table in a General Tablespace}

To create a compressed table in a general tablespace, FILE_BLOCK_SIZE must be defined for the general tablespace, which is specified when the tablespace is created. The FILE_BLOCK_SIZE value must be a valid compressed page size in relation to the innodb_page_size value, and the page size of the compressed table, defined by the CREATE TABLE or ALTER TABLE KEY_BLOCK_SIZE clause, must be equal to FILE_BLOCK_SIZE/1024. For example, if innodb_page_size=16384 and FILE_BLOCK_SIZE=8192, the KEY_BLOCK_SIZE of the table must be 8 . For more information, see Section 17.6.3.3, "General Tablespaces".

The following example demonstrates creating a general tablespace and adding a compressed table. The example assumes a default innodb_page_size of 16K. The FILE_BLOCK_SIZE of 8192 requires that the compressed table have a KEY_BLOCK_SIZE of 8.
```
mysql> CREATE TABLESPACE ˋts2ˋ ADD DATAFILE 'ts2.ibd' FILE_BLOCK_SIZE = 8192 Engine=InnoDB;
mysql> CREATE TABLE t4 (c1 INT PRIMARY KEY) TABLESPACE ts2 ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
```


\section*{Notes}
- As of MySQL 8.4, the tablespace file for a compressed table is created using the physical page size instead of the InnoDB page size, which makes the initial size of a tablespace file for an empty compressed table smaller than in previous MySQL releases.
- If you specify ROW_FORMAT=COMPRESSED, you can omit KEY_BLOCK_SIZE; the KEY_BLOCK_SIZE setting defaults to half the innodb_page_size value.
- If you specify a valid KEY_BLOCK_SIZE value, you can omit ROW_FORMAT=COMPRESSED; compression is enabled automatically.
- To determine the best value for KEY_BLOCK_SIZE, typically you create several copies of the same table with different values for this clause, then measure the size of the resulting . ibd files and see how well each performs with a realistic workload. For general tablespaces, keep in mind that dropping a table does not reduce the size of the general tablespace . ibd file, nor does it return disk space to the operating system. For more information, see Section 17.6.3.3, "General Tablespaces".
- The KEY_BLOCK_SIZE value is treated as a hint; a different size could be used by InnoDB if necessary. For file-per-table tablespaces, the KEY_BLOCK_SIZE can only be less than or equal to the innodb_page_size value. If you specify a value greater than the innodb_page_size value, the specified value is ignored, a warning is issued, and KEY_BLOCK_SIZE is set to half of the innodb_page_size value. If innodb_strict_mode=ON, specifying an invalid KEY_BLOCK_SIZE value returns an error. For general tablespaces, valid KEY_BLOCK_SIZE values depend on the FILE_BLOCK_SIZE setting of the tablespace. For more information, see Section 17.6.3.3, "General Tablespaces".
- InnoDB supports 32 KB and 64 KB page sizes but these page sizes do not support compression. For more information, refer to the innodb_page_size documentation.
- The default uncompressed size of InnoDB data pages is 16 KB . Depending on the combination of option values, MySQL uses a page size of $1 \mathrm{~KB}, 2 \mathrm{~KB}, 4 \mathrm{~KB}, 8 \mathrm{~KB}$, or 16 KB for the tablespace data file (.ibd file). The actual compression algorithm is not affected by the KEY_BLOCK_SIZE value; the value determines how large each compressed chunk is, which in turn affects how many rows can be packed into each compressed page.
- When creating a compressed table in a file-per-table tablespace, setting KEY_BLOCK_SIZE equal to the InnoDB page size does not typically result in much compression. For example, setting KEY_BLOCK_SIZE=16 typically would not result in much compression, since the normal InnoDB page size is 16 KB . This setting may still be useful for tables with many long BLOB, VARCHAR or TEXT columns, because such values often do compress well, and might therefore require fewer overflow pages as described in Section 17.9.1.5, "How Compression Works for InnoDB Tables". For general tablespaces, a KEY_BLOCK_SIZE value equal to the InnoDB page size is not permitted. For more information, see Section 17.6.3.3, "General Tablespaces".
- All indexes of a table (including the clustered index) are compressed using the same page size, as specified in the CREATE TABLE or ALTER TABLE statement. Table attributes such as ROW_FORMAT and KEY_BLOCK_SIZE are not part of the CREATE INDEX syntax for InnoDB tables, and are ignored if they are specified (although, if specified, they appear in the output of the SHOW CREATE TABLE statement).
- For performance-related configuration options, see Section 17.9.1.3, "Tuning Compression for InnoDB Tables".

\section*{Restrictions on Compressed Tables}
- Compressed tables cannot be stored in the InnoDB system tablespace.
- General tablespaces can contain multiple tables, but compressed and uncompressed tables cannot coexist within the same general tablespace.
- Compression applies to an entire table and all its associated indexes, not to individual rows, despite the clause name ROW_FORMAT.
- InnoDB does not support compressed temporary tables. When innodb_strict_mode is enabled (the default), CREATE TEMPORARY TABLE returns errors if ROW_FORMAT=COMPRESSED or KEY_BLOCK_SIZE is specified. If innodb_strict_mode is disabled, warnings are issued and the temporary table is created using a non-compressed row format. The same restrictions apply to ALTER TABLE operations on temporary tables.

\subsection*{17.9.1.3 Tuning Compression for InnoDB Tables}

Most often, the internal optimizations described in InnoDB Data Storage and Compression ensure that the system runs well with compressed data. However, because the efficiency of compression depends on the nature of your data, you can make decisions that affect the performance of compressed tables:
- Which tables to compress.
- What compressed page size to use.
- Whether to adjust the size of the buffer pool based on run-time performance characteristics, such as the amount of time the system spends compressing and uncompressing data. Whether the workload is more like a data warehouse (primarily queries) or an OLTP system (mix of queries and DML).
- If the system performs DML operations on compressed tables, and the way the data is distributed leads to expensive compression failures at runtime, you might adjust additional advanced configuration options.

Use the guidelines in this section to help make those architectural and configuration choices. When you are ready to conduct long-term testing and put compressed tables into production, see Section 17.9.1.4, "Monitoring InnoDB Table Compression at Runtime" for ways to verify the effectiveness of those choices under real-world conditions.

\section*{When to Use Compression}

In general, compression works best on tables that include a reasonable number of character string columns and where the data is read far more often than it is written. Because there are no guaranteed ways to predict whether or not compression benefits a particular situation, always test with a specific workload and data set running on a representative configuration. Consider the following factors when deciding which tables to compress.

\section*{Data Characteristics and Compression}

A key determinant of the efficiency of compression in reducing the size of data files is the nature of the data itself. Recall that compression works by identifying repeated strings of bytes in a block of data. Completely randomized data is the worst case. Typical data often has repeated values, and so compresses effectively. Character strings often compress well, whether defined in CHAR, VARCHAR, TEXT or BLOB columns. On the other hand, tables containing mostly binary data (integers or floating point numbers) or data that is previously compressed (for example JPEG or PNG images) may not generally compress well, significantly or at all.

You choose whether to turn on compression for each InnoDB table. A table and all of its indexes use the same (compressed) page size. It might be that the primary key (clustered) index, which contains the data for all columns of a table, compresses more effectively than the secondary indexes. For those cases where there are long rows, the use of compression might result in long column values being
stored "off-page", as discussed in DYNAMIC Row Format. Those overflow pages may compress well. Given these considerations, for many applications, some tables compress more effectively than others, and you might find that your workload performs best only with a subset of tables compressed.

To determine whether or not to compress a particular table, conduct experiments. You can get a rough estimate of how efficiently your data can be compressed by using a utility that implements LZ77 compression (such as gzip or WinZip) on a copy of the .ibd file for an uncompressed table. You can expect less compression from a MySQL compressed table than from file-based compression tools, because MySQL compresses data in chunks based on the page size, 16 KB by default. In addition to user data, the page format includes some internal system data that is not compressed. File-based compression utilities can examine much larger chunks of data, and so might find more repeated strings in a huge file than MySQL can find in an individual page.

Another way to test compression on a specific table is to copy some data from your uncompressed table to a similar, compressed table (having all the same indexes) in a file-per-table tablespace and look at the size of the resulting . ibd file. For example:
```
USE test;
SET GLOBAL innodb_file_per_table=1;
SET GLOBAL autocommit=0;
-- Create an uncompressed table with a million or two rows.
CREATE TABLE big_table AS SELECT * FROM information_schema.columns;
INSERT INTO big_table SELECT * FROM big_table;
INSERT INTO big_table SELECT * FROM big_table;
INSERT INTO big_table SELECT * FROM big_table;
INSERT INTO big_table SELECT * FROM big_table;
INSERT INTO big_table SELECT * FROM big_table;
INSERT INTO big_table SELECT * FROM big_table;
INSERT INTO big_table SELECT * FROM big_table;
INSERT INTO big_table SELECT * FROM big_table;
INSERT INTO big_table SELECT * FROM big_table;
INSERT INTO big_table SELECT * FROM big_table;
COMMIT;
ALTER TABLE big_table ADD id int unsigned NOT NULL PRIMARY KEY auto_increment;
SHOW CREATE TABLE big_table\G
select count(id) from big_table;
-- Check how much space is needed for the uncompressed table.
\! ls -l data/test/big_table.ibd
CREATE TABLE key_block_size_4 LIKE big_table;
ALTER TABLE key_block_size_4 key_block_size=4 row_format=compressed;
INSERT INTO key_block_size_4 SELECT * FROM big_table;
commit;
-- Check how much space is needed for a compressed table
-- with particular compression settings.
\! ls -l data/test/key_block_size_4.ibd
```


This experiment produced the following numbers, which of course could vary considerably depending on your table structure and data:
```
-rw-rw---- 1 cirrus staff 310378496 Jan 9 13:44 data/test/big_table.ibd
-rw-rw---- 1 cirrus staff 83886080 Jan 9 15:10 data/test/key_block_size_4.ibd
```


To see whether compression is efficient for your particular workload:
- For simple tests, use a MySQL instance with no other compressed tables and run queries against the Information Schema INNODB_CMP table.
- For more elaborate tests involving workloads with multiple compressed tables, run queries against the Information Schema INNODB_CMP_PER_INDEX table. Because the statistics in the INNODB_CMP_PER_INDEX table are expensive to collect, you must enable the configuration option
innodb_cmp_per_index_enabled before querying that table, and you might restrict such testing to a development server or a non-critical replica server.
- Run some typical SQL statements against the compressed table you are testing.
- Examine the ratio of successful compression operations to overall compression operations by querying INFORMATION_SCHEMA. INNODB_CMP or INFORMATION_SCHEMA. INNODB_CMP_PER_INDEX, and comparing COMPRESS_OPS to COMPRESS_OPS_OK.
- If a high percentage of compression operations complete successfully, the table might be a good candidate for compression.
- If you get a high proportion of compression failures, you can adjust innodb_compression_level, innodb_compression_failure_threshold_pct, and innodb_compression_pad_pct_max options as described in Section 17.9.1.6, "Compression for OLTP Workloads", and try further tests.

\section*{Database Compression versus Application Compression}

Decide whether to compress data in your application or in the table; do not use both types of compression for the same data. When you compress the data in the application and store the results in a compressed table, extra space savings are extremely unlikely, and the double compression just wastes CPU cycles.

\section*{Compressing in the Database}

When enabled, MySQL table compression is automatic and applies to all columns and index values. The columns can still be tested with operators such as LIKE, and sort operations can still use indexes even when the index values are compressed. Because indexes are often a significant fraction of the total size of a database, compression could result in significant savings in storage, I/O or processor time. The compression and decompression operations happen on the database server, which likely is a powerful system that is sized to handle the expected load.

\section*{Compressing in the Application}

If you compress data such as text in your application, before it is inserted into the database, You might save overhead for data that does not compress well by compressing some columns and not others. This approach uses CPU cycles for compression and uncompression on the client machine rather than the database server, which might be appropriate for a distributed application with many clients, or where the client machine has spare CPU cycles.

\section*{Hybrid Approach}

Of course, it is possible to combine these approaches. For some applications, it may be appropriate to use some compressed tables and some uncompressed tables. It may be best to externally compress some data (and store it in uncompressed tables) and allow MySQL to compress (some of) the other tables in the application. As always, up-front design and real-life testing are valuable in reaching the right decision.

\section*{Workload Characteristics and Compression}

In addition to choosing which tables to compress (and the page size), the workload is another key determinant of performance. If the application is dominated by reads, rather than updates, fewer pages need to be reorganized and recompressed after the index page runs out of room for the perpage "modification log" that MySQL maintains for compressed data. If the updates predominantly change non-indexed columns or those containing BLOBs or large strings that happen to be stored "offpage", the overhead of compression may be acceptable. If the only changes to a table are INSERTs that use a monotonically increasing primary key, and there are few secondary indexes, there is little need to reorganize and recompress index pages. Since MySQL can "delete-mark" and delete rows on compressed pages "in place" by modifying uncompressed data, DELETE operations on a table are relatively efficient.

For some environments, the time it takes to load data can be as important as run-time retrieval. Especially in data warehouse environments, many tables may be read-only or read-mostly. In those cases, it might or might not be acceptable to pay the price of compression in terms of increased load time, unless the resulting savings in fewer disk reads or in storage cost is significant.

Fundamentally, compression works best when the CPU time is available for compressing and uncompressing data. Thus, if your workload is I/O bound, rather than CPU-bound, you might find that compression can improve overall performance. When you test your application performance with different compression configurations, test on a platform similar to the planned configuration of the production system.

\section*{Configuration Characteristics and Compression}

Reading and writing database pages from and to disk is the slowest aspect of system performance. Compression attempts to reduce I/O by using CPU time to compress and uncompress data, and is most effective when I/O is a relatively scarce resource compared to processor cycles.

This is often especially the case when running in a multi-user environment with fast, multi-core CPUs. When a page of a compressed table is in memory, MySQL often uses additional memory, typically 16 KB , in the buffer pool for an uncompressed copy of the page. The adaptive LRU algorithm attempts to balance the use of memory between compressed and uncompressed pages to take into account whether the workload is running in an I/O-bound or CPU-bound manner. Still, a configuration with more memory dedicated to the buffer pool tends to run better when using compressed tables than a configuration where memory is highly constrained.

\section*{Choosing the Compressed Page Size}

The optimal setting of the compressed page size depends on the type and distribution of data that the table and its indexes contain. The compressed page size should always be bigger than the maximum record size, or operations may fail as noted in Compression of B-Tree Pages.

Setting the compressed page size too large wastes some space, but the pages do not have to be compressed as often. If the compressed page size is set too small, inserts or updates may require time-consuming recompression, and the B-tree nodes may have to be split more frequently, leading to bigger data files and less efficient indexing.

Typically, you set the compressed page size to 8 K or 4 K bytes. Given that the maximum row size for an InnoDB table is around 8K, KEY_BLOCK_SIZE=8 is usually a safe choice.

\subsection*{17.9.1.4 Monitoring InnoDB Table Compression at Runtime}

Overall application performance, CPU and I/O utilization and the size of disk files are good indicators of how effective compression is for your application. This section builds on the performance tuning advice from Section 17.9.1.3, "Tuning Compression for InnoDB Tables", and shows how to find problems that might not turn up during initial testing.

To dig deeper into performance considerations for compressed tables, you can monitor compression performance at runtime using the Information Schema tables described in Example 17.1, "Using the Compression Information Schema Tables". These tables reflect the internal use of memory and the rates of compression used overall.

The INNODB_CMP table reports information about compression activity for each compressed page size (KEY_BLOCK_SIZE) in use. The information in these tables is system-wide: it summarizes the compression statistics across all compressed tables in your database. You can use this data to help decide whether or not to compress a table by examining these tables when no other compressed tables are being accessed. It involves relatively low overhead on the server, so you might query it periodically on a production server to check the overall efficiency of the compression feature.

The INNODB_CMP_PER_INDEX table reports information about compression activity for individual tables and indexes. This information is more targeted and more useful for evaluating compression
efficiency and diagnosing performance issues one table or index at a time. (Because that each InnoDB table is represented as a clustered index, MySQL does not make a big distinction between tables and indexes in this context.) The INNODB_CMP_PER_INDEX table does involve substantial overhead, so it is more suitable for development servers, where you can compare the effects of different workloads, data, and compression settings in isolation. To guard against imposing this monitoring overhead by accident, you must enable the innodb_cmp_per_index_enabled configuration option before you can query the INNODB_CMP_PER_INDEX table.

The key statistics to consider are the number of, and amount of time spent performing, compression and uncompression operations. Since MySQL splits B-tree nodes when they are too full to contain the compressed data following a modification, compare the number of "successful" compression operations with the number of such operations overall. Based on the information in the INNODB_CMP and INNODB_CMP_PER_INDEX tables and overall application performance and hardware resource utilization, you might make changes in your hardware configuration, adjust the size of the buffer pool, choose a different page size, or select a different set of tables to compress.

If the amount of CPU time required for compressing and uncompressing is high, changing to faster or multi-core CPUs can help improve performance with the same data, application workload and set of compressed tables. Increasing the size of the buffer pool might also help performance, so that more uncompressed pages can stay in memory, reducing the need to uncompress pages that exist in memory only in compressed form.

A large number of compression operations overall (compared to the number of INSERT, UPDATE and DELETE operations in your application and the size of the database) could indicate that some of your compressed tables are being updated too heavily for effective compression. If so, choose a larger page size, or be more selective about which tables you compress.

If the number of "successful" compression operations (COMPRESS_OPS_OK) is a high percentage of the total number of compression operations (COMPRESS_OPS), then the system is likely performing well. If the ratio is low, then MySQL is reorganizing, recompressing, and splitting B-tree nodes more often than is desirable. In this case, avoid compressing some tables, or increase KEY_BLOCK_SIZE for some of the compressed tables. You might turn off compression for tables that cause the number of "compression failures" in your application to be more than $1 \%$ or $2 \%$ of the total. (Such a failure ratio might be acceptable during a temporary operation such as a data load).

\subsection*{17.9.1.5 How Compression Works for InnoDB Tables}

This section describes some internal implementation details about compression for InnoDB tables. The information presented here may be helpful in tuning for performance, but is not necessary to know for basic use of compression.

\section*{Compression Algorithms}

Some operating systems implement compression at the file system level. Files are typically divided into fixed-size blocks that are compressed into variable-size blocks, which easily leads into fragmentation. Every time something inside a block is modified, the whole block is recompressed before it is written to disk. These properties make this compression technique unsuitable for use in an update-intensive database system.

MySQL implements compression with the help of the well-known zlib library, which implements the LZ77 compression algorithm. This compression algorithm is mature, robust, and efficient in both CPU utilization and in reduction of data size. The algorithm is "lossless", so that the original uncompressed data can always be reconstructed from the compressed form. LZ77 compression works by finding sequences of data that are repeated within the data to be compressed. The patterns of values in your data determine how well it compresses, but typical user data often compresses by 50\% or more.

Unlike compression performed by an application, or compression features of some other database management systems, InnoDB compression applies both to user data and to indexes. In many cases, indexes can constitute $40-50 \%$ or more of the total database size, so this difference is significant. When compression is working well for a data set, the size of the InnoDB data files (the
file-per-table tablespace or general tablespace . ibd files) is $25 \%$ to $50 \%$ of the uncompressed size or possibly smaller. Depending on the workload, this smaller database can in turn lead to a reduction in I/O, and an increase in throughput, at a modest cost in terms of increased CPU utilization. You can adjust the balance between compression level and CPU overhead by modifying the innodb_compression_level configuration option.

\section*{InnoDB Data Storage and Compression}

All user data in InnoDB tables is stored in pages comprising a B-tree index (the clustered index). In some other database systems, this type of index is called an "index-organized table". Each row in the index node contains the values of the (user-specified or system-generated) primary key and all the other columns of the table.

Secondary indexes in InnoDB tables are also B-trees, containing pairs of values: the index key and a pointer to a row in the clustered index. The pointer is in fact the value of the primary key of the table, which is used to access the clustered index if columns other than the index key and primary key are required. Secondary index records must always fit on a single B-tree page.

The compression of B-tree nodes (of both clustered and secondary indexes) is handled differently from compression of overflow pages used to store long VARCHAR, BLOB, or TEXT columns, as explained in the following sections.

\section*{Compression of B-Tree Pages}

Because they are frequently updated, B-tree pages require special treatment. It is important to minimize the number of times B-tree nodes are split, as well as to minimize the need to uncompress and recompress their content.

One technique MySQL uses is to maintain some system information in the B-tree node in uncompressed form, thus facilitating certain in-place updates. For example, this allows rows to be delete-marked and deleted without any compression operation.

In addition, MySQL attempts to avoid unnecessary uncompression and recompression of index pages when they are changed. Within each B-tree page, the system keeps an uncompressed "modification log" to record changes made to the page. Updates and inserts of small records may be written to this modification log without requiring the entire page to be completely reconstructed.

When the space for the modification log runs out, InnoDB uncompresses the page, applies the changes and recompresses the page. If recompression fails (a situation known as a compression failure), the B-tree nodes are split and the process is repeated until the update or insert succeeds.

To avoid frequent compression failures in write-intensive workloads, such as for OLTP applications, MySQL sometimes reserves some empty space (padding) in the page, so that the modification log fills up sooner and the page is recompressed while there is still enough room to avoid splitting it. The amount of padding space left in each page varies as the system keeps track of the frequency of page splits. On a busy server doing frequent writes to compressed tables, you can adjust the innodb_compression_failure_threshold_pct, and innodb_compression_pad_pct_max configuration options to fine-tune this mechanism.

Generally, MySQL requires that each B-tree page in an InnoDB table can accommodate at least two records. For compressed tables, this requirement has been relaxed. Leaf pages of B-tree nodes (whether of the primary key or secondary indexes) only need to accommodate one record, but that record must fit, in uncompressed form, in the per-page modification log. If innodb_strict_mode is ON, MySQL checks the maximum row size during CREATE TABLE or CREATE INDEX. If the row does not fit, the following error message is issued: ERROR HY000: Too big row.

If you create a table when innodb_strict_mode is OFF, and a subsequent INSERT or UPDATE statement attempts to create an index entry that does not fit in the size of the compressed page, the operation fails with ERROR 42000: Row size too large. (This error message does not name the index for which the record is too large, or mention the length of the index record or the maximum
record size on that particular index page.) To solve this problem, rebuild the table with ALTER TABLE and select a larger compressed page size (KEY_BLOCK_SIZE), shorten any column prefix indexes, or disable compression entirely with ROW_FORMAT=DYNAMIC or ROW_FORMAT=COMPACT.
innodb_strict_mode is not applicable to general tablespaces, which also support compressed tables. Tablespace management rules for general tablespaces are strictly enforced independently of innodb_strict_mode. For more information, see Section 15.1.21, "CREATE TABLESPACE Statement".

\section*{Compressing BLOB, VARCHAR, and TEXT Columns}

In an InnoDB table, BLOB, VARCHAR, and TEXT columns that are not part of the primary key may be stored on separately allocated overflow pages. We refer to these columns as off-page columns. Their values are stored on singly-linked lists of overflow pages.

For tables created in ROW_FORMAT=DYNAMIC or ROW_FORMAT=COMPRESSED, the values of BLOB, TEXT, or VARCHAR columns may be stored fully off-page, depending on their length and the length of the entire row. For columns that are stored off-page, the clustered index record only contains 20-byte pointers to the overflow pages, one per column. Whether any columns are stored off-page depends on the page size and the total size of the row. When the row is too long to fit entirely within the page of the clustered index, MySQL chooses the longest columns for off-page storage until the row fits on the clustered index page. As noted above, if a row does not fit by itself on a compressed page, an error occurs.

> |Note For tables created in ROW_FORMAT=DYNAMIC or ROW_FORMAT=COMPRESSED, TEXT and BLOB columns that are less than or equal to 40 bytes are always stored in-line.

Tables that use ROW_FORMAT=REDUNDANT and ROW_FORMAT=COMPACT store the first 768 bytes of BLOB, VARCHAR, and TEXT columns in the clustered index record along with the primary key. The 768byte prefix is followed by a 20-byte pointer to the overflow pages that contain the rest of the column value.

When a table is in COMPRESSED format, all data written to overflow pages is compressed "as is"; that is, MySQL applies the zlib compression algorithm to the entire data item. Other than the data, compressed overflow pages contain an uncompressed header and trailer comprising a page checksum and a link to the next overflow page, among other things. Therefore, very significant storage savings can be obtained for longer BLOB, TEXT, or VARCHAR columns if the data is highly compressible, as is often the case with text data. Image data, such as JPEG, is typically already compressed and so does not benefit much from being stored in a compressed table; the double compression can waste CPU cycles for little or no space savings.

The overflow pages are of the same size as other pages. A row containing ten columns stored offpage occupies ten overflow pages, even if the total length of the columns is only 8 K bytes. In an uncompressed table, ten uncompressed overflow pages occupy 160 K bytes. In a compressed table with an 8 K page size, they occupy only 80 K bytes. Thus, it is often more efficient to use compressed table format for tables with long column values.

For file-per-table tablespaces, using a 16K compressed page size can reduce storage and I/O costs for BLOB, VARCHAR, or TEXT columns, because such data often compress well, and might therefore require fewer overflow pages, even though the B-tree nodes themselves take as many pages as in the uncompressed form. General tablespaces do not support a 16K compressed page size (KEY_BLOCK_SIZE). For more information, see Section 17.6.3.3, "General Tablespaces".

\section*{Compression and the InnoDB Buffer Pool}

In a compressed InnoDB table, every compressed page (whether $1 \mathrm{~K}, 2 \mathrm{~K}, 4 \mathrm{~K}$ or 8 K ) corresponds to an uncompressed page of 16 K bytes (or a smaller size if innodb_page_size is set). To access the
data in a page, MySQL reads the compressed page from disk if it is not already in the buffer pool, then uncompresses the page to its original form. This section describes how InnoDB manages the buffer pool with respect to pages of compressed tables.

To minimize I/O and to reduce the need to uncompress a page, at times the buffer pool contains both the compressed and uncompressed form of a database page. To make room for other required database pages, MySQL can evict from the buffer pool an uncompressed page, while leaving the compressed page in memory. Or, if a page has not been accessed in a while, the compressed form of the page might be written to disk, to free space for other data. Thus, at any given time, the buffer pool might contain both the compressed and uncompressed forms of the page, or only the compressed form of the page, or neither.

MySQL keeps track of which pages to keep in memory and which to evict using a least-recentlyused (LRU) list, so that hot (frequently accessed) data tends to stay in memory. When compressed tables are accessed, MySQL uses an adaptive LRU algorithm to achieve an appropriate balance of compressed and uncompressed pages in memory. This adaptive algorithm is sensitive to whether the system is running in an I/O-bound or CPU-bound manner. The goal is to avoid spending too much processing time uncompressing pages when the CPU is busy, and to avoid doing excess I/O when the CPU has spare cycles that can be used for uncompressing compressed pages (that may already be in memory). When the system is I/O-bound, the algorithm prefers to evict the uncompressed copy of a page rather than both copies, to make more room for other disk pages to become memory resident. When the system is CPU-bound, MySQL prefers to evict both the compressed and uncompressed page, so that more memory can be used for "hot" pages and reducing the need to uncompress data in memory only in compressed form.

\section*{Compression and the InnoDB Redo Log Files}

Before a compressed page is written to a data file, MySQL writes a copy of the page to the redo log (if it has been recompressed since the last time it was written to the database). This is done to ensure that redo logs are usable for crash recovery, even in the unlikely case that the zlib library is upgraded and that change introduces a compatibility problem with the compressed data. Therefore, some increase in the size of log files, or a need for more frequent checkpoints, can be expected when using compression. The amount of increase in the log file size or checkpoint frequency depends on the number of times compressed pages are modified in a way that requires reorganization and recompression.

To create a compressed table in a file-per-table tablespace, innodb_file_per_table must be enabled. There is no dependence on the innodb_file_per_table setting when creating a compressed table in a general tablespace. For more information, see Section 17.6.3.3, "General Tablespaces".

\subsection*{17.9.1.6 Compression for OLTP Workloads}

Traditionally, the InnoDB compression feature was recommended primarily for read-only or readmostly workloads, such as in a data warehouse configuration. The rise of SSD storage devices, which are fast but relatively small and expensive, makes compression attractive also for OLTP workloads: high-traffic, interactive websites can reduce their storage requirements and their I/O operations per second (IOPS) by using compressed tables with applications that do frequent INSERT, UPDATE, and DELETE operations.

These configuration options let you adjust the way compression works for a particular MySQL instance, with an emphasis on performance and scalability for write-intensive operations:
- innodb_compression_level lets you turn the degree of compression up or down. A higher value lets you fit more data onto a storage device, at the expense of more CPU overhead during compression. A lower value lets you reduce CPU overhead when storage space is not critical, or you expect the data is not especially compressible.
- innodb_compression_failure_threshold_pct specifies a cutoff point for compression failures during updates to a compressed table. When this threshold is passed, MySQL begins to
leave additional free space within each new compressed page, dynamically adjusting the amount of free space up to the percentage of page size specified by innodb_compression_pad_pct_max
- innodb_compression_pad_pct_max lets you adjust the maximum amount of space reserved within each page to record changes to compressed rows, without needing to compress the entire page again. The higher the value, the more changes can be recorded without recompressing the page. MySQL uses a variable amount of free space for the pages within each compressed table, only when a designated percentage of compression operations "fail" at runtime, requiring an expensive operation to split the compressed page.
- innodb_log_compressed_pages lets you disable writing of images of re-compressed pages to the redo log. Re-compression may occur when changes are made to compressed data. This option is enabled by default to prevent corruption that could occur if a different version of the zlib compression algorithm is used during recovery. If you are certain that the zlib version is not subject to change, disable innodb_log_compressed_pages to reduce redo log generation for workloads that modify compressed data.

Because working with compressed data sometimes involves keeping both compressed and uncompressed versions of a page in memory at the same time, when using compression with an OLTP-style workload, be prepared to increase the value of the innodb_buffer_pool_size configuration option.

\subsection*{17.9.1.7 SQL Compression Syntax Warnings and Errors}

This section describes syntax warnings and errors that you may encounter when using the table compression feature with file-per-table tablespaces and general tablespaces.

\section*{SQL Compression Syntax Warnings and Errors for File-Per-Table Tablespaces}

When innodb_strict_mode is enabled (the default), specifying ROW_FORMAT=COMPRESSED or KEY_BLOCK_SIZE in CREATE TABLE or ALTER TABLE statements produces the following error if innodb_file_per_table is disabled.

ERROR 1031 (HY000): Table storage engine for 't1' doesn't have this option

\section*{Note}

The table is not created if the current configuration does not permit using compressed tables.

When innodb_strict_mode is disabled, specifying ROW_FORMAT=COMPRESSED or KEY_BLOCK_SIZE in CREATE TABLE or ALTER TABLE statements produces the following warnings if innodb_file_per_table is disabled.
```
mysql> SHOW WARNINGS;
+----------+-------+-------------------------------------------------------------
| Level | Code | Message
+---------+------+----------
| Warning | 1478 | InnoDB: KEY_BLOCK_SIZE requires innodb_file_per_table.
| Warning | 1478 | InnoDB: ignoring KEY_BLOCK_SIZE=4.
| Warning | 1478 | InnoDB: ROW_FORMAT=COMPRESSED requires innodb_file_per_table.
| Warning | 1478 | InnoDB: assuming ROW_FORMAT=DYNAMIC.
+---------+-------+-------------------------------------------------------------
```


\section*{Note}

These messages are only warnings, not errors, and the table is created without compression, as if the options were not specified.

The "non-strict" behavior lets you import a mysqldump file into a database that does not support compressed tables, even if the source database contained compressed tables. In that case, MySQL creates the table in ROW_FORMAT=DYNAMIC instead of preventing the operation.

To import the dump file into a new database, and have the tables re-created as they exist in the original database, ensure the server has the proper setting for the innodb_file_per_table configuration parameter.

The attribute KEY_BLOCK_SIZE is permitted only when ROW_FORMAT is specified as COMPRESSED or is omitted. Specifying a KEY_BLOCK_SIZE with any other ROW_FORMAT generates a warning that you can view with SHOW WARNINGS. However, the table is non-compressed; the specified KEY_BLOCK_SIZE is ignored).

\begin{tabular}{|l|l|l|}
\hline Level & Code & Message \\
\hline Warning & 1478 & \begin{tabular}{l} 
InnoDB: ignoring \\
KEY_BLOCK_SIZE=n unless \\
ROW_FORMAT=COMPRESSED.
\end{tabular} \\
\hline
\end{tabular}

If you are running with innodb_strict_mode enabled, the combination of a KEY_BLOCK_SIZE with any ROW_FORMAT other than COMPRESSED generates an error, not a warning, and the table is not created.

Table 17.11, "ROW_FORMAT and KEY_BLOCK_SIZE Options" provides an overview the ROW_FORMAT and KEY_BLOCK_SIZE options that are used with CREATE TABLE or ALTER TABLE.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.11 ROW_FORMAT and KEY_BLOCK_SIZE Options}
\begin{tabular}{|l|l|l|}
\hline Option & Usage Notes & Description \\
\hline ROW_FORMAT=REDUNDANT & Storage format used prior to MySQL 5.0.3 & Less efficient than ROW_FORMAT=COMPACT; for backward compatibility \\
\hline ROW_FORMAT=COMPACT & Default storage format since MySQL 5.0.3 & Stores a prefix of 768 bytes of long column values in the clustered index page, with the remaining bytes stored in an overflow page \\
\hline ROW_FORMAT=DYNAMIC & & Store values within the clustered index page if they fit; if not, stores only a 20-byte pointer to an overflow page (no prefix) \\
\hline ROW_FORMAT=COMPRESSED & & Compresses the table and indexes using zlib \\
\hline KEY_BLOCK_SIZE=n & & Specifies compressed page size of 1, 2, 4, 8 or 16 kilobytes; implies ROW_FORMAT=COMPRESSED. For general tablespaces, a KEY_BLOCK_SIZE value equal to the InnoDB page size is not permitted. \\
\hline
\end{tabular}
\end{table}

Table 17.12, "CREATE/ALTER TABLE Warnings and Errors when InnoDB Strict Mode is OFF" summarizes error conditions that occur with certain combinations of configuration parameters and options on the CREATE TABLE or ALTER TABLE statements, and how the options appear in the output of SHOW TABLE STATUS.

When innodb_strict_mode is OFF, MySQL creates or alters the table, but ignores certain settings as shown below. You can see the warning messages in the MySQL error log. When innodb_strict_mode is ON, these specified combinations of options generate errors, and the table is not created or altered. To see the full description of the error condition, issue the SHOW ERRORS statement: example:
```
mysql> CREATE TABLE x (id INT PRIMARY KEY, c INT)
    -> ENGINE=INNODB KEY_BLOCK_SIZE=33333;
ERROR 1005 (HY000): Can't create table 'test.x' (errno: 1478)
mysql> SHOW ERRORS;
+--------+------+--------------------------------------------
| Level | Code | Message |
+--------+------+--------------------------------------------
| Error | 1478 | InnoDB: invalid KEY_BLOCK_SIZE=33333. |
| Error | 1005 | Can't create table 'test.x' (errno: 1478) |
+--------+------+-------------------------------------------
```


\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.12 CREATE/ALTER TABLE Warnings and Errors when InnoDB Strict Mode is OFF}
\begin{tabular}{|l|l|l|}
\hline Syntax & Warning or Error Condition & Resulting ROW_FORMAT, as shown in SHOW TABLE STATUS \\
\hline ROW_FORMAT=REDUNDANT & None & REDUNDANT \\
\hline ROW_FORMAT=COMPACT & None & COMPACT \\
\hline ROW_FORMAT=COMPRESSED or ROW_FORMAT=DYNAMIC or KEY_BLOCK_SIZE is specified & Ignored for file-pertable tablespaces unless innodb_file_per_table is enabled. General tablespaces support all row formats. See Section 17.6.3.3, "General Tablespaces". & the default row format for file-per-table tablespaces; the specified row format for general tablespaces \\
\hline Invalid KEY_BLOCK_SIZE is specified (not 1, 2, 4, 8 or 16) & KEY_BLOCK_SIZE is ignored & the specified row format, or the default row format \\
\hline ROW_FORMAT=COMPRESSED and valid KEY_BLOCK_SIZE are specified & None; KEY_BLOCK_SIZE specified is used & COMPRESSED \\
\hline KEY_BLOCK_SIZE is specified with REDUNDANT, COMPACT or DYNAMIC row format & KEY_BLOCK_SIZE is ignored & REDUNDANT, COMPACT or DYNAMIC \\
\hline ROW_FORMAT is not one of REDUNDANT, COMPACT, DYNAMIC or COMPRESSED & Ignored if recognized by the MySQL parser. Otherwise, an error is issued. & the default row format or N/A \\
\hline
\end{tabular}
\end{table}

When innodb_strict_mode is ON, MySQL rejects invalid ROW_FORMAT or KEY_BLOCK_SIZE parameters and issues errors. Strict mode is ON by default. When innodb_strict_mode is OFF, MySQL issues warnings instead of errors for ignored invalid parameters.

It is not possible to see the chosen KEY_BLOCK_SIZE using SHOW TABLE STATUS. The statement SHOW CREATE TABLE displays the KEY_BLOCK_SIZE (even if it was ignored when creating the table). The real compressed page size of the table cannot be displayed by MySQL.

\section*{SQL Compression Syntax Warnings and Errors for General Tablespaces}
- If FILE_BLOCK_SIZE was not defined for the general tablespace when the tablespace was created, the tablespace cannot contain compressed tables. If you attempt to add a compressed table, an error is returned, as shown in the following example:
```
mysql> CREATE TABLESPACE ˋts1ˋ ADD DATAFILE 'ts1.ibd' Engine=InnoDB;
mysql> CREATE TABLE t1 (c1 INT PRIMARY KEY) TABLESPACE ts1 ROW_FORMAT=COMPRESSED
    KEY_BLOCK_SIZE=8;
ERROR 1478 (HY000): InnoDB: Tablespace ˋts1ˋ cannot contain a COMPRESSED table
```

- Attempting to add a table with an invalid KEY_BLOCK_SIZE to a general tablespace returns an error, as shown in the following example:
```
mysql> CREATE TABLESPACE ˋts2ˋ ADD DATAFILE 'ts2.ibd' FILE_BLOCK_SIZE = 8192 Engine=InnoDB;
mysql> CREATE TABLE t2 (c1 INT PRIMARY KEY) TABLESPACE ts2 ROW_FORMAT=COMPRESSED
    KEY_BLOCK_SIZE=4;
ERROR 1478 (HY000): InnoDB: Tablespace ˋts2ˋ uses block size 8192 and cannot
contain a table with physical page size 4096
```


For general tablespaces, the KEY_BLOCK_SIZE of the table must be equal to the FILE_BLOCK_SIZE of the tablespace divided by 1024. For example, if the FILE_BLOCK_SIZE of the tablespace is 8192, the KEY_BLOCK_SIZE of the table must be 8 .
- Attempting to add a table with an uncompressed row format to a general tablespace configured to store compressed tables returns an error, as shown in the following example:
```
mysql> CREATE TABLESPACE ˋts3ˋ ADD DATAFILE 'ts3.ibd' FILE_BLOCK_SIZE = 8192 Engine=InnoDB;
mysql> CREATE TABLE t3 (c1 INT PRIMARY KEY) TABLESPACE ts3 ROW_FORMAT=COMPACT;
ERROR 1478 (HY000): InnoDB: Tablespace ˋts3ˋ uses block size 8192 and cannot
contain a table with physical page size 16384
```

innodb_strict_mode is not applicable to general tablespaces. Tablespace management rules for general tablespaces are strictly enforced independently of innodb_strict_mode. For more information, see Section 15.1.21, "CREATE TABLESPACE Statement".

For more information about using compressed tables with general tablespaces, see Section 17.6.3.3, "General Tablespaces".

\subsection*{17.9.2 InnoDB Page Compression}

InnoDB supports page-level compression for tables that reside in file-per-table tablespaces. This feature is referred to as Transparent Page Compression. Page compression is enabled by specifying the COMPRESSION attribute with CREATE TABLE or ALTER TABLE. Supported compression algorithms include Zlib and LZ4.

\section*{Supported Platforms}

Page compression requires sparse file and hole punching support. Page compression is supported on Windows with NTFS, and on the following subset of MySQL-supported Linux platforms where the kernel level provides hole punching support:
- RHEL 7 and derived distributions that use kernel version 3.10.0-123 or higher
- OEL 5.10 (UEK2) kernel version 2.6.39 or higher
- OEL 6.5 (UEK3) kernel version 3.8.13 or higher
- OEL 7.0 kernel version 3.8.13 or higher
- SLE11 kernel version 3.0-x
- SLE12 kernel version 3.12-x
- OES11 kernel version 3.0-x
- Ubuntu 14.0.4 LTS kernel version 3.13 or higher
- Ubuntu 12.0.4 LTS kernel version 3.2 or higher
- Debian 7 kernel version 3.2 or higher

\section*{Note}

All of the available file systems for a given Linux distribution may not support hole punching.

\section*{How Page Compression Works}

When a page is written, it is compressed using the specified compression algorithm. The compressed data is written to disk, where the hole punching mechanism releases empty blocks from the end of the page. If compression fails, data is written out as-is.

\section*{Hole Punch Size on Linux}

On Linux systems, the file system block size is the unit size used for hole punching. Therefore, page compression only works if page data can be compressed to a size that is less than or equal to the InnoDB page size minus the file system block size. For example, if innodb_page_size= 16 K and the file system block size is 4 K , page data must compress to less than or equal to 12 K to make hole punching possible.

\section*{Hole Punch Size on Windows}

On Windows systems, the underlying infrastructure for sparse files is based on NTFS compression. Hole punching size is the NTFS compression unit, which is 16 times the NTFS cluster size. Cluster sizes and their compression units are shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.13 Windows NTFS Cluster Size and Compression Units}
\begin{tabular}{|l|l|}
\hline Cluster Size & Compression Unit \\
\hline 512 Bytes & 8 KB \\
\hline 1 KB & 16 KB \\
\hline 2 KB & 32 KB \\
\hline 4 KB & 64 KB \\
\hline
\end{tabular}
\end{table}

Page compression on Windows systems only works if page data can be compressed to a size that is less than or equal to the InnoDB page size minus the compression unit size.

The default NTFS cluster size is 4 KB , for which the compression unit size is 64 KB . This means that page compression has no benefit for an out-of-the box Windows NTFS configuration, as the maximum innodb_page_size is also 64 KB .

For page compression to work on Windows, the file system must be created with a cluster size smaller than 4 K , and the innodb_page_size must be at least twice the size of the compression unit. For example, for page compression to work on Windows, you could build the file system with a cluster size of 512 Bytes (which has a compression unit of 8 KB ) and initialize InnoDB with an innodb_page_size value of 16 K or greater.

\section*{Enabling Page Compression}

To enable page compression, specify the COMPRESSION attribute in the CREATE TABLE statement. For example:

CREATE TABLE t1 (c1 INT) COMPRESSION="zlib";
You can also enable page compression in an ALTER TABLE statement. However, ALTER TABLE ... COMPRESSION only updates the tablespace compression attribute. Writes to the tablespace that occur after setting the new compression algorithm use the new setting, but to apply the new compression algorithm to existing pages, you must rebuild the table using OPTIMIZE TABLE.

ALTER TABLE t1 COMPRESSION="zlib";
OPTIMIZE TABLE t1;

\section*{Disabling Page Compression}

To disable page compression, set COMPRESSION=None using ALTER TABLE. Writes to the tablespace that occur after setting COMPRESSION=None no longer use page compression. To uncompress existing pages, you must rebuild the table using OPTIMIZE TABLE after setting COMPRESSION=None.
```
ALTER TABLE t1 COMPRESSION="None";
OPTIMIZE TABLE t1;
```


\section*{Page Compression Metadata}

Page compression metadata is found in the Information Schema INNODB_TABLESPACES table, in the following columns:
- FS_BLOCK_SIZE: The file system block size, which is the unit size used for hole punching.
- FILE_SIZE: The apparent size of the file, which represents the maximum size of the file, uncompressed.
- ALLOCATED_SIZE: The actual size of the file, which is the amount of space allocated on disk.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3141.jpg?height=109&width=99&top_left_y=817&top_left_x=370)

\section*{Note}

On Unix-like systems, ls -l tablespace_name.ibd shows the apparent file size (equivalent to FILE_SIZE) in bytes. To view the actual amount of space allocated on disk (equivalent to ALLOCATED_SIZE), use du - -block-size=1 tablespace_name.ibd. The --block-size=1 option prints the allocated space in bytes instead of blocks, so that it can be compared to ls -1 output.

Use SHOW CREATE TABLE to view the current page compression setting (Zlib, Lz4, or None). A table may contain a mix of pages with different compression settings.

In the following example, page compression metadata for the employees table is retrieved from the Information Schema INNODB_TABLESPACES table.
```
# Create the employees table with Zlib page compression
CREATE TABLE employees (
    emp_no INT NOT NULL,
    birth_date DATE NOT NULL,
    first_name VARCHAR(14) NOT NULL,
    last_name VARCHAR(16) NOT NULL,
    gender ENUM ('M','F') NOT NULL,
    hire_date DATE NOT NULL,
    PRIMARY KEY (emp_no)
) COMPRESSION="zlib";
# Insert data (not shown)
# Query page compression metadata in INFORMATION_SCHEMA.INNODB_TABLESPACES
mysql> SELECT SPACE, NAME, FS_BLOCK_SIZE, FILE_SIZE, ALLOCATED_SIZE FROM
        INFORMATION_SCHEMA.INNODB_TABLESPACES WHERE NAME='employees/employees'\G
************************** 1. row ******************************
SPACE: 45
NAME: employees/employees
FS_BLOCK_SIZE: 4096
FILE_SIZE: 23068672
ALLOCATED_SIZE: 19415040
```


Page compression metadata for the employees table shows that the apparent file size is 23068672 bytes while the actual file size (with page compression) is 19415040 bytes. The file system block size is 4096 bytes, which is the block size used for hole punching.

\section*{Identifying Tables Using Page Compression}

To identify tables for which page compression is enabled, you can check the Information Schema TABLES table's CREATE_OPTIONS column for tables defined with the COMPRESSION attribute:
```
mysql> SELECT TABLE_NAME, TABLE_SCHEMA, CREATE_OPTIONS FROM INFORMATION_SCHEMA.TABLES
    WHERE CREATE_OPTIONS LIKE '%COMPRESSION=%';
+-------------+---------------+---------------------+
```

```
| TABLE_NAME | TABLE_SCHEMA | CREATE_OPTIONS |
+-------------+---------------+-------------------+
| employees | test | COMPRESSION="zlib" |
+-------------+--------------+-------------------+
```


SHOW CREATE TABLE also shows the COMPRESSION attribute, if used.

\section*{Page Compression Limitations and Usage Notes}
- Page compression is disabled if the file system block size (or compression unit size on Windows) * 2 > innodb_page_size.
- Page compression is not supported for tables that reside in shared tablespaces, which include the system tablespace, temporary tablespaces, and general tablespaces.
- Page compression is not supported for undo log tablespaces.
- Page compression is not supported for redo log pages.
- R-tree pages, which are used for spatial indexes, are not compressed.
- Pages that belong to compressed tables (ROW_FORMAT=COMPRESSED) are left as-is.
- During recovery, updated pages are written out in an uncompressed form.
- Loading a page-compressed tablespace on a server that does not support the compression algorithm that was used causes an I/O error.
- Before downgrading to an earlier version of MySQL that does not support page compression, uncompress the tables that use the page compression feature. To uncompress a table, run ALTER TABLE ... COMPRESSION=None and OPTIMIZE TABLE.
- Page-compressed tablespaces can be copied between Linux and Windows servers if the compression algorithm that was used is available on both servers.
- Preserving page compression when moving a page-compressed tablespace file from one host to another requires a utility that preserves sparse files.
- Better page compression may be achieved on Fusion-io hardware with NVMFS than on other platforms, as NVMFS is designed to take advantage of punch hole functionality.
- Using the page compression feature with a large InnoDB page size and relatively small file system block size could result in write amplification. For example, a maximum InnoDB page size of 64 KB with a 4 KB file system block size may improve compression but may also increase demand on the buffer pool, leading to increased I/O and potential write amplification.

\subsection*{17.10 InnoDB Row Formats}

The row format of a table determines how its rows are physically stored, which in turn can affect the performance of queries and DML operations. As more rows fit into a single disk page, queries and index lookups can work faster, less cache memory is required in the buffer pool, and less I/O is required to write out updated values.

The data in each table is divided into pages. The pages that make up each table are arranged in a tree data structure called a B-tree index. Table data and secondary indexes both use this type of structure. The B-tree index that represents an entire table is known as the clustered index, which is organized according to the primary key columns. The nodes of a clustered index data structure contain the values of all columns in the row. The nodes of a secondary index structure contain the values of index columns and primary key columns.

Variable-length columns are an exception to the rule that column values are stored in B-tree index nodes. Variable-length columns that are too long to fit on a B-tree page are stored on separately allocated disk pages called overflow pages. Such columns are referred to as off-page columns. The
values of off-page columns are stored in singly-linked lists of overflow pages, with each such column having its own list of one or more overflow pages. Depending on column length, all or a prefix of variable-length column values are stored in the B-tree to avoid wasting storage and having to read a separate page.

The InnoDB storage engine supports four row formats: REDUNDANT, COMPACT, DYNAMIC, and COMPRESSED.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.14 InnoDB Row Format Overview}
\begin{tabular}{|l|l|l|l|l|l|}
\hline Row Format & Compact Storage Characteristics & Enhanced VariableLength Column Storage & Large Index Key Prefix Support & Compression Support & Supported Tablespace Types \\
\hline REDUNDANT & No & No & No & No & system, file-pertable, general \\
\hline COMPACT & Yes & No & No & No & system, file-pertable, general \\
\hline DYNAMIC & Yes & Yes & Yes & No & system, file-pertable, general \\
\hline COMPRESSED & Yes & Yes & Yes & Yes & file-per-table, general \\
\hline
\end{tabular}
\end{table}

The topics that follow describe row format storage characteristics and how to define and determine the row format of a table.
- REDUNDANT Row Format
- COMPACT Row Format
- DYNAMIC Row Format
- COMPRESSED Row Format
- Defining the Row Format of a Table
- Determining the Row Format of a Table

\section*{REDUNDANT Row Format}

The REDUNDANT format provides compatibility with older versions of MySQL.
Tables that use the REDUNDANT row format store the first 768 bytes of variable-length column values (VARCHAR, VARBINARY, and BLOB and TEXT types) in the index record within the B-tree node, with the remainder stored on overflow pages. Fixed-length columns greater than or equal to 768 bytes are encoded as variable-length columns, which can be stored off-page. For example, a CHAR ( 255 ) column can exceed 768 bytes if the maximum byte length of the character set is greater than 3 , as it is with utf8mb4.

If the value of a column is 768 bytes or less, an overflow page is not used, and some savings in I/O may result, since the value is stored entirely in the B-tree node. This works well for relatively short BLOB column values, but may cause B-tree nodes to fill with data rather than key values, reducing their efficiency. Tables with many BLOB columns could cause B-tree nodes to become too full, and contain too few rows, making the entire index less efficient than if rows were shorter or column values were stored off-page.

\section*{REDUNDANT Row Format Storage Characteristics}

The REDUNDANT row format has the following storage characteristics:
- Each index record contains a 6-byte header. The header is used to link together consecutive records, and for row-level locking.
- Records in the clustered index contain fields for all user-defined columns. In addition, there is a 6byte transaction ID field and a 7-byte roll pointer field.
- If no primary key is defined for a table, each clustered index record also contains a 6-byte row ID field.
- Each secondary index record contains all the primary key columns defined for the clustered index key that are not in the secondary index.
- A record contains a pointer to each field of the record. If the total length of the fields in a record is less than 128 bytes, the pointer is one byte; otherwise, two bytes. The array of pointers is called the record directory. The area where the pointers point is the data part of the record.
- Internally, fixed-length character columns such as CHAR(10) in stored in fixed-length format. Trailing spaces are not truncated from VARCHAR columns.
- Fixed-length columns greater than or equal to 768 bytes are encoded as variable-length columns, which can be stored off-page. For example, a CHAR ( 255 ) column can exceed 768 bytes if the maximum byte length of the character set is greater than 3 , as it is with utf 8 mb 4 .
- An SQL NULL value reserves one or two bytes in the record directory. An SQL NULL value reserves zero bytes in the data part of the record if stored in a variable-length column. For a fixed-length column, the fixed length of the column is reserved in the data part of the record. Reserving fixed space for NULL values permits columns to be updated in place from NULL to non-NULL values without causing index page fragmentation.

\section*{COMPACT Row Format}

The COMPACT row format reduces row storage space by about $20 \%$ compared to the REDUNDANT row format, at the cost of increasing CPU use for some operations. If your workload is a typical one that is limited by cache hit rates and disk speed, COMPACT format is likely to be faster. If the workload is limited by CPU speed, compact format might be slower.

Tables that use the COMPACT row format store the first 768 bytes of variable-length column values (VARCHAR, VARBINARY, and BLOB and TEXT types) in the index record within the B-tree node, with the remainder stored on overflow pages. Fixed-length columns greater than or equal to 768 bytes are encoded as variable-length columns, which can be stored off-page. For example, a CHAR ( 255 ) column can exceed 768 bytes if the maximum byte length of the character set is greater than 3 , as it is with utf8mb4.

If the value of a column is 768 bytes or less, an overflow page is not used, and some savings in I/O may result, since the value is stored entirely in the B-tree node. This works well for relatively short BLOB column values, but may cause B-tree nodes to fill with data rather than key values, reducing their efficiency. Tables with many BLOB columns could cause B-tree nodes to become too full, and contain too few rows, making the entire index less efficient than if rows were shorter or column values were stored off-page.

\section*{COMPACT Row Format Storage Characteristics}

The COMPACT row format has the following storage characteristics:
- Each index record contains a 5-byte header that may be preceded by a variable-length header. The header is used to link together consecutive records, and for row-level locking.
- The variable-length part of the record header contains a bit vector for indicating NULL columns. If the number of columns in the index that can be NULL is $N$, the bit vector occupies CEILING( $N / 8$ ) bytes. (For example, if there are anywhere from 9 to 16 columns that can be NULL, the bit vector uses two bytes.) Columns that are NULL do not occupy space other than the bit in this vector. The variable-
length part of the header also contains the lengths of variable-length columns. Each length takes one or two bytes, depending on the maximum length of the column. If all columns in the index are NOT NULL and have a fixed length, the record header has no variable-length part.
- For each non-NULL variable-length field, the record header contains the length of the column in one or two bytes. Two bytes are only needed if part of the column is stored externally in overflow pages or the maximum length exceeds 255 bytes and the actual length exceeds 127 bytes. For an externally stored column, the 2-byte length indicates the length of the internally stored part plus the 20-byte pointer to the externally stored part. The internal part is 768 bytes, so the length is $768+20$. The 20-byte pointer stores the true length of the column.
- The record header is followed by the data contents of non-NULL columns.
- Records in the clustered index contain fields for all user-defined columns. In addition, there is a 6byte transaction ID field and a 7-byte roll pointer field.
- If no primary key is defined for a table, each clustered index record also contains a 6-byte row ID field.
- Each secondary index record contains all the primary key columns defined for the clustered index key that are not in the secondary index. If any of the primary key columns are variable length, the record header for each secondary index has a variable-length part to record their lengths, even if the secondary index is defined on fixed-length columns.
- Internally, for nonvariable-length character sets, fixed-length character columns such as CHAR( 10 ) are stored in a fixed-length format.

Trailing spaces are not truncated from VARCHAR columns.
- Internally, for variable-length character sets such as utf 8 mb 3 and utf 8 mb 4 , InnoDB attempts to store CHAR $(N)$ in $N$ bytes by trimming trailing spaces. If the byte length of a CHAR $(N)$ column value exceeds $N$ bytes, trailing spaces are trimmed to a maximum of the column value byte length. The maximum length of a $\operatorname{CHAR}(N)$ column is the maximum character byte length $\times N$.

A minimum of $N$ bytes is reserved for $\operatorname{CHAR}(N)$. Reserving the minimum space $N$ in many cases enables column updates to be done in place without causing index page fragmentation. By comparison, $\operatorname{CHAR}(N)$ columns occupy the maximum character byte length × $N$ when using the REDUNDANT row format.

Fixed-length columns greater than or equal to 768 bytes are encoded as variable-length fields, which can be stored off-page. For example, a CHAR $(255)$ column can exceed 768 bytes if the maximum byte length of the character set is greater than 3 , as it is with utf 8 mb 4 .

\section*{DYNAMIC Row Format}

The DYNAMIC row format offers the same storage characteristics as the COMPACT row format but adds enhanced storage capabilities for long variable-length columns and supports large index key prefixes.

When a table is created with ROW_FORMAT=DYNAMIC, InnoDB can store long variable-length column values (for VARCHAR, VARBINARY, and BLOB and TEXT types) fully off-page, with the clustered index record containing only a 20-byte pointer to the overflow page. Fixed-length fields greater than or equal to 768 bytes are encoded as variable-length fields. For example, a CHAR ( 255 ) column can exceed 768 bytes if the maximum byte length of the character set is greater than 3 , as it is with utf 8 mb 4 .

Whether columns are stored off-page depends on the page size and the total size of the row. When a row is too long, the longest columns are chosen for off-page storage until the clustered index record fits on the B-tree page. TEXT and BLOB columns that are less than or equal to 40 bytes are stored in line.

The DYNAMIC row format maintains the efficiency of storing the entire row in the index node if it fits (as do the COMPACT and REDUNDANT formats), but the DYNAMIC row format avoids the problem of filling B-tree nodes with a large number of data bytes of long columns. The DYNAMIC row format is based on
the idea that if a portion of a long data value is stored off-page, it is usually most efficient to store the entire value off-page. With DYNAMIC format, shorter columns are likely to remain in the B-tree node, minimizing the number of overflow pages required for a given row.

The DYNAMIC row format supports index key prefixes up to 3072 bytes.
Tables that use the DYNAMIC row format can be stored in the system tablespace, file-per-table tablespaces, and general tablespaces. To store DYNAMIC tables in the system tablespace, either disable innodb_file_per_table and use a regular CREATE TABLE or ALTER TABLE statement, or use the TABLESPACE [=] innodb_system table option with CREATE TABLE or ALTER TABLE. The innodb_file_per_table variable is not applicable to general tablespaces, nor is it applicable when using the TABLESPACE [=] innodb_system table option to store DYNAMIC tables in the system tablespace.

\section*{DYNAMIC Row Format Storage Characteristics}

The DYNAMIC row format is a variation of the COMPACT row format. For storage characteristics, see COMPACT Row Format Storage Characteristics.

\section*{COMPRESSED Row Format}

The COMPRESSED row format offers the same storage characteristics and capabilities as the DYNAMIC row format but adds support for table and index data compression.

The COMPRESSED row format uses similar internal details for off-page storage as the DYNAMIC row format, with additional storage and performance considerations from the table and index data being compressed and using smaller page sizes. With the COMPRESSED row format, the KEY_BLOCK_SIZE option controls how much column data is stored in the clustered index, and how much is placed on overflow pages. For more information about the COMPRESSED row format, see Section 17.9, "InnoDB Table and Page Compression".

The COMPRESSED row format supports index key prefixes up to 3072 bytes.
Tables that use the COMPRESSED row format can be created in file-per-table tablespaces or general tablespaces. The system tablespace does not support the COMPRESSED row format. To store a COMPRESSED table in a file-per-table tablespace, the innodb_file_per_table variable must be enabled. The innodb_file_per_table variable is not applicable to general tablespaces. General tablespaces support all row formats with the caveat that compressed and uncompressed tables cannot coexist in the same general tablespace due to different physical page sizes. For more information, see Section 17.6.3.3, "General Tablespaces".

\section*{Compressed Row Format Storage Characteristics}

The COMPRESSED row format is a variation of the COMPACT row format. For storage characteristics, see COMPACT Row Format Storage Characteristics.

\section*{Defining the Row Format of a Table}

The default row format for InnoDB tables is defined by innodb_default_row_format variable, which has a default value of DYNAMIC. The default row format is used when the ROW_FORMAT table option is not defined explicitly or when ROW_FORMAT=DEFAULT is specified.

The row format of a table can be defined explicitly using the ROW_FORMAT table option in a CREATE TABLE or ALTER TABLE statement. For example:

CREATE TABLE t1 (c1 INT) ROW_FORMAT=DYNAMIC;
An explicitly defined ROW_FORMAT setting overrides the default row format. Specifying ROW_FORMAT=DEFAULT is equivalent to using the implicit default.

The innodb_default_row_format variable can be set dynamically:
```
mysql> SET GLOBAL innodb_default_row_format=DYNAMIC;
```


Valid innodb_default_row_format options include DYNAMIC, COMPACT, and REDUNDANT. The COMPRESSED row format, which is not supported for use in the system tablespace, cannot be defined as the default. It can only be specified explicitly in a CREATE TABLE or ALTER TABLE statement. Attempting to set the innodb_default_row_format variable to COMPRESSED returns an error:
```
mysql> SET GLOBAL innodb_default_row_format=COMPRESSED;
ERROR 1231 (42000): Variable 'innodb_default_row_format'
can't be set to the value of 'COMPRESSED'
```


Newly created tables use the row format defined by the innodb_default_row_format variable when a ROW_FORMAT option is not specified explicitly, or when ROW_FORMAT=DEFAULT is used. For example, the following CREATE TABLE statements use the row format defined by the innodb_default_row_format variable.

CREATE TABLE t1 (c1 INT);
```
CREATE TABLE t2 (c1 INT) ROW_FORMAT=DEFAULT;
```


When a ROW_FORMAT option is not specified explicitly, or when ROW_FORMAT=DEFAULT is used, an operation that rebuilds a table silently changes the row format of the table to the format defined by the innodb_default_row_format variable.

Table-rebuilding operations include ALTER TABLE operations that use ALGORITHM=COPY or ALGORITHM=INPLACE where table rebuilding is required. See Section 17.12.1, "Online DDL Operations" for more information. OPTIMIZE TABLE is also a table-rebuilding operation.

The following example demonstrates a table-rebuilding operation that silently changes the row format of a table created without an explicitly defined row format.
```
mysql> SELECT @@innodb_default_row_format;
+-------------------------------+
| @@innodb_default_row_format |
+-------------------------------+
| dynamic |
+------------------------------+
mysql> CREATE TABLE t1 (c1 INT);
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_TABLES WHERE NAME LIKE 'test/t1' \G
*************************** 1. row *****************************
        TABLE_ID: 54
                NAME: test/t1
                FLAG: 33
            N_COLS: 4
                SPACE: 35
    ROW_FORMAT: Dynamic
ZIP_PAGE_SIZE: 0
    SPACE_TYPE: Single
mysql> SET GLOBAL innodb_default_row_format=COMPACT;
mysql> ALTER TABLE t1 ADD COLUMN (c2 INT);
mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_TABLES WHERE NAME LIKE 'test/t1' \G
*************************** 1. row *****************************
        TABLE_ID: 55
                NAME: test/t1
                FLAG: 1
            N_COLS: 5
                SPACE: 36
    ROW_FORMAT: Compact
ZIP_PAGE_SIZE: 0
    SPACE_TYPE: Single
```


Consider the following potential issues before changing the row format of existing tables from REDUNDANT or COMPACT to DYNAMIC.
- The REDUNDANT and COMPACT row formats support a maximum index key prefix length of 767 bytes whereas DYNAMIC and COMPRESSED row formats support an index key prefix length of 3072 bytes. In a replication environment, if the innodb_default_row_format variable is set to DYNAMIC on the source, and set to COMPACT on the replica, the following DDL statement, which does not explicitly define a row format, succeeds on the source but fails on the replica:
```
CREATE TABLE t1 (c1 INT PRIMARY KEY, c2 VARCHAR(5000), KEY i1(c2(3070)));
```


For related information, see Section 17.21, "InnoDB Limits".
- Importing a table that does not explicitly define a row format results in a schema mismatch error if the innodb_default_row_format setting on the source server differs from the setting on the destination server. For more information, see Section 17.6.1.3, "Importing InnoDB Tables".

\section*{Determining the Row Format of a Table}

To determine the row format of a table, use SHOW TABLE STATUS:
```
mysql> SHOW TABLE STATUS IN test1\G
************************** 1. row ******************************
                    Name: t1
                    Engine: InnoDB
                Version: 10
        Row_format: Dynamic
                    Rows: 0
Avg_row_length: 0
    Data_length: 16384
Max_data_length: 0
    Index_length: 16384
            Data_free: 0
Auto_increment: 1
    Create_time: 2016-09-14 16:29:38
    Update_time: NULL
        Check_time: NULL
            Collation: utf8mb4_0900_ai_ci
                Checksum: NULL
Create_options:
                Comment:
```


Alternatively, query the Information Schema INNODB_TABLES table:
```
mysql> SELECT NAME, ROW_FORMAT FROM INFORMATION_SCHEMA.INNODB_TABLES WHERE NAME='test1/t1';
+-----------+-------------+
| NAME | ROW_FORMAT |
+----------+------------+
| test1/t1 | Dynamic |
+----------+------------+
```


\subsection*{17.11 InnoDB Disk I/O and File Space Management}

As a DBA, you must manage disk I/O to keep the I/O subsystem from becoming saturated, and manage disk space to avoid filling up storage devices. The ACID design model requires a certain amount of I/O that might seem redundant, but helps to ensure data reliability. Within these constraints, InnoDB tries to optimize the database work and the organization of disk files to minimize the amount of disk I/O. Sometimes, I/O is postponed until the database is not busy, or until everything needs to be brought to a consistent state, such as during a database restart after a fast shutdown.

This section discusses the main considerations for I/O and disk space with the default kind of MySQL tables (also known as InnoDB tables):
- Controlling the amount of background I/O used to improve query performance.
- Enabling or disabling features that provide extra durability at the expense of additional I/O.
- Organizing tables into many small files, a few larger files, or a combination of both.
- Balancing the size of redo log files against the I/O activity that occurs when the log files become full.
- How to reorganize a table for optimal query performance.

\subsection*{17.11.1 InnoDB Disk I/O}

InnoDB uses asynchronous disk I/O where possible, by creating a number of threads to handle I/O operations, while permitting other database operations to proceed while the I/O is still in progress. On Linux and Windows platforms, InnoDB uses the available OS and library functions to perform "native" asynchronous I/O. On other platforms, InnoDB still uses I/O threads, but the threads may actually wait for I/O requests to complete; this technique is known as "simulated" asynchronous I/O.

\section*{Read-Ahead}

If InnoDB can determine there is a high probability that data might be needed soon, it performs readahead operations to bring that data into the buffer pool so that it is available in memory. Making a few large read requests for contiguous data can be more efficient than making several small, spread-out requests. There are two read-ahead heuristics in InnoDB:
- In sequential read-ahead, if InnoDB notices that the access pattern to a segment in the tablespace is sequential, it posts in advance a batch of reads of database pages to the I/O system.
- In random read-ahead, if InnoDB notices that some area in a tablespace seems to be in the process of being fully read into the buffer pool, it posts the remaining reads to the I/O system.

For information about configuring read-ahead heuristics, see Section 17.8.3.4, "Configuring InnoDB Buffer Pool Prefetching (Read-Ahead)".

\section*{Doublewrite Buffer}

InnoDB uses a novel file flush technique involving a structure called the doublewrite buffer, which is enabled by default in most cases (innodb_doublewrite=ON). It adds safety to recovery following an unexpected exit or power outage, and improves performance on most varieties of Unix by reducing the need for fsync ( ) operations.

Before writing pages to a data file, InnoDB first writes them to a storage area called the doublewrite buffer. Only after the write and the flush to the doublewrite buffer has completed does InnoDB write the pages to their proper positions in the data file. If there is an operating system, storage subsystem, or unexpected mysqld process exit in the middle of a page write (causing a torn page condition), InnoDB can later find a good copy of the page from the doublewrite buffer during recovery.

For more information about the doublewrite buffer, see Section 17.6.4, "Doublewrite Buffer".

\subsection*{17.11.2 File Space Management}

The data files that you define in the configuration file using the innodb_data_file_path configuration option form the InnoDB system tablespace. The files are logically concatenated to form the system tablespace. There is no striping in use. You cannot define where within the system tablespace your tables are allocated. In a newly created system tablespace, InnoDB allocates space starting from the first data file.

To avoid the issues that come with storing all tables and indexes inside the system tablespace, you can enable the innodb_file_per_table configuration option (the default), which stores each newly created table in a separate tablespace file (with extension .ibd). For tables stored this way, there is less fragmentation within the disk file, and when the table is truncated, the space is returned to the operating system rather than still being reserved by InnoDB within the system tablespace. For more information, see Section 17.6.3.2, "File-Per-Table Tablespaces".

You can also store tables in general tablespaces. General tablespaces are shared tablespaces created using CREATE TABLESPACE syntax. They can be created outside of the MySQL data directory, are
capable of holding multiple tables, and support tables of all row formats. For more information, see Section 17.6.3.3, "General Tablespaces".

\section*{Pages, Extents, Segments, and Tablespaces}

Each tablespace consists of database pages. Every tablespace in a MySQL instance has the same page size. By default, all tablespaces have a page size of 16 KB ; you can reduce the page size to 8 KB or 4 KB by specifying the innodb_page_size option when you create the MySQL instance. You can also increase the page size to 32 KB or 64 KB . For more information, refer to the innodb_page_size documentation.

The pages are grouped into extents of size 1 MB for pages up to 16 KB in size ( 64 consecutive 16 KB pages, or 1288 KB pages, or 2564 KB pages). For a page size of 32 KB , extent size is 2 MB . For page size of 64 KB , extent size is 4 MB . The "files" inside a tablespace are called segments in InnoDB. (These segments are different from the rollback segment, which actually contains many tablespace segments.)

When a segment grows inside the tablespace, InnoDB allocates the first 32 pages to it one at a time. After that, InnoDB starts to allocate whole extents to the segment. InnoDB can add up to 4 extents at a time to a large segment to ensure good sequentiality of data.

Two segments are allocated for each index in InnoDB. One is for nonleaf nodes of the B-tree, the other is for the leaf nodes. Keeping the leaf nodes contiguous on disk enables better sequential I/O operations, because these leaf nodes contain the actual table data.

Some pages in the tablespace contain bitmaps of other pages, and therefore a few extents in an InnoDB tablespace cannot be allocated to segments as a whole, but only as individual pages.

When you ask for available free space in the tablespace by issuing a SHOW TABLE STATUS statement, InnoDB reports the extents that are definitely free in the tablespace. InnoDB always reserves some extents for cleanup and other internal purposes; these reserved extents are not included in the free space.

When you delete data from a table, InnoDB contracts the corresponding B-tree indexes. Whether the freed space becomes available for other users depends on whether the pattern of deletes frees individual pages or extents to the tablespace. Dropping a table or deleting all rows from it is guaranteed to release the space to other users, but remember that deleted rows are physically removed only by the purge operation, which happens automatically some time after they are no longer needed for transaction rollbacks or consistent reads. (See Section 17.3, "InnoDB Multi-Versioning".)

\section*{Configuring the Percentage of Reserved File Segment Pages}

The innodb_segment_reserve_factor variablepermits defining the percentage of tablespace file segment pages reserved as empty pages. A percentage of pages are reserved for future growth so that pages in the B-tree can be allocated contiguously. The ability to modify the percentage of reserved pages permits fine-tuning InnoDB to address issues of data fragmentation or inefficient use of storage space.

The setting is applicable to file-per-table and general tablespaces. The innodb_segment_reserve_factor default setting is $\mathbf{1 2 . 5}$ percent.

The innodb_segment_reserve_factor variable is dynamic and can be configured using a SET statement. For example:
mysql> SET GLOBAL innodb_segment_reserve_factor=10;

\section*{How Pages Relate to Table Rows}

For for $4 \mathrm{~KB}, 8 \mathrm{~KB}, 16 \mathrm{~KB}$, and 32 KB innodb_page_size settings, the maximum row length is slightly less than half a database page size. For example, the maximum row length is slightly less than 8 KB
for the default 16 KB InnoDB page size. For a 64 KB innodb_page_size setting, the maximum row length is slightly less than 16 KB .

If a row does not exceed the maximum row length, all of it is stored locally within the page. If a row exceeds the maximum row length, variable-length columns are chosen for external off-page storage until the row fits within the maximum row length limit. External off-page storage for variable-length columns differs by row format:
- COMPACT and REDUNDANT Row Formats

When a variable-length column is chosen for external off-page storage, InnoDB stores the first 768 bytes locally in the row, and the rest externally into overflow pages. Each such column has its own list of overflow pages. The 768-byte prefix is accompanied by a 20-byte value that stores the true length of the column and points into the overflow list where the rest of the value is stored. See Section 17.10, "InnoDB Row Formats".
- DYNAMIC and COMPRESSED Row Formats

When a variable-length column is chosen for external off-page storage, InnoDB stores a 20-byte pointer locally in the row, and the rest externally into overflow pages. See Section 17.10, "InnoDB Row Formats".

LONGBLOB and LONGTEXT columns must be less than 4 GB , and the total row length, including BLOB and TEXT columns, must be less than 4 GB .

\subsection*{17.11.3 InnoDB Checkpoints}

Making your log files very large may reduce disk I/O during checkpointing. It often makes sense to set the total size of the log files as large as the buffer pool or even larger.

\section*{How Checkpoint Processing Works}

InnoDB implements a checkpoint mechanism known as fuzzy checkpointing. InnoDB flushes modified database pages from the buffer pool in small batches. There is no need to flush the buffer pool in one single batch, which would disrupt processing of user SQL statements during the checkpointing process.

During crash recovery, InnoDB looks for a checkpoint label written to the log files. It knows that all modifications to the database before the label are present in the disk image of the database. Then InnoDB scans the log files forward from the checkpoint, applying the logged modifications to the database.

\subsection*{17.11.4 Defragmenting a Table}

Random insertions into or deletions from a secondary index can cause the index to become fragmented. Fragmentation means that the physical ordering of the index pages on the disk is not close to the index ordering of the records on the pages, or that there are many unused pages in the 64-page blocks that were allocated to the index.

One symptom of fragmentation is that a table takes more space than it "should" take. How much that is exactly, is difficult to determine. All InnoDB data and indexes are stored in B-trees, and their fill factor may vary from $50 \%$ to $100 \%$. Another symptom of fragmentation is that a table scan such as this takes more time than it "should" take:

SELECT COUNT(*) FROM t WHERE non_indexed_column <> 12345;
The preceding query requires MySQL to perform a full table scan, the slowest type of query for a large table.

To speed up index scans, you can periodically perform a "null" ALTER TABLE operation, which causes MySQL to rebuild the table:

You can also use ALTER TABLE tbl_name FORCE to perform a "null" alter operation that rebuilds the table.

Both ALTER TABLE tbl_name ENGINE=INNODB and ALTER TABLE tbl_name FORCE use online DDL. For more information, see Section 17.12, "InnoDB and Online DDL".

Another way to perform a defragmentation operation is to use mysqldump to dump the table to a text file, drop the table, and reload it from the dump file.

If the insertions into an index are always ascending and records are deleted only from the end, the InnoDB filespace management algorithm guarantees that fragmentation in the index does not occur.

\subsection*{17.11.5 Reclaiming Disk Space with TRUNCATE TABLE}

To reclaim operating system disk space when truncating an InnoDB table, the table must be stored in its own .ibd file. For a table to be stored in its own .ibd file, innodb_file_per_table must enabled when the table is created. Additionally, there cannot be a foreign key constraint between the table being truncated and other tables, otherwise the TRUNCATE TABLE operation fails. A foreign key constraint between two columns in the same table, however, is permitted.

When a table is truncated, it is dropped and re-created in a new .ibd file, and the freed space is returned to the operating system. This is in contrast to truncating InnoDB tables that are stored within the InnoDB system tablespace (tables created when innodb_file_per_table=0FF) and tables stored in shared general tablespaces, where only InnoDB can use the freed space after the table is truncated.

The ability to truncate tables and return disk space to the operating system also means that physical backups can be smaller. Truncating tables that are stored in the system tablespace (tables created when innodb_file_per_table=0FF) or in a general tablespace leaves blocks of unused space in the tablespace.

\subsection*{17.12 InnoDB and Online DDL}

The online DDL feature provides support for instant and in-place table alterations and concurrent DML. Benefits of this feature include:
- Improved responsiveness and availability in busy production environments, where making a table unavailable for minutes or hours is not practical.
- For in-place operations, the ability to adjust the balance between performance and concurrency during DDL operations using the LOCK clause. See The LOCK clause.
- Less disk space usage and I/O overhead than the table-copy method.

Typically, you do not need to do anything special to enable online DDL. By default, MySQL performs the operation instantly or in place, as permitted, with as little locking as possible.

You can control aspects of a DDL operation using the ALGORITHM and LOCK clauses of the ALTER TABLE statement. These clauses are placed at the end of the statement, separated from the table and column specifications by commas. For example:

ALTER TABLE tbl_name ADD PRIMARY KEY (column), ALGORITHM=INPLACE;
The LOCK clause may be used for operations that are performed in place and is useful for fine-tuning the degree of concurrent access to the table during operations. Only LOCK=DEFAULT is supported for operations that are performed instantly. The ALGORITHM clause is primarily intended for performance comparisons and as a fallback to the older table-copying behavior in case you encounter any issues. For example:
- To avoid accidentally making the table unavailable for reads, writes, or both, during an in-place ALTER TABLE operation, specify a clause on the ALTER TABLE statement such as LOCK=NONE (permit reads and writes) or LOCK=SHARED (permit reads). The operation halts immediately if the requested level of concurrency is not available.
- To compare performance between algorithms, run a statement with ALGORITHM=INSTANT, ALGORITHM=INPLACE and ALGORITHM=COPY. You can also run a statement with the old_alter_table configuration option enabled to force the use of ALGORITHM=COPY.
- To avoid tying up the server with an ALTER TABLE operation that copies the table, include ALGORITHM=INSTANT or ALGORITHM=INPLACE. The statement halts immediately if it cannot use the specified algorithm.

\subsection*{17.12.1 Online DDL Operations}

Online support details, syntax examples, and usage notes for DDL operations are provided under the following topics in this section.
- Index Operations
- Primary Key Operations
- Column Operations
- Generated Column Operations
- Foreign Key Operations
- Table Operations
- Tablespace Operations
- Partitioning Operations

\section*{Index Operations}

The following table provides an overview of online DDL support for index operations. An asterisk indicates additional information, an exception, or a dependency. For details, see Syntax and Usage Notes.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.15 Online DDL Support for Index Operations}
\begin{tabular}{|l|l|l|l|l|l|}
\hline Operation & Instant & In Place & Rebuilds Table & Permits Concurrent DML & Only Modifies Metadata \\
\hline Creating or adding a secondary index & No & Yes & No & Yes & No \\
\hline Dropping an index & No & Yes & No & Yes & Yes \\
\hline Renaming an index & No & Yes & No & Yes & Yes \\
\hline Adding a FULLTEXT index & No & Yes* & No* & No & No \\
\hline Adding a SPATIAL index & No & Yes & No & No & No \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Operation & Instant & In Place & Rebuilds Table & Permits Concurrent DML & Only Modifies Metadata \\
\hline Changing the index type & Yes & Yes & No & Yes & Yes \\
\hline
\end{tabular}

\section*{Syntax and Usage Notes}
- Creating or adding a secondary index
```
CREATE INDEX name ON table (col_list);
ALTER TABLE tbl_name ADD INDEX name (col_list);
```


The table remains available for read and write operations while the index is being created. The CREATE INDEX statement only finishes after all transactions that are accessing the table are completed, so that the initial state of the index reflects the most recent contents of the table.

Online DDL support for adding secondary indexes means that you can generally speed the overall process of creating and loading a table and associated indexes by creating the table without secondary indexes, then adding secondary indexes after the data is loaded.

A newly created secondary index contains only the committed data in the table at the time the CREATE INDEX or ALTER TABLE statement finishes executing. It does not contain any uncommitted values, old versions of values, or values marked for deletion but not yet removed from the old index.

Some factors affect the performance, space usage, and semantics of this operation. For details, see Section 17.12.8, "Online DDL Limitations".
- Dropping an index
```
DROP INDEX name ON table;
ALTER TABLE tbl_name DROP INDEX name;
```


The table remains available for read and write operations while the index is being dropped. The DROP INDEX statement only finishes after all transactions that are accessing the table are completed, so that the initial state of the index reflects the most recent contents of the table.
- Renaming an index
```
ALTER TABLE tbl_name RENAME INDEX old_index_name TO new_index_name, ALGORITHM=INPLACE, LOCK=NONE;
```

- Adding a FULLTEXT index
```
CREATE FULLTEXT INDEX name ON table(column);
```


Adding the first FULLTEXT index rebuilds the table if there is no user-defined FTS_DOC_ID column. Additional FULLTEXT indexes may be added without rebuilding the table.
- Adding a SPATIAL index
```
CREATE TABLE geom (g GEOMETRY NOT NULL);
ALTER TABLE geom ADD SPATIAL INDEX(g), ALGORITHM=INPLACE, LOCK=SHARED;
```

- Changing the index type (USING \{BTREE | HASH\})

ALTER TABLE tbl_name DROP INDEX i1, ADD INDEX i1(key_part,...) USING BTREE, ALGORITHM=INSTANT;

\section*{Primary Key Operations}

The following table provides an overview of online DDL support for primary key operations. An asterisk indicates additional information, an exception, or a dependency. See Syntax and Usage Notes.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.16 Online DDL Support for Primary Key Operations}
\begin{tabular}{|l|l|l|l|l|l|}
\hline Operation & Instant & In Place & Rebuilds Table & Permits Concurrent DML & Only Modifies Metadata \\
\hline Adding a primary key & No & Yes* & Yes* & Yes & No \\
\hline Dropping a primary key & No & No & Yes & No & No \\
\hline Dropping a primary key and adding another & No & Yes & Yes & Yes & No \\
\hline
\end{tabular}
\end{table}

\section*{Syntax and Usage Notes}
- Adding a primary key

ALTER TABLE tbl_name ADD PRIMARY KEY (column), ALGORITHM=INPLACE, LOCK=NONE;
Rebuilds the table in place. Data is reorganized substantially, making it an expensive operation. ALGORITHM=INPLACE is not permitted under certain conditions if columns have to be converted to NOT NULL.

Restructuring the clustered index always requires copying of table data. Thus, it is best to define the primary key when you create a table, rather than issuing ALTER TABLE ... ADD PRIMARY KEY later.

When you create a UNIQUE or PRIMARY KEY index, MySQL must do some extra work. For UNIQUE indexes, MySQL checks that the table contains no duplicate values for the key. For a PRIMARY KEY index, MySQL also checks that none of the PRIMARY KEY columns contains a NULL.

When you add a primary key using the ALGORITHM=COPY clause, MySQL converts NULL values in the associated columns to default values: 0 for numbers, an empty string for character-based columns and BLOBs, and 0000-00-00 00:00:00 for DATETIME. This is a non-standard behavior that Oracle recommends you not rely on. Adding a primary key using ALGORITHM=INPLACE is only permitted when the SQL_MODE setting includes the strict_trans_tables or strict_all_tables flags; when the SQL_MODE setting is strict, ALGORITHM=INPLACE is permitted, but the statement can still fail if the requested primary key columns contain NULL values. The ALGORITHM=INPLACE behavior is more standard-compliant.

If you create a table without a primary key, InnoDB chooses one for you, which can be the first UNIQUE key defined on NOT NULL columns, or a system-generated key. To avoid uncertainty and the potential space requirement for an extra hidden column, specify the PRIMARY KEY clause as part of the CREATE TABLE statement.

MySQL creates a new clustered index by copying the existing data from the original table to a temporary table that has the desired index structure. Once the data is completely copied to the temporary table, the original table is renamed with a different temporary table name. The temporary table comprising the new clustered index is renamed with the name of the original table, and the original table is dropped from the database.

The online performance enhancements that apply to operations on secondary indexes do not apply to the primary key index. The rows of an InnoDB table are stored in a clustered index organized based on the primary key, forming what some database systems call an "index-organized table". Because the table structure is closely tied to the primary key, redefining the primary key still requires copying the data.

When an operation on the primary key uses ALGORITHM=INPLACE, even though the data is still copied, it is more efficient than using ALGORITHM=COPY because:
- No undo logging or associated redo logging is required for ALGORITHM=INPLACE. These operations add overhead to DDL statements that use ALGORITHM=COPY.
- The secondary index entries are pre-sorted, and so can be loaded in order.
- The change buffer is not used, because there are no random-access inserts into the secondary indexes.
- Dropping a primary key
```
ALTER TABLE tbl_name DROP PRIMARY KEY, ALGORITHM=COPY;
```


Only ALGORITHM=COPY supports dropping a primary key without adding a new one in the same ALTER TABLE statement.
- Dropping a primary key and adding another
```
ALTER TABLE tbl_name DROP PRIMARY KEY, ADD PRIMARY KEY (column), ALGORITHM=INPLACE, LOCK=NONE;
```


Data is reorganized substantially, making it an expensive operation.

\section*{Column Operations}

The following table provides an overview of online DDL support for column operations. An asterisk indicates additional information, an exception, or a dependency. For details, see Syntax and Usage Notes.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.17 Online DDL Support for Column Operations}
\begin{tabular}{|l|l|l|l|l|l|}
\hline Operation & Instant & In Place & Rebuilds Table & Permits Concurrent DML & Only Modifies Metadata \\
\hline Adding a column & Yes* & Yes & No* & Yes* & Yes \\
\hline Dropping a column & Yes* & Yes & Yes & Yes & Yes \\
\hline Renaming a column & Yes* & Yes & No & Yes* & Yes \\
\hline Reordering columns & No & Yes & Yes & Yes & No \\
\hline Setting a column default value & Yes & Yes & No & Yes & Yes \\
\hline Changing the column data type & No & No & Yes & No & No \\
\hline Extending VARCHAR column size & No & Yes & No & Yes & Yes \\
\hline Dropping the column default value & Yes & Yes & No & Yes & Yes \\
\hline Changing the auto-increment value & No & Yes & No & Yes & No* \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Operation & Instant & In Place & Rebuilds Table & Permits Concurrent DML & Only Modifies Metadata \\
\hline Making a column NULL & No & Yes & Yes* & Yes & No \\
\hline Making a column NOT NULL & No & Yes* & Yes* & Yes & No \\
\hline Modifying the definition of an ENUM or SET column & Yes & Yes & No & Yes & Yes \\
\hline
\end{tabular}

\section*{Syntax and Usage Notes}
- Adding a column
```
ALTER TABLE tbl_name ADD COLUMN column_name column_definition, ALGORITHM=INSTANT;
```


INSTANT is the default algorithm in MySQL 8.4.
The following limitations apply when the INSTANT algorithm adds a column:
- A statement cannot combine the addition of a column with other ALTER TABLE actions that do not support the INSTANT algorithm.
- The INSTANT algorithm can add a column at any position in the table.
- Columns cannot be added to tables that use ROW_FORMAT=COMPRESSED, tables with a FULLTEXT index, tables that reside in the data dictionary tablespace, or temporary tables. Temporary tables only support ALGORITHM=COPY.
- MySQL checks the row size when the INSTANT algorithm adds a column, and throws the following error if the addition exceeds the limit.
```
ERROR 4092 (HY000): Column can't be added with ALGORITHM=INSTANT as
after this max possible row size crosses max permissible row size. Try
ALGORITHM=INPLACE/COPY.
```

- The maximum number of columns in the internal representation of the table cannot exceed 1022 after column addition with the INSTANT algorithm. The error message is:
```
ERROR 4158 (HY000): Column can't be added to tbl_name with ALGORITHM=INSTANT anymore. Please try ALGORITHM=INPLACE/COPY
```

- The INSTANT algorithm can not add or drop columns to system schema tables, such as the internal mysql table.
- A column with a functional index cannot be dropped using the INSTANT algorithm.

Multiple columns may be added in the same ALTER TABLE statement. For example:
```
ALTER TABLE t1 ADD COLUMN c2 INT, ADD COLUMN c3 INT, ALGORITHM=INSTANT;
```


A new row version is created after each ALTER TABLE ... ALGORITHM=INSTANT operation that adds one or more columns, drops one or more columns, or adds and drops one or more columns in the same operation. The INFORMATION_SCHEMA. INNODB_TABLES.TOTAL_ROW_VERSIONS column tracks the number of row versions for a table. The value is incremented each time a column is instantly added or dropped. The initial value is 0 .
```
mysql> SELECT NAME, TOTAL_ROW_VERSIONS FROM INFORMATION_SCHEMA.INNODB_TABLES
    WHERE NAME LIKE 'test/t1';
+---------+----------------------+
| NAME | TOTAL_ROW_VERSIONS |
+---------+---------------------+
| test/t1 | 0 |
+---------+--------------------+
```


When a table with instantly added or dropped columns is rebuilt by table-rebuilding ALTER TABLE or OPTIMIZE TABLE operation, the TOTAL_ROW_VERSIONS value is reset to 0 . The maximum number of row versions permitted is 64 ( 255 as of MySQL 9.1.0), as each row version requires additional space for table metadata. When the row version limit is reached, ADD COLUMN and DROP COLUMN operations using ALGORITHM=INSTANT are rejected with an error message that recommends rebuilding the table using the COPY or INPLACE algorithm.

ERROR 4092 (HY000): Maximum row versions reached for table test/t1. No more columns can be added or dropped instantly. Please use COPY/INPLACE.

The following INFORMATION_SCHEMA columns provide additional metadata for instantly added columns. Refer to the descriptions of those columns for more information. See Section 28.4.9, "The INFORMATION_SCHEMA INNODB_COLUMNS Table", and Section 28.4.23, "The INFORMATION_SCHEMA INNODB_TABLES Table".
- INNODB_COLUMNS.DEFAULT_VALUE
- INNODB_COLUMNS.HAS_DEFAULT
- INNODB_TABLES. INSTANT_COLS

Concurrent DML is not permitted when adding an auto-increment column. Data is reorganized substantially, making it an expensive operation. At a minimum, ALGORITHM=INPLACE, LOCK=SHARED is required.

The table is rebuilt if ALGORITHM=INPLACE is used to add a column.
- Dropping a column

ALTER TABLE tbl_name DROP COLUMN column_name, ALGORITHM=INSTANT;
INSTANT is the default algorithm in MySQL 8.4.
The following limitations apply when the INSTANT algorithm is used to drop a column:
- Dropping a column cannot be combined in the same statement with other ALTER TABLE actions that do not support ALGORITHM=INSTANT.
- Columns cannot be dropped from tables that use ROW_FORMAT=COMPRESSED, tables with a FULLTEXT index, tables that reside in the data dictionary tablespace, or temporary tables. Temporary tables only support ALGORITHM=COPY.

Multiple columns may be dropped in the same ALTER TABLE statement; for example:
ALTER TABLE t1 DROP COLUMN c4, DROP COLUMN c5, ALGORITHM=INSTANT;
Each time a column is added or dropped using ALGORITHM=INSTANT, a new row version is created. The INFORMATION_SCHEMA. INNODB_TABLES. TOTAL_ROW_VERSIONS column tracks the number of row versions for a table. The value is incremented each time a column is instantly added or dropped. The initial value is 0 .
```
mysql> SELECT NAME, TOTAL_ROW_VERSIONS FROM INFORMATION_SCHEMA.INNODB_TABLES
    WHERE NAME LIKE 'test/t1';
+---------+---------------------+
| NAME | TOTAL_ROW_VERSIONS |
```

```
+----------+--------------------+
| test/t1 | 0 |
+---------+--------------------+
```


When a table with instantly added or dropped columns is rebuilt by table-rebuilding ALTER TABLE or OPTIMIZE TABLE operation, the TOTAL_ROW_VERSIONS value is reset to 0 . The maximum number of row versions permitted is 64 ( 255 as of MySQL 9.1.0), as each row version requires additional space for table metadata. When the row version limit is reached, ADD COLUMN and DROP COLUMN operations using ALGORITHM=INSTANT are rejected with an error message that recommends rebuilding the table using the COPY or INPLACE algorithm.

ERROR 4092 (HY000): Maximum row versions reached for table test/t1. No more columns can be added or dropped instantly. Please use COPY/INPLACE.

If an algorithm other than ALGORITHM=INSTANT is used, data is reorganized substantially, making it an expensive operation.
- Renaming a column
```
ALTER TABLE tbl CHANGE old_col_name new_col_name data_type, ALGORITHM=INSTANT;
```


To permit concurrent DML, keep the same data type and only change the column name.
When you keep the same data type and [NOT] NULL attribute, only changing the column name, the operation can always be performed online.

Renaming a column referenced from another table is only permitted with ALGORITHM=INPLACE. If you use ALGORITHM=INSTANT, ALGORITHM=COPY, or some other condition that causes the operation to use those algorithms, the ALTER TABLE statement fails.

ALGORITHM=INSTANT supports renaming a virtual column; ALGORITHM=INPLACE does not.
ALGORITHM=INSTANT and ALGORITHM=INPLACE do not support renaming a column when adding or dropping a virtual column in the same statement. In this case, only ALGORITHM=COPY is supported.
- Reordering columns

To reorder columns, use FIRST or AFTER in CHANGE or MODIFY operations.
```
ALTER TABLE tbl_name MODIFY COLUMN col_name column_definition FIRST, ALGORITHM=INPLACE, LOCK=NONE;
```


Data is reorganized substantially, making it an expensive operation.
- Changing the column data type
```
ALTER TABLE tbl_name CHANGE c1 c1 BIGINT, ALGORITHM=COPY;
```


Changing the column data type is only supported with ALGORITHM=COPY.
- Extending VARCHAR column size

ALTER TABLE tbl_name CHANGE COLUMN c1 c1 VARCHAR(255), ALGORITHM=INPLACE, LOCK=NONE;
The number of length bytes required by a VARCHAR column must remain the same. For VARCHAR columns of 0 to 255 bytes in size, one length byte is required to encode the value. For VARCHAR columns of 256 bytes in size or more, two length bytes are required. As a result, in-place ALTER TABLE only supports increasing VARCHAR column size from 0 to 255 bytes, or from 256 bytes to a greater size. In-place ALTER TABLE does not support increasing the size of a VARCHAR column from less than 256 bytes to a size equal to or greater than 256 bytes. In this case, the number of required length bytes changes from 1 to 2 , which is only supported by a table copy (ALGORITHM=COPY). For example, attempting to change VARCHAR column size for a single byte character set from VARCHAR(255) to VARCHAR(256) using in-place ALTER TABLE returns this error:

ALTER TABLE tbl_name ALGORITHM=INPLACE, CHANGE COLUMN c1 c1 VARCHAR(256);
ERROR 0A000: ALGORITHM=INPLACE is not supported. Reason: Cannot change column type INPLACE. Try ALGORITHM=COPY.

\section*{Note}

The byte length of a VARCHAR column is dependant on the byte length of the character set.

Decreasing VARCHAR size using in-place ALTER TABLE is not supported. Decreasing VARCHAR size requires a table copy (ALGORITHM=COPY).
- Setting a column default value

ALTER TABLE tbl_name ALTER COLUMN col SET DEFAULT literal, ALGORITHM=INSTANT;
Only modifies table metadata. Default column values are stored in the data dictionary.
- Dropping a column default value

ALTER TABLE tbl ALTER COLUMN col DROP DEFAULT, ALGORITHM=INSTANT;
- Changing the auto-increment value

ALTER TABLE table AUTO_INCREMENT=next_value, ALGORITHM=INPLACE, LOCK=NONE;
Modifies a value stored in memory, not the data file.
In a distributed system using replication or sharding, you sometimes reset the auto-increment counter for a table to a specific value. The next row inserted into the table uses the specified value for its auto-increment column. You might also use this technique in a data warehousing environment where you periodically empty all the tables and reload them, and restart the autoincrement sequence from 1.
- Making a column NULL

ALTER TABLE tbl_name MODIFY COLUMN column_name data_type NULL, ALGORITHM=INPLACE, LOCK=NONE;
Rebuilds the table in place. Data is reorganized substantially, making it an expensive operation.
- Making a column NOT NULL

ALTER TABLE tbl_name MODIFY COLUMN column_name data_type NOT NULL, ALGORITHM=INPLACE, LOCK=NONE;
Rebuilds the table in place. STRICT_ALL_TABLES or STRICT_TRANS_TABLES SQL_MODE is required for the operation to succeed. The operation fails if the column contains NULL values. The server prohibits changes to foreign key columns that have the potential to cause loss of referential integrity. See Section 15.1.9, "ALTER TABLE Statement". Data is reorganized substantially, making it an expensive operation.
- Modifying the definition of an ENUM or SET column

CREATE TABLE t1 (c1 ENUM('a', 'b', 'c'));
ALTER TABLE t1 MODIFY COLUMN c1 ENUM('a', 'b', 'c', 'd'), ALGORITHM=INSTANT;
Modifying the definition of an ENUM or SET column by adding new enumeration or set members to the end of the list of valid member values may be performed instantly or in place, as long as the storage size of the data type does not change. For example, adding a member to a SET column that has 8 members changes the required storage per value from 1 byte to 2 bytes; this requires a table copy. Adding members in the middle of the list causes renumbering of existing members, which requires a table copy.

\section*{Generated Column Operations}

The following table provides an overview of online DDL support for generated column operations. For details, see Syntax and Usage Notes.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.18 Online DDL Support for Generated Column Operations}
\begin{tabular}{|l|l|l|l|l|l|}
\hline Operation & Instant & In Place & Rebuilds Table & Permits Concurrent DML & Only Modifies Metadata \\
\hline Adding a STORED column & No & No & Yes & No & No \\
\hline Modifying STORED column order & No & No & Yes & No & No \\
\hline Dropping a STORED column & No & Yes & Yes & Yes & No \\
\hline Adding a VIRTUAL column & Yes & Yes & No & Yes & Yes \\
\hline Modifying VIRTUAL column order & No & No & Yes & No & No \\
\hline Dropping a VIRTUAL column & Yes & Yes & No & Yes & Yes \\
\hline
\end{tabular}
\end{table}

\section*{Syntax and Usage Notes}
- Adding a STORED column
```
ALTER TABLE t1 ADD COLUMN (c2 INT GENERATED ALWAYS AS (c1 + 1) STORED), ALGORITHM=COPY;
```


ADD COLUMN is not an in-place operation for stored columns (done without using a temporary table) because the expression must be evaluated by the server.
- Modifying STORED column order
```
ALTER TABLE t1 MODIFY COLUMN c2 INT GENERATED ALWAYS AS (c1 + 1) STORED FIRST, ALGORITHM=COPY;
```


Rebuilds the table in place.
- Dropping a STORED column
```
ALTER TABLE t1 DROP COLUMN c2, ALGORITHM=INPLACE, LOCK=NONE;
```


Rebuilds the table in place.
- Adding a VIRTUAL column
```
ALTER TABLE t1 ADD COLUMN (c2 INT GENERATED ALWAYS AS (c1 + 1) VIRTUAL), ALGORITHM=INSTANT;
```


Adding a virtual column can be performed instantly or in place for non-partitioned tables.
Adding a VIRTUAL is not an in-place operation for partitioned tables.
- Modifying VIRTUAL column order
```
ALTER TABLE t1 MODIFY COLUMN c2 INT GENERATED ALWAYS AS (c1 + 1) VIRTUAL FIRST, ALGORITHM=COPY;
```

- Dropping a VIRTUAL column

ALTER TABLE t1 DROP COLUMN c2, ALGORITHM=INSTANT;
Dropping a VIRTUAL column can be performed instantly or in place for non-partitioned tables.

\section*{Foreign Key Operations}

The following table provides an overview of online DDL support for foreign key operations. An asterisk indicates additional information, an exception, or a dependency. For details, see Syntax and Usage Notes.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.19 Online DDL Support for Foreign Key Operations}
\begin{tabular}{|l|l|l|l|l|l|}
\hline Operation & Instant & In Place & Rebuilds Table & Permits Concurrent DML & Only Modifies Metadata \\
\hline Adding a foreign key constraint & No & Yes* & No & Yes & Yes \\
\hline Dropping a foreign key constraint & No & Yes & No & Yes & Yes \\
\hline
\end{tabular}
\end{table}

\section*{Syntax and Usage Notes}
- Adding a foreign key constraint

The INPLACE algorithm is supported when foreign_key_checks is disabled. Otherwise, only the COPY algorithm is supported.
```
ALTER TABLE tbl1 ADD CONSTRAINT fk_name FOREIGN KEY index (col1)
    REFERENCES tbl2(col2) referential_actions;
```

- Dropping a foreign key constraint
```
ALTER TABLE tbl DROP FOREIGN KEY fk_name;
```


Dropping a foreign key can be performed online with the foreign_key_checks option enabled or disabled.

If you do not know the names of the foreign key constraints on a particular table, issue the following statement and find the constraint name in the CONSTRAINT clause for each foreign key:
```
SHOW CREATE TABLE table\G
```


Or, query the Information Schema TABLE_CONSTRAINTS table and use the CONSTRAINT_NAME and CONSTRAINT_TYPE columns to identify the foreign key names.

You can also drop a foreign key and its associated index in a single statement:
```
ALTER TABLE table DROP FOREIGN KEY constraint, DROP INDEX index;
```


\section*{Note}

If foreign keys are already present in the table being altered (that is, it is a child table containing a FOREIGN KEY ... REFERENCE clause), additional restrictions apply to online DDL operations, even those not directly involving the foreign key columns:
- An ALTER TABLE on the child table could wait for another transaction to commit, if a change to the parent table causes associated changes in the child table through an ON UPDATE or ON DELETE clause using the CASCADE or SET NULL parameters.
- In the same way, if a table is the parent table in a foreign key relationship, even though it does not contain any FOREIGN KEY clauses, it could wait for the ALTER TABLE to complete if an INSERT, UPDATE, or DELETE statement causes an ON UPDATE or ON DELETE action in the child table.

\section*{Table Operations}

The following table provides an overview of online DDL support for table operations. An asterisk indicates additional information, an exception, or a dependency. For details, see Syntax and Usage Notes.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.20 Online DDL Support for Table Operations}
\begin{tabular}{|l|l|l|l|l|l|}
\hline Operation & Instant & In Place & Rebuilds Table & Permits Concurrent DML & Only Modifies Metadata \\
\hline Changing the ROW_FORMAT & No & Yes & Yes & Yes & No \\
\hline Changing the KEY_BLOCK_SI & No E & Yes & Yes & Yes & No \\
\hline Setting persistent table statistics & No & Yes & No & Yes & Yes \\
\hline Specifying a character set & No & Yes & Yes* & Yes & No \\
\hline Converting a character set & No & Yes & Yes* & No & No \\
\hline Optimizing a table & No & Yes* & Yes & Yes & No \\
\hline Rebuilding with the FORCE option & No & Yes* & Yes & Yes & No \\
\hline Performing a null rebuild & No & Yes* & Yes & Yes & No \\
\hline Renaming a table & Yes & Yes & No & Yes & Yes \\
\hline
\end{tabular}
\end{table}

\section*{Syntax and Usage Notes}
- Changing the ROW_FORMAT
```
ALTER TABLE tbl_name ROW_FORMAT = row_format, ALGORITHM=INPLACE, LOCK=NONE;
```


Data is reorganized substantially, making it an expensive operation.
For additional information about the ROW_FORMAT option, see Table Options.
- Changing the KEY_BLOCK_SIZE

ALTER TABLE tbl_name KEY_BLOCK_SIZE = value, ALGORITHM=INPLACE, LOCK=NONE;
Data is reorganized substantially, making it an expensive operation.
For additional information about the KEY_BLOCK_SIZE option, see Table Options.
- Setting persistent table statistics options

ALTER TABLE tbl_name STATS_PERSISTENT=0, STATS_SAMPLE_PAGES=20, STATS_AUTO_RECALC=1, ALGORITHM=INPLAC

Only modifies table metadata.
Persistent statistics include STATS_PERSISTENT, STATS_AUTO_RECALC, and STATS_SAMPLE_PAGES. For more information, see Section 17.8.10.1, "Configuring Persistent Optimizer Statistics Parameters".
- Specifying a character set

ALTER TABLE tbl_name CHARACTER SET = charset_name, ALGORITHM=INPLACE, LOCK=NONE;
Rebuilds the table if the new character encoding is different.
- Converting a character set

ALTER TABLE tbl_name CONVERT TO CHARACTER SET charset_name, ALGORITHM=INPLACE, LOCK=NONE;
Rebuilds the table if the new character encoding is different.
- Optimizing a table

OPTIMIZE TABLE tbl_name;
In-place operation is not supported for tables with FULLTEXT indexes. The operation uses the INPLACE algorithm, but ALGORITHM and LOCK syntax is not permitted.
- Rebuilding a table with the FORCE option

ALTER TABLE tbl_name FORCE, ALGORITHM=INPLACE, LOCK=NONE;
Uses ALGORITHM=INPLACE as of MySQL 5.6.17. ALGORITHM=INPLACE is not supported for tables with FULLTEXT indexes.
- Performing a "null" rebuild

ALTER TABLE tbl_name ENGINE=InnoDB, ALGORITHM=INPLACE, LOCK=NONE;
Uses ALGORITHM=INPLACE as of MySQL 5.6.17. ALGORITHM=INPLACE is not supported for tables with FULLTEXT indexes.
- Renaming a table

ALTER TABLE old_tbl_name RENAME TO new_tbl_name, ALGORITHM=INSTANT;
Renaming a table can be performed instantly or in place. MySQL renames files that correspond to the table tbl_name without making a copy. (You can also use the RENAME TABLE statement to rename tables. See Section 15.1.36, "RENAME TABLE Statement".) Privileges granted specifically for the renamed table are not migrated to the new name. They must be changed manually.

\section*{Tablespace Operations}

The following table provides an overview of online DDL support for tablespace operations. For details, see Syntax and Usage Notes.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.21 Online DDL Support for Tablespace Operations}
\begin{tabular}{|l|l|l|l|l|l|}
\hline Operation & Instant & In Place & Rebuilds Table & Permits Concurrent DML & Only Modifies Metadata \\
\hline Renaming a general tablespace & No & Yes & No & Yes & Yes \\
\hline Enabling or disabling & No & Yes & No & Yes & No \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Operation & Instant & In Place & Rebuilds Table & Permits Concurrent DML & Only Modifies Metadata \\
\hline general tablespace encryption & & & & & \\
\hline Enabling or disabling file-per-table tablespace encryption & No & No & Yes & No & No \\
\hline
\end{tabular}

\section*{Syntax and Usage Notes}
- Renaming a general tablespace

ALTER TABLESPACE tablespace_name RENAME TO new_tablespace_name;
ALTER TABLESPACE ... RENAME TO uses the INPLACE algorithm but does not support the ALGORITHM clause.
- Enabling or disabling general tablespace encryption

ALTER TABLESPACE tablespace_name ENCRYPTION='Y';
ALTER TABLESPACE ... ENCRYPTION uses the INPLACE algorithm but does not support the ALGORITHM clause.

For related information, see Section 17.13, "InnoDB Data-at-Rest Encryption".
- Enabling or disabling file-per-table tablespace encryption

ALTER TABLE tbl_name ENCRYPTION='Y', ALGORITHM=COPY;
For related information, see Section 17.13, "InnoDB Data-at-Rest Encryption".

\section*{Partitioning Operations}

With the exception of some ALTER TABLE partitioning clauses, online DDL operations for partitioned InnoDB tables follow the same rules that apply to regular InnoDB tables.

Some ALTER TABLE partitioning clauses do not go through the same internal online DDL API as regular non-partitioned InnoDB tables. As a result, online support for ALTER TABLE partitioning clauses varies.

The following table shows the online status for each ALTER TABLE partitioning statement. Regardless of the online DDL API that is used, MySQL attempts to minimize data copying and locking where possible.

ALTER TABLE partitioning options that use ALGORITHM=COPY or that only permit "ALGORITHM=DEFAULT, LOCK=DEFAULT", repartition the table using the COPY algorithm. In other words, a new partitioned table is created with the new partitioning scheme. The newly created table includes any changes applied by the ALTER TABLE statement, and table data is copied into the new table structure.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.22 Online DDL Support for Partitioning Operations}
\begin{tabular}{|l|l|l|l|l|}
\hline \begin{tabular}{l} 
Partitioning \\
Clause
\end{tabular} & Instant & In Place & Permits DML & Notes \\
\hline PARTITION BY & No & No & No & \begin{tabular}{l} 
Permits \\
ALGORITHM $=$ COPY, \\
LOCK=\{DEFAULT|
\end{tabular}
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|l|}
\hline Partitioning Clause & Instant & In Place & Permits DML & Notes \\
\hline & & & & SHARED| EXCLUSIVE\} \\
\hline ADD PARTITION & No & Yes* & Yes* & ALGORITHM=INPLACE, LOCK=\{DEFAULT| NONE | SHARED | EXCLUSISVE\} is supported for RANGE and LIST partitions, ALGORITHM=INPLACE, LOCK=\{DEFAULT| SHARED | EXCLUSISVE\} for HASH and KEY partitions, and ALGORITHM=COPY, LOCK=\{SHARED| EXCLUSIVE\} for all partition types. Does not copy existing data for tables partitioned by RANGE or LIST. Concurrent queries are permitted with ALGORITHM=COPY for tables partitioned by HASH or LIST, as MySQL copies the data while holding a shared lock. \\
\hline DROP PARTITION & No & Yes* & Yes* & \begin{tabular}{l}
ALGORITHM=INPLACE, LOCK=\{DEFAULT|\} NONE | SHARED | EXCLUSIVE\} is supported. Does not copy data for tables partitioned by RANGE or LIST. \\
DROP PARTITION with ALGORITHM=INPLACE deletes data stored in the partition and drops the partition. However, DROP PARTITION with ALGORITHM=COPY or old_alter_table=ON rebuilds the partitioned table and attempts to
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|}
\hline Partitioning Clause & Instant & In Place & Permits DML & Notes \\
\hline & & & & move data from the dropped partition to another partition with a compatible PARTITION ... VALUES definition. Data that cannot be moved to another partition is deleted. \\
\hline DISCARD PARTITION & No & No & No & Only permits ALGORITHM=DEFAULT, LOCK=DEFAULT \\
\hline IMPORT PARTITION & No & No & No & Only permits ALGORITHM=DEFAULT, LOCK=DEFAULT \\
\hline TRUNCATE PARTITION & No & Yes & Yes & Does not copy existing data. It merely deletes rows; it does not alter the definition of the table itself, or of any of its partitions. \\
\hline COALESCE PARTITION & No & Yes* & No & ALGORITHM=INPLACE, LOCK=\{DEFAULT | SHARED| EXCLUSIVE\} is supported. \\
\hline REORGANIZE PARTITION & No & Yes* & No & ALGORITHM=INPLACE, LOCK=\{DEFAULT| SHARED | EXCLUSIVE\} is supported. \\
\hline EXCHANGE PARTITION & No & Yes & Yes & \\
\hline ANALYZE PARTITION & No & Yes & Yes & \\
\hline CHECK PARTITION & No & Yes & Yes & \\
\hline OPTIMIZE PARTITION & No & No & No & ALGORITHM and LOCK clauses are ignored. Rebuilds the entire table. See Section 26.3.4, "Maintenance of Partitions". \\
\hline REBUILD PARTITION & No & Yes* & No & ALGORITHM=INPLACE, LOCK=\{DEFAULT| SHARED| \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|}
\hline Partitioning Clause & Instant & In Place & Permits DML & Notes \\
\hline & & & & EXCLUSIVE\} is supported. \\
\hline REPAIR PARTITION & No & Yes & Yes & \\
\hline REMOVE PARTITIONING & No & No & No & Permits ALGORITHM=COPY, LOCK=\{DEFAULT| SHARED | EXCLUSIVE\} \\
\hline
\end{tabular}

Non-partitioning online ALTER TABLE operations on partitioned tables follow the same rules that apply to regular tables. However, ALTER TABLE performs online operations on each table partition, which causes increased demand on system resources due to operations being performed on multiple partitions.

For additional information about ALTER TABLE partitioning clauses, see Partitioning Options, and Section 15.1.9.1, "ALTER TABLE Partition Operations". For information about partitioning in general, see Chapter 26, Partitioning.

\subsection*{17.12.2 Online DDL Performance and Concurrency}

Online DDL improves several aspects of MySQL operation:
- Applications that access the table are more responsive because queries and DML operations on the table can proceed while the DDL operation is in progress. Reduced locking and waiting for MySQL server resources leads to greater scalability, even for operations that are not involved in the DDL operation.
- Instant operations only modify metadata in the data dictionary. An exclusive metadata lock on the table may be taken briefly during the execution phase of the operation. Table data is unaffected, making operations instantaneous. Concurrent DML is permitted.
- Online operations avoid the disk I/O and CPU cycles associated with the table-copy method, which minimizes overall load on the database. Minimizing load helps maintain good performance and high throughput during the DDL operation.
- Online operations read less data into the buffer pool than table-copy operations, which reduces purging of frequently accessed data from memory. Purging of frequently accessed data can cause a temporary performance dip after a DDL operation.

\section*{The LOCK clause}

By default, MySQL uses as little locking as possible during a DDL operation. The LOCK clause can be specified for in-place operations and some copy operations to enforce more restrictive locking, if required. If the LOCK clause specifies a less restrictive level of locking than is permitted for a particular DDL operation, the statement fails with an error. LOCK clauses are described below, in order of least to most restrictive:
- LOCK=NONE:

Permits concurrent queries and DML.
For example, use this clause for tables involving customer signups or purchases, to avoid making the tables unavailable during lengthy DDL operations.
- LOCK=SHARED:

Permits concurrent queries but blocks DML.
For example, use this clause on data warehouse tables, where you can delay data load operations until the DDL operation is finished, but queries cannot be delayed for long periods.
- LOCK=DEFAULT:

Permits as much concurrency as possible (concurrent queries, DML, or both). Omitting the LOCK clause is the same as specifying LOCK=DEFAULT.

Use this clause when you do not expect the default locking level of the DDL statement to cause any availability problems for the table.
- LOCK=EXCLUSIVE:

Blocks concurrent queries and DML.
Use this clause if the primary concern is finishing the DDL operation in the shortest amount of time possible, and concurrent query and DML access is not necessary. You might also use this clause if the server is supposed to be idle, to avoid unexpected table accesses.

\section*{Online DDL and Metadata Locks}

Online DDL operations can be viewed as having three phases:
- Phase 1: Initialization

In the initialization phase, the server determines how much concurrency is permitted during the operation, taking into account storage engine capabilities, operations specified in the statement, and user-specified ALGORITHM and LOCK options. During this phase, a shared upgradeable metadata lock is taken to protect the current table definition.
- Phase 2: Execution

In this phase, the statement is prepared and executed. Whether the metadata lock is upgraded to exclusive depends on the factors assessed in the initialization phase. If an exclusive metadata lock is required, it is only taken briefly during statement preparation.
- Phase 3: Commit Table Definition

In the commit table definition phase, the metadata lock is upgraded to exclusive to evict the old table definition and commit the new one. Once granted, the duration of the exclusive metadata lock is brief.

Due to the exclusive metadata lock requirements outlined above, an online DDL operation may have to wait for concurrent transactions that hold metadata locks on the table to commit or rollback. Transactions started before or during the DDL operation can hold metadata locks on the table being altered. In the case of a long running or inactive transaction, an online DDL operation can time out waiting for an exclusive metadata lock. Additionally, a pending exclusive metadata lock requested by an online DDL operation blocks subsequent transactions on the table.

The following example demonstrates an online DDL operation waiting for an exclusive metadata lock, and how a pending metadata lock blocks subsequent transactions on the table.

Session 1:
```
mysql> CREATE TABLE t1 (c1 INT) ENGINE=InnoDB;
mysql> START TRANSACTION;
mysql> SELECT * FROM t1;
```


The session 1 SELECT statement takes a shared metadata lock on table t1.

\section*{Session 2:}
```
mysql> ALTER TABLE t1 ADD COLUMN x INT, ALGORITHM=INPLACE, LOCK=NONE;
```


The online DDL operation in session 2, which requires an exclusive metadata lock on table t1 to commit table definition changes, must wait for the session 1 transaction to commit or roll back.

\section*{Session 3:}
```
mysql> SELECT * FROM t1;
```


The SELECT statement issued in session 3 is blocked waiting for the exclusive metadata lock requested by the ALTER TABLE operation in session 2 to be granted.

You can use SHOW FULL PROCESSLIST to determine if transactions are waiting for a metadata lock.
```
mysql> SHOW FULL PROCESSLIST\G
...
************************** 2. row *****************************************
        Id: 5
    User: root
    Host: localhost
        db: test
Command: Query
    Time: 44
    State: Waiting for table metadata lock
    Info: ALTER TABLE t1 ADD COLUMN x INT, ALGORITHM=INPLACE, LOCK=NONE
...
************************* 4. rOW ******************************************
        Id: 7
    User: root
    Host: localhost
        db: test
Command: Query
    Time: 5
    State: Waiting for table metadata lock
    Info: SELECT * FROM t1
4 rows in set (0.00 sec)
```


Metadata lock information is also exposed through the Performance Schema metadata_locks table, which provides information about metadata lock dependencies between sessions, the metadata lock a session is waiting for, and the session that currently holds the metadata lock. For more information, see Section 29.12.13.3, "The metadata_locks Table".

\section*{Online DDL Performance}

The performance of a DDL operation is largely determined by whether the operation is performed instantly, in place, and whether it rebuilds the table.

To assess the relative performance of a DDL operation, you can compare results using ALGORITHM=INSTANT, ALGORITHM=INPLACE, and ALGORITHM=COPY. A statement can also be run with old_alter_table enabled to force the use of ALGORITHM=COPY.

For DDL operations that modify table data, you can determine whether a DDL operation performs changes in place or performs a table copy by looking at the "rows affected" value displayed after the command finishes. For example:
- Changing the default value of a column (fast, does not affect the table data):
```
Query OK, 0 rows affected (0.07 sec)
```

- Adding an index (takes time, but 0 rows affected shows that the table is not copied):
```
Query OK, 0 rows affected (21.42 sec)
```

- Changing the data type of a column (takes substantial time and requires rebuilding all the rows of the table):
```
Query OK, 1671168 rows affected (1 min 35.54 sec)
```


Before running a DDL operation on a large table, check whether the operation is fast or slow as follows:
1. Clone the table structure.
2. Populate the cloned table with a small amount of data.
3. Run the DDL operation on the cloned table.
4. Check whether the "rows affected" value is zero or not. A nonzero value means the operation copies table data, which might require special planning. For example, you might do the DDL operation during a period of scheduled downtime, or on each replica server one at a time.

> Note
> For a greater understanding of the MySQL processing associated with a DDL operation, examine Performance Schema and INFORMATION_SCHEMA tables related to InnoDB before and after DDL operations to see the number of physical reads, writes, memory allocations, and so on.

> Performance Schema stage events can be used to monitor ALTER TABLE progress. See Section 17.16.1, "Monitoring ALTER TABLE Progress for InnoDB Tables Using Performance Schema".

Because there is some processing work involved with recording the changes made by concurrent DML operations, then applying those changes at the end, an online DDL operation could take longer overall than the table-copy mechanism that blocks table access from other sessions. The reduction in raw performance is balanced against better responsiveness for applications that use the table. When evaluating the techniques for changing table structure, consider end-user perception of performance, based on factors such as load times for web pages.

\subsection*{17.12.3 Online DDL Space Requirements}

Disk space requirements for online DDL operations are outlined below. The requirements do not apply to operations that are performed instantly.
- Temporary log files:

A temporary log file records concurrent DML when an online DDL operation creates an index or alters a table. The temporary log file is extended as required by the value of innodb_sort_buffer_size up to a maximum specified by innodb_online_alter_log_max_size. If the operation takes a long time and concurrent DML modifies the table so much that the size of the temporary log file exceeds the value of innodb_online_alter_log_max_size, the online DDL operation fails with a DB_ONLINE_LOG_TOO_BIG error, and uncommitted concurrent DML operations are rolled back. A large innodb_online_alter_log_max_size setting permits more DML during an online DDL operation, but it also extends the period of time at the end of the DDL operation when the table is locked to apply logged DML.

The innodb_sort_buffer_size variable also defines the size of the temporary log file read buffer and write buffer.
- Temporary sort files:

Online DDL operations that rebuild the table write temporary sort files to the MySQL temporary directory (\$TMPDIR on Unix, \%TEMP\% on Windows, or the directory specified by --tmpdir) during index creation. Temporary sort files are not created in the directory that contains the original table. Each temporary sort file is large enough to hold one column of data, and each sort file is removed when its data is merged into the final table or index. Operations involving temporary sort files may
require temporary space equal to the amount of data in the table plus indexes. An error is reported if online DDL operation uses all of the available disk space on the file system where the data directory resides.

If the MySQL temporary directory is not large enough to hold the sort files, set tmpdir to a different directory. Alternatively, define a separate temporary directory for online DDL operations using innodb_tmpdir. This option was introduced to help avoid temporary directory overflows that could occur as a result of large temporary sort files.
- Intermediate table files:

Some online DDL operations that rebuild the table create a temporary intermediate table file in the same directory as the original table. An intermediate table file may require space equal to the size of the original table. Intermediate table file names begin with \#sql-ib prefix and only appear briefly during the online DDL operation.

The innodb_tmpdir option is not applicable to intermediate table files.

\subsection*{17.12.4 Online DDL Memory Management}

Online DDL operations that create or rebuild secondary indexes allocate temporary buffers during different phases of index creation. The innodb_ddl_buffer_size variable defines the maximum buffer size for online DDL operations. The default setting is 1048576 bytes $(1 \mathrm{MB})$. The setting applies to buffers created by threads executing online DDL operations. Defining an appropriate buffer size limit avoids potential out of memory errors for online DDL operations that create or rebuild secondary indexes. The maximum buffer size per DDL thread is the maximum buffer size divided by the number of DDL threads (innodb_ddl_buffer_size/innodb_ddl_threads).

\subsection*{17.12.5 Configuring Parallel Threads for Online DDL Operations}

The workflow of an online DDL operation that creates or rebuilds a secondary index involves:
- Scanning the clustered index and writing data to temporary sort files
- Sorting the data
- Loading sorted data from the temporary sort files into the secondary index

The number of parallel threads that can be used to scan clustered index is defined by the innodb_parallel_read_threads variable. The default setting is calculated by the number of available logical processors on the system divided by 8, with a minimum default value of 4. The maximum setting is 256 , which is the maximum number for all sessions. The actual number of threads that scan the clustered index is the number defined by the innodb_parallel_read_threads setting or the number of index subtrees to scan, whichever is smaller. If the thread limit is reached, sessions fall back to using a single thread.

The number of parallel threads that sort and load data is controlled by the innodb_ddl_threads variable. The default setting is 4 .

The following limitations apply:
- Parallel threads are not supported for building indexes that include virtual columns.
- Parallel threads are not supported for full-text index creation.
- Parallel threads are not supported for spatial index creation.
- Parallel scan is not supported on tables defined with virtual columns.
- Parallel scan is not supported on tables defined with a full-text index.
- Parallel scan is not supported on tables defined with a spatial index.

\subsection*{17.12.6 Simplifying DDL Statements with Online DDL}

Before the introduction of online DDL, it was common practice to combine many DDL operations into a single ALTER TABLE statement. Because each ALTER TABLE statement involved copying and rebuilding the table, it was more efficient to make several changes to the same table at once, since those changes could all be done with a single rebuild operation for the table. The downside was that SQL code involving DDL operations was harder to maintain and to reuse in different scripts. If the specific changes were different each time, you might have to construct a new complex ALTER TABLE for each slightly different scenario.

For DDL operations that can be done online, you can separate them into individual ALTER TABLE statements for easier scripting and maintenance, without sacrificing efficiency. For example, you might take a complicated statement such as:
```
ALTER TABLE t1 ADD INDEX i1(c1), ADD UNIQUE INDEX i2(c2),
    CHANGE c4_old_name c4_new_name INTEGER UNSIGNED;
```

and break it down into simpler parts that can be tested and performed independently, such as:
```
ALTER TABLE t1 ADD INDEX i1(c1);
ALTER TABLE t1 ADD UNIQUE INDEX i2(c2);
ALTER TABLE t1 CHANGE c4_old_name c4_new_name INTEGER UNSIGNED NOT NULL;
```


You might still use multi-part ALTER TABLE statements for:
- Operations that must be performed in a specific sequence, such as creating an index followed by a foreign key constraint that uses that index.
- Operations all using the same specific LOCK clause, that you want to either succeed or fail as a group.
- Operations that cannot be performed online, that is, that still use the table-copy method.
- Operations for which you specify ALGORITHM=COPY or old_alter_table=1, to force the tablecopying behavior if needed for precise backward-compatibility in specialized scenarios.

\subsection*{17.12.7 Online DDL Failure Conditions}

The failure of an online DDL operation is typically due to one of the following conditions:
- An ALGORITHM clause specifies an algorithm that is not compatible with the particular type of DDL operation or storage engine.
- A LOCK clause specifies a low degree of locking (SHARED or NONE) that is not compatible with the particular type of DDL operation.
- A timeout occurs while waiting for an exclusive lock on the table, which may be needed briefly during the initial and final phases of the DDL operation.
- The tmpdir or innodb_tmpdir file system runs out of disk space, while MySQL writes temporary sort files on disk during index creation. For more information, see Section 17.12.3, "Online DDL Space Requirements".
- The operation takes a long time and concurrent DML modifies the table so much that the size of the temporary online log exceeds the value of the innodb_online_alter_log_max_size configuration option. This condition causes a DB_ONLINE_LOG_TOO_BIG error.
- Concurrent DML makes changes to the table that are allowed with the original table definition, but not with the new one. The operation only fails at the very end, when MySQL tries to apply all the changes from concurrent DML statements. For example, you might insert duplicate values into a column while a unique index is being created, or you might insert NULL values into a column while creating a primary key index on that column. The changes made by the concurrent DML take precedence, and the ALTER TABLE operation is effectively rolled back.

\subsection*{17.12.8 Online DDL Limitations}

The following limitations apply to online DDL operations:
- The table is copied when creating an index on a TEMPORARY TABLE.
- The ALTER TABLE clause LOCK=NONE is not permitted if there are ON . . .CASCADE or ON . . .SET NULL constraints on the table.
- Before an in-place online DDL operation can finish, it must wait for transactions that hold metadata locks on the table to commit or roll back. An online DDL operation may briefly require an exclusive metadata lock on the table during its execution phase, and always requires one in the final phase of the operation when updating the table definition. Consequently, transactions holding metadata locks on the table can cause an online DDL operation to block. The transactions that hold metadata locks on the table may have been started before or during the online DDL operation. A long running or inactive transaction that holds a metadata lock on the table can cause an online DDL operation to timeout.
- When running an in-place online DDL operation, the thread that runs the ALTER TABLE statement applies an online log of DML operations that were run concurrently on the same table from other connection threads. When the DML operations are applied, it is possible to encounter a duplicate key entry error (ERROR 1062 (23000): Duplicate entry), even if the duplicate entry is only temporary and would be reverted by a later entry in the online log. This is similar to the idea of a foreign key constraint check in InnoDB in which constraints must hold during a transaction.
- OPTIMIZE TABLE for an InnoDB table is mapped to an ALTER TABLE operation to rebuild the table and update index statistics and free unused space in the clustered index. Secondary indexes are not created as efficiently because keys are inserted in the order they appeared in the primary key. OPTIMIZE TABLE is supported with the addition of online DDL support for rebuilding regular and partitioned InnoDB tables.
- Tables created before MySQL 5.6 that include temporal columns (DATE, DATETIME or TIMESTAMP) and have not been rebuilt using ALGORITHM=COPY do not support ALGORITHM=INPLACE. In this case, an ALTER TABLE ... ALGORITHM=INPLACE operation returns the following error:

ERROR 1846 (0A000): ALGORITHM=INPLACE is not supported.
Reason: Cannot change column type INPLACE. Try ALGORITHM=COPY.
- The following limitations are generally applicable to online DDL operations on large tables that involve rebuilding the table:
- There is no mechanism to pause an online DDL operation or to throttle I/O or CPU usage for an online DDL operation.
- Rollback of an online DDL operation can be expensive should the operation fail.
- Long running online DDL operations can cause replication lag. An online DDL operation must finish running on the source before it is run on the replica. Also, DML that was processed concurrently on the source is only processed on the replica after the DDL operation on the replica is completed.

For additional information related to running online DDL operations on large tables, see Section 17.12.2, "Online DDL Performance and Concurrency".

\subsection*{17.13 InnoDB Data-at-Rest Encryption}

InnoDB supports data-at-rest encryption for file-per-table tablespaces, general tablespaces, the mysql system tablespace, redo logs, and undo logs.

You can set an encryption default for schemas and general tablespaces; this permits DBAs to control whether tables created in those schemas and tablespaces are encrypted.

InnoDB data-at-rest encryption features and capabilities are described under the following topics in this section.
- About Data-at-Rest Encryption
- Encryption Prerequisites
- Defining an Encryption Default for Schemas and General Tablespaces
- File-Per-Table Tablespace Encryption
- General Tablespace Encryption
- Doublewrite File Encryption
- mysql System Tablespace Encryption
- Redo Log Encryption
- Undo Log Encryption
- Master Key Rotation
- Encryption and Recovery
- Exporting Encrypted Tablespaces
- Encryption and Replication
- Identifying Encrypted Tablespaces and Schemas
- Monitoring Encryption Progress
- Encryption Usage Notes
- Encryption Limitations

\section*{About Data-at-Rest Encryption}

InnoDB uses a two tier encryption key architecture, consisting of a master encryption key and tablespace keys. When a tablespace is encrypted, a tablespace key is encrypted and stored in the tablespace header. When an application or authenticated user wants to access encrypted tablespace data, InnoDB uses a master encryption key to decrypt the tablespace key. The decrypted version of a tablespace key never changes, but the master encryption key can be changed as required. This action is referred to as master key rotation.

The data-at-rest encryption feature relies on a keyring component or plugin for master encryption key management.

All MySQL editions provide a component_keyring_file component, which stores keyring data in a file local to the server host.

MySQL Enterprise Edition offers additional keyring components and plugins:
- component_keyring_encrypted_file: Stores keyring data in an encrypted, passwordprotected file local to the server host.
- keyring_okv: A KMIP 1.1 plugin for use with KMIP-compatible back end keyring storage products. Supported KMIP-compatible products include centralized key management solutions such as Oracle Key Vault, Gemalto KeySecure, Thales Vormetric key management server, and Fornetix Key Orchestration.
- keyring_aws: Communicates with the Amazon Web Services Key Management Service (AWS KMS) as a back end for key generation and uses a local file for key storage.
- keyring_hashicorp: Communicates with HashiCorp Vault for back end storage.

\section*{Warning}

For encryption key management, the component_keyring_file and component_keyring_encrypted_file components are not intended as a regulatory compliance solution. Security standards such as PCI, FIPS, and others require use of key management systems to secure, manage, and protect encryption keys in key vaults or hardware security modules (HSMs).

A secure and robust encryption key management solution is critical for security and for compliance with various security standards. When the data-at-rest encryption feature uses a centralized key management solution, the feature is referred to as "MySQL Enterprise Transparent Data Encryption (TDE)".

The data-at-rest encryption feature supports the Advanced Encryption Standard (AES) block-based encryption algorithm. It uses Electronic Codebook (ECB) block encryption mode for tablespace key encryption and Cipher Block Chaining (CBC) block encryption mode for data encryption.

For frequently asked questions about the data-at-rest encryption feature, see Section A.17, "MySQL 8.4 FAQ: InnoDB Data-at-Rest Encryption".

\section*{Encryption Prerequisites}
- A keyring component or plugin must be installed and configured at startup. Early loading ensures that the component or plugin is available prior to initialization of the InnoDB storage engine. For keyring installation and configuration instructions, see Section 8.4.4, "The MySQL Keyring". The instructions show how to ensure that the chosen component or plugin is active.

Only one keyring component or plugin should be enabled at a time. Enabling multiple keyring components or plugins is unsupported and results may not be as anticipated.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3176.jpg?height=97&width=103&top_left_y=1450&top_left_x=338)

\section*{Important}

Once encrypted tablespaces are created in a MySQL instance, the keyring component or plugin that was loaded when creating the encrypted tablespace must continue to be loaded at startup. Failing to do so results in errors when starting the server and during InnoDB recovery.
- When encrypting production data, ensure that you take steps to prevent loss of the master encryption key. If the master encryption key is lost, data stored in encrypted tablespace files is unrecoverable. If you use the component_keyring_file or component_keyring_encrypted_file component create a backup of the keyring data file immediately after creating the first encrypted tablespace, before master key rotation, and after master key rotation. For each component, its configuration file indicates the data file location. If you use the keyring_okv or keyring_aws plugin, ensure that you have performed the necessary configuration. For instructions, see Section 8.4.4, "The MySQL Keyring".

\section*{Defining an Encryption Default for Schemas and General Tablespaces}
default_table_encryption system variable defines the default encryption setting for schemas and general tablespaces. CREATE TABLESPACE and CREATE SCHEMA operations apply the default_table_encryption setting when an ENCRYPTION clause is not specified explicitly.

ALTER SCHEMA and ALTER TABLESPACE operations do not apply the default_table_encryption setting. An ENCRYPTION clause must be specified explicitly to alter the encryption of an existing schema or general tablespace.

The default_table_encryption variable can be set for an individual client connection or globally using SET syntax. For example, the following statement enables default schema and tablespace encryption globally:
```
mysql> SET GLOBAL default_table_encryption=ON;
```


The default encryption setting for a schema can also be defined using the DEFAULT ENCRYPTION clause when creating or altering a schema, as in this example:
mysql> CREATE SCHEMA test DEFAULT ENCRYPTION = 'Y';
If the DEFAULT ENCRYPTION clause is not specified when creating a schema, the default_table_encryption setting is applied. The DEFAULT ENCRYPTION clause must be specified to alter the default encryption of an existing schema. Otherwise, the schema retains its current encryption setting.

By default, a table inherits the encryption setting of the schema or general tablespace it is created in. For example, a table created in an encryption-enabled schema is encrypted by default. This behavior enables a DBA to control table encryption usage by defining and enforcing schema and general tablespace encryption defaults.

Encryption defaults are enforced by enabling the table_encryption_privilege_check system variable. When table_encryption_privilege_check is enabled, a privilege check occurs when creating or altering a schema or general tablespace with an encryption setting that differs from the default_table_encryption setting, or when creating or altering a table with an encryption setting that differs from the default schema encryption. When table_encryption_privilege_check is disabled (the default), the privilege check does not occur and the previously mentioned operations are permitted to proceed with a warning.

The TABLE_ENCRYPTION_ADMIN privilege is required to override default encryption settings when table_encryption_privilege_check is enabled. A DBA can grant this privilege to enable a user to deviate from the default_table_encryption setting when creating or altering a schema or general tablespace, or to deviate from the default schema encryption when creating or altering a table. This privilege does not permit deviating from the encryption of a general tablespace when creating or altering a table. A table must have the same encryption setting as the general tablespace it resides in.

\section*{File-Per-Table Tablespace Encryption}

A file-per-table tablespace inherits the default encryption of the schema in which the table is created unless an ENCRYPTION clause is specified explicitly in the CREATE TABLE statement.
mysql> CREATE TABLE t1 (c1 INT) ENCRYPTION = 'Y';
To alter the encryption of an existing file-per-table tablespace, an ENCRYPTION clause must be specified.
mysql> ALTER TABLE t1 ENCRYPTION = 'Y';
table_encryption_privilege_check is enabled, specifying an ENCRYPTION clause with a setting that differs from the default schema encryption requires the TABLE_ENCRYPTION_ADMIN privilege. See Defining an Encryption Default for Schemas and General Tablespaces.

\section*{General Tablespace Encryption}

The default_table_encryption variable determines the encryption of a newly created general tablespace unless an ENCRYPTION clause is specified explicitly in the CREATE TABLESPACE statement.
mysql> CREATE TABLESPACE ˋts1ˋ ADD DATAFILE 'ts1.ibd' ENCRYPTION = 'Y' Engine=InnoDB;
To alter the encryption of an existing general tablespace, an ENCRYPTION clause must be specified.
mysql> ALTER TABLESPACE ts1 ENCRYPTION = 'Y';
If table_encryption_privilege_check is enabled, specifying an ENCRYPTION clause with a setting that differs from the default_table_encryption setting requires the TABLE_ENCRYPTION_ADMIN privilege. See Defining an Encryption Default for Schemas and General Tablespaces.

\section*{Doublewrite File Encryption}

In MySQL 8.4, InnoDB automatically encrypts doublewrite file pages that belong to encrypted tablespaces. No action is required. Doublewrite file pages are encrypted using the encryption key of the associated tablespace. The same encrypted page written to a tablespace data file is also written to a doublewrite file. Doublewrite file pages that belong to an unencrypted tablespace remain unencrypted.

During recovery, encrypted doublewrite file pages are unencrypted and checked for corruption.

\section*{mysql System Tablespace Encryption}

The mysql system tablespace contains the mysql system database and MySQL data dictionary tables. It is unencrypted by default. To enable encryption for the mysql system tablespace, specify the tablespace name and the ENCRYPTION option in an ALTER TABLESPACE statement.
mysql> ALTER TABLESPACE mysql ENCRYPTION = 'Y';
To disable encryption for the mysql system tablespace, set ENCRYPTION = 'N' using an ALTER TABLESPACE statement.
mysql> ALTER TABLESPACE mysql ENCRYPTION = 'N';
Enabling or disabling encryption for the mysql system tablespace requires the CREATE TABLESPACE privilege on all tables in the instance (CREATE TABLESPACE on *.*).

\section*{Redo Log Encryption}

Redo log data encryption is enabled using the innodb_redo_log_encrypt configuration option. Redo log encryption is disabled by default.

As with tablespace data, redo log data encryption occurs when redo log data is written to disk, and decryption occurs when redo log data is read from disk. Once redo log data is read into memory, it is in unencrypted form. Redo log data is encrypted and decrypted using the tablespace encryption key.

When innodb_redo_log_encrypt is enabled, unencrypted redo log pages that are present on disk remain unencrypted, and new redo log pages are written to disk in encrypted form. Likewise, when innodb_redo_log_encrypt is disabled, encrypted redo log pages that are present on disk remain encrypted, and new redo log pages are written to disk in unencrypted form.

Redo log encryption metadata, including the tablespace encryption key, is stored in the header of the redo log file with the most recent checkpoint LSN. If the redo log file with the encryption metadata is removed, redo log encryption is disabled.

Once redo log encryption is enabled, a normal restart without the keyring component or plugin or without the encryption key is not possible, as InnoDB must be able to scan redo pages during startup, which is not possible if redo log pages are encrypted. Without the keyring component or plugin or the encryption key, only a forced startup without the redo logs (SRV_FORCE_NO_LOG_REDO) is possible. See Section 17.20.3, "Forcing InnoDB Recovery".

\section*{Undo Log Encryption}

Undo log data encryption is enabled using the innodb_undo_log_encrypt configuration option. Undo log encryption applies to undo logs that reside in undo tablespaces. See Section 17.6.3.4, "Undo Tablespaces". Undo log data encryption is disabled by default.

As with tablespace data, undo log data encryption occurs when undo log data is written to disk, and decryption occurs when undo log data is read from disk. Once undo log data is read into memory, it is in unencrypted form. Undo log data is encrypted and decrypted using the tablespace encryption key.

When innodb_undo_log_encrypt is enabled, unencrypted undo log pages that are present on disk remain unencrypted, and new undo log pages are written to disk in encrypted form. Likewise, when
innodb_undo_log_encrypt is disabled, encrypted undo log pages that are present on disk remain encrypted, and new undo log pages are written to disk in unencrypted form.

Undo log encryption metadata, including the tablespace encryption key, is stored in the header of the undo log file.

> Note
> When undo log encryption is disabled, the server continues to require the keyring component or plugin that was used to encrypt undo log data until the undo tablespaces that contained the encrypted undo log data are truncated. (An encryption header is only removed from an undo tablespace when the undo tablespace is truncated.) For information about truncating undo tablespaces, see Truncating Undo Tablespaces.

\section*{Master Key Rotation}

The master encryption key should be rotated periodically and whenever you suspect that the key has been compromised.

Master key rotation is an atomic, instance-level operation. Each time the master encryption key is rotated, all tablespace keys in the MySQL instance are re-encrypted and saved back to their respective tablespace headers. As an atomic operation, re-encryption must succeed for all tablespace keys once a rotation operation is initiated. If master key rotation is interrupted by a server failure, InnoDB rolls the operation forward on server restart. For more information, see Encryption and Recovery.

Rotating the master encryption key only changes the master encryption key and re-encrypts tablespace keys. It does not decrypt or re-encrypt associated tablespace data.

Rotating the master encryption key requires the ENCRYPTION_KEY_ADMIN privilege (or the deprecated SUPER privilege).

To rotate the master encryption key, run:
mysql> ALTER INSTANCE ROTATE INNODB MASTER KEY;
ALTER INSTANCE ROTATE INNODB MASTER KEY supports concurrent DML. However, it cannot be run concurrently with tablespace encryption operations, and locks are taken to prevent conflicts that could arise from concurrent execution. If an ALTER INSTANCE ROTATE INNODB MASTER KEY operation is running, it must finish before a tablespace encryption operation can proceed, and vice versa.

\section*{Encryption and Recovery}

If a server failure occurs during an encryption operation, the operation is rolled forward when the server is restarted. For general tablespaces, the encryption operation is resumed in a background thread from the last processed page.

If a server failure occurs during master key rotation, InnoDB continues the operation on server restart.
The keyring component or plugin must be loaded prior to storage engine initialization so that the information necessary to decrypt tablespace data pages can be retrieved from tablespace headers before InnoDB initialization and recovery activities access tablespace data. (See Encryption Prerequisites.)

When InnoDB initialization and recovery begin, the master key rotation operation resumes. Due to the server failure, some tablespace keys may already be encrypted using the new master encryption key. InnoDB reads the encryption data from each tablespace header, and if the data indicates that the tablespace key is encrypted using the old master encryption key, InnoDB retrieves the old key from the keyring and uses it to decrypt the tablespace key. InnoDB then re-encrypts the tablespace key using the new master encryption key and saves the re-encrypted tablespace key back to the tablespace header.

\section*{Exporting Encrypted Tablespaces}

Tablespace export is only supported for file-per-table tablespaces.
When an encrypted tablespace is exported, InnoDB generates a transfer key that is used to encrypt the tablespace key. The encrypted tablespace key and transfer key are stored in a tablespace_name.cfp file. This file together with the encrypted tablespace file is required to perform an import operation. On import, InnoDB uses the transfer key to decrypt the tablespace key in the tablespace_name.cfp file. For related information, see Section 17.6.1.3, "Importing InnoDB Tables".

\section*{Encryption and Replication}
- The ALTER INSTANCE ROTATE INNODB MASTER KEY statement is only supported in replication environments where the source and replica run a version of MySQL that supports tablespace encryption.
- Successful ALTER INSTANCE ROTATE INNODB MASTER KEY statements are written to the binary log for replication on replicas.
- If an ALTER INSTANCE ROTATE INNODB MASTER KEY statement fails, it is not logged to the binary log and is not replicated on replicas.
- Replication of an ALTER INSTANCE ROTATE INNODB MASTER KEY operation fails if the keyring component or plugin is installed on the source but not on the replica.

\section*{Identifying Encrypted Tablespaces and Schemas}

The Information Schema INNODB_TABLESPACES table includes an ENCRYPTION column that can be used to identify encrypted tablespaces.
```
mysql> SELECT SPACE, NAME, SPACE_TYPE, ENCRYPTION FROM INFORMATION_SCHEMA.INNODB_TABLESPACES
        WHERE ENCRYPTION='Y'\G
************************** 1. row
    SPACE: 4294967294
        NAME: mysql
SPACE_TYPE: General
ENCRYPTION: Y
*************************** 2. r ow ***************************************
    SPACE: 2
        NAME: test/t1
SPACE_TYPE: Single
ENCRYPTION: Y
************************* 3. row ******************************************
    SPACE: 3
        NAME: ts1
SPACE_TYPE: General
ENCRYPTION: Y
```


When the ENCRYPTION option is specified in a CREATE TABLE or ALTER TABLE statement, it is recorded in the CREATE_OPTIONS column of INFORMATION_SCHEMA. TABLES. This column can be queried to identify tables that reside in encrypted file-per-table tablespaces.
```
mysql> SELECT TABLE_SCHEMA, TABLE_NAME, CREATE_OPTIONS FROM INFORMATION_SCHEMA.TABLES
    WHERE CREATE_OPTIONS LIKE '%ENCRYPTION%';
+---------------+-------------+----------------+
| TABLE_SCHEMA | TABLE_NAME | CREATE_OPTIONS |
+---------------+-------------+----------------+
| test | t1 | ENCRYPTION="Y" |
+---------------+-------------+---------------+
```


Query the Information Schema INNODB_TABLESPACES table to retrieve information about the tablespace associated with a particular schema and table.
```
mysql> SELECT SPACE, NAME, SPACE_TYPE FROM INFORMATION_SCHEMA.INNODB_TABLESPACES WHERE NAME='test/t1';
+-------+----------+------------+
```

```
SPACE | NAME | SPACE_TYPE |
+-------+----------+------------+
| 3 | test/t1 | Single |
```


You can identify encryption-enabled schemas by querying the Information Schema SCHEMATA table.
```
mysql> SELECT SCHEMA_NAME, DEFAULT_ENCRYPTION FROM INFORMATION_SCHEMA.SCHEMATA
        WHERE DEFAULT_ENCRYPTION='YES';
+--------------+--------------------+
| SCHEMA_NAME | DEFAULT_ENCRYPTION |
+--------------+--------------------+
| test | YES |
```


SHOW CREATE SCHEMA also shows the DEFAULT ENCRYPTION clause.

\section*{Monitoring Encryption Progress}

You can monitor general tablespace and mysql system tablespace encryption progress using Performance Schema.

The stage/innodb/alter tablespace (encryption) stage event instrument reports WORK_ESTIMATED and WORK_COMPLETED information for general tablespace encryption operations.

The following example demonstrates how to enable the stage/innodb/alter tablespace (encryption) stage event instrument and related consumer tables to monitor general tablespace or mysql system tablespace encryption progress. For information about Performance Schema stage event instruments and related consumers, see Section 29.12.5, "Performance Schema Stage Event Tables".
1. Enable the stage/innodb/alter tablespace (encryption) instrument:
```
mysql> USE performance_schema;
mysql> UPDATE setup_instruments SET ENABLED = 'YES'
    WHERE NAME LIKE 'stage/innodb/alter tablespace (encryption)';
```

2. Enable the stage event consumer tables, which include events_stages_current, events_stages_history, and events_stages_history_long.
```
mysql> UPDATE setup_consumers SET ENABLED = 'YES' WHERE NAME LIKE '%stages%';
```

3. Run a tablespace encryption operation. In this example, a general tablespace named ts1 is encrypted.
```
mysql> ALTER TABLESPACE ts1 ENCRYPTION = 'Y';
```

4. Check the progress of the encryption operation by querying the Performance Schema events_stages_current table. WORK_ESTIMATED reports the total number of pages in the tablespace. WORK_COMPLETED reports the number of pages processed.
```
mysql> SELECT EVENT_NAME, WORK_ESTIMATED, WORK_COMPLETED FROM events_stages_current;
+----------------------------------------------+---------------+----------------
| EVENT_NAME | WORK_COMPLETED | WORK_ESTIMATED |
+----------------------------------------------+---------------+----------------
| stage/innodb/alter tablespace (encryption) | 1056 | 1407 |
```


The events_stages_current table returns an empty set if the encryption operation has completed. In this case, you can check the events_stages_history table to view event data for the completed operation. For example:
```
mysql> SELECT EVENT_NAME, WORK_COMPLETED, WORK_ESTIMATED FROM events_stages_history;
+----------------------------------------------+--------------------------------
| EVENT_NAME | WORK_COMPLETED | WORK_ESTIMATED
+----------------------------------------------+----------------+---------------
| stage/innodb/alter tablespace (encryption) | 1407 | 1407 |
```


\section*{Encryption Usage Notes}
- Plan appropriately when altering an existing file-per-table tablespace with the ENCRYPTION option. Tables residing in file-per-table tablespaces are rebuilt using the COPY algorithm. The INPLACE algorithm is used when altering the ENCRYPTION attribute of a general tablespace or the mysql system tablespace. The INPLACE algorithm permits concurrent DML on tables that reside in the general tablespace. Concurrent DDL is blocked.
- When a general tablespace or the mysql system tablespace is encrypted, all tables residing in the tablespace are encrypted. Likewise, a table created in an encrypted tablespace is encrypted.
- If the server exits or is stopped during normal operation, it is recommended to restart the server using the same encryption settings that were configured previously.
- The first master encryption key is generated when the first new or existing tablespace is encrypted.
- Master key rotation re-encrypts tablespaces keys but does not change the tablespace key itself. To change a tablespace key, you must disable and re-enable encryption. For file-per-table tablespaces, re-encrypting the tablespace is an ALGORITHM=COPY operation that rebuilds the table. For general tablespaces and the mysql system tablespace, it is an ALGORITHM=INPLACE operation, which does not require rebuilding tables that reside in the tablespace.
- If a table is created with both the COMPRESSION and ENCRYPTION options, compression is performed before tablespace data is encrypted.
- Uninstalling the component_keyring_file or component_keyring_encrypted_file component does not remove an existing keyring data file.
- It is recommended that you not place a keyring data file under the same directory as tablespace data files.
- Encryption is supported for the InnoDB FULLTEXT index tables that are created implicitly when adding a FULLTEXT index. For related information, see InnoDB Full-Text Index Tables.

\section*{Encryption Limitations}
- Advanced Encryption Standard (AES) is the only supported encryption algorithm. InnoDB tablespace encryption uses Electronic Codebook (ECB) block encryption mode for tablespace key encryption and Cipher Block Chaining (CBC) block encryption mode for data encryption. Padding is not used with CBC block encryption mode. Instead, InnoDB ensures that the text to be encrypted is a multiple of the block size.
- Encryption is supported only for file-per-table tablespaces, general tablespaces, and the mysql system tablespace. Encryption is not supported for other tablespace types including the InnoDB system tablespace.
- You cannot move or copy a table from an encrypted file-per-table tablespace, general tablespace, or the mysql system tablespace to a tablespace type that does not support encryption.
- You cannot move or copy a table from an encrypted tablespace to an unencrypted tablespace. However, moving a table from an unencrypted tablespace to an encrypted one is permitted. For example, you can move or copy a table from a unencrypted file-per-table or general tablespace to an encrypted general tablespace.
- By default, tablespace encryption only applies to data in the tablespace. Redo log and undo log data can be encrypted by enabling innodb_redo_log_encrypt and innodb_undo_log_encrypt. See Redo Log Encryption, and Undo Log Encryption. For information about binary log file and relay log file encryption, see Section 19.3.2, "Encrypting Binary Log Files and Relay Log Files".
- It is not permitted to change the storage engine of a table that resides in, or previously resided in, an encrypted tablespace.

\subsection*{17.14 InnoDB Startup Options and System Variables}
- InnoDB Startup Options
- InnoDB System Variables
- System variables that are true or false can be enabled at server startup by naming them, or disabled by using a --skip- prefix. For example, to enable or disable the InnoDB adaptive hash index, you can use --innodb-adaptive-hash-index or--skip-innodb-adaptive-hash-index on the command line, or innodb_adaptive_hash_index or skip_innodb_adaptive_hash_index in an option file.
- Some variable descriptions refer to "enabling" or "disabling" a variable. These variables can be enabled with the SET statement by setting them to ON or 1, or disabled by setting them to OFF or 0 . Boolean variables can be set at startup to the values ON, TRUE, OFF, and FALSE (not casesensitive), as well as 1 and 0. See Section 6.2.2.4, "Program Option Modifiers".
- System variables that take a numeric value can be specified as --var_name=value on the command line or as var_name=value in option files.
- Many system variables can be changed at runtime (see Section 7.1.9.2, "Dynamic System Variables").
- For information about GLOBAL and SESSION variable scope modifiers, refer to the SET statement documentation.
- Certain options control the locations and layout of the InnoDB data files. Section 17.8.1, "InnoDB Startup Configuration" explains how to use these options.
- Some options, which you might not use initially, help tune InnoDB performance characteristics based on machine capacity and database workload.
- For more information on specifying options and system variables, see Section 6.2.2, "Specifying Program Options".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 17.23 InnoDB Option and Variable Reference}
\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline foreign_key_c & hecks & & Yes & & Both & Yes \\
\hline innodb_adapti & Mé\$lushing & Yes & Yes & & Global & Yes \\
\hline innodb_adapti & Mé\$lushing_Iw & Mes & Yes & & Global & Yes \\
\hline innodb_adapti & Mę\$ash_index & Yes & Yes & & Global & Yes \\
\hline innodb_adapti & Mę\$ash_index & Yesits & Yes & & Global & No \\
\hline innodb_adapti & Nésnax_sleep & Ydesay & Yes & & Global & Yes \\
\hline innodb_autoex & 椮到_incremen & Yes & Yes & & Global & Yes \\
\hline innodb_autoin & CYesck_mode & Yes & Yes & & Global & No \\
\hline innodb_backg & qesd_drop_list & Yesnpty & Yes & & Global & Yes \\
\hline Innodb_buffer & \multicolumn{2}{|l|}{pool_bytes_data} & & Yes & Global & No \\
\hline Innodb_buffer & \multicolumn{2}{|l|}{pool_bytes_dirty} & & Yes & Global & No \\
\hline innodb_buffer & \multicolumn{2}{|l|}{foesl_chunk_siłes} & Yes & & Global & No \\
\hline innodb_buffer & pesl_debug & Yes & Yes & & Global & No \\
\hline innodb_buffer & |besl_dump_at & Ydutdown & Yes & & Global & Yes \\
\hline innodb_buffer & \multicolumn{2}{|l|}{foesl_dump_nołes} & Yes & & Global & Yes \\
\hline innodb_buffer & _besl_dump_p & cYes & Yes & & Global & Yes \\
\hline Innodb_buffer & \multicolumn{2}{|l|}{pool_dump_status} & & Yes & Global & No \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline innodb＿buffer＿besl＿filename & Yes & Yes & & Global & Yes \\
\hline innodb＿buffer＿үesl＿in＿core＿f & files & Yes & & Global & Yes \\
\hline innodb＿buffer＿besl＿instances & SYes & Yes & & Global & No \\
\hline innodb＿buffer＿pesl＿load＿abo & phes & Yes & & Global & Yes \\
\hline innodb＿buffer＿pesl＿load＿at＿§ & stéstup & Yes & & Global & No \\
\hline innodb＿buffer＿besl＿load＿now & Wes & Yes & & Global & Yes \\
\hline Innodb＿buffer＿pool＿load＿stat & tus & & Yes & Global & No \\
\hline Innodb＿buffer＿pool＿pages＿da & data & & Yes & Global & No \\
\hline Innodb＿buffer＿pool＿pages＿di & dirty & & Yes & Global & No \\
\hline Innodb＿buffer＿pool＿pages＿f｜u & ushed & & Yes & Global & No \\
\hline Innodb＿buffer＿pool＿pages＿fre & ree & & Yes & Global & No \\
\hline Innodb＿buffer＿pool＿pages＿la & atched & & Yes & Global & No \\
\hline Innodb＿buffer＿pool＿pages＿m & misc & & Yes & Global & No \\
\hline Innodb＿buffer＿pool＿pages＿to & total & & Yes & Global & No \\
\hline Innodb＿buffer＿pool＿read＿ahe & ead & & Yes & Global & No \\
\hline Innodb＿buffer＿pool＿read＿ahe & ead＿evicted & & Yes & Global & No \\
\hline Innodb＿buffer＿pool＿read＿ahe & ead＿rnd & & Yes & Global & No \\
\hline Innodb＿buffer＿pool＿read＿requ & quests & & Yes & Global & No \\
\hline Innodb＿buffer＿pool＿reads & & & Yes & Global & No \\
\hline Innodb＿buffer＿pool＿resize＿s & status & & Yes & Global & No \\
\hline innodb＿buffer＿besl＿size & Yes & Yes & & Global & Yes \\
\hline Innodb＿buffer＿pool＿wait＿free & & & Yes & Global & No \\
\hline Innodb＿buffer＿pool＿write＿req & quests & & Yes & Global & No \\
\hline innodb＿changer＿esiffer＿max＿ & Shes & Yes & & Global & Yes \\
\hline innodb＿changer＿esiffering & Yes & Yes & & Global & Yes \\
\hline innodb＿changer＿esiffering＿de & Dres & Yes & & Global & Yes \\
\hline innodb＿checkpb⿴囗⿱十冖⿱⿴囗⿱一一八夊刂＿disabled & Yes & Yes & & Global & Yes \\
\hline innodb＿checkskies＿algorithm & Yes & Yes & & Global & Yes \\
\hline innodb＿cmp＿peresindex＿enab & Neels & Yes & & Global & Yes \\
\hline innodb＿commiY＿esncurrency & Yes & Yes & & Global & Yes \\
\hline innodb＿compresess＿debug & Yes & Yes & & Global & Yes \\
\hline innodb＿compreseson＿failure & theeshold＿pct & Yes & & Global & Yes \\
\hline innodb＿comprefsesion＿level & Yes & Yes & & Global & Yes \\
\hline innodb＿compression＿pad＿p¢ & Yesax & Yes & & Global & Yes \\
\hline innodb＿concurherscy＿tickets & Yes & Yes & & Global & Yes \\
\hline innodb＿data＿filkésath & Yes & Yes & & Global & No \\
\hline Innodb＿data＿fsyncs & & & Yes & Global & No \\
\hline innodb＿data＿hனere＿dir & Yes & Yes & & Global & No \\
\hline Innodb＿data＿pending＿fsyncs & & & Yes & Global & No \\
\hline Innodb＿data＿pending＿reads & & & Yes & Global & No \\
\hline Innodb＿data＿pending＿writes & & & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline Innodb_data_ & ead & & & Yes & Global & No \\
\hline Innodb_data_ & eads & & & Yes & Global & No \\
\hline Innodb_data_ & writes & & & Yes & Global & No \\
\hline Innodb_data_ & written & & & Yes & Global & No \\
\hline Innodb_dblwr & pages_written & & & Yes & Global & No \\
\hline Innodb_dblwr & writes & & & Yes & Global & No \\
\hline innodb_ddl_bu & ffes_size & Yes & Yes & & Session & Yes \\
\hline innodb_ddl_log & gYesash_reset & Mebug & Yes & & Global & Yes \\
\hline innodb_ddl_thr & reads & Yes & Yes & & Session & Yes \\
\hline innodb_deadlo & Delesdetect & Yes & Yes & & Global & Yes \\
\hline innodb_dedica & Meels server & Yes & Yes & & Global & No \\
\hline innodb_defaultt & tYeesv_format & Yes & Yes & & Global & Yes \\
\hline innodb_direct $\phi$ & Mes & Yes & Yes & & Global & No \\
\hline innodb_disableY & eYesrt_file_cad & Yees & Yes & & Global & Yes \\
\hline innodb_doublev & Weise & Yes & Yes & & Global & Yes \\
\hline innodb_double & weise_batch_si & izes & Yes & & Global & No \\
\hline innodb_doublev & eVeise_dir & Yes & Yes & & Global & No \\
\hline innodb_double & Wreise_files & Yes & Yes & & Global & No \\
\hline innodb_double & Weise_pages & Yes & Yes & & Global & No \\
\hline innodb_fast_sh & Muesown & Yes & Yes & & Global & Yes \\
\hline innodb_fil_ma & kéesage_dirty & delsug & Yes & & Global & Yes \\
\hline innodb_file_pet & Yesble & Yes & Yes & & Global & Yes \\
\hline innodb_fill_fadt & tres & Yes & Yes & & Global & Yes \\
\hline innodb_flush & dœsat_timeout & Yes & Yes & & Global & Yes \\
\hline innodb_flush_ & dœsat_trx_com & Mets & Yes & & Global & Yes \\
\hline innodb_flush_ & Yethod & Yes & Yes & & Global & No \\
\hline innodb_flush_ & neghbors & Yes & Yes & & Global & Yes \\
\hline innodb_flush_ & Syes & Yes & Yes & & Global & Yes \\
\hline innodb_flushin & yyesvg_loops & Yes & Yes & & Global & Yes \\
\hline innodb_force_I & løas_corrupted & Yes & Yes & & Global & No \\
\hline innodb_force_ & reeovery & Yes & Yes & & Global & No \\
\hline innodb_fsync & thesshold & Yes & Yes & & Global & Yes \\
\hline innodb_ft_aux & table & & Yes & & Global & Yes \\
\hline innodb_ft_cach & iéesize & Yes & Yes & & Global & No \\
\hline innodb_ft_enad & D/lesdiag_print & Yes & Yes & & Global & Yes \\
\hline innodb_ft_enad & D/esstopword & Yes & Yes & & Both & Yes \\
\hline innodb_ft_maxY & Yesken_size & Yes & Yes & & Global & No \\
\hline innodb_ft_min & Yelsen_size & Yes & Yes & & Global & No \\
\hline innodb_ft_num & Yord_optimiz & \&es & Yes & & Global & Yes \\
\hline innodb_ft_resul & Mesache_limit & Yes & Yes & & Global & Yes \\
\hline innodb_ft_sery & resstopword_t & tades & Yes & & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline innodb_ft_sort_yels_degree & Yes & Yes & & Global & No \\
\hline innodb_ft_totalYesche_size & Yes & Yes & & Global & No \\
\hline innodb_ft_userYestopword_tab & Mœs & Yes & & Both & Yes \\
\hline Innodb_have_atomic_builtins & & & Yes & Global & No \\
\hline innodb_idle_flusespct & Yes & Yes & & Global & Yes \\
\hline innodb_io_capð(eis) & Yes & Yes & & Global & Yes \\
\hline innodb_io_capł (eibj_max & Yes & Yes & & Global & Yes \\
\hline innodb_limit_optesistic_insert & Yesbug & Yes & & Global & Yes \\
\hline innodb_lock_waiestimeout & Yes & Yes & & Both & Yes \\
\hline innodb_log_buffes_size & Yes & Yes & & Global & Yes \\
\hline innodb_log_ch\&espoint_fuzzy & Yeow & Yes & & Global & Yes \\
\hline innodb_log_ch\&elspoint_now & Yes & Yes & & Global & Yes \\
\hline innodb_log_ch\&elssums & Yes & Yes & & Global & Yes \\
\hline innodb_log_comessessed_pag & yes & Yes & & Global & Yes \\
\hline innodb_log_fileYeże & Yes & Yes & & Global & No \\
\hline innodb_log_filebesi_group & Yes & Yes & & Global & No \\
\hline innodb_log_grdłeis_home_dir & Yes & Yes & & Global & No \\
\hline innodb_log_spiYespu_abs_Ivv & Mfes & Yes & & Global & Yes \\
\hline innodb_log_spiYespu_pct_hw & Wres & Yes & & Global & Yes \\
\hline innodb_log_wał̆ęsor_flush_sp & płreshwm & Yes & & Global & Yes \\
\hline Innodb_log_waits & & & Yes & Global & No \\
\hline innodb_log_wriYesahead_size & Yes & Yes & & Global & Yes \\
\hline Innodb_log_write_requests & & & Yes & Global & No \\
\hline innodb_log_wriyess threads & Yes & Yes & & Global & Yes \\
\hline Innodb_log_writes & & & Yes & Global & No \\
\hline innodb_Iru_scaYęslepth & Yes & Yes & & Global & Yes \\
\hline innodb_max_dr’esspages_pct & Yes & Yes & & Global & Yes \\
\hline innodb_max_dir es_pages_pct & Yesm & Yes & & Global & Yes \\
\hline innodb_max_pdrege_lag & Yes & Yes & & Global & Yes \\
\hline innodb_max_pdære_lag_delay & Yes & Yes & & Global & Yes \\
\hline innodb_max_urres_log_size & Yes & Yes & & Global & Yes \\
\hline innodb_merge Ytaseshold_set & Yæls debug & Yes & & Global & Yes \\
\hline innodb_monitor_essable & Yes & Yes & & Global & Yes \\
\hline innodb_monitor_essable & Yes & Yes & & Global & Yes \\
\hline innodb_monitor_esset & Yes & Yes & & Global & Yes \\
\hline innodb_monitor_esset_all & Yes & Yes & & Global & Yes \\
\hline Innodb_num_open_files & & & Yes & Global & No \\
\hline innodb_numa_inesrleave & Yes & Yes & & Global & No \\
\hline innodb_old_blorcks_pct & Yes & Yes & & Global & Yes \\
\hline innodb_old_blores_time & Yes & Yes & & Global & Yes \\
\hline innodb_online_Ydtsr_log_max & Ysise & Yes & & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline innodb_open & fiYes & Yes & Yes & & Global & Yes \\
\hline innodb_optimi & zéesulltext_only & Yes & Yes & & Global & Yes \\
\hline Innodb_os_log & fsyncs & & & Yes & Global & No \\
\hline Innodb_os_log & _pending_fsyncs & & & Yes & Global & No \\
\hline Innodb_os_log & _pending_writes & & & Yes & Global & No \\
\hline Innodb_os_log & written & & & Yes & Global & No \\
\hline innodb_page_ & dYesners & Yes & Yes & & Global & No \\
\hline Innodb_page_ & size & & & Yes & Global & No \\
\hline innodb_page_ & SYRES & Yes & Yes & & Global & No \\
\hline Innodb_pages & created & & & Yes & Global & No \\
\hline Innodb_pages & read & & & Yes & Global & No \\
\hline Innodb_pages & written & & & Yes & Global & No \\
\hline innodb_paralle & Yesad_threads & Yes & Yes & & Session & Yes \\
\hline innodb_print_a & alreseadlocks & Yes & Yes & & Global & Yes \\
\hline innodb_print_q & desogs & Yes & Yes & & Global & Yes \\
\hline innodb_purge & basch_size & Yes & Yes & & Global & Yes \\
\hline innodb_purge & Yog_truncate & Yeesquency & Yes & & Global & Yes \\
\hline innodb_purge & Yesads & Yes & Yes & & Global & No \\
\hline innodb_rando & Yesad_ahead & Yes & Yes & & Global & Yes \\
\hline innodb_read_ & ałead_threshol & \&'es & Yes & & Global & Yes \\
\hline innodb_read_i & dodebreads & Yes & Yes & & Global & No \\
\hline innodb_read_ & pries & Yes & Yes & & Global & No \\
\hline innodb_redo_ & dogesarchive_dir & Yes & Yes & & Global & Yes \\
\hline innodb_redo_l & ogescapacity & Yes & Yes & & Global & Yes \\
\hline Innodb_redo_ & og_capacity_re & esized & & Yes & Global & No \\
\hline Innodb_redo_ & og_checkpoint & Isn & & Yes & Global & No \\
\hline Innodb_redo_ & og_current_Isn & & & Yes & Global & No \\
\hline Innodb_redo_ & og_enabled & & & Yes & Global & No \\
\hline innodb_redo_l & digesencrypt & Yes & Yes & & Global & Yes \\
\hline Innodb_redo_ & og_flushed_to & disk_Isn & & Yes & Global & No \\
\hline Innodb_redo_ & og_logical_size & & & Yes & Global & No \\
\hline Innodb_redo_ & og_physical_si & ize & & Yes & Global & No \\
\hline Innodb_redo_ & og_read_only & & & Yes & Global & No \\
\hline Innodb_redo_ & og_resize_statu & us & & Yes & Global & No \\
\hline Innodb_redo_ & og_uuid & & & Yes & Global & No \\
\hline innodb_replica & atreas_delay & Yes & Yes & & Global & Yes \\
\hline innodb_rollbac* & A-esn_timeout & Yes & Yes & & Global & No \\
\hline innodb_rollbac* & Hessegments & Yes & Yes & & Global & Yes \\
\hline Innodb_row_lo & ock_current_waits & & & Yes & Global & No \\
\hline Innodb_row_lo & ock_time & & & Yes & Global & No \\
\hline Innodb_row_lo & ock_time_avg & & & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline Innodb_row_lock_time_max & & & Yes & Global & No \\
\hline Innodb_row_lock_waits & & & Yes & Global & No \\
\hline Innodb_rows_deleted & & & Yes & Global & No \\
\hline Innodb_rows_inserted & & & Yes & Global & No \\
\hline Innodb_rows_read & & & Yes & Global & No \\
\hline Innodb_rows_updated & & & Yes & Global & No \\
\hline innodb_saved_Yeasje_number & Ydug & Yes & & Global & Yes \\
\hline innodb_segmelkeseserve_fac & CHers & Yes & & Global & Yes \\
\hline innodb_sort_bưfers_size & Yes & Yes & & Global & No \\
\hline innodb_spin_waisdelay & Yes & Yes & & Global & Yes \\
\hline innodb_spin_waespause_mu & Melser & Yes & & Global & Yes \\
\hline innodb_stats_ałies_recalc & Yes & Yes & & Global & Yes \\
\hline innodb_stats_ircesde_delete & Yestked & Yes & & Global & Yes \\
\hline innodb_stats_nyetwod & Yes & Yes & & Global & Yes \\
\hline innodb_stats_oYésnetadata & Yes & Yes & & Global & Yes \\
\hline innodb_stats_płesistent & Yes & Yes & & Global & Yes \\
\hline innodb_stats_płesistent_sam & Mlespages & Yes & & Global & Yes \\
\hline innodb_stats_tixamsient_samp & Méepages & Yes & & Global & Yes \\
\hline innodb-status-file & Yes & & & & \\
\hline innodb_status_beisput & Yes & Yes & & Global & Yes \\
\hline innodb_status_beæsput_locks & Yes & Yes & & Global & Yes \\
\hline innodb_strict_nyese & Yes & Yes & & Both & Yes \\
\hline innodb_sync_aYles)_size & Yes & Yes & & Global & No \\
\hline innodb_sync_deesig & Yes & Yes & & Global & No \\
\hline innodb_sync_syers_loops & Yes & Yes & & Global & Yes \\
\hline Innodb_system_rows_deleted & & & Yes & Global & No \\
\hline Innodb_system_rows_inserted & & & Yes & Global & No \\
\hline Innodb_system_rows_read & & & Yes & Global & No \\
\hline Innodb_system_rows_updated & & & Yes & Global & No \\
\hline innodb_table_|| cess & Yes & Yes & & Both & Yes \\
\hline innodb_temp_dła_file_path & Yes & Yes & & Global & No \\
\hline innodb_temp_tylelespaces_di & iYes & Yes & & Global & No \\
\hline innodb_thread_Yeesncurrency & Yes & Yes & & Global & Yes \\
\hline innodb_thread_Ystsep_delay & Yes & Yes & & Global & Yes \\
\hline innodb_tmpdir Yes & Yes & Yes & & Both & Yes \\
\hline Innodb_truncated_status_writ & tes & & Yes & Global & No \\
\hline innodb_trx_purges view_upda & \&esonly_debuo & Yes & & Global & Yes \\
\hline innodb_trx_rseyes_slots_deb & Mes & Yes & & Global & Yes \\
\hline innodb_undo_dłesctory & Yes & Yes & & Global & No \\
\hline innodb_undo_lனesencrypt & Yes & Yes & & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline innodb_undo & loestruncate & Yes & Yes & & Global & Yes \\
\hline innodb_undo & tylkespaces & Yes & Yes & & Global & Yes \\
\hline Innodb_undo_ & tablespaces_a & active & & Yes & Global & No \\
\hline Innodb_undo & tablespaces_e & explicit & & Yes & Global & No \\
\hline Innodb_undo & tablespaces_ir & implicit & & Yes & Global & No \\
\hline Innodb_undo & tablespaces_to & total & & Yes & Global & No \\
\hline innodb_use_fd & HEsync & Yes & Yes & & Global & Yes \\
\hline innodb_use_na & Aries_aio & Yes & Yes & & Global & No \\
\hline innodb_validate & \& 6ablespace & pads & Yes & & Global & No \\
\hline innodb_version & & & Yes & & Global & No \\
\hline innodb_write_ & dodbreads & Yes & Yes & & Global & No \\
\hline unique_checks & & & Yes & & Both & Yes \\
\hline
\end{tabular}

\section*{InnoDB Startup Options}
- --innodb-dedicated-server

\begin{tabular}{|l|l|}
\hline Command-Line Format & --innodb-dedicated-server[=\{OFF|ON\}] \\
\hline System Variable & innodb_dedicated_server \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

When this option is set by starting the server with --innodb-dedicated-server or--innodb-dedicated-server=ON, either on the command line or in a my.cnf file, InnoDB automatically calculates and sets the values of the following variables:
- innodb_buffer_pool_size
- innodb_redo_log_capacity

\section*{Note}

In older versions of MySQL 8.0, innodb_log_file_size and innodb_log_files_in_group were also set by - -innodb-dedicated-server.innodb_log_file_size and innodb_log_files_in_group have since been deprecated, and superseded by innodb_redo_log_capacity. See Section 17.6.5, "Redo Log".

In MySQL 8.0, innodb_flush_method was also set automatically by this option, but in MySQL 8.4, this is no longer the case.

You should consider using - - innodb-dedicated-server only if the MySQL instance resides on a dedicated server where it can use all available system resources. Using this option is not recommended if the MySQL instance shares system resources with other applications.

It is strongly recommended that you read Section 17.8.12, "Enabling Automatic InnoDB Configuration for a Dedicated MySQL Server", before using this option in production.
- --innodb-status-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- innodb-status-file[=\{OFF|ON\}] \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

The --innodb-status-file startup option controls whether InnoDB creates a file named innodb_status.pid in the data directory and writes SHOW ENGINE INNODB STATUS output to it every 15 seconds, approximately.

The innodb_status.pid file is not created by default. To create it, start mysqld with the --innodb-status-file option. InnoDB removes the file when the server is shut down normally. If an abnormal shutdown occurs, the status file may have to be removed manually.

The --innodb-status-file option is intended for temporary use, as SHOW ENGINE INNODB STATUS output generation can affect performance, and the innodb_status.pid file can become quite large over time.

For related information, see Section 17.17.2, "Enabling InnoDB Monitors".

