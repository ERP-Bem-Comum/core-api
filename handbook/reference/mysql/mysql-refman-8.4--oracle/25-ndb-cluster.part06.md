\section*{Note \\ On Windows, you can also use SC STOP and SC START commands, NET STOP and NET START commands, or the Windows Service Manager to stop and start nodes which have been installed as Windows services (see Section 25.3.2.4, "Installing NDB Cluster Processes as Windows Services").}

The type of restart required is indicated in the documentation for each node configuration parameter. See Section 25.4.3, "NDB Cluster Configuration Files".
3. Stop, reconfigure, then restart each cluster SQL node (mysqld process) in turn.

NDB Cluster supports a somewhat flexible order for upgrading nodes. When upgrading an NDB Cluster, you may upgrade API nodes (including SQL nodes) before upgrading the management nodes, data nodes, or both. In other words, you are permitted to upgrade the API and SQL nodes in any order. This is subject to the following provisions:
- This functionality is intended for use as part of an online upgrade only. A mix of node binaries from different NDB Cluster releases is neither intended nor supported for continuous, long-term use in a production setting.
- You must upgrade all nodes of the same type (management, data, or API node) before upgrading any nodes of a different type. This remains true regardless of the order in which the nodes are upgraded.
- You must upgrade all management nodes before upgrading any data nodes. This remains true regardless of the order in which you upgrade the cluster's API and SQL nodes.
- Features specific to the "new" version must not be used until all management nodes and data nodes have been upgraded.

This also applies to any MySQL Server version change that may apply, in addition to the NDB engine version change, so do not forget to take this into account when planning the upgrade. (This is true for online upgrades of NDB Cluster in general.)

It is not possible for any API node to perform schema operations (such as data definition statements) during a node restart. Due in part to this limitation, schema operations are also not supported during an online upgrade or downgrade. In addition, it is not possible to perform native backups while an upgrade or downgrade is ongoing.

Rolling restarts with multiple management servers. When performing a rolling restart of an NDB Cluster with multiple management nodes, you should keep in mind that ndb_mgmd checks to see if any other management node is running, and, if so, tries to use that node's configuration data. To keep this from occurring, and to force ndb_mgmd to re-read its configuration file, perform the following steps:
1. Stop all NDB Cluster ndb_mgmd processes.
2. Update all config.ini files.
3. Start a single ndb_mgmd with --reload, --initial, or both options as desired.
4. If you started the first ndb_mgmd with the --initial option, you must also start any remaining ndb_mgmd processes using --initial.

Regardless of any other options used when starting the first ndb_mgmd, you should not start any remaining ndb_mgmd processes after the first one using --reload.
5. Complete the rolling restarts of the data nodes and API nodes as normal.

When performing a rolling restart to update the cluster's configuration, you can use the config_generation column of the ndbinfo. nodes table to keep track of which data nodes have been successfully restarted with the new configuration. See Section 25.6.15.48, "The ndbinfo nodes Table".

\subsection*{25.6.6 NDB Cluster Single User Mode}

Single user mode enables the database administrator to restrict access to the database system to a single API node, such as a MySQL server (SQL node) or an instance of ndb_restore. When entering single user mode, connections to all other API nodes are closed gracefully and all running transactions are aborted. No new transactions are permitted to start.

Once the cluster has entered single user mode, only the designated API node is granted access to the database.

You can use the ALL STATUS command in the ndb_mgm client to see when the cluster has entered single user mode. You can also check the status column of the ndbinfo. nodes table (see Section 25.6.15.48, "The ndbinfo nodes Table", for more information).

Example:
ndb_mgm> ENTER SINGLE USER MODE 5
After this command has executed and the cluster has entered single user mode, the API node whose node ID is 5 becomes the cluster's only permitted user.

The node specified in the preceding command must be an API node; attempting to specify any other type of node is rejected.

\section*{Note}

When the preceding command is invoked, all transactions running on the designated node are aborted, the connection is closed, and the server must be restarted.

The command EXIT SINGLE USER MODE changes the state of the cluster's data nodes from single user mode to normal mode. API nodes-such as MySQL Servers-waiting for a connection (that is,
waiting for the cluster to become ready and available), are again permitted to connect. The API node denoted as the single-user node continues to run (if still connected) during and after the state change.

Example:
ndb_mgm> EXIT SINGLE USER MODE

There are two recommended ways to handle a node failure when running in single user mode:
- Method 1:
1. Finish all single user mode transactions
2. Issue the EXIT SINGLE USER MODE command
3. Restart the cluster's data nodes
- Method 2:

Restart storage nodes prior to entering single user mode.

\subsection*{25.6.7 Adding NDB Cluster Data Nodes Online}

This section describes how to add NDB Cluster data nodes "online"-that is, without needing to shut down the cluster completely and restart it as part of the process.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4341.jpg?height=122&width=113&top_left_y=1288&top_left_x=360)

\section*{Important}

Currently, you must add new data nodes to an NDB Cluster as part of a new node group. In addition, it is not possible to change the number of fragment replicas (or the number of nodes per node group) online.

\subsection*{25.6.7.1 Adding NDB Cluster Data Nodes Online: General Issues}

This section provides general information about the behavior of and current limitations in adding NDB Cluster nodes online.

Redistribution of Data. The ability to add new nodes online includes a means to reorganize NDBCLUSTER table data and indexes so that they are distributed across all data nodes, including the new ones, by means of the ALTER TABLE ... REORGANIZE PARTITION statement. Table reorganization of both in-memory and Disk Data tables is supported. This redistribution does not currently include unique indexes (only ordered indexes are redistributed).

The redistribution for NDBCLUSTER tables already existing before the new data nodes were added is not automatic, but can be accomplished using simple SQL statements in mysql or another MySQL client application. However, all data and indexes added to tables created after a new node group has been added are distributed automatically among all cluster data nodes, including those added as part of the new node group.

Partial starts. It is possible to add a new node group without all of the new data nodes being started. It is also possible to add a new node group to a degraded cluster-that is, a cluster that is only partially started, or where one or more data nodes are not running. In the latter case, the cluster must have enough nodes running to be viable before the new node group can be added.

Effects on ongoing operations. Normal DML operations using NDB Cluster data are not prevented by the creation or addition of a new node group, or by table reorganization. However, it is not possible to perform DDL concurrently with table reorganization-that is, no other DDL statements can be issued while an ALTER TABLE ... REORGANIZE PARTITION statement is executing. In addition, during the execution of ALTER TABLE . . . REORGANIZE PARTITION (or the execution of any other DDL statement), it is not possible to restart cluster data nodes.

Failure handling. Failures of data nodes during node group creation and table reorganization are handled as shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.38 Data node failure handling during node group creation and table reorganization}
\begin{tabular}{|l|l|l|l|}
\hline Failure during & Failure in "Old" data node & Failure in "New" data node & System Failure \\
\hline Node group creation & \begin{tabular}{l}
- If a node other than the master fails: \\
The creation of the node group is always rolled forward. \\
- If the master fails: \\
- If the internal commit point has been reached: \\
The creation of the node group is rolled forward. \\
- If the internal commit point has not yet been reached. The creation of the node group is rolled back
\end{tabular} & \begin{tabular}{l}
- If a node other than the master fails: \\
The creation of the node group is always rolled forward. \\
- If the master fails: \\
- If the internal commit point has been reached: \\
The creation of the node group is rolled forward. \\
- If the internal commit point has not yet been reached. The creation of the node group is rolled back
\end{tabular} & \begin{tabular}{l}
- If the execution of CREATE NODEGROUP has reached the internal commit point: \\
When restarted, the cluster includes the new node group. Otherwise it without. \\
- If the execution of CREATE NODEGROUP has not yet reached the internal commit point: When restarted, the cluster does not include the new node group.
\end{tabular} \\
\hline Table reorganization & \begin{tabular}{l}
- If a node other than the master fails: The table reorganization is always rolled forward. \\
- If the master fails: \\
- If the internal commit point has been reached: The table reorganization is rolled forward. \\
- If the internal commit point has not yet been reached. The table reorganization is rolled back.
\end{tabular} & \begin{tabular}{l}
- If a node other than the master fails: The table reorganization is always rolled forward. \\
- If the master fails: \\
- If the internal commit point has been reached: The table reorganization is rolled forward. \\
- If the internal commit point has not yet been reached. The table reorganization is rolled back.
\end{tabular} & \begin{tabular}{l}
- If the execution of an ALTER TABLE ... REORGANIZE PARTITION statement has reached the internal commit point: \\
When the cluster is restarted, the data and indexes belonging to table are distributed using the "new" data nodes. \\
- If the execution of an ALTER TABLE ... REORGANIZE PARTITION statement has not yet reached the internal commit point: When the cluster is restarted, the data and indexes belonging to table are distributed using only the "old" data nodes.
\end{tabular} \\
\hline
\end{tabular}
\end{table}

Dropping node groups. The ndb_mgm client supports a DROP NODEGROUP command, but it is possible to drop a node group only when no data nodes in the node group contain any data. Since
there is currently no way to "empty" a specific data node or node group, this command works only the following two cases:
1. After issuing CREATE NODEGROUP in the ndb_mgm client, but before issuing any ALTER TABLE ... REORGANIZE PARTITION statements in the mysql client.
2. After dropping all NDBCLUSTER tables using DROP TABLE.

TRUNCATE TABLE does not work for this purpose because the data nodes continue to store the table definitions.

\subsection*{25.6.7.2 Adding NDB Cluster Data Nodes Online: Basic procedure}

In this section, we list the basic steps required to add new data nodes to an NDB Cluster. This procedure applies whether you are using ndbd or ndbmtd binaries for the data node processes. For a more detailed example, see Section 25.6.7.3, "Adding NDB Cluster Data Nodes Online: Detailed Example".

Assuming that you already have a running NDB Cluster, adding data nodes online requires the following steps:
1. Edit the cluster configuration config.ini file, adding new [ndbd] sections corresponding to the nodes to be added. In the case where the cluster uses multiple management servers, these changes need to be made to all config.ini files used by the management servers.

You must be careful that node IDs for any new data nodes added in the config. ini file do not overlap node IDs used by existing nodes. In the event that you have API nodes using dynamically allocated node IDs and these IDs match node IDs that you want to use for new data nodes, it is possible to force any such API nodes to "migrate", as described later in this procedure.
2. Perform a rolling restart of all NDB Cluster management servers.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4343.jpg?height=101&width=106&top_left_y=1473&top_left_x=420)

\section*{Important}

All management servers must be restarted with the --reload or -initial option to force the reading of the new configuration.
3. Perform a rolling restart of all existing NDB Cluster data nodes. It is not necessary (or usually even desirable) to use --initial when restarting the existing data nodes.

If you are using API nodes with dynamically allocated IDs matching any node IDs that you wish to assign to new data nodes, you must restart all API nodes (including SQL nodes) before restarting any of the data nodes processes in this step. This causes any API nodes with node IDs that were previously not explicitly assigned to relinquish those node IDs and acquire new ones.
4. Perform a rolling restart of any SQL or API nodes connected to the NDB Cluster.
5. Start the new data nodes.

The new data nodes may be started in any order. They can also be started concurrently, as long as they are started after the rolling restarts of all existing data nodes have been completed, and before proceeding to the next step.
6. Execute one or more CREATE NODEGROUP commands in the NDB Cluster management client to create the new node group or node groups to which the new data nodes belong.
7. Redistribute the cluster's data among all data nodes, including the new ones. Normally this is done by issuing an ALTER TABLE ... ALGORITHM=INPLACE, REORGANIZE PARTITION statement in the mysql client for each NDBCLUSTER table.

Exception: For tables created using the MAX_ROWS option, this statement does not work; instead, use ALTER TABLE ... ALGORITHM=INPLACE MAX_ROWS=... to reorganize such tables. You should also bear in mind that using MAX_ROWS to set the number of partitions in this fashion is
deprecated, and you should use PARTITION_BALANCE instead; see Section 15.1.20.12, "Setting NDB Comment Options", for more information.

\section*{Note}

This needs to be done only for tables already existing at the time the new node group is added. Data in tables created after the new node group is added is distributed automatically; however, data added to any given table tbl that existed before the new nodes were added is not distributed using the new nodes until that table has been reorganized.
8. ALTER TABLE ... REORGANIZE PARTITION ALGORITHM=INPLACE reorganizes partitions but does not reclaim the space freed on the "old" nodes. You can do this by issuing, for each NDBCLUSTER table, an OPTIMIZE TABLE statement in the mysql client.

This works for space used by variable-width columns of in-memory NDB tables. OPTIMIZE TABLE is not supported for fixed-width columns of in-memory tables; it is also not supported for Disk Data tables.

You can add all the nodes desired, then issue several CREATE NODEGROUP commands in succession to add the new node groups to the cluster.

\subsection*{25.6.7.3 Adding NDB Cluster Data Nodes Online: Detailed Example}

In this section we provide a detailed example illustrating how to add new NDB Cluster data nodes online, starting with an NDB Cluster having 2 data nodes in a single node group and concluding with a cluster having 4 data nodes in 2 node groups.

Starting configuration. For purposes of illustration, we assume a minimal configuration, and that the cluster uses a config. ini file containing only the following information:
```
[ndbd default]
DataMemory = 100M
IndexMemory = 100M
NoOfReplicas = 2
DataDir = /usr/local/mysql/var/mysql-cluster
[ndbd]
Id = 1
HostName = 198.51.100.1
[ndbd]
Id = 2
HostName = 198.51.100.2
[mgm]
HostName = 198.51.100.10
Id = 10
[api]
Id=20
HostName = 198.51.100.20
[api]
Id=21
HostName = 198.51.100.21
```


\section*{Note}

We have left a gap in the sequence between data node IDs and other nodes. This make it easier later to assign node IDs that are not already in use to data nodes which are newly added.

We also assume that you have already started the cluster using the appropriate command line or my.cnf options, and that running SHOW in the management client produces output similar to what is shown here:
```
-- NDB Cluster -- Management Client --
ndb_mgm> SHOW
Connected to Management Server at: 198.51.100.10:1186 (using cleartext)
Cluster Configuration
[ndbd(NDB)] 2 node(s)
id=1 @198.51.100.1 (8.4.7-ndb-8.4.7, Nodegroup: 0, *)
id=2 @198.51.100.2 (8.4.7-ndb-8.4.7, Nodegroup: 0)
[ndb_mgmd(MGM)] 1 node(s)
id=10 @198.51.100.10 (8.4.7-ndb-8.4.7)
[mysqld(API)] 2 node(s)
id=20 @198.51.100.20 (8.4.7-ndb-8.4.7)
id=21 @198.51.100.21 (8.4.7-ndb-8.4.7)
```


Finally, we assume that the cluster contains a single NDBCLUSTER table created as shown here:
```
USE n;
CREATE TABLE ips (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    country_code CHAR(2) NOT NULL,
    type CHAR(4) NOT NULL,
    ip_address VARCHAR(15) NOT NULL,
    addresses BIGINT UNSIGNED DEFAULT NULL,
    date BIGINT UNSIGNED DEFAULT NULL
) ENGINE NDBCLUSTER;
```


The memory usage and related information shown later in this section was generated after inserting approximately 50000 rows into this table.

\section*{Note}

In this example, we show the single-threaded ndbd being used for the data node processes. You can also apply this example, if you are using the multithreaded ndbmtd by substituting ndbmtd for ndbd wherever it appears in the steps that follow.

Step 1: Update configuration file. Open the cluster global configuration file in a text editor and add [ndbd] sections corresponding to the 2 new data nodes. (We give these data nodes IDs 3 and 4, and assume that they are to be run on host machines at addresses 198.51.100.3 and 198.51.100.4, respectively.) After you have added the new sections, the contents of the config. ini file should look like what is shown here, where the additions to the file are shown in bold type:
```
[ndbd default]
DataMemory = 100M
IndexMemory = 100M
NoOfReplicas = 2
DataDir = /usr/local/mysql/var/mysql-cluster
[ndbd]
Id = 1
HostName = 198.51.100.1
[ndbd]
Id = 2
HostName = 198.51.100.2
[ndbd]
Id = 3
HostName = 198.51.100.3
[ndbd]
Id = 4
HostName = 198.51.100.4
[mgm]
HostName = 198.51.100.10
```

```
Id = 10
[api]
Id=20
HostName = 198.51.100.20
[api]
Id=21
HostName = 198.51.100.21
```


Once you have made the necessary changes, save the file.
Step 2: Restart the management server. Restarting the cluster management server requires that you issue separate commands to stop the management server and then to start it again, as follows:
1. Stop the management server using the management client STOP command, as shown here:
```
ndb_mgm> 10 STOP
Node 10 has shut down.
Disconnecting to allow Management Server to shutdown
$>
```

2. Because shutting down the management server causes the management client to terminate, you must start the management server from the system shell. For simplicity, we assume that config.ini is in the same directory as the management server binary, but in practice, you must supply the correct path to the configuration file. You must also supply the --reload or --initial option so that the management server reads the new configuration from the file rather than its configuration cache. If your shell's current directory is also the same as the directory where the management server binary is located, then you can invoke the management server as shown here:
```
$> ndb_mgmd -f config.ini --reload
2008-12-08 17:29:23 [MgmSrvr] INFO -- NDB Cluster Management Server. 8.4.7-ndb-8.4.7
2008-12-08 17:29:23 [MgmSrvr] INFO -- Reading cluster configuration from 'config.ini'
```


If you check the output of SHOW in the management client after restarting the ndb_mgm process, you should now see something like this:
```
-- NDB Cluster -- Management Client --
ndb_mgm> SHOW
Connected to Management Server at: 198.51.100.10:1186 (using cleartext)
Cluster Configuration
[ndbd(NDB)] 2 node(s)
id=1 @198.51.100.1 (8.4.7-ndb-8.4.7, Nodegroup: 0, *)
id=2 @198.51.100.2 (8.4.7-ndb-8.4.7, Nodegroup: 0)
id=3 (not connected, accepting connect from 198.51.100.3)
id=4 (not connected, accepting connect from 198.51.100.4)
[ndb_mgmd(MGM)] 1 node(s)
id=10 @198.51.100.10 (8.4.7-ndb-8.4.7)
[mysqld(API)] 2 node(s)
id=20 @198.51.100.20 (8.4.7-ndb-8.4.7)
id=21 @198.51.100.21 (8.4.7-ndb-8.4.7)
```


Step 3: Perform a rolling restart of the existing data nodes. This step can be accomplished entirely within the cluster management client using the RESTART command, as shown here:
```
ndb_mgm> 1 RESTART
Node 1: Node shutdown initiated
Node 1: Node shutdown completed, restarting, no start.
Node 1 is being restarted
ndb_mgm> Node 1: Start initiated (version 8.4.7)
Node 1: Started (version 8.4.7)
ndb_mgm> 2 RESTART
Node 2: Node shutdown initiated
```

```
Node 2: Node shutdown completed, restarting, no start.
Node 2 is being restarted
ndb_mgm> Node 2: Start initiated (version 8.4.7)
ndb_mgm> Node 2: Started (version 8.4.7)
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4347.jpg?height=170&width=276&top_left_y=477&top_left_x=360)

\section*{Important}

After issuing each $X$ RESTART command, wait until the management client reports Node $X$ : Started (version ...) before proceeding any further.

You can verify that all existing data nodes were restarted using the updated configuration by checking the ndbinfo. nodes table in the mysql client.

Step 4: Perform a rolling restart of all cluster API nodes. Shut down and restart each MySQL server acting as an SQL node in the cluster using mysqladmin shutdown followed by mysqld_safe (or another startup script). This should be similar to what is shown here, where password is the MySQL root password for a given MySQL server instance:
```
$> mysqladmin -uroot -ppassword shutdown
081208 20:19:56 mysqld_safe mysqld from pid file
/usr/local/mysql/var/tonfisk.pid ended
$> mysqld_safe --ndbcluster --ndb-connectstring=198.51.100.10 &
081208 20:20:06 mysqld_safe Logging to '/usr/local/mysql/var/tonfisk.err'.
081208 20:20:06 mysqld_safe Starting mysqld daemon with databases
from /usr/local/mysql/var
```


Of course, the exact input and output depend on how and where MySQL is installed on the system, as well as which options you choose to start it (and whether or not some or all of these options are specified in a my. cnf file).

Step 5: Perform an initial start of the new data nodes. From a system shell on each of the hosts for the new data nodes, start the data nodes as shown here, using the --initial option:
```
$> ndbd -c 198.51.100.10 --initial
```


\section*{Note}

Unlike the case with restarting the existing data nodes, you can start the new data nodes concurrently; you do not need to wait for one to finish starting before starting the other.

Wait until both of the new data nodes have started before proceeding with the next step. Once the new data nodes have started, you can see in the output of the management client SHOW command that they do not yet belong to any node group (as indicated with bold type here):
```
ndb_mgm> SHOW
Connected to Management Server at: 198.51.100.10:1186 (using cleartext)
Cluster Configuration
-----------------------
[ndbd(NDB)] 2 node(s)
id=1 @198.51.100.1 (8.4.7-ndb-8.4.7, Nodegroup: 0, *)
id=2 @198.51.100.2 (8.4.7-ndb-8.4.7, Nodegroup: 0)
id=3 @198.51.100.3 (8.4.7-ndb-8.4.7, no nodegroup)
id=4 @198.51.100.4 (8.4.7-ndb-8.4.7, no nodegroup)
[ndb_mgmd(MGM)] 1 node(s)
id=10 @198.51.100.10 (8.4.7-ndb-8.4.7)
[mysqld(API)] 2 node(s)
id=20 @198.51.100.20 (8.4.7-ndb-8.4.7)
id=21 @198.51.100.21 (8.4.7-ndb-8.4.7)
```


Step 6: Create a new node group. You can do this by issuing a CREATE NODEGROUP command in the cluster management client. This command takes as its argument a comma-separated list of the node IDs of the data nodes to be included in the new node group, as shown here:
```
ndb_mgm> CREATE NODEGROUP 3,4
Nodegroup 1 created
```


By issuing SHOW again, you can verify that data nodes 3 and 4 have joined the new node group (again indicated in bold type):
```
ndb_mgm> SHOW
Connected to Management Server at: 198.51.100.10:1186 (using cleartext)
Cluster Configuration
[ndbd(NDB)] 2 node(s)
id=1 @198.51.100.1 (8.4.7-ndb-8.4.7, Nodegroup: 0, *)
id=2 @198.51.100.2 (8.4.7-ndb-8.4.7, Nodegroup: 0)
id=3 @198.51.100.3 (8.4.7-ndb-8.4.7, Nodegroup: 1)
id=4 @198.51.100.4 (8.4.7-ndb-8.4.7, Nodegroup: 1)
[ndb_mgmd(MGM)] 1 node(s)
id=10 @198.51.100.10 (8.4.7-ndb-8.4.7)
[mysqld(API)] 2 node(s)
id=20 @198.51.100.20 (8.4.7-ndb-8.4.7)
id=21 @198.51.100.21 (8.4.7-ndb-8.4.7)
```


Step 7: Redistribute cluster data. When a node group is created, existing data and indexes are not automatically distributed to the new node group's data nodes, as you can see by issuing the appropriate REPORT command in the management client:
```
ndb_mgm> ALL REPORT MEMORY
Node 1: Data usage is 5%(177 32K pages of total 3200)
Node 1: Index usage is 0%(108 8K pages of total 12832)
Node 2: Data usage is 5%(177 32K pages of total 3200)
Node 2: Index usage is 0%(108 8K pages of total 12832)
Node 3: Data usage is 0%(0 32K pages of total 3200)
Node 3: Index usage is 0%(0 8K pages of total 12832)
Node 4: Data usage is 0%(0 32K pages of total 3200)
Node 4: Index usage is 0%(0 8K pages of total 12832)
```


By using ndb_desc with the -p option, which causes the output to include partitioning information, you can see that the table still uses only 2 partitions (in the Per partition info section of the output, shown here in bold text):
```
$> ndb_desc -c 198.51.100.10 -d n ips -p
-- ips --
Version: 1
Fragment type: 9
K Value: 6
Min load factor: 78
Max load factor: 80
Temporary table: no
Number of attributes: 6
Number of primary keys: 1
Length of frm data: 340
Row Checksum: 1
Row GCI: 1
SingleUserMode: 0
ForceVarPart: 1
FragmentCount: 2
TableStatus: Retrieved
-- Attributes --
id Bigint PRIMARY KEY DISTRIBUTION KEY AT=FIXED ST=MEMORY AUTO_INCR
country_code Char(2;latin1_swedish_ci) NOT NULL AT=FIXED ST=MEMORY
type Char(4;latin1_swedish_ci) NOT NULL AT=FIXED ST=MEMORY
ip_address Varchar(15;latin1_swedish_ci) NOT NULL AT=SHORT_VAR ST=MEMORY
addresses Bigunsigned NULL AT=FIXED ST=MEMORY
date Bigunsigned NULL AT=FIXED ST=MEMORY
-- Indexes --
PRIMARY KEY(id) - UniqueHashIndex
PRIMARY(id) - OrderedIndex
```

```
-- Per partition info --

\begin{tabular}{lllll} 
Partition & Row count & Commit count & Frag fixed memory & Frag varsized memory \\
0 & 26086 & 26086 & 1572864 & 557056 \\
1 & 26329 & 26329 & 1605632 & 557056
\end{tabular}
```


You can cause the data to be redistributed among all of the data nodes by performing, for each NDB table, an ALTER TABLE ... ALGORITHM=INPLACE, REORGANIZE PARTITION statement in the mysql client.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4349.jpg?height=122&width=109&top_left_y=616&top_left_x=360)

\section*{Important}

ALTER TABLE ... ALGORITHM=INPLACE, REORGANIZE PARTITION does not work on tables that were created with the MAX_ROWS option. Instead, use ALTER TABLE ... ALGORITHM=INPLACE, MAX_ROWS=... to reorganize such tables.

Keep in mind that using MAX_ROWS to set the number of partitions per table is deprecated, and you should use PARTITION_BALANCE instead; see Section 15.1.20.12, "Setting NDB Comment Options", for more information.

After issuing the statement ALTER TABLE ips ALGORITHM=INPLACE, REORGANIZE PARTITION, you can see using ndb_desc that the data for this table is now stored using 4 partitions, as shown here (with the relevant portions of the output in bold type):
```
$> ndb_desc -c 198.51.100.10 -d n ips -p
-- ips --
Version: 16777217
Fragment type: 9
K Value: 6
Min load factor: 78
Max load factor: 80
Temporary table: no
Number of attributes: 6
Number of primary keys: 1
Length of frm data: 341
Row Checksum: 1
Row GCI: 1
SingleUserMode: 0
ForceVarPart: 1
FragmentCount: 4
TableStatus: Retrieved
-- Attributes --
id Bigint PRIMARY KEY DISTRIBUTION KEY AT=FIXED ST=MEMORY AUTO_INCR
country_code Char(2;latin1_swedish_ci) NOT NULL AT=FIXED ST=MEMORY
type Char(4;latin1_swedish_ci) NOT NULL AT=FIXED ST=MEMORY
ip_address Varchar(15;latin1_swedish_ci) NOT NULL AT=SHORT_VAR ST=MEMORY
addresses Bigunsigned NULL AT=FIXED ST=MEMORY
date Bigunsigned NULL AT=FIXED ST=MEMORY
-- Indexes --
PRIMARY KEY(id) - UniqueHashIndex
PRIMARY(id) - OrderedIndex
-- Per partition info --

\begin{tabular}{lllll} 
Partition & Row count & Commit count & Frag fixed memory & Frag varsized memory \\
0 & 12981 & 52296 & 1572864 & 557056 \\
1 & 13236 & 52515 & 1605632 & 557056 \\
2 & 13105 & 13105 & 819200 & 294912 \\
3 & 13093 & 13093 & 819200 & 294912
\end{tabular}
```


\section*{Note}

Normally, ALTER TABLE table_name [ALGORITHM=INPLACE,] REORGANIZE PARTITION is used with a list of partition identifiers and a set of partition definitions to create a new partitioning scheme for a table that has already been explicitly partitioned. Its use here to redistribute data onto a new

> NDB Cluster node group is an exception in this regard; when used in this way, no other keywords or identifiers follow REORGANIZE PARTITION.

> For more information, see Section 15.1.9, "ALTER TABLE Statement".

In addition, for each table, the ALTER TABLE statement should be followed by an OPTIMIZE TABLE to reclaim wasted space. You can obtain a list of all NDBCLUSTER tables using the following query against the Information Schema TABLES table:
```
SELECT TABLE_SCHEMA, TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE ENGINE = 'NDBCLUSTER';
```


\section*{Note}

The INFORMATION_SCHEMA.TABLES.ENGINE value for an NDB Cluster table is always NDBCLUSTER, regardless of whether the CREATE TABLE statement used to create the table (or ALTER TABLE statement used to convert an existing table from a different storage engine) used NDB or NDBCLUSTER in its ENGINE option.

You can see after performing these statements in the output of ALL REPORT MEMORY that the data and indexes are now redistributed between all cluster data nodes, as shown here:
```
ndb_mgm> ALL REPORT MEMORY
Node 1: Data usage is 5%(176 32K pages of total 3200)
Node 1: Index usage is 0%(76 8K pages of total 12832)
Node 2: Data usage is 5%(176 32K pages of total 3200)
Node 2: Index usage is 0%(76 8K pages of total 12832)
Node 3: Data usage is 2%(80 32K pages of total 3200)
Node 3: Index usage is 0%(51 8K pages of total 12832)
Node 4: Data usage is 2%(80 32K pages of total 3200)
Node 4: Index usage is 0%(50 8K pages of total 12832)
```


\section*{Note}

Since only one DDL operation on NDBCLUSTER tables can be executed at a time, you must wait for each ALTER TABLE ... REORGANIZE PARTITION statement to finish before issuing the next one.

It is not necessary to issue ALTER TABLE ... REORGANIZE PARTITION statements for NDBCLUSTER tables created after the new data nodes have been added; data added to such tables is distributed among all data nodes automatically. However, in NDBCLUSTER tables that existed prior to the addition of the new nodes, neither existing nor new data is distributed using the new nodes until these tables have been reorganized using ALTER TABLE ... REORGANIZE PARTITION.

Alternative procedure, without rolling restart. It is possible to avoid the need for a rolling restart by configuring the extra data nodes, but not starting them, when first starting the cluster. We assume, as before, that you wish to start with two data nodes-nodes 1 and 2-in one node group and later to expand the cluster to four data nodes, by adding a second node group consisting of nodes 3 and 4:
```
[ndbd default]
DataMemory = 100M
IndexMemory = 100M
NoOfReplicas = 2
DataDir = /usr/local/mysql/var/mysql-cluster
[ndbd]
Id = 1
HostName = 198.51.100.1
[ndbd]
Id = 2
HostName = 198.51.100.2
```

```
[ndbd]
Id = 3
HostName = 198.51.100.3
Nodegroup = 65536
[ndbd]
Id = 4
HostName = 198.51.100.4
Nodegroup = 65536
[mgm]
HostName = 198.51.100.10
Id = 10
[api]
Id=20
HostName = 198.51.100.20
[api]
Id=21
HostName = 198.51.100.21
```


The data nodes to be brought online at a later time (nodes 3 and 4) can be configured with NodeGroup = 65536, in which case nodes 1 and 2 can each be started as shown here:
```
$> ndbd -c 198.51.100.10 --initial
```


The data nodes configured with NodeGroup $=65536$ are treated by the management server as though you had started nodes 1 and 2 using - - nowait-nodes=3, 4 after waiting for a period of time determined by the setting for the StartNoNodeGroupTimeout data node configuration parameter. By default, this is 15 seconds ( 15000 milliseconds).

\section*{Note}

StartNoNodegroupTimeout must be the same for all data nodes in the cluster; for this reason, you should always set it in the [ndbd default] section of the config. ini file, rather than for individual data nodes.

When you are ready to add the second node group, you need only perform the following additional steps:
1. Start data nodes 3 and 4 , invoking the data node process once for each new node:
```
$> ndbd -c 198.51.100.10 --initial
```

2. Issue the appropriate CREATE NODEGROUP command in the management client:
```
ndb_mgm> CREATE NODEGROUP 3,4
```

3. In the mysql client, issue ALTER TABLE ... REORGANIZE PARTITION and OPTIMIZE TABLE statements for each existing NDBCLUSTER table. (As noted elsewhere in this section, existing NDB Cluster tables cannot use the new nodes for data distribution until this has been done.)

\subsection*{25.6.8 Online Backup of NDB Cluster}

The next few sections describe how to prepare for and then to create an NDB Cluster backup using the functionality for this purpose found in the ndb_mgm management client. To distinguish this type of backup from a backup made using mysqldump, we sometimes refer to it as a "native" NDB Cluster backup. (For information about the creation of backups with mysqldump, see Section 6.5.4, "mysqldump - A Database Backup Program".) Restoration of NDB Cluster backups is done using the ndb_restore utility provided with the NDB Cluster distribution; for information about ndb_restore and its use in restoring NDB Cluster backups, see Section 25.5.23, "ndb_restore - Restore an NDB Cluster Backup".

It is also possible to create backups using multiple LDMs to achieve parallelism on the data nodes. See Section 25.6.8.5, "Taking an NDB Backup with Parallel Data Nodes".

\subsection*{25.6.8.1 NDB Cluster Backup Concepts}

A backup is a snapshot of the database at a given time. The backup consists of three main parts:
- Metadata. The names and definitions of all database tables
- Table records. The data actually stored in the database tables at the time that the backup was made
- Transaction log. A sequential record telling how and when data was stored in the database

Each of these parts is saved on all nodes participating in the backup. During backup, each node saves these three parts into three files on disk:
- BACKUP-backup_id.node_id.ctl

A control file containing control information and metadata. Each node saves the same table definitions (for all tables in the cluster) to its own version of this file.
- BACKUP-backup_id-0.node_id.data

A data file containing the table records, which are saved on a per-fragment basis. That is, different nodes save different fragments during the backup. The file saved by each node starts with a header that states the tables to which the records belong. Following the list of records there is a footer containing a checksum for all records.
- BACKUP-backup_id.node_id.log

A log file containing records of committed transactions. Only transactions on tables stored in the backup are stored in the log. Nodes involved in the backup save different records because different nodes host different database fragments.

In the listing just shown, backup_id stands for the backup identifier and node_id is the unique identifier for the node creating the file.

The location of the backup files is determined by the BackupDataDir parameter.

\subsection*{25.6.8.2 Using The NDB Cluster Management Client to Create a Backup}

Before starting a backup, make sure that the cluster is properly configured for performing one. (See Section 25.6.8.3, "Configuration for NDB Cluster Backups".)

The START BACKUP command is used to create a backup, and has the syntax shown here:
```
START BACKUP [backup_id]
    [encryption_option]
    [wait_option]
    [snapshot_option]
encryption_option:
ENCRYPT [PASSWORD=password]
password:
{'password_string' | "password_string"}
wait_option:
WAIT {STARTED | COMPLETED} | NOWAIT
snapshot_option:
SNAPSHOTSTART | SNAPSHOTEND
```


Successive backups are automatically identified sequentially, so the backup_id, an integer greater than or equal to 1 , is optional; if it is omitted, the next available value is used. If an existing backup_id value is used, the backup fails with the error Backup failed: file already exists. If used, the backup_id must follow immediately after the START BACKUP keywords, before any other options are used.

START BACKUP supports the creation of encrypted backups using ENCRYPT PASSWORD=password. The password must meet all of the following requirements:
- Uses any of the printable ASCII characters except!, ', ", $\$, \%, \backslash$, and $\wedge$
- Is no more than 256 characters in length
- Is enclosed by single or double quotation marks

When ENCRYPT PASSWORD='password' is used, the backup data record and log files written by each data node are encrypted with a key derived from the user-provided password and a randomlygenerated salt using a key derivation function (KDF) that employs the PBKDF2-SHA256 algorithm to generate a symmetric encryption key for that file. This function has the form shown here:
key = KDF(random_salt, password)
The key so generated is then used to encrypt the backup data using AES 256 CBC inline, and symmetric encryption is employed for encrypting the backup fileset (with the generated key).

\section*{Note}

NDB Cluster never saves the user-furnished password or generated encryption key.

The PASSWORD option can be omitted from encryption_option. In this case, the management client prompts the user for a password.

It is possible using PASSWORD to set an empty password ( ' ' or " "), but this is not recommended.
An encrypted backup can be decrypted using any of the following commands:
- ndb_restore --decrypt --backup-password=password
- ndbxfrm --decrypt-password=password input_file output_file
- ndb_print_backup_file -P password file_name
- ndb_restore --decrypt --backup-password-from-stdin
- ndbxfrm --decrypt-password-from-stdin input_file output_file
- ndb_print_backup_file - -backup-password=password file_name
- ndb_print_backup_file --backup-password-from-stdin file_name
- ndb_mgm --backup-password-from-stdin --execute "START BACKUP ..."

See the descriptions of these programs for more information, such as additional options that may be required.

The wait_option can be used to determine when control is returned to the management client after a START BACKUP command is issued, as shown in the following list:
- If NOWAIT is specified, the management client displays a prompt immediately, as seen here:
```
ndb_mgm> START BACKUP NOWAIT
ndb_mgm>
```


In this case, the management client can be used even while it prints progress information from the backup process.
- With WAIT STARTED the management client waits until the backup has started before returning control to the user, as shown here:
```
ndb_mgm> START BACKUP WAIT STARTED
```

```
Waiting for started, this may take several minutes
Node 2: Backup 3 started from node 1
ndb_mgm>
```

- WAIT COMPLETED causes the management client to wait until the backup process is complete before returning control to the user.

\section*{WAIT COMPLETED is the default.}

A snapshot_option can be used to determine whether the backup matches the state of the cluster when START BACKUP was issued, or when it was completed. SNAPSHOTSTART causes the backup to match the state of the cluster when the backup began; SNAPSHOTEND causes the backup to reflect the state of the cluster when the backup was finished. SNAPSHOTEND is the default, and matches the behavior found in previous NDB Cluster releases.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4354.jpg?height=118&width=99&top_left_y=808&top_left_x=306)

\section*{Note}

If you use the SNAPSHOTSTART option with START BACKUP, and the CompressedBackup parameter is enabled, only the data and control files are compressed-the log file is not compressed.

If both a wait_option and a snapshot_option are used, they may be specified in either order. For example, all of the following commands are valid, assuming that there is no existing backup having 4 as its ID:
```
START BACKUP WAIT STARTED SNAPSHOTSTART
START BACKUP SNAPSHOTSTART WAIT STARTED
START BACKUP 4 WAIT COMPLETED SNAPSHOTSTART
START BACKUP SNAPSHOTEND WAIT COMPLETED
START BACKUP 4 NOWAIT SNAPSHOTSTART
```


The procedure for creating a backup consists of the following steps:
1. Start the management client (ndb_mgm), if it not running already.
2. Execute the START BACKUP command. This produces several lines of output indicating the progress of the backup, as shown here:
```
ndb_mgm> START BACKUP
Waiting for completed, this may take several minutes
Node 2: Backup 1 started from node 1
Node 2: Backup 1 started from node 1 completed
    StartGCP: 177 StopGCP: 180
    #Records: 7362 #LogRecords: 0
    Data: 453648 bytes Log: 0 bytes
ndb_mgm>
```

3. When the backup has started the management client displays this message:
```
Backup backup_id started from node node_id
```

backup_id is the unique identifier for this particular backup. This identifier is saved in the cluster log, if it has not been configured otherwise. node_id is the identifier of the management server that is coordinating the backup with the data nodes. At this point in the backup process the cluster has received and processed the backup request. It does not mean that the backup has finished. An example of this statement is shown here:

Node 2: Backup 1 started from node 1
4. The management client indicates with a message like this one that the backup has started:

Backup backup_id started from node node_id completed
As is the case for the notification that the backup has started, backup_id is the unique identifier for this particular backup, and node_id is the node ID of the management server that is coordinating the backup with the data nodes. This output is accompanied by additional information
including relevant global checkpoints, the number of records backed up, and the size of the data, as shown here:
```
Node 2: Backup 1 started from node 1 completed
    StartGCP: 177 StopGCP: 180
    #Records: 7362 #LogRecords: 0
    Data: 453648 bytes Log: 0 bytes
```


It is also possible to perform a backup from the system shell by invoking ndb_mgm with the -e or - execute option, as shown in this example:
```
$> ndb_mgm -e "START BACKUP 6 WAIT COMPLETED SNAPSHOTSTART"
```


When using START BACKUP in this way, you must specify the backup ID.
Cluster backups are created by default in the BACKUP subdirectory of the DataDir on each data node. This can be overridden for one or more data nodes individually, or for all cluster data nodes in the config. ini file using the BackupDataDir configuration parameter. The backup files created for a backup with a given backup_id are stored in a subdirectory named BACKUP-backup_id in the backup directory.

Cancelling backups. To cancel or abort a backup that is already in progress, perform the following steps:
1. Start the management client.
2. Execute this command:
```
ndb_mgm> ABORT BACKUP backup_id
```


The number backup_id is the identifier of the backup that was included in the response of the management client when the backup was started (in the message Backup backup_id started from node management_node_id).
3. The management client acknowledges the abort request with Abort of backup backup_id ordered.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4355.jpg?height=122&width=100&top_left_y=1599&top_left_x=424)

\section*{Note}

At this point, the management client has not yet received a response from the cluster data nodes to this request, and the backup has not yet actually been aborted.
4. After the backup has been aborted, the management client reports this fact in a manner similar to what is shown here:
```
Node 1: Backup 3 started from 5 has been aborted.
    Error: 1321 - Backup aborted by user request: Permanent error: User defined error
Node 3: Backup 3 started from 5 has been aborted.
    Error: 1323-1323: Permanent error: Internal error
Node 2: Backup 3 started from 5 has been aborted.
    Error: 1323-1323: Permanent error: Internal error
Node 4: Backup 3 started from 5 has been aborted.
    Error: 1323-1323: Permanent error: Internal error
```


In this example, we have shown sample output for a cluster with 4 data nodes, where the sequence number of the backup to be aborted is 3 , and the management node to which the cluster management client is connected has the node ID 5. The first node to complete its part in aborting the backup reports that the reason for the abort was due to a request by the user. (The remaining nodes report that the backup was aborted due to an unspecified internal error.)

\section*{Note}

There is no guarantee that the cluster nodes respond to an ABORT BACKUP command in any particular order.

The Backup backup_id started from node management_node_id has been aborted messages mean that the backup has been terminated and that all files relating to this backup have been removed from the cluster file system.

It is also possible to abort a backup in progress from a system shell using this command:
```
$> ndb_mgm -e "ABORT BACKUP backup_id"
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4356.jpg?height=206&width=266&top_left_y=541&top_left_x=299)

\subsection*{25.6.8.3 Configuration for NDB Cluster Backups}

Five configuration parameters are essential for backup:
- BackupDataBufferSize

The amount of memory used to buffer data before it is written to disk.
- BackupLogBufferSize

The amount of memory used to buffer log records before these are written to disk.
- BackupMemory

The total memory allocated in a data node for backups. This should be the sum of the memory allocated for the backup data buffer and the backup log buffer.
- BackupWriteSize

The default size of blocks written to disk. This applies for both the backup data buffer and the backup log buffer.
- BackupMaxWriteSize

The maximum size of blocks written to disk. This applies for both the backup data buffer and the backup log buffer.

In addition, CompressedBackup causes NDB to use compression when creating and writing to backup files.

More detailed information about these parameters can be found in Backup Parameters.
You can also set a location for the backup files using the BackupDataDir configuration parameter. The default is FileSystemPath/BACKUP/BACKUP-backup_id.

You can enforce encryption of backup files by setting RequireEncryptedBackup to 1; this prevents the creation of backups without specifying ENCRYPT PASSWORD=password as part of a START BACKUP command.

\subsection*{25.6.8.4 NDB Cluster Backup Troubleshooting}

If an error code is returned when issuing a backup request, the most likely cause is insufficient memory or disk space. You should check that there is enough memory allocated for the backup.

Important
If you have set BackupDataBufferSize and BackupLogBufferSize and their sum is greater than 4 MB , then you must also set BackupMemory as well.

You should also make sure that there is sufficient space on the hard drive partition of the backup target.

NDB does not support repeatable reads, which can cause problems with the restoration process. Although the backup process is "hot", restoring an NDB Cluster from backup is not a $100 \%$ "hot" process. This is due to the fact that, for the duration of the restore process, running transactions get nonrepeatable reads from the restored data. This means that the state of the data is inconsistent while the restore is in progress.

\subsection*{25.6.8.5 Taking an NDB Backup with Parallel Data Nodes}

It is possible to take a backup with multiple local data managers (LDMs) acting in parallel on the data nodes. For this to work, all data nodes in the cluster must use multiple LDMs, and each data node must use the same number of LDMs. This means that all data nodes must run ndbmtd (ndbd is single-threaded and thus always has only one LDM) and they must be configured to use multiple LDMs before taking the backup; ndbmtd by default runs in single-threaded mode. You can cause them to use multiple LDMs by choosing an appropriate setting for one of the multi-threaded data node configuration parameters MaxNoOfExecutionThreads or ThreadConfig. Keep in mind that changing these parameters requires a restart of the cluster; this can be a rolling restart. In addition, the EnableMultithreadedBackup parameter must be set to 1 for each data node (this is the default).

Depending on the number of LDMs and other factors, you may also need to increase NoOfFragmentLogParts. If you are using large Disk Data tables, you may also need to increase DiskPageBufferMemory. As with single-threaded backups, you may also want or need to make adjustments to settings for BackupDataBufferSize, BackupMemory, and other configuration parameters relating to backups (see Backup parameters).

Once all data nodes are using multiple LDMs, you can take the parallel backup using the START BACKUP command in the NDB management client just as you would if the data nodes were running ndbd (or ndbmtd in single-threaded mode); no additional or special syntax is required, and you can specify a backup ID, wait option, or snapshot option in any combination as needed or desired.

Backups using multiple LDMs create subdirectories, one per LDM, under the directory BACKUP/ BACKUP-backup_id/ (which in turn resides under the BackupDataDir) on each data node; these subdirectories are named BACKUP-backup_id-PART-1-OF-N/, BACKUP-backup_id-PART-2-OF-N/, and so on, up to BACKUP-backup_id-PART-N-OF-N/, where backup_id is the backup ID used for this backup and $N$ is the number of LDMs per data node. Each of these subdirectories contains the usual backup files BACKUP-backup_id-0.node_id.Data, BACKUP-backup_id.node_id.ctl, and BACKUP-backup_id.node_id.log, where node_id is the node ID of this data node.
ndb_restore automatically checks for the presence of the subdirectories just described; if it finds them, it attempts to restore the backup in parallel. For information about restoring backups taken with multiple LDMs, see Restoring from a backup taken in parallel.

To force creation of a single-threaded backup, set EnableMultithreadedBackup = 0 for all data nodes (you can do this by setting the parameter in the [ndbd default] section of the config.ini global configuration file). It is also possible to restore a parallel backup to a cluster running an older version of NDB. See Restoring an NDB backup to a previous version of NDB Cluster, for more information.

\subsection*{25.6.9 Importing Data Into MySQL Cluster}

It is common when setting up a new instance of NDB Cluster to need to import data from an existing NDB Cluster, instance of MySQL, or other source. This data is most often available in one or more of the following formats:
- An SQL dump file such as produced by mysqldump. This can be imported using the mysql client, as shown later in this section.
- A CSV file produced by mysqldump or other export program. Such files can be imported into NDB using LOAD DATA INFILE in the mysql client, or with the ndb_import utility provided with the NDB Cluster distribution. For more information about the latter, see Section 25.5.13, "ndb_import Import CSV Data Into NDB".
- A native NDB backup produced using START BACKUP in the NDB management client. To import a native backup, you must use the ndb_restore program that comes as part of NDB Cluster. See Section 25.5.23, "ndb_restore - Restore an NDB Cluster Backup", for more about using this program.

When importing data from an SQL file, it is often not necessary to enforce transactions or foreign keys, and temporarily disabling these features can speed up the import process greatly. This can be done using the mysql client, either from a client session, or by invoking it on the command line. Within a mysql client session, you can perform the import using the following SQL statements:
```
SET ndb_use_transactions=0;
SET foreign_key_checks=0;
source path/to/dumpfile;
SET ndb_use_transactions=1;
SET foreign_key_checks=1;
```


When performing the import in this fashion, you must enable ndb_use_transaction and foreign_key_checks again following execution of the mysql client's source command. Otherwise, it is possible for later statements in same session may also be executed without enforcing transactions or foreign key constraints, and which could lead to data inconcsistency.

From the system shell, you can import the SQL file while disabling enforcement of transaction and foreign keys by using the mysql client with the --init-command option, like this:
```
$> mysql --init-command='SET ndb_use_transactions=0; SET foreign_key_checks=0' < path/to/dumpfile
```


It is also possible to load the data into an InnoDB table, and convert it to use the NDB storage engine afterwards using ALTER TABLE ... ENGINE NDB). You should take into account, especially for many tables, that this may require a number of such operations; in addition, if foreign keys are used, you must mind the order of the ALTER TABLE statements carefully, due to the fact that foreign keys do not work between tables using different MySQL storage engines.

You should be aware that the methods described previously in this section are not optimized for very large data sets or large transactions. Should an application really need big transactions or many concurrent transactions as part of normal operation, you may wish to increase the value of the MaxNoOfConcurrentOperations data node configuration parameter, which reserves more memory to allow a data node to take over a transaction if its transaction coordinator stops unexpectedly.

You may also wish to do this when performing bulk DELETE or UPDATE operations on NDB Cluster tables. If possible, try to have applications perform these operations in chunks, for example, by adding LIMIT to such statements.

If a data import operation does not complete successfully, for whatever reason, you should be prepared to perform any necessary cleanup including possibly one or more DROP TABLE statements, DROP DATABASE statements, or both. Failing to do so may leave the database in an inconsistent state.

\subsection*{25.6.10 MySQL Server Usage for NDB Cluster}
mysqld is the traditional MySQL server process. To be used with NDB Cluster, mysqld needs to be built with support for the NDB storage engine, as it is in the precompiled binaries available from https://dev.mysql.com/downloads/. If you build MySQL from source, you must invoke CMake with the DWITH_NDB=1 or (deprecated) - DWITH_NDBCLUSTER=1 option to include support for NDB.

For more information about compiling NDB Cluster from source, see Section 25.3.1.4, "Building NDB Cluster from Source on Linux", and Section 25.3.2.2, "Compiling and Installing NDB Cluster from Source on Windows".
(For information about mysqld options and variables, in addition to those discussed in this section, which are relevant to NDB Cluster, see Section 25.4.3.9, "MySQL Server Options and Variables for NDB Cluster".)

If the mysqld binary has been built with Cluster support, the NDBCLUSTER storage engine is still disabled by default. You can use either of two possible options to enable this engine:
- Use --ndbcluster as a startup option on the command line when starting mysqld.
- Insert a line containing ndbcluster in the [mysqld] section of your my.cnf file.

An easy way to verify that your server is running with the NDBCLUSTER storage engine enabled is to issue the SHOW ENGINES statement in the MySQL Monitor (mysql). You should see the value YES as the Support value in the row for NDBCLUSTER. If you see NO in this row or if there is no such row displayed in the output, you are not running an NDB-enabled version of MySQL. If you see DISABLED in this row, you need to enable it in either one of the two ways just described.

To read cluster configuration data, the MySQL server requires at a minimum three pieces of information:
- The MySQL server's own cluster node ID
- The host name or IP address for the management server
- The number of the TCP/IP port on which it can connect to the management server

Node IDs can be allocated dynamically, so it is not strictly necessary to specify them explicitly.
The mysqld parameter ndb-connectstring is used to specify the connection string either on the command line when starting mysqld or in my.cnf. The connection string contains the host name or IP address where the management server can be found, as well as the TCP/IP port it uses.

In the following example, ndb_mgmd.mysql.com is the host where the management server resides, and the management server listens for cluster messages on port 1186:
\$> mysqld --ndbcluster --ndb-connectstring=ndb_mgmd.mysql.com:1186
See Section 25.4.3.3, "NDB Cluster Connection Strings", for more information on connection strings.
Given this information, the MySQL server can act as a full participant in the cluster. (We often refer to a mysqld process running in this manner as an SQL node.) It is fully aware of all cluster data nodes as well as their status, and establishes connections to all data nodes. In this case, it is able to use any data node as a transaction coordinator and to read and update node data.

You can see in the mysql client whether a MySQL server is connected to the cluster using SHOW PROCESSLIST. If the MySQL server is connected to the cluster, and you have the PROCESS privilege, then the first row of the output is as shown here:
```
mysql> SHOW PROCESSLIST \G
************************** 1. row ******************************
        Id: 1
    User: system user
    Host:
        db:
Command: Daemon
    Time: 1
    State: Waiting for event from ndbcluster
    Info: NULL
```


\section*{Important}

To participate in an NDB Cluster, the mysqld process must be started with both the options --ndbcluster and --ndb-connectstring (or their equivalents in my.cnf). If mysqld is started with only the --ndbcluster option, or if it

I
is unable to contact the cluster, it is not possible to work with NDB tables, nor is it possible to create any new tables regardless of storage engine. The latter restriction is a safety measure intended to prevent the creation of tables having the same names as NDB tables while the SQL node is not connected to the cluster. If you wish to create tables using a different storage engine while the mysqld process is not participating in an NDB Cluster, you must restart the server without the --ndbcluster option.

\subsection*{25.6.11 NDB Cluster Disk Data Tables}

NDB Cluster supports storing nonindexed columns of NDB tables on disk, rather than in RAM. Column data and logging metadata are kept in data files and undo log files, conceptualized as tablespaces and log file groups, as described in the next section-see Section 25.6.11.1, "NDB Cluster Disk Data Objects".

NDB Cluster Disk Data performance can be influenced by a number of configuration parameters. For information about these parameters and their effects, see Disk Data Configuration Parameters, and Disk Data and GCP Stop errors.

You should also set the DiskDataUsingSameDisk data node configuration parameter to false when using separate disks for Disk Data files.

For more information, see the following:
- Disk Data file system parameters.
- Disk Data latency parameters
- Section 25.6.15.32, "The ndbinfo diskstat Table"
- Section 25.6.15.33, "The ndbinfo diskstats_1sec Table"
- Section 25.6.15.50, "The ndbinfo pgman_time_track_stats Table"

\subsection*{25.6.11.1 NDB Cluster Disk Data Objects}

NDB Cluster Disk Data storage is implemented using the following objects:
- Tablespace: Acts as containers for other Disk Data objects. A tablespace contains one or more data files and one or more undo log file groups.
- Data file: Stores column data. A data file is assigned directly to a tablespace.
- Undo log file: Contains undo information required for rolling back transactions. Assigned to an undo log file group.
- log file group: Contains one or more undo log files. Assigned to a tablespace.

Undo log files and data files are actual files in the file system of each data node; by default they are placed in ndb_node_id_fs in the DataDir specified in the NDB Cluster config.ini file, and where node_id is the data node's node ID. It is possible to place these elsewhere by specifying either an absolute or relative path as part of the filename when creating the undo log or data file. Statements that create these files are shown later in this section.

Undo log files are used only by Disk Data tables, and are not needed or used by NDB tables that are stored in memory only.

NDB Cluster tablespaces and log file groups are not implemented as files.
Although not all Disk Data objects are implemented as files, they all share the same namespace. This means that each Disk Data object must be uniquely named (and not merely each Disk Data object of a given type). For example, you cannot have a tablespace and a log file group both named dd1.

Assuming that you have already set up an NDB Cluster with all nodes (including management and SQL nodes), the basic steps for creating an NDB Cluster table on disk are as follows:
1. Create a log file group, and assign one or more undo log files to it (an undo log file is also sometimes referred to as an undofile).
2. Create a tablespace; assign the log file group, as well as one or more data files, to the tablespace.
3. Create a Disk Data table that uses this tablespace for data storage.

Each of these tasks can be accomplished using SQL statements in the mysql client or other MySQL client application, as shown in the example that follows.
1. We create a log file group named lg_1 using CREATE LOGFILE GROUP. This log file group is to be made up of two undo log files, which we name undo_1.log and undo_2.log, whose initial sizes are 16 MB and 12 MB , respectively. (The default initial size for an undo log file is 128 MB .) Optionally, you can also specify a size for the log file group's undo buffer, or permit it to assume the default value of 8 MB . In this example, we set the UNDO buffer's size at 2 MB . A log file group must be created with an undo log file; so we add undo_1.log to lg_1 in this CREATE LOGFILE GROUP statement:
```
CREATE LOGFILE GROUP lg_1
    ADD UNDOFILE 'undo_1.log'
    INITIAL_SIZE 16M
    UNDO_BUFFER_SIZE 2M
    ENGINE NDBCLUSTER;
```


To add undo_2. log to the log file group, use the following ALTER LOGFILE GROUP statement:
```
ALTER LOGFILE GROUP lg_1
    ADD UNDOFILE 'undo_2.log'
    INITIAL_SIZE 12M
    ENGINE NDBCLUSTER;
```


Some items of note:
- The . log file extension used here is not required. We employ it merely to make the log files easily recognizable.
- Every CREATE LOGFILE GROUP and ALTER LOGFILE GROUP statement must include an ENGINE option. The only permitted values for this option are NDBCLUSTER and NDB.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4361.jpg?height=111&width=104&top_left_y=1838&top_left_x=456)

\section*{Important}

There can exist at most one log file group in the same NDB Cluster at any given time.
- When you add an undo log file to a log file group using ADD UNDOFILE 'filename', a file with the name filename is created in the ndb_node_id_fs directory within the DataDir of each data node in the cluster, where node_id is the node ID of the data node. Each undo log file is of the size specified in the SQL statement. For example, if an NDB Cluster has 4 data nodes, then the ALTER LOGFILE GROUP statement just shown creates 4 undo log files, 1 each on in the data directory of each of the 4 data nodes; each of these files is named undo_2.log and each file is 12 MB in size.
- UNDO_BUFFER_SIZE is limited by the amount of system memory available.
- See Section 15.1.16, "CREATE LOGFILE GROUP Statement", and Section 15.1.6, "ALTER LOGFILE GROUP Statement", for more information about these statements.
2. Now we can create a tablespace-an abstract container for files used by Disk Data tables to store data. A tablespace is associated with a particular log file group; when creating a new tablespace, you must specify the log file group it uses for undo logging. You must also specify at least one data
file; you can add more data files to the tablespace after the tablespace is created. It is also possible to drop data files from a tablespace (see example later in this section).

Assume that we wish to create a tablespace named ts_1 which uses $\lg \_1$ as its log file group. We want the tablespace to contain two data files, named data_1.dat and data_2.dat, whose initial sizes are 32 MB and 48 MB , respectively. (The default value for INITIAL_SIZE is 128 MB .) We can do this using two SQL statements, as shown here:
```
CREATE TABLESPACE ts_1
    ADD DATAFILE 'data_1.dat'
    USE LOGFILE GROUP lg_1
    INITIAL_SIZE 32M
    ENGINE NDBCLUSTER;
ALTER TABLESPACE ts_1
    ADD DATAFILE 'data_2.dat'
    INITIAL_SIZE 48M;
```


The CREATE TABLESPACE statement creates a tablespace ts_1 with the data file data_1.dat, and associates ts_1 with log file group lg_1. The ALTER TABLESPACE adds the second data file (data_2.dat).

Some items of note:
- As is the case with the . log file extension used in this example for undo log files, there is no special significance for the . dat file extension; it is used merely for easy recognition.
- When you add a data file to a tablespace using ADD DATAFILE 'filename', a file with the name filename is created in the ndb_node_id_fs directory within the DataDir of each data node in the cluster, where node_id is the node ID of the data node. Each data file is of the size specified in the SQL statement. For example, if an NDB Cluster has 4 data nodes, then the ALTER TABLESPACE statement just shown creates 4 data files, 1 each in the data directory of each of the 4 data nodes; each of these files is named data_2. dat, and each file is 48 MB in size.
- NDB reserves $4 \%$ of each tablespace for use during data node restarts. This space is not available for storing data.
- CREATE TABLESPACE statements must contain an ENGINE clause; only tables using the same storage engine as the tablespace can be created in the tablespace. For NDB tablespaces, ALTER TABLESPACE accepts an ENGINE clause only for ALTER TABLESPACE ... ADD DATAFILE; ENGINE is rejected for any other ALTER TABLESPACE statement. For NDB tablespaces, the only permitted values for the ENGINE option are NDBCLUSTER and NDB.
- Allocation of extents is performed in round-robin fashion among all data files used by a given tablespace.
- For more information about the CREATE TABLESPACE and ALTER TABLESPACE statements, see Section 15.1.21, "CREATE TABLESPACE Statement", and Section 15.1.10, "ALTER TABLESPACE Statement".
3. Now it is possible to create a table whose unindexed columns are stored on disk using files in tablespace ts_1:
```
CREATE TABLE dt_1 (
    member_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    last_name VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    dob DATE NOT NULL,
    joined DATE NOT NULL,
    INDEX(last_name, first_name)
    )
    TABLESPACE ts_1 STORAGE DISK
    ENGINE NDBCLUSTER;
```


TABLESPACE ts_1 STORAGE DISK tells the NDB storage engine to use tablespace ts_1 for data storage on disk.

Once table ts_1 has been created as shown, you can perform INSERT, SELECT, UPDATE, and DELETE statements on it just as you would with any other MySQL table.

It is also possible to specify whether an individual column is stored on disk or in memory by using a STORAGE clause as part of the column's definition in a CREATE TABLE or ALTER TABLE statement. STORAGE DISK causes the column to be stored on disk, and STORAGE MEMORY causes in-memory storage to be used. See Section 15.1.20, "CREATE TABLE Statement", for more information.

You can obtain information about the NDB disk data files and undo log files just created by querying the FILES table in the INFORMATION_SCHEMA database, as shown here:
```
mysql> SELECT
        FILE_NAME AS File, FILE_TYPE AS Type,
        TABLESPACE_NAME AS Tablespace, TABLE_NAME AS Name,
        LOGFILE_GROUP_NAME AS 'File group',
        FREE_EXTENTS AS Free, TOTAL_EXTENTS AS Total
    FROM INFORMATION_SCHEMA.FILES
    WHERE ENGINE='ndbcluster';
+---------------+-----------+------------+------+------------+-----+--------+
| File | Type | Tablespace | Name | File group | Free | Total |
+---------------+----------+------------+------+------------+------+--------+
| ./undo_1.log | UNDO LOG | lg_1 | NULL | lg_1 | 0 | 4194304 |
| ./undo_2.log | UNDO LOG | lg_1 | NULL | lg_1 | 0 | 3145728 |
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4363.jpg?height=72&width=1287&top_left_y=1251&top_left_x=351)
```
+---------------+----------+------------+------+------------+------+--------+
4 rows in set (0.00 sec)
```


For more information and examples, see Section 28.3.15, "The INFORMATION_SCHEMA FILES Table".

Indexing of columns implicitly stored on disk. For table $\mathrm{dt}_{\_1} 1$ as defined in the example just shown, only the dob and joined columns are stored on disk. This is because there are indexes on the id, last_name, and first_name columns, and so data belonging to these columns is stored in RAM. Only nonindexed columns can be held on disk; indexes and indexed column data continue to be stored in memory. This tradeoff between the use of indexes and conservation of RAM is something you must keep in mind as you design Disk Data tables.

You cannot add an index to a column that has been explicitly declared STORAGE DISK, without first changing its storage type to MEMORY; any attempt to do so fails with an error. A column which implicitly uses disk storage can be indexed; when this is done, the column's storage type is changed to MEMORY automatically. By "implicitly", we mean a column whose storage type is not declared, but which is which inherited from the parent table. In the following CREATE TABLE statement (using the tablespace ts_1 defined previously), columns c2 and c3 use disk storage implicitly:
```
mysql> CREATE TABLE ti (
    -> c1 INT PRIMARY KEY,
    -> c2 INT,
    -> c3 INT,
    -> c4 INT
    -> )
    -> STORAGE DISK
    -> TABLESPACE ts_1
    -> ENGINE NDBCLUSTER;
Query OK, 0 rows affected (1.31 sec)
```


Because c2, c3, and c4 are themselves not declared with STORAGE DISK, it is possible to index them. Here, we add indexes to c2 and c3, using, respectively, CREATE INDEX and ALTER TABLE:
```
mysql> CREATE INDEX i1 ON ti(c2);
```

```
Query OK, 0 rows affected (2.72 sec)
Records: 0 Duplicates: 0 Warnings: 0
mysql> ALTER TABLE ti ADD INDEX i2(c3);
Query OK, 0 rows affected (0.92 sec)
Records: 0 Duplicates: 0 Warnings: 0
```


SHOW CREATE TABLE confirms that the indexes were added.
```
mysql> SHOW CREATE TABLE ti\G
************************** 1. row ****************************************
        Table: ti
Create Table: CREATE TABLE ˋtiˋ (
    ˋc1ˋ int(11) NOT NULL,
    ˋc2ˋ int(11) DEFAULT NULL,
    ˋc3ˋ int(11) DEFAULT NULL,
    ˋc4ˋ int(11) DEFAULT NULL,
    PRIMARY KEY (ˋc1ˋ),
    KEY ˋi1ˋ (ˋc2ˋ),
    KEY ˋi2ˋ (ˋc3ˋ)
) /*!50100 TABLESPACE ˋts_1ˋ STORAGE DISK */ ENGINE=ndbcluster DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900
1 row in set (0.00 sec)
```


You can see using ndb_desc that the indexed columns (emphasized text) now use in-memory rather than on-disk storage:
```
$> ./ndb_desc -d test t1
-- t1 --
Version: 33554433
Fragment type: HashMapPartition
K Value: 6
Min load factor: 78
Max load factor: 80
Temporary table: no
Number of attributes: 4
Number of primary keys: 1
Length of frm data: 317
Max Rows: 0
Row Checksum: 1
Row GCI: 1
SingleUserMode: 0
ForceVarPart: 1
PartitionCount: 4
FragmentCount: 4
PartitionBalance: FOR_RP_BY_LDM
ExtraRowGciBits: 0
ExtraRowAuthorBits: 0
TableStatus: Retrieved
Table options:
HashMap: DEFAULT-HASHMAP-3840-4
-- Attributes --
c1 Int PRIMARY KEY DISTRIBUTION KEY AT=FIXED ST=MEMORY
c2 Int NULL AT=FIXED ST=MEMORY
c3 Int NULL AT=FIXED ST=MEMORY
c4 Int NULL AT=FIXED ST=DISK
-- Indexes --
PRIMARY KEY(c1) - UniqueHashIndex
i2(c3) - OrderedIndex
PRIMARY(c1) - OrderedIndex
i1(c2) - OrderedIndex
```


Performance note. The performance of a cluster using Disk Data storage is greatly improved if Disk Data files are kept on a separate physical disk from the data node file system. This must be done for each data node in the cluster to derive any noticeable benefit.

You can use absolute and relative file system paths with ADD UNDOFILE and ADD DATAFILE; relative paths are calculated with respect to the data node's data directory.

A log file group, a tablespace, and any Disk Data tables using these must be created in a particular order. This is also true for dropping these objects, subject to the following constraints:
- A log file group cannot be dropped as long as any tablespaces use it.
- A tablespace cannot be dropped as long as it contains any data files.
- You cannot drop any data files from a tablespace as long as there remain any tables which are using the tablespace.
- It is not possible to drop files created in association with a different tablespace other than the one with which the files were created.

For example, to drop all the objects created so far in this section, you can use the following statements:
```
mysql> DROP TABLE dt_1;
mysql> ALTER TABLESPACE ts_1
    -> DROP DATAFILE 'data_2.dat';
mysql> ALTER TABLESPACE ts_1
    -> DROP DATAFILE 'data_1.dat';
mysql> DROP TABLESPACE ts_1;
mysql> DROP LOGFILE GROUP lg_1;
```


These statements must be performed in the order shown, except that the two ALTER TABLESPACE ... DROP DATAFILE statements may be executed in either order.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4365.jpg?height=127&width=99&top_left_y=1192&top_left_x=370)

\section*{Note}

Older versions of NDB Cluster used an ENGINE clause with ALTER TABLESPACE ... DROP DATAFILE and DROP TABLESPACE. In NDB 8.4 and later, it is no longer supported with either of these statements.

\subsection*{25.6.11.2 NDB Cluster Disk Data Storage Requirements}

The following items apply to Disk Data storage requirements:
- Variable-length columns of Disk Data tables take up a fixed amount of space. For each row, this is equal to the space required to store the largest possible value for that column.

For general information about calculating these values, see Section 13.7, "Data Type Storage Requirements".

You can obtain an estimate the amount of space available in data files and undo log files by querying the Information Schema FILES table. For more information and examples, see Section 28.3.15, "The INFORMATION_SCHEMA FILES Table".

\section*{Note}

The OPTIMIZE TABLE statement does not have any effect on Disk Data tables.
- In a Disk Data table, the first 256 bytes of a TEXT or BLOB column are stored in memory; only the remainder is stored on disk.
- Each row in a Disk Data table uses 8 bytes in memory to point to the data stored on disk. This means that, in some cases, converting an in-memory column to the disk-based format can actually result in greater memory usage. For example, converting a CHAR (4) column from memory-based to disk-based format increases the amount of DataMemory used per row from 4 to 8 bytes.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4365.jpg?height=127&width=113&top_left_y=2439&top_left_x=360)

\footnotetext{
Important
Starting the cluster with the --initial option does not remove Disk Data files. You must remove these manually prior to performing an initial restart of the cluster.
}

Performance of Disk Data tables can be improved by minimizing the number of disk seeks by making sure that DiskPageBufferMemory is of sufficient size. You can query the diskpagebuffer table to help determine whether the value for this parameter needs to be increased.

\subsection*{25.6.12 Online Operations with ALTER TABLE in NDB Cluster}

MySQL NDB Cluster supports online table schema changes using ALTER TABLE ... ALGORITHM=DEFAULT | INPLACE | COPY. NDB Cluster handles COPY and INPLACE as described in the next few paragraphs.

For ALGORITHM=COPY, the mysqld NDB Cluster handler performs the following actions:
- Tells the data nodes to create an empty copy of the table, and to make the required schema changes to this copy.
- Reads rows from the original table, and writes them to the copy.
- Tells the data nodes to drop the original table and then to rename the copy.

We sometimes refer to this as a "copying" or "offline" ALTER TABLE.
DML operations are not permitted concurrently with a copying ALTER TABLE.
The mysqld on which the copying ALTER TABLE statement is issued takes a metadata lock, but this is in effect only on that mysqld. Other NDB clients can modify row data during a copying ALTER TABLE, resulting in inconsistency.

For ALGORITHM=INPLACE, the NDB Cluster handler tells the data nodes to make the required changes, and does not perform any copying of data.

We also refer to this as a "non-copying" or "online" ALTER TABLE.
A non-copying ALTER TABLE allows concurrent DML operations.
ALGORITHM=INSTANT is not supported by NDB 8.4.
Regardless of the algorithm used, the mysqld takes a Global Schema Lock (GSL) while executing ALTER TABLE; this prevents execution of any (other) DDL or backups concurrently on this or any other SQL node in the cluster. This is normally not problematic, unless the ALTER TABLE takes a very long time.

Note
Some older releases of NDB Cluster used a syntax specific to NDB for online ALTER TABLE operations. That syntax has since been removed.

Operations that add and drop indexes on variable-width columns of NDB tables occur online. Online operations are noncopying; that is, they do not require that indexes be re-created. They do not lock the table being altered from access by other API nodes in an NDB Cluster (but see Limitations of NDB online operations, later in this section). Such operations do not require single user mode for NDB table alterations made in an NDB cluster with multiple API nodes; transactions can continue uninterrupted during online DDL operations.

ALGORITHM=INPLACE can be used to perform online ADD COLUMN, ADD INDEX (including CREATE INDEX statements), and DROP INDEX operations on NDB tables. Online renaming of NDB tables is also supported.

Disk-based columns cannot be added to NDB tables online. This means that, if you wish to add an inmemory column to an NDB table that uses a table-level STORAGE DISK option, you must declare the
new column as using memory-based storage explicitly. For example-assuming that you have already created tablespace ts1-suppose that you create table t1 as follows:
```
mysql> CREATE TABLE t1 (
    > c1 INT NOT NULL PRIMARY KEY,
    > c2 VARCHAR(30)
    > )
    > TABLESPACE ts1 STORAGE DISK
    > ENGINE NDB;
Query OK, 0 rows affected (1.73 sec)
Records: 0 Duplicates: 0 Warnings: 0
```


You can add a new in-memory column to this table online as shown here:
```
mysql> ALTER TABLE t1
    > ADD COLUMN c3 INT COLUMN_FORMAT DYNAMIC STORAGE MEMORY,
    > ALGORITHM=INPLACE;
Query OK, 0 rows affected (1.25 sec)
Records: 0 Duplicates: 0 Warnings: 0
```


This statement fails if the STORAGE MEMORY option is omitted:
```
mysql> ALTER TABLE t1
    > ADD COLUMN c4 INT COLUMN_FORMAT DYNAMIC,
    > ALGORITHM=INPLACE;
ERROR 1846 (0A000): ALGORITHM=INPLACE is not supported. Reason:
Adding column(s) or add/reorganize partition not supported online. Try
ALGORITHM=COPY.
```


If you omit the COLUMN_FORMAT DYNAMIC option, the dynamic column format is employed automatically, but a warning is issued, as shown here:
```
mysql> ALTER ONLINE TABLE t1 ADD COLUMN c4 INT STORAGE MEMORY;
Query OK, 0 rows affected, 1 warning (1.17 sec)
Records: 0 Duplicates: 0 Warnings: 0
mysql> SHOW WARNINGS\G
************************** 1. row *****************************************
    Level: Warning
        Code: 1478
Message: DYNAMIC column c4 with STORAGE DISK is not supported, column will
become FIXED
mysql> SHOW CREATE TABLE t1\G
************************** 1. row *****************************************
            Table: t1
Create Table: CREATE TABLE ˋt1ˋ (
        ˋc1ˋ int(11) NOT NULL,
    ˋc2ˋ varchar(30) DEFAULT NULL,
    ˋc3ˋ int(11) /*!50606 STORAGE MEMORY */ /*!50606 COLUMN_FORMAT DYNAMIC */ DEFAULT NULL,
    ˋc4ˋ int(11) /*!50606 STORAGE MEMORY */ DEFAULT NULL,
    PRIMARY KEY (ˋc1ˋ)
) /*!50606 TABLESPACE ts_1 STORAGE DISK */ ENGINE=ndbcluster DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_09
1 row in set (0.03 sec)
```


\section*{Note}

The STORAGE and COLUMN_FORMAT keywords are supported only in NDB Cluster; in any other version of MySQL, attempting to use either of these keywords in a CREATE TABLE or ALTER TABLE statement results in an error.

It is also possible to use the statement ALTER TABLE . . . REORGANIZE PARTITION, ALGORITHM=INPLACE with no partition_names INTO (partition_definitions) option on NDB tables. This can be used to redistribute NDB Cluster data among new data nodes that have been added to the cluster online. This does not perform any defragmentation, which requires an OPTIMIZE TABLE or null ALTER TABLE statement. For more information, see Section 25.6.7, "Adding NDB Cluster Data Nodes Online".

\section*{Limitations of NDB online operations}

Online DROP COLUMN operations are not supported.
Online ALTER TABLE, CREATE INDEX, or DROP INDEX statements that add columns or add or drop indexes are subject to the following limitations:
- A given online ALTER TABLE can use only one of ADD COLUMN, ADD INDEX, or DROP INDEX. One or more columns can be added online in a single statement; only one index may be created or dropped online in a single statement.
- The table being altered is not locked with respect to API nodes other than the one on which an online ALTER TABLE ADD COLUMN, ADD INDEX, or DROP INDEX operation (or CREATE INDEX or DROP INDEX statement) is run. However, the table is locked against any other operations originating on the same API node while the online operation is being executed.
- The table to be altered must have an explicit primary key; the hidden primary key created by the NDB storage engine is not sufficient for this purpose.
- The storage engine used by the table cannot be changed online.
- The tablespace used by the table cannot be changed online. Statements such as ALTER TABLE ndb_table ... ALGORITHM=INPLACE, TABLESPACE=new_tablespace are specifically disallowed.
- When used with NDB Cluster Disk Data tables, it is not possible to change the storage type (DISK or MEMORY) of a column online. This means, that when you add or drop an index in such a way that the operation would be performed online, and you want the storage type of the column or columns to be changed, you must use ALGORITHM=COPY in the statement that adds or drops the index.

Columns to be added online cannot use the BLOB or TEXT type, and must meet the following criteria:
- The columns must be dynamic; that is, it must be possible to create them using COLUMN_FORMAT DYNAMIC. If you omit the COLUMN_FORMAT DYNAMIC option, the dynamic column format is employed automatically.
- The columns must permit NULL values and not have any explicit default value other than NULL. Columns added online are automatically created as DEFAULT NULL, as can be seen here:
```
mysql> CREATE TABLE t2 (
        > c1 INT NOT NULL AUTO_INCREMENT PRIMARY KEY
        > ) ENGINE=NDB;
Query OK, 0 rows affected (1.44 sec)
mysql> ALTER TABLE t2
        > ADD COLUMN c2 INT,
        > ADD COLUMN c3 INT,
        > ALGORITHM=INPLACE;
Query OK, 0 rows affected, 2 warnings (0.93 sec)
mysql> SHOW CREATE TABLE t1\G
************************** 1. row ******************************
            Table: t1
Create Table: CREATE TABLE ˋt2ˋ (
    ˋc1ˋ int(11) NOT NULL AUTO_INCREMENT,
    ˋc2ˋ int(11) DEFAULT NULL,
    ˋc3ˋ int(11) DEFAULT NULL,
    PRIMARY KEY (ˋc1ˋ)
) ENGINE=ndbcluster DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
1 row in set (0.00 sec)
```

- The columns must be added following any existing columns. If you attempt to add a column online before any existing columns or using the FIRST keyword, the statement fails with an error.
- Existing table columns cannot be reordered online.

For online ALTER TABLE operations on NDB tables, fixed-format columns are converted to dynamic when they are added online, or when indexes are created or dropped online, as shown here (repeating the CREATE TABLE and ALTER TABLE statements just shown for the sake of clarity):
```
mysql> CREATE TABLE t2 (
        > c1 INT NOT NULL AUTO_INCREMENT PRIMARY KEY
        > ) ENGINE=NDB;
Query OK, 0 rows affected (1.44 sec)
mysql> ALTER TABLE t2
        > ADD COLUMN c2 INT,
        > ADD COLUMN c3 INT,
        > ALGORITHM=INPLACE;
Query OK, 0 rows affected, 2 warnings (0.93 sec)
mysql> SHOW WARNINGS;
************************** 1. row ******************************
    Level: Warning
    Code: 1478
Message: Converted FIXED field 'c2' to DYNAMIC to enable online ADD COLUMN
*************************** 2. row *****************************
    Level: Warning
    Code: 1478
Message: Converted FIXED field 'c3' to DYNAMIC to enable online ADD COLUMN
2 rows in set (0.00 sec)
```


Only the column or columns to be added online must be dynamic. Existing columns need not be; this includes the table's primary key, which may also be FIXED, as shown here:
```
mysql> CREATE TABLE t3 (
        > c1 INT NOT NULL AUTO_INCREMENT PRIMARY KEY COLUMN_FORMAT FIXED
        > ) ENGINE=NDB;
Query OK, 0 rows affected (2.10 sec)
mysql> ALTER TABLE t3 ADD COLUMN c2 INT, ALGORITHM=INPLACE;
Query OK, 0 rows affected, 1 warning (0.78 sec)
Records: 0 Duplicates: 0 Warnings: 0
mysql> SHOW WARNINGS;
*************************** 1. row ***************************************
    Level: Warning
    Code: 1478
Message: Converted FIXED field 'c2' to DYNAMIC to enable online ADD COLUMN
1 row in set (0.00 sec)
```


Columns are not converted from FIXED to DYNAMIC column format by renaming operations. For more information about COLUMN_FORMAT, see Section 15.1.20, "CREATE TABLE Statement".

The KEY, CONSTRAINT, and IGNORE keywords are supported in ALTER TABLE statements using ALGORITHM=INPLACE.

Setting MAX_ROWS to 0 using an online ALTER TABLE statement is disallowed. You must use a copying ALTER TABLE to perform this operation. (Bug \#21960004)

\subsection*{25.6.13 Privilege Synchronization and NDB_STORED_USER}

Privilege synchronization is the mechanism used by NDB Cluster for sharing and synchronizing users, roles, and privileges between SQL nodes. This can be enabled by granting the NDB_STORED_USER privilege. See the description of the privilege for usage information.

NDB_STORED_USER is printed in the output of SHOW GRANTS as with any other privilege, as shown here:
```
mysql> SHOW GRANTS for 'jon'@'localhost';
+------------------------------------------------------
| Grants for jon@localhost |
+-------------------------------------------------------
| GRANT USAGE ON *.* TO ˋjonˋ@ˋlocalhostˋ |
```

```
| GRANT NDB_STORED_USER ON *.* TO ˋjonˋ@ˋlocalhostˋ |
+-----------------------------------------------------+
```


You can also verify that privileges are shared for this account using the ndb_select_all utility supplied with NDB Cluster, like this (some output wrapped to preserve formatting):
```
$> ndb_select_all -d mysql ndb_sql_metadata | grep 'ˋjonˋ@ˋlocalhostˋ'
12 "'jon'@'localhost'" 0 [NULL] "GRANT USAGE ON *.* TO ˋjonˋ@ˋlocalhostˋ"
11 "'jon'@'localhost'" 0 2 "CREATE USER ˋjonˋ@ˋlocalhost
IDENTIFIED WITH 'caching_sha2_password' AS
0x2441243030352466014340225A107D590E6E653B5D587922306102716D752E6656772F3038512F
6C5072776D30376D37347A384B557A4C564F70495158656A31382E45324E33
REQUIRE NONE PASSWORD EXPIRE DEFAULT ACCOUNT UNLOCK PASSWORD HISTORY DEFAULT
PASSWORD REUSE INTERVAL DEFAULT PASSWORD REQUIRE CURRENT DEFAULT"
12 "'jon'@'localhost'" 1 [NULL] "GRANT NDB_STORED_USER ON *.* TO ˋjonˋ@ˋlocalhostˋ"
```

ndb_sql_metadata is a special NDB table that is not visible using the mysql or other MySQL client.
A statement granting the NDB_STORED_USER privilege, such as GRANT NDB_STORED_USER ON *.* TO 'cluster_app_user'@'localhost', works by directing NDB to create a snapshot using the queries SHOW CREATE USER cluster_app_user@localhost and SHOW GRANTS FOR cluster_app_user@localhost, then storing the results in ndb_sql_metadata. Any other SQL nodes are then requested to read and apply the snapshot. Whenever a MySQL server starts up and joins the cluster as an SQL node it executes these stored CREATE USER and GRANT statements as part of the cluster schema synchronization process.

Whenever an SQL statement is executed on an SQL node other than the one where it originated, the statement is run in a utility thread of the NDBCLUSTER storage engine; this is done within a security environment equivalent to that of the MySQL replication replica applier thread.

An SQL node performing a change to user privileges takes a global lock before doing so, which prevents deadlocks by concurrent ACL operations on different SQL nodes.

You should keep in mind that, because shared schema change operations are performed synchronously, the next shared schema change following a change to any shared user or users serves as a synchronization point. Any pending user changes run to completion before the schema change distribution can begin; after this the schema change itself runs synchronously. For example, if a DROP DATABASE statement follows a DROP USER of a distributed user, the drop of the database cannot take place until the drop of the user has completed on all SQL nodes.

In the event that multiple GRANT, REVOKE, or other user administration statements from multiple SQL nodes cause privileges for a given user to diverge on different SQL nodes, you can fix this problem by issuing GRANT NDB_STORED_USER for this user on an SQL node where the privileges are known to be correct; this causes a new snapshot of the privileges to be taken and synchronized to the other SQL nodes.

\section*{Note}

NDB Cluster 8.4 does not support distribution of MySQL users and privileges across SQL nodes in an NDB Cluster by altering the MySQL privilege tables such that they use the NDB storage engine as was done in older releases (NDB 7.6 and earlier-see Distributed Privileges Using Shared Grant Tables).

\subsection*{25.6.14 NDB API Statistics Counters and Variables}

A number of types of statistical counters relating to actions performed by or affecting Ndb objects are available. Such actions include starting and closing (or aborting) transactions; primary key and unique key operations; table, range, and pruned scans; threads blocked while waiting for the completion of various operations; and data and events sent and received by NDBCLUSTER. The counters are incremented inside the NDB kernel whenever NDB API calls are made or data is sent to or received by the data nodes. mysqld exposes these counters as system status variables; their values can be read in the output of SHOW STATUS, or by querying the Performance Schema session_status or global_status table. By comparing the values before and after statements operating on NDB tables,
you can observe the corresponding actions taken on the API level, and thus the cost of performing the statement.

You can list all of these status variables using the following SHOW STATUS statement:
```
mysql> SHOW STATUS LIKE 'ndb_api%';
+------------------------------------------------+-------------
| Variable_name | Value |
+------------------------------------------------+-------------+
| Ndb_api_wait_exec_complete_count | 11
| Ndb_api_wait_scan_result_count | 14
| Ndb_api_wait_meta_request_count |74
| Ndb_api_wait_nanos_count | 31453031678
| Ndb_api_bytes_sent_count | 3336
| Ndb_api_bytes_received_count | 103568
| Ndb_api_trans_start_count |10
| Ndb_api_trans_commit_count | 2
| Ndb_api_trans_abort_count | 4
| Ndb_api_trans_close_count | 10
| Ndb_api_pk_op_count | 6
| Ndb_api_uk_op_count | 0
| Ndb_api_table_scan_count | 3
| Ndb_api_range_scan_count | 1
| Ndb_api_pruned_scan_count | 0
| Ndb_api_scan_batch_count | 3
| Ndb_api_read_row_count | 11
| Ndb_api_trans_local_read_row_count |9
| Ndb_api_adaptive_send_forced_count | 5
| Ndb_api_adaptive_send_unforced_count | 11
| Ndb_api_adaptive_send_deferred_count | 0
| Ndb_api_event_data_count | 0
| Ndb_api_event_nondata_count | 0
| Ndb_api_event_bytes_count | 0
| Ndb_api_event_data_count_injector | 0
| Ndb_api_event_nondata_count_injector | 0
| Ndb_api_event_bytes_count_injector | 0
| Ndb_api_wait_exec_complete_count_slave | 0
| Ndb_api_wait_scan_result_count_slave | 0
| Ndb_api_wait_meta_request_count_slave | 0
| Ndb_api_wait_nanos_count_slave | 0
| Ndb_api_bytes_sent_count_slave | 0
| Ndb_api_bytes_received_count_slave | 0
| Ndb_api_trans_start_count_slave | 0
| Ndb_api_trans_commit_count_slave | 0
| Ndb_api_trans_abort_count_slave | 0
| Ndb_api_trans_close_count_slave | 0
| Ndb_api_pk_op_count_slave | 0
| Ndb_api_uk_op_count_slave | 0
| Ndb_api_table_scan_count_slave | 0
| Ndb_api_range_scan_count_slave | 0
| Ndb_api_pruned_scan_count_slave | 0
| Ndb_api_scan_batch_count_slave | 0
| Ndb_api_read_row_count_slave | 0
| Ndb_api_trans_local_read_row_count_slave | 0
| Ndb_api_adaptive_send_forced_count_slave | 0
| Ndb_api_adaptive_send_unforced_count_slave | 0
| Ndb_api_adaptive_send_deferred_count_slave | 0
| Ndb_api_wait_exec_complete_count_replica | 0
| Ndb_api_wait_scan_result_count_replica | 0
| Ndb_api_wait_meta_request_count_replica | 0
| Ndb_api_wait_nanos_count_replica | 0
| Ndb_api_bytes_sent_count_replica | 0
| Ndb_api_bytes_received_count_replica | 0
| Ndb_api_trans_start_count_replica | 0
| Ndb_api_trans_commit_count_replica | 0
| Ndb_api_trans_abort_count_replica | 0
| Ndb_api_trans_close_count_replica | 0
| Ndb_api_pk_op_count_replica | 0
| Ndb_api_uk_op_count_replica | 0
| Ndb_api_table_scan_count_replica | 0
| Ndb_api_range_scan_count_replica | 0
| Ndb_api_pruned_scan_count_replica | 0
```

```
| Ndb_api_scan_batch_count_replica | 0
| Ndb_api_read_row_count_replica | 0
| Ndb_api_trans_local_read_row_count_replica | 0
| Ndb_api_adaptive_send_forced_count_replica | 0
| Ndb_api_adaptive_send_unforced_count_replica | 0
| Ndb_api_adaptive_send_deferred_count_replica | 0
| Ndb_api_wait_exec_complete_count_session | 0
| Ndb_api_wait_scan_result_count_session | 3
| Ndb_api_wait_meta_request_count_session | 6
| Ndb_api_wait_nanos_count_session | 2022486
| Ndb_api_bytes_sent_count_session | 268
| Ndb_api_bytes_received_count_session | 10332
| Ndb_api_trans_start_count_session | 1
| Ndb_api_trans_commit_count_session | 0
| Ndb_api_trans_abort_count_session | 0
| Ndb_api_trans_close_count_session | 1
| Ndb_api_pk_op_count_session | 0
| Ndb_api_uk_op_count_session | 0
| Ndb_api_table_scan_count_session | 1
| Ndb_api_range_scan_count_session | 0
| Ndb_api_pruned_scan_count_session | 0
| Ndb_api_scan_batch_count_session | 2
| Ndb_api_read_row_count_session | 2
| Ndb_api_trans_local_read_row_count_session | 2
| Ndb_api_adaptive_send_forced_count_session | 1
| Ndb_api_adaptive_send_unforced_count_session | 0
| Ndb_api_adaptive_send_deferred_count_session | 0
90 rows in set (0.00 sec)
```


These status variables are also available from the Performance Schema session_status and global_status tables, as shown here:
```
mysql> SELECT * FROM performance_schema.session_status
        -> WHERE VARIABLE_NAME LIKE 'ndb_api%';
+-----------------------------------------------+---------------+
| VARIABLE_NAME | VARIABLE_VALUE |
| Ndb_api_wait_exec_complete_count | 11
| Ndb_api_wait_scan_result_count | 14
| Ndb_api_wait_meta_request_count | 81
| Ndb_api_wait_nanos_count | 119485762051
| Ndb_api_bytes_sent_count | 3476
| Ndb_api_bytes_received_count |105372
| Ndb_api_trans_start_count | 10
| Ndb_api_trans_commit_count | 2
| Ndb_api_trans_abort_count | 4
| Ndb_api_trans_close_count | 10
| Ndb_api_pk_op_count | 6
| Ndb_api_uk_op_count | 0
| Ndb_api_table_scan_count | 3
| Ndb_api_range_scan_count | 1
| Ndb_api_pruned_scan_count | 0
| Ndb_api_scan_batch_count | 3
| Ndb_api_read_row_count | 11
| Ndb_api_trans_local_read_row_count |9
| Ndb_api_adaptive_send_forced_count | 5
| Ndb_api_adaptive_send_unforced_count | 11
| Ndb_api_adaptive_send_deferred_count | 0
| Ndb_api_event_data_count | 0
| Ndb_api_event_nondata_count | 0
| Ndb_api_event_bytes_count | 0
| Ndb_api_event_data_count_injector | 0
| Ndb_api_event_nondata_count_injector | 0
| Ndb_api_event_bytes_count_injector | 0
| Ndb_api_wait_exec_complete_count_slave | 0
| Ndb_api_wait_scan_result_count_slave | 0
| Ndb_api_wait_meta_request_count_slave | 0
| Ndb_api_wait_nanos_count_slave | 0
| Ndb_api_bytes_sent_count_slave | 0
| Ndb_api_bytes_received_count_slave | 0
| Ndb_api_trans_start_count_slave | 0
```

```
| Ndb_api_trans_commit_count_slave | 0
| Ndb_api_trans_abort_count_slave | 0
| Ndb_api_trans_close_count_slave | 0
| Ndb_api_pk_op_count_slave | 0
| Ndb_api_uk_op_count_slave | 0
| Ndb_api_table_scan_count_slave | 0
| Ndb_api_range_scan_count_slave | 0
| Ndb_api_pruned_scan_count_slave | 0
| Ndb_api_scan_batch_count_slave | 0
| Ndb_api_read_row_count_slave | 0
| Ndb_api_trans_local_read_row_count_slave | 0
| Ndb_api_adaptive_send_forced_count_slave | 0
| Ndb_api_adaptive_send_unforced_count_slave | 0
| Ndb_api_adaptive_send_deferred_count_slave | 0
| Ndb_api_wait_exec_complete_count_replica | 0
| Ndb_api_wait_scan_result_count_replica | 0
| Ndb_api_wait_meta_request_count_replica | 0
| Ndb_api_wait_nanos_count_replica | 0
| Ndb_api_bytes_sent_count_replica | 0
| Ndb_api_bytes_received_count_replica | 0
| Ndb_api_trans_start_count_replica | 0
| Ndb_api_trans_commit_count_replica | 0
| Ndb_api_trans_abort_count_replica | 0
| Ndb_api_trans_close_count_replica | 0
| Ndb_api_pk_op_count_replica | 0
| Ndb_api_uk_op_count_replica | 0
| Ndb_api_table_scan_count_replica | 0
| Ndb_api_range_scan_count_replica | 0
| Ndb_api_pruned_scan_count_replica | 0
| Ndb_api_scan_batch_count_replica | 0
| Ndb_api_read_row_count_replica | 0
| Ndb_api_trans_local_read_row_count_replica | 0
| Ndb_api_adaptive_send_forced_count_replica | 0
| Ndb_api_adaptive_send_unforced_count_replica | 0
| Ndb_api_adaptive_send_deferred_count_replica | 0
| Ndb_api_wait_exec_complete_count_session | 0
| Ndb_api_wait_scan_result_count_session | 3
| Ndb_api_wait_meta_request_count_session | 6
| Ndb_api_wait_nanos_count_session | 2022486
| Ndb_api_bytes_sent_count_session | 268
| Ndb_api_bytes_received_count_session | 10332
| Ndb_api_trans_start_count_session | 1
| Ndb_api_trans_commit_count_session | 0
| Ndb_api_trans_abort_count_session | 0
| Ndb_api_trans_close_count_session | 1
| Ndb_api_pk_op_count_session | 0
| Ndb_api_uk_op_count_session | 0
| Ndb_api_table_scan_count_session | 1
| Ndb_api_range_scan_count_session | 0
| Ndb_api_pruned_scan_count_session | 0
| Ndb_api_scan_batch_count_session | 2
| Ndb_api_read_row_count_session | 2
| Ndb_api_trans_local_read_row_count_session | 2
| Ndb_api_adaptive_send_forced_count_session | 1
| Ndb_api_adaptive_send_unforced_count_session | 0
| Ndb_api_adaptive_send_deferred_count_session | 0
+--------------------------
mysql> SELECT * FROM performance_schema.global_status
        -> WHERE VARIABLE_NAME LIKE 'ndb_api%';
+------------------------------------------------+-----------------
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4373.jpg?height=342&width=1091&top_left_y=2311&top_left_x=351)
```
| Ndb_api_trans_abort_count | 4
| Ndb_api_trans_close_count | 10
| Ndb_api_pk_op_count | 6
| Ndb_api_uk_op_count | 0
| Ndb_api_table_scan_count | 3
| Ndb_api_range_scan_count | 1
| Ndb_api_pruned_scan_count | 0
| Ndb_api_scan_batch_count | 3
| Ndb_api_read_row_count | 11
| Ndb_api_trans_local_read_row_count |9
| Ndb_api_adaptive_send_forced_count | 5
| Ndb_api_adaptive_send_unforced_count | 11
| Ndb_api_adaptive_send_deferred_count | 0
| Ndb_api_event_data_count | 0
| Ndb_api_event_nondata_count | 0
| Ndb_api_event_bytes_count | 0
| Ndb_api_event_data_count_injector | 0
| Ndb_api_event_nondata_count_injector | 0
| Ndb_api_event_bytes_count_injector | 0
| Ndb_api_wait_exec_complete_count_slave | 0
| Ndb_api_wait_scan_result_count_slave | 0
| Ndb_api_wait_meta_request_count_slave | 0
| Ndb_api_wait_nanos_count_slave | 0
| Ndb_api_bytes_sent_count_slave | 0
| Ndb_api_bytes_received_count_slave | 0
| Ndb_api_trans_start_count_slave | 0
| Ndb_api_trans_commit_count_slave | 0
| Ndb_api_trans_abort_count_slave | 0
| Ndb_api_trans_close_count_slave | 0
| Ndb_api_pk_op_count_slave | 0
| Ndb_api_uk_op_count_slave | 0
| Ndb_api_table_scan_count_slave | 0
| Ndb_api_range_scan_count_slave | 0
| Ndb_api_pruned_scan_count_slave | 0
| Ndb_api_scan_batch_count_slave | 0
| Ndb_api_read_row_count_slave | 0
| Ndb_api_trans_local_read_row_count_slave | 0
| Ndb_api_adaptive_send_forced_count_slave | 0
| Ndb_api_adaptive_send_unforced_count_slave | 0
| Ndb_api_adaptive_send_deferred_count_slave | 0
| Ndb_api_wait_exec_complete_count_replica | 0
| Ndb_api_wait_scan_result_count_replica | 0
| Ndb_api_wait_meta_request_count_replica | 0
| Ndb_api_wait_nanos_count_replica | 0
| Ndb_api_bytes_sent_count_replica | 0
| Ndb_api_bytes_received_count_replica | 0
| Ndb_api_trans_start_count_replica | 0
| Ndb_api_trans_commit_count_replica | 0
| Ndb_api_trans_abort_count_replica | 0
| Ndb_api_trans_close_count_replica | 0
| Ndb_api_pk_op_count_replica | 0
| Ndb_api_uk_op_count_replica | 0
| Ndb_api_table_scan_count_replica | 0
| Ndb_api_range_scan_count_replica | 0
| Ndb_api_pruned_scan_count_replica | 0
| Ndb_api_scan_batch_count_replica | 0
| Ndb_api_read_row_count_replica | 0
| Ndb_api_trans_local_read_row_count_replica | 0
| Ndb_api_adaptive_send_forced_count_replica | 0
| Ndb_api_adaptive_send_unforced_count_replica | 0
| Ndb_api_adaptive_send_deferred_count_replica | 0
| Ndb_api_wait_exec_complete_count_session | 0
| Ndb_api_wait_scan_result_count_session | 3
| Ndb_api_wait_meta_request_count_session | 6
| Ndb_api_wait_nanos_count_session | 2022486
| Ndb_api_bytes_sent_count_session | 268
| Ndb_api_bytes_received_count_session | 10332
| Ndb_api_trans_start_count_session | 1
| Ndb_api_trans_commit_count_session | 0
| Ndb_api_trans_abort_count_session | 0
| Ndb_api_trans_close_count_session | 1
| Ndb_api_pk_op_count_session | 0
```

```
Ndb_api_uk_op_count_session | 0
Ndb_api_table_scan_count_session |1
Ndb_api_range_scan_count_session | 0
Ndb_api_pruned_scan_count_session |0
Ndb_api_scan_batch_count_session |2
Ndb_api_read_row_count_session |2
Ndb_api_trans_local_read_row_count_session |2
Ndb_api_adaptive_send_forced_count_session | 1
Ndb_api_adaptive_send_unforced_count_session | 0
Ndb_api_adaptive_send_deferred_count_session | 0
+--------------------------
```


Each Ndb object has its own counters. NDB API applications can read the values of the counters for use in optimization or monitoring. For multithreaded clients which use more than one Ndb object concurrently, it is also possible to obtain a summed view of counters from all Ndb objects belonging to a given Ndb_cluster_connection.

Four sets of these counters are exposed. One set applies to the current session only; the other 3 are global. This is in spite of the fact that their values can be obtained as either session or global status variables in the mysql client. This means that specifying the SESSION or GLOBAL keyword with SHOW STATUS has no effect on the values reported for NDB API statistics status variables, and the value for each of these variables is the same whether the value is obtained from the equivalent column of the session_status or the global_status table.
- Session counters (session specific)

Session counters relate to the Ndb objects in use by (only) the current session. Use of such objects by other MySQL clients does not influence these counts.

In order to minimize confusion with standard MySQL session variables, we refer to the variables that correspond to these NDB API session counters as "_session variables", with a leading underscore.
- Replica counters (global)

This set of counters relates to the Ndb objects used by the replica SQL thread, if any. If this mysqld does not act as a replica, or does not use NDB tables, then all of these counts are 0.

We refer to the related status variables as "_replica variables" (with a leading underscore).
- Injector counters (global)

Injector counters relate to the Ndb object used to listen to cluster events by the binary log injector thread. Even when not writing a binary log, mysqld processes attached to an NDB Cluster continue to listen for some events, such as schema changes.

We refer to the status variables that correspond to NDB API injector counters as "_injector variables" (with a leading underscore).
- Server (Global) counters (global)

This set of counters relates to all Ndb objects currently used by this mysqld. This includes all MySQL client applications, the replica SQL thread (if any), the binary log injector, and the NDB utility thread.

We refer to the status variables that correspond to these counters as "global variables" or "mysqldlevel variables".

You can obtain values for a particular set of variables by additionally filtering for the substring session, replica, or injector in the variable name (along with the common prefix Ndb_api). For _session variables, this can be done as shown here:
```
mysql> SHOW STATUS LIKE 'ndb_api%session';
+----------------------------------------------+--------+
```


\begin{tabular}{|l|l|}
\hline Variable_name & Value \\
\hline & \\
\hline Ndb_api_wait_exec_complete_count_session & 0 \\
\hline Ndb_api_wait_scan_result_count_session & 3 \\
\hline Ndb_api_wait_meta_request_count_session & 6 \\
\hline Ndb_api_wait_nanos_count_session & 2022486 \\
\hline Ndb_api_bytes_sent_count_session & 268 \\
\hline Ndb_api_bytes_received_count_session & 10332 \\
\hline Ndb_api_trans_start_count_session & 1 \\
\hline Ndb_api_trans_commit_count_session & 0 \\
\hline Ndb_api_trans_abort_count_session & 0 \\
\hline Ndb_api_trans_close_count_session & 1 \\
\hline Ndb_api_pk_op_count_session & 0 \\
\hline Ndb_api_uk_op_count_session & 0 \\
\hline Ndb_api_table_scan_count_session & 1 \\
\hline Ndb_api_range_scan_count_session & 0 \\
\hline Ndb_api_pruned_scan_count_session & 0 \\
\hline Ndb_api_scan_batch_count_session & 2 \\
\hline Ndb_api_read_row_count_session & 2 \\
\hline Ndb_api_trans_local_read_row_count_session & 2 \\
\hline Ndb_api_adaptive_send_forced_count_session & 1 \\
\hline Ndb_api_adaptive_send_unforced_count_session & 0 \\
\hline Ndb_api_adaptive_send_deferred_count_session & 0 \\
\hline 21 rows in set ( 0.00 sec ) & \\
\hline
\end{tabular}

To obtain a listing of the NDB API mysqld-level status variables, filter for variable names beginning with ndb_api and ending in _count, like this:
```
mysql> SELECT * FROM performance_schema.session_status
    -> WHERE VARIABLE_NAME LIKE 'ndb_api%count';
+---------------------------------------+-----------------+
+---------------------------------------+-----------------+
| NDB_API_WAIT_SCAN_RESULT_COUNT | 3
| NDB_API_WAIT_META_REQUEST_COUNT | 28
| NDB_API_WAIT_NANOS_COUNT |53756398
| NDB_API_BYTES_SENT_COUNT | 1060
| NDB_API_BYTES_RECEIVED_COUNT |9724
| NDB_API_TRANS_START_COUNT | 3
| NDB_API_TRANS_COMMIT_COUNT | 2
| NDB_API_TRANS_ABORT_COUNT | 0
| NDB_API_TRANS_CLOSE_COUNT | 3
| NDB_API_PK_OP_COUNT | 2
| NDB_API_UK_OP_COUNT | 0
| NDB_API_TABLE_SCAN_COUNT | 1
| NDB_API_RANGE_SCAN_COUNT | 0
| NDB_API_PRUNED_SCAN_COUNT | 0
| NDB_API_SCAN_BATCH_COUNT | 0
| NDB_API_READ_ROW_COUNT | 2
| NDB_API_TRANS_LOCAL_READ_ROW_COUNT | 2
| NDB_API_EVENT_DATA_COUNT | 0
| NDB_API_EVENT_NONDATA_COUNT | 0
| NDB_API_EVENT_BYTES_COUNT | 0
+---------------------------------------+----------------+
21 rows in set (0.09 sec)
```


Not all counters are reflected in all 4 sets of status variables. For the event counters

DataEventsRecvdCount, NondataEventsRecvdCount, and EventBytesRecvdCount, only _injector and mysqld-level NDB API status variables are available:
```
mysql> SHOW STATUS LIKE 'ndb_api%event%';
+----------------------------------------+-------+

\begin{tabular}{|l|l|}
\hline Variable_name & Value \\
\hline Ndb_api_event_data_count_injector & 0 \\
\hline Ndb_api_event_nondata_count_injector & 0 \\
\hline Ndb_api_event_bytes_count_injector & 0 \\
\hline Ndb_api_event_data_count & 0 \\
\hline Ndb_api_event_nondata_count & 0 \\
\hline Ndb_api_event_bytes_count & 0 \\
\hline
\end{tabular}
```

```
+-------------------------
```

_injector status variables are not implemented for any other NDB API counters, as shown here:
```
mysql> SHOW STATUS LIKE 'ndb_api%injector%';
+----------------------------------------+-------+
| Variable_name | Value |
+---------------------------------------+-------+
| Ndb_api_event_data_count_injector | 0
| Ndb_api_event_nondata_count_injector | 0
| Ndb_api_event_bytes_count_injector | 0
+---------------------------------------+-------+
3 rows in set (0.00 sec)
```


The names of the status variables can easily be associated with the names of the corresponding counters. Each NDB API statistics counter is listed in the following table with a description as well as the names of any MySQL server status variables corresponding to this counter.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.39 NDB API statistics counters}
\begin{tabular}{|l|l|l|}
\hline Counter Name & Description & \begin{tabular}{l}
Status Variables (by statistic type): \\
- Session \\
- Replica (slave) \\
- Injector \\
- Server
\end{tabular} \\
\hline WaitExecCompleteCount & Number of times thread has been blocked while waiting for execution of an operation to complete. Includes all execute() calls as well as implicit executes for blob operations and auto-increment not visible to clients. & \begin{tabular}{l}
- Ndb_api_wait_exec_complete_cor \\
- Ndb_api_wait_exec_complete_co \\
- [none] \\
- Ndb_api_wait_exec_complete_co
\end{tabular} \\
\hline WaitScanResultCount & Number of times thread has been blocked while waiting for a scan-based signal, such waiting for additional results, or for a scan to close. & \begin{tabular}{l}
- Ndb_api_wait_scan_result_coun \\
- Ndb_api_wait_scan_result_coun \\
- [none] \\
- Ndb_api_wait_scan_result_coun
\end{tabular} \\
\hline WaitMetaRequestCount & Number of times thread has been blocked waiting for a metadata-based signal; this can occur when waiting for a DDL operation or for an epoch to be started (or ended). & \begin{tabular}{l}
- Ndb_api_wait_meta_request_cour \\
- Ndb_api_wait_meta_request_cour \\
- [none] \\
- Ndb_api_wait_meta_request_cou
\end{tabular} \\
\hline WaitNanosCount & Total time (in nanoseconds) spent waiting for some type of signal from the data nodes. & \begin{tabular}{l}
- Ndb_api_wait_nanos_count_sess \\
- Ndb_api_wait_nanos_counE_repl \\
- [none] \\
- Ndb_api_wait_nanos_counf
\end{tabular} \\
\hline BytesSentCount & Amount of data (in bytes) sent to the data nodes & - Ndb_api_bytes_sent_counf_sess \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Counter Name & Description & \begin{tabular}{l}
Status Variables (by statistic type): \\
- Session \\
- Replica (slave) \\
- Injector \\
- Server \\
- Ndb_api_bytes_sent_count_replica \\
- [none] \\
- Ndb_api_bytes_sent_count
\end{tabular} \\
\hline BytesRecvdCount & Amount of data (in bytes) received from the data nodes & \begin{tabular}{l}
- Ndb_api_bytes_received_count_ses \\
- Ndb_api_bytes_received_count_sla \\
- [none] \\
- Ndb_api_bytes_received_count
\end{tabular} \\
\hline TransStartCount & Number of transactions started. & \begin{tabular}{l}
- Ndb_api_trans_start_count_sessiol \\
- Ndb_api_trans_start_count_replic \\
- [none] \\
- Ndb_api_trans_start_count
\end{tabular} \\
\hline TransCommitCount & Number of transactions committed. & \begin{tabular}{l}
- Ndb_api_trans_commit_count_sessi \\
- Ndb_api_trans_commit_count_repli \\
- [none] \\
- Ndb_api_trans_commit_count
\end{tabular} \\
\hline TransAbortCount & Number of transactions aborted. & \begin{tabular}{l}
- Ndb_api_trans_abort_count_sessiol \\
- Ndb_api_trans_abort_count_replic \\
- [none] \\
- Ndb_api_trans_abort_count
\end{tabular} \\
\hline TransCloseCount & Number of transactions aborted. (This value may be greater than the sum of TransCommitCount and TransAbortCount.) & \begin{tabular}{l}
- Ndb_api_trans_close_count_sessiol \\
- Ndb_api_trans_close_count_replic \\
- [none] \\
- Ndb_api_trans_close_count
\end{tabular} \\
\hline PkOpCount & Number of operations based on or using primary keys. This count includes blob-part table operations, implicit unlocking operations, and auto-increment operations, as well as primary key operations normally visible to MySQL clients. & \begin{tabular}{l}
- Ndb_api_pk_op_count_session \\
- Ndb_api_pk_op_count_replica \\
- [none] \\
- Ndb_api_pk_op_count
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Counter Name & Description & \begin{tabular}{l}
Status Variables (by statistic type): \\
- Session \\
- Replica (slave) \\
- Injector \\
- Server
\end{tabular} \\
\hline UkOpCount & Number of operations based on or using unique keys. & \begin{tabular}{l}
- Ndb_api_uk_op_count_session \\
- Ndb_api_uk_op_count_replica \\
- [none] \\
- Ndb_api_uk_op_count
\end{tabular} \\
\hline TableScanCount & Number of table scans that have been started. This includes scans of internal tables. & \begin{tabular}{l}
- Ndb_api_table_scan_count_sess \\
- Ndb_api_table_scan_counf_repl \\
- [none] \\
- Ndb_api_table_scan_coun=
\end{tabular} \\
\hline RangeScanCount & Number of range scans that have been started. & \begin{tabular}{l}
- Ndb_api_range_scan_counf_sess \\
- Ndb_api_range_scan_counf_repl \\
- [none] \\
- Ndb_api_range_scan_coun=
\end{tabular} \\
\hline PrunedScanCount & Number of scans that have been pruned to a single partition. & \begin{tabular}{l}
- Ndb_api_pruned_scan_count_ses \\
- Ndb_api_pruned_scan_count_rep \\
- [none] \\
- Ndb_api_pruned_scan_count
\end{tabular} \\
\hline ScanBatchCount & Number of batches of rows received. (A batch in this context is a set of scan results from a single fragment.) & \begin{tabular}{l}
- Ndb_api_scan_batch_counf_sess \\
- Ndb_api_scan_batch_counf_repl \\
- [none] \\
- Ndb_api_scan_batch_counf
\end{tabular} \\
\hline ReadRowCount & Total number of rows that have been read. Includes rows read using primary key, unique key, and scan operations. & \begin{tabular}{l}
- Ndb_api_read_row_count_sessio \\
- Ndb_api_read_row_count_replic \\
- [none] \\
- Ndb_api_read_row_count
\end{tabular} \\
\hline TransLocalReadRowCount & Number of rows read from the data same node on which the transaction was being run. & \begin{tabular}{l}
- Ndb_api_trans_local_read_row_ \\
- Ndb_api_trans_local_read_row \\
- [none] \\
- Ndb_api_trans_local_read_row_
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Counter Name & Number of row change events received. & \begin{tabular}{l}
Status Variables (by statistic type): \\
- Session \\
- Replica (slave) \\
- Injector \\
- Server
\end{tabular} \\
\hline NondataEventsRecvdCount & Number of events received, other than row change events. & \begin{tabular}{l}
- [none] \\
- [none] \\
- Ndb_api_event_nondata_count_inje \\
- Ndb_api_event_nondata_count
\end{tabular} \\
\hline EventBytesRecvdCount & Number of bytes of events received. & \begin{tabular}{l}
- [none] \\
- [none] \\
- Ndb_api_event_bytes_count_inject \\
- Ndb_api_event_bytes_count
\end{tabular} \\
\hline
\end{tabular}

To see all counts of committed transactions-that is, all TransCommitCount counter status variables -you can filter the results of SHOW STATUS for the substring trans_commit_count, like this:
```
mysql> SHOW STATUS LIKE '%trans_commit_count%';
+--------------------------------------+-------+
| Variable_name | Value |
+--------------------------------------+-------+
| Ndb_api_trans_commit_count_session | 1 |
| Ndb_api_trans_commit_count_slave | 0
| Ndb_api_trans_commit_count | 2
3 rows in set (0.00 sec)
```


From this you can determine that 1 transaction has been committed in the current mysql client session, and 2 transactions have been committed on this mysqld since it was last restarted.

You can see how various NDB API counters are incremented by a given SQL statement by comparing the values of the corresponding _session status variables immediately before and after performing the statement. In this example, after getting the initial values from SHOW STATUS, we create in the test database an NDB table, named $t$, that has a single column:
```
mysql> SHOW STATUS LIKE 'ndb_api%session%';
+---------------------------------------------+--------+
| Variable_name | Value |
+----------------------------------------------+--------+
| Ndb_api_wait_exec_complete_count_session | 2
| Ndb_api_wait_scan_result_count_session | 0
| Ndb_api_wait_meta_request_count_session | 3
| Ndb_api_wait_nanos_count_session |820705
| Ndb_api_bytes_sent_count_session | 132
| Ndb_api_bytes_received_count_session | 372
| Ndb_api_trans_start_count_session | 1
```

```
| Ndb_api_trans_commit_count_session | 1
| Ndb_api_trans_abort_count_session | 0
| Ndb_api_trans_close_count_session | 1
| Ndb_api_pk_op_count_session | 1
| Ndb_api_uk_op_count_session | 0
| Ndb_api_table_scan_count_session | 0
| Ndb_api_range_scan_count_session | 0
| Ndb_api_pruned_scan_count_session | 0
| Ndb_api_scan_batch_count_session | 0
| Ndb_api_read_row_count_session | 1
| Ndb_api_trans_local_read_row_count_session | 1
+--------------------------
mysql> USE test;
Database changed
mysql> CREATE TABLE t (c INT) ENGINE NDBCLUSTER;
Query OK, 0 rows affected (0.85 sec)
```


Now you can execute a new SHOW STATUS statement and observe the changes, as shown here (with the changed rows highlighted in the output):
```
mysql> SHOW STATUS LIKE 'ndb_api%session%';
+---------------------------------------------+----------+
| Variable_name | Value |
+---------------------------------------------+-----------+
| Ndb_api_wait_exec_complete_count_session | 8
| Ndb_api_wait_scan_result_count_session | 0
| Ndb_api_wait_meta_request_count_session | 17
| Ndb_api_wait_nanos_count_session | 706871709
| Ndb_api_bytes_sent_count_session | 2376
| Ndb_api_bytes_received_count_session | 3844
| Ndb_api_trans_start_count_session | 4
| Ndb_api_trans_commit_count_session | 4
| Ndb_api_trans_abort_count_session | 0
| Ndb_api_trans_close_count_session | 4
| Ndb_api_pk_op_count_session | 6
| Ndb_api_uk_op_count_session | 0
| Ndb_api_table_scan_count_session | 0
| Ndb_api_range_scan_count_session | 0
| Ndb_api_pruned_scan_count_session | 0
| Ndb_api_scan_batch_count_session | 0
| Ndb_api_read_row_count_session | 2
| Ndb_api_trans_local_read_row_count_session | 1
+---------------------------------------------+----------+
18 rows in set (0.00 sec)
```


Similarly, you can see the changes in the NDB API statistics counters caused by inserting a row into t: Insert the row, then run the same SHOW STATUS statement used in the previous example, as shown here:
```
mysql> INSERT INTO t VALUES (100);
Query OK, 1 row affected (0.00 sec)
mysql> SHOW STATUS LIKE 'ndb_api%session%';
+---------------------------------------------+-----------+
| Variable_name | Value |
| Ndb_api_wait_exec_complete_count_session | 11
| Ndb_api_wait_scan_result_count_session | 6
| Ndb_api_wait_meta_request_count_session | 20
| Ndb_api_wait_nanos_count_session | 707370418 |
| Ndb_api_bytes_sent_count_session | 2724
| Ndb_api_bytes_received_count_session | 4116
| Ndb_api_trans_start_count_session |7
| Ndb_api_trans_commit_count_session | 6
| Ndb_api_trans_abort_count_session | 0
| Ndb_api_trans_close_count_session | 7
| Ndb_api_pk_op_count_session | 8
| Ndb_api_uk_op_count_session | 0
| Ndb_api_table_scan_count_session | 1
```

```
| Ndb_api_range_scan_count_session
| Ndb_api_pruned_scan_count_session
| Ndb_api_scan_batch_count_session
| Ndb_api_read_row_count_session
| Ndb api trans local read row
i_trans_local_read_row_count_session | 2
18 rows in set (0.00 sec)
```


We can make a number of observations from these results:
- Although we created t with no explicit primary key, 5 primary key operations were performed in doing so (the difference in the "before" and "after" values of Ndb_api_pk_op_count_session, or 6 minus 1). This reflects the creation of the hidden primary key that is a feature of all tables using the NDB storage engine.
- By comparing successive values for Ndb_api_wait_nanos_count_session, we can see that the NDB API operations implementing the CREATE TABLE statement waited much longer ( 706871709 - $820705=706051004$ nanoseconds, or approximately 0.7 second) for responses from the data nodes than those executed by the INSERT (707370418-706871709 = 498709 ns or roughly . 0005 second). The execution times reported for these statements in the mysql client correlate roughly with these figures.

On platforms without sufficient (nanosecond) time resolution, small changes in the value of the WaitNanosCount NDB API counter due to SQL statements that execute very quickly may not always be visible in the values of Ndb_api_wait_nanos_count_session, Ndb_api_wait_nanos_count_replica, or Ndb_api_wait_nanos_count.
- The INSERT statement incremented both the ReadRowCount and TransLocalReadRowCount NDB API statistics counters, as reflected by the increased values of Ndb_api_read_row_count_session and Ndb_api_trans_local_read_row_count_session.

\subsection*{25.6.15 ndbinfo: The NDB Cluster Information Database}
ndbinfo is a database containing information specific to NDB Cluster.
This database contains a number of tables, each providing a different sort of data about NDB Cluster node status, resource usage, and operations. You can find more detailed information about each of these tables in the next several sections.
ndbinfo is included with NDB Cluster support in the MySQL Server; no special compilation or configuration steps are required; the tables are created by the MySQL Server when it connects to the cluster. You can verify that ndbinfo support is active in a given MySQL Server instance using SHOW PLUGINS; if ndbinfo support is enabled, you should see a row containing ndbinfo in the Name column and ACTIVE in the Status column, as shown here (emphasized text):
```
mysql> SHOW PLUGINS;
+------------------------------------+--------+-------------------+-------------------
| Name | Status | Type | Library | License |
+------------------------------------+--------+-------------------+--------------------
| binlog | ACTIVE | STORAGE ENGINE | NULL | GPL
| sha256_password | ACTIVE | AUTHENTICATION | NULL | GPL
| caching_sha2_password | ACTIVE | AUTHENTICATION | NULL | GPL
| sha2_cache_cleaner | ACTIVE | AUDIT | NULL | GPL
| daemon_keyring_proxy_plugin | ACTIVE | DAEMON | NULL | GPL
| CSV | ACTIVE | STORAGE ENGINE | NULL | GPL
| MEMORY | ACTIVE | STORAGE ENGINE | NULL | GPL
| InnoDB | ACTIVE | STORAGE ENGINE | NULL | GPL
| INNODB_TRX | ACTIVE | INFORMATION SCHEMA | NULL | GPL
| INNODB_CMP | ACTIVE | INFORMATION SCHEMA | NULL | GPL
| INNODB_CMP_RESET | ACTIVE | INFORMATION SCHEMA | NULL | GPL
| INNODB_CMPMEM | ACTIVE | INFORMATION SCHEMA | NULL | GPL
| INNODB_CMPMEM_RESET | ACTIVE | INFORMATION SCHEMA | NULL | GPL
| INNODB_CMP_PER_INDEX | ACTIVE | INFORMATION SCHEMA | NULL | GPL
| INNODB_CMP_PER_INDEX_RESET | ACTIVE | INFORMATION SCHEMA | NULL | GPL
| INNODB_BUFFER_PAGE | ACTIVE | INFORMATION SCHEMA | NULL | GPL |
```

```

\begin{tabular}{|l|l|l|l|l|l|}
\hline INNODB_BUFFER_PAGE_LRU & ACTIVE & INFORMATION SCHEMA & & NULL & GPL \\
\hline INNODB_BUFFER_POOL_STATS & ACTIVE & INFORMATION SCHEMA & & NULL & GPL \\
\hline INNODB_TEMP_TABLE_INFO & ACTIVE & INFORMATION SCHEMA & & NULL & GPL \\
\hline INNODB_METRICS & ACTIVE & INFORMATION SCHEMA & & NULL & GPL \\
\hline INNODB_FT_DEFAULT_STOPWORD & ACTIVE & INFORMATION SCHEMA & & NULL & GPL \\
\hline INNODB_FT_DELETED & ACTIVE & INFORMATION SCHEMA & & NULL & GPL \\
\hline INNODB_FT_BEING_DELETED & ACTIVE & INFORMATION SCHEMA & & NULL & GPL \\
\hline INNODB_FT_CONFIG & ACTIVE & INFORMATION SCHEMA & & NULL & GPL \\
\hline INNODB_FT_INDEX_CACHE & ACTIVE & INFORMATION SCHEMA & & NULL & GPL \\
\hline INNODB_FT_INDEX_TABLE & ACTIVE & INFORMATION SCHEMA & & NULL & GPL \\
\hline INNODB_TABLES & ACTIVE & INFORMATION SCHEMA & & NULL & GPL \\
\hline INNODB_TABLESTATS & ACTIVE & INFORMATION SCHEMA & & NULL & GPL \\
\hline INNODB_INDEXES & ACTIVE & INFORMATION SCHEMA & & NULL & GPL \\
\hline INNODB_TABLESPACES & ACTIVE & INFORMATION SCHEMA & & NULL & GPL \\
\hline INNODB_COLUMNS & ACTIVE & INFORMATION SCHEMA & & NULL & GPL \\
\hline INNODB_VIRTUAL & ACTIVE & INFORMATION SCHEMA & & NULL & GPL \\
\hline INNODB_CACHED_INDEXES & ACTIVE & INFORMATION SCHEMA & & NULL & GPL \\
\hline INNODB_SESSION_TEMP_TABLESPACES & ACTIVE & INFORMATION SCHEMA & & NULL & GPL \\
\hline MyISAM & ACTIVE & STORAGE ENGINE & & NULL & GPL \\
\hline MRG_MYISAM & ACTIVE & STORAGE ENGINE & & NULL & GPL \\
\hline PERFORMANCE_SCHEMA & ACTIVE & STORAGE ENGINE & & NULL & GPL \\
\hline TempTable & ACTIVE & STORAGE ENGINE & & NULL & GPL \\
\hline ARCHIVE & ACTIVE & STORAGE ENGINE & & NULL & GPL \\
\hline BLACKHOLE & ACTIVE & STORAGE ENGINE & & NULL & GPL \\
\hline ndbcluster & ACTIVE & STORAGE ENGINE & & NULL & GPL \\
\hline ndbinfo & ACTIVE & STORAGE ENGINE & & NULL & GPL \\
\hline ndb_transid_mysql_connection_map & ACTIVE & INFORMATION SCHEMA & & NULL & GPL \\
\hline ngram & ACTIVE & FTPARSER & & NULL & GPL \\
\hline mysqlx_cache_cleaner & ACTIVE & AUDIT & & NULL & GPL \\
\hline mysqlx & ACTIVE & DAEMON & & NULL & GPL \\
\hline mysql_native_password & ACTIVE & AUTHENTICATION & & NULL & GPL \\
\hline
\end{tabular}
47 rows in set (0.00 sec)
```


You can also do this by checking the output of SHOW ENGINES for a line including ndbinfo in the Engine column and YES in the Support column, as shown here (emphasized text):
```
mysql> SHOW ENGINES\G
************************* 1. row ******************************
        Engine: MEMORY
        Support: YES
        Comment: Hash based, stored in memory, useful for temporary tables
Transactions: NO
            XA: NO
    Savepoints: NO
************************** 2. row *****************************************
        Engine: InnoDB
        Support: DEFAULT
        Comment: Supports transactions, row-level locking, and foreign keys
Transactions: YES
            XA: YES
    Savepoints: YES
************************** 3. row *****************************************
        Engine: PERFORMANCE_SCHEMA
        Support: YES
        Comment: Performance Schema
Transactions: NO
            XA: NO
    Savepoints: NO
************************** 4. row *****************************************
        Engine: MyISAM
        Support: YES
        Comment: MyISAM storage engine
Transactions: NO
            XA: NO
    Savepoints: NO
************************** 5. row *****************************************
        Engine: ndbinfo
        Support: YES
        Comment: MySQL Cluster system information storage engine
Transactions: NO
            XA: NO
```

```
    Savepoints: NO
************************** 6. row
            Engine: MRG_MYISAM
        Support: YES
        Comment: Collection of identical MyISAM tables
Transactions: NO
            XA: NO
    Savepoints: NO
************************** 7. row ******************************
            Engine: BLACKHOLE
        Support: YES
        Comment: /dev/null storage engine (anything you write to it disappears)
Transactions: NO
                XA: NO
    Savepoints: NO
************************** 8. row *****************************************
            Engine: CSV
        Support: YES
        Comment: CSV storage engine
Transactions: NO
                XA: NO
    Savepoints: NO
************************** 9. row *****************************************
            Engine: ARCHIVE
            Support: YES
            Comment: Archive storage engine
Transactions: NO
                XA: NO
    Savepoints: NO
************************** 10. row ****************************************
                Engine: ndbcluster
            Support: YES
            Comment: Clustered, fault-tolerant tables
Transactions: YES
            XA: NO
    Savepoints: NO
10 rows in set (0.01 sec)
```


If ndbinfo support is enabled, then you can access ndbinfo using SQL statements in mysql or another MySQL client. For example, you can see ndbinfo listed in the output of SHOW DATABASES, as shown here (emphasized text):
```
mysql> SHOW DATABASES;
+----------------------+
| Database |
+---------------------+
| information_schema |
| mysql
| ndbinfo
| performance_schema |
| sys |
+---------------------+
rows in set (0.04 sec)
```


If the mysqld process was not started with the --ndbcluster option, ndbinfo is not available and is not displayed by SHOW DATABASES. If mysqld was formerly connected to an NDB Cluster but the cluster becomes unavailable (due to events such as cluster shutdown, loss of network connectivity, and so forth), ndbinfo and its tables remain visible, but an attempt to access any tables (other than blocks or config_params) fails with Got error 157 'Connection to NDB failed' from NDBINFO.

With the exception of the blocks and config_params tables, what we refer to as ndbinfo "tables" are actually views generated from internal NDB tables not normally visible to the MySQL Server. You can make these tables visible by setting the ndbinfo_show_hidden system variable to ON (or 1), but this is normally not necessary.

All ndbinfo tables are read-only, and are generated on demand when queried. Because many of them are generated in parallel by the data nodes while other are specific to a given SQL node, they are not guaranteed to provide a consistent snapshot.

In addition, pushing down of joins is not supported on ndbinfo tables; so joining large ndbinfo tables can require transfer of a large amount of data to the requesting API node, even when the query makes use of a WHERE clause.
ndbinfo tables are not included in the query cache. (Bug \#59831)
You can select the ndbinfo database with a USE statement, and then issue a SHOW TABLES statement to obtain a list of tables, just as for any other database, like this:
```
mysql> USE ndbinfo;
Database changed
mysql> SHOW TABLES;
+----------------------------------+
| Tables_in_ndbinfo |
+----------------------------------+
| arbitrator_validity_detail
| arbitrator_validity_summary
| backup_id
| blobs
| blocks
| certificates
| cluster_locks
| cluster_operations
| cluster_transactions
| config_nodes
| config_params
| config_values
| counters
| cpudata
| cpudata_1sec
| cpudata_20sec
| cpudata_50ms
| cpuinfo
| cpustat
| cpustat_1sec
| cpustat_20sec
| cpustat_50ms
| dict_obj_info
| dict_obj_tree
| dict_obj_types
| dictionary_columns
| dictionary_tables
| disk_write_speed_aggregate
| disk_write_speed_aggregate_node
| disk_write_speed_base
| diskpagebuffer
| diskstat
| diskstats_1sec
| error_messages
| events
| files
| foreign_keys
| hash_maps
| hwinfo
| index_columns
| index_stats
| locks_per_fragment
| logbuffers
| logspaces
| membership
| memory_per_fragment
| memoryusage
| nodes
| operations_per_fragment
| pgman_time_track_stats
| processes
| resources
| restart_info
| server_locks
| server_operations
```

```
| server_transactions
| table_distribution_status
| table_fragments
| table_info
| table_replicas
| tc_time_track_stats
| threadblocks
| threads
| threadstat
| transporter_details
| transporters
+----------------------------------+
66 rows in set (0.00 sec)
```


All ndbinfo tables use the NDB storage engine; however, an ndbinfo entry still appears in the output of SHOW ENGINES and SHOW PLUGINS as described previously.

You can execute SELECT statements against these tables, just as you would normally expect:
```
mysql> SELECT * FROM memoryusage;
+---------+-----------------------+--------+------------+-----------+------------
| node_id | memory_type | used | used_pages | total | total_pages |
+----------+-----------------------+--------+------------+------------------------

\begin{tabular}{|l|l|l|l|l|l|}
\hline 5 & Data memory & 425984 & 13 & 2147483648 & 65536 \\
\hline 5 & Long message buffer & 393216 & 1536 & 67108864 & 262144 \\
\hline 6 & Data memory & 425984 & 13 & 2147483648 & 65536 \\
\hline 6 & Long message buffer & 393216 & 1536 & 67108864 & 262144 \\
\hline 7 & Data memory & 425984 & 13 & 2147483648 & 65536 \\
\hline 7 & Long message buffer & 393216 & 1536 & 67108864 & 262144 \\
\hline 8 & Data memory & 425984 & 13 & 2147483648 & 65536 \\
\hline 8 & Long message buffer & 393216 & 1536 & 67108864 & 262144 \\
\hline
\end{tabular}
+---------+----------------------+--------+-----------+-----------+-------------
8 rows in set (0.09 sec)
```


More complex queries, such as the two following SELECT statements using the memoryusage table, are possible:
```
mysql> SELECT SUM(used) as 'Data Memory Used, All Nodes'
    > FROM memoryusage
    > WHERE memory_type = 'Data memory';
+-------------------------------+
| Data Memory Used, All Nodes |
+-------------------------------+
| 6460 |
+-------------------------------+
1 row in set (0.09 sec)
mysql> SELECT SUM(used) as 'Long Message Buffer, All Nodes'
    > FROM memoryusage
    > WHERE memory_type = 'Long message buffer';
+--------------------------------------+
| Long Message Buffer Used, All Nodes |
+---------------------------------------+
| 1179648 |
+--------------------------------------+
1 row in set (0.08 sec)
```

ndbinfo table and column names are case-sensitive (as is the name of the ndbinfo database itself). These identifiers are in lowercase. Trying to use the wrong lettercase results in an error, as shown in this example:
```
mysql> SELECT * FROM nodes;
+----------+---------+---------+-------------+-------------------
| node_id | uptime | status | start_phase | config_generation |
+----------+---------+---------+-------------+-------------------
| 5 17707 STARTED | 0
| 7 | 17705 | STARTED | 0
| 8 | 17704 | STARTED | 0 | 1 |
4 rows in set (0.06 sec)
```

```
mysql> SELECT * FROM Nodes;
ERROR 1146 (42S02): Table 'ndbinfo.Nodes' doesn't exist
```

mysqldump ignores the ndbinfo database entirely, and excludes it from any output. This is true even when using the --databases or --all-databases option.

NDB Cluster also maintains tables in the INFORMATION_SCHEMA information database, including the FILES table which contains information about files used for NDB Cluster Disk Data storage, and the ndb_transid_mysql_connection_map table, which shows the relationships between transactions, transaction coordinators, and NDB Cluster API nodes. For more information, see the descriptions of the tables or Section 25.6.16, "INFORMATION_SCHEMA Tables for NDB Cluster".

\subsection*{25.6.15.1 The ndbinfo arbitrator_validity_detail Table}

The arbitrator_validity_detail table shows the view that each data node in the cluster has of the arbitrator. It is a subset of the membership table.

The arbitrator_validity_detail table contains the following columns:
- node_id

This node's node ID
- arbitrator

Node ID of arbitrator
- arb_ticket

Internal identifier used to track arbitration
- arb_connected

Whether this node is connected to the arbitrator; either of Yes or No
- arb_state

Arbitration state

\section*{Notes}

The node ID is the same as that reported by ndb_mgm -e "SHOW".
All nodes should show the same arbitrator and arb_ticket values as well as the same arb_state value. Possible arb_state values are ARBIT_NULL, ARBIT_INIT, ARBIT_FIND, ARBIT_PREP1, ARBIT_PREP2, ARBIT_START, ARBIT_RUN, ARBIT_CHOOSE, ARBIT_CRASH, and UNKNOWN.
arb_connected shows whether the current node is connected to the arbitrator.

\subsection*{25.6.15.2 The ndbinfo arbitrator_validity_summary Table}

The arbitrator_validity_summary table provides a composite view of the arbitrator with regard to the cluster's data nodes.

The arbitrator_validity_summary table contains the following columns:
- arbitrator

Node ID of arbitrator
- arb_ticket

Internal identifier used to track arbitration
- arb_connected

Whether this arbitrator is connected to the cluster
- consensus_count

Number of data nodes that see this node as arbitrator; either of Yes or No

\section*{Notes}

In normal operations, this table should have only 1 row for any appreciable length of time. If it has more than 1 row for longer than a few moments, then either not all nodes are connected to the arbitrator, or all nodes are connected, but do not agree on the same arbitrator.

The arbitrator column shows the arbitrator's node ID.
arb_ticket is the internal identifier used by this arbitrator.
arb_connected shows whether this node is connected to the cluster as an arbitrator.

\subsection*{25.6.15.3 The ndbinfo backup_id Table}

This table provides a way to find the ID of the backup started most recently for this cluster.
The backup_id table contains a single column id, which corresponds to a backup ID taken using the ndb_mgm client START BACKUP command. This table contains a single row.

Example: Assume the following sequence of START BACKUP commands issued in the NDB management client, with no other backups taken since the cluster was first started:
```
ndb_mgm> START BACKUP
Waiting for completed, this may take several minutes
Node 5: Backup 1 started from node 50
Node 5: Backup 1 started from node 50 completed
    StartGCP: 27894 StopGCP: 27897
    #Records: 2057 #LogRecords: 0
    Data: 51580 bytes Log: 0 bytes
ndb_mgm> START BACKUP 5
Waiting for completed, this may take several minutes
Node 5: Backup 5 started from node 50
Node 5: Backup 5 started from node 50 completed
    StartGCP: 27905 StopGCP: 27908
    #Records: 2057 #LogRecords: 0
    Data: 51580 bytes Log: 0 bytes
ndb_mgm> START BACKUP
Waiting for completed, this may take several minutes
Node 5: Backup 6 started from node 50
Node 5: Backup 6 started from node 50 completed
    StartGCP: 27912 StopGCP: 27915
    #Records: 2057 #LogRecords: 0
    Data: 51580 bytes Log: 0 bytes
ndb_mgm> START BACKUP 3
Connected to Management Server at: localhost:1186 (using cleartext)
Waiting for completed, this may take several minutes
Node 5: Backup 3 started from node 50
Node 5: Backup 3 started from node 50 completed
    StartGCP: 28149 StopGCP: 28152
    #Records: 2057 #LogRecords: 0
    Data: 51580 bytes Log: 0 bytes
ndb_mgm>
```


After this, the backup_id table contains the single row shown here, using the mysql client:
```
mysql> USE ndbinfo;
```

```
Database changed
mysql> SELECT * FROM backup_id;
+------+
| id |
+------+
| 3 |
+------+
1 row in set (0.00 sec)
```


If no backups can be found, the table contains a single row with 0 as the id value.

\subsection*{25.6.15.4 The ndbinfo blobs Table}

This table provides about blob values stored in NDB. The blobs table has the columns listed here:
- table_id

Unique ID of the table containing the column
- database_name

Name of the database in which this table resides
- table_name

Name of the table
- column_id

The column's unique ID within the table
- column_name

Name of the column
- inline_size

Inline size of the column
- part_size

Part size of the column
- stripe_size

Stripe size of the column
- blob_table_name

Name of the blob table containing this column's blob data, if any
Rows exist in this table for those NDB table columns that store BLOB, TEXT values taking up more than 255 bytes and thus require the use of a blob table. Parts of JSON values exceeding 4000 bytes in size are also stored in this table. For more information about how NDB Cluster stores columns of such types, see String Type Storage Requirements.

The part and inline sizes of NDB blob columns can be set using CREATE TABLE and ALTER TABLE statements containing NDB table column comments (see NDB_COLUMN Options); this can also be done in NDB API applications (see Column::setPartSize() and setInlineSize()).

\subsection*{25.6.15.5 The ndbinfo blocks Table}

The blocks table is a static table which simply contains the names and internal IDs of all NDB kernel blocks (see NDB Kernel Blocks). It is for use by the other ndbinfo tables (most of which are actually views) in mapping block numbers to block names for producing human-readable output.

The blocks table contains the following columns:
- block_number

Block number
- block_name

Block name

\section*{Notes}

To obtain a list of all block names, simply execute SELECT block_name FROM ndbinfo.blocks. Although this is a static table, its content can vary between different NDB Cluster releases.

\subsection*{25.6.15.6 The ndbinfo certificates Table}

The certificates table provides information about the certificates used by nodes connecting with TLS link encryption (see Section 25.6.19.5, "TLS Link Encryption for NDB Cluster").

The certificates table contains the following columns:
- Node_id

ID of the node where this certificate is found
- Name

Certificate name
- Expires

Expiration date, in mm-nnn-yyyy format (for example, 18-Dec-2023).
- Serial

Serial number

\subsection*{25.6.15.7 The ndbinfo cluster_locks Table}

The cluster_locks table provides information about current lock requests holding and waiting for locks on NDB tables in an NDB Cluster, and is intended as a companion table to cluster_operations. Information obtain from the cluster_locks table may be useful in investigating stalls and deadlocks.

The cluster_locks table contains the following columns:
- node_id

ID of reporting node
- block_instance

ID of reporting LDM instance
- tableid

ID of table containing this row
- fragmentid

ID of fragment containing locked row
- rowid

ID of locked row
- transid

Transaction ID
- mode

Lock request mode
- state

Lock state
- detail

Whether this is first holding lock in row lock queue
- op

Operation type
- duration_millis

Milliseconds spent waiting or holding lock
- lock_num

ID of lock object
- waiting_for

Waiting for lock with this ID

\section*{Notes}

The table ID (tableid column) is assigned internally, and is the same as that used in other ndbinfo tables. It is also shown in the output of ndb_show_tables.

The transaction ID (transid column) is the identifier generated by the NDB API for the transaction requesting or holding the current lock.

The mode column shows the lock mode; this is always one of S (indicating a shared lock) or X (an exclusive lock). If a transaction holds an exclusive lock on a given row, all other locks on that row have the same transaction ID.

The state column shows the lock state. Its value is always one of H (holding) or W (waiting). A waiting lock request waits for a lock held by a different transaction.

When the detail column contains a * (asterisk character), this means that this lock is the first holding lock in the affected row's lock queue; otherwise, this column is empty. This information can be used to help identify the unique entries in a list of lock requests.

The op column shows the type of operation requesting the lock. This is always one of the values READ, INSERT, UPDATE, DELETE, SCAN, or REFRESH.

The duration_millis column shows the number of milliseconds for which this lock request has been waiting or holding the lock. This is reset to 0 when a lock is granted for a waiting request.

The lock ID (lockid column) is unique to this node and block instance.
The lock state is shown in the lock_state column; if this is W , the lock is waiting to be granted, and the waiting_for column shows the lock ID of the lock object this request is waiting for. Otherwise,
the waiting_for column is empty. waiting_for can refer only to locks on the same row, as identified by node_id, block_instance, tableid, fragmentid, and rowid.

\subsection*{25.6.15.8 The ndbinfo cluster_operations Table}

The cluster_operations table provides a per-operation (stateful primary key op) view of all activity in the NDB Cluster from the point of view of the local data management (LQH) blocks (see The DBLQH Block).

The cluster_operations table contains the following columns:
- node_id

Node ID of reporting LQH block
- block_instance

LQH block instance
- transid

Transaction ID
- operation_type

Operation type (see text for possible values)
- state

Operation state (see text for possible values)
- tableid

Table ID
- fragmentid

Fragment ID
- client_node_id

Client node ID
- client_block_ref

Client block reference
- tc_node_id

Transaction coordinator node ID
- tc_block_no

Transaction coordinator block number
- tc_block_instance

Transaction coordinator block instance

\section*{Notes}

The transaction ID is a unique 64-bit number which can be obtained using the NDB API's getTransactionId( ) method. (Currently, the MySQL Server does not expose the NDB API transaction ID of an ongoing transaction.)

The operation_type column can take any one of the values READ, READ-SH, READ-EX, INSERT, UPDATE, DELETE, WRITE, UNLOCK, REFRESH, SCAN, SCAN-SH, SCAN-EX, or <unknown>.

The state column can have any one of the values ABORT_QUEUED, ABORT_STOPPED, COMMITTED, COMMIT_QUEUED, COMMIT_STOPPED, COPY_CLOSE_STOPPED, COPY_FIRST_STOPPED, COPY_STOPPED, COPY_TUPKEY, IDLE, LOG_ABORT_QUEUED, LOG_COMMIT_QUEUED, LOG_COMMIT_QUEUED_WAIT_SIGNAL, LOG_COMMIT_WRITTEN, LOG_COMMIT_WRITTEN_WAIT_SIGNAL, LOG_QUEUED, PREPARED, PREPARED_RECEIVED_COMMIT, SCAN_CHECK_STOPPED, SCAN_CLOSE_STOPPED, SCAN_FIRST_STOPPED, SCAN_RELEASE_STOPPED, SCAN_STATE_USED, SCAN_STOPPED, SCAN_TUPKEY, STOPPED, TC_NOT_CONNECTED, WAIT_ACC, WAIT_ACC_ABORT, WAIT_AI_AFTER_ABORT, WAIT_ATTR, WAIT_SCAN_AI, WAIT_TUP, WAIT_TUPKEYINFO, WAIT_TUP_COMMIT, or WAIT_TUP_TO_ABORT. (If the MySQL Server is running with ndbinfo_show_hidden enabled, you can view this list of states by selecting from the ndb\$dblqh_tcconnect_state table, which is normally hidden.)

You can obtain the name of an NDB table from its table ID by checking the output of ndb_show_tables.

The fragid is the same as the partition number seen in the output of ndb_desc - -extra-partition-info (short form -p).

In client_node_id and client_block_ref, client refers to an NDB Cluster API or SQL node (that is, an NDB API client or a MySQL Server attached to the cluster).

The block_instance and tc_block_instance column provide, respectively, the DBLQH and DBTC block instance numbers. You can use these along with the block names to obtain information about specific threads from the threadblocks table.

\subsection*{25.6.15.9 The ndbinfo cluster_transactions Table}

The cluster_transactions table shows information about all ongoing transactions in an NDB Cluster.

The cluster_transactions table contains the following columns:
- node_id

Node ID of transaction coordinator
- block_instance

TC block instance
- transid

Transaction ID
- state

Operation state (see text for possible values)
- count_operations

Number of stateful primary key operations in transaction (includes reads with locks, as well as DML operations)
- outstanding_operations

Operations still being executed in local data management blocks
- inactive_seconds

Time spent waiting for API
- client_node_id

Client node ID
- client_block_ref

Client block reference

\section*{Notes}

The transaction ID is a unique 64-bit number which can be obtained using the NDB API's getTransactionId() method. (Currently, the MySQL Server does not expose the NDB API transaction ID of an ongoing transaction.)
block_instance refers to an instance of a kernel block. Together with the block name, this number can be used to look up a given instance in the threadblocks table.

The state column can have any one of the values CS_ABORTING, CS_COMMITTING, CS_COMMIT_SENT, CS_COMPLETE_SENT, CS_COMPLETING, CS_CONNECTED, CS_DISCONNECTED, CS_FAIL_ABORTED, CS_FAIL_ABORTING, CS_FAIL_COMMITTED, CS_FAIL_COMMITTING, CS_FAIL_COMPLETED, CS_FAIL_PREPARED, CS_PREPARE_TO_COMMIT, CS_RECEIVING, CS_REC_COMMITTING, CS_RESTART, CS_SEND_FIRE_TRIG_REQ, CS_STARTED, CS_START_COMMITTING, CS_START_SCAN, CS_WAIT_ABORT_CONF, CS_WAIT_COMMIT_CONF, CS_WAIT_COMPLETE_CONF, CS_WAIT_FIRE_TRIG_REQ. (If the MySQL Server is running with ndbinfo_show_hidden enabled, you can view this list of states by selecting from the ndb \$dbtc_apiconnect_state table, which is normally hidden.)

In client_node_id and client_block_ref, client refers to an NDB Cluster API or SQL node (that is, an NDB API client or a MySQL Server attached to the cluster).

The tc_block_instance column provides the DBTC block instance number. You can use this along with the block name to obtain information about specific threads from the threadblocks table.

\subsection*{25.6.15.10 The ndbinfo config_nodes Table}

The config_nodes table shows nodes configured in an NDB Cluster config.ini file. For each node, the table displays a row containing the node ID, the type of node (management node, data node, or API node), and the name or IP address of the host on which the node is configured to run.

This table does not indicate whether a given node is actually running, or whether it is currently connected to the cluster. Information about nodes connected to an NDB Cluster can be obtained from the nodes and processes table.

The config_nodes table contains the following columns:
- node_id

The node's ID
- node_type

The type of node
- node_hostname

The name or IP address of the host on which the node resides

\section*{Notes}

The node_id column shows the node ID used in the config.ini file for this node; if none is specified, the node ID that would be assigned automatically to this node is displayed.

The node_type column displays one of the following three values:
- MGM: Management node.
- NDB: Data node.
- API: API node; this includes SQL nodes.

The node_hostname column shows the node host as specified in the config.ini file. This can be empty for an API node, if HostName has not been set in the cluster configuration file. If HostName has not been set for a data node in the configuration file, localhost is used here. localhost is also used if HostName has not been specified for a management node.

\subsection*{25.6.15.11 The ndbinfo config_params Table}

The config_params table is a static table which provides the names and internal ID numbers of and other information about NDB Cluster configuration parameters. This table can also be used in conjunction with the config_values table for obtaining realtime information about node configuration parameters.

The config_params table contains the following columns:
- param_number

The parameter's internal ID number
- param_name

The name of the parameter
- param_description

A brief description of the parameter
- param_type

The parameter's data type
- param_default

The parameter's default value, if any
- param_min

The parameter's maximum value, if any
- param_max

The parameter's minimum value, if any
- param_mandatory

This is 1 if the parameter is required, otherwise 0
- param_status

Currently unused

\section*{Notes}

This table is read-only.
Although this is a static table, its content can vary between NDB Cluster installations, since supported parameters can vary due to differences between software releases, cluster hardware configurations, and other factors.

\subsection*{25.6.15.12 The ndbinfo config_values Table}

The config_values table provides information about the current state of node configuration parameter values. Each row in the table corresponds to the current value of a parameter on a given node.

The config_values table contains the following columns:
- node_id

ID of the node in the cluster
- config_param

The parameter's internal ID number
- config_value

Current value of the parameter

\section*{Notes}

This table's config_param column and the config_params table's param_number column use the same parameter identifiers. By joining the two tables on these columns, you can obtain detailed information about desired node configuration parameters. The query shown here provides the current values for all parameters on each data node in the cluster, ordered by node ID and parameter name:
```
SELECT v.node_id AS 'Node Id',
    p.param_name AS 'Parameter',
    v.config_value AS 'Value'
FROM config_values v
JOIN config_params p
ON v.config_param=p.param_number
WHERE p.param_name NOT LIKE '\_\_%'
ORDER BY v.node_id, p.param_name;
```


Partial output from the previous query when run on a small example cluster used for simple testing:
```

\begin{tabular}{|l|l|l|}
\hline Node Id & Parameter & Value \\
\hline 2 & Arbitration & 1 \\
\hline 2 & ArbitrationTimeout & 7500 \\
\hline 2 & BackupDataBufferSize & 16777216 \\
\hline 2 & BackupDataDir & /home/jon/data \\
\hline 2 & BackupDiskWriteSpeedPct & 50 \\
\hline 2 & BackupLogBufferSize & 16777216 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline \multicolumn{2}{|c|}{3 | TotalSendBufferMemory} & | 0 \\
\hline & 3 | TransactionBufferMemory & 1048576 \\
\hline & 3 | TransactionDeadlockDetectionTimeout & 1200 \\
\hline & 3 | TransactionInactiveTimeout & 4294967039 \\
\hline & 3 | TwoPassInitialNodeRestartCopy & 0 \\
\hline & 3 | UndoDataBuffer & 16777216 \\
\hline & 3 | UndoIndexBuffer & 2097152 \\
\hline \multicolumn{3}{|l|}{\multirow[b]{2}{*}{248 rows in set ( 0.02 sec )}} \\
\hline & & \\
\hline
\end{tabular}
```


The WHERE clause filters out parameters whose names begin with a double underscore (__); these parameters are reserved for testing and other internal uses by the NDB developers, and are not intended for use in a production NDB Cluster.

You can obtain output that is more specific, more detailed, or both by issuing the proper queries. This example provides all types of available information about the NodeId, NoOfReplicas, HostName,

DataMemory, IndexMemory, and TotalSendBufferMemory parameters as currently set for all data nodes in the cluster:
```
SELECT p.param_name AS Name,
            v.node_id AS Node,
            p.param_type AS Type,
            p.param_default AS 'Default',
            p.param_min AS Minimum,
            p.param_max AS Maximum,
            CASE p.param_mandatory WHEN 1 THEN 'Y' ELSE 'N' END AS 'Required',
            v.config_value AS Current
FROM config_params p
JOIN config_values v
ON p.param_number = v.config_param
WHERE p. param_name
    IN ('NodeId', 'NoOfReplicas', 'HostName',
        'DataMemory', 'IndexMemory', 'TotalSendBufferMemory')\G
```


The output from this query when run on a small NDB Cluster with 2 data nodes used for simple testing is shown here:
```
************************* 1. row
    Name: NodeId
    Node: 2
    Type: unsigned
Default:
Minimum: 1
Maximum: 144
Required: Y
    Current: 2
************************* 2. row ******************************************
        Name: HostName
        Node: 2
        Type: string
    Default: localhost
    Minimum:
    Maximum:
Required: N
    Current: 127.0.0.1
************************** 3. row *****************************************
        Name: TotalSendBufferMemory
        Node: 2
        Type: unsigned
    Default: 0
    Minimum: 262144
    Maximum: 4294967039
Required: N
    Current: 0
************************** 4. row *****************************************
        Name: NoOfReplicas
        Node: 2
        Type: unsigned
    Default: 2
    Minimum: 1
    Maximum: 4
Required: N
    Current: 2
************************** 5. row *****************************************
        Name: DataMemory
        Node: 2
        Type: unsigned
    Default: 102760448
    Minimum: 1048576
    Maximum: 1099511627776
Required: N
    Current: 524288000
*************************** 6. row ****************************************
        Name: NodeId
        Node: 3
        Type: unsigned
    Default:
    Minimum: 1
```

```
Maximum: 144
Required: Y
Current: 3
************************* 7. row ******************************************
    Name: HostName
    Node: 3
    Type: string
Default: localhost
Minimum:
Maximum:
Required: N
Current: 127.0.0.1
************************* 8. row ******************************************
        Name: TotalSendBufferMemory
        Node: 3
        Type: unsigned
Default: 0
Minimum: 262144
Maximum: 4294967039
Required: N
Current: 0
************************** 9. row *****************************************
        Name: NoOfReplicas
        Node: 3
        Type: unsigned
Default: 2
Minimum: 1
Maximum: 4
Required: N
Current: 2
************************* 10. row *****************************************
        Name: DataMemory
        Node: 3
        Type: unsigned
Default: 102760448
Minimum: 1048576
Maximum: 1099511627776
Required: N
Current: 524288000
10 rows in set (0.01 sec)
```


\subsection*{25.6.15.13 The ndbinfo counters Table}

The counters table provides running totals of events such as reads and writes for specific kernel blocks and data nodes. Counts are kept from the most recent node start or restart; a node start or restart resets all counters on that node. Not all kernel blocks have all types of counters.

The counters table contains the following columns:
- node_id

The data node ID
- block_name

Name of the associated NDB kernel block (see NDB Kernel Blocks).
- block_instance

Block instance
- counter_id

The counter's internal ID number; normally an integer between 1 and 10, inclusive.
- counter_name

The name of the counter. See text for names of individual counters and the NDB kernel block with which each counter is associated.
- val

The counter's value

\section*{Notes}

Each counter is associated with a particular NDB kernel block.
The OPERATIONS counter is associated with the DBLQH (local query handler) kernel block. A primarykey read counts as one operation, as does a primary-key update. For reads, there is one operation in DBLQH per operation in DBTC. For writes, there is one operation counted per fragment replica.

The ATTRINFO, TRANSACTIONS, COMMITS, READS, LOCAL_READS, SIMPLE_READS, WRITES, LOCAL_WRITES, ABORTS, TABLE_SCANS, and RANGE_SCANS counters are associated with the DBTC (transaction co-ordinator) kernel block.

LOCAL_WRITES and LOCAL_READS are primary-key operations using a transaction coordinator in a node that also holds the primary fragment replica of the record.

The READS counter includes all reads. LOCAL_READS includes only those reads of the primary fragment replica on the same node as this transaction coordinator. SIMPLE_READS includes only those reads in which the read operation is the beginning and ending operation for a given transaction. Simple reads do not hold locks but are part of a transaction, in that they observe uncommitted changes made by the transaction containing them but not of any other uncommitted transactions. Such reads are "simple" from the point of view of the TC block; since they hold no locks they are not durable, and once DBTC has routed them to the relevant LQH block, it holds no state for them.

ATTRINFO keeps a count of the number of times an interpreted program is sent to the data node. See NDB Protocol Messages, for more information about ATTRINFO messages in the NDB kernel.

The LOCAL_TABLE_SCANS_SENT, READS_RECEIVED, PRUNED_RANGE_SCANS_RECEIVED, RANGE_SCANS_RECEIVED, LOCAL_READS_SENT, CONST_PRUNED_RANGE_SCANS_RECEIVED, LOCAL_RANGE_SCANS_SENT, REMOTE_READS_SENT, REMOTE_RANGE_SCANS_SENT, READS_NOT_FOUND, SCAN_BATCHES_RETURNED, TABLE_SCANS_RECEIVED, and SCAN_ROWS_RETURNED counters are associated with the DBSPJ (select push-down join) kernel block.

The block_name and block_instance columns provide, respectively, the applicable NDB kernel block name and instance number. You can use these to obtain information about specific threads from the threadblocks table.

A number of counters provide information about transporter overload and send buffer sizing when troubleshooting such issues. For each LQH instance, there is one instance of each counter in the following list:
- LQHKEY_OVERLOAD: Number of primary key requests rejected at the LQH block instance due to transporter overload
- LQHKEY_OVERLOAD_TC: Count of instances of LQHKEY_OVERLOAD where the TC node transporter was overloaded
- LQHKEY_OVERLOAD_READER: Count of instances of LQHKEY_OVERLOAD where the API reader (reads only) node was overloaded.
- LQHKEY_OVERLOAD_NODE_PEER: Count of instances of LQHKEY_OVERLOAD where the next backup data node (writes only) was overloaded
- LQHKEY_OVERLOAD_SUBSCRIBER: Count of instances of LQHKEY_OVERLOAD where a event subscriber (writes only) was overloaded.
- LQHSCAN_SLOWDOWNS: Count of instances where a fragment scan batch size was reduced due to scanning API transporter overload.

\subsection*{25.6.15.14 The ndbinfo cpudata Table}

The cpudata table provides data about CPU usage during the last second.
The cpustat table contains the following columns:
- node_id

Node ID
- cpu_no

CPU ID
- cpu_online

1 if the CPU is currently online, otherwise 0
- cpu_userspace_time

CPU time spent in userspace
- cpu_idle_time

CPU time spent idle
- cpu_system_time

CPU time spent in system time
- cpu_interrupt_time

CPU time spent handling interrupts (hardware and software)
- cpu_exec_vm_time

CPU time spent in virtual machine execution

\section*{Notes}

The cpudata table is available only on Linux and Solaris operating systems.

\subsection*{25.6.15.15 The ndbinfo cpudata_1sec Table}

The cpudata_1sec table provides data about CPU usage per second over the last 20 seconds.
The cpustat table contains the following columns:
- node_id

Node ID
- measurement_id

Measurement sequence ID; later measurements have lower IDs
- cpu_no

CPU ID
- cpu_online

1 if the CPU is currently online, otherwise 0
- cpu_userspace_time

CPU time spent in userspace
- cpu_idle_time

CPU time spent idle
- cpu_system_time

CPU time spent in system time
- cpu_interrupt_time

CPU time spent handling interrupts (hardware and software)
- cpu_exec_vm_time

CPU time spent in virtual machine execution
- elapsed_time

Time in microseconds used for this measurement

\section*{Notes}

The cpudata_1sec table is available only on Linux and Solaris operating systems.

\subsection*{25.6.15.16 The ndbinfo cpudata_20sec Table}

The cpudata_20sec table provides data about CPU usage per 20-second interval over the last 400 seconds.

The cpustat table contains the following columns:
- node_id

Node ID
- measurement_id

Measurement sequence ID; later measurements have lower IDs
- cpu_no

CPU ID
- cpu_online

1 if the CPU is currently online, otherwise 0
- cpu_userspace_time

CPU time spent in userspace
- cpu_idle_time

CPU time spent idle
- cpu_system_time

CPU time spent in system time
- cpu_interrupt_time

CPU time spent handling interrupts (hardware and software)
- cpu_exec_vm_time

CPU time spent in virtual machine execution
- elapsed_time

Time in microseconds used for this measurement

\section*{Notes}

The cpudata_20sec table is available only on Linux and Solaris operating systems.

\subsection*{25.6.15.17 The ndbinfo cpudata_ $\mathbf{5 0 m s}$ Table}

The cpudata_50ms table provides data about CPU usage per 50-millisecond interval over the last second.

The cpustat table contains the following columns:
- node_id

Node ID
- measurement_id

Measurement sequence ID; later measurements have lower IDs
- cpu_no

CPU ID
- cpu_online

1 if the CPU is currently online, otherwise 0
- cpu_userspace_time

CPU time spent in userspace
- cpu_idle_time

CPU time spent idle
- cpu_system_time

CPU time spent in system time
- cpu_interrupt_time

CPU time spent handling interrupts (hardware and software)
- cpu_exec_vm_time

CPU time spent in virtual machine execution
- elapsed_time

Time in microseconds used for this measurement

\section*{Notes}

The cpudata_50ms table is available only on Linux and Solaris operating systems.

\subsection*{25.6.15.18 The ndbinfo cpuinfo Table}

The cpuinfo table provides information about the CPU on which a given data node executes.
The cpuinfo table contains the following columns:
- node_id

Node ID
- cpu_no

CPU ID
- cpu_online

1 if the CPU is online, otherwise 0
- core_id

CPU core ID
- socket_id

CPU socket ID

\section*{Notes}

The cpuinfo table is available on all operating systems supported by NDB, with the exception of MacOS and FreeBSD.

\subsection*{25.6.15.19 The ndbinfo cpustat Table}

The cpustat table provides per-thread CPU statistics gathered each second, for each thread running in the NDB kernel.

The cpustat table contains the following columns:
- node_id

ID of the node where the thread is running
- thr_no

Thread ID (specific to this node)
- OS_user

OS user time
- OS_system

OS system time
- OS_idle

OS idle time
- thread_exec

Thread execution time
- thread_sleeping

Thread sleep time
- thread_spinning

Thread spin time
- thread_send

Thread send time
- thread_buffer_full

Thread buffer full time
- elapsed_time

Elapsed time

\subsection*{25.6.15.20 The ndbinfo cpustat_ $\mathbf{5 0 m s}$ Table}

The cpustat_50ms table provides raw, per-thread CPU data obtained each 50 milliseconds for each thread running in the NDB kernel.

Like cpustat_1sec and cpustat_20sec, this table shows 20 measurement sets per thread, each referencing a period of the named duration. Thus, cpsustat_50ms provides 1 second of history.

The cpustat_50ms table contains the following columns:
- node_id

ID of the node where the thread is running
- thr_no

Thread ID (specific to this node)
- OS_user_time

OS user time
- OS_system_time

OS system time
- OS_idle_time

OS idle time
- exec_time

Thread execution time
- sleep_time

Thread sleep time
- spin_time

Thread spin time
- send_time

Thread send time
- buffer_full_time

Thread buffer full time
- elapsed_time

Elapsed time

\subsection*{25.6.15.21 The ndbinfo cpustat_1sec Table}

The cpustat-1sec table provides raw, per-thread CPU data obtained each second for each thread running in the NDB kernel.

Like cpustat_50ms and cpustat_20sec, this table shows 20 measurement sets per thread, each referencing a period of the named duration. Thus, cpsustat_1sec provides 20 seconds of history.

The cpustat_1sec table contains the following columns:
- node_id

ID of the node where the thread is running
- thr_no

Thread ID (specific to this node)
- OS_user_time

OS user time
- OS_system_time

OS system time
- OS_idle_time

OS idle time
- exec_time

Thread execution time
- sleep_time

Thread sleep time
- spin_time

Thread spin time
- send_time

Thread send time
- buffer_full_time

Thread buffer full time
- elapsed_time

Elapsed time

\subsection*{25.6.15.22 The ndbinfo cpustat_20sec Table}

The cpustat_20sec table provides raw, per-thread CPU data obtained each 20 seconds, for each thread running in the NDB kernel.

Like cpustat_50ms and cpustat_1sec, this table shows 20 measurement sets per thread, each referencing a period of the named duration. Thus, cpsustat_20sec provides 400 seconds of history.

The cpustat_20sec table contains the following columns:
- node_id

ID of the node where the thread is running
- thr_no

Thread ID (specific to this node)
- OS_user_time

OS user time
- OS_system_time

OS system time
- OS_idle_time

OS idle time
- exec_time

Thread execution time
- sleep_time

Thread sleep time
- spin_time

Thread spin time
- send_time

Thread send time
- buffer_full_time

Thread buffer full time
- elapsed_time

Elapsed time

\subsection*{25.6.15.23 The ndbinfo dictionary_columns Table}

The table provides NDB dictionary information about columns of NDB tables. dictionary_columns has the columns listed here (with brief descriptions):
- table_id

ID of the table containing the column
- column_id

The column's unique ID
- name

Name of the column
- column_type

Data type of the column from the NDB API; see Column::Type, for possible values
- default_value

The column's default value, if any
- nullable

Either of NULL or NOT NULL
- array_type

The column's internal attribute storage format; one of FIXED, SHORT_VAR, or MEDIUM_VAR; for more information, see Column::ArrayType, in the NDB API documentation
- storage_type

Type of storage used by the table; either of MEMORY or DISK
- primary_key

1 if this is a primary key column, otherwise 0
- partition_key

1 if this is a partitioning key column, otherwise 0
- dynamic

1 if the column is dynamic, otherwise 0
- auto_inc

1 if this is an AUTO_INCREMENT column, otherwise 0
You can obtain information about all of the columns in a given table by joining dictionary_columns with the dictionary_tables table, like this:
```
SELECT dc.*
    FROM dictionary_columns dc
JOIN dictionary_tables dt
    ON dc.table_id=dt.table_id
WHERE dt.table_name='t1'
    AND dt.database_name='mydb';
```


\section*{Note}

Blob columns are not shown in this table. This is a known issue.

\subsection*{25.6.15.24 The ndbinfo dictionary_tables Table}

This table provides NDB dictionary information for NDB tables. dictionary_tables contains the columns listed here:
- table_id

The table' unique ID
- database_name

Name of the database containing the table
- table_name

Name of the table
- status

The table status; one of New, Changed, Retrieved, Invalid, or Altered. (See Object::Status, for more information about object status values.)
- attributes

Number of table attributes
- primary_key_cols

Number of columns in the table's primary key
- primary_key

A comma-separated list of the columns in the table's primary key
- storage

Type of storage used by the table; one of memory, disk, or default
- logging

Whether logging is enabled for this table
- dynamic

1 if the table is dynamic, otherwise 0; the table is considered dynamic if table-
>getForceVarPart() is true, or if at least one table column is dynamic
- read_backup

1 if read from any replica (READ_BACKUP option is enabled for this table, otherwise 0; see Section 15.1.20.12, "Setting NDB Comment Options")
- fully_replicated

1 if FULLY_REPLICATED is enabled for this table (each data node in the cluster has a complete copy of the table), 0 if not; see Section 15.1.20.12, "Setting NDB Comment Options"
- checksum

If this table uses a checksum, the value in this column is 1 ; if not, it is 0
- row_size

The amount of data, in bytes that can be stored in one row, not including any blob data stored separately in blob tables; see Table::getRowSizeInBytes(), in the API documentation, for more information
- min_rows

Minimum number of rows, as used for calculating partitions; see Table::getMinRows(), in the API documentation, for more information
- max_rows

Maximum number of rows, as used for calculating partitions; see Table::getMaxRows(), in the API documentation, for more information
- tablespace

ID of the tablespace to which the table belongs, if any; this is 0 , if the table does not use data on disk
- fragment_type

The table's fragment type; one of Single, AllSmall, AllMedium, AllLarge, DistrKeyHash, DistrKeyLin, UserDefined, unused, or HashMapPartition; for more information, see Object::FragmentType, in the NDB API documentation
- hash_map

The hash map used by the table
- fragments

Number of table fragments
- partitions

Number of partitions used by the table
- partition_balance

Type of partition balance used, if any; one of FOR_RP_BY_NODE, FOR_RA_BY_NODE, FOR_RP_BY_LDM, FOR_RA_BY_LDM, FOR_RA_BY_LDM_X_2, FOR_RA_BY_LDM_X_3, or FOR_RA_BY_LDM_X_4; see Section 15.1.20.12, "Setting NDB Comment Options"
- contains_GCI

1 if the table includes a global checkpoint index, otherwise 0
- single_user_mode

Type of access allowed to the table when single user mode is in effect; one of locked, read_only, or read_write; these are equivalent to the values SingleUserModeLocked, SingleUserModeReadOnly, and SingleUserModeReadWrite, respectively, of the Table: :SingleUserMode type in the NDB API
- force_var_part

This is 1 if table->getForceVarPart ( ) is true for this table, and 0 if it is not
- GCI_bits

Used in testing
- author_bits

Used in testing

\subsection*{25.6.15.25 The ndbinfo dict_obj_info Table}

The dict_obj_info table provides information about NDB data dictionary (DICT) objects such as tables and indexes. (The dict_obj_types table can be queried for a list of all the types.) This information includes the object's type, state, parent object (if any), and fully qualified name.

The dict_obj_info table contains the following columns:
- type

Type of DICT object; join on dict_obj_types to obtain the name
- id

Object identifier; for Disk Data undo log files and data files, this is the same as the value shown in the LOGFILE_GROUP_NUMBER column of the Information Schema FILES table; for undo log files, it also the same as the value shown for the log_id column in the ndbinfo logbuffers and logspaces tables
- version

Object version
- state

Object state; see Object::State for values and descriptions.
- parent_obj_type

Parent object's type (a dict_obj_types type ID); 0 indicates that the object has no parent
- parent_obj_id

Parent object ID (such as a base table); 0 indicates that the object has no parent
- fq_name

Fully qualified object name; for a table, this has the form database_name/def/table_name, for a primary key, the form is sys/def/table_id/PRIMARY, and for a unique key it is sys/ def/table_id/uk_name\$unique

\subsection*{25.6.15.26 The ndbinfo dict_obj_tree Table}

The dict_obj_tree table provides a tree-based view of table information from the dict_obj_info table. This is intended primarily for use in testing, but can be useful in visualizing hierarchies of NDB database objects.

The dict_obj_tree table contains the following columns:
- type

Type of DICT object; join on dict_obj_types to obtain the name of the object type
- id

Object identifier; same as the id column in dict_obj_info
For Disk Data undo log files and data files, this is the same as the value shown in the LOGFILE_GROUP_NUMBER column of the Information Schema FILES table; for undo log files, it also the same as the value shown for the log_id column in the ndbinfo logbuffers and logspaces tables
- name

The fully qualified name of the object; the same as the fq_name column in dict_obj_info
For a table, this is database_name/def/table_name (the same as its parent_name); for an index of any type, this takes the form NDB\$INDEX_index_id_CUSTOM
- parent_type

The DICT object type of this object's parent object; join on dict_obj_types to obtain the name of the object type
- parent_id

Identifier for this object's parent object; the same as the dict_obj_info table's id column
- parent_name

Fully qualified name of this object's parent object; the same as the dict_obj_info table's fq_name column

For a table, this has the form database_name/def/table_name. For an index, the name is sys/ def/table_id/index_name. For a primary key, it is sys/def/table_id/PRIMARY, and for a unique key it is sys/def/table_id/uk_name\$unique
- root_type

The DICT object type of the root object; join on dict_obj_types to obtain the name of the object type
- root_id

Identifier for the root object; the same as the dict_obj_info table's id column
- root_name

Fully qualified name of the root object; the same as the dict_obj_info table's fq_name column
- level

Level of the object in the hierarchy
- path

Complete path to the object in the NDB object hierarchy; objects are separated by a right arrow (represented as ->), starting with the root object on the left
- indented_name

The name prefixed with a right arrow (represented as ->) with a number of spaces preceding it that correspond to the object's depth in the hierarchy

The path column is useful for obtaining a complete path to a given NDB database object in a single line, whereas the indented_name column can be used to obtain a tree-like layout of complete hierarchy information for a desired object.

Example: Assuming the existence of a test database and no existing table named t1 in this database, execute the following SQL statement:
```
CREATE TABLE test.t1 (
    a INT PRIMARY KEY,
    b INT,
    UNIQUE KEY(b)
) ENGINE = NDB;
```


You can obtain the path to the table just created using the query shown here:
```
mysql> SELECT path FROM ndbinfo.dict_obj_tree
    -> WHERE name LIKE 'test%t1';
+--------------+
| path |
+--------------+
```

```
| test/def/t1 |
+--------------+
1 row in set (0.14 sec)
```


You can see the paths to all dependent objects of this table using the path to the table as the root name in a query like this one:
```
mysql> SELECT path FROM ndbinfo.dict_obj_tree
    -> WHERE root_name = 'test/def/t1';
+------------------------------------------------------------
| path |
+-------------------------------------------------------------
| test/def/t1
| test/def/t1 -> sys/def/13/b
| test/def/t1 -> sys/def/13/b -> NDB$INDEX_15_CUSTOM
| test/def/t1 -> sys/def/13/b$unique
| test/def/t1 -> sys/def/13/b$unique -> NDB$INDEX_16_UI
| test/def/t1 -> sys/def/13/PRIMARY
| test/def/t1 -> sys/def/13/PRIMARY -> NDB$INDEX_14_CUSTOM
+--------------------------------------------------------------
7rows in set (0.16 sec)
```


To obtain a hierarchical view of the t1 table with all its dependent objects, execute a query similar to this one which selects the indented name of each object having test/def/t1 as the name of its root object:
```
mysql> SELECT indented_name FROM ndbinfo.dict_obj_tree
        -> WHERE root_name = 'test/def/t1';
+-----------------------------+
| indented_name |
+-----------------------------+
| test/def/t1
        -> sys/def/13/b
            -> NDB$INDEX_15_CUSTOM
        -> sys/def/13/b$unique
            -> NDB$INDEX_16_UI
        -> sys/def/13/PRIMARY
            -> NDB$INDEX_14_CUSTOM
+-----------------------------+
7rows in set (0.15 sec)
```


When working with Disk Data tables, note that, in this context, a tablespace or log file group is considered a root object. This means that you must know the name of any tablespace or log file group associated with a given table, or obtain this information from SHOW CREATE TABLE and then querying INFORMATION_SCHEMA. FILES, or similar means as shown here:
```
mysql> SHOW CREATE TABLE test.dt_1\G
*************************** 1. r oW *****************************
            Table: dt_1
Create Table: CREATE TABLE ˋdt_1ˋ (
    ˋmember_idˋ int unsigned NOT NULL AUTO_INCREMENT,
    ˋlast_nameˋ varchar(50) NOT NULL,
    ˋfirst_nameˋ varchar(50) NOT NULL,
    ˋdobˋ date NOT NULL,
    ˋjoinedˋ date NOT NULL,
    PRIMARY KEY (ˋmember_idˋ),
    KEY ˋlast_nameˋ (ˋlast_nameˋ,ˋfirst_nameˋ)
) /*!50100 TABLESPACE ˋts_1ˋ STORAGE DISK */ ENGINE=ndbcluster DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_090c
1 row in set (0.00 sec)
mysql> SELECT DISTINCT TABLESPACE_NAME, LOGFILE_GROUP_NAME
        -> FROM INFORMATION_SCHEMA.FILES WHERE TABLESPACE_NAME='ts_1';
+-------------------+--------------------+
| TABLESPACE_NAME | LOGFILE_GROUP_NAME |
+-------------------+--------------------+
| ts_1 | lg_1 |
+-------------------+--------------------+
1 row in set (0.00 sec)
```


Now you can obtain hierarchical information for the table, tablespace, and log file group like this:
```
mysql> SELECT indented_name FROM ndbinfo.dict_obj_tree
    -> WHERE root_name = 'test/def/dt_1';
+-----------------------------+
| indented_name |
+-----------------------------+
| test/def/dt_1
| -> sys/def/23/last_name
        -> NDB$INDEX_25_CUSTOM
| -> sys/def/23/PRIMARY
| -> NDB$INDEX_24_CUSTOM
+-----------------------------+
rows in set (0.15 sec)
mysql> SELECT indented_name FROM ndbinfo.dict_obj_tree
    -> WHERE root_name = 'ts_1';
+------------------+
| indented_name |
+-----------------+
| ts_1
| -> data_1.dat |
| -> data_2.dat |
+------------------+
3 rows in set (0.17 sec)
mysql> SELECT indented_name FROM ndbinfo.dict_obj_tree
    -> WHERE root_name LIKE 'lg_1';
+------------------+
| indented_name |
+------------------+
| lg_1
| -> undo_1.log
| -> undo_2.log |
+------------------+
3 rows in set (0.16 sec)
```


\subsection*{25.6.15.27 The ndbinfo dict_obj_types Table}

The dict_obj_types table is a static table listing possible dictionary object types used in the NDB kernel. These are the same types defined by Object: : Type in the NDB API.

The dict_obj_types table contains the following columns:
- type_id

The type ID for this type
- type_name

The name of this type

\subsection*{25.6.15.28 The ndbinfo disk_write_speed_base Table}

The disk_write_speed_base table provides base information about the speed of disk writes during LCP, backup, and restore operations.

The disk_write_speed_base table contains the following columns:
- node_id

Node ID of this node
- thr_no

Thread ID of this LDM thread
- millis_ago

Milliseconds since this reporting period ended
- millis_passed

Milliseconds elapsed in this reporting period
- backup_lcp_bytes_written

Number of bytes written to disk by local checkpoints and backup processes during this period
- redo_bytes_written

Number of bytes written to REDO log during this period
- target_disk_write_speed

Actual speed of disk writes per LDM thread (base data)

\subsection*{25.6.15.29 The ndbinfo disk_write_speed_aggregate Table}

The disk_write_speed_aggregate table provides aggregated information about the speed of disk writes during LCP, backup, and restore operations.

The disk_write_speed_aggregate table contains the following columns:
- node_id

Node ID of this node
- thr_no

Thread ID of this LDM thread
- backup_lcp_speed_last_sec

Number of bytes written to disk by backup and LCP processes in the last second
- redo_speed_last_sec

Number of bytes written to REDO log in the last second
- backup_lcp_speed_last_10sec

Number of bytes written to disk by backup and LCP processes per second, averaged over the last 10 seconds
- redo_speed_last_10sec

Number of bytes written to REDO log per second, averaged over the last 10 seconds
- std_dev_backup_lcp_speed_last_10sec

Standard deviation in number of bytes written to disk by backup and LCP processes per second, averaged over the last 10 seconds
- std_dev_redo_speed_last_10sec

Standard deviation in number of bytes written to REDO log per second, averaged over the last 10 seconds
- backup_lcp_speed_last_60sec

Number of bytes written to disk by backup and LCP processes per second, averaged over the last 60 seconds
- redo_speed_last_60sec

Number of bytes written to REDO log per second, averaged over the last 10 seconds
- std_dev_backup_lcp_speed_last_60sec

Standard deviation in number of bytes written to disk by backup and LCP processes per second, averaged over the last 60 seconds
- std_dev_redo_speed_last_60sec

Standard deviation in number of bytes written to REDO log per second, averaged over the last 60 seconds
- slowdowns_due_to_io_lag

Number of seconds since last node start that disk writes were slowed due to REDO log I/O lag
- slowdowns_due_to_high_cpu

Number of seconds since last node start that disk writes were slowed due to high CPU usage
- disk_write_speed_set_to_min

Number of seconds since last node start that disk write speed was set to minimum
- current_target_disk_write_speed

Actual speed of disk writes per LDM thread (aggregated)

\subsection*{25.6.15.30 The ndbinfo disk_write_speed_aggregate_node Table}

The disk_write_speed_aggregate_node table provides aggregated information per node about the speed of disk writes during LCP, backup, and restore operations.

The disk_write_speed_aggregate_node table contains the following columns:
- node_id

Node ID of this node
- backup_lcp_speed_last_sec

Number of bytes written to disk by backup and LCP processes in the last second
- redo_speed_last_sec

Number of bytes written to the redo log in the last second
- backup_lcp_speed_last_10sec

Number of bytes written to disk by backup and LCP processes per second, averaged over the last 10 seconds
- redo_speed_last_10sec

Number of bytes written to the redo log each second, averaged over the last 10 seconds
- backup_lcp_speed_last_60sec

Number of bytes written to disk by backup and LCP processes per second, averaged over the last 60 seconds
- redo_speed_last_60sec

Number of bytes written to the redo log each second, averaged over the last 60 seconds

\subsection*{25.6.15.31 The ndbinfo diskpagebuffer Table}

The diskpagebuffer table provides statistics about disk page buffer usage by NDB Cluster Disk Data tables.

The diskpagebuffer table contains the following columns:
- node_id

The data node ID
- block_instance

Block instance
- pages_written

Number of pages written to disk.
- pages_written_lcp

Number of pages written by local checkpoints.
- pages_read

Number of pages read from disk
- log_waits

Number of page writes waiting for log to be written to disk
- page_requests_direct_return

Number of requests for pages that were available in buffer
- page_requests_wait_queue

Number of requests that had to wait for pages to become available in buffer
- page_requests_wait_io

Number of requests that had to be read from pages on disk (pages were unavailable in buffer)

\section*{Notes}

You can use this table with NDB Cluster Disk Data tables to determine whether DiskPageBufferMemory is sufficiently large to allow data to be read from the buffer rather from disk; minimizing disk seeks can help improve performance of such tables.

You can determine the proportion of reads from DiskPageBufferMemory to the total number of reads using a query such as this one, which obtains this ratio as a percentage:
```
SELECT
    node_id,
    100 * page_requests_direct_return /
        (page_requests_direct_return + page_requests_wait_io)
            AS hit_ratio
FROM ndbinfo.diskpagebuffer;
```


The result from this query should be similar to what is shown here, with one row for each data node in the cluster (in this example, the cluster has 4 data nodes):
```
+----------+-----------+
| node_id | hit_ratio |
+----------+------------+
| 5 |97.6744 |
| 6 | 97.6879 |
| 7 | 98.1776 |
| 8 | 98.1343 |
+----------+-----------+
4 rows in set (0.00 sec)
```

hit_ratio values approaching 100\% indicate that only a very small number of reads are being made from disk rather than from the buffer, which means that Disk Data read performance is approaching an optimum level. If any of these values are less than $95 \%$, this is a strong indicator that the setting for DiskPageBufferMemory needs to be increased in the config.ini file.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4417.jpg?height=127&width=99&top_left_y=790&top_left_x=370)

\section*{Note}

A change in DiskPageBufferMemory requires a rolling restart of all of the cluster's data nodes before it takes effect.
block_instance refers to an instance of a kernel block. Together with the block name, this number can be used to look up a given instance in the threadblocks table. Using this information, you can obtain information about disk page buffer metrics relating to individual threads; an example query using LIMIT 1 to limit the output to a single thread is shown here:
```
mysql> SELECT
    > node_id, thr_no, block_name, thread_name, pages_written,
    > pages_written_lcp, pages_read, log_waits,
    > page_requests_direct_return, page_requests_wait_queue,
    > page_requests_wait_io
    > FROM ndbinfo.diskpagebuffer
    > INNER JOIN ndbinfo.threadblocks USING (node_id, block_instance)
    > INNER JOIN ndbinfo.threads USING (node_id, thr_no)
    > WHERE block_name = 'PGMAN' LIMIT 1\G
*************************** 1. r ow ***************************************
                        node_id: 1
                            thr_no: 1
                block_name: PGMAN
                thread_name: rep
            pages_written: 0
        pages_written_lcp: 0
                pages_read: 1
                    log_waits: 0
page_requests_direct_return: 4
    page_requests_wait_queue: 0
        page_requests_wait_io: 1
1 row in set (0.01 sec)
```


\subsection*{25.6.15.32 The ndbinfo diskstat Table}

The diskstat table provides information about writes to Disk Data tablespaces during the past 1 second.

The diskstat table contains the following columns:
- node_id

Node ID of this node
- block_instance

ID of reporting instance of PGMAN
- pages_made_dirty

Number of pages made dirty during the past second
- reads_issued

Reads issued during the past second
- reads_completed

Reads completed during the past second
- writes_issued

Writes issued during the past second
- writes_completed

Writes completed during the past second
- log_writes_issued

Number of times a page write has required a log write during the past second
- log_writes_completed

Number of log writes completed during the last second
- get_page_calls_issued

Number of get_page( ) calls issued during the past second
- get_page_reqs_issued

Number of times that a get_page( ) call has resulted in a wait for I/O or completion of I/O already begun during the past second
- get_page_reqs_completed

Number of get_page( ) calls waiting for I/O or I/O completion that have completed during the past second

\section*{Notes}

Each row in this table corresponds to an instance of PGMAN; there is one such instance per LDM thread plus an additional instance for each data node.

\subsection*{25.6.15.33 The ndbinfo diskstats_1sec Table}

The diskstats_1sec table provides information about writes to Disk Data tablespaces over the past 20 seconds.

The diskstat table contains the following columns:
- node_id

Node ID of this node
- block_instance

ID of reporting instance of PGMAN
- pages_made_dirty

Pages made dirty during the designated 1-second interval
- reads_issued

Reads issued during the designated 1 -second interval
- reads_completed

Reads completed during the designated 1-second interval
- writes_issued

Writes issued during the designated 1 -second interval
- writes_completed

Writes completed during the designated 1 -second interval
- log_writes_issued

Number of times a page write has required a log write during the designated 1 -second interval
- log_writes_completed

Number of log writes completed during the designated 1-second interval
- get_page_calls_issued

Number of get_page( ) calls issued during the designated 1-second interval
- get_page_reqs_issued

Number of times that a get_page( ) call has resulted in a wait for I/O or completion of I/O already begun during the designated 1 -second interval
- get_page_reqs_completed

Number of get_page( ) calls waiting for I/O or I/O completion that have completed during the designated 1 -second interval
- seconds_ago

Number of 1-second intervals in the past of the interval to which this row applies

\section*{Notes}

Each row in this table corresponds to an instance of PGMAN during a 1-second interval occurring from 0 to 19 seconds ago; there is one such instance per LDM thread plus an additional instance for each data node.

\subsection*{25.6.15.34 The ndbinfo error_messages Table}

The error_messages table provides information about
The error_messages table contains the following columns:
- error_code

Numeric error code
- error_description

Description of error
- error_status

Error status code
- error_classification

Error classification code

\section*{Notes}
error_code is a numeric NDB error code. This is the same error code that can be supplied to ndb_perror.
error_description provides a basic description of the condition causing the error.
The error_status column provides status information relating to the error. Possible values for this column are listed here:
- No error
- Illegal connect string
- Illegal server handle
- Illegal reply from server
- Illegal number of nodes
- Illegal node status
- Out of memory
- Management server not connected
- Could not connect to socket
- Start failed
- Stop failed
- Restart failed
- Could not start backup
- Could not abort backup
- Could not enter single user mode
- Could not exit single user mode
- Failed to complete configuration change
- Failed to get configuration
- Usage error
- Success
- Permanent error
- Temporary error
- Unknown result
- Temporary error, restart node
- Permanent error, external action needed
- Ndbd file system error, restart node initial
- Unknown

The error_classification column shows the error classification. See NDB Error Classifications, for information about classification codes and their meanings.

\subsection*{25.6.15.35 The ndbinfo events Table}

This table provides information about event subscriptions in NDB. The columns of the events table are listed here, with short descriptions of each:
- event_id

The event ID
- name

The name of the event
- table_id

The ID of the table on which the event occurred
- reporting

One of updated, all, subscribe, or DDL
- columns

A comma-separated list of columns affected by the event
- table_event

One or more of INSERT, DELETE, UPDATE, SCAN, DROP, ALTER, CREATE, GCP_COMPLETE, CLUSTER_FAILURE, STOP, NODE_FAILURE, SUBSCRIBE, UNSUBSCRIBE, and ALL (defined by Event: :TableEvent in the NDB API)

\subsection*{25.6.15.36 The ndbinfo files Table}

The files tables provides information about files and other objects used by NDB disk data tables, and contains the columns listed here:
- id

Object ID
- type

The type of object; one of Log file group, Tablespace, Undo file, or Data file
- name

The name of the object
- parent

ID of the parent object
- parent_name

Name of the parent object
- free_extents

Number of free extents
- total_extents

Total number of extents
- extent_size

Extent size (MB)
- initial_size

Initial size (bytes)
- maximum_size

Maximum size (bytes)
- autoextend_size

Autoextend size (bytes)
For log file groups and tablespaces, parent is always 0, and the parent_name, free_extents, total_extents, extent_size, initial_size, maximum_size, and autoentend_size columns are all NULL.

The files table is empty if no disk data objects have been created in NDB. See Section 25.6.11.1, "NDB Cluster Disk Data Objects", for more information.

See also Section 28.3.15, "The INFORMATION_SCHEMA FILES Table".

\subsection*{25.6.15.37 The ndbinfo foreign_keys Table}

The foreign_keys table provides information about foreign keys on NDB tables. This table has the following columns:
- object_id

The foreign key's object ID
- name

Name of the foreign key
- parent_table

The name of the foreign key's parent table
- parent_columns

A comma-delimited list of parent columns
- child_table

The name of the child table
- child_columns

A comma-separated list of child columns
- parent_index

Name of the parent index
- child_index

Name of the child index
- on_update_action

The ON UPDATE action specified for the foreign key; one of No Action, Restrict, Cascade, Set Null, or Set Default
- on_delete_action

The ON DELETE action specified for the foreign key; one of No Action, Restrict, Cascade, Set Null, or Set Default

\subsection*{25.6.15.38 The ndbinfo hash_maps Table}
- id

The hash map's unique ID
- version

Hash map version (integer)
- state

Hash map state; see Object::State for values and descriptions.
- fq_name

The hash map's fully qualified name
The hash_maps table is actually a view consisting of the four columns having the same names of the dict_obj_info table, as shown here:
```
CREATE VIEW hash_maps AS
    SELECT id, version, state, fq_name
    FROM dict_obj_info
    WHERE type=24; # Hash map; defined in dict_obj_types
```


See the description of dict_obj_info for more information.

\subsection*{25.6.15.39 The ndbinfo hwinfo Table}

The hwinfo table provides information about the hardware on which a given data node executes.
The hwinfo table contains the following columns:
- node_id

Node ID
- cpu_cnt_max

Number of processors on this host
- cpu_cnt

Number of processors available to this node
- num_cpu_cores

Number of CPU cores on this host
- num_cpu_sockets

Number of CPU sockets on this host
- HW_memory_size

Amount of memory available on this host
- model_name

CPU model name

\section*{Notes}

The hwinfo table is available on all operating systems supported by NDB.

\subsection*{25.6.15.40 The ndbinfo index_columns Table}

This table provides information about indexes on NDB tables. The columns of the index_columns table are listed here, along with brief descriptions:
- table_id

Unique ID of the NDB table for which the index is defined
- Name of the database containing this table
varchar(64)
- table_name

Name of the table
- index_object_id

Object ID of this index
- index_name

Name of the index; if the index is not named, the name of the first column in the index is used
- index_type

Type of index; normally this is 3 (unique hash index) or 6 (ordered index); the values are the same as those in the type_id column of the dict_obj_types table
- status

One of new, changed, retrieved, invalid, or altered
- columns

A comma-delimited list of columns making up the index

\subsection*{25.6.15.41 The ndbinfo index_stats Table}

The index_stats table provides basic information about NDB index statistics.
More complete index statistics information can be obtained using the ndb_index_stat utility.
The index_stats table contains the following columns:
- index_id

Index ID
- index_version

Index version
- sample_version

Sample version

\section*{Notes}

\subsection*{25.6.15.42 The ndbinfo locks_per_fragment Table}

The locks_per_fragment table provides information about counts of lock claim requests, and the outcomes of these requests on a per-fragment basis, serving as a companion table to operations_per_fragment and memory_per_fragment. This table also shows the total time spent waiting for locks successfully and unsuccessfully since fragment or table creation, or since the most recent restart.

The locks_per_fragment table contains the following columns:
- fq_name

Fully qualified table name
- parent_fq_name

Fully qualified name of parent object
- type

Table type; see text for possible values
- table_id

Table ID
- node_id

Reporting node ID
- block_instance

LDM instance ID
- fragment_num

Fragment identifier
- ex_req

Exclusive lock requests started
- ex_imm_ok

Exclusive lock requests immediately granted
- ex_wait_ok

Exclusive lock requests granted following wait
- ex_wait_fail

Exclusive lock requests not granted
- sh_req

Shared lock requests started
- sh_imm_ok

Shared lock requests immediately granted
- sh_wait_ok

Shared lock requests granted following wait
- sh_wait_fail

Shared lock requests not granted
- wait_ok_millis

Time spent waiting for lock requests that were granted, in milliseconds
- wait_fail_millis

Time spent waiting for lock requests that failed, in milliseconds

\section*{Notes}
block_instance refers to an instance of a kernel block. Together with the block name, this number can be used to look up a given instance in the threadblocks table.
fq_name is a fully qualified database object name in databaselschemalname format, such as test/ def/t1 or sys/def/10/b\$unique.
parent_fq_name is the fully qualified name of this object's parent object (table).
table_id is the table's internal ID generated by NDB. This is the same internal table ID shown in other ndbinfo tables; it is also visible in the output of ndb_show_tables.

The type column shows the type of table. This is always one of System table, User table, Unique hash index, Hash index, Unique ordered index, Ordered index, Hash index trigger, Subscription trigger, Read only constraint, Index trigger, Reorganize trigger, Tablespace, Log file group, Data file, Undo file, Hash map, Foreign key definition, Foreign key parent trigger, Foreign key child trigger, or Schema transaction.

The values shown in all of the columns ex_req, ex_req_imm_ok, ex_wait_ok, ex_wait_fail, sh_req, sh_req_imm_ok, sh_wait_ok, and sh_wait_fail represent cumulative numbers of requests since the table or fragment was created, or since the last restart of this node, whichever of these occurred later. This is also true for the time values shown in the wait_ok_millis and wait_fail_millis columns.

Every lock request is considered either to be in progress, or to have completed in some way (that is, to have succeeded or failed). This means that the following relationships are true:
```
ex_req >= (ex_req_imm_ok + ex_wait_ok + ex_wait_fail)
sh_req >= (sh_req_imm_ok + sh_wait_ok + sh_wait_fail)
```


The number of requests currently in progress is the current number of incomplete requests, which can be found as shown here:
```
[exclusive lock requests in progress] =
    ex_req - (ex_req_imm_ok + ex_wait_ok + ex_wait_fail)
[shared lock requests in progress] =
    sh_req - (sh_req_imm_ok + sh_wait_ok + sh_wait_fail)
```


A failed wait indicates an aborted transaction, but the abort may or may not be caused by a lock wait timeout. You can obtain the total number of aborts while waiting for locks as shown here:
```
[aborts while waiting for locks] = ex_wait_fail + sh_wait_fail
```


\subsection*{25.6.15.43 The ndbinfo logbuffers Table}

The logbuffer table provides information on NDB Cluster log buffer usage.
The logbuffers table contains the following columns:
- node_id

The ID of this data node.
- log_type

Type of log. One of: REDO, DD-UNDO, BACKUP-DATA, or BACKUP-LOG.
- log_id

The log ID; for Disk Data undo log files, this is the same as the value shown in the LOGFILE_GROUP_NUMBER column of the Information Schema FILES table as well as the value shown for the log_id column of the ndbinfo logspaces table
- log_part

The log part number
- total

Total space available for this log
- used

Space used by this log

\section*{Notes}
logbuffers table rows reflecting two additional log types are available when performing an NDB backup. One of these rows has the log type BACKUP-DATA, which shows the amount of data buffer used during backup to copy fragments to backup files. The other row has the log type BACKUPLOG, which displays the amount of log buffer used during the backup to record changes made after the backup has started. One each of these log_type rows is shown in the logbuffers table for each data node in the cluster. These rows are not present unless an NDB backup is currently being performed.

\subsection*{25.6.15.44 The ndbinfo logspaces Table}

This table provides information about NDB Cluster log space usage.
The logspaces table contains the following columns:
- node_id

The ID of this data node.
- log_type

Type of log; one of: REDO or DD-UNDO.
- node_id

The log ID; for Disk Data undo log files, this is the same as the value shown in the LOGFILE_GROUP_NUMBER column of the Information Schema FILES table, as well as the value shown for the log_id column of the ndbinfo logbuffers table
- log_part

The log part number.
- total

Total space available for this log.
- used

Space used by this log.

\subsection*{25.6.15.45 The ndbinfo membership Table}

The membership table describes the view that each data node has of all the others in the cluster, including node group membership, president node, arbitrator, arbitrator successor, arbitrator connection states, and other information.

The membership table contains the following columns:
- node_id

This node's node ID
- group_id

Node group to which this node belongs
- left node

Node ID of the previous node
- right_node

Node ID of the next node
- president

President's node ID
- successor

Node ID of successor to president
- succession_order

Order in which this node succeeds to presidency
- Conf_HB_order
- arbitrator

Node ID of arbitrator
- arb_ticket

Internal identifier used to track arbitration
- arb_state

Arbitration state
- arb_connected

Whether this node is connected to the arbitrator; either of Yes or No
- connected_rank1_arbs

Connected arbitrators of rank 1
- connected_rank2_arbs

Connected arbitrators of rank 1

\section*{Notes}

The node ID and node group ID are the same as reported by ndb_mgm -e "SHOW".
left_node and right_node are defined in terms of a model that connects all data nodes in a circle, in order of their node IDs, similar to the ordering of the numbers on a clock dial, as shown here:

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 25.6 Circular Arrangement of NDB Cluster Nodes}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4429.jpg?height=495&width=613&top_left_y=1356&top_left_x=349}
\end{figure}

In this example, we have 8 data nodes, numbered $5,6,7,8,12,13,14$, and 15 , ordered clockwise in a circle. We determine "left" and "right" from the interior of the circle. The node to the left of node 5 is node 15, and the node to the right of node 5 is node 6 . You can see all these relationships by running the following query and observing the output:
```
mysql> SELECT node_id,left_node,right_node
    -> FROM ndbinfo.membership;
+----------+------------+------------+
| node_id | left_node | right_node |
+----------+------------+------------+

\begin{tabular}{|r|r|r|r|}
\hline 5 & 15 & 6 \\
\hline 6 & 5 & 7 \\
\hline 7 & 6 & 8 \\
\hline 8 & 7 & 12 \\
\hline 12 & 8 & 13 \\
\hline 13 & 12 & 14 \\
\hline 14 & 13 & 15 \\
\hline \multicolumn{1}{|r}{ 8 rows in set $(0.00 \mathrm{sec})$}
\end{tabular}
```


The designations "left" and "right" are used in the event log in the same way.

The president node is the node viewed by the current node as responsible for setting an arbitrator (see NDB Cluster Start Phases). If the president fails or becomes disconnected, the current node expects the node whose ID is shown in the successor column to become the new president. The succession_order column shows the place in the succession queue that the current node views itself as having.

In a normal NDB Cluster, all data nodes should see the same node as president, and the same node (other than the president) as its successor. In addition, the current president should see itself as 1 in the order of succession, the successor node should see itself as 2, and so on.

All nodes should show the same arb_ticket values as well as the same arb_state values. Possible arb_state values are ARBIT_NULL, ARBIT_INIT, ARBIT_FIND, ARBIT_PREP1, ARBIT_PREP2, ARBIT_START, ARBIT_RUN, ARBIT_CHOOSE, ARBIT_CRASH, and UNKNOWN.
arb_connected shows whether this node is connected to the node shown as this node's arbitrator.

The connected_rank1_arbs and connected_rank2_arbs columns each display a list of 0 or more arbitrators having an ArbitrationRank equal to 1 , or to 2 , respectively.

\section*{Note}

Both management nodes and API nodes are eligible to become arbitrators.

\subsection*{25.6.15.46 The ndbinfo memoryusage Table}

Querying this table provides information similar to that provided by the ALL REPORT MemoryUsage command in the ndb_mgm client, or logged by ALL DUMP 1000.

The memoryusage table contains the following columns:
- node_id

The node ID of this data node.
- memory_type

One of Data memory, Index memory, or Long message buffer.
- used

Number of bytes currently used for data memory or index memory by this data node.
- used_pages

Number of pages currently used for data memory or index memory by this data node; see text.
- total

Total number of bytes of data memory or index memory available for this data node; see text.
- total_pages

Total number of memory pages available for data memory or index memory on this data node; see text.

\section*{Notes}

The total column represents the total amount of memory in bytes available for the given resource (data memory or index memory) on a particular data node. This number should be approximately equal to the setting of the corresponding configuration parameter in the config. ini file.

Suppose that the cluster has 2 data nodes having node IDs 5 and 6, and the config. ini file contains the following:
```
[ndbd default]
DataMemory = 1G
IndexMemory = 1G
```


Suppose also that the value of the LongMessageBuffer configuration parameter is allowed to assume its default $(64 \mathrm{MB})$.

The following query shows approximately the same values:
```
mysql> SELECT node_id, memory_type, total
    > FROM ndbinfo.memoryusage;
+----------+---------------------+------------+
| node_id | memory_type | total |
+----------+---------------------+------------+
| 5 | Data memory | 1073741824 |
| 5 | Index memory | 1074003968
| 5 | Long message buffer | 67108864 |
| 6 | Data memory | 1073741824
| 6 | Index memory | 1074003968 |
| 6 | Long message buffer | 67108864 |
+----------+---------------------+------------+
6 rows in set (0.00 sec)
```


In this case, the total column values for index memory are slightly higher than the value set of IndexMemory due to internal rounding.

For the used_pages and total_pages columns, resources are measured in pages, which are 32 K in size for DataMemory and 8K for IndexMemory. For long message buffer memory, the page size is 256 bytes.

\subsection*{25.6.15.47 The ndbinfo memory_per_fragment Table}
- memory_per_fragment Table: Notes
- memory_per_fragment Table: Examples

The memory_per_fragment table provides information about the usage of memory by individual fragments. See the Notes later in this section to see how you can use this to find out how much memory is used by NDB tables.

The memory_per_fragment table contains the following columns:
- fq_name

Name of this fragment
- parent_fq_name

Name of this fragment's parent
- type

Dictionary object type (Object : : Type, in the NDB API) used for this fragment; one of System table, User table, Unique hash index, Hash index, Unique ordered index, Ordered index, Hash index trigger,Subscription trigger,Read only constraint, Index trigger, Reorganize trigger, Tablespace, Log file group, Data file, Undo file, Hash map, Foreign key definition, Foreign key parent trigger, Foreign key child trigger, or Schema transaction.

You can also obtain this list by executing TABLE ndbinfo.dict_obj_types in the mysql client.
- table_id

Table ID for this table
- node_id

Node ID for this node
- block_instance

NDB kernel block instance ID; you can use this number to obtain information about specific threads from the threadblocks table.
- fragment_num

Fragment ID (number)
- fixed_elem_alloc_bytes

Number of bytes allocated for fixed-sized elements
- fixed_elem_free_bytes

Free bytes remaining in pages allocated to fixed-size elements
- fixed_elem_size_bytes

Length of each fixed-size element in bytes
- fixed_elem_count

Number of fixed-size elements
- fixed_elem_free_count

Number of free rows for fixed-size elements
- var_elem_alloc_bytes

Number of bytes allocated for variable-size elements
- var_elem_free_bytes

Free bytes remaining in pages allocated to variable-size elements
- var_elem_count

Number of variable-size elements
- hash_index_alloc_bytes

Number of bytes allocated to hash indexes

\section*{memory_per_fragment Table: Notes}

The memory_per_fragment table contains one row for every table fragment replica and every index fragment replica in the system; this means that, for example, when NoOfReplicas=2, there are normally two fragment replicas for each fragment. This is true as long as all data nodes are running and connected to the cluster; for a data node that is missing, there are no rows for the fragment replicas that it hosts.

The columns of the memory_per_fragment table can be grouped according to their function or purpose as follows:
- Key columns: fq_name, type, table_id, node_id, block_instance, and fragment_num
- Relationship column: parent_fq_name
- Fixed-size storage columns: fixed_elem_alloc_bytes, fixed_elem_free_bytes, fixed_elem_size_bytes, fixed_elem_count, and fixed_elem_free_count
- Variable-sized storage columns: var_elem_alloc_bytes, var_elem_free_bytes, and var_elem_count
- Hash index column: hash_index_alloc_bytes

The parent_fq_name and fq_name columns can be used to identify indexes associated with a table. Similar schema object hierarchy information is available in other ndbinfo tables.

Table and index fragment replicas allocate DataMemory in 32 KB pages. These memory pages are managed as listed here:
- Fixed-size pages: These store the fixed-size parts of rows stored in a given fragment. Every row has a fixed-size part.
- Variable-sized pages: These store variable-sized parts for rows in the fragment. Every row having one or more variable-sized, one or more dynamic columns (or both) has a variable-sized part.
- Hash index pages: These are allocated as 8 KB subpages, and store the primary key hash index structure.

Each row in an NDB table has a fixed-size part, consisting of a row header, and one or more fixed-size columns. The row may also contain one or more variable-size part references, one or more disk part references, or both. Each row also has a primary key hash index entry (corresponding to the hidden primary key that is part of every NDB table).

From the foregoing we can see that each table fragment and index fragment together allocate the amount of DataMemory calculated as shown here:
```
DataMemory =
    (number_of_fixed_pages + number_of_var_pages) * 32KB
        + number_of_hash_pages * 8KB
```


Since fixed_elem_alloc_bytes and var_elem_alloc_bytes are always multiples of 32768 bytes, we can further determine that number_of_fixed_pages = fixed_elem_alloc_bytes / 32768 and number_of_var_pages = var_elem_alloc_bytes / 32768. hash_index_alloc_bytes is always a multiple of 8192 bytes, so number_of_hash_pages = hash_index_alloc_bytes / 8192.

A fixed size page has an internal header and a number of fixed-size slots, each of which can contain one row's fixed-size part. The size of a given row's fixed size part is schema-dependent, and is provided by the fixed_elem_size_bytes column; the number of fixed-size slots per page can be determined by calculating the total number of slots and the total number of pages, like this:
```
fixed_slots = fixed_elem_count + fixed_elem_free_count
fixed_pages = fixed_elem_alloc_bytes / 32768
slots_per_page = total_slots / total_pages
```

fixed_elem_count is in effect the row count for a given table fragment, since each row has 1 fixed element, fixed_elem_free_count is the total number of free fixed-size slots across the allocated pages. fixed_elem_free_bytes is equal to fixed_elem_free_count * fixed_elem_size_bytes.

A fragment can have any number of fixed-size pages; when the last row on a fixed-size page is deleted, the page is released to the DataMemory page pool. Fixed-size pages can be fragmented, with more pages allocated than is required by the number of fixed-size slots in use. You can check whether
this is the case by comparing the pages required to the pages allocated, which you can calculate like this:
```
fixed_pages_required = 1 + (fixed_elem_count / slots_per_page)
fixed_page_utilization = fixed_pages_required / fixed_pages
```


A variable-sized page has an internal header and uses the remaining space to store one or more variable-sized row parts; the number of parts stored depends on the schema and the actual data stored. Since not all schemas or rows have a variable-sized part, var_elem_count can be less than fixed_elem_count. The total free space available on all variable-sized pages in the fragment is shown by the var_elem_free_bytes column; because this space may be spread over multiple pages, it cannot necessarily be used to store an entry of a particular size. Each variable-sized page is reorganized as needed to fit the changing size of variable-sized row parts as they are inserted, updated, and deleted; if a given row part grows too large for the page it is in, it can be moved to a different page.

Variable-sized page utilisation can be calculated as shown here:
```
var_page_used_bytes = var_elem_alloc_bytes - var_elem_free_bytes
var_page_utilisation = var_page_used_bytes / var_elem_alloc_bytes
avg_row_var_part_size = var_page_used_bytes / fixed_elem_count
```


We can obtain the average variable part size per row like this:
```
avg_row_var_part_size = var_page_used_bytes / fixed_elem_count
```


Secondary unique indexes are implemented internally as independent tables with the following schema:
- Primary key: Indexed columns in base table.
- Values: Primary key columns from base table.

These tables are distributed and fragmented as normal. This means that their fragment replicas use fixed, variable, and hash index pages as with any other NDB table.

Secondary ordered indexes are fragmented and distributed in the same way as the base table. Ordered index fragments are T-tree structures which maintain a balanced tree containing row references in the order implied by the indexed columns. Since the tree contains references rather than actual data, the T-tree storage cost is not dependent on the size or number of indexed columns, but is rather a function of the number of rows. The tree is constructed using fixed-size node structures, each of which may contain a number of row references; the number of nodes required depends on the number of rows in the table, and the tree structure necessary to represent the ordering. In the memory_per_fragment table, we can see that ordered indexes allocate only fixed-size pages, so as usual the relevant columns from this table are as listed here:
- fixed_elem_alloc_bytes: This is equal to 32768 times the number of fixed-size pages.
- fixed_elem_count: The number of T-tree nodes in use.
- fixed_elem_size_bytes: The number of bytes per T-tree node.
- fixed_elem_free_count: The number of T-tree node slots available in the pages allocated.
- fixed_elem_free_bytes: This is equal to fixed_elem_free_count * fixed_elem_size_bytes.

If free space in a page is fragmented, the page is defragmented. OPTIMIZE TABLE can be used to defragment a table's variable-sized pages; this moves row variable-sized parts between pages so that some whole pages can be freed for re-use.

\section*{memory_per_fragment Table: Examples}
- Getting general information about fragments and memory usage
- Finding a table and its indexes
- Finding the memory allocated by schema elements
- Finding the memory allocated for a table and all indexes
- Finding the memory allocated per row
- Finding the total memory in use per row
- Finding the memory allocated per element
- Finding the average memory allocated per row, by element
- Finding the average memory allocated per row
- Finding the average memory allocated per row for a table
- Finding the memory in use by each schema element
- Finding the average memory in use by each schema element
- Finding the average memory in use per row, by element
- Finding the total average memory in use per row

For the following examples, we create a simple table with three integer columns, one of which has a primary key, one having a unique index, and one with no indexes, as well as one VARCHAR column with no indexes, as shown here:
```
mysql> CREATE DATABASE IF NOT EXISTS test;
Query OK, 1 row affected (0.06 sec)
mysql> USE test;
Database changed
mysql> CREATE TABLE t1 (
    -> c1 BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    -> c2 INT,
    -> c3 INT UNIQUE,
    -> ) ENGINE=NDBCLUSTER;
Query OK, 0 rows affected (0.27 sec)
```


Following creation of the table, we insert 50,000 rows containing random data; the precise method of generating and inserting these rows makes no practical difference, and we leave the method of accomplishing as an exercise for the user.

