\section*{Memory Allocation}

\section*{MaxAllocate}

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type or units & unsigned \\
\hline Default & 32 M \\
\hline Range & $1 \mathrm{M}-1 \mathrm{G}$ \\
\hline Deprecated & Yes (in NDB 8.0) \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter was used in older versions of NDB Cluster, but has no effect in NDB 8.4. It is deprecated and subject to removal in a future release.

\section*{Multiple Transporters}

NDB allocates multiple transporters for communication between pairs of data nodes. The number of transporters so allocated can be influenced by setting an appropriate value for the NodeGroupTransporters parameter introduced in that release.

\section*{NodeGroupTransporters}

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 0 \\
\hline Range & $0-32$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter determines the number of transporters used between nodes in the same node group. The default value ( 0 ) means that the number of transporters used is the same as the number of LDMs in the node. This should be sufficient for most use cases; thus it should seldom be necessary to change this value from its default.

Setting NodeGroupTransporters to a number greater than the number of LDM threads or the number of TC threads, whichever is higher, causes NDB to use the maximum of these two numbers of threads. This means that a value greater than this is effectively ignored.

\section*{Hash Map Size}

DefaultHashMapSize

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & LDM threads \\
\hline Default & 240 \\
\hline Range & $0-3840$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

The original intended use for this parameter was to facilitate upgrades and especially downgrades to and from very old releases with differing default hash map sizes. This is not an issue when upgrading from NDB Cluster 7.3 (or later) to later versions.

Decreasing this parameter online after any tables have been created or modified with DefaultHashMapSize equal to 3840 is not currently supported.

Logging and checkpointing. The following [ndbd] parameters control log and checkpoint behavior.
- FragmentLogFileSize

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 16M \\
\hline Range & 4M-1G \\
\hline Restart Type & \begin{tabular}{l}
Initial Node Restart: \\
Requires a rolling restart of the cluster; each data node must be restarted with --initial. (NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Setting this parameter enables you to control directly the size of redo log files. This can be useful in situations when NDB Cluster is operating under a high load and it is unable to close fragment log files quickly enough before attempting to open new ones (only 2 fragment log files can be open at one time); increasing the size of the fragment log files gives the cluster more time before having to open each new fragment log file. The default value for this parameter is 16 M .

For more information about fragment log files, see the description for NoOfFragmentLogFiles.
- InitialNoOfOpenFiles

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & files \\
\hline Default & 27 \\
\hline Range & \begin{tabular}{l}
$20-$ \\
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

This parameter sets the initial number of internal threads to allocate for open files.
The default value is 27 .
- InitFragmentLogFiles

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & [see values] \\
\hline Default & SPARSE \\
\hline Range & SPARSE, FULL \\
\hline Restart Type & \begin{tabular}{l}
Initial Node Restart: \\
Requires a rolling restart of the cluster; each data node must be restarted with --initial. (NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

By default, fragment log files are created sparsely when performing an initial start of a data node-that is, depending on the operating system and file system in use, not all bytes are necessarily written to disk. However, it is possible to override this behavior and force all bytes to be written, regardless of the platform and file system type being used, by means of this parameter. InitFragmentLogFiles takes either of two values:
- SPARSE. Fragment log files are created sparsely. This is the default value.
- FULL. Force all bytes of the fragment log file to be written to disk.

Depending on your operating system and file system, setting InitFragmentLogFiles=FULL may help eliminate I/O errors on writes to the redo log.
- EnablePartialLcp

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & boolean \\
\hline Default & true \\
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

When true, enable partial local checkpoints: This means that each LCP records only part of the full database, plus any records containing rows changed since the last LCP; if no rows have changed, the LCP updates only the LCP control file and does not update any data files.

If EnablePartialLcp is disabled (false), each LCP uses only a single file and writes a full checkpoint; this requires the least amount of disk space for LCPs, but increases the write load for
each LCP. The default value is enabled (true). The proportion of space used by partial LCPS can be modified by the setting for the RecoveryWork configuration parameter.

For more information about files and directories used for full and partial LCPs, see NDB Cluster Data Node File System Directory.

Setting this parameter to false also disables the calculation of disk write speed used by the adaptive LCP control mechanism.
- LcpScanProgressTimeout

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & second \\
\hline Default & 180 \\
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

A local checkpoint fragment scan watchdog checks periodically for no progress in each fragment scan performed as part of a local checkpoint, and shuts down the node if there is no progress after a given amount of time has elapsed. This interval can be set using the LcpScanProgressTimeout data node configuration parameter, which sets the maximum time for which the local checkpoint can be stalled before the LCP fragment scan watchdog shuts down the node.

The default value is 60 seconds (providing compatibility with previous releases). Setting this parameter to 0 disables the LCP fragment scan watchdog altogether.
- MaxNoOfOpenFiles

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & 0 \\
\hline Range & \begin{tabular}{l}
20 - \\
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

This parameter sets a ceiling on how many internal threads to allocate for open files. Any situation requiring a change in this parameter should be reported as a bug.

The default value is 0 . However, the minimum value to which this parameter can be set is 20 .
- MaxNoOfSavedMessages

\begin{tabular}{l|l|l|l}
\cline { 2 - 3 } & \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 & \\
\hline \multicolumn{1}{l}{3946} & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type or units & integer \\
\hline Default & 25 \\
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

This parameter sets the maximum number of errors written in the error log as well as the maximum number of trace files that are kept before overwriting the existing ones. Trace files are generated when, for whatever reason, the node crashes.

The default is 25 , which sets these maximums to 25 error messages and 25 trace files.
- MaxLCPStartDelay

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & seconds \\
\hline Default & 0 \\
\hline Range & $0-600$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

In parallel data node recovery, only table data is actually copied and synchronized in parallel; synchronization of metadata such as dictionary and checkpoint information is done in a serial fashion. In addition, recovery of dictionary and checkpoint information cannot be executed in parallel with performing of local checkpoints. This means that, when starting or restarting many data nodes concurrently, data nodes may be forced to wait while a local checkpoint is performed, which can result in longer node recovery times.

It is possible to force a delay in the local checkpoint to permit more (and possibly all) data nodes to complete metadata synchronization; once each data node's metadata synchronization is complete, all of the data nodes can recover table data in parallel, even while the local checkpoint is being executed. To force such a delay, set MaxLCPStartDelay, which determines the number of seconds the cluster can wait to begin a local checkpoint while data nodes continue to synchronize metadata. This parameter should be set in the [ndbd default] section of the config.ini file, so that it is the same for all data nodes. The maximum value is 600 ; the default is 0 .
- NoOfFragmentLogFiles

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 16 \\
\hline Range & \begin{tabular}{l}
$3-4294967039$ \\
(0xFFFFFEFF)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Initial Node \\
Restart:
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
& Requires a \\
rolling restart \\
of the cluster; \\
each data \\
node must be \\
restarted with \\
-- initial. \\
(NDB 8.4.0) \\
\hline
\end{tabular}

This parameter sets the number of REDO log files for the node, and thus the amount of space allocated to REDO logging. Because the REDO log files are organized in a ring, it is extremely important that the first and last log files in the set (sometimes referred to as the "head" and "tail" log files, respectively) do not meet. When these approach one another too closely, the node begins aborting all transactions encompassing updates due to a lack of room for new log records.

A REDO log record is not removed until both required local checkpoints have been completed since that log record was inserted. Checkpointing frequency is determined by its own set of configuration parameters discussed elsewhere in this chapter.

The default parameter value is 16 , which by default means 16 sets of 416 MB files for a total of 1024 MB . The size of the individual log files is configurable using the FragmentLogFileSize parameter. In scenarios requiring a great many updates, the value for NoOfFragmentLogFiles may need to be set as high as 300 or even higher to provide sufficient space for REDO logs.

If the checkpointing is slow and there are so many writes to the database that the log files are full and the log tail cannot be cut without jeopardizing recovery, all updating transactions are aborted with internal error code 410 (Out of log file space temporarily). This condition prevails until a checkpoint has completed and the log tail can be moved forward.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3978.jpg?height=120&width=106&top_left_y=1464&top_left_x=335)

\section*{Important}

This parameter cannot be changed "on the fly"; you must restart the node using - - initial. If you wish to change this value for all data nodes in a running cluster, you can do so using a rolling node restart (using --initial when starting each data node).
- RecoveryWork

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 60 \\
\hline Range & $25-100$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Percentage of storage overhead for LCP files. This parameter has an effect only when EnablePartialLcp is true, that is, only when partial local checkpoints are enabled. A higher value means:
- Fewer records are written for each LCP, LCPs use more space
- More work is needed during restarts

A lower value for RecoveryWork means:
- More records are written during each LCP, but LCPs require less space on disk.
- Less work during restart and thus faster restarts, at the expense of more work during normal operations

For example, setting RecoveryWork to 60 means that the total size of an LCP is roughly $1+0.6=$ 1.6 times the size of the data to be checkpointed. This means that $60 \%$ more work is required during the restore phase of a restart compared to the work done during a restart that uses full checkpoints. (This is more than compensated for during other phases of the restart such that the restart as a whole is still faster when using partial LCPs than when using full LCPs.) In order not to fill up the redo log, it is necessary to write at $1+(1 / R e c o v e r y W o r k)$ times the rate of data changes during checkpoints-thus, when RecoveryWork $=60$, it is necessary to write at approximately $1+(1 / 0.6) =2.67$ times the change rate. In other words, if changes are being written at 10 MByte per second, the checkpoint needs to be written at roughly 26.7 MByte per second.

Setting RecoveryWork = 40 means that only 1.4 times the total LCP size is needed (and thus the restore phase takes 10 to 15 percent less time. In this case, the checkpoint write rate is 3.5 times the rate of change.

The NDB source distribution includes a test program for simulating LCPs. lcp_simulator.cc can be found in storage/ndb/src/kernel/blocks/backup/. To compile and run it on Unix platforms, execute the commands shown here:
```
$> gcc lcp_simulator.cc
$> ./a.out
```


This program has no dependencies other than stdio.h, and does not require a connection to an NDB cluster or a MySQL server. By default, it simulates 300 LCPs (three sets of 100 LCPs, each consisting of inserts, updates, and deletes, in turn), reporting the size of the LCP after each one. You can alter the simulation by changing the values of recovery_work, insert_work, and delete_work in the source and recompiling. For more information, see the source of the program.
- InsertRecoveryWork

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 40 \\
\hline Range & $0-70$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Percentage of RecoveryWork used for inserted rows. A higher value increases the number of writes during a local checkpoint, and decreases the total size of the LCP. A lower value decreases the number of writes during an LCP, but results in more space being used for the LCP, which means that recovery takes longer. This parameter has an effect only when EnablePartialLcp is true, that is, only when partial local checkpoints are enabled.
- EnableRedoControl

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & boolean \\
\hline Default & true \\
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

Enable adaptive checkpointing speed for controlling redo log usage.
When enabled (the default), EnableRedoControl allows the data nodes greater flexibility with regard to the rate at which they write LCPs to disk. More specifically, enabling this parameter means that higher write rates can be employed, so that LCPs can complete and redo logs be trimmed more quickly, thereby reducing recovery time and disk space requirements. This functionality allows data nodes to make better use of the higher rate of I/O and greater bandwidth available from modern solid-state storage devices and protocols, such as solid-state drives (SSDs) using Non-Volatile Memory Express (NVMe).

When NDB is deployed on systems whose I/O or bandwidth is constrained relative to those employing solid-state technology, such as those using conventional hard disks (HDDs), the EnableRedoControl mechanism can easily cause the I/O subsystem to become saturated, increasing wait times for data node input and output. In particular, this can cause issues with NDB Disk Data tables which have tablespaces or log file groups sharing a constrained I/O subsystem with data node LCP and redo log files; such problems potentially include node or cluster failure due to GCP stop errors. Set EnableRedoControl to false to disable it in such situations. Setting EnablePartialLcp to false also disables the adaptive calculation.

Metadata objects. The next set of [ndbd] parameters defines pool sizes for metadata objects, used to define the maximum number of attributes, tables, indexes, and trigger objects used by indexes, events, and replication between clusters.

\section*{Note}

These act merely as "suggestions" to the cluster, and any that are not specified revert to the default values shown.
- MaxNoOfAttributes

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 1000 \\
\hline Range & \begin{tabular}{l}
$32-$ \\
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

This parameter sets a suggested maximum number of attributes that can be defined in the cluster; like MaxNoOfTables, it is not intended to function as a hard upper limit.
(In older NDB Cluster releases, this parameter was sometimes treated as a hard limit for certain operations. This caused problems with NDB Cluster Replication, when it was possible to create more tables than could be replicated, and sometimes led to confusion when it was possible [or not possible, depending on the circumstances] to create more than MaxNoOfAttributes attributes.)

The default value is 1000 , with the minimum possible value being 32 . The maximum is 4294967039 . Each attribute consumes around 200 bytes of storage per node due to the fact that all metadata is fully replicated on the servers.

When setting MaxNoOfAttributes, it is important to prepare in advance for any ALTER TABLE statements that you might want to perform in the future. This is due to the fact, during the execution of ALTER TABLE on a Cluster table, 3 times the number of attributes as in the original table are used, and a good practice is to permit double this amount. For example, if the NDB Cluster table having the greatest number of attributes (greatest_number_of_attributes) has 100 attributes, a good starting point for the value of MaxNoOfAttributes would be 6 * greatest_number_of_attributes = 600.

You should also estimate the average number of attributes per table and multiply this by MaxNoOfTables. If this value is larger than the value obtained in the previous paragraph, you should use the larger value instead.

Assuming that you can create all desired tables without any problems, you should also verify that this number is sufficient by trying an actual ALTER TABLE after configuring the parameter. If this is not successful, increase MaxNoOfAttributes by another multiple of MaxNoOfTables and test it again.
- MaxNoOfTables

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 128 \\
\hline Range & $8-20320$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

A table object is allocated for each table and for each unique hash index in the cluster. This parameter sets a suggested maximum number of table objects for the cluster as a whole; like MaxNoOfAttributes, it is not intended to function as a hard upper limit.
(In older NDB Cluster releases, this parameter was sometimes treated as a hard limit for certain operations. This caused problems with NDB Cluster Replication, when it was possible to create
more tables than could be replicated, and sometimes led to confusion when it was possible [or not possible, depending on the circumstances] to create more than MaxNoOfTables tables.)

For each attribute that has a BLOB data type an extra table is used to store most of the BLOB data. These tables also must be taken into account when defining the total number of tables.

The default value of this parameter is 128 . The minimum is 8 and the maximum is 20320 . Each table object consumes approximately 20 KB per node.

\section*{Note}

The sum of MaxNoOfTables, MaxNoOfOrderedIndexes, and MaxNoOfUniqueHashIndexes must not exceed $2^{32}-2(4294967294)$.
- MaxNoOfOrderedIndexes

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 128 \\
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

For each ordered index in the cluster, an object is allocated describing what is being indexed and its storage segments. By default, each index so defined also defines an ordered index. Each unique index and primary key has both an ordered index and a hash index. MaxNoOfOrderedIndexes sets the total number of ordered indexes that can be in use in the system at any one time.

The default value of this parameter is 128 . Each index object consumes approximately 10 KB of data per node.

\section*{Note}

The sum of MaxNoOfTables, MaxNoOfOrderedIndexes, and MaxNoOfUniqueHashIndexes must not exceed $2^{32}-2(4294967294)$.
- MaxNoOfUniqueHashIndexes

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 64 \\
\hline Range & \begin{tabular}{l}
$0-4294967039$ \\
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

For each unique index that is not a primary key, a special table is allocated that maps the unique key to the primary key of the indexed table. By default, an ordered index is also defined for each unique index. To prevent this, you must specify the USING HASH option when defining the unique index.

The default value is 64 . Each index consumes approximately 15 KB per node.

\section*{Note}

The sum of MaxNoOfTables, MaxNoOfOrderedIndexes, and MaxNoOfUniqueHashIndexes must not exceed $2^{32}-2(4294967294)$.
- MaxNoOfTriggers

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 768 \\
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

Internal update, insert, and delete triggers are allocated for each unique hash index. (This means that three triggers are created for each unique hash index.) However, an ordered index requires only a single trigger object. Backups also use three trigger objects for each normal table in the cluster.

Replication between clusters also makes use of internal triggers.
This parameter sets the maximum number of trigger objects in the cluster.
The default value is 768 .
- MaxNoOfSubscriptions

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & 0 \\
\hline Range & \begin{tabular}{l}
$0-4294967039$ \\
(0xFFFFFEFF)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart
\end{tabular}
\end{tabular}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3984.jpg?height=108&width=565&top_left_y=242&top_left_x=315)

Each NDB table in an NDB Cluster requires a subscription in the NDB kernel. For some NDB API applications, it may be necessary or desirable to change this parameter. However, for normal usage with MySQL servers acting as SQL nodes, there is not any need to do so.

The default value for MaxNoOfSubscriptions is 0, which is treated as equal to MaxNoOfTables. Each subscription consumes 108 bytes.
- MaxNoOfSubscribers

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
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

This parameter is of interest only when using NDB Cluster Replication. The default value is 0 . It is treated as 2 * MaxNoOfTables +2 * [number of API nodes]. There is one subscription per NDB table for each of two MySQL servers (one acting as the replication source and the other as the replica). Each subscriber uses 16 bytes of memory.

When using circular replication, multi-source replication, and other replication setups involving more than 2 MySQL servers, you should increase this parameter to the number of mysqld processes included in replication (this is often, but not always, the same as the number of clusters). For example, if you have a circular replication setup using three NDB Clusters, with one mysqld attached to each cluster, and each of these mysqld processes acts as a source and as a replica, you should set MaxNoOfSubscribers equal to 3 * MaxNoOfTables.

For more information, see Section 25.7, "NDB Cluster Replication".
- MaxNoOfConcurrentSubOperations

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & 256 \\
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

This parameter sets a ceiling on the number of operations that can be performed by all API nodes in the cluster at one time. The default value (256) is sufficient for normal operations, and might need to be adjusted only in scenarios where there are a great many API nodes each performing a high volume of operations concurrently.

Boolean parameters. The behavior of data nodes is also affected by a set of [ndbd] parameters taking on boolean values. These parameters can each be specified as TRUE by setting them equal to 1 or Y , and as FALSE by setting them equal to 0 or N .
- CompressedLCP

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

Setting this parameter to 1 causes local checkpoint files to be compressed. The compression used is equivalent to gzip --fast, and can save 50\% or more of the space required on the data node to store uncompressed checkpoint files. Compressed LCPs can be enabled for individual data nodes, or for all data nodes (by setting this parameter in the [ndbd default] section of the config.ini file).
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3985.jpg?height=168&width=278&top_left_y=1217&top_left_x=392)

\section*{Important}

You cannot restore a compressed local checkpoint to a cluster running a MySQL version that does not support this feature.

The default value is 0 (disabled).
- CrashOnCorruptedTuple

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

When this parameter is enabled (the default), it forces a data node to shut down whenever it encounters a corrupted tuple.
- Diskless

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & true|false (1|0) \\
\hline Default & false \\
\hline Range & true, false \\
\hline Restart Type & \begin{tabular}{l} 
Initial System \\
Restart:
\end{tabular}
\end{tabular}

\begin{tabular}{|l|l|} 
& \begin{tabular}{l} 
Requires a \\
complete \\
shutdown of the \\
cluster, wiping \\
and restoring \\
the cluster file \\
system from a \\
backup, and \\
then restarting \\
the cluster. \\
(NDB 8.4.0) \\
\hline
\end{tabular} \\
\hline
\end{tabular}

It is possible to specify NDB Cluster tables as diskless, meaning that tables are not checkpointed to disk and that no logging occurs. Such tables exist only in main memory. A consequence of using diskless tables is that neither the tables nor the records in those tables survive a crash. However, when operating in diskless mode, it is possible to run ndbd on a diskless computer.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3986.jpg?height=104&width=103&top_left_y=977&top_left_x=338)

\section*{Important}

This feature causes the entire cluster to operate in diskless mode.

When this feature is enabled, NDB Cluster online backup is disabled. In addition, a partial start of the cluster is not possible.

Diskless is disabled by default.
- EncryptedFileSystem

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & 0 \\
\hline Range & $0-1$ \\
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

Encrypt LCP and tablespace files, including undo logs and redo logs. Disabled by default (0); set to 1 to enable.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3986.jpg?height=104&width=103&top_left_y=2343&top_left_x=338)

\section*{Important}

When file system encryption is enabled, you must supply a password to each data node when starting it, using one of the options --filesystempassword or --filesystem-password-from-stdin. Otherwise, the data node cannot start.

For more information, see Section 25.6.19.4, "File System Encryption for NDB Cluster".
- LateAlloc

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & 1 \\
\hline Range & $0-1$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Allocate memory for this data node after a connection to the management server has been established. Enabled by default.
- LockPagesInMainMemory

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & 0 \\
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

For a number of operating systems, including Solaris and Linux, it is possible to lock a process into memory and so avoid any swapping to disk. This can be used to help guarantee the cluster's realtime characteristics.

This parameter takes one of the integer values 0,1 , or 2 , which act as shown in the following list:
- 0: Disables locking. This is the default value.
- 1: Performs the lock after allocating memory for the process.
- 2: Performs the lock before memory for the process is allocated.

If the operating system is not configured to permit unprivileged users to lock pages, then the data node process making use of this parameter may have to be run as system root. (LockPagesInMainMemory uses the mlockall function. From Linux kernel 2.6.9, unprivileged users can lock memory as limited by max locked memory. For more information, see ulimit -l and http://linux.die.net/man/2/mlock).

\section*{Note}

In older NDB Cluster releases, this parameter was a Boolean. 0 or false was the default setting, and disabled locking. 1 or true enabled locking of
the process after its memory was allocated. NDB Cluster 8.4 treats true or false for the value of this parameter as an error.

\section*{Important}

Beginning with glibc 2.10, glibc uses per-thread arenas to reduce lock contention on a shared pool, which consumes real memory. In general, a data node process does not need per-thread arenas, since it does not perform any memory allocation after startup. (This difference in allocators does not appear to affect performance significantly.)

The glibc behavior is intended to be configurable via the MALLOC_ARENA_MAX environment variable, but a bug in this mechanism prior to glibc 2.16 meant that this variable could not be set to less than 8 , so that the wasted memory could not be reclaimed. (Bug \#15907219; see also http://sourceware.org/bugzilla/show_bug.cgi?id=13137 for more information concerning this issue.)

One possible workaround for this problem is to use the LD_PRELOAD environment variable to preload a jemalloc memory allocation library to take the place of that supplied with glibc.
- ODirect

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

Enabling this parameter causes NDB to attempt using 0_DIRECT writes for LCP, backups, and redo logs, often lowering kswapd and CPU usage. When using NDB Cluster on Linux, enable ODirect if you are using a 2.6 or later kernel.

ODirect is disabled by default.
- ODirectSyncFlag

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

When this parameter is enabled, redo log writes are performed such that each completed file system write is handled as a call to fsync. The setting for this parameter is ignored if at least one of the following conditions is true:
- ODirect is not enabled.
- InitFragmentLogFiles is set to SPARSE.

Disabled by default.
- RequireCertificate

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

If this parameter is set to true, the data node looks for a key and a valid and current certificate in the TLS search path, and cannot start if it does not find them.
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

If this parameter is set to true, connections to this data node must be authenticated using TLS.
- RestartOnErrorInsert

\begin{tabular}{|l|l|l|}
\cline { 2 - 3 } & \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\cline { 2 - 3 } & Type or units & error code \\
\hline & Default & 2 \\
\hline & Range & $0-4$ \\
\hline & Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a
\end{tabular} \\
\hline & & rolling restart \\
\hline
\end{tabular}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3990.jpg?height=111&width=567&top_left_y=239&top_left_x=315)

This feature is accessible only when building the debug version where it is possible to insert errors in the execution of individual blocks of code as part of testing.

This feature is disabled by default.
- StopOnError

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & boolean \\
\hline Default & 1 \\
\hline Range & 0,1 \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter specifies whether a data node process should exit or perform an automatic restart when an error condition is encountered.

This parameter's default value is 1 ; this means that, by default, an error causes the data node process to halt.

When an error is encountered and StopOnError is 0 , the data node process is restarted.
Users of MySQL Cluster Manager should note that, when StopOnError equals 1, this prevents the MySQL Cluster Manager agent from restarting any data nodes after it has performed its own restart and recovery. See Starting and Stopping the Agent on Linux, for more information.
- UseShm

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

Enable a shared memory connection between this data node and the API node also running on this host. Set to 1 to enable.

\section*{Controlling Timeouts, Intervals, and Disk Paging}

There are a number of [ndbd] parameters specifying timeouts and intervals between various actions in Cluster data nodes. Most of the timeout values are specified in milliseconds. Any exceptions to this are mentioned where applicable.

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & milliseconds \\
\hline Default & 6000 \\
\hline Range & \begin{tabular}{l}
$70-$ \\
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

To prevent the main thread from getting stuck in an endless loop at some point, a "watchdog" thread checks the main thread. This parameter specifies the number of milliseconds between checks. If the process remains in the same state after three checks, the watchdog thread terminates it.

This parameter can easily be changed for purposes of experimentation or to adapt to local conditions. It can be specified on a per-node basis although there seems to be little reason for doing so.

The default timeout is 6000 milliseconds ( 6 seconds).
- TimeBetweenWatchDogCheckInitial

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & milliseconds \\
\hline Default & 6000 \\
\hline Range & \begin{tabular}{l}
70 - \\
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

This is similar to the TimeBetweenWatchDogCheck parameter, except that TimeBetweenWatchDogCheckInitial controls the amount of time that passes between execution checks inside a storage node in the early start phases during which memory is allocated.

The default timeout is 6000 milliseconds (6 seconds).
- StartPartialTimeout

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & milliseconds \\
\hline Default & 30000 \\
\hline Range & \begin{tabular}{l}
$0-4294967039$ \\
(0xFFFFFEFF)
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter specifies how long the Cluster waits for all data nodes to come up before the cluster initialization routine is invoked. This timeout is used to avoid a partial Cluster startup whenever possible.

This parameter is overridden when performing an initial start or initial restart of the cluster.
The default value is 30000 milliseconds ( 30 seconds). 0 disables the timeout, in which case the cluster may start only if all nodes are available.
- StartPartitionedTimeout

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

If the cluster is ready to start after waiting for StartPartialTimeout milliseconds but is still possibly in a partitioned state, the cluster waits until this timeout has also passed. If StartPartitionedTimeout is set to 0 , the cluster waits indefinitely ( $2^{32}-1 \mathrm{~ms}$, or approximately 49.71 days).

This parameter is overridden when performing an initial start or initial restart of the cluster.
- StartFailureTimeout

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

If a data node has not completed its startup sequence within the time specified by this parameter, the node startup fails. Setting this parameter to 0 (the default value) means that no data node timeout is applied.

For nonzero values, this parameter is measured in milliseconds. For data nodes containing extremely large amounts of data, this parameter should be increased. For example, in the case of a
data node containing several gigabytes of data, a period as long as 10-15 minutes (that is, 600000 to 1000000 milliseconds) might be required to perform a node restart.
- StartNoNodeGroupTimeout

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & milliseconds \\
\hline Default & 15000 \\
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

When a data node is configured with Nodegroup = 65536, is regarded as not being assigned to any node group. When that is done, the cluster waits StartNoNodegroupTimeout milliseconds, then treats such nodes as though they had been added to the list passed to the --nowait-nodes option, and starts. The default value is 15000 (that is, the management server waits 15 seconds). Setting this parameter equal to 0 means that the cluster waits indefinitely.

StartNoNodegroupTimeout must be the same for all data nodes in the cluster; for this reason, you should always set it in the [ndbd default] section of the config.ini file, rather than for individual data nodes.

See Section 25.6.7, "Adding NDB Cluster Data Nodes Online", for more information.
- HeartbeatIntervalDbDb

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & milliseconds \\
\hline Default & 5000 \\
\hline Range & \begin{tabular}{l}
$10-$ \\
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

One of the primary methods of discovering failed nodes is by the use of heartbeats. This parameter states how often heartbeat signals are sent and how often to expect to receive them. Heartbeats cannot be disabled.

After missing four heartbeat intervals in a row, the node is declared dead. Thus, the maximum time for discovering a failure through the heartbeat mechanism is five times the heartbeat interval.

The default heartbeat interval is 5000 milliseconds ( 5 seconds). This parameter must not be changed drastically and should not vary widely between nodes. If one node uses 5000 milliseconds and the
node watching it uses 1000 milliseconds, obviously the node is declared dead very quickly. This parameter can be changed during an online software upgrade, but only in small increments.

See also Network communication and latency, as well as the description of the ConnectCheckIntervalDelay configuration parameter.
- HeartbeatIntervalDbApi

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & milliseconds \\
\hline Default & 1500 \\
\hline Range & \begin{tabular}{l}
100 - \\
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

Each data node sends heartbeat signals to each MySQL server (SQL node) to ensure that it remains in contact. If a MySQL server fails to send a heartbeat in time it is declared "dead," in which case all ongoing transactions are completed and all resources released. The SQL node cannot reconnect until all activities initiated by the previous MySQL instance have been completed. The threeheartbeat criteria for this determination are the same as described for HeartbeatIntervalDbDb.

The default interval is 1500 milliseconds ( 1.5 seconds). This interval can vary between individual data nodes because each data node watches the MySQL servers connected to it, independently of all other data nodes.

For more information, see Network communication and latency.
- HeartbeatOrder

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & 0 \\
\hline Range & $0-65535$ \\
\hline Restart Type & \begin{tabular}{l} 
System \\
Restart: \\
Requires a \\
complete \\
shutdown and \\
restart of the \\
cluster. (NDB \\
8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Data nodes send heartbeats to one another in a circular fashion whereby each data node monitors the previous one. If a heartbeat is not detected by a given data node, this node declares the previous data node in the circle "dead" (that is, no longer accessible by the cluster). The determination that a
data node is dead is done globally; in other words; once a data node is declared dead, it is regarded as such by all nodes in the cluster.

It is possible for heartbeats between data nodes residing on different hosts to be too slow compared to heartbeats between other pairs of nodes (for example, due to a very low heartbeat interval or temporary connection problem), such that a data node is declared dead, even though the node can still function as part of the cluster. .

In this type of situation, it may be that the order in which heartbeats are transmitted between data nodes makes a difference as to whether or not a particular data node is declared dead. If this declaration occurs unnecessarily, this can in turn lead to the unnecessary loss of a node group and as thus to a failure of the cluster.

Consider a setup where there are 4 data nodes A, B, C, and D running on 2 host computers host1 and host2, and that these data nodes make up 2 node groups, as shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.9 Four data nodes A, B, C, D running on two host computers host1, host2; each data node belongs to one of two node groups.}
\begin{tabular}{|l|l|l|}
\hline Node Group & Nodes Running on host1 & Nodes Running on host2 \\
\hline Node Group 0: & Node A & Node B \\
\hline Node Group 1: & Node C & Node D \\
\hline
\end{tabular}
\end{table}

Suppose the heartbeats are transmitted in the order A ->B->C->D->A. In this case, the loss of the heartbeat between the hosts causes node B to declare node A dead and node C to declare node B dead. This results in loss of Node Group 0, and so the cluster fails. On the other hand, if the order of transmission is A->B->D->C->A (and all other conditions remain as previously stated), the loss of the heartbeat causes nodes A and D to be declared dead; in this case, each node group has one surviving node, and the cluster survives.

The HeartbeatOrder configuration parameter makes the order of heartbeat transmission userconfigurable. The default value for HeartbeatOrder is zero; allowing the default value to be used on all data nodes causes the order of heartbeat transmission to be determined by NDB. If this parameter is used, it must be set to a nonzero value (maximum 65535) for every data node in the cluster, and this value must be unique for each data node; this causes the heartbeat transmission to proceed from data node to data node in the order of their HeartbeatOrder values from lowest to highest (and then directly from the data node having the highest HeartbeatOrder to the data node having the lowest value, to complete the circle). The values need not be consecutive. For example, to force the heartbeat transmission order A->B->D->C->A in the scenario outlined previously, you could set the HeartbeatOrder values as shown here:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.10 HeartbeatOrder values to force a heartbeat transition order of A->B->D->C->A.}
\begin{tabular}{|l|l|}
\hline Node & HeartbeatOrder Value \\
\hline A & 10 \\
\hline B & 20 \\
\hline C & 30 \\
\hline D & 25 \\
\hline
\end{tabular}
\end{table}

To use this parameter to change the heartbeat transmission order in a running NDB Cluster, you must first set HeartbeatOrder for each data node in the cluster in the global configuration (config.ini) file (or files). To cause the change to take effect, you must perform either of the following:
- A complete shutdown and restart of the entire cluster.
- 2 rolling restarts of the cluster in succession. All nodes must be restarted in the same order in both rolling restarts.

You can use DUMP 908 to observe the effect of this parameter in the data node logs.
- ConnectCheckIntervalDelay

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

This parameter enables connection checking between data nodes after one of them has failed heartbeat checks for 5 intervals of up to HeartbeatIntervalDbDb milliseconds.

Such a data node that further fails to respond within an interval of ConnectCheckIntervalDelay milliseconds is considered suspect, and is considered dead after two such intervals. This can be useful in setups with known latency issues.

The default value for this parameter is 0 (disabled).
- TimeBetweenLocalCheckpoints

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & \begin{tabular}{l} 
number of 4- \\
byte words, \\
as base-2 \\
logarithm
\end{tabular} \\
\hline Default & 20 \\
\hline Range & $0-31$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter is an exception in that it does not specify a time to wait before starting a new local checkpoint; rather, it is used to ensure that local checkpoints are not performed in a cluster where relatively few updates are taking place. In most clusters with high update rates, it is likely that a new local checkpoint is started immediately after the previous one has been completed.

The size of all write operations executed since the start of the previous local checkpoints is added. This parameter is also exceptional in that it is specified as the base- 2 logarithm of the number of 4-
byte words, so that the default value 20 means $4 \mathrm{MB}\left(4 \times 2^{20}\right)$ of write operations, 21 would mean 8 MB , and so on up to a maximum value of 31 , which equates to 8 GB of write operations.

All the write operations in the cluster are added together. Setting
TimeBetweenLocalCheckpoints to 6 or less means that local checkpoints are executed continuously without pause, independent of the cluster's workload.
- TimeBetweenGlobalCheckpoints

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & milliseconds \\
\hline Default & 2000 \\
\hline Range & $20-32000$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

When a transaction is committed, it is committed in main memory in all nodes on which the data is mirrored. However, transaction log records are not flushed to disk as part of the commit. The reasoning behind this behavior is that having the transaction safely committed on at least two autonomous host machines should meet reasonable standards for durability.

It is also important to ensure that even the worst of cases-a complete crash of the cluster-is handled properly. To guarantee that this happens, all transactions taking place within a given interval are put into a global checkpoint, which can be thought of as a set of committed transactions that has been flushed to disk. In other words, as part of the commit process, a transaction is placed in a global checkpoint group. Later, this group's log records are flushed to disk, and then the entire group of transactions is safely committed to disk on all computers in the cluster.

We recommended when you are using solid-state disks (especially those employing NVMe) with Disk Data tables that you reduce this value. In such cases, you should also ensure that MaxDiskDataLatency is set to a proper level.

This parameter defines the interval between global checkpoints. The default is 2000 milliseconds.
- TimeBetweenGlobalCheckpointsTimeout

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & milliseconds \\
\hline Default & 120000 \\
\hline Range & \begin{tabular}{l}
$10-$ \\
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

This parameter defines the minimum timeout between global checkpoints. The default is 120000 milliseconds.
- TimeBetweenEpochs

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & milliseconds \\
\hline Default & 100 \\
\hline Range & $0-32000$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter defines the interval between synchronization epochs for NDB Cluster Replication. The default value is 100 milliseconds.

TimeBetweenEpochs is part of the implementation of "micro-GCPs", which can be used to improve the performance of NDB Cluster Replication.
- TimeBetweenEpochsTimeout

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & milliseconds \\
\hline Default & 0 \\
\hline Range & $0-256000$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter defines a timeout for synchronization epochs for NDB Cluster Replication. If a node fails to participate in a global checkpoint within the time determined by this parameter, the node is shut down. The default value is 0 ; in other words, the timeout is disabled.

TimeBetweenEpochsTimeout is part of the implementation of "micro-GCPs", which can be used to improve the performance of NDB Cluster Replication.

The current value of this parameter and a warning are written to the cluster log whenever a GCP save takes longer than 1 minute or a GCP commit takes longer than 10 seconds.

Setting this parameter to zero has the effect of disabling GCP stops caused by save timeouts, commit timeouts, or both. The maximum possible value for this parameter is 256000 milliseconds.
- MaxBufferedEpochs

\begin{tabular}{|l|l|l|}
\hline \multirow{5}{*}{} & Version (or later) & NDB 8.4.0 \\
\hline & Type or units & epochs \\
\hline & Default & 100 \\
\hline & Range & 0-100000 \\
\hline & Restart Type & Node Restart: \\
\hline 3968 & & Requires a \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
& \begin{tabular}{l} 
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

The number of unprocessed epochs by which a subscribing node can lag behind. Exceeding this number causes a lagging subscriber to be disconnected.

The default value of 100 is sufficient for most normal operations. If a subscribing node does lag enough to cause disconnections, it is usually due to network or scheduling issues with regard to processes or threads. (In rare circumstances, the problem may be due to a bug in the NDB client.) It may be desirable to set the value lower than the default when epochs are longer.

Disconnection prevents client issues from affecting the data node service, running out of memory to buffer data, and eventually shutting down. Instead, only the client is affected as a result of the disconnect (by, for example gap events in the binary log), forcing the client to reconnect or restart the process.
- MaxBufferedEpochBytes

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 26214400 \\
\hline Range & \begin{tabular}{l}
26214400 \\
(0x01900000) \\
-4294967039 \\
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

The total number of bytes allocated for buffering epochs by this node.
- TimeBetweenInactiveTransactionAbortCheck

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & milliseconds \\
\hline Default & 1000 \\
\hline Range & $1000-$ \\
4294967039 \\
(0xFFFFFEFF)
\end{tabular}$|$\begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular}$. ~ 0$,

Timeout handling is performed by checking a timer on each transaction once for every interval specified by this parameter. Thus, if this parameter is set to 1000 milliseconds, every transaction is checked for timing out once per second.

The default value is 1000 milliseconds ( 1 second).
- TransactionInactiveTimeout

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & milliseconds \\
\hline Default & \begin{tabular}{l}
4294967039 \\
(0xFFFFFEFF)
\end{tabular} \\
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

This parameter states the maximum time that is permitted to lapse between operations in the same transaction before the transaction is aborted.

The default for this parameter is 4G (also the maximum). For a real-time database that needs to ensure that no transaction keeps locks for too long, this parameter should be set to a relatively small value. Setting it to 0 means that the application never times out. The unit is milliseconds.
- TransactionDeadlockDetectionTimeout

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & milliseconds \\
\hline Default & 1200 \\
\hline Range & \begin{tabular}{l}
$50-$ \\
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

When a node executes a query involving a transaction, the node waits for the other nodes in the cluster to respond before continuing. This parameter sets the amount of time that the transaction can spend executing within a data node, that is, the time that the transaction coordinator waits for each data node participating in the transaction to execute a request.

A failure to respond can occur for any of the following reasons:
- The node is "dead"
- The operation has entered a lock queue
- The node requested to perform the action could be heavily overloaded.

This timeout parameter states how long the transaction coordinator waits for query execution by another node before aborting the transaction, and is important for both node failure handling and deadlock detection.

The default timeout value is 1200 milliseconds ( 1.2 seconds).
The minimum for this parameter is 50 milliseconds.
- DiskSyncSize

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 4 M \\
\hline Range & \begin{tabular}{l}
32 K - \\
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

This is the maximum number of bytes to store before flushing data to a local checkpoint file. This is done to prevent write buffering, which can impede performance significantly. This parameter is not intended to take the place of TimeBetweenLocalCheckpoints.

\section*{Note}

When ODirect is enabled, it is not necessary to set DiskSyncSize; in fact, in such cases its value is simply ignored.

The default value is 4 M (4 megabytes).
- MaxDiskWriteSpeed

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & 20 M \\
\hline Range & $1 \mathrm{M}-1024 \mathrm{G}$ \\
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
& cluster. (NDB \\
& 8.4 .0 ) \\
\hline
\end{tabular}

Set the maximum rate for writing to disk, in bytes per second, by local checkpoints and backup operations when no restarts (by this data node or any other data node) are taking place in this NDB Cluster.

For setting the maximum rate of disk writes allowed while this data node is restarting, use MaxDiskWriteSpeedOwnRestart. For setting the maximum rate of disk writes allowed while other data nodes are restarting, use MaxDiskWriteSpeedOtherNodeRestart. The minimum speed for disk writes by all LCPs and backup operations can be adjusted by setting MinDiskWriteSpeed.
- MaxDiskWriteSpeedOtherNodeRestart

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & 50 M \\
\hline Range & $1 \mathrm{M}-1024 \mathrm{G}$ \\
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

Set the maximum rate for writing to disk, in bytes per second, by local checkpoints and backup operations when one or more data nodes in this NDB Cluster are restarting, other than this node.

For setting the maximum rate of disk writes allowed while this data node is restarting, use MaxDiskWriteSpeedOwnRestart. For setting the maximum rate of disk writes allowed when no data nodes are restarting anywhere in the cluster, use MaxDiskWriteSpeed. The minimum speed for disk writes by all LCPs and backup operations can be adjusted by setting MinDiskWriteSpeed.
- MaxDiskWriteSpeedOwnRestart

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & 200 M \\
\hline Range & $1 \mathrm{M}-1024 \mathrm{G}$ \\
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
& cluster. (NDB \\
& 8.4 .0 ) \\
\hline
\end{tabular}

Set the maximum rate for writing to disk, in bytes per second, by local checkpoints and backup operations while this data node is restarting.

For setting the maximum rate of disk writes allowed while other data nodes are restarting, use MaxDiskWriteSpeedOtherNodeRestart. For setting the maximum rate of disk writes allowed when no data nodes are restarting anywhere in the cluster, use MaxDiskWriteSpeed. The minimum speed for disk writes by all LCPs and backup operations can be adjusted by setting MinDiskWriteSpeed.
- MinDiskWriteSpeed

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & 10 M \\
\hline Range & $1 \mathrm{M}-1024 \mathrm{G}$ \\
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

Set the minimum rate for writing to disk, in bytes per second, by local checkpoints and backup operations.

The maximum rates of disk writes allowed for LCPs and backups under various conditions are adjustable using the parameters MaxDiskWriteSpeed, MaxDiskWriteSpeedOwnRestart, and MaxDiskWriteSpeedOtherNodeRestart. See the descriptions of these parameters for more information.
- ApiFailureHandlingTimeout

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.5 \\
\hline Type or units & seconds \\
\hline Default & 600 \\
\hline Range & \begin{tabular}{l}
$0-4294967039$ \\
(0xFFFFFEFF)
\end{tabular} \\
\hline Added & NDB 8.4.5 \\
\hline Restart Type & \\
\hline
\end{tabular}

Specifies the maximum time (in seconds) that the data node waits for API node failure handling to complete before escalating it to data node failure handling.

Added in NDB 8.4.5.
- ArbitrationTimeout

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & milliseconds \\
\hline Default & 7500 \\
\hline Range & \begin{tabular}{l}
$10-$ \\
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

This parameter specifies how long data nodes wait for a response from the arbitrator to an arbitration message. If this is exceeded, the network is assumed to have split.

The default value is 7500 milliseconds ( 7.5 seconds).
- Arbitration

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & enumeration \\
\hline Default & Default \\
\hline Range & \begin{tabular}{l} 
Default, \\
Disabled, \\
WaitExternal
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

The Arbitration parameter enables a choice of arbitration schemes, corresponding to one of 3 possible values for this parameter:
- Default. This enables arbitration to proceed normally, as determined by the ArbitrationRank settings for the management and API nodes. This is the default value.
- Disabled. Setting Arbitration = Disabled in the [ndbd default] section of the config.ini file to accomplishes the same task as setting ArbitrationRank to 0 on all management and API nodes. When Arbitration is set in this way, any ArbitrationRank settings are ignored.
- WaitExternal. The Arbitration parameter also makes it possible to configure arbitration in such a way that the cluster waits until after the time determined by ArbitrationTimeout has passed for an external cluster manager application to perform arbitration instead of handling arbitration internally. This can be done by setting Arbitration = WaitExternal in the [ndbd default] section of the config.ini file. For best results with the WaitExternal setting, it
is recommended that ArbitrationTimeout be 2 times as long as the interval required by the external cluster manager to perform arbitration.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4005.jpg?height=126&width=111&top_left_y=370&top_left_x=397)

\section*{Important}

This parameter should be used only in the [ndbd default] section of the cluster configuration file. The behavior of the cluster is unspecified when Arbitration is set to different values for individual data nodes.
- RestartSubscriberConnectTimeout

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & ms \\
\hline Default & 12000 \\
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

This parameter determines the time that a data node waits for subscribing API nodes to connect. Once this timeout expires, any "missing" API nodes are disconnected from the cluster. To disable this timeout, set RestartSubscriberConnectTimeout to 0 .

While this parameter is specified in milliseconds, the timeout itself is resolved to the next-greatest whole second.
- KeepAliveSendInterval

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 60000 \\
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

You can enable and control the interval between keep-alive signals sent between data nodes by setting this parameter. The default for KeepAliveSendInterval is 60000 milliseconds (one minute); setting it to 0 disables keep-alive signals. Values between 1 and 10 inclusive are treated as 10.

This parameter may prove useful in environments which monitor and disconnect idle TCP connections, possibly causing unnecessary data node failures when the cluster is idle.

The heartbeat interval between management nodes and data nodes is always 100 milliseconds, and is not configurable.

Buffering and logging. Several [ndbd] configuration parameters enable the advanced user to have more control over the resources used by node processes and to adjust various buffer sizes at need.

These buffers are used as front ends to the file system when writing log records to disk. If the node is running in diskless mode, these parameters can be set to their minimum values without penalty due to the fact that disk writes are "faked" by the NDB storage engine's file system abstraction layer.
- UndoIndexBuffer

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & 2 M \\
\hline Range & 1 M - \\
4294967039 & \\
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

This parameter formerly set the size of the undo index buffer, but has no effect in current versions of NDB Cluster.

Use of this parameter in the cluster configuration file raises a deprecation warning; you should expect it to be removed in a future NDB Cluster release.
- UndoDataBuffer

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & 16M \\
\hline Range & 1M 4294967039 (0xFFFFFEFF) \\
\hline Deprecated & Yes (in NDB 8.0) \\
\hline Restart Type & Node Restart: Requires a rolling restart of the cluster. (NDB 8.4.0) \\
\hline
\end{tabular}

This parameter formerly set the size of the undo data buffer, but has no effect in current versions of NDB Cluster.

Use of this parameter in the cluster configuration file raises a deprecation warning; you should expect it to be removed in a future NDB Cluster release.
- RedoBuffer

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 32 M \\
\hline Range & \begin{tabular}{l}
1 M - \\
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

All update activities also need to be logged. The REDO log makes it possible to replay these updates whenever the system is restarted. The NDB recovery algorithm uses a "fuzzy" checkpoint of the data together with the UNDO log, and then applies the REDO log to play back all changes up to the restoration point.

RedoBuffer sets the size of the buffer in which the REDO log is written. The default value is 32 MB ; the minimum value is 1 MB .

If this buffer is too small, the NDB storage engine issues error code 1221 (REDO log buffers overloaded). For this reason, you should exercise care if you attempt to decrease the value of RedoBuffer as part of an online change in the cluster's configuration.
ndbmtd allocates a separate buffer for each LDM thread (see ThreadConfig). For example, with 4 LDM threads, an ndbmtd data node actually has 4 buffers and allocates RedoBuffer bytes to each one, for a total of 4 * RedoBuffer bytes.
- EventLogBufferSize

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 8192 \\
\hline Range & $0-64 \mathrm{~K}$ \\
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

Controls the size of the circular buffer used for NDB log events within data nodes.
Controlling log messages. In managing the cluster, it is very important to be able to control the number of log messages sent for various event types to stdout. For each event category, there are 16 possible event levels (numbered 0 through 15). Setting event reporting for a given event category to level 15 means all event reports in that category are sent to stdout; setting it to 0 means that no event reports in that category are made.

By default, only the startup message is sent to stdout, with the remaining event reporting level defaults being set to 0 . The reason for this is that these messages are also sent to the management server's cluster log.

An analogous set of levels can be set for the management client to determine which event levels to record in the cluster log.
- LogLevelStartup

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 1 \\
\hline Range & $0-15$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

The reporting level for events generated during startup of the process.
The default level is 1 .
- LogLevelShutdown

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 0 \\
\hline Range & $0-15$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

The reporting level for events generated as part of graceful shutdown of a node.
The default level is 0 .
- LogLevelStatistic

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 0 \\
\hline Range & $0-15$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

The reporting level for statistical events such as number of primary key reads, number of updates, number of inserts, information relating to buffer usage, and so on.

The default level is 0 .
- LogLevelCheckpoint

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & log level \\
\hline Default & 0 \\
\hline Range & $0-15$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

The reporting level for events generated by local and global checkpoints.
The default level is 0 .
- LogLevelNodeRestart

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 0 \\
\hline Range & $0-15$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

The reporting level for events generated during node restart.
The default level is 0 .
- LogLevelConnection

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 0 \\
\hline Range & $0-15$ \\
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

The reporting level for events generated by connections between cluster nodes.
The default level is 0 .
- LogLevelError

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 0 \\
\hline Range & $0-15$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

The reporting level for events generated by errors and warnings by the cluster as a whole. These errors do not cause any node failure but are still considered worth reporting.

The default level is 0 .
- LogLevelCongestion

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & level \\
\hline Default & 0 \\
\hline Range & $0-15$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

The reporting level for events generated by congestion. These errors do not cause node failure but are still considered worth reporting.

The default level is 0 .
- LogLevelInfo

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 0 \\
\hline Range & $0-15$ \\
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

The reporting level for events generated for information about the general state of the cluster.
The default level is 0 .
- MemReportFrequency

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
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

This parameter controls how often data node memory usage reports are recorded in the cluster log; it is an integer value representing the number of seconds between reports.

Each data node's data memory and index memory usage is logged as both a percentage and a number of 32 KB pages of DataMemory, as set in the config. ini file. For example, if DataMemory is equal to 100 MB , and a given data node is using 50 MB for data memory storage, the corresponding line in the cluster log might look like this:

2006-12-24 01:18:16 [MgmSrvr] INFO -- Node 2: Data usage is $50 \%$ ( 1280 32K pages of total 2560)
MemReportFrequency is not a required parameter. If used, it can be set for all cluster data nodes in the [ndbd default] section of config.ini, and can also be set or overridden for individual data nodes in the corresponding [ndbd] sections of the configuration file. The minimum valuewhich is also the default value-is 0 , in which case memory reports are logged only when memory usage reaches certain percentages ( $80 \%, 90 \%$, and $100 \%$ ), as mentioned in the discussion of statistics events in Section 25.6.3.2, "NDB Cluster Log Events".
- StartupStatusReportFrequency

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & seconds \\
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

When a data node is started with the --initial, it initializes the redo log file during Start Phase 4 (see Section 25.6.4, "Summary of NDB Cluster Start Phases"). When very large values are set for NoOfFragmentLogFiles, FragmentLogFileSize, or both, this initialization can take a long time. You can force reports on the progress of this process to be logged periodically, by means of
the StartupStatusReportFrequency configuration parameter. In this case, progress is reported in the cluster log, in terms of both the number of files and the amount of space that have been initialized, as shown here:
```
2009-06-20 16:39:23 [MgmSrvr] INFO -- Node 1: Local redo log file initialization status:
#Total files: 80, Completed: 60
#Total MBytes: 20480, Completed: 15557
2009-06-20 16:39:23 [MgmSrvr] INFO -- Node 2: Local redo log file initialization status:
#Total files: 80, Completed: 60
#Total MBytes: 20480, Completed: 15570
```


These reports are logged each StartupStatusReportFrequency seconds during Start Phase 4. If StartupStatusReportFrequency is 0 (the default), then reports are written to the cluster log only when at the beginning and at the completion of the redo log file initialization process.

\section*{Data Node Debugging Parameters}

The following parameters are intended for use during testing or debugging of data nodes, and not for use in production.
- DictTrace

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & undefined \\
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

It is possible to cause logging of traces for events generated by creating and dropping tables using DictTrace. This parameter is useful only in debugging NDB kernel code. DictTrace takes an integer value. 0 is the default, and means no logging is performed; 1 enables trace logging, and 2 enables logging of additional DBDICT debugging output.
- WatchDogImmediateKill

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

You can cause threads to be killed immediately whenever watchdog issues occur by enabling the WatchDogImmediateKill data node configuration parameter. This parameter should be used only when debugging or troubleshooting, to obtain trace files reporting exactly what was occurring the instant that execution ceased.

Backup parameters. The [ndbd] parameters discussed in this section define memory buffers set aside for execution of online backups.
- BackupDataBufferSize

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 16 M \\
\hline Range & \begin{tabular}{l}
512 K - \\
4294967039 \\
(0xFFFFFEFF)
\end{tabular} \\
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

In creating a backup, there are two buffers used for sending data to the disk. The backup data buffer is used to fill in data recorded by scanning a node's tables. Once this buffer has been filled to the level specified as BackupWriteSize, the pages are sent to disk. While flushing data to disk, the backup process can continue filling this buffer until it runs out of space. When this happens, the backup process pauses the scan and waits until some disk writes have completed freeing up memory so that scanning may continue.

The default value for this parameter is 16 MB . The minimum is 512 K .
- BackupDiskWriteSpeedPct

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & percent \\
\hline Default & 50 \\
\hline Range & $0-90$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

BackupDiskWriteSpeedPct applies only when a backup is single-threaded; since NDB 8.4 supports multi-threaded backups, it is usually not necessary to adjust this parameter, which has no effect in the multi-threaded case. The discussion that follows is specific to single-threaded backups.

During normal operation, data nodes attempt to maximize the disk write speed used for local checkpoints and backups while remaining within the bounds set by MinDiskWriteSpeed and MaxDiskWriteSpeed. Disk write throttling gives each LDM thread an equal share of the total budget. This allows parallel LCPs to take place without exceeding the disk I/O budget. Because a backup is executed by only one LDM thread, this effectively caused a budget cut, resulting in longer backup completion times, and-if the rate of change is sufficiently high-in failure to complete the backup when the backup log buffer fill rate is higher than the achievable write rate.

This problem can be addressed by using the BackupDiskWriteSpeedPct configuration parameter, which takes a value in the range $0-90$ (inclusive) which is interpreted as the percentage of the node's maximum write rate budget that is reserved prior to sharing out the remainder of the
budget among LDM threads for LCPs. The LDM thread running the backup receives the whole write rate budget for the backup, plus its (reduced) share of the write rate budget for local checkpoints.

The default value for this parameter is 50 (interpreted as 50\%).
- BackupLogBufferSize

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 16 M \\
\hline Range & \begin{tabular}{l}
2 M - \\
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

The backup log buffer fulfills a role similar to that played by the backup data buffer, except that it is used for generating a log of all table writes made during execution of the backup. The same principles apply for writing these pages as with the backup data buffer, except that when there is no more space in the backup log buffer, the backup fails. For that reason, the size of the backup log buffer must be large enough to handle the load caused by write activities while the backup is being made. See Section 25.6.8.3, "Configuration for NDB Cluster Backups".

The default value for this parameter should be sufficient for most applications. In fact, it is more likely for a backup failure to be caused by insufficient disk write speed than it is for the backup log buffer to become full. If the disk subsystem is not configured for the write load caused by applications, the cluster is unlikely to be able to perform the desired operations.

It is preferable to configure cluster nodes in such a manner that the processor becomes the bottleneck rather than the disks or the network connections.

The default value for this parameter is 16 MB .
- BackupMemory

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 32 M \\
\hline Range & \begin{tabular}{l}
$0-4294967039$ \\
(0xFFFFFEFF)
\end{tabular} \\
\hline Deprecated & \begin{tabular}{l} 
Yes (in NDB \\
7.4 )
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

This parameter is deprecated, and subject to removal in a future version of NDB Cluster. Any setting made for it is ignored.
- BackupReportFrequency

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & seconds \\
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

This parameter controls how often backup status reports are issued in the management client during a backup, as well as how often such reports are written to the cluster log (provided cluster event logging is configured to permit it-see Logging and checkpointing). BackupReportFrequency represents the time in seconds between backup status reports.

The default value is 0 .
- BackupWriteSize

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 256 K \\
\hline Range & \begin{tabular}{l}
32 K - \\
4294967039 \\
(0xFFFFFEFF)
\end{tabular} \\
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

This parameter specifies the default size of messages written to disk by the backup log and backup data buffers.

The default value for this parameter is 256 KB .
- BackupMaxWriteSize

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 1 M \\
\hline Range & $256 \mathrm{~K}-$ \\
& 4294967039 \\
& (0xFFFFFEFF) \\
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

This parameter specifies the maximum size of messages written to disk by the backup log and backup data buffers.

The default value for this parameter is 1 MB .
- CompressedBackup

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

Enabling this parameter causes backup files to be compressed. The compression used is equivalent to gzip --fast, and can save $50 \%$ or more of the space required on the data node to store uncompressed backup files. Compressed backups can be enabled for individual data nodes, or for all data nodes (by setting this parameter in the [ndbd default] section of the config.ini file).
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4016.jpg?height=120&width=109&top_left_y=1667&top_left_x=335)

\section*{Important}

You cannot restore a compressed backup to a cluster running a MySQL version that does not support this feature.

The default value is 0 (disabled).
- RequireEncryptedBackup

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 0 \\
\hline Range & $0-1$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

If set to 1 , backups must be encrypted. While it is possible to set this parameter for each data node individually, it is recommended that you set it in the [ndbd default] section of the config.ini global configuration file. For more information about performing encrypted backups,

\section*{Note}

The location of the backup files is determined by the BackupDataDir data node configuration parameter.

Additional requirements. When specifying these parameters, the following relationships must hold true. Otherwise, the data node cannot start.
- BackupDataBufferSize >= BackupWriteSize + 188 KB
- BackupLogBufferSize >= BackupWriteSize + 16KB
- BackupMaxWriteSize >= BackupWriteSize

\section*{NDB Cluster Realtime Performance Parameters}

The [ndbd] parameters discussed in this section are used in scheduling and locking of threads to specific CPUs on multiprocessor data node hosts.

\section*{Note}

To make use of these parameters, the data node process must be run as system root.
- BuildIndexThreads

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & 128 \\
\hline Range & $0-128$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter determines the number of threads to create when rebuilding ordered indexes during a system or node start, as well as when running ndb_restore --rebuild-indexes. It is supported only when there is more than one fragment for the table per data node (for example, when COMMENT="NDB_TABLE=PARTITION_BALANCE=FOR_RA_BY_LDM_X_2" is used with CREATE TABLE).

Setting this parameter to 0 (the default) disables multithreaded building of ordered indexes.
This parameter is supported when using ndbd or ndbmtd.
You can enable multithreaded builds during data node initial restarts by setting the TwoPassInitialNodeRestartCopy data node configuration parameter to TRUE.
- LockExecuteThreadToCPU

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & set of CPU IDs \\
\hline Default & 0 \\
\hline Range & $\ldots$ \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

When used with ndbd, this parameter (now a string) specifies the ID of the CPU assigned to handle the NDBCLUSTER execution thread. When used with ndbmtd, the value of this parameter is a comma-separated list of CPU IDs assigned to handle execution threads. Each CPU ID in the list should be an integer in the range 0 to 65535 (inclusive).

The number of IDs specified should match the number of execution threads determined by MaxNoOfExecutionThreads. However, there is no guarantee that threads are assigned to CPUs in any given order when using this parameter. You can obtain more finely-grained control of this type using ThreadConfig.

LockExecuteThreadToCPU has no default value.
- LockMaintThreadsToCPU

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & CPU ID \\
\hline Default & 0 \\
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

This parameter specifies the ID of the CPU assigned to handle NDBCLUSTER maintenance threads.
The value of this parameter is an integer in the range 0 to 65535 (inclusive). There is no default value.
- Numa

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & 1 \\
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

This parameter determines whether Non-Uniform Memory Access (NUMA) is controlled by the operating system or by the data node process, whether the data node uses ndbd or ndbmtd. By default, NDB attempts to use an interleaved NUMA memory allocation policy on any data node where the host operating system provides NUMA support.

Setting Numa $=0$ means that the datanode process does not itself attempt to set a policy for memory allocation, and permits this behavior to be determined by the operating system, which
may be further guided by the separate numactl tool. That is, Numa $=0$ yields the system default behavior, which can be customised by numactl. For many Linux systems, the system default behavior is to allocate socket-local memory to any given process at allocation time. This can be problematic when using ndbmtd; this is because nbdmtd allocates all memory at startup, leading to an imbalance, giving different access speeds for different sockets, especially when locking pages in main memory.

Setting Numa $=1$ means that the data node process uses libnuma to request interleaved memory allocation. (This can also be accomplished manually, on the operating system level, using numact 1.) Using interleaved allocation in effect tells the data node process to ignore non-uniform memory access but does not attempt to take any advantage of fast local memory; instead, the data node process tries to avoid imbalances due to slow remote memory. If interleaved allocation is not desired, set Numa to 0 so that the desired behavior can be determined on the operating system level.

The Numa configuration parameter is supported only on Linux systems where libnuma.so is available.
- RealtimeScheduler

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

Setting this parameter to 1 enables real-time scheduling of data node threads.
The default is 0 (scheduling disabled).
- SchedulerExecutionTimer

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & $\mu \mathrm{s}$ \\
\hline Default & 50 \\
\hline Range & $0-11000$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter specifies the time in microseconds for threads to be executed in the scheduler before being sent. Setting it to 0 minimizes the response time; to achieve higher throughput, you can increase the value at the expense of longer response times.

The default is $50 \mu \mathrm{sec}$, which our testing shows to increase throughput slightly in high-load cases without materially delaying requests.
- SchedulerResponsiveness

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 5 \\
\hline Range & $0-10$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Set the balance in the NDB scheduler between speed and throughput. This parameter takes an integer whose value is in the range $0-10$ inclusive, with 5 as the default. Higher values provide better response times relative to throughput. Lower values provide increased throughput at the expense of longer response times.
- SchedulerSpinTimer

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & $\mu \mathrm{s}$ \\
\hline Default & 0 \\
\hline Range & $0-500$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter specifies the time in microseconds for threads to be executed in the scheduler before sleeping.

Note
If SpinMethod is set, any setting for this parameter is ignored.
- SpinMethod

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & enumeration \\
\hline Default & StaticSpinning \\
\hline Range & \begin{tabular}{l} 
CostBasedSpinning, \\
LatencyOptimisedSpinning, \\
DatabaseMachineSpinning, \\
StaticSpinning
\end{tabular} \\
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

This parameter provides a simple interface to control adaptive spinning on data nodes, with four possible values furnishing presets for spin parameter values, as shown in the following list:
1. StaticSpinning (default): Sets EnableAdaptiveSpinning to false and SchedulerSpinTimer to 0 . (SetAllowedSpinOverhead is not relevant in this case.)
2. CostBasedSpinning: Sets EnableAdaptiveSpinning to true, SchedulerSpinTimer to 100, and SetAllowedSpinOverhead to 200.
3. LatencyOptimisedSpinning: Sets EnableAdaptiveSpinning to true, SchedulerSpinTimer to 200, and SetAllowedSpinOverhead to 1000.
4. DatabaseMachineSpinning: Sets EnableAdaptiveSpinning to true, SchedulerSpinTimer to 500, and SetAllowedSpinOverhead to 10000. This is intended for use in cases where threads own their own CPUs.

The spin parameters modified by SpinMethod are described in the following list:
- SchedulerSpinTimer: This is the same as the data node configuration parameter of that name. The setting applied to this parameter by SpinMethod overrides any value set in the config.ini file.
- EnableAdaptiveSpinning: Enables or disables adaptive spinning. Disabling it causes spinning to be performed without making any checks for CPU resources. This parameter cannot be set directly in the cluster configuration file, and under most circumstances should not need to be, but can be enabled directly using DUMP 104004 or disabled with DUMP 1040040 in the ndb_mgm management client.
- SetAllowedSpinOverhead: Sets the amount of CPU time to allow for gaining latency. This parameter cannot be set directly in the config.ini file. In most cases, the setting applied by SpinMethod should be satisfactory, but if it is necessary to change it directly, you can use DUMP 104002 overhead to do so, where overhead is a value ranging from 0 to 10000 , inclusive; see the description of the indicated DUMP command for details.

On platforms lacking usable spin instructions, such as PowerPC and some SPARC platforms, spin time is set to 0 in all situations, and values for SpinMethod other than StaticSpinning are ignored.
- TwoPassInitialNodeRestartCopy

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
rolling restart
\end{tabular}
\end{tabular}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4022.jpg?height=108&width=552&top_left_y=242&top_left_x=328)

Multithreaded building of ordered indexes can be enabled for initial restarts of data nodes by setting this configuration parameter to true (the default value), which enables two-pass copying of data during initial node restarts.

You must also set BuildIndexThreads to a nonzero value.
Multi-Threading Configuration Parameters (ndbmtd). ndbmtd runs by default as a singlethreaded process and must be configured to use multiple threads, using either of two methods, both of which require setting configuration parameters in the config. ini file. The first method is simply to set an appropriate value for the MaxNoOfExecutionThreads configuration parameter. A second method makes it possible to set up more complex rules for ndbmtd multithreading using ThreadConfig. The next few paragraphs provide information about these parameters and their use with multithreaded data nodes.

\section*{Note}

A backup using parallelism on the data nodes requires that multiple LDMs are in use on all data nodes in the cluster prior to taking the backup. For more information, see Section 25.6.8.5, "Taking an NDB Backup with Parallel Data Nodes", as well as Restoring from a backup taken in parallel.
- AutomaticThreadConfig

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & boolean \\
\hline Default & false \\
\hline Range & true, false \\
\hline Restart Type & \begin{tabular}{l}
Initial System Restart: \\
Requires a complete shutdown of the cluster, wiping and restoring the cluster file system from a backup, and then restarting the cluster. (NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

When set to 1 , enables automatic thread configuration employing the number of CPUs available to a data node taking into account any limits set by taskset, numactl, virtual machines, Docker, and other such means of controlling which CPUs are available to a given application (on Windows platforms, automatic thread configuration uses all CPUs which are online); alternatively, you can set NumCPUs to the desired number of CPUs (up to 1024, the maximum number of CPUs that can be handled by automatic thread configuration). Any settings for ThreadConfig and MaxNoOfExecutionThreads are ignored. In addition, enabling this parameter automatically disables ClassicFragmentation.
- ClassicFragmentation

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type or units & boolean \\
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

When enabled (set to true), NDB distributes fragments among LDMs such that the default number of partitions per node is equal to the minimum number of local data manager (LDM) threads per data node.

For new clusters, setting ClassicFragmentation to false when first setting up the cluster is preferable; doing so causes the number of partitions per node to be equal to the value of PartitionsPerNode, ensuring that all partitions are spread out evenly between all LDMs.

This parameter and AutomaticThreadConfig are mutually exclusive; enabling AutomaticThreadConfig automatically disables ClassicFragmentation.
- EnableMultithreadedBackup

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & 1 \\
\hline Range & $0-1$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Enables multi-threaded backup. If each data node has at least 2 LDMs, all LDM threads participate in the backup, which is created using one subdirectory per LDM thread, and each subdirectory containing.ctl,. .Data, and. log backup files.

This parameter is normally enabled (set to 1 ) for ndbmtd. To force a single-threaded backup that can be restored easily using older versions of ndb_restore, disable multi-threaded backup by setting this parameter to 0 . This must be done for each data node in the cluster.

See Section 25.6.8.5, "Taking an NDB Backup with Parallel Data Nodes", and Restoring from a backup taken in parallel, for more information.
- MaxNoOfExecutionThreads

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 2 \\
\hline Range & $2-72$ \\
\hline Restart Type & \begin{tabular}{l} 
System \\
Restart: \\
Requires a \\
complete
\end{tabular}
\end{tabular}

\begin{tabular}{|l|l|} 
& \begin{tabular}{l} 
shutdown and \\
restart of the \\
cluster. (NDB \\
8.4 .0 )
\end{tabular} \\
\hline
\end{tabular}

This parameter directly controls the number of execution threads used by ndbmtd, up to a maximum of 72. Although this parameter is set in [ndbd] or [ndbd default] sections of the config.ini file, it is exclusive to ndbmtd and does not apply to ndbd.

Enabling AutomaticThreadConfig causes any setting for this parameter to be ignored.
Setting MaxNoOfExecutionThreads sets the number of threads for each type as determined by a matrix in the file storage/ndb/src/common/mt_thr_config.cpp. This table shows these numbers of threads for possible values of MaxNoOfExecutionThreads.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.11 MaxNoOfExecutionThreads values and the corresponding number of threads by thread type (LQH, TC, Send, Receive).}
\begin{tabular}{|l|l|l|l|l|}
\hline MaxNoOfExecutio Value & DDM Tadeads & TC Threads & Send Threads & Receive Threads \\
\hline 0 .. 3 & 1 & 0 & 0 & 1 \\
\hline 4 .. 6 & 2 & 0 & 0 & 1 \\
\hline 7 .. 8 & 4 & 0 & 0 & 1 \\
\hline 9 & 4 & 2 & 0 & 1 \\
\hline 10 & 4 & 2 & 1 & 1 \\
\hline 11 & 4 & 3 & 1 & 1 \\
\hline 12 & 6 & 2 & 1 & 1 \\
\hline 13 & 6 & 3 & 1 & 1 \\
\hline 14 & 6 & 3 & 1 & 2 \\
\hline 15 & 6 & 3 & 2 & 2 \\
\hline 16 & 8 & 3 & 1 & 2 \\
\hline 17 & 8 & 4 & 1 & 2 \\
\hline 18 & 8 & 4 & 2 & 2 \\
\hline 19 & 8 & 5 & 2 & 2 \\
\hline 20 & 10 & 4 & 2 & 2 \\
\hline 21 & 10 & 5 & 2 & 2 \\
\hline 22 & 10 & 5 & 2 & 3 \\
\hline 23 & 10 & 6 & 2 & 3 \\
\hline 24 & 12 & 5 & 2 & 3 \\
\hline 25 & 12 & 6 & 2 & 3 \\
\hline 26 & 12 & 6 & 3 & 3 \\
\hline 27 & 12 & 7 & 3 & 3 \\
\hline 28 & 12 & 7 & 3 & 4 \\
\hline 29 & 12 & 8 & 3 & 4 \\
\hline 30 & 12 & 8 & 4 & 4 \\
\hline 31 & 12 & 9 & 4 & 4 \\
\hline 32 & 16 & 8 & 3 & 3 \\
\hline 33 & 16 & 8 & 3 & 4 \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|l|}
\hline \multicolumn{2}{|c|}{MaxNoOfExecutiobDMr Cadeads Value} & TC Threads & Send Threads & Receive Threads \\
\hline 34 & 16 & 8 & 4 & 4 \\
\hline 35 & 16 & 9 & 4 & 4 \\
\hline 36 & 16 & 10 & 4 & 4 \\
\hline 37 & 16 & 10 & 4 & 5 \\
\hline 38 & 16 & 11 & 4 & 5 \\
\hline 39 & 16 & 11 & 5 & 5 \\
\hline 40 & 20 & 10 & 4 & 4 \\
\hline 41 & 20 & 10 & 4 & 5 \\
\hline 42 & 20 & 11 & 4 & 5 \\
\hline 43 & 20 & 11 & 5 & 5 \\
\hline 44 & 20 & 12 & 5 & 5 \\
\hline 45 & 20 & 12 & 5 & 6 \\
\hline 46 & 20 & 13 & 5 & 6 \\
\hline 47 & 20 & 13 & 6 & 6 \\
\hline 48 & 24 & 12 & 5 & 5 \\
\hline 49 & 24 & 12 & 5 & 6 \\
\hline 50 & 24 & 13 & 5 & 6 \\
\hline 51 & 24 & 13 & 6 & 6 \\
\hline 52 & 24 & 14 & 6 & 6 \\
\hline 53 & 24 & 14 & 6 & 7 \\
\hline 54 & 24 & 15 & 6 & 7 \\
\hline 55 & 24 & 15 & 7 & 7 \\
\hline 56 & 24 & 16 & 7 & 7 \\
\hline 57 & 24 & 16 & 7 & 8 \\
\hline 58 & 24 & 17 & 7 & 8 \\
\hline 59 & 24 & 17 & 8 & 8 \\
\hline 60 & 24 & 18 & 8 & 8 \\
\hline 61 & 24 & 18 & 8 & 9 \\
\hline 62 & 24 & 19 & 8 & 9 \\
\hline 63 & 24 & 19 & 9 & 9 \\
\hline 64 & 32 & 16 & 7 & 7 \\
\hline 65 & 32 & 16 & 7 & 8 \\
\hline 66 & 32 & 17 & 7 & 8 \\
\hline 67 & 32 & 17 & 8 & 8 \\
\hline 68 & 32 & 18 & 8 & 8 \\
\hline 69 & 32 & 18 & 8 & 9 \\
\hline 70 & 32 & 19 & 8 & 9 \\
\hline 71 & 32 & 20 & 8 & 9 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|}
\hline \begin{tabular}{l} 
MaxNoOfExecut iolDMr $\mathbf{\text { Cardeads }}$ \\
Value
\end{tabular} & TC Threads & Send Threads & Receive Threads \\
\hline 72 & 32 & 20 & 8 & 10 \\
\hline
\end{tabular}

There is always one SUMA (replication) thread.
NoOfFragmentLogParts should be set equal to the number of LDM threads used by ndbmtd, as determined by the setting for this parameter. This ratio should not be any greater than 4:1; a configuration in which this is the case is specifically disallowed.

The number of LDM threads also determines the number of partitions used by an NDB table that is not explicitly partitioned; this is the number of LDM threads times the number of data nodes in the cluster. (If ndbd is used on the data nodes rather than ndbmtd, then there is always a single LDM thread; in this case, the number of partitions created automatically is simply equal to the number of data nodes. See Section 25.2.2, "NDB Cluster Nodes, Node Groups, Fragment Replicas, and Partitions", for more information.

Adding large tablespaces for Disk Data tables when using more than the default number of LDM threads may cause issues with resource and CPU usage if the disk page buffer is insufficiently large; see the description of the DiskPageBufferMemory configuration parameter, for more information.

The thread types are described later in this section (see ThreadConfig).
Setting this parameter outside the permitted range of values causes the management server to abort on startup with the error Error line number: Illegal value value for parameter MaxNoOfExecutionThreads.

For MaxNoOfExecutionThreads, a value of 0 or 1 is rounded up internally by NDB to 2 , so that 2 is considered this parameter's default and minimum value.

MaxNoOfExecutionThreads is generally intended to be set equal to the number of CPU threads available, and to allocate a number of threads of each type suitable to typical workloads. It does not assign particular threads to specified CPUs. For cases where it is desirable to vary from the settings provided, or to bind threads to CPUs, you should use ThreadConfig instead, which allows you to allocate each thread directly to a desired type, CPU, or both.

The multithreaded data node process always spawns, at a minimum, the threads listed here:
- 1 local query handler (LDM) thread
- 1 receive thread
- 1 subscription manager (SUMA or replication) thread

For a MaxNoOfExecutionThreads value of 8 or less, no TC threads are created, and TC handling is instead performed by the main thread.

Changing the number of LDM threads normally requires a system restart, whether it is changed using this parameter or ThreadConfig, but it is possible to effect the change using a node initial restart (NI) provided the following two conditions are met:
- Each LDM thread handles a maximum of 8 fragments, and
- The total number of table fragments is an integer multiple of the number of LDM threads.
- MaxSendDelay

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type or units & microseconds \\
\hline Default & 0 \\
\hline Range & $0-11000$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter can be used to cause data nodes to wait momentarily before sending data to API nodes; in some circumstances, described in the following paragraphs, this can result in more efficient sending of larger volumes of data and higher overall throughput.

MaxSendDelay can be useful when there are a great many API nodes at saturation point or close to it, which can result in waves of increasing and decreasing performance. This occurs when the data nodes are able to send results back to the API nodes relatively quickly, with many small packets to process, which can take longer to process per byte compared to large packets, thus slowing down the API nodes; later, the data nodes start sending larger packets again.

To handle this type of scenario, you can set MaxSendDelay to a nonzero value, which helps to ensure that responses are not sent back to the API nodes so quickly. When this is done, responses are sent immediately when there is no other competing traffic, but when there is, setting MaxSendDelay causes the data nodes to wait long enough to ensure that they send larger packets. In effect, this introduces an artificial bottleneck into the send process, which can actually improve throughput significantly.
- NoOfFragmentLogParts

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & 4 \\
\hline Range & 4, 6, 8, 10, 12, 16, 20, 24, 32 \\
\hline Restart Type & \begin{tabular}{l}
Initial Node Restart: \\
Requires a rolling restart of the cluster; each data node must be restarted with --initial. (NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Set the number of log file groups for redo logs belonging to this ndbmtd. The value of this parameter should be set equal to the number of LDM threads used by ndbmtd as determined by the setting for MaxNoOfExecutionThreads. A configuration using more than 4 redo log parts per LDM is disallowed.

See the description of MaxNoOfExecutionThreads for more information.
- NumCPUs

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Type or units & integer \\
\hline Default & 0 \\
\hline Range & 0-1024 \\
\hline Restart Type & \begin{tabular}{l}
Initial System Restart: \\
Requires a complete shutdown of the cluster, wiping and restoring the cluster file system from a backup, and then restarting the cluster. (NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Cause automatic thread configuration to use only this many CPUs. Has no effect if AutomaticThreadConfig is not enabled.
- PartitionsPerNode

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 2 \\
\hline Range & $1-32$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Sets the number of partitions used on each node when creating a new NDB table. This makes it possible to avoid splitting up tables into an excessive number of partitions when the number of local data managers (LDMs) grows high.

While it is possible to set this parameter to different values on different data nodes and there are no known issues with doing so, this is also not likely to be of any advantage; for this reason, it is recommended simply to set it once, for all data nodes, in the [ndbd default] section of the global config.ini file.

If ClassicFragmentation is enabled, any setting for this parameter is ignored. (Remember that enabling AutomaticThreadConfig disables ClassicFragmentation.)
- ThreadConfig

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & string \\
\hline Default & " \\
\hline Range & ... \\
\hline Restart Type & \begin{tabular}{l} 
System \\
Restart:
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
& Requires a \\
complete \\
shutdown and \\
restart of the \\
cluster. (NDB \\
8.4 .0 ) \\
\hline
\end{tabular}

This parameter is used with ndbmtd to assign threads of different types to different CPUs. Its value is a string whose format has the following syntax:
```
ThreadConfig := entry[,entry[,...]]
entry := type={param[,param[,...]]}
type := ldm | query | recover | main | recv | send | rep | io | tc | watchdog | idxbld
param := count=number
    | cpubind=cpu_list
    | cpuset=cpu_list
    | spintime=number
    | realtime={0|1}
    | nosend={0|1}
    | thread_prio={0..10}
    | cpubind_exclusive=cpu_list
    | cpuset_exclusive=cpu_list
```


The curly braces $(\{\ldots\})$ surrounding the list of parameters are required, even if there is only one parameter in the list.

A param (parameter) specifies any or all of the following information:
- The number of threads of the given type (count).
- The set of CPUs to which the threads of the given type are to be nonexclusively bound. This is determined by either one of cpubind or cpuset). cpubind causes each thread to be bound (nonexclusively) to a CPU in the set; cpuset means that each thread is bound (nonexclusively) to the set of CPUs specified.

On Solaris, you can instead specify a set of CPUs to which the threads of the given type are to be bound exclusively. cpubind_exclusive causes each thread to be bound exclusively to a CPU in the set; cpuset_exclsuive means that each thread is bound exclusively to the set of CPUs specified.

Only one of cpubind, cpuset, cpubind_exclusive, or cpuset_exclusive can be provided in a single configuration.
- spintime determines the wait time in microseconds the thread spins before going to sleep.

The default value for spintime is the value of the SchedulerSpinTimer data node configuration parameter.
spintime does not apply to I/O threads, watchdog, or offline index build threads, and so cannot be set for these thread types.
- realtime can be set to 0 or 1 . If it is set to 1 , the threads run with real-time priority. This also means that thread_prio cannot be set.

The realtime parameter is set by default to the value of the RealtimeScheduler data node configuration parameter.
realtime cannot be set for offline index build threads.
- By setting nosend to 1 , you can prevent a main, ldm, rep, or tc thread from assisting the send threads. This parameter is 0 by default, and cannot be used with other types of threads.
- thread_prio is a thread priority level that can be set from 0 to 10 , with 10 representing the greatest priority. The default is 5 . The precise effects of this parameter are platform-specific, and are described later in this section.

The thread priority level cannot be set for offline index build threads.
thread_prio settings and effects by platform. The implementation of thread_prio differs between Linux/FreeBSD, Solaris, and Windows. In the following list, we discuss its effects on each of these platforms in turn:
- Linux and FreeBSD: We map thread_prio to a value to be supplied to the nice system call. Since a lower niceness value for a process indicates a higher process priority, increasing thread_prio has the effect of lowering the nice value.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.12 Mapping of thread_prio to nice values on Linux and FreeBSD}
\begin{tabular}{|l|l|}
\hline thread_prio value & nice value \\
\hline 0 & 19 \\
\hline 1 & 16 \\
\hline 2 & 12 \\
\hline 3 & 8 \\
\hline 4 & 4 \\
\hline 5 & 0 \\
\hline 6 & -4 \\
\hline 7 & -8 \\
\hline 8 & -12 \\
\hline 9 & -16 \\
\hline 10 & -20 \\
\hline
\end{tabular}
\end{table}

Some operating systems may provide for a maximum process niceness level of 20, but this is not supported by all targeted versions; for this reason, we choose 19 as the maximum nice value that can be set.
- Solaris: Setting thread_prio on Solaris sets the Solaris FX priority, with mappings as shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.13 Mapping of thread_prio to FX priority on Solaris}
\begin{tabular}{|l|l|}
\hline thread_prio value & Solaris FX priority \\
\hline 0 & 15 \\
\hline 1 & 20 \\
\hline 2 & 25 \\
\hline 3 & 30 \\
\hline 4 & 35 \\
\hline 5 & 40 \\
\hline 6 & 45 \\
\hline 7 & 50 \\
\hline 8 & 55 \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline thread_prio value & Solaris FX priority \\
\hline 9 & 59 \\
\hline 10 & 60 \\
\hline
\end{tabular}

A thread_prio setting of 9 is mapped on Solaris to the special FX priority value 59, which means that the operating system also attempts to force the thread to run alone on its own CPU core.
- Windows: We map thread_prio to a Windows thread priority value passed to the Windows API SetThreadPriority() function. This mapping is shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.14 Mapping of thread_prio to Windows thread priority}
\begin{tabular}{|l|l|}
\hline thread_prio value & Windows thread priority \\
\hline 0-1 & THREAD_PRIORITY_LOWEST \\
\hline 2-3 & THREAD_PRIORITY_BELOW_NORMAL \\
\hline 4-5 & THREAD_PRIORITY_NORMAL \\
\hline 6-7 & THREAD_PRIORITY_ABOVE_NORMAL \\
\hline 8-10 & THREAD_PRIORITY_HIGHEST \\
\hline
\end{tabular}
\end{table}

The type attribute represents an NDB thread type. The thread types supported, and the range of permitted count values for each, are provided in the following list:
- ldm: Local query handler (DBLQH kernel block) that handles data. The more LDM threads that are used, the more highly partitioned the data becomes.

When ClassicFragmentation is set to 0 , the number of partitions is independent of the number of LDM threads, and depends on the value of PartitionsPerNode instead.) Each LDM thread maintains its own sets of data and index partitions, as well as its own redo log. ldm can be set to any value in the range 0 to 332 inclusive. When setting it to 0 , main, rep, and tc must also be 0 , and recv must also be set to 1 ; doing this causes ndbmtd to emulate ndbd.

Each LDM thread is normally grouped with 1 query thread to form an LDM group. A set of 4 to 8 LDM groups is grouped into a round robin groups. Each LDM thread can be assisted in execution by any query or threads in the same round robin group. NDB attempts to form round robin groups such that all threads in each round robin group are locked to CPUs that are attached to the same L3 cache, within the limits of the range stated for a round robin group's size.

Changing the number of LDM threads normally requires a system restart to be effective and safe for cluster operations; this requirement is relaxed in certain cases, as explained later in this section. This is also true when this is done using MaxNoOfExecutionThreads.

Adding large tablespaces (hundreds of gigabytes or more) for Disk Data tables when using more than the default number of LDMs may cause issues with resource and CPU usage if DiskPageBufferMemory is not sufficiently large.

If $l \mathrm{dm}$ is not included in the ThreadConfig value string, one $l \mathrm{dm}$ thread is created.
- query: A query thread is tied to an LDM and together with it forms an LDM group; acts only on READ COMMITTED queries. The number of query threads must be set to $0,1,2$, or 3 times the number of LDM threads. Query threads are not used, unless this is overridden by setting query to a nonzero value, or by enabling the AutomaticThreadConfig parameter.

A query thread also acts as a recovery thread (see next item), although the reverse is not true.
Changing the number of query threads requires a node restart.
- recover: A recovery thread restores data from a fragment as part of an LCP.

Changing the number of recovery threads requires a node restart.
- tc: Transaction coordinator thread (DBTC kernel block) containing the state of an ongoing transaction. The maximum number of TC threads is 128.

Optimally, every new transaction can be assigned to a new TC thread. In most cases 1 TC thread per 2 LDM threads is sufficient to guarantee that this can happen. In cases where the number of writes is relatively small when compared to the number of reads, it is possible that only 1 TC thread per 4 LQH threads is required to maintain transaction states. Conversely, in applications that perform a great many updates, it may be necessary for the ratio of TC threads to LDM threads to approach 1 (for example, 3 TC threads to 4 LDM threads).

Setting tc to 0 causes TC handling to be done by the main thread. In most cases, this is effectively the same as setting it to 1 .

Range: 0-64
- main: Data dictionary and transaction coordinator (DBDIH and DBTC kernel blocks), providing schema management. It is also possible to specify zero or two main threads.

Range: 0-2.
Setting main to 0 and rep to 1 causes the main blocks to be placed into the rep thread; the combined thread is shown in the ndbinfo. threads table as main_rep. This is effectively the same as setting rep equal to 1 and main equal to 0 .

It is also possible to set both main and rep to 0 , in which case both threads are placed in the first recv thread; the resulting combined thread is named main_rep_recv in the threads table.

If main is omitted from the ThreadConfig value stringthis, one main thread is created.
- recv: Receive thread (CMVMI kernel block). Each receive thread handles one or more sockets for communicating with other nodes in an NDB Cluster, with one socket per node. NDB Cluster supports multiple receive threads; the maximum is 16 such threads.

Range: 1-64.
If recv is omitted from the ThreadConfig value string, one recv thread is created.
- send: Send thread (CMVMI kernel block). To increase throughput, it is possible to perform sends from one or more separate, dedicated threads (maximum 8).

Using an excessive number of send threads can have an adverse effect on scalability.
Previously, all threads handled their own sending directly; this can still be made to happen by setting the number of send threads to 0 (this also happens when MaxNoOfExecutionThreads is set less than 10). While doing so can have an adverse impact on throughput, it can also in some cases provide decreased latency.

Range:
- 0-64
- rep: Replication thread (SUMA kernel block). This thread can also be combined with the main thread (see range information).

Range: 0-1.
Setting rep to 0 and main to 1 causes the rep blocks to be placed into the main thread; the combined thread is shown in the ndbinfo.threads table as main_rep. This is effectively the same as setting main equal to 1 and rep equal to 0 .

It is also possible to set both main and rep to 0 , in which case both threads are placed in the first recv thread; the resulting combined thread is named main_rep_recv in the threads table.

If rep is omitted from the ThreadConfig value string, one rep thread is created.
- io: File system and other miscellaneous operations. These are not demanding tasks, and are always handled as a group by a single, dedicated I/O thread.

Range: 1 only.
- watchdog: Parameters settings associated with this type are actually applied to several threads, each having a specific use. These threads include the SocketServer thread, which receives connection setups from other nodes; the SocketClient thread, which attempts to set up connections to other nodes; and the thread watchdog thread that checks that threads are progressing.

Range: 1 only.
- idxbld: Offline index build threads. Unlike the other thread types listed previously, which are permanent, these are temporary threads which are created and used only during node or system restarts, or when running ndb_restore--rebuild-indexes. They may be bound to CPU sets which overlap with CPU sets bound to permanent thread types.
thread_prio, realtime, and spintime values cannot be set for offline index build threads. In addition, count is ignored for this type of thread.

If idxbld is not specified, the default behavior is as follows:
- Offline index build threads are not bound if the I/O thread is also not bound, and these threads use any available cores.
- If the I/O thread is bound, then the offline index build threads are bound to the entire set of bound threads, due to the fact that there should be no other tasks for these threads to perform.

Range: 0-1.
Changing ThreadCOnfig normally requires a system initial restart, but this requirement can be relaxed under certain circumstances:
- If, following the change, the number of LDM threads remains the same as before, nothing more than a simple node restart (rolling restart, or $N$ ) is required to implement the change.
- Otherwise (that is, if the number of LDM threads changes), it is still possible to effect the change using a node initial restart ( $N I$ ) provided the following two conditions are met:
a. Each LDM thread handles a maximum of 8 fragments, and
b. The total number of table fragments is an integer multiple of the number of LDM threads.

In any other case, a system initial restart is needed to change this parameter.
NDB can distinguish between thread types by both of the following criteria:
- Whether the thread is an execution thread. Threads of type main, ldm, query, recv, rep, tc, and send are execution threads; io, recover, watchdog, and idxbld threads are not considered execution threads.
- Whether the allocation of threads to a given task is permanent or temporary. Currently all thread types except idxbld are considered permanent; idxbld threads are regarded as temporary threads.

Simple examples:
```
# Example 1.
ThreadConfig=ldm={count=2,cpubind=1,2},main={cpubind=12},rep={cpubind=11}
# Example 2.
Threadconfig=main={cpubind=0},ldm={count=4,cpubind=1,2,5,6},io={cpubind=3}
```


It is usually desirable when configuring thread usage for a data node host to reserve one or more number of CPUs for operating system and other tasks. Thus, for a host machine with 24 CPUs, you might want to use 20 CPU threads (leaving 4 for other uses), with 8 LDM threads, 4 TC threads (half the number of LDM threads), 3 send threads, 3 receive threads, and 1 thread each for schema management, asynchronous replication, and I/O operations. (This is almost the same distribution of threads used when MaxNoOfExecutionThreads is set equal to 20.) The following ThreadConfig setting performs these assignments, additionally binding all of these threads to specific CPUs:
```
ThreadConfig=ldm{count=8,cpubind=1,2,3,4,5,6,7,8},main={cpubind=9},io={cpubind=9}, \
rep={cpubind=10},tc{count=4,cpubind=11,12,13,14},recv={count=3,cpubind=15,16,17}, \
send{count=3,cpubind=18,19,20}
```


It should be possible in most cases to bind the main (schema management) thread and the I/O thread to the same CPU, as we have done in the example just shown.

The following example incorporates groups of CPUs defined using both cpuset and cpubind, as well as use of thread prioritization.
```
ThreadConfig=ldm={count=4,cpuset=0-3,thread_prio=8,spintime=200}, \
ldm={count=4,cpubind=4-7,thread_prio=8,spintime=200}, \
tc={count=4,cpuset=8-9,thread_prio=6},send={count=2,thread_prio=10,cpubind=10-11}, \
main={count=1,cpubind=10},rep={count=1,cpubind=11}
```


In this case we create two LDM groups; the first uses cpubind and the second uses cpuset. thread_prio and spintime are set to the same values for each group. This means there are eight LDM threads in total. (You should ensure that NoOfFragmentLogParts is also set to 8.) The four TC threads use only two CPUs; it is possible when using cpuset to specify fewer CPUs than threads in the group. (This is not true for cpubind.) The send threads use two threads using
cpubind to bind these threads to CPUs 10 and 11. The main and rep threads can reuse these CPUs.

This example shows how ThreadConfig and NoOfFragmentLogParts might be set up for a 24-CPU host with hyperthreading, leaving CPUs 10, 11, 22, and 23 available for operating system functions and interrupts:
```
NoOfFragmentLogParts=10
ThreadConfig=ldm={count=10,cpubind=0-4,12-16,thread_prio=9,spintime=200}, \
tc={count=4,cpuset=6-7,18-19,thread_prio=8},send={count=1,cpuset=8}, \
recv={count=1,cpuset=20},main={count=1,cpuset=9,21},rep={count=1,cpuset=9,21}, \
io={count=1,cpuset=9,21,thread_prio=8},watchdog={count=1,cpuset=9,21,thread_prio=9}
```


The next few examples include settings for idxbld. The first two of these demonstrate how a CPU set defined for idxbld can overlap those specified for other (permanent) thread types, the first using cpuset and the second using cpubind:
```
ThreadConfig=main,ldm={count=4,cpuset=1-4},tc={count=4,cpuset=5,6,7}, \
io={cpubind=8},idxbld={cpuset=1-8}
ThreadConfig=main,ldm={count=1,cpubind=1},idxbld={count=1,cpubind=1}
```


The next example specifies a CPU for the I/O thread, but not for the index build threads:
```
ThreadConfig=main,ldm={count=4,cpuset=1-4},tc={count=4,cpuset=5,6,7}, \
io={cpubind=8}
```


Since the ThreadConfig setting just shown locks threads to eight cores numbered 1 through 8 , it is equivalent to the setting shown here:
```
ThreadConfig=main,ldm={count=4,cpuset=1-4},tc={count=4,cpuset=5,6,7}, \
io={cpubind=8},idxbld={cpuset=1,2,3,4,5,6,7,8}
```


In order to take advantage of the enhanced stability that the use of ThreadConfig offers, it is necessary to insure that CPUs are isolated, and that they not subject to interrupts, or to being scheduled for other tasks by the operating system. On many Linux systems, you can do this by setting IRQBALANCE_BANNED_CPUS in /etc/sysconfig/irqbalance to 0xFFFFF0, and by using the isolcpus boot option in grub.conf. For specific information, see your operating system or platform documentation.

Disk Data Configuration Parameters. Configuration parameters affecting Disk Data behavior include the following:
- DiskPageBufferEntries

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 64 MB \\
\hline Range & $4 \mathrm{MB}-16 \mathrm{~TB}$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This is the number of page entries (page references) to allocate. It is specified as a number of 32 K pages in DiskPageBufferMemory. The default is sufficient for most cases but you may need to increase the value of this parameter if you encounter problems with very large transactions on Disk Data tables. Each page entry requires approximately 100 bytes.
- DiskPageBufferMemory

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 64 M \\
\hline Range & $4 \mathrm{M}-16 \mathrm{~T}$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This determines the amount of space, in bytes, used for caching pages on disk, and is set in the [ndbd] or [ndbd default] section of the config.ini file.

If the value for DiskPageBufferMemory is set too low in conjunction with using more than the default number of LDM threads in ThreadConfig (for example $\{l \mathrm{dm}=6 \ldots\}$ ), problems can arise when trying to add a large (for example 500 G ) data file to a disk-based NDB table, wherein the process takes indefinitely long while occupying one of the CPU cores.

This is due to the fact that, as part of adding a data file to a tablespace, extent pages are locked into memory in an extra PGMAN worker thread, for quick metadata access. When adding a large file, this worker has insufficient memory for all of the data file metadata. In such cases, you should either increase DiskPageBufferMemory, or add smaller tablespace files. You may also need to adjust DiskPageBufferEntries.

You can query the ndbinfo.diskpagebuffer table to help determine whether the value for this parameter should be increased to minimize unnecessary disk seeks. See Section 25.6.15.31, "The ndbinfo diskpagebuffer Table", for more information.
- SharedGlobalMemory

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 128 M \\
\hline Range & $0-64 \mathrm{~T}$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter determines the amount of memory that is used for log buffers, disk operations (such as page requests and wait queues), and metadata for tablespaces, log file groups, UNDO files, and data files. The shared global memory pool also provides memory used for satisfying the memory requirements of the UNDO_BUFFER_SIZE option used with CREATE LOGFILE GROUP and ALTER LOGFILE GROUP statements, including any default value implied for this options by the setting of the InitialLogFileGroup data node configuration parameter. SharedGlobalMemory can be set in the [ndbd] or [ndbd default] section of the config.ini configuration file, and is measured in bytes.

The default value is 128 M .
- DiskIOThreadPool

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & threads \\
\hline Default & 2 \\
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

This parameter determines the number of unbound threads used for Disk Data file access. Before DiskIOThreadPool was introduced, exactly one thread was spawned for each Disk Data file, which could lead to performance issues, particularly when using very large data files. With DiskIOThreadPool, you can-for example-access a single large data file using several threads working in parallel.

This parameter applies to Disk Data I/O threads only.
The optimum value for this parameter depends on your hardware and configuration, and includes these factors:
- Physical distribution of Disk Data files. You can obtain better performance by placing data files, undo log files, and the data node file system on separate physical disks. If you do this with some or all of these sets of files, then you can (and should) set DiskIOThreadPool higher to enable separate threads to handle the files on each disk.

You should also disable DiskDataUsingSameDisk when using a separate disk or disks for Disk Data files; this increases the rate at which checkpoints of Disk Data tablespaces can be performed.
- Disk performance and types. The number of threads that can be accommodated for Disk Data file handling is also dependent on the speed and throughput of the disks. Faster disks and higher throughput allow for more disk I/O threads. Our test results indicate that solid-state disk drives can handle many more disk I/O threads than conventional disks, and thus higher values for DiskɪOThreadPool.

Decreasing TimeBetweenGlobalCheckpoints is also recommended when using solid-state disk drives, in particular those using NVMe. See also Disk Data latency parameters.

The default value for this parameter is 2 .
- Disk Data file system parameters. The parameters in the following list make it possible to place NDB Cluster Disk Data files in specific directories without the need for using symbolic links.
- FileSystemPathDD

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & filename \\
\hline Default & FileSystemPath \\
\hline Range & $\ldots$ \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Restart Type & Initial Node \\
& Restart: \\
& Requires a \\
& rolling restart \\
& of the cluster; \\
& each data \\
& node must be \\
& restarted with \\
& - - initial. \\
& (NDB 8.4.0) \\
\hline
\end{tabular}

If this parameter is specified, then NDB Cluster Disk Data data files and undo log files are placed in the indicated directory. This can be overridden for data files, undo log files, or both, by specifying values for FileSystemPathDataFiles, FileSystemPathUndoFiles, or both, as explained for these parameters. It can also be overridden for data files by specifying a path in the ADD DATAFILE clause of a CREATE TABLESPACE or ALTER TABLESPACE statement, and for undo log files by specifying a path in the ADD UNDOFILE clause of a CREATE LOGFILE GROUP or ALTER LOGFILE GROUP statement. If FileSystemPathDD is not specified, then FileSystemPath is used.

If a FileSystemPathDD directory is specified for a given data node (including the case where the parameter is specified in the [ndbd default] section of the config.ini file), then starting that data node with - -initial causes all files in the directory to be deleted.
- FileSystemPathDataFiles

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & filename \\
\hline Default & FileSystemPathDD \\
\hline Range & ⋯ \\
\hline Restart Type & \begin{tabular}{l}
Initial Node Restart: \\
Requires a rolling restart of the cluster; each data node must be restarted with --initial. (NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

If this parameter is specified, then NDB Cluster Disk Data data files are placed in the indicated directory. This overrides any value set for FileSystemPathDD. This parameter can be overridden for a given data file by specifying a path in the ADD DATAFILE clause of a CREATE TABLESPACE or ALTER TABLESPACE statement used to create that data file. If FileSystemPathDataFiles is not specified, then FileSystemPathDD is used (or FileSystemPath, if FileSystemPathDD has also not been set).

If a FileSystemPathDataFiles directory is specified for a given data node (including the case where the parameter is specified in the [ndbd default] section of the config.ini file), then starting that data node with - -initial causes all files in the directory to be deleted.
- FileSystemPathUndoFiles

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & filename \\
\hline Default & FileSystemPathDD \\
\hline Range & ⋯ \\
\hline Restart Type & \begin{tabular}{l}
Initial Node Restart: \\
Requires a rolling restart of the cluster; each data node must be restarted with --initial. (NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

If this parameter is specified, then NDB Cluster Disk Data undo log files are placed in the indicated directory. This overrides any value set for FileSystemPathDD. This parameter can be overridden for a given data file by specifying a path in the ADD UNDO clause of a CREATE LOGFILE GROUP or ALTER LOGFILE GROUP statement used to create that data file. If FileSystemPathUndoFiles is not specified, then FileSystemPathDD is used (or FileSystemPath, if FileSystemPathDD has also not been set).

If a FileSystemPathUndoFiles directory is specified for a given data node (including the case where the parameter is specified in the [ndbd default] section of the config.ini file), then starting that data node with - -initial causes all files in the directory to be deleted.

For more information, see Section 25.6.11.1, "NDB Cluster Disk Data Objects".
- Disk Data object creation parameters. The next two parameters enable you-when starting the cluster for the first time-to cause a Disk Data log file group, tablespace, or both, to be created without the use of SQL statements.
- InitialLogFileGroup

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & string \\
\hline Default & \begin{tabular}{l} 
[see \\
documentation]
\end{tabular} \\
\hline Range & $\ldots$ \\
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
& cluster. (NDB \\
& 8.4 .0 ) \\
\hline
\end{tabular}

This parameter can be used to specify a log file group that is created when performing an initial start of the cluster. InitialLogFileGroup is specified as shown here:
```
InitialLogFileGroup = [name=name;] [undo_buffer_size=size;] file-specification-list
file-specification-list:
    file-specification[; file-specification[; ...]]
file-specification:
    filename:size
```


The name of the log file group is optional and defaults to DEFAULT-LG. The undo_buffer_size is also optional; if omitted, it defaults to 64 M . Each file-specification corresponds to an undo log file, and at least one must be specified in the file-specification-list. Undo log files are placed according to any values that have been set for FileSystemPath, FileSystemPathDD, and FileSystemPathUndoFiles, just as if they had been created as the result of a CREATE LOGFILE GROUP or ALTER LOGFILE GROUP statement.

Consider the following:
```
InitialLogFileGroup = name=LG1; undo_buffer_size=128M; undo1.log:250M; undo2.log:150M
```


This is equivalent to the following SQL statements:
```
CREATE LOGFILE GROUP LG1
    ADD UNDOFILE 'undo1.log'
    INITIAL_SIZE 250M
    UNDO_BUFFER_SIZE 128M
    ENGINE NDBCLUSTER;
ALTER LOGFILE GROUP LG1
    ADD UNDOFILE 'undo2.log'
    INITIAL_SIZE 150M
    ENGINE NDBCLUSTER;
```


This logfile group is created when the data nodes are started with --initial.
Resources for the initial log file group are added to the global memory pool along with those indicated by the value of SharedGlobalMemory.

This parameter, if used, should always be set in the [ndbd default] section of the config.ini file. The behavior of an NDB Cluster when different values are set on different data nodes is not defined.
- InitialTablespace

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & string \\
\hline Default & \begin{tabular}{l} 
[see \\
documentation]
\end{tabular} \\
\hline Range & $\ldots$ \\
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
& cluster. (NDB \\
8.4 .0 ) \\
\hline
\end{tabular}

This parameter can be used to specify an NDB Cluster Disk Data tablespace that is created when performing an initial start of the cluster. InitialTablespace is specified as shown here:
```
InitialTablespace = [name=name;] [extent_size=size;] file-specification-list
```


The name of the tablespace is optional and defaults to DEFAULT-TS. The extent_size is also optional; it defaults to 1 M . The file-specification-list uses the same syntax as shown with the InitialLogfileGroup parameter, the only difference being that each file-specification used with InitialTablespace corresponds to a data file. At least one must be specified in the file-specification-list. Data files are placed according to any values that have been set for FileSystemPath, FileSystemPathDD, and FileSystemPathDataFiles, just as if they had been created as the result of a CREATE TABLESPACE or ALTER TABLESPACE statement.

For example, consider the following line specifying InitialTablespace in the [ndbd default] section of the config.ini file (as with InitialLogfileGroup, this parameter should always be set in the [ndbd default] section, as the behavior of an NDB Cluster when different values are set on different data nodes is not defined):

InitialTablespace = name=TS1; extent_size=8M; data1.dat:2G; data2.dat:4G
This is equivalent to the following SQL statements:
```
CREATE TABLESPACE TS1
    ADD DATAFILE 'data1.dat'
    EXTENT_SIZE 8M
    INITIAL_SIZE 2G
    ENGINE NDBCLUSTER;
ALTER TABLESPACE TS1
    ADD DATAFILE 'data2.dat'
    INITIAL_SIZE 4G
    ENGINE NDBCLUSTER;
```


This tablespace is created when the data nodes are started with - - initial, and can be used whenever creating NDB Cluster Disk Data tables thereafter.
- Disk Data latency parameters. The two parameters listed here can be used to improve handling of latency issues with NDB Cluster Disk Data tables.
- MaxDiskDataLatency

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & ms \\
\hline Default & 0 \\
\hline Range & $0-8000$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter controls the maximum allowed mean latency for disk access (maximum 8000 milliseconds). When this limit is reached, NDB begins to abort transactions in order to decrease pressure on the Disk Data I/O subsystem. Use 0 to disable the latency check.
- DiskDataUsingSameDisk

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & boolean \\
\hline Default & true \\
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

Set this parameter to false if your Disk Data tablespaces use one or more separate disks. Doing so allows checkpoints to tablespaces to be executed at a higher rate than normally used for when disks are shared.

When DiskDataUsingSameDisk is true, NDB decreases the rate of Disk Data checkpointing whenever an in-memory checkpoint is in progress to help ensure that disk load remains constant.

Disk Data and GCP Stop errors. Errors encountered when using Disk Data tables such as Node nodeid killed this node because GCP stop was detected (error 2303) are often referred to as "GCP stop errors". Such errors occur when the redo log is not flushed to disk quickly enough; this is usually due to slow disks and insufficient disk throughput.

You can help prevent these errors from occurring by using faster disks, and by placing Disk Data files on a separate disk from the data node file system. Reducing the value of TimeBetweenGlobalCheckpoints tends to decrease the amount of data to be written for each global checkpoint, and so may provide some protection against redo log buffer overflows when trying to write a global checkpoint; however, reducing this value also permits less time in which to write the GCP, so this must be done with caution.

In addition to the considerations given for DiskPageBufferMemory as explained previously, it is also very important that the DiskIOThreadPool configuration parameter be set correctly; having DiskIOThreadPool set too high is very likely to cause GCP stop errors (Bug \#37227).

GCP stops can be caused by save or commit timeouts; the TimeBetweenEpochsTimeout data node configuration parameter determines the timeout for commits. However, it is possible to disable both types of timeouts by setting this parameter to 0 .

Parameters for configuring send buffer memory allocation. Send buffer memory is allocated dynamically from a memory pool shared between all transporters, which means that the size of the send buffer can be adjusted as necessary. (Previously, the NDB kernel used a fixed-size send buffer for every node in the cluster, which was allocated when the node started and could not be changed while the node was running.) The TotalSendBufferMemory and OverLoadLimit data node configuration parameters permit the setting of limits on this memory allocation. For more information about the use of these parameters (as well as SendBufferMemory), see Section 25.4.3.14, "Configuring NDB Cluster Send Buffer Parameters".
- ExtraSendBufferMemory

This parameter specifies the amount of transporter send buffer memory to allocate in addition to any set using TotalSendBufferMemory, SendBufferMemory, or both.
- TotalSendBufferMemory

This parameter is used to determine the total amount of memory to allocate on this node for shared send buffer memory among all configured transporters.

If this parameter is set, its minimum permitted value is $256 \mathrm{~KB} ; 0$ indicates that the parameter has not been set. For more detailed information, see Section 25.4.3.14, "Configuring NDB Cluster Send Buffer Parameters".

See also Section 25.6.7, "Adding NDB Cluster Data Nodes Online".
Redo log over-commit handling. It is possible to control a data node's handling of operations when too much time is taken flushing redo logs to disk. This occurs when a given redo log flush takes longer than RedoOverCommitLimit seconds, more than RedoOverCommitCounter times, causing any pending transactions to be aborted. When this happens, the API node that sent the transaction can handle the operations that should have been committed either by queuing the operations and re-trying them, or by aborting them, as determined by DefaultOperationRedoProblemAction. The data node configuration parameters for setting the timeout and number of times it may be exceeded before the API node takes this action are described in the following list:
- RedoOverCommitCounter

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & numeric \\
\hline Default & 3 \\
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

When RedoOverCommitLimit is exceeded when trying to write a given redo log to disk this many times or more, any transactions that were not committed as a result are aborted, and an API node where any of these transactions originated handles the operations making up those transactions according to its value for DefaultOperationRedoProblemAction (by either queuing the operations to be re-tried, or aborting them).
- RedoOverCommitLimit

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & seconds \\
\hline Default & 20 \\
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

This parameter sets an upper limit in seconds for trying to write a given redo log to disk before timing out. The number of times the data node tries to flush this redo log, but takes longer than RedoOverCommitLimit, is kept and compared with RedoOverCommitCounter, and when flushing takes too long more times than the value of that parameter, any transactions that were not committed as a result of the flush timeout are aborted. When this occurs, the API node where any of these transactions originated handles the operations making up those transactions according to its

DefaultOperationRedoProblemAction setting (it either queues the operations to be re-tried, or aborts them).

Controlling restart attempts. It is possible to exercise finely-grained control over restart attempts by data nodes when they fail to start using the MaxStartFailRetries and StartFailRetryDelay data node configuration parameters.

MaxStartFailRetries limits the total number of retries made before giving up on starting the data node, StartFailRetryDelay sets the number of seconds between retry attempts. These parameters are listed here:
- StartFailRetryDelay

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
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

Use this parameter to set the number of seconds between restart attempts by the data node in the event on failure on startup. The default is 0 (no delay).

Both this parameter and MaxStartFailRetries are ignored unless StopOnError is equal to 0.
- MaxStartFailRetries

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
\hline Default & 3 \\
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

Use this parameter to limit the number restart attempts made by the data node in the event that it fails on startup. The default is 3 attempts.

Both this parameter and StartFailRetryDelay are ignored unless StopOnError is equal to 0.
NDB index statistics parameters. The parameters in the following list relate to NDB index statistics generation.
- IndexStatAutoCreate

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type or units & integer \\
\hline Default & 1 \\
\hline Range & 0,1 \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Enable (set equal to 1 ) or disable (set equal to 0 ) automatic statistics collection when indexes are created.
- IndexStatAutoUpdate

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 1 \\
\hline Range & 0,1 \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Enable (set equal to 1 ) or disable (set equal to 0 ) monitoring of indexes for changes, and trigger automatic statistics updates when these are detected. The degree of change needed to trigger the updates are determined by the settings for the IndexStatTriggerPct and IndexStatTriggerScale options.
- IndexStatSaveSize

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 32768 \\
\hline Range & \begin{tabular}{l}
$0-4294967039$ \\
(0xFFFFFEFF)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Initial Node \\
Restart: \\
Requires a \\
rolling restart \\
of the cluster; \\
each data \\
node must be \\
restarted with
\end{tabular}
\end{tabular}

\begin{tabular}{|l|l|} 
& \begin{tabular}{l}
--initial. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Maximum space in bytes allowed for the saved statistics of any given index in the NDB system tables and in the mysqld memory cache.

At least one sample is always produced, regardless of any size limit. This size is scaled by IndexStatSaveScale.

The size specified by IndexStatSaveSize is scaled by the value of IndexStatTriggerPct for a large index, times 0.01 . This is further multiplied by the logarithm to the base 2 of the index size. Setting IndexStatTriggerPct equal to 0 disables the scaling effect.
- IndexStatSaveScale

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & percentage \\
\hline Default & 100 \\
\hline Range & 0-4294967039 (0xFFFFFEFF) \\
\hline Restart Type & \begin{tabular}{l}
Initial Node Restart: \\
Requires a rolling restart of the cluster; each data node must be restarted with --initial. (NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

The size specified by IndexStatSaveSize is scaled by the value of IndexStatTriggerPct for a large index, times 0.01 . This is further multiplied by the logarithm to the base 2 of the index size. Setting IndexStatTriggerPct equal to 0 disables the scaling effect.
- IndexStatTriggerPct

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & percentage \\
\hline Default & 100 \\
\hline Range & \begin{tabular}{l}
$0-4294967039$ \\
(0xFFFFFEFF)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Initial Node \\
Restart: \\
Requires a \\
rolling restart \\
of the cluster; \\
each data \\
node must be \\
restarted with
\end{tabular}
\end{tabular}

\begin{tabular}{|l|l|} 
& --initial. \\
& (NDB 8.4.0) \\
\hline
\end{tabular}

Percentage change in updates that triggers an index statistics update. The value is scaled by IndexStatTriggerScale. You can disable this trigger altogether by setting IndexStatTriggerPct to 0.
- IndexStatTriggerScale

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & percentage \\
\hline Default & 100 \\
\hline Range & 0-4294967039 (0xFFFFFEFF) \\
\hline Restart Type & Initial Node Restart: Requires a rolling restart of the cluster; each data node must be restarted with --initial. (NDB 8.4.0) \\
\hline
\end{tabular}

Scale IndexStatTriggerPct by this amount times 0.01 for a large index. A value of 0 disables scaling.
- IndexStatUpdateDelay

\begin{tabular}{|l|l|}
\hline Version (or later) & NDB 8.4.0 \\
\hline Type or units & seconds \\
\hline Default & 60 \\
\hline Range & 0-4294967039 (0xFFFFFEFF) \\
\hline Restart Type & Initial Node Restart: Requires a rolling restart of the cluster; each data node must be restarted with --initial. (NDB 8.4.0) \\
\hline
\end{tabular}

Minimum delay in seconds between automatic index statistics updates for a given index. Setting this variable to 0 disables any delay. The default is 60 seconds.

Restart types. Information about the restart types used by the parameter descriptions in this section is shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.15 NDB Cluster restart types}
\begin{tabular}{|l|l|l|}
\hline Symbol & Restart Type & Description \\
\hline N & Node & The parameter can be updated using a rolling restart (see Section 25.6.5, "Performing a Rolling Restart of an NDB Cluster") \\
\hline S & System & All cluster nodes must be shut down completely, then restarted, to effect a change in this parameter \\
\hline I & Initial & Data nodes must be restarted using the --initial option \\
\hline
\end{tabular}
\end{table}

\subsection*{25.4.3.7 Defining SQL and Other API Nodes in an NDB Cluster}

The [mysqld] and [api] sections in the config.ini file define the behavior of the MySQL servers (SQL nodes) and other applications (API nodes) used to access cluster data. None of the parameters shown is required. If no computer or host name is provided, any host can use this SQL or API node.

Generally speaking, a [mysqld] section is used to indicate a MySQL server providing an SQL interface to the cluster, and an [api] section is used for applications other than mysqld processes accessing cluster data, but the two designations are actually synonymous; you can, for instance, list parameters for a MySQL server acting as an SQL node in an [api] section.

\section*{Note}

For a discussion of MySQL server options for NDB Cluster, see MySQL Server Options for NDB Cluster. For information about MySQL server system variables relating to NDB Cluster, see NDB Cluster System Variables.
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

The Id is an integer value used to identify the node in all cluster internal messages. The permitted range of values is 1 to 255 inclusive. This value must be unique for each node in the cluster, regardless of the type of node.

\section*{Note}

Data node IDs must be less than 145. If you plan to deploy a large number of data nodes, it is a good idea to limit the node IDs for API nodes (and management nodes) to values greater than 144.

NodeId is the preferred parameter name to use when identifying API nodes. (Id continues to be supported for backward compatibility, but is now deprecated and generates a warning when used. It is also subject to future removal.)
- ConnectionMap

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

Specifies which data nodes to connect.
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

The NodeId is an integer value used to identify the node in all cluster internal messages. The permitted range of values is 1 to 255 inclusive. This value must be unique for each node in the cluster, regardless of the type of node.

\section*{Note}

Data node IDs must be less than 145. If you plan to deploy a large number of data nodes, it is a good idea to limit the node IDs for API nodes (and management nodes) to values greater than 144 .

NodeId is the preferred parameter name to use when identifying management nodes. An alias, Id, was used for this purpose in very old versions of NDB Cluster, and continues to be supported for backward compatibility; it is now deprecated and generates a warning when used, and is subject to removal in a future release of NDB Cluster.
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

This refers to the Id set for one of the computers (hosts) defined in a [computer] section of the configuration file.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4050.jpg?height=100&width=113&top_left_y=2014&top_left_x=333)

\section*{Important}

This parameter is deprecated, and is subject to removal in a future release. Use the HostName parameter instead.

The node ID for this node can be given out only to connections that explicitly request it. A management server that requests "any" node ID cannot use this one. This parameter can be used when running multiple management servers on the same host, and HostName is not sufficient for distinguishing among processes.
- HostName

\begin{tabular}{l|l|l|}
\cline { 2 - 3 } & \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\cline { 2 - 3 } & Type or units & name or IP \\
\hline 4020 & & address \\
\cline { 2 - 3 } & &
\end{tabular}

\begin{tabular}{|l|l|} 
Default & {$[\ldots]$} \\
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

Specifying this parameter defines the hostname of the computer on which the SQL node (API node) is to reside. Use HostName to specify a host name other than localhost.

If no HostName is specified in a given [mysql] or [api] section of the config.ini file, then an SQL or API node may connect using the corresponding "slot" from any host which can establish a network connection to the management server host machine. This differs from the default behavior for data nodes, where localhost is assumed for HostName unless otherwise specified.
- LocationDomainId

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 0 \\
\hline Range & $0-16$ \\
\hline Restart Type & \begin{tabular}{l} 
System \\
Restart: \\
Requires a \\
complete \\
shutdown and \\
restart of the \\
cluster. (NDB \\
8.4.0)
\end{tabular} \\
\hline
\end{tabular}

Assigns an SQL or other API node to a specific availability domain (also known as an availability zone) within a cloud. By informing NDB which nodes are in which availability domains, performance can be improved in a cloud environment in the following ways:
- If requested data is not found on the same node, reads can be directed to another node in the same availability domain.
- Communication between nodes in different availability domains are guaranteed to use NDB transporters' WAN support without any further manual intervention.
- The transporter's group number can be based on which availability domain is used, such that also SQL and other API nodes communicate with local data nodes in the same availability domain whenever possible.
- The arbitrator can be selected from an availability domain in which no data nodes are present, or, if no such availability domain can be found, from a third availability domain.

LocationDomainId takes an integer value between 0 and 16 inclusive, with 0 being the default; using 0 is the same as leaving the parameter unset.
- ArbitrationRank

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type or units & $0-2$ \\
\hline Default & 0 \\
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

This parameter defines which nodes can act as arbitrators. Both management nodes and SQL nodes can be arbitrators. A value of 0 means that the given node is never used as an arbitrator, a value of 1 gives the node high priority as an arbitrator, and a value of 2 gives it low priority. A normal configuration uses the management server as arbitrator, setting its ArbitrationRank to 1 (the default for management nodes) and those for all SQL nodes to 0 (the default for SQL nodes).

By setting ArbitrationRank to 0 on all management and SQL nodes, you can disable arbitration completely. You can also control arbitration by overriding this parameter; to do so, set the Arbitration parameter in the [ndbd default] section of the config.ini global configuration file.
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

Setting this parameter to any other value than 0 (the default) means that responses by the arbitrator to arbitration requests are delayed by the stated number of milliseconds. It is usually not necessary to change this value.
- BatchByteSize

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 16 K \\
\hline Range & $1 \mathrm{~K}-1 \mathrm{M}$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

For queries that are translated into full table scans or range scans on indexes, it is important for best performance to fetch records in properly sized batches. It is possible to set the proper size both in
terms of number of records (BatchSize) and in terms of bytes (BatchByteSize). The actual batch size is limited by both parameters.

The speed at which queries are performed can vary by more than $40 \%$ depending upon how this parameter is set.

This parameter is measured in bytes. The default value is 16 K .
- BatchSize

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & records \\
\hline Default & 256 \\
\hline Range & $1-992$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

This parameter is measured in number of records and is by default set to 256 . The maximum size is 992.
- ExtraSendBufferMemory

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

This parameter specifies the amount of transporter send buffer memory to allocate in addition to any that has been set using TotalSendBufferMemory, SendBufferMemory, or both.
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
rolling restart
\end{tabular}
\end{tabular}
```

\begin{tabular}{|l|l|} 
& \begin{tabular}{l} 
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}
```


Use this parameter to set the scheduling policy and priority of heartbeat threads for management and API nodes. The syntax for setting this parameter is shown here:
```
HeartbeatThreadPriority = policy[, priority]
policy:
    {FIFO | RR}
```


When setting this parameter, you must specify a policy. This is one of FIFO (first in, first in) or RR (round robin). This followed optionally by the priority (an integer).
- MaxScanBatchSize

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & bytes \\
\hline Default & 256 K \\
\hline Range & $32 \mathrm{~K}-16 \mathrm{M}$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

The batch size is the size of each batch sent from each data node. Most scans are performed in parallel to protect the MySQL Server from receiving too much data from many nodes in parallel; this parameter sets a limit to the total batch size over all nodes.

The default value of this parameter is set to 256 KB . Its maximum size is 16 MB .
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

If this parameter is set, its minimum permitted value is 256 KB ; 0 indicates that the parameter has not been set. For more detailed information, see Section 25.4.3.14, "Configuring NDB Cluster Send Buffer Parameters".
- AutoReconnect

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

This parameter is false by default. This forces disconnected API nodes (including MySQL Servers acting as SQL nodes) to use a new connection to the cluster rather than attempting to re-use an existing one, as re-use of connections can cause problems when using dynamically-allocated node IDs. (Bug \#45921)

\section*{Note}

This parameter can be overridden using the NDB API. For more information, see Ndb_cluster_connection::set_auto_reconnect(), and Ndb_cluster_connection::get_auto_reconnect().
- DefaultOperationRedoProblemAction

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & enumeration \\
\hline Default & QUEUE \\
\hline Range & \begin{tabular}{l} 
ABORT, \\
QUEUE
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

This parameter (along with RedoOverCommitLimit and RedoOverCommitCounter) controls the data node's handling of operations when too much time is taken flushing redo logs to disk. This occurs when a given redo log flush takes longer than RedoOverCommitLimit seconds, more than RedoOverCommitCounter times, causing any pending transactions to be aborted.

When this happens, the node can respond in either of two ways, according to the value of DefaultOperationRedoProblemAction, listed here:
- ABORT: Any pending operations from aborted transactions are also aborted.
- QUEUE: Pending operations from transactions that were aborted are queued up to be re-tried. This the default. Pending operations are still aborted when the redo log runs out of space-that is, when P_TAIL_PROBLEM errors occur.
- DefaultHashMapSize

\begin{tabular}{l|l|l|l}
\hline & Version (or & NDB 8.4.0 & \\
\hline & later) & & \\
\cline { 2 - 3 } & &
\end{tabular} 4025

\begin{tabular}{|l|l|} 
Type or units & buckets \\
\hline Default & 3840 \\
\hline Range & $0-3840$ \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a \\
rolling restart \\
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

The size of the table hash maps used by NDB is configurable using this parameter. DefaultHashMapSize can take any of three possible values ( $0,240,3840$ ). These values and their effects are described in the following table.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.16 DefaultHashMapSize parameter values}
\begin{tabular}{|l|l|}
\hline Value & Description / Effect \\
\hline 0 & Use the lowest value set, if any, for this parameter among all data nodes and API nodes in the cluster; if it is not set on any data or API node, use the default value. \\
\hline 240 & Old default hash map size \\
\hline 3840 & Hash map size used by default in NDB 8.4 \\
\hline
\end{tabular}
\end{table}

The original intended use for this parameter was to facilitate upgrades and downgrades to and from older NDB Cluster versions, in which the hash map size differed, due to the fact that this change was not otherwise backward compatible.
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
- ConnectBackoffMaxTime

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
\hline Default & 0 \\
\hline Range & \begin{tabular}{l}
$0-4294967039$ \\
(0xFFFFFEFF)
\end{tabular} \\
\hline Restart Type & \begin{tabular}{l} 
Node Restart: \\
Requires a
\end{tabular} \\
\hline & rolling restart
\end{tabular}

\begin{tabular}{|l|l|} 
& \begin{tabular}{l} 
of the cluster. \\
(NDB 8.4.0)
\end{tabular} \\
\hline
\end{tabular}

In an NDB Cluster with many unstarted data nodes, the value of this parameter can be raised to circumvent connection attempts to data nodes which have not yet begun to function in the cluster, as well as moderate high traffic to management nodes. As long as the API node is not connected to any new data nodes, the value of the StartConnectBackoffMaxTime parameter is applied; otherwise, ConnectBackoffMaxTime is used to determine the length of time in milliseconds to wait between connection attempts.

Time elapsed during node connection attempts is not taken into account when calculating elapsed time for this parameter. The timeout is applied with approximately 100 ms resolution, starting with a 100 ms delay; for each subsequent attempt, the length of this period is doubled until it reaches ConnectBackoffMaxTime milliseconds, up to a maximum of $100000 \mathrm{~ms}(100 \mathrm{~s})$.

Once the API node is connected to a data node and that node reports (in a heartbeat message) that it has connected to other data nodes, connection attempts to those data nodes are no longer affected by this parameter, and are made every 100 ms thereafter until connected. Once a data node has started, it can take up HeartbeatIntervalDbApi for the API node to be notified that this has occurred.
- StartConnectBackoffMaxTime

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & integer \\
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

In an NDB Cluster with many unstarted data nodes, the value of this parameter can be raised to circumvent connection attempts to data nodes which have not yet begun to function in the cluster, as well as moderate high traffic to management nodes. As long as the API node is not connected to any new data nodes, the value of the StartConnectBackoffMaxTime parameter is applied; otherwise, ConnectBackoffMaxTime is used to determine the length of time in milliseconds to wait between connection attempts.

Time elapsed during node connection attempts is not taken into account when calculating elapsed time for this parameter. The timeout is applied with approximately 100 ms resolution, starting with a 100 ms delay; for each subsequent attempt, the length of this period is doubled until it reaches StartConnectBackoffMaxTime milliseconds, up to a maximum of 100000 ms (100s).

Once the API node is connected to a data node and that node reports (in a heartbeat message) that it has connected to other data nodes, connection attempts to those data nodes are no longer affected by this parameter, and are made every 100 ms thereafter until connected. Once a data node has started, it can take up HeartbeatIntervalDbApi for the API node to be notified that this has occurred.

API Node Debugging Parameters. You can use the ApiVerbose configuration parameter to enable debugging output from a given API node. This parameter takes an integer value. 0 is the default, and disables such debugging; 1 enables debugging output to the cluster log; 2 adds DBDICT debugging output as well. (Bug \#20638450) See also DUMP 1229.

You can also obtain information from a MySQL server running as an NDB Cluster SQL node using SHOW STATUS in the mysql client, as shown here:
```
mysql> SHOW STATUS LIKE 'ndb%';
+-------------------------------+---------------+
| Variable_name | Value |
+-------------------------------+----------------+
| Ndb_cluster_node_id | 5
| Ndb_config_from_host | 198.51.100.112 |
| Ndb_config_from_port | 1186
| Ndb_number_of_storage_nodes | 4 |
+-------------------------------+----------------+
4 rows in set (0.02 sec)
```


For information about the status variables appearing in the output from this statement, see NDB Cluster Status Variables.

\section*{Note}

To add new SQL or API nodes to the configuration of a running NDB Cluster, it is necessary to perform a rolling restart of all cluster nodes after adding new [mysqld] or [api] sections to the config.ini file (or files, if you are using more than one management server). This must be done before the new SQL or API nodes can connect to the cluster.

It is not necessary to perform any restart of the cluster if new SQL or API nodes can employ previously unused API slots in the cluster configuration to connect to the cluster.

Restart types. Information about the restart types used by the parameter descriptions in this section is shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.17 NDB Cluster restart types}
\begin{tabular}{|l|l|l|}
\hline Symbol & Restart Type & Description \\
\hline N & Node & The parameter can be updated using a rolling restart (see Section 25.6.5, "Performing a Rolling Restart of an NDB Cluster") \\
\hline S & System & All cluster nodes must be shut down completely, then restarted, to effect a change in this parameter \\
\hline I & Initial & Data nodes must be restarted using the --initial option \\
\hline
\end{tabular}
\end{table}

\subsection*{25.4.3.8 Defining the System}

The [system] section is used for parameters applying to the cluster as a whole. The Name system parameter is used with MySQL Enterprise Monitor; ConfigGenerationNumber and PrimaryMGMNode are not used in production environments. Except when using NDB Cluster with MySQL Enterprise Monitor, is not necessary to have a [system] section in the config. ini file.

More information about these parameters can be found in the following list:
- ConfigGenerationNumber

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
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

Configuration generation number. This parameter is currently unused.
- Name

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

Set a name for the cluster. This parameter is required for deployments with MySQL Enterprise Monitor; it is otherwise unused.

You can obtain the value of this parameter by checking the Ndb_system_name status variable. In NDB API applications, you can also retrieve it using get_system_name().
- PrimaryMGMNode

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
Version (or \\
later)
\end{tabular} & NDB 8.4.0 \\
\hline Type or units & unsigned \\
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

Node ID of the primary management node. This parameter is currently unused.
Restart types. Information about the restart types used by the parameter descriptions in this section is shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.18 NDB Cluster restart types}
\begin{tabular}{|l|l|l|}
\hline Symbol & Restart Type & Description \\
\hline N & Node & \begin{tabular}{l} 
The parameter can be updated \\
using a rolling restart (see \\
Section 25.6.5, "Performing
\end{tabular}
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Symbol & Restart Type & Description \\
\hline & & a Rolling Restart of an NDB Cluster") \\
\hline S & System & All cluster nodes must be shut down completely, then restarted, to effect a change in this parameter \\
\hline I & Initial & Data nodes must be restarted using the --initial option \\
\hline
\end{tabular}

\subsection*{25.4.3.9 MySQL Server Options and Variables for NDB Cluster}

This section provides information about MySQL server options, server and status variables that are specific to NDB Cluster. For general information on using these, and for other options and variables not specific to NDB Cluster, see Section 7.1, "The MySQL Server".

For NDB Cluster configuration parameters used in the cluster configuration file (usually named config.ini), see Section 25.4, "Configuration of NDB Cluster".

