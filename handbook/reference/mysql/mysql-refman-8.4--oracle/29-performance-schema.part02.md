\section*{Statement Monitoring}

Statement monitoring begins from the moment the server sees that activity is requested on a thread, to the moment when all activity has ceased. Typically, this means from the time the server gets the
first packet from the client to the time the server has finished sending the response. Statements within stored programs are monitored like other statements.

When the Performance Schema instruments a request (server command or SQL statement), it uses instrument names that proceed in stages from more general (or "abstract") to more specific until it arrives at a final instrument name.

Final instrument names correspond to server commands and SQL statements:
- Server commands correspond to the COM_xxx codes defined in the mysql_com.h header file and processed in sql/sql_parse.cc. Examples are COM_PING and COM_QUIT. Instruments for commands have names that begin with statement/com, such as statement/com/Ping and statement/com/Quit.
- SQL statements are expressed as text, such as DELETE FROM t1 or SELECT * FROM t2. Instruments for SQL statements have names that begin with statement/sql, such as statement/sql/delete and statement/sql/select.

Some final instrument names are specific to error handling:
- statement/com/Error accounts for messages received by the server that are out of band. It can be used to detect commands sent by clients that the server does not understand. This may be helpful for purposes such as identifying clients that are misconfigured or using a version of MySQL more recent than that of the server, or clients that are attempting to attack the server.
- statement/sql/error accounts for SQL statements that fail to parse. It can be used to detect malformed queries sent by clients. A query that fails to parse differs from a query that parses but fails due to an error during execution. For example, SELECT * FROM is malformed, and the statement/sql/error instrument is used. By contrast, SELECT * parses but fails with a No tables used error. In this case, statement/sql/select is used and the statement event contains information to indicate the nature of the error.

A request can be obtained from any of these sources:
- As a command or statement request from a client, which sends the request as packets
- As a statement string read from the relay log on a replica
- As an event from the Event Scheduler

The details for a request are not initially known and the Performance Schema proceeds from abstract to specific instrument names in a sequence that depends on the source of the request.

For a request received from a client:
1. When the server detects a new packet at the socket level, a new statement is started with an abstract instrument name of statement/abstract/new_packet.
2. When the server reads the packet number, it knows more about the type of request received, and the Performance Schema refines the instrument name. For example, if the request is a COM_PING packet, the instrument name becomes statement/com/Ping and that is the final name. If the request is a COM_QUERY packet, it is known to correspond to an SQL statement but not the particular type of statement. In this case, the instrument changes from one abstract name to a more specific but still abstract name, statement/abstract/Query, and the request requires further classification.
3. If the request is a statement, the statement text is read and given to the parser. After parsing, the exact statement type is known. If the request is, for example, an INSERT statement, the Performance Schema refines the instrument name from statement/abstract/Query to statement/sql/insert, which is the final name.

For a request read as a statement from the relay log on a replica:
1. Statements in the relay log are stored as text and are read as such. There is no network protocol, so the statement/abstract/new_packet instrument is not used. Instead, the initial instrument is statement/abstract/relay_log.
2. When the statement is parsed, the exact statement type is known. If the request is, for example, an INSERT statement, the Performance Schema refines the instrument name from statement/ abstract/Query to statement/sql/insert, which is the final name.

The preceding description applies only for statement-based replication. For row-based replication, table I/O done on the replica as it processes row changes can be instrumented, but row events in the relay log do not appear as discrete statements.

For a request received from the Event Scheduler:
The event execution is instrumented using the name statement/scheduler/event. This is the final name.

Statements executed within the event body are instrumented using statement/sql/* names, without use of any preceding abstract instrument. An event is a stored program, and stored programs are precompiled in memory before execution. Consequently, there is no parsing at runtime and the type of each statement is known by the time it executes.

Statements executed within the event body are child statements. For example, if an event executes an INSERT statement, execution of the event itself is the parent, instrumented using statement/ scheduler/event, and the INSERT is the child, instrumented using statement/sql/insert. The parent/child relationship holds between separate instrumented operations. This differs from the sequence of refinement that occurs within a single instrumented operation, from abstract to final instrument names.

For statistics to be collected for statements, it is not sufficient to enable only the final statement/ sql/* instruments used for individual statement types. The abstract statement/abstract/* instruments must be enabled as well. This should not normally be an issue because all statement instruments are enabled by default. However, an application that enables or disables statement instruments selectively must take into account that disabling abstract instruments also disables statistics collection for the individual statement instruments. For example, to collect statistics for INSERT statements, statement/sql/insert must be enabled, but also statement/abstract/ new_packet and statement/abstract/Query. Similarly, for replicated statements to be instrumented, statement/abstract/relay_log must be enabled.

No statistics are aggregated for abstract instruments such as statement/abstract/Query because no statement is ever classified with an abstract instrument as the final statement name.

\subsection*{29.12.6.1 The events_statements_current Table}

The events_statements_current table contains current statement events. The table stores one row per thread showing the current status of the thread's most recent monitored statement event, so there is no system variable for configuring the table size.

Of the tables that contain statement event rows, events_statements_current is the most fundamental. Other tables that contain statement event rows are logically derived from the current events. For example, the events_statements_history and events_statements_history_long tables are collections of the most recent statement events that have ended, up to a maximum number of rows per thread and globally across all threads, respectively.

For more information about the relationship between the three events_statements_xxx event tables, see Section 29.9, "Performance Schema Tables for Current and Historical Events".

For information about configuring whether to collect statement events, see Section 29.12.6, "Performance Schema Statement Event Tables".

The events_statements_current table has these columns:
- THREAD_ID, EVENT_ID

The thread associated with the event and the thread current event number when the event starts. The THREAD_ID and EVENT_ID values taken together uniquely identify the row. No two rows have the same pair of values.
- END_EVENT_ID

This column is set to NULL when the event starts and updated to the thread current event number when the event ends.
- EVENT_NAME

The name of the instrument from which the event was collected. This is a NAME value from the setup_instruments table. Instrument names may have multiple parts and form a hierarchy, as discussed in Section 29.6, "Performance Schema Instrument Naming Conventions".

For SQL statements, the EVENT_NAME value initially is statement/com/Query until the statement is parsed, then changes to a more appropriate value, as described in Section 29.12.6, "Performance Schema Statement Event Tables".
- SOURCE

The name of the source file containing the instrumented code that produced the event and the line number in the file at which the instrumentation occurs. This enables you to check the source to determine exactly what code is involved.
- TIMER_START, TIMER_END, TIMER_WAIT

Timing information for the event. The unit for these values is picoseconds (trillionths of a second). The TIMER_START and TIMER_END values indicate when event timing started and ended. TIMER_WAIT is the event elapsed time (duration).

If an event has not finished, TIMER_END is the current timer value and TIMER_WAIT is the time elapsed so far (TIMER_END - TIMER_START).

If an event is produced from an instrument that has TIMED $=$ NO, timing information is not collected, and TIMER_START, TIMER_END, and TIMER_WAIT are all NULL.

For discussion of picoseconds as the unit for event times and factors that affect time values, see Section 29.4.1, "Performance Schema Event Timing".
- LOCK_TIME

The time spent waiting for table locks. This value is computed in microseconds but normalized to picoseconds for easier comparison with other Performance Schema timers.
- SQL_TEXT

The text of the SQL statement. For a command not associated with an SQL statement, the value is NULL.

The maximum space available for statement display is 1024 bytes by default. To change this value, set the performance_schema_max_sql_text_length system variable at server startup. (Changing this value affects columns in other Performance Schema tables as well. See Section 29.10, "Performance Schema Statement Digests and Sampling".)
- DIGEST

The statement digest SHA-256 value as a string of 64 hexadecimal characters, or NULL if the statements_digest consumer is no. For more information about statement digesting, see Section 29.10, "Performance Schema Statement Digests and Sampling".
- DIGEST_TEXT

The normalized statement digest text, or NULL if the statements_digest consumer is no. For more information about statement digesting, see Section 29.10, "Performance Schema Statement Digests and Sampling".

The performance_schema_max_digest_length system variable determines the maximum number of bytes available per session for digest value storage. However, the display length of statement digests may be longer than the available buffer size due to encoding of statement elements such as keywords and literal values in digest buffer. Consequently, values selected from the DIGEST_TEXT column of statement event tables may appear to exceed the performance_schema_max_digest_length value.
- CURRENT_SCHEMA

The default database for the statement, NULL if there is none.
- OBJECT_SCHEMA, OBJECT_NAME, OBJECT_TYPE

For nested statements (stored programs), these columns contain information about the parent statement. Otherwise they are NULL.
- OBJECT_INSTANCE_BEGIN

This column identifies the statement. The value is the address of an object in memory.
- MYSQL_ERRNO

The statement error number, from the statement diagnostics area.
- RETURNED_SQLSTATE

The statement SQLSTATE value, from the statement diagnostics area.
- MESSAGE_TEXT

The statement error message, from the statement diagnostics area.
- ERRORS

Whether an error occurred for the statement. The value is 0 if the SQLSTATE value begins with 00 (completion) or 01 (warning). The value is 1 is the SQLSTATE value is anything else.
- WARNINGS

The number of warnings, from the statement diagnostics area.
- ROWS_AFFECTED

The number of rows affected by the statement. For a description of the meaning of "affected," see mysql_affected_rows().
- ROWS_SENT

The number of rows returned by the statement.
- ROWS_EXAMINED

The number of rows examined by the server layer (not counting any processing internal to storage engines).
- CREATED_TMP_DISK_TABLES

Like the Created_tmp_disk_tables status variable, but specific to the statement.
- CREATED_TMP_TABLES

Like the Created_tmp_tables status variable, but specific to the statement.
- SELECT_FULL_JOIN

Like the Select_full_join status variable, but specific to the statement.
- SELECT_FULL_RANGE_JOIN

Like the Select_full_range_join status variable, but specific to the statement.
- SELECT_RANGE

Like the Select_range status variable, but specific to the statement.
- SELECT_RANGE_CHECK

Like the Select_range_check status variable, but specific to the statement.
- SELECT_SCAN

Like the Select_scan status variable, but specific to the statement.
- SORT_MERGE_PASSES

Like the Sort_merge_passes status variable, but specific to the statement.
- SORT_RANGE

Like the Sort_range status variable, but specific to the statement.
- SORT_ROWS

Like the Sort_rows status variable, but specific to the statement.
- SORT_SCAN

Like the Sort_scan status variable, but specific to the statement.
- NO_INDEX_USED

1 if the statement performed a table scan without using an index, 0 otherwise.
- NO_GOOD_INDEX_USED

1 if the server found no good index to use for the statement, 0 otherwise. For additional information, see the description of the Extra column from EXPLAIN output for the Range checked for each record value in Section 10.8.2, "EXPLAIN Output Format".
- NESTING_EVENT_ID, NESTING_EVENT_TYPE, NESTING_EVENT_LEVEL

These three columns are used with other columns to provide information as follows for top-level (unnested) statements and nested statements (executed within a stored program).

For top level statements:
```
OBJECT_TYPE = NULL
OBJECT_SCHEMA = NULL
OBJECT_NAME = NULL
NESTING_EVENT_ID = the parent transaction EVENT_ID
NESTING_EVENT_TYPE = 'TRANSACTION'
NESTING_LEVEL = 0
```


For nested statements:
```
OBJECT_TYPE = the parent statement object type
OBJECT_SCHEMA = the parent statement object schema
OBJECT_NAME = the parent statement object name
NESTING_EVENT_ID = the parent statement EVENT_ID
NESTING_EVENT_TYPE = 'STATEMENT'
NESTING_LEVEL = the parent statement NESTING_LEVEL plus one
```

- STATEMENT_ID

The query ID maintained by the server at the SQL level. The value is unique for the server instance because these IDs are generated using a global counter that is incremented atomically.
- CPU_TIME

The time spent on CPU for the current thread, expressed in picoseconds.
- MAX_CONTROLLED_MEMORY

Reports the maximum amount of controlled memory used by a statement during execution.
- MAX_TOTAL_MEMORY

Reports the maximum amount of memory used by a statement during execution.
- EXECUTION_ENGINE

The query execution engine. The value is either PRIMARY or SECONDARY. For use with MySQL HeatWave Service and MySQL HeatWave, where the PRIMARY engine is InnoDB and the SECONDARY engine is MySQL HeatWave (RAPID). For MySQL Community Edition Server, MySQL Enterprise Edition Server (on-premise), and MySQL HeatWave Service without MySQL HeatWave, the value is always PRIMARY.

The events_statements_current table has these indexes:
- Primary key on (THREAD_ID, EVENT_ID)

TRUNCATE TABLE is permitted for the events_statements_current table. It removes the rows.

\subsection*{29.12.6.2 The events_statements_history Table}

The events_statements_history table contains the $N$ most recent statement events that have ended per thread. Statement events are not added to the table until they have ended. When the table contains the maximum number of rows for a given thread, the oldest thread row is discarded when a new row for that thread is added. When a thread ends, all its rows are discarded.

The Performance Schema autosizes the value of $N$ during server startup. To set the number of rows per thread explicitly, set the performance_schema_events_statements_history_size system variable at server startup.

The events_statements_history table has the same columns and indexing as events_statements_current. See Section 29.12.6.1, "The events_statements_current Table".

TRUNCATE TABLE is permitted for the events_statements_history table. It removes the rows.
For more information about the relationship between the three events_statements_xxx event tables, see Section 29.9, "Performance Schema Tables for Current and Historical Events".

For information about configuring whether to collect statement events, see Section 29.12.6, "Performance Schema Statement Event Tables".

\subsection*{29.12.6.3 The events_statements_history_long Table}

The events_statements_history_long table contains the $N$ most recent statement events that have ended globally, across all threads. Statement events are not added to the table until they have ended. When the table becomes full, the oldest row is discarded when a new row is added, regardless of which thread generated either row.

The value of $N$ is autosized at server startup. To set the table size explicitly, set the performance_schema_events_statements_history_long_size system variable at server startup.

The events_statements_history_long table has the same columns as events_statements_current. See Section 29.12.6.1, "The events_statements_current Table". Unlike events_statements_current, events_statements_history_long has no indexing.

TRUNCATE TABLE is permitted for the events_statements_history_long table. It removes the rows.

For more information about the relationship between the three events_statements_xxx event tables, see Section 29.9, "Performance Schema Tables for Current and Historical Events".

For information about configuring whether to collect statement events, see Section 29.12.6, "Performance Schema Statement Event Tables".

\subsection*{29.12.6.4 The prepared_statements_instances Table}

The Performance Schema provides instrumentation for prepared statements, for which there are two protocols:
- The binary protocol. This is accessed through the MySQL C API and maps onto underlying server commands as shown in the following table.

\begin{tabular}{|l|l|}
\hline C API Function & Corresponding Server Command \\
\hline mysql_stmt_prepare( ) & COM_STMT_PREPARE \\
\hline mysql_stmt_execute( ) & COM_STMT_EXECUTE \\
\hline mysql_stmt_close( ) & COM_STMT_CLOSE \\
\hline
\end{tabular}
- The text protocol. This is accessed using SQL statements and maps onto underlying server commands as shown in the following table.

\begin{tabular}{|l|l|}
\hline SQL Statement & Corresponding Server Command \\
\hline PREPARE & SQLCOM_PREPARE \\
\hline EXECUTE & SQLCOM_EXECUTE \\
\hline DEALLOCATE PREPARE, DROP PREPARE & SQLCOM_DEALLOCATE PREPARE \\
\hline
\end{tabular}

Performance Schema prepared statement instrumentation covers both protocols. The following discussion refers to the server commands rather than the C API functions or SQL statements.

Information about prepared statements is available in the prepared_statements_instances table. This table enables inspection of prepared statements used in the server and provides aggregated statistics about them. To control the size of this table, set the performance_schema_max_prepared_statements_instances system variable at server startup.

Collection of prepared statement information depends on the statement instruments shown in the following table. These instruments are enabled by default. To modify them, update the setup_instruments table.

\begin{tabular}{|l|l|}
\hline Instrument & Server Command \\
\hline statement/com/Prepare & COM_STMT_PREPARE \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Instrument & Server Command \\
\hline statement/com/Execute & COM_STMT_EXECUTE \\
\hline statement/sql/prepare_sql & SQLCOM_PREPARE \\
\hline statement/sql/execute_sql & SQLCOM_EXECUTE \\
\hline
\end{tabular}

The Performance Schema manages the contents of the prepared_statements_instances table as follows:
- Statement preparation

A COM_STMT_PREPARE or SQLCOM_PREPARE command creates a prepared statement in the server. If the statement is successfully instrumented, a new row is added to the prepared_statements_instances table. If the statement cannot be instrumented, Performance_schema_prepared_statements_lost status variable is incremented.
- Prepared statement execution

Execution of a COM_STMT_EXECUTE or SQLCOM_PREPARE command for an instrumented prepared statement instance updates the corresponding prepared_statements_instances table row.
- Prepared statement deallocation

Execution of a COM_STMT_CLOSE or SQLCOM_DEALLOCATE_PREPARE command for an instrumented prepared statement instance removes the corresponding prepared_statements_instances table row. To avoid resource leaks, removal occurs even if the prepared statement instruments described previously are disabled.

The prepared_statements_instances table has these columns:
- OBJECT_INSTANCE_BEGIN

The address in memory of the instrumented prepared statement.
- STATEMENT_ID

The internal statement ID assigned by the server. The text and binary protocols both use statement IDs.
- STATEMENT_NAME

For the binary protocol, this column is NULL. For the text protocol, this column is the external statement name assigned by the user. For example, for the following SQL statement, the name of the prepared statement is stmt:

PREPARE stmt FROM 'SELECT 1';
- SQL_TEXT

The prepared statement text, with? placeholder markers.
- OWNER_THREAD_ID, OWNER_EVENT_ID

These columns indicate the event that created the prepared statement.
- OWNER_OBJECT_TYPE, OWNER_OBJECT_SCHEMA, OWNER_OBJECT_NAME

For a prepared statement created by a client session, these columns are NULL. For a prepared statement created by a stored program, these columns point to the stored program. A typical user error is forgetting to deallocate prepared statements. These columns can be used to find stored programs that leak prepared statements:

\section*{SELECT}
```
    OWNER_OBJECT_TYPE, OWNER_OBJECT_SCHEMA, OWNER_OBJECT_NAME,
    STATEMENT_NAME, SQL_TEXT
FROM performance_schema.prepared_statements_instances
WHERE OWNER_OBJECT_TYPE IS NOT NULL;
```

- The query execution engine. The value is either PRIMARY or SECONDARY. For use with MySQL HeatWave Service and MySQL HeatWave, where the PRIMARY engine is InnoDB and the SECONDARY engine is MySQL HeatWave (RAPID). For MySQL Community Edition Server, MySQL Enterprise Edition Server (on-premise), and MySQL HeatWave Service without MySQL HeatWave, the value is always PRIMARY.
- TIMER_PREPARE

The time spent executing the statement preparation itself.
- COUNT_REPREPARE

The number of times the statement was reprepared internally (see Section 10.10.3, "Caching of Prepared Statements and Stored Programs"). Timing statistics for repreparation are not available because it is counted as part of statement execution, not as a separate operation.
- COUNT_EXECUTE, SUM_TIMER_EXECUTE, MIN_TIMER_EXECUTE, AVG_TIMER_EXECUTE, MAX_TIMER_EXECUTE

Aggregated statistics for executions of the prepared statement.
- SUM_xxx

The remaining SUM_xxx columns are the same as for the statement summary tables (see Section 29.12.20.3, "Statement Summary Tables").
- MAX_CONTROLLED_MEMORY

Reports the maximum amount of controlled memory used by a prepared statement during execution.
- MAX_TOTAL_MEMORY

Reports the maximum amount of memory used by a prepared statement during execution.
The prepared_statements_instances table has these indexes:
- Primary key on (OBJECT_INSTANCE_BEGIN)
- Index on (STATEMENT_ID)
- Index on (STATEMENT_NAME)
- Index on (OWNER_THREAD_ID, OWNER_EVENT_ID)
- Index on (OWNER_OBJECT_TYPE, OWNER_OBJECT_SCHEMA, OWNER_OBJECT_NAME)

TRUNCATE TABLE resets the statistics columns of the prepared_statements_instances table.

\subsection*{29.12.7 Performance Schema Transaction Tables}

The Performance Schema instruments transactions. Within the event hierarchy, wait events nest within stage events, which nest within statement events, which nest within transaction events.

These tables store transaction events:
- events_transactions_current: The current transaction event for each thread.
- events_transactions_history: The most recent transaction events that have ended per thread.
- events_transactions_history_long: The most recent transaction events that have ended globally (across all threads).

The following sections describe the transaction event tables. There are also summary tables that aggregate information about transaction events; see Section 29.12.20.5, "Transaction Summary Tables".

For more information about the relationship between the three transaction event tables, see Section 29.9, "Performance Schema Tables for Current and Historical Events".
- Configuring Transaction Event Collection
- Transaction Boundaries
- Transaction Instrumentation
- Transactions and Nested Events
- Transactions and Stored Programs
- Transactions and Savepoints
- Transactions and Errors

\section*{Configuring Transaction Event Collection}

To control whether to collect transaction events, set the state of the relevant instruments and consumers:
- The setup_instruments table contains an instrument named transaction. Use this instrument to enable or disable collection of individual transaction event classes.
- The setup_consumers table contains consumer values with names corresponding to the current and historical transaction event table names. Use these consumers to filter collection of transaction events.

The transaction instrument and the events_transactions_current and events_transactions_history transaction consumers are enabled by default:
```
mysql> SELECT NAME, ENABLED, TIMED
    FROM performance_schema.setup_instruments
    WHERE NAME = 'transaction';
+--------------+---------+-------+
| NAME | ENABLED | TIMED |
+--------------+---------+-------+
| transaction | YES | YES |
+--------------+---------+-------+
mysql> SELECT *
    FROM performance_schema.setup_consumers
    WHERE NAME LIKE 'events_transactions%';
+------------------------------------+---------+
| NAME | ENABLED |
+-----------------------------------+---------+
| events_transactions_current | YES |
| events_transactions_history | YES |
| events_transactions_history_long | NO |
```


To control transaction event collection at server startup, use lines like these in your my.cnf file:
- Enable:
```
[mysqld]
performance-schema-instrument='transaction=ON'
performance-schema-consumer-events-transactions-current=ON
performance-schema-consumer-events-transactions-history=ON
```

```
performance-schema-consumer-events-transactions-history-long=ON
```

- Disable:
```
[mysqld]
performance-schema-instrument='transaction=OFF'
performance-schema-consumer-events-transactions-current=OFF
performance-schema-consumer-events-transactions-history=0FF
performance-schema-consumer-events-transactions-history-long=OFF
```


To control transaction event collection at runtime, update the setup_instruments and setup_consumers tables:
- Enable:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME = 'transaction';
UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES'
WHERE NAME LIKE 'events_transactions%';
```

- Disable:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = 'NO', TIMED = 'NO'
WHERE NAME = 'transaction';
UPDATE performance_schema.setup_consumers
SET ENABLED = 'NO'
WHERE NAME LIKE 'events_transactions%';
```


To collect transaction events only for specific transaction event tables, enable the transaction instrument but only the transaction consumers corresponding to the desired tables.

For additional information about configuring event collection, see Section 29.3, "Performance Schema Startup Configuration", and Section 29.4, "Performance Schema Runtime Configuration".

\section*{Transaction Boundaries}

In MySQL Server, transactions start explicitly with these statements:
START TRANSACTION | BEGIN | XA START | XA BEGIN
Transactions also start implicitly. For example, when the autocommit system variable is enabled, the start of each statement starts a new transaction.

When autocommit is disabled, the first statement following a committed transaction marks the start of a new transaction. Subsequent statements are part of the transaction until it is committed.

Transactions explicitly end with these statements:
COMMIT | ROLLBACK | XA COMMIT | XA ROLLBACK
Transactions also end implicitly, by execution of DDL statements, locking statements, and server administration statements.

In the following discussion, references to START TRANSACTION also apply to BEGIN, XA START, and XA BEGIN. Similarly, references to COMMIT and ROLLBACK apply to XA COMMIT and XA ROLLBACK, respectively.

The Performance Schema defines transaction boundaries similarly to that of the server. The start and end of a transaction event closely match the corresponding state transitions in the server:
- For an explicitly started transaction, the transaction event starts during processing of the START TRANSACTION statement.
- For an implicitly started transaction, the transaction event starts on the first statement that uses a transactional engine after the previous transaction has ended.
- For any transaction, whether explicitly or implicitly ended, the transaction event ends when the server transitions out of the active transaction state during the processing of COMMIT or ROLLBACK.

There are subtle implications to this approach:
- Transaction events in the Performance Schema do not fully include the statement events associated with the corresponding START TRANSACTION, COMMIT, or ROLLBACK statements. There is a trivial amount of timing overlap between the transaction event and these statements.
- Statements that work with nontransactional engines have no effect on the transaction state of the connection. For implicit transactions, the transaction event begins with the first statement that uses a transactional engine. This means that statements operating exclusively on nontransactional tables are ignored, even following START TRANSACTION.

To illustrate, consider the following scenario:
```
1. SET autocommit = OFF;
2. CREATE TABLE t1 (a INT) ENGINE = InnoDB;
3. START TRANSACTION; -- Transaction 1 START
4. INSERT INTO t1 VALUES (1), (2), (3);
5. CREATE TABLE t2 (a INT) ENGINE = MyISAM; -- Transaction 1 COMMIT
    -- (implicit; DDL forces commit)
6. INSERT INTO t2 VALUES (1), (2), (3); -- Update nontransactional table
7. UPDATE t2 SET a = a + 1; -- ... and again
8. INSERT INTO t1 VALUES (4), (5), (6); -- Write to transactional table
    -- Transaction 2 START (implicit)
9. COMMIT; -- Transaction 2 COMMIT
```


From the perspective of the server, Transaction 1 ends when table t2 is created. Transaction 2 does not start until a transactional table is accessed, despite the intervening updates to nontransactional tables.

From the perspective of the Performance Schema, Transaction 2 starts when the server transitions into an active transaction state. Statements 6 and 7 are not included within the boundaries of Transaction 2, which is consistent with how the server writes transactions to the binary log.

\section*{Transaction Instrumentation}

Three attributes define transactions:
- Access mode (read only, read write)
- Isolation level (SERIALIZABLE, REPEATABLE READ, and so forth)
- Implicit (autocommit enabled) or explicit (autocommit disabled)

To reduce complexity of the transaction instrumentation and to ensure that the collected transaction data provides complete, meaningful results, all transactions are instrumented independently of access mode, isolation level, or autocommit mode.

To selectively examine transaction history, use the attribute columns in the transaction event tables: ACCESS_MODE, ISOLATION_LEVEL, and AUTOCOMMIT.

The cost of transaction instrumentation can be reduced various ways, such as enabling or disabling transaction instrumentation according to user, account, host, or thread (client connection).

\section*{Transactions and Nested Events}

The parent of a transaction event is the event that initiated the transaction. For an explicitly started transaction, this includes the START TRANSACTION and COMMIT AND CHAIN statements. For an
implicitly started transaction, it is the first statement that uses a transactional engine after the previous transaction ends.

In general, a transaction is the top-level parent to all events initiated during the transaction, including statements that explicitly end the transaction such as COMMIT and ROLLBACK. Exceptions are statements that implicitly end a transaction, such as DDL statements, in which case the current transaction must be committed before the new statement is executed.

\section*{Transactions and Stored Programs}

Transactions and stored program events are related as follows:
- Stored Procedures

Stored procedures operate independently of transactions. A stored procedure can be started within a transaction, and a transaction can be started or ended from within a stored procedure. If called from within a transaction, a stored procedure can execute statements that force a commit of the parent transaction and then start a new transaction.

If a stored procedure is started within a transaction, that transaction is the parent of the stored procedure event.

If a transaction is started by a stored procedure, the stored procedure is the parent of the transaction event.
- Stored Functions

Stored functions are restricted from causing an explicit or implicit commit or rollback. Stored function events can reside within a parent transaction event.
- Triggers

Triggers activate as part of a statement that accesses the table with which it is associated, so the parent of a trigger event is always the statement that activates it.

Triggers cannot issue statements that cause an explicit or implicit commit or rollback of a transaction.
- Scheduled Events

The execution of the statements in the body of a scheduled event takes place in a new connection. Nesting of a scheduled event within a parent transaction is not applicable.

\section*{Transactions and Savepoints}

Savepoint statements are recorded as separate statement events. Transaction events include separate counters for SAVEPOINT, ROLLBACK TO SAVEPOINT, and RELEASE SAVEPOINT statements issued during the transaction.

\section*{Transactions and Errors}

Errors and warnings that occur within a transaction are recorded in statement events, but not in the corresponding transaction event. This includes transaction-specific errors and warnings, such as a rollback on a nontransactional table or GTID consistency errors.

\subsection*{29.12.7.1 The events_transactions_current Table}

The events_transactions_current table contains current transaction events. The table stores one row per thread showing the current status of the thread's most recent monitored transaction event, so there is no system variable for configuring the table size. For example:
```
mysql> SELECT *
    FROM performance_schema.events_transactions_current LIMIT 1\G
```

```
*************************** 1. rOW ****************************************
                        THREAD_ID: 26
                            EVENT_ID: 7
                    END_EVENT_ID: NULL
                        EVENT_NAME: transaction
                                        STATE: ACTIVE
                                    TRX_ID: NULL
                                        GTID: 3E11FA47-71CA-11E1-9E33-C80AA9429562:56
                                            XID: NULL
                                XA_STATE: NULL
                                    SOURCE: transaction.cc:150
                        TIMER_START: 420833537900000
                                TIMER_END: NULL
                            TIMER_WAIT: NULL
                        ACCESS_MODE: READ WRITE
                    ISOLATION_LEVEL: REPEATABLE READ
                            AUTOCOMMIT: NO
            NUMBER_OF_SAVEPOINTS: 0
NUMBER_OF_ROLLBACK_TO_SAVEPOINT: 0
    NUMBER_OF_RELEASE_SAVEPOINT: 0
        OBJECT_INSTANCE_BEGIN: NULL
                    NESTING_EVENT_ID: 6
                NESTING_EVENT_TYPE: STATEMENT
```


Of the tables that contain transaction event rows, events_transactions_current is the most fundamental. Other tables that contain transaction event rows are logically derived from the current events. For example, the events_transactions_history and events_transactions_history_long tables are collections of the most recent transaction events that have ended, up to a maximum number of rows per thread and globally across all threads, respectively.

For more information about the relationship between the three transaction event tables, see Section 29.9, "Performance Schema Tables for Current and Historical Events".

For information about configuring whether to collect transaction events, see Section 29.12.7, "Performance Schema Transaction Tables".

The events_transactions_current table has these columns:
- THREAD_ID, EVENT_ID

The thread associated with the event and the thread current event number when the event starts. The THREAD_ID and EVENT_ID values taken together uniquely identify the row. No two rows have the same pair of values.
- END_EVENT_ID

This column is set to NULL when the event starts and updated to the thread current event number when the event ends.
- EVENT_NAME

The name of the instrument from which the event was collected. This is a NAME value from the setup_instruments table. Instrument names may have multiple parts and form a hierarchy, as discussed in Section 29.6, "Performance Schema Instrument Naming Conventions".
- STATE

The current transaction state. The value is ACTIVE (after START TRANSACTION or BEGIN), COMMITTED (after COMMIT), or ROLLED BACK (after ROLLBACK).
- TRX_ID

Unused.
- GTID

The GTID column contains the value of gtid_next, which can be one of ANONYMOUS, AUTOMATIC, or a GTID using the format UUID : NUMBER. For transactions that use gtid_next=AUTOMATIC, which is all normal client transactions, the GTID column changes when the transaction commits and the actual GTID is assigned. If gtid_mode is either ON or ON_PERMISSIVE, the GTID column changes to the transaction's GTID. If gtid_mode is either OFF or OFF_PERMISSIVE, the GTID column changes to ANONYMOUS.
- XID_FORMAT_ID, XID_GTRID, and XID_BQUAL

The elements of the XA transaction identifier. They have the format described in Section 15.3.8.1, "XA Transaction SQL Statements".
- XA_STATE

The state of the XA transaction. The value is ACTIVE (after XA START), IDLE (after XA END), PREPARED (after XA PREPARE), ROLLED BACK (after XA ROLLBACK), or COMMITTED (after XA COMMIT).

On a replica, the same XA transaction can appear in the events_transactions_current table with different states on different threads. This is because immediately after the XA transaction is prepared, it is detached from the replica's applier thread, and can be committed or rolled back by any thread on the replica. The events_transactions_current table displays the current status of the most recent monitored transaction event on the thread, and does not update this status when the thread is idle. So the XA transaction can still be displayed in the PREPARED state for the original applier thread, after it has been processed by another thread. To positively identify XA transactions that are still in the PREPARED state and need to be recovered, use the XA RECOVER statement rather than the Performance Schema transaction tables.
- SOURCE

The name of the source file containing the instrumented code that produced the event and the line number in the file at which the instrumentation occurs. This enables you to check the source to determine exactly what code is involved.
- TIMER_START, TIMER_END, TIMER_WAIT

Timing information for the event. The unit for these values is picoseconds (trillionths of a second).
The TIMER_START and TIMER_END values indicate when event timing started and ended.
TIMER_WAIT is the event elapsed time (duration).
If an event has not finished, TIMER_END is the current timer value and TIMER_WAIT is the time elapsed so far (TIMER_END - TIMER_START).

If an event is produced from an instrument that has TIMED $=$ NO, timing information is not collected, and TIMER_START, TIMER_END, and TIMER_WAIT are all NULL.

For discussion of picoseconds as the unit for event times and factors that affect time values, see Section 29.4.1, "Performance Schema Event Timing".
- ACCESS_MODE

The transaction access mode. The value is READ WRITE or READ ONLY.
- ISOLATION_LEVEL

The transaction isolation level. The value is REPEATABLE READ, READ COMMITTED, READ UNCOMMITTED, or SERIALIZABLE.
- AUTOCOMMIT

Whether autocommit mode was enabled when the transaction started.
- NUMBER_OF_SAVEPOINTS, NUMBER_OF_ROLLBACK_TO_SAVEPOINT, NUMBER_OF_RELEASE_SAVEPOINT

The number of SAVEPOINT, ROLLBACK TO SAVEPOINT, and RELEASE SAVEPOINT statements issued during the transaction.
- OBJECT_INSTANCE_BEGIN

Unused.
- NESTING_EVENT_ID

The EVENT_ID value of the event within which this event is nested.
- NESTING_EVENT_TYPE

The nesting event type. The value is TRANSACTION, STATEMENT, STAGE, or WAIT. (TRANSACTION does not appear because transactions cannot be nested.)

The events_transactions_current table has these indexes:
- Primary key on (THREAD_ID, EVENT_ID)

TRUNCATE TABLE is permitted for the events_transactions_current table. It removes the rows.

\subsection*{29.12.7.2 The events_transactions_history Table}

The events_transactions_history table contains the $N$ most recent transaction events that have ended per thread. Transaction events are not added to the table until they have ended. When the table contains the maximum number of rows for a given thread, the oldest thread row is discarded when a new row for that thread is added. When a thread ends, all its rows are discarded.

The Performance Schema autosizes the value of $N$ during server startup. To set the number of rows per thread explicitly, set the performance_schema_events_transactions_history_size system variable at server startup.

The events_transactions_history table has the same columns and indexing as events_transactions_current. See Section 29.12.7.1, "The events_transactions_current Table".

TRUNCATE TABLE is permitted for the events_transactions_history table. It removes the rows.
For more information about the relationship between the three transaction event tables, see Section 29.9, "Performance Schema Tables for Current and Historical Events".

For information about configuring whether to collect transaction events, see Section 29.12.7, "Performance Schema Transaction Tables".

\subsection*{29.12.7.3 The events_transactions_history_long Table}

The events_transactions_history_long table contains the $N$ most recent transaction events that have ended globally, across all threads. Transaction events are not added to the table until they have ended. When the table becomes full, the oldest row is discarded when a new row is added, regardless of which thread generated either row.

The Performance Schema autosizes the value of $N$ is autosized at server startup. To set the table size explicitly, set the performance_schema_events_transactions_history_long_size system variable at server startup.

The events_transactions_history_long table has the same columns as events_transactions_current. See Section 29.12.7.1, "The events_transactions_current Table". Unlike events_transactions_current, events_transactions_history_long has no indexing.

TRUNCATE TABLE is permitted for the events_transactions_history_long table. It removes the rows.

For more information about the relationship between the three transaction event tables, see Section 29.9, "Performance Schema Tables for Current and Historical Events".

For information about configuring whether to collect transaction events, see Section 29.12.7, "Performance Schema Transaction Tables".

\subsection*{29.12.8 Performance Schema Connection Tables}

When a client connects to the MySQL server, it does so under a particular user name and from a particular host. The Performance Schema provides statistics about these connections, tracking them per account (user and host combination) as well as separately per user name and host name, using these tables:
- accounts: Connection statistics per client account
- hosts: Connection statistics per client host name
- users: Connection statistics per client user name

The meaning of "account" in the connection tables is similar to its meaning in the MySQL grant tables in the mysql system database, in the sense that the term refers to a combination of user and host values. They differ in that, for grant tables, the host part of an account can be a pattern, whereas for Performance Schema tables, the host value is always a specific nonpattern host name.

Each connection table has CURRENT_CONNECTIONS and TOTAL_CONNECTIONS columns to track the current and total number of connections per "tracking value" on which its statistics are based. The tables differ in what they use for the tracking value. The accounts table has USER and HOST columns to track connections per user and host combination. The users and hosts tables have a USER and HOST column, respectively, to track connections per user name and host name.

The Performance Schema also counts internal threads and threads for user sessions that failed to authenticate, using rows with USER and HOST column values of NULL.

Suppose that clients named user1 and user2 each connect one time from hosta and hostb. The Performance Schema tracks the connections as follows:
- The accounts table has four rows, for the user1/hosta, user1/hostb, user2/hosta, and user2/hostb account values, each row counting one connection per account.
- The hosts table has two rows, for hosta and hostb, each row counting two connections per host name.
- The users table has two rows, for user1 and user2, each row counting two connections per user name.

When a client connects, the Performance Schema determines which row in each connection table applies, using the tracking value appropriate to each table. If there is no such row, one is added. Then the Performance Schema increments by one the CURRENT_CONNECTIONS and TOTAL_CONNECTIONS columns in that row.

When a client disconnects, the Performance Schema decrements by one the CURRENT_CONNECTIONS column in the row and leaves the TOTAL_CONNECTIONS column unchanged.

TRUNCATE TABLE is permitted for connection tables. It has these effects:
- Rows are removed for accounts, hosts, or users that have no current connections (rows with CURRENT_CONNECTIONS = 0).
- Nonremoved rows are reset to count only current connections: For rows with CURRENT_CONNECTIONS > 0, TOTAL_CONNECTIONS is reset to CURRENT_CONNECTIONS.
- Summary tables that depend on the connection table are implicitly truncated, as described later in this section.

The Performance Schema maintains summary tables that aggregate connection statistics for various event types by account, host, or user. These tables have __summary_by_account, _summary_by_host, or_summary_by_user in the name. To identify them, use this query:
```
mysql> SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'performance_schema'
    AND TABLE_NAME REGEXP '_summary_by_(account|host|user)'
    ORDER BY TABLE_NAME;
+---------------------------------------------------------
| TABLE_NAME |
+---------------------------------------------------------
| events_errors_summary_by_account_by_error |
| events_errors_summary_by_host_by_error
| events_errors_summary_by_user_by_error
| events_stages_summary_by_account_by_event_name
| events_stages_summary_by_host_by_event_name
| events_stages_summary_by_user_by_event_name
| events_statements_summary_by_account_by_event_name
| events_statements_summary_by_host_by_event_name
| events_statements_summary_by_user_by_event_name
| events_transactions_summary_by_account_by_event_name
| events_transactions_summary_by_host_by_event_name
| events_transactions_summary_by_user_by_event_name
| events_waits_summary_by_account_by_event_name
| events_waits_summary_by_host_by_event_name
| events_waits_summary_by_user_by_event_name
| memory_summary_by_account_by_event_name
| memory_summary_by_host_by_event_name
| memory_summary_by_user_by_event_name
```


For details about individual connection summary tables, consult the section that describes tables for the summarized event type:
- Wait event summaries: Section 29.12.20.1, "Wait Event Summary Tables"
- Stage event summaries: Section 29.12.20.2, "Stage Summary Tables"
- Statement event summaries: Section 29.12.20.3, "Statement Summary Tables"
- Transaction event summaries: Section 29.12.20.5, "Transaction Summary Tables"
- Memory event summaries: Section 29.12.20.10, "Memory Summary Tables"
- Error event summaries: Section 29.12.20.11, "Error Summary Tables"

TRUNCATE TABLE is permitted for connection summary tables. It removes rows for accounts, hosts, or users with no connections, and resets the summary columns to zero for the remaining rows. In addition, each summary table that is aggregated by account, host, user, or thread is implicitly truncated by truncation of the connection table on which it depends. The following table describes the relationship between connection table truncation and implicitly truncated tables.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 29.2 Implicit Effects of Connection Table Truncation}
\begin{tabular}{|l|l|}
\hline Truncated Connection Table & Implicitly Truncated Summary Tables \\
\hline accounts & Tables with names containing \\
& _summary_by_account, \\
_summary_by_thread \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Truncated Connection Table & Implicitly Truncated Summary Tables \\
\hline hosts & \begin{tabular}{l}
Tables with names containing \\
summary_by_account,_summary_by_host, summary_by_thread
\end{tabular} \\
\hline users & Tables with names containing summary_by_account,_summary_by_user, summary_by_thread \\
\hline
\end{tabular}

Truncating a _summary_global summary table also implicitly truncates its corresponding connection and thread summary tables. For example, truncating events_waits_summary_global_by_event_name implicitly truncates the wait event summary tables that are aggregated by account, host, user, or thread.

\subsection*{29.12.8.1 The accounts Table}

The accounts table contains a row for each account that has connected to the MySQL server. For each account, the table counts the current and total number of connections. The table size is autosized at server startup. To set the table size explicitly, set the performance_schema_accounts_size system variable at server startup. To disable account statistics, set this variable to 0 .

The accounts table has the following columns. For a description of how the Performance Schema maintains rows in this table, including the effect of TRUNCATE TABLE, see Section 29.12.8, "Performance Schema Connection Tables".
- USER

The client user name for the connection. This is NULL for an internal thread, or for a user session that failed to authenticate.
- HOST

The host from which the client connected. This is NULL for an internal thread, or for a user session that failed to authenticate.
- CURRENT_CONNECTIONS

The current number of connections for the account.
- TOTAL_CONNECTIONS

The total number of connections for the account.
- MAX_SESSION_CONTROLLED_MEMORY

Reports the maximum amount of controlled memory used by a session belonging to the account.
- MAX_SESSION_TOTAL_MEMORY

Reports the maximum amount of memory used by a session belonging to the account.
The accounts table has these indexes:
- Primary key on (USER, HOST)

\subsection*{29.12.8.2 The hosts Table}

The hosts table contains a row for each host from which clients have connected to the MySQL server. For each host name, the table counts the current and total number of connections. The table size is autosized at server startup. To set the table size explicitly, set the performance_schema_hosts_size system variable at server startup. To disable host statistics, set this variable to 0 .

The hosts table has the following columns. For a description of how the Performance Schema maintains rows in this table, including the effect of TRUNCATE TABLE, see Section 29.12.8, "Performance Schema Connection Tables".
- HOST

The host from which the client connected. This is NULL for an internal thread, or for a user session that failed to authenticate.
- CURRENT_CONNECTIONS

The current number of connections for the host.
- TOTAL_CONNECTIONS

The total number of connections for the host.
- MAX_SESSION_CONTROLLED_MEMORY

Reports the maximum amount of controlled memory used by a session belonging to the host.
- MAX_SESSION_TOTAL_MEMORY

Reports the maximum amount of memory used by a session belonging to the host.
The hosts table has these indexes:
- Primary key on (HOST)

\subsection*{29.12.8.3 The users Table}

The users table contains a row for each user who has connected to the MySQL server. For each user name, the table counts the current and total number of connections. The table size is autosized at server startup. To set the table size explicitly, set the performance_schema_users_size system variable at server startup. To disable user statistics, set this variable to 0 .

The users table has the following columns. For a description of how the Performance Schema maintains rows in this table, including the effect of TRUNCATE TABLE, see Section 29.12.8, "Performance Schema Connection Tables".
- USER

The client user name for the connection. This is NULL for an internal thread, or for a user session that failed to authenticate.
- CURRENT_CONNECTIONS

The current number of connections for the user.
- TOTAL_CONNECTIONS

The total number of connections for the user.
- MAX_SESSION_CONTROLLED_MEMORY

Reports the maximum amount of controlled memory used by a session belonging to the user.
- MAX_SESSION_TOTAL_MEMORY

Reports the maximum amount of memory used by a session belonging to the user.
The users table has these indexes:
- Primary key on (USER)

\subsection*{29.12.9 Performance Schema Connection Attribute Tables}

Connection attributes are key-value pairs that application programs can pass to the server at connect time. For applications based on the C API implemented by the libmysqlclient client library, the mysql_options() and mysql_options4() functions define the connection attribute set. Other MySQL Connectors may provide their own attribute-definition methods.

These Performance Schema tables expose attribute information:
- session_account_connect_attrs: Connection attributes for the current session, and other sessions associated with the session account
- session_connect_attrs: Connection attributes for all sessions

In addition, connect events written to the audit log may include connection attributes. See Section 8.4.5.4, "Audit Log File Formats".

Attribute names that begin with an underscore (_) are reserved for internal use and should not be created by application programs. This convention permits new attributes to be introduced by MySQL without colliding with application attributes, and enables application programs to define their own attributes that do not collide with internal attributes.
- Available Connection Attributes
- Connection Attribute Limits

\section*{Available Connection Attributes}

The set of connection attributes visible within a given connection varies depending on factors such as your platform, MySQL Connector used to establish the connection, or client program.

The libmysqlclient client library sets these attributes:
- _client_name: The client name (libmysql for the client library).
- _client_version: The client library version.
-_os: The operating system (for example, Linux, Win64).
- _pid: The client process ID.
- _platform: The machine platform (for example, x86_64).
- _thread: The client thread ID (Windows only).

Other MySQL Connectors may define their own connection attributes.
MySQL Connector/C++ defines these attributes for applications that use X DevAPI or X DevAPI for C:
-_client_license: The connector license (for example GPL-2.0).
- _client_name: The connector name (mysql-connector-cpp).
- _client_version: The connector version.
- _os: The operating system (for example, Linux, Win64).
- _pid: The client process ID.
- _platform: The machine platform (for example, x86_64).
-_source_host: The host name of the machine on which the client is running.
- _thread: The client thread ID (Windows only).

MySQL Connector/J defines these attributes:
- _client_name: The client name
- _client_version: The client library version
- _os: The operating system (for example, Linux, Win64)
- _client_license: The connector license type
- _platform: The machine platform (for example, x86_64)
- _runtime_vendor: The Java runtime environment (JRE) vendor
- _runtime_version: The Java runtime environment (JRE) version

MySQL Connector/NET defines these attributes:
- _client_version: The client library version.
-_os: The operating system (for example, Linux, Win64).
- _pid: The client process ID.
- _platform: The machine platform (for example, x86_64).
- _program_name: The client name.
- _thread: The client thread ID (Windows only).

The Connector/Python implementation defines these attributes; some values and attributes depend on the Connector/Python implementation (pure python or c-ext):
- _client_license: The license type of the connector; GPL-2.0 or Commercial. (pure python only)
- _client_name: Set to mysql-connector-python (pure python) or libmysql (c-ext)
- _client_version: The connector version (pure python) or mysqlclient library version (c-ext).
- _os: The operating system with the connector (for example, Linux, Win64).
- _pid: The process identifier on the source machine (for example, 26955)
- _platform: The machine platform (for example, x86_64).
- _source_host: The host name of the machine on which the connector is connecting from.
- _connector_version: The connector version (for example, 8.4.9) (c-ext only).
- _connector_license: The license type of the connector; GPL-2.0 or Commercial (c-ext only).
- _connector_name: Always set to mysql-connector-python (c-ext only).

PHP defines attributes that depend on how it was compiled:
- Compiled using libmysqlclient: The standard libmysqlclient attributes, described previously.
- Compiled using mysqlnd: Only the _client_name attribute, with a value of mysqlnd.

Many MySQL client programs set a program_name attribute with a value equal to the client name. For example, mysqladmin and mysqldump set program_name to mysqladmin and mysqldump, respectively. MySQL Shell sets program_name to mysqlsh.

Some MySQL client programs define additional attributes:
- mysql:
- os_user: The name of the operating system user running the program. Available on Unix and Unix-like systems and Windows.
- os_sudouser: The value of the SUDO_USER environment variable. Available on Unix and Unixlike systems.
mysql connection attributes for which the value is empty are not sent.
- mysqlbinlog:
- _client_role: binary_log_listener
- Replica connections:
- program_name: mysqld
- _client_role: binary_log_listener
- _client_replication_channel_name: The channel name.
- FEDERATED storage engine connections:
- program_name: mysqld
- _client_role: federated_storage

\section*{Connection Attribute Limits}

There are limits on the amount of connection attribute data transmitted from client to server:
- A fixed limit imposed by the client prior to connect time.
- A fixed limit imposed by the server at connect time.
- A configurable limit imposed by the Performance Schema at connect time.

For connections initiated using the C API, the libmysqlclient library imposes a limit of 64 KB on the aggregate size of connection attribute data on the client side: Calls to mysql_options ( ) that cause this limit to be exceeded produce a CR_INVALID_PARAMETER_NO error. Other MySQL Connectors may impose their own client-side limits on how much connection attribute data can be transmitted to the server.

On the server side, these size checks on connection attribute data occur:
- The server imposes a limit of 64 KB on the aggregate size of connection attribute data it accepts. If a client attempts to send more than 64 KB of attribute data, the server rejects the connection. Otherwise, the server considers the attribute buffer valid and tracks the size of the longest such buffer in the Performance_schema_session_connect_attrs_longest_seen status variable.
- For accepted connections, the Performance Schema checks aggregate attribute size against the value of the performance_schema_session_connect_attrs_size system variable. If attribute size exceeds this value, these actions take place:
- The Performance Schema truncates the attribute data and increments the Performance_schema_session_connect_attrs_lost status variable, which indicates the number of connections for which attribute truncation occurred.
- The Performance Schema writes a message to the error log if the log_error_verbosity system variable is greater than 1 :

Connection attributes of length $N$ were truncated
```
(N bytes lost)
for connection N, user user_name@host_name
(as user_name), auth: {yes|no}
```


The information in the warning message is intended to help DBAs identify clients for which attribute truncation occurred.
- A _truncated attribute is added to the session attributes with a value indicating how many bytes were lost, if the attribute buffer has sufficient space. This enables the Performance Schema to expose per-connection truncation information in the connection attribute tables. This information can be examined without having to check the error log.

\subsection*{29.12.9.1 The session_account_connect_attrs Table}

Application programs can provide key-value connection attributes to be passed to the server at connect time. For descriptions of common attributes, see Section 29.12.9, "Performance Schema Connection Attribute Tables".

The session_account_connect_attrs table contains connection attributes only for the current session, and other sessions associated with the session account. To see connection attributes for all sessions, use the session_connect_attrs table.

The session_account_connect_attrs table has these columns:
- PROCESSLIST_ID

The connection identifier for the session.
- ATTR_NAME

The attribute name.
- ATTR_VALUE

The attribute value.
- ORDINAL_POSITION

The order in which the attribute was added to the set of connection attributes.
The session_account_connect_attrs table has these indexes:
- Primary key on (PROCESSLIST_ID, ATTR_NAME)

TRUNCATE TABLE is not permitted for the session_account_connect_attrs table.

\subsection*{29.12.9.2 The session_connect_attrs Table}

Application programs can provide key-value connection attributes to be passed to the server at connect time. For descriptions of common attributes, see Section 29.12.9, "Performance Schema Connection Attribute Tables".

The session_connect_attrs table contains connection attributes for all sessions. To see connection attributes only for the current session, and other sessions associated with the session account, use the session_account_connect_attrs table.

The session_connect_attrs table has these columns:
- PROCESSLIST_ID

The connection identifier for the session.
- ATTR_NAME

The attribute name.
- ATTR_VALUE

The attribute value.
- ORDINAL_POSITION

The order in which the attribute was added to the set of connection attributes.
The session_connect_attrs table has these indexes:
- Primary key on (PROCESSLIST_ID, ATTR_NAME)

TRUNCATE TABLE is not permitted for the session_connect_attrs table.

\subsection*{29.12.10 Performance Schema User-Defined Variable Tables}

The Performance Schema provides a user_variables_by_thread table that exposes user-defined variables. These are variables defined within a specific session and include a @ character preceding the name; see Section 11.4, "User-Defined Variables".

The user_variables_by_thread table has these columns:
- THREAD_ID

The thread identifier of the session in which the variable is defined.
- VARIABLE_NAME

The variable name, without the leading @ character.
- VARIABLE_VALUE

The variable value.
The user_variables_by_thread table has these indexes:
- Primary key on (THREAD_ID, VARIABLE_NAME)

TRUNCATE TABLE is not permitted for the user_variables_by_thread table.

\subsection*{29.12.11 Performance Schema Replication Tables}

The Performance Schema provides tables that expose replication information. This is similar to the information available from the SHOW REPLICA STATUS statement, but representation in table form is more accessible and has usability benefits:
- SHOW REPLICA STATUS output is useful for visual inspection, but not so much for programmatic use. By contrast, using the Performance Schema tables, information about replica status can be searched using general SELECT queries, including complex WHERE conditions, joins, and so forth.
- Query results can be saved in tables for further analysis, or assigned to variables and thus used in stored procedures.
- The replication tables provide better diagnostic information. For multithreaded replica operation, SHOW REPLICA STATUS reports all coordinator and worker thread errors using the Last_SQL_Errno and Last_SQL_Error fields, so only the most recent of those errors is visible and information can be lost. The replication tables store errors on a per-thread basis without loss of information.
- The last seen transaction is visible in the replication tables on a per-worker basis. This is information not available from SHOW REPLICA STATUS.
- Developers familiar with the Performance Schema interface can extend the replication tables to provide additional information by adding rows to the tables.

\section*{Replication Table Descriptions}

The Performance Schema provides the following replication-related tables:
- Tables that contain information about the connection of the replica to the source:
- replication_connection_configuration: Configuration parameters for connecting to the source
- replication_connection_status: Current status of the connection to the source
- replication_asynchronous_connection_failover: Source lists for the asynchronous connection failover mechanism
- Tables that contain general (not thread-specific) information about the transaction applier:
- replication_applier_configuration: Configuration parameters for the transaction applier on the replica.
- replication_applier_status: Current status of the transaction applier on the replica.
- Tables that contain information about specific threads responsible for applying transactions received from the source:
- replication_applier_status_by_coordinator: Status of the coordinator thread (empty unless the replica is multithreaded).
- replication_applier_status_by_worker: Status of the applier thread or worker threads if the replica is multithreaded.
- Tables that contain information about channel based replication filters:
- replication_applier_filters: Provides information about the replication filters configured on specific replication channels.
- replication_applier_global_filters: Provides information about global replication filters, which apply to all replication channels.
- Tables that contain information about Group Replication members:
- replication_group_members: Provides network and status information for group members.
- replication_group_member_stats: Provides statistical information about group members and transactions in which they participate.

For more information see Section 20.4, "Monitoring Group Replication".
The following Performance Schema replication tables continue to be populated when the Performance Schema is disabled:
- replication_connection_configuration
- replication_connection_status
- replication_asynchronous_connection_failover
- replication_applier_configuration
- replication_applier_status
- replication_applier_status_by_coordinator
- replication_applier_status_by_worker

The exception is local timing information (start and end timestamps for transactions) in the replication tables replication_connection_status, replication_applier_status_by_coordinator, and replication_applier_status_by_worker. This information is not collected when the Performance Schema is disabled.

The following sections describe each replication table in more detail, including the correspondence between the columns produced by SHOW REPLICA STATUS and the replication table columns in which the same information appears.

The remainder of this introduction to the replication tables describes how the Performance Schema populates them and which fields from SHOW REPLICA STATUS are not represented in the tables.

\section*{Replication Table Life Cycle}

The Performance Schema populates the replication tables as follows:
- Prior to execution of CHANGE REPLICATION SOURCE TO, the tables are empty.
- After CHANGE REPLICATION SOURCE TO, the configuration parameters can be seen in the tables. At this time, there are no active replication threads, so the THREAD_ID columns are NULL and the SERVICE_STATE columns have a value of OFF.
- After START REPLICA, non-null THREAD_ID values can be seen. Threads that are idle or active have a SERVICE_STATE value of ON. The thread that connects to the source has a value of CONNECTING while it establishes the connection, and ON thereafter as long as the connection lasts.
- After STOP REPLICA, the THREAD_ID columns become NULL and the SERVICE_STATE columns for threads that no longer exist have a value of OFF.
- The tables are preserved after STOP REPLICA or threads stopping due to an error.
- The replication_applier_status_by_worker table is nonempty only when the replica is operating in multithreaded mode. That is, if the replica_parallel_workers system variable is greater than 0 , this table is populated when START REPLICA is executed, and the number of rows shows the number of workers.

\section*{Replica Status Information Not In the Replication Tables}

The information in the Performance Schema replication tables differs somewhat from the information available from SHOW REPLICA STATUS because the tables are oriented toward use of global transaction identifiers (GTIDs), not file names and positions, and they represent server UUID values, not server ID values. Due to these differences, several SHOW REPLICA STATUS columns are not preserved in the Performance Schema replication tables, or are represented a different way:
- The following fields refer to file names and positions and are not preserved:
```
Master_Log_File
Read_Master_Log_Pos
Relay_Log_File
Relay_Log_Pos
Relay_Master_Log_File
Exec_Master_Log_Pos
Until_Condition
Until_Log_File
Until_Log_Pos
```

- The Master_Info_File field is not preserved. It refers to the master.info file used for the replica's source metadata repository, which has been superseded by the use of crash-safe tables for the repository.
- The following fields are based on server_id, not server_uuid, and are not preserved:
```
Master_Server_Id
Replicate_Ignore_Server_Ids
```

- The Skip_Counter field is based on event counts, not GTIDs, and is not preserved.
- These error fields are aliases for Last_SQL_Errno and Last_SQL_Error, so they are not preserved:
```
Last_Errno
Last_Error
```


In the Performance Schema, this error information is available in the LAST_ERROR_NUMBER and LAST_ERROR_MESSAGE columns of the replication_applier_status_by_worker table (and replication_applier_status_by_coordinator if the replica is multithreaded). Those tables provide more specific per-thread error information than is available from Last_Errno and Last_Error.
- Fields that provide information about command-line filtering options is not preserved:
```
Replicate_Do_DB
Replicate_Ignore_DB
Replicate_Do_Table
Replicate_Ignore_Table
Replicate_Wild_Do_Table
Replicate_Wild_Ignore_Table
```

- The Replica_IO_State and Replica_SQL_Running_State fields are not preserved. If needed, these values can be obtained from the process list by using the THREAD_ID column of the appropriate replication table and joining it with the ID column in the INFORMATION_SCHEMA PROCESSLIST table to select the STATE column of the latter table.
- The Executed_Gtid_Set field can show a large set with a great deal of text. Instead, the Performance Schema tables show GTIDs of transactions that are currently being applied by the replica. Alternatively, the set of executed GTIDs can be obtained from the value of the gtid_executed system variable.
- The Seconds_Behind_Master and Relay_Log_Space fields are in to-be-decided status and are not preserved.

\section*{Replication Channels}

The first column of the replication Performance Schema tables is CHANNEL_NAME. This enables the tables to be viewed per replication channel. In a non-multisource replication setup there is a single default replication channel. When you are using multiple replication channels on a replica, you can filter the tables per replication channel to monitor a specific replication channel. See Section 19.2.2, "Replication Channels" and Section 19.1.5.8, "Monitoring Multi-Source Replication" for more information.

\subsection*{29.12.11.1 The binary_log_transaction_compression_stats Table}

This table shows statistical information for transaction payloads written to the binary log and relay log, and can be used to calculate the effects of enabling binary log transaction compression. For information on binary log transaction compression, see Section 7.4.4.5, "Binary Log Transaction Compression".

The binary_log_transaction_compression_stats table is populated only when the server instance has a binary log, and the system variable binlog_transaction_compression is set to ON. The statistics cover all transactions written to the binary log and relay log from the time the server was started or the table was truncated. Compressed transactions are grouped by the compression algorithm used, and uncompressed transactions are grouped together with the compression algorithm stated as NONE, so the compression ratio can be calculated.

The binary_log_transaction_compression_stats table has these columns:
- LOG_TYPE

Whether these transactions were written to the binary log or relay log.
- COMPRESSION_TYPE

The compression algorithm used to compress the transaction payloads. NONE means the payloads for these transactions were not compressed, which is correct in a number of situations (see Section 7.4.4.5, "Binary Log Transaction Compression").
- TRANSACTION_COUNTER

The number of transactions written to this log type with this compression type.
- COMPRESSED_BYTES

The total number of bytes that were compressed and then written to this log type with this compression type, counted after compression.
- UNCOMPRESSED_BYTES

The total number of bytes before compression for this log type and this compression type.
- COMPRESSION_PERCENTAGE

The compression ratio for this log type and this compression type, expressed as a percentage.
- FIRST_TRANSACTION_ID

The ID of the first transaction that was written to this log type with this compression type.
- FIRST_TRANSACTION_COMPRESSED_BYTES

The total number of bytes that were compressed and then written to the log for the first transaction, counted after compression.
- FIRST_TRANSACTION_UNCOMPRESSED_BYTES

The total number of bytes before compression for the first transaction.
- FIRST_TRANSACTION_TIMESTAMP

The timestamp when the first transaction was written to the log.
- LAST_TRANSACTION_ID

The ID of the most recent transaction that was written to this log type with this compression type.
- LAST_TRANSACTION_COMPRESSED_BYTES

The total number of bytes that were compressed and then written to the log for the most recent transaction, counted after compression.
- LAST_TRANSACTION_UNCOMPRESSED_BYTES

The total number of bytes before compression for the most recent transaction.
- LAST_TRANSACTION_TIMESTAMP

The timestamp when the most recent transaction was written to the log.
The binary_log_transaction_compression_stats table has no indexes.

TRUNCATE TABLE is permitted for the binary_log_transaction_compression_stats table.

\subsection*{29.12.11.2 The replication_applier_configuration Table}

This table shows the configuration parameters that affect transactions applied by the replica.
Parameters stored in the table can be changed at runtime with the CHANGE REPLICATION SOURCE TO statement.

The replication_applier_configuration table has these columns:
- CHANNEL_NAME

The replication channel which this row is displaying. There is always a default replication channel, and more replication channels can be added. See Section 19.2.2, "Replication Channels" for more information.
- DESIRED_DELAY

The number of seconds that the replica must lag the source (CHANGE REPLICATION SOURCE TO option: SOURCE_DELAY). See Section 19.4.11, "Delayed Replication" for more information.
- PRIVILEGE_CHECKS_USER

The user account that provides the security context for the channel (CHANGE REPLICATION SOURCE TO option: PRIVILEGE_CHECKS_USER). This is escaped so that it can be copied into an SQL statement to execute individual transactions. See Section 19.3.3, "Replication Privilege Checks" for more information.
- REQUIRE_ROW_FORMAT

Whether the channel accepts only row-based events (CHANGE REPLICATION SOURCE TO option: REQUIRE_ROW_FORMAT). See Section 19.3.3, "Replication Privilege Checks" for more information.
- REQUIRE_TABLE_PRIMARY_KEY_CHECK

Whether the channel requires primary keys always, never, or according to the source's setting (CHANGE REPLICATION SOURCE TO option: REQUIRE_TABLE_PRIMARY_KEY_CHECK). See Section 19.3.3, "Replication Privilege Checks" for more information.
- ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS_TYPE

Whether the channel assigns a GTID to replicated transactions that do not already have one (CHANGE REPLICATION SOURCE TO option: ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS). OFF means no GTIDs are assigned. LOCAL means a GTID is assigned that includes the replica's own UUID (the server_uuid setting). UUID means a GTID is assigned that includes a manually set UUID. See Section 19.1.3.6, "Replication From a Source Without GTIDs to a Replica With GTIDs" for more information.
- ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS_VALUE

The UUID that is used as part of the GTIDs assigned to anonymous transactions (CHANGE REPLICATION SOURCE TO option: ASSIGN_GTIDS_TO_ANONYMOUS_TRANSACTIONS). See Section 19.1.3.6, "Replication From a Source Without GTIDs to a Replica With GTIDs" for more information.

The replication_applier_configuration table has these indexes:
- Primary key on (CHANNEL_NAME)

TRUNCATE TABLE is not permitted for the replication_applier_configuration table.
The following table shows the correspondence between replication_applier_configuration columns and SHOW REPLICA STATUS columns.

\begin{tabular}{|l|l|}
\hline \begin{tabular}{l} 
replication_applier_configuration \\
Column
\end{tabular} & SHOW REPLICA STATUS Column \\
\hline DESIRED_DELAY & SQL_Delay \\
\hline
\end{tabular}

\subsection*{29.12.11.3 The replication_applier_filters Table}

This table shows the replication channel specific filters configured on this replica. Each row provides information on a replication channel's configured type of filter. The replication_applier_filters table has these columns:
- CHANNEL_NAME

The name of replication channel with a replication filter configured.
- FILTER_NAME

The type of replication filter that has been configured for this replication channel.
- FILTER_RULE

The rules configured for the replication filter type using either - -replicate - * command options or CHANGE REPLICATION FILTER.
- CONFIGURED_BY

The method used to configure the replication filter, can be one of:
- CHANGE_REPLICATION_FILTER configured by a global replication filter using a CHANGE REPLICATION FILTER statement.
- STARTUP_OPTIONS configured by a global replication filter using a --replicate - * option.
- CHANGE_REPLICATION_FILTER_FOR_CHANNEL configured by a channel specific replication filter using a CHANGE REPLICATION FILTER FOR CHANNEL statement.
- STARTUP_OPTIONS_FOR_CHANNEL configured by a channel specific replication filter using a -replicate - * option.
- ACTIVE_SINCE

Timestamp of when the replication filter was configured.
- COUNTER

The number of times the replication filter has been used since it was configured.

\subsection*{29.12.11.4 The replication_applier_global_filters Table}

This table shows the global replication filters configured on this replica. The replication_applier_global_filters table has these columns:
- FILTER_NAME

The type of replication filter that has been configured.
- FILTER_RULE

The rules configured for the replication filter type using either - -replicate - * command options or CHANGE REPLICATION FILTER.
- CONFIGURED_BY

The method used to configure the replication filter, can be one of:
- CHANGE_REPLICATION_FILTER configured by a global replication filter using a CHANGE REPLICATION FILTER statement.
- STARTUP_OPTIONS configured by a global replication filter using a - -replicate - * option.
- ACTIVE_SINCE

Timestamp of when the replication filter was configured.

\subsection*{29.12.11.5 The replication_applier_status Table}

This table shows the current general transaction execution status on the replica. The table provides information about general aspects of transaction applier status that are not specific to any thread involved. Thread-specific status information is available in the replication_applier_status_by_coordinator table (and replication_applier_status_by_worker if the replica is multithreaded).

The replication_applier_status table has these columns:
- CHANNEL_NAME

The replication channel which this row is displaying. There is always a default replication channel, and more replication channels can be added. See Section 19.2.2, "Replication Channels" for more information.
- SERVICE_STATE

Shows ON when the replication channel's applier threads are active or idle, OFF means that the applier threads are not active.
- REMAINING_DELAY

If the replica is waiting for DESIRED_DELAY seconds to pass since the source applied a transaction, this field contains the number of delay seconds remaining. At other times, this field is NULL. (The DESIRED_DELAY value is stored in the replication_applier_configuration table.) See Section 19.4.11, "Delayed Replication" for more information.
- COUNT_TRANSACTIONS_RETRIES

Shows the number of retries that were made because the replication SQL thread failed to apply a transaction. The maximum number of retries for a given transaction is set by the system variable replica_transaction_retries. The replication_applier_status_by_worker table shows detailed information on transaction retries for a single-threaded or multithreaded replica.

The replication_applier_status table has these indexes:
- Primary key on (CHANNEL_NAME)

TRUNCATE TABLE is not permitted for the replication_applier_status table.
The following table shows the correspondence between replication_applier_status columns and SHOW REPLICA STATUS columns.

\begin{tabular}{|l|l|}
\hline replication_applier_status Column & SHOW REPLICA STATUS Column \\
\hline SERVICE_STATE & None \\
\hline REMAINING_DELAY & SQL_Remaining_Delay \\
\hline
\end{tabular}

\subsection*{29.12.11.6 The replication_applier_status_by_coordinator Table}

For a multithreaded replica, the replica uses multiple worker threads and a coordinator thread to manage them, and this table shows the status of the coordinator thread. For a single-threaded replica, this table is empty. For a multithreaded replica, the replication_applier_status_by_worker table shows the status of the worker threads. This table provides information about the last transaction which was buffered by the coordinator thread to a worker's queue, as well as the transaction it is currently buffering. The start timestamp refers to when this thread read the first event of the transaction from the relay log to buffer it to a worker's queue, while the end timestamp refers to when the last event finished buffering to the worker's queue.

The replication_applier_status_by_coordinator table has these columns:
- CHANNEL_NAME

The replication channel which this row is displaying. There is always a default replication channel, and more replication channels can be added. See Section 19.2.2, "Replication Channels" for more information.
- THREAD_ID

The SQL/coordinator thread ID.
- SERVICE_STATE

ON (thread exists and is active or idle) or OFF (thread no longer exists).
- LAST_ERROR_NUMBER, LAST_ERROR_MESSAGE

The error number and error message of the most recent error that caused the SQL/coordinator thread to stop. An error number of 0 and message which is an empty string means "no error". If the LAST_ERROR_MESSAGE value is not empty, the error values also appear in the replica's error log.

Issuing RESET BINARY LOGS AND GTIDS or RESET REPLICA resets the values shown in these columns.

All error codes and messages displayed in the LAST_ERROR_NUMBER and LAST_ERROR_MESSAGE columns correspond to error values listed in Server Error Message Reference.
- LAST_ERROR_TIMESTAMP

A timestamp in 'YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when the most recent SQL/coordinator error occurred.
- LAST_PROCESSED_TRANSACTION

The global transaction ID (GTID) of the last transaction processed by this coordinator.
- LAST_PROCESSED_TRANSACTION_ORIGINAL_COMMIT_TIMESTAMP

A timestamp in 'YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when the last transaction processed by this coordinator was committed on the original source.
- LAST_PROCESSED_TRANSACTION_IMMEDIATE_COMMIT_TIMESTAMP

A timestamp in ' Y Y Y Y - MM-DD hh:mm:ss[.fraction]' format that shows when the last transaction processed by this coordinator was committed on the immediate source.
- LAST_PROCESSED_TRANSACTION_START_BUFFER_TIMESTAMP

A timestamp in 'YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when this coordinator thread started writing the last transaction to the buffer of a worker thread.
- LAST_PROCESSED_TRANSACTION_END_BUFFER_TIMESTAMP

A timestamp in ' YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when the last transaction was written to the buffer of a worker thread by this coordinator thread.
- PROCESSING_TRANSACTION

The global transaction ID (GTID) of the transaction that this coordinator thread is currently processing.
- PROCESSING_TRANSACTION_ORIGINAL_COMMIT_TIMESTAMP

A timestamp in ' YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when the currently processing transaction was committed on the original source.
- PROCESSING_TRANSACTION_IMMEDIATE_COMMIT_TIMESTAMP

A timestamp in ' $Y Y Y Y-M M-D D$ hh:mm:ss[.fraction]' format that shows when the currently processing transaction was committed on the immediate source.
- PROCESSING_TRANSACTION_START_BUFFER_TIMESTAMP

A timestamp in 'YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when this coordinator thread started writing the currently processing transaction to the buffer of a worker thread.

When the Performance Schema is disabled, local timing information is not collected, so the fields showing the start and end timestamps for buffered transactions are zero.

The replication_applier_status_by_coordinator table has these indexes:
- Primary key on (CHANNEL_NAME)
- Index on (THREAD_ID)

The following table shows the correspondence between replication_applier_status_by_coordinator columns and SHOW REPLICA STATUS columns.

\begin{tabular}{|l|l|}
\hline replication_applier_status_by_coordina Column & SHOW REPLICA STATUS Column \\
\hline THREAD_ID & None \\
\hline SERVICE_STATE & Replica_SQL_Running \\
\hline LAST_ERROR_NUMBER & Last_SQL_Errno \\
\hline LAST_ERROR_MESSAGE & Last_SQL_Error \\
\hline LAST_ERROR_TIMESTAMP & Last_SQL_Error_Timestamp \\
\hline
\end{tabular}

\subsection*{29.12.11.7 The replication_applier_status_by_worker Table}

This table provides details of the transactions handled by applier threads on a replica or Group Replication group member. For a single-threaded replica, data is shown for the replica's single applier thread. For a multithreaded replica, data is shown individually for each applier thread. The applier threads on a multithreaded replica are sometimes called workers. The number of applier threads on a replica or Group Replication group member is set by the replica_parallel_workers system variable, which is set to zero for a single-threaded replica. A multithreaded replica also has a coordinator thread to manage the applier threads, and the status of this thread is shown in the replication_applier_status_by_coordinator table.

All error codes and messages displayed in the columns relating to errors correspond to error values listed in Server Error Message Reference.

When the Performance Schema is disabled, local timing information is not collected, so the fields showing the start and end timestamps for applied transactions are zero. The start timestamps in this table refer to when the worker started applying the first event, and the end timestamps refer to when the last event of the transaction was applied.

When a replica is restarted by a START REPLICA statement, the columns beginning APPLYING_TRANSACTION are reset.

The replication_applier_status_by_worker table has these columns:
- CHANNEL_NAME

The replication channel which this row is displaying. There is always a default replication channel, and more replication channels can be added. See Section 19.2.2, "Replication Channels" for more information.
- WORKER_ID

The worker identifier (same value as the id column in the mysql.slave_worker_info table). After STOP REPLICA, the THREAD_ID column becomes NULL, but the WORKER_ID value is preserved.
- THREAD_ID

The worker thread ID.
- SERVICE_STATE

ON (thread exists and is active or idle) or OFF (thread no longer exists).
- LAST_ERROR_NUMBER, LAST_ERROR_MESSAGE

The error number and error message of the most recent error that caused the worker thread to stop. An error number of 0 and message of the empty string mean "no error". If the LAST_ERROR_MESSAGE value is not empty, the error values also appear in the replica's error log.

Issuing RESET BINARY LOGS AND GTIDS or RESET REPLICA resets the values shown in these columns.
- LAST_ERROR_TIMESTAMP

A timestamp in ' YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when the most recent worker error occurred.
- LAST_APPLIED_TRANSACTION

The global transaction ID (GTID) of the last transaction applied by this worker.
- LAST_APPLIED_TRANSACTION_ORIGINAL_COMMIT_TIMESTAMP

A timestamp in 'YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when the last transaction applied by this worker was committed on the original source.
- LAST_APPLIED_TRANSACTION_IMMEDIATE_COMMIT_TIMESTAMP

A timestamp in ' YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when the last transaction applied by this worker was committed on the immediate source.
- LAST_APPLIED_TRANSACTION_START_APPLY_TIMESTAMP

A timestamp in 'YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when this worker started applying the last applied transaction.
- LAST_APPLIED_TRANSACTION_END_APPLY_TIMESTAMP

A timestamp in ' YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when this worker finished applying the last applied transaction.
- APPLYING_TRANSACTION

The global transaction ID (GTID) of the transaction this worker is currently applying.
- APPLYING_TRANSACTION_ORIGINAL_COMMIT_TIMESTAMP

A timestamp in 'YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when the transaction this worker is currently applying was committed on the original source.
- APPLYING_TRANSACTION_IMMEDIATE_COMMIT_TIMESTAMP

A timestamp in ' Y Y Y Y-MM-DD hh:mm:ss[.fraction]' format that shows when the transaction this worker is currently applying was committed on the immediate source.
- APPLYING_TRANSACTION_START_APPLY_TIMESTAMP

A timestamp in ' YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when this worker started its first attempt to apply the transaction that is currently being applied.
- LAST_APPLIED_TRANSACTION_RETRIES_COUNT

The number of times the last applied transaction was retried by the worker after the first attempt. If the transaction was applied at the first attempt, this number is zero.
- LAST_APPLIED_TRANSACTION_LAST_TRANSIENT_ERROR_NUMBER

The error number of the last transient error that caused the transaction to be retried.
- LAST_APPLIED_TRANSACTION_LAST_TRANSIENT_ERROR_MESSAGE

The message text for the last transient error that caused the transaction to be retried.
- LAST_APPLIED_TRANSACTION_LAST_TRANSIENT_ERROR_TIMESTAMP

A timestamp in 'YYYY-MM-DD hh:mm:ss[.fraction]' format for the last transient error that caused the transaction to be retried.
- APPLYING_TRANSACTION_RETRIES_COUNT

The number of times the transaction that is currently being applied was retried until this moment. If the transaction was applied at the first attempt, this number is zero.
- APPLYING_TRANSACTION_LAST_TRANSIENT_ERROR_NUMBER

The error number of the last transient error that caused the current transaction to be retried.
- APPLYING_TRANSACTION_LAST_TRANSIENT_ERROR_MESSAGE

The message text for the last transient error that caused the current transaction to be retried.
- APPLYING_TRANSACTION_LAST_TRANSIENT_ERROR_TIMESTAMP

A timestamp in ' YYYY - MM-DD hh:mm:ss[.fraction]' format for the last transient error that caused the current transaction to be retried.

The replication_applier_status_by_worker table has these indexes:
- Primary key on (CHANNEL_NAME, WORKER_ID)
- Index on (THREAD_ID)

The following table shows the correspondence between replication_applier_status_by_worker columns and SHOW REPLICA STATUS columns.

\begin{tabular}{|l|l|}
\hline replication_applier_status_by_worker Column & SHOW REPLICA STATUS Column \\
\hline WORKER_ID & None \\
\hline THREAD_ID & None \\
\hline SERVICE_STATE & None \\
\hline LAST_ERROR_NUMBER & Last_SQL_Errno \\
\hline LAST_ERROR_MESSAGE & Last_SQL_Error \\
\hline LAST_ERROR_TIMESTAMP & Last_SQL_Error_Timestamp \\
\hline
\end{tabular}

\subsection*{29.12.11.8 The replication_asynchronous_connection_failover Table}

This table holds the replica's source lists for each replication channel for the asynchronous connection failover mechanism. The asynchronous connection failover mechanism automatically establishes an asynchronous (source to replica) replication connection to a new source from the appropriate list after the existing connection from the replica to its source fails. When asynchronous connection failover is enabled for a group of replicas managed by Group Replication, the source lists are broadcast to all group members when they join, and also when the lists change.

You set and manage source lists using the asynchronous_connection_failover_add_source and asynchronous_connection_failover_delete_source functions to add and remove replication source servers from the source list for a replication channel. To add and remove managed groups of servers, use the asynchronous_connection_failover_add_managed and asynchronous_connection_failover_delete_managed functions instead.

For more information, see Section 19.4.9, "Switching Sources and Replicas with Asynchronous Connection Failover".

The replication_asynchronous_connection_failover table has these columns:
- CHANNEL_NAME

The replication channel for which this replication source server is part of the source list. If this channel's connection to its current source fails, this replication source server is one of its potential new sources.
- HOST

The host name for this replication source server.
- PORT

The port number for this replication source server.
- NETWORK_NAMESPACE

The network namespace for this replication source server. If this value is empty, connections use the default (global) namespace.
- WEIGHT

The priority of this replication source server in the replication channel's source list. The weight is from 1 to 100 , with 100 being the highest, and 50 being the default. When the asynchronous connection failover mechanism activates, the source with the highest weight setting among the alternative sources listed in the source list for the channel is chosen for the first connection attempt. If this
attempt does not work, the replica tries with all the listed sources in descending order of weight, then starts again from the highest weighted source. If multiple sources have the same weight, the replica orders them randomly.
- MANAGED_NAME

The identifier for the managed group that the server is a part of. For the GroupReplication managed service, the identifier is the value of the group_replication_group_name system variable.

The replication_asynchronous_connection_failover table has these indexes:
- Primary key on (CHANNEL_NAME, HOST, PORT, NETWORK_NAMESPACE, MANAGED_NAME)

TRUNCATE TABLE is not permitted for the replication_asynchronous_connection_failover table.

\subsection*{29.12.11.9 The replication_asynchronous_connection_failover_managed Table}

This table holds configuration information used by the replica's asynchronous connection failover mechanism to handle managed groups, including Group Replication topologies.

When you add a group member to the source list and define it as part of a managed group, the asynchronous connection failover mechanism updates the source list to keep it in line with membership changes, adding and removing group members automatically as they join or leave. When asynchronous connection failover is enabled for a group of replicas managed by Group Replication, the source lists are broadcast to all group members when they join, and also when the lists change.

The asynchronous connection failover mechanism fails over the connection if another available server on the source list has a higher priority (weight) setting. For a managed group, a source's weight is assigned depending on whether it is a primary or a secondary server. So assuming that you set up the managed group to give a higher weight to a primary and a lower weight to a secondary, when the primary changes, the higher weight is assigned to the new primary, so the replica changes over the connection to it. The asynchronous connection failover mechanism additionally changes connection if the currently connected managed source server leaves the managed group, or is no longer in the majority in the managed group. For more information, see Section 19.4.9, "Switching Sources and Replicas with Asynchronous Connection Failover".

The replication_asynchronous_connection_failover_managed table has these columns:
- CHANNEL_NAME

The replication channel where the servers for this managed group operate.
- MANAGED_NAME

The identifier for the managed group. For the GroupReplication managed service, the identifier is the value of the group_replication_group_name system variable.
- MANAGED_TYPE

The type of managed service that the asynchronous connection failover mechanism provides for this group. The only value currently available is GroupReplication.
- CONFIGURATION

The configuration information for this managed group. For the GroupReplication managed service, the configuration shows the weights assigned to the group's primary server and to the group's secondary servers. For example: \{"Primary_weight": 80, "Secondary_weight": 60\}
- Primary_weight: Integer between 0 and 100 . Default value is 80 .
- Secondary_weight: Integer between 0 and 100 . Default value is 60 .

The replication_asynchronous_connection_failover_managed table has these indexes:
- Primary key on (CHANNEL_NAME, MANAGED_NAME)

TRUNCATE TABLE is not permitted for the replication_asynchronous_connection_failover_managed table.

\subsection*{29.12.11.10 The replication_group_communication_information Table}

This table shows group configuration options for the whole replication group. The table is available only when Group Replication is installed.

The replication_group_communication_information table has these columns:
- WRITE_CONCURRENCY

The maximum number of consensus instances that the group can execute in parallel. The default value is 10 . See Section 20.5.1.3, "Using Group Replication Group Write Consensus".
- PROTOCOL_VERSION

The Group Replication communication protocol version, which determines what messaging capabilities are used. This is set to accommodate the oldest MySQL Server version that you want the group to support. See Section 20.5.1.4, "Setting a Group's Communication Protocol Version".
- WRITE_CONSENSUS_LEADERS_PREFERRED

The leader or leaders that Group Replication has instructed the group communication engine to use to drive consensus. For a group in single-primary mode with the group_replication_paxos_single_leader system variable set to ON and the communication protocol version set to 8.0 .27 or later, the single consensus leader is the group's primary. Otherwise, all group members are used as leaders, so they are all shown here. See Section 20.7.3, "Single Consensus Leader".
- WRITE_CONSENSUS_LEADERS_ACTUAL

The actual leader or leader that the group communication engine is using to drive consensus. If a single consensus leader is in use for the group, and the primary is currently unhealthy, the group communication selects an alternative consensus leader. In this situation, the group member specified here can differ from the preferred group member.
- WRITE_CONSENSUS_SINGLE_LEADER_CAPABLE

Whether the replication group is capable of using a single consensus leader. 1 means that the group was started with the use of a single leader enabled (group_replication_paxos_single_leader = 0N), and this is still shown if the value of group_replication_paxos_single_leader has since been changed on this group member. 0 means that the group was started with single leader mode disabled (group_replication_paxos_single_leader = OFF), or has a Group Replication communication protocol version that does not support the use of a single consensus leader (prior to 8.0.27). This information is only returned for group members in ONLINE or RECOVERING state.
- MEMBER_FAILURE_SUSPICIONS_COUNT

The address of each group member paired with the number of times this member has been seen as suspect by the local node. This information is displayed in JSON format. For a group with three members, the value of this column should appear similar to what is shown here:
\{
```
    "d57da302-e404-4395-83b5-ff7cf9b7e055": 0,
    "6ace9d39-a093-4fe0-b24d-bacbaa34c339": 10,
    "9689c7c5-c71c-402a-a3a1-2f57bfc2ca62": 0
}
```


The replication_group_communication_information table has no indexes.
TRUNCATE TABLE is not permitted for the replication_group_communication_information table.

\subsection*{29.12.11.11 The replication_connection_configuration Table}

This table shows the configuration parameters used by the replica for connecting to the source. Parameters stored in the table can be changed at runtime with the CHANGE REPLICATION SOURCE TO statement.

Compared to the replication_connection_status table, replication_connection_configuration changes less frequently. It contains values that define how the replica connects to the source and that remain constant during the connection, whereas replication_connection_status contains values that change during the connection.

The replication_connection_configuration table has the following columns. The column descriptions indicate the corresponding CHANGE REPLICATION SOURCE TO options from which the column values are taken, and the table given later in this section shows the correspondence between replication_connection_configuration columns and SHOW REPLICA STATUS columns.
- CHANNEL_NAME

The replication channel which this row is displaying. There is always a default replication channel, and more replication channels can be added. See Section 19.2.2, "Replication Channels" for more information. (CHANGE REPLICATION SOURCE TO option: FOR CHANNEL)
- HOST

The host name of the source that the replica is connected to. (CHANGE REPLICATION SOURCE TO option: SOURCE_HOST)
- PORT

The port used to connect to the source. (CHANGE REPLICATION SOURCE TO option: SOURCE_PORT)
- USER

The user name of the replication user account used to connect to the source. (CHANGE REPLICATION SOURCE TO option: SOURCE_USER)
- NETWORK_INTERFACE

The network interface that the replica is bound to, if any. (CHANGE REPLICATION SOURCE TO option: SOURCE_BIND)
- AUTO_POSITION

1 if GTID auto-positioning is in use; otherwise 0. (CHANGE REPLICATION SOURCE TO option: SOURCE_AUTO_POSITION)
- SSL_ALLOWED, SSL_CA_FILE, SSL_CA_PATH, SSL_CERTIFICATE, SSL_CIPHER, SSL_KEY, SSL_VERIFY_SERVER_CERTIFICATE, SSL_CRL_FILE, SSL_CRL_PATH

These columns show the SSL parameters used by the replica to connect to the source, if any.
SSL_ALLOWED has these values:
- Yes if an SSL connection to the source is permitted
- No if an SSL connection to the source is not permitted
- Ignored if an SSL connection is permitted but the replica does not have SSL support enabled
(CHANGE REPLICATION SOURCE TO options for the other SSL columns: SOURCE_SSL_CA, SOURCE_SSL_CAPATH, SOURCE_SSL_CERT, SOURCE_SSL_CIPHER, SOURCE_SSL_CRL, SOURCE_SSL_CRLPATH, SOURCE_SSL_KEY, SOURCE_SSL_VERIFY_SERVER_CERT)
- CONNECTION_RETRY_INTERVAL

The number of seconds between connect retries. (CHANGE REPLICATION SOURCE TO option: SOURCE_CONNECT_RETRY)
- CONNECTION_RETRY_COUNT

The number of times the replica can attempt to reconnect to the source in the event of a lost connection. (CHANGE REPLICATION SOURCE TO option: SOURCE_RETRY_COUNT)
- HEARTBEAT_INTERVAL

The replication heartbeat interval on a replica, measured in seconds. (CHANGE REPLICATION SOURCE TO option: SOURCE_HEARTBEAT_PERIOD)
- TLS_VERSION

The list of TLS protocol versions that are permitted by the replica for the replication connection. For TLS version information, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers". (CHANGE REPLICATION SOURCE TO option: SOURCE_TLS_VERSION)
- TLS_CIPHERSUITES

The list of ciphersuites that are permitted by the replica for the replication connection. For TLS ciphersuite information, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers". (CHANGE REPLICATION SOURCE TO option: SOURCE_TLS_CIPHERSUITES)
- PUBLIC_KEY_PATH

The path name to a file containing a replica-side copy of the public key required by the source for RSA key pair-based password exchange. The file must be in PEM format. This column applies to replicas that authenticate with the sha256_password (deprecated) or caching_sha2_password authentication plugin. (CHANGE REPLICATION SOURCE TO option: SOURCE_PUBLIC_KEY_PATH)

If PUBLIC_KEY_PATH is given and specifies a valid public key file, it takes precedence over GET_PUBLIC_KEY.
- GET_PUBLIC_KEY

Whether to request from the source the public key required for RSA key pair-based password exchange. This column applies to replicas that authenticate with the caching_sha2_password authentication plugin. For that plugin, the source does not send the public key unless requested.
(CHANGE REPLICATION SOURCE TO option: GET_SOURCE_PUBLIC_KEY)
If PUBLIC_KEY_PATH is given and specifies a valid public key file, it takes precedence over GET_PUBLIC_KEY.
- NETWORK_NAMESPACE

The network namespace name; empty if the connection uses the default (global) namespace. For information about network namespaces, see Section 7.1.14, "Network Namespace Support".
- COMPRESSION_ALGORITHM

The permitted compression algorithms for connections to the source. (CHANGE REPLICATION SOURCE TO option: SOURCE_COMPRESSION_ALGORITHMS)

For more information, see Section 6.2.8, "Connection Compression Control".
- ZSTD_COMPRESSION_LEVEL

The compression level to use for connections to the source that use the zstd compression algorithm. (CHANGE REPLICATION SOURCE TO option: SOURCE_ZSTD_COMPRESSION_LEVEL)

For more information, see Section 6.2.8, "Connection Compression Control".
- SOURCE_CONNECTION_AUTO_FAILOVER

Whether the asynchronous connection failover mechanism is activated for this replication channel. (CHANGE REPLICATION SOURCE TO option: SOURCE_CONNECTION_AUTO_FAILOVER)

For more information, see Section 19.4.9, "Switching Sources and Replicas with Asynchronous Connection Failover".
- GTID_ONLY

Indicates if this channel only uses GTIDs for the transaction queueing and application process and for recovery, and does not persist binary log and relay log file names and file positions in the replication metadata repositories. (CHANGE REPLICATION SOURCE TO option: GTID_ONLY)

For more information, see Section 20.4.1, "GTIDs and Group Replication".
The replication_connection_configuration table has these indexes:
- Primary key on (CHANNEL_NAME)

TRUNCATE TABLE is not permitted for the replication_connection_configuration table.
The following table shows the correspondence between replication_connection_configuration columns and SHOW REPLICA STATUS columns.

\begin{tabular}{|l|l|}
\hline replication_connection_configuration Column & SHOW REPLICA STATUS Column \\
\hline CHANNEL_NAME & Channel_name \\
\hline HOST & Source_Host \\
\hline PORT & Source_Port \\
\hline USER & Source_User \\
\hline NETWORK_INTERFACE & Source_Bind \\
\hline AUTO_POSITION & Auto_Position \\
\hline SSL_ALLOWED & Source_SSL_Allowed \\
\hline SSL_CA_FILE & Source_SSL_CA_File \\
\hline SSL_CA_PATH & Source_SSL_CA_Path \\
\hline SSL_CERTIFICATE & Source_SSL_Cert \\
\hline SSL_CIPHER & Source_SSL_Cipher \\
\hline SSL_KEY & Source_SSL_Key \\
\hline SSL_VERIFY_SERVER_CERTIFICATE & Source_SSL_Verify_Server_Cert \\
\hline SSL_CRL_FILE & Source_SSL_Crl \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline replication_connection_configuration Column & SHOW REPLICA STATUS Column \\
\hline SSL_CRL_PATH & Source_SSL_Crlpath \\
\hline CONNECTION_RETRY_INTERVAL & Source_Connect_Retry \\
\hline CONNECTION_RETRY_COUNT & Source_Retry_Count \\
\hline HEARTBEAT_INTERVAL & None \\
\hline TLS_VERSION & Source_TLS_Version \\
\hline PUBLIC_KEY_PATH & Source_public_key_path \\
\hline GET_PUBLIC_KEY & Get_source_public_key \\
\hline NETWORK_NAMESPACE & Network_Namespace \\
\hline COMPRESSION_ALGORITHM & [None] \\
\hline ZSTD_COMPRESSION_LEVEL & [None] \\
\hline GTID_ONLY & [None] \\
\hline
\end{tabular}

\subsection*{29.12.11.12 The replication_group_configuration_version Table}

This table displays the version of the member actions configuration for replication group members. The table is available only when Group Replication is installed. Whenever a member action is enabled or disabled using the group_replication_enable_member_action() and group_replication_disable_member_action( ) functions, the version number is incremented. You can reset the member actions configuration using the group_replication_reset_member_actions() function, which resets the member actions configuration to the default settings, and resets its version number to 1 . For more information, see Section 20.5.1.5, "Configuring Member Actions".

The replication_group_configuration_version table has these columns:
- NAME

The name of the configuration.
- VERSION

The version number of the configuration.
The replication_group_configuration_version table has no indexes.
TRUNCATE TABLE is not permitted for the replication_group_configuration_version table.

\subsection*{29.12.11.13 The replication_connection_status Table}

This table shows the current status of the I/O thread that handles the replica's connection to the source, information on the last transaction queued in the relay log, and information on the transaction currently being queued in the relay log.

Compared to the replication_connection_configuration table, replication_connection_status changes more frequently. It contains values that change during the connection, whereas replication_connection_configuration contains values which define how the replica connects to the source and that remain constant during the connection.

The replication_connection_status table has these columns:
- CHANNEL_NAME

The replication channel which this row is displaying. There is always a default replication channel, and more replication channels can be added. See Section 19.2.2, "Replication Channels" for more information.
- GROUP_NAME

If this server is a member of a group, shows the name of the group the server belongs to.
- SOURCE_UUID

The server_uuid value from the source.
- THREAD_ID

The I/O thread ID.
- SERVICE_STATE

ON (thread exists and is active or idle), OFF (thread no longer exists), or CONNECTING (thread exists and is connecting to the source).
- RECEIVED_TRANSACTION_SET

The set of global transaction IDs (GTIDs) corresponding to all transactions received by this replica. Empty if GTIDs are not in use. See GTID Sets for more information.
- LAST_ERROR_NUMBER, LAST_ERROR_MESSAGE

The error number and error message of the most recent error that caused the I/O thread to stop. An error number of 0 and message of the empty string mean "no error." If the LAST_ERROR_MESSAGE value is not empty, the error values also appear in the replica's error log.

Issuing RESET BINARY LOGS AND GTIDS or RESET REPLICA resets the values shown in these columns.
- LAST_ERROR_TIMESTAMP

A timestamp in ' YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when the most recent I/O error took place.
- LAST_HEARTBEAT_TIMESTAMP

A timestamp in 'YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when the most recent heartbeat signal was received by a replica.
- COUNT_RECEIVED_HEARTBEATS

The total number of heartbeat signals that a replica received since the last time it was restarted or reset, or a CHANGE REPLICATION SOURCE TO statement was issued.
- LAST_QUEUED_TRANSACTION

The global transaction ID (GTID) of the last transaction that was queued to the relay log.
- LAST_QUEUED_TRANSACTION_ORIGINAL_COMMIT_TIMESTAMP

A timestamp in 'YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when the last transaction queued in the relay log was committed on the original source.
- LAST_QUEUED_TRANSACTION_IMMEDIATE_COMMIT_TIMESTAMP

A timestamp in 'YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when the last transaction queued in the relay log was committed on the immediate source.
- LAST_QUEUED_TRANSACTION_START_QUEUE_TIMESTAMP

A timestamp in 'YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when the last transaction was placed in the relay log queue by this I/O thread.
- LAST_QUEUED_TRANSACTION_END_QUEUE_TIMESTAMP

A timestamp in 'YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when the last transaction was queued to the relay log files.
- QUEUEING_TRANSACTION

The global transaction ID (GTID) of the currently queueing transaction in the relay log.
- QUEUEING_TRANSACTION_ORIGINAL_COMMIT_TIMESTAMP

A timestamp in ' $Y Y Y Y-M M-D D$ hh:mm:ss[.fraction]' format that shows when the currently queueing transaction was committed on the original source.
- QUEUEING_TRANSACTION_IMMEDIATE_COMMIT_TIMESTAMP

A timestamp in ' $Y Y Y Y-M M-D D$ hh:mm:ss[.fraction]' format that shows when the currently queueing transaction was committed on the immediate source.
- QUEUEING_TRANSACTION_START_QUEUE_TIMESTAMP

A timestamp in ' YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when the first event of the currently queueing transaction was written to the relay log by this I/O thread.

When the Performance Schema is disabled, local timing information is not collected, so the fields showing the start and end timestamps for queued transactions are zero.

The replication_connection_status table has these indexes:
- Primary key on (CHANNEL_NAME)
- Index on (THREAD_ID)

The following table shows the correspondence between replication_connection_status columns and SHOW REPLICA STATUS columns.

\begin{tabular}{|l|l|}
\hline replication_connection_status Column & SHOW REPLICA STATUS Column \\
\hline SOURCE_UUID & Master_UUID \\
\hline THREAD_ID & None \\
\hline SERVICE_STATE & Replica_IO_Running \\
\hline RECEIVED_TRANSACTION_SET & Retrieved_Gtid_Set \\
\hline LAST_ERROR_NUMBER & Last_IO_Errno \\
\hline LAST_ERROR_MESSAGE & Last_IO_Error \\
\hline LAST_ERROR_TIMESTAMP & Last_IO_Error_Timestamp \\
\hline
\end{tabular}

\subsection*{29.12.11.14 The replication_group_member_actions Table}

This table lists the member actions that are included in the member actions configuration for replication group members. The table is available only when Group Replication is installed. You can reset the member actions configuration using the group_replication_reset_member_actions() function. For more information, see Section 20.5.1.5, "Configuring Member Actions".

The replication_group_member_actions table has these columns:
- NAME

The name of the member action.
- EVENT

The event that triggers the member action.
- ENABLED

Whether the member action is currently enabled. Member actions can be enabled using the group_replication_enable_member_action( ) function and disabled using the group_replication_disable_member_action() function.
- TYPE

The type of member action. INTERNAL is an action that is provided by the Group Replication plugin.
- PRIORITY

The priority of the member action. Actions with lower priority values are actioned first.
- ERROR_HANDLING

The action that Group Replication takes if an error occurs when the member action is being carried out. IGNORE means that an error message is logged to say that the member action failed, but no further action is taken. CRITICAL means that the member moves into ERROR state, and takes the action specified by the group_replication_exit_state_action system variable.

The replication_group_member_actions table has no indexes.
TRUNCATE TABLE is not permitted for the replication_group_member_actions table.

\subsection*{29.12.11.15 The replication_group_member_stats Table}

This table shows statistical information for replication group members. It is populated only when Group Replication is running.

The replication_group_member_stats table has these columns:
- CHANNEL_NAME

Name of the Group Replication channel
- VIEW_ID

Current view identifier for this group.
- MEMBER_ID

The member server UUID. This has a different value for each member in the group. This also serves as a key because it is unique to each member.
- COUNT_TRANSACTIONS_IN_QUEUE

The number of transactions in the queue pending conflict detection checks. Once the transactions have been checked for conflicts, if they pass the check, they are queued to be applied as well.
- COUNT_TRANSACTIONS_CHECKED

The number of transactions that have been checked for conflicts.
- COUNT_CONFLICTS_DETECTED

The number of transactions that have not passed the conflict detection check.
- COUNT_TRANSACTIONS_ROWS_VALIDATING

Number of transaction rows which can be used for certification, but have not been garbage collected. Can be thought of as the current size of the conflict detection database against which each transaction is certified.
- TRANSACTIONS_COMMITTED_ALL_MEMBERS

The transactions that have been successfully committed on all members of the replication group, shown as GTID Sets. This is updated at a fixed time interval.
- LAST_CONFLICT_FREE_TRANSACTION

The transaction identifier of the last conflict free transaction which was checked.
- COUNT_TRANSACTIONS_REMOTE_IN_APPLIER_QUEUE

The number of transactions that this member has received from the replication group which are waiting to be applied.
- COUNT_TRANSACTIONS_REMOTE_APPLIED

Number of transactions this member has received from the group and applied.
- COUNT_TRANSACTIONS_LOCAL_PROPOSED

Number of transactions which originated on this member and were sent to the group.
- COUNT_TRANSACTIONS_LOCAL_ROLLBACK

Number of transactions which originated on this member and were rolled back by the group.
The replication_group_member_stats table has no indexes.
TRUNCATE TABLE is not permitted for the replication_group_member_stats table.

\subsection*{29.12.11.16 The replication_group_members Table}

This table shows network and status information for replication group members. The network addresses shown are the addresses used to connect clients to the group, and should not be confused with the member's internal group communication address specified by group_replication_local_address.

The replication_group_members table has these columns:
- CHANNEL_NAME

Name of the Group Replication channel.
- MEMBER_ID

The member server UUID. This has a different value for each member in the group. This also serves as a key because it is unique to each member.
- MEMBER_HOST

Network address of this member (host name or IP address). Retrieved from the member's hostname variable. This is the address which clients connect to, unlike the group_replication_local_address which is used for internal group communication.
- MEMBER_PORT

Port on which the server is listening. Retrieved from the member's port variable.
- MEMBER_STATE

Current state of this member; can be any one of the following:
- ONLINE: The member is in a fully functioning state.
- RECOVERING: The server has joined a group from which it is retrieving data.
- OFFLINE: The group replication plugin is installed but has not been started.
- ERROR: The member has encountered an error, either during applying transactions or during the recovery phase, and is not participating in the group's transactions.
- UNREACHABLE: The failure detection process suspects that this member cannot be contacted, because the group messages have timed out.

See Section 20.4.2, "Group Replication Server States".
- MEMBER_ROLE

Role of the member in the group, either PRIMARY or SECONDARY.
- MEMBER_VERSION

MySQL version of the member.
- MEMBER_COMMUNICATION_STACK

The communication stack used for the group, either the XCOM communication stack or the MYSQL communication stack.

The replication_group_members table has no indexes.
TRUNCATE TABLE is not permitted for the replication_group_members table.

\subsection*{29.12.12 Performance Schema NDB Cluster Tables}

The following table shows all Performance Schema tables relating to the NDBCLUSTER storage engine.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 29.3 Performance Schema NDB Tables}
\begin{tabular}{|l|l|}
\hline Table Name & Description \\
\hline ndb_sync_excluded_objects & NDB objects which cannot be synchronized \\
\hline ndb_sync_pending_objects & NDB objects waiting for synchronization \\
\hline
\end{tabular}
\end{table}

Automatic synchronization in NDB attempts to detect and synchronize automatically all mismatches in metadata between the NDB Cluster's internal dictionary and the MySQL Server's datadictionary. This is done by default in the background at regular intervals as determined by the ndb_metadata_check_interval system variable, unless disabled using ndb_metadata_check or overridden by setting ndb_metadata_sync.

Information about the current state of automatic synchronization is exposed by a MySQL server acting as an SQL node in an NDB Cluster in these two Performance Schema tables:
- ndb_sync_pending_objects: Displays information about NDB database objects for which mismatches have been detected between the NDB dictionary and the MySQL data dictionary. When attempting to synchronize such objects, NDB removes the object from the queue awaiting synchronization, and from this table, and tries to reconcile the mismatch. If synchronization of the object fails due to a temporary error, it is picked up and added back to the queue (and to this table)
the next time NDB performs mismatch detection; if the attempts fails due a permanent error, the object is added to the ndb_sync_excluded_objects table.
- ndb_sync_excluded_objects: Shows information about NDB database objects for which automatic synchronization has failed due to permanent errors resulting from mismatches which cannot be reconciled without manual intervention; these objects are blocklisted and not considered again for mismatch detection until this has been done.

The ndb_sync_pending_objects and ndb_sync_excluded_objects tables are present only if MySQL has support enabled for the NDBCLUSTER storage engine.

These tables are described in more detail in the following two sections.

\subsection*{29.12.12.1 The ndb_sync_pending_objects Table}

This table provides information about NDB database objects for which mismatches have been detected and which are waiting to be synchronized between the NDB dictionary and the MySQL data dictionary.

Example information about NDB database objects awaiting synchronization:
```
mysql> SELECT * FROM performance_schema.ndb_sync_pending_objects;
+--------------+------+----------------+
| SCHEMA_NAME | NAME | TYPE |
+--------------+------+----------------+
| NULL | lg1 | LOGFILE GROUP |
| NULL | ts1 | TABLESPACE
| db1 | NULL | SCHEMA
| test | t1 | TABLE
| test | t2 | TABLE
| test | t3 | TABLE
+--------------+------+----------------+
```


The ndb_sync_pending_objects table has these columns:
- SCHEMA_NAME: The name of the schema (database) in which the object awaiting synchronization resides; this is NULL for tablespaces and log file groups
- NAME: The name of the object awaiting synchronization; this is NULL if the object is a schema
- TYPE: The type of the object awaiting synchronization; this is one of LOGFILE GROUP, TABLESPACE, SCHEMA, or TABLE

\subsection*{29.12.12.2 The ndb_sync_excluded_objects Table}

This table provides information about NDB database objects which cannot be automatically synchronized between NDB Cluster's dictionary and the MySQL data dictionary.

Example information about NDB database objects which cannot be synchronized with the MySQL data dictionary:
```
mysql> SELECT * FROM performance_schema.ndb_sync_excluded_objects\G
************************** 1. row *****************************
SCHEMA_NAME: NULL
        NAME: lg1
        TYPE: LOGFILE GROUP
    REASON: Injected failure
*************************** 2. row ****************************************
SCHEMA_NAME: NULL
        NAME: ts1
        TYPE: TABLESPACE
    REASON: Injected failure
************************* 3. row ******************************************
SCHEMA_NAME: db1
        NAME: NULL
        TYPE: SCHEMA
    REASON: Injected failure
*************************** 4 row *****************************************
```

```
SCHEMA_NAME: test
        NAME: t1
        TYPE: TABLE
    REASON: Injected failure
************************* 5. row ******************************************
SCHEMA_NAME: test
        NAME: t2
        TYPE: TABLE
    REASON: Injected failure
************************** 6. row *****************************************
SCHEMA_NAME: test
        NAME: t3
        TYPE: TABLE
    REASON: Injected failure
```


The ndb_sync_excluded_objects table has these columns:
- SCHEMA_NAME: The name of the schema (database) in which the object which has failed to synchronize resides; this is NULL for tablespaces and log file groups
- NAME: The name of the object which has failed to synchronize; this is NULL if the object is a schema
- TYPE: The type of the object has failed to synchronize; this is one of LOGFILE GROUP, TABLESPACE, SCHEMA, or TABLE
- REASON: The reason for exclusion (blocklisting) of the object; that is, the reason for the failure to synchronize this object

Possible reasons include the following:
- Injected failure
- Failed to determine if object existed in NDB
- Failed to determine if object existed in DD
- Failed to drop object in DD
- Failed to get undofiles assigned to logfile group
- Failed to get object id and version
- Failed to install object in DD
- Failed to get datafiles assigned to tablespace
- Failed to create schema
- Failed to determine if object was a local table
- Failed to invalidate table references
- Failed to set database name of NDB object
- Failed to get extra metadata of table
- Failed to migrate table with extra metadata version 1
- Failed to get object from DD
- Definition of table has changed in NDB Dictionary
- Failed to setup binlogging for table

This list is not necessarily exhaustive, and is subject to change in future NDB releases.

\subsection*{29.12.13 Performance Schema Lock Tables}

The Performance Schema exposes lock information through these tables:
- data_locks: Data locks held and requested
- data_lock_waits: Relationships between data lock owners and data lock requestors blocked by those owners
- metadata_locks: Metadata locks held and requested
- table_handles: Table locks held and requested

The following sections describe these tables in more detail.

\subsection*{29.12.13.1 The data_locks Table}

The data_locks table shows data locks held and requested. For information about which lock requests are blocked by which held locks, see Section 29.12.13.2, "The data_lock_waits Table".

Example data lock information:
```
mysql> SELECT * FROM performance_schema.data_locks\G
*************************** 1. rOW ***************************************
                    ENGINE: INNODB
        ENGINE_LOCK_ID: 139664434886512:1059:139664350547912
ENGINE_TRANSACTION_ID: 2569
                    THREAD_ID: 46
                        EVENT_ID: 12
            OBJECT_SCHEMA: test
                OBJECT_NAME: t1
        PARTITION_NAME: NULL
    SUBPARTITION_NAME: NULL
                    INDEX_NAME: NULL
OBJECT_INSTANCE_BEGIN: 139664350547912
                    LOCK_TYPE: TABLE
                    LOCK_MODE: IX
                LOCK_STATUS: GRANTED
                    LOCK_DATA: NULL
************************** 2. rOW *****************************************
                            ENGINE: INNODB
        ENGINE_LOCK_ID: 139664434886512:2:4:1:139664350544872
ENGINE_TRANSACTION_ID: 2569
                    THREAD_ID: 46
                        EVENT_ID: 12
            OBJECT_SCHEMA: test
                OBJECT_NAME: t1
        PARTITION_NAME: NULL
    SUBPARTITION_NAME: NULL
                    INDEX_NAME: GEN_CLUST_INDEX
OBJECT_INSTANCE_BEGIN: 139664350544872
                    LOCK_TYPE: RECORD
                    LOCK_MODE: X
                LOCK_STATUS: GRANTED
                    LOCK_DATA: supremum pseudo-record
```


Unlike most Performance Schema data collection, there are no instruments for controlling whether data lock information is collected or system variables for controlling data lock table sizes. The Performance Schema collects information that is already available in the server, so there is no memory or CPU overhead to generate this information or need for parameters that control its collection.

Use the data_locks table to help diagnose performance problems that occur during times of heavy concurrent load. For InnoDB, see the discussion of this topic at Section 17.15.2, "InnoDB INFORMATION_SCHEMA Transaction and Locking Information".

The data_locks table has these columns:
- ENGINE

The storage engine that holds or requested the lock.
- ENGINE_LOCK_ID

The ID of the lock held or requested by the storage engine. Tuples of (ENGINE_LOCK_ID, ENGINE) values are unique.

Lock ID formats are internal and subject to change at any time. Applications should not rely on lock IDs having a particular format.
- ENGINE_TRANSACTION_ID

The storage engine internal ID of the transaction that requested the lock. This can be considered the owner of the lock, although the lock might still be pending, not actually granted yet (LOCK_STATUS='WAITING').

If the transaction has not yet performed any write operation (is still considered read only), the column contains internal data that users should not try to interpret. Otherwise, the column is the transaction ID.

For InnoDB, to obtain details about the transaction, join this column with the TRX_ID column of the INFORMATION_SCHEMA INNODB_TRX table.
- THREAD_ID

The thread ID of the session that created the lock. To obtain details about the thread, join this column with the THREAD_ID column of the Performance Schema threads table.

THREAD_ID can be used together with EVENT_ID to determine the event during which the lock data structure was created in memory. (This event might have occurred before this particular lock request occurred, if the data structure is used to store multiple locks.)
- EVENT_ID

The Performance Schema event that caused the lock. Tuples of (THREAD_ID, EVENT_ID) values implicitly identify a parent event in other Performance Schema tables:
- The parent wait event in the events_waits_xxx tables
- The parent stage event in the events_stages_xxx tables
- The parent statement event in the events_statements_xxx tables
- The parent transaction event in the events_transactions_current table

To obtain details about the parent event, join the THREAD_ID and EVENT_ID columns with the columns of like name in the appropriate parent event table. See Section 29.19.2, "Obtaining Parent Event Information".
- OBJECT_SCHEMA

The schema that contains the locked table.
- OBJECT_NAME

The name of the locked table.
- PARTITION_NAME

The name of the locked partition, if any; NULL otherwise.
- SUBPARTITION_NAME

The name of the locked subpartition, if any; NULL otherwise.
- INDEX_NAME

The name of the locked index, if any; NULL otherwise.
In practice, InnoDB always creates an index (GEN_CLUST_INDEX), so INDEX_NAME is non-NULL for InnoDB tables.
- OBJECT_INSTANCE_BEGIN

The address in memory of the lock.
- LOCK_TYPE

The type of lock.
The value is storage engine dependent. For InnoDB, permitted values are RECORD for a row-level lock, TABLE for a table-level lock.
- LOCK_MODE

How the lock is requested.
The value is storage engine dependent. For InnoDB, permitted values are S [, GAP], X [, GAP], IS[, GAP], IX[, GAP], AUTO_INC, and UNKNOWN. Lock modes other than AUTO_INC and UNKNOWN indicate gap locks, if present. For information about S, X, IS, IX, and gap locks, refer to Section 17.7.1, "InnoDB Locking".
- LOCK_STATUS

The status of the lock request.
The value is storage engine dependent. For InnoDB, permitted values are GRANTED (lock is held) and WAITING (lock is being waited for).
- LOCK_DATA

The data associated with the lock, if any. The value is storage engine dependent. For InnoDB, a value is shown if the LOCK_TYPE is RECORD, otherwise the value is NULL. Primary key values of the locked record are shown for a lock placed on the primary key index. Secondary index values of the locked record are shown with primary key values appended for a lock placed on a secondary index. If there is no primary key, LOCK_DATA shows either the key values of a selected unique index or the unique InnoDB internal row ID number, according to the rules governing InnoDB clustered index use (see Section 17.6.2.1, "Clustered and Secondary Indexes"). LOCK_DATA reports "supremum pseudo-record" for a lock taken on a supremum pseudo-record. If the page containing the locked record is not in the buffer pool because it was written to disk while the lock was held, InnoDB does not fetch the page from disk. Instead, LOCK_DATA reports NULL.

The data_locks table has these indexes:
- Primary key on (ENGINE_LOCK_ID, ENGINE)
- Index on (ENGINE_TRANSACTION_ID, ENGINE)
- Index on (THREAD_ID, EVENT_ID)
- Index on (OBJECT_SCHEMA, OBJECT_NAME, PARTITION_NAME, SUBPARTITION_NAME)

TRUNCATE TABLE is not permitted for the data_locks table.

\subsection*{29.12.13.2 The data_lock_waits Table}

The data_lock_waits table implements a many-to-many relationship showing which data lock requests in the data_locks table are blocked by which held data locks in the data_locks table. Held locks in data_locks appear in data_lock_waits only if they block some lock request.

This information enables you to understand data lock dependencies between sessions. The table exposes not only which lock a session or transaction is waiting for, but which session or transaction currently holds that lock.

Example data lock wait information:
```
mysql> SELECT * FROM performance_schema.data_lock_waits\G
*************************** 1. row *****************************
                    ENGINE: INNODB
    REQUESTING_ENGINE_LOCK_ID: 140211201964816:2:4:2:140211086465800
REQUESTING_ENGINE_TRANSACTION_ID: 1555
                REQUESTING_THREAD_ID: 47
                    REQUESTING_EVENT_ID: 5
REQUESTING_OBJECT_INSTANCE_BEGIN: 140211086465800
            BLOCKING_ENGINE_LOCK_ID: 140211201963888:2:4:2:140211086459880
    BLOCKING_ENGINE_TRANSACTION_ID: 1554
                    BLOCKING_THREAD_ID: 46
                        BLOCKING_EVENT_ID: 12
    BLOCKING_OBJECT_INSTANCE_BEGIN: 140211086459880
```


Unlike most Performance Schema data collection, there are no instruments for controlling whether data lock information is collected or system variables for controlling data lock table sizes. The Performance Schema collects information that is already available in the server, so there is no memory or CPU overhead to generate this information or need for parameters that control its collection.

Use the data_lock_waits table to help diagnose performance problems that occur during times of heavy concurrent load. For InnoDB, see the discussion of this topic at Section 17.15.2, "InnoDB INFORMATION_SCHEMA Transaction and Locking Information".

Because the columns in the data_lock_waits table are similar to those in the data_locks table, the column descriptions here are abbreviated. For more detailed column descriptions, see Section 29.12.13.1, "The data_locks Table".

The data_lock_waits table has these columns:
- ENGINE

The storage engine that requested the lock.
- REQUESTING_ENGINE_LOCK_ID

The ID of the lock requested by the storage engine. To obtain details about the lock, join this column with the ENGINE_LOCK_ID column of the data_locks table.
- REQUESTING_ENGINE_TRANSACTION_ID

The storage engine internal ID of the transaction that requested the lock.
- REQUESTING_THREAD_ID

The thread ID of the session that requested the lock.
- REQUESTING_EVENT_ID

The Performance Schema event that caused the lock request in the session that requested the lock.
- REQUESTING_OBJECT_INSTANCE_BEGIN

The address in memory of the requested lock.
- BLOCKING_ENGINE_LOCK_ID

The ID of the blocking lock. To obtain details about the lock, join this column with the ENGINE_LOCK_ID column of the data_locks table.
- BLOCKING_ENGINE_TRANSACTION_ID

The storage engine internal ID of the transaction that holds the blocking lock.
- BLOCKING_THREAD_ID

The thread ID of the session that holds the blocking lock.
- BLOCKING_EVENT_ID

The Performance Schema event that caused the blocking lock in the session that holds it.
- BLOCKING_OBJECT_INSTANCE_BEGIN

The address in memory of the blocking lock.
The data_lock_waits table has these indexes:
- Index on (REQUESTING_ENGINE_LOCK_ID, ENGINE)
- Index on (BLOCKING_ENGINE_LOCK_ID, ENGINE)
- Index on (REQUESTING_ENGINE_TRANSACTION_ID, ENGINE)
- Index on (BLOCKING_ENGINE_TRANSACTION_ID, ENGINE)
- Index on (REQUESTING_THREAD_ID, REQUESTING_EVENT_ID)
- Index on (BLOCKING_THREAD_ID, BLOCKING_EVENT_ID)

TRUNCATE TABLE is not permitted for the data_lock_waits table.

\subsection*{29.12.13.3 The metadata_locks Table}

MySQL uses metadata locking to manage concurrent access to database objects and to ensure data consistency; see Section 10.11.4, "Metadata Locking". Metadata locking applies not just to tables, but also to schemas, stored programs (procedures, functions, triggers, scheduled events), tablespaces, user locks acquired with the GET_LOCK ( ) function (see Section 14.14, "Locking Functions"), and locks acquired with the locking service described in Section 7.6.9.1, "The Locking Service".

The Performance Schema exposes metadata lock information through the metadata_locks table:
- Locks that have been granted (shows which sessions own which current metadata locks).
- Locks that have been requested but not yet granted (shows which sessions are waiting for which metadata locks).
- Lock requests that have been killed by the deadlock detector.
- Lock requests that have timed out and are waiting for the requesting session's lock request to be discarded.

This information enables you to understand metadata lock dependencies between sessions. You can see not only which lock a session is waiting for, but which session currently holds that lock.

The metadata_locks table is read only and cannot be updated. It is autosized by default; to configure the table size, set the performance_schema_max_metadata_locks system variable at server startup.

Metadata lock instrumentation uses the wait/lock/metadata/sql/mdl instrument, which is enabled by default.

To control metadata lock instrumentation state at server startup, use lines like these in your my.cnf file:
- Enable:
```
[mysqld]
performance-schema-instrument='wait/lock/metadata/sql/mdl=ON'
```

- Disable:
```
[mysqld]
performance-schema-instrument='wait/lock/metadata/sql/mdl=0FF'
```


To control metadata lock instrumentation state at runtime, update the setup_instruments table:
- Enable:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME = 'wait/lock/metadata/sql/mdl';
```

- Disable:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = 'NO', TIMED = 'NO'
WHERE NAME = 'wait/lock/metadata/sql/mdl';
```


The Performance Schema maintains metadata_locks table content as follows, using the LOCK_STATUS column to indicate the status of each lock:
- When a metadata lock is requested and obtained immediately, a row with a status of GRANTED is inserted.
- When a metadata lock is requested and not obtained immediately, a row with a status of PENDING is inserted.
- When a metadata lock previously requested is granted, its row status is updated to GRANTED.
- When a metadata lock is released, its row is deleted.
- When a pending lock request is canceled by the deadlock detector to break a deadlock (ER_LOCK_DEADLOCK), its row status is updated from PENDING to VICTIM.
- When a pending lock request times out (ER_LOCK_WAIT_TIMEOUT), its row status is updated from PENDING to TIMEOUT.
- When granted lock or pending lock request is killed, its row status is updated from GRANTED or PENDING to KILLED.
- The VICTIM, TIMEOUT, and KILLED status values are brief and signify that the lock row is about to be deleted.
- The PRE_ACQUIRE_NOTIFY and POST_RELEASE_NOTIFY status values are brief and signify that the metadata locking subsubsystem is notifying interested storage engines while entering lock acquisition operations or leaving lock release operations.

The metadata_locks table has these columns:
- OBJECT_TYPE

The type of lock used in the metadata lock subsystem. The value is one of GLOBAL, SCHEMA, TABLE, FUNCTION, PROCEDURE, TRIGGER (currently unused), EVENT, COMMIT, USER LEVEL LOCK, TABLESPACE, BACKUP LOCK, or LOCKING SERVICE.

A value of USER LEVEL LOCK indicates a lock acquired with GET_LOCK( ). A value of LOCKING SERVICE indicates a lock acquired with the locking service described in Section 7.6.9.1, "The Locking Service".
- OBJECT_SCHEMA

The schema that contains the object.
- OBJECT_NAME

The name of the instrumented object.
- OBJECT_INSTANCE_BEGIN

The address in memory of the instrumented object.
- LOCK_TYPE

The lock type from the metadata lock subsystem. The value is one of INTENTION_EXCLUSIVE, SHARED, SHARED_HIGH_PRIO, SHARED_READ, SHARED_WRITE, SHARED_UPGRADABLE, SHARED_NO_WRITE, SHARED_NO_READ_WRITE, or EXCLUSIVE.
- LOCK_DURATION

The lock duration from the metadata lock subsystem. The value is one of STATEMENT, TRANSACTION, or EXPLICIT. The STATEMENT and TRANSACTION values signify locks that are released implicitly at statement or transaction end, respectively. The EXPLICIT value signifies locks that survive statement or transaction end and are released by explicit action, such as global locks acquired with FLUSH TABLES WITH READ LOCK.
- LOCK_STATUS

The lock status from the metadata lock subsystem. The value is one of PENDING, GRANTED, VICTIM, TIMEOUT, KILLED, PRE_ACQUIRE_NOTIFY, or POST_RELEASE_NOTIFY. The Performance Schema assigns these values as described previously.
- SOURCE

The name of the source file containing the instrumented code that produced the event and the line number in the file at which the instrumentation occurs. This enables you to check the source to determine exactly what code is involved.
- OWNER_THREAD_ID

The thread requesting a metadata lock.
- OWNER_EVENT_ID

The event requesting a metadata lock.
The metadata_locks table has these indexes:
- Primary key on (OBJECT_INSTANCE_BEGIN)
- Index on (OBJECT_TYPE, OBJECT_SCHEMA, OBJECT_NAME)
- Index on (OWNER_THREAD_ID, OWNER_EVENT_ID)

TRUNCATE TABLE is not permitted for the metadata_locks table.

\subsection*{29.12.13.4 The table_handles Table}

The Performance Schema exposes table lock information through the table_handles table to show the table locks currently in effect for each opened table handle. table_handles reports what is recorded by the table lock instrumentation. This information shows which table handles the server has open, how they are locked, and by which sessions.

The table_handles table is read only and cannot be updated. It is autosized by default; to configure the table size, set the performance_schema_max_table_handles system variable at server startup.

Table lock instrumentation uses the wait/lock/table/sql/handler instrument, which is enabled by default.

To control table lock instrumentation state at server startup, use lines like these in your my.cnf file:
- Enable:
```
[mysqld]
performance-schema-instrument='wait/lock/table/sql/handler=ON'
```

- Disable:
```
[mysqld]
performance-schema-instrument='wait/lock/table/sql/handler=OFF'
```


To control table lock instrumentation state at runtime, update the setup_instruments table:
- Enable:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME = 'wait/lock/table/sql/handler';
```

- Disable:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = 'NO', TIMED = 'NO'
WHERE NAME = 'wait/lock/table/sql/handler';
```


The table_handles table has these columns:
- OBJECT_TYPE

The table opened by a table handle.
- OBJECT_SCHEMA

The schema that contains the object.
- OBJECT_NAME

The name of the instrumented object.
- OBJECT_INSTANCE_BEGIN

The table handle address in memory.
- OWNER_THREAD_ID

The thread owning the table handle.
- OWNER_EVENT_ID

The event which caused the table handle to be opened.
- INTERNAL_LOCK

The table lock used at the SQL level. The value is one of READ, READ WITH SHARED LOCKS, READ HIGH PRIORITY, READ NO INSERT, WRITE ALLOW WRITE, WRITE CONCURRENT INSERT, WRITE LOW PRIORITY, or WRITE. For information about these lock types, see the include/ thr_lock.h source file.
- EXTERNAL_LOCK

The table lock used at the storage engine level. The value is one of READ EXTERNAL or WRITE EXTERNAL.

The table_handles table has these indexes:
- Primary key on (OBJECT_INSTANCE_BEGIN)
- Index on (OBJECT_TYPE, OBJECT_SCHEMA, OBJECT_NAME)
- Index on (OWNER_THREAD_ID, OWNER_EVENT_ID)

TRUNCATE TABLE is not permitted for the table_handles table.

\subsection*{29.12.14 Performance Schema System Variable Tables}

The MySQL server maintains many system variables that indicate how it is configured (see Section 7.1.8, "Server System Variables"). System variable information is available in these Performance Schema tables:
- global_variables: Global system variables. An application that wants only global values should use this table.
- session_variables: System variables for the current session. An application that wants all system variable values for its own session should use this table. It includes the session variables for its session, as well as the values of global variables that have no session counterpart.
- variables_by_thread: Session system variables for each active session. An application that wants to know the session variable values for specific sessions should use this table. It includes session variables only, identified by thread ID.
- persisted_variables: Provides a SQL interface to the mysqld-auto.cnf file that stores persisted global system variable settings. See Section 29.12.14.1, "Performance Schema persisted_variables Table".
- variables_info: Shows, for each system variable, the source from which it was most recently set, and its range of values. See Section 29.12.14.2, "Performance Schema variables_info Table".

The SENSITIVE_VARIABLES_OBSERVER privilege is required to view the values of sensitive system variables in these tables.

The session variable tables (session_variables, variables_by_thread) contain information only for active sessions, not terminated sessions.

The global_variables and session_variables tables have these columns:
- VARIABLE_NAME

The system variable name.
- VARIABLE_VALUE

The system variable value. For global_variables, this column contains the global value. For session_variables, this column contains the variable value in effect for the current session.

The global_variables and session_variables tables have these indexes:
- Primary key on (VARIABLE_NAME)

The variables_by_thread table has these columns:
- THREAD_ID

The thread identifier of the session in which the system variable is defined.
- VARIABLE_NAME

The system variable name.
- VARIABLE_VALUE

The session variable value for the session named by the THREAD_ID column.
The variables_by_thread table has these indexes:
- Primary key on (THREAD_ID, VARIABLE_NAME)

The variables_by_thread table contains system variable information only about foreground threads. If not all threads are instrumented by the Performance Schema, this table misses some rows. In this case, the Performance_schema_thread_instances_lost status variable is greater than zero.

TRUNCATE TABLE is not supported for Performance Schema system variable tables.

\subsection*{29.12.14.1 Performance Schema persisted_variables Table}

The persisted_variables table provides an SQL interface to the mysqld-auto.cnf file that stores persisted global system variable settings, enabling the file contents to be inspected at runtime using SELECT statements. Variables are persisted using SET PERSIST or PERSIST_ONLY statements; see Section 15.7.6.1, "SET Syntax for Variable Assignment". The table contains a row for each persisted system variable in the file. Variables not persisted do not appear in the table.

The SENSITIVE_VARIABLES_OBSERVER privilege is required to view the values of sensitive system variables in this table.

For information about persisted system variables, see Section 7.1.9.3, "Persisted System Variables".
Suppose that mysqld-auto.cnf looks like this (slightly reformatted):
```
{
    "Version": 1,
    "mysql_server": {
        "max_connections": {
            "Value": "1000",
            "Metadata": {
                "Timestamp": 1.519921706e+15,
                "User": "root",
                "Host": "localhost"
            }
        },
        "autocommit": {
            "Value": "ON",
            "Metadata": {
                "Timestamp": 1.519921707e+15,
                "User": "root",
                "Host": "localhost"
            }
        }
    }
}
```


Then persisted_variables has these contents:
```
mysql> SELECT * FROM performance_schema.persisted_variables;
+-------------------+----------------+
| VARIABLE_NAME | VARIABLE_VALUE |
+-------------------+----------------+
| autocommit | ON
| max_connections | 1000
+------------------+----------------+
```


The persisted_variables table has these columns:
- VARIABLE_NAME

The variable name listed in mysqld-auto.cnf.
- VARIABLE_VALUE

The value listed for the variable in mysqld-auto.cnf.
persisted_variables has these indexes:
- Primary key on (VARIABLE_NAME)

TRUNCATE TABLE is not permitted for the persisted_variables table.

\subsection*{29.12.14.2 Performance Schema variables_info Table}

The variables_info table shows, for each system variable, the source from which it was most recently set, and its range of values.

The variables_info table has these columns:
- VARIABLE_NAME

The variable name.
- VARIABLE_SOURCE

The source from which the variable was most recently set:
- COMMAND_LINE

The variable was set on the command line.
- COMPILED

The variable has its compiled-in default value. COMPILED is the value used for variables not set any other way.
- DYNAMIC

The variable was set at runtime. This includes variables set within files specified using the init_file system variable.
- EXPLICIT

The variable was set from an option file named with the --defaults-file option.
- EXTRA

The variable was set from an option file named with the --defaults-extra-file option.
- GLOBAL

The variable was set from a global option file. This includes option files not covered by EXPLICIT, EXTRA, LOGIN, PERSISTED, SERVER, or USER.
- LOGIN

The variable was set from a user-specific login path file ( $\sim /$. mylogin. cnf).
- PERSISTED

The variable was set from a server-specific mysqld-auto.cnf option file. No row has this value if the server was started with persisted_globals_load disabled.
- SERVER

The variable was set from a server-specific \$MYSQL_HOME/my.cnf option file. For details about how MYSQL_HOME is set, see Section 6.2.2.2, "Using Option Files".
- USER

The variable was set from a user-specific $\sim /$. my . cnf option file.
- VARIABLE_PATH

If the variable was set from an option file, VARIABLE_PATH is the path name of that file. Otherwise, the value is the empty string.
- MIN_VALUE

The minimum permitted value for the variable. For a variable whose type is not numeric, this is always 0 .
- MAX_VALUE

The maximum permitted value for the variable. For a variable whose type is not numeric, this is always 0 .
- SET_TIME

The time at which the variable was most recently set. The default is the time at which the server initialized global system variables during startup.
- SET_USER, SET_HOST

The user name and host name of the client user that most recently set the variable.
If a client connects as user17 from host host34. example. com using the account 'user17'@'\%.example.com, SET_USER and SET_HOST are user17 and host34.example.com, respectively. For proxy user connections, these values correspond to the external (proxy) user, not the proxied user against which privilege checking is performed. The default for each column is the empty string, indicating that the variable has not been set since server startup.

The variables_info table has no indexes.
TRUNCATE TABLE is not permitted for the variables_info table.
If a variable with a VARIABLE_SOURCE value other than DYNAMIC is set at runtime, VARIABLE_SOURCE becomes DYNAMIC and VARIABLE_PATH becomes the empty string.

A system variable that has only a session value (such as debug_sync) cannot be set at startup or persisted. For session-only system variables, VARIABLE_SOURCE can be only COMPILED or DYNAMIC.

If a system variable has an unexpected VARIABLE_SOURCE value, consider your server startup method. For example, mysqld_safe reads option files and passes certain options it finds there as part
of the command line that it uses to start mysqld. Consequently, some system variables that you set in option files might display in variables_info as COMMAND_LINE, rather than as GLOBAL or SERVER as you might otherwise expect.

Some sample queries that use the variables_info table, with representative output:
- Display variables set on the command line:
```
mysql> SELECT VARIABLE_NAME
        FROM performance_schema.variables_info
        WHERE VARIABLE_SOURCE = 'COMMAND_LINE'
        ORDER BY VARIABLE_NAME;
+----------------+
| VARIABLE_NAME |
+----------------+
| basedir
| datadir
| log_error
| pid_file
| plugin_dir
| port
+----------------+
```

- Display variables set from persistent storage:
```
mysql> SELECT VARIABLE_NAME
    FROM performance_schema.variables_info
    WHERE VARIABLE_SOURCE = 'PERSISTED'
    ORDER BY VARIABLE_NAME;
+----------------------------+
| VARIABLE_NAME |
+---------------------------+
| event_scheduler
| max_connections
| validate_password.policy |
+---------------------------+
```

- Join variables_info with the global_variables table to display the current values of persisted variables, together with their range of values:
```
mysql> SELECT
            VI.VARIABLE_NAME, GV.VARIABLE_VALUE,
            VI.MIN_VALUE,VI.MAX_VALUE
        FROM performance_schema.variables_info AS VI
            INNER JOIN performance_schema.global_variables AS GV
            USING(VARIABLE_NAME)
        WHERE VI.VARIABLE_SOURCE = 'PERSISTED'
        ORDER BY VARIABLE_NAME;

\begin{tabular}{|l|l|l|l|}
\hline VARIABLE_NAME & VARIABLE_VALUE & MIN_VALUE & MAX_VALUE \\
\hline event_scheduler & ON & 0 & 0 \\
\hline max_connections & 200 & 1 & 100000 \\
\hline validate_password.policy & STRONG & 0 & 0 \\
\hline
\end{tabular}
```


\subsection*{29.12.15 Performance Schema Status Variable Tables}

The MySQL server maintains many status variables that provide information about its operation (see Section 7.1.10, "Server Status Variables"). Status variable information is available in these Performance Schema tables:
- global_status: Global status variables. An application that wants only global values should use this table.
- session_status: Status variables for the current session. An application that wants all status variable values for its own session should use this table. It includes the session variables for its session, as well as the values of global variables that have no session counterpart.
- status_by_thread: Session status variables for each active session. An application that wants to know the session variable values for specific sessions should use this table. It includes session variables only, identified by thread ID.

There are also summary tables that provide status variable information aggregated by account, host name, and user name. See Section 29.12.20.12, "Status Variable Summary Tables".

The session variable tables (session_status, status_by_thread) contain information only for active sessions, not terminated sessions.

The Performance Schema collects statistics for global status variables only for threads for which the INSTRUMENTED value is YES in the threads table. Statistics for session status variables are always collected, regardless of the INSTRUMENTED value.

The Performance Schema does not collect statistics for Com_xxx status variables in the status variable tables. To obtain global and per-session statement execution counts, use the events_statements_summary_global_by_event_name and events_statements_summary_by_thread_by_event_name tables, respectively. For example:

SELECT EVENT_NAME, COUNT_STAR
FROM performance_schema.events_statements_summary_global_by_event_name
WHERE EVENT_NAME LIKE 'statement/sql/\%';
The global_status and session_status tables have these columns:
- VARIABLE_NAME

The status variable name.
- VARIABLE_VALUE

The status variable value. For global_status, this column contains the global value. For session_status, this column contains the variable value for the current session.

The global_status and session_status tables have these indexes:
- Primary key on (VARIABLE_NAME)

The status_by_thread table contains the status of each active thread. It has these columns:
- THREAD_ID

The thread identifier of the session in which the status variable is defined.
- VARIABLE_NAME

The status variable name.
- VARIABLE_VALUE

The session variable value for the session named by the THREAD_ID column.
The status_by_thread table has these indexes:
- Primary key on (THREAD_ID, VARIABLE_NAME)

The status_by_thread table contains status variable information only about foreground threads. If the performance_schema_max_thread_instances system variable is not autoscaled (signified by a value of -1 ) and the maximum permitted number of instrumented thread objects is not greater than the number of background threads, the table is empty.

The Performance Schema supports TRUNCATE TABLE for status variable tables as follows:
- global_status: Resets thread, account, host, and user status. Resets global status variables except those that the server never resets.
- session_status: Not supported.
- status_by_thread: Aggregates status for all threads to the global status and account status, then resets thread status. If account statistics are not collected, the session status is added to host and user status, if host and user status are collected.

Account, host, and user statistics are not collected if the performance_schema_accounts_size, performance_schema_hosts_size, and performance_schema_users_size system variables, respectively, are set to 0 .

FLUSH STATUS adds the session status from all active sessions to the global status variables, resets the status of all active sessions, and resets account, host, and user status values aggregated from disconnected sessions.

\subsection*{29.12.16 Performance Schema Thread Pool Tables}

The following sections describe the Performance Schema tables associated with the thread pool plugin (see Section 7.6.3, "MySQL Enterprise Thread Pool"). They provide information about thread pool operation:
- tp_connections: Information about thread pool connections.
- tp_thread_group_state: Information about thread pool thread group states.
- tp_thread_group_stats: Thread group statistics.
- tp_thread_state: Information about thread pool thread states.

Rows in these tables represent snapshots in time. In the case of tp_thread_state, all rows for a thread group comprise a snapshot in time. Thus, the MySQL server holds the mutex of the thread group while producing the snapshot. But it does not hold mutexes on all thread groups at the same time, to prevent a statement against tp_thread_state from blocking the entire MySQL server.

The Performance Schema thread pool tables are implemented by the thread pool plugin and are loaded and unloaded when that plugin is loaded and unloaded (see Section 7.6.3.2, "Thread Pool Installation"). No special configuration step for the tables is needed. However, the tables depend on the thread pool plugin being enabled. If the thread pool plugin is loaded but disabled, the tables are not created.

\subsection*{29.12.16.1 The tp_connections Table}

The tp_connections table contains one row per connection managed by the Thread Pool plugin. Each row provides information about the current state of a thread pool connection.

The tp_connections table contains the following rows:
- CONNECTION_ID

The connection ID as reported by SELECT CONNECTION_ID().
- TP_GROUP_ID

The index of the thread group in the global array. This column and TP_PROCESSING_THREAD_NUMBER serve as a foreign key into the tp_thread_state table.
- TP_PROCESSING_THREAD_NUMBER

This may be NULL if no thread is currently attached to the connection.
- THREAD_ID

The Performance Schema thread ID.
- state

The connection state; this is one of Established, Armed, Queued, Waiting for Credit, Attached, Expired, or Killed.
- ACTIVE_FLAG

When this is 0 , the connection is not attached to any worker thread.
- KILLED_STATE

Reports the current stage in the process of killing the connection.
- CLEANUP_STATE

Reports the current stage in the cleanup process when closing the connection.
- TIME_OF_LAST_EVENT_COMPLETION

Timestamp showing when the connection last processed a request.
- TIME_OF_EXPIRY

Timestamp showing when an idle connection will expire if no new request arrives before then; this is NULL when the thread is currently processing a request.
- TIME_OF_ADD

Timestamp showing when the connection was added to the thread pool's connection request queue.
- TIME_OF_POP

Timestamp showing when the connection was dequeued (popped) from the queue by a connection handler thread.
- TIME_OF_ARM

Timestamp showing when the connection file descriptor was last added to the set monitored by poll() or epoll().
- CONNECT_HANDLER_INDEX

The index of the connection handler thread in the group which processed the connection request; a higher number means the connection load has triggered the creation of additional connection handler threads.
- TYPE

The connection type; this is one of User, Admin_interface or Admin_privilege;
Admin_privilege means that this connection had been using the normal interface, but was placed in the admin group due to the user having the TP_CONNECTION_ADMIN privilege.
- DIRECT_QUERY_EVENTS

The number of queries executed directly by this connection.
- QUEUED_QUERY_EVENTS

The number of queued queries executed by this connection.
- TIME_OF_EVENT_ARRIVAL

A timestamp showing when poll_wait () returns with an event for the connection; this value is needed to calculate MANAGEMENT_TIME.
- MANAGEMENT_TIME

The accumulated time between the return from waiting on file descriptors; this includes the time spent queued for queries which are not executed directly.

\subsection*{29.12.16.2 The tp_thread_group_state Table}

The tp_thread_group_state table has one row per thread group in the thread pool. Each row provides information about the current state of a group.

The tp_thread_group_state table has these columns:
- TP_GROUP_ID

The thread group ID. This is a unique key within the table.
- CONSUMER THREADS

The number of consumer threads. There is at most one thread ready to start executing if the active threads become stalled or blocked.
- RESERVE_THREADS

The number of threads in the reserved state. This means that they are not started until there is a need to wake a new thread and there is no consumer thread. This is where most threads end up when the thread group has created more threads than needed for normal operation. Often a thread group needs additional threads for a short while and then does not need them again for a while. In this case, they go into the reserved state and remain until needed again. They take up some extra memory resources, but no extra computing resources.
- CONNECT_THREAD_COUNT

The number of threads that are processing or waiting to process connection initialization and authentication. There can be a maximum of four connection threads per thread group; these threads expire after a period of inactivity.
- CONNECTION_COUNT

The number of connections using this thread group.
- QUEUED_QUERIES

The number of statements waiting in the high-priority queue.
- QUEUED_TRANSACTIONS

The number of statements waiting in the low-priority queue. These are the initial statements for transactions that have not started, so they also represent queued transactions.
- STALL_LIMIT

The value of the thread_pool_stall_limit system variable for the thread group. This is the same value for all thread groups.
- PRIO_KICKUP_TIMER

The value of the thread_pool_prio_kickup_timer system variable for the thread group. This is the same value for all thread groups.
- ALGORITHM

The value of the thread_pool_algorithm system variable for the thread group. This is the same value for all thread groups.
- THREAD_COUNT

The number of threads started in the thread pool as part of this thread group.
- ACTIVE_THREAD_COUNT

The number of threads active in executing statements.
- STALLED_THREAD_COUNT

The number of stalled statements in the thread group. A stalled statement could be executing, but from a thread pool perspective it is stalled and making no progress. A long-running statement quickly ends up in this category.
- WAITING_THREAD_NUMBER

If there is a thread handling the polling of statements in the thread group, this specifies the thread number within this thread group. It is possible that this thread could be executing a statement.
- OLDEST_QUEUED

How long in milliseconds the oldest queued statement has been waiting for execution.
- MAX_THREAD_IDS_IN_GROUP

The maximum thread ID of the threads in the group. This is the same as MAX (TP_THREAD_NUMBER) for the threads when selected from the tp_thread_state table. That is, these two queries are equivalent:
```
SELECT TP_GROUP_ID, MAX_THREAD_IDS_IN_GROUP
FROM tp_thread_group_state;
SELECT TP_GROUP_ID, MAX(TP_THREAD_NUMBER)
FROM tp_thread_state GROUP BY TP_GROUP_ID;
```

- EFFECTIVE_MAX_TRANSACTIONS_LIMIT

The effective max_transactions_limit_per_tg value for the group.
- NUM_QUERY_THREADS

The number of worker threads in the group.
- TIME_OF_LAST_THREAD_CREATION

The point in time when the thread was last created.
- NUM_CONNECT_HANDLER_THREAD_IN_SLEEP

The number of inactive connection handler threads.
- THREADS_BOUND_TO_TRANSACTION

The number of threads in an active transaction, which must be less than thread_pool_max_transactions_limit; this is set only when thread_pool_max_transactions_limit is not 0 .
- QUERY_THREADS_COUNT
same as num_query_threads, but used for different purposes?
- TIME_OF_EARLIEST_CON_EXPIRE

A timestamp showing the earliest point in time when a connection is expected to expire.
The tp_thread_group_state table has one index; this is a unique index on the TP_GROUP_ID column.

TRUNCATE TABLE is not permitted for the tp_thread_group_state table.

\subsection*{29.12.16.3 The tp_thread_group_stats Table}

The tp_thread_group_stats table reports statistics per thread group. There is one row per group.
The tp_thread_group_stats table has these columns:
- TP_GROUP_ID

The thread group ID. This is a unique key within the table.
- CONNECTIONS_STARTED

The number of connections started.
- CONNECTIONS_CLOSED

The number of connections closed.
- QUERIES_EXECUTED

The number of statements executed. This number is incremented when a statement starts executing, not when it finishes.
- QUERIES_QUEUED

The number of statements received that were queued for execution. This does not count statements that the thread group was able to begin executing immediately without queuing, which can happen under the conditions described in Section 7.6.3.3, "Thread Pool Operation".
- THREADS_STARTED

The number of threads started.
- PRIO_KICKUPS

The number of statements that have been moved from low-priority queue to high-priority queue based on the value of the thread_pool_prio_kickup_timer system variable. If this number increases quickly, consider increasing the value of that variable. A quickly increasing counter means that the priority system is not keeping transactions from starting too early. For InnodB, this most likely means deteriorating performance due to too many concurrent transactions..
- STALLED_QUERIES_EXECUTED

The number of statements that have become defined as stalled due to executing for longer than the value of the thread_pool_stall_limit system variable.
- BECOME_CONSUMER_THREAD

The number of times thread have been assigned the consumer thread role.
- BECOME_RESERVE_THREAD

The number of times threads have been assigned the reserve thread role.
- BECOME_WAITING_THREAD

The number of times threads have been assigned the waiter thread role. When statements are queued, this happens very often, even in normal operation, so rapid increases in this value are normal in the case of a highly loaded system where statements are queued up.
- WAKE_THREAD_STALL_CHECKER

The number of times the stall check thread decided to wake or create a thread to possibly handle some statements or take care of the waiter thread role.
- SLEEP_WAITS

The number of THD_WAIT_SLEEP waits. These occur when threads go to sleep (for example, by calling the SLEEP( ) function).
- DISK_IO_WAITS

The number of THD_WAIT_DISKIO waits. These occur when threads perform disk I/O that is likely to not hit the file system cache. Such waits occur when the buffer pool reads and writes data to disk, not for normal reads from and writes to files.
- ROW_LOCK_WAITS

The number of THD_WAIT_ROW_LOCK waits for release of a row lock by another transaction.
- GLOBAL_LOCK_WAITS

The number of THD_WAIT_GLOBAL_LOCK waits for a global lock to be released.
- META_DATA_LOCK_WAITS

The number of THD_WAIT_META_DATA_LOCK waits for a metadata lock to be released.
- TABLE_LOCK_WAITS

The number of THD_WAIT_TABLE_LOCK waits for a table to be unlocked that the statement needs to access.
- USER_LOCK_WAITS

The number of THD_WAIT_USER_LOCK waits for a special lock constructed by the user thread.
- BINLOG_WAITS

The number of THD_WAIT_BINLOG_WAITS waits for the binary log to become free.
- GROUP_COMMIT_WAITS

The number of THD_WAIT_GROUP_COMMIT waits. These occur when a group commit must wait for the other parties to complete their part of a transaction.
- FSYNC_WAITS

The number of THD_WAIT_SYNC waits for a file sync operation.
The tp_thread_group_stats table has these indexes:
- Unique index on (TP_GROUP_ID)

TRUNCATE TABLE is not permitted for the tp_thread_group_stats table.

\subsection*{29.12.16.4 The tp_thread_state Table}

The tp_thread_state table has one row per thread created by the thread pool to handle connections.

The tp_thread_state table has these columns:
- TP_GROUP_ID

The thread group ID.
- TP_THREAD_NUMBER

The ID of the thread within its thread group. TP_GROUP_ID and TP_THREAD_NUMBER together provide a unique key within the table.
- PROCESS_COUNT

The 10 ms interval in which the statement that uses this thread is currently executing. 0 means no statement is executing, 1 means it is in the first 10 ms , and so forth.
- WAIT_TYPE

The type of wait for the thread. NULL means the thread is not blocked. Otherwise, the thread is blocked by a call to thd_wait_begin( ) and the value specifies the type of wait. The xxx_WAIT columns of the tp_thread_group_stats table accumulate counts for each wait type.

The WAIT_TYPE value is a string that describes the type of wait, as shown in the following table.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 29.4 tp_thread_state Table WAIT_TYPE Values}
\begin{tabular}{|l|l|}
\hline Wait Type & Meaning \\
\hline THD_WAIT_SLEEP & Waiting for sleep \\
\hline THD_WAIT_DISKIO & Waiting for Disk IO \\
\hline THD_WAIT_ROW_LOCK & Waiting for row lock \\
\hline THD_WAIT_GLOBAL_LOCK & Waiting for global lock \\
\hline THD_WAIT_META_DATA_LOCK & Waiting for metadata lock \\
\hline THD_WAIT_TABLE_LOCK & Waiting for table lock \\
\hline THD_WAIT_USER_LOCK & Waiting for user lock \\
\hline THD_WAIT_BINLOG & Waiting for binlog \\
\hline THD_WAIT_GROUP_COMMIT & Waiting for group commit \\
\hline THD_WAIT_SYNC & Waiting for fsync \\
\hline
\end{tabular}
\end{table}
- TP_THREAD_TYPE

The type of thread. The value shown in this column is one of CONNECTION_HANDLER_WORKER_THREAD, LISTENER_WORKER_THREAD, QUERY_WORKER_THREAD, or TIMER_WORKER_THREAD.
- THREAD_ID

This thread's unique identifier. The value is the same as that used in the THREAD_ID column of the Performance Schema threads table.
- TIME_OF_ATTACH:

Timestamp showing when the thread was attached, if attached to a connection; otherwise NULL.
- MARKED_STALLED:

This is True if this thread has been marked as stalled by the stall checker thread.
- STATE:

Possible values depend on the type of thread, as shown by the TP_THREAD_TYPE column:
- For worker threads (QUERY_WORKER_THREAD), this is one of Managing, Polling, Processing Direct, Processing Queued, Sleeping Consumer, or Sleeping Reserve.
- For connection handler threads (CONNECTION_HANDLER_WORKER_THREAD), this is one of CH Processing, CH Sleeping Timed, or CH Sleeping Indefinite.
- For the stall checker thread (TIMER_WORKER_THREAD), this is one of SC Checking, SC Sleeping Short, or SC Sleeping Long.
- EVENT_COUNT:

The accumulated number of events processed by this thread.
- ACCUMULATED_EVENT_TIME:

The wall clock time spent processing events.
- EXEC_COUNT:

The accumulated number of queries (statements) passed to the server for execution.
- ACCUMULATED_EXEC_TIME:

The wall clock time spent processing queries by the server.
The tp_thread_state table has one index; this is a unique index on the TP_GROUP_ID and TP_THREAD_NUMBER columns.

TRUNCATE TABLE is not permitted for the tp_thread_state table.

\subsection*{29.12.17 Performance Schema Firewall Tables}

The following sections describe the Performance Schema tables associated with MySQL Enterprise Firewall (see Section 8.4.7, "MySQL Enterprise Firewall"). They provide information about firewall operation:
- firewall_groups: Information about firewall group profiles.
- firewall_group_allowlist: Allowlist rules of registered firewall group profiles.
- firewall_membership: Members (accounts) of registered firewall group profiles.

\subsection*{29.12.17.1 The firewall_groups Table}

The firewall_groups table provides a view into the in-memory data cache for MySQL Enterprise Firewall. It lists names and operational modes of registered firewall group profiles. It is used in conjunction with the mysql.firewall_groups system table that provides persistent storage of firewall data; see MySQL Enterprise Firewall Tables.

The firewall_groups table has these columns:
- NAME

The group profile name.
- MODE

The current operational mode for the profile. Permitted mode values are OFF, DETECTING, PROTECTING, and RECORDING. For details about their meanings, see Firewall Concepts.
- USERHOST

The training account for the group profile, to be used when the profile is in RECORDING mode. The value is NULL, or a non-NULL account that has the format user_name@host_name:
- If the value is NULL, the firewall records allowlist rules for statements received from any account that is a member of the group.
- If the value is non-NULL, the firewall records allowlist rules only for statements received from the named account (which should be a member of the group).

The firewall_groups table has no indexes.
TRUNCATE TABLE is not permitted for the firewall_groups table.

\subsection*{29.12.17.2 The firewall_group_allowlist Table}

The firewall_group_allowlist table provides a view into the in-memory data cache for MySQL Enterprise Firewall. It lists allowlist rules of registered firewall group profiles. It is used in conjunction with the mysql.firewall_group_allowlist system table that provides persistent storage of firewall data; see MySQL Enterprise Firewall Tables.

The firewall_group_allowlist table has these columns:
- NAME

The group profile name.
- RULE

A normalized statement indicating an acceptable statement pattern for the profile. A profile allowlist is the union of its rules.

The firewall_group_allowlist table has no indexes.
TRUNCATE TABLE is not permitted for the firewall_group_allowlist table.

\subsection*{29.12.17.3 The firewall_membership Table}

The firewall_membership table provides a view into the in-memory data cache for MySQL Enterprise Firewall. It lists the members (accounts) of registered firewall group profiles. It is used in conjunction with the mysql.firewall_membership system table that provides persistent storage of firewall data; see MySQL Enterprise Firewall Tables.

The firewall_membership table has these columns:
- GROUP_ID

The group profile name.
- MEMBER_ID

The name of an account that is a member of the profile.
The firewall_membership table has no indexes.
TRUNCATE TABLE is not permitted for the firewall_membership table.

\subsection*{29.12.18 Performance Schema Keyring Tables}

The following sections describe the Performance Schema tables associated with the MySQL keyring (see Section 8.4.4, "The MySQL Keyring"). They provide information about keyring operation:
- keyring_component_status: Information about the keyring component in use.
- keyring_keys: Metadata for keys in the MySQL keyring.

\subsection*{29.12.18.1 The keyring_component_status Table}

The keyring_component_status table provides status information about the properties of the keyring component in use, if one is installed. The table is empty if no keyring component is installed (for example, if the keyring is not being used, or is configured to manage the keystore using a keyring plugin rather than a keyring component).

There is no fixed set of properties. Each keyring component is free to define its own set.
Example keyring_component_status contents:
```
mysql> SELECT * FROM performance_schema.keyring_component_status;
+-----------------------+---------------------------------------------------
| STATUS_KEY | STATUS_VALUE |
+-----------------------+---------------------------------------------------
| Component_name | component_keyring_file
| Author | Oracle Corporation
| License | GPL
| Implementation_name | component_keyring_file
| Version |1.0
| Component_status | Active
| Data_file | /usr/local/mysql/keyring/component_keyring_file
| Read_only | No |
+-----------------------+---------------------------------------------------
```


The keyring_component_status table has these columns:
- STATUS_KEY

The status item name.
- STATUS_VALUE

The status item value.
The keyring_component_status table has no indexes.
TRUNCATE TABLE is not permitted for the keyring_component_status table.

\subsection*{29.12.18.2 The keyring_keys table}

MySQL Server supports a keyring that enables internal server components and plugins to securely store sensitive information for later retrieval. See Section 8.4.4, "The MySQL Keyring".

The keyring_keys table exposes metadata for keys in the keyring. Key metadata includes key IDs, key owners, and backend key IDs. The keyring_keys table does not expose any sensitive keyring data such as key contents.

The keyring_keys table has these columns:
- KEY_ID

The key identifier.
- KEY_OWNER

The owner of the key.
- BACKEND_KEY_ID

The ID used for the key by the keyring backend.
The keyring_keys table has no indexes.
TRUNCATE TABLE is not permitted for the keyring_keys table.

\subsection*{29.12.19 Performance Schema Clone Tables}

The following sections describe the Performance Schema tables associated with the clone plugin (see Section 7.6.7, "The Clone Plugin"). The tables provide information about cloning operations.
- clone_status: status information about the current or last executed cloning operation.
- clone_progress: progress information about the current or last executed cloning operation.

The Performance Schema clone tables are implemented by the clone plugin and are loaded and unloaded when that plugin is loaded and unloaded (see Section 7.6.7.1, "Installing the Clone Plugin"). No special configuration step for the tables is needed. However, the tables depend on the clone plugin being enabled. If the clone plugin is loaded but disabled, the tables are not created.

The Performance Schema clone plugin tables are used only on the recipient MySQL server instance. The data is persisted across server shutdown and restart.

\subsection*{29.12.19.1 The clone_status Table}

The clone_status table shows the status of the current or last executed cloning operation only. The table only ever contains one row of data, or is empty.

The clone_status table has these columns:
- ID

A unique cloning operation identifier in the current MySQL server instance.
- PID

Process list ID of the session executing the cloning operation.
- STATE

Current state of the cloning operation. Values include Not Started, In Progress, Completed, and Failed.
- BEGIN_TIME

A timestamp in ' YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when the cloning operation started.
- END_TIME

A timestamp in ' YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when the cloning operation finished. Reports NULL if the operation has not ended.
- SOURCE

The donor MySQL server address in 'HOST: PORT' format. The column displays 'LOCAL INSTANCE' for a local cloning operation.
- DESTINATION

The directory being cloned to.
- ERROR_NO

The error number reported for a failed cloning operation.
- ERROR_MESSAGE

The error message string for a failed cloning operation.
- BINLOG_FILE

The name of the binary log file up to which data is cloned.
- BINLOG_POSITION

The binary log file offset up to which data is cloned.
- GTID_EXECUTED

The GTID value for the last cloned transaction.
The clone_status table is read-only. DDL, including TRUNCATE TABLE, is not permitted.

\subsection*{29.12.19.2 The clone_progress Table}

The clone_progress table shows progress information for the current or last executed cloning operation only.

The stages of a cloning operation include DROP DATA, FILE COPY, PAGE_COPY, REDO_COPY, FILE_SYNC, RESTART, and RECOVERY. A cloning operation produces a record for each stage. The table therefore only ever contains seven rows of data, or is empty.

The clone_progress table has these columns:
- ID

A unique cloning operation identifier in the current MySQL server instance.
- STAGE

The name of the current cloning stage. Stages include DROP DATA, FILE COPY, PAGE_COPY, REDO_COPY, FILE_SYNC, RESTART, and RECOVERY.
- STATE

The current state of the cloning stage. States include Not Started, In Progress, and Completed.
- BEGIN_TIME

A timestamp in 'YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when the cloning stage started. Reports NULL if the stage has not started.
- END_TIME

A timestamp in ' YYYY-MM-DD hh:mm:ss[.fraction]' format that shows when the cloning stage finished. Reports NULL if the stage has not ended.
- THREADS

The number of concurrent threads used in the stage.
- ESTIMATE

The estimated amount of data for the current stage, in bytes.
- DATA

The amount of data transferred in current state, in bytes.
- NETWORK

The amount of network data transferred in the current state, in bytes.
- DATA_SPEED

The current actual speed of data transfer, in bytes per second. This value may differ from the requested maximum data transfer rate defined by clone_max_data_bandwidth.
- NETWORK_SPEED

The current speed of network transfer in bytes per second.
The clone_progress table is read-only. DDL, including TRUNCATE TABLE, is not permitted.

\subsection*{29.12.20 Performance Schema Summary Tables}

Summary tables provide aggregated information for terminated events over time. The tables in this group summarize event data in different ways.

Each summary table has grouping columns that determine how to group the data to be aggregated, and summary columns that contain the aggregated values. Tables that summarize events in similar ways often have similar sets of summary columns and differ only in the grouping columns used to determine how events are aggregated.

Summary tables can be truncated with TRUNCATE TABLE. Generally, the effect is to reset the summary columns to 0 or NULL, not to remove rows. This enables you to clear collected values and restart aggregation. That might be useful, for example, after you have made a runtime configuration change. Exceptions to this truncation behavior are noted in individual summary table sections.

\section*{Wait Event Summaries}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 29.5 Performance Schema Wait Event Summary Tables}
\begin{tabular}{|l|l|}
\hline Table Name & Description \\
\hline events_waits_summary_by_account_by_eve & Mtaithevents per account and event name \\
\hline events_waits_summary_by_host_by_event & Maaiteevents per host name and event name \\
\hline events_waits_summary_by_instance & Wait events per instance \\
\hline events_waits_summary_by_thread_by_ever & Waitevænts per thread and event name \\
\hline events_waits_summary_by_user_by_event & Mquiteevents per user name and event name \\
\hline events_waits_summary_global_by_event_ŋ & Wrat events per event name \\
\hline
\end{tabular}
\end{table}

\section*{Stage Summaries}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 29.6 Performance Schema Stage Event Summary Tables}
\begin{tabular}{|l|l|}
\hline Table Name & Description \\
\hline events_stages_summary_by_account_by_ev & Stagenevents per account and event name \\
\hline events_stages_summary_by_host_by_event & Stageeevents per host name and event name \\
\hline events_stages_summary_by_thread_by_eve & Stagewvaits per thread and event name \\
\hline events_stages_summary_by_user_by_event & Stagreevents per user name and event name \\
\hline events_stages_summary_global_by_event & Stage waits per event name \\
\hline
\end{tabular}
\end{table}

\section*{Statement Summaries}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 29.7 Performance Schema Statement Event Summary Tables}
\begin{tabular}{|l|l|}
\hline Table Name & Description \\
\hline events_statements_histogram_by_digest & Statement histograms per schema and digest value \\
\hline events_statements_histogram_global & Statement histogram summarized globally \\
\hline events_statements_summary_by_account_b & Statement equets per account and event name \\
\hline events_statements_summary_by_digest & Statement events per schema and digest value \\
\hline events_statements_summary_by_host_by_e & Statementlevents per host name and event name \\
\hline events_statements_summary_by_program & Statement events per stored program \\
\hline events_statements_summary_by_thread_by & Statementavents per thread and event name \\
\hline events_statements_summary_by_user_by_e & Statementevents per user name and event name \\
\hline events_statements_summary_global_by_ev & Statememe events per event name \\
\hline prepared_statements_instances & Prepared statement instances and statistics \\
\hline
\end{tabular}
\end{table}

\section*{Transaction Summaries}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 29.8 Performance Schema Transaction Event Summary Tables}
\begin{tabular}{|l|l|}
\hline Table Name & Description \\
\hline events_transactions_summary_by_account & Tbanstaction events per account and event name \\
\hline events_transactions_summary_by_host_by & Tearsactionarents per host name and event name \\
\hline events_transactions_summary_by_thread & Wyarsætion eytots per thread and event name \\
\hline events_transactions_summary_by_user_by & Tearsatctionarents per user name and event name \\
\hline events_transactions_summary_global_by_ & ©rænsactiomevents per event name \\
\hline
\end{tabular}
\end{table}

\section*{Object Wait Summaries}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 29.9 Performance Schema Object Event Summary Tables}
\begin{tabular}{|l|l|}
\hline Table Name & Description \\
\hline objects_summary_global_by_type & Object summaries \\
\hline
\end{tabular}
\end{table}

\section*{File I/O Summaries}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 29.10 Performance Schema File I/O Event Summary Tables}
\begin{tabular}{|l|l|}
\hline Table Name & Description \\
\hline file_summary_by_event_name & File events per event name \\
\hline file_summary_by_instance & File events per file instance \\
\hline
\end{tabular}
\end{table}

\section*{Table I/O and Lock Wait Summaries}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 29.11 Performance Schema Table I/O and Lock Wait Event Summary Tables}
\begin{tabular}{|l|l|}
\hline Table Name & Description \\
\hline table_io_waits_summary_by_index_usage & Table I/O waits per index \\
\hline table_io_waits_summary_by_table & Table I/O waits per table \\
\hline table_lock_waits_summary_by_table & Table lock waits per table \\
\hline
\end{tabular}
\end{table}

\section*{Socket Summaries}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 29.12 Performance Schema Socket Event Summary Tables}
\begin{tabular}{|l|l|}
\hline Table Name & Description \\
\hline socket_summary_by_event_name & Socket waits and I/O per event name \\
\hline socket_summary_by_instance & Socket waits and I/O per instance \\
\hline
\end{tabular}
\end{table}

\section*{Memory Summaries}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 29.13 Performance Schema Memory Operation Summary Tables}
\begin{tabular}{|l|l|}
\hline Table Name & Description \\
\hline memory_summary_by_account_by_event_nam & Memory operations per account and event name \\
\hline memory_summary_by_host_by_event_name & Memory operations per host and event name \\
\hline memory_summary_by_thread_by_event_name & Memory operations per thread and event name \\
\hline memory_summary_by_user_by_event_name & Memory operations per user and event name \\
\hline memory_summary_global_by_event_name & Memory operations globally per event name \\
\hline
\end{tabular}
\end{table}

\section*{Error Summaries}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 29.14 Performance Schema Error Summary Tables}
\begin{tabular}{|l|l|}
\hline Table Name & Description \\
\hline events_errors_summary_by_account_by_er & Eonors per account and error code \\
\hline events_errors_summary_by_host_by_error & Errors per host and error code \\
\hline events_errors_summary_by_thread_by_err & Errors per thread and error code \\
\hline events_errors_summary_by_user_by_error & Errors per user and error code \\
\hline events_errors_summary_global_by_error & Errors per error code \\
\hline
\end{tabular}
\end{table}

