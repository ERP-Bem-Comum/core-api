\section*{Chapter 19 Replication}
Table of Contents
19.1 Configuring Replication ..... 3333
19.1.1 Binary Log File Position Based Replication Configuration Overview ..... 3333
19.1.2 Setting Up Binary Log File Position Based Replication ..... 3334
19.1.3 Replication with Global Transaction Identifiers ..... 3345
19.1.4 Changing GTID Mode on Online Servers ..... 3367
19.1.5 MySQL Multi-Source Replication ..... 3373
19.1.6 Replication and Binary Logging Options and Variables ..... 3378
19.1.7 Common Replication Administration Tasks ..... 3475
19.2 Replication Implementation ..... 3481
19.2.1 Replication Formats ..... 3481
19.2.2 Replication Channels ..... 3489
19.2.3 Replication Threads ..... 3492
19.2.4 Relay Log and Replication Metadata Repositories ..... 3495
19.2.5 How Servers Evaluate Replication Filtering Rules ..... 3502
19.3 Replication Security ..... 3510
19.3.1 Setting Up Replication to Use Encrypted Connections ..... 3511
19.3.2 Encrypting Binary Log Files and Relay Log Files ..... 3513
19.3.3 Replication Privilege Checks ..... 3516
19.4 Replication Solutions ..... 3522
19.4.1 Using Replication for Backups ..... 3523
19.4.2 Handling an Unexpected Halt of a Replica ..... 3526
19.4.3 Monitoring Row-based Replication ..... 3529
19.4.4 Using Replication with Different Source and Replica Storage Engines ..... 3529
19.4.5 Using Replication for Scale-Out ..... 3530
19.4.6 Replicating Different Databases to Different Replicas ..... 3532
19.4.7 Improving Replication Performance ..... 3533
19.4.8 Switching Sources During Failover ..... 3534
19.4.9 Switching Sources and Replicas with Asynchronous Connection Failover ..... 3536
19.4.10 Semisynchronous Replication ..... 3540
19.4.11 Delayed Replication ..... 3545
19.5 Replication Notes and Tips ..... 3547
19.5.1 Replication Features and Issues ..... 3547
19.5.2 Replication Compatibility Between MySQL Versions ..... 3574
19.5.3 Upgrading or Downgrading a Replication Topology ..... 3575
19.5.4 Troubleshooting Replication ..... 3576
19.5.5 How to Report Replication Bugs or Problems ..... 3577

Replication enables data from one MySQL database server (known as a source) to be copied to one or more MySQL database servers (known as replicas). Replication is asynchronous by default; replicas do not need to be connected permanently to receive updates from a source. Depending on the configuration, you can replicate all databases, selected databases, or even selected tables within a database.

Advantages of replication in MySQL include:
- Scale-out solutions - spreading the load among multiple replicas to improve performance. In this environment, all writes and updates must take place on the source server. Reads, however, may take place on one or more replicas. This model can improve the performance of writes (since the source is dedicated to updates), while dramatically increasing read speed across an increasing number of replicas.
- Data security - because the replica can pause the replication process, it is possible to run backup services on the replica without corrupting the corresponding source data.
- Analytics - live data can be created on the source, while the analysis of the information can take place on the replica without affecting the performance of the source.
- Long-distance data distribution - you can use replication to create a local copy of data for a remote site to use, without permanent access to the source.

For information on how to use replication in such scenarios, see Section 19.4, "Replication Solutions".
MySQL 8.4 supports different methods of replication. The traditional method is based on replicating events from the source's binary log, and requires the log files and positions in them to be synchronized between source and replica. The newer method based on global transaction identifiers (GTIDs) is transactional and therefore does not require working with log files or positions within these files, which greatly simplifies many common replication tasks. Replication using GTIDs guarantees consistency between source and replica as long as all transactions committed on the source have also been applied on the replica. For more information about GTIDs and GTID-based replication in MySQL, see Section 19.1.3, "Replication with Global Transaction Identifiers". For information on using binary log file position based replication, see Section 19.1, "Configuring Replication".

Replication in MySQL supports different types of synchronization. The original type of synchronization is one-way, asynchronous replication, in which one server acts as the source, while one or more other servers act as replicas. This is in contrast to the synchronous replication which is a characteristic of NDB Cluster (see Chapter 25, MySQL NDB Cluster 8.4). In MySQL 8.4, semisynchronous replication is supported in addition to the built-in asynchronous replication. With semisynchronous replication, a commit performed on the source blocks before returning to the session that performed the transaction until at least one replica acknowledges that it has received and logged the events for the transaction; see Section 19.4.10, "Semisynchronous Replication". MySQL 8.4 also supports delayed replication such that a replica deliberately lags behind the source by at least a specified amount of time; see Section 19.4.11, "Delayed Replication". For scenarios where synchronous replication is required, use NDB Cluster (see Chapter 25, MySQL NDB Cluster 8.4).

There are a number of solutions available for setting up replication between servers, and the best method to use depends on the presence of data and the engine types you are using. For more information on the available options, see Section 19.1.2, "Setting Up Binary Log File Position Based Replication".

There are two core types of replication format, Statement Based Replication (SBR), which replicates entire SQL statements, and Row Based Replication (RBR), which replicates only the changed rows. You can also use a third variety, Mixed Based Replication (MBR). For more information on the different replication formats, see Section 19.2.1, "Replication Formats".

Replication is controlled through a number of different options and variables. For more information, see Section 19.1.6, "Replication and Binary Logging Options and Variables". Additional security measures can be applied to a replication topology, as described in Section 19.3, "Replication Security".

You can use replication to solve a number of different problems, including performance, supporting the backup of different databases, and as part of a larger solution to alleviate system failures. For information on how to address these issues, see Section 19.4, "Replication Solutions".

For notes and tips on how different data types and statements are treated during replication, including details of replication features, version compatibility, upgrades, and potential problems and their resolution, see Section 19.5, "Replication Notes and Tips". For answers to some questions often asked by those who are new to MySQL Replication, see Section A.14, "MySQL 8.4 FAQ: Replication".

For detailed information on the implementation of replication, how replication works, the process and contents of the binary log, background threads and the rules used to decide how statements are recorded and replicated, see Section 19.2, "Replication Implementation".

\subsection*{19.1 Configuring Replication}

This section describes how to configure the different types of replication available in MySQL and includes the setup and configuration required for a replication environment, including step-by-step instructions for creating a new replication environment. The major components of this section are:
- For a guide to setting up two or more servers for replication using binary log file positions, Section 19.1.2, "Setting Up Binary Log File Position Based Replication", deals with the configuration of the servers and provides methods for copying data between the source and replicas.
- For a guide to setting up two or more servers for replication using GTID transactions, Section 19.1.3, "Replication with Global Transaction Identifiers", deals with the configuration of the servers.
- Events in the binary log are recorded using a number of formats. These are referred to as statementbased replication (SBR) or row-based replication (RBR). A third type, mixed-format replication (MIXED), uses SBR or RBR replication automatically to take advantage of the benefits of both SBR and RBR formats when appropriate. The different formats are discussed in Section 19.2.1, "Replication Formats".
- Detailed information on the different configuration options and variables that apply to replication is provided in Section 19.1.6, "Replication and Binary Logging Options and Variables".
- Once started, the replication process should require little administration or monitoring. However, for advice on common tasks that you may want to execute, see Section 19.1.7, "Common Replication Administration Tasks".

\subsection*{19.1.1 Binary Log File Position Based Replication Configuration Overview}

This section describes replication between MySQL servers based on the binary log file position method, where the MySQL instance operating as the source (where the database changes take place) writes updates and changes as "events" to the binary log. The information in the binary log is stored in different logging formats according to the database changes being recorded. Replicas are configured to read the binary log from the source and to execute the events in the binary log on the replica's local database.

Each replica receives a copy of the entire contents of the binary log. It is the responsibility of the replica to decide which statements in the binary log should be executed. Unless you specify otherwise, all events in the source's binary log are executed on the replica. If required, you can configure the replica to process only events that apply to particular databases or tables.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3363.jpg?height=99&width=106&top_left_y=1941&top_left_x=365)

Important
You cannot configure the source to log only certain events.

Each replica keeps a record of the binary log coordinates: the file name and position within the file that it has read and processed from the source. This means that multiple replicas can be connected to the source and executing different parts of the same binary log. Because the replicas control this process, individual replicas can be connected and disconnected from the server without affecting the source's operation. Also, because each replica records the current position within the binary log, it is possible for replicas to be disconnected, reconnect and then resume processing.

The source and each replica must be configured with a unique ID (using the server_id system variable). In addition, each replica must be configured with information about the source's host name, log file name, and position within that file. These details can be controlled from within a MySQL session using a CHANGE REPLICATION SOURCE TO statement on the replica. The details are stored within the replica's connection metadata repository (see Section 19.2.4, "Relay Log and Replication Metadata Repositories").

\subsection*{19.1.2 Setting Up Binary Log File Position Based Replication}

This section describes how to set up a MySQL server to use binary log file position based replication. There are a number of different methods for setting up replication, and the exact method to use depends on how you are setting up replication, and whether you already have data in the database on the source that you want to replicate.

\section*{Tip}

To deploy multiple instances of MySQL, you can use InnoDB Cluster which enables you to easily administer a group of MySQL server instances in MySQL Shell. InnoDB Cluster wraps MySQL Group Replication in a programmatic environment that enables you easily deploy a cluster of MySQL instances to achieve high availability. In addition, InnoDB Cluster interfaces seamlessly with MySQL Router, which enables your applications to connect to the cluster without writing your own failover process. For similar use cases that do not require high availability, however, you can use InnoDB ReplicaSet. Installation instructions for MySQL Shell can be found here.

There are some generic tasks that are common to all setups:
- On the source, you must ensure that binary logging is enabled, and configure a unique server ID. This might require a server restart. See Section 19.1.2.1, "Setting the Replication Source Configuration".
- On each replica that you want to connect to the source, you must configure a unique server ID. This might require a server restart. See Section 19.1.2.2, "Setting the Replica Configuration".
- Optionally, create a separate user for your replicas to use during authentication with the source when reading the binary log for replication. See Section 19.1.2.3, "Creating a User for Replication".
- Before creating a data snapshot or starting the replication process, on the source you should record the current position in the binary log. You need this information when configuring the replica so that the replica knows where within the binary log to start executing events. See Section 19.1.2.4, "Obtaining the Replication Source Binary Log Coordinates".
- If you already have data on the source and want to use it to synchronize the replica, you need to create a data snapshot to copy the data to the replica. The storage engine you are using has an impact on how you create the snapshot. When you are using MyISAM, you must stop processing statements on the source to obtain a read-lock, then obtain its current binary log coordinates and dump its data, before permitting the source to continue executing statements. If you do not stop the execution of statements, the data dump and the source status information become mismatched, resulting in inconsistent or corrupted databases on the replicas. For more information on replicating a MyISAM source, see Section 19.1.2.4, "Obtaining the Replication Source Binary Log Coordinates". If you are using InnoDB, you do not need a read-lock and a transaction that is long enough to transfer the data snapshot is sufficient. For more information, see Section 17.19, "InnoDB and MySQL Replication".
- Configure the replica with settings for connecting to the source, such as the host name, login credentials, and binary log file name and position. See Section 19.1.2.7, "Setting the Source Configuration on the Replica".
- Implement replication-specific security measures on the sources and replicas as appropriate for your system. See Section 19.3, "Replication Security".

\section*{Note}

Certain steps within the setup process require the SUPER privilege. If you do not have this privilege, it might not be possible to enable replication.

After configuring the basic options, select your scenario:
- To set up replication for a fresh installation of a source and replicas that contain no data, see Setting Up Replication with New Source and Replicas.
- To set up replication of a new source using the data from an existing MySQL server, see Setting Up Replication with Existing Data.
- To add replicas to an existing replication environment, see Section 19.1.2.8, "Adding Replicas to a Replication Environment".

Before administering MySQL replication servers, read this entire chapter and try all statements mentioned in Section 15.4.1, "SQL Statements for Controlling Source Servers", and Section 15.4.2, "SQL Statements for Controlling Replica Servers". Also familiarize yourself with the replication startup options described in Section 19.1.6, "Replication and Binary Logging Options and Variables".

\subsection*{19.1.2.1 Setting the Replication Source Configuration}

To configure a source to use binary log file position based replication, you must ensure that binary logging is enabled, and establish a unique server ID.

Each server within a replication topology must be configured with a unique server ID, which you can specify using the server_id system variable. This server ID is used to identify individual servers within the replication topology, and must be a positive integer between 1 and $\left(2^{32}\right)-1$. The default server_id value is 1; you can change this at runtime by issuing a statement like this one:

SET GLOBAL server_id = 2;
Organization and selection of the server IDs is arbitrary, as long as each server ID is different from every other server ID in use by any other server in the replication topology. Note that if a value of 0 was set previously for the server ID, you must restart the server to initialize the source with your new nonzero server ID. Otherwise, a server restart is not needed when you change the server ID, unless you make other configuration changes that require it.

Binary logging is required on the source because the binary log is the basis for replicating changes from the source to its replicas. Binary logging is enabled by default (the log_bin system variable is set to ON). The --log-bin option tells the server what base name to use for binary log files. It is recommended that you specify this option to give the binary log files a non-default base name, so that if the host name changes, you can easily continue to use the same binary log file names (see Section B.3.7, "Known Issues in MySQL"). If binary logging was previously disabled on the source using the --skip-log-bin option, you must restart the server without this option to enable it.

\section*{Note}

The following options also have an impact on the source:
- For the greatest possible durability and consistency in a replication setup using InnoDB with transactions, you should use innodb_flush_log_at_trx_commit=1 and sync_binlog=1 in the source's my . cnf file.
- Ensure that the skip_networking system variable is not enabled on the source. If networking has been disabled, the replica cannot communicate with the source and replication fails.

\subsection*{19.1.2.2 Setting the Replica Configuration}

Each replica must have a unique server ID, as specified by the server_id system variable. If you are setting up multiple replicas, each one must have a unique server_id value that differs from that of the source and from any of the other replicas. If the replica's server ID is not already set, or the current value conflicts with the value that you have chosen for the source or another replica, you must change it.

The default server_id value is 1 . You can change the server_id value dynamically by issuing a statement like this:

SET GLOBAL server_id = 21;
Note that a value of 0 for the server ID prevents a replica from connecting to a source. If that server ID value (which was the default in earlier releases) was set previously, you must restart the server to initialize the replica with your new nonzero server ID. Otherwise, a server restart is not needed when you change the server ID, unless you make other configuration changes that require it. For example, if binary logging was disabled on the server and you want it enabled for your replica, a server restart is required to enable this.

If you are shutting down the replica server, you can edit the [mysqld] section of the configuration file to specify a unique server ID. For example:
[mysqld]
server-id=21
Binary logging is enabled by default on all servers. A replica is not required to have binary logging enabled for replication to take place. However, binary logging on a replica means that the replica's binary log can be used for data backups and crash recovery. Replicas that have binary logging enabled can also be used as part of a more complex replication topology. For example, you might want to set up replication servers using this chained arrangement:

A -> B -> C
Here, $A$ serves as the source for the replica $B$, and $B$ serves as the source for the replica $C$. For this to work, B must be both a source and a replica. Updates received from A must be logged by B to its binary log, in order to be passed on to C . In addition to binary logging, this replication topology requires the system variable log_replica_updates to be enabled. With replica updates enabled, the replica writes updates that are received from a source and performed by the replica's SQL thread to the replica's own binary log. log_replica_updates is enabled by default.

If you need to disable binary logging or replica update logging on a replica, you can do this by specifying the --skip-log-bin and --log-replica-updates=OFF options for the replica. If you decide to re-enable these features on the replica, remove the relevant options and restart the server.

\subsection*{19.1.2.3 Creating a User for Replication}

Each replica connects to the source using a MySQL user name and password, so there must be a user account on the source that the replica can use to connect. The user name is specified by the SOURCE_USER option of the CHANGE REPLICATION SOURCE TO statement when you set up a replica. Any account can be used for this operation, providing it has been granted the REPLICATION SLAVE privilege. You can choose to create a different account for each replica, or connect to the source using the same account for each replica.

Although you do not have to create an account specifically for replication, you should be aware that the replication user name and password are stored in plain text in the replica's connection metadata repository mysql.slave_master_info (see Section 19.2.4.2, "Replication Metadata Repositories"). Therefore, you may want to create a separate account that has privileges only for the replication process, to minimize the possibility of compromise to other accounts.

To create a new account, use CREATE USER. To grant this account the privileges required for replication, use the GRANT statement. If you create an account solely for the purposes of replication, that account needs only the REPLICATION SLAVE privilege. For example, to set up a new user, repl, that can connect for replication from any host within the example.com domain, issue these statements on the source:
mysql> CREATE USER 'repl'@'\%.example.com' IDENTIFIED BY 'password';
mysql> GRANT REPLICATION SLAVE ON *.* TO 'repl'@'\%.example.com';
See Section 15.7.1, "Account Management Statements", for more information on statements for manipulation of user accounts.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3367.jpg?height=104&width=106&top_left_y=264&top_left_x=365)

\section*{Important}

To connect to the source using a user account that authenticates with the caching_sha2_password plugin, you must either set up a secure connection as described in Section 19.3.1, "Setting Up Replication to Use Encrypted Connections", or enable the unencrypted connection to support password exchange using an RSA key pair. The caching_sha2_password authentication plugin is the default for new users (see Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication"). If the user account that you create or use for replication (as specified by the SOURCE_USER option) uses this authentication plugin, and you are not using a secure connection, you must enable RSA key pair-based password exchange for a successful connection.

\subsection*{19.1.2.4 Obtaining the Replication Source Binary Log Coordinates}

To configure the replica to start the replication process at the correct point, you need to note the source's current coordinates within its binary log.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3367.jpg?height=125&width=108&top_left_y=961&top_left_x=365)

\section*{Warning \\ This procedure uses FLUSH TABLES WITH READ LOCK, which blocks COMMIT operations for InnoDB tables.}

If you are planning to shut down the source to create a data snapshot, you can optionally skip this procedure and instead store a copy of the binary log index file along with the data snapshot. In that situation, the source creates a new binary log file on restart. The source binary log coordinates where the replica must start the replication process are therefore the start of that new file, which is the next binary log file on the source following after the files that are listed in the copied binary log index file.

To obtain the source binary log coordinates, follow these steps:
1. Start a session on the source by connecting to it with the command-line client, and flush all tables and block write statements by executing the FLUSH TABLES WITH READ LOCK statement:
```
mysql> FLUSH TABLES WITH READ LOCK;
```


\section*{Warning}

Leave the client from which you issued the FLUSH TABLES statement running so that the read lock remains in effect. If you exit the client, the lock is released.
2. In a different session on the source, use the SHOW BINARY LOG STATUS statement to determine the current binary log file name and position:
```
mysql> SHOW BINARY LOG STATUS\G
************************** 1. row
            File: mysql-bin.000003
        Position: 73
    Binlog_Do_DB: test
    Binlog_Ignore_DB: manual, mysql
Executed_Gtid_Set: 3E11FA47-71CA-11E1-9E33-C80AA9429562:1-5
1 row in set (0.00 sec)
```


The File column shows the name of the log file and the Position column shows the position within the file. In this example, the binary log file is mysql-bin. 000003 and the position is 73. Record these values. You need them later when you are setting up the replica. They represent the replication coordinates at which the replica should begin processing new updates from the source.

If the source has been running previously with binary logging disabled, the log file name and position values displayed by SHOW BINARY LOG STATUS or mysqldump --source-data are empty. In that case, the values that you need to use later when specifying the source's binary log file and position are the empty string ( ' ' ) and 4.

You now have the information you need to enable the replica to start reading from the source's binary log in the correct place to start replication.

The next step depends on whether you have existing data on the source. Choose one of the following options:
- If you have existing data that needs be to synchronized with the replica before you start replication, leave the client running so that the lock remains in place. This prevents any further changes being made, so that the data copied to the replica is in synchrony with the source. Proceed to Section 19.1.2.5, "Choosing a Method for Data Snapshots".
- If you are setting up a new source and replica combination, you can exit the first session to release the read lock. See Setting Up Replication with New Source and Replicas for how to proceed.

\subsection*{19.1.2.5 Choosing a Method for Data Snapshots}

If the source database contains existing data it is necessary to copy this data to each replica. There are different ways to dump the data from the source database. The following sections describe possible options.

To select the appropriate method of dumping the database, choose between these options:
- Use the mysqldump tool to create a dump of all the databases you want to replicate. This is the recommended method, especially when using InnodB.
- If your database is stored in binary portable files, you can copy the raw data files to a replica. This can be more efficient than using mysqldump and importing the file on each replica, because it skips the overhead of updating indexes as the INSERT statements are replayed. With storage engines such as InnoDB this is not recommended.
- Use MySQL Server's clone plugin to transfer all the data from an existing replica to a clone. For instructions to use this method, see Section 7.6.7.7, "Cloning for Replication".

\section*{Tip}

To deploy multiple instances of MySQL, you can use InnoDB Cluster which enables you to easily administer a group of MySQL server instances in MySQL Shell. InnoDB Cluster wraps MySQL Group Replication in a programmatic environment that enables you easily deploy a cluster of MySQL instances to achieve high availability. In addition, InnoDB Cluster interfaces seamlessly with MySQL Router, which enables your applications to connect to the cluster without writing your own failover process. For similar use cases that do not require high availability, however, you can use InnoDB ReplicaSet. Installation instructions for MySQL Shell can be found here.

\section*{Creating a Data Snapshot Using mysqldump}

To create a snapshot of the data in an existing source database, use the mysqldump tool. Once the data dump has been completed, import this data into the replica before starting the replication process.

The following example dumps all databases to a file named dbdump.db, and includes the --sourcedata option which automatically appends the CHANGE REPLICATION SOURCE TO statement required on the replica to start the replication process:
```
$> mysqldump --all-databases --source-data > dbdump.db
```


\section*{Note}

If you do not use--source-data, then it is necessary to lock all tables in a separate session manually. See Section 19.1.2.4, "Obtaining the Replication Source Binary Log Coordinates".

It is possible to exclude certain databases from the dump using the mysqldump tool. If you want to choose which databases to include in the dump, do not use --all-databases. Choose one of these options:
- Exclude all the tables in the database using --ignore-table option.
- Name only those databases which you want dumped using the --databases option.

> Note
> By default, if GTIDs are in use on the source (gtid_mode=0N), mysqldump includes the GTIDs from the gtid_executed set on the source in the dump output to add them to the gtid_purged set on the replica. If you are dumping only specific databases or tables, it is important to note that the value that is included by mysqldump includes the GTIDs of all transactions in the gtid_executed set on the source, even those that changed suppressed parts of the database, or other databases on the server that were not included in the partial dump. Check the description for mysqldump's --set-gtidpurged option to find the outcome of the default behavior for the MySQL Server versions you are using, and how to change the behavior if this outcome is not suitable for your situation.

For more information, see Section 6.5.4, "mysqldump - A Database Backup Program".
To import the data, either copy the dump file to the replica, or access the file from the source when connecting remotely to the replica.

\section*{Creating a Data Snapshot Using Raw Data Files}

This section describes how to create a data snapshot using the raw files which make up the database. Employing this method with a table using a storage engine that has complex caching or logging algorithms requires extra steps to produce a perfect "point in time" snapshot: the initial copy command could leave out cache information and logging updates, even if you have acquired a global read lock. How the storage engine responds to this depends on its crash recovery abilities.

If you use InnoDB tables, you can use the mysqlbackup command from the MySQL Enterprise Backup component to produce a consistent snapshot. This command records the log name and offset corresponding to the snapshot to be used on the replica. MySQL Enterprise Backup is a commercial product that is included as part of a MySQL Enterprise subscription. See Section 32.1, "MySQL Enterprise Backup Overview" for detailed information.

This method also does not work reliably if the source and replica have different values for ft_stopword_file,ft_min_word_len, or ft_max_word_len and you are copying tables having full-text indexes.

Assuming the above exceptions do not apply to your database, use the cold backup technique to obtain a reliable binary snapshot of InnoDB tables: do a slow shutdown of the MySQL Server, then copy the data files manually.

To create a raw data snapshot of MyISAM tables when your MySQL data files exist on a single file system, you can use standard file copy tools such as cp or copy, a remote copy tool such as scp or rsync, an archiving tool such as zip or tar, or a file system snapshot tool such as dump. If you are replicating only certain databases, copy only those files that relate to those tables. For InnoDB, all tables in all databases are stored in the system tablespace files, unless you have the innodb_file_per_table option enabled.

The following files are not required for replication:
- Files relating to the mysql database.
- The replica's connection metadata repository file master. info, if used; the use of this file is now deprecated (see Section 19.2.4, "Relay Log and Replication Metadata Repositories").
- The source's binary log files, with the exception of the binary log index file if you are going to use this to locate the source binary log coordinates for the replica.
- Any relay log files.

Depending on whether you are using InnoDB tables or not, choose one of the following:
If you are using InnoDB tables, and also to get the most consistent results with a raw data snapshot, shut down the source server during the process, as follows:
1. Acquire a read lock and get the source's status. See Section 19.1.2.4, "Obtaining the Replication Source Binary Log Coordinates".
2. In a separate session, shut down the source server:
\$> mysqladmin shutdown
3. Make a copy of the MySQL data files. The following examples show common ways to do this. You need to choose only one of them:
```
$> tar cf /tmp/db.tar ./data
$> zip -r /tmp/db.zip ./data
$> rsync --recursive ./data /tmp/dbdata
```

4. Restart the source server.

If you are not using InnoDB tables, you can get a snapshot of the system from a source without shutting down the server as described in the following steps:
1. Acquire a read lock and get the source's status. See Section 19.1.2.4, "Obtaining the Replication Source Binary Log Coordinates".
2. Make a copy of the MySQL data files. The following examples show common ways to do this. You need to choose only one of them:
```
$> tar cf /tmp/db.tar ./data
$> zip -r /tmp/db.zip ./data
$> rsync --recursive ./data /tmp/dbdata
```

3. In the client where you acquired the read lock, release the lock:
```
mysql> UNLOCK TABLES;
```


Once you have created the archive or copy of the database, copy the files to each replica before starting the replication process.

\subsection*{19.1.2.6 Setting Up Replicas}

The following sections describe how to set up replicas. Before you proceed, ensure that you have:
- Configured the source with the necessary configuration properties. See Section 19.1.2.1, "Setting the Replication Source Configuration".
- Obtained the source status information, or a copy of the source's binary log index file made during a shutdown for the data snapshot. See Section 19.1.2.4, "Obtaining the Replication Source Binary Log Coordinates".
- On the source, released the read lock:
```
mysql> UNLOCK TABLES;
```

- On the replica, edited the MySQL configuration. See Section 19.1.2.2, "Setting the Replica Configuration".

The next steps depend on whether you have existing data to import to the replica or not. See Section 19.1.2.5, "Choosing a Method for Data Snapshots" for more information. Choose one of the following:
- If you do not have a snapshot of a database to import, see Setting Up Replication with New Source and Replicas.
- If you have a snapshot of a database to import, see Setting Up Replication with Existing Data.

\section*{Setting Up Replication with New Source and Replicas}

When there is no snapshot of a previous database to import, configure the replica to start replication from the new source.

To set up replication between a source and a new replica:
1. Start up the replica.
2. Execute a CHANGE REPLICATION SOURCE TO statement on the replica to set the source configuration. See Section 19.1.2.7, "Setting the Source Configuration on the Replica".

Perform these replica setup steps on each replica.
This method can also be used if you are setting up new servers but have an existing dump of the databases from a different server that you want to load into your replication configuration. By loading the data into a new source, the data is automatically replicated to the replicas.

If you are setting up a new replication environment using the data from a different existing database server to create a new source, run the dump file generated from that server on the new source. The database updates are automatically propagated to the replicas:
\$> mysql -h source < fulldb.dump

\section*{Setting Up Replication with Existing Data}

When setting up replication with existing data, transfer the snapshot from the source to the replica before starting replication. The process for importing data to the replica depends on how you created the snapshot of data on the source.

\begin{abstract}
Tip
To deploy multiple instances of MySQL, you can use InnoDB Cluster which enables you to easily administer a group of MySQL server instances in MySQL Shell. InnoDB Cluster wraps MySQL Group Replication in a programmatic environment that enables you easily deploy a cluster of MySQL instances to achieve high availability. In addition, InnoDB Cluster interfaces seamlessly with MySQL Router, which enables your applications to connect to the cluster without writing your own failover process. For similar use cases that do not require high availability, however, you can use InnoDB ReplicaSet. Installation instructions for MySQL Shell can be found here.

\section*{Note}

If the replication source server or existing replica that you are copying to create the new replica has any scheduled events, ensure that these are disabled on the new replica before you start it. If an event runs on the new replica that has already run on the source, the duplicated operation causes an error. The Event Scheduler is controlled by the event_scheduler system variable (default ON), so events that are active on the original server run by default when the new replica starts up. To stop all events from running on the new replica, set the event_scheduler system variable to OFF or DISABLED on the new replica. Alternatively, you can use the ALTER EVENT statement to set individual events to DISABLE or DISABLE ON REPLICA to prevent them from
\end{abstract}

Irunning on the new replica. You can list the events on a server using the SHOW statement or the Information Schema EVENTS table. For more information, see Section 19.5.1.16, "Replication of Invoked Features".

As an alternative to creating a new replica in this way, MySQL Server's clone plugin can be used to transfer all the data and replication settings from an existing replica to a clone. For instructions to use this method, see Section 7.6.7.7, "Cloning for Replication".

Follow this procedure to set up replication with existing data:
1. If you used MySQL Server's clone plugin to create a clone from an existing replica (see Section 7.6.7.7, "Cloning for Replication"), the data is already transferred. Otherwise, import the data to the replica using one of the following methods.
a. If you used mysqldump, start the replica server, ensuring that replication does not start by starting the server with--skip-replica-start. Then import the dump file:
```
$> mysql < fulldb.dump
```

b. If you created a snapshot using the raw data files, extract the data files into your replica's data directory. For example:
```
$> tar xvf dbdump.tar
```


You may need to set permissions and ownership on the files so that the replica server can access and modify them. Then start the replica server, ensuring that replication does not start by using--skip-replica-start.
2. Configure the replica with the replication coordinates from the source. This tells the replica the binary log file and position within the file where replication needs to start. Also, configure the replica with the login credentials and host name of the source. For more information on the CHANGE REPLICATION SOURCE TO statement required, see Section 19.1.2.7, "Setting the Source Configuration on the Replica".
3. Start the replication threads by issuing a START REPLICA statement.

After you have performed this procedure, the replica connects to the source and replicates any updates that have occurred on the source since the snapshot was taken. Error messages are issued to the replica's error log if it is not able to replicate for any reason.

The replica uses information logged in its connection metadata repository and applier metadata repository to keep track of how much of the source's binary log it has processed. By default, these repositories are tables named slave_master_info and slave_relay_log_info in the mysql database. Do not remove or edit these tables unless you know exactly what you are doing and fully understand the implications. Even in that case, it is preferred that you use the CHANGE REPLICATION SOURCE TO statement to change replication parameters. The replica uses the values specified in the statement to update the replication metadata repositories automatically. See Section 19.2.4, "Relay Log and Replication Metadata Repositories", for more information.

\section*{Note}

The contents of the replica's connection metadata repository override some of the server options specified on the command line or in my.cnf. See Section 19.1.6, "Replication and Binary Logging Options and Variables", for more details.

A single snapshot of the source suffices for multiple replicas. To set up additional replicas, use the same source snapshot and follow the replica portion of the procedure just described.

\subsection*{19.1.2.7 Setting the Source Configuration on the Replica}

To set up the replica to communicate with the source for replication, configure the replica with the necessary connection information. To do this, on the replica, execute the following CHANGE

REPLICATION SOURCE TO statement, replacing the option values with the actual values relevant to your system:
```
mysql> CHANGE REPLICATION SOURCE TO
    -> SOURCE_HOST='source_host_name',
    -> SOURCE_USER='replication_user_name',
    -> SOURCE_PASSWORD='replication_password',
    -> SOURCE_LOG_FILE='recorded_log_file_name',
    -> SOURCE_LOG_POS=recorded_log_position;
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3373.jpg?height=168&width=263&top_left_y=593&top_left_x=370)

Note
Replication cannot use Unix socket files. You must be able to connect to the source MySQL server using TCP/IP.

The CHANGE REPLICATION SOURCE TO statement has other options as well. For example, it is possible to set up secure replication using SSL. For a full list of options, and information about the maximum permissible length for the string-valued options, see Section 15.4.2.2, "CHANGE REPLICATION SOURCE TO Statement".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3373.jpg?height=117&width=104&top_left_y=982&top_left_x=365)

\section*{Important}

As noted in Section 19.1.2.3, "Creating a User for Replication", if you are not using a secure connection and the user account named in the SOURCE_USER option authenticates with the caching_sha2_password plugin (the default in MySQL 8.4), you must specify the SOURCE_PUBLIC_KEY_PATH or GET_SOURCE_PUBLIC_KEY option in the CHANGE REPLICATION SOURCE TO statement to enable RSA key pair-based password exchange.

\subsection*{19.1.2.8 Adding Replicas to a Replication Environment}

You can add another replica to an existing replication configuration without stopping the source server. To do this, you can set up the new replica by copying the data directory of an existing replica, and giving the new replica a different server ID (which is user-specified) and server UUID (which is generated at startup).

> Note
> If the replication source server or existing replica that you are copying to create the new replica has any scheduled events, ensure that these are disabled on the new replica before you start it. If an event runs on the new replica that has already run on the source, the duplicated operation causes an error. The Event Scheduler is controlled by the event_scheduler system variable, which defaults to ON, so events that are active on the original server run by default when the new replica starts up. To stop all events from running on the new replica, set the event_scheduler system variable to OFF or DISABLED on the new replica. Alternatively, you can use the ALTER EVENT statement to set individual events to DISABLE or DISABLE ON REPLICA to prevent them from running on the new replica. You can list the events on a server using the SHOW statement or the Information Schema EVENTS table. For more information, see Section 19.5.1.16, "Replication of Invoked Features".

As an alternative to creating a new replica in this way, MySQL Server's clone plugin can be used to transfer all the data and replication settings from an existing replica to a clone. For instructions to use this method, see Section 7.6.7.7, "Cloning for Replication".

To duplicate an existing replica without cloning, follow these steps:
1. Stop the existing replica and record the replica status information, particularly the source binary log file and relay log file positions. You can view the replica status either in the Performance Schema replication tables (see Section 29.12.11, "Performance Schema Replication Tables"), or by issuing SHOW REPLICA STATUS as follows:
```
mysql> STOP REPLICA;
mysql> SHOW REPLICA STATUS\G
```

2. Shut down the existing replica:
```
$> mysqladmin shutdown
```

3. Copy the data directory from the existing replica to the new replica, including the log files and relay log files. You can do this by creating an archive using tar or WinZip, or by performing a direct copy using a tool such as cp or rsync.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3374.jpg?height=100&width=106&top_left_y=689&top_left_x=356)

\section*{Important}
- Before copying, verify that all the files relating to the existing replica actually are stored in the data directory. For example, the InnoDB system tablespace, undo tablespace, and redo log might be stored in an alternative location. InnoDB tablespace files and file-per-table tablespaces might have been created in other directories. The binary logs and relay logs for the replica might be in their own directories outside the data directory. Check through the system variables that are set for the existing replica and look for any alternative paths that have been specified. If you find any, copy these directories over as well.
- During copying, if files have been used for the replication metadata repositories (see Section 19.2.4, "Relay Log and Replication Metadata Repositories"), ensure that you also copy these files from the existing replica to the new replica. If tables have been used for the repositories (the default, the tables are in the data directory.
- After copying, delete the auto. cnf file from the copy of the data directory on the new replica, so that the new replica is started with a different generated server UUID. The server UUID must be unique.

A common problem that is encountered when adding new replicas is that the new replica fails with a series of warning and error messages like these:
```
071118 16:44:10 [Warning] Neither --relay-log nor --relay-log-index were used; so
replication may break when this MySQL server acts as a replica and has his hostname
changed!! Please use '--relay-log=new_replica_hostname-relay-bin' to avoid this problem.
071118 16:44:10 [ERROR] Failed to open the relay log './old_replica_hostname-relay-bin.003525'
(relay_log_pos 22940879)
071118 16:44:10 [ERROR] Could not find target log during relay log initialization
071118 16:44:10 [ERROR] Failed to initialize the master info structure
```


This situation can occur if the relay_log system variable is not specified, as the relay log files contain the host name as part of their file names. This is also true of the relay log index file if the relay_log_index system variable is not used. For more information about these variables, see Section 19.1.6, "Replication and Binary Logging Options and Variables".

To avoid this problem, use the same value for relay_log on the new replica that was used on the existing replica. If this option was not set explicitly on the existing replica, use existing_replica_hostname-relay-bin. If this is not possible, copy the existing replica's relay log index file to the new replica and set the relay_log_index system variable on the new replica to match what was used on the existing replica. If this option was not set explicitly on the existing replica, use existing_replica_hostname-relay-bin.index. Alternatively, if you
have already tried to start the new replica after following the remaining steps in this section and have encountered errors like those described previously, then perform the following steps:
a. If you have not already done so, issue STOP REPLICA on the new replica.

If you have already started the existing replica again, issue STOP REPLICA on the existing replica as well.
b. Copy the contents of the existing replica's relay log index file into the new replica's relay log index file, making sure to overwrite any content already in the file.
c. Proceed with the remaining steps in this section.
4. When copying is complete, restart the existing replica.
5. On the new replica, edit the configuration and give the new replica a unique server ID (using the server_id system variable) that is not used by the source or any of the existing replicas.
6. Start the new replica server, ensuring that replication does not start yet by specifying --skip-replica-start. Use the Performance Schema replication tables or issue SHOW REPLICA STATUS to confirm that the new replica has the correct settings when compared with the existing replica. Also display the server ID and server UUID and verify that these are correct and unique for the new replica.
7. Start the replica threads by issuing a START REPLICA statement. The new replica now uses the information in its connection metadata repository to start the replication process.

\subsection*{19.1.3 Replication with Global Transaction Identifiers}

This section explains transaction-based replication using global transaction identifiers (GTIDs). When using GTIDs, each transaction can be identified and tracked as it is committed on the originating server and applied by any replicas; this means that it is not necessary when using GTIDs to refer to log files or positions within those files when starting a new replica or failing over to a new source, which greatly simplifies these tasks. Because GTID-based replication is completely transaction-based, it is simple to determine whether sources and replicas are consistent; as long as all transactions committed on a source are also committed on a replica, consistency between the two is guaranteed. You can use either statement-based or row-based replication with GTIDs (see Section 19.2.1, "Replication Formats"); however, for best results, we recommend that you use the row-based format.

GTIDs are always preserved between source and replica. This means that you can always determine the source for any transaction applied on any replica by examining its binary log. In addition, once a transaction with a given GTID is committed on a given server, any subsequent transaction having the same GTID is ignored by that server. Thus, a transaction committed on the source can be applied no more than once on the replica, which helps to guarantee consistency.

This section discusses the following topics:
- How GTIDs are defined and created, and how they are represented in a MySQL server (see Section 19.1.3.1, "GTID Format and Storage").
- The life cycle of a GTID (see Section 19.1.3.2, "GTID Life Cycle").
- The auto-positioning function for synchronizing a replica and source that use GTIDs (see Section 19.1.3.3, "GTID Auto-Positioning").
- A general procedure for setting up and starting GTID-based replication (see Section 19.1.3.4, "Setting Up Replication Using GTIDs").
- Suggested methods for provisioning new replication servers when using GTIDs (see Section 19.1.3.5, "Using GTIDs for Failover and Scaleout").
- Restrictions and limitations that you should be aware of when using GTID-based replication (see Section 19.1.3.7, "Restrictions on Replication with GTIDs").
- Stored functions that you can use to work with GTIDs (see Section 19.1.3.8, "Stored Function Examples to Manipulate GTIDs").

For information about MySQL Server options and variables relating to GTID-based replication, see Section 19.1.6.5, "Global Transaction ID System Variables". See also Section 14.18.2, "Functions Used with Global Transaction Identifiers (GTIDs)", which describes SQL functions supported by MySQL 8.4 for use with GTIDs.

\subsection*{19.1.3.1 GTID Format and Storage}

A global transaction identifier (GTID) is a unique identifier created and associated with each transaction committed on the server of origin (the source). This identifier is unique not only to the server on which it originated, but is unique across all servers in a given replication topology.

GTID assignment distinguishes between client transactions, which are committed on the source, and replicated transactions, which are reproduced on a replica. When a client transaction is committed on the source, it is assigned a new GTID, provided that the transaction was written to the binary log. Client transactions are guaranteed to have monotonically increasing GTIDs without gaps between the generated numbers. If a client transaction is not written to the binary log (for example, because the transaction was filtered out, or the transaction was read-only), it is not assigned a GTID on the server of origin.

Replicated transactions retain the same GTID that was assigned to the transaction on the server of origin. The GTID is present before the replicated transaction begins to execute, and is persisted even if the replicated transaction is not written to the binary log on the replica, or is filtered out on the replica. The mysql.gtid_executed system table is used to preserve the assigned GTIDs of all the transactions applied on a MySQL server, except those that are stored in a currently active binary log file.

The auto-skip function for GTIDs means that a transaction committed on the source can be applied no more than once on the replica, which helps to guarantee consistency. Once a transaction with a given GTID has been committed on a given server, any attempt to execute a subsequent transaction with the same GTID is ignored by that server. No error is raised, and no statement in the transaction is executed.

If a transaction with a given GTID has started to execute on a server, but has not yet committed or rolled back, any attempt to start a concurrent transaction on the server with the same GTID blocks. The server neither begins to execute the concurrent transaction nor returns control to the client. Once the first attempt at the transaction commits or rolls back, concurrent sessions that were blocking on the same GTID may proceed. If the first attempt rolled back, one concurrent session proceeds to attempt the transaction, and any other concurrent sessions that were blocking on the same GTID remain blocked. If the first attempt committed, all the concurrent sessions stop being blocked, and auto-skip all the statements of the transaction.

A GTID is represented as a pair of coordinates, separated by a colon character (:), as shown here:
GTID = source_id:transaction_id
The source_id identifies the originating server. Normally, the source's server_uuid is used for this purpose. The transaction_id is a sequence number determined by the order in which the transaction was committed on the source. For example, the first transaction to be committed has 1 as its transaction_id, and the tenth transaction to be committed on the same originating server is assigned a transaction_id of 10. It is not possible for a transaction to have 0 as a sequence number in a GTID. For example, the twenty-third transaction to be committed originally on the server with the UUID 3E11FA47-71CA-11E1-9E33-C80AA9429562 has this GTID:

3E11FA47-71CA-11E1-9E33-C80AA9429562:23
The upper limit for sequence numbers for GTIDs on a server instance is the number of non-negative values for a signed 64-bit integer ( $2^{63}-1$, or 9223372036854775807 ). If the server runs out of

GTIDs, it takes the action specified by binlog_error_action. A warning message is issued when the server instance is approaching the limit.

MySQL 8.4 also supports tagged GTIDs. A tagged GTID consists of three parts, separated by colon characters, as shown here:

GTID = source_id:tag:transaction_id
In this case, the source_id and transaction_id are as defined previously. The tag is a userdefined string used to identify a specific group of transactions; see the description of the gtid_next system variable for permitted syntax. Example: the one-hundred-seventeenth transaction to be committed originally on the server with the UUID ed102faf-eb00-11eb-8f20-0c5415bfaa1d and the tag Domain_1 has this GTID:
ed102faf-eb00-11eb-8f20-0c5415bfaa1d:Domain_1:117
The GTID for a transaction is shown in the output from mysqlbinlog, and it is used to identify an individual transaction in the Performance Schema replication status tables, for example, replication_applier_status_by_worker. The value stored by the gtid_next system variable (@@GLOBAL.gtid_next) is a single GTID.

\section*{GTID Sets}

A GTID set is a set comprising one or more single GTIDs or ranges of GTIDs. GTID sets are used in a MySQL server in several ways. For example, the values stored by the gtid_executed and gtid_purged system variables are GTID sets. The START REPLICA options UNTIL SQL_BEFORE_GTIDS and UNTIL SQL_AFTER_GTIDS can be used to make a replica process transactions only up to the first GTID in a GTID set, or stop after the last GTID in a GTID set. The builtin functions GTID_SUBSET( ) and GTID_SUBTRACT( ) require GTID sets as input.

A range of GTIDs originating from the same server can be collapsed into a single expression, as shown here:

3E11FA47-71CA-11E1-9E33-C80AA9429562:1-5
The above example represents the first through fifth transactions originating on the MySQL server whose server_uuid is 3E11FA47-71CA-11E1-9E33-C80AA9429562. Multiple single GTIDs or ranges of GTIDs originating from the same server can also be included in a single expression, with the GTIDs or ranges separated by colons, as in the following example:

3E11FA47-71CA-11E1-9E33-C80AA9429562:1-3:11:47-49
A GTID set can include any combination of single GTIDs and ranges of GTIDs, and it can include GTIDs originating from different servers. This example shows the GTID set stored in the gtid_executed system variable (@@GLOBAL.gtid_executed) of a replica that has applied transactions from more than one source:

2174B383-5441-11E8-B90A-C80AA9429562:1-3, 24DA167-0C0C-11E8-8442-00059A3C7B00:1-19
When GTID sets are returned from server variables, UUIDs are in alphabetical order, and numeric intervals are merged and in ascending order.

When constructing a GTID set, a user-defined tag is treated as part of the UUID. This means that multiple GTIDs originating from the same server and having the same tag can be included in a single expression, as shown in this example:

3E11FA47-71CA-11E1-9E33-C80AA9429562: Domain_1:1-3:11:47-49
GTIDs originating from the same server but having different tags can also be combined, like this:
3E11FA47-71CA-11E1-9E33-C80AA9429562: Domain_1:1-3:15-21: Domain_2:8-52
The complete syntax for a GTID set is as follows:
gtid_set:
```
    uuid_set [, uuid_set] ...
    | ''
uuid_set:
    uuid:[tag:]interval[:[tag:]interval]...
uuid:
    hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh
h:
    [0-9|A-F]
tag:
    [a-zA-Z_][a-zA-Z0-9_]{0,31}
interval:
    m[-n]
    (m >= 1; n > m)
```


\section*{mysql.gtid_executed Table}

GTIDs are stored in a table named gtid_executed, in the mysql database. A row in this table contains, for each GTID or set of GTIDs that it represents, the UUID of the originating server, the userdefined tag (if there is one), and the starting and ending transaction IDs of the set; for a row referencing only a single GTID, these last two values are the same.

The mysql.gtid_executed table is created (if it does not already exist) when MySQL Server is installed or upgraded, using a CREATE TABLE statement similar to that shown here:
```
CREATE TABLE gtid_executed (
    source_uuid CHAR(36) NOT NULL,
    interval_start BIGINT NOT NULL,
    interval_end BIGINT NOT NULL,
    gtid_tag CHAR(32) NOT NULL,
    PRIMARY KEY (source_uuid, gtid_tag, interval_start)
);
```


Warning
As with other MySQL system tables, do not attempt to create or modify this table yourself.

The mysql.gtid_executed table is provided for internal use by the MySQL server. It enables a replica to use GTIDs when binary logging is disabled on the replica, and it enables retention of the GTID state when the binary logs have been lost. Note that the mysql.gtid_executed table is cleared if you issue RESET BINARY LOGS AND GTIDS.

GTIDs are stored in the mysql.gtid_executed table only when gtid_mode is ON or ON_PERMISSIVE. If binary logging is disabled (log_bin is OFF), or if log_replica_updates is disabled, the server stores the GTID belonging to each transaction together with the transaction in the buffer when the transaction is committed, and the background thread adds the contents of the buffer periodically as one or more entries to the mysql.gtid_executed table. In addition, the table is compressed periodically at a user-configurable rate, as described in mysql.gtid_executed Table Compression.

If binary logging is enabled (log_bin is ON), for the InnoDB storage engine only, the server updates the mysql.gtid_executed table in the same way as when binary logging or replica update logging is disabled, storing the GTID for each transaction at transaction commit time. For other storage engines, the server updates the mysql.gtid_executed table only when the binary log is rotated or the server is shut down. At these times, the server writes GTIDs for all transactions that were written into the previous binary log into the mysql.gtid_executed table.

If the mysql.gtid_executed table cannot be accessed for writes, and the binary log file is rotated for any reason other than reaching the maximum file size (max_binlog_size), the current binary log
file continues to be used. An error message is returned to the client that requested the rotation, and a warning is logged on the server. If the mysql.gtid_executed table cannot be accessed for writes and max_binlog_size is reached, the server responds according to its binlog_error_action setting. If IGNORE_ERROR is set, an error is logged on the server and binary logging is halted, or if ABORT_SERVER is set, the server shuts down.

\section*{mysql.gtid_executed Table Compression}

Over the course of time, the mysql.gtid_executed table can become filled with many rows referring to individual GTIDs that originate on the same server, have the same GTID tag (if any), and whose transaction IDs make up a range, similar to what is shown here:
```
+----------------------------------------+----------------+-----------------------

\begin{tabular}{|l|l|l|l|}
\hline source_uuid & interval_start & interval_end & gtid_tag \\
\hline 3E11FA47-71CA-11E1-9E33-C80AA9429562 & 31 & 31 & Domain_1 \\
\hline 3E11FA47-71CA-11E1-9E33-C80AA9429562 & 32 & 32 & Domain_1 \\
\hline 3E11FA47-71CA-11E1-9E33-C80AA9429562 & 33 & 33 & Domain_1 \\
\hline 3E11FA47-71CA-11E1-9E33-C80AA9429562 & 34 & 34 & Domain_1 \\
\hline 3E11FA47-71CA-11E1-9E33-C80AA9429562 & 35 & 35 & Domain_1 \\
\hline 3E11FA47-71CA-11E1-9E33-C80AA9429562 & 36 & 36 & Domain_2 \\
\hline 3E11FA47-71CA-11E1-9E33-C80AA9429562 & 37 & 37 & Domain_2 \\
\hline 3E11FA47-71CA-11E1-9E33-C80AA9429562 & 38 & 38 & Domain_2 \\
\hline 3E11FA47-71CA-11E1-9E33-C80AA9429562 & 39 & 39 & Domain_2 \\
\hline 3E11FA47-71CA-11E1-9E33-C80AA9429562 & 40 & 40 & Domain_1 \\
\hline 3E11FA47-71CA-11E1-9E33-C80AA9429562 & 41 & 41 & Domain_1 \\
\hline 3E11FA47-71CA-11E1-9E33-C80AA9429562 & 42 & 42 & Domain_1 \\
\hline 3E11FA47-71CA-11E1-9E33-C80AA9429562 & 43 & 43 & Domain_1 \\
\hline 3E11FA47-71CA-11E1-9E33-C80AA9429562 & 44 & 44 & Domain_2 \\
\hline 3E11FA47-71CA-11E1-9E33-C80AA9429562 & 45 & 45 & Domain_2 \\
\hline 3E11FA47-71CA-11E1-9E33-C80AA9429562 & 46 & 46 & Domain_2 \\
\hline 3E11FA47-71CA-11E1-9E33-C80AA9429562 & 47 & 47 & Domain_1 \\
\hline 3E11FA47-71CA-11E1-9E33-C80AA9429562 & 48 & 48 & Domain_1 \\
\hline
\end{tabular}
```


To save space, the MySQL server can compress the mysql.gtid_executed table periodically by replacing each such set of rows with a single row that spans the entire interval of transaction identifiers, like this:
```
+----------------------------------------+----------------+-----------------------
| source_uuid | interval_start | interval_end | gtid_tag |
|---------------------------------------+---------------+-----------------------
| 3E11FA47-71CA-11E1-9E33-C80AA9429562 | 31 | 35 | Domain_1 |
| 3E11FA47-71CA-11E1-9E33-C80AA9429562 | 36 | 39 | Domain_2 |
| 3E11FA47-71CA-11E1-9E33-C80AA9429562 | 40 | 43 | Domain_1 |
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3379.jpg?height=56&width=1383&top_left_y=1845&top_left_x=351)
```
| 3E11FA47-71CA-11E1-9E33-C80AA9429562 | 47 | 48 | Domain_1 |
```


The server can carry out compression using a dedicated foreground thread named thread/sql/ compress_gtid_table. This thread is not listed in the output of SHOW PROCESSLIST, but it can be viewed as a row in the threads table, as shown here:
```
mysql> SELECT * FROM performance_schema.threads WHERE NAME LIKE '%gtid%'\G
************************** 1. row
                THREAD_ID: 26
                    NAME: thread/sql/compress_gtid_table
                    TYPE: FOREGROUND
        PROCESSLIST_ID: 1
    PROCESSLIST_USER: NULL
    PROCESSLIST_HOST: NULL
        PROCESSLIST_DB: NULL
PROCESSLIST_COMMAND: Daemon
    PROCESSLIST_TIME: 1509
    PROCESSLIST_STATE: Suspending
    PROCESSLIST_INFO: NULL
    PARENT_THREAD_ID: 1
                ROLE: NULL
            INSTRUMENTED: YES
```

```
    HISTORY: YES
CONNECTION_TYPE: NULL
    THREAD_OS_ID: 18677
```


When binary logging is enabled on the server, this compression method is not used, and instead the mysql.gtid_executed table is compressed on each binary log rotation. However, when binary logging is disabled on the server, the thread/sql/compress_gtid_table thread sleeps until a specified number of transactions have been executed, then wakes up to perform compression of the mysql.gtid_executed table. It then sleeps until the same number of transactions have taken place, then wakes up to perform the compression again, repeating this loop indefinitely. The number of transactions that elapse before the table is compressed, and thus the compression rate, is controlled by the value of the gtid_executed_compression_period system variable. Setting that value to 0 means that the thread never wakes up, meaning that this explicit compression method is not used. Instead, compression occurs implicitly as required.

InnoDB transactions are written to the mysql.gtid_executed table by a process separate from that used for transactions involving storage engines other than InnoDB. This process is controlled by a different thread, innodb/clone_gtid_thread. This GTID persister thread collects GTIDs in groups, flushes them to the mysql.gtid_executed table, then compresses the table. If the server has a mix of InnoDB transactions and non-InnoDB transactions, which are written to the mysql.gtid_executed table individually, the compression carried out by the compress_gtid_table thread interferes with the work of the GTID persister thread and can slow it significantly. For this reason, it is recommended that you set gtid_executed_compression_period to 0 , so that the compress_gtid_table thread is never activated.

The default value for gtid_executed_compression_period is 0, and all transactions regardless of storage engine are written to the mysql.gtid_executed table by the GTID persister thread.

When a server instance is started, if gtid_executed_compression_period is set to a nonzero value and the thread/sql/compress_gtid_table thread is launched, in most server configurations, explicit compression is performed for the mysql.gtid_executed table. Compression is triggered by the thread launch.

\subsection*{19.1.3.2 GTID Life Cycle}

The life cycle of a GTID consists of the following steps:
1. A transaction is executed and committed on the source. This client transaction is assigned a GTID composed of the source's UUID and the smallest nonzero transaction sequence number not yet used on this server. The GTID is written to the source's binary log (immediately preceding the transaction itself in the log). If a client transaction is not written to the binary log (for example, because the transaction was filtered out, or the transaction was read-only), it is not assigned a GTID.
2. If a GTID was assigned for the transaction, the GTID is persisted atomically at commit time by writing it to the binary log at the beginning of the transaction (as a Gtid_log_event). Whenever the binary log is rotated or the server is shut down, the server writes GTIDs for all transactions that were written into the previous binary log file into the mysql.gtid_executed table.
3. If a GTID was assigned for the transaction, the GTID is externalized non-atomically (very shortly after the transaction is committed) by adding it to the set of GTIDs in the gtid_executed system variable (@@GLOBAL.gtid_executed). This GTID set contains a representation of the set of all committed GTID transactions, and it is used in replication as a token that represents the server state. With binary logging enabled (as required for the source), the set of GTIDs in the gtid_executed system variable is a complete record of the transactions applied, but the mysql.gtid_executed table is not, because the most recent history is still in the current binary log file.
4. After the binary log data is transmitted to the replica and stored in the replica's relay log (using established mechanisms for this process, see Section 19.2, "Replication Implementation", for
details), the replica reads the GTID and sets the value of its gtid_next system variable as this GTID. This tells the replica that the next transaction must be logged using this GTID. It is important to note that the replica sets gtid_next in a session context.
5. The replica verifies that no thread has yet taken ownership of the GTID in gtid_next in order to process the transaction. By reading and checking the replicated transaction's GTID first, before processing the transaction itself, the replica guarantees not only that no previous transaction having this GTID has been applied on the replica, but also that no other session has already read this GTID but has not yet committed the associated transaction. So if multiple clients attempt to apply the same transaction concurrently, the server resolves this by letting only one of them execute. The gtid_owned system variable (@@GLOBAL.gtid_owned) for the replica shows each GTID that is currently in use and the ID of the thread that owns it. If the GTID has already been used, no error is raised, and the auto-skip function is used to ignore the transaction.
6. If the GTID has not been used, the replica applies the replicated transaction. Because gtid_next is set to the GTID already assigned by the source, the replica does not attempt to generate a new GTID for this transaction, but instead uses the GTID stored in gtid_next.
7. If binary logging is enabled on the replica, the GTID is persisted atomically at commit time by writing it to the binary log at the beginning of the transaction (as a Gtid_log_event). Whenever the binary log is rotated or the server is shut down, the server writes GTIDs for all transactions that were written into the previous binary log file into the mysql.gtid_executed table.
8. If binary logging is disabled on the replica, the GTID is persisted atomically by writing it directly into the mysql.gtid_executed table. MySQL appends a statement to the transaction to insert the GTID into the table. This operation is atomic for DDL statements as well as for DML statements. In this situation, the mysql.gtid_executed table is a complete record of the transactions applied on the replica.
9. Very shortly after the replicated transaction is committed on the replica, the GTID is externalized non-atomically by adding it to the set of GTIDs in the gtid_executed system variable (@@GLOBAL.gtid_executed) for the replica. As for the source, this GTID set contains a representation of the set of all committed GTID transactions. If binary logging is disabled on the replica, the mysql.gtid_executed table is also a complete record of the transactions applied on the replica. If binary logging is enabled on the replica, meaning that some GTIDs are only recorded in the binary log, the set of GTIDs in the gtid_executed system variable is the only complete record.

Client transactions that are completely filtered out on the source are not assigned a GTID, therefore they are not added to the set of transactions in the gtid_executed system variable, or added to the mysql.gtid_executed table. However, the GTIDs of replicated transactions that are completely filtered out on the replica are persisted. If binary logging is enabled on the replica, the filtered-out transaction is written to the binary log as a Gtid_log_event followed by an empty transaction containing only BEGIN and COMMIT statements. If binary logging is disabled, the GTID of the filtered-out transaction is written to the mysql.gtid_executed table. Preserving the GTIDs for filtered-out transactions ensures that the mysql.gtid_executed table and the set of GTIDs in the gtid_executed system variable can be compressed. It also ensures that the filtered-out transactions are not retrieved again if the replica reconnects to the source, as explained in Section 19.1.3.3, "GTID Auto-Positioning".

On a multithreaded replica (with replica_parallel_workers > 0), transactions can be applied in parallel, so replicated transactions can commit out of order (unless replica_preserve_commit_order = 1). When that happens, the set of GTIDs in the gtid_executed system variable contains multiple GTID ranges with gaps between them. (On a source or a single-threaded replica, there are monotonically increasing GTIDs without gaps between the numbers.) Gaps on multithreaded replicas only occur among the most recently applied transactions, and are filled in as replication progresses. When replication threads are stopped cleanly using the STOP REPLICA statement, ongoing transactions are applied so that the gaps are filled in. In the event of a shutdown such as a server failure or the use of the KILL statement to stop replication threads, the gaps might remain.

\section*{What changes are assigned a GTID?}

The typical scenario is that the server generates a new GTID for a committed transaction. However, GTIDs can also be assigned to other changes besides transactions, and in some cases a single transaction can be assigned multiple GTIDs.

Every database change (DDL or DML) that is written to the binary log is assigned a GTID. This includes changes that are autocommitted, and changes that are committed using BEGIN and COMMIT or START TRANSACTION statements. A GTID is also assigned to the creation, alteration, or deletion of a database, and of a non-table database object such as a procedure, function, trigger, event, view, user, role, or grant.

Non-transactional updates as well as transactional updates are assigned GTIDs. In addition, for a nontransactional update, if a disk write failure occurs while attempting to write to the binary log cache and a gap is therefore created in the binary log, the resulting incident log event is assigned a GTID.

When a table is automatically dropped by a generated statement in the binary log, a GTID is assigned to the statement. Temporary tables are dropped automatically when a replica begins to apply events from a source that has just been started, and when statement-based replication is in use (binlog_format=STATEMENT) and a user session that has open temporary tables disconnects. Tables that use the MEMORY storage engine are deleted automatically the first time they are accessed after the server is started, because rows might have been lost during the shutdown.

When a transaction is not written to the binary log on the server of origin, the server does not assign a GTID to it. This includes transactions that are rolled back and transactions that are executed while binary logging is disabled on the server of origin, either globally (with --skip-log-bin specified in the server's configuration) or for the session (SET @@SESSION.sql_log_bin = 0). This also includes no-op transactions when row-based replication is in use (binlog_format=ROW).

XA transactions are assigned separate GTIDs for the XA PREPARE phase of the transaction and the XA COMMIT or XA ROLLBACK phase of the transaction. XA transactions are persistently prepared so that users can commit them or roll them back in the case of a failure (which in a replication topology might include a failover to another server). The two parts of the transaction are therefore replicated separately, so they must have their own GTIDs, even though a non-XA transaction that is rolled back would not have a GTID.

In the following special cases, a single statement can generate multiple transactions, and therefore be assigned multiple GTIDs:
- A stored procedure is invoked that commits multiple transactions. One GTID is generated for each transaction that the procedure commits.
- A multi-table DROP TABLE statement drops tables of different types. Multiple GTIDs can be generated if any of the tables use storage engines that do not support atomic DDL, or if any of the tables are temporary tables.
- A CREATE TABLE ... SELECT statement is issued when row-based replication is in use (binlog_format=ROW). One GTID is generated for the CREATE TABLE action and one GTID is generated for the row-insert actions.

\section*{The gtid_next System Variable}

By default, for new transactions committed in user sessions, the server automatically generates and assigns a new GTID. When the transaction is applied on a replica, the GTID from the server of origin is preserved. You can change this behavior by setting the session value of the gtid_next system variable:
- When gtid_next is set to AUTOMATIC (the default) and a transaction is committed and written to the binary log, the server automatically generates and assigns a new GTID. If a transaction is rolled back or not written to the binary log for another reason, the server does not generate and assign a GTID.
- If you set gtid_next to AUTOMATIC: TAG, a new GTID including the specified tag is assigned to each new transaction.
- If you set gtid_next to a valid GTID (consisting of a UUID, an optional tag, and a transaction sequence number, separated by a colon), the server assigns that GTID to your transaction. This GTID is assigned and added to gtid_executed even when the transaction is not written to the binary log, or when the transaction is empty.

Note that after you set gtid_next to a specific GTID (in either UUID: NUMBER or UUID : TAG : NUMBER format), and the transaction has been committed or rolled back, an explicit SET @@SESSION.gtid_next statement must be issued before any other statement. You can use this to set the GTID value back to AUTOMATIC if you do not want to assign any more GTIDs explicitly.

When replication applier threads apply replicated transactions, they use this technique, setting @@SESSION. gtid_next explicitly to the GTID of the replicated transaction as assigned on the server of origin. This means the GTID from the server of origin is retained, rather than a new GTID being generated and assigned by the replica. It also means the GTID is added to gtid_executed on the replica even when binary logging or replica update logging is disabled on the replica, or when the transaction is a no-op or is filtered out on the replica.

It is possible for a client to simulate a replicated transaction by setting @@SESSION. gtid_next to a specific GTID before executing the transaction. This technique is used by mysqlbinlog to generate a dump of the binary log that the client can replay to preserve GTIDs. A simulated replicated transaction committed through a client is completely equivalent to a replicated transaction committed through a replication applier thread, and they cannot be distinguished after the fact.

\section*{The gtid_purged System Variable}

The set of GTIDs in the gtid_purged system variable (@@GLOBAL.gtid_purged) contains the GTIDs of all the transactions that have been committed on the server, but that do not exist in any binary log file on the server. gtid_purged is a subset of gtid_executed. The following categories of GTIDs are in gtid_purged:
- GTIDs of replicated transactions that were committed with binary logging disabled on the replica.
- GTIDs of transactions that were written to a binary log file that has now been purged.
- GTIDs that were added explicitly to the set by the statement SET @@GLOBAL.gtid_purged.

You can change the value of gtid_purged in order to record on the server that the transactions in a certain GTID set have been applied, although they do not exist in any binary log on the server. When you add GTIDs to gtid_purged, they are also added to gtid_executed. An example use case for this action is when you are restoring a backup of one or more databases on a server, but you do not have the relevant binary logs containing the transactions on the server. You can also choose whether to replace the whole GTID set in gtid_purged with a specified GTID set, or to add a specified GTID set to the GTIDs already in gtid_purged. For details of how to do this, see the description for gtid_purged.

The sets of GTIDs in the gtid_executed and gtid_purged system variables are initialized when the server starts. Every binary log file begins with the event Previous_gtids_log_event, which contains the set of GTIDs in all previous binary log files (composed from the GTIDs in the preceding file's Previous_gtids_log_event, and the GTIDs of every Gtid_log_event in the preceding file itself). The contents of Previous_gtids_log_event in the oldest and most recent binary log files are used to compute the gtid_executed and gtid_purged sets at server startup:
- gtid_executed is computed as the union of the GTIDs in Previous_gtids_log_event in the most recent binary log file, the GTIDs of transactions in that binary log file, and the GTIDs stored in the mysql.gtid_executed table. This GTID set contains all the GTIDs that have been used (or added explicitly to gtid_purged) on the server, whether or not they are currently in a binary log file on the server. It does not include the GTIDs for transactions that are currently being processed on the server (@@GLOBAL.gtid_owned).
- gtid_purged is computed by first adding the GTIDs in Previous_gtids_log_event in the most recent binary log file and the GTIDs of transactions in that binary log file. This step gives the set of GTIDs that are currently, or were once, recorded in a binary log on the server (gtids_in_binlog). Next, the GTIDs in Previous_gtids_log_event in the oldest binary log file are subtracted from gtids_in_binlog. This step gives the set of GTIDs that are currently recorded in a binary log on the server (gtids_in_binlog_not_purged). Finally, gtids_in_binlog_not_purged is subtracted from gtid_executed. The result is the set of GTIDs that have been used on the server, but are not currently recorded in a binary log file on the server, and this result is used to initialize gtid_purged.

\section*{Resetting the GTID Execution History}

If you need to reset the GTID execution history on a server, use the RESET BINARY LOGS AND GTIDS statement. You might need to do this after carrying out test queries to verify a replication setup on new GTID-enabled servers, or when you want to join a new server to a replication group but it contains some unwanted local transactions that are not accepted by Group Replication.

> |Warning

> Use RESET BINARY LOGS AND GTIDS with caution to avoid losing any wanted GTID execution history and binary log files.

Before issuing RESET BINARY LOGS AND GTIDS, ensure that you have backups of the server's binary log files and binary log index file, if any, and obtain and save the GTID set held in the global value of the gtid_executed system variable (for example, by issuing a SELECT @@GLOBAL.gtid_executed statement and saving the results). If you are removing unwanted transactions from that GTID set, use mysqlbinlog to examine the contents of the transactions to ensure that they have no value, contain no data that must be saved or replicated, and did not result in data changes on the server.

When you issue RESET BINARY LOGS AND GTIDS, the following reset operations are carried out:
- The value of the gtid_purged system variable is set to an empty string ( ' ' ).
- The global value (but not the session value) of the gtid_executed system variable is set to an empty string.
- The mysql.gtid_executed table is cleared (see mysql.gtid_executed Table).
- If the server has binary logging enabled, the existing binary log files are deleted and the binary log index file is cleared.

Note that RESET BINARY LOGS AND GTIDS is the method to reset the GTID execution history even if the server is a replica where binary logging is disabled. RESET REPLICA has no effect on the GTID execution history.

\subsection*{19.1.3.3 GTID Auto-Positioning}

GTIDs replace the file-offset pairs previously required to determine points for starting, stopping, or resuming the flow of data between source and replica. When GTIDs are in use, all the information that the replica needs for synchronizing with the source is obtained directly from the replication data stream.

To start a replica using GTID-based replication, you need to enable the SOURCE_AUTO_POSITION option in the CHANGE REPLICATION SOURCE TO statement. The alternative SOURCE_LOG_FILE and SOURCE_LOG_POS options specify the name of the log file and the starting position within the file, but with GTIDs the replica does not need this nonlocal data. For full instructions to configure and start sources and replicas using GTID-based replication, see Section 19.1.3.4, "Setting Up Replication Using GTIDs".

The SOURCE_AUTO_POSITION option is disabled by default. If multi-source replication is enabled on the replica, you need to set the option for each applicable replication channel. Disabling the

SOURCE_AUTO_POSITION option again causes the replica to revert to file-based replication; this means that, when GTID_ONLY=ON, some positions may be marked as invalid, in which case you must also specify both SOURCE_LOG_FILE and SOURCE_LOG_POS when disabling SOURCE_AUTO_POSITION.

When a replica has GTIDs enabled (GTID_MODE=ON, ON_PERMISSIVE, or OFF_PERMISSIVE ) and the SOURCE_AUTO_POSITION option enabled, auto-positioning is activated for connection to the source. The source must have GTID_MODE=0N set in order for the connection to succeed. In the initial handshake, the replica sends a GTID set containing the transactions that it has already received, committed, or both. This GTID set is equal to the union of the set of GTIDs in the gtid_executed system variable (@@GLOBAL.gtid_executed), and the set of GTIDs recorded in the Performance Schema replication_connection_status table as received transactions (the result of the statement SELECT RECEIVED_TRANSACTION_SET FROM PERFORMANCE_SCHEMA.replication_connection_status).

The source responds by sending all transactions recorded in its binary log whose GTID is not included in the GTID set sent by the replica. To do this, the source first identifies the appropriate binary log file to begin working with, by checking the Previous_gtids_log_event in the header of each of its binary log files, starting with the most recent. When the source finds the first Previous_gtids_log_event which contains no transactions that the replica is missing, it begins with that binary log file. This method is efficient and only takes a significant amount of time if the replica is behind the source by a large number of binary log files. The source then reads the transactions in that binary log file and subsequent files up to the current one, sending the transactions with GTIDs that the replica is missing, and skipping the transactions that were in the GTID set sent by the replica. The elapsed time until the replica receives the first missing transaction depends on its offset in the binary log file. This exchange ensures that the source only sends the transactions with a GTID that the replica has not already received or committed. If the replica receives transactions from more than one source, as in the case of a diamond topology, the auto-skip function ensures that the transactions are not applied twice.

If any of the transactions that should be sent by the source have been purged from the source's binary log, or added to the set of GTIDs in the gtid_purged system variable by another method, the source sends the error ER_SOURCE_HAS_PURGED_REQUIRED_GTIDS to the replica, and replication does not start. The GTIDs of the missing purged transactions are identified and listed in the source's error log in the warning message ER_FOUND_MISSING_GTIDS. The replica cannot recover automatically from this error because parts of the transaction history that are needed to catch up with the source have been purged. Attempting to reconnect without the SOURCE_AUTO_POSITION option enabled only results in the loss of the purged transactions on the replica. The correct approach to recover from this situation is for the replica to replicate the missing transactions listed in the ER_FOUND_MISSING_GTIDS message from another source, or for the replica to be replaced by a new replica created from a more recent backup. Consider revising the binary log expiration period (binlog_expire_logs_seconds) on the source to ensure that the situation does not occur again.

If during the exchange of transactions it is found that the replica has received or committed transactions with the source's UUID in the GTID, but the source itself does not have a record of them, the source sends the error ER_REPLICA_HAS_MORE_GTIDS_THAN_SOURCE to the replica and replication does not start. This situation can occur if a source that does not have sync_binlog=1 set experiences a power failure or operating system crash, and loses committed transactions that have not yet been synchronized to the binary log file, but have been received by the replica. The source and replica can diverge if any clients commit transactions on the source after it is restarted, which can lead to the situation where the source and replica are using the same GTID for different transactions. The correct approach to recover from this situation is to check manually whether the source and replica have diverged. If the same GTID is now in use for different transactions, you either need to perform manual conflict resolution for individual transactions as required, or remove either the source or the replica from the replication topology. If the issue is only missing transactions on the source, you can make the source into a replica instead, allow it to catch up with the other servers in the replication topology, and then make it a source again if needed.

For a multi-source replica in a diamond topology (where the replica replicates from two or more sources, which in turn replicate from a common source), when GTID-based replication is in use,
ensure that any replication filters or other channel configuration are identical on all channels on the multi-source replica. With GTID-based replication, filters are applied only to the transaction data, and GTIDs are not filtered out. This happens so that a replica's GTID set stays consistent with the source's, meaning GTID auto-positioning can be used without re-acquiring filtered out transactions each time. In the case where the downstream replica is multi-source and receives the same transaction from multiple sources in a diamond topology, the downstream replica now has multiple versions of the transaction, and the result depends on which channel applies the transaction first. The second channel to attempt it skips the transaction using GTID auto-skip, because the transaction's GTID was added to the gtid_executed set by the first channel. With identical filtering on the channels, there is no problem because all versions of the transaction contain the same data, so the results are the same. However, with different filtering on the channels, the database can become inconsistent and replication can hang.

\subsection*{19.1.3.4 Setting Up Replication Using GTIDs}

This section describes a process for configuring and starting GTID-based replication in MySQL 8.4. This is a "cold start" procedure that assumes either that you are starting the source server for the first time, or that it is possible to stop it; for information about provisioning replicas using GTIDs from a running source server, see Section 19.1.3.5, "Using GTIDs for Failover and Scaleout". For information about changing GTID mode on servers online, see Section 19.1.4, "Changing GTID Mode on Online Servers".

The key steps in this startup process for the simplest possible GTID replication topology, consisting of one source and one replica, are as follows:
1. If replication is already running, synchronize both servers by making them read-only.
2. Stop both servers.
3. Restart both servers with GTIDs enabled and the correct options configured.

The mysqld options necessary to start the servers as described are discussed in the example that follows later in this section.
4. Instruct the replica to use the source as the replication data source and to use auto-positioning. The SQL statements needed to accomplish this step are described in the example that follows later in this section.
5. Take a new backup. Binary logs containing transactions without GTIDs cannot be used on servers where GTIDs are enabled, so backups taken before this point cannot be used with your new configuration.
6. Start the replica, then disable read-only mode on both servers, so that they can accept updates.

In the following example, two servers are already running as source and replica, using MySQL's binary log position-based replication protocol. If you are starting with new servers, see Section 19.1.2.3, "Creating a User for Replication" for information about adding a specific user for replication connections and Section 19.1.2.1, "Setting the Replication Source Configuration" for information about setting the server_id variable. The following examples show how to store mysqld startup options in server's option file, see Section 6.2.2.2, "Using Option Files" for more information. Alternatively you can use startup options when running mysqld.

Most of the steps that follow require the use of the MySQL root account or another MySQL user account that has the SUPER privilege. mysqladmin shutdown requires either the SUPER privilege or the SHUTDOWN privilege.

Step 1: Synchronize the servers. This step is only required when working with servers which are already replicating without using GTIDs. For new servers proceed to Step 3. Make the servers readonly by setting the read_only system variable to ON on each server by issuing the following:
```
mysql> SET @@GLOBAL.read_only = ON;
```


Wait for all ongoing transactions to commit or roll back. Then, allow the replica to catch up with the source. It is extremely important that you make sure the replica has processed all updates before continuing.

If you use binary logs for anything other than replication, for example to do point in time backup and restore, wait until you do not need the old binary logs containing transactions without GTIDs. Ideally, wait for the server to purge all binary logs, and wait for any existing backup to expire.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3387.jpg?height=122&width=106&top_left_y=557&top_left_x=365)

\section*{Important}

It is important to understand that logs containing transactions without GTIDs cannot be used on servers where GTIDs are enabled. Before proceeding, you must be sure that transactions without GTIDs do not exist anywhere in the topology.

Step 2: Stop both servers. Stop each server using mysqladmin as shown here, where username is the user name for a MySQL user having sufficient privileges to shut down the server:
```
$> mysqladmin -uusername -p shutdown
```


Then supply this user's password at the prompt.
Step 3: Start both servers with GTIDs enabled. To enable GTID-based replication, each server must be started with GTID mode enabled by setting the gtid_mode variable to ON, and with the enforce_gtid_consistency variable enabled to ensure that only statements which are safe for GTID-based replication are logged. For example:
```
gtid_mode=ON
enforce-gtid-consistency=ON
```


Start each replica with --skip-replica-start. For more information on GTID related options and variables, see Section 19.1.6.5, "Global Transaction ID System Variables".

It is not mandatory to have binary logging enabled in order to use GTIDs when using the mysql.gtid_executed Table. Source servers must always have binary logging enabled in order to be able to replicate. However, replica servers can use GTIDs but without binary logging. If you need to disable binary logging on a replica server, you can do this by specifying the --skip-log-bin and -log-replica-updates=OFF options for the replica.

Step 4: Configure the replica to use GTID-based auto-positioning. Tell the replica to use the source with GTID based transactions as the replication data source, and to use GTID-based autopositioning rather than file-based positioning. Issue a CHANGE REPLICATION SOURCE TO on the replica, including the SOURCE_AUTO_POSITION option in the statement to tell the replica that the source's transactions are identified by GTIDs.

You may also need to supply appropriate values for the source's host name and port number as well as the user name and password for a replication user account which can be used by the replica to connect to the source; if these have already been set prior to Step 1 and no further changes need to be made, the corresponding options can safely be omitted from the statement shown here.
```
mysql> CHANGE REPLICATION SOURCE TO
    > SOURCE_HOST = host,
    > SOURCE_PORT = port,
    > SOURCE_USER = user,
    > SOURCE_PASSWORD = password,
    > SOURCE_AUTO_POSITION = 1;
```


Step 5: Take a new backup. Existing backups that were made before you enabled GTIDs can no longer be used on these servers now that you have enabled GTIDs. Take a new backup at this point, so that you are not left without a usable backup.

For instance, you can execute FLUSH LOGS on the server where you are taking backups. Then either explicitly take a backup or wait for the next iteration of any periodic backup routine you may have set up.

Step 6: Start the replica and disable read-only mode. Start the replica like this:
mysql> START REPLICA;
The following step is only necessary if you configured a server to be read-only in Step 1. To allow the server to begin accepting updates again, issue the following statement:
mysql> SET @@GLOBAL.read_only = OFF;
GTID-based replication should now be running, and you can begin (or resume) activity on the source as before. Section 19.1.3.5, "Using GTIDs for Failover and Scaleout", discusses creation of new replicas when using GTIDs.

\subsection*{19.1.3.5 Using GTIDs for Failover and Scaleout}

There are a number of techniques when using MySQL Replication with Global Transaction Identifiers (GTIDs) for provisioning a new replica which can then be used for scaleout, being promoted to source as necessary for failover. This section describes the following techniques:
- Simple replication
- Copying data and transactions to the replica
- Injecting empty transactions
- Excluding transactions with gtid_purged
- Restoring GTID mode replicas

Global transaction identifiers were added to MySQL Replication for the purpose of simplifying in general management of the replication data flow and of failover activities in particular. Each identifier uniquely identifies a set of binary log events that together make up a transaction. GTIDs play a key role in applying changes to the database: the server automatically skips any transaction having an identifier which the server recognizes as one that it has processed before. This behavior is critical for automatic replication positioning and correct failover.

The mapping between identifiers and sets of events comprising a given transaction is captured in the binary log. This poses some challenges when provisioning a new server with data from another existing server. To reproduce the identifier set on the new server, it is necessary to copy the identifiers from the old server to the new one, and to preserve the relationship between the identifiers and the actual events. This is necessary for restoring a replica that is immediately available as a candidate to become a new source on failover or switchover.

Simple replication. The easiest way to reproduce all identifiers and transactions on a new server is to make the new server into the replica of a source that has the entire execution history, and enable global transaction identifiers on both servers. See Section 19.1.3.4, "Setting Up Replication Using GTIDs", for more information.

Once replication is started, the new server copies the entire binary log from the source and thus obtains all information about all GTIDs.

This method is simple and effective, but requires the replica to read the binary log from the source; it can sometimes take a comparatively long time for the new replica to catch up with the source, so this method is not suitable for fast failover or restoring from backup. This section explains how to avoid fetching all of the execution history from the source by copying binary log files to the new server.

Copying data and transactions to the replica. Executing the entire transaction history can be time-consuming when the source server has processed a large number of transactions previously, and this can represent a major bottleneck when setting up a new replica. To eliminate this requirement, a snapshot of the data set, the binary logs and the global transaction information the source server contains can be imported to the new replica. The server where the snapshot is taken can be either
the source or one of its replicas, but you must ensure that the server has processed all required transactions before copying the data.

There are several variants of this method, the difference being in the manner in which data dumps and transactions from binary logs are transferred to the replica, as outlined here:

\section*{Data Set}

\section*{Transaction History}
1. Create a dump file using mysqldump on the source server. Set the mysqldump option --source-data to 1 , to include a CHANGE REPLICATION SOURCE TO statement with binary logging information. Set the --set-gtid-purged option to AUTO (the default) or ON, to include information about executed transactions in the dump. Then use the mysql client to import the dump file on the target server.
2. Alternatively, create a data snapshot of the source server using raw data files, then copy these files to the target server, following the instructions in Section 19.1.2.5, "Choosing a Method for Data Snapshots". If you use InnoDB tables, you can use the mysqlbackup command from the MySQL Enterprise Backup component to produce a consistent snapshot. This command records the log name and offset corresponding to the snapshot to be used on the replica. MySQL Enterprise Backup is a commercial product that is included as part of a MySQL Enterprise subscription. See Section 32.1, "MySQL Enterprise Backup Overview" for detailed information.
3. Alternatively, stop both the source and target servers, copy the contents of the source's data directory to the new replica's data directory, then restart the replica. If you use this method, the replica must be configured for GTID-based replication, in other words with gtid_mode=0N. For instructions and important information for this method, see Section 19.1.2.8, "Adding Replicas to a Replication Environment".

If the source server has a complete transaction history in its binary logs (that is, the GTID set @@GLOBAL.gtid_purged is empty), you can use these methods.
1. Import the binary logs from the source server to the new replica using mysqlbinlog, with the --read-from-remote-server and --read-from-remote-source options.
2. Alternatively, copy the source server's binary log files to the replica. You can make copies from the replica using mysqlbinlog with the --read-from-remote-server and - - raw options. These can be read into the replica by using mysqlbinlog > file (without the --raw option) to export the binary log files to SQL files, then passing these files to the mysql client for processing. Ensure that all of the binary log files are processed using a single mysql process, rather than multiple connections. For example:
```
$> mysqlbinlog copied-binlog.000001 copied-binlog.000002 | mysql
```


For more information, see Section 6.6.9.3, "Using mysqlbinlog to Back Up Binary Log Files".

This method has the advantage that a new server is available almost immediately; only those transactions that were committed while the snapshot or dump file was being replayed still need to be obtained from the existing source. This means that the replica's availability is not instantaneous, but
only a relatively short amount of time should be required for the replica to catch up with these few remaining transactions.

Copying over binary logs to the target server in advance is usually faster than reading the entire transaction execution history from the source in real time. However, it may not always be feasible to move these files to the target when required, due to size or other considerations. The two remaining methods for provisioning a new replica discussed in this section use other means to transfer information about transactions to the new replica.

Injecting empty transactions. The source's global gtid_executed variable contains the set of all transactions executed on the source. Rather than copy the binary logs when taking a snapshot to provision a new server, you can instead note the content of gtid_executed on the server from which the snapshot was taken. Before adding the new server to the replication chain, simply commit an empty transaction on the new server for each transaction identifier contained in the source's gtid_executed, like this:
```
SET GTID_NEXT='aaa-bbb-ccc-ddd:N';
BEGIN;
COMMIT;
SET GTID_NEXT='AUTOMATIC';
```


Once all transaction identifiers have been reinstated in this way using empty transactions, you must flush and purge the replica's binary logs, as shown here, where $N$ is the nonzero suffix of the current binary log file name:
```
FLUSH LOGS;
PURGE BINARY LOGS TO 'source-bin.00000N';
```


You should do this to prevent this server from flooding the replication stream with false transactions in the event that it is later promoted to the source. (The FLUSH LOGS statement forces the creation of a new binary log file; PURGE BINARY LOGS purges the empty transactions, but retains their identifiers.)

This method creates a server that is essentially a snapshot, but in time is able to become a source as its binary log history converges with that of the replication stream (that is, as it catches up with the source or sources). This outcome is similar in effect to that obtained using the remaining provisioning method, which we discuss in the next few paragraphs.

Excluding transactions with gtid_purged. The source's global gtid_purged variable contains the set of all transactions that have been purged from the source's binary log. As with the method discussed previously (see Injecting empty transactions), you can record the value of gtid_executed on the server from which the snapshot was taken (in place of copying the binary logs to the new server). Unlike the previous method, there is no need to commit empty transactions (or to issue PURGE BINARY LOGS); instead, you can set gtid_purged on the replica directly, based on the value of gtid_executed on the server from which the backup or snapshot was taken.

As with the method using empty transactions, this method creates a server that is functionally a snapshot, but in time is able to become a source as its binary log history converges with that of the source and other replicas.

Restoring GTID mode replicas. When restoring a replica in a GTID based replication setup that has encountered an error, injecting an empty transaction may not solve the problem because an event does not have a GTID.

Use mysqlbinlog to find the next transaction, which is probably the first transaction in the next log file after the event. Copy everything up to the COMMIT for that transaction, being sure to include the SET @@SESSION.gtid_next. Even if you are not using row-based replication, you can still run binary log row events in the command line client.

Stop the replica and run the transaction you copied. The mysqlbinlog output sets the delimiter to / *!*/; , so set it back to the default, like this:
```
mysql> DELIMITER ;
```


Restart replication from the correct position automatically:
```
mysql> SET gtid_next=AUTOMATIC;
mysql> RESET REPLICA;
mysql> START REPLICA;
```


\subsection*{19.1.3.6 Replication From a Source Without GTIDs to a Replica With GTIDs}

You can set up replication channels to assign a GTID to replicated transactions that do not already have one. This feature enables replication from a source server that does not have GTIDs enabled and does not use GTID-based replication, to a replica that has GTIDs enabled. If it is possible to enable GTIDs on the replication source server, as described in Section 19.1.4, "Changing GTID Mode on Online Servers", use that approach instead. This feature is designed for replication source servers where you cannot enable GTIDs. Note that as is standard for MySQL replication, this feature does not support replication from MySQL source servers earlier than the previous release series, so MySQL 8.3 is the earliest supported source for a MySQL 8.4 replica.

You can enable GTID assignment on a replication channel using the ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS option of the CHANGE REPLICATION SOURCE TO statement. LOCAL assigns a GTID including the replica's own UUID (the server_uuid setting). uuid assigns a GTID including the specified UUID, such as the server_uuid setting for the replication source server. Using a nonlocal UUID lets you differentiate between transactions that originated on the replica and transactions that originated on the source, and for a multi-source replica, between transactions that originated on different sources. If any of the transactions sent by the source do have a GTID already, that GTID is retained.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3391.jpg?height=100&width=104&top_left_y=1356&top_left_x=365)

\section*{Important}

A replica set up with ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS on any channel cannot be promoted to replace the replication source server in the event that failover is required, and a backup taken from the replica cannot be used to restore the replication source server. The same restriction applies to replacing or restoring other replicas that use ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS on any channel.

The replica must have gtid_mode=0N set, and this cannot be changed afterwards, unless you set ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS=OFF. If the replica server is started without GTIDs enabled and with ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS set for any replication channels, the settings are not changed, but a warning message is written to the error log explaining how to change the situation.

For a multi-source replica, you can have a mix of channels that use ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS, and channels that do not. Channels specific to Group Replication cannot use ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS, but an asynchronous replication channel for another source on a server instance that is a Group Replication group member can do so. For a channel on a Group Replication group member, do not specify the Group Replication group name as the UUID for creating the GTIDs.

Using ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS on a replication channel is not the same as introducing GTID-based replication for the channel. The GTID set (gtid_executed) from a replica set up with ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS should not be transferred to another server or compared with another server's gtid_executed set. The GTIDs that are assigned to the anonymous transactions, and the UUID you choose for them, only have significance for that replica's own use. The exception to this is any downstream replicas of the replica where you enabled ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS, and any servers that were created from a backup of that replica.

If you set up any downstream replicas, these servers do not have ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS enabled. Only the replica that
is receiving transactions directly from the non-GTID source server needs to have ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS set on the relevant replication channel. Among that replica and its downstream replicas, you can compare GTID sets, fail over from one replica to another, and use backups to create additional replicas, as you would in any GTID-based replication topology. ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS is used where transactions are received from a non-GTID server outside this group.

A replication channel using ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS has the following behavior differences to GTID-based replication:
- GTIDs are assigned to the replicated transactions when they are applied (unless they already had a GTID). A GTID would normally be assigned on the replication source server when the transaction is committed, and sent to the replica along with the transaction. On a multi-threaded replica, this means the order of the GTIDs does not necessarily match the order of the transactions, even if replica_preserve_commit_order = 1 .
- The SOURCE_LOG_FILE and SOURCE_LOG_POS options of the CHANGE REPLICATION SOURCE TO statement are used to position the replication I/O (receiver) thread, rather than the SOURCE_AUTO_POSITION option.
- The SET GLOBAL sql_replica_skip_counter statement is used to skip transactions on a replication channel set up with ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS, rather than the method of committing empty transactions. For instructions, see Section 19.1.7.3, "Skipping Transactions".
- The UNTIL SQL_BEFORE_GTIDS and UNTIL_SQL_AFTER_GTIDS options of the START REPLICA statement cannot be used for the channel.
- The function WAIT_FOR_EXECUTED_GTID_SET( ) works across the server and can be used to wait for any downstream replicas of the server that have ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS enabled. To wait for the channel with ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS enabled to catch up with the source, which does not use GTIDs, use the SOURCE_POS_WAIT( ) function.

The Performance Schema replication_applier_configuration table shows whether GTIDs are assigned to anonymous transactions on a replication channel, what the UUID is, and whether it is the UUID of the replica server (LOCAL) or a user-specified UUID (UUID). The information is also recorded in the applier metadata repository. A RESET REPLICA ALL statement resets the ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS setting, but a RESET REPLICA statement does not.

\subsection*{19.1.3.7 Restrictions on Replication with GTIDs}

Because GTID-based replication is dependent on transactions, some features otherwise available in MySQL are not supported when using it. This section provides information about restrictions on and limitations of replication with GTIDs.

Updates involving nontransactional storage engines. When using GTIDs, updates to tables using nontransactional storage engines such as MyISAM cannot be made in the same statement or transaction as updates to tables using transactional storage engines such as InnoDB.

This restriction is due to the fact that updates to tables that use a nontransactional storage engine mixed with updates to tables that use a transactional storage engine within the same transaction can result in multiple GTIDs being assigned to the same transaction.

Such problems can also occur when the source and the replica use different storage engines for their respective versions of the same table, where one storage engine is transactional and the other is not. Also be aware that triggers that are defined to operate on nontransactional tables can be the cause of these problems.

In any of the cases just mentioned, the one-to-one correspondence between transactions and GTIDs is broken, with the result that GTID-based replication cannot function correctly.

CREATE TABLE ... SELECT statements. For storage engines which support atomic DDL, CREATE TABLE ... SELECT is recorded in the binary log as one transaction. For more information, see Section 15.1.1, "Atomic Data Definition Statement Support".

Temporary tables. If binlog_format is set to STATEMENT, CREATE TEMPORARY TABLE and DROP TEMPORARY TABLE statements cannot be used inside transactions, procedures, functions, and triggers when GTIDs are in use on the server (that is, when the enforce_gtid_consistency system variable is set to 0N). They can be used outside these contexts when GTIDs are in use, provided that autocommit=1 is set. When binlog_format is set to ROW or MIXED, CREATE TEMPORARY TABLE and DROP TEMPORARY TABLE statements are allowed inside a transaction, procedure, function, or trigger when GTIDs are in use. The statements are not written to the binary log and are therefore not replicated to replicas. The use of row-based replication means that the replicas remain in sync without the need to replicate temporary tables. If the removal of these statements from a transaction results in an empty transaction, the transaction is not written to the binary log.

Preventing execution of unsupported statements. To prevent execution of statements that would cause GTID-based replication to fail, all servers must be started with the --enforce-gtidconsistency option when enabling GTIDs. This causes statements of any of the types discussed previously in this section to fail with an error.

Note that --enforce-gtid-consistency only takes effect if binary logging takes place for a statement. If binary logging is disabled on the server, or if statements are not written to the binary log because they are removed by a filter, GTID consistency is not checked or enforced for the statements that are not logged.

For information about other required startup options when enabling GTIDs, see Section 19.1.3.4, "Setting Up Replication Using GTIDs".

Skipping transactions. sql_replica_skip_counter is not available when using GTIDbased replication. If you need to skip transactions, use the value of the source's gtid_executed variable instead. If you have enabled GTID assignment on a replication channel using the ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS option of the CHANGE REPLICATION SOURCE TO statement, sql_replica_skip_counter is available. For more information, see Section 19.1.7.3, "Skipping Transactions".

Ignoring servers. IGNORE_SERVER_IDS cannot be used with CHANGE REPLICATION SOURCE T0 when using GTIDs, because transactions that have already been applied are automatically ignored. Before starting GTID-based replication, check for and clear all ignored server ID lists that have previously been set on the servers involved. The SHOW REPLICA STATUS statement, which can be issued for individual channels, displays the list of ignored server IDs if there is one. If there is no list, the Replicate_Ignore_Server_Ids field is blank. If the list of ignored server IDs is not empty, you can clear it with CHANGE REPLICATION SOURCE TO ... IGNORE_SERVER_IDS=()(in other words, with an empty list of server IDs to be ignored).

\subsection*{19.1.3.8 Stored Function Examples to Manipulate GTIDs}

This section provides examples of stored functions (see Chapter 27, Stored Objects) which you can create using some of the built-in functions provided by MySQL for use with GTID-based replication, listed here:
- GTID_SUBSET( ): Shows whether one GTID set is a subset of another.
- GTID_SUBTRACT( ): Returns the GTIDs from one GTID set that are not in another.
- WAIT_FOR_EXECUTED_GTID_SET( ): Waits until all transactions in a given GTID set have been executed.

See Section 14.18.2, "Functions Used with Global Transaction Identifiers (GTIDs)", more more information about the functions just listed.

Note that in these stored functions, the delimiter command has been used to change the MySQL statement delimiter to a vertical bar, like this:
mysql> delimiter |
All of the stored functions shown in this section take string representations of GTID sets as arguments, so GTID sets must always be quoted when used with them.

This function returns nonzero (true) if two GTID sets are the same set, even if they are not formatted in the same way:
```
CREATE FUNCTION GTID_IS_EQUAL(gs1 LONGTEXT, gs2 LONGTEXT)
    RETURNS INT
    RETURN GTID_SUBSET(gs1, gs2) AND GTID_SUBSET(gs2, gs1)
|
```


This function returns nonzero (true) if two GTID sets are disjoint:
```
CREATE FUNCTION GTID_IS_DISJOINT(gs1 LONGTEXT, gs2 LONGTEXT)
RETURNS INT
    RETURN GTID_SUBSET(gs1, GTID_SUBTRACT(gs1, gs2))
|
```


This function returns nonzero (true) if two GTID sets are disjoint and sum is their union:
```
CREATE FUNCTION GTID_IS_DISJOINT_UNION(gs1 LONGTEXT, gs2 LONGTEXT, sum LONGTEXT)
RETURNS INT
    RETURN GTID_IS_EQUAL(GTID_SUBTRACT(sum, gs1), gs2) AND
        GTID_IS_EQUAL(GTID_SUBTRACT(sum, gs2), gs1)
I
```


This function returns a normalized form of the GTID set, in all uppercase, with no whitespace and no duplicates, with UUIDs in alphabetic order and intervals in numeric order:
```
CREATE FUNCTION GTID_NORMALIZE(gs LONGTEXT)
RETURNS LONGTEXT
    RETURN GTID_SUBTRACT(gs, '')
|
```


This function returns the union of two GTID sets:
```
CREATE FUNCTION GTID_UNION(gs1 LONGTEXT, gs2 LONGTEXT)
RETURNS LONGTEXT
    RETURN GTID_NORMALIZE(CONCAT(gs1, ',', gs2))
|
```


This function returns the intersection of two GTID sets.
```
CREATE FUNCTION GTID_INTERSECTION(gs1 LONGTEXT, gs2 LONGTEXT)
RETURNS LONGTEXT
    RETURN GTID_SUBTRACT(gs1, GTID_SUBTRACT(gs1, gs2))
|
```


This function returns the symmetric difference between two GTID sets, that is, the GTIDs that exist in gs1 but not in gs2, as well as the GTIDs that exist in gs2 but not in gs1.
```
CREATE FUNCTION GTID_SYMMETRIC_DIFFERENCE(gs1 LONGTEXT, gs2 LONGTEXT)
RETURNS LONGTEXT
    RETURN GTID_SUBTRACT(CONCAT(gs1, ',', gs2), GTID_INTERSECTION(gs1, gs2))
I
```


This function removes from a GTID set all the GTIDs with the specified origin, and returns the remaining GTIDs, if any. The UUID is the identifier used by the server where the transaction originated, which is normally the value of server_uuid.
```
CREATE FUNCTION GTID_SUBTRACT_UUID(gs LONGTEXT, uuid TEXT)
RETURNS LONGTEXT
    RETURN GTID_SUBTRACT(gs, CONCAT(UUID, ':1-', (1 << 63) - 2))
|
```


This function acts as the reverse of the previous one; it returns only those GTIDs from the GTID set that originate from the server with the specified identifier (UUID).
```
CREATE FUNCTION GTID_INTERSECTION_WITH_UUID(gs LONGTEXT, uuid TEXT)
RETURNS LONGTEXT
    RETURN GTID_SUBTRACT(gs, GTID_SUBTRACT_UUID(gs, uuid))
|
```


\section*{Example 19.1 Verifying that a replica is up to date}

The built-in functions GTID_SUBSET( ) and GTID_SUBTRACT( ) can be used to check that a replica has applied at least every transaction that a source has applied.

To perform this check with GTID_SUBSET( ), execute the following statement on the replica:
SELECT GTID_SUBSET(source_gtid_executed, replica_gtid_executed);
If the returns value is 0 (false), this means that some GTIDs in source_gtid_executed are not present in replica_gtid_executed, and that the replica has not yet applied transactions that were applied on the source, which means that the replica is not up to date.

To perform the same check with GTID_SUBTRACT( ), execute the following statement on the replica:
SELECT GTID_SUBTRACT(source_gtid_executed, replica_gtid_executed);
This statement returns any GTIDs that are in source_gtid_executed but not in replica_gtid_executed. If any GTIDs are returned, the source has applied some transactions that the replica has not applied, and the replica is therefore not up to date.

\section*{Example 19.2 Backup and restore scenario}

The stored functions GTID_IS_EQUAL( ), GTID_IS_DISJOINT( ), and GTID_IS_DISJOINT_UNION ( ) can be used to verify backup and restore operations involving multiple databases and servers. In this example scenario, server1 contains database db1, and server2 contains database db 2 . The goal is to copy database db 2 to server1, and the result on server1 should be the union of the two databases. The procedure used is to back up server2 using mysqldump, then to restore this backup on server1.

Provided that mysqldump was run with --set-gtid-purged set to ON or AUTO (the default), the output contains a SET @@GLOBAL.gtid_purged statement which adds the gtid_executed set from server2 to the gtid_purged set on server1. gtid_purged contains the GTIDs of all the transactions that have been committed on a given server but which do not exist in any binary log file on the server. When database db2 is copied to server1, the GTIDs of the transactions committed on server2, which are not in the binary log files on server1, must be added to gtid_purged for server1 to make the set complete.

The stored functions can be used to assist with the following steps in this scenario:
- Use GTID_IS_EQUAL ( ) to verify that the backup operation computed the correct GTID set for the SET @@GLOBAL.gtid_purged statement. On server2, extract that statement from the mysqldump output, and store the GTID set into a local variable, such as \$gtid_purged_set. Then execute the following statement:
```
server2> SELECT GTID_IS_EQUAL($gtid_purged_set, @@GLOBAL.gtid_executed);
```


If the result is 1 , the two GTID sets are equal, and the set has been computed correctly.
- Use GTID_IS_DISJOINT( ) to verify that the GTID set in the mysqldump output does not overlap with the gtid_executed set on server1. Having identical GTIDs present on both servers causes errors when copying database db2 to server1. To check, on server1, extract and store gtid_purged from the output into a local variable as done previously, then execute the following statement:
```
server1> SELECT GTID_IS_DISJOINT($gtid_purged_set, @@GLOBAL.gtid_executed);
```


If the result is 1 , there is no overlap between the two GTID sets, so no duplicate GTIDs are present.
- Use GTID_IS_DISJOINT_UNION ( ) to verify that the restore operation resulted in the correct GTID state on server1. Before restoring the backup, on server1, obtain the existing gtid_executed set by executing the following statement:
```
server1> SELECT @@GLOBAL.gtid_executed;
```


Store the result in a local variable \$original_gtid_executed, as well as the set from gtid_purged in another local variable as described previously. When the backup from server2 has been restored onto server1, execute the following statement to verify the GTID state:
```
server1> SELECT
    -> GTID_IS_DISJOINT_UNION($original_gtid_executed,
    -> $gtid_purged_set,
    -> @@GLOBAL.gtid_executed);
```


If the result is 1 , the stored function has verified that the original gtid_executed set from server1 (\$original_gtid_executed) and the gtid_purged set that was added from server2 (\$gtid_purged_set) have no overlap, and that the updated gtid_executed set on server1 now consists of the previous gtid_executed set from server1 plus the gtid_purged set from server2, which is the desired result. Ensure that this check is carried out before any further transactions take place on server1, otherwise the new transactions in gtid_executed cause it to fail.

\section*{Example 19.3 Selecting the most up-to-date replica for manual failover}

The stored function GTID_UNION ( ) can be used to identify the most up-to-date replica from a set of replicas, in order to perform a manual failover operation after a source server has stopped unexpectedly. If some of the replicas are experiencing replication lag, this stored function can be used to compute the most up-to-date replica without waiting for all the replicas to apply their existing relay logs, and therefore to minimize the failover time. The function can return the union of gtid_executed on each replica with the set of transactions received by the replica, which is recorded in the Performance Schema replication_connection_status table. You can compare these results to find which replica's record of transactions is the most up to date, even if not all of the transactions have been committed yet.

On each replica, compute the complete record of transactions by issuing the following statement:
```
SELECT GTID_UNION(RECEIVED_TRANSACTION_SET, @@GLOBAL.gtid_executed)
    FROM performance_schema.replication_connection_status
    WHERE channel_name = 'name';
```


You can then compare the results from each replica to see which one has the most up-to-date record of transactions, and use this replica as the new source.

\section*{Example 19.4 Checking for extraneous transactions on a replica}

The stored function GTID_SUBTRACT_UUID ( ) can be used to check whether a replica has received transactions that did not originate from its designated source or sources. If it has, there might be an issue with your replication setup, or with a proxy, router, or load balancer. This function works by removing from a GTID set all the GTIDs from a specified originating server, and returning the remaining GTIDs, if any.

For a replica with a single source, issue the following statement, giving the identifier of the originating source, which is normally the same as server_uuid:
```
SELECT GTID_SUBTRACT_UUID(@@GLOBAL.gtid_executed, server_uuid_of_source);
```


If the result is not empty, the transactions returned are extra transactions that did not originate from the designated source.

For a replica in a multisource topology, include the server UUID of each source in the function call, like this:
```
SELECT
    GTID_SUBTRACT_UUID(GTID_SUBTRACT_UUID(@@GLOBAL.gtid_executed,
        server_uuid_of_source_1),
        server_uuid_of_source_2);
```


If the result is not empty, the transactions returned are extra transactions that did not originate from any of the designated sources.

\section*{Example 19.5 Verifying that a server in a replication topology is read-only}

The stored function GTID_INTERSECTION_WITH_UUID ( ) can be used to verify that a server has not originated any GTIDs and is in a read-only state. The function returns only those GTIDs from the GTID set that originate from the server with the specified identifier. If any of the transactions listed in gtid_executed from this server use the server's own identifier, the server itself originated those transactions. You can issue the following statement on the server to check:
```
SELECT GTID_INTERSECTION_WITH_UUID(@@GLOBAL.gtid_executed, my_server_uuid);
```


\section*{Example 19.6 Validating an additional replica in multisource replication}

The stored function GTID_INTERSECTION_WITH_UUID ( ) can be used to find out if a replica attached to a multisource replication setup has applied all the transactions originating from one particular source. In this scenario, source1 and source2 are both sources and replicas and replicate to each other. source2 also has its own replica. The replica also receives and applies transactions from source1 if source2 is configured with log_replica_updates=0N, but it does not do so if source2 uses log_replica_updates=0FF. Whichever the case, we currently want only to find out if the replica is up to date with source2. In this situation, GTID_INTERSECTION_WITH_UUID ( ) can be used to identify the transactions that source2 originated, discarding the transactions that source2 has replicated from source1. The built-in function GTID_SUBSET( ) can then be used to compare the result with the gtid_executed set on the replica. If the replica is up to date with source2, the gtid_executed set on the replica contains all the transactions in the intersection set (the transactions that originated from source2).

To carry out this check, store the values of gtid_executed and the server UUID from source2 and the value of gtid_executed from the replica into user variables as follows:
```
source2> SELECT @@GLOBAL.gtid_executed INTO @source2_gtid_executed;
source2> SELECT @@GLOBAL.server_uuid INTO @source2_server_uuid;
replica> SELECT @@GLOBAL.gtid_executed INTO @replica_gtid_executed;
```


Then use GTID_INTERSECTION_WITH_UUID ( ) and GTID_SUBSET( ) with these variables as input, as follows:
```
SELECT
    GTID_SUBSET(
        GTID_INTERSECTION_WITH_UUID(@source2_gtid_executed,
            @source2_server_uuid),
            @replica_gtid_executed);
```


The server identifier from source2 (@source2_server_uuid) is used with GTID_INTERSECTION_WITH_UUID ( ) to identify and return only those GTIDs from the set of GTIDs that originated on source2, omitting those that originated on source1. The resulting GTID set is then compared with the set of all executed GTIDs on the replica, using GTID_SUBSET( ). If this statement returns nonzero (true), all the identified GTIDs from source2 (the first set input) are also found in gtid_executed from the replica, meaning that the replica has received and executed all the transactions that originated from source2.

\subsection*{19.1.4 Changing GTID Mode on Online Servers}

This section describes how to change the mode of replication from and to GTID mode without having to take the server offline.

\subsection*{19.1.4.1 Replication Mode Concepts}

Before setting the replication mode of an online server, it is important to understand some key concepts of replication. This section explains these concepts and is essential reading before attempting to modify the replication mode of an online server.

The modes of replication available in MySQL rely on different techniques for identifying logged transactions. The types of transactions used by replication are listed here:
- A GTID transaction is identified by a global transaction identifier (GTID) which takes one of two forms: UUID : NUMBER or UUID : TAG : NUMBER. Every GTID transaction in the binary log is preceded by a Gtid_log_event. A GTID transaction can be addressed either by its GTID, or by the name of the file in which it is logged and its position within that file.
- An anonymous transaction has no GTID; MySQL 8.4 ensures that every anonymous transaction in a log is preceded by an Anonymous_gtid_log_event. (In old versions of MySQL, an anonymous transaction was not preceded by any particular event.) An anonymous transaction can be addressed by file name and position only.

When using GTIDs you can take advantage of GTID auto-positioning and automatic failover, and use WAIT_FOR_EXECUTED_GTID_SET( ), session_track_gtids, and Performance Schema tables to monitor replicated transactions (see Section 29.12.11, "Performance Schema Replication Tables").

A transaction in a relay log from a source running a previous version of MySQL might not be preceded by any particular event, but after being replayed and recorded in the replica's binary log, it is preceded with an Anonymous_gtid_log_event.

To change the replication mode online, it is necessary to set the gtid_mode and enforce_gtid_consistency variables using an account that has privileges sufficient to set global system variables; see Section 7.1.9.1, "System Variable Privileges". Permitted values for gtid_mode are listed here, in order, with their meanings:
- OFF: Only anonymous transactions can be replicated.
- OFF_PERMISSIVE: New transactions are anonymous; replicated transactions may be either GTID or anonymous.
- ON_PERMISSIVE: New transactions use GTIDs; replicated transactions may be either GTID or anonymous.
- ON: All transaction must have GTIDs; anonymous transactions cannot be replicated.

It is possible to have servers using anonymous and servers using GTID transactions in the same replication topology. For example, a source where gtid_mode $=0 \mathrm{~N}$ can replicate to a replica where gtid_mode=ON_PERMISSIVE.

Replication from a source using gtid_mode=0N provides the ability to use GTID auto-positioning, configured using the SOURCE_AUTO_POSITION option of the CHANGE REPLICATION SOURCE T0 statement. The replication topology in use has an impact on whether it is possible to enable auto-positioning or not, since this feature relies on GTIDs and is not compatible with anonymous transactions. It is strongly recommended to ensure there are no anonymous transactions remaining in the topology before enabling auto-positioning; see Section 19.1.4.2, "Enabling GTID Transactions Online".

Valid combinations of gtid_mode and auto-positioning on source and replica are shown in the next table. The meaning of each entry is as follows:
- Y : The values of gtid_mode on the source and on the replica are compatible.
- N: The values of gtid_mode on the source and on the replica are not compatible.
- *: Auto-positioning can be used with this combination of values.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 19．1 Valid Combinations of Source and Replica gtid＿mode}
\begin{tabular}{|l|l|l|l|l|}
\hline gtid＿mode & Source OFF & Source OFF＿PERMISSIVE & Source ON＿PERMISSIVE & Source ON \\
\hline Replica OFF & Y & Y & N & N \\
\hline Replica OFF＿PERMISSIVE & Y & Y & Y & Y＊ \\
\hline Replica ON＿PERMISSIVE & Y & Y & Y & Y＊ \\
\hline Replica ON & N & N & Y & Y＊ \\
\hline
\end{tabular}
\end{table}

The current value of gtid＿mode also affects gtid＿next．The next table shows the behavior of the server for combinations of different values of gtid＿mode and gtid＿next．The meaning of each entry is as follows：
－ANONYMOUS：Generate an anonymous transaction．
－Error：Generate an error，and do not execute SET GTID＿NEXT．
－UUID ：NUMBER：Generate a GTID with the specified UUID：NUMBER．
－UUID ：TAG ：NUMBER：Generate a GTID with the specified UUID：TAG：NUMBER．
－New GTID：Generate a GTID with an automatically generated number．

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 19．2 Valid Combinations of gtid＿mode and gtid＿next}
\begin{tabular}{|l|l|l|l|l|l|l|}
\hline & gtid＿next ＝ AUTOMATIC （binary log on） & gtid＿next ＝ AUTOMATIC （binary log off） & gtid＿next ＝ AUTOMATIC： & gtid＿next ＝ AMGNYMOUS & gtid＿next ＝ ＜UUID＞：＜NUI & gtid＿next ＝ IBERED＞：＜TAG＞：＜NUM \\
\hline gtid＿mode ＝0FF & & ANONYMOUSANONYMOU & Error & ANONYMOUS & Error & Error \\
\hline gtid＿mode ＝ OFF＿PERMIS\＄ & ANONYMOUS IVE & ANONYMOUS & Error & ANONYMOUS & ＜UUID＞：＜NUN & 伹囲用日＞：＜TAG＞：＜NUM \\
\hline gtid＿mode ＝ ON＿PERMISS & New GTID & ANONYMOUS & New GTID & ANONYMOUS & S＜UUID＞：＜NUN & 伹田用B $>:<$ TAG $>:<$ NU \\
\hline gtid＿mode ＝ON & New GTID & ANONYMOUS & New GTID & Error & ＜UUID＞：＜NUM & 伹田用日＞：＜TAG＞：＜NUM \\
\hline
\end{tabular}
\end{table}

When binary logging is not in use and gtid＿next is AUTOMATIC，then no GTID is generated．

\section*{19．1．4．2 Enabling GTID Transactions Online}

This section describes how to enable GTID transactions，and optionally auto－positioning，on servers that are already online and using anonymous transactions．This procedure does not require taking the server offline and is suited to use in production．However，if you have the possibility to take the servers offline when enabling GTID transactions that process is easier．

You can set up replication channels to assign GTIDs to replicated transactions that do not already have any．This feature enables replication from a source server that does not use GTID－based replication， to a replica that does．If it is possible to enable GTIDs on the replication source server，as described in this procedure，use this approach instead．Assigning GTIDs is designed for replication source servers where you cannot enable GTIDs．For more information on this option，see Section 19．1．3．6， ＂Replication From a Source Without GTIDs to a Replica With GTIDs＂．

Before you start, ensure that gtid_mode is OFF on all servers.
The following procedure can be paused at any time and later resumed where it was, or reversed by jumping to the corresponding step of Section 19.1.4.3, "Disabling GTID Transactions Online", the online procedure to disable GTIDs. This makes the procedure fault-tolerant because any unrelated issues that may appear in the middle of the procedure can be handled as usual, and then the procedure continued where it was left off.

To enable GTID transactions, you must complete each of the following steps before continuing to the next one.
1. On each server, execute the following statement:

SET @@GLOBAL.enforce_gtid_consistency = WARN;
Let the server run for a while with your normal workload and monitor the logs. If this step causes any warnings in the log, adjust your application so that it only uses GTID-compatible features and does not generate any warnings.
2. On each server, execute this statement:

SET @@GLOBAL.enforce_gtid_consistency = ON;
3. On each server, execute the following statement:

SET @@GLOBAL.gtid_mode = OFF_PERMISSIVE;
The order in which the servers execute this statement makes no difference, but all servers must do so before beginning the next step.
4. On each server, execute the followng statement:

SET @@GLOBAL.gtid_mode = ON_PERMISSIVE;
As in the previous step, it makes no difference which server executes the statement first, as long as each server does so before proceeding further.
5. On each server, wait until Ongoing_anonymous_transaction_count is 0. You can check its value using a SHOW STATUS statement, like this:
```
mysql> SHOW STATUS LIKE 'Ongoing%';
+--------------------------------------+-------+
| Variable_name | Value |
+--------------------------------------+-------+
| Ongoing_anonymous_transaction_count | 0 |
+--------------------------------------+------+
1 row in set (0.00 sec)
```


On a replica, it is theoretically possible that this is 0 and then a nonzero value again. This is not a problem, as long as it is 0 at least once.
6. Wait for all transactions generated up to the previous step to replicate to all servers. You can do this without stopping updates; what matters is that all anonymous transactions are replicated before proceeding further.

See Section 19.1.4.4, "Verifying Replication of Anonymous Transactions" for one method of checking that all anonymous transactions have replicated to all servers.
7. If you use binary logs for anything other than replication, such as point-in-time backup and restore, wait until you no longer need the old binary logs containing transactions without GTIDs.

For instance, after all transactions have been replicated, you can execute FLUSH LOGS on the server where you are taking backups. Then either explicitly take a backup or wait for the next iteration of any periodic backup routine you may have set up.

Ideally, you should wait for the server to purge all binary logs that existed when the previous step was completed, and for any backup taken before then to expire.

Keep in mind that binary logs containing anonymous transactions (that is, transactions without GTIDs) cannot be used following the next step, after which, you must make sure that no transactions without GTIDs remain uncommitted on any server.
8. On each server, execute this statement:
```
SET @@GLOBAL.GTID_MODE = ON;
```

9. On each server, add gtid-mode=ON and enforce-gtid-consistency=ON to my.cnf. This guarantees that GTIDs are used for all transactions which have not already been processed. To start using the GTID protocol so that you can later perform automatic failover, execute the the next set of statements on each replica. If you use multi-source replication, do this for each channel, including the FOR CHANNEL channel clause:
```
STOP REPLICA [FOR CHANNEL 'channel'];
CHANGE REPLICATION SOURCE TO SOURCE_AUTO_POSITION = 1 [FOR CHANNEL 'channel'];
START REPLICA [FOR CHANNEL 'channel'];
```


\subsection*{19.1.4.3 Disabling GTID Transactions Online}

This section describes how to disable GTID transactions on servers that are already online. This procedure does not require taking the server offline and is suited to use in production. However, if you have the possibility to take the servers offline when disabling GTIDs mode that process is easier.

The process is similar to enabling GTID transactions while the server is online, but reversing the steps. The only thing that differs is the point at which you wait for logged transactions to replicate.

Before starting, all servers must meet the following conditions:
- All servers have gtid_mode set to ON.
- The --replicate-same-server-id option is not set on any server. You cannot disable GTID transactions if this option is set together with the--log-replica-updates option (default) and binary logging is enabled (also the default). Without GTIDs, this combination of options causes infinite loops in circular replication.
1. Execute the following statements on each replica, and if you are using multi-source replication, do so for each channel, including the FOR CHANNEL clause when using multi-source replication:
```
STOP REPLICA [FOR CHANNEL 'channel'];
CHANGE REPLICATION SOURCE TO
    SOURCE_AUTO_POSITION = 0,
    SOURCE_LOG_FILE = 'file',
    SOURCE_LOG_POS = position
    [FOR CHANNEL 'channel'];
START REPLICA [FOR CHANNEL 'channel'];
```


You can obtain the values for file and position from the relay_source_log_file and exec_source_log_position columns in the output of SHOW REPLICA STATUS. The file and channel names are strings; both of these must be quoted when used in the STOP REPLICA, CHANGE REPLICATION SOURCE TO, and START REPLICA statements.
2. On each server, execute the following statement:
```
SET @@global.gtid_mode = ON_PERMISSIVE;
```

3. On each server, execute the following statement:

SET @@global.gtid_mode = OFF_PERMISSIVE;
4. On each server, wait until the global value of gtid_owned is equal to the empty string. This can be checked using the statement shown here:

SELECT @@global.gtid_owned;
On a replica, it is theoretically possible that this is empty and then becomes nonempty again. This is not a problem; it suffices that the value is empty at least once.
5. Wait for all transactions that currently exist in any binary log to be committed on all replicas. See Section 19.1.4.4, "Verifying Replication of Anonymous Transactions", for one method of checking that all anonymous transactions have replicated to all servers.
6. If you use binary logs for anything other than replication-for example, to perform point-in-time backup or restore-wait until you no longer need any old binary logs containing GTID transactions.

For instance, after the previous step has completed, you can execute FLUSH LOGS on the server where you are taking the backup. Then, either take a backup manually, or wait for the next iteration of any periodic backup routine you may have set up.

Ideally, you should wait for the server to purge all binary logs that existed when step 5 was completed, and for any backup taken before then to expire.

You should keep in mind that logs containing GTID transactions cannot be used after the next step. For this reason, before proceeding further, you must be sure that no uncommitted GTID transactions exist anywhere in the topology.
7. On each server, execute the following statement:

SET @@global.gtid_mode = OFF;
8. On each server, set gtid_mode=0FF in my.cnf.

Optionally, you can also set enforce_gtid_consistency=0FF. After doing so, you should add enforce_gtid_consistency=0FF to your configuration file.

If you want to downgrade to an earlier version of MySQL, you can do so now, using the normal downgrade procedure.

\subsection*{19.1.4.4 Verifying Replication of Anonymous Transactions}

This section explains how to monitor a replication topology and verify that all anonymous transactions have been replicated. This is helpful when changing the replication mode online as you can verify that it is safe to change to GTID transactions.

There are several possible ways to wait for transactions to replicate:
The simplest method, which works regardless of your topology but relies on timing is as follows: If you are sure that the replica never lags more than $N$ seconds, wait any period of time that is longer than $N$ seconds, which you consider safe for your deployment.

A safer method, in the sense that it does not depend on timing, if you only have a source with one or more replicas, is to perform the following two steps:
1. On the source, execute this statement:

SHOW BINARY LOG STATUS;
Make a note of the values displayed in the File and Position columns of the output.
2. On each replica, use the file and position information from the source to perform the statement shown here:
```
SELECT SOURCE_POS_WAIT(file, position);
```


If you have a source and multiple levels of replicas (that is, replicas of replicas), repeat the second step on each level, starting from the source, then on all of its replicas, then on all of the replicas of these replicas, and so on.

If you emply a circular replication topology where multiple servers may have write clients, perform the second step for each source-replica connection, until you have completed the full circle. Repeat this process so that you complete the full circle twice.

For example, if there are three servers $\mathrm{A}, \mathrm{B}$, and C , replicating in a circle, so that A replicates to $\mathrm{B}, \mathrm{B}$ replicates to C , and C replicates to A , do as follows, in the order shown:
- Perform Step 1 on A, and Step 2 on B.
- Perform Step 1 on B, and Step 2 on C.
- Perform Step 1 on C, and Step 2 on A.
- Perform Step 1 on A, and Step 2 on B.
- Perform Step 1 on B, and Step 2 on C.
- Perform Step 1 on C, and Step 2 on A.

\subsection*{19.1.5 MySQL Multi-Source Replication}

Multi-source replication in MySQL 8.4 enables a replica to receive transactions from multiple immediate sources in parallel. In a multi-source replication topology, a replica creates a replication channel for each source that it should receive transactions from. For more information on how replication channels function, see Section 19.2.2, "Replication Channels".

You might choose to implement multi-source replication to achieve goals like these:
- Backing up multiple servers to a single server.
- Merging table shards.
- Consolidating data from multiple servers to a single server.

Multi-source replication does not implement any conflict detection or resolution when applying transactions, and those tasks are left to the application if required.

> Note
> Each channel on a multi-source replica must replicate from a different source. You cannot set up multiple replication channels from a single replica to a single source. This is because the server IDs of replicas must be unique in a replication topology. The source distinguishes replicas only by their server IDs, not by the names of the replication channels, so it cannot recognize different replication channels from the same replica.

A multi-source replica can also be set up as a multi-threaded replica, by setting the system variable replica_parallel_workers to a value greater than 0 . When you do this on a multi-source replica, each channel on the replica has the specified number of applier threads, plus a coordinator thread to manage them. You cannot configure the number of applier threads for individual channels.

MySQL 8.4 also supports replication filters on specific replication channels with multi-source replicas. Channel specific replication filters can be used when the same database or table is present on multiple
sources, and you only need the replica to replicate it from one source. For GTID-based replication, if the same transaction might arrive from multiple sources (such as in a diamond topology), you must ensure the filtering setup is the same on all channels. For more information, see Section 19.2.5.4, "Replication Channel Based Filters".

This section provides tutorials on how to configure sources and replicas for multi-source replication, how to start, stop and reset multi-source replicas, and how to monitor multi-source replication.

\subsection*{19.1.5.1 Configuring Multi-Source Replication}

A multi-source replication topology requires at least two sources and one replica configured. In these tutorials, we assume that you have two sources source1 and source2, and a replica replicahost. The replica replicates one database from each of the sources, db1 from source1 and db2 from source2.

Sources in a multi-source replication topology can be configured to use either GTID-based replication, or binary log position-based replication. See Section 19.1.3.4, "Setting Up Replication Using GTIDs" for how to configure a source using GTID-based replication. See Section 19.1.2.1, "Setting the Replication Source Configuration" for how to configure a source using file position based replication.

Replicas in a multi-source replication topology require TABLE repositories for the replica's connection metadata repository and applier metadata repository, which are the default in MySQL 8.4. Multi-source replication is not compatible with the deprecated alternative file repositories.

Create a suitable user account on all the sources that the replica can use to connect. You can use the same account on all the sources, or a different account on each. If you create an account solely for the purposes of replication, that account needs only the REPLICATION SLAVE privilege. For example, to set up a new user, ted, that can connect from the replica replicahost, use the mysql client to issue these statements on each of the sources:
mysql> CREATE USER 'ted'@'replicahost' IDENTIFIED BY 'password';
mysql> GRANT REPLICATION SLAVE ON *.* TO 'ted'@'replicahost';
For more information about the default authentication plugin for new users, see Section 19.1.2.3, "Creating a User for Replication".

\subsection*{19.1.5.2 Provisioning a Multi-Source Replica for GTID-Based Replication}

If the sources in the multi-source replication topology have existing data, it can save time to provision the replica with the relevant data before starting replication. In a multi-source replication topology, cloning or copying of the data directory cannot be used to provision the replica with data from all of the sources, and you might also want to replicate only specific databases from each source. The best strategy for provisioning such a replica is therefore to use mysqldump to create an appropriate dump file on each source, then use the mysql client to import the dump file on the replica.

If you are using GTID-based replication, you need to pay attention to the SET @@GLOBAL.gtid_purged statement that mysqldump places in the dump output. This statement transfers the GTIDs for the transactions executed on the source to the replica, and the replica requires this information. However, for any case more complex than provisioning one new, empty replica from one source, you need to check what effect the statement has in the version of MySQL used by the replica, and handle the statement accordingly. The following guidance summarizes suitable actions, but for more details, see the mysqldump documentation.

SET @@GLOBAL.gtid_purged adds the GTID set from the dump file to the existing gtid_purged set on the replica. The statement can therefore potentially be left in the dump output when you replay the dump files on the replica, and the dump files can be replayed at different times. However, it is important to note that the value that is included by mysqldump for the SET @@GLOBAL.gtid_purged statement includes the GTIDs of all transactions in the gtid_executed set on the source, even those that changed suppressed parts of the database, or other databases on the server that were not included in a partial dump. If you replay a second or subsequent dump file on the replica that contains
any of the same GTIDs (for example, another partial dump from the same source, or a dump from another source that has overlapping transactions), any SET @@GLOBAL.gtid_purged statement in the second dump file fails, and must therefore be removed from the dump output.

As an alternative to removing the SET @@GLOBAL.gtid_purged statement, you can invoke mysqldump with--set-gtid-purged=COMMENTED to include the statement encased in SQL comments, so that it is not performed when you load the dump file. If you are provisioning the replica with two partial dumps from the same source, and the GTID set in the second dump is the same as the first (so no new transactions have been executed on the source in between the dumps), you can set -set-gtid-purged=0FF instead when you export the second dump file, to omit the statement.

In the following provisioning example, we assume that the SET @@GLOBAL.gtid_purged statement cannot be left in the dump output, and must be removed from the files and handled manually. We also assume that there are no wanted transactions with GTIDs on the replica before provisioning starts.
1. To create dump files for a database named db1 on source1 and a database named db2 on source2, run mysqldump for source1 as follows:
```
mysqldump -u<user> -p<password> --single-transaction --triggers --routines --set-gtid-purged=ON --da
```


Then run mysqldump for source2 as follows:
```
mysqldump -u<user> -p<password> --single-transaction --triggers --routines --set-gtid-purged=ON --dz
```

2. Record the gtid_purged value that mysqldump added to each of the dump files. You can extract the value like this:
```
cat dumpM1.sql | grep GTID_PURGED | perl -p0 -e 's#/\*.*?\*/##sg' | cut -f2 -d'=' | cut -f2 -d$'\''
cat dumpM2.sql | grep GTID_PURGED | perl -p0 -e 's#/\*.*?\*/##sg' | cut -f2 -d'=' | cut -f2 -d$'\''
```


The result in each case should be a GTID set, for example:
```
source1: 2174B383-5441-11E8-B90A-C80AA9429562:1-1029
source2: 224DA167-0C0C-11E8-8442-00059A3C7B00:1-2695
```

3. Remove the line from each dump file that contains the SET @@GLOBAL.gtid_purged statement.

For example:
```
sed '/GTID_PURGED/d' dumpM1.sql > dumpM1_nopurge.sql
sed '/GTID_PURGED/d' dumpM2.sql > dumpM2_nopurge.sql
```

4. Use the mysql client to import each edited dump file into the replica. For example:
```
mysql -u<user> -p<password> < dumpM1_nopurge.sql
mysql -u<user> -p<password> < dumpM2_nopurge.sql
```

5. On the replica, issue RESET BINARY LOGS AND GTIDS to clear the GTID execution history (assuming, as explained above, that all the dump files have been imported and that there are no wanted transactions with GTIDs on the replica). Then issue a SET @@GLOBAL.gtid_purged statement to set the gtid_purged value to the union of all the GTID sets from all the dump files, as you recorded in Step 2. For example:
```
mysql> RESET BINARY LOGS AND GTIDS;
mysql> SET @@GLOBAL.gtid_purged = "2174B383-5441-11E8-B90A-C80AA9429562:1-1029, 224DA167-0C0C-11E8-8
```


If there are, or might be, overlapping transactions between the GTID sets in the dump files, you can use the stored functions described in Section 19.1.3.8, "Stored Function Examples to Manipulate GTIDs" to check this beforehand and to calculate the union of all the GTID sets.

\subsection*{19.1.5.3 Adding GTID-Based Sources to a Multi-Source Replica}

These steps assume you have enabled GTIDs for transactions on the sources using gtid_mode=0N, created a replication user, ensured that the replica is using TABLE based replication applier metadata repositories, and provisioned the replica with data from the sources if appropriate.

Use CHANGE REPLICATION SOURCE TO to configure a replication channel for each source on the replica (see Section 19.2.2, "Replication Channels"). The FOR CHANNEL clause is used to specify the channel. For GTID-based replication, GTID auto-positioning is used to synchronize with the source (see Section 19.1.3.3, "GTID Auto-Positioning"). The SOURCE_AUTO_POSITION option is set to specify the use of auto-positioning.

For example, to add source1 and source2 as sources to the replica, use the mysql client to issue the statement twice on the replica, like this:
```
mysql> CHANGE REPLICATION SOURCE TO SOURCE_HOST="source1", SOURCE_USER="ted", \
SOURCE_PASSWORD="password", SOURCE_AUTO_POSITION=1 FOR CHANNEL "source_1";
mysql> CHANGE REPLICATION SOURCE TO SOURCE_HOST="source2", SOURCE_USER="ted", \
SOURCE_PASSWORD="password", SOURCE_AUTO_POSITION=1 FOR CHANNEL "source_2";
```


To make the replica replicate only database db1 from source1, and only database db2 from source2, use the mysql client to issue the CHANGE REPLICATION FILTER statement for each channel, like this:
```
mysql> CHANGE REPLICATION FILTER REPLICATE_WILD_DO_TABLE = ('db1.%') FOR CHANNEL "source_1";
mysql> CHANGE REPLICATION FILTER REPLICATE_WILD_DO_TABLE = ('db2.%') FOR CHANNEL "source_2";
```


For the full syntax of the CHANGE REPLICATION FILTER statement and other available options, see Section 15.4.2.1, "CHANGE REPLICATION FILTER Statement".

\subsection*{19.1.5.4 Adding Binary Log Based Replication Sources to a Multi-Source Replica}

These steps assume that binary logging is enabled on the source (which is the default), the replica is using TABLE based replication applier metadata repositories (which is the default in MySQL 8.4), and that you have enabled a replication user and noted the current binary log file name and position.

Use a CHANGE REPLICATION SOURCE TO statement to configure a replication channel for each source on the replica (see Section 19.2.2, "Replication Channels"). The FOR CHANNEL clause is used to specify the channel. For example, to add source1 and source2 as sources to the replica, use the mysql client to issue the statement twice on the replica, like this:
```
mysql> CHANGE REPLICATION SOURCE TO SOURCE_HOST="source1", SOURCE_USER="ted", SOURCE_PASSWORD="password",
SOURCE_LOG_FILE='source1-bin.000006', SOURCE_LOG_POS=628 FOR CHANNEL "source_1";
mysql> CHANGE REPLICATION SOURCE TO SOURCE_HOST="source2", SOURCE_USER="ted", SOURCE_PASSWORD="password",
SOURCE_LOG_FILE='source2-bin.000018', SOURCE_LOG_POS=104 FOR CHANNEL "source_2";
```


To make the replica replicate only database db1 from source1, and only database db2 from source2, use the mysql client to issue the CHANGE REPLICATION FILTER statement for each channel, like this:
```
mysql> CHANGE REPLICATION FILTER REPLICATE_WILD_DO_TABLE = ('db1.%') FOR CHANNEL "source_1";
mysql> CHANGE REPLICATION FILTER REPLICATE_WILD_DO_TABLE = ('db2.%') FOR CHANNEL "source_2";
```


For the full syntax of the CHANGE REPLICATION FILTER statement and other available options, see Section 15.4.2.1, "CHANGE REPLICATION FILTER Statement".

\subsection*{19.1.5.5 Starting Multi-Source Replicas}

Once you have added channels for all of the replication sources, issue a START REPLICA statement to start replication. When you have enabled multiple channels on a replica, you can choose to either start all channels, or select a specific channel to start. For example, to start the two channels separately, use the mysql client to issue the following statements:
```
mysql> START REPLICA FOR CHANNEL "source_1";
mysql> START REPLICA FOR CHANNEL "source_2";
```


For the full syntax of the START REPLICA statement and other available options, see Section 15.4.2.4, "START REPLICA Statement".

To verify that both channels have started and are operating correctly, you can issue SHOW REPLICA STATUS statements on the replica, for example:
```
mysql> SHOW REPLICA STATUS FOR CHANNEL "source_1"\G
mysql> SHOW REPLICA STATUS FOR CHANNEL "source_2"\G
```


\subsection*{19.1.5.6 Stopping Multi-Source Replicas}

The STOP REPLICA statement can be used to stop a multi-source replica. By default, if you use the STOP REPLICA statement on a multi-source replica all channels are stopped. Optionally, use the FOR CHANNEL channel clause to stop only a specific channel.
- To stop all currently configured replication channels:
```
mysql> STOP REPLICA;
```

- To stop only a named channel, use a FOR CHANNEL channel clause:
```
mysql> STOP REPLICA FOR CHANNEL "source_1";
```


For the full syntax of the STOP REPLICA statement and other available options, see Section 15.4.2.5, "STOP REPLICA Statement".

\subsection*{19.1.5.7 Resetting Multi-Source Replicas}

The RESET REPLICA statement can be used to reset a multi-source replica. By default, if you use the RESET REPLICA statement on a multi-source replica all channels are reset. Optionally, use the FOR CHANNEL channel clause to reset only a specific channel.
- To reset all currently configured replication channels:
```
mysql> RESET REPLICA;
```

- To reset only a named channel, use a FOR CHANNEL channel clause:
```
mysql> RESET REPLICA FOR CHANNEL "source_1";
```


For GTID-based replication, note that RESET REPLICA has no effect on the replica's GTID execution history. If you want to clear this, issue RESET BINARY LOGS AND GTIDS on the replica.

RESET REPLICA makes the replica forget its replication position, and clears the relay log, but it does not change any replication connection parameters (such as the source host name) or replication filters. If you want to remove these for a channel, issue RESET REPLICA ALL.

\subsection*{19.1.5.8 Monitoring Multi-Source Replication}

To monitor the status of replication channels the following options exist:
- Using the replication Performance Schema tables. The first column of these tables is Channel_Name. This enables you to write complex queries based on Channel_Name as a key. See Section 29.12.11, "Performance Schema Replication Tables".
- Using SHOW REPLICA STATUS FOR CHANNEL channel. By default, if the FOR CHANNEL channel clause is not used, this statement shows the replica status for all channels with one row per channel. The identifier Channel_name is added as a column in the result set. If a FOR CHANNEL channel clause is provided, the results show the status of only the named replication channel.

\section*{Note}

The SHOW VARIABLES statement does not work with multiple replication channels. The information that was available through these variables has been migrated to the replication performance tables. Using a SHOW VARIABLES statement in a topology with multiple channels shows the status of only the default channel.

The error codes and messages that are issued when multi-source replication is enabled specify the channel that generated the error.

\section*{Monitoring Channels Using Performance Schema Tables}

This section explains how to use the replication Performance Schema tables to monitor channels. You can choose to monitor all channels, or a subset of the existing channels.

To monitor the connection status of all channels:
```
mysql> SELECT * FROM replication_connection_status\G;
************************** 1. row ******************************
CHANNEL_NAME: source_1
GROUP_NAME:
SOURCE_UUID: 046e41f8-a223-11e4-a975-0811960cc264
THREAD_ID: 24
SERVICE_STATE: ON
COUNT_RECEIVED_HEARTBEATS: 0
LAST_HEARTBEAT_TIMESTAMP: 0000-00-00 00:00:00
RECEIVED_TRANSACTION_SET: 046e41f8-a223-11e4-a975-0811960cc264:4-37
LAST_ERROR_NUMBER: 0
LAST_ERROR_MESSAGE:
LAST_ERROR_TIMESTAMP: 0000-00-00 00:00:00
************************** 2. row ******************************
CHANNEL_NAME: source_2
GROUP_NAME:
SOURCE_UUID: 7475e474-a223-11e4-a978-0811960cc264
THREAD_ID: 26
SERVICE_STATE: ON
COUNT_RECEIVED_HEARTBEATS: 0
LAST_HEARTBEAT_TIMESTAMP: 0000-00-00 00:00:00
RECEIVED_TRANSACTION_SET: 7475e474-a223-11e4-a978-0811960cc264:4-6
LAST_ERROR_NUMBER: 0
LAST_ERROR_MESSAGE:
LAST_ERROR_TIMESTAMP: 0000-00-00 00:00:00
2 rows in set (0.00 sec)
```


In the above output there are two channels enabled, and as shown by the CHANNEL_NAME field they are called source_1 and source_2.

The addition of the CHANNEL_NAME field enables you to query the Performance Schema tables for a specific channel. To monitor the connection status of a named channel, use a WHERE CHANNEL_NAME=channel clause:
```
mysql> SELECT * FROM replication_connection_status WHERE CHANNEL_NAME='source_1'\G
*************************** 1. row *****************************
CHANNEL_NAME: source_1
GROUP_NAME:
SOURCE_UUID: 046e41f8-a223-11e4-a975-0811960cc264
THREAD_ID: 24
SERVICE_STATE: ON
COUNT_RECEIVED_HEARTBEATS: 0
LAST_HEARTBEAT_TIMESTAMP: 0000-00-00 00:00:00
RECEIVED_TRANSACTION_SET: 046e41f8-a223-11e4-a975-0811960cc264:4-37
LAST_ERROR_NUMBER: 0
LAST_ERROR_MESSAGE:
LAST_ERROR_TIMESTAMP: 0000-00-00 00:00:00
1 row in set (0.00 sec)
```


Similarly, the WHERE CHANNEL_NAME=channel clause can be used to monitor the other replication Performance Schema tables for a specific channel. For more information, see Section 29.12.11, "Performance Schema Replication Tables".

\subsection*{19.1.6 Replication and Binary Logging Options and Variables}

The following sections contain information about mysqld options and server variables that are used in replication and for controlling the binary log. Options and variables for use on sources and replicas
are covered separately, as are options and variables relating to binary logging and global transaction identifiers (GTIDs). A set of quick-reference tables providing basic information about these options and variables is also included.

Of particular importance is the server_id system variable.

\begin{tabular}{|l|l|}
\hline Command-Line Format & --server-id=\# \\
\hline System Variable & server_id \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

This variable specifies the server ID. server_id is set to 1 by default. The server can be started with this default ID, but when binary logging is enabled, an informational message is issued if you did not set server_id explicitly to specify a server ID.

For servers that are used in a replication topology, you must specify a unique server ID for each replication server, in the range from 1 to $2^{32}-1$. "Unique" means that each ID must be different from every other ID in use by any other source or replica in the replication topology. For additional information, see Section 19.1.6.2, "Replication Source Options and Variables", and Section 19.1.6.3, "Replica Server Options and Variables".

If the server ID is set to 0 , binary logging takes place, but a source with a server ID of 0 refuses any connections from replicas, and a replica with a server ID of 0 refuses to connect to a source. Note that although you can change the server ID dynamically to a nonzero value, doing so does not enable replication to start immediately. You must change the server ID and then restart the server to initialize the replica.

For more information, see Section 19.1.2.2, "Setting the Replica Configuration".
server_uuid
The MySQL server generates a true UUID in addition to the default or user-supplied server ID set in the server_id system variable. This is available as the global, read-only variable server_uuid.

\section*{Note}

The presence of the server_uuid system variable does not change the requirement for setting a unique server_id value for each MySQL server as part of preparing and running MySQL replication, as described earlier in this section.

\begin{tabular}{|l|l|}
\hline System Variable & server_uuid \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

When starting, the MySQL server automatically obtains a UUID as follows:
1. Attempt to read and use the UUID written in the file data_dir/auto.cnf (where data_dir is the server's data directory).
2. If data_dir/auto.cnf is not found, generate a new UUID and save it to this file, creating the file if necessary.

The auto. cnf file has a format similar to that used for my.cnf or my.ini files. auto.cnf has only a single [auto] section containing a single server_uuid setting and value; the file's contents appear similar to what is shown here:
```
[auto]
server_uuid=8a94f357-aab4-11df-86ab-c80aa9429562
```


\section*{Important}

The auto. cnf file is automatically generated; do not attempt to write or modify this file.

When using MySQL replication, sources and replicas know each other's UUIDs. The value of a replica's UUID can be seen in the output of SHOW REPLICAS. Once START REPLICA has been executed, the value of the source's UUID is available on the replica in the output of SHOW REPLICA STATUS.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3410.jpg?height=120&width=99&top_left_y=1011&top_left_x=306)

\section*{Note}

Issuing a STOP REPLICA or RESET REPLICA statement does not reset the source's UUID as used on the replica.

A server's server_uuid is also used in GTIDs for transactions originating on that server. For more information, see Section 19.1.3, "Replication with Global Transaction Identifiers".

When starting, the replication I/O (receiver) thread generates an error and aborts if its source's UUID is equal to its own unless the --replicate-same-server-id option has been set. In addition, the replication receiver thread generates a warning if either of the following is true:
- No source having the expected server_uuid exists.
- The source's server_uuid has changed, although no CHANGE REPLICATION SOURCE TO statement has ever been executed.

\subsection*{19.1.6.1 Replication and Binary Logging Option and Variable Reference}

The following two sections provide basic information about the MySQL command-line options and system variables applicable to replication and the binary log.

\section*{Replication Options and Variables}

The command-line options and system variables in the following list relate to replication source servers and replicas. Section 19.1.6.2, "Replication Source Options and Variables" provides more detailed information about options and variables relating to replication source servers. For more information about options and variables relating to replicas, see Section 19.1.6.3, "Replica Server Options and Variables".
- auto_increment_increment: AUTO_INCREMENT columns are incremented by this value.
- auto_increment_offset: Offset added to AUTO_INCREMENT columns.
- Com_change_replication_source: Count of CHANGE REPLICATION SOURCE TO and CHANGE MASTER TO statements.
- Com_replica_start: Count of START REPLICA and START SLAVE statements.
- Com_replica_stop: Count of STOP REPLICA and STOP SLAVE statements.
- Com_show_binary_log_status: Count of SHOW BINARY LOG STATUS statements; use instead of Com_show_master_status.
- Com_show_replica_status: Count of SHOW REPLICA STATUS and SHOW SLAVE STATUS statements.
- Com_show_replicas: Count of SHOW REPLICAS and SHOW SLAVE HOSTS statements.
- enforce_gtid_consistency: Prevents execution of statements that cannot be logged in transactionally safe manner.
- gtid_executed: Global: All GTIDs in binary log (global) or current transaction (session). Readonly.
- gtid_executed_compression_period: Compress gtid_executed table each time this many transactions have occurred. 0 means never compress this table. Applies only when binary logging is disabled.
- gtid_mode: Controls whether GTID based logging is enabled and what type of transactions logs can contain.
- gtid_next: Specifies GTID for subsequent transaction or transactions; see documentation for details.
- gtid_owned: Set of GTIDs owned by this client (session), or by all clients, together with thread ID of owner (global). Read-only.
- gtid_purged: Set of all GTIDs that have been purged from binary log.
- immediate_server_version: MySQL Server release number of server which is immediate replication source.
- init_replica: Statements that are executed when replica connects to source.
- init_slave: Statements that are executed when replica connects to source.
- log_bin_trust_function_creators: If equal to 0 (default), then when --log-bin is used, stored function creation is allowed only to users having SUPER privilege and only if function created does not break binary logging.
- log_statements_unsafe_for_binlog: Disables error 1592 warnings being written to error log.
- master-retry-count: Number of tries replica makes to connect to source before giving up.
- max_relay_log_size: If nonzero, relay log is rotated automatically when its size exceeds this value. If zero, size at which rotation occurs is determined by value of max_binlog_size.
- original_commit_timestamp: Time when transaction was committed on original source.
- original_server_version: MySQL Server release number of server on which transaction was originally committed.
- relay_log: Location and base name to use for relay logs.
- relay_log_basename: Complete path to relay log, including file name.
- relay_log_index: Location and name to use for file that keeps list of last relay logs.
- relay_log_purge: Determines whether relay logs are purged.
- relay_log_recovery: Whether automatic recovery of relay log files from source at startup is enabled; must be enabled for crash-safe replica.
- relay_log_space_limit: Maximum space to use for all relay logs.
- replica_checkpoint_group: Maximum number of transactions processed by multithreaded replica before checkpoint operation is called to update progress status. Not supported by NDB Cluster.
- replica_checkpoint_period: Update progress status of multithreaded replica and flush relay log info to disk after this number of milliseconds. Not supported by NDB Cluster.
- replica_compressed_protocol: Use compression of source/replica protocol.
- replica_exec_mode: Allows for switching replication thread between IDEMPOTENT mode (key and some other errors suppressed) and STRICT mode; STRICT mode is default, except for NDB Cluster, where IDEMPOTENT is always used.
- replica_load_tmpdir: Location where replica should put its temporary files when replicating LOAD DATA statements.
- replica_max_allowed_packet: Maximum size, in bytes, of packet that can be sent from replication source server to replica; overrides max_allowed_packet.
- replica_net_timeout: Number of seconds to wait for more data from source/replica connection before aborting read.
- Replica_open_temp_tables: Number of temporary tables that replication SQL thread currently has open.
- replica_parallel_type: Tells replica to use timestamp information (LOGICAL_CLOCK) or database partitioning (DATABASE) to parallelize transactions.
- replica_parallel_workers: Number of applier threads for executing replication transactions. NDB Cluster: see documentation.
- replica_pending_jobs_size_max: Maximum size of replica worker queues holding events not yet applied.
- replica_preserve_commit_order: Ensures that all commits by replica workers happen in same order as on source to maintain consistency when using parallel applier threads.
- replica_skip_errors: Tells replication thread to continue replication when query returns error from provided list.
- replica_transaction_retries: Number of times replication SQL thread retries transaction in case it failed with deadlock or elapsed lock wait timeout, before giving up and stopping.
- replica_type_conversions: Controls type conversion mode on replica. Value is list of zero or more elements from this list: ALL_LOSSY, ALL_NON_LOSSY. Set to empty string to disallow type conversions between source and replica.
- replicate-do-db: Tells replication SQL thread to restrict replication to specified database.
- replicate-do-table: Tells replication SQL thread to restrict replication to specified table.
-replicate-ignore-db: Tells replication SQL thread not to replicate to specified database.
- replicate-ignore-table: Tells replication SQL thread not to replicate to specified table.
-replicate-rewrite-db: Updates to database with different name from original.
- replicate-same-server-id: In replication, if enabled, do not skip events having our server id.
- replicate-wild-do-table: Tells replication SQL thread to restrict replication to tables that match specified wildcard pattern.
- replicate-wild-ignore-table: Tells replication SQL thread not to replicate to tables that match given wildcard pattern.
- replication_optimize_for_static_plugin_config: Shared locks for semisynchronous replication.
- replication_sender_observe_commit_only: Limited callbacks for semisynchronous replication.
- report_host: Host name or IP of replica to be reported to source during replica registration.
- report_password: Arbitrary password which replica server should report to source; not same as password for replication user account.
- report_port: Port for connecting to replica reported to source during replica registration.
- report_user: Arbitrary user name which replica server should report to source; not same as name used for replication user account.
-rpl_read_size: Set minimum amount of data in bytes which is read from binary log files and relay log files.
- Rpl_semi_sync_master_clients: Number of semisynchronous replicas.
- rpl_semi_sync_master_enabled: Whether semisynchronous replication is enabled on source.
- Rpl_semi_sync_master_net_avg_wait_time: Average time source has waited for replies from replica.
- Rpl_semi_sync_master_net_wait_time: Total time source has waited for replies from replica.
- Rpl_semi_sync_master_net_waits: Total number of times source waited for replies from replica.
- Rpl_semi_sync_master_no_times: Number of times source turned off semisynchronous replication.
- Rpl_semi_sync_master_no_tx: Number of commits not acknowledged successfully.
- Rpl_semi_sync_master_status: Whether semisynchronous replication is operational on source.
- Rpl_semi_sync_master_timefunc_failures: Number of times source failed when calling time functions.
- rpl_semi_sync_master_timeout: Number of milliseconds to wait for replica acknowledgment.
- rpl_semi_sync_master_trace_level: Semisynchronous replication debug trace level on source.
- Rpl_semi_sync_master_tx_avg_wait_time: Average time source waited for each transaction.
- Rpl_semi_sync_master_tx_wait_time: Total time source waited for transactions.
- Rpl_semi_sync_master_tx_waits: Total number of times source waited for transactions.
- rpl_semi_sync_master_wait_for_slave_count: Number of replica acknowledgments source must receive per transaction before proceeding.
- rpl_semi_sync_master_wait_no_slave: Whether source waits for timeout even with no replicas.
- rpl_semi_sync_master_wait_point: Wait point for replica transaction receipt acknowledgment.
- Rpl_semi_sync_master_wait_pos_backtraverse: Total number of times source has waited for event with binary coordinates lower than events waited for previously.
- Rpl_semi_sync_master_wait_sessions: Number of sessions currently waiting for replica replies.
- Rpl_semi_sync_master_yes_tx: Number of commits acknowledged successfully.
- rpl_semi_sync_replica_enabled: Whether semisynchronous replication is enabled on replica.
- Rpl_semi_sync_replica_status: Whether semisynchronous replication is operational on replica.
- rpl_semi_sync_replica_trace_level: Semisynchronous replication debug trace level on replica.
- rpl_semi_sync_slave_enabled: Whether semisynchronous replication is enabled on replica.
- Rpl_semi_sync_slave_status: Whether semisynchronous replication is operational on replica.
-rpl_semi_sync_slave_trace_level: Semisynchronous replication debug trace level on replica.
- Rpl_semi_sync_source_clients: Number of semisynchronous replicas.
-rpl_semi_sync_source_enabled: Whether semisynchronous replication is enabled on source.
- Rpl_semi_sync_source_net_avg_wait_time: Average time source has waited for replies from replica.
- Rpl_semi_sync_source_net_wait_time: Total time source has waited for replies from replica.
- Rpl_semi_sync_source_net_waits: Total number of times source waited for replies from replica.
- Rpl_semi_sync_source_no_times: Number of times source turned off semisynchronous replication.
- Rpl_semi_sync_source_no_tx: Number of commits not acknowledged successfully.
- Rpl_semi_sync_source_status: Whether semisynchronous replication is operational on source.
- Rpl_semi_sync_source_timefunc_failures: Number of times source failed when calling time functions.
- rpl_semi_sync_source_timeout: Number of milliseconds to wait for replica acknowledgment.
- rpl_semi_sync_source_trace_level: Semisynchronous replication debug trace level on source.
- Rpl_semi_sync_source_tx_avg_wait_time: Average time source waited for each transaction.
- Rpl_semi_sync_source_tx_wait_time: Total time source waited for transactions.
- Rpl_semi_sync_source_tx_waits: Total number of times source waited for transactions.
- rpl_semi_sync_source_wait_for_replica_count: Number of replica acknowledgments source must receive per transaction before proceeding.
- rpl_semi_sync_source_wait_no_replica: Whether source waits for timeout even with no replicas.
- rpl_semi_sync_source_wait_point: Wait point for replica transaction receipt acknowledgment.
- Rpl_semi_sync_source_wait_pos_backtraverse: Total number of times source has waited for event with binary coordinates lower than events waited for previously.
- Rpl_semi_sync_source_wait_sessions: Number of sessions currently waiting for replica replies.
- Rpl_semi_sync_source_yes_tx: Number of commits acknowledged successfully.
- rpl_stop_replica_timeout: Number of seconds that STOP REPLICA waits before timing out.
- rpl_stop_slave_timeout: Number of seconds that STOP REPLICA or STOP SLAVE waits before timing out.
- server_uuid: Server's globally unique ID, automatically (re)generated at server start.
- show-replica-auth-info: Show user name and password in SHOW REPLICAS on this source.
- show-slave-auth-info: Show user name and password in SHOW REPLICAS and SHOW SLAVE HOSTS on this source.
- skip-replica-start: If set, replication is not autostarted when replica server starts.
- skip-slave-start: If set, replication is not autostarted when replica server starts.
- slave-skip-errors: Tells replication thread to continue replication when query returns error from provided list.
- slave_checkpoint_group: Maximum number of transactions processed by multithreaded replica before checkpoint operation is called to update progress status. Not supported by NDB Cluster.
- slave_checkpoint_period: Update progress status of multithreaded replica and flush relay log info to disk after this number of milliseconds. Not supported by NDB Cluster.
- slave_compressed_protocol: Use compression of source/replica protocol.
- slave_exec_mode: Allows for switching replication thread between IDEMPOTENT mode (key and some other errors suppressed) and STRICT mode; STRICT mode is default, except for NDB Cluster, where IDEMPOTENT is always used.
- slave_load_tmpdir: Location where replica should put its temporary files when replicating LOAD DATA statements.
- slave_max_allowed_packet: Maximum size, in bytes, of packet that can be sent from replication source server to replica; overrides max_allowed_packet.
- slave_net_timeout: Number of seconds to wait for more data from source/replica connection before aborting read.
- Slave_open_temp_tables: Number of temporary tables that replication SQL thread currently has open.
- slave_parallel_type: Tells replica to use timestamp information (LOGICAL_CLOCK) or database partioning (DATABASE) to parallelize transactions.
- slave_parallel_workers: Number of applier threads for executing replication transactions in parallel; 0 or 1 disables replica multithreading. NDB Cluster: see documentation.
- slave_pending_jobs_size_max: Maximum size of replica worker queues holding events not yet applied.
- slave_preserve_commit_order: Ensures that all commits by replica workers happen in same order as on source to maintain consistency when using parallel applier threads.
- Slave_rows_last_search_algorithm_used: Search algorithm most recently used by this replica to locate rows for row-based replication (index, table, or hash scan).
- slave_transaction_retries: Number of times replication SQL thread retries transaction in case it failed with deadlock or elapsed lock wait timeout, before giving up and stopping.
- slave_type_conversions: Controls type conversion mode on replica. Value is list of zero or more elements from this list: ALL_LOSSY, ALL_NON_LOSSY. Set to empty string to disallow type conversions between source and replica.
- sql_log_bin: Controls binary logging for current session.
- sql_replica_skip_counter: Number of events from source that replica should skip. Not compatible with GTID replication.
- sql_slave_skip_counter: Number of events from source that replica should skip. Not compatible with GTID replication.
- sync_master_info: Synchronize source information after every \#th event.
- sync_relay_log: Synchronize relay log to disk after every \#th event.
- sync_relay_log_info: Synchronize relay.info file to disk after every \#th event.
- sync_source_info: Synchronize source information after every \#th event.
- terminology_use_previous: Use terminology from before specified version where changes are incompatible.

For a listing of all command-line options, system variables, and status variables used with mysqld, see Section 7.1.4, "Server Option, System Variable, and Status Variable Reference".

\section*{Binary Logging Options and Variables}

The command-line options and system variables in the following list relate to the binary log. Section 19.1.6.4, "Binary Logging Options and Variables", provides more detailed information about options and variables relating to binary logging. For additional general information about the binary log, see Section 7.4.4, "The Binary Log".
- binlog-checksum: Enable or disable binary log checksums.
- binlog-do-db: Limits binary logging to specific databases.
- binlog-ignore-db: Tells source that updates to given database should not be written to binary log.
- binlog-row-event-max-size: Binary log max event size.
- Binlog_cache_disk_use: Number of transactions which used temporary file instead of binary log cache.
- binlog_cache_size: Size of cache to hold SQL statements for binary log during transaction.
- Binlog_cache_use: Number of transactions that used temporary binary log cache.
- binlog_checksum: Enable or disable binary log checksums.
- binlog_direct_non_transactional_updates: Causes updates using statement format to nontransactional engines to be written directly to binary log. See documentation before using.
- binlog_encryption: Enable encryption for binary log files and relay log files on this server.
- binlog_error_action: Controls what happens when server cannot write to binary log.
- binlog_expire_logs_auto_purge: Controls automatic purging of binary log files; can be overridden when enabled, by setting both binlog_expire_logs_seconds and expire_logs_days to 0 .
- binlog_expire_logs_seconds: Purge binary logs after this many seconds.
- binlog_format: Specifies format of binary log.
- binlog_group_commit_sync_delay: Sets number of microseconds to wait before synchronizing transactions to disk.
- binlog_group_commit_sync_no_delay_count: Sets maximum number of transactions to wait for before aborting current delay specified by binlog_group_commit_sync_delay.
- binlog_gtid_simple_recovery: Controls how binary logs are iterated during GTID recovery.
- binlog_max_flush_queue_time: How long to read transactions before flushing to binary log.
- binlog_order_commits: Whether to commit in same order as writes to binary log.
- binlog_rotate_encryption_master_key_at_startup: Rotate binary log master key at server startup.
- binlog_row_image: Use full or minimal images when logging row changes.
- binlog_row_metadata: Whether to record all or only minimal table related metadata to binary log when using row-based logging.
- binlog_row_value_options: Enables binary logging of partial JSON updates for row-based replication.
- binlog_rows_query_log_events: When enabled, enables logging of rows query log events when using row-based logging. Disabled by default..
- Binlog_stmt_cache_disk_use: Number of nontransactional statements that used temporary file instead of binary log statement cache.
- binlog_stmt_cache_size: Size of cache to hold nontransactional statements for binary log during transaction.
- Binlog_stmt_cache_use: Number of statements that used temporary binary log statement cache.
- binlog_transaction_compression: Enable compression for transaction payloads in binary log files.
- binlog_transaction_compression_level_zstd: Compression level for transaction payloads in binary log files.
- binlog_transaction_dependency_history_size: Number of row hashes kept for looking up transaction that last updated some row.
- Com_show_binlog_events: Count of SHOW BINLOG EVENTS statements.
- Com_show_binlogs: Count of SHOW BINLOGS statements.
- log-bin: Base name for binary log files.
- log-bin-index: Name of binary log index file.
- log_bin: Whether binary log is enabled.
- log_bin_basename: Path and base name for binary log files.
- log_replica_updates: Whether replica should log updates performed by its replication SQL thread to its own binary log.
- log_slave_updates: Whether replica should log updates performed by its replication SQL thread to its own binary log.
- master_verify_checksum: Cause source to examine checksums when reading from binary log.
- max-binlog-dump-events: Option used by mysql-test for debugging and testing of replication.
- max_binlog_cache_size: Can be used to restrict total size in bytes used to cache multistatement transactions.
- max_binlog_size: Binary log is rotated automatically when size exceeds this value.
- max_binlog_stmt_cache_size: Can be used to restrict total size used to cache all nontransactional statements during transaction.
- replica_sql_verify_checksum: Cause replica to examine checksums when reading from relay log.
- slave-sql-verify-checksum: Cause replica to examine checksums when reading from relay log.
- slave_sql_verify_checksum: Cause replica to examine checksums when reading from relay log.
- source_verify_checksum: Cause source to examine checksums when reading from binary log.
- sporadic-binlog-dump-fail: Option used by mysql-test for debugging and testing of replication.
- sync_binlog: Synchronously flush binary log to disk after every \#th event.

For a listing of all command-line options, system and status variables used with mysqld, see Section 7.1.4, "Server Option, System Variable, and Status Variable Reference".

\subsection*{19.1.6.2 Replication Source Options and Variables}

This section describes the server options and system variables that you can use on replication source servers. You can specify the options either on the command line or in an option file. You can specify system variable values using SET.

On the source and each replica, you must set the server_id system variable to establish a unique replication ID. For each server, you should pick a unique positive integer in the range from 1 to $2^{32}$ -1 , and each ID must be different from every other ID in use by any other source or replica in the replication topology. Example: server-id=3.

For options used on the source for controlling binary logging, see Section 19.1.6.4, "Binary Logging Options and Variables".

\section*{Startup Options for Replication Source Servers}

The following list describes startup options for controlling replication source servers. Replication-related system variables are discussed later in this section.
- --show-replica-auth-info

\begin{tabular}{|l|l|}
\hline Command-Line Format & --show-replica-auth-info [=\{OFF|ON\}] \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Use --show-replica-auth-info, which displays replication user names and passwords in the output of SHOW REPLICAS on the source for replicas started with the --report-user and --report-password options.
- --show-slave-auth-info

\begin{tabular}{|l|l|}
\hline Command-Line Format & --show-slave-auth-info[=\{OFF|ON\}] \\
\hline Deprecated & Yes \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Deprecated alias for --show-replica-auth-info.

\section*{System Variables Used on Replication Source Servers}

The following system variables are used for or by replication source servers:
- auto_increment_increment

\begin{tabular}{|l|l|}
\hline Command-Line Format & --auto-increment-increment=\# \\
\hline System Variable & auto_increment_increment \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 65535 \\
\hline
\end{tabular}
auto_increment_increment and auto_increment_offset are intended for use with circular (source-to-source) replication, and can be used to control the operation of AUTO_INCREMENT columns. Both variables have global and session values, and each can assume an integer value between 1 and 65,535 inclusive. Setting the value of either of these two variables to 0 causes its value to be set to 1 instead. Attempting to set the value of either of these two variables to an integer greater than 65,535 or less than 0 causes its value to be set to 65,535 instead. Attempting to set the value of auto_increment_increment or auto_increment_offset to a noninteger value produces an error, and the actual value of the variable remains unchanged.

\section*{Note}
auto_increment_increment is also supported for use with NDB tables.

When Group Replication is started on a server, the value of auto_increment_increment is changed to the value of group_replication_auto_increment_increment, which defaults to 7, and the value of auto_increment_offset is changed to the server ID. The changes are reverted when Group Replication is stopped. These changes are only made and reverted if auto_increment_increment and auto_increment_offset each have their default value of 1 . If their values have already been modified from the default, Group Replication does not alter them. These system variables are also not modified when Group Replication is in single-primary mode, where only one server writes.
auto_increment_increment and auto_increment_offset affect AUTO_INCREMENT column behavior as follows:
- auto_increment_increment controls the interval between successive column values. For example:
```
mysql> SHOW VARIABLES LIKE 'auto_inc%';
+---------------------------+-------+
| Variable_name | Value |
+---------------------------+-------+
| auto_increment_increment | 1
| auto_increment_offset | 1
+--------------------------+-------+
2 rows in set (0.00 sec)
mysql> CREATE TABLE autoinc1
        -> (col INT NOT NULL AUTO_INCREMENT PRIMARY KEY);
    Query OK, 0 rows affected (0.04 sec)
mysql> SET @@auto_increment_increment=10;
Query OK, 0 rows affected (0.00 sec)
```

```
mysql> SHOW VARIABLES LIKE 'auto_inc%';
+----------------------------+-------+
| Variable_name | Value |
+---------------------------+-------+
| auto_increment_increment | 10
| auto_increment_offset | 1
+---------------------------+-------+
2 rows in set (0.01 sec)
mysql> INSERT INTO autoinc1 VALUES (NULL), (NULL), (NULL), (NULL);
Query OK, 4 rows affected (0.00 sec)
Records: 4 Duplicates: 0 Warnings: 0
mysql> SELECT col FROM autoinc1;
+-----+
| col |
+-----+
| 1 |
| 11 |
| 21 |
| 31 |
+-----+
4 rows in set (0.00 sec)
```

- auto_increment_offset determines the starting point for the AUTO_INCREMENT column value. Consider the following, assuming that these statements are executed during the same session as the example given in the description for auto_increment_increment:
```
mysql> SET @@auto_increment_offset=5;
Query OK, 0 rows affected (0.00 sec)
mysql> SHOW VARIABLES LIKE 'auto_inc%';
+----------------------------+-------+
| Variable_name | Value |
+---------------------------+-------+
| auto_increment_increment | 10 |
| auto_increment_offset | 5
+----------------------------+-------+
2 rows in set (0.00 sec)
mysql> CREATE TABLE autoinc2
    -> (col INT NOT NULL AUTO_INCREMENT PRIMARY KEY);
Query OK, 0 rows affected (0.06 sec)
mysql> INSERT INTO autoinc2 VALUES (NULL), (NULL), (NULL), (NULL);
Query OK, 4 rows affected (0.00 sec)
Records: 4 Duplicates: 0 Warnings: 0
mysql> SELECT col FROM autoinc2;
+-----+
| col |
+-----+
| 5 |
| 15 |
| 25 |
| 35 |
+-----+
4 rows in set (0.02 sec)
```


When the value of auto_increment_offset is greater than that of auto_increment_increment, the value of auto_increment_offset is ignored.

If either of these variables is changed, and then new rows inserted into a table containing an AUTO_INCREMENT column, the results may seem counterintuitive because the series of AUTO_INCREMENT values is calculated without regard to any values already present in the column,
and the next value inserted is the least value in the series that is greater than the maximum existing value in the AUTO_INCREMENT column. The series is calculated like this:
```
auto_increment_offset + N x auto_increment_increment
```

where $N$ is a positive integer value in the series $[1,2,3, \ldots]$. For example:
```
mysql> SHOW VARIABLES LIKE 'auto_inc%';
+---------------------------+-------+
| Variable_name | Value |
+----------------------------+-------+
| auto_increment_increment | 10
| auto_increment_offset | 5 |
+---------------------------+-------+
2 rows in set (0.00 sec)
mysql> SELECT col FROM autoinc1;
+-----+
| col |
+-----+
| 1 |
| 11 |
| 21 |
| 31 |
+-----+
4 rows in set (0.00 sec)
mysql> INSERT INTO autoinc1 VALUES (NULL), (NULL), (NULL), (NULL);
Query OK, 4 rows affected (0.00 sec)
Records: 4 Duplicates: 0 Warnings: 0
mysql> SELECT col FROM autoinc1;
+-----+
| col |
+-----+
| 1 |
| 11 |
| 21 |
| 31 |
| 35 |
| 45 |
| 55 |
| 65 |
+-----+
8 rows in set (0.00 sec)
```


The values shown for auto_increment_increment and auto_increment_offset generate the series $5+N \times 10$, that is, $[5,15,25,35,45, \ldots]$. The highest value present in the col column prior to the INSERT is 31 , and the next available value in the AUTO_INCREMENT series is 35 , so the inserted values for col begin at that point and the results are as shown for the SELECT query.

It is not possible to restrict the effects of these two variables to a single table; these variables control the behavior of all AUTO_INCREMENT columns in all tables on the MySQL server. If the global value of either variable is set, its effects persist until the global value is changed or overridden by setting the session value, or until mysqld is restarted. If the local value is set, the new value affects AUTO_INCREMENT columns for all tables into which new rows are inserted by the current user for the duration of the session, unless the values are changed during that session.

The default value of auto_increment_increment is 1. See Section 19.5.1.1, "Replication and AUTO_INCREMENT".
- auto_increment_offset

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - auto - increment - offset $=\#$ \\
\hline System Variable & auto_increment_offset \\
\hline Scope & Global, Session \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Replication and Binary Logging Options and Variables}
\begin{tabular}{|l|l|}
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & Yes \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 65535 \\
\hline
\end{tabular}
\end{table}

This variable has a default value of 1 . If it is left with its default value, and Group Replication is started on the server in multi-primary mode, it is changed to the server ID. For more information, see the description for auto_increment_increment.

\section*{Note}
auto_increment_offset is also supported for use with NDB tables.
- immediate_server_version

\begin{tabular}{|l|l|}
\hline System Variable & immediate_server_version \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 999999 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 999999 \\
\hline
\end{tabular}

For internal use by replication. This session system variable holds the MySQL Server release number of the server that is the immediate source in a replication topology (for example, 80409 for a MySQL 8.4.9 server instance). If this immediate server is at a release that does not support the session system variable, the value of the variable is set to 0 (UNKNOWN_SERVER_VERSION).

The value of the variable is replicated from a source to a replica. With this information the replica can correctly process data originating from a source at an older release, by recognizing where syntax changes or semantic changes have occurred between the releases involved and handling these appropriately. The information can also be used in a Group Replication environment where one or more members of the replication group is at a newer release than the others. The value of the variable can be viewed in the binary log for each transaction (as part of the Gtid_log_event, or Anonymous_gtid_log_event if GTIDs are not in use on the server), and could be helpful in debugging cross-version replication issues.

Setting the session value of this system variable is a restricted operation. The session user must have either the REPLICATION_APPLIER privilege (see Section 19.3.3, "Replication Privilege Checks"), or privileges sufficient to set restricted session variables (see Section 7.1.9.1, "System Variable Privileges"). However, note that the variable is not intended for users to set; it is set automatically by the replication infrastructure.
- original_server_version

\begin{tabular}{|l|l|}
\hline System Variable & original_server_version \\
\hline Scope & Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Integer \\
\hline Default Value & 999999 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 999999 \\
\hline
\end{tabular}

For internal use by replication. This session system variable holds the MySQL Server release number of the server where a transaction was originally committed (for example, 80409 for a MySQL 8.4.9 server instance). If this original server is at a release that does not support the session system variable, the value of the variable is set to 0 (UNKNOWN_SERVER_VERSION). Note that when a release number is set by the original server, the value of the variable is reset to 0 if the immediate server or any other intervening server in the replication topology does not support the session system variable, and so does not replicate its value.

The value of the variable is set and used in the same ways as for the immediate_server_version system variable. If the value of the variable is the same as that for the immediate_server_version system variable, only the latter is recorded in the binary log, with an indicator that the original server version is the same.

In a Group Replication environment, view change log events, which are special transactions queued by each group member when a new member joins the group, are tagged with the server version of the group member queuing the transaction. This ensures that the server version of the original donor is known to the joining member. Because the view change log events queued for a particular view change have the same GTID on all members, for this case only, instances of the same GTID might have a different original server version.

Setting the session value of this system variable is a restricted operation. The session user must have either the REPLICATION_APPLIER privilege (see Section 19.3.3, "Replication Privilege Checks"), or privileges sufficient to set restricted session variables (see Section 7.1.9.1, "System Variable Privileges"). However, note that the variable is not intended for users to set; it is set automatically by the replication infrastructure.
- rpl_semi_sync_master_enabled

\begin{tabular}{|l|l|}
\hline Command-Line Format & --rpl-semi-sync-masterenabled[=\{OFF|ON\}] \\
\hline Deprecated & Yes \\
\hline System Variable & rpl_semi_sync_master_enabled \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Deprecated synonym for rpl_semi_sync_source_enabled.
- rpl_semi_sync_master_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --rpl-semi-sync-master-timeout=\# \\
\hline Deprecated & Yes \\
\hline System Variable & rpl_semi_sync_master_timeout \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Replication and Binary Logging Options and Variables}
\begin{tabular}{|l|l|}
\hline Type & Integer \\
\hline Default Value & 10000 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & milliseconds \\
\hline
\end{tabular}
\end{table}

Deprecated synonym for rpl_semi_sync_source_timeout.
- rpl_semi_sync_master_trace_level

\begin{tabular}{|l|l|}
\hline Command-Line Format & --rpl-semi-sync-master-trace-level=\# \\
\hline Deprecated & Yes \\
\hline System Variable & rpl_semi_sync_master_trace_level \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 32 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

Deprecated synonym for rpl_semi_sync_source_trace_level.
- rpl_semi_sync_master_wait_for_slave_count

\begin{tabular}{|l|l|}
\hline Command-Line Format & --rpl-semi-sync-master-wait-for-slave-count=\# \\
\hline Deprecated & Yes \\
\hline System Variable & rpl_semi_sync_master_wait_for_slave_count \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 65535 \\
\hline
\end{tabular}

Deprecated synonym for rpl_semi_sync_source_wait_for_replica_count.
- rpl_semi_sync_master_wait_no_slave

\begin{tabular}{|l|l|l|}
\hline \multirow{5}{*}{} & Command-Line Format & --rpl-semi-sync-master-wait-noslave[=\{OFF|ON\}] \\
\hline & System Variable & rpl_semi_sync_master_wait_no_slave \\
\hline & Scope & Global \\
\hline & Dynamic & Yes \\
\hline & SET_VAR Hint Applies & No \\
\hline 3394 & Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & ON \\
\hline
\end{tabular}

Deprecated synonym for rpl_semi_sync_source_wait_no_replica.
- rpl_semi_sync_master_wait_point

\begin{tabular}{|l|l|}
\hline Command-Line Format & --rpl-semi-sync-master-waitpoint=value \\
\hline Deprecated & Yes \\
\hline System Variable & rpl_semi_sync_master_wait_point \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & AFTER_SYNC \\
\hline Valid Values & \begin{tabular}{l}
AFTER_SYNC \\
AFTER_COMMIT
\end{tabular} \\
\hline
\end{tabular}

Deprecated synonym for rpl_semi_sync_source_wait_point.
- rpl_semi_sync_source_enabled

\begin{tabular}{|l|l|}
\hline Command-Line Format & --rpl-semi-sync-sourceenabled[=\{OFF|ON\}] \\
\hline System Variable & rpl_semi_sync_source_enabled \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}
rpl_semi_sync_source_enabled is available when the rpl_semi_sync_source (semisync_source. so library) plugin was installed on the replica to set up semisynchronous replication.
rpl_semi_sync_source_enabled controls whether semisynchronous replication is enabled on the source server. To enable or disable the plugin, set this variable to ON or OFF (or 1 or 0), respectively. The default is OFF.
- rpl_semi_sync_source_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --rpl-semi-sync-source-timeout=\# \\
\hline System Variable & rpl_semi_sync_source_timeout \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 10000 \\
\hline Minimum Value & 0 \\
\hline & 3395 \\
\hline
\end{tabular}

Replication and Binary Logging Options and Variables

\begin{tabular}{|l|l|}
\hline Maximum Value & 4294967295 \\
\hline Unit & milliseconds \\
\hline
\end{tabular}
rpl_semi_sync_source_timeout is available when the rpl_semi_sync_source (semisync_source.so library) plugin is installed on the replica.
rpl_semi_sync_source_timeout controls how long the source waits on a commit for acknowledgment from a replica before timing out and reverting to asynchronous replication. The value is specified in milliseconds, and the default value is 10000 (10 seconds).
- rpl_semi_sync_source_trace_level

\begin{tabular}{|l|l|}
\hline Command-Line Format & --rpl-semi-sync-source-trace-level=\# \\
\hline System Variable & rpl_semi_sync_source_trace_level \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 32 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}
rpl_semi_sync_source_trace_level is available when the rpl_semi_sync_source (semisync_source.so library) plugin is installed on the replica.
rpl_semi_sync_source_trace_level specifies the semisynchronous replication debug trace level on the source server. Four levels are defined:
- 1 = general level (for example, time function failures)
- $16=$ detail level (more verbose information)
- 32 = net wait level (more information about network waits)
- $64=$ function level (information about function entry and exit)
- rpl_semi_sync_source_wait_for_replica_count

\begin{tabular}{|l|l|}
\hline Command-Line Format & --rpl-semi-sync-source-wait-for-replica-count=\# \\
\hline System Variable & rpl_semi_sync_source_wait_for_replica_count \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 1 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Maximum Value & 65535 \\
\hline
\end{tabular}
rpl_semi_sync_source_wait_for_replica_count is available when the rpl_semi_sync_source (semisync_source.so library) plugin is installed on the replica to set up semisynchronous replication.
rpl_semi_sync_source_wait_for_replica_count specifies the number of replica acknowledgments the source must receive per transaction before proceeding. By default rpl_semi_sync_source_wait_for_replica_count is 1, meaning that semisynchronous replication proceeds after receiving a single replica acknowledgment. Performance is best for small values of this variable.

For example, if rpl_semi_sync_source_wait_for_replica_count is 2, then 2 replicas must acknowledge receipt of the transaction before the timeout period configured by rpl_semi_sync_source_timeout for semisynchronous replication to proceed. If fewer replicas acknowledge receipt of the transaction during the timeout period, the source reverts to normal replication.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3427.jpg?height=181&width=1047&top_left_y=973&top_left_x=402)
- rpl_semi_sync_source_wait_no_replica

\begin{tabular}{|l|l|}
\hline Command-Line Format & --rpl-semi-sync-source-wait-noreplica[=\{OFF|ON\}] \\
\hline System Variable & rpl_semi_sync_source_wait_no_replica \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}
rpl_semi_sync_source_wait_no_replica is available when the rpl_semi_sync_source (semisync_source.so library) plugin is installed on the replica.
rpl_semi_sync_source_wait_no_replica controls whether the source waits for the timeout period configured by rpl_semi_sync_source_timeout to expire, even if the replica count drops to less than the number of replicas configured by rpl_semi_sync_source_wait_for_replica_count during the timeout period.

When the value of rpl_semi_sync_source_wait_no_replica is ON (the default), it is permissible for the replica count to drop to less than rpl_semi_sync_source_wait_for_replica_count during the timeout period. As long as enough replicas acknowledge the transaction before the timeout period expires, semisynchronous replication continues.

When the value of rpl_semi_sync_source_wait_no_replica is OFF, if the replica count drops to less than the number configured in rpl_semi_sync_source_wait_for_replica_count at any time during the timeout period configured by rpl_semi_sync_source_timeout, the source reverts to normal replication.
- rpl_semi_sync_source_wait_point

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- -rpl-semi-sync-source-wait- \\
point=value
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline System Variable & rpl_semi_sync_source_wait_point \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & AFTER_SYNC \\
\hline Valid Values & \begin{tabular}{l}
AFTER_SYNC \\
AFTER_COMMIT
\end{tabular} \\
\hline
\end{tabular}
rpl_semi_sync_source_wait_point is available when the rpl_semi_sync_source (semisync_source.so library) plugin is installed on the replica.
rpl_semi_sync_source_wait_point controls the point at which a semisynchronous replication source server waits for replica acknowledgment of transaction receipt before returning a status to the client that committed the transaction. These values are permitted:
- AFTER_SYNC (the default): The source writes each transaction to its binary log and the replica, and syncs the binary log to disk. The source waits for replica acknowledgment of transaction receipt after the sync. Upon receiving acknowledgment, the source commits the transaction to the storage engine and returns a result to the client, which then can proceed.
- AFTER_COMMIT: The source writes each transaction to its binary log and the replica, syncs the binary log, and commits the transaction to the storage engine. The source waits for replica acknowledgment of transaction receipt after the commit. Upon receiving acknowledgment, the source returns a result to the client, which then can proceed.

The replication characteristics of these settings differ as follows:
- With AFTER_SYNC, all clients see the committed transaction at the same time: After it has been acknowledged by the replica and committed to the storage engine on the source. Thus, all clients see the same data on the source.

In the event of source failure, all transactions committed on the source have been replicated to the replica (saved to its relay log). An unexpected exit of the source server and failover to the replica is lossless because the replica is up to date. Note, however, that the source cannot be restarted in this scenario and must be discarded, because its binary log might contain uncommitted transactions that would cause a conflict with the replica when externalized after binary log recovery.
- With AFTER_COMMIT, the client issuing the transaction gets a return status only after the server commits to the storage engine and receives replica acknowledgment. After the commit and before replica acknowledgment, other clients can see the committed transaction before the committing client.

If something goes wrong such that the replica does not process the transaction, then in the event of an unexpected source server exit and failover to the replica, it is possible for such clients to see a loss of data relative to what they saw on the source.

\subsection*{19.1.6.3 Replica Server Options and Variables}

This section explains the server options and system variables that apply to replica servers and contains the following:
- Startup Options for Replica Servers
- System Variables Used on Replica Servers

Specify the options either on the command line or in an option file. Many of the options can be set while the server is running by using the CHANGE REPLICATION SOURCE TO statement. Specify system variable values using SET.

Server ID. On the source and each replica, you must set the server_id system variable to establish a unique replication ID in the range from 1 to $2^{32}-1$. "Unique" means that each ID must be different from every other ID in use by any other source or replica in the replication topology. Example my.cnf file:
[mysqld]
server-id=3

\section*{Startup Options for Replica Servers}

This section explains startup options for controlling replica servers. Many of these options can be set while the server is running by using the CHANGE REPLICATION SOURCE TO statement. Others, such as the --replicate - * options, can be set only when the replica server starts. Replication-related system variables are discussed later in this section.
- --master-retry-count=count

\begin{tabular}{|l|l|}
\hline Command-Line Format & --master-retry-count=\# \\
\hline Deprecated & Yes \\
\hline Type & Integer \\
\hline Default Value & 10 \\
\hline Minimum Value & 0 \\
\hline Maximum Value (64-bit platforms) & 18446744073709551615 \\
\hline Maximum Value (32-bit platforms) & 4294967295 \\
\hline
\end{tabular}

This option is deprecated; expect it to be removed in a future MySQL release. Use the SOURCE_RETRY_COUNT option of the CHANGE REPLICATION SOURCE TO statement, instead.
- --max-relay-log-size=size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-relay-log-size=\# \\
\hline System Variable & max_relay_log_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1073741824 \\
\hline Unit & bytes \\
\hline Block Size & 4096 \\
\hline
\end{tabular}

The size at which the server rotates relay log files automatically. If this value is nonzero, the relay log is rotated automatically when its size exceeds this value. If this value is zero (the default), the size at which relay log rotation occurs is determined by the value of max_binlog_size. For more information, see Section 19.2.4.1, "The Relay Log".
- --relay-log-purge=\{0|1\}

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- relay-log-purge [=\{OFF|ON\}] \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Replication and Binary Logging Options and Variables}
\begin{tabular}{|l|l|}
\hline System Variable & relay_log_purge \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}
\end{table}

Disable or enable automatic purging of relay logs as soon as they are no longer needed. The default value is 1 (enabled). This is a global variable that can be changed dynamically with SET GLOBAL relay_log_purge $=N$. Disabling purging of relay logs when enabling the --relay-logrecovery option risks data consistency and is therefore not crash-safe.
- --relay-log-space-limit=size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --relay-log-space-limit=\# \\
\hline System Variable & relay_log_space_limit \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 18446744073709551615 \\
\hline Unit & bytes \\
\hline
\end{tabular}

This option places an upper limit on the total size in bytes of all relay logs on the replica. A value of 0 means "no limit". This is useful for a replica server host that has limited disk space. When the limit is reached, the I/O (receiver) thread stops reading binary log events from the source server until the SQL thread has caught up and deleted some unused relay logs. Note that this limit is not absolute: There are cases where the SQL (applier) thread needs more events before it can delete relay logs. In that case, the receiver thread exceeds the limit until it becomes possible for the applier thread to delete some relay logs because not doing so would cause a deadlock. You should not set - -relay-log-space-limit to less than twice the value of --max-relay-log-size (or --max-binlogsize if --max-relay-log-size is 0 ). In that case, there is a chance that the receiver thread waits for free space because--relay-log-space-limit is exceeded, but the applier thread has no relay log to purge and is unable to satisfy the receiver thread. This forces the receiver thread to ignore --relay-log-space-limit temporarily.
- --replicate-do-db=db_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- replicate - do - db=name \\
\hline Type & String \\
\hline
\end{tabular}

Creates a replication filter using the name of a database. Such filters can also be created using CHANGE REPLICATION FILTER REPLICATE_DO_DB.

This option supports channel specific replication filters, enabling multi-source replicas to use specific filters for different sources. To configure a channel specific replication filter on a channel named channel_1 use --replicate-do-db:channel_1:db_name. In this case, the first
colon is interpreted as a separator and subsequent colons are literal colons. See Section 19.2.5.4, "Replication Channel Based Filters" for more information.

\section*{Note}

Global replication filters cannot be used on a MySQL server instance that is configured for Group Replication, because filtering transactions on some servers would make the group unable to reach agreement on a consistent state. Channel specific replication filters can be used on replication channels that are not directly involved with Group Replication, such as where a group member also acts as a replica to a source that is outside the group. They cannot be used on the group_replication_applier or group_replication_recovery channels.

The precise effect of this replication filter depends on whether statement-based or row-based replication is in use.

Statement-based replication. Tell the replication SQL thread to restrict replication to statements where the default database (that is, the one selected by USE) is $d b \_$name. To specify more than one database, use this option multiple times, once for each database; however, doing so does not replicate cross-database statements such as UPDATE some_db.some_table SET foo='bar' while a different database (or no database) is selected.

\section*{Warning}

To specify multiple databases you must use multiple instances of this option. Because database names can contain commas, if you supply a comma separated list then the list is treated as the name of a single database.

An example of what does not work as you might expect when using statement-based replication: If the replica is started with - - replicate-do-db=sales and you issue the following statements on the source, the UPDATE statement is not replicated:
```
USE prices;
UPDATE sales.january SET amount=amount+1000;
```


The main reason for this "check just the default database" behavior is that it is difficult from the statement alone to know whether it should be replicated (for example, if you are using multiple-table DELETE statements or multiple-table UPDATE statements that act across multiple databases). It is also faster to check only the default database rather than all databases if there is no need.

Row-based replication. Tells the replication SQL thread to restrict replication to database $d b \_n a m e$. Only tables belonging to $d b \_n a m e$ are changed; the current database has no effect on this. Suppose that the replica is started with --replicate-do-db=sales and row-based replication is in effect, and then the following statements are run on the source:
```
USE prices;
UPDATE sales.february SET amount=amount+100;
```


The february table in the sales database on the replica is changed in accordance with the UPDATE statement; this occurs whether or not the USE statement was issued. However, issuing the following statements on the source has no effect on the replica when using row-based replication and --replicate-do-db=sales:

\footnotetext{
USE prices;
}
```
UPDATE prices.march SET amount=amount-25;
```


Even if the statement USE prices were changed to USE sales, the UPDATE statement's effects would still not be replicated.

Another important difference in how --replicate-do-db is handled in statement-based replication as opposed to row-based replication occurs with regard to statements that refer to multiple databases. Suppose that the replica is started with --replicate-do-db=db1, and the following statements are executed on the source:
```
USE db1;
UPDATE db1.table1, db2.table2 SET db1.table1.col1 = 10, db2.table2.col2 = 20;
```


If you are using statement-based replication, then both tables are updated on the replica. However, when using row-based replication, only table1 is affected on the replica; since table2 is in a different database, table2 on the replica is not changed by the UPDATE. Now suppose that, instead of the USE db1 statement, a USE db4 statement had been used:
```
USE db4;
UPDATE db1.table1, db2.table2 SET db1.table1.col1 = 10, db2.table2.col2 = 20;
```


In this case, the UPDATE statement would have no effect on the replica when using statement-based replication. However, if you are using row-based replication, the UPDATE would change table1 on the replica, but not table2-in other words, only tables in the database named by - -replicate-do-db are changed, and the choice of default database has no effect on this behavior.

If you need cross-database updates to work, use - -replicate-wild-do-table=db_name.\% instead. See Section 19.2.5, "How Servers Evaluate Replication Filtering Rules".

\section*{Note}

This option affects replication in the same manner that --binlog-do-db affects binary logging, and the effects of the replication format on how - -replicate-do-db affects replication behavior are the same as those of the logging format on the behavior of --binlog-do-db.

This option has no effect on BEGIN, COMMIT, or ROLLBACK statements.
- --replicate-ignore-db=db_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- replicate-ignore-db=name \\
\hline Type & String \\
\hline
\end{tabular}

Creates a replication filter using the name of a database. Such filters can also be created using CHANGE REPLICATION FILTER REPLICATE_IGNORE_DB.

This option supports channel specific replication filters, enabling multi-source replicas to use specific filters for different sources. To configure a channel specific replication filter on a channel named channel_1 use--replicate-ignore-db:channel_1:db_name. In this case, the first colon is interpreted as a separator and subsequent colons are literal colons. See Section 19.2.5.4, "Replication Channel Based Filters" for more information.

\section*{Note}

Global replication filters cannot be used on a MySQL server instance that is configured for Group Replication, because filtering transactions on some servers would make the group unable to reach agreement on a consistent state. Channel specific replication filters can be used on replication channels that are not directly involved with Group Replication, such as where a group member also acts as a replica to a source that is outside the

\section*{group. They cannot be used on the group_replication_applier or group_replication_recovery channels.}

To specify more than one database to ignore, use this option multiple times, once for each database. Because database names can contain commas, if you supply a comma-separated list, it is treated as the name of a single database.

As with --replicate-do-db, the precise effect of this filtering depends on whether statementbased or row-based replication is in use, and are described in the next several paragraphs.

Statement-based replication. Tells the replication SQL thread not to replicate any statement where the default database (that is, the one selected by USE) is db_name.

Row-based replication. Tells the replication SQL thread not to update any tables in the database db_name. The default database has no effect.

When using statement-based replication, the following example does not work as you might expect. Suppose that the replica is started with --replicate-ignore-db=sales and you issue the following statements on the source:

USE prices;
UPDATE sales.january SET amount=amount+1000;
The UPDATE statement is replicated in such a case because --replicate-ignore-db applies only to the default database (determined by the USE statement). Because the sales database was specified explicitly in the statement, the statement has not been filtered. However, when using row-based replication, the UPDATE statement's effects are not propagated to the replica, and the replica's copy of the sales.january table is unchanged; in this instance, --replicate-ignoredb=sales causes all changes made to tables in the source's copy of the sales database to be ignored by the replica.

You should not use this option if you are using cross-database updates and you do not want these updates to be replicated. See Section 19.2.5, "How Servers Evaluate Replication Filtering Rules".

If you need cross-database updates to work, use --replicate-wild-ignore-table=db_name. \% instead. See Section 19.2.5, "How Servers Evaluate Replication Filtering Rules".

\section*{Note}

This option affects replication in the same manner that --binlog-ignoredb affects binary logging, and the effects of the replication format on how - -replicate-ignore-db affects replication behavior are the same as those of the logging format on the behavior of --binlog-ignore-db.

This option has no effect on BEGIN, COMMIT, or ROLLBACK statements.
- --replicate-do-table=db_name.tbl_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - replicate - do - table=name \\
\hline Type & String \\
\hline
\end{tabular}

Creates a replication filter by telling the replication SQL thread to restrict replication to a given table. To specify more than one table, use this option multiple times, once for each table. This works for both cross-database updates and default database updates, in contrast to --replicate-do-db. See Section 19.2.5, "How Servers Evaluate Replication Filtering Rules". You can also create such a filter by issuing a CHANGE REPLICATION FILTER REPLICATE_DO_TABLE statement.

This option supports channel specific replication filters, enabling multi-source replicas to use specific filters for different sources. To configure a channel specific replication filter on a channel
case, the first colon is interpreted as a separator and subsequent colons are literal colons. See Section 19.2.5.4, "Replication Channel Based Filters" for more information.

\section*{Note}

Global replication filters cannot be used on a MySQL server instance that is configured for Group Replication, because filtering transactions on some servers would make the group unable to reach agreement on a consistent state. Channel specific replication filters can be used on replication channels that are not directly involved with Group Replication, such as where a group member also acts as a replica to a source that is outside the group. They cannot be used on the group_replication_applier or group_replication_recovery channels.

This option affects only statements that apply to tables. It does not affect statements that apply only to other database objects, such as stored routines. To filter statements operating on stored routines, use one or more of the --replicate - *-db options.
- --replicate-ignore-table=db_name.tbl_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --replicate-ignore-table=name \\
\hline Type & String \\
\hline
\end{tabular}

Creates a replication filter by telling the replication SQL thread not to replicate any statement that updates the specified table, even if any other tables might be updated by the same statement. To specify more than one table to ignore, use this option multiple times, once for each table. This works for cross-database updates, in contrast to --replicate-ignore-db. See Section 19.2.5, "How Servers Evaluate Replication Filtering Rules". You can also create such a filter by issuing a CHANGE REPLICATION FILTER REPLICATE_IGNORE_TABLE statement.

This option supports channel specific replication filters, enabling multi-source replicas to use specific filters for different sources. To configure a channel specific replication filter on a channel named channel_1 use --replicate-ignore-table:channel_1:db_name.tbl_name. In this case, the first colon is interpreted as a separator and subsequent colons are literal colons. See Section 19.2.5.4, "Replication Channel Based Filters" for more information.

\section*{Note}

Global replication filters cannot be used on a MySQL server instance that is configured for Group Replication, because filtering transactions on some servers would make the group unable to reach agreement on a consistent state. Channel specific replication filters can be used on replication channels that are not directly involved with Group Replication, such as where a group member also acts as a replica to a source that is outside the group. They cannot be used on the group_replication_applier or group_replication_recovery channels.

This option affects only statements that apply to tables. It does not affect statements that apply only to other database objects, such as stored routines. To filter statements operating on stored routines, use one or more of the --replicate - *-db options.
- --replicate-rewrite-db=from_name->to_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--replicate-rewrite-db=old_name - \\
>new_name
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
\hline
\end{tabular}

Tells the replica to create a replication filter that translates the specified database to to_name if it was from_name on the source. Only statements involving tables are affected, not statements such as CREATE DATABASE, DROP DATABASE, and ALTER DATABASE.

To specify multiple rewrites, use this option multiple times. The server uses the first one with a from_name value that matches. The database name translation is done before the --replicate* rules are tested. You can also create such a filter by issuing a CHANGE REPLICATION FILTER REPLICATE_REWRITE_DB statement.

If you use the--replicate-rewrite-db option on the command line and the > character is special to your command interpreter, quote the option value. For example:
\$> mysqld --replicate-rewrite-db="olddb->newdb"
The effect of the --replicate-rewrite-db option differs depending on whether statementbased or row-based binary logging format is used for the query. With statement-based format, DML statements are translated based on the current database, as specified by the USE statement. With row-based format, DML statements are translated based on the database where the modified table exists. DDL statements are always filtered based on the current database, as specified by the USE statement, regardless of the binary logging format.

To ensure that rewriting produces the expected results, particularly in combination with other replication filtering options, follow these recommendations when you use the --replicate-rewrite-db option:
- Create the from_name and to_name databases manually on the source and the replica with different names.
- If you use statement-based or mixed binary logging format, do not use cross-database queries, and do not specify database names in queries. For both DDL and DML statements, rely on the USE statement to specify the current database, and use only the table name in queries.
- If you use row-based binary logging format exclusively, for DDL statements, rely on the USE statement to specify the current database, and use only the table name in queries. For DML statements, you can use a fully qualified table name (db.table) if you want.

If these recommendations are followed, it is safe to use the --replicate-rewrite-db option in combination with table-level replication filtering options such as --replicate-do-table.

This option supports channel specific replication filters, enabling multi-source replicas to use specific filters for different sources. Specify the channel name followed by a colon, followed by the filter specification. The first colon is interpreted as a separator, and any subsequent colons are interpreted as literal colons. For example, to configure a channel specific replication filter on a channel named channel_1, use:
\$> mysqld --replicate-rewrite-db=channe1_1:db_name1->db_name2
If you use a colon but do not specify a channel name, the option configures the replication filter for the default replication channel. See Section 19.2.5.4, "Replication Channel Based Filters" for more information.

\section*{Note}

Global replication filters cannot be used on a MySQL server instance that is configured for Group Replication, because filtering transactions on some servers would make the group unable to reach agreement on a consistent state. Channel specific replication filters can be used on replication channels that are not directly involved with Group Replication, such as
where a group member also acts as a replica to a source that is outside the group. They cannot be used on the group_replication_applier or group_replication_recovery channels.
- --replicate-same-server-id

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- -replicate-same-server-id $[=\{$ OFF $\mid$ \\
ON $\}]$
\end{tabular} \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

This option is for use on replicas. The default is 0 (FALSE). With this option set to 1 (TRUE), the replica does not skip events that have its own server ID. This setting is normally useful only in rare configurations.

When binary logging is enabled on a replica, the combination of the --replicate-same-serverid and --log-replica-updates options on the replica can cause infinite loops in replication if the server is part of a circular replication topology. (In MySQL 8.4, binary logging is enabled by default, and replica update logging is the default when binary logging is enabled.) However, the use of global transaction identifiers (GTIDs) prevents this situation by skipping the execution of transactions that have already been applied. If gtid_mode=0N is set on the replica, you can start the server with this combination of options, but you cannot change to any other GTID mode while the server is running. If any other GTID mode is set, the server does not start with this combination of options.

By default, the replication I/O (receiver) thread does not write binary log events to the relay log if they have the replica's server ID (this optimization helps save disk usage). If you want to use - -replicate-same-server-id, be sure to start the replica with this option before you make the replica read its own events that you want the replication SQL (applier) thread to execute.
- --replicate-wild-do-table=db_name.tbl_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - replicate-wild - do - table=name \\
\hline Type & String \\
\hline
\end{tabular}

Creates a replication filter by telling the replication SQL (applier) thread to restrict replication to statements where any of the updated tables match the specified database and table name patterns. Patterns can contain the \% and _ wildcard characters, which have the same meaning as for the LIKE pattern-matching operator. To specify more than one table, use this option multiple times, once for each table. This works for cross-database updates. See Section 19.2.5, "How Servers Evaluate Replication Filtering Rules". You can also create such a filter by issuing a CHANGE REPLICATION FILTER REPLICATE_WILD_DO_TABLE statement.

This option supports channel specific replication filters, enabling multi-source replicas to use specific filters for different sources. To configure a channel specific replication filter on a channel named channel_1 use --replicate-wild-do-table:channel_1:db_name.tbl_name. In this case, the first colon is interpreted as a separator and subsequent colons are literal colons. See Section 19.2.5.4, "Replication Channel Based Filters" for more information.

\section*{Important}

Global replication filters cannot be used on a MySQL server instance that is configured for Group Replication, because filtering transactions on some servers would make the group unable to reach agreement on a consistent state. Channel specific replication filters can be used on replication channels that are not directly involved with Group Replication, such as where a group member also acts as a replica to a source that is outside the

\section*{group. They cannot be used on the group_replication_applier or group_replication_recovery channels.}

The replication filter specified by the --replicate-wild-do-table option applies to tables, views, and triggers. It does not apply to stored procedures and functions, or events. To filter statements operating on the latter objects, use one or more of the --replicate - *-db options.

As an example, --replicate-wild-do-table=foo\%.bar\% replicates only updates that use a table where the database name starts with foo and the table name starts with bar.

If the table name pattern is \%, it matches any table name and the option also applies to databaselevel statements (CREATE DATABASE, DROP DATABASE, and ALTER DATABASE). For example, if you use--replicate-wild-do-table=foo\%.\%, database-level statements are replicated if the database name matches the pattern foo\%.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3437.jpg?height=126&width=108&top_left_y=868&top_left_x=397)

\section*{Important}

Table-level replication filters are only applied to tables that are explicitly mentioned and operated on in the query. They do not apply to tables that are implicitly updated by the query. For example, a GRANT statement, which updates the mysql. user system table but does not mention that table, is not affected by a filter that specifies mysql. \% as the wildcard pattern.

To include literal wildcard characters in the database or table name patterns, escape them with a backslash. For example, to replicate all tables of a database that is named my_own\%db, but not replicate tables from the my1ownAABCdb database, you should escape the _and \% characters like this: --replicate-wild-do-table=my _own $\backslash \% \mathrm{db}$. If you use the option on the command line, you might need to double the backslashes or quote the option value, depending on your command interpreter. For example, with the bash shell, you would need to type--replicate-wild-dotable=my \\_own\\\%db.
- --replicate-wild-ignore-table=db_name.tbl_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - replicate-wild-ignore-table=name \\
\hline Type & String \\
\hline
\end{tabular}

Creates a replication filter which keeps the replication SQL thread from replicating a statement in which any table matches the given wildcard pattern. To specify more than one table to ignore, use this option multiple times, once for each table. This works for cross-database updates. See Section 19.2.5, "How Servers Evaluate Replication Filtering Rules". You can also create such a filter by issuing a CHANGE REPLICATION FILTER REPLICATE_WILD_IGNORE_TABLE statement.

This option supports channel specific replication filters, enabling multi-source replicas to use specific filters for different sources. To configure a channel specific replication filter on a channel named channel_1 use --replicate-wild-ignore:channel_1:db_name.tbl_name. In this case, the first colon is interpreted as a separator and subsequent colons are literal colons. See Section 19.2.5.4, "Replication Channel Based Filters" for more information.

\section*{Important}

Global replication filters cannot be used on a MySQL server instance that is configured for Group Replication, because filtering transactions on some servers would make the group unable to reach agreement on a consistent state. Channel specific replication filters can be used on replication channels that are not directly involved with Group Replication, such as where a group member also acts as a replica to a source that is outside the

\section*{group. They cannot be used on the group_replication_applier or group_replication_recovery channels.}

As an example, --replicate-wild-ignore-table=foo\%.bar\% does not replicate updates that use a table where the database name starts with foo and the table name starts with bar. For information about how matching works, see the description of the --replicate-wild-do-table option. The rules for including literal wildcard characters in the option value are the same as for -replicate-wild-ignore-table as well.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3438.jpg?height=94&width=103&top_left_y=644&top_left_x=338)

\section*{Important}

Table-level replication filters are only applied to tables that are explicitly mentioned and operated on in the query. They do not apply to tables that are implicitly updated by the query. For example, a GRANT statement, which updates the mysql. user system table but does not mention that table, is not affected by a filter that specifies mysql.\% as the wildcard pattern.

If you need to filter out GRANT statements or other administrative statements, a possible workaround is to use the--replicate-ignore-db filter. This filter operates on the default database that is currently in effect, as determined by the USE statement. You can therefore create a filter to ignore statements for a database that is not replicated, then issue the USE statement to switch the default database to that one immediately before issuing any administrative statements that you want to ignore. In the administrative statement, name the actual database where the statement is applied.

For example, if - -replicate-ignore-db=nonreplicated is configured on the replica server, the following sequence of statements causes the GRANT statement to be ignored, because the default database nonreplicated is in effect:

USE nonreplicated;
GRANT SELECT, INSERT ON replicated.t1 TO 'someuser'@'somehost';
- --skip-replica-start

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-replica-start[=\{OFF|ON\}] \\
\hline System Variable & skip_replica_start \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}
--skip-replica-start tells the replica server not to start the replication I/O (receiver) and SQL (applier) threads when the server starts. To start the threads later, use a START REPLICA statement.

You can use the skip_replica_start system variable in place of the command line option to allow access to this feature using MySQL Server's privilege structure, so that database administrators do not need any privileged access to the operating system.
- --skip-slave-start

\begin{tabular}{|l|l|l|}
\hline \multirow{4}{*}{} & Command-Line Format & --skip-slave-start[=\{OFF|ON\}] \\
\hline & Deprecated & Yes \\
\hline & System Variable & skip_slave_start \\
\hline & Scope & Global \\
\hline 3408 & Dynamic & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Deprecated alias for --skip-replica-start.
- --slave-skip-errors=[err_code1,err_code2, . . .|all|ddl_exist_errors]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slave-skip-errors=name \\
\hline Deprecated & Yes \\
\hline System Variable & slave_skip_errors \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & 0FF \\
\hline Valid Values & \begin{tabular}{l}
OFF \\
[list of error codes] \\
all \\
ddl_exist_errors
\end{tabular} \\
\hline
\end{tabular}

Deprecated synonym for --replica-skip-errors.
- --slave-sql-verify-checksum=\{0|1\}

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--slave-sql-verify-checksum $[=\{$ OFF $\mid$ \\
ON $\}]$
\end{tabular} \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Deprecated synonym for --replica-sql-verify-checksum

\section*{System Variables Used on Replica Servers}

The following list describes system variables for controlling replica servers. They can be set at server startup and some of them can be changed at runtime using SET. Server options used with replicas are listed earlier in this section.
- init_replica

\begin{tabular}{|l|l|}
\hline Command-Line Format & --init-replica=name \\
\hline System Variable & init_replica \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}
init_replica is similar to init_connect, but is a string to be executed by a replica server each time the replication SQL thread starts. The format of the string is the same as for the init_connect variable. The setting of this variable takes effect for subsequent START REPLICA statements.

\section*{Note}

The replication SQL thread sends an acknowledgment to the client before it executes init_replica. Therefore, it is not guaranteed that init_replica has been executed when START REPLICA returns. See Section 15.4.2.4, "START REPLICA Statement" for more information.
- init_slave

\begin{tabular}{|l|l|}
\hline Command-Line Format & --init-slave=name \\
\hline Deprecated & Yes \\
\hline System Variable & init_slave \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

Deprecated alias for init_replica.
- log_slow_replica_statements

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-slow-replica-statements[=\{0FF| ON\}] \\
\hline System Variable & log_slow_replica_statements \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

When the slow query log is enabled, log_slow_replica_statements enables logging for queries that have taken more than long_query_time seconds to execute on the replica. Note that if row-based replication is in use (binlog_format=ROW), log_slow_replica_statements has no effect. Queries are only added to the replica's slow query log when they are logged in statement format in the binary log, that is, when binlog_format=STATEMENT is set, or when binlog_format=MIXED is set and the statement is logged in statement format. Slow queries that are logged in row format when binlog_format=MIXED is set, or that are logged when binlog_format=ROW is set, are not added to the replica's slow query log, even if log_slow_replica_statements is enabled.

Setting log_slow_replica_statements has no immediate effect. The state of the variable applies on all subsequent START REPLICA statements. Also note that the global setting for long_query_time applies for the lifetime of the SQL thread. If you change that setting, you must stop and restart the replication SQL thread to implement the change there (for example, by issuing STOP REPLICA and START REPLICA statements with the SQL_THREAD option).
- log_slow_slave_statements

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
-- log-slow-slave-statements $[=\{$ OFF $\mid$ \\
ON $\}]$
\end{tabular} \\
\hline Deprecated & Yes \\
\hline System Variable & log_slow_slave_statements \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Deprecated alias for log_slow_replica_statements.
- max_relay_log_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-relay-log-size=\# \\
\hline System Variable & max_relay_log_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1073741824 \\
\hline Unit & bytes \\
\hline Block Size & 4096 \\
\hline
\end{tabular}

If a write by a replica to its relay log causes the current log file size to exceed the value of this variable, the replica rotates the relay logs (closes the current file and opens the next one). If max_relay_log_size is 0 , the server uses max_binlog_size for both the binary log and the relay log. If max_relay_log_size is greater than 0 , it constrains the size of the relay log, which enables you to have different sizes for the two logs. You must set max_relay_log_size to between 4096 bytes and 1 GB (inclusive), or to 0 . The default value is 0 . See Section 19.2.3, "Replication Threads".
- relay_log

\begin{tabular}{|l|l|}
\hline Command-Line Format & --relay-log=file_name \\
\hline System Variable & relay_log \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline
\end{tabular}

The base name for relay log files. For the default replication channel, the default base name for relay logs is host_name-relay-bin. For non-default replication channels, the default base name for relay logs is host_name-relay-bin-channel, where channel is the name of the replication channel recorded in this relay log.

The server writes the file in the data directory unless the base name is given with a leading absolute path name to specify a different directory. The server creates relay log files in sequence by adding a numeric suffix to the base name.

The relay log and relay log index on a replication server cannot be given the same names as the binary log and binary log index, whose names are specified by the --log-bin and --log-bin-
index options. The server issues an error message and does not start if the binary log and relay log file base names would be the same.

Due to the manner in which MySQL parses server options, if you specify this variable at server startup, you must supply a value; the default base name is used only if the option is not actually specified. If you specify the relay_log system variable at server startup without specifying a value, unexpected behavior is likely to result; this behavior depends on the other options used, the order in which they are specified, and whether they are specified on the command line or in an option file. For more information about how MySQL handles server options, see Section 6.2.2, "Specifying Program Options".

If you specify this variable, the value specified is also used as the base name for the relay log index file. You can override this behavior by specifying a different relay log index file base name using the relay_log_index system variable.

When the server reads an entry from the index file, it checks whether the entry contains a relative path. If it does, the relative part of the path is replaced with the absolute path set using the relay_log system variable. An absolute path remains unchanged; in such a case, the index must be edited manually to enable the new path or paths to be used.

You may find the relay_log system variable useful in performing the following tasks:
- Creating relay logs whose names are independent of host names.
- If you need to put the relay logs in some area other than the data directory because your relay logs tend to be very large and you do not want to decrease max_relay_log_size.
- To increase speed by using load-balancing between disks.

You can obtain the relay log file name (and path) from the relay_log_basename system variable.
- relay_log_basename

\begin{tabular}{|l|l|}
\hline System Variable & relay_log_basename \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & datadir + '/' + hostname + '-relaybin' \\
\hline
\end{tabular}

Holds the base name and complete path to the relay log file. The maximum variable length is 256. This variable is set by the server and is read only.
- relay_log_index

\begin{tabular}{|l|l|}
\hline Command-Line Format & --relay-log-index=file_name \\
\hline System Variable & relay_log_index \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Default Value & *host_name*-relay-bin.index \\
\hline
\end{tabular}

The name for the relay log index file. The maximum variable length is 256 . If you do not specify this variable, but the relay_log system variable is specified, its value is used as the default base name for the relay log index file. If relay_log is also not specified, then for the default replication channel, the default name is host_name-relay-bin.index, using the name of the host machine. For nondefault replication channels, the default name is host_name-relay-bin-channel.index, where channel is the name of the replication channel recorded in this relay log index.

The default location for relay log files is the data directory, or any other location that was specified using the relay_log system variable. You can use the relay_log_index system variable to specify an alternative location, by adding a leading absolute path name to the base name to specify a different directory.

The relay log and relay log index on a replication server cannot be given the same names as the binary log and binary log index, whose names are specified by the --log-bin and --log-binindex options. The server issues an error message and does not start if the binary log and relay log file base names would be the same.

Due to the manner in which MySQL parses server options, if you specify this variable at server startup, you must supply a value; the default base name is used only if the option is not actually specified. If you specify the relay_log_index system variable at server startup without specifying a value, unexpected behavior is likely to result; this behavior depends on the other options used, the order in which they are specified, and whether they are specified on the command line or in an option file. For more information about how MySQL handles server options, see Section 6.2.2, "Specifying Program Options".
- relay_log_purge

\begin{tabular}{|l|l|}
\hline Command-Line Format & --relay-log-purge[=\{OFF|ON\}] \\
\hline System Variable & relay_log_purge \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Disables or enables automatic purging of relay log files as soon as they are not needed any more. The default value is $1(0 \mathrm{~N})$.
- relay_log_recovery

\begin{tabular}{|l|l|}
\hline Command-Line Format & --relay-log-recovery[=\{OFF|ON\}] \\
\hline System Variable & relay_log_recovery \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

If enabled, this variable enables automatic relay log recovery immediately following server startup. The recovery process creates a new relay log file, initializes the SQL (applier) thread position to this new relay log, and initializes the I/O (receiver) thread to the applier thread position. Reading of the
channel using a CHANGE REPLICATION SOURCE TO statement, the source position used to start replication might be the one received in the connection and not the ones assigned in this process.

When relay_log_recovery is disabled, the server sanitizes the relay log on startup, by performing the following actions:
- Removing any transactions that remain uncompleted at the end of the log
- Removing any relay log file which contains only parts of unfinished transactions
- Removing any reference from the relay log index file to any relay log file that has been removed
- When a valid source position and source filename are obtained from the relay log, updating the position of the receiver thread to match this file and position; otherwise, updating the position of the receiver thread to match the the position of the applier

This global variable is read-only at runtime. Its value can be set with the --relay-log-recovery option at replica server startup, which should be used following an unexpected halt of a replica to ensure that no possibly corrupted relay logs are processed, and must be used in order to guarantee a crash-safe replica. The default value is 0 (disabled). For information on the combination of settings on a replica that is most resilient to unexpected halts, see Section 19.4.2, "Handling an Unexpected Halt of a Replica".

For a multithreaded replica (where replica_parallel_workers is greater than 0), setting --relay-log-recovery at startup automatically handles any inconsistencies and gaps in the sequence of transactions that have been executed from the relay log. These gaps can occur when file position based replication is in use. (For more details, see Section 19.5.1.34, "Replication and Transaction Inconsistencies".) The relay log recovery process deals with gaps using the same method as the START REPLICA UNTIL SQL_AFTER_MTS_GAPS statement would. When the replica reaches a consistent gap-free state, the relay log recovery process goes on to fetch further transactions from the source beginning at the SQL (applier) thread position. When GTID-based replication is in use, a multithreaded replica checks first whether SOURCE_AUTO_POSITION is set to ON, and if it is, omits the step of calculating the transactions that should be skipped or not skipped, so that the old relay logs are not required for the recovery process.

\section*{Note}

This variable does not affect the following Group Replication channels:
- group_replication_applier
- group_replication_recovery

Any other channels running on a group are affected, such as a channel which is replicating from an outside source or another group.
- relay_log_space_limit

\begin{tabular}{|l|l|}
\hline Command-Line Format & --relay-log-space-limit=\# \\
\hline System Variable & relay_log_space_limit \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 18446744073709551615 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Unit & bytes \\
\hline
\end{tabular}

The maximum amount of space to use for all relay logs.
- replica_checkpoint_group

\begin{tabular}{|l|l|}
\hline Command-Line Format & --replica-checkpoint-group=\# \\
\hline System Variable & replica_checkpoint_group \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 512 \\
\hline Minimum Value & 32 \\
\hline Maximum Value & 524280 \\
\hline Block Size & 8 \\
\hline
\end{tabular}
replica_checkpoint_group sets the maximum number of transactions that can be processed by a multithreaded replica before a checkpoint operation is called to update its status as shown by SHOW REPLICA STATUS. Setting this variable has no effect on replicas for which multithreading is not enabled. Setting this variable has no immediate effect. The state of the variable applies to all subsequent START REPLICA statements.

This variable works in combination with the replica_checkpoint_period system variable in such a way that, when either limit is exceeded, the checkpoint is executed and the counters tracking both the number of transactions and the time elapsed since the last checkpoint are reset.

The minimum allowed value for this variable is 32 , unless the server was built using - DWITH_DEBUG, in which case the minimum value is 1 . The effective value is always a multiple of 8 ; you can set it to a value that is not such a multiple, but the server rounds it down to the next lower multiple of 8 before storing the value. (Exception: No such rounding is performed by the debug server.) Regardless of how the server was built, the default value is 512, and the maximum allowed value is 524280.
- replica_checkpoint_period

\begin{tabular}{|l|l|}
\hline Command-Line Format & --replica-checkpoint-period=\# \\
\hline System Variable & replica_checkpoint_period \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 300 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & milliseconds \\
\hline
\end{tabular}
replica_checkpoint_period sets the maximum time (in milliseconds) that is allowed to pass before a checkpoint operation is called to update the status of a multithreaded replica as shown by SHOW REPLICA STATUS. Setting this variable has no effect on replicas for which multithreading
is not enabled. Setting this variable takes effect for all replication channels immediately, including running channels.

This variable works in combination with the replica_checkpoint_group system variable in such a way that, when either limit is exceeded, the checkpoint is executed and the counters tracking both the number of transactions and the time elapsed since the last checkpoint are reset.

The minimum allowed value for this variable is 1 , unless the server was built using - DWITH_DEBUG, in which case the minimum value is 0 . Regardless of how the server was built, the default value is 300 milliseconds, and the maximum possible value is 4294967295 milliseconds (approximately 49.7 days).
- replica_compressed_protocol

\begin{tabular}{|l|l|}
\hline Command-Line Format & --replica-compressed-protocol[=\{0FF| ON\}] \\
\hline System Variable & replica_compressed_protocol \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}
replica_compressed_protocol specifies whether to use compression of the source/replica connection protocol if both source and replica support it. If this variable is disabled (the default), connections are uncompressed. Changes to this variable take effect on subsequent connection attempts; this includes after issuing a START REPLICA statement, as well as reconnections made by a running replication I/O (receiver) thread.

Binary log transaction compression, enabled by the binlog_transaction_compression system variable, can also be used to save bandwidth. If you use binary log transaction compression in combination with protocol compression, protocol compression has less opportunity to act on the data, but can still compress headers and those events and transaction payloads that are uncompressed. For more information on binary log transaction compression, see Section 7.4.4.5, "Binary Log Transaction Compression".

If replica_compressed_protocol is enabled, it takes precedence over any SOURCE_COMPRESSION_ALGORITHMS option specified for the CHANGE REPLICATION SOURCE T0 statement. In this case, connections to the source use zlib compression if both the source and replica support that algorithm. If replica_compressed_protocol is disabled, the value of SOURCE_COMPRESSION_ALGORITHMS applies. For more information, see Section 6.2.8, "Connection Compression Control".
- replica_exec_mode

\begin{tabular}{|l|l|}
\hline Command-Line Format & --replica-exec-mode=mode \\
\hline System Variable & replica_exec_mode \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & \begin{tabular}{l}
IDEMPOTENT (NDB) \\
STRICT (Other)
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Valid Values & STRICT \\
& IDEMPOTENT
\end{tabular}
replica_exec_mode controls how a replication thread resolves conflicts and errors during replication. IDEMPOTENT mode causes suppression of duplicate-key and no-key-found errors; STRICT means no such suppression takes place.

IDEMPOTENT mode is intended for use in multi-source replication, circular replication, and some other special replication scenarios for NDB Cluster Replication. (See Section 25.7.10, "NDB Cluster Replication: Bidirectional and Circular Replication", and Section 25.7.12, "NDB Cluster Replication Conflict Resolution", for more information.) NDB Cluster ignores any value explicitly set for replica_exec_mode, and always treats it as IDEMPOTENT.

In MySQL Server 8.4, STRICT mode is the default value.
Setting this variable takes immediate effect for all replication channels, including running channels.
For storage engines other than NDB, IDEMPOTENT mode should be used only when you are absolutely sure that duplicate-key errors and key-not-found errors can safely be ignored. It is meant to be used in fail-over scenarios for NDB Cluster where multi-source replication or circular replication is employed, and is not recommended for use in other cases.
- replica_load_tmpdir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --replica-load-tmpdir=dir_name \\
\hline System Variable & replica_load_tmpdir \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline Default Value & Value of --tmpdir \\
\hline
\end{tabular}
replica_load_tmpdir specifies the name of the directory where the replica creates temporary files. Setting this variable takes effect for all replication channels immediately, including running channels. The variable value is by default equal to the value of the tmpdir system variable, or the default that applies when that system variable is not specified.

When the replication SQL thread replicates a LOAD DATA statement, it extracts the file to be loaded from the relay log into temporary files, and then loads these into the table. If the file loaded on the source is huge, the temporary files on the replica are huge, too. Therefore, it might be advisable to use this option to tell the replica to put temporary files in a directory located in some file system that has a lot of available space. In that case, the relay logs are huge as well, so you might also want to set the relay_log system variable to place the relay logs in that file system.

The directory specified by this option should be located in a disk-based file system (not a memorybased file system) so that the temporary files used to replicate LOAD DATA statements can survive machine restarts. The directory also should not be one that is cleared by the operating system during the system startup process. However, replication can now continue after a restart if the temporary files have been removed.
- replica_max_allowed_packet

\begin{tabular}{|l|l|}
\hline & Command-Line Format \\
\hline System Variable & - - replica-max-allowed - packet=\# \\
\hline Scope & replica_max_allowed_packet \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Replication and Binary Logging Options and Variables}
\begin{tabular}{|l|l|}
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1073741824 \\
\hline Minimum Value & 1024 \\
\hline Maximum Value & 1073741824 \\
\hline Unit & bytes \\
\hline Block Size & 1024 \\
\hline
\end{tabular}
\end{table}
replica_max_allowed_packet sets the maximum packet size in bytes that the replication SQL (applier)and I/O (receiver) threads can handle. Setting this variable takes effect for all replication channels immediately, including running channels. It is possible for a source to write binary log events longer than its max_allowed_packet setting once the event header is added. The setting for replica_max_allowed_packet must be larger than the max_allowed_packet setting on the source, so that large updates using row-based replication do not cause replication to fail.

This global variable always has a value that is a positive integer multiple of 1024; if you set it to some value that is not, the value is rounded down to the next highest multiple of 1024 for it is stored or used; setting replica_max_allowed_packet to 0 causes 1024 to be used. (A truncation warning is issued in all such cases.) The default and maximum value is $1073741824(1 \mathrm{~GB})$; the minimum is 1024.
- replica_net_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --replica-net-timeout=\# \\
\hline System Variable & replica_net_timeout \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 60 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 31536000 \\
\hline Unit & seconds \\
\hline
\end{tabular}
replica_net_timeout specifies the number of seconds to wait for more data or a heartbeat signal from the source before the replica considers the connection broken, aborts the read, and tries to reconnect. Setting this variable has no immediate effect. The state of the variable applies on all subsequent START REPLICA commands.

The default value is 60 seconds (one minute). The first retry occurs immediately after the timeout. The interval between retries is controlled by the SOURCE_CONNECT_RETRY option for the CHANGE REPLICATION SOURCE TO statement, and the number of reconnection attempts is limited by the SOURCE_RETRY_COUNT option.

The heartbeat interval, which stops the connection timeout occurring in the absence of data if the connection is still good, is controlled by the SOURCE_HEARTBEAT_PERIOD option for the CHANGE REPLICATION SOURCE TO statement. The heartbeat interval defaults to half the value of replica_net_timeout, and it is recorded in the replica's connection metadata repository and shown in the replication_connection_configuration Performance Schema table. Note that a change to the value or default setting of replica_net_timeout does not automatically change the heartbeat interval, whether that has been set explicitly or is using a previously calculated default.

If the connection timeout is changed, you must also issue CHANGE REPLICATION SOURCE TO to adjust the heartbeat interval to an appropriate value so that it occurs before the connection timeout.
- replica_parallel_type

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -replica-parallel-type=value \\
\hline Deprecated & Yes \\
\hline System Variable & replica_parallel_type \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & LOGICAL_CLOCK \\
\hline Valid Values & \begin{tabular}{l}
DATABASE \\
LOGICAL_CLOCK
\end{tabular} \\
\hline
\end{tabular}

For multithreaded replicas (replicas on which replica_parallel_workers is set to a value greater than 0), replica_parallel_type specifies the policy used to decide which transactions are allowed to execute in parallel on the replica. The variable has no effect on replicas for which multithreading is not enabled. The possible values are:
- LOGICAL_CLOCK: Transactions are applied in parallel on the replica, based on timestamps which the replication source writes to the binary log. Dependencies between transactions are tracked based on their timestamps to provide additional parallelization where possible.
- DATABASE: Transactions that update different databases are applied in parallel. This value is only appropriate if data is partitioned into multiple databases which are being updated independently and concurrently on the source. There must be no cross-database constraints, as such constraints may be violated on the replica.

When replica_preserve_commit_order is enabled, you must use LOGICAL_CLOCK. Multithreading is enabled by default for replica servers (replica_parallel_workers=4 by default), and LOGICAL_CLOCK is the default. (replica_preserve_commit_order is also enabled by default.)

When the replication topology uses multiple levels of replicas, LOGICAL_CLOCK may achieve less parallelization for each level the replica is away from the source.

When binary log transaction compression is enabled using the binlog_transaction_compression system variable, if replica_parallel_type is set to DATABASE, all the databases affected by the transaction are mapped before the transaction is scheduled. The use of binary log transaction compression with the DATABASE policy can reduce parallelism compared to uncompressed transactions, which are mapped and scheduled for each event.
replica_parallel_type is deprecated, as is support for parallelization of transactions using database partitioning. Expect support for these to be removed in a future release, and for LOGICAL_CLOCK to be used exclusively thereafter.
- replica_parallel_workers

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - replica-parallel-workers=\# \\
\hline System Variable & replica_parallel_workers \\
\hline Scope & Global \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Replication and Binary Logging Options and Variables}
\begin{tabular}{|l|l|}
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 4 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1024 \\
\hline
\end{tabular}
\end{table}
replica_parallel_workers enables multithreading on the replica and sets the number of applier threads for executing replication transactions in parallel. When the value is greater than or equal to 1 , the replica uses the specified number of worker threads to execute transactions, plus a coordinator thread that reads transactions from the relay log and schedules them to workers. When the value is 0 , there is only one thread that reads and applies transactions sequentially. If you are using multiple replication channels, the value of this variable applies to the threads used by each channel.

The default value is 4 , which means that replicas are multithreaded by default.
Setting this variable to 0 is deprecated, raises a warning, and is subject to removal in a future MySQL release. For a single worker, set replica_parallel_workers to 1 instead.

When replica_preserve_commit_order is ON (the default), transactions on a replica are externalized on the replica in the same order as they appear in the replica's relay log. The way in which transactions are distributed among applier threads is determined by replica_parallel_type. These system variables also have appropriate defaults for multithreading.

To disable parallel execution, set replica_parallel_workers to 1, in which case the replica uses one coordinator thread which reads transactions, and one worker thread which applies them, which means that transactions are applied sequentially. When replica_parallel_workers is equal to 1, the replica_parallel_type and replica_preserve_commit_order system variables have no effect and are ignored. If replica_parallel_workers is equal to 0 while the CHANGE REPLICATION SOURCE TO option GTID_ONLY is enabled, the replica has one coordinator thread and one worker thread, exactly as if replica_parallel_workers had been set to 1 . With one parallel worker, the replica_preserve_commit_order system variable also has no effect.

Setting replica_parallel_workers has no immediate effect but rather applies to all subsequent START REPLICA statements.

Multithreaded replicas are also supported by NDB Cluster 8.4. See Section 25.7.11, "NDB Cluster Replication Using the Multithreaded Applier", for more information.

Increasing the number of workers improves the potential for parallelism. Typically, this improves performance up to a certain point, beyond which increasing the number of workers reduces performance due to concurrency effects such as lock contention. The ideal number depends on both hardware and workload; it can be difficult to predict and typically has to be found by testing. Tables without primary keys, which always harm performance, may have even greater negative performance impact on replicas having replica_parallel_workers > 1; so make sure that all tables have primary keys before enabling this option.
- replica_pending_jobs_size_max

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - replica-pending-jobs-size-max=\# \\
\hline System Variable & replica_pending_jobs_size_max \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 128M \\
\hline Minimum Value & 1024 \\
\hline Maximum Value & 16EiB \\
\hline Unit & bytes \\
\hline Block Size & 1024 \\
\hline
\end{tabular}

For multithreaded replicas, this variable sets the maximum amount of memory (in bytes) available to applier queues holding events not yet applied. Setting this variable has no effect on replicas for which multithreading is not enabled. Setting this variable has no immediate effect. The state of the variable applies on all subsequent START REPLICA commands.

The minimum possible value for this variable is 1024 bytes; the default is 128 MB . The maximum possible value is 18446744073709551615 ( 16 exbibytes). Values that are not exact multiples of 1024 bytes are rounded down to the next lower multiple of 1024 bytes prior to being stored.

The value of this variable is a soft limit and can be set to match the normal workload. If an unusually large event exceeds this size, the transaction is held until all the worker threads have empty queues, and then processed. All subsequent transactions are held until the large transaction has been completed.
- replica_preserve_commit_order

\begin{tabular}{|l|l|}
\hline Command-Line Format & --replica-preserve-commitorder[=\{OFF|ON\}] \\
\hline System Variable & replica_preserve_commit_order \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

For multithreaded replicas (replicas on which replica_parallel_workers is set to a value greater than 0), setting replica_preserve_commit_order=ON ensures that transactions are executed and committed on the replica in the same order as they appear in the replica's relay log. This prevents gaps in the sequence of transactions that have been executed from the replica's relay log, and preserves the same transaction history on the replica as on the source (with the limitations listed below). This variable has no effect on replicas for which multithreading is not enabled.

Multithreading is enabled by default in MySQL 8.4 for replica servers (replica_parallel_workers=4 by default), so replica_preserve_commit_order=ON is the default, and the setting replica_parallel_type=LOGICAL_CLOCK is also the default. In addition, the setting for replica_preserve_commit_order is ignored if replica_parallel_workers is set to 1 , because in that situation the order of transactions is preserved anyway.

Binary logging and replica update logging are not required on the replica to set replica_preserve_commit_order=ON, and can be disabled if wanted. Setting replica_preserve_commit_order=ON requires that replica_parallel_type is set to LOGICAL_CLOCK, the default in MySQL 8.4. Before changing the value of
replica_preserve_commit_order or replica_parallel_type, the replication applier thread (for all replication channels if you are using multiple replication channels) must be stopped.

When replica_preserve_commit_order=0FF is set, the transactions that a multithreaded replica applies in parallel may commit out of order. Therefore, checking for the most recently executed transaction does not guarantee that all previous transactions from the source have been executed on the replica. There is a chance of gaps in the sequence of transactions that have been executed from the replica's relay log. This has implications for logging and recovery when using a multithreaded replica. See Section 19.5.1.34, "Replication and Transaction Inconsistencies" for more information.

When replica_preserve_commit_order=ON is set, the executing worker thread waits until all previous transactions are committed before committing. While a given thread is waiting for other worker threads to commit their transactions, it reports its status as Waiting for preceding transaction to commit. With this mode, a multithreaded replica never enters a state that the source was not in. This supports the use of replication for read scale-out. See Section 19.4.5, "Using Replication for Scale-Out".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3452.jpg?height=127&width=99&top_left_y=995&top_left_x=342)

\section*{Note}
- replica_preserve_commit_order=ON does not prevent source binary log position lag, where Exec_master_log_pos is behind the position up to which transactions have been executed. See Section 19.5.1.34, "Replication and Transaction Inconsistencies".
- replica_preserve_commit_order=ON does not preserve the commit order and transaction history if the replica uses filters on its binary log, such as --binlog-do-db.
- replica_preserve_commit_order=ON does not preserve the order of non-transactional DML updates. These might commit before transactions that precede them in the relay log, which might result in gaps in the sequence of transactions that have been executed from the replica's relay log.
- A limitation to preserving the commit order on the replica can occur if statement-based replication is in use, and both transactional and nontransactional storage engines participate in a non-XA transaction that is rolled back on the source. Normally, non-XA transactions that are rolled back on the source are not replicated to the replica, but in this particular situation, the transaction might be replicated to the replica. If this does happen, a multithreaded replica without binary logging does not handle the transaction rollback, so the commit order on the replica diverges from the relay log order of the transactions in that case.
- Group Replication-MySQL 8.4.4 and later: When a group primary is receiving and applying transactions from an external source through an asynchronous channel and a new member joins the group, replica_preserve_commit_order=ON is not guaranteed to respect the commit order of non-conflicting transactions. Because of this, there may be temporary states on the secondary that never existed on the source; since this occurs only with regard to non-conflicting transactions, there is no actual divergence.
- replica_sql_verify_checksum

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--replica-sql-verify-checksum $[=\{0 F F \mid$ \\
ON $\}]$
\end{tabular} \\
\hline System Variable & replica_sql_verify_checksum \\
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
replica_sql_verify_checksum causes the replication SQL (applier) thread to verify data using the checksums read from the relay log. In the event of a mismatch, the replica stops with an error. Setting this variable takes effect for all replication channels immediately, including running channels.

\section*{Note}

The replication I/O (receiver)thread always reads checksums if possible when accepting events from over the network.
- replica_transaction_retries

\begin{tabular}{|l|l|}
\hline Command-Line Format & --replica-transaction-retries=\# \\
\hline System Variable & replica_transaction_retries \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 10 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 18446744073709551615 \\
\hline
\end{tabular}
replica_transaction_retries sets the maximum number of times for replication SQL threads on a single-threaded or multithreaded replica to automatically retry failed transactions before stopping. Setting this variable takes effect for all replication channels immediately, including running channels. The default value is 10 . Setting the variable to 0 disables automatic retrying of transactions.

If a replication SQL thread fails to execute a transaction because of an InnoDB deadlock or because the transaction's execution time exceeded InnoDB's innodb_lock_wait_timeout or NDB's TransactionDeadlockDetectionTimeout or TransactionInactiveTimeout, it automatically retries replica_transaction_retries times before stopping with an error. Transactions with a non-temporary error are not retried.

The Performance Schema table replication_applier_status shows the number of retries that took place on each replication channel, in the COUNT_TRANSACTIONS_RETRIES column. The Performance Schema table replication_applier_status_by_worker shows detailed information on transaction retries by individual applier threads on a single-threaded or multithreaded replica, and identifies the errors that caused the last transaction and the transaction currently in progress to be reattempted.
- replica_type_conversions

\begin{tabular}{|l|l|}
\hline Command-Line Format & --replica-type-conversions=set \\
\hline System Variable & replica_type_conversions \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Replication and Binary Logging Options and Variables}
\begin{tabular}{|l|l|}
\hline Type & Set \\
\hline Default Value & \\
\hline Valid Values & \begin{tabular}{l}
ALL_LOSSY \\
ALL_NON_LOSSY \\
ALL_SIGNED \\
ALL_UNSIGNED
\end{tabular} \\
\hline
\end{tabular}
\end{table}
replica_type_conversions controls the type conversion mode in effect on the replica when using row-based replication. Its value is a comma-delimited set of zero or more elements from the list: ALL_LOSSY, ALL_NON_LOSSY, ALL_SIGNED, ALL_UNSIGNED. Set this variable to an empty string to disallow type conversions between the source and the replica. Setting this variable takes effect for all replication channels immediately, including running channels.

For additional information on type conversion modes applicable to attribute promotion and demotion in row-based replication, see Row-based replication: attribute promotion and demotion.
- replication_optimize_for_static_plugin_config

\begin{tabular}{|l|l|}
\hline Command-Line Format & --replication-optimize-for-static-plugin-config[=\{OFF|ON\}] \\
\hline System Variable & replication_optimize_for_static_plugin_config \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Use shared locks, and avoid lock acquisitions, to improve performance for semisynchronous replication. This setting and replication_sender_observe_commit_only help as the number of replicas increases, because contention for locks can slow down performance. While this system variable is enabled, the semisynchronous replication plugin cannot be uninstalled, so you must disable the system variable before the uninstall can complete.

This system variable can be enabled before or after installing the semisynchronous replication plugin, and can be enabled while replication is running. Semisynchronous replication source servers can also get performance benefits from enabling this system variable, because they use the same locking mechanisms as the replicas.
replication_optimize_for_static_plugin_config can be enabled when Group Replication is in use on a server. In that scenario, it might benefit performance when there is contention for locks due to high workloads.
- replication_sender_observe_commit_only

\begin{tabular}{|l|l|}
\hline Command-Line Format & --replication-sender-observe-commitonly[=\{OFF|ON\}] \\
\hline System Variable & replication_sender_observe_commit_only \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

Default Value
OFF
Limit callbacks to improve performance for semisynchronous replication. This setting and replication_optimize_for_static_plugin_config help as the number of replicas increases, because contention for locks can slow down performance.

This system variable can be enabled before or after installing the semisynchronous replication plugin, and can be enabled while replication is running. Semisynchronous replication source servers can also get performance benefits from enabling this system variable, because they use the same locking mechanisms as the replicas.
- report_host

\begin{tabular}{|l|l|}
\hline Command-Line Format & --report-host=host_name \\
\hline System Variable & report_host \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

The host name or IP address of the replica to be reported to the source during replica registration. This value appears in the output of SHOW REPLICAS on the source server. Leave the value unset if you do not want the replica to register itself with the source.

\section*{Note}

It is not sufficient for the source to simply read the IP address of the replica server from the TCP/IP socket after the replica connects. Due to NAT and other routing issues, that IP may not be valid for connecting to the replica from the source or other hosts.
- report_password

\begin{tabular}{|l|l|}
\hline Command-Line Format & --report-password=name \\
\hline System Variable & report_password \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

The account password of the replica to be reported to the source during replica registration. This value appears in the output of SHOW REPLICAS on the source server if the source was started with --show-replica-auth-info.

Although the name of this variable might imply otherwise, report_password is not connected to the MySQL user privilege system and so is not necessarily (or even likely to be) the same as the password for the MySQL replication user account.
- report_port

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- report-port=port_num \\
\hline System Variable & report_port \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Replication and Binary Logging Options and Variables}
\begin{tabular}{|l|l|}
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & [slave_port] \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 65535 \\
\hline
\end{tabular}
\end{table}

The TCP/IP port number for connecting to the replica, to be reported to the source during replica registration. Set this only if the replica is listening on a nondefault port or if you have a special tunnel from the source or other clients to the replica. If you are not sure, do not use this option.

The default value for this option is the port number actually used by the replica. This is also the default value displayed by SHOW REPLICAS.
- report_user

\begin{tabular}{|l|l|}
\hline Command-Line Format & --report-user=name \\
\hline System Variable & report_user \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

The account user name of the replica to be reported to the source during replica registration. This value appears in the output of SHOW REPLICAS on the source server if the source was started with --show-replica-auth-info.

Although the name of this variable might imply otherwise, report_user is not connected to the MySQL user privilege system and so is not necessarily (or even likely to be) the same as the name of the MySQL replication user account.
- rpl_read_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --rpl-read-size=\# \\
\hline System Variable & rpl_read_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 8192 \\
\hline Minimum Value & 8192 \\
\hline Maximum Value & 4294959104 \\
\hline Unit & bytes \\
\hline Block Size & 8192 \\
\hline
\end{tabular}

The rpl_read_size system variable controls the minimum amount of data in bytes that is read from the binary log files and relay log files. If heavy disk I/O activity for these files is impeding performance for the database, increasing the read size might reduce file reads and I/O stalls when the file data is not currently cached by the operating system.

The minimum and default value for rpl_read_size is 8192 bytes. The value must be a multiple of 4 KB . Note that a buffer the size of this value is allocated for each thread that reads from the binary
log and relay log files, including dump threads on sources and coordinator threads on replicas. Setting a large value might therefore have an impact on memory consumption for servers.
- rpl_semi_sync_replica_enabled

\begin{tabular}{|l|l|}
\hline Command-Line Format & --rpl-semi-sync-replicaenabled[=\{OFF|ON\}] \\
\hline System Variable & rpl_semi_sync_replica_enabled \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}
rpl_semi_sync_replica_enabled controls whether semisynchronous replication is enabled on the replica server. To enable or disable the plugin, set this variable to ON or OFF (or 1 or 0), respectively. The default is OFF.

This variable is available only if the replica-side semisynchronous replication plugin is installed.
- rpl_semi_sync_replica_trace_level

\begin{tabular}{|l|l|}
\hline Command-Line Format & --rpl-semi-sync-replica-tracelevel=\# \\
\hline System Variable & rpl_semi_sync_replica_trace_level \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 32 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}
rpl_semi_sync_replica_trace_level controls the semisynchronous replication debug trace level on the replica server. See rpl_semi_sync_master_trace_level for the permissible values.

This variable is available only if the replica-side semisynchronous replication plugin is installed.
- rpl_semi_sync_slave_enabled

\begin{tabular}{|l|l|}
\hline Command-Line Format & --rpl-semi-sync-slave-enabled[=\{0FF| ON\}] \\
\hline Deprecated & Yes \\
\hline System Variable & rpl_semi_sync_slave_enabled \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline
\end{tabular}

Default Value
OFF

Deprecated synonym for rpl_semi_sync_replica_enabled.
- rpl_semi_sync_slave_trace_level

\begin{tabular}{|l|l|}
\hline Command-Line Format & --rpl-semi-sync-slave-trace-level=\# \\
\hline Deprecated & Yes \\
\hline System Variable & rpl_semi_sync_slave_trace_level \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 32 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

Deprecated synonym for rpl_semi_sync_replica_trace_level.
- rpl_stop_replica_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --rpl-stop-replica-timeout=\# \\
\hline System Variable & rpl_stop_replica_timeout \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 31536000 \\
\hline Minimum Value & 2 \\
\hline Maximum Value & 31536000 \\
\hline Unit & seconds \\
\hline
\end{tabular}

You can control the length of time (in seconds) that STOP REPLICA waits before timing out by setting this variable. This can be used to avoid deadlocks between STOP REPLICA and other SQL statements using different client connections to the replica.

The maximum and default value of rpl_stop_replica_timeout is 31536000 seconds (1 year). The minimum is 2 seconds. Changes to this variable take effect for subsequent STOP REPLICA statements.

This variable affects only the client that issues a STOP REPLICA statement. When the timeout is reached, the issuing client returns an error message stating that the command execution is incomplete. The client then stops waiting for the replication I/O (receiver)and SQL (applier) threads to stop, but the replication threads continue to try to stop, and the STOP REPLICA statement remains in effect. Once the replication threads are no longer busy, the STOP REPLICA statement is executed and the replica stops.
- rpl_stop_slave_timeout

\begin{tabular}{l|l|l|}
\cline { 2 - 3 } & Command-Line Format & --rpl-stop-slave-timeout=\# \\
\hline 3428 & Deprecated & Yes \\
\cline { 2 - 3 } & &
\end{tabular}

\begin{tabular}{|l|l|}
\hline System Variable & rpl_stop_slave_timeout \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 31536000 \\
\hline Minimum Value & 2 \\
\hline Maximum Value & 31536000 \\
\hline Unit & seconds \\
\hline
\end{tabular}

Deprecated synonym for rpl_stop_replica_timeout.
- skip_replica_start

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-replica-start[=\{OFF|ON\}] \\
\hline System Variable & skip_replica_start \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}
skip_replica_start tells the replica server not to start the replication I/O (receiver) and SQL (applier) threads when the server starts. To start the threads later, use a START REPLICA statement.

This system variable is read-only and can be set by using the PERSIST_ONLY keyword or the @@persist_only qualifier with the SET statement. The --skip-replica-start command line option also sets this system variable. You can use the system variable in place of the command line option to allow access to this feature using MySQL Server's privilege structure, so that database administrators do not need any privileged access to the operating system.
- skip_slave_start

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-slave-start[=\{OFF|ON\}] \\
\hline Deprecated & Yes \\
\hline System Variable & skip_slave_start \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Deprecated synonym for --skip-replica-start.
- slave_checkpoint_group

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slave-checkpoint-group=\# \\
\hline Deprecated & Yes \\
\hline System Variable & slave_checkpoint_group \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Replication and Binary Logging Options and Variables}
\begin{tabular}{|l|l|}
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 512 \\
\hline Minimum Value & 32 \\
\hline Maximum Value & 524280 \\
\hline Block Size & 8 \\
\hline
\end{tabular}
\end{table}

Deprecated synonym for replica_checkpoint_group.
- slave_checkpoint_period

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slave-checkpoint-period=\# \\
\hline Deprecated & Yes \\
\hline System Variable & slave_checkpoint_period \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 300 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & milliseconds \\
\hline
\end{tabular}

Deprecated synonym for replica_checkpoint_period.
- slave_compressed_protocol

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slave-compressed-protocol[=\{0FF| ON\}] \\
\hline Deprecated & Yes \\
\hline System Variable & slave_compressed_protocol \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & 0FF \\
\hline
\end{tabular}

Deprecated alias for replica_compressed_protocol.
- slave_exec_mode

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slave-exec-mode=mode \\
\hline Deprecated & Yes \\
\hline System Variable & slave_exec_mode \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & \begin{tabular}{l}
IDEMPOTENT (NDB) \\
STRICT (Other)
\end{tabular} \\
\hline Valid Values & \begin{tabular}{l}
STRICT \\
IDEMPOTENT
\end{tabular} \\
\hline
\end{tabular}

Deprecated alias for replica_exec_mode.
- slave_load_tmpdir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slave-load-tmpdir=dir_name \\
\hline Deprecated & Yes \\
\hline System Variable & slave_load_tmpdir \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Directory name \\
\hline Default Value & Value of --tmpdir \\
\hline
\end{tabular}

Deprecated alias for replica_load_tmpdir.
- slave_max_allowed_packet

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slave-max-allowed-packet=\# \\
\hline Deprecated & Yes \\
\hline System Variable & slave_max_allowed_packet \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1073741824 \\
\hline Minimum Value & 1024 \\
\hline Maximum Value & 1073741824 \\
\hline Unit & bytes \\
\hline Block Size & 1024 \\
\hline
\end{tabular}

Deprecated alias for replica_max_allowed_packet.
- slave_net_timeout

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slave-net-timeout=\# \\
\hline Deprecated & Yes \\
\hline System Variable & slave_net_timeout \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Replication and Binary Logging Options and Variables}
\begin{tabular}{|l|l|}
\hline Type & Integer \\
\hline Default Value & 60 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 31536000 \\
\hline Unit & seconds \\
\hline
\end{tabular}
\end{table}

Deprecated alias for replica_net_timeout.
- slave_parallel_type

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slave-parallel-type=value \\
\hline Deprecated & Yes \\
\hline System Variable & slave_parallel_type \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & LOGICAL_CLOCK \\
\hline Valid Values & \begin{tabular}{l}
DATABASE \\
LOGICAL_CLOCK
\end{tabular} \\
\hline
\end{tabular}

Deprecated alias for replica_parallel_type.
- slave_parallel_workers

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slave-parallel-workers=\# \\
\hline Deprecated & Yes \\
\hline System Variable & slave_parallel_workers \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 4 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1024 \\
\hline
\end{tabular}

Deprecated alias for replica_parallel_workers.
- slave_pending_jobs_size_max

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slave-pending-jobs-size-max=\# \\
\hline Deprecated & Yes \\
\hline System Variable & slave_pending_jobs_size_max \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & 128M \\
\hline Minimum Value & 1024 \\
\hline Maximum Value & 16EiB \\
\hline Unit & bytes \\
\hline Block Size & 1024 \\
\hline
\end{tabular}

Deprecated alias for replica_pending_jobs_size_max.
- slave_preserve_commit_order

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slave-preserve-commit-order[=\{OFF| ON\}] \\
\hline Deprecated & Yes \\
\hline System Variable & slave_preserve_commit_order \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Deprecated alias for replica_preserve_commit_order.
- slave_skip_errors

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slave-skip-errors=name \\
\hline Deprecated & Yes \\
\hline System Variable & slave_skip_errors \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & OFF \\
\hline Valid Values & \begin{tabular}{l}
OFF \\
[list of error codes] \\
all \\
ddl_exist_errors
\end{tabular} \\
\hline
\end{tabular}

Deprecated alias for replica_skip_errors.
- replica_skip_errors

\begin{tabular}{|l|l|}
\hline Command-Line Format & --replica-skip-errors=name \\
\hline System Variable & replica_skip_errors \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline
\end{tabular}

Replication and Binary Logging Options and Variables

\begin{tabular}{|l|l|}
\hline Default Value & OFF \\
\hline Valid Values & OFF \\
\hline & [list of error codes] \\
\hline & all \\
\hline & ddl_exist_errors \\
\hline
\end{tabular}

Normally, replication stops when an error occurs on the replica, which gives you the opportunity to resolve the inconsistency in the data manually. This option causes the replication SQL thread to continue replication when a statement returns any of the errors listed in the option value.

Do not use this option unless you fully understand why you are getting errors. If there are no bugs in your replication setup and client programs, and no bugs in MySQL itself, an error that stops replication should never occur. Indiscriminate use of this option results in replicas becoming hopelessly out of synchrony with the source, with you having no idea why this has occurred.

For error codes, you should use the numbers provided by the error message in your replica's error log and in the output of SHOW REPLICA STATUS. Appendix B, Error Messages and Common Problems, lists server error codes.

The shorthand value ddl_exist_errors is equivalent to the error code list 1007, 1008, 1050, 1051, 1054, 1060, 1061, 1068, 1091, 1146.

You can also (but should not) use the very nonrecommended value of all to cause the replica to ignore all error messages and keeps going regardless of what happens. Needless to say, if you use all, there are no guarantees regarding the integrity of your data. Please do not complain (or file bug reports) in this case if the replica's data is not anywhere close to what it is on the source. You have been warned.

This option does not work in the same way when replicating between NDB Clusters, due to the internal NDB mechanism for checking epoch sequence numbers; normally, as soon as NDB detects an epoch number that is missing or otherwise out of sequence, it immediately stops the replica applier thread. Beginning with NDB 8.0.28, you can override this behavior by also specifying - - ndb -applier-allow-skip-epoch together with --replica-skip-errors; doing so causes NDB to ignore skipped epoch transactions.

Examples:
```
--replica-skip-errors=1062,1053
--replica-skip-errors=all
--replica-skip-errors=ddl_exist_errors
```

- slave_sql_verify_checksum

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slave-sql-verify-checksum[=\{0FF| ON\}] \\
\hline Deprecated & Yes \\
\hline System Variable & slave_sql_verify_checksum \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Deprecated alias for replica_sql_verify_checksum.
- slave_transaction_retries

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slave-transaction-retries=\# \\
\hline Deprecated & Yes \\
\hline System Variable & slave_transaction_retries \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 10 \\
\hline Minimum Value & 0 \\
\hline Maximum Value (64-bit platforms) & 18446744073709551615 \\
\hline Maximum Value (32-bit platforms) & 4294967295 \\
\hline
\end{tabular}

Deprecated alias for replica_transaction_retries.
- slave_type_conversions

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slave-type-conversions=set \\
\hline Deprecated & Yes \\
\hline System Variable & slave_type_conversions \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Set \\
\hline Default Value & \\
\hline Valid Values & \begin{tabular}{l}
ALL_LOSSY \\
ALL_NON_LOSSY \\
ALL_SIGNED \\
ALL_UNSIGNED
\end{tabular} \\
\hline
\end{tabular}

Deprecated alias for replica_type_conversions.
- sql_replica_skip_counter

\begin{tabular}{|l|l|}
\hline System Variable & sql_replica_skip_counter \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}
sql_replica_skip_counter specifies the number of events from the source that a replica should skip. Setting the option has no immediate effect. The variable applies to the next START

REPLICA statement; the next START REPLICA statement also changes the value back to 0 . When this variable is set to a nonzero value and there are multiple replication channels configured, the START REPLICA statement can only be used with the FOR CHANNEL channel clause.

This option is incompatible with GTID-based replication, and must not be set to a nonzero value when gtid_mode=0N is set. If you need to skip transactions when employing GTIDs, use gtid_executed from the source instead. If you have enabled GTID assignment on a replication channel using the ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS option of the CHANGE REPLICATION SOURCE TO statement, sql_replica_skip_counter is available. See Section 19.1.7.3, "Skipping Transactions".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-3466.jpg?height=97&width=103&top_left_y=703&top_left_x=338)

\section*{Important}

If skipping the number of events specified by setting this variable would cause the replica to begin in the middle of an event group, the replica continues to skip until it finds the beginning of the next event group and begins from that point. For more information, see Section 19.1.7.3, "Skipping Transactions".
- sql_slave_skip_counter

\begin{tabular}{|l|l|}
\hline Deprecated & Yes \\
\hline System Variable & sql_slave_skip_counter \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

Deprecated alias for sql_replica_skip_counter.
- sync_master_info

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sync-master-info=\# \\
\hline Deprecated & Yes \\
\hline System Variable & sync_master_info \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 10000 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

Deprecated alias for sync_source_info.
- sync_relay_log

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sync-relay-log=\# \\
\hline System Variable & sync_relay_log \\
\hline Scope & Global \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 10000 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

If the value of this variable is greater than 0 , the MySQL server synchronizes its relay log to disk (using fdatasync( )) after every sync_relay_log events are written to the relay log. Setting this variable takes effect for all replication channels immediately, including running channels.

Setting sync_relay_log to 0 causes no synchronization to be done to disk; in this case, the server relies on the operating system to flush the relay log's contents from time to time as for any other file.

A value of 1 is the safest choice because in the event of an unexpected halt you lose at most one event from the relay log. However, it is also the slowest choice (unless the disk has a battery-backed cache, which makes synchronization very fast). For information on the combination of settings on a replica that is most resilient to unexpected halts, see Section 19.4.2, "Handling an Unexpected Halt of a Replica".
- sync_relay_log_info

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sync-relay-log-info=\# \\
\hline Deprecated & Yes \\
\hline System Variable & sync_relay_log_info \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 10000 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

The number of transactions after which the replica updates the applier metadata repository. When the applier metadata repository is stored as an InnoDB table, which is the default, it is updated after every transaction and this system variable is ignored. If the applier metadata repository is stored as a file (deprecated), the replica synchronizes its relay-log.info file to disk (using fdatasync ( )) after this many transactions. 0 (zero) means that the file contents are flushed by the operating system only. Setting this variable takes effect for all replication channels immediately, including running channels.

Since storing applier metadata as a file is deprecated, this variable is also deprecated, and the server raises a warning whenever you set it or read its value. You should expect sync_relay_log_info to be removed in a future version of MySQL, and migrate applications now that may depend on it.
- sync_source_info

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - sync - source - info=\# \\
\hline System Variable & sync_source_info \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Replication and Binary Logging Options and Variables}
\begin{tabular}{|l|l|}
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 10000 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}
\end{table}
sync_source_info specifies the number of events after which the replica updates the connection metadata repository. When the connection metadata repository is stored as an InnoDB table (the default, it is updated after this number of events. If the connection metadata repository is stored as a file (deprecated), the replica synchronizes its master. info file to disk (using fdatasync ( )) after this number of events. The default value is 10000 , and a zero value means that the repository is never updated. Setting this variable takes effect for all replication channels immediately, including running channels.
- terminology_use_previous

\begin{tabular}{|l|l|}
\hline Command-Line Format & --terminology-use-previous=\# \\
\hline System Variable & terminology_use_previous \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & NONE \\
\hline Valid Values & \begin{tabular}{l}
NONE \\
BEFORE_8_0_26 \\
BEFORE_8_2_0
\end{tabular} \\
\hline
\end{tabular}

Incompatible changes were made in MySQL 8.0 to instrumentation names containing the terms master, slave, and mts (for "Multi-Threaded Slave"), which were changed respectively to source, replica, and mta (for "Multi-Threaded Applier"). If these incompatible changes impact your applications, set terminology_use_previous to BEFORE_8_0_26 to make the MySQL server use the old versions of the names for the objects specified in the previous list. This enables monitoring tools that rely on the old names to continue working until they can be updated to use the new names.

MySQL 8.4 normally displays REPLICA_SIDE_DISABLED rather than SLAVESIDE_DISABLED in the output of SHOW CREATE EVENT, SHOW EVENTS, and queries against the Information Schema EVENTS table. You can cause SLAVESIDE_DISABLED to be shown instead by setting terminology_use_previous to BEFORE_8_0_26 or BEFORE_8_2_0.

Set the terminology_use_previous system variable with session scope to support individual users, or with global scope to be the default for all new sessions. When global scope is used, the slow query log contains the old versions of the names.

The affected instrumentation names are given in the following list. The terminology_use_previous system variable only affects these items. It does not affect the new aliases for system variables, status variables, and command-line options that were also introduced in MySQL 8.0, and these can still be used when it is enabled.
- Instrumented locks (mutexes), visible in the mutex_instances and events_waits_* Performance Schema tables with the prefix wait/synch/mutex/
- Read/write locks, visible in the rwlock_instances and events_waits_* Performance Schema tables with the prefix wait/synch/rwlock/
- Instrumented condition variables, visible in the cond_instances and events_waits_* Performance Schema tables with the prefix wait/synch/cond/
- Instrumented memory allocations, visible in the memory_summary_* Performance Schema tables with the prefix memory/sql/
- Thread names, visible in the threads Performance Schema table with the prefix thread/sql/
- Thread stages, visible in the events_stages_* Performance Schema tables with the prefix stage/sql/, and without the prefix in the threads and processlist Performance Schema tables, the output from the SHOW PROCESSLIST statement, the Information Schema processlist table, and the slow query log
- Thread commands, visible in the events_statements_history* and events_statements_summary_*_by_event_name Performance Schema tables with the prefix statement/com/, and without the prefix in the threads and processlist Performance Schema tables, the output from the SHOW PROCESSLIST statement, the Information Schema processlist table, and the output from the SHOW REPLICA STATUS statement

\subsection*{19.1.6.4 Binary Logging Options and Variables}
- Startup Options Used with Binary Logging
- System Variables Used with Binary Logging

You can use the mysqld options and system variables that are described in this section to affect the operation of the binary log as well as to control which statements are written to the binary log. For additional information about the binary log, see Section 7.4.4, "The Binary Log". For additional information about using MySQL server options and system variables, see Section 7.1.7, "Server Command Options", and Section 7.1.8, "Server System Variables".

\section*{Startup Options Used with Binary Logging}

The following list describes startup options for enabling and configuring the binary log. System variables used with binary logging are discussed later in this section.
- --binlog-row-event-max-size=N

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
\hline Unit & bytes \\
\hline
\end{tabular}

When row-based binary logging is used, this setting is a soft limit on the maximum size of a rowbased binary log event, in bytes. Where possible, rows stored in the binary log are grouped into events with a size not exceeding the value of this setting. If an event cannot be split, the maximum
size can be exceeded. The value must be (or else gets rounded down to) a multiple of 256 . The default is 8192 bytes.
- --log-bin[=base_name]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-bin=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

Specifies the base name to use for binary log files. With binary logging enabled, the server logs all statements that change data to the binary log, which is used for backup and replication. The binary log is a sequence of files with a base name and numeric extension. The --log-bin option value is the base name for the log sequence. The server creates binary log files in sequence by adding a numeric suffix to the base name.

If you do not supply the --log-bin option, MySQL uses binlog as the default base name for the binary log files. For compatibility with earlier releases, if you supply the --log-bin option with no string or with an empty string, the base name defaults to host_name-bin, using the name of the host machine.

The default location for binary log files is the data directory. You can use the --log-bin option to specify an alternative location, by adding a leading absolute path name to the base name to specify a different directory. When the server reads an entry from the binary log index file, which tracks the binary log files that have been used, it checks whether the entry contains a relative path. If it does, the relative part of the path is replaced with the absolute path set using the --log-bin option. An absolute path recorded in the binary log index file remains unchanged; in such a case, the index file must be edited manually to enable a new path or paths to be used. The binary log file base name and any specified path are available as the log_bin_basename system variable.

In MySQL 8.4, binary logging is enabled by default, whether or not you specify the --log-bin option. The exception is if you use mysqld to initialize the data directory manually by invoking it with the --initialize or --initialize-insecure option, when binary logging is disabled by default. It is possible to enable binary logging in this case by specifying the --log-bin option. When binary logging is enabled, the log_bin system variable, which shows the status of binary logging on the server, is set to ON.

To disable binary logging, you can specify the --skip-log-bin or --disable-log-bin option at startup. If either of these options is specified and --log-bin is also specified, the option specified later takes precedence. When binary logging is disabled, the log_bin system variable is set to OFF.

When GTIDs are in use on the server, if you disable binary logging when restarting the server after an abnormal shutdown, some GTIDs are likely to be lost, causing replication to fail. In a normal shutdown, the set of GTIDs from the current binary log file is saved in the mysql.gtid_executed table. Following an abnormal shutdown where this did not happen, during recovery the GTIDs are added to the table from the binary log file, provided that binary logging is still enabled. If binary logging is disabled for the server restart, the server cannot access the binary log file to recover the GTIDs, so replication cannot be started. Binary logging can be disabled safely after a normal shutdown.

The --log-replica-updates and --replica-preserve-commit-order options require binary logging. If you disable binary logging, either omit these options, or specify --log-replicaupdates=0FF and --skip-replica-preserve-commit-order. MySQL disables these options by default when --skip-log-bin or--disable-log-bin is specified. If you specify--log-replica-updates or --replica-preserve-commit-order together with --skip-log-bin or --disable-log-bin, a warning or error message is issued.

The server can be started with the default server ID when binary logging is enabled, but an informational message is issued if you do not specify a server ID explicitly by setting the server_id
system variable. For servers that are used in a replication topology, you must specify a unique nonzero server ID for each server.

For information on the format and management of the binary log, see Section 7.4.4, "The Binary Log".
- --log-bin-index[=file_name]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-bin-index=file_name \\
\hline System Variable & log_bin_index \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline
\end{tabular}

The name for the binary log index file, which contains the names of the binary log files. By default, it has the same location and base name as the value specified for the binary log files using the - -log-bin option, plus the extension .index. If you do not specify --log-bin, the default binary log index file name is binlog. index. If you specify - - log-bin option with no string or an empty string, the default binary log index file name is host_name-bin.index, using the name of the host machine.

For information on the format and management of the binary log, see Section 7.4.4, "The Binary Log".

Statement selection options. The options in the following list affect which statements are written to the binary log, and thus sent by a replication source server to its replicas. There are also options for replicas that control which statements received from the source should be executed or ignored. For details, see Section 19.1.6.3, "Replica Server Options and Variables".
- --binlog-do-db=db_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - binlog - do - db=name \\
\hline Type & String \\
\hline
\end{tabular}

This option affects binary logging in a manner similar to the way that --replicate-do-db affects replication.

The effects of this option depend on whether the statement-based or row-based logging format is in use, in the same way that the effects of --replicate-do-db depend on whether statementbased or row-based replication is in use. You should keep in mind that the format used to log a given statement may not necessarily be the same as that indicated by the value of binlog_format. For example, DDL statements such as CREATE TABLE and ALTER TABLE are always logged as statements, without regard to the logging format in effect, so the following statement-based rules for --binlog-do-db always apply in determining whether or not the statement is logged.

Statement-based logging. Only those statements are written to the binary log where the default database (that is, the one selected by USE) is $d b \_$name. To specify more than one database, use this option multiple times, once for each database; however, doing so does not cause crossdatabase statements such as UPDATE some_db. some_table SET foo='bar' to be logged while a different database (or no database) is selected.

\section*{Warning}

To specify multiple databases you must use multiple instances of this option. Because database names can contain commas, the list is treated as the

An example of what does not work as you might expect when using statement-based logging: If the server is started with --binlog-do-db=sales and you issue the following statements, the UPDATE statement is not logged:

USE prices;
UPDATE sales.january SET amount=amount+1000;
The main reason for this "just check the default database" behavior is that it is difficult from the statement alone to know whether it should be replicated (for example, if you are using multiple-table DELETE statements or multiple-table UPDATE statements that act across multiple databases). It is also faster to check only the default database rather than all databases if there is no need.

Another case which may not be self-evident occurs when a given database is replicated even though it was not specified when setting the option. If the server is started with --binlog-do-db=sales, the following UPDATE statement is logged even though prices was not included when setting --binlog-do-db:

USE sales;
UPDATE prices.discounts SET percentage = percentage + 10;
Because sales is the default database when the UPDATE statement is issued, the UPDATE is logged.

Row-based logging. Logging is restricted to database $d b \_n$ ame. Only changes to tables belonging to $d b \_n a m e$ are logged; the default database has no effect on this. Suppose that the server is started with - - binlog-do-db=sales and row-based logging is in effect, and then the following statements are executed:

USE prices;
UPDATE sales.february SET amount=amount+100;
The changes to the february table in the sales database are logged in accordance with the UPDATE statement; this occurs whether or not the USE statement was issued. However, when using the row-based logging format and --binlog-do-db=sales, changes made by the following UPDATE are not logged:

USE prices;
UPDATE prices.march SET amount=amount-25;
Even if the USE prices statement were changed to USE sales, the UPDATE statement's effects would still not be written to the binary log.

Another important difference in --binlog-do-db handling for statement-based logging as opposed to the row-based logging occurs with regard to statements that refer to multiple databases. Suppose that the server is started with - - binlog-do-db=db1, and the following statements are executed:

USE db1;
UPDATE db1.table1, db2.table2 SET db1.table1.col1 = 10, db2.table2.col2 = 20;
If you are using statement-based logging, the updates to both tables are written to the binary log. However, when using the row-based format, only the changes to table1 are logged; table2 is in a different database, so it is not changed by the UPDATE. Now suppose that, instead of the USE db1 statement, a USE db4 statement had been used:

USE db4;
UPDATE db1.table1, db2.table2 SET db1.table1.col1 = 10, db2.table2.col2 = 20;
In this case, the UPDATE statement is not written to the binary log when using statement-based logging. However, when using row-based logging, the change to table1 is logged, but not that to table2-in other words, only changes to tables in the database named by --binlog-do-db are logged, and the choice of default database has no effect on this behavior.
- --binlog-ignore-db=db_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - binlog-ignore-db=name \\
\hline Type & String \\
\hline
\end{tabular}

This option affects binary logging in a manner similar to the way that--replicate-ignore-db affects replication.

The effects of this option depend on whether the statement-based or row-based logging format is in use, in the same way that the effects of --replicate-ignore-db depend on whether statementbased or row-based replication is in use. You should keep in mind that the format used to log a given statement may not necessarily be the same as that indicated by the value of binlog_format. For example, DDL statements such as CREATE TABLE and ALTER TABLE are always logged as statements, without regard to the logging format in effect, so the following statement-based rules for --binlog-ignore-db always apply in determining whether or not the statement is logged.

Statement-based logging. Tells the server to not log any statement where the default database (that is, the one selected by USE) is db_name.

When there is no default database, no--binlog-ignore-db options are applied, and such statements are always logged. (Bug \#11829838, Bug \#60188)

Row-based format. Tells the server not to log updates to any tables in the database $d b \_n a m e$. The current database has no effect.

When using statement-based logging, the following example does not work as you might expect. Suppose that the server is started with--binlog-ignore-db=sales and you issue the following statements:

USE prices;
UPDATE sales.january SET amount=amount+1000;
The UPDATE statement is logged in such a case because --binlog-ignore-db applies only to the default database (determined by the USE statement). Because the sales database was specified explicitly in the statement, the statement has not been filtered. However, when using rowbased logging, the UPDATE statement's effects are not written to the binary log, which means that no changes to the sales.january table are logged; in this instance, --binlog-ignore-db=sales causes all changes made to tables in the source's copy of the sales database to be ignored for purposes of binary logging.

To specify more than one database to ignore, use this option multiple times, once for each database. Because database names can contain commas, the list is treated as the name of a single database if you supply a comma-separated list.

You should not use this option if you are using cross-database updates and you do not want these updates to be logged.

Checksum options. MySQL supports reading and writing of binary log checksums. These are enabled using the two options listed here:
- --binlog-checksum=\{NONE|CRC32\}

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --binlog-checksum=type & \\
\hline Type & String & \\
\hline Default Value & CRC32 & \\
\hline Valid Values & NONE & \\
\hline & CRC32 & \\
\hline & & 3443 \\
\hline
\end{tabular}

Enabling this option causes the source to write checksums for events written to the binary log. Set to NONE to disable, or the name of the algorithm to be used for generating checksums; currently, only CRC32 checksums are supported, and CRC32 is the default. You cannot change the setting for this option within a transaction.

To control reading of checksums by the replica (from the relay log), use the - -replica-sql-verify-checksum option.

Testing and debugging options. The following binary log options are used in replication testing and debugging. They are not intended for use in normal operations.
- --max-binlog-dump-events= $N$

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - max-binlog-dump-events=\# \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline
\end{tabular}

This option is used internally by the MySQL test suite for replication testing and debugging.
- --sporadic-binlog-dump-fail

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--sporadic-binlog-dump-fail $[=\{$ OFF $\mid$ \\
ON $\}]$
\end{tabular} \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

This option is used internally by the MySQL test suite for replication testing and debugging.

