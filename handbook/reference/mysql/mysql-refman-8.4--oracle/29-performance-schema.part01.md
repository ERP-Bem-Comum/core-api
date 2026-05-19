\section*{Chapter 29 MySQL Performance Schema}
Table of Contents
29.1 Performance Schema Quick Start ..... 4737
29.2 Performance Schema Build Configuration ..... 4743
29.3 Performance Schema Startup Configuration ..... 4743
29.4 Performance Schema Runtime Configuration ..... 4745
29.4.1 Performance Schema Event Timing ..... 4746
29.4.2 Performance Schema Event Filtering ..... 4748
29.4.3 Event Pre-Filtering ..... 4749
29.4.4 Pre-Filtering by Instrument ..... 4750
29.4.5 Pre-Filtering by Object ..... 4752
29.4.6 Pre-Filtering by Thread ..... 4753
29.4.7 Pre-Filtering by Consumer ..... 4755
29.4.8 Example Consumer Configurations ..... 4758
29.4.9 Naming Instruments or Consumers for Filtering Operations ..... 4763
29.4.10 Determining What Is Instrumented ..... 4763
29.5 Performance Schema Queries ..... 4764
29.6 Performance Schema Instrument Naming Conventions ..... 4764
29.7 Performance Schema Status Monitoring ..... 4768
29.8 Performance Schema Atom and Molecule Events ..... 4771
29.9 Performance Schema Tables for Current and Historical Events ..... 4771
29.10 Performance Schema Statement Digests and Sampling ..... 4773
29.11 Performance Schema General Table Characteristics ..... 4777
29.12 Performance Schema Table Descriptions ..... 4778
29.12.1 Performance Schema Table Reference ..... 4778
29.12.2 Performance Schema Setup Tables ..... 4782
29.12.3 Performance Schema Instance Tables ..... 4791
29.12.4 Performance Schema Wait Event Tables ..... 4796
29.12.5 Performance Schema Stage Event Tables ..... 4801
29.12.6 Performance Schema Statement Event Tables ..... 4807
29.12.7 Performance Schema Transaction Tables ..... 4817
29.12.8 Performance Schema Connection Tables ..... 4825
29.12.9 Performance Schema Connection Attribute Tables ..... 4829
29.12.10 Performance Schema User-Defined Variable Tables ..... 4833
29.12.11 Performance Schema Replication Tables ..... 4833
29.12.12 Performance Schema NDB Cluster Tables ..... 4856
29.12.13 Performance Schema Lock Tables ..... 4859
29.12.14 Performance Schema System Variable Tables ..... 4867
29.12.15 Performance Schema Status Variable Tables ..... 4871
29.12.16 Performance Schema Thread Pool Tables ..... 4873
29.12.17 Performance Schema Firewall Tables ..... 4880
29.12.18 Performance Schema Keyring Tables ..... 4881
29.12.19 Performance Schema Clone Tables ..... 4883
29.12.20 Performance Schema Summary Tables ..... 4885
29.12.21 Performance Schema Telemetry Tables ..... 4912
29.12.22 Performance Schema Miscellaneous Tables ..... 4915
29.13 Performance Schema Option and Variable Reference ..... 4934
29.14 Performance Schema Command Options ..... 4938
29.15 Performance Schema System Variables ..... 4939
29.16 Performance Schema Status Variables ..... 4959
29.17 The Performance Schema Memory-Allocation Model ..... 4962
29.18 Performance Schema and Plugins ..... 4963
29.19 Using the Performance Schema to Diagnose Problems ..... 4963
29.19.1 Query Profiling Using Performance Schema ..... 4964
29.19.2 Obtaining Parent Event Information ..... 4966
29.20 Restrictions on Performance Schema ..... 4967

The MySQL Performance Schema is a feature for monitoring MySQL Server execution at a low level. The Performance Schema has these characteristics:
- The Performance Schema provides a way to inspect internal execution of the server at runtime. It is implemented using the PERFORMANCE_SCHEMA storage engine and the performance_schema database. The Performance Schema focuses primarily on performance data. This differs from INFORMATION_SCHEMA, which serves for inspection of metadata.
- The Performance Schema monitors server events. An "event" is anything the server does that takes time and has been instrumented so that timing information can be collected. In general, an event could be a function call, a wait for the operating system, a stage of an SQL statement execution such as parsing or sorting, or an entire statement or group of statements. Event collection provides access to information about synchronization calls (such as for mutexes) file and table I/O, table locks, and so forth for the server and for several storage engines.
- Performance Schema events are distinct from events written to the server's binary log (which describe data modifications) and Event Scheduler events (which are a type of stored program).
- Performance Schema events are specific to a given instance of the MySQL Server. Performance Schema tables are considered local to the server, and changes to them are not replicated or written to the binary log.
- Current events are available, as well as event histories and summaries. This enables you to determine how many times instrumented activities were performed and how much time they took. Event information is available to show the activities of specific threads, or activity associated with particular objects such as a mutex or file.
- The PERFORMANCE_SCHEMA storage engine collects event data using "instrumentation points" in server source code.
- Collected events are stored in tables in the performance_schema database. These tables can be queried using SELECT statements like other tables.
- Performance Schema configuration can be modified dynamically by updating tables in the performance_schema database through SQL statements. Configuration changes affect data collection immediately.
- Tables in the Performance Schema are in-memory tables that use no persistent on-disk storage. The contents are repopulated beginning at server startup and discarded at server shutdown.
- Monitoring is available on all platforms supported by MySQL.

Some limitations might apply: The types of timers might vary per platform. Instruments that apply to storage engines might not be implemented for all storage engines. Instrumentation of each thirdparty engine is the responsibility of the engine maintainer. See also Section 29.20, "Restrictions on Performance Schema".
- Data collection is implemented by modifying the server source code to add instrumentation. There are no separate threads associated with the Performance Schema, unlike other features such as replication or the Event Scheduler.

The Performance Schema is intended to provide access to useful information about server execution while having minimal impact on server performance. The implementation follows these design goals:
- Activating the Performance Schema causes no changes in server behavior. For example, it does not cause thread scheduling to change, and it does not cause query execution plans (as shown by EXPLAIN) to change.
- Server monitoring occurs continuously and unobtrusively with very little overhead. Activating the Performance Schema does not make the server unusable.
- The parser is unchanged. There are no new keywords or statements.
- Execution of server code proceeds normally even if the Performance Schema fails internally.
- When there is a choice between performing processing during event collection initially or during event retrieval later, priority is given to making collection faster. This is because collection is ongoing whereas retrieval is on demand and might never happen at all.
- Most Performance Schema tables have indexes, which gives the optimizer access to execution plans other than full table scans. For more information, see Section 10.2.4, "Optimizing Performance Schema Queries".
- It is easy to add new instrumentation points.
- Instrumentation is versioned. If the instrumentation implementation changes, previously instrumented code continues to work. This benefits developers of third-party plugins because it is not necessary to upgrade each plugin to stay synchronized with the latest Performance Schema changes.

\section*{Note}

The MySQL sys schema is a set of objects that provides convenient access to data collected by the Performance Schema. The sys schema is installed by default. For usage instructions, see Chapter 30, MySQL sys Schema.

\subsection*{29.1 Performance Schema Quick Start}

This section briefly introduces the Performance Schema with examples that show how to use it. For additional examples, see Section 29.19, "Using the Performance Schema to Diagnose Problems".

The Performance Schema is enabled by default. To enable or disable it explicitly, start the server with the performance_schema variable set to an appropriate value. For example, use these lines in the server my.cnf file:
```
[mysqld]
performance_schema=ON
```


When the server starts, it sees performance_schema and attempts to initialize the Performance Schema. To verify successful initialization, use this statement:
```
mysql> SHOW VARIABLES LIKE 'performance_schema';
+---------------------+-------+
| Variable_name | Value |
+---------------------+-------+
| performance_schema | ON |
+---------------------+-------+
```


A value of ON means that the Performance Schema initialized successfully and is ready for use. A value of OFF means that some error occurred. Check the server error log for information about what went wrong.

The Performance Schema is implemented as a storage engine, so you can see it listed in the output from the Information Schema ENGINES table or the SHOW ENGINES statement:
```
mysql> SELECT * FROM INFORMATION_SCHEMA.ENGINES
            WHERE ENGINE='PERFORMANCE_SCHEMA'\G
************************** 1. row *****************************************
            ENGINE: PERFORMANCE_SCHEMA
        SUPPORT: YES
        COMMENT: Performance Schema
TRANSACTIONS: NO
                XA: NO
    SAVEPOINTS: NO
```

```
mysql> SHOW ENGINES\G
...
        Engine: PERFORMANCE_SCHEMA
    Support: YES
    Comment: Performance Schema
Transactions: NO
        XA: NO
    Savepoints: NO
...
```


The PERFORMANCE_SCHEMA storage engine operates on tables in the performance_schema database. You can make performance_schema the default database so that references to its tables need not be qualified with the database name:
```
mysql> USE performance_schema;
```


Performance Schema tables are stored in the performance_schema database. Information about the structure of this database and its tables can be obtained, as for any other database, by selecting from the INFORMATION_SCHEMA database or by using SHOW statements. For example, use either of these statements to see what Performance Schema tables exist:
```
mysql> SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'performance_schema';
+---------------------------------------------------------
| TABLE_NAME |
+----------------------------------------------------------
| accounts
| cond_instances |
...
| events_stages_current
| events_stages_history
| events_stages_history_long
| events_stages_summary_by_account_by_event_name
| events_stages_summary_by_host_by_event_name
| events_stages_summary_by_thread_by_event_name
| events_stages_summary_by_user_by_event_name
| events_stages_summary_global_by_event_name
| events_statements_current
| events_statements_history
| events_statements_history_long |
...
| file_instances
| file_summary_by_event_name
| file_summary_by_instance
| host_cache
| hosts
| memory_summary_by_account_by_event_name
| memory_summary_by_host_by_event_name
| memory_summary_by_thread_by_event_name
| memory_summary_by_user_by_event_name
| memory_summary_global_by_event_name
| metadata_locks
| mutex_instances
| objects_summary_global_by_type
| performance_timers
| replication_connection_configuration
| replication_connection_status
| replication_applier_configuration
| replication_applier_status
| replication_applier_status_by_coordinator
| replication_applier_status_by_worker
| rwlock_instances
| session_account_connect_attrs
| session_connect_attrs
| setup_actors
| setup_consumers
| setup_instruments
| setup_objects
| socket_instances
| socket_summary_by_event_name |
```

```
| socket_summary_by_instance
| table_handles
| table_io_waits_summary_by_index_usage
| table_io_waits_summary_by_table
| table_lock_waits_summary_by_table
| threads
| users
mysql> SHOW TABLES FROM performance_schema;
+---------------------------------------------------------
| Tables_in_performance_schema |
+--------------------------------------------------------
| accounts
| cond_instances
| events_stages_current
| events_stages_history
| events_stages_history_long |
...
```


The number of Performance Schema tables increases over time as implementation of additional instrumentation proceeds.

The name of the performance_schema database is lowercase, as are the names of tables within it. Queries should specify the names in lowercase.

To see the structure of individual tables, use SHOW CREATE TABLE:
```
mysql> SHOW CREATE TABLE performance_schema.setup_consumers\G
*************************** 1. row ***************************************
        Table: setup_consumers
Create Table: CREATE TABLE ˋsetup_consumersˋ (
    ˋNAMEˋ varchar(64) NOT NULL,
    ˋENABLEDˋ enum('YES','NO') NOT NULL,
    PRIMARY KEY (ˋNAMEˋ)
) ENGINE=PERFORMANCE_SCHEMA DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
```


Table structure is also available by selecting from tables such as INFORMATION_SCHEMA. COLUMNS or by using statements such as SHOW COLUMNS.

Tables in the performance_schema database can be grouped according to the type of information in them: Current events, event histories and summaries, object instances, and setup (configuration) information. The following examples illustrate a few uses for these tables. For detailed information about the tables in each group, see Section 29.12, "Performance Schema Table Descriptions".

Initially, not all instruments and consumers are enabled, so the performance schema does not collect all events. To turn all of these on and enable event timing, execute two statements (the row counts may differ depending on MySQL version):
```
mysql> UPDATE performance_schema.setup_instruments
    SET ENABLED = 'YES', TIMED = 'YES';
Query OK, 560 rows affected (0.04 sec)
mysql> UPDATE performance_schema.setup_consumers
    SET ENABLED = 'YES';
Query OK, 10 rows affected (0.00 sec)
```


To see what the server is doing at the moment, examine the events_waits_current table. It contains one row per thread showing each thread's most recent monitored event:
```
mysql> SELECT *
    FROM performance_schema.events_waits_current\G
************************** 1. row ******************************
                THREAD_ID: 0
                    EVENT_ID: 5523
        END_EVENT_ID: 5523
            EVENT_NAME: wait/synch/mutex/mysys/THR_LOCK::mutex
                    SOURCE: thr_lock.c:525
            TIMER_START: 201660494489586
                TIMER_END: 201660494576112
```

```
                    TIMER_WAIT: 86526
                        SPINS: NULL
            OBJECT_SCHEMA: NULL
                OBJECT_NAME: NULL
                INDEX_NAME: NULL
                OBJECT_TYPE: NULL
OBJECT_INSTANCE_BEGIN: 142270668
        NESTING_EVENT_ID: NULL
    NESTING_EVENT_TYPE: NULL
                OPERATION: lock
        NUMBER_OF_BYTES: NULL
                    FLAGS: 0
...
```


This event indicates that thread 0 was waiting for 86,526 picoseconds to acquire a lock on THR_LOCK: : mutex, a mutex in the mysys subsystem. The first few columns provide the following information:
- The ID columns indicate which thread the event comes from and the event number.
- EVENT_NAME indicates what was instrumented and SOURCE indicates which source file contains the instrumented code.
- The timer columns show when the event started and stopped and how long it took. If an event is still in progress, the TIMER_END and TIMER_WAIT values are NULL. Timer values are approximate and expressed in picoseconds. For information about timers and event time collection, see Section 29.4.1, "Performance Schema Event Timing".

The history tables contain the same kind of rows as the current-events table but have more rows and show what the server has been doing "recently" rather than "currently." The events_waits_history and events_waits_history_long tables contain the most recent 10 events per thread and most recent 10,000 events, respectively. For example, to see information for recent events produced by thread 13, do this:
```
mysql> SELECT EVENT_ID, EVENT_NAME, TIMER_WAIT
    FROM performance_schema.events_waits_history
    WHERE THREAD_ID = 13
    ORDER BY EVENT_ID;

\begin{tabular}{|l|l|l|}
\hline EVENT_ID & EVENT_NAME & TIMER_WAIT \\
\hline 86 & wait/synch/mutex/mysys/THR_LOCK:: mutex & 686322 \\
\hline 87 & wait/synch/mutex/mysys/THR_LOCK_malloc & 320535 \\
\hline 88 & wait/synch/mutex/mysys/THR_LOCK_malloc & 339390 \\
\hline 89 & wait/synch/mutex/mysys/THR_LOCK_malloc & 377100 \\
\hline 90 & wait/synch/mutex/sql/LOCK_plugin & 614673 \\
\hline 91 & wait/synch/mutex/sql/LOCK_open & 659925 \\
\hline 92 & wait/synch/mutex/sql/THD:: LOCK_thd_data & 494001 \\
\hline 93 & wait/synch/mutex/mysys/THR_LOCK_malloc & 222489 \\
\hline 94 & wait/synch/mutex/mysys/THR_LOCK_malloc & 214947 \\
\hline 95 & wait/synch/mutex/mysys/LOCK_alarm & 312993 \\
\hline
\end{tabular}
```


As new events are added to a history table, older events are discarded if the table is full.
Summary tables provide aggregated information for all events over time. The tables in this group summarize event data in different ways. To see which instruments have been executed the most times or have taken the most wait time, sort the events_waits_summary_global_by_event_name table on the COUNT_STAR or SUM_TIMER_WAIT column, which correspond to a COUNT ( * ) or SUM(TIMER_WAIT) value, respectively, calculated over all events:
```
mysql> SELECT EVENT_NAME, COUNT_STAR
    FROM performance_schema.events_waits_summary_global_by_event_name
    ORDER BY COUNT_STAR DESC LIMIT 10;
+----------------------------------------------------+-------------
| EVENT_NAME | COUNT_STAR |
+-----------------------------------------------------+------------+
| wait/synch/mutex/mysys/THR_LOCK_malloc | 6419 |
```

```
| wait/io/file/sql/FRM | 452
| wait/synch/mutex/sql/LOCK_plugin | 337
| wait/synch/mutex/mysys/THR_LOCK_open | 187
| wait/synch/mutex/mysys/LOCK_alarm | 147
| wait/synch/mutex/sql/THD::LOCK_thd_data | 115
| wait/io/file/myisam/kfile | 102
| wait/synch/mutex/sql/LOCK_global_system_variables | 89
| wait/synch/mutex/mysys/THR_LOCK::mutex | 89
| wait/synch/mutex/sql/LOCK_open | 88
mysql> SELECT EVENT_NAME, SUM_TIMER_WAIT
    FROM performance_schema.events_waits_summary_global_by_event_name
    ORDER BY SUM_TIMER_WAIT DESC LIMIT 10;
+-----------------------------------------+-----------------
| EVENT_NAME | SUM_TIMER_WAIT |
+----------------------------------------+-----------------+
| wait/io/file/sql/MYSQL_LOG | 1599816582
| wait/synch/mutex/mysys/THR_LOCK_malloc | 1530083250
| wait/io/file/sql/binlog_index | 1385291934
| wait/io/file/sql/FRM | 1292823243
| wait/io/file/myisam/kfile | 411193611
| wait/io/file/myisam/dfile | 322401645
| wait/synch/mutex/mysys/LOCK_alarm | 145126935
| wait/io/file/sql/casetest | 104324715
| wait/synch/mutex/sql/LOCK_plugin | 86027823
| wait/io/file/sql/pid | 72591750 |
```


These results show that the THR_LOCK_malloc mutex is "hot," both in terms of how often it is used and amount of time that threads wait attempting to acquire it.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4771.jpg?height=124&width=99&top_left_y=1327&top_left_x=370)

\section*{Note}

The THR_LOCK_malloc mutex is used only in debug builds. In production builds it is not hot because it is nonexistent.

Instance tables document what types of objects are instrumented. An instrumented object, when used by the server, produces an event. These tables provide event names and explanatory notes or status information. For example, the file_instances table lists instances of instruments for file I/O operations and their associated files:
```
mysql> SELECT *
        FROM performance_schema.file_instances\G
*************************** 1. rOW ****************************************
    FILE_NAME: /opt/mysql-log/60500/binlog.000007
EVENT_NAME: wait/io/file/sql/binlog
OPEN_COUNT: 0
************************** 2. row *****************************************
    FILE_NAME: /opt/mysql/60500/data/mysql/tables_priv.MYI
EVENT_NAME: wait/io/file/myisam/kfile
OPEN_COUNT: 1
*************************** 3. row ****************************************
    FILE_NAME: /opt/mysql/60500/data/mysql/columns_priv.MYI
EVENT_NAME: wait/io/file/myisam/kfile
OPEN_COUNT: 1
...
```


Setup tables are used to configure and display monitoring characteristics. For example, setup_instruments lists the set of instruments for which events can be collected and shows which of them are enabled:
```
mysql> SELECT NAME, ENABLED, TIMED
        FROM performance_schema.setup_instruments;
+----------------------------------------------------+--------------------
| NAME | ENABLED | TIMED |
+-----------------------------------------------------+---------+------+
...

\begin{tabular}{|l|l|l|} 
| stage/sql/end & NO & NO \\
| stage/sql/executing & | NO & NO
\end{tabular}
```

```
\begin{array} { | l | l | l | } { \text { stage/sql/init \textit\{insert stage/sql/inO \ NO \ NO} } & { \text { NO \} } \end{array}
...
| statement/sql/load | YES | YES
| statement/sql/grant | YES | YES
| statement/sql/check | YES | YES
| statement/sql/flush | YES | YES
...
| wait/synch/mutex/sql/LOCK_global_read_lock | YES | YES
| wait/synch/mutex/sql/LOCK_global_system_variables | YES | YES
| wait/synch/mutex/sql/LOCK_lock_db | YES | YES
| wait/synch/mutex/sql/LOCK_manager | YES | YES
...
| wait/synch/rwlock/sql/LOCK_grant | YES | YES
| wait/synch/rwlock/sql/LOGGER::LOCK_logger | YES | YES
| wait/synch/rwlock/sql/LOCK_sys_init_connect | YES | YES
| wait/synch/rwlock/sql/LOCK_sys_init_slave | YES | YES
...
| wait/io/file/sql/binlog | YES | YES
| wait/io/file/sql/binlog_index | YES | YES
| wait/io/file/sql/casetest | YES | YES
| wait/io/file/sql/dbopt | YES | YES |
...
```


To understand how to interpret instrument names, see Section 29.6, "Performance Schema Instrument Naming Conventions".

To control whether events are collected for an instrument, set its ENABLED value to YES or NO. For example:
```
mysql> UPDATE performance_schema.setup_instruments
    SET ENABLED = 'NO'
    WHERE NAME = 'wait/synch/mutex/sql/LOCK_mysql_create_db';
```


The Performance Schema uses collected events to update tables in the performance_schema database, which act as "consumers" of event information. The setup_consumers table lists the available consumers and which are enabled:
```
mysql> SELECT * FROM performance_schema.setup_consumers;
+------------------------------------+---------+

\begin{tabular}{|l|l|}
\hline NAME & ENABLED \\
\hline events_stages_current & NO \\
\hline events_stages_history & N0 \\
\hline events_stages_history_long & NO \\
\hline events_statements_cpu & NO \\
\hline events_statements_current & YES \\
\hline events_statements_history & YES \\
\hline events_statements_history_long & NO \\
\hline events_transactions_current & YES \\
\hline events_transactions_history & YES \\
\hline events_transactions_history_long & N0 \\
\hline events_waits_current & N0 \\
\hline events_waits_history & NO \\
\hline events_waits_history_long & NO \\
\hline global_instrumentation & YES \\
\hline thread_instrumentation & YES \\
\hline statements_digest & YES \\
\hline
\end{tabular}
```


To control whether the Performance Schema maintains a consumer as a destination for event information, set its ENABLED value.

For more information about the setup tables and how to use them to control event collection, see Section 29.4.2, "Performance Schema Event Filtering".

There are some miscellaneous tables that do not fall into any of the previous groups. For example, performance_timers lists the available event timers and their characteristics. For information about timers, see Section 29.4.1, "Performance Schema Event Timing".

\subsection*{29.2 Performance Schema Build Configuration}

The Performance Schema is mandatory and always compiled in. It is possible to exclude certain parts of the Performance Schema instrumentation. For example, to exclude stage and statement instrumentation, do this:
```
cmake . \
    -DDISABLE_PSI_STAGE=1 \
    -DDISABLE_PSI_STATEMENT=1
```


For more information, see the descriptions of the DISABLE_PSI_XXX CMake options in Section 2.8.7, "MySQL Source-Configuration Options".

If you install MySQL over a previous installation that was configured without the Performance Schema (or with an older version of the Performance Schema that has missing or out-of-date tables). One indication of this issue is the presence of messages such as the following in the error log:
```
[ERROR] Native table 'performance_schema'.'events_waits_history'
has the wrong structure
[ERROR] Native table 'performance_schema'.'events_waits_history_long'
has the wrong structure
...
```


To correct that problem, perform the MySQL upgrade procedure. See Chapter 3, Upgrading MySQL.
Because the Performance Schema is configured into the server at build time, a row for PERFORMANCE_SCHEMA appears in the output from SHOW ENGINES. This means that the Performance Schema is available, not that it is enabled. To enable it, you must do so at server startup, as described in the next section.

\subsection*{29.3 Performance Schema Startup Configuration}

To use the MySQL Performance Schema, it must be enabled at server startup to enable event collection to occur.

The Performance Schema is enabled by default. To enable or disable it explicitly, start the server with the performance_schema variable set to an appropriate value. For example, use these lines in the server my. cnf file:
```
[mysqld]
performance_schema=ON
```


If the server is unable to allocate any internal buffer during Performance Schema initialization, the Performance Schema disables itself and sets performance_schema to OFF, and the server runs without instrumentation.

The Performance Schema also permits instrument and consumer configuration at server startup.
To control an instrument at server startup, use an option of this form:
```
--performance-schema-instrument='instrument_name=value'
```


Here, instrument_name is an instrument name such as wait/synch/mutex/sql/LOCK_open, and value is one of these values:
- OFF, FALSE, or 0: Disable the instrument
- ON, TRUE, or 1: Enable and time the instrument
- COUNTED: Enable and count (rather than time) the instrument

Each--performance-schema-instrument option can specify only one instrument name, but multiple instances of the option can be given to configure multiple instruments. In addition, patterns are permitted in instrument names to configure instruments that match the pattern. To configure all condition synchronization instruments as enabled and counted, use this option:
--performance-schema-instrument='wait/synch/cond/\%=COUNTED'
To disable all instruments, use this option:
--performance-schema-instrument='\%=OFF'
Exception: The memory/performance_schema/\% instruments are built in and cannot be disabled at startup.

Longer instrument name strings take precedence over shorter pattern names, regardless of order. For information about specifying patterns to select instruments, see Section 29.4.9, "Naming Instruments or Consumers for Filtering Operations".

An unrecognized instrument name is ignored. It is possible that a plugin installed later may create the instrument, at which time the name is recognized and configured.

To control a consumer at server startup, use an option of this form:
--performance-schema-consumer-consumer_name=value
Here, consumer_name is a consumer name such as events_waits_history, and value is one of these values:
- OFF, FALSE, or 0: Do not collect events for the consumer
- ON, TRUE, or 1: Collect events for the consumer

For example, to enable the events_waits_history consumer, use this option:
--performance-schema-consumer-events-waits-history=ON
The permitted consumer names can be found by examining the setup_consumers table. Patterns are not permitted. Consumer names in the setup_consumers table use underscores, but for consumers set at startup, dashes and underscores within the name are equivalent.

The Performance Schema includes several system variables that provide configuration information:
```
mysql> SHOW VARIABLES LIKE 'perf%';
+---------------------------------------------------------+-----------
| Variable_name | Value |
+---------------------------------------------------------------------
| performance_schema | ON
| performance_schema_accounts_size |100
| performance_schema_digests_size | 200
| performance_schema_events_stages_history_long_size | 10000
| performance_schema_events_stages_history_size |10
| performance_schema_events_statements_history_long_size | 10000
| performance_schema_events_statements_history_size | 10
| performance_schema_events_waits_history_long_size |10000
| performance_schema_events_waits_history_size |10
| performance_schema_hosts_size |100
| performance_schema_max_cond_classes |80
| performance_schema_max_cond_instances | 1000
...
```


The performance_schema variable is ON or OFF to indicate whether the Performance Schema is enabled or disabled. The other variables indicate table sizes (number of rows) or memory allocation values.

\section*{Note}

With the Performance Schema enabled, the number of Performance Schema instances affects the server memory footprint, perhaps to a large extent. The Performance Schema autoscales many parameters to use memory only as required; see Section 29.17, "The Performance Schema Memory-Allocation Model".

To change the value of Performance Schema system variables, set them at server startup. For example, put the following lines in a my.cnf file to change the sizes of the history tables for wait events:
```
[mysqld]
performance_schema
performance_schema_events_waits_history_size=20
performance_schema_events_waits_history_long_size=15000
```


The Performance Schema automatically sizes the values of several of its parameters at server startup if they are not set explicitly. For example, it sizes the parameters that control the sizes of the events waits tables this way. The Performance Schema allocates memory incrementally, scaling its memory use to actual server load, instead of allocating all the memory it needs during server startup. Consequently, many sizing parameters need not be set at all. To see which parameters are autosized or autoscaled, use mysqld --verbose --help and examine the option descriptions, or see Section 29.15, "Performance Schema System Variables".

For each autosized parameter that is not set at server startup, the Performance Schema determines how to set its value based on the value of the following system values, which are considered as "hints" about how you have configured your MySQL server:
```
max_connections
open_files_limit
table_definition_cache
table_open_cache
```


To override autosizing or autoscaling for a given parameter, set it to a value other than -1 at startup. In this case, the Performance Schema assigns it the specified value.

At runtime, SHOW VARIABLES displays the actual values that autosized parameters were set to. Autoscaled parameters display with a value of -1 .

If the Performance Schema is disabled, its autosized and autoscaled parameters remain set to -1 and SHOW VARIABLES displays -1.

\subsection*{29.4 Performance Schema Runtime Configuration}

Specific Performance Schema features can be enabled at runtime to control which types of event collection occur.

Performance Schema setup tables contain information about monitoring configuration:
```
mysql> SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'performance_schema'
    AND TABLE_NAME LIKE 'setup%';
+--------------------+
| TABLE_NAME |
+--------------------+
| setup_actors |
| setup_consumers |
| setup_instruments
| setup_objects |
| setup_threads |
+--------------------+
```


You can examine the contents of these tables to obtain information about Performance Schema monitoring characteristics. If you have the UPDATE privilege, you can change Performance Schema operation by modifying setup tables to affect how monitoring occurs. For additional details about these tables, see Section 29.12.2, "Performance Schema Setup Tables".

The setup_instruments and setup_consumers tables list the instruments for which events can be collected and the types of consumers for which event information actually is collected, respectively. Other setup tables enable further modification of the monitoring configuration. Section 29.4.2, "Performance Schema Event Filtering", discusses how you can modify these tables to affect event collection.

If there are Performance Schema configuration changes that must be made at runtime using SQL statements and you would like these changes to take effect each time the server starts, put the statements in a file and start the server with the init_file system variable set to name the file. This strategy can also be useful if you have multiple monitoring configurations, each tailored to produce a different kind of monitoring, such as casual server health monitoring, incident investigation, application behavior troubleshooting, and so forth. Put the statements for each monitoring configuration into their own file and specify the appropriate file as the init_file value when you start the server.

\subsection*{29.4.1 Performance Schema Event Timing}

Events are collected by means of instrumentation added to the server source code. Instruments time events, which is how the Performance Schema provides an idea of how long events take. It is also possible to configure instruments not to collect timing information. This section discusses the available timers and their characteristics, and how timing values are represented in events.

\section*{Performance Schema Timers}

Performance Schema timers vary in precision and amount of overhead. To see what timers are available and their characteristics, check the performance_timers table:
```
mysql> SELECT * FROM performance_schema.performance_timers;
+--------------+-----------------+------------------+-----------------
| TIMER_NAME | TIMER_FREQUENCY | TIMER_RESOLUTION | TIMER_OVERHEAD |
+-------------+------------------+------------------+------------------
\ CYCLE \ 1000000000 \
```


If the values associated with a given timer name are NULL, that timer is not supported on your platform.
The columns have these meanings:
- The TIMER_NAME column shows the names of the available timers. CYCLE refers to the timer that is based on the CPU (processor) cycle counter.
- TIMER_FREQUENCY indicates the number of timer units per second. For a cycle timer, the frequency is generally related to the CPU speed. The value shown was obtained on a system with a 2.4 GHz processor. The other timers are based on fixed fractions of seconds.
- TIMER_RESOLUTION indicates the number of timer units by which timer values increase at a time. If a timer has a resolution of 10 , its value increases by 10 each time.
- TIMER_OVERHEAD is the minimal number of cycles of overhead to obtain one timing with the given timer. The overhead per event is twice the value displayed because the timer is invoked at the beginning and end of the event.

The Performance Schema assigns timers as follows:
- The wait timer uses CYCLE.
- The idle, stage, statement, and transaction timers use NANOSECOND on platforms where the NANOSECOND timer is available, MICROSECOND otherwise.

At server startup, the Performance Schema verifies that assumptions made at build time about timer assignments are correct, and displays a warning if a timer is not available.

To time wait events, the most important criterion is to reduce overhead, at the possible expense of the timer accuracy, so using the CYCLE timer is the best.

The time a statement (or stage) takes to execute is in general orders of magnitude larger than the time it takes to execute a single wait. To time statements, the most important criterion is to have an accurate
measure, which is not affected by changes in processor frequency, so using a timer which is not based on cycles is the best. The default timer for statements is NANOSECOND. The extra "overhead" compared to the CYCLE timer is not significant, because the overhead caused by calling a timer twice (once when the statement starts, once when it ends) is orders of magnitude less compared to the CPU time used to execute the statement itself. Using the CYCLE timer has no benefit here, only drawbacks.

The precision offered by the cycle counter depends on processor speed. If the processor runs at 1 GHz (one billion cycles/second) or higher, the cycle counter delivers sub-nanosecond precision. Using the cycle counter is much cheaper than getting the actual time of day. For example, the standard gettimeofday() function can take hundreds of cycles, which is an unacceptable overhead for data gathering that may occur thousands or millions of times per second.

Cycle counters also have disadvantages:
- End users expect to see timings in wall-clock units, such as fractions of a second. Converting from cycles to fractions of seconds can be expensive. For this reason, the conversion is a quick and fairly rough multiplication operation.
- Processor cycle rate might change, such as when a laptop goes into power-saving mode or when a CPU slows down to reduce heat generation. If a processor's cycle rate fluctuates, conversion from cycles to real-time units is subject to error.
- Cycle counters might be unreliable or unavailable depending on the processor or the operating system. For example, on Pentiums, the instruction is RDTSC (an assembly-language rather than a C instruction) and it is theoretically possible for the operating system to prevent user-mode programs from using it.
- Some processor details related to out-of-order execution or multiprocessor synchronization might cause the counter to seem fast or slow by up to 1000 cycles.

MySQL works with cycle counters on x386 (Windows, macOS, Linux, Solaris, and other Unix flavors), PowerPC, and IA-64.

\section*{Performance Schema Timer Representation in Events}

Rows in Performance Schema tables that store current events and historical events have three columns to represent timing information: TIMER_START and TIMER_END indicate when an event started and finished, and TIMER_WAIT indicates event duration.

The setup_instruments table has an ENABLED column to indicate the instruments for which to collect events. The table also has a TIMED column to indicate which instruments are timed. If an instrument is not enabled, it produces no events. If an enabled instrument is not timed, events produced by the instrument have NULL for the TIMER_START, TIMER_END, and TIMER_WAIT timer values. This in turn causes those values to be ignored when calculating aggregate time values in summary tables (sum, minimum, maximum, and average).

Internally, times within events are stored in units given by the timer in effect when event timing begins. For display when events are retrieved from Performance Schema tables, times are shown in picoseconds (trillionths of a second) to normalize them to a standard unit, regardless of which timer is selected.

The timer baseline ("time zero") occurs at Performance Schema initialization during server startup. TIMER_START and TIMER_END values in events represent picoseconds since the baseline. TIMER_WAIT values are durations in picoseconds.

Picosecond values in events are approximate. Their accuracy is subject to the usual forms of error associated with conversion from one unit to another. If the CYCLE timer is used and the processor rate varies, there might be drift. For these reasons, it is not reasonable to look at the TIMER_START value for an event as an accurate measure of time elapsed since server startup. On the other hand, it is reasonable to use TIMER_START or TIMER_WAIT values in ORDER BY clauses to order events by start time or duration.

The choice of picoseconds in events rather than a value such as microseconds has a performance basis. One implementation goal was to show results in a uniform time unit, regardless of the timer. In an ideal world this time unit would look like a wall-clock unit and be reasonably precise; in other words, microseconds. But to convert cycles or nanoseconds to microseconds, it would be necessary to perform a division for every instrumentation. Division is expensive on many platforms. Multiplication is not expensive, so that is what is used. Therefore, the time unit is an integer multiple of the highest possible TIMER_FREQUENCY value, using a multiplier large enough to ensure that there is no major precision loss. The result is that the time unit is "picoseconds." This precision is spurious, but the decision enables overhead to be minimized.

While a wait, stage, statement, or transaction event is executing, the respective current-event tables display current-event timing information:
```
events_waits_current
events_stages_current
events_statements_current
events_transactions_current
```


To make it possible to determine how long a not-yet-completed event has been running, the timer columns are set as follows:
- TIMER_START is populated.
- TIMER_END is populated with the current timer value.
- TIMER_WAIT is populated with the time elapsed so far (TIMER_END - TIMER_START).

Events that have not yet completed have an END_EVENT_ID value of NULL. To assess time elapsed so far for an event, use the TIMER_WAIT column. Therefore, to identify events that have not yet completed and have taken longer than $N$ picoseconds thus far, monitoring applications can use this expression in queries:
```
WHERE END_EVENT_ID IS NULL AND TIMER_WAIT > N
```


Event identification as just described assumes that the corresponding instruments have ENABLED and TIMED set to YES and that the relevant consumers are enabled.

\subsection*{29.4.2 Performance Schema Event Filtering}

Events are processed in a producer/consumer fashion:
- Instrumented code is the source for events and produces events to be collected. The setup_instruments table lists the instruments for which events can be collected, whether they are enabled, and (for enabled instruments) whether to collect timing information:
```
mysql> SELECT NAME, ENABLED, TIMED
    FROM performance_schema.setup_instruments;
+----------------------------------------------------+--------------------
| NAME | ENABLED | TIMED |
+-----------------------------------------------------+---------+---------
...
| wait/synch/mutex/sql/LOCK_global_read_lock | YES | YES |
| wait/synch/mutex/sql/LOCK_global_system_variables | YES | YES
| wait/synch/mutex/sql/LOCK_lock_db | YES | YES
| wait/synch/mutex/sql/LOCK_manager | YES | YES |
...
```


The setup_instruments table provides the most basic form of control over event production. To further refine event production based on the type of object or thread being monitored, other tables may be used as described in Section 29.4.3, "Event Pre-Filtering".
- Performance Schema tables are the destinations for events and consume events. The setup_consumers table lists the types of consumers to which event information can be sent and whether they are enabled:
```
mysql> SELECT * FROM performance_schema.setup_consumers;
+------------------------------------+---------+
    NAME | ENABLED
+------------------------------------+---------+
| events_stages_current | NO
| events_stages_history | NO
| events_stages_history_long | NO
| events_statements_cpu | NO
| events_statements_current | YES
| events_statements_history | YES
| events_statements_history_long | NO
| events_transactions_current | YES
| events_transactions_history | YES
| events_transactions_history_long | NO
| events_waits_current | NO
| events_waits_history | NO
| events_waits_history_long | NO
| global_instrumentation | YES
| thread_instrumentation | YES
| statements_digest | YES
+-----------------------------------+--------+
```


Filtering can be done at different stages of performance monitoring:
- Pre-filtering. This is done by modifying Performance Schema configuration so that only certain types of events are collected from producers, and collected events update only certain consumers. To do this, enable or disable instruments or consumers. Pre-filtering is done by the Performance Schema and has a global effect that applies to all users.

Reasons to use pre-filtering:
- To reduce overhead. Performance Schema overhead should be minimal even with all instruments enabled, but perhaps you want to reduce it further. Or you do not care about timing events and want to disable the timing code to eliminate timing overhead.
- To avoid filling the current-events or history tables with events in which you have no interest. Prefiltering leaves more "room" in these tables for instances of rows for enabled instrument types. If you enable only file instruments with pre-filtering, no rows are collected for nonfile instruments. With post-filtering, nonfile events are collected, leaving fewer rows for file events.
- To avoid maintaining some kinds of event tables. If you disable a consumer, the server does not spend time maintaining destinations for that consumer. For example, if you do not care about event histories, you can disable the history table consumers to improve performance.
- Post-filtering. This involves the use of WHERE clauses in queries that select information from Performance Schema tables, to specify which of the available events you want to see. Post-filtering is performed on a per-user basis because individual users select which of the available events are of interest.

Reasons to use post-filtering:
- To avoid making decisions for individual users about which event information is of interest.
- To use the Performance Schema to investigate a performance issue when the restrictions to impose using pre-filtering are not known in advance.

The following sections provide more detail about pre-filtering and provide guidelines for naming instruments or consumers in filtering operations. For information about writing queries to retrieve information (post-filtering), see Section 29.5, "Performance Schema Queries".

\subsection*{29.4.3 Event Pre-Filtering}

Pre-filtering is done by the Performance Schema and has a global effect that applies to all users. Prefiltering can be applied to either the producer or consumer stage of event processing:
- To configure pre-filtering at the producer stage, several tables can be used:
- setup_instruments indicates which instruments are available. An instrument disabled in this table produces no events regardless of the contents of the other production-related setup tables. An instrument enabled in this table is permitted to produce events, subject to the contents of the other tables.
- setup_objects controls whether the Performance Schema monitors particular table and stored program objects.
- threads indicates whether monitoring is enabled for each server thread.
- setup_actors determines the initial monitoring state for new foreground threads.
- To configure pre-filtering at the consumer stage, modify the setup_consumers table. This determines the destinations to which events are sent. setup_consumers also implicitly affects event production. If a given event is not sent to any destination (that is, it is never consumed), the Performance Schema does not produce it.

Modifications to any of these tables affect monitoring immediately, with the exception that modifications to the setup_actors table affect only foreground threads created subsequent to the modification, not existing threads.

When you change the monitoring configuration, the Performance Schema does not flush the history tables. Events already collected remain in the current-events and history tables until displaced by newer events. If you disable instruments, you might need to wait a while before events for them are displaced by newer events of interest. Alternatively, use TRUNCATE TABLE to empty the history tables.

After making instrumentation changes, you might want to truncate the summary tables. Generally, the effect is to reset the summary columns to 0 or NULL, not to remove rows. This enables you to clear collected values and restart aggregation. That might be useful, for example, after you have made a runtime configuration change. Exceptions to this truncation behavior are noted in individual summary table sections.

The following sections describe how to use specific tables to control Performance Schema pre-filtering.

\subsection*{29.4.4 Pre-Filtering by Instrument}

The setup_instruments table lists the available instruments:
```
mysql> SELECT NAME, ENABLED, TIMED
    FROM performance_schema.setup_instruments;
+---------------------------------------------------+--------+-------+
| NAME | ENABLED | TIMED |
+-----------------------------------------------------+---------+---------
...
| stage/sql/end | NO | NO | NO
| stage/sql/executing | NO | NO
| stage/sql/init | NO | NO
| stage/sql/insert | NO | NO |
...
| statement/sql/load | YES | YES |
| statement/sql/grant | YES | YES
| statement/sql/check | YES | YES
| statement/sql/flush | YES | YES |
...
| wait/synch/mutex/sql/LOCK_global_read_lock | YES | YES
| wait/synch/mutex/sql/LOCK_global_system_variables | YES | YES
| wait/synch/mutex/sql/LOCK_lock_db | YES | YES
| wait/synch/mutex/sql/LOCK_manager | YES | YES |
...
| wait/synch/rwlock/sql/LOCK_grant | YES | YES
| wait/synch/rwlock/sql/LOGGER::LOCK_logger | YES | YES
| wait/synch/rwlock/sql/LOCK_sys_init_connect | YES | YES |
```

```
| wait/synch/rwlock/sql/LOCK_sys_init_slave | YES | YES |
...
| wait/io/file/sql/binlog | YES | YES |
| wait/io/file/sql/binlog_index | YES | YES
| wait/io/file/sql/casetest | YES | YES
| wait/io/file/sql/dbopt | YES | YES |
...
```


To control whether an instrument is enabled, set its ENABLED column to YES or NO. To configure whether to collect timing information for an enabled instrument, set its TIMED value to YES or NO. Setting the TIMED column affects Performance Schema table contents as described in Section 29.4.1, "Performance Schema Event Timing".

Modifications to most setup_instruments rows affect monitoring immediately. For some instruments, modifications are effective only at server startup; changing them at runtime has no effect. This affects primarily mutexes, conditions, and rwlocks in the server, although there may be other instruments for which this is true.

The setup_instruments table provides the most basic form of control over event production. To further refine event production based on the type of object or thread being monitored, other tables may be used as described in Section 29.4.3, "Event Pre-Filtering".

The following examples demonstrate possible operations on the setup_instruments table. These changes, like other pre-filtering operations, affect all users. Some of these queries use the LIKE operator and a pattern match instrument names. For additional information about specifying patterns to select instruments, see Section 29.4.9, "Naming Instruments or Consumers for Filtering Operations".
- Disable all instruments:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = 'NO';
```


Now no events are collected.
- Disable all file instruments, adding them to the current set of disabled instruments:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = 'NO'
WHERE NAME LIKE 'wait/io/file/%';
```

- Disable only file instruments, enable all other instruments:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = IF(NAME LIKE 'wait/io/file/%', 'NO', 'YES');
```

- Enable all but those instruments in the mysys library:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = CASE WHEN NAME LIKE '%/mysys/%' THEN 'YES' ELSE 'NO' END;
```

- Disable a specific instrument:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = 'NO'
WHERE NAME = 'wait/synch/mutex/mysys/TMPDIR_mutex';
```

- To toggle the state of an instrument, "flip" its ENABLED value:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = IF(ENABLED = 'YES', 'NO', 'YES')
WHERE NAME = 'wait/synch/mutex/mysys/TMPDIR_mutex';
```

- Disable timing for all events:
```
UPDATE performance_schema.setup_instruments
SET TIMED = 'NO';
```


\subsection*{29.4.5 Pre-Filtering by Object}

The setup_objects table controls whether the Performance Schema monitors particular table and stored program objects. The initial setup_objects contents look like this:
```
mysql> SELECT * FROM performance_schema.setup_objects;
+--------------+---------------------+-------------+---------+-------+

\begin{tabular}{|l|l|l|l|l|}
\hline OBJECT_TYPE & OBJECT_SCHEMA & OBJECT_NAME & ENABLED & TIMED \\
\hline EVENT & mysql & \% & N0 & NO \\
\hline EVENT & performance_schema & \% & N0 & NO \\
\hline EVENT & information_schema & \% & NO & NO \\
\hline EVENT & \% & \% & YES & YES \\
\hline FUNCTION & mysql & \% & N0 & NO \\
\hline FUNCTION & performance_schema & \% & N0 & NO \\
\hline FUNCTION & information_schema & \% & NO & NO \\
\hline FUNCTION & \% & \% & YES & YES \\
\hline PROCEDURE & mysql & \% & N0 & NO \\
\hline PROCEDURE & performance_schema & \% & N0 & N0 \\
\hline PROCEDURE & information_schema & \% & NO & NO \\
\hline PROCEDURE & \% & \% & YES & YES \\
\hline TABLE & mysql & \% & NO & NO \\
\hline TABLE & performance_schema & \% & N0 & NO \\
\hline TABLE & information_schema & \% & NO & NO \\
\hline TABLE & \% & \% & YES & YES \\
\hline TRIGGER & mysql & \% & N0 & NO \\
\hline TRIGGER & performance_schema & \% & N0 & NO \\
\hline TRIGGER & information_schema & \% & N0 & NO \\
\hline TRIGGER & \% & \% & YES & YES \\
\hline
\end{tabular}
```


Modifications to the setup_objects table affect object monitoring immediately.
The OBJECT_TYPE column indicates the type of object to which a row applies. TABLE filtering affects table I/O events (wait/io/table/sql/handler instrument) and table lock events (wait/lock/ table/sql/handler instrument).

The OBJECT_SCHEMA and OBJECT_NAME columns should contain a literal schema or object name, or ' $\%$ ' to match any name.

The ENABLED column indicates whether matching objects are monitored, and TIMED indicates whether to collect timing information. Setting the TIMED column affects Performance Schema table contents as described in Section 29.4.1, "Performance Schema Event Timing".

The effect of the default object configuration is to instrument all objects except those in the mysql, INFORMATION_SCHEMA, and performance_schema databases. (Tables in the INFORMATION_SCHEMA database are not instrumented regardless of the contents of setup_objects; the row for information_schema. \% simply makes this default explicit.)

When the Performance Schema checks for a match in setup_objects, it tries to find more specific matches first. For rows that match a given OBJECT_TYPE, the Performance Schema checks rows in this order:
- Rows with OBJECT_SCHEMA='literal' and OBJECT_NAME='literal'.
- Rows with OBJECT_SCHEMA='literal' and OBJECT_NAME=' ${ }^{\prime}$ '.
- Rows with OBJECT_SCHEMA=' $\%^{\prime}$ and OBJECT_NAME=' $\%^{\prime}$.

For example, with a table db1. t1, the Performance Schema looks in TABLE rows for a match for ${ }^{\prime} \mathrm{db} 1$ ' and 't1', then for 'db1' and ' $\%$ ', then for ' $\%$ ' and ' $\%$ '. The order in which matching occurs matters because different matching setup_objects rows can have different ENABLED and TIMED values.

For table-related events, the Performance Schema combines the contents of setup_objects with setup_instruments to determine whether to enable instruments and whether to time enabled instruments:
- For tables that match a row in setup_objects, table instruments produce events only if ENABLED is YES in both setup_instruments and setup_objects.
- The TIMED values in the two tables are combined, so that timing information is collected only when both values are YES.

For stored program objects, the Performance Schema takes the ENABLED and TIMED columns directly from the setup_objects row. There is no combining of values with setup_instruments.

Suppose that setup_objects contains the following TABLE rows that apply to $\mathrm{db} 1, \mathrm{db} 2$, and db 3 :
```
+--------------+----------------+-------------+--------+-------+
| OBJECT_TYPE | OBJECT_SCHEMA | OBJECT_NAME | ENABLED | TIMED |
+--------------+----------------+-------------+---------+-------+

\begin{tabular}{|l|l|l|l|l|}
\hline TABLE & db 1 & t 1 & YES & YES \\
\hline TABLE & db 1 & t 2 & NO & NO \\
\hline TABLE & db 2 & $\%$ & YES & YES \\
\hline TABLE & db 3 & $\%$ & NO & NO \\
\hline TABLE & $\%$ & | $\%$ & YES & YES \\
\hline & $\%$ & $\%$ & & YE-
\end{tabular}
```


If an object-related instrument in setup_instruments has an ENABLED value of NO, events for the object are not monitored. If the ENABLED value is YES, event monitoring occurs according to the ENABLED value in the relevant setup_objects row:
- db1. t1 events are monitored
- db1.t2 events are not monitored
- db2.t3 events are monitored
- db3.t4 events are not monitored
- db4.t5 events are monitored

Similar logic applies for combining the TIMED columns from the setup_instruments and setup_objects tables to determine whether to collect event timing information.

If a persistent table and a temporary table have the same name, matching against setup_objects rows occurs the same way for both. It is not possible to enable monitoring for one table but not the other. However, each table is instrumented separately.

\subsection*{29.4.6 Pre-Filtering by Thread}

The threads table contains a row for each server thread. Each row contains information about a thread and indicates whether monitoring is enabled for it. For the Performance Schema to monitor a thread, these things must be true:
- The thread_instrumentation consumer in the setup_consumers table must be YES.
- The threads. INSTRUMENTED column must be YES.
- Monitoring occurs only for those thread events produced from instruments that are enabled in the setup_instruments table.

The threads table also indicates for each server thread whether to perform historical event logging. This includes wait, stage, statement, and transaction events and affects logging to these tables:
```
events_waits_history
events_waits_history_long
events_stages_history
events_stages_history_long
events_statements_history
events_statements_history_long
events_transactions_history
events_transactions_history_long
```


For historical event logging to occur, these things must be true:
- The appropriate history-related consumers in the setup_consumers table must be enabled. For example, wait event logging in the events_waits_history and events_waits_history_long tables requires the corresponding events_waits_history and events_waits_history_long consumers to be YES.
- The threads. HISTORY column must be YES.
- Logging occurs only for those thread events produced from instruments that are enabled in the setup_instruments table.

For foreground threads (resulting from client connections), the initial values of the INSTRUMENTED and HISTORY columns in threads table rows are determined by whether the user account associated with a thread matches any row in the setup_actors table. The values come from the ENABLED and HISTORY columns of the matching setup_actors table row.

For background threads, there is no associated user. INSTRUMENTED and HISTORY are YES by default and setup_actors is not consulted.

The initial setup_actors contents look like this:
```
mysql> SELECT * FROM performance_schema.setup_actors;
+------+------+-------+---------+---------+
| HOST | USER | ROLE | ENABLED | HISTORY |
+------+-------+-------+---------+---------+
| % | % | % | YES | YES |
+------+------+------+---------+---------+
```


The HOST and USER columns should contain a literal host or user name, or ' $\%$ ' to match any name.
The ENABLED and HISTORY columns indicate whether to enable instrumentation and historical event logging for matching threads, subject to the other conditions described previously.

When the Performance Schema checks for a match for each new foreground thread in setup_actors, it tries to find more specific matches first, using the USER and HOST columns (ROLE is unused):
- Rows with USER='literal' and HOST='literal'.
- Rows with USER='literal' and HOST='\%'.
- Rows with USER='\%' and HOST='literal'.
- Rows with USER=' $\%^{\prime}$ and HOST $={ }^{\prime} \%^{\prime}$.

The order in which matching occurs matters because different matching setup_actors rows can have different USER and HOST values. This enables instrumenting and historical event logging to be applied selectively per host, user, or account (user and host combination), based on the ENABLED and HISTORY column values:
- When the best match is a row with ENABLED=YES, the INSTRUMENTED value for the thread becomes YES. When the best match is a row with HISTORY=YES, the HISTORY value for the thread becomes YES.
- When the best match is a row with ENABLED=NO, the INSTRUMENTED value for the thread becomes NO. When the best match is a row with HISTORY=NO, the HISTORY value for the thread becomes NO.
- When no match is found, the INSTRUMENTED and HISTORY values for the thread become NO.

The ENABLED and HISTORY columns in setup_actors rows can be set to YES or NO independent of one another. This means you can enable instrumentation separately from whether you collect historical events.

By default, monitoring and historical event collection are enabled for all new foreground threads because the setup_actors table initially contains a row with ' $\%$ ' for both HOST and USER. To perform more limited matching such as to enable monitoring only for some foreground threads, you must change this row because it matches any connection, and add rows for more specific HOST/USER combinations.

Suppose that you modify setup_actors as follows:
```
UPDATE performance_schema.setup_actors
SET ENABLED = 'NO', HISTORY = 'NO'
WHERE HOST = '%' AND USER = '%';
INSERT INTO performance_schema.setup_actors
(HOST, USER, ROLE, ENABLED, HISTORY)
VALUES('localhost','joe','%','YES','YES');
INSERT INTO performance_schema.setup_actors
(HOST, USER, ROLE, ENABLED, HISTORY)
VALUES('hosta.example.com','joe','%','YES','NO');
INSERT INTO performance_schema.setup_actors
(HOST, USER, ROLE, ENABLED, HISTORY)
VALUES('%','sam','%','NO','YES');
```


The UPDATE statement changes the default match to disable instrumentation and historical event collection. The INSERT statements add rows for more specific matches.

Now the Performance Schema determines how to set the INSTRUMENTED and HISTORY values for new connection threads as follows:
- If joe connects from the local host, the connection matches the first inserted row. The INSTRUMENTED and HISTORY values for the thread become YES.
- If joe connects from hosta.example.com, the connection matches the second inserted row. The INSTRUMENTED value for the thread becomes YES and the HISTORY value becomes NO.
- If joe connects from any other host, there is no match. The INSTRUMENTED and HISTORY values for the thread become NO.
- If sam connects from any host, the connection matches the third inserted row. The INSTRUMENTED value for the thread becomes NO and the HISTORY value becomes YES.
- For any other connection, the row with HOST and USER set to ' $\%$ ' matches. This row now has ENABLED and HISTORY set to NO, so the INSTRUMENTED and HISTORY values for the thread become NO.

Modifications to the setup_actors table affect only foreground threads created subsequent to the modification, not existing threads. To affect existing threads, modify the INSTRUMENTED and HISTORY columns of threads table rows.

\subsection*{29.4.7 Pre-Filtering by Consumer}

The setup_consumers table lists the available consumer types and which are enabled:
```
mysql> SELECT * FROM performance_schema.setup_consumers;
+------------------------------------+---------+
| NAME | ENABLED |
+------------------------------------+---------+
| events_stages_current | NO
| events_stages_history | NO
| events_stages_history_long | NO
| events_statements_cpu | NO
| events_statements_current | YES
| events_statements_history | YES
| events_statements_history_long | NO
| events_transactions_current | YES
| events_transactions_history | YES
| events_transactions_history_long | NO
| events_waits_current | NO
| events_waits_history | NO
```

```
| events_waits_history_long | NO
| global_instrumentation | YES
| thread_instrumentation | YES
| statements_digest | YES |
+-----------------------------------+---------+
```


Modify the setup_consumers table to affect pre-filtering at the consumer stage and determine the destinations to which events are sent. To enable or disable a consumer, set its ENABLED value to YES or NO.

Modifications to the setup_consumers table affect monitoring immediately.
If you disable a consumer, the server does not spend time maintaining destinations for that consumer. For example, if you do not care about historical event information, disable the history consumers:
```
UPDATE performance_schema.setup_consumers
SET ENABLED = 'NO'
WHERE NAME LIKE '%history%';
```


The consumer settings in the setup_consumers table form a hierarchy from higher levels to lower. The following principles apply:
- Destinations associated with a consumer receive no events unless the Performance Schema checks the consumer and the consumer is enabled.
- A consumer is checked only if all consumers it depends on (if any) are enabled.
- If a consumer is not checked, or is checked but is disabled, other consumers that depend on it are not checked.
- Dependent consumers may have their own dependent consumers.
- If an event would not be sent to any destination, the Performance Schema does not produce it.

The following lists describe the available consumer values. For discussion of several representative consumer configurations and their effect on instrumentation, see Section 29.4.8, "Example Consumer Configurations".
- Global and Thread Consumers
- Wait Event Consumers
- Stage Event Consumers
- Statement Event Consumers
- Transaction Event Consumers
- Statement Digest Consumer

\section*{Global and Thread Consumers}
- global_instrumentation is the highest level consumer. If global_instrumentation is NO, it disables global instrumentation. All other settings are lower level and are not checked; it does not matter what they are set to. No global or per thread information is maintained and no individual events are collected in the current-events or event-history tables. If global_instrumentation is YES, the Performance Schema maintains information for global states and also checks the thread_instrumentation consumer.
- thread_instrumentation is checked only if global_instrumentation is YES. Otherwise, if thread_instrumentation is NO, it disables thread-specific instrumentation and all lowerlevel settings are ignored. No information is maintained per thread and no individual events are collected in the current-events or event-history tables. If thread_instrumentation is YES, the Performance Schema maintains thread-specific information and also checks events_xxx_current consumers.

\section*{Wait Event Consumers}

These consumers require both global_instrumentation and thread_instrumentation to be YES or they are not checked. If checked, they act as follows:
- events_waits_current, if NO, disables collection of individual wait events in the events_waits_current table. If YES, it enables wait event collection and the Performance Schema checks the events_waits_history and events_waits_history_long consumers.
- events_waits_history is not checked if event_waits_current is NO. Otherwise, an events_waits_history value of NO or YES disables or enables collection of wait events in the events_waits_history table.
- events_waits_history_long is not checked if event_waits_current is NO. Otherwise, an events_waits_history_long value of NO or YES disables or enables collection of wait events in the events_waits_history_long table.

\section*{Stage Event Consumers}

These consumers require both global_instrumentation and thread_instrumentation to be YES or they are not checked. If checked, they act as follows:
- events_stages_current, if NO, disables collection of individual stage events in the events_stages_current table. If YES, it enables stage event collection and the Performance Schema checks the events_stages_history and events_stages_history_long consumers.
- events_stages_history is not checked if event_stages_current is NO. Otherwise, an events_stages_history value of NO or YES disables or enables collection of stage events in the events_stages_history table.
- events_stages_history_long is not checked if event_stages_current is NO. Otherwise, an events_stages_history_long value of NO or YES disables or enables collection of stage events in the events_stages_history_long table.

\section*{Statement Event Consumers}

These consumers require both global_instrumentation and thread_instrumentation to be YES or they are not checked. If checked, they act as follows:
- events_statements_cpu, if NO, disables measurement of CPU_TIME. If YES, and the instrumentation is enabled and timed, CPU_TIME is measured.
- events_statements_current, if NO, disables collection of individual statement events in the events_statements_current table. If YES, it enables statement event collection and the Performance Schema checks the events_statements_history and events_statements_history_long consumers.
- events_statements_history is not checked if events_statements_current is NO. Otherwise, an events_statements_history value of NO or YES disables or enables collection of statement events in the events_statements_history table.
- events_statements_history_long is not checked if events_statements_current is NO. Otherwise, an events_statements_history_long value of NO or YES disables or enables collection of statement events in the events_statements_history_long table.

\section*{Transaction Event Consumers}

These consumers require both global_instrumentation and thread_instrumentation to be YES or they are not checked. If checked, they act as follows:
- events_transactions_current, if NO, disables collection of individual transaction events in the events_transactions_current table. If YES, it enables transaction event collection and the Performance Schema checks the events_transactions_history and events_transactions_history_long consumers.
- events_transactions_history is not checked if events_transactions_current is NO. Otherwise, an events_transactions_history value of NO or YES disables or enables collection of transaction events in the events_transactions_history table.
- events_transactions_history_long is not checked if events_transactions_current is NO. Otherwise, an events_transactions_history_long value of NO or YES disables or enables collection of transaction events in the events_transactions_history_long table.

\section*{Statement Digest Consumer}

The statements_digest consumer requires global_instrumentation to be YES or it is not checked. There is no dependency on the statement event consumers, so you can obtain statistics per digest without having to collect statistics in events_statements_current, which is advantageous in terms of overhead. Conversely, you can get detailed statements in events_statements_current without digests (the DIGEST and DIGEST_TEXT columns are NULL in this case).

For more information about statement digesting, see Section 29.10, "Performance Schema Statement Digests and Sampling".

\subsection*{29.4.8 Example Consumer Configurations}

The consumer settings in the setup_consumers table form a hierarchy from higher levels to lower. The following discussion describes how consumers work, showing specific configurations and their effects as consumer settings are enabled progressively from high to low. The consumer values shown are representative. The general principles described here apply to other consumer values that may be available.

The configuration descriptions occur in order of increasing functionality and overhead. If you do not need the information provided by enabling lower-level settings, disable them so that the Performance Schema executes less code on your behalf and there is less information to sift through.

The setup_consumers table contains the following hierarchy of values:
```
global_instrumentation
    thread_instrumentation
        events_waits_current
            events_waits_history
            events_waits_history_long
        events_stages_current
            events_stages_history
            events_stages_history_long
        events_statements_current
            events_statements_history
            events_statements_history_long
        events_transactions_current
            events_transactions_history
            events_transactions_history_long
    statements_digest
```


\section*{Note}

In the consumer hierarchy, the consumers for waits, stages, statements, and transactions are all at the same level. This differs from the event nesting hierarchy, for which wait events nest within stage events, which nest within statement events, which nest within transaction events.

If a given consumer setting is NO, the Performance Schema disables the instrumentation associated with the consumer and ignores all lower-level settings. If a given setting is YES, the Performance

Schema enables the instrumentation associated with it and checks the settings at the next lowest level. For a description of the rules for each consumer, see Section 29.4.7, "Pre-Filtering by Consumer".

For example, if global_instrumentation is enabled, thread_instrumentation is checked. If thread_instrumentation is enabled, the events_xxx_current consumers are checked. If of these events_waits_current is enabled, events_waits_history and events_waits_history_long are checked.

Each of the following configuration descriptions indicates which setup elements the Performance Schema checks and which output tables it maintains (that is, for which tables it collects information).
- No Instrumentation
- Global Instrumentation Only
- Global and Thread Instrumentation Only
- Global, Thread, and Current-Event Instrumentation
- Global, Thread, Current-Event, and Event-History instrumentation

\section*{No Instrumentation}

Server configuration state:
```
mysql> SELECT * FROM performance_schema.setup_consumers;
+-----------------------------+---------+
| NAME | ENABLED |
+----------------------------+---------+
| global_instrumentation | NO |
...
+----------------------------+---------+
```


In this configuration, nothing is instrumented.
Setup elements checked:
- Table setup_consumers, consumer global_instrumentation

Output tables maintained:
- None

\section*{Global Instrumentation Only}

Server configuration state:
```
mysql> SELECT * FROM performance_schema.setup_consumers;
+-----------------------------+---------+
| NAME | ENABLED |
+----------------------------+---------+
| global_instrumentation | YES |
| thread_instrumentation | NO |
...
+----------------------------+---------+
```


In this configuration, instrumentation is maintained only for global states. Per-thread instrumentation is disabled.

Additional setup elements checked, relative to the preceding configuration:
- Table setup_consumers, consumer thread_instrumentation
- Table setup_instruments
- Table setup_objects

Additional output tables maintained, relative to the preceding configuration:
- mutex_instances
- rwlock_instances
- cond_instances
- file_instances
- users
- hosts
- accounts
- socket_summary_by_event_name
- file_summary_by_instance
- file_summary_by_event_name
- objects_summary_global_by_type
- memory_summary_global_by_event_name
- table_lock_waits_summary_by_table
- table_io_waits_summary_by_index_usage
- table_io_waits_summary_by_table
- events_waits_summary_by_instance
- events_waits_summary_global_by_event_name
- events_stages_summary_global_by_event_name
- events_statements_summary_global_by_event_name
- events_transactions_summary_global_by_event_name

\section*{Global and Thread Instrumentation Only}

Server configuration state:
```
mysql> SELECT * FROM performance_schema.setup_consumers;
+------------------------------------+---------+
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4790.jpg?height=175&width=771&top_left_y=2039&top_left_x=287)
```
...
| events_stages_current | NO |
| events_statements_current | NO |
...
| events_transactions_current | NO |
...
+------------------------------------+---------+
```


In this configuration, instrumentation is maintained globally and per thread. No individual events are collected in the current-events or event-history tables.

Additional setup elements checked, relative to the preceding configuration:
- Table setup_consumers, consumers events_xxx_current, where $x x x$ is waits, stages, statements, transactions
- Table setup_actors
- Column threads.instrumented

Additional output tables maintained, relative to the preceding configuration:
- events_xxx_summary_by_yyy_by_event_name, where $x x x$ is waits, stages, statements, transactions; and $y y y$ is thread, user, host, account

\section*{Global, Thread, and Current-Event Instrumentation}

Server configuration state:
```
mysql> SELECT * FROM performance_schema.setup_consumers;
+------------------------------------+---------+
| NAME | ENABLED |
+-----------------------------------+---------+
| global_instrumentation | YES
| thread_instrumentation | YES
| events_waits_current | YES
| events_waits_history | NO
| events_waits_history_long | NO
| events_stages_current | YES
| events_stages_history | NO
| events_stages_history_long | NO
| events_statements_current | YES
| events_statements_history | NO
| events_statements_history_long | NO
| events_transactions_current | YES
| events_transactions_history | NO
| events_transactions_history_long | NO
...
+-----------------------------------+--------+
```


In this configuration, instrumentation is maintained globally and per thread. Individual events are collected in the current-events table, but not in the event-history tables.

Additional setup elements checked, relative to the preceding configuration:
- Consumers events_xxx_history, where $x x x$ is waits, stages, statements, transactions
- Consumers events_xxx_history_long, where $x x x$ is waits, stages, statements, transactions

Additional output tables maintained, relative to the preceding configuration:
- events_xxx_current, where $x x x$ is waits, stages, statements, transactions

\section*{Global, Thread, Current-Event, and Event-History instrumentation}

The preceding configuration collects no event history because the events_xxx_history and events_xxx_history_long consumers are disabled. Those consumers can be enabled separately or together to collect event history per thread, globally, or both.

This configuration collects event history per thread, but not globally:
```
mysql> SELECT * FROM performance_schema.setup_consumers;
+------------------------------------+---------+
| NAME | ENABLED
+------------------------------------+---------+
| global_instrumentation | YES
| thread_instrumentation | YES
| events_waits_current | YES
| events_waits_history | YES
| events_waits_history_long | NO
```

```

\begin{tabular}{|l|l|}
\hline events_stages_current & YES \\
events_stages_history & YES \\
events_stages_history_long & NO \\
events_statements_current & YES \\
events_statements_history & YES \\
events_statements_history_long & NO \\
events_transactions_current & YES \\
events_transactions_history & YES \\
events_transactions_history_long & NO
\end{tabular}
...
```


Event-history tables maintained for this configuration:
- events_xxx_history, where $x x x$ is waits, stages, statements, transactions

This configuration collects event history globally, but not per thread:
```
mysql> SELECT * FROM performance_schema.setup_consumers;

\begin{tabular}{|l|l|}
\hline NAME & ENABLED \\
\hline global_instrumentation & YES \\
\hline thread_instrumentation & YES \\
\hline events_waits_current & YES \\
\hline events_waits_history & NO \\
\hline events_waits_history_long & YES \\
\hline events_stages_current & YES \\
\hline events_stages_history & NO \\
\hline events_stages_history_long & YES \\
\hline events_statements_current & YES \\
\hline events_statements_history & NO \\
\hline events_statements_history_long & YES \\
\hline events_transactions_current & YES \\
\hline events_transactions_history & NO \\
\hline events_transactions_history_long & YES \\
\hline
\end{tabular}
```


Event-history tables maintained for this configuration:
- events_xxx_history_long, where $x x x$ is waits, stages, statements, transactions

This configuration collects event history per thread and globally:
```
mysql> SELECT * FROM performance_schema.setup_consumers;

\begin{tabular}{|l|l|}
\hline NAME & ENABLED \\
\hline global_instrumentation & YES \\
\hline thread_instrumentation & YES \\
\hline events_waits_current & YES \\
\hline events_waits_history & YES \\
\hline events_waits_history_long & YES \\
\hline events_stages_current & YES \\
\hline events_stages_history & YES \\
\hline events_stages_history_long & YES \\
\hline events_statements_current & YES \\
\hline events_statements_history & YES \\
\hline events_statements_history_long & YES \\
\hline events_transactions_current & YES \\
\hline events_transactions_history & YES \\
\hline events_transactions_history_long & YES \\
\hline
\end{tabular}
```


Event-history tables maintained for this configuration:
- events_xxx_history, where $x x x$ is waits, stages, statements, transactions
- events_xxx_history_long, where $x x x$ is waits, stages, statements, transactions

\subsection*{29.4.9 Naming Instruments or Consumers for Filtering Operations}

Names given for filtering operations can be as specific or general as required. To indicate a single instrument or consumer, specify its name in full:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = 'NO'
WHERE NAME = 'wait/synch/mutex/myisammrg/MYRG_INFO::mutex';
UPDATE performance_schema.setup_consumers
SET ENABLED = 'NO'
WHERE NAME = 'events_waits_current';
```


To specify a group of instruments or consumers, use a pattern that matches the group members:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = 'NO'
WHERE NAME LIKE 'wait/synch/mutex/%';
UPDATE performance_schema.setup_consumers
SET ENABLED = 'NO'
WHERE NAME LIKE '%history%';
```


If you use a pattern, it should be chosen so that it matches all the items of interest and no others. For example, to select all file I/O instruments, it is better to use a pattern that includes the entire instrument name prefix:
```
... WHERE NAME LIKE 'wait/io/file/%';
```


A pattern of ' $\% /$ file / $\%$ ' matches other instruments that have an element of '/file/' anywhere in the name. Even less suitable is the pattern '\%file\%' because it matches instruments with 'file' anywhere in the name, such as wait/synch/mutex/innodb/file_open_mutex.

To check which instrument or consumer names a pattern matches, perform a simple test:
```
SELECT NAME FROM performance_schema.setup_instruments
WHERE NAME LIKE 'pattern';
SELECT NAME FROM performance_schema.setup_consumers
WHERE NAME LIKE 'pattern';
```


For information about the types of names that are supported, see Section 29.6, "Performance Schema Instrument Naming Conventions".

\subsection*{29.4.10 Determining What Is Instrumented}

It is always possible to determine what instruments the Performance Schema includes by checking the setup_instruments table. For example, to see what file-related events are instrumented for the InnoDB storage engine, use this query:
```
mysql> SELECT NAME, ENABLED, TIMED
    FROM performance_schema.setup_instruments
    WHERE NAME LIKE 'wait/io/file/innodb/%';
+---------------------------------------------------+---------+------+
| NAME | ENABLED | TIMED |
+--------------------------------------------------+---------+------+
| wait/io/file/innodb/innodb_tablespace_open_file | YES | YES |
| wait/io/file/innodb/innodb_data_file | YES | YES
| wait/io/file/innodb/innodb_log_file | YES | YES
| wait/io/file/innodb/innodb_temp_file | YES | YES
| wait/io/file/innodb/innodb_arch_file | YES | YES
| wait/io/file/innodb/innodb_clone_file | YES | YES
+---------------------------------------------------+-------------------
```


An exhaustive description of precisely what is instrumented is not given in this documentation, for several reasons:
- What is instrumented is the server code. Changes to this code occur often, which also affects the set of instruments.
- It is not practical to list all the instruments because there are hundreds of them.
- As described earlier, it is possible to find out by querying the setup_instruments table. This information is always up to date for your version of MySQL, also includes instrumentation for instrumented plugins you might have installed that are not part of the core server, and can be used by automated tools.

\subsection*{29.5 Performance Schema Queries}

Pre-filtering limits which event information is collected and is independent of any particular user. By contrast, post-filtering is performed by individual users through the use of queries with appropriate WHERE clauses that restrict what event information to select from the events available after pre-filtering has been applied.

In Section 29.4.3, "Event Pre-Filtering", an example showed how to pre-filter for file instruments. If the event tables contain both file and nonfile information, post-filtering is another way to see information only for file events. Add a WHERE clause to queries to restrict event selection appropriately:
```
mysql> SELECT THREAD_ID, NUMBER_OF_BYTES
    FROM performance_schema.events_waits_history
    WHERE EVENT_NAME LIKE 'wait/io/file/%'
    AND NUMBER_OF_BYTES IS NOT NULL;
+------------+------------------+
| THREAD_ID | NUMBER_OF_BYTES |
+------------+-----------------+
| 11 | 66 |
```


Most Performance Schema tables have indexes, which gives the optimizer access to execution plans other than full table scans. These indexes also improve performance for related objects, such as sys schema views that use those tables. For more information, see Section 10.2.4, "Optimizing Performance Schema Queries".

\subsection*{29.6 Performance Schema Instrument Naming Conventions}

An instrument name consists of a sequence of elements separated by '/' characters. Example names:
```
wait/io/file/myisam/log
wait/io/file/mysys/charset
wait/lock/table/sql/handler
wait/synch/cond/mysys/COND_alarm
wait/synch/cond/sql/BINLOG::update_cond
wait/synch/mutex/mysys/BITMAP_mutex
wait/synch/mutex/sql/LOCK_delete
wait/synch/rwlock/sql/Query_cache_query::lock
stage/sql/closing tables
stage/sql/Sorting result
statement/com/Execute
statement/com/Query
statement/sql/create_table
statement/sql/lock_tables
errors
```


The instrument name space has a tree-like structure. The elements of an instrument name from left to right provide a progression from more general to more specific. The number of elements a name has depends on the type of instrument.

The interpretation of a given element in a name depends on the elements to the left of it. For example, myisam appears in both of the following names, but myisam in the first name is related to file I/O, whereas in the second it is related to a synchronization instrument:
```
wait/io/file/myisam/log
wait/synch/cond/myisam/MI_SORT_INFO::cond
```


Instrument names consist of a prefix with a structure defined by the Performance Schema implementation and a suffix defined by the developer implementing the instrument code. The toplevel element of an instrument prefix indicates the type of instrument. This element also determines which event timer in the performance_timers table applies to the instrument. For the prefix part of instrument names, the top level indicates the type of instrument.

The suffix part of instrument names comes from the code for the instruments themselves. Suffixes may include levels such as these:
- A name for the major element (a server module such as myisam, innodb, mysys, or sql) or a plugin name.
- The name of a variable in the code, in the form $X X X$ (a global variable) or CCC : : MMM (a member MMM in class CCC). Examples: COND_thread_cache, THR_LOCK_myisam, BINLOG : : LOCK_index.
- Top-Level Instrument Elements
- Idle Instrument Elements
- Error Instrument Elements
- Memory Instrument Elements
- Stage Instrument Elements
- Statement Instrument Elements
- Thread Instrument Elements
- Wait Instrument Elements

\section*{Top-Level Instrument Elements}
- idle: An instrumented idle event. This instrument has no further elements.
- error: An instrumented error event. This instrument has no further elements.
- memory: An instrumented memory event.
- stage: An instrumented stage event.
- statement: An instrumented statement event.
- transaction: An instrumented transaction event. This instrument has no further elements.
- wait: An instrumented wait event.

\section*{Idle Instrument Elements}

The idle instrument is used for idle events, which The Performance Schema generates as discussed in the description of the socket_instances. STATE column in Section 29.12.3.5, "The socket_instances Table".

\section*{Error Instrument Elements}

The error instrument indicates whether to collect information for server errors and warnings. This instrument is enabled by default. The TIMED column for the error row in the setup_instruments table is inapplicable because timing information is not collected.

\section*{Memory Instrument Elements}

Memory instrumentation is enabled by default. Memory instrumentation can be enabled or disabled at startup, or dynamically at runtime by updating the ENABLED column of the relevant instruments in the setup_instruments table. Memory instruments have names of the form memory/code_area/instrument_name where code_area is a value such as sql or myisam, and instrument_name is the instrument detail.

Instruments named with the prefix memory/performance_schema/ expose how much memory is allocated for internal buffers in the Performance Schema. The memory/performance_schema/ instruments are built in, always enabled, and cannot be disabled at startup or runtime. Built-in memory instruments are displayed only in the memory_summary_global_by_event_name table. For more information, see Section 29.17, "The Performance Schema Memory-Allocation Model".

\section*{Stage Instrument Elements}

Stage instruments have names of the form stage/code_area/stage_name, where code_area is a value such as sql or myisam, and stage_name indicates the stage of statement processing, such as Sorting result or Sending data. Stages correspond to the thread states displayed by SHOW PROCESSLIST or that are visible in the Information Schema PROCESSLIST table.

\section*{Statement Instrument Elements}
- statement/abstract/*: An abstract instrument for statement operations. Abstract instruments are used during the early stages of statement classification before the exact statement type is known, then changed to a more specific statement instrument when the type is known. For a description of this process, see Section 29.12.6, "Performance Schema Statement Event Tables".
- statement/com: An instrumented command operation. These have names corresponding to COM_xxx operations (see the mysql_com.h header file and sql/sql_parse.cc. For example, the statement/com/Connect and statement/com/Init DB instruments correspond to the COM_CONNECT and COM_INIT_DB commands.
- statement/scheduler/event: A single instrument to track all events executed by the Event Scheduler. This instrument comes into play when a scheduled event begins executing.
- statement/sp: An instrumented internal instruction executed by a stored program. For example, the statement/sp/cfetch and statement/sp/freturn instruments are used cursor fetch and function return instructions.
- statement/sql: An instrumented SQL statement operation. For example, the statement/sql/ create_db and statement/sql/select instruments are used for CREATE DATABASE and SELECT statements.

\section*{Thread Instrument Elements}

Instrumented threads are displayed in the setup_threads table, which exposes thread class names and attributes.

Thread instruments begin with thread (for example, thread/sql/parser_service or thread/ performance_schema/setup).

The names of thread instruments for ndbcluster plugin threads begin with thread/ndbcluster/; for more information about these, see ndbcluster Plugin Threads.

\section*{Wait Instrument Elements}
- wait/io

An instrumented I/O operation.
- wait/io/file

An instrumented file I/O operation. For files, the wait is the time waiting for the file operation to complete (for example, a call to fwrite()). Due to caching, the physical file I/O on the disk might not happen within this call.
- wait/io/socket

An instrumented socket operation. Socket instruments have names of the form wait/io/ socket/sql/socket_type. The server has a listening socket for each network protocol that it supports. The instruments associated with listening sockets for TCP/IP or Unix socket file connections have a socket_type value of server_tcpip_socket or server_unix_socket, respectively. When a listening socket detects a connection, the server transfers the connection to a new socket managed by a separate thread. The instrument for the new connection thread has a socket_type value of client_connection.
- wait/io/table

An instrumented table I/O operation. These include row-level accesses to persistent base tables or temporary tables. Operations that affect rows are fetch, insert, update, and delete. For a view, waits are associated with base tables referenced by the view.

Unlike most waits, a table I/O wait can include other waits. For example, table I/O might include file I/O or memory operations. Thus, events_waits_current for a table I/O wait usually has two rows. For more information, see Section 29.8, "Performance Schema Atom and Molecule Events".

Some row operations might cause multiple table I/O waits. For example, an insert might activate a trigger that causes an update.
- wait/lock

An instrumented lock operation.
- wait/lock/table

An instrumented table lock operation.
- wait/lock/metadata/sql/mdl

An instrumented metadata lock operation.
- wait/synch

An instrumented synchronization object. For synchronization objects, the TIMER_WAIT time includes the amount of time blocked while attempting to acquire a lock on the object, if any.
- wait/synch/cond

A condition is used by one thread to signal to other threads that something they were waiting for has happened. If a single thread was waiting for a condition, it can wake up and proceed with its execution. If several threads were waiting, they can all wake up and compete for the resource for which they were waiting.
- wait/synch/mutex

A mutual exclusion object used to permit access to a resource (such as a section of executable code) while preventing other threads from accessing the resource.
- wait/synch/prlock

A priority rwlock lock object.
- wait/synch/rwlock

A plain read/write lock object used to lock a specific variable for access while preventing its use by other threads. A shared read lock can be acquired simultaneously by multiple threads. An exclusive write lock can be acquired by only one thread at a time.
- wait/synch/sxlock

A shared-exclusive (SX) lock is a type of rwlock lock object that provides write access to a common resource while permitting inconsistent reads by other threads. sxlocks optimize concurrency and improve scalability for read-write workloads.

\subsection*{29.7 Performance Schema Status Monitoring}

There are several status variables associated with the Performance Schema:
```
mysql> SHOW STATUS LIKE 'perf%';
+------------------------------------------------+-------+
| Variable_name | Value |
+-------------------------------------------------+-------+
| Performance_schema_accounts_lost | 0
| Performance_schema_cond_classes_lost | 0
| Performance_schema_cond_instances_lost |0
| Performance_schema_digest_lost | 0
| Performance_schema_file_classes_lost | 0
| Performance_schema_file_handles_lost |0
| Performance_schema_file_instances_lost | 0
| Performance_schema_hosts_lost | 0
| Performance_schema_locker_lost | 0
| Performance_schema_memory_classes_lost | 0
| Performance_schema_metadata_lock_lost | 0
| Performance_schema_mutex_classes_lost | 0
| Performance_schema_mutex_instances_lost | 0
| Performance_schema_nested_statement_lost | 0
| Performance_schema_program_lost |0
| Performance_schema_rwlock_classes_lost | 0
| Performance_schema_rwlock_instances_lost | 0
| Performance_schema_session_connect_attrs_lost | 0
| Performance_schema_socket_classes_lost |0
| Performance_schema_socket_instances_lost | 0
| Performance_schema_stage_classes_lost |0
| Performance_schema_statement_classes_lost | 0
| Performance_schema_table_handles_lost |0
| Performance_schema_table_instances_lost | 0
| Performance_schema_thread_classes_lost | 0
| Performance_schema_thread_instances_lost | 0
| Performance_schema_users_lost | 0
```


The Performance Schema status variables provide information about instrumentation that could not be loaded or created due to memory constraints. Names for these variables have several forms:
- Performance_schema_xxx_classes_lost indicates how many instruments of type $x x x$ could not be loaded.
- Performance_schema_xxx_instances_lost indicates how many instances of object type $x x x$ could not be created.
- Performance_schema_xxx_handles_lost indicates how many instances of object type $x x x$ could not be opened.
- Performance_schema_locker_lost indicates how many events are "lost" or not recorded.

For example, if a mutex is instrumented in the server source but the server cannot allocate memory for the instrumentation at runtime, it increments Performance_schema_mutex_classes_lost.

The mutex still functions as a synchronization object (that is, the server continues to function normally), but performance data for it is not collected. If the instrument can be allocated, it can be used for initializing instrumented mutex instances. For a singleton mutex such as a global mutex, there is only one instance. Other mutexes have an instance per connection, or per page in various caches and data buffers, so the number of instances varies over time. Increasing the maximum number of connections or the maximum size of some buffers increases the maximum number of instances that might be allocated at once. If the server cannot create a given instrumented mutex instance, it increments Performance_schema_mutex_instances_lost.

Suppose that the following conditions hold:
- The server was started with the --performance_schema_max_mutex_classes=200 option and thus has room for 200 mutex instruments.
- 150 mutex instruments have been loaded already.
- The plugin named plugin_a contains 40 mutex instruments.
- The plugin named plugin_b contains 20 mutex instruments.

The server allocates mutex instruments for the plugins depending on how many they need and how many are available, as illustrated by the following sequence of statements:

INSTALL PLUGIN plugin_a
The server now has 150+40= 190 mutex instruments.
UNINSTALL PLUGIN plugin_a;
The server still has 190 instruments. All the historical data generated by the plugin code is still available, but new events for the instruments are not collected.

INSTALL PLUGIN plugin_a;
The server detects that the 40 instruments are already defined, so no new instruments are created, and previously assigned internal memory buffers are reused. The server still has 190 instruments.

INSTALL PLUGIN plugin_b;
The server has room for 200-190 = 10 instruments (in this case, mutex classes), and sees that the plugin contains 20 new instruments. 10 instruments are loaded, and 10 are discarded or "lost." The Performance_schema_mutex_classes_lost indicates the number of instruments (mutex classes) lost:
```
mysql> SHOW STATUS LIKE "perf%mutex_classes_lost";
+-----------------------------------------+------+
| Variable_name | Value |
+-----------------------------------------+-------+
| Performance_schema_mutex_classes_lost | 10 |
+-----------------------------------------+------+
1 row in set (0.10 sec)
```


The instrumentation still works and collects (partial) data for plugin_b.
When the server cannot create a mutex instrument, these results occur:
- No row for the instrument is inserted into the setup_instruments table.
- Performance_schema_mutex_classes_lost increases by 1 .
- Performance_schema_mutex_instances_lost does not change. (When the mutex instrument is not created, it cannot be used to create instrumented mutex instances later.)

The pattern just described applies to all types of instruments, not just mutexes.
A value of Performance_schema_mutex_classes_lost greater than 0 can happen in two cases:
- To save a few bytes of memory, you start the server with - -
performance_schema_max_mutex_classes= $N$, where $N$ is less than the default value. The default value is chosen to be sufficient to load all the plugins provided in the MySQL distribution, but this can be reduced if some plugins are never loaded. For example, you might choose not to load some of the storage engines in the distribution.
- You load a third-party plugin that is instrumented for the Performance Schema but do not allow for the plugin's instrumentation memory requirements when you start the server. Because it comes from a third party, the instrument memory consumption of this engine is not accounted for in the default value chosen for performance_schema_max_mutex_classes.

If the server has insufficient resources for the plugin's instruments and you do not explicitly allocate more using --performance_schema_max_mutex_classes= $N$, loading the plugin leads to starvation of instruments.

If the value chosen for performance_schema_max_mutex_classes is too small, no error is reported in the error log and there is no failure at runtime. However, the content of the tables in the performance_schema database misses events. The Performance_schema_mutex_classes_lost status variable is the only visible sign to indicate that some events were dropped internally due to failure to create instruments.

If an instrument is not lost, it is known to the Performance Schema, and is used when instrumenting instances. For example, wait/synch/mutex/sql/LOCK_delete is the name of a mutex instrument in the setup_instruments table. This single instrument is used when creating a mutex in the code (in THD: : LOCK_delete) however many instances of the mutex are needed as the server runs. In this case, LOCK_delete is a mutex that is per connection (THD), so if a server has 1000 connections, there are 1000 threads, and 1000 instrumented LOCK_delete mutex instances (THD: : LOCK_delete).

If the server does not have room for all these 1000 instrumented mutexes (instances), some mutexes are created with instrumentation, and some are created without instrumentation. If the server can create only 800 instances, 200 instances are lost. The server continues to run, but increments Performance_schema_mutex_instances_lost by 200 to indicate that instances could not be created.

A value of Performance_schema_mutex_instances_lost greater than 0 can happen when the code initializes more mutexes at runtime than were allocated for - performance_schema_max_mutex_instances=N.

The bottom line is that if SHOW STATUS LIKE 'perf\%' says that nothing was lost (all values are zero), the Performance Schema data is accurate and can be relied upon. If something was lost, the data is incomplete, and the Performance Schema could not record everything given the insufficient amount of memory it was given to use. In this case, the specific Performance_schema_xxx_lost variable indicates the problem area.

It might be appropriate in some cases to cause deliberate instrument starvation. For example, if you do not care about performance data for file I/O, you can start the server with all Performance Schema parameters related to file I/O set to 0 . No memory is allocated for file-related classes, instances, or handles, and all file events are lost.

Use SHOW ENGINE PERFORMANCE_SCHEMA STATUS to inspect the internal operation of the Performance Schema code:
```
mysql> SHOW ENGINE PERFORMANCE_SCHEMA STATUS\G
...
************************* 3. row ******************************************
    Type: performance_schema
    Name: events_waits_history.size
Status: 76
************************* 4. rOW ******************************************
    Type: performance_schema
    Name: events_waits_history.count
```

```
Status: 10000
************************* 5. rOW ******************************************
    Type: performance_schema
    Name: events_waits_history.memory
Status: 760000
...
************************* 57. row *****************************************
    Type: performance_schema
    Name: performance_schema.memory
Status: 26459600
...
```


This statement is intended to help the DBA understand the effects that different Performance Schema options have on memory requirements. For a description of the field meanings, see Section 15.7.7.16, "SHOW ENGINE Statement".

\subsection*{29.8 Performance Schema Atom and Molecule Events}

For a table I/O event, there are usually two rows in events_waits_current, not one. For example, a row fetch might result in rows like this:
```
ROW# EVENT_NAME TIMER_START TIMER_END
---- ---------- ----------- ---------
    1 wait/io/file/myisam/dfile 10001 10002
    2 wait/io/table/sql/handler 10000 NULL
```


The row fetch causes a file read. In the example, the table I/O fetch event started before the file I/O event but has not finished (its TIMER_END value is NULL). The file I/O event is "nested" within the table I/O event.

This occurs because, unlike other "atomic" wait events such as for mutexes or file I/O, table I/O events are "molecular" and include (overlap with) other events. In events_waits_current, the table I/O event usually has two rows:
- One row for the most recent table I/O wait event
- One row for the most recent wait event of any kind

Usually, but not always, the "of any kind" wait event differs from the table I/O event. As each subsidiary event completes, it disappears from events_waits_current. At this point, and until the next subsidiary event begins, the table I/O wait is also the most recent wait of any kind.

\subsection*{29.9 Performance Schema Tables for Current and Historical Events}

For wait, stage, statement, and transaction events, the Performance Schema can monitor and store current events. In addition, when events end, the Performance Schema can store them in history tables. For each event type, the Performance Schema uses three tables for storing current and historical events. The tables have names of the following forms, where $x x x$ indicates the event type (waits, stages, statements, transactions):
- events_xxx_current: The "current events" table stores the current monitored event for each thread (one row per thread).
- events_xxx_history: The "recent history" table stores the most recent events that have ended per thread (up to a maximum number of rows per thread).
- events_xxx_history_long: The "long history" table stores the most recent events that have ended globally (across all threads, up to a maximum number of rows per table).

The _current table for each event type contains one row per thread, so there is no system variable for configuring its maximum size. The Performance Schema autosizes the history tables, or the sizes
can be configured explicitly at server startup using table-specific system variables, as indicated in the sections that describe the individual history tables. Typical autosized values are 10 rows per thread for _history tables, and 10,000 rows total for _history_long tables.

For each event type, the _current, _history, and _history_long tables have the same columns. The _current and _history tables have the same indexing. The _history_long table has no indexing.

The _current tables show what is currently happening within the server. When a current event ends, it is removed from its _current table.

The _history and _history_long tables show what has happened in the recent past. When the history tables become full, old events are discarded as new events are added. Rows expire from the _history and _history_long tables in different ways because the tables serve different purposes:
- _history is meant to investigate individual threads, independently of the global server load.
- _history_long is meant to investigate the server globally, not each thread.

The difference between the two types of history tables relates to the data retention policy. Both tables contains the same data when an event is first seen. However, data within each table expires differently over time, so that data might be preserved for a longer or shorter time in each table:
- For _history, when the table contains the maximum number of rows for a given thread, the oldest thread row is discarded when a new row for that thread is added.
- For _history_long, when the table becomes full, the oldest row is discarded when a new row is added, regardless of which thread generated either row.

When a thread ends, all its rows are discarded from the _history table but not from the _history_long table.

The following example illustrates the differences in how events are added to and discarded from the two types of history tables. The principles apply equally to all event types. The example is based on these assumptions:
- The Performance Schema is configured to retain 10 rows per thread in the _history table and 10,000 rows total in the _history_long table.
- Thread A generates 1 event per second.

Thread B generates 100 events per second.
- No other threads are running.

After 5 seconds of execution:
- A and B have generated 5 and 500 events, respectively.
- _history contains 5 rows for A and 10 rows for B . Because storage per thread is limited to 10 rows, no rows have been discarded for $A$, whereas 490 rows have been discarded for $B$.
- _history_long contains 5 rows for A and 500 rows for B . Because the table has a maximum size of 10,000 rows, no rows have been discarded for either thread.

After 5 minutes ( 300 seconds) of execution:
- A and B have generated 300 and 30,000 events, respectively.
- _history contains 10 rows for A and 10 rows for B. Because storage per thread is limited to 10 rows, 290 rows have been discarded for A, whereas 29,990 rows have been discarded for B. Rows for A include data up to 10 seconds old, whereas rows for B include data up to only .1 seconds old.
- _history_long contains 10,000 rows. Because A and B together generate 101 events per second, the table contains data up to approximately $10,000 / 101=99$ seconds old, with a mix of rows approximately 100 to 1 from B as opposed to A .

\subsection*{29.10 Performance Schema Statement Digests and Sampling}

The MySQL server is capable of maintaining statement digest information. The digesting process converts each SQL statement to normalized form (the statement digest) and computes a SHA-256 hash value (the digest hash value) from the normalized result. Normalization permits statements that are similar to be grouped and summarized to expose information about the types of statements the server is executing and how often they occur. For each digest, a representative statement that produces the digest is stored as a sample. This section describes how statement digesting and sampling occur and how they can be useful.

Digesting occurs in the parser regardless of whether the Performance Schema is available, so that other features such as MySQL Enterprise Firewall and query rewrite plugins have access to statement digests.
- Statement Digest General Concepts
- Statement Digests in the Performance Schema
- Statement Digest Memory Use
- Statement Sampling

\section*{Statement Digest General Concepts}

When the parser receives an SQL statement, it computes a statement digest if that digest is needed, which is true if any of the following conditions are true:
- Performance Schema digest instrumentation is enabled
- MySQL Enterprise Firewall is enabled
- A query rewrite plugin is enabled

The parser is also used by the STATEMENT_DIGEST_TEXT( ) and STATEMENT_DIGEST( ) functions, which applications can call to compute a normalized statement digest and a digest hash value, respectively, from an SQL statement.

The max_digest_length system variable value determines the maximum number of bytes available per session for computation of normalized statement digests. Once that amount of space is used during digest computation, truncation occurs: no further tokens from a parsed statement are collected or figure into its digest value. Statements that differ only after that many bytes of parsed tokens produce the same normalized statement digest and are considered identical if compared or if aggregated for digest statistics.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4803.jpg?height=188&width=291&top_left_y=2193&top_left_x=351)

\section*{Warning}

Setting the max_digest_length system variable to zero disables digest production, which also disables server functionality that requires digests.

After the normalized statement has been computed, a SHA-256 hash value is computed from it. In addition:
- If MySQL Enterprise Firewall is enabled, it is called and the digest as computed is available to it.
- If any query rewrite plugin is enabled, it is called and the statement digest and digest value are available to it.

\section*{Statement Digests in the Performance Schema}
- If the Performance Schema has digest instrumentation enabled, it makes a copy of the normalized statement digest, allocating a maximum of performance_schema_max_digest_length bytes for it. Consequently, if performance_schema_max_digest_length is less than max_digest_length, the copy is truncated relative to the original. The copy of the normalized statement digest is stored in the appropriate Performance Schema tables, along with the SHA-256 hash value computed from the original normalized statement. (If the Performance Schema truncates its copy of the normalized statement digest relative to the original, it does not recompute the SHA-256 hash value.)

Statement normalization transforms the statement text to a more standardized digest string representation that preserves the general statement structure while removing information not essential to the structure:
- Object identifiers such as database and table names are preserved.
- Literal values are converted to parameter markers. A normalized statement does not retain information such as names, passwords, dates, and so forth.
- Comments are removed and whitespace is adjusted.

Consider these statements:
```
SELECT * FROM orders WHERE customer_id=10 AND quantity>20
SELECT * FROM orders WHERE customer_id = 20 AND quantity > 100
```


To normalize these statements, the parser replaces data values by ? and adjusts whitespace. Both statements yield the same normalized form and thus are considered "the same":
```
SELECT * FROM orders WHERE customer_id = ? AND quantity > ?
```


The normalized statement contains less information but is still representative of the original statement. Other similar statements that have different data values have the same normalized form.

Now consider these statements:
```
SELECT * FROM customers WHERE customer_id = 1000
SELECT * FROM orders WHERE customer_id = 1000
```


In this case, the normalized statements differ because the object identifiers differ:
```
SELECT * FROM customers WHERE customer_id = ?
SELECT * FROM orders WHERE customer_id = ?
```


If normalization produces a statement that exceeds the space available in the digest buffer (as determined by max_digest_length), truncation occurs and the text ends with "...". Long normalized statements that differ only in the part that occurs following the "..." are considered the same. Consider these statements:
```
SELECT * FROM mytable WHERE cola = 10 AND colb = 20
SELECT * FROM mytable WHERE cola = 10 AND colc = 20
```


If the cutoff happens to be right after the AND, both statements have this normalized form:
```
SELECT * FROM mytable WHERE cola = ? AND ...
```


In this case, the difference in the second column name is lost and both statements are considered the same.

\section*{Statement Digests in the Performance Schema}

In the Performance Schema, statement digesting involves these elements:
- A statements_digest consumer in the setup_consumers table controls whether the Performance Schema maintains digest information. See Statement Digest Consumer.
- The statement event tables (events_statements_current, events_statements_history, and events_statements_history_long) have columns for storing normalized statement digests and the corresponding digest SHA-256 hash values:
- DIGEST_TEXT is the text of the normalized statement digest. This is a copy of the original normalized statement that was computed to a maximum of max_digest_length bytes, further truncated as necessary to performance_schema_max_digest_length bytes.
- DIGEST is the digest SHA-256 hash value computed from the original normalized statement.

See Section 29.12.6, "Performance Schema Statement Event Tables".
- The events_statements_summary_by_digest summary table provides aggregated statement digest information. This table aggregates information for statements per SCHEMA_NAME and DIGEST combination. The Performance Schema uses SHA-256 hash values for aggregation because they are fast to compute and have a favorable statistical distribution that minimizes collisions. See Section 29.12.20.3, "Statement Summary Tables".

Some Performance Tables have a column that stores original SQL statements from which digests are computed:
- The SQL_TEXT column of the events_statements_current, events_statements_history, and events_statements_history_long statement event tables.
- The QUERY_SAMPLE_TEXT column of the events_statements_summary_by_digest summary table.

The maximum space available for statement display is 1024 bytes by default. To change this value, set the performance_schema_max_sql_text_length system variable at server startup. Changes affect the storage required for all the columns just named.

The performance_schema_max_digest_length system variable determines the maximum number of bytes available per statement for digest value storage in the Performance Schema. However, the display length of statement digests may be longer than the available buffer size due to internal encoding of statement elements such as keywords and literal values. Consequently, values selected from the DIGEST_TEXT column of statement event tables may appear to exceed the performance_schema_max_digest_length value.

The events_statements_summary_by_digest summary table provides a profile of the statements executed by the server. It shows what kinds of statements an application is executing and how often. An application developer can use this information together with other information in the table to assess the application's performance characteristics. For example, table columns that show wait times, lock times, or index use may highlight types of queries that are inefficient. This gives the developer insight into which parts of the application need attention.

The events_statements_summary_by_digest summary table has a fixed size. By default the Performance Schema estimates the size to use at startup. To specify the table size explicitly, set the performance_schema_digests_size system variable at server startup. If the table becomes full, the Performance Schema groups statements that have SCHEMA_NAME and DIGEST values not matching existing values in the table in a special row with SCHEMA_NAME and DIGEST set to NULL. This permits all statements to be counted. However, if the special row accounts for a significant percentage of the statements executed, it might be desirable to increase the summary table size by increasing performance_schema_digests_size.

\section*{Statement Digest Memory Use}

For applications that generate very long statements that differ only at the end, increasing max_digest_length enables computation of digests that distinguish statements that would otherwise aggregate to the same digest. Conversely, decreasing max_digest_length causes the server to devote less memory to digest storage but increases the likelihood of longer statements aggregating to the same digest. Administrators should keep in mind that larger values result in
correspondingly increased memory requirements, particularly for workloads that involve large numbers of simultaneous sessions (the server allocates max_digest_length bytes per session).

As described previously, normalized statement digests as computed by the parser are constrained to a maximum of max_digest_length bytes, whereas normalized statement digests stored in the Performance Schema use performance_schema_max_digest_length bytes. The following memory-use considerations apply regarding the relative values of max_digest_length and performance_schema_max_digest_length:
- If max_digest_length is less than performance_schema_max_digest_length:
- Server features other than the Performance Schema use normalized statement digests that take up to max_digest_length bytes.
- The Performance Schema does not further truncate normalized statement digests that it stores, but allocates more memory than max_digest_length bytes per digest, which is unnecessary.
- If max_digest_length equals performance_schema_max_digest_length:
- Server features other than the Performance Schema use normalized statement digests that take up to max_digest_length bytes.
- The Performance Schema does not further truncate normalized statement digests that it stores, and allocates the same amount of memory as max_digest_length bytes per digest.
- If max_digest_length is greater than performance_schema_max_digest_length:
- Server features other than the Performance Schema use normalized statement digests that take up to max_digest_length bytes.
- The Performance Schema further truncates normalized statement digests that it stores, and allocates less memory than max_digest_length bytes per digest.

Because the Performance Schema statement event tables might store many digests, setting performance_schema_max_digest_length smaller than max_digest_length enables administrators to balance these factors:
- The need to have long normalized statement digests available to server features outside the Performance Schema
- Many concurrent sessions, each of which allocates digest-computation memory
- The need to limit memory consumption by the Performance Schema statement event tables when storing many statement digests

The performance_schema_max_digest_length setting is not per session, it is per statement, and a session can store multiple statements in the events_statements_history table. A typical number of statements in this table is 10 per session, so each session consumes 10 times the memory indicated by the performance_schema_max_digest_length value, for this table alone.

Also, there are many statements (and digests) collected globally, most notably in the events_statements_history_long table. Here, too, $N$ statements stored consumes $N$ times the memory indicated by the performance_schema_max_digest_length value.

To assess the amount of memory used for SQL statement storage and digest computation, use the SHOW ENGINE PERFORMANCE_SCHEMA STATUS statement, or monitor these instruments:
```
mysql> SELECT NAME
    FROM performance_schema.setup_instruments
    WHERE NAME LIKE '%.sqltext';
+------------------------------------------------------------------
| NAME
+------ |
| memory/performance_schema/events_statements_history.sqltext
```

```
memory/performance_schema/events_statements_current.sqltext |
memory/performance_schema/events_statements_history_long.sqltext |
mysql> SELECT NAME
        FROM performance_schema.setup_instruments
        WHERE NAME LIKE 'memory/performance_schema/%.tokens';
+--------------------------------------------------------------------------
    NAME
+--------------------------------------------------------------------------
    memory/performance_schema/events_statements_history.tokens
    memory/performance_schema/events_statements_current.tokens
    memory/performance_schema/events_statements_summary_by_digest.tokens
    memory/performance_schema/events_statements_history_long.tokens
+------------------------------------------------------------------------
```


\section*{Statement Sampling}

The Performance Schema uses statement sampling to collect representative statements that produce each digest value in the events_statements_summary_by_digest table. These columns store sample statement information: QUERY_SAMPLE_TEXT (the text of the statement), QUERY_SAMPLE_SEEN (when the statement was seen), and QUERY_SAMPLE_TIMER_WAIT (the statement wait or execution time). The Performance Schema updates all three columns each time it chooses a sample statement.

When a new table row is inserted, the statement that produced the row digest value is stored as the current sample statement associated with the digest. Thereafter, when the server sees other statements with the same digest value, it determines whether to use the new statement to replace the current sample statement (that is, whether to resample). Resampling policy is based on the comparative wait times of the current sample statement and new statement and, optionally, the age of the current sample statement:
- Resampling based on wait times: If the new statement wait time has a wait time greater than that of the current sample statement, it becomes the current sample statement.
- Resampling based on age: If the performance_schema_max_digest_sample_age system variable has a value greater than zero and the current sample statement is more than that many seconds old, the current statement is considered "too old" and the new statement replaces it. This occurs even if the new statement wait time is less than that of the current sample statement.

By default, performance_schema_max_digest_sample_age is 60 seconds ( 1 minute). To change how quickly sample statements "expire" due to age, increase or decrease the value. To disable the age-based part of the resampling policy, set performance_schema_max_digest_sample_age to 0 .

\subsection*{29.11 Performance Schema General Table Characteristics}

The name of the performance_schema database is lowercase, as are the names of tables within it. Queries should specify the names in lowercase.

Many tables in the performance_schema database are read only and cannot be modified:
```
mysql> TRUNCATE TABLE performance_schema.setup_instruments;
ERROR 1683 (HY000): Invalid performance_schema usage.
```


Some of the setup tables have columns that can be modified to affect Performance Schema operation; some also permit rows to be inserted or deleted. Truncation is permitted to clear collected events, so TRUNCATE TABLE can be used on tables containing those kinds of information, such as tables named with a prefix of events_waits_.

Summary tables can be truncated with TRUNCATE TABLE. Generally, the effect is to reset the summary columns to 0 or NULL, not to remove rows. This enables you to clear collected values and restart aggregation. That might be useful, for example, after you have made a runtime configuration change. Exceptions to this truncation behavior are noted in individual summary table sections.

Privileges are as for other databases and tables:
- To retrieve from performance_schema tables, you must have the SELECT privilege.
- To change those columns that can be modified, you must have the UPDATE privilege.
- To truncate tables that can be truncated, you must have the DROP privilege.

Because only a limited set of privileges apply to Performance Schema tables, attempts to use GRANT ALL as shorthand for granting privileges at the database or table level fail with an error:
```
mysql> GRANT ALL ON performance_schema.*
    TO 'u1'@'localhost';
ERROR 1044 (42000): Access denied for user 'root'@'localhost'
to database 'performance_schema'
mysql> GRANT ALL ON performance_schema.setup_instruments
    TO 'u2'@'localhost';
ERROR 1044 (42000): Access denied for user 'root'@'localhost'
to database 'performance_schema'
```


Instead, grant exactly the desired privileges:
```
mysql> GRANT SELECT ON performance_schema.*
    TO 'u1'@'localhost';
Query OK, 0 rows affected (0.03 sec)
mysql> GRANT SELECT, UPDATE ON performance_schema.setup_instruments
    TO 'u2'@'localhost';
Query OK, 0 rows affected (0.02 sec)
```


\subsection*{29.12 Performance Schema Table Descriptions}

Tables in the performance_schema database can be grouped as follows:
- Setup tables. These tables are used to configure and display monitoring characteristics.
- Current events tables. The events_waits_current table contains the most recent event for each thread. Other similar tables contain current events at different levels of the event hierarchy: events_stages_current for stage events, events_statements_current for statement events, and events_transactions_current for transaction events.
- History tables. These tables have the same structure as the current events tables, but contain more rows. For example, for wait events, events_waits_history table contains the most recent 10 events per thread. events_waits_history_long contains the most recent 10,000 events. Other similar tables exist for stage, statement, and transaction histories.

To change the sizes of the history tables, set the appropriate system variables at server startup. For example, to set the sizes of the wait event history tables, set performance_schema_events_waits_history_size and performance_schema_events_waits_history_long_size.
- Summary tables. These tables contain information aggregated over groups of events, including those that have been discarded from the history tables.
- Instance tables. These tables document what types of objects are instrumented. An instrumented object, when used by the server, produces an event. These tables provide event names and explanatory notes or status information.
- Miscellaneous tables. These do not fall into any of the other table groups.

\subsection*{29.12.1 Performance Schema Table Reference}

The following table summarizes all available Performance Schema tables. For greater detail, see the individual table descriptions.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 29.1 Performance Schema Tables}
\begin{tabular}{|l|l|}
\hline Table Name & Description \\
\hline accounts & Connection statistics per client account \\
\hline binary_log_transaction_compression_sta & Binary log transaction compression \\
\hline clone_progress & Clone operation progress \\
\hline clone_status & Clone operation status \\
\hline component_scheduler_tasks & Status of scheduled tasks \\
\hline cond_instances & Synchronization object instances \\
\hline data_lock_waits & Data lock wait relationships \\
\hline data_locks & Data locks held and requested \\
\hline error_log & Server error log recent entries \\
\hline events_errors_summary_by_account_by_er & Eœnors per account and error code \\
\hline events_errors_summary_by_host_by_error & Errors per host and error code \\
\hline events_errors_summary_by_thread_by_err & Errors per thread and error code \\
\hline events_errors_summary_by_user_by_error & Errors per user and error code \\
\hline events_errors_summary_global_by_error & Errors per error code \\
\hline events_stages_current & Current stage events \\
\hline events_stages_history & Most recent stage events per thread \\
\hline events_stages_history_long & Most recent stage events overall \\
\hline events_stages_summary_by_account_by_ev & Stagenevænts per account and event name \\
\hline events_stages_summary_by_host_by_event & Stageeevents per host name and event name \\
\hline events_stages_summary_by_thread_by_eve & Stagewvaits per thread and event name \\
\hline events_stages_summary_by_user_by_event & Stagreevents per user name and event name \\
\hline events_stages_summary_global_by_event & Stage waits per event name \\
\hline events_statements_current & Current statement events \\
\hline events_statements_histogram_by_digest & Statement histograms per schema and digest value \\
\hline events_statements_histogram_global & Statement histogram summarized globally \\
\hline events_statements_history & Most recent statement events per thread \\
\hline events_statements_history_long & Most recent statement events overall \\
\hline events_statements_summary_by_account_b & Statement eacets per account and event name \\
\hline events_statements_summary_by_digest & Statement events per schema and digest value \\
\hline events_statements_summary_by_host_by_e & Statementlevents per host name and event name \\
\hline events_statements_summary_by_program & Statement events per stored program \\
\hline events_statements_summary_by_thread_by & Statementa events per thread and event name \\
\hline events_statements_summary_by_user_by_e & Statememthevents per user name and event name \\
\hline events_statements_summary_global_by_ev & Statemœme events per event name \\
\hline events_transactions_current & Current transaction events \\
\hline events_transactions_history & Most recent transaction events per thread \\
\hline events_transactions_history_long & Most recent transaction events overall \\
\hline events_transactions_summary_by_account & Thansaction evemts per account and event name \\
\hline
\end{tabular}
\end{table}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Performance Schema Table Reference}
\begin{tabular}{|l|l|}
\hline Table Name & Description \\
\hline events_transactions_summary_by_host_by & Tearsactionarents per host name and event name \\
\hline events_transactions_summary_by_thread_ & Tyarsæction evrats per thread and event name \\
\hline events_transactions_summary_by_user_by & Tearsactionareents per user name and event name \\
\hline events_transactions_summary_global_by_ & ©ranstactiomevents per event name \\
\hline events_waits_current & Current wait events \\
\hline events_waits_history & Most recent wait events per thread \\
\hline events_waits_history_long & Most recent wait events overall \\
\hline events_waits_summary_by_account_by_eve & Wtaithevents per account and event name \\
\hline events_waits_summary_by_host_by_event_ & Mqaiteevents per host name and event name \\
\hline events_waits_summary_by_instance & Wait events per instance \\
\hline events_waits_summary_by_thread_by_even & Waitevents per thread and event name \\
\hline events_waits_summary_by_user_by_event_ & Maaiteevents per user name and event name \\
\hline events_waits_summary_global_by_event_n & Wrat events per event name \\
\hline file_instances & File instances \\
\hline file_summary_by_event_name & File events per event name \\
\hline file_summary_by_instance & File events per file instance \\
\hline firewall_group_allowlist & Firewall in-memory data for group profile allowlists \\
\hline firewall_groups & Firewall in-memory data for group profiles \\
\hline firewall_membership & Firewall in-memory data for group profile members \\
\hline global_status & Global status variables \\
\hline global_variables & Global system variables \\
\hline host_cache & Information from internal host cache \\
\hline hosts & Connection statistics per client host name \\
\hline keyring_component_status & Status information for installed keyring component \\
\hline keyring_keys & Metadata for keyring keys \\
\hline log_status & Information about server logs for backup purposes \\
\hline memory_summary_by_account_by_event_nam & Memory operations per account and event name \\
\hline memory_summary_by_host_by_event_name & Memory operations per host and event name \\
\hline memory_summary_by_thread_by_event_name & Memory operations per thread and event name \\
\hline memory_summary_by_user_by_event_name & Memory operations per user and event name \\
\hline memory_summary_global_by_event_name & Memory operations globally per event name \\
\hline metadata_locks & Metadata locks and lock requests \\
\hline mutex_instances & Mutex synchronization object instances \\
\hline ndb_sync_excluded_objects & NDB objects which cannot be synchronized \\
\hline ndb_sync_pending_objects & NDB objects waiting for synchronization \\
\hline objects_summary_global_by_type & Object summaries \\
\hline performance_timers & Which event timers are available \\
\hline persisted_variables & Contents of mysqld-auto.cnf file \\
\hline prepared_statements_instances & Prepared statement instances and statistics \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Table Name & Description \\
\hline processlist & Process list information \\
\hline replication_applier_configuration & Configuration parameters for replication applier on replica \\
\hline replication_applier_filters & Channel-specific replication filters on current replica \\
\hline replication_applier_global_filters & Global replication filters on current replica \\
\hline replication_applier_status & Current status of replication applier on replica \\
\hline replication_applier_status_by_coordina & SQL or coordinator thread applier status \\
\hline replication_applier_status_by_worker & Worker thread applier status \\
\hline replication_asynchronous_connection_fa & Sbarcerlists for asynchronous connection failover mechanism \\
\hline replication_asynchronous_connection_fa & Managednsourçetilsts for asynchronous connection failover mechanism \\
\hline replication_connection_configuration & Configuration parameters for connecting to source \\
\hline replication_connection_status & Current status of connection to source \\
\hline replication_group_communication_inform & Repication group configuration options \\
\hline replication_group_configuration_versid & Nersion of the member actions configuration for replication group members \\
\hline replication_group_member_actions & Member actions that are included in the member actions configuration for replication group members \\
\hline replication_group_member_stats & Replication group member statistics \\
\hline replication_group_members & Replication group member network and status \\
\hline rwlock_instances & Lock synchronization object instances \\
\hline session_account_connect_attrs & Connection attributes per for current session \\
\hline session_connect_attrs & Connection attributes for all sessions \\
\hline session_status & Status variables for current session \\
\hline session_variables & System variables for current session \\
\hline setup_actors & How to initialize monitoring for new foreground threads \\
\hline setup_consumers & Consumers for which event information can be stored \\
\hline setup_instruments & Classes of instrumented objects for which events can be collected \\
\hline setup_objects & Which objects should be monitored \\
\hline setup_threads & Instrumented thread names and attributes \\
\hline socket_instances & Active connection instances \\
\hline socket_summary_by_event_name & Socket waits and I/O per event name \\
\hline socket_summary_by_instance & Socket waits and I/O per instance \\
\hline status_by_account & Session status variables per account \\
\hline status_by_host & Session status variables per host name \\
\hline status_by_thread & Session status variables per session \\
\hline status_by_user & Session status variables per user name \\
\hline table_handles & Table locks and lock requests \\
\hline
\end{tabular}

Performance Schema Setup Tables

\begin{tabular}{|l|l|}
\hline Table Name & Description \\
\hline table_io_waits_summary_by_index_usage & Table I/O waits per index \\
\hline table_io_waits_summary_by_table & Table I/O waits per table \\
\hline table_lock_waits_summary_by_table & Table lock waits per table \\
\hline threads & Information about server threads \\
\hline tls_channel_status & TLS status for each connection interface \\
\hline tp_thread_group_state & Thread pool thread group states \\
\hline tp_thread_group_stats & Thread pool thread group statistics \\
\hline tp_thread_state & Thread pool thread information \\
\hline user_defined_functions & Registered loadable functions \\
\hline user_variables_by_thread & User-defined variables per thread \\
\hline users & Connection statistics per client user name \\
\hline variables_by_thread & Session system variables per session \\
\hline variables_info & How system variables were most recently set \\
\hline
\end{tabular}

\subsection*{29.12.2 Performance Schema Setup Tables}

The setup tables provide information about the current instrumentation and enable the monitoring configuration to be changed. For this reason, some columns in these tables can be changed if you have the UPDATE privilege.

The use of tables rather than individual variables for setup information provides a high degree of flexibility in modifying Performance Schema configuration. For example, you can use a single statement with standard SQL syntax to make multiple simultaneous configuration changes.

These setup tables are available:
- setup_actors: How to initialize monitoring for new foreground threads
- setup_consumers: The destinations to which event information can be sent and stored
- setup_instruments: The classes of instrumented objects for which events can be collected
- setup_objects: Which objects should be monitored
- setup_threads: Instrumented thread names and attributes

\subsection*{29.12.2.1 The setup_actors Table}

The setup_actors table contains information that determines whether to enable monitoring and historical event logging for new foreground server threads (threads associated with client connections). This table has a maximum size of 100 rows by default. To change the table size, modify the performance_schema_setup_actors_size system variable at server startup.

For each new foreground thread, the Performance Schema matches the user and host for the thread against the rows of the setup_actors table. If a row from that table matches, its ENABLED and HISTORY column values are used to set the INSTRUMENTED and HISTORY columns, respectively, of the threads table row for the thread. This enables instrumenting and historical event logging to be applied selectively per host, user, or account (user and host combination). If there is no match, the INSTRUMENTED and HISTORY columns for the thread are set to NO.

For background threads, there is no associated user. INSTRUMENTED and HISTORY are YES by default and setup_actors is not consulted.

The initial contents of the setup_actors table match any user and host combination, so monitoring and historical event collection are enabled by default for all foreground threads:
```
mysql> SELECT * FROM performance_schema.setup_actors;
+-------+------+-------+---------+---------+
| HOST | USER | ROLE | ENABLED | HISTORY |
+-------+------+-------+---------+---------+
| % | % | % | YES | YES |
+------+------+------+---------+--------+
```


For information about how to use the setup_actors table to affect event monitoring, see Section 29.4.6, "Pre-Filtering by Thread".

Modifications to the setup_actors table affect only foreground threads created subsequent to the modification, not existing threads. To affect existing threads, modify the INSTRUMENTED and HISTORY columns of threads table rows.

The setup_actors table has these columns:
- HOST

The host name. This should be a literal name, or '\%' to mean "any host."
- USER

The user name. This should be a literal name, or '\%' to mean "any user."
- ROLE

Unused.
- ENABLED

Whether to enable instrumentation for foreground threads matched by the row. The value is YES or NO.
- HISTORY

Whether to log historical events for foreground threads matched by the row. The value is YES or NO.
The setup_actors table has these indexes:
- Primary key on (HOST, USER, ROLE)

TRUNCATE TABLE is permitted for the setup_actors table. It removes the rows.

\subsection*{29.12.2.2 The setup_consumers Table}

The setup_consumers table lists the types of consumers for which event information can be stored and which are enabled:
```
mysql> SELECT * FROM performance_schema.setup_consumers;
+------------------------------------+---------+
| NAME | ENABLED |
+------------------------------------+---------+
| events_stages_current | NO
| events_stages_history | NO
| events_stages_history_long | NO
| events_statements_current | YES
| events_statements_history | YES
| events_statements_history_long | NO
| events_transactions_current | YES
| events_transactions_history | YES
| events_transactions_history_long | NO
| events_waits_current | NO
| events_waits_history | NO
| events_waits_history_long | NO
| global_instrumentation | YES
| thread_instrumentation | YES
| statements_digest | YES
+-----------------------------------+--------+
```


The consumer settings in the setup_consumers table form a hierarchy from higher levels to lower. For detailed information about the effect of enabling different consumers, see Section 29.4.7, "PreFiltering by Consumer".

Modifications to the setup_consumers table affect monitoring immediately.
The setup_consumers table has these columns:
- NAME

The consumer name.
- ENABLED

Whether the consumer is enabled. The value is YES or NO. This column can be modified. If you disable a consumer, the server does not spend time adding event information to it.

The setup_consumers table has these indexes:
- Primary key on (NAME)

TRUNCATE TABLE is not permitted for the setup_consumers table.

\subsection*{29.12.2.3 The setup_instruments Table}

The setup_instruments table lists classes of instrumented objects for which events can be collected:
```
mysql> SELECT * FROM performance_schema.setup_instruments\G
*************************** 1. rOW ***************************************
            NAME: wait/synch/mutex/pfs/LOCK_pfs_share_list
        ENABLED: NO
            TIMED: NO
    PROPERTIES: singleton
            FLAGS: NULL
    VOLATILITY: 1
DOCUMENTATION: Components can provide their own performance_schema tables.
This lock protects the list of such tables definitions.
...
************************* 410. row ****************************************
                NAME: stage/sql/executing
        ENABLED: NO
            TIMED: NO
    PROPERTIES:
            FLAGS: NULL
    VOLATILITY: 0
DOCUMENTATION: NULL
...
************************* 733. row ****************************************
                NAME: statement/abstract/Query
        ENABLED: YES
            TIMED: YES
    PROPERTIES: mutable
            FLAGS: NULL
    VOLATILITY: 0
DOCUMENTATION: SQL query just received from the network.
At this point, the real statement type is unknown, the type
will be refined after SQL parsing.
...
************************** 737. row ***************************************
            NAME: memory/performance_schema/mutex_instances
        ENABLED: YES
            TIMED: NULL
    PROPERTIES: global_statistics
            FLAGS:
    VOLATILITY: 1
DOCUMENTATION: Memory used for table performance_schema.mutex_instances
...
****************************************************************************
```

```
            NAME: memory/sql/Prepared_statement::infrastructure
        ENABLED: YES
            TIMED: NULL
    PROPERTIES: controlled_by_default
            FLAGS: controlled
    VOLATILITY: 0
DOCUMENTATION: Map infrastructure for prepared statements per session.
...
```


Each instrument added to the source code provides a row for the setup_instruments table, even when the instrumented code is not executed. When an instrument is enabled and executed, instrumented instances are created, which are visible in the xxx_instances tables, such as file_instances or rwlock_instances.

Modifications to most setup_instruments rows affect monitoring immediately. For some instruments, modifications are effective only at server startup; changing them at runtime has no effect. This affects primarily mutexes, conditions, and rwlocks in the server, although there may be other instruments for which this is true.

For more information about the role of the setup_instruments table in event filtering, see Section 29.4.3, "Event Pre-Filtering".

The setup_instruments table has these columns:
- NAME

The instrument name. Instrument names may have multiple parts and form a hierarchy, as discussed in Section 29.6, "Performance Schema Instrument Naming Conventions". Events produced from execution of an instrument have an EVENT_NAME value that is taken from the instrument NAME value. (Events do not really have a "name," but this provides a way to associate events with instruments.)
- ENABLED

Whether the instrument is enabled. The value is YES or NO. A disabled instrument produces no events. This column can be modified, although setting ENABLED has no effect for instruments that have already been created.
- TIMED

Whether the instrument is timed. The value is YES, NO, or NULL. This column can be modified, although setting TIMED has no effect for instruments that have already been created.

A TIMED value of NULL indicates that the instrument does not support timing. For example, memory operations are not timed, so their TIMED column is NULL.

Setting TIMED to NULL for an instrument that supports timing has no effect, as does setting TIMED to non-NULL for an instrument that does not support timing.

If an enabled instrument is not timed, the instrument code is enabled, but the timer is not. Events produced by the instrument have NULL for the TIMER_START, TIMER_END, and TIMER_WAIT timer values. This in turn causes those values to be ignored when calculating the sum, minimum, maximum, and average time values in summary tables.
- PROPERTIES

The instrument properties. This column uses the SET data type, so multiple flags from the following list can be set per instrument:
- controlled_by_default: memory is collected by default for this instrument.
- global_statistics: The instrument produces only global summaries. Summaries for finer levels are unavailable, such as per thread, account, user, or host. For example, most memory instruments produce only global summaries.
- mutable: The instrument can "mutate" into a more specific one. This property applies only to statement instruments.
- progress: The instrument is capable of reporting progress data. This property applies only to stage instruments.
- singleton: The instrument has a single instance. For example, most global mutex locks in the server are singletons, so the corresponding instruments are as well.
- user: The instrument is directly related to user workload (as opposed to system workload). One such instrument is wait/io/socket/sql/client_connection.
- FLAGS

Whether the instrument's memory is controlled.
This flag is supported for non-global memory instruments, only, and can be set or unset. For example:

SQL> UPDATE PERFORMANCE_SCHEMA.SETUP_INTRUMENTS SET FLAGS="controlled" WHERE NAME='memory/s

Note
Attempting to set FLAGS = controlled on non-memory instruments, or on global memory instruments, fails silently.
- VOLATILITY

The instrument volatility. Volatility values range from low to high. The values correspond to the PSI_VOLATILITY_xxx constants defined in the mysql/psi/psi_base.h header file:
```
#define PSI_VOLATILITY_UNKNOWN 0
#define PSI_VOLATILITY_PERMANENT 1
#define PSI_VOLATILITY_PROVISIONING 2
#define PSI_VOLATILITY_DDL 3
#define PSI_VOLATILITY_CACHE 4
#define PSI_VOLATILITY_SESSION 5
#define PSI_VOLATILITY_TRANSACTION 6
#define PSI_VOLATILITY_QUERY 7
#define PSI_VOLATILITY_INTRA_QUERY 8
```


The VOLATILITY column is purely informational, to provide users (and the Performance Schema code) some hint about the instrument runtime behavior.

Instruments with a low volatility index (PERMANENT $=1$ ) are created once at server startup, and never destroyed or re-created during normal server operation. They are destroyed only during server shutdown.

For example, the wait/synch/mutex/pfs/LOCK_pfs_share_list mutex is defined with a volatility of 1 , which means it is created once. Possible overhead from the instrumentation itself
(namely, mutex initialization) has no effect for this instrument then. Runtime overhead occurs only when locking or unlocking the mutex.

Instruments with a higher volatility index (for example, SESSION = 5) are created and destroyed for every user session. For example, the wait/synch/mutex/sql/THD: :LOCK_query_plan mutex is created each time a session connects, and destroyed when the session disconnects.

This mutex is more sensitive to Performance Schema overhead, because overhead comes not only from the lock and unlock instrumentation, but also from mutex create and destroy instrumentation, which is executed more often.

Another aspect of volatility concerns whether and when an update to the ENABLED column actually has some effect:
- An update to ENABLED affects instrumented objects created subsequently, but has no effect on instruments already created.
- Instruments that are more "volatile" use new settings from the setup_instruments table sooner.

For example, this statement does not affect the LOCK_query_plan mutex for existing sessions, but does have an effect on new sessions created subsequent to the update:
```
UPDATE performance_schema.setup_instruments
SET ENABLED=value
WHERE NAME = 'wait/synch/mutex/sql/THD::LOCK_query_plan';
```


This statement actually has no effect at all:
```
UPDATE performance_schema.setup_instruments
SET ENABLED=value
WHERE NAME = 'wait/synch/mutex/pfs/LOCK_pfs_share_list';
```


This mutex is permanent, and was created already before the update is executed. The mutex is never created again, so the ENABLED value in setup_instruments is never used. To enable or disable this mutex, use the mutex_instances table instead.

\section*{- DOCUMENTATION}

A string describing the instrument purpose. The value is NULL if no description is available.
The setup_instruments table has these indexes:
- Primary key on (NAME)

TRUNCATE TABLE is not permitted for the setup_instruments table.
To assist monitoring and troubleshooting, the Performance Schema instrumentation is used to export names of instrumented threads to the operating system. This enables utilities that display thread names, such as debuggers and the Unix ps command, to display distinct mysqld thread names rather than "mysqld". This feature is supported only on Linux, macOS, and Windows.

Suppose that mysqld is running on a system that has a version of ps that supports this invocation syntax:
```
ps -C mysqld H -o "pid tid cmd comm"
```


Without export of thread names to the operating system, the command displays output like this, where most COMMAND values are mysqld:

\begin{tabular}{|l|l|l|}
\hline PID & TID CMD & COMMAND \\
\hline 1377 & 1377 /usr/sbin/mysqld & mysqld \\
\hline 1377 & 1528 /usr/sbin/mysqld & mysqld \\
\hline 1377 & 1529 /usr/sbin/mysqld & mysqld \\
\hline 1377 & 1530 /usr/sbin/mysqld & mysqld \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline 1377 & 1531 /usr/sbin/mysqld & mysqld \\
\hline 1377 & 1534 /usr/sbin/mysqld & mysqld \\
\hline 1377 & 1535 /usr/sbin/mysqld & mysqld \\
\hline 1377 & 1588 /usr/sbin/mysqld & xpl_worker1 \\
\hline 1377 & 1589 /usr/sbin/mysqld & xpl_worker0 \\
\hline 1377 & 1590 /usr/sbin/mysqld & mysqld \\
\hline 1377 & 1594 /usr/sbin/mysqld & mysqld \\
\hline 1377 & 1595 /usr/sbin/mysqld & mysqld \\
\hline
\end{tabular}

With export of thread names to the operating system, the output looks like this, with threads having a name similar to their instrument name:

\begin{tabular}{|l|l|l|l|}
\hline PID & TID & CMD & COMMAND \\
\hline 27668 & 27668 & /usr/sbin/mysqld & mysqld \\
\hline 27668 & 27671 & /usr/sbin/mysqld & ib_io_ibuf \\
\hline 27668 & 27672 & /usr/sbin/mysqld & ib_io_log \\
\hline 27668 & 27673 & /usr/sbin/mysqld & ib_io_rd-1 \\
\hline 27668 & 27674 & /usr/sbin/mysqld & ib_io_rd-2 \\
\hline 27668 & 27677 & /usr/sbin/mysqld & ib_io_wr-1 \\
\hline 27668 & 27678 & /usr/sbin/mysqld & ib_io_wr-2 \\
\hline 27668 & 27699 & /usr/sbin/mysqld & xpl_worker-2 \\
\hline 27668 & 27700 & /usr/sbin/mysqld & xpl_accept-1 \\
\hline 27668 & 27710 & /usr/sbin/mysqld & evt_sched \\
\hline 27668 & 27711 & /usr/sbin/mysqld & sig_handler \\
\hline 27668 & 27933 & /usr/sbin/mysqld & connection \\
\hline
\end{tabular}

Different thread instances within the same class are numbered to provide distinct names where that is feasible. Due to constraints on name lengths with respect to potentially large numbers of connections, connections are named simply connection.

\subsection*{29.12.2.4 The setup_objects Table}

The setup_objects table controls whether the Performance Schema monitors particular objects. This table has a maximum size of 100 rows by default. To change the table size, modify the performance_schema_setup_objects_size system variable at server startup.

The initial setup_objects contents look like this:
```
mysql> SELECT * FROM performance_schema.setup_objects;

\begin{tabular}{|l|l|l|l|l|}
\hline OBJECT_TYPE & OBJECT_SCHEMA & OBJECT_NAME & ENABLED & TIMED \\
\hline EVENT & mysql & \% & No & NO \\
\hline EVENT & performance_schema & \% & N0 & NO \\
\hline EVENT & information_schema & \% & N0 & NO \\
\hline EVENT & \% & \% & YES & YES \\
\hline FUNCTION & mysql & \% & N0 & NO \\
\hline FUNCTION & performance_schema & \% & N0 & NO \\
\hline FUNCTION & information_schema & \% & N0 & NO \\
\hline FUNCTION & \% & \% & YES & YES \\
\hline PROCEDURE & mysql & \% & N0 & NO \\
\hline PROCEDURE & performance_schema & \% & N0 & NO \\
\hline PROCEDURE & information_schema & \% & N0 & NO \\
\hline PROCEDURE & \% & \% & YES & YES \\
\hline TABLE & mysql & \% & N0 & NO \\
\hline TABLE & performance_schema & \% & N0 & NO \\
\hline TABLE & information_schema & \% & N0 & NO \\
\hline TABLE & \% & \% & YES & YES \\
\hline TRIGGER & mysql & \% & N0 & NO \\
\hline TRIGGER & performance_schema & \% & N0 & NO \\
\hline TRIGGER & information_schema & \% & N0 & NO \\
\hline TRIGGER & \% & \% & YES & YES \\
\hline
\end{tabular}
```


Modifications to the setup_objects table affect object monitoring immediately.
For object types listed in setup_objects, the Performance Schema uses the table to how to monitor them. Object matching is based on the OBJECT_SCHEMA and OBJECT_NAME columns. Objects for which there is no match are not monitored.

The effect of the default object configuration is to instrument all tables except those in the mysql, INFORMATION_SCHEMA, and performance_schema databases. (Tables in the INFORMATION_SCHEMA database are not instrumented regardless of the contents of setup_objects; the row for information_schema. \% simply makes this default explicit.)

When the Performance Schema checks for a match in setup_objects, it tries to find more specific matches first. For example, with a table db1.t1, it looks for a match for 'db1' and 't1', then for ${ }^{\prime}$ db1' and ' $\%^{\prime}$, then for ' $\%^{\prime}$ and ' $\%^{\prime}$. The order in which matching occurs matters because different matching setup_objects rows can have different ENABLED and TIMED values.

Rows can be inserted into or deleted from setup_objects by users with the INSERT or DELETE privilege on the table. For existing rows, only the ENABLED and TIMED columns can be modified, by users with the UPDATE privilege on the table.

For more information about the role of the setup_objects table in event filtering, see Section 29.4.3, "Event Pre-Filtering".

The setup_objects table has these columns:
- OBJECT_TYPE

The type of object to instrument. The value is one of 'EVENT' (Event Scheduler event), 'FUNCTION' (stored function), 'PROCEDURE' (stored procedure), 'TABLE' (base table), or 'TRIGGER' (trigger).

TABLE filtering affects table I/O events (wait/io/table/sql/handler instrument) and table lock events (wait/lock/table/sql/handler instrument).
- OBJECT_SCHEMA

The schema that contains the object. This should be a literal name, or ' $\%$ ' to mean "any schema."
- OBJECT_NAME

The name of the instrumented object. This should be a literal name, or ' $\%$ ' to mean "any object."
- ENABLED

Whether events for the object are instrumented. The value is YES or NO. This column can be modified.
- TIMED

Whether events for the object are timed. This column can be modified.
The setup_objects table has these indexes:
- Index on (OBJECT_TYPE, OBJECT_SCHEMA, OBJECT_NAME)

TRUNCATE TABLE is permitted for the setup_objects table. It removes the rows.

\subsection*{29.12.2.5 The setup_threads Table}

The setup_threads table lists instrumented thread classes. It exposes thread class names and attributes:
```
mysql> SELECT * FROM performance_schema.setup_threads\G
*************************** 1) rOW ***************************
            NAME: thread/performance_schema/setup
        ENABLED: YES
        HISTORY: YES
    PROPERTIES: singleton
    VOLATILITY: 0
```

```
DOCUMENTATION: NULL
...
************************* 4. row ******************************************
            NAME: thread/sql/main
        ENABLED: YES
        HISTORY: YES
    PROPERTIES: singleton
    VOLATILITY: 0
DOCUMENTATION: NULL
            NAME: thread/sql/one_connection
            NAME: thres
        ENABLED: YES
        HISTORY: user
    PROPERTIES: 0
    DOCUMENTATION: NULL
...
************************** 10. row ****************************************
            NAME: thread/sql/event_scheduler
        ENABLED: YES
        HISTORY: YES
    PROPERTIES: singleton
    VOLATILITY: 0
DOCUMENTATION: NULL
```


The setup_threads table has these columns:
- NAME

The instrument name. Thread instruments begin with thread (for example, thread/sql/ parser_service or thread/performance_schema/setup).
- ENABLED

Whether the instrument is enabled. The value is YES or NO. This column can be modified, although setting ENABLED has no effect for threads that are already running.

For background threads, setting the ENABLED value controls whether INSTRUMENTED is set to YES or NO for threads that are subsequently created for this instrument and listed in the threads table. For foreground threads, this column has no effect; the setup_actors table takes precedence.
- HISTORY

Whether to log historical events for the instrument. The value is YES or NO. This column can be modified, although setting HISTORY has no effect for threads that are already running.

For background threads, setting the HISTORY value controls whether HISTORY is set to YES or NO for threads that are subsequently created for this instrument and listed in the threads table. For foreground threads, this column has no effect; the setup_actors table takes precedence.
- PROPERTIES

The instrument properties. This column uses the SET data type, so multiple flags from the following list can be set per instrument:
- singleton: The instrument has a single instance. For example, there is only one thread for the thread/sql/main instrument.
- user: The instrument is directly related to user workload (as opposed to system workload). For example, threads such as thread/sql/one_connection executing a user session have the user property to differentiate them from system threads.
- VOLATILITY

The instrument volatility. This column has the same meaning as in the setup_instruments table. See Section 29.12.2.3, "The setup_instruments Table".
- DOCUMENTATION

A string describing the instrument purpose. The value is NULL if no description is available.
The setup_threads table has these indexes:
- Primary key on (NAME)

TRUNCATE TABLE is not permitted for the setup_threads table.

\subsection*{29.12.3 Performance Schema Instance Tables}

Instance tables document what types of objects are instrumented. They provide event names and explanatory notes or status information:
- cond_instances: Condition synchronization object instances
- file_instances: File instances
- mutex_instances: Mutex synchronization object instances
- rwlock_instances: Lock synchronization object instances
- socket_instances: Active connection instances

These tables list instrumented synchronization objects, files, and connections. There are three types of synchronization objects: cond, mutex, and rwlock. Each instance table has an EVENT_NAME or NAME column to indicate the instrument associated with each row. Instrument names may have multiple parts and form a hierarchy, as discussed in Section 29.6, "Performance Schema Instrument Naming Conventions".

The mutex_instances. LOCKED_BY_THREAD_ID and rwlock_instances.WRITE_LOCKED_BY_THREAD_ID columns are extremely important for investigating performance bottlenecks or deadlocks. For examples of how to use them for this purpose, see Section 29.19, "Using the Performance Schema to Diagnose Problems"

\subsection*{29.12.3.1 The cond_instances Table}

The cond_instances table lists all the conditions seen by the Performance Schema while the server executes. A condition is a synchronization mechanism used in the code to signal that a specific event has happened, so that a thread waiting for this condition can resume work.

When a thread is waiting for something to happen, the condition name is an indication of what the thread is waiting for, but there is no immediate way to tell which other thread, or threads, causes the condition to happen.

The cond_instances table has these columns:
- NAME

The instrument name associated with the condition.
- OBJECT_INSTANCE_BEGIN

The address in memory of the instrumented condition.
The cond_instances table has these indexes:
- Primary key on (OBJECT_INSTANCE_BEGIN)
- Index on (NAME)

TRUNCATE TABLE is not permitted for the cond_instances table.

\subsection*{29.12.3.2 The file_instances Table}

The file_instances table lists all the files seen by the Performance Schema when executing file I/O instrumentation. If a file on disk has never been opened, it is not shown in file_instances. When a file is deleted from the disk, it is also removed from the file_instances table.

The file_instances table has these columns:
- FILE_NAME

The file name.
- EVENT_NAME

The instrument name associated with the file.
- OPEN_COUNT

The count of open handles on the file. If a file was opened and then closed, it was opened 1 time, but OPEN_COUNT is 0 . To list all the files currently opened by the server, use WHERE OPEN_COUNT $>0$.

The file_instances table has these indexes:
- Primary key on (FILE_NAME)
- Index on (EVENT_NAME)

TRUNCATE TABLE is not permitted for the file_instances table.

\subsection*{29.12.3.3 The mutex_instances Table}

The mutex_instances table lists all the mutexes seen by the Performance Schema while the server executes. A mutex is a synchronization mechanism used in the code to enforce that only one thread at a given time can have access to some common resource. The resource is said to be "protected" by the mutex.

When two threads executing in the server (for example, two user sessions executing a query simultaneously) do need to access the same resource (a file, a buffer, or some piece of data), these two threads compete against each other, so that the first query to obtain a lock on the mutex causes the other query to wait until the first is done and unlocks the mutex.

The work performed while holding a mutex is said to be in a "critical section," and multiple queries do execute this critical section in a serialized way (one at a time), which is a potential bottleneck.

The mutex_instances table has these columns:
- NAME

The instrument name associated with the mutex.
- OBJECT_INSTANCE_BEGIN

The address in memory of the instrumented mutex.
- LOCKED_BY_THREAD_ID

When a thread currently has a mutex locked, LOCKED_BY_THREAD_ID is the THREAD_ID of the locking thread, otherwise it is NULL.

The mutex_instances table has these indexes:
- Primary key on (OBJECT_INSTANCE_BEGIN)
- Index on (NAME)
- Index on (LOCKED_BY_THREAD_ID)

TRUNCATE TABLE is not permitted for the mutex_instances table.
For every mutex instrumented in the code, the Performance Schema provides the following information.
- The setup_instruments table lists the name of the instrumentation point, with the prefix wait/ synch/mutex/.
- When some code creates a mutex, a row is added to the mutex_instances table. The OBJECT_INSTANCE_BEGIN column is a property that uniquely identifies the mutex.
- When a thread attempts to lock a mutex, the events_waits_current table shows a row for that thread, indicating that it is waiting on a mutex (in the EVENT_NAME column), and indicating which mutex is waited on (in the OBJECT_INSTANCE_BEGIN column).
- When a thread succeeds in locking a mutex:
- events_waits_current shows that the wait on the mutex is completed (in the TIMER_END and TIMER_WAIT columns)
- The completed wait event is added to the events_waits_history and events_waits_history_long tables
- mutex_instances shows that the mutex is now owned by the thread (in the THREAD_ID column).
- When a thread unlocks a mutex, mutex_instances shows that the mutex now has no owner (the THREAD_ID column is NULL).
- When a mutex object is destroyed, the corresponding row is removed from mutex_instances.

By performing queries on both of the following tables, a monitoring application or a DBA can detect bottlenecks or deadlocks between threads that involve mutexes:
- events_waits_current, to see what mutex a thread is waiting for
- mutex_instances, to see which other thread currently owns a mutex

\subsection*{29.12.3.4 The rwlock_instances Table}

The rwlock_instances table lists all the rwlock (read write lock) instances seen by the Performance Schema while the server executes. An rwlock is a synchronization mechanism used in the code to enforce that threads at a given time can have access to some common resource following certain rules. The resource is said to be "protected" by the rwlock. The access is either shared (many threads can have a read lock at the same time), exclusive (only one thread can have a write lock at a given time), or shared-exclusive (a thread can have a write lock while permitting inconsistent reads by other threads). Shared-exclusive access is otherwise known as an sxlock and optimizes concurrency and improves scalability for read-write workloads.

Depending on how many threads are requesting a lock, and the nature of the locks requested, access can be either granted in shared mode, exclusive mode, shared-exclusive mode or not granted at all, waiting for other threads to finish first.

The rwlock_instances table has these columns:
- NAME

The instrument name associated with the lock.
- OBJECT_INSTANCE_BEGIN

The address in memory of the instrumented lock.
- WRITE_LOCKED_BY_THREAD_ID

When a thread currently has an rwlock locked in exclusive (write) mode, WRITE_LOCKED_BY_THREAD_ID is the THREAD_ID of the locking thread, otherwise it is NULL.
- READ_LOCKED_BY_COUNT

When a thread currently has an rwlock locked in shared (read) mode, READ_LOCKED_BY_COUNT is incremented by 1 . This is a counter only, so it cannot be used directly to find which thread holds a read lock, but it can be used to see whether there is a read contention on an rwlock, and see how many readers are currently active.

The rwlock_instances table has these indexes:
- Primary key on (OBJECT_INSTANCE_BEGIN)
- Index on (NAME)
- Index on (WRITE_LOCKED_BY_THREAD_ID)

TRUNCATE TABLE is not permitted for the rwlock_instances table.
By performing queries on both of the following tables, a monitoring application or a DBA may detect some bottlenecks or deadlocks between threads that involve locks:
- events_waits_current, to see what rwlock a thread is waiting for
- rwlock_instances, to see which other thread currently owns an rwlock

There is a limitation: The rwlock_instances can be used only to identify the thread holding a write lock, but not the threads holding a read lock.

\subsection*{29.12.3.5 The socket_instances Table}

The socket_instances table provides a real-time snapshot of the active connections to the MySQL server. The table contains one row per TCP/IP or Unix socket file connection. Information available in this table provides a real-time snapshot of the active connections to the server. (Additional information is available in socket summary tables, including network activity such as socket operations and number of bytes transmitted and received; see Section 29.12.20.9, "Socket Summary Tables").
```
mysql> SELECT * FROM performance_schema.socket_instances\G
*************************** 1. row ****************************
    EVENT_NAME: wait/io/socket/sql/server_unix_socket
OBJECT_INSTANCE_BEGIN: 4316619408
    THREAD_ID: 1
    SOCKET_ID: 16
            IP:
            PORT: 0
        STATE: ACTIVE
************************** 2. row *****************************************
    EVENT_NAME: wait/io/socket/sql/client_connection
OBJECT_INSTANCE_BEGIN: 4316644608
    THREAD_ID: 21
    SOCKET_ID: 39
            IP: 127.0.0.1
            PORT: 55233
        STATE: ACTIVE
************************** 3. row *****************************************
    EVENT_NAME: wait/io/socket/sql/server_tcpip_socket
OBJECT_INSTANCE_BEGIN: 4316699040
    THREAD_ID: 1
```

```
SOCKET_ID: 14
        IP: 0.0.0.0
    PORT: 50603
    STATE: ACTIVE
```


Socket instruments have names of the form wait/io/socket/sql/socket_type and are used like this:
1. The server has a listening socket for each network protocol that it supports. The instruments associated with listening sockets for TCP/IP or Unix socket file connections have a socket_type value of server_tcpip_socket or server_unix_socket, respectively.
2. When a listening socket detects a connection, the server transfers the connection to a new socket managed by a separate thread. The instrument for the new connection thread has a socket_type value of client_connection.
3. When a connection terminates, the row in socket_instances corresponding to it is deleted.

The socket_instances table has these columns:
- EVENT_NAME

The name of the wait/io/socket/* instrument that produced the event. This is a NAME value from the setup_instruments table. Instrument names may have multiple parts and form a hierarchy, as discussed in Section 29.6, "Performance Schema Instrument Naming Conventions".
- OBJECT_INSTANCE_BEGIN

This column uniquely identifies the socket. The value is the address of an object in memory.
- THREAD_ID

The internal thread identifier assigned by the server. Each socket is managed by a single thread, so each socket can be mapped to a thread which can be mapped to a server process.
- SOCKET_ID

The internal file handle assigned to the socket.
- IP

The client IP address. The value may be either an IPv4 or IPv6 address, or blank to indicate a Unix socket file connection.
- PORT

The TCP/IP port number, in the range from 0 to 65535.
- STATE

The socket status, either IDLE or ACTIVE. Wait times for active sockets are tracked using the corresponding socket instrument. Wait times for idle sockets are tracked using the idle instrument.

A socket is idle if it is waiting for a request from the client. When a socket becomes idle, the event row in socket_instances that is tracking the socket switches from a status of ACTIVE to IDLE. The EVENT_NAME value remains wait/io/socket/*, but timing for the instrument is suspended. Instead, an event is generated in the events_waits_current table with an EVENT_NAME value of idle.

When the next request is received, the idle event terminates, the socket instance switches from IDLE to ACTIVE, and timing of the socket instrument resumes.

The socket_instances table has these indexes:
- Primary key on (OBJECT_INSTANCE_BEGIN)
- Index on (THREAD_ID)
- Index on (SOCKET_ID)
- Index on (IP, PORT)

TRUNCATE TABLE is not permitted for the socket_instances table.
The IP: PORT column combination value identifies the connection. This combination value is used in the OBJECT_NAME column of the events_waits_xxx tables, to identify the connection from which socket events come:
- For the Unix domain listener socket (server_unix_socket), the port is 0 , and the IP is ' '.
- For client connections via the Unix domain listener (client_connection), the port is 0 , and the IP is ' '.
- For the TCP/IP server listener socket (server_tcpip_socket), the port is always the master port (for example, 3306), and the IP is always 0.0.0.0.
- For client connections via the TCP/IP listener (client_connection), the port is whatever the server assigns, but never 0 . The IP is the IP of the originating host ( 127.0 .0 .1 or :: 1 for the local host)

\subsection*{29.12.4 Performance Schema Wait Event Tables}

The Performance Schema instruments waits, which are events that take time. Within the event hierarchy, wait events nest within stage events, which nest within statement events, which nest within transaction events.

These tables store wait events:
- events_waits_current: The current wait event for each thread.
- events_waits_history: The most recent wait events that have ended per thread.
- events_waits_history_long: The most recent wait events that have ended globally (across all threads).

The following sections describe the wait event tables. There are also summary tables that aggregate information about wait events; see Section 29.12.20.1, "Wait Event Summary Tables".

For more information about the relationship between the three wait event tables, see Section 29.9, "Performance Schema Tables for Current and Historical Events".

\section*{Configuring Wait Event Collection}

To control whether to collect wait events, set the state of the relevant instruments and consumers:
- The setup_instruments table contains instruments with names that begin with wait. Use these instruments to enable or disable collection of individual wait event classes.
- The setup_consumers table contains consumer values with names corresponding to the current and historical wait event table names. Use these consumers to filter collection of wait events.

Some wait instruments are enabled by default; others are disabled. For example:
```
mysql> SELECT NAME, ENABLED, TIMED
    FROM performance_schema.setup_instruments
    WHERE NAME LIKE 'wait/io/file/innodb%';
+--------------------------------------------------+---------+-------+
| NAME
```

```
+--------------------------------------------------+--------+----------
| wait/io/file/innodb/innodb_tablespace_open_file | YES | YES
| wait/io/file/innodb/innodb_data_file | YES | YES
| wait/io/file/innodb/innodb_log_file | YES | YES
| wait/io/file/innodb/innodb_temp_file | YES | YES
| wait/io/file/innodb/innodb_arch_file | YES | YES
| wait/io/file/innodb/innodb_clone_file | YES | YES
+--------------------------------------------------+---------+------+
mysql> SELECT NAME, ENABLED, TIMED
    FROM performance_schema.setup_instruments
    WHERE NAME LIKE 'wait/io/socket/%';
+------------------------------------------+---------+-------+
+------------------------------------------+--------+------+
| wait/io/socket/sql/server_tcpip_socket | NO | NO
| wait/io/socket/sql/server_unix_socket | NO | NO
| wait/io/socket/sql/client_connection | NO | NO
```


The wait consumers are disabled by default:
```
mysql> SELECT *
        FROM performance_schema.setup_consumers
        WHERE NAME LIKE 'events_waits%';
+----------------------------+---------+

\begin{tabular}{|l|l|}
\hline NAME & ENABLED \\
\hline events_waits_current & N0 \\
\hline events_waits_history & N0 \\
\hline events_waits_history_long & NO \\
\hline
\end{tabular}
```


To control wait event collection at server startup, use lines like these in your my. cnf file:
- Enable:
```
[mysqld]
performance-schema-instrument='wait/%=ON'
performance-schema-consumer-events-waits-current=ON
performance-schema-consumer-events-waits-history=ON
performance-schema-consumer-events-waits-history-long=ON
```

- Disable:
```
[mysqld]
performance-schema-instrument='wait/%=OFF'
performance-schema-consumer-events-waits-current=OFF
performance-schema-consumer-events-waits-history=0FF
performance-schema-consumer-events-waits-history-long=0FF
```


To control wait event collection at runtime, update the setup_instruments and setup_consumers tables:
- Enable:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME LIKE 'wait/%';
UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES'
WHERE NAME LIKE 'events_waits%';
```

- Disable:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = 'NO', TIMED = 'NO'
WHERE NAME LIKE 'wait/%';
UPDATE performance_schema.setup_consumers
```

```
SET ENABLED = 'NO'
WHERE NAME LIKE 'events_waits%';
```


To collect only specific wait events, enable only the corresponding wait instruments. To collect wait events only for specific wait event tables, enable the wait instruments but only the wait consumers corresponding to the desired tables.

For additional information about configuring event collection, see Section 29.3, "Performance Schema Startup Configuration", and Section 29.4, "Performance Schema Runtime Configuration".

\subsection*{29.12.4.1 The events_waits_current Table}

The events_waits_current table contains current wait events. The table stores one row per thread showing the current status of the thread's most recent monitored wait event, so there is no system variable for configuring the table size.

Of the tables that contain wait event rows, events_waits_current is the most fundamental. Other tables that contain wait event rows are logically derived from the current events. For example, the events_waits_history and events_waits_history_long tables are collections of the most recent wait events that have ended, up to a maximum number of rows per thread and globally across all threads, respectively.

For more information about the relationship between the three wait event tables, see Section 29.9, "Performance Schema Tables for Current and Historical Events".

For information about configuring whether to collect wait events, see Section 29.12.4, "Performance Schema Wait Event Tables".

The events_waits_current table has these columns:
- THREAD_ID, EVENT_ID

The thread associated with the event and the thread current event number when the event starts. The THREAD_ID and EVENT_ID values taken together uniquely identify the row. No two rows have the same pair of values.
- END_EVENT_ID

This column is set to NULL when the event starts and updated to the thread current event number when the event ends.
- EVENT_NAME

The name of the instrument that produced the event. This is a NAME value from the setup_instruments table. Instrument names may have multiple parts and form a hierarchy, as discussed in Section 29.6, "Performance Schema Instrument Naming Conventions".
- SOURCE

The name of the source file containing the instrumented code that produced the event and the line number in the file at which the instrumentation occurs. This enables you to check the source to determine exactly what code is involved. For example, if a mutex or lock is being blocked, you can check the context in which this occurs.
- TIMER_START, TIMER_END, TIMER_WAIT

Timing information for the event. The unit for these values is picoseconds (trillionths of a second). The TIMER_START and TIMER_END values indicate when event timing started and ended. TIMER_WAIT is the event elapsed time (duration).

If an event has not finished, TIMER_END is the current timer value and TIMER_WAIT is the time elapsed so far (TIMER_END - TIMER_START).

If an event is produced from an instrument that has TIMED $=$ NO, timing information is not collected, and TIMER_START, TIMER_END, and TIMER_WAIT are all NULL.

For discussion of picoseconds as the unit for event times and factors that affect time values, see Section 29.4.1, "Performance Schema Event Timing".
- SPINS

For a mutex, the number of spin rounds. If the value is NULL, the code does not use spin rounds or spinning is not instrumented.
- OBJECT_SCHEMA, OBJECT_NAME, OBJECT_TYPE, OBJECT_INSTANCE_BEGIN

These columns identify the object "being acted on." What that means depends on the object type.
For a synchronization object (cond, mutex, rwlock):
- OBJECT_SCHEMA, OBJECT_NAME, and OBJECT_TYPE are NULL.
- OBJECT_INSTANCE_BEGIN is the address of the synchronization object in memory.

For a file I/O object:
- OBJECT_SCHEMA is NULL.
- OBJECT_NAME is the file name.
- OBJECT_TYPE is FILE.
- OBJECT_INSTANCE_BEGIN is an address in memory.

For a socket object:
- OBJECT_NAME is the IP: PORT value for the socket.
- OBJECT_INSTANCE_BEGIN is an address in memory.

For a table I/O object:
- OBJECT_SCHEMA is the name of the schema that contains the table.
- OBJECT_NAME is the table name.
- OBJECT_TYPE is TABLE for a persistent base table or TEMPORARY TABLE for a temporary table.
- OBJECT_INSTANCE_BEGIN is an address in memory.

An OBJECT_INSTANCE_BEGIN value itself has no meaning, except that different values indicate different objects. OBJECT_INSTANCE_BEGIN can be used for debugging. For example, it can be used with GROUP BY OBJECT_INSTANCE_BEGIN to see whether the load on 1,000 mutexes (that protect, say, 1,000 pages or blocks of data) is spread evenly or just hitting a few bottlenecks. This can help you correlate with other sources of information if you see the same object address in a log file or another debugging or performance tool.
- INDEX_NAME

The name of the index used. PRIMARY indicates the table primary index. NULL means that no index was used.
- NESTING_EVENT_ID

The EVENT_ID value of the event within which this event is nested.
- NESTING_EVENT_TYPE

The nesting event type. The value is TRANSACTION, STATEMENT, STAGE, or WAIT.
- OPERATION

The type of operation performed, such as lock, read, or write.
- NUMBER_OF_BYTES

The number of bytes read or written by the operation. For table I/O waits (events for the wait/ io/table/sql/handler instrument), NUMBER_OF_BYTES indicates the number of rows. If the value is greater than 1 , the event is for a batch I/O operation. The following discussion describes the difference between exclusively single-row reporting and reporting that reflects batch I/O.

MySQL executes joins using a nested-loop implementation. The job of the Performance Schema instrumentation is to provide row count and accumulated execution time per table in the join. Assume a join query of the following form that is executed using a table join order of t1, t2, t3:
```
SELECT ... FROM t1 JOIN t2 ON ... JOIN t3 ON ...
```


Table "fanout" is the increase or decrease in number of rows from adding a table during join processing. If the fanout for table t 3 is greater than 1 , the majority of row-fetch operations are for that table. Suppose that the join accesses 10 rows from t1, 20 rows from t2 per row from t1, and 30 rows from t3 per row of table t2. With single-row reporting, the total number of instrumented operations is:
```
10 + (10 * 20) + (10 * 20 * 30) = 6210
```


A significant reduction in the number of instrumented operations is achievable by aggregating them per scan (that is, per unique combination of rows from t1 and t2). With batch I/O reporting, the Performance Schema produces an event for each scan of the innermost table t3 rather than for each row, and the number of instrumented row operations reduces to:
$10+(10$ * 20$)+(10$ * 20$)=410$
That is a reduction of $93 \%$, illustrating how the batch-reporting strategy significantly reduces Performance Schema overhead for table I/O by reducing the number of reporting calls. The tradeoff is lesser accuracy for event timing. Rather than time for an individual row operation as in per-row reporting, timing for batch I/O includes time spent for operations such as join buffering, aggregation, and returning rows to the client.

For batch I/O reporting to occur, these conditions must be true:
- Query execution accesses the innermost table of a query block (for a single-table query, that table counts as innermost)
- Query execution does not request a single row from the table (so, for example, eq_ref access prevents use of batch reporting)
- Query execution does not evaluate a subquery containing table access for the table
- FLAGS

Reserved for future use.
The events_waits_current table has these indexes:
- Primary key on (THREAD_ID, EVENT_ID)

TRUNCATE TABLE is permitted for the events_waits_current table. It removes the rows.

\subsection*{29.12.4.2 The events_waits_history Table}

The events_waits_history table contains the $N$ most recent wait events that have ended per thread. Wait events are not added to the table until they have ended. When the table contains the maximum number of rows for a given thread, the oldest thread row is discarded when a new row for that thread is added. When a thread ends, all its rows are discarded.

The Performance Schema autosizes the value of $N$ during server startup. To set the number of rows per thread explicitly, set the performance_schema_events_waits_history_size system variable at server startup.

The events_waits_history table has the same columns and indexing as events_waits_current. See Section 29.12.4.1, "The events_waits_current Table".

TRUNCATE TABLE is permitted for the events_waits_history table. It removes the rows.
For more information about the relationship between the three wait event tables, see Section 29.9, "Performance Schema Tables for Current and Historical Events".

For information about configuring whether to collect wait events, see Section 29.12.4, "Performance Schema Wait Event Tables".

\subsection*{29.12.4.3 The events_waits_history_long Table}

The events_waits_history_long table contains $N$ the most recent wait events that have ended globally, across all threads. Wait events are not added to the table until they have ended. When the table becomes full, the oldest row is discarded when a new row is added, regardless of which thread generated either row.

The Performance Schema autosizes the value of $N$ during server startup. To set the table size explicitly, set the performance_schema_events_waits_history_long_size system variable at server startup.

The events_waits_history_long table has the same columns as events_waits_current. See Section 29.12.4.1, "The events_waits_current Table". Unlike events_waits_current, events_waits_history_long has no indexing.

TRUNCATE TABLE is permitted for the events_waits_history_long table. It removes the rows.
For more information about the relationship between the three wait event tables, see Section 29.9, "Performance Schema Tables for Current and Historical Events".

For information about configuring whether to collect wait events, see Section 29.12.4, "Performance Schema Wait Event Tables".

\subsection*{29.12.5 Performance Schema Stage Event Tables}

The Performance Schema instruments stages, which are steps during the statement-execution process, such as parsing a statement, opening a table, or performing a filesort operation. Stages correspond to the thread states displayed by SHOW PROCESSLIST or that are visible in the Information Schema PROCESSLIST table. Stages begin and end when state values change.

Within the event hierarchy, wait events nest within stage events, which nest within statement events, which nest within transaction events.

These tables store stage events:
- events_stages_current: The current stage event for each thread.
- events_stages_history: The most recent stage events that have ended per thread.
- events_stages_history_long: The most recent stage events that have ended globally (across all threads).

The following sections describe the stage event tables. There are also summary tables that aggregate information about stage events; see Section 29.12.20.2, "Stage Summary Tables".

For more information about the relationship between the three stage event tables, see Section 29.9, "Performance Schema Tables for Current and Historical Events".
- Configuring Stage Event Collection
- Stage Event Progress Information

\section*{Configuring Stage Event Collection}

To control whether to collect stage events, set the state of the relevant instruments and consumers:
- The setup_instruments table contains instruments with names that begin with stage. Use these instruments to enable or disable collection of individual stage event classes.
- The setup_consumers table contains consumer values with names corresponding to the current and historical stage event table names. Use these consumers to filter collection of stage events.

Other than those instruments that provide statement progress information, the stage instruments are disabled by default. For example:
```
mysql> SELECT NAME, ENABLED, TIMED
    FROM performance_schema.setup_instruments
    WHERE NAME RLIKE 'stage/sql/[a-c]';

\begin{tabular}{|l|l|l|}
\hline NAME & ENABLED & TIMED \\
\hline stage/sql/After create & N0 & NO \\
\hline stage/sql/allocating local table & N0 & N0 \\
\hline stage/sql/altering table & N0 & N0 \\
\hline stage/sql/committing alter table to storage engine & NO & NO \\
\hline stage/sql/Changing master & N0 & N0 \\
\hline stage/sql/Checking master version & N0 & N0 \\
\hline stage/sql/checking permissions & N0 & N0 \\
\hline stage/sql/cleaning up & NO & NO \\
\hline stage/sql/closing tables & NO & NO \\
\hline stage/sql/Connecting to master & N0 & N0 \\
\hline stage/sql/converting HEAP to MyISAM & N0 & N0 \\
\hline stage/sql/Copying to group table & NO & N0 \\
\hline stage/sql/Copying to tmp table & N0 & N0 \\
\hline stage/sql/copy to tmp table & N0 & N0 \\
\hline stage/sql/Creating sort index & N0 & N0 \\
\hline stage/sql/creating table & N0 & N0 \\
\hline stage/sql/Creating tmp table & N0 & N0 \\
\hline
\end{tabular}
```


Stage event instruments that provide statement progress information are enabled and timed by default:
```
mysql> SELECT NAME, ENABLED, TIMED
    FROM performance_schema.setup_instruments
    WHERE ENABLED='YES' AND NAME LIKE "stage/%";
+------------------------------------------------------+--------+-------+

\begin{tabular}{|l|l|l|}
\hline NAME & ENABLED & TIMED \\
\hline stage/sql/copy to tmp table & YES & YES \\
\hline stage/sql/Applying batch of row changes (write) & YES & YES \\
\hline stage/sql/Applying batch of row changes (update) & YES & YES \\
\hline stage/sql/Applying batch of row changes (delete) & YES & YES \\
\hline stage/innodb/alter table (end) & YES & YES \\
\hline stage/innodb/alter table (flush) & YES & YES \\
\hline stage/innodb/alter table (insert) & YES & YES \\
\hline stage/innodb/alter table (log apply index) & YES & YES \\
\hline stage/innodb/alter table (log apply table) & YES & YES \\
\hline stage/innodb/alter table (merge sort) & YES & YES \\
\hline stage/innodb/alter table (read PK and internal sort) & YES & YES \\
\hline stage/innodb/buffer pool load & YES & YES \\
\hline stage/innodb/clone (file copy) & YES & YES \\
\hline
\end{tabular}
```

```
stage/innodb/clone (redo copy) | YES | YES |
stage/innodb/clone (page copy) | YES | YES |
```


The stage consumers are disabled by default:
```
mysql> SELECT *
        FROM performance_schema.setup_consumers
        WHERE NAME LIKE 'events_stages%';
+------------------------------+---------+
| NAME | ENABLED |
+------------------------------+---------+
| events_stages_current | NO
| events_stages_history | NO
| events_stages_history_long | NO
+-----------------------------+---------+
```


To control stage event collection at server startup, use lines like these in your my.cnf file:
- Enable:
```
[mysqld]
performance-schema-instrument='stage/%=ON'
performance-schema-consumer-events-stages-current=ON
performance-schema-consumer-events-stages-history=ON
performance-schema-consumer-events-stages-history-long=ON
```

- Disable:
```
[mysqld]
performance-schema-instrument='stage/%=OFF'
performance-schema-consumer-events-stages-current=0FF
performance-schema-consumer-events-stages-history=0FF
performance-schema-consumer-events-stages-history-long=0FF
```


To control stage event collection at runtime, update the setup_instruments and setup_consumers tables:
- Enable:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME LIKE 'stage/%';
UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES'
WHERE NAME LIKE 'events_stages%';
```

- Disable:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = 'NO', TIMED = 'NO'
WHERE NAME LIKE 'stage/%';
UPDATE performance_schema.setup_consumers
SET ENABLED = 'NO'
WHERE NAME LIKE 'events_stages%';
```


To collect only specific stage events, enable only the corresponding stage instruments. To collect stage events only for specific stage event tables, enable the stage instruments but only the stage consumers corresponding to the desired tables.

For additional information about configuring event collection, see Section 29.3, "Performance Schema Startup Configuration", and Section 29.4, "Performance Schema Runtime Configuration".

\section*{Stage Event Progress Information}

The Performance Schema stage event tables contain two columns that, taken together, provide a stage progress indicator for each row:
- WORK_COMPLETED: The number of work units completed for the stage
- WORK_ESTIMATED: The number of work units expected for the stage

Each column is NULL if no progress information is provided for an instrument. Interpretation of the information, if it is available, depends entirely on the instrument implementation. The Performance Schema tables provide a container to store progress data, but make no assumptions about the semantics of the metric itself:
- A "work unit" is an integer metric that increases over time during execution, such as the number of bytes, rows, files, or tables processed. The definition of "work unit" for a particular instrument is left to the instrumentation code providing the data.
- The WORK_COMPLETED value can increase one or many units at a time, depending on the instrumented code.
- The WORK_ESTIMATED value can change during the stage, depending on the instrumented code.

Instrumentation for a stage event progress indicator can implement any of the following behaviors:
- No progress instrumentation

This is the most typical case, where no progress data is provided. The WORK_COMPLETED and WORK_ESTIMATED columns are both NULL.
- Unbounded progress instrumentation

Only the WORK_COMPLETED column is meaningful. No data is provided for the WORK_ESTIMATED column, which displays 0.

By querying the events_stages_current table for the monitored session, a monitoring application can report how much work has been performed so far, but cannot report whether the stage is near completion. Currently, no stages are instrumented like this.
- Bounded progress instrumentation

The WORK_COMPLETED and WORK_ESTIMATED columns are both meaningful.
This type of progress indicator is appropriate for an operation with a defined completion criterion, such as the table-copy instrument described later. By querying the events_stages_current table for the monitored session, a monitoring application can report how much work has been performed so far, and can report the overall completion percentage for the stage, by computing the WORK_COMPLETED / WORK_ESTIMATED ratio.

The stage/sql/copy to tmp table instrument illustrates how progress indicators work. During execution of an ALTER TABLE statement, the stage/sql/copy to tmp table stage is used, and this stage can execute potentially for a long time, depending on the size of the data to copy.

The table-copy task has a defined termination (all rows copied), and the stage/sql/copy to tmp table stage is instrumented to provided bounded progress information: The work unit used is number of rows copied, WORK_COMPLETED and WORK_ESTIMATED are both meaningful, and their ratio indicates task percentage complete.

To enable the instrument and the relevant consumers, execute these statements:
```
UPDATE performance_schema.setup_instruments
SET ENABLED='YES'
WHERE NAME='stage/sql/copy to tmp table';
UPDATE performance_schema.setup_consumers
SET ENABLED='YES'
WHERE NAME LIKE 'events_stages_%';
```


To see the progress of an ongoing ALTER TABLE statement, select from the events_stages_current table.

\subsection*{29.12.5.1 The events_stages_current Table}

The events_stages_current table contains current stage events. The table stores one row per thread showing the current status of the thread's most recent monitored stage event, so there is no system variable for configuring the table size.

Of the tables that contain stage event rows, events_stages_current is the most fundamental. Other tables that contain stage event rows are logically derived from the current events. For example, the events_stages_history and events_stages_history_long tables are collections of the most recent stage events that have ended, up to a maximum number of rows per thread and globally across all threads, respectively.

For more information about the relationship between the three stage event tables, see Section 29.9, "Performance Schema Tables for Current and Historical Events".

For information about configuring whether to collect stage events, see Section 29.12.5, "Performance Schema Stage Event Tables".

The events_stages_current table has these columns:
- THREAD_ID, EVENT_ID

The thread associated with the event and the thread current event number when the event starts.
The THREAD_ID and EVENT_ID values taken together uniquely identify the row. No two rows have the same pair of values.
- END_EVENT_ID

This column is set to NULL when the event starts and updated to the thread current event number when the event ends.
- EVENT_NAME

The name of the instrument that produced the event. This is a NAME value from the setup_instruments table. Instrument names may have multiple parts and form a hierarchy, as discussed in Section 29.6, "Performance Schema Instrument Naming Conventions".
- SOURCE

The name of the source file containing the instrumented code that produced the event and the line number in the file at which the instrumentation occurs. This enables you to check the source to determine exactly what code is involved.
- TIMER_START, TIMER_END, TIMER_WAIT

Timing information for the event. The unit for these values is picoseconds (trillionths of a second).
The TIMER_START and TIMER_END values indicate when event timing started and ended.
TIMER_WAIT is the event elapsed time (duration).
If an event has not finished, TIMER_END is the current timer value and TIMER_WAIT is the time elapsed so far (TIMER_END - TIMER_START).

If an event is produced from an instrument that has TIMED $=$ NO, timing information is not collected, and TIMER_START, TIMER_END, and TIMER_WAIT are all NULL.

For discussion of picoseconds as the unit for event times and factors that affect time values, see Section 29.4.1, "Performance Schema Event Timing".
- WORK_COMPLETED, WORK_ESTIMATED

These columns provide stage progress information, for instruments that have been implemented to produce such information. WORK_COMPLETED indicates how many work units have been completed for the stage, and WORK_ESTIMATED indicates how many work units are expected for the stage. For more information, see Stage Event Progress Information.
- NESTING_EVENT_ID

The EVENT_ID value of the event within which this event is nested. The nesting event for a stage event is usually a statement event.
- NESTING_EVENT_TYPE

The nesting event type. The value is TRANSACTION, STATEMENT, STAGE, or WAIT.
The events_stages_current table has these indexes:
- Primary key on (THREAD_ID, EVENT_ID)

TRUNCATE TABLE is permitted for the events_stages_current table. It removes the rows.

\subsection*{29.12.5.2 The events_stages_history Table}

The events_stages_history table contains the $N$ most recent stage events that have ended per thread. Stage events are not added to the table until they have ended. When the table contains the maximum number of rows for a given thread, the oldest thread row is discarded when a new row for that thread is added. When a thread ends, all its rows are discarded.

The Performance Schema autosizes the value of $N$ during server startup. To set the number of rows per thread explicitly, set the performance_schema_events_stages_history_size system variable at server startup.

The events_stages_history table has the same columns and indexing as events_stages_current. See Section 29.12.5.1, "The events_stages_current Table".

TRUNCATE TABLE is permitted for the events_stages_history table. It removes the rows.
For more information about the relationship between the three stage event tables, see Section 29.9, "Performance Schema Tables for Current and Historical Events".

For information about configuring whether to collect stage events, see Section 29.12.5, "Performance Schema Stage Event Tables".

\subsection*{29.12.5.3 The events_stages_history_long Table}

The events_stages_history_long table contains the $N$ most recent stage events that have ended globally, across all threads. Stage events are not added to the table until they have ended. When the table becomes full, the oldest row is discarded when a new row is added, regardless of which thread generated either row.

The Performance Schema autosizes the value of $N$ during server startup. To set the table size explicitly, set the performance_schema_events_stages_history_long_size system variable at server startup.

The events_stages_history_long table has the same columns as events_stages_current. See Section 29.12.5.1, "The events_stages_current Table". Unlike events_stages_current, events_stages_history_long has no indexing.

TRUNCATE TABLE is permitted for the events_stages_history_long table. It removes the rows.
For more information about the relationship between the three stage event tables, see Section 29.9, "Performance Schema Tables for Current and Historical Events".

For information about configuring whether to collect stage events, see Section 29.12.5, "Performance Schema Stage Event Tables".

\subsection*{29.12.6 Performance Schema Statement Event Tables}

The Performance Schema instruments statement execution. Statement events occur at a high level of the event hierarchy. Within the event hierarchy, wait events nest within stage events, which nest within statement events, which nest within transaction events.

These tables store statement events:
- events_statements_current: The current statement event for each thread.
- events_statements_history: The most recent statement events that have ended per thread.
- events_statements_history_long: The most recent statement events that have ended globally (across all threads).
- prepared_statements_instances: Prepared statement instances and statistics

The following sections describe the statement event tables. There are also summary tables that aggregate information about statement events; see Section 29.12.20.3, "Statement Summary Tables".

For more information about the relationship between the three events_statements_xxx event tables, see Section 29.9, "Performance Schema Tables for Current and Historical Events".
- Configuring Statement Event Collection
- Statement Monitoring

\section*{Configuring Statement Event Collection}

To control whether to collect statement events, set the state of the relevant instruments and consumers:
- The setup_instruments table contains instruments with names that begin with statement. Use these instruments to enable or disable collection of individual statement event classes.
- The setup_consumers table contains consumer values with names corresponding to the current and historical statement event table names, and the statement digest consumer. Use these consumers to filter collection of statement events and statement digesting.

The statement instruments are enabled by default, and the events_statements_current, events_statements_history, and statements_digest statement consumers are enabled by default:
```
mysql> SELECT NAME, ENABLED, TIMED
    FROM performance_schema.setup_instruments
    WHERE NAME LIKE 'statement/%';
+----------------------------------------------+--------+-------+
| NAME | ENABLED | TIMED |
+-----------------------------------------------+---------+------+
| statement/sql/select | YES | YES
| statement/sql/create_table | YES | YES
| statement/sql/create_index | YES | YES |
...
| statement/sp/stmt | YES | YES |
| statement/sp/set | YES | YES
| statement/sp/set_trigger_field | YES | YES
| statement/scheduler/event | YES | YES
| statement/com/Sleep | YES | YES
| statement/com/Quit | YES | YES
| statement/com/Init DB | YES | YES |
...
\begin{array} { | l | l | l | } { \text { statement/abstract/Query } } & { \text { YES } } & { \text { YES } } \\ { \text { statement/abstract/new_packet } } & { \text { YES } } & { \text { YES } } \end{array}
```

```
| statement/abstract/relay_log | YES | YES |
mysql> SELECT *
    FROM performance_schema.setup_consumers
    WHERE NAME LIKE '%statements%';
+----------------------------------+---------+
| NAME | ENABLED |
+---------------------------------+---------+
| events_statements_current | YES
| events_statements_history | YES
| events_statements_history_long | NO
| statements_digest | YES
+----------------------------------+---------+
```


To control statement event collection at server startup, use lines like these in your my. cnf file:
- Enable:
```
[mysqld]
performance-schema-instrument='statement/%=ON'
performance-schema-consumer-events-statements-current=ON
performance-schema-consumer-events-statements-history=ON
performance-schema-consumer-events-statements-history-long=ON
performance-schema-consumer-statements-digest=0N
```

- Disable:
```
[mysqld]
performance-schema-instrument='statement/%=OFF'
performance-schema-consumer-events-statements-current=0FF
performance-schema-consumer-events-statements-history=0FF
performance-schema-consumer-events-statements-history-long=0FF
performance-schema-consumer-statements-digest=0FF
```


To control statement event collection at runtime, update the setup_instruments and setup_consumers tables:
- Enable:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME LIKE 'statement/%';
UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES'
WHERE NAME LIKE '%statements%';
```

- Disable:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = 'NO', TIMED = 'NO'
WHERE NAME LIKE 'statement/%';
UPDATE performance_schema.setup_consumers
SET ENABLED = 'NO'
WHERE NAME LIKE '%statements%';
```


To collect only specific statement events, enable only the corresponding statement instruments. To collect statement events only for specific statement event tables, enable the statement instruments but only the statement consumers corresponding to the desired tables.

For additional information about configuring event collection, see Section 29.3, "Performance Schema Startup Configuration", and Section 29.4, "Performance Schema Runtime Configuration".

