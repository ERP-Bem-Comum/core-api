\section*{Getting general information about fragments and memory usage}

This query shows general information about memory usage for each fragment:
```
mysql> SELECT
    -> fq_name, node_id, block_instance, fragment_num, fixed_elem_alloc_bytes,
    -> fixed_elem_free_bytes, fixed_elem_size_bytes, fixed_elem_count,
    -> fixed_elem_free_count, var_elem_alloc_bytes, var_elem_free_bytes,
    -> var_elem_count
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name = "test/def/t1"\G
*************************** 1. r OW ***************************************
                fq_name: test/def/t1
                node_id: 5
        block_instance: 1
            fragment_num: 0
fixed_elem_alloc_bytes: 1114112
```

```
fixed_elem_free_bytes: 11836
fixed_elem_size_bytes: 44
        fixed_elem_count: 24925
fixed_elem_free_count: 269
    var_elem_alloc_bytes: 1245184
        var_elem_free_bytes: 32552
                var_elem_count: 24925
*************************** 2. row ****************************************
                        fq_name: test/def/t1
                        node_id: 5
                block_instance: 1
                    fragment_num: 1
fixed_elem_alloc_bytes: 1114112
fixed_elem_free_bytes: 5236
fixed_elem_size_bytes: 44
            fixed_elem_count: 25075
fixed_elem_free_count: 119
    var_elem_alloc_bytes: 1277952
        var_elem_free_bytes: 54232
                var_elem_count: 25075
                        ************ 3. row
                        fq_name: test/def/t1
                        node_id: 6
                block_instance: 1
                    fragment_num: 0
fixed_elem_alloc_bytes: 1114112
fixed_elem_free_bytes: 11836
fixed_elem_size_bytes: 44
            fixed_elem_count: 24925
fixed_elem_free_count: 269
    var_elem_alloc_bytes: 1245184
        var_elem_free_bytes: 32552
                var_elem_count: 24925
                        ************ 4. row
                        fq_name: test/def/t1
                        node_id: 6
                block_instance: 1
                    fragment_num: 1
fixed_elem_alloc_bytes: 1114112
fixed_elem_free_bytes: 5236
fixed_elem_size_bytes: 44
            fixed_elem_count: 25075
fixed_elem_free_count: 119
    var_elem_alloc_bytes: 1277952
        var_elem_free_bytes: 54232
                var_elem_count: 25075
4 rows in set (0.12 sec)
```


\section*{Finding a table and its indexes}

This query can be used to find a specific table and its indexes:
```
mysql> SELECT fq_name
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name = 'test/def/t1' OR parent_fq_name='test/def/t1'
    -> GROUP BY fq_name;
+-----------------------+
| fq_name |
+-----------------------+
    | test/def/t1
    | sys/def/13/PRIMARY
    | sys/def/13/c3
    | sys/def/13/c3$unique |
+-----------------------+
4 rows in set (0.13 sec)
mysql> SELECT COUNT(*) FROM t1;
+----------+
    COUNT(*) |
+----------+
        50000 |
+----------+
```

```
1 row in set (0.00 sec)
```


\section*{Finding the memory allocated by schema elements}

This query shows the memory allocated by each schema element (in total across all replicas):
```
mysql> SELECT
    -> fq_name AS Name,
    -> SUM(fixed_elem_alloc_bytes) AS Fixed,
    -> SUM(var_elem_alloc_bytes) AS Var,
    -> SUM(hash_index_alloc_bytes) AS Hash,
    -> SUM(fixed_elem_alloc_bytes+var_elem_alloc_bytes+hash_index_alloc_bytes) AS Total
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name = 'test/def/t1' OR parent_fq_name='test/def/t1'
    -> GROUP BY fq_name;

\begin{tabular}{|l|l|l|l|l|}
\hline Name & Fixed & Var & Hash & Total \\
\hline test/def/t1 & 4456448 & 5046272 & 1425408 & 10928128 \\
\hline sys/def/13/PRIMARY & 1966080 & 0 & 0 & 1966080 \\
\hline sys/def/13/c3 & 1441792 & 0 & 0 & 1441792 \\
\hline sys/def/13/c3\$unique & 3276800 & 0 & 1425408 & 4702208 \\
\hline
\end{tabular}
4 rows in set (0.11 sec)
```


\section*{Finding the memory allocated for a table and all indexes}

The sum of memory allocated for the table and all its indexes (in total across all replicas) can be obtained using the query shown here:
```
mysql> SELECT
    -> SUM(fixed_elem_alloc_bytes) AS Fixed,
    -> SUM(var_elem_alloc_bytes) AS Var,
    -> SUM(hash_index_alloc_bytes) AS Hash,
    -> SUM(fixed_elem_alloc_bytes+var_elem_alloc_bytes+hash_index_alloc_bytes) AS Total
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name = 'test/def/t1' OR parent_fq_name='test/def/t1';
+----------+----------+---------+----------+
| Fixed | Var | Hash | Total |
+----------+---------+----------+-----------+
+----------+----------+---------+----------+
1 row in set (0.12 sec)
```


This is an abbreviated version of the previous query which shows only the total memory used by the table:
```
mysql> SELECT
    -> SUM(fixed_elem_alloc_bytes+var_elem_alloc_bytes+hash_index_alloc_bytes) AS Total
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name = 'test/def/t1' OR parent_fq_name='test/def/t1';
+-----------+
| Total |
+-----------+
| 19038208 |
+-----------+
1 row in set (0.12 sec)
```


\section*{Finding the memory allocated per row}

The following query shows the total memory allocated per row (across all replicas):
```
mysql> SELECT
    -> SUM(fixed_elem_alloc_bytes+var_elem_alloc_bytes+hash_index_alloc_bytes)
    -> /
    -> SUM(fixed_elem_count) AS Total_alloc_per_row
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name = 'test/def/t1';
+----------------------+
| Total_alloc_per_row
```

```
+---------------------+
| 109.2813 |
+---------------------+
1 row in set (0.12 sec)
```


\section*{Finding the total memory in use per row}

To obtain the total memory in use per row (across all replicas), we need the total memory used divided by the row count, which is the fixed_elem_count for the base table like this:
```
mysql> SELECT
    -> SUM(
    -> (fixed_elem_alloc_bytes - fixed_elem_free_bytes)
    -> + (var_elem_alloc_bytes - var_elem_free_bytes)
    -> + hash_index_alloc_bytes
    -> )
    -> /
    -> SUM(fixed_elem_count)
    -> AS total_in_use_per_row
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name = 'test/def/t1';
+-----------------------+
| total_in_use_per_row |
+-----------------------+
| 107.2042 |
+-----------------------+
1 row in set (0.12 sec)
```


\section*{Finding the memory allocated per element}

The memory allocated by each schema element (in total across all replicas) can be found using the following query:
```
mysql> SELECT
    -> fq_name AS Name,
    -> SUM(fixed_elem_alloc_bytes) AS Fixed,
    -> SUM(var_elem_alloc_bytes) AS Var,
    -> SUM(hash_index_alloc_bytes) AS Hash,
    -> SUM(fixed_elem_alloc_bytes + var_elem_alloc_bytes + hash_index_alloc_bytes)
    -> AS Total_alloc
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name = 'test/def/t1' OR parent_fq_name='test/def/t1'
    -> GROUP BY fq_name;

\begin{tabular}{|l|l|l|l|l|}
\hline Name & Fixed & Var & Hash & Total_alloc \\
\hline test/def/t1 & 4456448 & 5046272 & 1425408 & 10928128 \\
\hline sys/def/13/PRIMARY & 1966080 & 0 & 0 & 1966080 \\
\hline sys/def/13/c3 & 1441792 & 0 & 0 & 1441792 \\
\hline sys/def/13/c3\$unique & 3276800 & 0 & 1425408 & 4702208 \\
\hline \multicolumn{5}{|c|}{4 rows in set ( 0.11 sec )} \\
\hline
\end{tabular}
```


\section*{Finding the average memory allocated per row, by element}

To obtain the average memory allocated per row by each schema element (in total across all replicas), we use a subquery to get the base table fixed element count each time to get an average per row since fixed_elem_count for the indexes is not necessarily the same as for the base table, as shown here:
```
mysql> SELECT
    -> fq_name AS Name,
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS Table_rows,
    ->
    -> SUM(fixed_elem_alloc_bytes)
    -> /
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS Avg_fixed_alloc,
```

```
    -> SUM(var_elem_alloc_bytes)
    -> /
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') as Avg_var_alloc,
    ->
    -> SUM(hash_index_alloc_bytes)
    -> /
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') as Avg_hash_alloc,
    ->
    -> SUM(fixed_elem_alloc_bytes+var_elem_alloc_bytes+hash_index_alloc_bytes)
    -> /
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') as Avg_total_alloc
    ->
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name = 'test/def/t1' or parent_fq_name='test/def/t1'
    -> GROUP BY fq_name;
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4439.jpg?height=309&width=1720&top_left_y=982&top_left_x=347)

\section*{Finding the average memory allocated per row}

Average memory allocated per row (in total across all replicas):
```
mysql> SELECT
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS Table_rows,
    ->
    -> SUM(fixed_elem_alloc_bytes)
    -> /
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS Avg_fixed_alloc,
    ->
    -> SUM(var_elem_alloc_bytes)
    -> /
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS Avg_var_alloc,
    ->
    -> SUM(hash_index_alloc_bytes)
    -> /
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS Avg_hash_alloc,
    ->
    -> SUM(fixed_elem_alloc_bytes + var_elem_alloc_bytes + hash_index_alloc_bytes)
    -> /
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS Avg_total_alloc
    ->
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name = 'test/def/t1' OR parent_fq_name='test/def/t1';
+-------------+------------------+--------------+----------------+---------------
| Table_rows | Avg_fixed_alloc | Avg_var_alloc | Avg_hash_alloc | Avg_total_alloc |
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4439.jpg?height=94&width=1392&top_left_y=2572&top_left_x=351)
```
1 row in set (0.71 sec)
```


\section*{Finding the average memory allocated per row for a table}

To get the average amount of memory allocated per row for the entire table across all replicas, we can use the query shown here:
```
mysql> SELECT
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS table_rows,
    ->
    -> SUM(fixed_elem_alloc_bytes + var_elem_alloc_bytes + hash_index_alloc_bytes)
    -> /
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS avg_total_alloc
    ->
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name = 'test/def/t1' OR parent_fq_name='test/def/t1';
+------------+-----------------+
| table_rows | avg_total_alloc |
+------------+-----------------+
| 100000 | 190.3821 |
+-------------+-----------------+
1 row in set (0.33 sec)
```


\section*{Finding the memory in use by each schema element}

To obtain the memory in use per schema element across all replicas, we need to sum the difference between allocated and free memory for each element, like this:
```
mysql> SELECT
    -> fq_name AS Name,
    -> SUM(fixed_elem_alloc_bytes - fixed_elem_free_bytes) AS fixed_inuse,
    -> SUM(var_elem_alloc_bytes-var_elem_free_bytes) AS var_inuse,
    -> SUM(hash_index_alloc_bytes) AS hash_memory,
    -> SUM( (fixed_elem_alloc_bytes - fixed_elem_free_bytes)
    -> + (var_elem_alloc_bytes - var_elem_free_bytes)
    -> + hash_index_alloc_bytes) AS total_alloc
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name = 'test/def/t1' OR parent_fq_name='test/def/t1'
    -> GROUP BY fq_name;
+-----------------------+-------------+-----------+---------+--------------
| fq_name | fixed_inuse | var_inuse | hash | total_alloc |
+------------------------+-------------+-----------+---------+--------------
| test/def/t1 
```


\section*{Finding the average memory in use by each schema element}

This query gets the average memory in use per schema element across all replicas:
```
mysql> SELECT
    -> fq_name AS Name,
    ->
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS table_rows,
    ->
    -> SUM(fixed_elem_alloc_bytes - fixed_elem_free_bytes)
    -> /
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS avg_fixed_inuse,
    ->
```

```
    -> SUM(var_elem_alloc_bytes - var_elem_free_bytes)
    -> /
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS avg_var_inuse,
    ->
    -> SUM(hash_index_alloc_bytes)
    -> /
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS avg_hash,
    ->
    -> SUM(
    -> (fixed_elem_alloc_bytes - fixed_elem_free_bytes)
    -> + (var_elem_alloc_bytes - var_elem_free_bytes) + hash_index_alloc_bytes)
    -> /
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS avg_total_inuse
    ->
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name = 'test/def/t1' OR parent_fq_name='test/def/t1'
    -> GROUP BY fq_name;
+-----------------------+------------+------------------+----------------+----------+------------------+
```


\section*{Finding the average memory in use per row, by element}

This query gets the average memory in use per row, by element, across all replicas:
```
mysql> SELECT
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS table_rows,
    ->
    -> SUM(fixed_elem_alloc_bytes - fixed_elem_free_bytes)
    -> /
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS avg_fixed_inuse,
    ->
    -> SUM(var_elem_alloc_bytes - var_elem_free_bytes)
    -> /
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS avg_var_inuse,
    ->
    -> SUM(hash_index_alloc_bytes)
    -> /
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS avg_hash,
    ->
    -> SUM(
    -> (fixed_elem_alloc_bytes - fixed_elem_free_bytes)
    -> + (var_elem_alloc_bytes - var_elem_free_bytes)
    -> + hash_index_alloc_bytes)
    -> /
    -> ( SELECT SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS avg_total_inuse
    ->
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name = 'test/def/t1' OR parent_fq_name='test/def/t1';
+-------------+------------------+---------------+----------+----------------
```

```
| table_rows | avg_fixed_inuse | avg_var_inuse | avg_hash | avg_total_inuse |
+-------------+------------------+---------------+----------+-----------------
| 100000 | 110.1469 | 48.7270 | 28.5082 | 187.3821 |
+-------------+------------------+---------------+----------+-----------------
1 row in set (0.68 sec)
```


\section*{Finding the total average memory in use per row}

This query obtains the total average memory in use, per row:
```
mysql> SELECT
    -> SUM(
    -> (fixed_elem_alloc_bytes - fixed_elem_free_bytes)
    -> + (var_elem_alloc_bytes - var_elem_free_bytes)
    -> + hash_index_alloc_bytes)
    -> /
    -> ( SELECT
    -> SUM(fixed_elem_count)
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name='test/def/t1') AS avg_total_in_use
    -> FROM ndbinfo.memory_per_fragment
    -> WHERE fq_name = 'test/def/t1' OR parent_fq_name='test/def/t1';
+-------------------+
| avg_total_in_use |
+-------------------+
| 187.3821 |
+-------------------+
1 row in set (0.24 sec)
```


\subsection*{25.6.15.48 The ndbinfo nodes Table}

This table contains information on the status of data nodes. For each data node that is running in the cluster, a corresponding row in this table provides the node's node ID, status, and uptime. For nodes that are starting, it also shows the current start phase.

The nodes table contains the following columns:
- node_id

The data node's unique node ID in the cluster.
- uptime

Time since the node was last started, in seconds.
- status

Current status of the data node; see text for possible values.
- start_phase

If the data node is starting, the current start phase.
- config_generation

The version of the cluster configuration file in use on this data node.

\section*{Notes}

The uptime column shows the time in seconds that this node has been running since it was last started or restarted. This is a BIGINT value. This figure includes the time actually needed to start the node; in other words, this counter starts running the moment that ndbd or ndbmtd is first invoked; thus, even for a node that has not yet finished starting, uptime may show a nonzero value.

The status column shows the node's current status. This is one of: NOTHING, CMVMI, STARTING, STARTED, SINGLEUSER, STOPPING_1, STOPPING_2, STOPPING_3, or STOPPING_4. When the
status is STARTING, you can see the current start phase in the start_phase column (see later in this section). SINGLEUSER is displayed in the status column for all data nodes when the cluster is in single user mode (see Section 25.6.6, "NDB Cluster Single User Mode"). Seeing one of the STOPPING states does not necessarily mean that the node is shutting down but can mean rather that it is entering a new state. For example, if you put the cluster in single user mode, you can sometimes see data nodes report their state briefly as STOPPING_2 before the status changes to SINGLEUSER.

The start_phase column uses the same range of values as those used in the output of the ndb_mgm client node_id STATUS command (see Section 25.6.1, "Commands in the NDB Cluster Management Client"). If the node is not currently starting, then this column shows 0 . For a listing of NDB Cluster start phases with descriptions, see Section 25.6.4, "Summary of NDB Cluster Start Phases".

The config_generation column shows which version of the cluster configuration is in effect on each data node. This can be useful when performing a rolling restart of the cluster in order to make changes in configuration parameters. For example, from the output of the following SELECT statement, you can see that node 3 is not yet using the latest version of the cluster configuration (6) although nodes 1,2 , and 4 are doing so:
```
mysql> USE ndbinfo;
Database changed
mysql> SELECT * FROM nodes;
+----------+---------+---------+-------------+-------------------
| node_id | uptime | status | start_phase | config_generation |
+----------+--------+---------+-------------+------------------+
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4443.jpg?height=166&width=1077&top_left_y=1171&top_left_x=351)
```
2 rows in set (0.04 sec)
```


Therefore, for the case just shown, you should restart node 3 to complete the rolling restart of the cluster.

Nodes that are stopped are not accounted for in this table. Suppose that you have an NDB Cluster with 4 data nodes (node IDs 1, 2, 3 and 4), and all nodes are running normally, then this table contains 4 rows, 1 for each data node:
```
mysql> USE ndbinfo;
Database changed
mysql> SELECT * FROM nodes;
+----------+---------+---------+-------------+-------------------
| node_id | uptime | status | start_phase | config_generation |
+----------+---------+---------+-------------+-------------------
|
+----------+--------+---------+-------------+-------------------
4 rows in set (0.04 sec)
```


If you shut down one of the nodes, only the nodes that are still running are represented in the output of this SELECT statement, as shown here:
```
ndb_mgm> 2 STOP
Node 2: Node shutdown initiated
Node 2: Node shutdown completed.
Node 2 has shutdown.
```

```
mysql> SELECT * FROM nodes;
+----------+---------+---------+-------------+------------------+
| node_id | uptime | status | start_phase | config_generation |
+----------+--------+---------+-------------+-------------------
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4443.jpg?height=135&width=1077&top_left_y=2531&top_left_x=351)

3 rows in set ( 0.02 sec )

\subsection*{25.6.15.49 The ndbinfo operations_per_fragment Table}

The operations_per_fragment table provides information about the operations performed on individual fragments and fragment replicas, as well as about some of the results from these operations.

The operations_per_fragment table contains the following columns:
- fq_name

Name of this fragment
- parent_fq_name

Name of this fragment's parent
- type

Type of object; see text for possible values
- table_id

Table ID for this table
- node_id

Node ID for this node
- block_instance

Kernel block instance ID
- fragment_num

Fragment ID (number)
- tot_key_reads

Total number of key reads for this fragment replica
- tot_key_inserts

Total number of key inserts for this fragment replica
- tot_key_updates
total number of key updates for this fragment replica
- tot_key_writes

Total number of key writes for this fragment replica
- tot_key_deletes

Total number of key deletes for this fragment replica
- tot_key_refs

Number of key operations refused
- tot_key_attrinfo_bytes

Total size of all attrinfo attributes
- tot_key_keyinfo_bytes

Total size of all keyinfo attributes
- tot_key_prog_bytes

Total size of all interpreted programs carried by attrinfo attributes
- tot_key_inst_exec

Total number of instructions executed by interpreted programs for key operations
- tot_key_bytes_returned

Total size of all data and metadata returned from key read operations
- tot_frag_scans

Total number of scans performed on this fragment replica
- tot_scan_rows_examined

Total number of rows examined by scans
- tot_scan_rows_returned

Total number of rows returned to client
- tot_scan_bytes_returned

Total size of data and metadata returned to the client
- tot_scan_prog_bytes

Total size of interpreted programs for scan operations
- tot_scan_bound_bytes

Total size of all bounds used in ordered index scans
- tot_scan_inst_exec

Total number of instructions executed for scans
- tot_qd_frag_scans

Number of times that scans of this fragment replica have been queued
- conc_frag_scans

Number of scans currently active on this fragment replica (excluding queued scans)
- conc_qd_frag_scans

Number of scans currently queued for this fragment replica
- tot_commits

Total number of row changes committed to this fragment replica

\section*{Notes}

The fq_name contains the fully qualified name of the schema object to which this fragment replica belongs. This currently has the following formats:
- Base table: DbName/def/TblName
- BLOB table: DbName/def/NDB\$BLOB_BaseTblId_ColNo
- Ordered index: sys/def/BaseTblId/IndexName
- Unique index: sys/def/BaseTblId/IndexName\$unique

The \$unique suffix shown for unique indexes is added by mysqld; for an index created by a different NDB API client application, this may differ, or not be present.

The syntax just shown for fully qualified object names is an internal interface which is subject to change in future releases.

Consider a table t1 created and modified by the following SQL statements:
```
CREATE DATABASE mydb;
USE mydb;
CREATE TABLE t1 (
    a INT NOT NULL,
    b INT NOT NULL,
    t TEXT NOT NULL,
    PRIMARY KEY (b)
) ENGINE=ndbcluster;
CREATE UNIQUE INDEX ix1 ON t1(b) USING HASH;
```


If t1 is assigned table ID 11, this yields the fq_name values shown here:
- Base table: mydb/def/t1
- BLOB table: mydb/def/NDB\$BLOB_11_2
- Ordered index (primary key): sys/def/11/PRIMARY
- Unique index: sys/def/11/ix1\$unique

For indexes or BLOB tables, the parent_fq_name column contains the fq_name of the corresponding base table. For base tables, this column is always NULL.

The type column shows the schema object type used for this fragment, which can take any one of the values System table, User table, Unique hash index, or Ordered index. BLOB tables are shown as User table.

The table_id column value is unique at any given time, but can be reused if the corresponding object has been deleted. The same ID can be seen using the ndb_show_tables utility.

The block_instance column shows which LDM instance this fragment replica belongs to. You can use this to obtain information about specific threads from the threadblocks table. The first such instance is always numbered 0 .

Since there are typically two fragment replicas, and assuming that this is so, each fragment_num value should appear twice in the table, on two different data nodes from the same node group.

Since NDB does not use single-key access for ordered indexes, the counts for tot_key_reads, tot_key_inserts, tot_key_updates, tot_key_writes, and tot_key_deletes are not incremented by ordered index operations.

\section*{Note}

When using tot_key_writes, you should keep in mind that a write operation in this context updates the row if the key exists, and inserts a new row

Iotherwise. (One use of this is in the NDB implementation of the REPLACE SQL statement.)

The tot_key_refs column shows the number of key operations refused by the LDM. Generally, such a refusal is due to duplicate keys (inserts), Key not found errors (updates, deletes, and reads), or the operation was rejected by an interpreted program used as a predicate on the row matching the key.

The attrinfo and keyinfo attributes counted by the tot_key_attrinfo_bytes and tot_key_keyinfo_bytes columns are attributes of an LQHKEYREQ signal (see The NDB Communication Protocol) used to initiate a key operation by the LDM. An attrinfo typically contains tuple field values (inserts and updates) or projection specifications (for reads); keyinfo contains the primary or unique key needed to locate a given tuple in this schema object.

The value shown by tot_frag_scans includes both full scans (that examine every row) and scans of subsets. Unique indexes and BLOB tables are never scanned, so this value, like other scan-related counts, is 0 for fragment replicas of these.
tot_scan_rows_examined may display less than the total number of rows in a given fragment replica, since ordered index scans can limited by bounds. In addition, a client may choose to end a scan before all potentially matching rows have been examined; this occurs when using an SQL statement containing a LIMIT or EXISTS clause, for example. tot_scan_rows_returned is always less than or equal to tot_scan_rows_examined.
tot_scan_bytes_returned includes, in the case of pushed joins, projections returned to the DBSPJ block in the NDB kernel.
tot_qd_frag_scans can be effected by the setting for the MaxParallelScansPerFragment data node configuration parameter, which limits the number of scans that may execute concurrently on a single fragment replica.

\subsection*{25.6.15.50 The ndbinfo pgman_time_track_stats Table}

This table provides information regarding the latency of disk operations for NDB Cluster Disk Data tablespaces.

The pgman_time_track_stats table contains the following columns:
- node_id

Unique node ID of this node in the cluster
- block_number

Block number (from blocks table)
- block_instance

Block instance number
- upper_bound

Upper bound
- page_reads

Page read latency (ms)
- page_writes

Page write latency (ms)
- log_waits

Log wait latency (ms)
- get_page

Latency of get_page( ) calls (ms)

\section*{Notes}

The read latency (page_reads column) measures the time from when the read request is sent to the file system thread until the read is complete and has been reported back to the execution thread. The write latency (page_writes) is calculated in a similar fashion. The size of the page read to or written from a Disk Data tablespace is always 32 KB .

Log wait latency (log_waits column) is the length of time a page write must wait for the undo log to be flushed, which must be done prior to each page write.

\subsection*{25.6.15.51 The ndbinfo processes Table}

This table contains information about NDB Cluster node processes; each node is represented by the row in the table. Only nodes that are connected to the cluster are shown in this table. You can obtain information about nodes that are configured but not connected to the cluster from the nodes and config_nodes tables.

The processes table contains the following columns:
- node_id

The node's unique node ID in the cluster
- node_type

Type of node (management, data, or API node; see text)
- node_version

Version of the NDB software program running on this node.
- process_id

This node's process ID
- angel_process_id

Process ID of this node's angel process
- process_name

Name of the executable
- service_URI

Service URI of this node (see text)

\section*{Notes}
node_id is the ID assigned to this node in the cluster.
The node_type column displays one of the following three values:
- MGM: Management node.
- NDB: Data node.
- API: API or SQL node.

For an executable shipped with the NDB Cluster distribution, node_version shows the software Cluster version string, such as 8.4.7-ndb-8.4.7.
process_id is the node executable's process ID as shown by the host operating system using a process display application such as top on Linux, or the Task Manager on Windows platforms.
angel_process_id is the system process ID for the node's angel process, which ensures that a data node or SQL is automatically restarted in cases of failures. For management nodes and API nodes other than SQL nodes, the value of this column is NULL.

The process_name column shows the name of the running executable. For management nodes, this is ndb_mgmd. For data nodes, this is ndbd (single-threaded) or ndbmtd (multithreaded). For SQL nodes, this is mysqld. For other types of API nodes, it is the name of the executable program connected to the cluster; NDB API applications can set a custom value for this using Ndb_cluster_connection::set_name().
service_URI shows the service network address. For management nodes and data nodes, the scheme used is ndb://. For SQL nodes, this is mysql://. By default, API nodes other than SQL nodes use ndb : // for the scheme; NDB API applications can set this to a custom value using Ndb_cluster_connection: :set_service_uri(). regardless of the node type, the scheme is followed by the IP address used by the NDB transporter for the node in question. For management nodes and SQL nodes, this address includes the port number (usually 1186 for management nodes and 3306 for SQL nodes). If the SQL node was started with the bind_address system variable set, this address is used instead of the transporter address, unless the bind address is set to *, 0.0 .0 .0 , or : :

Additional path information may be included in the service_URI value for an SQL node reflecting various configuration options. For example, mysql://198.51.100.3/tmp/mysql.sock indicates that the SQL node was started with the skip_networking system variable enabled, and mysql://198.51.100.3:3306/?server-id=1 shows that replication is enabled for this SQL node.

\subsection*{25.6.15.52 The ndbinfo resources Table}

This table provides information about data node resource availability and usage.
These resources are sometimes known as super-pools.
The resources table contains the following columns:
- node_id

The unique node ID of this data node.
- resource_name

Name of the resource; see text.
- reserved

The amount reserved for this resource, as a number of 32 KB pages.
- used

The amount actually used by this resource, as a number of 32 KB pages.
- max

The maximum amount (number of 32 KB pages) of this resource that is available to this data node.

\section*{Notes}

The resource_name can be any one of the names shown in the following table:
- RESERVED: Reserved by the system; cannot be overridden.
- TRANSACTION_MEMORY: Memory allocated for transactions on this data node. This can be controlled using the TransactionMemory configuration parameter.
- DISK_OPERATIONS: If a log file group is allocated, the size of the undo log buffer is used to set the size of this resource. This resource is used only to allocate the undo log buffer for an undo log file group; there can only be one such group. Overallocation occurs as needed by CREATE LOGFILE GROUP.
- DISK_RECORDS: Records allocated for Disk Data operations.
- DATA_MEMORY: Used for main memory tuples, indexes, and hash indexes. Sum of DataMemory and IndexMemory, plus 8 pages of 32 KB each if IndexMemory has been set. Cannot be overallocated.
- JOBBUFFER: Used for allocating job buffers by the NDB scheduler; cannot be overallocated. This is approximately 2 MB per thread plus a 1 MB buffer in both directions for all threads that can communicate. For large configurations this consume several GB.
- FILE_BUFFERS: Used by the redo log handler in the DBLQH kernel block; cannot be overallocated. Size is NoOfFragmentLogParts * RedoBuffer, plus 1 MB per log file part.
- TRANSPORTER_BUFFERS: Used for send buffers by ndbmtd; the sum of TotalSendBufferMemory and ExtraSendBufferMemory. This resource that can be overallocated by up to 25 percent. TotalSendBufferMemory is calculated by summing the send buffer memory per node, the default value of which is 2 MB . Thus, in a system having four data nodes and eight API nodes, the data nodes have 12 * 2 MB send buffer memory. ExtraSendBufferMemory is used by ndbmtd and amounts to 2 MB extra memory per thread. Thus, with 4 LDM threads, 2 TC threads, 1 main thread, 1 replication thread, and 2 receive threads, ExtraSendBufferMemory is 10 * 2 MB . Overallocation of this resource can be performed by setting the SharedGlobalMemory data node configuration parameter.
- DISK_PAGE_BUFFER: Used for the disk page buffer; determined by the DiskPageBufferMemory configuration parameter. Cannot be overallocated.
- QUERY_MEMORY: Used by the DBSPJ kernel block.
- SCHEMA_TRANS_MEMORY: Minimum is 2 MB ; can be overallocated to use any remaining available memory.

\subsection*{25.6.15.53 The ndbinfo restart_info Table}

The restart_info table contains information about node restart operations. Each entry in the table corresponds to a node restart status report in real time from a data node with the given node ID. Only the most recent report for any given node is shown.

The restart_info table contains the following columns:
- node_id

Node ID in the cluster
- node_restart_status

Node status; see text for values. Each of these corresponds to a possible value of node_restart_status_int.
- node_restart_status_int

Node status code; see text for values.
- secs_to_complete_node_failure

Time in seconds to complete node failure handling
- secs_to_allocate_node_id

Time in seconds from node failure completion to allocation of node ID
- secs_to_include_in_heartbeat_protocol

Time in seconds from allocation of node ID to inclusion in heartbeat protocol
- secs_until_wait_for_ndbcntr_master

Time in seconds from being included in heartbeat protocol until waiting for NDBCNTR master began
- secs_wait_for_ndbcntr_master

Time in seconds spent waiting to be accepted by NDBCNTR master for starting
- secs_to_get_start_permitted

Time in seconds elapsed from receiving of permission for start from master until all nodes have accepted start of this node
- secs_to_wait_for_lcp_for_copy_meta_data

Time in seconds spent waiting for LCP completion before copying metadata
- secs_to_copy_meta_data

Time in seconds required to copy metadata from master to newly starting node
- secs_to_include_node

Time in seconds waited for GCP and inclusion of all nodes into protocols
- secs_starting_node_to_request_local_recovery

Time in seconds that the node just starting spent waiting to request local recovery
- secs_for_local_recovery

Time in seconds required for local recovery by node just starting
- secs_restore_fragments

Time in seconds required to restore fragments from LCP files
- secs_undo_disk_data

Time in seconds required to execute undo log on disk data part of records
- secs_exec_redo_log

Time in seconds required to execute redo log on all restored fragments
- secs_index_rebuild

Time in seconds required to rebuild indexes on restored fragments
- secs_to_synchronize_starting_node

Time in seconds required to synchronize starting node from live nodes
- secs_wait_lcp_for_restart

Time in seconds required for LCP start and completion before restart was completed
- secs_wait_subscription_handover

Time in seconds spent waiting for handover of replication subscriptions
- total_restart_secs

Total number of seconds from node failure until node is started again

\section*{Notes}

The following list contains values defined for the node_restart_status_int column with their internal status names (in parentheses), and the corresponding messages shown in the node_restart_status column:
- 0 (ALLOCATED_NODE_ID)

Allocated node id
- 1 (INCLUDED_IN_HB_PROTOCOL)

Included in heartbeat protocol
- 2 (NDBCNTR_START_WAIT)

Wait for NDBCNTR master to permit us to start
- 3 (NDBCNTR_STARTED)

NDBCNTR master permitted us to start
- 4 (START_PERMITTED)

All nodes permitted us to start
- 5 (WAIT_LCP_TO_COPY_DICT)

Wait for LCP completion to start copying metadata
- 6 (COPY_DICT_TO_STARTING_NODE)

Copying metadata to starting node
- 7 (INCLUDE_NODE_IN_LCP_AND_GCP)

Include node in LCP and GCP protocols
- 8 (LOCAL_RECOVERY_STARTED)

Restore fragments ongoing
- 9 (COPY_FRAGMENTS_STARTED)

Synchronizing starting node with live nodes
- 10 (WAIT_LCP_FOR_RESTART)

Wait for LCP to ensure durability
- 11 (WAIT_SUMA_HANDOVER)

Wait for handover of subscriptions
- 12 (RESTART_COMPLETED)

Restart completed
- 13 (NODE_FAILED)

Node failed, failure handling in progress
- 14 (NODE_FAILURE_COMPLETED)

Node failure handling completed
- 15 (NODE_GETTING_PERMIT)

All nodes permitted us to start
- 16 (NODE_GETTING_INCLUDED)

Include node in LCP and GCP protocols
- 17 (NODE_GETTING_SYNCHED)

Synchronizing starting node with live nodes
- 18 (NODE_GETTING_LCP_WAITED)
[none]
- 19 (NODE_ACTIVE)

Restart completed
- 20 (NOT_DEFINED_IN_CLUSTER)
[none]
- 21 (NODE_NOT_RESTARTED_YET)

Initial state
Status numbers 0 through 12 apply on master nodes only; the remainder of those shown in the table apply to all restarting data nodes. Status numbers 13 and 14 define node failure states; 20 and 21 occur when no information about the restart of a given node is available.

See also Section 25.6.4, "Summary of NDB Cluster Start Phases".

\subsection*{25.6.15.54 The ndbinfo server_locks Table}

The server_locks table is similar in structure to the cluster_locks table, and provides a subset of the information found in the latter table, but which is specific to the SQL node (MySQL server) where it resides. (The cluster_locks table provides information about all locks in the cluster.) More precisely, server_locks contains information about locks requested by threads belonging to the current mysqld instance, and serves as a companion table to server_operations. This may be useful for correlating locking patterns with specific MySQL user sessions, queries, or use cases.

The server_locks table contains the following columns:
- mysql_connection_id

MySQL connection ID
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

The mysql_connection_id column shows the MySQL connection or thread ID as shown by SHOW PROCESSLIST.
block_instance refers to an instance of a kernel block. Together with the block name, this number can be used to look up a given instance in the threadblocks table.

The tableid is assigned to the table by NDB; the same ID is used for this table in other ndbinfo tables, as well as in the output of ndb_show_tables.

The transaction ID shown in the transid column is the identifier generated by the NDB API for the transaction requesting or holding the current lock.

The mode column shows the lock mode, which is always one of S (shared lock) or X (exclusive lock). If a transaction has an exclusive lock on a given row, all other locks on that row have the same transaction ID.

The state column shows the lock state. Its value is always one of H (holding) or W (waiting). A waiting lock request waits for a lock held by a different transaction.

The detail column indicates whether this lock is the first holding lock in the affected row's lock queue, in which case it contains a * (asterisk character); otherwise, this column is empty. This information can be used to help identify the unique entries in a list of lock requests.

The op column shows the type of operation requesting the lock. This is always one of the values READ, INSERT, UPDATE, DELETE, SCAN, or REFRESH.

The duration_millis column shows the number of milliseconds for which this lock request has been waiting or holding the lock. This is reset to 0 when a lock is granted for a waiting request.

The lock ID (lockid column) is unique to this node and block instance.
If the lock_state column's value is $W$, this lock is waiting to be granted, and the waiting_for column shows the lock ID of the lock object this request is waiting for. Otherwise, waiting_for is empty. waiting_for can refer only to locks on the same row (as identified by node_id, block_instance, tableid, fragmentid, and rowid).

\subsection*{25.6.15.55 The ndbinfo server_operations Table}

The server_operations table contains entries for all ongoing NDB operations that the current SQL node (MySQL Server) is currently involved in. It effectively is a subset of the cluster_operations table, in which operations for other SQL and API nodes are not shown.

The server_operations table contains the following columns:
- mysql_connection_id

MySQL Server connection ID
- node_id

Node ID
- block_instance

Block instance
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

The mysql_connection_id is the same as the connection or session ID shown in the output of SHOW PROCESSLIST. It is obtained from the INFORMATION_SCHEMA table NDB_TRANSID_MYSQL_CONNECTION_MAP.
block_instance refers to an instance of a kernel block. Together with the block name, this number can be used to look up a given instance in the threadblocks table.

The transaction ID (transid) is a unique 64-bit number which can be obtained using the NDB API's getTransactionId( ) method. (Currently, the MySQL Server does not expose the NDB API transaction ID of an ongoing transaction.)

The operation_type column can take any one of the values READ, READ-SH, READ-EX, INSERT, UPDATE, DELETE, WRITE, UNLOCK, REFRESH, SCAN, SCAN-SH, SCAN-EX, or <unknown>.

The state column can have any one of the values ABORT_QUEUED, ABORT_STOPPED, COMMITTED, COMMIT_QUEUED, COMMIT_STOPPED, COPY_CLOSE_STOPPED, COPY_FIRST_STOPPED, COPY_STOPPED, COPY_TUPKEY, IDLE, LOG_ABORT_QUEUED, LOG_COMMIT_QUEUED, LOG_COMMIT_QUEUED_WAIT_SIGNAL, LOG_COMMIT_WRITTEN, LOG_COMMIT_WRITTEN_WAIT_SIGNAL, LOG_QUEUED, PREPARED, PREPARED_RECEIVED_COMMIT, SCAN_CHECK_STOPPED, SCAN_CLOSE_STOPPED, SCAN_FIRST_STOPPED, SCAN_RELEASE_STOPPED, SCAN_STATE_USED, SCAN_STOPPED, SCAN_TUPKEY, STOPPED, TC_NOT_CONNECTED, WAIT_ACC, WAIT_ACC_ABORT, WAIT_AI_AFTER_ABORT, WAIT_ATTR, WAIT_SCAN_AI, WAIT_TUP, WAIT_TUPKEYINFO, WAIT_TUP_COMMIT, or WAIT_TUP_TO_ABORT. (If the MySQL Server is running with ndbinfo_show_hidden enabled, you can view this list of states by selecting from the ndb\$dblqh_tcconnect_state table, which is normally hidden.)

You can obtain the name of an NDB table from its table ID by checking the output of ndb_show_tables.

The fragid is the same as the partition number seen in the output of ndb_desc - -extra-partition-info (short form -p).

In client_node_id and client_block_ref, client refers to an NDB Cluster API or SQL node (that is, an NDB API client or a MySQL Server attached to the cluster).

The block_instance and tc_block_instance column provide NDB kernel block instance numbers. You can use these to obtain information about specific threads from the threadblocks table.

\subsection*{25.6.15.56 The ndbinfo server_transactions Table}

The server_transactions table is subset of the cluster_transactions table, but includes only those transactions in which the current SQL node (MySQL Server) is a participant, while including the relevant connection IDs.

The server_transactions table contains the following columns:
- mysql_connection_id

MySQL Server connection ID
- node_id

Transaction coordinator node ID
- block_instance

Transaction coordinator block instance
- transid

Transaction ID
- state

Operation state (see text for possible values)
- count_operations

Number of stateful operations in the transaction
- outstanding_operations

Operations still being executed by local data management layer (LQH blocks)
- inactive_seconds

Time spent waiting for API
- client_node_id

Client node ID
- client_block_ref

Client block reference

\section*{Notes}

The mysql_connection_id is the same as the connection or session ID shown in the output of SHOW PROCESSLIST. It is obtained from the INFORMATION_SCHEMA table NDB_TRANSID_MYSQL_CONNECTION_MAP.
block_instance refers to an instance of a kernel block. Together with the block name, this number can be used to look up a given instance in the threadblocks table.

The transaction ID (transid) is a unique 64-bit number which can be obtained using the NDB API's getTransactionId( ) method. (Currently, the MySQL Server does not expose the NDB API transaction ID of an ongoing transaction.)

The state column can have any one of the values CS_ABORTING, CS_COMMITTING, CS_COMMIT_SENT, CS_COMPLETE_SENT, CS_COMPLETING, CS_CONNECTED, CS_DISCONNECTED, CS_FAIL_ABORTED, CS_FAIL_ABORTING, CS_FAIL_COMMITTED, CS_FAIL_COMMITTING, CS_FAIL_COMPLETED, CS_FAIL_PREPARED, CS_PREPARE_TO_COMMIT, CS_RECEIVING,

CS_REC_COMMITTING, CS_RESTART, CS_SEND_FIRE_TRIG_REQ, CS_STARTED, CS_START_COMMITTING, CS_START_SCAN, CS_WAIT_ABORT_CONF, CS_WAIT_COMMIT_CONF, CS_WAIT_COMPLETE_CONF, CS_WAIT_FIRE_TRIG_REQ. (If the MySQL Server is running with ndbinfo_show_hidden enabled, you can view this list of states by selecting from the ndb \$dbtc_apiconnect_state table, which is normally hidden.)

In client_node_id and client_block_ref, client refers to an NDB Cluster API or SQL node (that is, an NDB API client or a MySQL Server attached to the cluster).

The block_instance column provides the DBTC kernel block instance number. You can use this to obtain information about specific threads from the threadblocks table.

\subsection*{25.6.15.57 The ndbinfo table_distribution_status Table}

The table_distribution_status table provides information about the progress of table distribution for NDB tables.

The table_distribution_status table contains the following columns:
- node_id

Node id
- table_id

Table ID
- tab_copy_status

Status of copying of table distribution data to disk; one of IDLE, SR_PHASE1_READ_PAGES, SR_PHASE2_READ_TABLE, SR_PHASE3_COPY_TABLE, REMOVE_NODE, LCP_READ_TABLE, COPY_TAB_REQ, COPY_NODE_STATE, ADD_TABLE_COORDINATOR, ADD_TABLE_PARTICIPANT, INVALIDATE_NODE_LCP, ALTER_TABLE, COPY_TO_SAVE, or GET_TABINFO
- tab_update_status

Status of updating of table distribution data; one of IDLE, LOCAL_CHECKPOINT, LOCAL_CHECKPOINT_QUEUED, REMOVE_NODE, COPY_TAB_REQ, ADD_TABLE_MASTER, ADD_TABLE_SLAVE, INVALIDATE_NODE_LCP, or CALLBACK
- tab_lcp_status

Status of table LCP; one of ACTIVE (waiting for local checkpoint to be performed), WRITING_TO_FILE (checkpoint performed but not yet written to disk), or COMPLETED (checkpoint performed and persisted to disk)
- tab_status

Table internal status; one of ACTIVE (table exists), CREATING (table is being created), or DROPPING (table is being dropped)
- tab_storage

Table recoverability; one of NORMAL (fully recoverable with redo logging and checkpointing), NOLOGGING (recoverable from node crash, empty following cluster crash), or TEMPORARY (not recoverable)
- tab_partitions

Number of partitions in table
- tab_fragments

Number of fragments in table; normally same as tab_partitions; for fully replicated tables equal to tab_partitions * [number of node groups]
- current_scan_count

Current number of active scans
- scan_count_wait

Current number of scans waiting to be performed before ALTER TABLE can complete.
- is_reorg_ongoing

Whether the table is currently being reorganized (1 if true)

\subsection*{25.6.15.58 The ndbinfo table_fragments Table}

The table_fragments table provides information about the fragmentation, partitioning, distribution, and (internal) replication of NDB tables.

The table_fragments table contains the following columns:
- node_id

Node ID (DIH master)
- table_id

Table ID
- partition_id

Partition ID
- fragment_id

Fragment ID (same as partition ID unless table is fully replicated)
- partition_order

Order of fragment in partition
- log_part_id

Log part ID of fragment
- no_of_replicas

Number of fragment replicas
- current_primary

Current primary node ID
- preferred_primary

Preferred primary node ID
- current_first_backup

Current first backup node ID
- current_second_backup

Current second backup node ID
- current_third_backup

Current third backup node ID
- num_alive_replicas

Current number of live fragment replicas
- num_dead_replicas

Current number of dead fragment replicas
- num_lcp_replicas

Number of fragment replicas remaining to be checkpointed

\subsection*{25.6.15.59 The ndbinfo table_info Table}

The table_info table provides information about logging, checkpointing, distribution, and storage options in effect for individual NDB tables.

The table_info table contains the following columns:
- table_id

Table ID
- logged_table

Whether table is logged (1) or not (0)
- row_contains_gci

Whether table rows contain GCI (1 true, 0 false)
- row_contains_checksum

Whether table rows contain checksum (1 true, 0 false)
- read_backup

If backup fragment replicas are read this is 1 , otherwise 0
- fully_replicated

If table is fully replicated this is 1 , otherwise 0
- storage_type

Table storage type; one of MEMORY or DISK
- hashmap_id

Hashmap ID
- partition_balance

Partition balance (fragment count type) used for table; one of FOR_RP_BY_NODE, FOR_RA_BY_NODE, FOR_RP_BY_LDM, or FOR_RA_BY_LDM
- create_gci

GCI in which table was created

\subsection*{25.6.15.60 The ndbinfo table_replicas Table}

The table_replicas table provides information about the copying, distribution, and checkpointing of NDB table fragments and fragment replicas.

The table_replicas table contains the following columns:
- node_id

ID of the node from which data is fetched (DIH master)
- table_id

Table ID
- fragment_id

Fragment ID
- initial_gci

Initial GCI for table
- replica_node_id

ID of node where fragment replica is stored
- is_lcp_ongoing

Is 1 if LCP is ongoing on this fragment, 0 otherwise
- num_crashed_replicas

Number of crashed fragment replica instances
- last_max_gci_started

Highest GCI started in most recent LCP
- last_max_gci_completed

Highest GCI completed in most recent LCP
- last_lcp_id

ID of most recent LCP
- prev_lcp_id

ID of previous LCP
- prev_max_gci_started

Highest GCI started in previous LCP
- prev_max_gci_completed

Highest GCI completed in previous LCP
- last_create_gci

Last Create GCI of last crashed fragment replica instance
- last_replica_gci

Last GCI of last crashed fragment replica instance
- is_replica_alive

1 if this fragment replica is alive, 0 otherwise

\subsection*{25.6.15.61 The ndbinfo tc_time_track_stats Table}

The tc_time_track_stats table provides time-tracking information obtained from the DBTC block (TC) instances in the data nodes, through API nodes access NDB. Each TC instance tracks latencies for a set of activities it undertakes on behalf of API nodes or other data nodes; these activities include transactions, transaction errors, key reads, key writes, unique index operations, failed key operations of any type, scans, failed scans, fragment scans, and failed fragment scans.

A set of counters is maintained for each activity, each counter covering a range of latencies less than or equal to an upper bound. At the conclusion of each activity, its latency is determined and the appropriate counter incremented. tc_time_track_stats presents this information as rows, with a row for each instance of the following:
- Data node, using its ID
- TC block instance
- Other communicating data node or API node, using its ID
- Upper bound value

Each row contains a value for each activity type. This is the number of times that this activity occurred with a latency within the range specified by the row (that is, where the latency does not exceed the upper bound).

The tc_time_track_stats table contains the following columns:
- node_id

Requesting node ID
- block_number

TC block number
- block_instance

TC block instance number
- comm_node_id

Node ID of communicating API or data node
- upper_bound

Upper bound of interval (in microseconds)
- scans

Based on duration of successful scans from opening to closing, tracked against the API or data nodes requesting them.
- scan_errors

Based on duration of failed scans from opening to closing, tracked against the API or data nodes requesting them.
- scan_fragments

Based on duration of successful fragment scans from opening to closing, tracked against the data nodes executing them
- scan_fragment_errors

Based on duration of failed fragment scans from opening to closing, tracked against the data nodes executing them
- transactions

Based on duration of successful transactions from beginning until sending of commit ACK, tracked against the API or data nodes requesting them. Stateless transactions are not included.
- transaction_errors

Based on duration of failing transactions from start to point of failure, tracked against the API or data nodes requesting them.
- read_key_ops

Based on duration of successful primary key reads with locks. Tracked against both the API or data node requesting them and the data node executing them.
- write_key_ops

Based on duration of successful primary key writes, tracked against both the API or data node requesting them and the data node executing them.
- index_key_ops

Based on duration of successful unique index key operations, tracked against both the API or data node requesting them and the data node executing reads of base tables.
- key_op_errors

Based on duration of all unsuccessful key read or write operations, tracked against both the API or data node requesting them and the data node executing them.

\section*{Notes}

The block_instance column provides the DBTC kernel block instance number. You can use this together with the block name to obtain information about specific threads from the threadblocks table.

\subsection*{25.6.15.62 The ndbinfo threadblocks Table}

The threadblocks table associates data nodes, threads, and instances of NDB kernel blocks.
The threadblocks table contains the following columns:
- node_id

Node ID
- thr_no

Thread ID
- block_name

Block name
- block_instance

Block instance number

\section*{Notes}

The value of the block_name in this table is one of the values found in the block_name column when selecting from the ndbinfo.blocks table. Although the list of possible values is static for a given NDB Cluster release, the list may vary between releases.

The block_instance column provides the kernel block instance number.

\subsection*{25.6.15.63 The ndbinfo threads Table}

The threads table provides information about threads running in the NDB kernel.
The threads table contains the following columns:
- node_id

ID of the node where the thread is running
- thr_no

Thread ID (specific to this node)
- thread_name

Thread name (type of thread)
- thread_description

Thread (type) description

\section*{Notes}

Sample output from a 2-node example cluster, including thread descriptions, is shown here:
```
mysql> SELECT * FROM threads;
+----------+---------+--------------+---------------------------------------------------------------
| node_id | thr_no | thread_name | thread_description
+----------+--------+-------------+----------------------------------------------------------------
| 5 | 0 | main | main thread, schema and distribution handling
| 5 | 1 | rep | rep thread, asynch replication and proxy block handling
| 5 | 2 | ldm | ldm thread, handling a set of data partitions
| 5 | 3 | recv | receive thread, performing receive and polling for new receives
| 6 | 0 | main | main thread, schema and distribution handling
| 6 | 1 | rep | rep thread, asynch replication and proxy block handling
| 6 | 2 | ldm | ldm thread, handling a set of data partitions
| 6| 3| recv | receive thread, performing receive and polling for new receives |
+----------+---------+-------------+----------------------------------------------------------------
8 rows in set (0.01 sec)
```


It is also possible to set either of the ThreadConfig arguments main or rep to 0 while keeping the other at 1 , in which case the thread name is main_rep and its description is main and rep thread, schema, distribution, proxy block and asynch replication handling. You can also set both main and rep to 0 , in which case the name of the resulting thread is shown in
this table as main_rep_recv, and its description is main, rep and recv thread, schema, distribution, proxy block and asynch replication handling and handling receive and polling for new receives.

\subsection*{25.6.15.64 The ndbinfo threadstat Table}

The threadstat table provides a rough snapshot of statistics for threads running in the NDB kernel.
The threadstat table contains the following columns:
- node_id

Node ID
- thr_no

Thread ID
- thr_nm

Thread name
- c_loop

Number of loops in main loop
- c_exec

Number of signals executed
- c_wait

Number of times waiting for additional input
- c_l_sent_prioa

Number of priority A signals sent to own node
- c_l_sent_priob

Number of priority B signals sent to own node
- c_r_sent_prioa

Number of priority A signals sent to remote node
- c_r_sent_priob

Number of priority B signals sent to remote node
- os_tid

OS thread ID
- Os_now

OS time (ms)
- os_ru_utime

OS user CPU time ( $\mu \mathrm{s}$ )
- os_ru_stime

OS system CPU time (μs)
- os_ru_minflt

OS page reclaims (soft page faults)
- os_ru_majflt

OS page faults (hard page faults)
- os_ru_nvcsw

OS voluntary context switches
- os_ru_nivcsw

OS involuntary context switches

\section*{Notes}
os_time uses the system gettimeofday() call.
The values of the os_ru_utime, os_ru_stime, os_ru_minflt, os_ru_majflt, os_ru_nvcsw, and os_ru_nivcsw columns are obtained using the system getrusage() call, or the equivalent.

Since this table contains counts taken at a given point in time, for best results it is necessary to query this table periodically and store the results in an intermediate table or tables. The MySQL Server's Event Scheduler can be employed to automate such monitoring. For more information, see Section 27.4, "Using the Event Scheduler".

\subsection*{25.6.15.65 The ndbinfo transporter_details Table}

This table contains information about individual NDB transporters, rather than aggregate information as shown by the transporters table. The transporter_details table was added in NDB 8.4.0.

The transporter_details table contains the following columns:
- node_id

This data node's unique node ID in the cluster
- block_instance
- trp_id

The transporter ID
- remote_node_id

The remote data node's node ID
- status

Status of the connection
- remote_address

Name or IP address of the remote host
- bytes_sent

Number of bytes sent using this connection
- bytes_received

Number of bytes received using this connection
- connect_count

Number of times connection established on this transporter
- overloaded

1 if this transporter is currently overloaded, otherwise 0
- overload_count

Number of times this transporter has entered overload state since connecting
- slowdown

1 if this transporter is in slowdown state, otherwise 0
- slowdown_count

Number of times this transporter has entered slowdown state since connecting
- encrypted

If this transporter is connected using TLS, this column is 1 , otherwise it is 0 .
- sendbuffer_used_bytes

The amount, in bytes, of signal data currently awaiting send by this transporter.
- sendbuffer_max_used_bytes

The maximum amount, in bytes, of signal data awaiting send at any one time by this transporter.
- sendbuffer_alloc_bytes

Amount of send buffer, in bytes, currently allocated for signal data storage for this transporter.
- sendbuffer_max_alloc_bytes

Maxmimum amount of send buffer, in bytes, allocated for signal data storage at any one time for this transporter.
- type

The connection type used by this transporter (TCP or SHM).
The transporter_details table displays a row showing the status of each transporter in the cluster. See the Notes for the transporters table for more information about each of the columns in this table.

The sendbuffer_used_bytes, sendbuffer_max_used_bytes, sendbuffer_alloc_bytes, and sendbuffer_max_alloc_bytes columns were added in NDB 8.4.0. The type column was added in NDB 8.4.1.

\subsection*{25.6.15.66 The ndbinfo transporters Table}

This table contains information about NDB transporters. For similar information about individual transporters, see the transporter_details table.

The transporters table contains the following columns:
- node_id

This data node's unique node ID in the cluster
- remote_node_id

The remote data node's node ID
- status

Status of the connection
- remote_address

Name or IP address of the remote host
- bytes_sent

Number of bytes sent using this connection
- bytes_received

Number of bytes received using this connection
- connect_count

Number of times connection established on this transporter
- overloaded

1 if this transporter is currently overloaded, otherwise 0
- overload_count

Number of times this transporter has entered overload state since connecting
- slowdown

1 if this transporter is in slowdown state, otherwise 0
- slowdown_count

Number of times this transporter has entered slowdown state since connecting
- encrypted

If this transporter is connected using TLS, this column is 1 , otherwise it is 0 .

\section*{Notes}

For each running data node in the cluster, the transporters table displays a row showing the status of each of that node's connections with all nodes in the cluster, including itself. This information is shown in the table's status column, which can have any one of the following values: CONNECTING, CONNECTED, DISCONNECTING, or DISCONNECTED.

Connections to API and management nodes which are configured but not currently connected to the cluster are shown with status DISCONNECTED. Rows where the node_id is that of a data node which is not currently connected are not shown in this table. (This is similar omission of disconnected nodes in the ndbinfo.nodes table.

The remote_address is the host name or address for the node whose ID is shown in the remote_node_id column. The bytes_sent from this node and bytes_received by this node are the numbers, respectively, of bytes sent and received by the node using this connection since it
was established. For nodes whose status is CONNECTING or DISCONNECTED, these columns always display 0.

Assume you have a 5-node cluster consisting of 2 data nodes, 2 SQL nodes, and 1 management node, as shown in the output of the SHOW command in the ndb_mgm client:
```
ndb_mgm> SHOW
Connected to Management Server at: localhost:1186 (using cleartext)
Cluster Configuration
[ndbd(NDB)] 2 node(s)
id=1 @10.100.10.1 (8.4.7-ndb-8.4.7, Nodegroup: 0, *)
id=2 @10.100.10.2 (8.4.7-ndb-8.4.7, Nodegroup: 0)
[ndb_mgmd(MGM)] 1 node(s)
id=10 @10.100.10.10 (8.4.7-ndb-8.4.7)
[mysqld(API)] 2 node(s)
id=20 @10.100.10.20 (8.4.7-ndb-8.4.7)
id=21 @10.100.10.21 (8.4.7-ndb-8.4.7)
```


There are 10 rows in the transporters table- 5 for the first data node, and 5 for the secondassuming that all data nodes are running, as shown here:
```
+---------+-----------------+------------+-----------------+-------------+------------------+--------------

\begin{tabular}{|l|l|l|l|l|l|l|l|}
\hline 5 & & 6 & CONNECTED & 127.0.0.1 & 15509748 & 15558204 & 1 \\
\hline 5 & & 50 & CONNECTED & 127.0.0.1 & 1058220 & 284316 & 1 \\
\hline 5 & & 100 & CONNECTED & 127.0.0.1 & 574796 & 402208 & 1 \\
\hline 5 & & 101 & CONNECTING & - & 0 & 0 & 0 \\
\hline 6 & & 5 & CONNECTED & 127.0.0.1 & 15558204 & 15509748 & 1 \\
\hline 6 & & 50 & CONNECTED & 127.0.0.1 & 1054548 & 283812 & 1 \\
\hline 6 & & 100 & CONNECTED & 127.0.0.1 & 529948 & 397444 & 1 \\
\hline 6 & & 101 & CONNECTING & - & 0 & 0 & 0 \\
\hline
\end{tabular}
```

```
mysql> SELECT node_id, remote_node_id, status
    -> FROM ndbinfo.transporters;
+----------+-----------------+--------------+
| node_id | remote_node_id | status |
+----------+----------------+---------------+
| 1 | 1 | DISCONNECTED
| 1 | 2 | CONNECTED
| 1 | 10 | CONNECTED
| 1 | 20 | CONNECTED
| 1 | 21 | CONNECTED
| 2 | 1 | CONNECTED
| 2 | 2 | DISCONNECTED
| 2 | 10 | CONNECTED
| 2 | 20 | CONNECTED
| 2 | 21 | CONNECTED
+----------+-----------------+---------------+
10 rows in set (0.04 sec)
```


If you shut down one of the data nodes in this cluster using the command 2 STOP in the ndb_mgm client, then repeat the previous query (again using the mysql client), this table now shows only 5 rows -1 row for each connection from the remaining management node to another node, including both itself and the data node that is currently offline-and displays CONNECTING for the status of each remaining connection to the data node that is currently offline, as shown here:
```
mysql> SELECT node_id, remote_node_id, status
    -> FROM ndbinfo.transporters;
+----------+----------------+--------------+
| node_id | remote_node_id | status |
+----------+----------------+---------------+
| 1 | 1 | DISCONNECTED
| 1 | 2 | CONNECTING
| 1 | 10 | CONNECTED
| 1 | 20 | CONNECTED |
```

```
| 1 | 21 | CONNECTED |
+----------+----------------+--------------+
rows in set (0.02 sec)
```


The connect_count, overloaded, overload_count, slowdown, and slowdown_count counters are reset on connection, and retain their values after the remote node disconnects. The bytes_sent and bytes_received counters are also reset on connection, and so retain their values following disconnection (until the next connection resets them).

The overload state referred to by the overloaded and overload_count columns occurs when this transporter's send buffer contains more than OVerloadLimit bytes (default is 80\% of SendBufferMemory, that is, 0.8 * $2097152=1677721$ bytes). When a given transporter is in a state of overload, any new transaction that tries to use this transporter fails with Error 1218 (Send Buffers overloaded in NDB kernel). This affects both scans and primary key operations.

The slowdown state referenced by the slowdown and slowdown_count columns of this table occurs when the transporter's send buffer contains more than $60 \%$ of the overload limit (equal to 0.6 * 2097152 = 1258291 bytes by default). In this state, any new scan using this transporter has its batch size reduced to minimize the load on the transporter.

Common causes of send buffer slowdown or overloading include the following:
- Data size, in particular the quantity of data stored in TEXT columns or BLOB columns (or both types of columns)
- Having a data node (ndbd or ndbmtd) on the same host as an SQL node that is engaged in binary logging
- Large number of rows per transaction or transaction batch
- Configuration issues such as insufficient SendBufferMemory
- Hardware issues such as insufficient RAM or poor network connectivity

See also Section 25.4.3.14, "Configuring NDB Cluster Send Buffer Parameters".
If TLS is used for the connection, the encrypted column is 1, as shown here:
```
mysql> SELECT node_id, remote_node_id, status, encrypted
    -> FROM ndbinfo.transporters;
+----------+-----------------+------------+----------+
| node_id | remote_node_id | status | encrypted |
+----------+-----------------+------------+-----------+

\begin{tabular}{|l|l|l|l|}
\hline 5 & 6 & CONNECTED & 1 \\
\hline 5 & 50 & CONNECTED & 1 \\
\hline 5 & 100 & CONNECTED & 1 \\
\hline 5 & 101 & CONNECTING & 0 \\
\hline 6 & 5 & CONNECTED & 1 \\
\hline 6 & 50 & CONNECTED & 1 \\
\hline 6 & 100 & CONNECTED & 1 \\
\hline 6 & 101 & CONNECTING & 0 \\
\hline
\end{tabular}
8 \mp@code { r o w s ~ i n ~ s e t ~ ( 0 . 0 4 ~ s e c ) }
```


Otherwise, the value of this column is 0 .
The certificates table can be used to obtain certificate information about each node connected using link encryption.

For more information, see Section 25.6.19.5, "TLS Link Encryption for NDB Cluster".

\subsection*{25.6.16 INFORMATION_SCHEMA Tables for NDB Cluster}

Two INFORMATION_SCHEMA tables provide information that is of particular use when managing an NDB Cluster. The FILES table provides information about NDB Cluster Disk Data files (see

Section 25.6.11.1, "NDB Cluster Disk Data Objects"). The ndb_transid_mysql_connection_map table provides a mapping between transactions, transaction coordinators, and API nodes.

Additional statistical and other data about NDB Cluster transactions, operations, threads, blocks, and other aspects of performance can be obtained from the tables in the ndbinfo database. For information about these tables, see Section 25.6.15, "ndbinfo: The NDB Cluster Information Database".

\subsection*{25.6.17 NDB Cluster and the Performance Schema}

NDB provides information in the MySQL Performance Schema about ndbcluster plugin threads and instrumenting for transaction batch memory. These features are described in greater detail in the sections which follow.

\section*{ndbcluster Plugin Threads}
ndbcluster plugin threads are visible in the Performance Schema threads table, as shown in the following query:
```
mysql> SELECT name, type, thread_id, thread_os_id
    -> FROM performance_schema.threads
    -> WHERE name LIKE '%ndbcluster%'\G
+----------------------------------+-----------+----------+----------------
| name | type | thread_id | thread_os_id |
+------------------------------------+------------+-----------+---------------
| thread/ndbcluster/ndb_binlog | BACKGROUND | 30 | 11980
| thread/ndbcluster/ndb_index_stat | BACKGROUND | 31 | 11981 |
| thread/ndbcluster/ndb_metadata | BACKGROUND | 32 | 11982 |
```


The threads table shows all three of the threads listed here:
- ndb_binlog: Binary logging thread
- ndb_index_stat: Index statistics thread
- ndb_metadata: Metadata thread

These threads are also shown by name in the setup_threads table.
Thread names are shown in the name column of the threads and setup_threads tables using the format prefix/plugin_name/thread_name. prefix, the object type as determined by the performance_schema engine, is thread for plugin threads (see Thread Instrument Elements). The plugin_name is ndbcluster. thread_name is the standalone name of the thread (ndb_binlog, ndb_index_stat, or ndb_metadata).

Using the thread ID or OS thread ID for a given thread in the threads or setup_threads table, it is possible to obtain considerable information from Performance Schema about plugin execution and resource usage. This example shows how to obtain the amount of memory allocated by the threads created by the ndbcluster plugin from the mem_root arena by joining the threads and memory_summary_by_thread_by_event_name tables:
```
mysql> SELECT
        -> t.name,
        -> m.sum_number_of_bytes_alloc,
        -> IF(m.sum_number_of_bytes_alloc > 0, "true", "false") AS 'Has allocated memory'
        -> FROM performance_schema.memory_summary_by_thread_by_event_name m
        -> JOIN performance_schema.threads t
        -> ON m.thread_id = t.thread_id
        -> WHERE t.name LIKE '%ndbcluster%'
        -> AND event_name LIKE '%THD::main_mem_root%';
+-----------------------------------+---------------------------+----------------------
| name | sum_number_of_bytes_alloc | Has allocated memory |
+------------------------------------+--------------------------+----------------------
| thread/ndbcluster/ndb_binlog | 20576 | true
| thread/ndbcluster/ndb_index_stat | 0 | false
```

```
| thread/ndbcluster/ndb_metadata | 8240 | true |
+------------------------------------+-------------------------------------------------
```


\section*{Transaction Memory Usage}

You can see the amount of memory used for transaction batching by querying the Performance Schema memory_summary_by_thread_by_event_name table, similar to what is shown here:
```
mysql> SELECT EVENT_NAME
    -> FROM performance_schema.memory_summary_by_thread_by_event_name
    -> WHERE THREAD_ID = PS_CURRENT_THREAD_ID()
    -> AND EVENT_NAME LIKE 'memory/ndbcluster/%';
+---------------------------------------------
| EVENT_NAME |
+--------------------------------------------+
| memory/ndbcluster/Thd_ndb::batch_mem_root |
+---------------------------------------------
1 row in set (0.01 sec)
```


The ndbcluster transaction memory instrument is also visible in the Performance Schema setup_instruments table, as shown here:
```
mysql> SELECT * from performance_schema.setup_instruments
        -> WHERE NAME LIKE '%ndb%'\G
************************** 1. row ******************************
            NAME: memory/ndbcluster/Thd_ndb::batch_mem_root
            ENABLED: YES
            TIMED: NULL
    PROPERTIES:
    VOLATILITY: 0
DOCUMENTATION: Memory used for transaction batching
1 row in set (0.01 sec)
```


\subsection*{25.6.18 Quick Reference: NDB Cluster SQL Statements}

This section discusses several SQL statements that can prove useful in managing and monitoring a MySQL server that is connected to an NDB Cluster, and in some cases provide information about the cluster itself.
- SHOW ENGINE NDB STATUS, SHOW ENGINE NDBCLUSTER STATUS

The output of this statement contains information about the server's connection to the cluster, creation and usage of NDB Cluster objects, and binary logging for NDB Cluster replication.

See Section 15.7.7.16, "SHOW ENGINE Statement", for a usage example and more detailed information.
- SHOW ENGINES

This statement can be used to determine whether or not clustering support is enabled in the MySQL server, and if so, whether it is active.

See Section 15.7.7.17, "SHOW ENGINES Statement", for more detailed information.

\section*{Note}

This statement does not support a LIKE clause. However, you can use LIKE to filter queries against the Information Schema ENGINES table, as discussed in the next item.
- SELECT * FROM INFORMATION_SCHEMA.ENGINES [WHERE ENGINE LIKE 'NDB\%']

This is the equivalent of SHOW ENGINES, but uses the ENGINES table of the INFORMATION_SCHEMA database. Unlike the case with the SHOW ENGINES statement, it is possible to filter the results using a LIKE clause, and to select specific columns to obtain information that may
be of use in scripts. For example, the following query shows whether the server was built with NDB support and, if so, whether it is enabled:
```
mysql> SELECT ENGINE, SUPPORT FROM INFORMATION_SCHEMA.ENGINES
    -> WHERE ENGINE LIKE 'NDB%';

\begin{tabular}{|l|l|}
\hline ENGINE & SUPPORT \\
\hline ndbcluster ndbinfo & YES YES \\
\hline
\end{tabular}
```


If NDB support is not enabled, the preceding query returns an empty set. See Section 28.3.13, "The INFORMATION_SCHEMA ENGINES Table", for more information.

\section*{- SHOW VARIABLES LIKE 'NDB\%'}

This statement provides a list of most server system variables relating to the NDB storage engine, and their values, as shown here:
```
mysql> SHOW VARIABLES LIKE 'NDB%';
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4473.jpg?height=807&width=1374&top_left_y=989&top_left_x=383)
```
| ndb_index_stat_option | loop_enable=1000ms,
loop_idle=1000ms,loop_busy=100ms,update_batch=1,read_batch=4,idle_batch=32,
check_batch=8,check_delay=10m,delete_batch=8,clean_delay=1m,error_batch=4,
error_delay=1m,evict_batch=8,evict_delay=1m,cache_limit=32M,cache_lowpct=90,
zero_total=0
| ndb_join_pushdown | ON
| ndb_log_apply_status | OFF
| ndb_log_bin | OFF
| ndb_log_binlog_index | ON
| ndb_log_empty_epochs | OFF
| ndb_log_empty_update | OFF
| ndb_log_exclusive_reads | OFF
| ndb_log_fail_terminate | OFF
| ndb_log_orig | OFF
| ndb_log_transaction_compression | OFF
| ndb_log_transaction_compression_level_zstd | 3
| ndb_log_transaction_dependency | OFF
| ndb_log_transaction_id | OFF
| ndb_log_update_as_write | ON
| ndb_log_update_minimal | OFF
| ndb_log_updated_only | ON
| ndb_metadata_check | ON
| ndb_metadata_check_interval |60
| ndb_metadata_sync | OFF
| ndb_mgm_tls | relaxed
| ndb_mgmd_host | 127.0.0.1
```

```
| ndb_nodeid | 0
| ndb_optimization_delay | 10
| ndb_optimized_node_selection | 3
| ndb_read_backup | ON
| ndb_recv_thread_activation_threshold | 8
| ndb_recv_thread_cpu_mask |
| ndb_replica_batch_size | 2097152
| ndb_replica_blob_write_batch_bytes |2097152
| ndb_report_thresh_binlog_epoch_slip | 10
| ndb_report_thresh_binlog_mem_usage |10
| ndb_row_checksum | 1
| ndb_schema_dist_lock_wait_timeout |30
| ndb_schema_dist_timeout | 120
| ndb_schema_dist_upgrade_allowed | ON
| ndb_show_foreign_key_mock_tables | OFF
| ndb_slave_conflict_role | NONE
| ndb_table_no_logging | OFF
| ndb_table_temporary | OFF
| ndb_tls_search_path | $HOME/ndb-tls
| ndb_use_copying_alter_table | OFF
| ndb_use_exact_count | OFF
| ndb_use_transactions | ON
| ndb_version | 524544
| ndb_version_string | ndb-8.4.0
| ndb_wait_connected |120
| ndb_wait_setup | 120
| ndbinfo_database | ndbinfo
| ndbinfo_max_bytes | 0
| ndbinfo_max_rows | 10
| ndbinfo_offline | OFF
| ndbinfo_show_hidden | OFF
| ndbinfo_table_prefix | ndb$
| ndbinfo_version | 524544
74 rows in set (0.01 sec)
```


See Section 7.1.8, "Server System Variables", for more information.
- SELECT * FROM performance_schema.global_variables WHERE VARIABLE_NAME LIKE 'NDB\%'

This statement is the equivalent of the SHOW VARIABLES statement described in the previous item, and provides almost identical output, as shown here:
```
mysql> SELECT * FROM performance_schema.global_variables
    -> WHERE VARIABLE_NAME LIKE 'NDB%';
+----------------------------------------+--------------------------------------
| VARIABLE_NAME | VARIABLE_VALUE |
+----------------------------------------+--------------------------------------
| ndb_allow_copying_alter_table | ON
| ndb_autoincrement_prefetch_sz |512
| ndb_batch_size | 32768
| ndb_blob_read_batch_bytes |65536
| ndb_blob_write_batch_bytes |65536
| ndb_clear_apply_status | ON
| ndb_cluster_connection_pool | 1
| ndb_cluster_connection_pool_nodeids |
| ndb_connectstring | 127.0.0.1
| ndb_data_node_neighbour | 0
| ndb_default_column_format | FIXED
| ndb_deferred_constraints | 0
| ndb_distribution | KEYHASH
| ndb_eventbuffer_free_percent | 20
| ndb_eventbuffer_max_alloc | 0
| ndb_extra_logging | 1
| ndb_force_send | ON
| ndb_fully_replicated | OFF
| ndb_index_stat_enable | ON
| ndb_index_stat_option | loop_enable=1000ms,loop_idle=1000ms,
loop_busy=100ms, update_batch=1,read_batch=4,idle_batch=32,check_batch=8,
check_delay=10m,delete_batch=8,clean_delay=1m,error_batch=4,error_delay=1m,
```

```
evict_batch=8,evict_delay=1m,cache_limit=32M,cache_lowpct=90,zero_total=0
| ndb_join_pushdown | ON
| ndb_log_apply_status | OFF
| ndb_log_bin | OFF
| ndb_log_binlog_index | ON
| ndb_log_empty_epochs | OFF
| ndb_log_empty_update | OFF
| ndb_log_exclusive_reads | OFF
| ndb_log_orig | OFF
| ndb_log_transaction_id | OFF
| ndb_log_update_as_write | ON
| ndb_log_update_minimal | OFF
| ndb_log_updated_only | ON
| ndb_metadata_check | ON
| ndb_metadata_check_interval |60
| ndb_metadata_sync | OFF
| ndb_mgmd_host | 127.0.0.1
| ndb_nodeid | 0
| ndb_optimization_delay | 10
| ndb_optimized_node_selection | 3
| ndb_read_backup | ON
| ndb_recv_thread_activation_threshold | 8
| ndb_recv_thread_cpu_mask |
| ndb_report_thresh_binlog_epoch_slip | 10
| ndb_report_thresh_binlog_mem_usage | 10
| ndb_row_checksum | 1
| ndb_schema_dist_lock_wait_timeout | 30
| ndb_schema_dist_timeout | 120
| ndb_schema_dist_upgrade_allowed | ON
| ndb_show_foreign_key_mock_tables | OFF
| ndb_slave_conflict_role | NONE
| ndb_table_no_logging | OFF
| ndb_table_temporary | OFF
| ndb_use_copying_alter_table | OFF
| ndb_use_exact_count | OFF
| ndb_use_transactions | ON
| ndb_version | 524308
| ndb_version_string | ndb-8.4.7
| ndb_wait_connected | 30
| ndb_wait_setup | 30
| ndbinfo_database | ndbinfo
| ndbinfo_max_bytes | 0
| ndbinfo_max_rows | 10
| ndbinfo_offline | OFF
| ndbinfo_show_hidden | OFF
| ndbinfo_table_prefix | ndb$
| ndbinfo_version | 524308
```


Unlike the case with the SHOW VARIABLES statement, it is possible to select individual columns. For example:
```
mysql> SELECT VARIABLE_VALUE
    -> FROM performance_schema.global_variables
    -> WHERE VARIABLE_NAME = 'ndb_force_send';
+-----------------+
| VARIABLE_VALUE |
+-----------------+
| ON |
+-----------------+
```


A more useful query is shown here:
```
mysql> SELECT VARIABLE_NAME AS Name, VARIABLE_VALUE AS Value
    > FROM performance_schema.global_variables
    > WHERE VARIABLE_NAME
    > IN ('version', 'ndb_version',
    > 'ndb_version_string', 'ndbinfo_version');
+----------------------+---------------+
| Name | Value |
```

```
| ndb_version | 524544
| ndb_version_string | ndb-8.4.0
| ndbinfo_version | 524544
| version | 8.4.0-cluster |
4 rows in set (0.00 sec)
```


For more information, see Section 29.12.15, "Performance Schema Status Variable Tables", and Section 7.1.8, "Server System Variables".

\section*{- SHOW STATUS LIKE 'NDB\%'}

This statement shows at a glance whether or not the MySQL server is acting as a cluster SQL node, and if so, it provides the MySQL server's cluster node ID, the host name and port for the cluster management server to which it is connected, and the number of data nodes in the cluster, as shown here:
```
mysql> SHOW STATUS LIKE 'NDB%';
+---------------------------------------------+-----------------------------
| Variable_name | Value |
| Ndb_metadata_detected_count | 0
| Ndb_cluster_node_id |100
| Ndb_config_from_host | 127.0.0.1
| Ndb_config_from_port | 1186
| Ndb_number_of_data_nodes | 2
| Ndb_number_of_ready_data_nodes | 2
| Ndb_connect_count | 0
| Ndb_execute_count | 0
| Ndb_scan_count | 0
| Ndb_pruned_scan_count | 0
| Ndb_schema_locks_count | 0
| Ndb_api_wait_exec_complete_count_session | 0
| Ndb_api_wait_scan_result_count_session | 0
| Ndb_api_wait_meta_request_count_session | 1
| Ndb_api_wait_nanos_count_session | 163446
| Ndb_api_bytes_sent_count_session |60
| Ndb_api_bytes_received_count_session | 28
| Ndb_api_trans_start_count_session | 0
| Ndb_api_trans_commit_count_session | 0
| Ndb_api_trans_abort_count_session | 0
| Ndb_api_trans_close_count_session | 0
| Ndb_api_pk_op_count_session | 0
| Ndb_api_uk_op_count_session | 0
| Ndb_api_table_scan_count_session | 0
| Ndb_api_range_scan_count_session | 0
| Ndb_api_pruned_scan_count_session | 0
| Ndb_api_scan_batch_count_session | 0
| Ndb_api_read_row_count_session | 0
| Ndb_api_trans_local_read_row_count_session | 0
| Ndb_api_adaptive_send_forced_count_session | 0
| Ndb_api_adaptive_send_unforced_count_session | 0
| Ndb_api_adaptive_send_deferred_count_session | 0
| Ndb_trans_hint_count_session | 0
| Ndb_sorted_scan_count | 0
| Ndb_pushed_queries_defined | 0
| Ndb_pushed_queries_dropped | 0
| Ndb_pushed_queries_executed | 0
| Ndb_pushed_reads | 0
| Ndb_last_commit_epoch_server | 37632503447571
| Ndb_last_commit_epoch_session | 0
| Ndb_system_name | MC_20191126162038
| Ndb_api_event_data_count_injector | 0
| Ndb_api_event_nondata_count_injector | 0
| Ndb_api_event_bytes_count_injector | 0
| Ndb_api_wait_exec_complete_count_slave | 0
| Ndb_api_wait_scan_result_count_slave | 0
| Ndb_api_wait_meta_request_count_slave | 0
| Ndb_api_wait_nanos_count_slave | 0
| Ndb_api_bytes_sent_count_slave | 0
```

```
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
| Ndb_slave_max_replicated_epoch | 0
| Ndb_api_wait_exec_complete_count | 4
| Ndb_api_wait_scan_result_count | 7
| Ndb_api_wait_meta_request_count |172
| Ndb_api_wait_nanos_count | 1083548094028
| Ndb_api_bytes_sent_count | 4640
| Ndb_api_bytes_received_count |109356
| Ndb_api_trans_start_count | 4
| Ndb_api_trans_commit_count | 1
| Ndb_api_trans_abort_count | 1
| Ndb_api_trans_close_count | 4
| Ndb_api_pk_op_count | 2
| Ndb_api_uk_op_count | 0
| Ndb_api_table_scan_count | 1
| Ndb_api_range_scan_count | 1
| Ndb_api_pruned_scan_count | 0
| Ndb_api_scan_batch_count | 1
| Ndb_api_read_row_count | 3
| Ndb_api_trans_local_read_row_count | 2
| Ndb_api_adaptive_send_forced_count | 1
| Ndb_api_adaptive_send_unforced_count | 5
| Ndb_api_adaptive_send_deferred_count | 0
| Ndb_api_event_data_count | 0
| Ndb_api_event_nondata_count | 0
| Ndb_api_event_bytes_count | 0
| Ndb_metadata_excluded_count | 0
| Ndb_metadata_synced_count | 0
| Ndb_conflict_fn_max | 0
| Ndb_conflict_fn_old | 0
| Ndb_conflict_fn_max_del_win | 0
| Ndb_conflict_fn_epoch | 0
| Ndb_conflict_fn_epoch_trans | 0
| Ndb_conflict_fn_epoch2 | 0
| Ndb_conflict_fn_epoch2_trans | 0
| Ndb_conflict_trans_row_conflict_count | 0
| Ndb_conflict_trans_row_reject_count | 0
| Ndb_conflict_trans_reject_count | 0
| Ndb_conflict_trans_detect_iter_count | 0
| Ndb_conflict_trans_conflict_commit_count | 0
| Ndb_conflict_epoch_delete_delete_count | 0
| Ndb_conflict_reflected_op_prepare_count | 0
| Ndb_conflict_reflected_op_discard_count | 0
| Ndb_conflict_refresh_op_count | 0
| Ndb_conflict_last_conflict_epoch | 0
| Ndb_conflict_last_stable_epoch | 0
| Ndb_index_stat_status | allow:1,enable:1,busy:0,
loop:1000,list:(new:0,update:0,read:0,idle:0,check:0,delete:0,error:0,total:0),
analyze:(queue:0,wait:0),stats:(nostats:0,wait:0),total:(analyze:(all:0, error:0),
query:(all:0,nostats:0,error:0),event:(act:0,skip:0,miss:0),cache:(refresh:0,
clean:0,pinned:0,drop:0,evict:0)),cache:(query:0,clean:0,drop:0,evict:0,
usedpct:0.00,highpct:0.00)

\begin{tabular}{|l|l|} 
| Ndb_index_stat_cache_query & 0 \\
| Ndb_index_stat_cache_clean & 0
\end{tabular}
```


If the MySQL server was built with NDB support, but it is not currently connected to a cluster, every row in the output of this statement contains a zero or an empty string for the Value column.

See also Section 15.7.7.37, "SHOW STATUS Statement".
- SELECT * FROM performance_schema.global_status WHERE VARIABLE_NAME LIKE 'NDB\%'

This statement provides similar output to the SHOW STATUS statement discussed in the previous item. Unlike the case with SHOW STATUS, it is possible using SELECT statements to extract values in SQL for use in scripts for monitoring and automation purposes.

For more information, see Section 29.12.15, "Performance Schema Status Variable Tables".

\section*{- SELECT * FROM INFORMATION_SCHEMA.PLUGINS WHERE PLUGIN_NAME LIKE 'NDB\%'}

This statement displays information from the Information Schema PLUGINS table about plugins associated with NDB Cluster, such as version, author, and license, as shown here:
```
mysql> SELECT * FROM INFORMATION_SCHEMA.PLUGINS
        > WHERE PLUGIN_NAME LIKE 'NDB%'\G
*************************** 1. row ****************************************
                PLUGIN_NAME: ndbcluster
            PLUGIN_VERSION: 1.0
                PLUGIN_STATUS: ACTIVE
                    PLUGIN_TYPE: STORAGE ENGINE
    PLUGIN_TYPE_VERSION: 80409.0
            PLUGIN_LIBRARY: NULL
PLUGIN_LIBRARY_VERSION: NULL
            PLUGIN_AUTHOR: Oracle Corporation
    PLUGIN_DESCRIPTION: Clustered, fault-tolerant tables
        PLUGIN_LICENSE: GPL
                LOAD_OPTION: ON
************************** 2. row *****************************************
                PLUGIN_NAME: ndbinfo
        PLUGIN_VERSION: 0.1
            PLUGIN_STATUS: ACTIVE
                PLUGIN_TYPE: STORAGE ENGINE
    PLUGIN_TYPE_VERSION: 80409.0
        PLUGIN_LIBRARY: NULL
PLUGIN_LIBRARY_VERSION: NULL
            PLUGIN_AUTHOR: Oracle Corporation
    PLUGIN_DESCRIPTION: MySQL Cluster system information storage engine
        PLUGIN_LICENSE: GPL
                LOAD_OPTION: ON
***************************************************************************
                PLUGIN_NAME: ndb_transid_mysql_connection_map
        PLUGIN_VERSION: 0.1
            PLUGIN_STATUS: ACTIVE
                PLUGIN_TYPE: INFORMATION SCHEMA
    PLUGIN_TYPE_VERSION: 80409.0
        PLUGIN_LIBRARY: NULL
PLUGIN_LIBRARY_VERSION: NULL
            PLUGIN_AUTHOR: Oracle Corporation
    PLUGIN_DESCRIPTION: Map between MySQL connection ID and NDB transaction ID
        PLUGIN_LICENSE: GPL
                LOAD_OPTION: ON
```


You can also use the SHOW PLUGINS statement to display this information, but the output from that statement cannot easily be filtered. See also The MySQL Plugin API, which describes where and how the information in the PLUGINS table is obtained.

You can also query the tables in the ndbinfo information database for real-time data about many NDB Cluster operations. See Section 25.6.15, "ndbinfo: The NDB Cluster Information Database".

\subsection*{25.6.19 NDB Cluster Security}

This section discusses security considerations to take into account when setting up and running NDB Cluster.

Topics covered in this section include the following:
- NDB Cluster and network security issues
- Configuration issues relating to running NDB Cluster securely
- NDB Cluster and the MySQL privilege system
- MySQL standard security procedures as applicable to NDB Cluster
- Encrypting node file systems and backups
- Requiring and using encrypted connections between cluster nodes

\subsection*{25.6.19.1 NDB Cluster Security and Networking Issues}

In this section, we discuss basic network security issues as they relate to NDB Cluster. It is extremely important to remember that NDB Cluster "out of the box" is not secure; you or your network administrator must take the proper steps to ensure that your cluster cannot be compromised over the network.

By default, no encryption or similar security measures are used in communications between nodes in the cluster; encrypted connections are supported, but must be enabled using the information and instructions found in Section 25.6.19.5, "TLS Link Encryption for NDB Cluster".

You should be aware that, if encrypted connections are not used, there is no checking of the source IP address when accessing the cluster in either of the following cases:
- SQL or API nodes using "free slots" created by empty [mysqld] or [api] sections in the config.ini file

This means that, if there are any empty [mysqld] or [api] sections in the config.ini file, then any API nodes (including SQL nodes) that know the management server's host name (or IP address) and port can connect to the cluster and access its data without restriction. (See Section 25.6.19.2, "NDB Cluster and MySQL Privileges", for more information about this and related issues.)

You can exercise some control over SQL and API node access to the cluster when encrypted connections are not in use by specifying a HostName parameter for each [mysqld] and [api] section in the config. ini file. However, this also means that, should you wish to connect an API node to the cluster from a previously unused host, you must add an [api] section containing its host name to the config. ini file.

See Section 25.4.1, "Quick Test Setup of NDB Cluster", for configuration examples using HostName with API nodes.
- Any ndb_mgm client

This means that any cluster management client that is given the management server's host name (or IP address) and port (if not the standard port) can connect to the cluster and execute any management client command. This includes commands such as ALL STOP and SHUTDOWN.

You can require TLS for connections by starting the management server with --ndb-mgmtls=strict. See Using TLS Connections, for details.

For these reasons, it is necessary to protect the cluster, either by requiring encrypted connections, or on the network level using a configuration which isolates connections between NDB Cluster nodes from any other network communications. Here, we discuss the network-based solution, which can be accomplished by any of the following methods:
1. Keeping Cluster nodes on a network that is physically separate from any public networks. This option is the most dependable; however, it is the most expensive to implement.

We show an example of an NDB Cluster setup using such a physically segregated network here:

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 25.7 NDB Cluster with Hardware Firewall}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4480.jpg?height=666&width=1365&top_left_y=552&top_left_x=342}
\end{figure}

This setup has two networks, one private (solid box) for the Cluster management servers and data nodes, and one public (dotted box) where the SQL nodes reside. (We show the management and data nodes connected using a gigabit switch since this provides the best performance.) Both networks are protected from the outside by a hardware firewall, sometimes also known as a network-based firewall.

This network setup is safest because no packets can reach the cluster's management or data nodes from outside the network-and none of the cluster's internal communications can reach the outside-without going through the SQL nodes, as long as the SQL nodes do not permit any packets to be forwarded. This means, of course, that all SQL nodes must be secured against hacking attempts.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4480.jpg?height=264&width=275&top_left_y=1758&top_left_x=354)

\section*{Important}

With regard to potential security vulnerabilities, an SQL node is no different from any other MySQL server. See Section 8.1.3, "Making MySQL Secure Against Attackers", for a description of techniques you can use to secure MySQL servers.
2. Using one or more software firewalls (also known as host-based firewalls) to control which packets pass through to the cluster from portions of the network that do not require access to it. In this type
of setup, a software firewall must be installed on every host in the cluster which might otherwise be accessible from outside the local network.

The host-based option is the least expensive to implement, but relies purely on software to provide protection and so is the most difficult to keep secure.

This type of network setup for NDB Cluster is illustrated here:

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 25.8 NDB Cluster with Software Firewalls}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4481.jpg?height=734&width=983&top_left_y=676&top_left_x=402}
\end{figure}

Using this type of network setup means that there are two zones of NDB Cluster hosts. Each cluster host must be able to communicate with all of the other machines in the cluster, but only those hosting SQL nodes (dotted box) can be permitted to have any contact with the outside, while those in the zone containing the data nodes and management nodes (solid box) must be isolated from any machines that are not part of the cluster. Applications using the cluster and user of those applications must not be permitted to have direct access to the management and data node hosts.

To accomplish this, you must set up software firewalls that limit the traffic to the type or types shown in the following table, according to the type of node that is running on each cluster host computer:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.40 Node types in a host-based firewall cluster configuration}
\begin{tabular}{|l|l|}
\hline Node Type & Permitted Traffic \\
\hline SQL or API node & \begin{tabular}{l}
- It originates from the IP address of a management or data node (using any TCP or UDP port). \\
- It originates from within the network in which the cluster resides and is on the port that your application is using.
\end{tabular} \\
\hline Data node or Management node & - It originates from the IP address of a management or data node (using any TCP or UDP port). \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Node Type & Permitted Traffic \\
\hline & \begin{tabular}{l}
- It originates from the IP address of an SQL or \\
API node.
\end{tabular} \\
\hline
\end{tabular}

Any traffic other than that shown in the table for a given node type should be denied.
The specifics of configuring a firewall vary from firewall application to firewall application, and are beyond the scope of this Manual. iptables is a very common and reliable firewall application, which is often used with APF as a front end to make configuration easier. You can (and should) consult the documentation for the software firewall that you employ, should you choose to implement an NDB Cluster network setup of this type, or of a "mixed" type as discussed under the next item.
3. It is also possible to employ a combination of the first two methods, using both hardware and software to secure the cluster-that is, using both network-based and host-based firewalls. This is between the first two schemes in terms of both security level and cost. This type of network setup keeps the cluster behind the hardware firewall, but permits incoming packets to travel beyond the router connecting all cluster hosts to reach the SQL nodes.

One possible network deployment of an NDB Cluster using hardware and software firewalls in combination is shown here:

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 25.9 NDB Cluster with a Combination of Hardware and Software Firewalls}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4482.jpg?height=732&width=981&top_left_y=1281&top_left_x=340}
\end{figure}

In this case, you can set the rules in the hardware firewall to deny any external traffic except to SQL nodes and API nodes, and then permit traffic to them only on the ports required by your application.

If you are using a Commercial distribution of NDB Cluster, you can also use MySQL Enterprise Firewall to restrict SQL statements made by MySQL clients to an approved set. See Section 8.4.7, "MySQL Enterprise Firewall", for more information.

Whatever network configuration you use, remember that your objective from the viewpoint of keeping the cluster secure remains the same-to prevent any unessential traffic from reaching the cluster while ensuring the most efficient communication between the nodes in the cluster.

Because NDB Cluster requires large numbers of ports to be open for communications between nodes, the recommended option is to use a segregated network. This represents the simplest way to prevent unwanted traffic from reaching the cluster.

\section*{Note}

If you wish to administer an NDB Cluster remotely (that is, from outside the local network), the recommended way to do this is to use ssh or another secure login shell to access an SQL node host. From this host, you can then run the management client to access the management server safely, from within the cluster's own local network.

Even though it is possible to do so in theory, it is not recommended to use ndb_mgm to manage a Cluster directly from outside the local network on which the Cluster is running. Since neither authentication nor encryption takes place between the management client and the management server, this represents an extremely insecure means of managing the cluster, and is almost certain to be compromised sooner or later.

\subsection*{25.6.19.2 NDB Cluster and MySQL Privileges}

In this section, we discuss how the MySQL privilege system works in relation to NDB Cluster and the implications of this for keeping an NDB Cluster secure.

Standard MySQL privileges apply to NDB Cluster tables. This includes all MySQL privilege types (SELECT privilege, UPDATE privilege, DELETE privilege, and so on) granted on the database, table, and column level. As with any other MySQL Server, user and privilege information is stored in the mysql system database. The SQL statements used to grant and revoke privileges on NDB tables, databases containing such tables, and columns within such tables are identical in all respects with the GRANT and REVOKE statements used in connection with database objects involving any (other) MySQL storage engine. The same thing is true with respect to the CREATE USER and DROP USER statements.

It is important to keep in mind that, by default, the MySQL grant tables use the InnoDB storage engine. Because of this, those tables are not normally duplicated or shared among MySQL servers acting as SQL nodes in an NDB Cluster. In other words, changes in users and their privileges do not automatically propagate between SQL nodes by default. If you wish, you can enable synchronization of MySQL users and privileges across NDB Cluster SQL nodes; see Section 25.6.13, "Privilege Synchronization and NDB_STORED_USER", for details.

Conversely, because there is no way in MySQL to deny privileges (privileges can either be revoked or not granted in the first place, but not denied as such), there is no special protection for NDB tables on one SQL node from users that have privileges on another SQL node; this is true even if you are not using automatic distribution of user privileges. The definitive example of this is the MySQL root account, which can perform any action on any database object. In combination with empty [mysqld] or [api] sections of the config.ini file, this account can be especially dangerous. To understand why, consider the following scenario:
- The config.ini file contains at least one empty [mysqld] or [api] section. This means that the NDB Cluster management server performs no checking of the host from which a MySQL Server (or other API node) accesses the NDB Cluster.
- There is no firewall, or the firewall fails to protect against access to the NDB Cluster from hosts external to the network.
- The host name or IP address of the NDB Cluster management server is known or can be determined from outside the network.

If these conditions are true, then anyone, anywhere can start a MySQL Server with - - ndbcluster --ndb-connectstring=management_host and access this NDB Cluster. Using the MySQL root account, this person can then perform the following actions:
- Execute metadata statements such as SHOW DATABASES statement (to obtain a list of all NDB databases on the server) or SHOW TABLES FROM some_ndb_database statement to obtain a list of all NDB tables in a given database
- Run any legal MySQL statements on any of the discovered tables, such as:
- SELECT * FROM some_table or TABLE some_table to read all the data from any table
- DELETE FROM some_table or TRUNCATE TABLE to delete all the data from a table
- DESCRIBE some_table or SHOW CREATE TABLE some_table to determine the table schema
- UPDATE some_table SET column1 = some_value to fill a table column with "garbage" data; this could actually cause much greater damage than simply deleting all the data

More insidious variations might include statements like these:
```
UPDATE some_table SET an_int_column = an_int_column + 1
```

or
```
UPDATE some_table SET a_varchar_column = REVERSE(a_varchar_column)
```


Such malicious statements are limited only by the imagination of the attacker.
The only tables that would be safe from this sort of mayhem would be those tables that were created using storage engines other than NDB, and so not visible to a "rogue" SQL node.

A user who can log in as root can also access the INFORMATION_SCHEMA database and its tables, and so obtain information about databases, tables, stored routines, scheduled events, and any other database objects for which metadata is stored in INFORMATION_SCHEMA.

It is also a very good idea to use different passwords for the root accounts on different NDB Cluster SQL nodes unless you are using shared privileges.

In sum, you cannot have a safe NDB Cluster if it is directly accessible from outside your local network.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4484.jpg?height=99&width=106&top_left_y=1594&top_left_x=301)

\section*{Important}

Never leave the MySQL root account password empty. This is just as true when running MySQL as an NDB Cluster SQL node as it is when running it as a standalone (non-Cluster) MySQL Server, and should be done as part of the MySQL installation process before configuring the MySQL Server as an SQL node in an NDB Cluster.

If you need to synchronize mysql system tables between SQL nodes, you can use standard MySQL replication to do so, or employ a script to copy table entries between the MySQL servers. Users and their privileges can be shared and kept in synch using the NDB_STORED_USER privilege.

Summary. The most important points to remember regarding the MySQL privilege system with regard to NDB Cluster are listed here:
1. Users and privileges established on one SQL node do not automatically exist or take effect on other SQL nodes in the cluster. Conversely, removing a user or privilege on one SQL node in the cluster does not remove the user or privilege from any other SQL nodes.
2. You can share MySQL users and privileges among SQL nodes using NDB_STORED_USER.
3. Once a MySQL user is granted privileges on an NDB table from one SQL node in an NDB Cluster, that user can "see" any data in that table regardless of the SQL node from which the data originated, even if that user is not shared.

\subsection*{25.6.19.3 NDB Cluster and MySQL Security Procedures}

In this section, we discuss MySQL standard security procedures as they apply to running NDB Cluster.

In general, any standard procedure for running MySQL securely also applies to running a MySQL Server as part of an NDB Cluster. First and foremost, you should always run a MySQL Server as the mysql operating system user; this is no different from running MySQL in a standard environment (that is, not using NDB). The mysql system account should be uniquely and clearly defined. Fortunately, this is the default behavior for a new MySQL installation. You can verify that the mysqld process is running as the mysql operating system user by using the system command such as the one shown here:
```
$> ps aux | grep mysql
root 10467 0.0 0.1 3616 1380 pts/3 S 11:53 0:00 \
    /bin/sh ./mysqld_safe --ndbcluster --ndb-connectstring=localhost:1186
mysql 10512 0.2 2.5 58528 26636 pts/3 Sl 11:53 0:00 \
    /usr/local/mysql/libexec/mysqld --basedir=/usr/local/mysql \
    --datadir=/usr/local/mysql/var --user=mysql --ndbcluster \
    --ndb-connectstring=localhost:1186 --pid-file=/usr/local/mysql/var/mothra.pid \
    --log-error=/usr/local/mysql/var/mothra.err
jon 10579 0.0 0.0 2736 688 pts/0 S+ 11:54 0:00 grep mysql
```


If the mysqld process is running as any other user than mysql, you should immediately shut it down and restart it as the mysql user. If this user does not exist on the system, the mysql user account should be created, and this user should be part of the mysql user group; in this case, you should also make sure that the MySQL data directory on this system (as set using the --datadir option for mysqld) is owned by the mysql user, and that the SQL node's my.cnf file includes user=mysql in the [mysqld] section. Alternatively, you can start the MySQL server process with --user=mysql on the command line, but it is preferable to use the my. cnf option, since you might forget to use the command-line option and so have mysqld running as another user unintentionally. The mysqld_safe startup script forces MySQL to run as the mysql user.

\begin{figure}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4485.jpg?height=213&width=273&top_left_y=1265&top_left_x=360}
\captionsetup{labelformat=empty}
\caption{Important
Never run mysqld as the system root user. Doing so means that potentially any file on the system can be read by MySQL, and thus-should MySQL be compromised—by an attacker.}
\end{figure}

As mentioned in the previous section (see Section 25.6.19.2, "NDB Cluster and MySQL Privileges"), you should always set a root password for the MySQL Server as soon as you have it running. You should also delete the anonymous user account that is installed by default. You can accomplish these tasks using the following statements:
```
$> mysql -u root
mysql> UPDATE mysql.user
    -> SET Password=PASSWORD('secure_password')
    -> WHERE User='root';
mysql> DELETE FROM mysql.user
    -> WHERE User='';
mysql> FLUSH PRIVILEGES;
```


Be very careful when executing the DELETE statement not to omit the WHERE clause, or you risk deleting all MySQL users. Be sure to run the FLUSH PRIVILEGES statement as soon as you have modified the mysql. user table, so that the changes take immediate effect. Without FLUSH PRIVILEGES, the changes do not take effect until the next time that the server is restarted.

\section*{Note}

Many of the NDB Cluster utilities such as ndb_show_tables, ndb_desc, and ndb_select_all also work without authentication and can reveal table names, schemas, and data. By default these are installed on Unix-style systems with the permissions $\mathrm{w} \times \mathrm{r}-\mathrm{xr}-\mathrm{x}$ (755), which means they can be executed by any user that can access the mysql/bin directory.

See Section 25.5, "NDB Cluster Programs", for more information about these utilities.

\subsection*{25.6.19.4 File System Encryption for NDB Cluster}

The following sections provide information about NDB data node file system encryption.

\section*{NDB File System Encryption Setup and Usage}

Encryption of file system: To enable encryption of a previously unencrypted file system, the following steps are required:
1. Set the required data node parameters in the [ndbd default] section of the config.ini file, as shown here:
```
[ndbd default]
EncryptedFileSystem= 1
```


These parameters must be set as shown on all data nodes.
2. Start the management server with either --initial or --reload to cause it to read the updated configuration file.
3. Perform a rolling initial start (or restart) of all the data nodes (see Section 25.6.5, "Performing a Rolling Restart of an NDB Cluster"): Start each data node with --initial; in addition, supply either of the options --filesystem-password or --filesystem-password-from-stdin, plus a password, to each data node process. When you supply the password on the command line, a warning is shown, similar to this one:
```
> ndbmtd -c 127.0.0.1 --filesystem-password=ndbsecret
ndbmtd: [Warning] Using a password on the command line interface can be insecure.
2022-08-22 16:17:58 [ndbd] INFO -- Angel connected to '127.0.0.1:1186'
2022-08-22 16:17:58 [ndbd] INFO -- Angel allocated nodeid: 5
```

--filesystem-password can accept the password form a file, tty, or stdin; --filesystem-password-from-stdin accepts the password from stdin only. The latter protects the password from exposure on the process command line or in the file system, and allows for the possibility of passing it from another secure application.

You can also place the password in a my. cnf file that can be read by the data node process, but not by other users of the system. Using the same password as in the previous example, the relevant portion of the file should look like this:
```
[ndbd]
filesystem-password=ndbsecret
```


You can also prompt the user starting the data node process to supply the encryption password when doing so, by using the --filesystem-password-from-stdin option in the my.cnf file instead, like this:
```
[ndbd]
filesystem-password-from-stdin
```


In this case, the user is prompted for the password when starting the data node process, as shown here:
```
> ndbmtd -c 127.0.0.1
Enter filesystem password: *********
2022-08-22 16:36:00 [ndbd] INFO -- Angel connected to '127.0.0.1:1186'
2022-08-22 16:36:00 [ndbd] INFO -- Angel allocated nodeid: 5
>
```


Regardless of the method used, the format of the encryption password is the same as that used for passwords for encrypted backups (see Section 25.6.8.2, "Using The NDB Cluster Management Client to Create a Backup"); the password must be supplied when starting each data node process;
otherwise the data node process cannot start. This is indicated by the following message in the data node log:
```
> tail -n2 ndb_5_out.log
2022-08-22 16:08:30 [ndbd] INFO -- Data node configured to have encryption but password not pro
2022-08-22 16:08:31 [ndbd] ALERT -- Node 5: Forced node shutdown completed. Occurred during star
```


When restarted as just described, each data node clears its on-disk state, and rebuilds it in encrypted form.

Rotation of File system password: To update the encryption password used by the data nodes, perform a rolling initial restart of the data nodes, supplying the new password to each data node when restarting it using --filesystem-password or --filesystem-password-from-stdin.

Decryption of file system: To remove encryption from an encrypted file system, do the following:
1. In the [ndbd default] section of the config.ini file, set EncryptedFileSystem = OFF.
2. Restart the management server with --initial or --reload.
3. Perform a rolling initial restart of the data nodes. Do not use any password-related options when restarting the node binaries.

When restarted, each data node clears its on-disk state, and rebuilds it in unencrypted form.
To see whether file system encryption is properly configured, you can use a query against the ndbinfo config_values and config_params tables similar to this one:
```
mysql> SELECT v.node_id AS Node, p.param_name AS Parameter, v.config_value AS Value
    -> FROM ndbinfo.config_values v
    -> JOIN ndbinfo.config_params p
    -> ON v.config_param=p.param_number
    -> WHERE p.param_name='EncryptedFileSystem';
+------+-----------------------+-------+
| Node | Parameter | Value |
+------+-----------------------+-------+
| 5 | EncryptedFileSystem | 1
| 6 | EncryptedFileSystem | 1
| 7 | EncryptedFileSystem | 1
| 8 | EncryptedFileSystem | 1
+------+-----------------------+-------+
4 rows in set (0.10 sec)
```


Here, EncryptedFileSystem is equal to 1 on all data nodes, which means that filesystem encryption is enabled for this cluster.

\section*{NDB File System Encryption Implementation}

For NDB Transparent Data Encryption (TDE), data nodes encrypt user data at rest, with security provided by a password (file system password), which is used to encrypt and decrypt a secrets file on each data node. The secrets file contains a Node Master Key (NMK), a key used later to encrypt the different file types used for persistence. NDB TDE encrypts user data files including LCP files, redo log files, tablespace files, and undo log files.

You can use the ndbxfrm utility to see whether a file is encrypted, as shown here:
```
> ndbxfrm -i ndb_5_fs/LCP/0/T2F0.Data
File=ndb_5_fs/LCP/0/T2F0.Data, compression=no, encryption=yes
> ndbxfrm -i ndb_6_fs/LCP/0/T2F0.Data
File=ndb_6_fs/LCP/0/T2F0.Data, compression=no, encryption=no
```


It is possible to obtain the key from the secrets file using the ndb_secretsfile_reader program, like this:
```
> ndb_secretsfile_reader --filesystem-password=54kl14 ndb_5_fs/D1/NDBCNTR/S0.sysfile
ndb_secretsfile_reader: [Warning] Using a password on the command line interface can be insecure.
```

cac256e18b2ddf6b5ef82d99a72f18e864b78453cc7fa40bfaf0c40b91122d18
The per-node key hierarchy can be represented as follows:
- A user-supplied passphrase $(P)$ is processed by a key-derivation function using a random salt to generate a unique passphase key (PK).
- The PK (unique to each node) encrypts the data on each node in its own secrets file.
- The data in the secrets file includes a unique, randomly generated Node Master Key (NMK).
- The NMK encrypts (using wrapping) one or more randomly generated data encryption key (DEK) values in the header of each encrypted file (including LCP and TS files, and redo and undo logs).
- Data encryption key values ( DEK $_{0}, \ldots$, DEK $_{n}$ ) are used for encryption of [subsets of] data in each file.

The passphrase indirectly encrypts the secrets file containing the random NMK, which encrypts a portion of the header of each encrypted file on the node. The encrypted file header contains random data keys used for the data in that file.

Encryption is implemented transparently by the NDBFS layer within the data nodes. NDBFS internal client blocks operate on their files as normal; NDBFS wraps the physical file with extra header and footer information supporting encryption, and encrypts and decrypts data as it is read from and written to the file. The wrapped file format is referred to as ndbxfrm1.

The node password is processed with PBKDF2 and the random salt to encrypt the secrets file, which contains the randomly generated NMK which is used to encrypt the randomly generated data encryption key in each encrypted file.

The work of encryption and decryption is performed in the NDBFS I/O threads (rather than in signal execution threads such as main, tc, ldm, or rep). This is similar to what happens with compressed LCPs and compressed backups, and normally results in increased I/O thread CPU usage; you may wish to adjust ThreadConfig (if in use) with regard to the I/O threads.

\section*{NDB File System Encryption Limitations}

Transparent data encryption in NDB Cluster is subject to the following restrictions and limitations:
- The file system password must be supplied to each individual data node.
- File system password rotation requires an initial rolling restart of the data nodes; this must be performed manually, or by an application external to NDB).
- For a cluster with only a single replica (NoOfReplicas $=1$ ), a full backup and restore is required for file system password rotation.
- Rotation of all data encryption keys requires an initial node restart.

NDB TDE and NDB Replication. The use of an encrypted filesystem does not have any effect on NDB Replication. All of the following scenarios are supported:
- Replication of an NDB Cluster having an encrypted file system to an NDB Cluster whose file system is not encrypted.
- Replication of an NDB Cluster whose file system is not encrypted to an NDB Cluster whose file system is encrypted.
- Replication of an NDB Cluster whose file system is encrypted to a standalone MySQL server using InnoDB tables which are not encrypted.
- Replication of an NDB Cluster with an unencrypted file system to a standalone MySQL server using InnoDB tables with file sytem encryption.

\subsection*{25.6.19.5 TLS Link Encryption for NDB Cluster}

This section discusses the implementation and use of Transport Layer Security (TLS) to secure network communications in MySQL NDB Cluster. Topics covered include keys and certificates, key and certificate life cycles, authentication of certificates, and how these are reflected in the configuration of the cluster, as well as NDB Cluster support for the Internet Public Key Infrastructure (PKI) used to authenticate and encrypt connections between NDB nodes, and between the NDB management server and its clients.

> Note
> TLS for NDB Cluster on Linux requires compiled-in support for OpenSSL 1.1 or later. For this reason, it is not available for Enterprise Linux 7, which is built with OpenSSL 1.0.

\section*{Overview of TLS for NDB Cluster}

TLS can be used to secure network communications in NDB Cluster 8.3 and later. NDB Transporter connections secured by TLS use TLS mutual authentication, in which each node validates the certificate of its peer. A node certificate can also be bound to a particular hostname; in this case, a peer authorizes the certificate only if the hostname can be verified.

A node's own certificate file contains the entire chain of trust it uses to validate the certificates of its peers. This usually includes only its own certificate and that of the issuing CA, but may include additional CAs. Because an NDB cluster is considered a realm of trust, the CA should be limited in scope to a single cluster.

In order to obtain signed node certificates, it is necessary first to create a Certification Authority (CA). When TLS is deployed, every node has an authentic certificate, which is signed by the CA. Only the administrator (DBA) should have access to the private CA signing key with which valid node certificates are created.

Hostname bindings are created for management and API node certificates by default. Since NDB Cluster data nodes are already subject to hostname checks as part of node ID allocation, the default behavior is to not add an additional hostname check for TLS.

A certificate is no longer valid upon arrival of the expiration date. To minimize the impact of certificate expiration on system availability, a cluster should have several certificates with staggered expiration dates; client certificates should expire earliest, followed by data node certificates, and then by management server certificates. To facilitate staggered expiration, each certificate is associated with a node type; a given node uses keys and certificates of the appropriate type only.

Private keys are created in place; copying of files containing private keys is minimized. Both private keys and certificates are labeled as either active (current) or pending. It is possible to rotate keys to allow for pending keys to replace active keys before the active keys expire.

Due to the potentially large numbers of files involved, NDB follows several naming conventions for files storing keys, signing requests, and certificates. These names are not user configurable, although the directories where these files are stored can be determined by the user.

By default, NDB Cluster CA private keys are protected by a passphrase which must be provided when creating a signed node certificate. Node private keys are stored unencrypted, so that they can be opened automatically at node startup time. Private key files are read-only (Unix file mode 0400).

\section*{Creating a CA and Keys}

Create a CA in the CA directory:
```
$> ndb_sign_keys --create-CA --to-dir=CA
```

```
Mode of operation: create CA.
This utility will create a cluster CA private key and a public key certificate.
You will be prompted to supply a pass phrase to protect the
cluster private key. This security of the cluster depends on this.
Only the database administrator responsible for this cluster should
have the pass phrase. Knowing the pass phrase would allow an attacker
to gain full access to the database.
The passphrase must be at least 4 characters in length.
Creating CA key file NDB-Cluster-private-key in directory CA.
Enter PEM pass phrase: Verifying - Enter PEM pass phrase:
Creating CA certificate NDB-Cluster-cert in directory CA.
$> ls -l CA
total 8
-rw-r--r-- 1 mysql mysql 1082 Dec 19 07:32 NDB-Cluster-cert
-r--------- 1 mysql mysql 1854 Dec 19 07:32 NDB-Cluster-private-key
```


Next, create keys for all nodes on this host using the --create-key option, like this:
```
$> ndb_sign_keys --ndb-tls-search-path='CA' --create-key -c localhost:1186 --to-dir=keys
Mode of operation: create active keys and certificates.
Enter PEM pass phrase:
Creating active private key in directory keys.
Creating active certificate in directory keys.
Creating active private key in directory keys.
Creating active certificate in directory keys.
Creating active private key in directory keys.
Creating active certificate in directory keys.
Read 5 nodes from custer configuration.
Found 5 nodes configured to run on this host.
Created 3 keys and 3 certificates.
$>
```

--create-key causes ndb_sign_keys to connect to the management server, read the cluster configuration, and then create a full set of keys and certificates for all NDB nodes configured to run on the local host. The cluster management server must be running for this to work. If the management server is not running, ndb_sign_keys can read the cluster configuration file directly using the - -config-file option. ndb_sign_keys can also create a single key-certificate pair for a single node type using --no-config to ignore the cluster configuration and --node-type to specify the node type (one of mgmd, db, or api). In addition, you must either specify a hostname for the certificate with - - bound - hostname=host_name, or disable hostname binding by supplying - -bind-host=0.

Key signing by a remote host is accomplished by connecting to the CA host using ssh.

\section*{Using TLS Connections}

Once you have created a CA and certificate, you can test the availability of the TLS connection to the management server by running the ndb_mgm client with --test-tls, like this:
```
$> ndb_mgm --test-tls
No valid certificate.
```


An appropriate message is generated if the client can connect using TLS. You may need to include other ndb_mgm options such as --ndb-tls-search-path to facilitate the TLS connection, as shown here:
```
$> ndb_mgm --test-tls --ndb-tls-search-path="CA:keys"
Connected to management server at localhost port 1186 (using TLS)
```


If the client connects without using TLS, this is also indicated, similarly to what is shown here:
```
$> ndb_mgm
Connected to management server at localhost port 1186 (using cleartext)
```

\$>
You can cause the cluster to use the CA and certificates created with ndb_sign_keys by performing a rolling restart of the cluster, beginning with the management nodes, which should be restarted using the --ndb-tls-search-path option. After this, restart the data nodes, again using - - ndb - tls -search-path. --ndb-tls-search-path is also supported for mysqld run as a cluster API node.

For TLS to function, every node connecting to the cluster must have a valid certificate and key. This includes data nodes, API nodes, and utility programs. The same certificate and key files can be used by more than one node.

Data nodes log the TLS connection and include the full path to the certificate file used, as shown here:
```
$> ndbmtd -c localhost:1186 --ndb-tls-search-path='CA:keys'
2023-12-19 12:02:15 [ndbd] INFO -- NDB TLS 1.3 available using certificate file 'keys/ndb-data-node
2023-12-19 12:02:15 [ndbd] INFO -- Angel connected to 'localhost:1186'
2023-12-19 12:02:15 [ndbd] INFO -- Angel allocated nodeid: 5
```


You can verify that cluster nodes are using TLS to connect by checking the output of the TLS INFO command in the ndb_mgm client, like this:
```
$> ndb_mgm --ndb-tls-search-path="CA:keys"
-- NDB Cluster -- Management Client --
ndb_mgm> TLS INFO
Connected to management server at localhost port 1186 (using TLS)
Main interactive connection is using TLS
Event listener connection is using TLS
Server reports 6 TLS connections.
Session ID: 32
Peer address: ::
Certificate name: NDB Node Dec 2023
Certificate serial: 39:1E:4A:78:E5:93:45:09:FC:56
Certificate expires: 21-Apr-2024
Session ID: 31
Peer address: 127.0.0.1
Certificate name: NDB Node Dec 2023
Certificate serial: 39:1E:4A:78:E5:93:45:09:FC:56
Certificate expires: 21-Apr-2024
Session ID: 30
Peer address: 127.0.0.1
Certificate name: NDB Node Dec 2023
Certificate serial: 39:1E:4A:78:E5:93:45:09:FC:56
Certificate expires: 21-Apr-2024
Session ID: 18
Peer address: 127.0.0.1
Certificate name: NDB Data Node Dec 2023
Certificate serial: 57:5E:58:70:7C:49:B3:74:1A:99
Certificate expires: 07-May-2024
Session ID: 12
Peer address: 127.0.0.1
Certificate name: NDB Data Node Dec 2023
Certificate serial: 57:5E:58:70:7C:49:B3:74:1A:99
Certificate expires: 07-May-2024
Session ID: 1
Peer address: 127.0.0.1
Certificate name: NDB Management Node Dec 2023
Certificate serial: 32:10:44:3C:F4:7D:73:40:97:41
Certificate expires: 17-May-2024
        Server statistics since restart
```

```
Total accepted connections: 32
    Total connections upgraded to TLS: 8
    Current connections: 6
    Current connections using TLS: 6
    Authorization failures: 0
ndb_mgm>
```


If Current connections and Current connections using TLS are the same, this means that all cluster connections are using TLS.

Once you have established TLS connections for all nodes, you should make TLS a strict requirement. For clients, you can do this by setting ndb-mgm-tls=strict in the my.cnf file on each cluster host. Enforce the TLS requirement on the management server by setting RequireTls=true in the [mgm default] section of the cluster config.ini file, then performing a rolling restart of the cluster so that this change takes effect. Do this for the data nodes as well, by setting RequireTls=true in the [ndbd default] section of the configuration file; after this, perform a second rolling restart of the cluster to make the changes take effect on the data nodes. Start ndb_mgmd with the --reload and -config-file options both times to ensure that each of the two configuration file changes is read by the management server.

To replace a private key, use ndb_sign_keys --create-key to create the new key and certificate, with the --node-id and --node-type options if and as necessary to limit the replacement to a single node ID, node type, or both. If the tool finds existing key and certificate files, it renames them to reflect their retired status, and saves the newly created key and certificate as active files; the new files are used the next time that the node is restarted.

To replace a certificate without replacing the private key, use ndb_sign_keys without supplying the --create-key option. This creates a new certificate for the existing key (without replacing the key), and retires the old certificate.

Remote key siging is is also supported by ndb_sign_keys. Using SSH, the --remote-CA-host option supplies the SSH address of the CA host in user@host format. By default, the local ndb_sign_keys process uses the system ssh utility and address to run ndb_sign_keys on the remote host with the correct options to perform the desired signing. Alternately, if--remote-openssl=true, openssl rather than ndb_sign_keys is used on the remote host.

When using remote signing, the data sent over the network is a PKCS\#10 signing request, and not the private key, which never leaves the local host.

\subsection*{25.7 NDB Cluster Replication}

NDB Cluster supports asynchronous replication, more usually referred to simply as "replication". This section explains how to set up and manage a configuration in which one group of computers operating as an NDB Cluster replicates to a second computer or group of computers. We assume some familiarity on the part of the reader with standard MySQL replication as discussed elsewhere in this Manual. (See Chapter 19, Replication).

Note
NDB Cluster does not support replication using GTIDs; semisynchronous replication and group replication are also not supported by the NDB storage engine.

Normal (non-clustered) replication involves a source server and a replica server, the source being so named because operations and data to be replicated originate with it, and the replica being the recipient of these. In NDB Cluster, replication is conceptually very similar but can be more complex in practice, as it may be extended to cover a number of different configurations including replicating between two complete clusters. Although an NDB Cluster itself depends on the NDB storage engine for clustering functionality, it is not necessary to use NDB as the storage engine for the replica's copies
of the replicated tables (see Replication from NDB to other storage engines). However, for maximum availability, it is possible (and preferable) to replicate from one NDB Cluster to another, and it is this scenario that we discuss, as shown in the following figure:

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 25.10 NDB Cluster-to-Cluster Replication Layout}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4493.jpg?height=1319&width=1440&top_left_y=484&top_left_x=349}
\end{figure}

In this scenario, the replication process is one in which successive states of a source cluster are logged and saved to a replica cluster. This process is accomplished by a special thread known as the NDB binary log injector thread, which runs on each MySQL server and produces a binary log (binlog). This thread ensures that all changes in the cluster producing the binary log-and not just those changes that are effected through the MySQL Server-are inserted into the binary log with the correct serialization order. We refer to the MySQL source and replica servers as replication servers or replication nodes, and the data flow or line of communication between them as a replication channel.

For information about performing point-in-time recovery with NDB Cluster and NDB Cluster Replication, see Section 25.7.9.2, "Point-In-Time Recovery Using NDB Cluster Replication".

NDB API replica status variables. NDB API counters can provide enhanced monitoring capabilities on replica clusters. These counters are implemented as NDB statistics _replica status variables, as seen in the output of SHOW STATUS, or in the results of queries against the Performance Schema session_status or global_status table in a mysql client session connected to a MySQL Server that is acting as a replica in NDB Cluster Replication. By comparing the values of these status variables before and after the execution of statements affecting replicated NDB tables, you can observe the corresponding actions taken on the NDB API level by the replica, which can be useful when monitoring or troubleshooting NDB Cluster Replication. Section 25.6.14, "NDB API Statistics Counters and Variables", provides additional information.

Replication from NDB to non-NDB tables. It is possible to replicate NDB tables from an NDB Cluster acting as the replication source to tables using other MySQL storage engines such as InnoDB or MyISAM on a replica mysqld. This is subject to a number of conditions; see Replication from NDB to other storage engines, and Replication from NDB to a nontransactional storage engine, for more information.

\subsection*{25.7.1 NDB Cluster Replication: Abbreviations and Symbols}

Throughout this section, we use the following abbreviations or symbols for referring to the source and replica clusters, and to processes and commands run on the clusters or cluster nodes:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.41 Abbreviations used throughout this section referring to source and replica clusters, and to processes and commands run on cluster nodes}
\begin{tabular}{|l|l|}
\hline Symbol or Abbreviation & Description (Refers to...) \\
\hline $S$ & The cluster serving as the (primary) replication source \\
\hline $R$ & The cluster acting as the (primary) replica \\
\hline shellS> & Shell command to be issued on the source cluster \\
\hline mysqlS> & MySQL client command issued on a single MySQL server running as an SQL node on the source cluster \\
\hline mysqlS*> & MySQL client command to be issued on all SQL nodes participating in the replication source cluster \\
\hline shellR> & Shell command to be issued on the replica cluster \\
\hline mysqlR> & MySQL client command issued on a single MySQL server running as an SQL node on the replica cluster \\
\hline mysqlR*> & MySQL client command to be issued on all SQL nodes participating in the replica cluster \\
\hline C & Primary replication channel \\
\hline C' & Secondary replication channel \\
\hline S' & Secondary replication source \\
\hline $R^{\prime}$ & Secondary replica \\
\hline
\end{tabular}
\end{table}

\subsection*{25.7.2 General Requirements for NDB Cluster Replication}

A replication channel requires two MySQL servers acting as replication servers (one each for the source and replica). For example, this means that in the case of a replication setup with two replication channels (to provide an extra channel for redundancy), there should be a total of four replication nodes, two per cluster.

Replication of an NDB Cluster as described in this section and those following is dependent on rowbased replication. This means that the replication source MySQL server must be running with - -binlog-format=ROW or --binlog-format=MIXED, as described in Section 25.7.6, "Starting NDB Cluster Replication (Single Replication Channel)". For general information about row-based replication, see Section 19.2.1, "Replication Formats".

Important
If you attempt to use NDB Cluster Replication with - - binlog format=STATEMENT, replication fails to work properly because the
> ndb_binlog_index table on the source cluster and the epoch column of the ndb_apply_status table on the replica cluster are not updated (see Section 25.7.4, "NDB Cluster Replication Schema and Tables"). Instead, only updates on the MySQL server acting as the replication source propagate to the replica, and no updates from any other SQL nodes in the source cluster are replicated.

The default value for the --binlog-format option is MIXED.
Each MySQL server used for replication in either cluster must be uniquely identified among all the MySQL replication servers participating in either cluster (you cannot have replication servers on both the source and replica clusters sharing the same ID). This can be done by starting each SQL node using the --server-id=id option, where id is a unique integer. Although it is not strictly necessary, we assume for purposes of this discussion that all NDB Cluster binaries are of the same release version.

It is generally true in MySQL Replication that both MySQL servers (mysqld processes) involved must be compatible with one another with respect to both the version of the replication protocol used and the SQL feature sets which they support (see Section 19.5.2, "Replication Compatibility Between MySQL Versions"). It is due to such differences between the binaries in the NDB Cluster and MySQL Server 8.4 distributions that NDB Cluster Replication has the additional requirement that both mysqld binaries come from an NDB Cluster distribution. The simplest and easiest way to assure that the mysqld servers are compatible is to use the same NDB Cluster distribution for all source and replica mysqld binaries.

We assume that the replica server or cluster is dedicated to replication of the source cluster, and that no other data is being stored on it.

All NDB tables being replicated must be created using a MySQL server and client. Tables and other database objects created using the NDB API (with, for example, Dictionary : :createTable()) are not visible to a MySQL server and so are not replicated. Updates by NDB API applications to existing tables that were created using a MySQL server can be replicated.

\section*{Note}

It is possible to replicate an NDB Cluster using statement-based replication. However, in this case, the following restrictions apply:
- All updates to data rows on the cluster acting as the source must be directed to a single MySQL server.
- It is not possible to replicate a cluster using multiple simultaneous MySQL replication processes.
- Only changes made at the SQL level are replicated.

These are in addition to the other limitations of statement-based replication as opposed to row-based replication; see Section 19.2.1.1, "Advantages and Disadvantages of Statement-Based and Row-Based Replication", for more specific information concerning the differences between the two replication formats.

\subsection*{25.7.3 Known Issues in NDB Cluster Replication}

This section discusses known problems or issues when using replication with NDB Cluster.
Loss of connection between source and replica. A loss of connection can occur either between the source cluster SQL node and the replica cluster SQL node, or between the source SQL node and the data nodes of the source cluster. In the latter case, this can occur not only as a result of loss of
physical connection (for example, a broken network cable), but due to the overflow of data node event buffers; if the SQL node is too slow to respond, it may be dropped by the cluster (this is controllable to some degree by adjusting the MaxBufferedEpochs and TimeBetweenEpochs configuration parameters). If this occurs, it is entirely possible for new data to be inserted into the source cluster without being recorded in the source SQL node's binary log. For this reason, to guarantee high availability, it is extremely important to maintain a backup replication channel, to monitor the primary channel, and to fail over to the secondary replication channel when necessary to keep the replica cluster synchronized with the source. NDB Cluster is not designed to perform such monitoring on its own; for this, an external application is required.

The source SQL node issues a "gap" event when connecting or reconnecting to the source cluster. (A gap event is a type of "incident event," which indicates an incident that occurs that affects the contents of the database but that cannot easily be represented as a set of changes. Examples of incidents are server failures, database resynchronization, some software updates, and some hardware changes.) When the replica encounters a gap in the replication log, it stops with an error message. This message is available in the output of SHOW REPLICA STATUS, and indicates that the SQL thread has stopped due to an incident registered in the replication stream, and that manual intervention is required. See Section 25.7.8, "Implementing Failover with NDB Cluster Replication", for more information about what to do in such circumstances.

\section*{Important}

Because NDB Cluster is not designed on its own to monitor replication status or provide failover, if high availability is a requirement for the replica server or cluster, then you must set up multiple replication lines, monitor the source mysqld on the primary replication line, and be prepared fail over to a secondary line if and as necessary. This must be done manually, or possibly by means of a third-party application. For information about implementing this type of setup, see Section 25.7.7, "Using Two Replication Channels for NDB Cluster Replication", and Section 25.7.8, "Implementing Failover with NDB Cluster Replication".

If you are replicating from a standalone MySQL server to an NDB Cluster, one channel is usually sufficient.

Circular replication. NDB Cluster Replication supports circular replication, as shown in the next example. The replication setup involves three NDB Clusters numbered 1, 2, and 3, in which Cluster 1 acts as the replication source for Cluster 2, Cluster 2 acts as the source for Cluster 3, and Cluster 3 acts as the source for Cluster 1, thus completing the circle. Each NDB Cluster has two SQL nodes, with SQL nodes A and B belonging to Cluster 1, SQL nodes C and D belonging to Cluster 2, and SQL nodes E and F belonging to Cluster 3.

Circular replication using these clusters is supported as long as the following conditions are met:
- The SQL nodes on all source and replica clusters are the same.
- All SQL nodes acting as sources and replicas are started with the system variable log_replica_updates enabled.

This type of circular replication setup is shown in the following diagram:

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 25.11 NDB Cluster Circular Replication With All Sources As Replicas}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4497.jpg?height=1772&width=1123&top_left_y=319&top_left_x=349}
\end{figure}

In this scenario, SQL node A in Cluster 1 replicates to SQL node C in Cluster 2; SQL node C replicates to SQL node E in Cluster 3; SQL node E replicates to SQL node A. In other words, the replication line (indicated by the curved arrows in the diagram) directly connects all SQL nodes used as sources and replicas.

It should also be possible to set up circular replication in which not all source SQL nodes are also replicas, as shown here:

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 25.12 NDB Cluster Circular Replication Where Not All Sources Are Replicas}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4498.jpg?height=1764&width=1105&top_left_y=306&top_left_x=280}
\end{figure}

In this case, different SQL nodes in each cluster are used as sources and replicas. However, you must not start any of the SQL nodes with the log_replica_updates system variable enabled. This type of circular replication scheme for NDB Cluster, in which the line of replication (again indicated by the curved arrows in the diagram) is discontinuous, should be possible, but it should be noted that it has not yet been thoroughly tested and must therefore still be considered experimental.

\section*{Note}

The NDB storage engine uses idempotent execution mode, which suppresses duplicate-key and other errors that otherwise break circular replication of NDB Cluster. This is equivalent to setting the global value of the system variable replica_exec_mode to IDEMPOTENT, although this is not necessary in NDB Cluster replication, since NDB Cluster sets this variable automatically and ignores any attempts to set it explicitly.

NDB Cluster replication and primary keys. In the event of a node failure, errors in replication of NDB tables without primary keys can still occur, due to the possibility of duplicate rows being inserted in such cases. For this reason, it is highly recommended that all NDB tables being replicated have explicit primary keys.

NDB Cluster Replication and Unique Keys. In older versions of NDB Cluster, operations that updated values of unique key columns of NDB tables could result in duplicate-key errors when replicated. This issue is solved for replication between NDB tables by deferring unique key checks until after all table row updates have been performed.

Deferring constraints in this way is currently supported only by NDB. Thus, updates of unique keys when replicating from NDB to a different storage engine such as InnoDB or MyISAM are still not supported.

The problem encountered when replicating without deferred checking of unique key updates can be illustrated using NDB table such as $t$, is created and populated on the source (and transmitted to a replica that does not support deferred unique key updates) as shown here:
```
CREATE TABLE t (
    p INT PRIMARY KEY,
    c INT,
    UNIQUE KEY u (c)
) ENGINE NDB;
INSERT INTO t
    VALUES (1,1), (2,2), (3,3), (4,4), (5,5);
```


The following UPDATE statement on $t$ succeeds on the source, since the rows affected are processed in the order determined by the ORDER BY option, performed over the entire table:

UPDATE t SET $\mathrm{c}=\mathrm{c}-1$ ORDER BY p ;
The same statement fails with a duplicate key error or other constraint violation on the replica, because the ordering of the row updates is performed for one partition at a time, rather than for the table as a whole.

> Note
> Every NDB table is implicitly partitioned by key when it is created. See Section 26.2.5, "KEY Partitioning", for more information.

GTIDs not supported. Replication using global transaction IDs is not compatible with the NDB storage engine, and is not supported. Enabling GTIDs is likely to cause NDB Cluster Replication to fail.

Restarting with --initial. Restarting the cluster with the --initial option causes the sequence of GCI and epoch numbers to start over from 0. (This is generally true of NDB Cluster and not limited to replication scenarios involving Cluster.) The MySQL servers involved in replication should in this case be restarted. After this, you should use the RESET BINARY LOGS AND GTIDS and RESET REPLICA statements to clear the invalid ndb_binlog_index and ndb_apply_status tables, respectively.

Replication from NDB to other storage engines. It is possible to replicate an NDB table on the source to a table using a different storage engine on the replica, taking into account the restrictions listed here:
- Multi-source and circular replication are not supported (tables on both the source and the replica must use the NDB storage engine for this to work).
- Using a storage engine which does not perform binary logging for tables on the replica requires special handling.
- Use of a nontransactional storage engine for tables on the replica also requires special handling.
- The source mysqld must be started with --ndb-log-update-as-write=0 or --ndb-log-update-as-write=0FF.

The next few paragraphs provide additional information about each of the issues just described.
Multiple sources not supported when replicating NDB to other storage engines. For replication from NDB to a different storage engine, the relationship between the two databases must be one-toone. This means that bidirectional or circular replication is not supported between NDB Cluster and other storage engines.

In addition, it is not possible to configure more than one replication channel when replicating between NDB and a different storage engine. (An NDB Cluster database can simultaneously replicate to multiple NDB Cluster databases.) If the source uses NDB tables, it is still possible to have more than one MySQL Server maintain a binary log of all changes, but for the replica to change sources (fail over), the new source-replica relationship must be explicitly defined on the replica.

Replicating NDB tables to a storage engine that does not perform binary logging. If you attempt to replicate from an NDB Cluster to a replica that uses a storage engine that does not handle its own binary logging, the replication process aborts with the error Binary logging not possible ... Statement cannot be written atomically since more than one engine involved and at least one engine is self-logging (Error 1595). It is possible to work around this issue in one of the following ways:
- Turn off binary logging on the replica. This can be accomplished by setting sql_log_bin = 0.
- Change the storage engine used for the mysql.ndb_apply_status table. Causing this table to use an engine that does not handle its own binary logging can also eliminate the conflict. This can be done by issuing a statement such as ALTER TABLE mysql.ndb_apply_status ENGINE=MyISAM on the replica. It is safe to do this when using a storage engine other than NDB on the replica, since you do not need to worry about keeping multiple replicas synchronized.
- Filter out changes to the mysql.ndb_apply_status table on the replica. This can be done by starting the replica with --replicate-ignore-table=mysql.ndb_apply_status. If you need for other tables to be ignored by replication, you might wish to use an appropriate--replicate-wild-ignore-table option instead.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4500.jpg?height=106&width=106&top_left_y=1619&top_left_x=301)

\section*{Important}

You should not disable replication or binary logging of mysql.ndb_apply_status or change the storage engine used for this table when replicating from one NDB Cluster to another. See Replication and binary log filtering rules with replication between NDB Clusters, for details.

Replication from NDB to a nontransactional storage engine. When replicating from NDB to a nontransactional storage engine such as MyISAM, you may encounter unnecessary duplicate key errors when replicating INSERT ... ON DUPLICATE KEY UPDATE statements. You can suppress these by using--ndb-log-update-as-write=0, which forces updates to be logged as writes, rather than as updates.

NDB Replication and File System Encryption (TDE). The use of an encrypted filesystem does not have any effect on NDB Replication. All of the following scenarios are supported:
- Replication of an NDB Cluster having an encrypted file system to an NDB Cluster whose file system is not encrypted.
- Replication of an NDB Cluster whose file system is not encrypted to an NDB Cluster whose file system is encrypted.
- Replication of an NDB Cluster whose file system is encrypted to a standalone MySQL server using InnoDB tables which are not encrypted.
- Replication of an NDB Cluster with an unencrypted file system to a standalone MySQL server using InnoDB tables with file sytem encryption.

Replication and binary log filtering rules with replication between NDB Clusters. If you are using any of the options - -replicate-do-*, --replicate-ignore-*, --binlog-do-db, or --binlog-ignore-db to filter databases or tables being replicated, you must take care not to block replication or binary logging of the mysql.ndb_apply_status, which is required for replication between NDB Clusters to operate properly. In particular, you must keep in mind the following:
1. Using --replicate-do-db=db_name (and no other --replicate-do-* or --replicateignore - * options) means that only tables in database $d b \_$name are replicated. In this case, you should also use --replicate-do-db=mysql, --binlog-do-db=mysql, or --replicate-do-table=mysql.ndb_apply_status to ensure that mysql.ndb_apply_status is populated on replicas.

Using --binlog-do-db=db_name (and no other --binlog-do-db options) means that changes only to tables in database db_name are written to the binary log. In this case, you should also use --replicate-do-db=mysql, --binlog-do-db=mysql, or --replicate-dotable=mysql.ndb_apply_status to ensure that mysql.ndb_apply_status is populated on replicas.
2. Using--replicate-ignore-db=mysql means that no tables in the mysql database are replicated. In this case, you should also use --replicate-dotable=mysql.ndb_apply_status to ensure that mysql.ndb_apply_status is replicated.

Using --binlog-ignore-db=mysql means that no changes to tables in the mysql database are written to the binary log. In this case, you should also use --replicate-dotable=mysql.ndb_apply_status to ensure that mysql.ndb_apply_status is replicated.

You should also remember that each replication rule requires the following:
1. Its own --replicate-do - * or --replicate-ignore - * option, and that multiple rules cannot be expressed in a single replication filtering option. For information about these rules, see Section 19.1.6, "Replication and Binary Logging Options and Variables".
2. Its own--binlog-do-db or--binlog-ignore-db option, and that multiple rules cannot be expressed in a single binary log filtering option. For information about these rules, see Section 7.4.4, "The Binary Log".

If you are replicating an NDB Cluster to a replica that uses a storage engine other than NDB, the considerations just given previously may not apply, as discussed elsewhere in this section.

NDB Cluster Replication and IPv6. All types of NDB Cluster nodes support IPv6 in NDB 8.4; this includes management nodes, data nodes, and API or SQL nodes.

\section*{Note}

In NDB 8.4, you can disable IPv6 support in the Linux kernel if you do not intend to use IPv6 addressing for any NDB Cluster nodes.

Attribute promotion and demotion. NDB Cluster Replication includes support for attribute promotion and demotion. The implementation of the latter distinguishes between lossy and non-lossy type conversions, and their use on the replica can be controlled by setting the global value of the system variable replica_type_conversions.

For more information about attribute promotion and demotion in NDB Cluster, see Row-based replication: attribute promotion and demotion.

NDB, unlike InnoDB or MyISAM, does not write changes to virtual columns to the binary log; however, this has no detrimental effects on NDB Cluster Replication or replication between NDB and other storage engines. Changes to stored generated columns are logged.

\subsection*{25.7.4 NDB Cluster Replication Schema and Tables}
- ndb_apply_status Table
- ndb_binlog_index Table
- ndb_replication Table

Replication in NDB Cluster makes use of a number of dedicated tables in the mysql database on each MySQL Server instance acting as an SQL node in both the cluster being replicated and in the replica. This is true regardless of whether the replica is a single server or a cluster.

The ndb_binlog_index and ndb_apply_status tables are created in the mysql database. They should not be explicitly replicated by the user. User intervention is normally not required to create or maintain either of these tables, since both are maintained by the NDB binary log (binlog) injector thread. This keeps the source mysqld process updated to changes performed by the NDB storage engine. The NDB binlog injector thread receives events directly from the NDB storage engine. The NDB injector is responsible for capturing all the data events within the cluster, and ensures that all events which change, insert, or delete data are recorded in the ndb_binlog_index table. The replica I/O (receiver) thread transfers the events from the source's binary log to the replica's relay log.

The ndb_replication table must be created manually. This table can be updated by the user to perform filtering by database or table. See ndb_replication Table, for more information. ndb_replication is also used in NDB Replication conflict detection and resolution for conflict resolution control; see Conflict Resolution Control.

Even though ndb_binlog_index and ndb_apply_status are created and maintained automatically, it is advisable to check for the existence and integrity of these tables as an initial step in preparing an NDB Cluster for replication. It is possible to view event data recorded in the binary log by querying the mysql.ndb_binlog_index table directly on the source. This can be also be accomplished using the SHOW BINLOG EVENTS statement on either the source or replica SQL node. (See Section 15.7.7.3, "SHOW BINLOG EVENTS Statement".)

You can also obtain useful information from the output of SHOW ENGINE NDB STATUS.

\section*{Note}

When performing schema changes on NDB tables, applications should wait until the ALTER TABLE statement has returned in the MySQL client connection that issued the statement before attempting to use the updated definition of the table.

\section*{ndb_apply_status Table}
ndb_apply_status is used to keep a record of the operations that have been replicated from the source to the replica. If the ndb_apply_status table does not exist on the replica, ndb_restore recreates it.

Unlike the case with ndb_binlog_index, the data in this table is not specific to any one SQL node in the (replica) cluster, and so ndb_apply_status can use the NDBCLUSTER storage engine, as shown here:
```
CREATE TABLE ˋndb_apply_statusˋ (
    ˋserver_idˋ INT(10) UNSIGNED NOT NULL,
    ˋepochˋ BIGINT(20) UNSIGNED NOT NULL,
    ˋlog_nameˋ VARCHAR(255) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL,
    ˋstart_posˋ BIGINT(20) UNSIGNED NOT NULL,
    ˋend_posˋ BIGINT(20) UNSIGNED NOT NULL,
    PRIMARY KEY (ˋserver_idˋ) USING HASH
) ENGINE=NDBCLUSTER DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```


The ndb_apply_status table is populated only on replicas, which means that, on the source, this table never contains any rows; thus, there is no need to allot any DataMemory to ndb_apply_status there.

Because this table is populated from data originating on the source, it should be allowed to replicate; any replication filtering or binary log filtering rules that inadvertently prevent the replica from updating
ndb_apply_status, or that prevent the source from writing into the binary log may prevent replication between clusters from operating properly. For more information about potential problems arising from such filtering rules, see Replication and binary log filtering rules with replication between NDB Clusters.

It is possible to delete this table, but this is not recommended. Deleting it puts all SQL nodes in readonly mode; NDB detects that this table has been dropped, and re-creates it, after which it is possible once again to perform updates. Dropping and re-creating ndb_apply_status creates a gap event in the binary log; the gap event causes replica SQL nodes to stop applying changes from the source until the replication channel is restarted.

0 in the epoch column of this table indicates a transaction originating from a storage engine other than NDB.
ndb_apply_status is used to record which epoch transactions have been replicated and applied to a replica cluster from an upstream source. This information is captured in an NDB online backup, but (by design) it is not restored by ndb_restore. In some cases, it can be helpful to restore this information for use in new setups; you can do this by invoking ndb_restore with the --with-apply-status option. See the description of the option for more information.

\section*{ndb_binlog_index Table}

NDB Cluster Replication uses the ndb_binlog_index table for storing the binary log's indexing data. Since this table is local to each MySQL server and does not participate in clustering, it uses the InnoDB storage engine. This means that it must be created separately on each mysqld participating in the source cluster. (The binary log itself contains updates from all MySQL servers in the cluster.) This table is defined as follows:
```
CREATE TABLE ˋndb_binlog_indexˋ (
    ˋPositionˋ BIGINT(20) UNSIGNED NOT NULL,
    ˋFileˋ VARCHAR(255) NOT NULL,
    epochˋ BIGINT(20) UNSIGNED NOT NULL,
    insertsˋ INT(10) UNSIGNED NOT NULL,
    updatesˋ INT(10) UNSIGNED NOT NULL,
    deletesˋ INT(10) UNSIGNED NOT NULL,
    schemaopsˋ INT(10) UNSIGNED NOT NULL,
    orig_server_idˋ INT(10) UNSIGNED NOT NULL,
    orig_epochˋ BIGINT(20) UNSIGNED NOT NULL,
    gciˋ INT(10) UNSIGNED NOT NULL,
    next_positionˋ bigint(20) unsigned NOT NULL,
    ˋnext_fileˋ varchar(255) NOT NULL,
    PRIMARY KEY (ˋepochˋ,ˋorig_server_idˋ,ˋorig_epochˋ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```


Note
If you are upgrading from an older release, perform the MySQL upgrade procedure and ensure that the system tables are upgraded by starting the MySQL server with the --upgrade=FORCE option. The system table upgrade causes an ALTER TABLE ... ENGINE=INNODB statement to be executed for this table. Use of the MyISAM storage engine for this table continues to be supported for backward compatibility.
ndb_binlog_index may require additional disk space after being converted to InnoDB. If this becomes an issue, you may be able to conserve space by using an InnoDB tablespace for this table, changing its ROW_FORMAT to COMPRESSED, or both. For more information, see Section 15.1.21, "CREATE TABLESPACE Statement", and Section 15.1.20, "CREATE TABLE Statement", as well as Section 17.6.3, "Tablespaces".

The size of the ndb_binlog_index table is dependent on the number of epochs per binary log file and the number of binary log files. The number of epochs per binary log file normally depends on the amount of binary log generated per epoch and the size of the binary log file, with smaller epochs
resulting in more epochs per file. You should be aware that empty epochs produce inserts to the ndb_binlog_index table, even when the --ndb-log-empty-epochs option is OFF, meaning that the number of entries per file depends on the length of time that the file is in use; this relationship can be represented by the formula shown here:
```
[number of epochs per file] = [time spent per file] / TimeBetweenEpochs
```


A busy NDB Cluster writes to the binary log regularly and presumably rotates binary log files more quickly than a quiet one. This means that a "quiet" NDB Cluster with --ndb-log-empty-epochs=ON can actually have a much higher number of ndb_binlog_index rows per file than one with a great deal of activity.

When mysqld is started with the --ndb-log-orig option, the orig_server_id and orig_epoch columns store, respectively, the ID of the server on which the event originated and the epoch in which the event took place on the originating server, which is useful in NDB Cluster replication setups employing multiple sources. The SELECT statement used to find the closest binary log position to the highest applied epoch on the replica in a multi-source setup (see Section 25.7.10, "NDB Cluster Replication: Bidirectional and Circular Replication") employs these two columns, which are not indexed. This can lead to performance issues when trying to fail over, since the query must perform a table scan, especially when the source has been running with --ndb-log-empty-epochs=ON. You can improve multi-source failover times by adding an index to these columns, as shown here:
```
ALTER TABLE mysql.ndb_binlog_index
    ADD INDEX orig_lookup USING BTREE (orig_server_id, orig_epoch);
```


Adding this index provides no benefit when replicating from a single source to a single replica, since the query used to get the binary log position in such cases makes no use of orig_server_id or orig_epoch.

See Section 25.7.8, "Implementing Failover with NDB Cluster Replication", for more information about using the next_position and next_file columns.

The following figure shows the relationship of the NDB Cluster replication source server, its binary log injector thread, and the mysql.ndb_binlog_index table.

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 25.13 The Replication Source Cluster}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4504.jpg?height=819&width=1514&top_left_y=1653&top_left_x=280}
\end{figure}

\section*{ndb_replication Table}

The ndb_replication table is used to control binary logging and conflict resolution, and acts on a per-table basis. Each row in this table corresponds to a table being replicated, determines how to log
changes to the table and, if a conflict resolution function is specified, and determines how to resolve conflicts for that table.

Unlike the ndb_apply_status and ndb_replication tables, the ndb_replication table must be created manually, using the SQL statement shown here:
```
CREATE TABLE mysql.ndb_replication (
    db VARBINARY(63),
    table_name VARBINARY(63),
    server_id INT UNSIGNED,
    binlog_type INT UNSIGNED,
    conflict_fn VARBINARY(128),
    PRIMARY KEY USING HASH (db, table_name, server_id)
) ENGINE=NDB
PARTITION BY KEY(db,table_name);
```


The columns of this table are listed here, with descriptions:
- db column

The name of the database containing the table to be replicated.
You may employ either or both of the wildcards _ and \% as part of the database name. (See Matching with wildcards, later in this section.)
- table_name column

The name of the table to be replicated.
The table name may include either or both of the wildcards _ and \%. See Matching with wildcards, later in this section.
- server_id column

The unique server ID of the MySQL instance (SQL node) where the table resides.
0 in this column acts like a wildcard equivalent to \%, and matches any server ID. (See Matching with wildcards, later in this section.)
- binlog_type column

The type of binary logging to be employed. See text for values and descriptions.
- conflict_fn column

The conflict resolution function to be applied; one of NDB\$OLD(), NDB\$MAX(), NDB \$MAX_DELETE_WIN(), NDB\$EPOCH(), NDB\$EPOCH_TRANS(), NDB\$EPOCH2(), NDB \$EPOCH2_TRANS() NDB\$MAX_INS(), or NDB\$MAX_DEL_WIN_INS(); NULL indicates that conflict resolution is not used for this table.

See Conflict Resolution Functions, for more information about these functions and their uses in NDB Replication conflict resolution.

Some conflict resolution functions (NDB\$OLD( ), NDB\$EPOCH( ), NDB\$EPOCH_TRANS( )) require the use of one or more user-created exceptions tables. See Conflict Resolution Exceptions Table.

To enable conflict resolution with NDB Replication, it is necessary to create and populate this table with control information on the SQL node or nodes on which the conflict should be resolved. Depending on the conflict resolution type and method to be employed, this may be the source, the replica, or both servers. In a simple source-replica setup where data can also be changed locally on the replica this is typically the replica. In a more complex replication scheme, such as bidirectional replication, this is usually all of the sources involved. See Section 25.7.12, "NDB Cluster Replication Conflict Resolution", for more information.

The ndb_replication table allows table-level control over binary logging outside the scope of conflict resolution, in which case conflict_fn is specified as NULL, while the remaining column values are used to control binary logging for a given table or set of tables matching a wildcard expression. By setting the proper value for the binlog_type column, you can make logging for a given table or tables use a desired binary log format, or disabling binary logging altogether. Possible values for this column, with values and descriptions, are shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.42 binlog_type values, with values and descriptions}
\begin{tabular}{|l|l|}
\hline Value & Description \\
\hline 0 & Use server default \\
\hline 1 & Do not log this table in the binary log (same effect as sql_log_bin = 0, but applies to one or more specified tables only) \\
\hline 2 & Log updated attributes only; log these as WRITE_ROW events \\
\hline 3 & Log full row, even if not updated (MySQL server default behavior) \\
\hline 6 & Use updated attributes, even if values are unchanged \\
\hline 7 & Log full row, even if no values are changed; log updates as UPDATE_ROW events \\
\hline 8 & Log update as UPDATE_ROW; log only primary key columns in before image, and only updated columns in after image (same effect as --ndb-log-updateminimal, but applies to one or more specified tables only) \\
\hline 9 & Log update as UPDATE_ROW; log only primary key columns in before image, and all columns other than primary key columns in after image \\
\hline
\end{tabular}
\end{table}

\section*{Note}
binlog_type values 4 and 5 are not used, and so are omitted from the table just shown, as well as from the next table.

Several binlog_type values are equivalent to various combinations of the mysqld logging options --ndb-log-updated-only, --ndb-log-update-as-write, and --ndb-log-updateminimal, as shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.43 binlog_type values with equivalent combinations of NDB logging options}
\begin{tabular}{|l|l|l|l|}
\hline Value & - - ndb-log-updated-only Value & --ndb-log-update-aswrite Value & - - ndb-log-updateminimal Value \\
\hline 0 & -- & -- & -- \\
\hline 1 & -- & -- & -- \\
\hline 2 & ON & ON & OFF \\
\hline 3 & OFF & ON & OFF \\
\hline 6 & ON & OFF & OFF \\
\hline 7 & OFF & OFF & OFF \\
\hline 8 & ON & OFF & ON \\
\hline 9 & OFF & OFF & ON \\
\hline
\end{tabular}
\end{table}

Binary logging can be set to different formats for different tables by inserting rows into the ndb_replication table using the appropriate db, table_name, and binlog_type column values.

The internal integer value shown in the preceding table should be used when setting the binary logging format. The following two statements set binary logging to logging of full rows ( value 3) for table test.a, and to logging of updates only ( value 2) for table test.b:
```
# Table test.a: Log full rows
INSERT INTO mysql.ndb_replication VALUES("test", "a", 0, 3, NULL);
# Table test.b: log updates only
INSERT INTO mysql.ndb_replication VALUES("test", "b", 0, 2, NULL);
```


To disable logging for one or more tables, use 1 for binlog_type, as shown here:
```
# Disable binary logging for table test.t1
INSERT INTO mysql.ndb_replication VALUES("test", "t1", 0, 1, NULL);
# Disable binary logging for any table in 'test' whose name begins with 't'
INSERT INTO mysql.ndb_replication VALUES("test", "t%", 0, 1, NULL);
```


Disabling logging for a given table is the equivalent of setting sql_log_bin = 0, except that it applies to one or more tables individually. If an SQL node is not performing binary logging for a given table, it is not sent the row change events for those tables. This means that it is not receiving all changes and discarding some, but rather it is not subscribing to these changes.

Disabling logging can be useful for a number of reasons, including those listed here:
- Not sending changes across the network generally saves bandwidth, buffering, and CPU resources.
- Not logging changes to tables with very frequent updates but whose value is not great is a good fit for transient data (such as session data) that may be relatively unimportant in the event of a complete failure of the cluster.
- Using a session variable (or sql_log_bin) and application code, it is also possible to log (or not to log) certain SQL statements or types of SQL statements; for example, it may be desirable in some cases not to record DDL statements on one or more tables.
- Splitting replication streams into two (or more) binary logs can be done for reasons of performance, a need to replicate different databases to different places, use of different binary logging types for different databases, and so on.

Matching with wildcards. In order not to make it necessary to insert a row in the ndb_replication table for each and every combination of database, table, and SQL node in your replication setup, NDB supports wildcard matching on the this table's db, table_name, and server_id columns. Database and table names used in, respectively, db and table_name may contain either or both of the following wildcards:
- _ (underscore character): matches zero or more characters
- \% (percent sign): matches a single character
(These are the same wildcards as supported by the MySQL LIKE operator.)
The server_id column supports 0 as a wildcard equivalent to _ (matches anything). This is used in the examples shown previously.

A given row in the ndb_replication table can use wildcards to match any of the database name, table name, and server ID in any combination. Where there are multiple potential matches in the table, the best match is chosen, according to the table shown here, where $W$ represents a wildcard match, $E$ an exact match, and the greater the value in the Quality column, the better the match:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.44 Weights of different combinations of wildcard and exact matches on columns in the mysql.ndb_replication table}
\begin{tabular}{|l|l|l|l|}
\hline db & table_name & server_id & Quality \\
\hline W & W & W & 1 \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|}
\hline db & table_name & server_id & Quality \\
\hline W & W & E & 2 \\
\hline W & E & W & 3 \\
\hline W & E & E & 4 \\
\hline E & W & W & 5 \\
\hline E & W & E & 6 \\
\hline E & E & W & 7 \\
\hline E & E & E & 8 \\
\hline
\end{tabular}

Thus, an exact match on database name, table name, and server ID is considered best (strongest), while the weakest (worst) match is a wildcard match on all three columns. Only the strength of the match is considered when choosing which rule to apply; the order in which the rows occur in the table has no effect on this determination.

Logging Full or Partial Rows. There are two basic methods of logging rows, as determined by the setting of the--ndb-log-updated-only option for mysqld:
- Log complete rows (option set to ON)
- Log only column data that has been updated-that is, column data whose value has been set, regardless of whether or not this value was actually changed. This is the default behavior (option set to OFF).

It is usually sufficient-and more efficient-to log updated columns only; however, if you need to log full rows, you can do so by setting - - ndb-log-updated-only to 0 or OFF.

Logging Changed Data as Updates. The setting of the MySQL Server's - - ndb - log - update -as-write option determines whether logging is performed with or without the "before" image.

Because conflict resolution for updates and delete operations is done in the MySQL Server's update handler, it is necessary to control the logging performed by the replication source such that updates are updates and not writes; that is, such that updates are treated as changes in existing rows rather than the writing of new rows, even though these replace existing rows.

This option is turned on by default; in other words, updates are treated as writes. That is, updates are by default written as write_row events in the binary log, rather than as update_row events.

To disable the option, start the source mysqld with --ndb-log-update-as-write=0 or - - ndb-log-update-as-write=0FF. You must do this when replicating from NDB tables to tables using a different storage engine; see Replication from NDB to other storage engines, and Replication from NDB to a nontransactional storage engine, for more information.

\section*{Important}

For insert conflict resolution using NDB\$MAX_INS( ) or NDB \$MAX_DEL_WIN_INS( ), an SQL node (that is, a mysqld process) can record row updates on the source cluster as WRITE_ROW events with the - - ndb -log-update-as-write option enabled for idempotency and optimal size. This works for these algorithms since they both map a WRITE_ROW event to an insert or update depending on whether the row already exists, and the required metadata (the "after" image for the timestamp column) is present in the "WRITE_ROW" event.

\subsection*{25.7.5 Preparing the NDB Cluster for Replication}

Preparing the NDB Cluster for replication consists of the following steps:
1. Check all MySQL servers for version compatibility (see Section 25.7.2, "General Requirements for NDB Cluster Replication").
2. Create a replication account on the source Cluster with the appropriate privileges, using the following two SQL statements:
```
mysqlS> CREATE USER 'replica_user'@'replica_host'
    -> IDENTIFIED BY 'replica_password';
mysqlS> GRANT REPLICATION SLAVE ON *.*
    -> TO 'replica_user'@'replica_host';
```


In the previous statement, replica_user is the replication account user name, replica_host is the host name or IP address of the replica, and replica_password is the password to assign to this account.

For example, to create a replica user account with the name myreplica, logging in from the host named replica-host, and using the password 53cr37, use the following CREATE USER and GRANT statements:
```
mysqlS> CREATE USER 'myreplica'@'replica-host'
    -> IDENTIFIED BY '53cr37';
mysqlS> GRANT REPLICATION SLAVE ON *.*
    -> TO 'myreplica'@'replica-host';
```


For security reasons, it is preferable to use a unique user account-not employed for any other purpose-for the replication account.
3. Set up the replica to use the source. Using the mysql client, this can be accomplished with the CHANGE REPLICATION SOURCE TO statement:
```
mysqlR> CHANGE REPLICATION SOURCE TO
    -> SOURCE_HOST='source_host',
    -> SOURCE_PORT=source_port,
    -> SOURCE_USER='replica_user',
    -> SOURCE_PASSWORD='replica_password';
```


In the previous statement, source_host is the host name or IP address of the replication source, source_port is the port for the replica to use when connecting to the source, replica_user is the user name set up for the replica on the source, and replica_password is the password set for that user account in the previous step.

For example, to tell the replica to use the MySQL server whose host name is rep-source with the replication account created in the previous step, use the following statement:
```
mysqlR> CHANGE REPLICATION SOURCE TO
    -> SOURCE_HOST='rep-source',
    -> SOURCE_PORT=3306,
    -> SOURCE_USER='myreplica',
    -> SOURCE_PASSWORD='53cr37';
```


For a complete list of options that can be used with this statement, see Section 15.4.2.2, "CHANGE REPLICATION SOURCE TO Statement".

To provide replication backup capability, you also need to add an --ndb-connectstring option to the replica's my. cnf file prior to starting the replication process. See Section 25.7.9, "NDB Cluster Backups With NDB Cluster Replication", for details.

For additional options that can be set in my.cnf for replicas, see Section 19.1.6, "Replication and Binary Logging Options and Variables".
4. If the source cluster is already in use, you can create a backup of the source and load this onto the replica to cut down on the amount of time required for the replica to synchronize itself with the source. If the replica is also running NDB Cluster, this can be accomplished using the backup
and restore procedure described in Section 25.7.9, "NDB Cluster Backups With NDB Cluster Replication".
```
ndb-connectstring=management_host[:port]
```


In the event that you are not using NDB Cluster on the replica, you can create a backup with this command on the source:
```
shellS> mysqldump --source-data=1
```


Then import the resulting data dump onto the replica by copying the dump file over to it. After this, you can use the mysql client to import the data from the dumpfile into the replica database as shown here, where dump_file is the name of the file that was generated using mysqldump on the source, and $d b \_$name is the name of the database to be replicated:
```
shellR> mysql -u root -p db_name < dump_file
```


For a complete list of options to use with mysqldump, see Section 6.5.4, "mysqldump - A Database Backup Program".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4510.jpg?height=125&width=102&top_left_y=977&top_left_x=360)

\section*{Note}

If you copy the data to the replica in this fashion, make sure that you stop the replica from trying to connect to the source to begin replicating before all the data has been loaded. You can do this by starting the replica with - -skip-replica-start. Once the data loading has completed, follow the additional steps outlined in the next two sections.
5. Ensure that each MySQL server acting as a replication source is assigned a unique server ID, and has binary logging enabled, using the row-based format. (See Section 19.2.1, "Replication Formats".) In addition, we strongly recommend enabling the replica_allow_batching system variable (the default).

Use --ndb - replica-batch-size to set the batch size used for writes on the replica instead of --ndb-batch-size, and --ndb-replica-blob-write-batch-bytes rather than --ndb-blob-write-batch-bytes to determine the batch size used by the replication applier for writing blob data. All of these options can be set either in the source server's my. cnf file, or on the command line when starting the source mysqld process. See Section 25.7.6, "Starting NDB Cluster Replication (Single Replication Channel)", for more information.

\subsection*{25.7.6 Starting NDB Cluster Replication (Single Replication Channel)}

This section outlines the procedure for starting NDB Cluster replication using a single replication channel.
1. Start the MySQL replication source server by issuing this command, where id is this server's unique ID (see Section 25.7.2, "General Requirements for NDB Cluster Replication"):
```
shellS> mysqld --ndbcluster --server-id=id \
    --log-bin --ndb-log-bin &
```


This starts the server's mysqld process with binary logging enabled using the proper logging format. It is also necessary to enable logging of updates to NDB tables explicitly, using the - - ndb -log-bin option.

> Note
> You can also start the source with - - binlog - format=MIXED, in which case row-based replication is used automatically when replicating between clusters. Statement-based binary logging is not supported for NDB Cluster Replication (see Section 25.7.2, "General Requirements for NDB Cluster Replication").
2. Start the MySQL replica server as shown here:
shellR> mysqld --ndbcluster --server-id=id \&
In the command just shown, id is the replica server's unique ID. It is not necessary to enable logging on the replica.

Note
Unless you want replication to begin immediately, delay the start of the replication threads until the appropriate START REPLICA statement has been issued, as explained in Step 4 below. You can do this by starting the replica with --skip-replica-start.
3. It is necessary to synchronize the replica server with the source server's replication binary log. If binary logging has not previously been running on the source, run the following statement on the replica:
mysqlR> CHANGE REPLICATION SOURCE TO
-> SOURCE_LOG_FILE='',
-> SOURCE_LOG_POS=4;
This instructs the replica to begin reading the source server's binary log from the log's starting point. Otherwise-that is, if you are loading data from the source using a backup-see Section 25.7.8, "Implementing Failover with NDB Cluster Replication", for information on how to obtain the correct values to use for SOURCE_LOG_FILE and SOURCE_LOG_POS in such cases.
4. Finally, instruct the replica to begin applying replication by issuing this command from the mysql client on the replica:
mysqlR> START REPLICA;
This also initiates the transmission of data and changes from the source to the replica.
It is also possible to use two replication channels, in a manner similar to the procedure described in the next section; the differences between this and using a single replication channel are covered in Section 25.7.7, "Using Two Replication Channels for NDB Cluster Replication".

It is also possible to improve cluster replication performance by enabling batched updates. This can be accomplished by setting the system variable replica_allow_batching on the replicas' mysqld processes. Normally, updates are applied as soon as they are received. However, the use of batching causes updates to be applied in batches of 32 KB each; this can result in higher throughput and less CPU usage, particularly where individual updates are relatively small.

\section*{Note}

Batching works on a per-epoch basis; updates belonging to more than one transaction can be sent as part of the same batch.

All outstanding updates are applied when the end of an epoch is reached, even if the updates total less than 32 KB .

Batching can be turned on and off at runtime. To activate it at runtime, you can use either of these two statements:
```
SET GLOBAL replica_allow_batching = 1;
SET GLOBAL replica_allow_batching = ON;
```


If a particular batch causes problems (such as a statement whose effects do not appear to be replicated correctly), batching can be deactivated using either of the following statements:
```
SET GLOBAL replica_allow_batching = 0;
```

```
SET GLOBAL replica_allow_batching = OFF;
```


You can check whether batching is currently being used by means of an appropriate SHOW VARIABLES statement, like this one:
```
mysql> SHOW VARIABLES LIKE 'replica%';
```


\subsection*{25.7.7 Using Two Replication Channels for NDB Cluster Replication}

In a more complete example scenario, we envision two replication channels to provide redundancy and thereby guard against possible failure of a single replication channel. This requires a total of four replication servers, two source servers on the source cluster and two replica servers on the replica cluster. For purposes of the discussion that follows, we assume that unique identifiers are assigned as shown here:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.45 NDB Cluster replication servers described in the text}
\begin{tabular}{|l|l|}
\hline Server ID & Description \\
\hline 1 & Source - primary replication channel (S) \\
\hline 2 & Source - secondary replication channel ( $S^{\prime}$ ) \\
\hline 3 & Replica - primary replication channel ( $R$ ) \\
\hline 4 & replica - secondary replication channel ( $R^{\prime}$ ) \\
\hline
\end{tabular}
\end{table}

Setting up replication with two channels is not radically different from setting up a single replication channel. First, the mysqld processes for the primary and secondary replication source servers must be started, followed by those for the primary and secondary replicas. The replication processes can be initiated by issuing the START REPLICA statement on each of the replicas. The commands and the order in which they need to be issued are shown here:
1. Start the primary replication source:
```
shellS> mysqld --ndbcluster --server-id=1 \
    --log-bin &
```

2. Start the secondary replication source:
```
shellS'> mysqld --ndbcluster --server-id=2 \
    --log-bin &
```

3. Start the primary replica server:
```
shellR> mysqld --ndbcluster --server-id=3 \
    --skip-replica-start &
```

4. Start the secondary replica server:
```
shellR'> mysqld --ndbcluster --server-id=4 \
    --skip-replica-start &
```

5. Finally, initiate replication on the primary channel by executing the START REPLICA statement on the primary replica as shown here:
mysqlR> START REPLICA;

> Warning
> Only the primary channel must be started at this point. The secondary replication channel needs to be started only in the event that the primary replication channel fails, as described in Section 25.7.8, "Implementing Failover with NDB Cluster Replication". Running multiple replication channels simultaneously can result in unwanted duplicate records being created on the replicas.

As mentioned previously, it is not necessary to enable binary logging on the replicas.

\subsection*{25.7.8 Implementing Failover with NDB Cluster Replication}

In the event that the primary Cluster replication process fails, it is possible to switch over to the secondary replication channel. The following procedure describes the steps required to accomplish this.
1. Obtain the time of the most recent global checkpoint (GCP). That is, you need to determine the most recent epoch from the ndb_apply_status table on the replica cluster, which can be found using the following query:
```
mysqlR'> SELECT @latest:=MAX(epoch)
    -> FROM mysql.ndb_apply_status;
```


In a circular replication topology, with a source and a replica running on each host, when you are using ndb_log_apply_status=1, NDB Cluster epochs are written in the replicas' binary logs. This means that the ndb_apply_status table contains information for the replica on this host as well as for any other host which acts as a replica of the replication source server running on this host.

In this case, you need to determine the latest epoch on this replica to the exclusion of any epochs from any other replicas in this replica's binary log that were not listed in the IGNORE_SERVER_IDS options of the CHANGE REPLICATION SOURCE TO statement used to set up this replica. The reason for excluding such epochs is that rows in the mysql.ndb_apply_status table whose server IDs have a match in the IGNORE_SERVER_IDS list from the CHANGE REPLICATION SOURCE TO statement used to prepare this replicas's source are also considered to be from local servers, in addition to those having the replica's own server ID. You can retrieve this list as Replicate_Ignore_Server_Ids from the output of SHOW REPLICA STATUS. We assume that you have obtained this list and are substituting it for ignore_server_ids in the query shown here, which like the previous version of the query, selects the greatest epoch into a variable named @latest:
```
mysqlR'> SELECT @latest:=MAX(epoch)
    -> FROM mysql.ndb_apply_status
    -> WHERE server_id NOT IN (ignore_server_ids);
```


In some cases, it may be simpler or more efficient (or both) to use a list of the server IDs to be included and server_id IN server_id_list in the WHERE condition of the preceding query.
2. Using the information obtained from the query shown in Step 1, obtain the corresponding records from the ndb_binlog_index table on the source cluster.

You can use the following query to obtain the needed records from the ndb_binlog_index table on the source:
```
mysqlS'> SELECT
    -> @file:=SUBSTRING_INDEX(next_file, '/', -1),
    -> @pos:=next_position
    -> FROM mysql.ndb_binlog_index
    -> WHERE epoch = @latest;
```


These are the records saved on the source since the failure of the primary replication channel. We have employed a user variable @latest here to represent the value obtained in Step 1. Of course, it is not possible for one mysqld instance to access user variables set on another server instance directly. These values must be "plugged in" to the second query manually or by an application.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4513.jpg?height=125&width=106&top_left_y=2480&top_left_x=420)

\section*{Important}

You must ensure that the replica mysqld is started with --replica-skip-errors=ddl_exist_errors before executing START REPLICA. Otherwise, replication may stop with duplicate DDL errors.
3. Now it is possible to synchronize the secondary channel by running the following query on the secondary replica server:
```
mysqlR'> CHANGE REPLICATION SOURCE TO
    -> SOURCE_LOG_FILE='@file',
    -> SOURCE_LOG_POS=@pos;
```


Again we have employed user variables (in this case @file and @pos) to represent the values obtained in Step 2 and applied in Step 3; in practice these values must be inserted manually or using an application that can access both of the servers involved.

\section*{Note}
@file is a string value such as '/var/log/mysql/replication-source-bin.00001', and so must be quoted when used in SQL or application code. However, the value represented by @pos must not be quoted. Although MySQL normally attempts to convert strings to numbers, this case is an exception.
4. You can now initiate replication on the secondary channel by issuing the appropriate command on the secondary replica mysqld:
```
mysqlR'> START REPLICA;
```


Once the secondary replication channel is active, you can investigate the failure of the primary and effect repairs. The precise actions required to do this depend upon the reasons for which the primary channel failed.

\section*{Warning}

The secondary replication channel is to be started only if and when the primary replication channel has failed. Running multiple replication channels simultaneously can result in unwanted duplicate records being created on the replicas.

If the failure is limited to a single server, it should in theory be possible to replicate from $S$ to $R^{\prime}$, or from $S^{\prime}$ to $R$.

\subsection*{25.7.9 NDB Cluster Backups With NDB Cluster Replication}

This section discusses making backups and restoring from them using NDB Cluster replication. We assume that the replication servers have already been configured as covered previously (see Section 25.7.5, "Preparing the NDB Cluster for Replication", and the sections immediately following). This having been done, the procedure for making a backup and then restoring from it is as follows:
1. There are two different methods by which the backup may be started.
- Method A. This method requires that the cluster backup process was previously enabled on the source server, prior to starting the replication process. This can be done by including the following line in a [mysql_cluster] section in the my.cnf file, where management_host is the IP address or host name of the NDB management server for the source cluster, and port is the management server's port number:
```
ndb-connectstring=management_host[:port]
```


\section*{Note}

The port number needs to be specified only if the default port (1186) is not being used. See Section 25.3.3, "Initial Configuration of NDB Cluster", for more information about ports and port allocation in NDB Cluster.

In this case, the backup can be started by executing this statement on the replication source:
```
shellS> ndb_mgm -e "START BACKUP"
```

- Method B. If the my.cnf file does not specify where to find the management host, you can start the backup process by passing this information to the NDB management client as part of the START BACKUP command. This can be done as shown here, where management_host and port are the host name and port number of the management server:
```
shellS> ndb_mgm management_host:port -e "START BACKUP"
```


In our scenario as outlined earlier (see Section 25.7.5, "Preparing the NDB Cluster for Replication"), this would be executed as follows:
```
shellS> ndb_mgm rep-source:1186 -e "START BACKUP"
```

2. Copy the cluster backup files to the replica that is being brought on line. Each system running an ndbd process for the source cluster has cluster backup files located on it, and all of these files must be copied to the replica to ensure a successful restore. The backup files can be copied into any directory on the computer where the replica's management host resides, as long as the MySQL and NDB binaries have read permissions in that directory. In this case, we assume that these files have been copied into the directory /var/BACKUPS/BACKUP-1.

While it is not necessary that the replica cluster have the same number of data nodes as the source, it is highly recommended this number be the same. It is necessary that the replication process is prevented from starting when the replica server starts. You can do this by starting the replica with --skip-replica-start.
3. Create any databases on the replica cluster that are present on the source cluster and that are to be replicated.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4515.jpg?height=117&width=106&top_left_y=1366&top_left_x=420)

\section*{Important}

A CREATE DATABASE (or CREATE SCHEMA) statement corresponding to each database to be replicated must be executed on each SQL node in the replica cluster.
4. Reset the replica cluster using this statement in the mysql client:
```
mysqlR> RESET REPLICA;
```

5. You can now start the cluster restoration process on the replica using the ndb_restore command for each backup file in turn. For the first of these, it is necessary to include the $-m$ option to restore the cluster metadata, as shown here:
```
shellR> ndb_restore -c replica_host:port -n node-id \
    -b backup-id -m -r dir
```

dir is the path to the directory where the backup files have been placed on the replica. For the ndb_restore commands corresponding to the remaining backup files, the -m option should not be used.

For restoring from a source cluster with four data nodes (as shown in the figure in Section 25.7, "NDB Cluster Replication") where the backup files have been copied to the directory /var/ BACKUPS/BACKUP-1, the proper sequence of commands to be executed on the replica might look like this:
```
shellR> ndb_restore -c replica-host:1186 -n 2 -b 1 -m \
    -r ./var/BACKUPS/BACKUP-1
shellR> ndb_restore -c replica-host:1186 -n 3 -b 1 \
    -r ./var/BACKUPS/BACKUP-1
shellR> ndb_restore -c replica-host:1186 -n 4 -b 1 \
    -r ./var/BACKUPS/BACKUP-1
shellR> ndb_restore -c replica-host:1186 -n 5 -b 1 -e \
    -r ./var/BACKUPS/BACKUP-1
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4516.jpg?height=122&width=108&top_left_y=246&top_left_x=356)

\section*{Important}

The -e (or --restore-epoch) option in the final invocation of ndb_restore in this example is required to make sure that the epoch is written to the replica's mysql.ndb_apply_status table. Without this information, the replica cannot synchronize properly with the source. (See Section 25.5.23, "ndb_restore - Restore an NDB Cluster Backup".)
6. Now you need to obtain the most recent epoch from the ndb_apply_status table on the replica (as discussed in Section 25.7.8, "Implementing Failover with NDB Cluster Replication"):
```
mysqlR> SELECT @latest:=MAX(epoch)
    FROM mysql.ndb_apply_status;
```

7. Using @latest as the epoch value obtained in the previous step, you can obtain the correct starting position @pos in the correct binary log file @file from the mysql.ndb_binlog_index table on the source. The query shown here gets these from the Position and File columns from the last epoch applied before the logical restore position:
```
mysqlS> SELECT
    -> @file:=SUBSTRING_INDEX(File, '/', -1),
    -> @pos:=Position
    -> FROM mysql.ndb_binlog_index
    -> WHERE epoch > @latest
    -> ORDER BY epoch ASC LIMIT 1;
```


In the event that there is currently no replication traffic, you can get similar information by running SHOW BINARY LOG STATUS on the source and using the value shown in the Position column of the output for the file whose name has the suffix with the greatest value for all files shown in the File column. In this case, you must determine which file this is and supply the name in the next step manually or by parsing the output with a script.
8. Using the values obtained in the previous step, you can now issue the appropriate in the replica's mysql client. Use the following CHANGE REPLICATION SOURCE TO statement:
```
mysqlR> CHANGE REPLICATION SOURCE TO
    -> SOURCE_LOG_FILE='@file',
    -> SOURCE_LOG_POS=@pos;
```

9. Now that the replica knows from what point in which binary log file to start reading data from the source, you can cause the replica to begin replicating with this statement:
```
mysqlR> START REPLICA;
```


To perform a backup and restore on a second replication channel, it is necessary only to repeat these steps, substituting the host names and IDs of the secondary source and replica for those of the primary source and replica servers where appropriate, and running the preceding statements on them.

For additional information on performing Cluster backups and restoring Cluster from backups, see Section 25.6.8, "Online Backup of NDB Cluster".

\subsection*{25.7.9.1 NDB Cluster Replication: Automating Synchronization of the Replica to the Source Binary Log}

It is possible to automate much of the process described in the previous section (see Section 25.7.9, "NDB Cluster Backups With NDB Cluster Replication"). The following Perl script reset-replica.pl serves as an example of how you can do this.
```
#!/user/bin/perl -w
# file: reset-replica.pl
# Copyright (c) 2005, 2020, Oracle and/or its affiliates. All rights reserved.
```

```
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 2 of the License, or
# (at your option) any later version.
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to:
# Free Software Foundation, Inc.
# 59 Temple Place, Suite 330
# Boston, MA 02111-1307 USA
#
# Version 1.1
######################## Includes ###############################
use DBI;
######################## Globals ###############################
my $m_host='';
my $m_port='';
my $m_user='';
my $m_pass='';
my $s_host='';
my $s_port='';
my $s_user='';
my $s_pass='';
my $dbhM='';
my $dbhS='';
####################### Sub Prototypes #########################
sub CollectCommandPromptInfo;
sub ConnectToDatabases;
sub DisconnectFromDatabases;
sub GetReplicaEpoch;
sub GetSourceInfo;
sub UpdateReplica;
######################## Program Main ###########################
CollectCommandPromptInfo;
ConnectToDatabases;
GetReplicaEpoch;
GetSourceInfo;
UpdateReplica;
DisconnectFromDatabases;
################## Collect Command Prompt Info #################
sub CollectCommandPromptInfo
{
    ### Check that user has supplied correct number of command line args
    die "Usage:\n
        reset-replica >source MySQL host< >source MySQL port< \n
            >source user< >source pass< >replica MySQL host< \n
            >replica MySQL port< >replica user< >replica pass< \n
        All 8 arguments must be passed. Use BLANK for NULL passwords\n"
        unless @ARGV == 8;
    $m_host = $ARGV[0];
    $m_port = $ARGV[1];
    $m_user = $ARGV[2];
    $m_pass = $ARGV[3];
    $s_host = $ARGV[4];
    $s_port = $ARGV[5];
```

```
    $s_user = $ARGV[6];
    $s_pass = $ARGV[7];
    if ($m_pass eq "BLANK") { $m_pass = '';}
    if ($s_pass eq "BLANK") { $s_pass = '';}
}
############### Make connections to both databases #############
sub ConnectToDatabases
{
    ### Connect to both source and replica cluster databases
    ### Connect to source
    $dbhM
        = DBI->connect(
        "dbi:mysql:database=mysql;host=$m_host;port=$m_port",
        "$m_user", "$m_pass")
            or die "Can't connect to source cluster MySQL process!
                    Error: $DBI::errstr\n";
    ### Connect to replica
    $dbhS
        = DBI->connect(
                "dbi:mysql:database=mysql;host=$s_host",
                "$s_user", "$s_pass")
        or die "Can't connect to replica cluster MySQL process!
                    Error: $DBI::errstr\n";
}
################ Disconnect from both databases ###############
sub DisconnectFromDatabases
{
    ### Disconnect from source
    $dbhM->disconnect
    or warn " Disconnection failed: $DBI::errstr\n";
    ### Disconnect from replica
    $dbhS->disconnect
    or warn " Disconnection failed: $DBI::errstr\n";
}
###################### Find the last good GCI #################
sub GetReplicaEpoch
{
    $sth = $dbhS->prepare("SELECT MAX(epoch)
                        FROM mysql.ndb_apply_status;")
            or die "Error while preparing to select epoch from replica: ",
                    $dbhS->errstr;
    $sth->execute
            or die "Selecting epoch from replica error: ", $sth->errstr;
    $sth->bind_col (1, \$epoch);
    $sth->fetch;
    print "\tReplica epoch = $epoch\n";
    $sth->finish;
}
####### Find the position of the last GCI in the binary log ########
sub GetSourceInfo
{
    $sth = $dbhM->prepare("SELECT
                            SUBSTRING_INDEX(File, '/', -1), Position
                        FROM mysql.ndb_binlog_index
                        WHERE epoch > $epoch
                        ORDER BY epoch ASC LIMIT 1;")
```

```
        or die "Prepare to select from source error: ", $dbhM->errstr;
    $sth->execute
        or die "Selecting from source error: ", $sth->errstr;
    $sth->bind_col (1, \$binlog);
    $sth->bind_col (2, \$binpos);
    $sth->fetch;
    print "\tSource binary log file = $binlog\n";
    print "\tSource binary log position = $binpos\n";
    $sth->finish;
}
########## Set the replica to process from that location #########
sub UpdateReplica
{
    $sth = $dbhS->prepare("CHANGE REPLICATION SOURCE TO
            SOURCE_LOG_FILE='$binlog',
            SOURCE_LOG_POS=$binpos;")
        or die "Prepare to CHANGE REPLICATION SOURCE error: ", $dbhS->errstr;
    $sth->execute
        or die "CHANGE REPLICATION SOURCE on replica error: ", $sth->errstr;
    $sth->finish;
    print "\tReplica has been updated. You may now start the replica.\n";
}
# end reset-replica.pl
```


\subsection*{25.7.9.2 Point-In-Time Recovery Using NDB Cluster Replication}

Point-in-time recovery-that is, recovery of data changes made since a given point in time-is performed after restoring a full backup that returns the server to its state when the backup was made. Performing point-in-time recovery of NDB Cluster tables with NDB Cluster and NDB Cluster Replication can be accomplished using a native NDB data backup (taken by issuing CREATE BACKUP in the ndb_mgm client) and restoring the ndb_binlog_index table (from a dump made using mysqldump).

To perform point-in-time recovery of NDB Cluster, it is necessary to follow the steps shown here:
1. Back up all NDB databases in the cluster, using the START BACKUP command in the ndb_mgm client (see Section 25.6.8, "Online Backup of NDB Cluster").
2. At some later point, prior to restoring the cluster, make a backup of the mysql.ndb_binlog_index table. It is probably simplest to use mysqldump for this task. Also back up the binary log files at this time.

This backup should be updated regularly-perhaps even hourly-depending on your needs.
3. (Catastrophic failure or error occurs.)
4. Locate the last known good backup.
5. Clear the data node file systems (using ndbd --initial or ndbmtd --initial).
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4519.jpg?height=122&width=100&top_left_y=2179&top_left_x=424)

\section*{Note}

Disk Data tablespace and log files are also removed by --initial.
6. Use DROP TABLE or TRUNCATE TABLE with the mysql.ndb_binlog_index table.
7. Execute ndb_restore, restoring all data. You must include the --restore-epoch option when you run ndb_restore, so that the ndb_apply_status table is populated correctly. (See Section 25.5.23, "ndb_restore - Restore an NDB Cluster Backup", for more information.)
8. Restore the ndb_binlog_index table from the output of mysqldump and restore the binary log files from backup, if necessary.
9. Find the epoch applied most recently-that is, the maximum epoch column value in the ndb_apply_status table_as the user variable @LATEST_EPOCH (emphasized):
```
SELECT @LATEST_EPOCH:=MAX(epoch)
    FROM mysql.ndb_apply_status;
```

10. Find the latest binary log file (@FIRST_FILE) and position (Position column value) within this file that correspond to @LATEST_EPOCH in the ndb_binlog_index table:
```
SELECT Position, @FIRST_FILE:=File
    FROM mysql.ndb_binlog_index
    WHERE epoch > @LATEST_EPOCH ORDER BY epoch ASC LIMIT 1;
```

11. Using mysqlbinlog, replay the binary log events from the given file and position up to the point of the failure. (See Section 6.6.9, "mysqlbinlog — Utility for Processing Binary Log Files".)

See also Section 9.5, "Point-in-Time (Incremental) Recovery", for more information about the binary log, replication, and incremental recovery.

\subsection*{25.7.10 NDB Cluster Replication: Bidirectional and Circular Replication}

It is possible to use NDB Cluster for bidirectional replication between two clusters, as well as for circular replication between any number of clusters.

Circular replication example. In the next few paragraphs we consider the example of a replication setup involving three NDB Clusters numbered 1,2 , and 3 , in which Cluster 1 acts as the replication source for Cluster 2, Cluster 2 acts as the source for Cluster 3, and Cluster 3 acts as the source for Cluster 1. Each cluster has two SQL nodes, with SQL nodes A and B belonging to Cluster 1, SQL nodes C and D belonging to Cluster 2, and SQL nodes E and F belonging to Cluster 3.

Circular replication using these clusters is supported as long as the following conditions are met:
- The SQL nodes on all sources and replicas are the same.
- All SQL nodes acting as sources and replicas are started with the system variable log_replica_updates enabled.

This type of circular replication setup is shown in the following diagram:

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 25.14 NDB Cluster Circular Replication with All Sources As Replicas}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4521.jpg?height=1772&width=1123&top_left_y=319&top_left_x=349}
\end{figure}

In this scenario, SQL node A in Cluster 1 replicates to SQL node C in Cluster 2; SQL node C replicates to SQL node E in Cluster 3; SQL node E replicates to SQL node A. In other words, the replication line (indicated by the curved arrows in the diagram) directly connects all SQL nodes used as replication sources and replicas.

It is also possible to set up circular replication in such a way that not all source SQL nodes are also replicas, as shown here:

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 25.15 NDB Cluster Circular Replication Where Not All Sources Are Replicas}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4522.jpg?height=1764&width=1103&top_left_y=315&top_left_x=280}
\end{figure}

In this case, different SQL nodes in each cluster are used as replication sources and replicas. You must not start any of the SQL nodes with the system variable log_replica_updates enabled. This type of circular replication scheme for NDB Cluster, in which the line of replication (again indicated by the curved arrows in the diagram) is discontinuous, should be possible, but it should be noted that it has not yet been thoroughly tested and must therefore still be considered experimental.

Using NDB-native backup and restore to initialize a replica cluster. When setting up circular replication, it is possible to initialize the replica cluster by using the management client START BACKUP command on one NDB Cluster to create a backup and then applying this backup on another NDB Cluster using ndb_restore. This does not automatically create binary logs on the second NDB Cluster's SQL node acting as the replica; in order to cause the binary logs to be created, you must issue a SHOW TABLES statement on that SQL node; this should be done prior to running START REPLICA. This is a known issue.

Multi-source failover example. In this section, we discuss failover in a multi-source NDB Cluster replication setup with three NDB Clusters having server IDs 1, 2, and 3. In this scenario, Cluster 1 replicates to Clusters 2 and 3; Cluster 2 also replicates to Cluster 3. This relationship is shown here:

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 25.16 NDB Cluster Multi-Source Replication With 3 Sources}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4523.jpg?height=474&width=741&top_left_y=479&top_left_x=349}
\end{figure}

In other words, data replicates from Cluster 1 to Cluster 3 through 2 different routes: directly, and by way of Cluster 2.

Not all MySQL servers taking part in multi-source replication must act as both source and replica, and a given NDB Cluster might use different SQL nodes for different replication channels. Such a case is shown here:

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 25.17 NDB Cluster Multi-Source Replication, With MySQL Servers}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4523.jpg?height=1205&width=1394&top_left_y=1343&top_left_x=349}
\end{figure}

MySQL servers acting as replicas must be run with the system variable log_replica_updates enabled. Which mysqld processes require this option is also shown in the preceding diagram.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4524.jpg?height=127&width=101&top_left_y=246&top_left_x=306)

\section*{Note}

Using the log_replica_updates system variable has no effect on servers not being run as replicas.

The need for failover arises when one of the replicating clusters goes down. In this example, we consider the case where Cluster 1 is lost to service, and so Cluster 3 loses 2 sources of updates from Cluster 1. Because replication between NDB Clusters is asynchronous, there is no guarantee that Cluster 3's updates originating directly from Cluster 1 are more recent than those received through Cluster 2. You can handle this by ensuring that Cluster 3 catches up to Cluster 2 with regard to updates from Cluster 1. In terms of MySQL servers, this means that you need to replicate any outstanding updates from MySQL server C to server F.

On server C, perform the following queries:
```
mysqlC> SELECT @latest:=MAX(epoch)
    -> FROM mysql.ndb_apply_status
    -> WHERE server_id=1;
mysqlC> SELECT
    -> @file:=SUBSTRING_INDEX(File, '/', -1),
    -> @pos:=Position
    -> FROM mysql.ndb_binlog_index
    -> WHERE orig_epoch >= @latest
    -> AND orig_server_id = 1
    -> ORDER BY epoch ASC LIMIT 1;
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4524.jpg?height=129&width=113&top_left_y=1233&top_left_x=296)

\section*{Note}

You can improve the performance of this query, and thus likely speed up failover times significantly, by adding the appropriate index to the ndb_binlog_index table. See Section 25.7.4, "NDB Cluster Replication Schema and Tables", for more information.

Copy over the values for @file and @pos manually from server C to server F (or have your application perform the equivalent). Then, on server F, execute the following CHANGE REPLICATION SOURCE TO statement:
```
mysqlF> CHANGE REPLICATION SOURCE TO
    -> SOURCE_HOST = 'serverC'
    -> SOURCE_LOG_FILE='@file',
    -> SOURCE_LOG_POS=@pos;
```


Once this has been done, you can issue a START REPLICA statement on MySQL server F; this causes any missing updates originating from server $B$ to be replicated to server $F$.

The CHANGE REPLICATION SOURCE TO statement also supports an IGNORE_SERVER_IDS option which takes a comma-separated list of server IDs and causes events originating from the corresponding servers to be ignored. See the documentation for this statement for more information, as well as Section 15.7.7.35, "SHOW REPLICA STATUS Statement". For information about how this option interacts with the ndb_log_apply_status variable, see Section 25.7.8, "Implementing Failover with NDB Cluster Replication".

\subsection*{25.7.11 NDB Cluster Replication Using the Multithreaded Applier}
- Requirements
- MTA Configuration: Source
- MTA Configuration: Replica
- Transaction Dependency and Writeset Handling
- Writeset Tracking Memory Usage
- Known Limitations

NDB replication in NDB 8.4 supports the use of the generic MySQL Server Multithreaded Applier mechanism (MTA), which allows independent binary log transactions to be applied in parallel on a replica, increasing peak replication throughput.

\section*{Requirements}

The MySQL Server MTA implementation delegates the processing of separate binary log transactions to a pool of worker threads (whose size is configurable), and coordinates the worker threads to ensure that transaction dependencies encoded in the binary log are respected, and that commit ordering is maintained if required (see Section 19.2.3, "Replication Threads"). To use this functionality with NDB Cluster, it is necessary that the replica be configured to use multiple worker threads. To do this, set replica_parallel_workers to control the number of worker threads on the replica. The default is 4.

\section*{MTA Configuration: Source}

If set on the source mysqld, replica_parallel_type must be LOGICAL_CLOCK (the default value).

\section*{Note \\ NDB does not support replica_parallel_type=DATABASE.}

In addition, it is recommended that you set the amount of memory used to track binary log transaction writesets on the source (binlog_transaction_dependency_history_size) to $E{ }^{*} P$, where $E$ is the average epoch size (as the number of operations per epoch) and $P$ is the maximum expected parallelism. See Writeset Tracking Memory Usage, for more information.

\section*{MTA Configuration: Replica}

Replica mysqld configuration for the NDB MTA requires that replica_parallel_workers is greater than 1 . The recommended starting value when first enabling MTA is 4 , which is the default.

In addition, replica_preserve_commit_order must be ON. This is also the default value.

\section*{Transaction Dependency and Writeset Handling}

Transaction dependencies are detected using analysis of each transaction's writeset, that is, the set of rows (table, key values) written by the transaction. Where two transactions modify the same row they are considered to be dependent, and must be applied in order (in other words, serially) to avoid deadlocks or incorrect results. Where a table has secondary unique keys, these values are also added to the transaction's writeset to detect the case where there are transaction dependencies implied by different transactions affecting the same unique key value, and so requiring ordering. Where dependencies cannot be efficiently determined, mysqld falls back to considering transactions dependent for reasons of safety.

Transaction dependencies are encoded in the binary log by the source mysqld. Dependencies are encoded in an ANONYMOUS_GTID event using a scheme called 'Logical clock'. (See Section 19.1.4.1, "Replication Mode Concepts".)

The writeset implementation employed by MySQL (and NDB Cluster) uses hash-based conflict detection based on matching 64-bit row hashes of relevant table and index values. This detects reliably when the same key is seen twice, but can also produce false positives if different table and index values hash to the same 64-bit value; this may result in artificial dependencies which can reduce the available parallelism.

Transaction dependencies are forced by any of the following:
- DDL statements
- Binary log rotation or encountering binary log file boundaries
- Writeset history size limitations
- Writes which reference parent foreign keys in the target table

More specifically, transactions which perform inserts, updates, and deletes on foreign key parent tables are serialized relative to all preceding and following transactions, and not just to those transactions affecting tables involved in a constraint relationship. Conversely, transactions performing inserts, updates and deletes on foreign key child tables (referencing) are not especially serialized with regard to one another.

The MySQL MTA implementation attempts to apply independent binary log transactions in parallel. NDB records all changes occurring in all user transactions committing in an epoch (TimeBetweenEpochs, default 100 milliseconds), in one binary log transaction, referred to as an epoch transaction. Therefore, for two consecutive epoch transactions to be independent, and possible to apply in parallel, it is required that no row is modified in both epochs. If any single row is modified in both epochs, then they are dependent, and are applied serially, which can limit the expolitable parallelism available.

Epoch transactions are considered independent based on the set of rows modified on the source cluster in the epoch, but not including the generated mysql.ndb_apply_status WRITE_ROW events that convey epoch metadata. This avoids every epoch transaction being trivially dependent on the preceding epoch, but does require that the binlog is applied at the replica with the commit order preserved. This also implies that an NDB binary log with writeset dependencies is not suitable for use by a replica database using a different MySQL storage engine.

It may be possible or desirable to modify application transaction behavior to avoid patterns of repeated modifications to the same rows, in separate transactions over a short time period, to increase exploitable apply parallelism.

\section*{Writeset Tracking Memory Usage}

The amount of memory used to track binary log transaction writesets can be set using the binlog_transaction_dependency_history_size server system variable, which defaults to 25000 row hashes.

If an average binary log transaction modifies $N$ rows, then to be able to identify independent (parallelizable) transactions up to a parallelism level of $P$, we need binlog_transaction_dependency_history_size to be at least $N$ * $P$. (The maximum is 1000000.)

The finite size of the history results in a finite maximum dependency length that can be reliably determined, giving a finite parallelism that can be expressed. Any row not found in the history may be dependent on the last transaction purged from the history.

Writeset history does not act like a sliding window over the last $N$ transactions; rather, it is a finite buffer which is allowed to fill up completely, then its contents entirely discarded when it becomes full. This means that the history size follows a sawtooth pattern over time, and therefore the maximum detectable dependency length also follows a sawtooth pattern over time, such that independent transactions may still be marked as dependent if the writeset history buffer has been reset between their being processed.

In this scheme, each transaction in a binary log file is annotated with a sequence_number $(1,2,3, \ldots)$, and as well as the sequence number of the most recent binary log transaction that it depends on, to which we refer as last_committed.

Within a given binary log file, the first transaction has sequence_number 1 and last_committed 0 .
Where a binary log transaction depends on its immediate predecessor, its application is serialized. If the dependency is on an earlier transaction then it may be possible to apply the transaction in parallel with the preceding independent transactions.

The content of ANONYMOUS_GTID events, including sequence_number and last_committed (and thus the transaction dependencies), can be seen using mysqlbinlog.

The ANONYMOUS_GTID events generated on the source are handled separately from the compressed transaction payload with bulk BEGIN, TABLE_MAP*, WRITE_ROW*, UPDATE_ROW*, DELETE_ROW*, and COMMIT events, allowing dependencies to be determined prior to decompression. This means that the replica coordinator thread can delegate transaction payload decompression to a worker thread, providing automatic parallel decompression of independent transactions on the replica.

\section*{Known Limitations}

Secondary unique columns. Tables with secondary unique columns (that is, unique keys other than the primary key) have all columns sent to the source so that unique-key related conflicts can be detected.

Where the current binary logging mode does not include all columns, but only changed columns (- -ndb-log-updated-only=0FF, --ndb-log-update-minimal=0N, --ndb-log-update-aswrite=0FF), this can increase the volume of data sent from data nodes to SQL nodes.

The impact depends on both the rate of modification (update or delete) of rows in such tables and the volume of data in columns which are not actually modified.

Replicating NDB to InnoDB. NDB binary log injector transaction dependency tracking intentionally ignores the inter-transaction dependencies created by generated mysql.ndb_apply_status metadata events, which are handled separately as part of the commit of the epoch transaction on the replica applier. For replication to InnoDB, there is no special handling; this may result in reduced performance or other issues when using an InnoDB multithreaded applier to consume an NDB MTA binary log.

\subsection*{25.7.12 NDB Cluster Replication Conflict Resolution}
- Requirements
- Source Column Control
- Conflict Resolution Control
- Conflict Resolution Functions
- Conflict Resolution Exceptions Table
- Conflict Detection Status Variables
- Examples

When using a replication setup involving multiple sources (including circular replication), it is possible that different sources may try to update the same row on the replica with different data. Conflict resolution in NDB Cluster Replication provides a means of resolving such conflicts by permitting a userdefined resolution column to be used to determine whether or not an update on a given source should be applied on the replica.

Some types of conflict resolution supported by NDB Cluster (NDB\$OLD( ), NDB\$MAX( ), and NDB \$MAX_DELETE_WIN( ); NDB\$MAX_INS( ) and NDB\$MAX_DEL_WIN_INS( )) implement this userdefined column as a "timestamp" column (although its type cannot be TIMESTAMP, as explained later in this section). These types of conflict resolution are always applied a row-by-row basis rather than a transactional basis. The epoch-based conflict resolution functions NDB\$EPOCH( ) and NDB \$EPOCH_TRANS( ) compare the order in which epochs are replicated (and thus these functions are transactional). Different methods can be used to compare resolution column values on the replica when conflicts occur, as explained later in this section; the method used can be set to act on a single table, database, or server, or on a set of one or more tables using pattern matching. See Matching
with wildcards, for information about using pattern matches in the db, table_name, and server_id columns of the mysql.ndb_replication table.

You should also keep in mind that it is the application's responsibility to ensure that the resolution column is correctly populated with relevant values, so that the resolution function can make the appropriate choice when determining whether to apply an update.

\section*{Requirements}

Preparations for conflict resolution must be made on both the source and the replica. These tasks are described in the following list:
- On the source writing the binary logs, you must determine which columns are sent (all columns or only those that have been updated). This is done for the MySQL Server as a whole by applying the mysqld startup option--ndb-log-updated-only (described later in this section), or on one or more specific tables by placing the proper entries in the mysql.ndb_replication table (see ndb_replication Table).

\section*{Note}

If you are replicating tables with very large columns (such as TEXT or BLOB columns), --ndb-log-updated-only can also be useful for reducing the size of the binary logs and avoiding possible replication failures due to exceeding max_allowed_packet.

See Section 19.5.1.20, "Replication and max_allowed_packet", for more information about this issue.
- On the replica, you must determine which type of conflict resolution to apply ("latest timestamp wins", "same timestamp wins", "primary wins", "primary wins, complete transaction", or none). This is done using the mysql.ndb_replication system table, and applies to one or more specific tables (see ndb_replication Table).
- NDB Cluster also supports read conflict detection, that is, detecting conflicts between reads of a given row in one cluster and updates or deletes of the same row in another cluster. This requires exclusive read locks obtained by setting ndb_log_exclusive_reads equal to 1 on the replica. All rows read by a conflicting read are logged in the exceptions table. For more information, see Read conflict detection and resolution.
- When using NDB\$MAX_INS( ) or NDB\$MAX_DEL_WIN_INS( ), NDB can apply WRITE_ROW events idempotently, mapping such an event to an insert when the incoming row does not already exist, or to an update if it does.

When using any conflict resolution function other than NDB\$MAX_INS( ) or NDB \$MAX_DEL_WIN_INS( ), an incoming write is always rejected if the row already exists.

When using the functions NDB\$OLD( ), NDB\$MAX( ), NDB\$MAX_DELETE_WIN( ), NDB\$MAX_INS( ), and NDB\$MAX_DEL_WIN_INS ( ) for timestamp-based conflict resolution, we often refer to the column used for determining updates as a "timestamp" column. However, the data type of this column is never TIMESTAMP; instead, its data type should be INT (INTEGER) or BIGINT. The "timestamp" column should also be UNSIGNED and NOT NULL.

The NDB\$EPOCH( ) and NDB\$EPOCH_TRANS ( ) functions discussed later in this section work by comparing the relative order of replication epochs applied on a primary and secondary NDB Cluster, and do not make use of timestamps.

\section*{Source Column Control}

We can see update operations in terms of "before" and "after" images-that is, the states of the table before and after the update is applied. Normally, when updating a table with a primary key, the "before"
image is not of great interest; however, when we need to determine on a per-update basis whether or not to use the updated values on a replica, we need to make sure that both images are written to the source's binary log. This is done with the --ndb-log-update-as-write option for mysqld, as described later in this section.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4529.jpg?height=122&width=104&top_left_y=447&top_left_x=365)

\section*{Important}

Whether logging of complete rows or of updated columns only is done is decided when the MySQL server is started, and cannot be changed online; you must either restart mysqld, or start a new mysqld instance with different logging options.

\section*{Conflict Resolution Control}

Conflict resolution is usually enabled on the server where conflicts can occur. Like logging method selection, it is enabled by entries in the mysql.ndb_replication table.

NBT_UPDATED_ONLY_MINIMAL and NBT_UPDATED_FULL_MINIMAL can be used with NDB \$EPOCH( ), NDB\$EPOCH2( ), and NDB\$EPOCH_TRANS( ), because these do not require "before" values of columns which are not primary keys. Conflict resolution algorithms requiring the old values, such as NDB\$MAX( ) and NDB\$OLD ( ), do not work correctly with these binlog_type values.

\section*{Conflict Resolution Functions}

This section provides detailed information about the functions which can be used for conflict detection and resolution with NDB Replication.
- NDB\$OLD()
- NDB\$MAX()
- NDB\$MAX_DELETE_WIN()
- NDB\$MAX_INS()
- NDB\$MAX_DEL_WIN_INS()
- NDB\$EPOCH()
- NDB\$EPOCH_TRANS()
- NDB\$EPOCH2()
- NDB\$EPOCH2_TRANS()

\section*{NDB\$OLD()}

If the value of column_name is the same on both the source and the replica, then the update is applied; otherwise, the update is not applied on the replica and an exception is written to the log. This is illustrated by the following pseudocode:
```
if (source_old_column_value == replica_current_column_value)
    apply_update();
else
    log_exception();
```


This function can be used for "same value wins" conflict resolution. This type of conflict resolution ensures that updates are not applied on the replica from the wrong source.

\section*{Important}

The column value from the source's "before" image is used by this function.

\section*{NDB\$MAX()}

For an update or delete operation, if the "timestamp" column value for a given row coming from the source is higher than that on the replica, it is applied; otherwise it is not applied on the replica. This is illustrated by the following pseudocode:
```
if (source_new_column_value > replica_current_column_value)
    apply_update();
```


This function can be used for "greatest timestamp wins" conflict resolution. This type of conflict resolution ensures that, in the event of a conflict, the version of the row that was most recently updated is the version that persists.

This function has no effects on conflicts between write operations, other than that a write operation with the same primary key as a previous write is always rejected; it is accepted and applied only if no write operation using the same primary key already exists. You can use NDB\$MAX_INS( ) to handle conflict resolution between writes.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4530.jpg?height=122&width=110&top_left_y=936&top_left_x=299)

\section*{Important}

The column value from the sources's "after" image is used by this function.

\section*{NDB\$MAX_DELETE_WIN()}

This is a variation on NDB\$MAX( ). Due to the fact that no timestamp is available for a delete operation, a delete using NDB\$MAX( ) is in fact processed as NDB\$0LD, but for some use cases, this is not optimal. For NDB\$MAX_DELETE_WIN ( ), if the "timestamp" column value for a given row adding or updating an existing row coming from the source is higher than that on the replica, it is applied. However, delete operations are treated as always having the higher value. This is illustrated by the following pseudocode:
```
if ( (source_new_column_value > replica_current_column_value)
            ||
        operation.type == "delete")
    apply_update();
```


This function can be used for "greatest timestamp, delete wins" conflict resolution. This type of conflict resolution ensures that, in the event of a conflict, the version of the row that was deleted or (otherwise) most recently updated is the version that persists.

\section*{Note}

As with NDB\$MAX( ), the column value from the source's "after" image is the value used by this function.

\section*{NDB\$MAX_INS()}

This function provides support for resolution of conflicting write operations. Such conflicts are handled by "NDB\$MAX_INS()" as follows:
1. If there is no conflicting write, apply this one (this is the same as $\operatorname{NDB} \$ \operatorname{MAX}()$ ).
2. Otherwise, apply "greatest timestamp wins" conflict resolution, as follows:
a. If the timestamp for the incoming write is greater than that of the conflicting write, apply the incoming operation.
b. If the timestamp for the incoming write is not greater, reject the incoming write operation.

When handling an insert operation, NDB\$MAX_INS( ) compares timestamps from the source and replica as illustrated by the following pseudocode:
```
if (source_new_column_value > replica_current_column_value)
```

```
    apply_insert();
else
    log_exception();
```


For an update operation, the updated timestamp column value from the source is compared with the replica's timestamp column value, as shown here:
```
if (source_new_column_value > replica_current_column_value)
    apply_update();
else
    log_exception();
```


This is the same as performed by NDB\$MAX( ).
For delete operations, the handling is also the same as that performed by NDB\$MAX( ) (and thus the same as NDB\$0LD( )), and is done like this:
```
if (source_new_column_value == replica_current_column_value)
    apply_delete();
else
    log_exception();
```


\section*{NDB\$MAX_DEL_WIN_INS()}

This function provides support for resolution of conflicting write operations, along with "delete wins" resolution like that of NDB\$MAX_DELETE_WIN ( ). Write conflicts are handled by NDB \$MAX_DEL_WIN_INS( ) as shown here:
1. If there is no conflicting write, apply this one (this is the same as NDB\$MAX_DELETE_WIN ( )).
2. Otherwise, apply "greatest timestamp wins" conflict resolution, as follows:
a. If the timestamp for the incoming write is greater than that of the conflicting write, apply the incoming operation.
b. If the timestamp for the incoming write is not greater, reject the incoming write operation.

Handling of insert operations as performed by NDB\$MAX_DEL_WIN_INS( ) can be represented in pseudocode as shown here:
```
if (source_new_column_value > replica_current_column_value)
    apply_insert();
else
    log_exception();
```


For update operations, the source's updated timestamp column value is compared with replica's timestamp column value, like this (again using pseudocode):
```
if (source_new_column_value > replica_current_column_value)
    apply_update();
else
    log_exception();
```


Deletes are handled using a "delete always wins" strategy (the same as NDB\$MAX_DELETE_WIN ( )); a DELETE is always applied without any regard to any timestamp values, as illustrated by this pseudocode:
```
if (operation.type == "delete")
    apply_delete();
```


For conflicts between update and delete operations, this function behaves identically to NDB \$MAX_DELETE_WIN().

\section*{NDB\$EPOCH()}

The NDB\$EPOCH( ) function tracks the order in which replicated epochs are applied on a replica cluster relative to changes originating on the replica. This relative ordering is used to determine
whether changes originating on the replica are concurrent with any changes that originate locally, and are therefore potentially in conflict.

Most of what follows in the description of NDB\$EPOCH( ) also applies to NDB\$EPOCH_TRANS( ). Any exceptions are noted in the text.

NDB\$EPOCH( ) is asymmetric, operating on one NDB Cluster in a bidirectional replication configuration (sometimes referred to as "active-active" replication). We refer here to cluster on which it operates as the primary, and the other as the secondary. The replica on the primary is responsible for detecting and handling conflicts, while the replica on the secondary is not involved in any conflict detection or handling.

When the replica on the primary detects conflicts, it injects events into its own binary log to compensate for these; this ensures that the secondary NDB Cluster eventually realigns itself with the primary and so keeps the primary and secondary from diverging. This compensation and realignment mechanism requires that the primary NDB Cluster always wins any conflicts with the secondary-that is, that the primary's changes are always used rather than those from the secondary in event of a conflict. This "primary always wins" rule has the following implications:
- Operations that change data, once committed on the primary, are fully persistent and are not undone or rolled back by conflict detection and resolution.
- Data read from the primary is fully consistent. Any changes committed on the Primary (locally or from the replica) are not reverted later.
- Operations that change data on the secondary may later be reverted if the primary determines that they are in conflict.
- Individual rows read on the secondary are self-consistent at all times, each row always reflecting either a state committed by the secondary, or one committed by the primary.
- Sets of rows read on the secondary may not necessarily be consistent at a given single point in time. For NDB\$EPOCH_TRANS( ), this is a transient state; for NDB\$EPOCH( ), it can be a persistent state.
- Assuming a period of sufficient length without any conflicts, all data on the secondary NDB Cluster (eventually) becomes consistent with the primary's data.

NDB\$EPOCH( ) and NDB\$EPOCH_TRANS ( ) do not require any user schema modifications, or application changes to provide conflict detection. However, careful thought must be given to the schema used, and the access patterns used, to verify that the complete system behaves within specified limits.

Each of the NDB\$EPOCH( ) and NDB\$EPOCH_TRANS ( ) functions can take an optional parameter; this is the number of bits to use to represent the lower 32 bits of the epoch, and should be set to no less than the value calculated as shown here:

CEIL( LOG2( TimeBetweenGlobalCheckpoints / TimeBetweenEpochs ), 1)
For the default values of these configuration parameters (2000 and 100 milliseconds, respectively), this gives a value of 5 bits, so the default value (6) should be sufficient, unless other values are used for TimeBetweenGlobalCheckpoints, TimeBetweenEpochs, or both. A value that is too small can result in false positives, while one that is too large could lead to excessive wasted space in the database.

Both NDB\$EPOCH ( ) and NDB\$EPOCH_TRANS( ) insert entries for conflicting rows into the relevant exceptions tables, provided that these tables have been defined according to the same exceptions table schema rules as described elsewhere in this section (see NDB\$OLD()). You must create any exceptions table before creating the data table with which it is to be used.

As with the other conflict detection functions discussed in this section, NDB\$EPOCH( ) and NDB \$EPOCH_TRANS( ) are activated by including relevant entries in the mysql.ndb_replication table
(see ndb_replication Table). The roles of the primary and secondary NDB Clusters in this scenario are fully determined by mysql.ndb_replication table entries.

Because the conflict detection algorithms employed by NDB\$EPOCH( ) and NDB\$EPOCH_TRANS( ) are asymmetric, you must use different values for the server_id entries of the primary and secondary replicas.

A conflict between DELETE operations alone is not sufficient to trigger a conflict using NDB\$EPOCH() or NDB\$EPOCH_TRANS( ), and the relative placement within epochs does not matter.

\section*{Limitations on NDB\$EPOCH()}

The following limitations currently apply when using NDB\$EPOCH ( ) to perform conflict detection:
- Conflicts are detected using NDB Cluster epoch boundaries, with granularity proportional to TimeBetweenEpochs (default: 100 milliseconds). The minimum conflict window is the minimum time during which concurrent updates to the same data on both clusters always report a conflict. This is always a nonzero length of time, and is roughly proportional to 2 * (latency + queueing + TimeBetweenEpochs). This implies that-assuming the default for TimeBetweenEpochs and ignoring any latency between clusters (as well as any queuing delays)-the minimum conflict window size is approximately 200 milliseconds. This minimum window should be considered when looking at expected application "race" patterns.
- Additional storage is required for tables using the NDB\$EPOCH( ) and NDB\$EPOCH_TRANS( ) functions; from 1 to 32 bits extra space per row is required, depending on the value passed to the function.
- Conflicts between delete operations may result in divergence between the primary and secondary. When a row is deleted on both clusters concurrently, the conflict can be detected, but is not recorded, since the row is deleted. This means that further conflicts during the propagation of any subsequent realignment operations are not detected, which can lead to divergence.

Deletes should be externally serialized, or routed to one cluster only. Alternatively, a separate row should be updated transactionally with such deletes and any inserts that follow them, so that conflicts can be tracked across row deletes. This may require changes in applications.
- Only two NDB Clusters in a bidirectional "active-active" configuration are currently supported when using NDB\$EPOCH( ) or NDB\$EPOCH_TRANS ( ) for conflict detection.
- Tables having BLOB or TEXT columns are not currently supported with NDB\$EPOCH() or NDB \$EPOCH_TRANS().

\section*{NDB\$EPOCH_TRANS()}

NDB\$EPOCH_TRANS ( ) extends the NDB\$EPOCH ( ) function. Conflicts are detected and handled in the same way using the "primary wins all" rule (see NDB\$EPOCH()) but with the extra condition that any other rows updated in the same transaction in which the conflict occurred are also regarded as being in conflict. In other words, where NDB\$EPOCH( ) realigns individual conflicting rows on the secondary, NDB\$EPOCH_TRANS( ) realigns conflicting transactions.

In addition, any transactions which are detectably dependent on a conflicting transaction are also regarded as being in conflict, these dependencies being determined by the contents of the secondary cluster's binary log. Since the binary log contains only data modification operations (inserts, updates, and deletes), only overlapping data modifications are used to determine dependencies between transactions.

NDB\$EPOCH_TRANS ( ) is subject to the same conditions and limitations as NDB\$EPOCH ( ), and in addition requires that all transaction IDs are recorded in the secondary's binary log, using - - ndb - log -transaction-id set to ON. This adds a variable amount of overhead (up to 13 bytes per row).

See NDB\$EPOCH().

\section*{NDB\$EPOCH2()}

The NDB\$EPOCH2( ) function is similar to NDB\$EPOCH( ), except that NDB\$EPOCH2( ) provides for delete-delete handling with a bidirectional replication topology. In this scenario, primary and secondary roles are assigned to the two sources by setting the ndb_conflict_role system variable to the appropriate value on each source (usually one each of PRIMARY, SECONDARY). When this is done, modifications made by the secondary are reflected by the primary back to the secondary which then conditionally applies them.

\section*{NDB\$EPOCH2_TRANS()}

NDB\$EPOCH2_TRANS( ) extends the NDB\$EPOCH2 ( ) function. Conflicts are detected and handled in the same way, and assigning primary and secondary roles to the replicating clusters, but with the extra condition that any other rows updated in the same transaction in which the conflict occurred are also regarded as being in conflict. That is, NDB\$EPOCH2 ( ) realigns individual conflicting rows on the secondary, while NDB\$EPOCH_TRANS( ) realigns conflicting transactions.

Where NDB\$EPOCH( ) and NDB\$EPOCH_TRANS( ) use metadata that is specified per row, per last modified epoch, to determine on the primary whether an incoming replicated row change from the secondary is concurrent with a locally committed change; concurrent changes are regarded as conflicting, with subsequent exceptions table updates and realignment of the secondary. A problem arises when a row is deleted on the primary so there is no longer any last-modified epoch available to determine whether any replicated operations conflict, which means that conflicting delete operations are not detected. This can result in divergence, an example being a delete on one cluster which is concurrent with a delete and insert on the other; this why delete operations can be routed to only one cluster when using NDB\$EPOCH( ) and NDB\$EPOCH_TRANS ( ).

NDB\$EPOCH2 ( ) bypasses the issue just described-storing information about deleted rows on the PRIMARY-by ignoring any delete-delete conflict, and by avoiding any potential resultant divergence as well. This is accomplished by reflecting any operation successfully applied on and replicated from the secondary back to the secondary. On its return to the secondary, it can be used to reapply an operation on the secondary which was deleted by an operation originating from the primary.

When using NDB\$EPOCH2( ), you should keep in mind that the secondary applies the delete from the primary, removing the new row until it is restored by a reflected operation. In theory, the subsequent insert or update on the secondary conflicts with the delete from the primary, but in this case, we choose to ignore this and allow the secondary to "win", in the interest of preventing divergence between the clusters. In other words, after a delete, the primary does not detect conflicts, and instead adopts the secondary's following changes immediately. Because of this, the secondary's state can revisit multiple previous committed states as it progresses to a final (stable) state, and some of these may be visible.

You should also be aware that reflecting all operations from the secondary back to the primary increases the size of the primary's logbinary log, as well as demands on bandwidth, CPU usage, and disk I/O.

Application of reflected operations on the secondary depends on the state of the target row on the secondary. Whether or not reflected changes are applied on the secondary can be tracked by checking the Ndb_conflict_reflected_op_prepare_count and Ndb_conflict_reflected_op_discard_count status variables. The number of changes applied is simply the difference between these two values (note that Ndb_conflict_reflected_op_prepare_count is always greater than or equal to Ndb_conflict_reflected_op_discard_count).

Events are applied if and only if both of the following conditions are true:
- The existence of the row-that is, whether or not it exists-is in accordance with the type of event. For delete and update operations, the row must already exist. For insert operations, the row must not exist.
- The row was last modified by the primary. It is possible that the modification was accomplished through the execution of a reflected operation.

If both of these conditions are not met, the reflected operation is discarded by the secondary.

\section*{Conflict Resolution Exceptions Table}

To use the NDB\$OLD ( ) conflict resolution function, it is also necessary to create an exceptions table corresponding to each NDB table for which this type of conflict resolution is to be employed. This is also true when using NDB\$EPOCH( ) or NDB\$EPOCH_TRANS( ). The name of this table is that of the table for which conflict resolution is to be applied, with the string $\$ \mathrm{EX}$ appended. (For example, if the name of the original table is mytable, the name of the corresponding exceptions table name should be mytable\$EX.) The syntax for creating the exceptions table is as shown here:
```
CREATE TABLE original_table$EX (
    [NDB$]server_id INT UNSIGNED,
    [NDB$]source_server_id INT UNSIGNED,
    [NDB$]source_epoch BIGINT UNSIGNED,
    [NDB$]count INT UNSIGNED,
    [NDB$OP_TYPE ENUM('WRITE_ROW','UPDATE_ROW', 'DELETE_ROW',
        'REFRESH_ROW', 'READ_ROW') NOT NULL,]
    [NDB$CFT_CAUSE ENUM('ROW_DOES_NOT_EXIST', 'ROW_ALREADY_EXISTS',
        'DATA_IN_CONFLICT', 'TRANS_IN_CONFLICT') NOT NULL,]
    [NDB$ORIG_TRANSID BIGINT UNSIGNED NOT NULL,]
    original_table_pk_columns,
    [orig_table_column|orig_table_column$OLD|orig_table_column$NEW,]
    [additional_columns,]
    PRIMARY KEY([NDB$]server_id, [NDB$]source_server_id, [NDB$]source_epoch, [NDB$]count)
) ENGINE=NDB;
```


The first four columns are required. The names of the first four columns and the columns matching the original table's primary key columns are not critical; however, we suggest for reasons of clarity and consistency, that you use the names shown here for the server_id, source_server_id, source_epoch, and count columns, and that you use the same names as in the original table for the columns matching those in the original table's primary key.

If the exceptions table uses one or more of the optional columns NDB\$OP_TYPE, NDB\$CFT_CAUSE, or NDB\$ORIG_TRANSID discussed later in this section, then each of the required columns must also be named using the prefix NDB\$. If desired, you can use the NDB\$ prefix to name the required columns even if you do not define any optional columns, but in this case, all four of the required columns must be named using the prefix.

Following these columns, the columns making up the original table's primary key should be copied in the order in which they are used to define the primary key of the original table. The data types for the columns duplicating the primary key columns of the original table should be the same as (or larger than) those of the original columns. A subset of the primary key columns may be used.

The exceptions table must use the NDB storage engine. (An example that uses NDB\$OLD ( ) with an exceptions table is shown later in this section.)

Additional columns may optionally be defined following the copied primary key columns, but not before any of them; any such extra columns cannot be NOT NULL. NDB Cluster supports three additional, predefined optional columns NDB\$OP_TYPE, NDB\$CFT_CAUSE, and NDB\$ORIG_TRANSID, which are described in the next few paragraphs.

NDB\$OP_TYPE: This column can be used to obtain the type of operation causing the conflict. If you use this column, define it as shown here:
```
NDB$OP_TYPE ENUM('WRITE_ROW', 'UPDATE_ROW', 'DELETE_ROW',
    'REFRESH_ROW', 'READ_ROW') NOT NULL
```


The WRITE_ROW, UPDATE_ROW, and DELETE_ROW operation types represent user-initiated operations. REFRESH_ROW operations are operations generated by conflict resolution in compensating transactions
sent back to the originating cluster from the cluster that detected the conflict. READ_ROW operations are user-initiated read tracking operations defined with exclusive row locks.

NDB\$CFT_CAUSE: You can define an optional column NDB\$CFT_CAUSE which provides the cause of the registered conflict. This column, if used, is defined as shown here:

NDB\$CFT_CAUSE ENUM('ROW_DOES_NOT_EXIST', 'ROW_ALREADY_EXISTS',
'DATA_IN_CONFLICT', 'TRANS_IN_CONFLICT') NOT NULL
ROW_DOES_NOT_EXIST can be reported as the cause for UPDATE_ROW and WRITE_ROW operations; ROW_ALREADY_EXISTS can be reported for WRITE_ROW events. DATA_IN_CONFLICT is reported when a row-based conflict function detects a conflict; TRANS_IN_CONFLICT is reported when a transactional conflict function rejects all of the operations belonging to a complete transaction.

NDB\$ORIG_TRANSID: The NDB\$ORIG_TRANSID column, if used, contains the ID of the originating transaction. This column should be defined as follows:

NDB\$ORIG_TRANSID BIGINT UNSIGNED NOT NULL
NDB\$ORIG_TRANSID is a 64-bit value generated by NDB. This value can be used to correlate multiple exceptions table entries belonging to the same conflicting transaction from the same or different exceptions tables.

Additional reference columns which are not part of the original table's primary key can be named colname\$0LD or colname\$NEW. colname\$0LD references old values in update and delete operations-that is, operations containing DELETE_ROW events. colname\$NEW can be used to reference new values in insert and update operations-in other words, operations using WRITE_ROW events, UPDATE_ROW events, or both types of events. Where a conflicting operation does not supply a value for a given reference column that is not a primary key, the exceptions table row contains either NULL, or a defined default value for that column.

\section*{Important}

The mysql.ndb_replication table is read when a data table is set up for replication, so the row corresponding to a table to be replicated must be inserted into mysql.ndb_replication before the table to be replicated is created.

\section*{Conflict Detection Status Variables}

Several status variables can be used to monitor conflict detection. You can see how many rows have been found in conflict by NDB\$EPOCH ( ) since this replica was last restarted from the current value of the Ndb_conflict_fn_epoch system status variable.

Ndb_conflict_fn_epoch_trans provides the number of rows that have been found directly in conflict by NDB\$EPOCH_TRANS( ). Ndb_conflict_fn_epoch2 and Ndb_conflict_fn_epoch2_trans show the number of rows found in conflict by NDB\$EPOCH2 () and NDB\$EPOCH2_TRANS( ), respectively. The number of rows actually realigned, including those affected due to their membership in or dependency on the same transactions as other conflicting rows, is given by Ndb_conflict_trans_row_reject_count.

Another server status variable Ndb_conflict_fn_max provides a count of the number of times that a row was not applied on the current SQL node due to "greatest timestamp wins" conflict resolution since the last time that mysqld was started. Ndb_conflict_fn_max_del_win provides a count of the number of times that conflict resolution based on the outcome of NDB\$MAX_DELETE_WIN ( ) has been applied.

Ndb_conflict_fn_max_ins tracks the number of times that "greater timestamp wins" handling has been applied to write operations (using NDB\$MAX_INS( )); a count of the number of times that "same timestamp wins" handling of writes has been applied (as implemented by NDB\$MAX_DEL_WIN_INS( )), is provided by the status variable Ndb_conflict_fn_max_del_win_ins.

The number of times that a row was not applied as the result of "same timestamp wins" conflict resolution on a given mysqld since the last time it was restarted is given by the global status variable Ndb_conflict_fn_old. In addition to incrementing Ndb_conflict_fn_old, the primary key of the row that was not used is inserted into an exceptions table, as explained elsewhere in this section.

See also NDB Cluster Status Variables.

\section*{Examples}

The following examples assume that you have already a working NDB Cluster replication setup, as described in Section 25.7.5, "Preparing the NDB Cluster for Replication", and Section 25.7.6, "Starting NDB Cluster Replication (Single Replication Channel)".

NDB\$MAX() example. Suppose you wish to enable "greatest timestamp wins" conflict resolution on table test. t1, using column mycol as the "timestamp". This can be done using the following steps:
1. Make sure that you have started the source mysqld with--ndb-log-update-as-write=OFF.
2. On the source, perform this INSERT statement:
```
INSERT INTO mysql.ndb_replication
    VALUES ('test', 't1', 0, NULL, 'NDB$MAX(mycol)');
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4537.jpg?height=110&width=100&top_left_y=1126&top_left_x=424)

\section*{Note}

If the ndb_replication table does not already exist, you must create it. See ndb_replication Table.

Inserting a 0 into the server_id column indicates that all SQL nodes accessing this table should use conflict resolution. If you want to use conflict resolution on a specific mysqld only, use the actual server ID.

Inserting NULL into the binlog_type column has the same effect as inserting 0 (NBT_DEFAULT); the server default is used.
3. Create the test.t1 table:
```
CREATE TABLE test.t1 (
    columns
    mycol INT UNSIGNED,
    columns
) ENGINE=NDB;
```


Now, when updates are performed on this table, conflict resolution is applied, and the version of the row having the greatest value for mycol is written to the replica.

\section*{Note}

Other binlog_type options such as NBT_UPDATED_ONLY_USE_UPDATE (6) should be used to control logging on the source using the ndb_replication table rather than by using command-line options.

NDB\$OLD() example. Suppose an NDB table such as the one defined here is being replicated, and you wish to enable "same timestamp wins" conflict resolution for updates to this table:
```
CREATE TABLE test.t2 (
    a INT UNSIGNED NOT NULL,
    b CHAR(25) NOT NULL,
    columns,
    mycol INT UNSIGNED NOT NULL,
    columns,
    PRIMARY KEY pk (a, b)
) ENGINE=NDB;
```


The following steps are required, in the order shown:
1. First-and prior to creating test.t2-you must insert a row into the mysql.ndb_replication table, as shown here:
```
INSERT INTO mysql.ndb_replication
    VALUES ('test', 't2', 0, 0, 'NDB$OLD(mycol)');
```


Possible values for the binlog_type column are shown earlier in this section; in this case, we use 0 to specify that the server default logging behavior be used. The value 'NDB\$OLD (mycol) ' should be inserted into the conflict_fn column.
2. Create an appropriate exceptions table for test.t2. The table creation statement shown here includes all required columns; any additional columns must be declared following these columns, and before the definition of the table's primary key.
```
CREATE TABLE test.t2$EX (
    server_id INT UNSIGNED,
    source_server_id INT UNSIGNED,
    source_epoch BIGINT UNSIGNED,
    count INT UNSIGNED,
    a INT UNSIGNED NOT NULL,
    b CHAR(25) NOT NULL,
    [additional_columns,]
    PRIMARY KEY(server_id, source_server_id, source_epoch, count)
) ENGINE=NDB;
```


We can include additional columns for information about the type, cause, and originating transaction ID for a given conflict. We are also not required to supply matching columns for all primary key columns in the original table. This means you can create the exceptions table like this:
```
CREATE TABLE test.t2$EX (
    NDB$server_id INT UNSIGNED,
    NDB$source_server_id INT UNSIGNED,
    NDB$source_epoch BIGINT UNSIGNED,
    NDB$count INT UNSIGNED,
    a INT UNSIGNED NOT NULL,
    NDB$OP_TYPE ENUM('WRITE_ROW','UPDATE_ROW', 'DELETE_ROW',
        'REFRESH_ROW', 'READ_ROW') NOT NULL,
    NDB$CFT_CAUSE ENUM('ROW_DOES_NOT_EXIST', 'ROW_ALREADY_EXISTS',
        'DATA_IN_CONFLICT', 'TRANS_IN_CONFLICT') NOT NULL,
    NDB$ORIG_TRANSID BIGINT UNSIGNED NOT NULL,
    [additional_columns,]
    PRIMARY KEY(NDB$server_id, NDB$source_server_id, NDB$source_epoch, NDB$count)
) ENGINE=NDB;
```


\section*{Note}

The NDB\$ prefix is required for the four required columns since we included at least one of the columns NDB\$OP_TYPE, NDB\$CFT_CAUSE, or NDB \$ORIG_TRANSID in the table definition.
3. Create the table test.t2 as shown previously.

These steps must be followed for every table for which you wish to perform conflict resolution using NDB\$OLD ( ). For each such table, there must be a corresponding row in mysql.ndb_replication, and there must be an exceptions table in the same database as the table being replicated.

Read conflict detection and resolution. NDB Cluster also supports tracking of read operations, which makes it possible in circular replication setups to manage conflicts between reads of a given row in one cluster and updates or deletes of the same row in another. This example uses employee and department tables to model a scenario in which an employee is moved from one department to another on the source cluster (which we refer to hereafter as cluster $A$ ) while the replica cluster
(hereafter $B$ ) updates the employee count of the employee's former department in an interleaved transaction.

The data tables have been created using the following SQL statements:
```
# Employee table
CREATE TABLE employee (
    id INT PRIMARY KEY,
    name VARCHAR(2000),
    dept INT NOT NULL
) ENGINE=NDB;
# Department table
CREATE TABLE department (
    id INT PRIMARY KEY,
    name VARCHAR(2000),
    members INT
) ENGINE=NDB;
```


The contents of the two tables include the rows shown in the (partial) output of the following SELECT statements:
```
mysql> SELECT id, name, dept FROM employee;
+----------------+------+
| id | name | dept |
+------+--------+------+
...
| 998 | Mike | 3 |
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4539.jpg?height=72&width=406&top_left_y=1219&top_left_x=351)
```
...
+------+---------+------+
mysql> SELECT id, name, members FROM department;
+-----+--------------+---------+
| id | name | members |
+-----+-------------+---------+
...
| 3 | Old project | 24 |
...
+-----+--------------+---------+
```


We assume that we are already using an exceptions table that includes the four required columns (and these are used for this table's primary key), the optional columns for operation type and cause, and the original table's primary key column, created using the SQL statement shown here:
```
CREATE TABLE employee$EX (
        NDB$server_id INT UNSIGNED,
        NDB$source_server_id INT UNSIGNED,
        NDB$source_epoch BIGINT UNSIGNED,
        NDB$count INT UNSIGNED,
        NDB$OP_TYPE ENUM( 'WRITE_ROW','UPDATE_ROW', 'DELETE_ROW',
            'REFRESH_ROW','READ_ROW') NOT NULL,
        NDB$CFT_CAUSE ENUM( 'ROW_DOES_NOT_EXIST',
            'ROW_ALREADY_EXISTS',
                'DATA_IN_CONFLICT',
                'TRANS_IN_CONFLICT') NOT NULL,
        id INT NOT NULL,
        PRIMARY KEY(NDB$server_id, NDB$source_server_id, NDB$source_epoch, NDB$count)
) ENGINE=NDB;
```


Suppose there occur the two simultaneous transactions on the two clusters. On cluster $A$, we create a new department, then move employee number 999 into that department, using the following SQL statements:
```
BEGIN;
    INSERT INTO department VALUES (4, "New project", 1);
```

```
UPDATE employee SET dept = 4 WHERE id = 999;
COMMIT;
```


At the same time, on cluster B, another transaction reads from employee, as shown here:
```
BEGIN;
    SELECT name FROM employee WHERE id = 999;
    UPDATE department SET members = members - 1 WHERE id = 3;
commit;
```


The conflicting transactions are not normally detected by the conflict resolution mechanism, since the conflict is between a read (SELECT) and an update operation. You can circumvent this issue by executing SET ndb_log_exclusive_reads $=1$ on the replica cluster. Acquiring exclusive read locks in this way causes any rows read on the source to be flagged as needing conflict resolution on the replica cluster. If we enable exclusive reads in this way prior to the logging of these transactions, the read on cluster $B$ is tracked and sent to cluster $A$ for resolution; the conflict on the employee row is subsequently detected and the transaction on cluster $B$ is aborted.

The conflict is registered in the exceptions table (on cluster A) as a READ_ROW operation (see Conflict Resolution Exceptions Table, for a description of operation types), as shown here:
```
mysql> SELECT id, NDB$OP_TYPE, NDB$CFT_CAUSE FROM employee$EX;
+-------+--------------+-------------------+
| id | NDB$OP_TYPE | NDB$CFT_CAUSE |
+-------+--------------+------------------+
...
| 999 | READ_ROW | TRANS_IN_CONFLICT |
+-------+--------------+------------------+
```


Any existing rows found in the read operation are flagged. This means that multiple rows resulting from the same conflict may be logged in the exception table, as shown by examining the effects a conflict between an update on cluster $A$ and a read of multiple rows on cluster $B$ from the same table in simultaneous transactions. The transaction executed on cluster $A$ is shown here:
```
BEGIN;
    INSERT INTO department VALUES (4, "New project", 0);
    UPDATE employee SET dept = 4 WHERE dept = 3;
    SELECT COUNT(*) INTO @count FROM employee WHERE dept = 4;
    UPDATE department SET members = @count WHERE id = 4;
COMMIT;
```


Concurrently a transaction containing the statements shown here runs on cluster $B$ :
```
SET ndb_log_exclusive_reads = 1; # Must be set if not already enabled
...
BEGIN;
    SELECT COUNT(*) INTO @count FROM employee WHERE dept = 3 FOR UPDATE;
    UPDATE department SET members = @count WHERE id = 3;
COMMIT;
```


In this case, all three rows matching the WHERE condition in the second transaction's SELECT are read, and are thus flagged in the exceptions table, as shown here:
```
mysql> SELECT id, NDB$OP_TYPE, NDB$CFT_CAUSE FROM employee$EX;
+-------+--------------+------------------+
| id | NDB$OP_TYPE | NDB$CFT_CAUSE |
+-------+--------------+-------------------+
...
| 998 | READ_ROW | TRANS_IN_CONFLICT |
|999 | READ_ROW | TRANS_IN_CONFLICT |
| 1000 | READ_ROW | TRANS_IN_CONFLICT |
...
+-------+--------------+------------------+
```


Read tracking is performed on the basis of existing rows only. A read based on a given condition track conflicts only of any rows that are found and not of any rows that are inserted in an interleaved
transaction. This is similar to how exclusive row locking is performed in a single instance of NDB Cluster.

Insert conflict detection and resolution example. The following example illustrates the use of insert conflict detection functions. We assume that we are replicating two tables t1 and t2 in database test, and that we wish to use insert conflict detection with NDB\$MAX_INS( ) for t1 and NDB \$MAX_DEL_WIN_INS( ) for t2. The two data tables are not created until later in the setup process.

Setting up insert conflict resolution is similar to setting up other conflict detection and resolution algorithms as shown in the previous examples. If the mysql.ndb_replication table used to configure binary logging and conflict resolution, does not already exist, it is first necessary to create it, as shown here:
```
CREATE TABLE mysql.ndb_replication (
    db VARBINARY(63),
    table_name VARBINARY(63),
    server_id INT UNSIGNED,
    binlog_type INT UNSIGNED,
    conflict_fn VARBINARY(128),
    PRIMARY KEY USING HASH (db, table_name, server_id)
) ENGINE=NDB
PARTITION BY KEY(db,table_name);
```


The ndb_replication table acts on a per-table basis; that is, we need to insert a row containing table information, a binlog_type value, the conflict resolution function to be employed, and the name of the timestamp column ( $X$ ) for each table to be set up, like this:
```
INSERT INTO mysql.ndb_replication VALUES ("test", "t1", 0, 7, "NDB$MAX_INS(X)");
INSERT INTO mysql.ndb_replication VALUES ("test", "t2", 0, 7, "NDB$MAX_DEL_WIN_INS(X)");
```


Here we have set the binlog_type as NBT_FULL_USE_UPDATE (7) which means that full rows are always logged. See ndb_replication Table, for other possible values.

You can also create an exceptions table corresponding to each NDB table for which conflict resolution is to be employed. An exceptions table records all rows rejected by the conflict resolution function for a given table. Exceptions tables for replication conflict detection for tables t1 and t2 can be created using the following two SQL statements:
```
CREATE TABLE ˋt1$EXˋ (
    NDB$server_id INT UNSIGNED,
    NDB$source_server_id INT UNSIGNED,
    NDB$source_epoch BIGINT UNSIGNED,
    NDB$count INT UNSIGNED,
    NDB$OP_TYPE ENUM('WRITE_ROW', 'UPDATE_ROW', 'DELETE_ROW',
        'REFRESH_ROW', 'READ_ROW') NOT NULL,
    NDB$CFT_CAUSE ENUM('ROW_DOES_NOT_EXIST', 'ROW_ALREADY_EXISTS',
            'DATA_IN_CONFLICT', 'TRANS_IN_CONFLICT') NOT NULL,
    a INT NOT NULL,
    PRIMARY KEY(NDB$server_id, NDB$source_server_id,
        NDB$source_epoch, NDB$count)
) ENGINE=NDB;
CREATE TABLE ˋt2$EXˋ (
    NDB$server_id INT UNSIGNED,
    NDB$source_server_id INT UNSIGNED,
    NDB$source_epoch BIGINT UNSIGNED,
    NDB$count INT UNSIGNED,
    NDB$OP_TYPE ENUM('WRITE_ROW', 'UPDATE_ROW', 'DELETE_ROW',
            'REFRESH_ROW', 'READ_ROW') NOT NULL,
    NDB$CFT_CAUSE ENUM( 'ROW_DOES_NOT_EXIST', 'ROW_ALREADY_EXISTS',
                'DATA_IN_CONFLICT', 'TRANS_IN_CONFLICT') NOT NULL,
    a INT NOT NULL,
    PRIMARY KEY(NDB$server_id, NDB$source_server_id,
        NDB$source_epoch, NDB$count)
) ENGINE=NDB;
```


Finally, after creating the exception tables just shown, you can create the data tables to be replicated and subject to conflict resolution control, using the following two SQL statements:
```
CREATE TABLE t1 (
    a INT PRIMARY KEY,
    b VARCHAR(32),
    X INT UNSIGNED
) ENGINE=NDB;
CREATE TABLE t2 (
    a INT PRIMARY KEY,
    b VARCHAR(32),
    X INT UNSIGNED
) ENGINE=NDB;
```


For each table, the X column is used as the timestamp column.
Once created on the source, t1 and t2 are replicated and can be assumed to exist on both the source and the replica. In the remainder of this example, we use mysqlS> to indicate a mysql client connected to the source, and mysqlR> to indicate a mysql client running on the replica.

First we insert one row each into the tables on the source, like this:
```
mysqlS> INSERT INTO t1 VALUES (1, 'Initial X=1', 1);
Query OK, 1 row affected (0.01 sec)
mysqlS> INSERT INTO t2 VALUES (1, 'Initial X=1', 1);
Query OK, 1 row affected (0.01 sec)
```


We can be certain that these two rows are replicated without causing any conflicts, since the tables on the replica did not contain any rows prior to issuing the INSERT statements on the source. We can verify this by selecting from the tables on the replica as shown here:
```
mysqlR> TABLE t1 ORDER BY a;
+---+--------------+------+
| a | b | X |
+---+--------------+------+
| 1 | Initial X=1 | 1 |
+---+--------------+------+
1 row in set (0.00 sec)
mysqlR> TABLE t2 ORDER BY a;
+---+--------------+------+
| a | b | X |
+---+--------------+------+
| 1 | Initial X=1 | 1 |
+---+--------------+------+
1 row in set (0.00 sec)
```


Next, we insert new rows into the tables on the replica, like this:
```
mysqlR> INSERT INTO t1 VALUES (2, 'Replica X=2', 2);
Query OK, 1 row affected (0.01 sec)
mysqlR> INSERT INTO t2 VALUES (2, 'Replica X=2', 2);
Query OK, 1 row affected (0.01 sec)
```


Now we insert conflicting rows into the tables on the source having greater timestamp $(X)$ column values, using the statements shown here:
```
mysqlS> INSERT INTO t1 VALUES (2, 'Replica X=20', 20);
Query OK, 1 row affected (0.01 sec)
mysqlS> INSERT INTO t2 VALUES (2, 'Replica X=20', 20);
Query OK, 1 row affected (0.01 sec)
```


Now we observe the results by selecting (again) from both tables on the replica, as shown here:
```
mysqlR> TABLE t1 ORDER BY a;
+---+-------------+-------+
| a | b | X |
+---+-------------+-------+
```

```
| 1 | Initial X=1 | 1 |
+---+--------------+-------+
| 2 | Source X=20 | 20 |
+---+-------------+-------+
2 rows in set (0.00 sec)
mysqlR> TABLE t2 ORDER BY a;
+---+--------------+-------+
| a | b | X |
+---+-------------+-------+
| 1 | Initial X=1 | 1 |
+---+-------------+-------+
| 1 | Source X=20 | 20 |
+---+-------------+-------+
2 rows in set (0.00 sec)
```


The rows inserted on the source, having greater timestamps than those in the conflicting rows on the replica, have replaced those rows. On the replica, we next insert two new rows which do not conflict with any existing rows in t1 or t2, like this:
```
mysqlR> INSERT INTO t1 VALUES (3, 'Replica X=30', 30);
Query OK, 1 row affected (0.01 sec)
mysqlR> INSERT INTO t2 VALUES (3, 'Replica X=30', 30);
Query OK, 1 row affected (0.01 sec)
```


Inserting more rows on the source with the same primary key value (3) brings about conflicts as before, but this time we use a value for the timestamp column less than that in same column in the conflicting rows on the replica.
```
mysqlS> INSERT INTO t1 VALUES (3, 'Source X=3', 3);
Query OK, 1 row affected (0.01 sec)
mysqlS> INSERT INTO t2 VALUES (3, 'Source X=3', 3);
Query OK, 1 row affected (0.01 sec)
```


We can see by querying the tables that both inserts from the source were rejected by the replica, and the rows inserted on the replica previously have not been overwritten, as shown here in the mysql client on the replica:
```
mysqlR> TABLE t1 ORDER BY a;
+---+---------------+-------+
| a | b | X |
+---+---------------+-------+
| 1 | Initial X=1 | 1 |
+---+---------------+-------+
| 2 | Source X=20 | 20 |
+---+---------------+-------+
| 3 | Replica X=30 | 30 |
+---+---------------+-------+
3 rows in set (0.00 sec)
mysqlR> TABLE t2 ORDER BY a;
+---+---------------+-------+
| a |b | X |
+---+---------------+-------+
| 1 | Initial X=1 | 1 |
+---+---------------+-------+
| 2 | Source X=20 | 20 |
+---+---------------+-------+
| 3 | Replica X=30 | 30 |
+---+---------------+-------+
3 rows in set (0.00 sec)
```


You can see information about the rows that were rejected in the exception tables, as shown here:
```
mysqlR> SELECT NDB$server_id, NDB$source_server_id, NDB$count,
    > NDB$OP_TYPE, NDB$CFT_CAUSE, a
    > FROM t1$EX
    > ORDER BY NDB$count\G
```

```
************************* 1. row
NDB$server_id : 2
NDB$source_server_id: 1
NDB$count : 1
NDB$OP_TYPE : WRITE_ROW
NDB$CFT_CAUSE : DATA_IN_CONFLICT
a : 3
1 row in set (0.00 sec)
mysqlR> SELECT NDB$server_id, NDB$source_server_id, NDB$count,
    > NDB$OP_TYPE, NDB$CFT_CAUSE, a
    > FROM t2$EX
    > ORDER BY NDB$count\G
************************** 1. row ******************************
NDB$server_id : 2
NDB$source_server_id: 1
NDB$count : 1
NDB$OP_TYPE : WRITE_ROW
NDB$CFT_CAUSE : DATA_IN_CONFLICT
a : 3
1 row in set (0.00 sec)
```


As we saw earlier, no other rows inserted on the source were rejected by the replica, only those rows having a lesser timestamp value than the rows in conflict on the replica.

\subsection*{25.8 NDB Cluster Release Notes}

Changes in NDB Cluster releases are documented separately from this reference manual; you can find release notes for NDB Cluster 8.4 NDB 8.4 Release Notes.

You can obtain release notes for older versions of NDB Cluster from NDB Cluster Release Notes.

