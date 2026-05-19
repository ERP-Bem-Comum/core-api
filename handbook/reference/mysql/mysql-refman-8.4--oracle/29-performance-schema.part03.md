\section*{Status Variable Summaries}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 29.15 Performance Schema Error Status Variable Summary Tables}
\begin{tabular}{|l|l|}
\hline Table Name & Description \\
\hline status_by_account & Session status variables per account \\
\hline status_by_host & Session status variables per host name \\
\hline status_by_user & Session status variables per user name \\
\hline
\end{tabular}
\end{table}

\subsection*{29.12.20.1 Wait Event Summary Tables}

The Performance Schema maintains tables for collecting current and recent wait events, and aggregates that information in summary tables. Section 29.12.4, "Performance Schema Wait Event Tables" describes the events on which wait summaries are based. See that discussion for information about the content of wait events, the current and recent wait event tables, and how to control wait event collection, which is disabled by default.

Example wait event summary information:
```
mysql> SELECT *
        FROM performance_schema.events_waits_summary_global_by_event_name\G
...
    ********************** 6. row ****************************
    EVENT_NAME: wait/synch/mutex/sql/BINARY_LOG::LOCK_index
    COUNT_STAR: 8
SUM_TIMER_WAIT: 2119302
```

```
MIN_TIMER_WAIT: 196092
AVG_TIMER_WAIT: 264912
MAX_TIMER_WAIT: 569421
...
*************************** 9. row ****************************************
    EVENT_NAME: wait/synch/mutex/sql/hash_filo::lock
    COUNT_STAR: 69
SUM_TIMER_WAIT: 16848828
MIN_TIMER_WAIT: 0
AVG_TIMER_WAIT: 244185
MAX_TIMER_WAIT: 735345
...
```


Each wait event summary table has one or more grouping columns to indicate how the table aggregates events. Event names refer to names of event instruments in the setup_instruments table:
- events_waits_summary_by_account_by_event_name has EVENT_NAME, USER, and HOST columns. Each row summarizes events for a given account (user and host combination) and event name.
- events_waits_summary_by_host_by_event_name has EVENT_NAME and HOST columns. Each row summarizes events for a given host and event name.
- events_waits_summary_by_instance has EVENT_NAME and OBJECT_INSTANCE_BEGIN columns. Each row summarizes events for a given event name and object. If an instrument is used to create multiple instances, each instance has a unique OBJECT_INSTANCE_BEGIN value and is summarized separately in this table.
- events_waits_summary_by_thread_by_event_name has THREAD_ID and EVENT_NAME columns. Each row summarizes events for a given thread and event name.
- events_waits_summary_by_user_by_event_name has EVENT_NAME and USER columns. Each row summarizes events for a given user and event name.
- events_waits_summary_global_by_event_name has an EVENT_NAME column. Each row summarizes events for a given event name. An instrument might be used to create multiple instances of the instrumented object. For example, if there is an instrument for a mutex that is created for each connection, there are as many instances as there are connections. The summary row for the instrument summarizes over all these instances.

Each wait event summary table has these summary columns containing aggregated values:
- COUNT_STAR

The number of summarized events. This value includes all events, whether timed or nontimed.
- SUM_TIMER_WAIT

The total wait time of the summarized timed events. This value is calculated only for timed events because nontimed events have a wait time of NULL. The same is true for the other xxx_TIMER_WAIT values.
- MIN_TIMER_WAIT

The minimum wait time of the summarized timed events.
- AVG_TIMER_WAIT

The average wait time of the summarized timed events.
- MAX_TIMER_WAIT

The maximum wait time of the summarized timed events.

The wait event summary tables have these indexes:
- events_waits_summary_by_account_by_event_name:
- Primary key on (USER, HOST, EVENT_NAME)
- events_waits_summary_by_host_by_event_name:
- Primary key on (HOST, EVENT_NAME)
- events_waits_summary_by_instance:
- Primary key on (OBJECT_INSTANCE_BEGIN)
- Index on (EVENT_NAME)
- events_waits_summary_by_thread_by_event_name:
- Primary key on (THREAD_ID, EVENT_NAME)
- events_waits_summary_by_user_by_event_name:
- Primary key on (USER, EVENT_NAME)
- events_waits_summary_global_by_event_name:
- Primary key on (EVENT_NAME)

TRUNCATE TABLE is permitted for wait summary tables. It has these effects:
- For summary tables not aggregated by account, host, or user, truncation resets the summary columns to zero rather than removing rows.
- For summary tables aggregated by account, host, or user, truncation removes rows for accounts, hosts, or users with no connections, and resets the summary columns to zero for the remaining rows.

In addition, each wait summary table that is aggregated by account, host, user, or thread is implicitly truncated by truncation of the connection table on which it depends, or truncation of events_waits_summary_global_by_event_name. For details, see Section 29.12.8, "Performance Schema Connection Tables".

\subsection*{29.12.20.2 Stage Summary Tables}

The Performance Schema maintains tables for collecting current and recent stage events, and aggregates that information in summary tables. Section 29.12.5, "Performance Schema Stage Event Tables" describes the events on which stage summaries are based. See that discussion for information about the content of stage events, the current and historical stage event tables, and how to control stage event collection, which is disabled by default.

Example stage event summary information:
```
mysql> SELECT *
        FROM performance_schema.events_stages_summary_global_by_event_name\G
...
************************* 5. row ******************************************
    EVENT_NAME: stage/sql/checking permissions
    COUNT_STAR: 57
SUM_TIMER_WAIT: 26501888880
MIN_TIMER_WAIT: 7317456
AVG_TIMER_WAIT: 464945295
MAX_TIMER_WAIT: 12858936792
...
    ********************** 9. row *********************************
    EVENT_NAME: stage/sql/closing tables
    COUNT_STAR: 37
```

```
SUM_TIMER_WAIT: 662606568
MIN_TIMER_WAIT: 1593864
AVG_TIMER_WAIT: 17907891
MAX_TIMER_WAIT: 437977248
...
```


Each stage summary table has one or more grouping columns to indicate how the table aggregates events. Event names refer to names of event instruments in the setup_instruments table:
- events_stages_summary_by_account_by_event_name has EVENT_NAME, USER, and HOST columns. Each row summarizes events for a given account (user and host combination) and event name.
- events_stages_summary_by_host_by_event_name has EVENT_NAME and HOST columns. Each row summarizes events for a given host and event name.
- events_stages_summary_by_thread_by_event_name has THREAD_ID and EVENT_NAME columns. Each row summarizes events for a given thread and event name.
- events_stages_summary_by_user_by_event_name has EVENT_NAME and USER columns. Each row summarizes events for a given user and event name.
- events_stages_summary_global_by_event_name has an EVENT_NAME column. Each row summarizes events for a given event name.

Each stage summary table has these summary columns containing aggregated values: COUNT_STAR, SUM_TIMER_WAIT, MIN_TIMER_WAIT, AVG_TIMER_WAIT, and MAX_TIMER_WAIT. These columns are analogous to the columns of the same names in the wait event summary tables (see Section 29.12.20.1, "Wait Event Summary Tables"), except that the stage summary tables aggregate events from events_stages_current rather than events_waits_current.

The stage summary tables have these indexes:
- events_stages_summary_by_account_by_event_name:
- Primary key on (USER, HOST, EVENT_NAME)
- events_stages_summary_by_host_by_event_name:
- Primary key on (HOST, EVENT_NAME)
- events_stages_summary_by_thread_by_event_name:
- Primary key on (THREAD_ID, EVENT_NAME)
- events_stages_summary_by_user_by_event_name:
- Primary key on (USER, EVENT_NAME)
- events_stages_summary_global_by_event_name:
- Primary key on (EVENT_NAME)

TRUNCATE TABLE is permitted for stage summary tables. It has these effects:
- For summary tables not aggregated by account, host, or user, truncation resets the summary columns to zero rather than removing rows.
- For summary tables aggregated by account, host, or user, truncation removes rows for accounts, hosts, or users with no connections, and resets the summary columns to zero for the remaining rows.

In addition, each stage summary table that is aggregated by account, host, user, or thread is implicitly truncated by truncation of the connection table on which it depends, or truncation of
events_stages_summary_global_by_event_name. For details, see Section 29.12.8, "Performance Schema Connection Tables".

\subsection*{29.12.20.3 Statement Summary Tables}

The Performance Schema maintains tables for collecting current and recent statement events, and aggregates that information in summary tables. Section 29.12.6, "Performance Schema Statement Event Tables" describes the events on which statement summaries are based. See that discussion for information about the content of statement events, the current and historical statement event tables, and how to control statement event collection, which is partially disabled by default.

Example statement event summary information:
```
mysql> SELECT *
            FROM performance_schema.events_statements_summary_global_by_event_name\G
************************** 1. row ******************************
                                EVENT_NAME: statement/sql/select
                                COUNT_STAR: 54
                        SUM_TIMER_WAIT: 38860400000
                        MIN_TIMER_WAIT: 52400000
                        AVG_TIMER_WAIT: 719600000
                        MAX_TIMER_WAIT: 12631800000
                            SUM_LOCK_TIME: 88000000
                                SUM_ERRORS: 0
                            SUM_WARNINGS: 0
                SUM_ROWS_AFFECTED: 0
                            SUM_ROWS_SENT : 60
                SUM_ROWS_EXAMINED: 120
SUM_CREATED_TMP_DISK_TABLES: 0
        SUM_CREATED_TMP_TABLES: 21
            SUM_SELECT_FULL_JOIN: 16
    SUM_SELECT_FULL_RANGE_JOIN: 0
                    SUM_SELECT_RANGE: 0
        SUM_SELECT_RANGE_CHECK: 0
                        SUM_SELECT_SCAN: 41
            SUM_SORT_MERGE_PASSES: 0
                            SUM_SORT_RANGE: 0
                                    SUM_SORT_ROWS: 0
                            SUM_SORT_SCAN: 0
                SUM_NO_INDEX_USED: 22
        SUM_NO_GOOD_INDEX_USED: 0
                            SUM_CPU_TIME: 0
            MAX_CONTROLLED_MEMORY: 2028360
                    MAX_TOTAL_MEMORY: 2853429
                    COUNT_SECONDARY: 0
...
```


Each statement summary table has one or more grouping columns to indicate how the table aggregates events. Event names refer to names of event instruments in the setup_instruments table:
- events_statements_summary_by_account_by_event_name has EVENT_NAME, USER, and HOST columns. Each row summarizes events for a given account (user and host combination) and event name.
- events_statements_summary_by_digest has SCHEMA_NAME and DIGEST columns. Each row summarizes events per schema and digest value. (The DIGEST_TEXT column contains the corresponding normalized statement digest text, but is neither a grouping nor a summary column. The QUERY_SAMPLE_TEXT, QUERY_SAMPLE_SEEN, and QUERY_SAMPLE_TIMER_WAIT columns also are neither grouping nor summary columns; they support statement sampling.)

The maximum number of rows in the table is autosized at server startup. To set this maximum explicitly, set the performance_schema_digests_size system variable at server startup.
- events_statements_summary_by_host_by_event_name has EVENT_NAME and HOST columns. Each row summarizes events for a given host and event name.
- events_statements_summary_by_program has OBJECT_TYPE, OBJECT_SCHEMA, and OBJECT_NAME columns. Each row summarizes events for a given stored program (stored procedure or function, trigger, or event).
- events_statements_summary_by_thread_by_event_name has THREAD_ID and EVENT_NAME columns. Each row summarizes events for a given thread and event name.
- events_statements_summary_by_user_by_event_name has EVENT_NAME and USER columns. Each row summarizes events for a given user and event name.
- events_statements_summary_global_by_event_name has an EVENT_NAME column. Each row summarizes events for a given event name.
- prepared_statements_instances has an OBJECT_INSTANCE_BEGIN column. Each row summarizes events for a given prepared statement.

Each statement summary table has these summary columns containing aggregated values (with exceptions as noted):
- COUNT_STAR, SUM_TIMER_WAIT, MIN_TIMER_WAIT, AVG_TIMER_WAIT, MAX_TIMER_WAIT

These columns are analogous to the columns of the same names in the wait event summary tables (see Section 29.12.20.1, "Wait Event Summary Tables"), except that the statement summary tables aggregate events from events_statements_current rather than events_waits_current.

The prepared_statements_instances table does not have these columns.
- SUM_xxx

The aggregate of the corresponding $x x x$ column in the events_statements_current table. For example, the SUM_LOCK_TIME and SUM_ERRORS columns in statement summary tables are the aggregates of the LOCK_TIME and ERRORS columns in events_statements_current table.
- MAX_CONTROLLED_MEMORY

Reports the maximum amount of controlled memory used by a statement during execution.
- MAX_TOTAL_MEMORY

Reports the maximum amount of memory used by a statement during execution.
- COUNT_SECONDARY

The number of times a query was processed on the SECONDARY engine. For use with MySQL HeatWave Service and MySQL HeatWave, where the PRIMARY engine is InnoDB and the SECONDARY engine is MySQL HeatWave (RAPID). For MySQL Community Edition Server, MySQL Enterprise Edition Server (on-premise), and MySQL HeatWave Service without MySQL HeatWave, queries are always processed on the PRIMARY engine, which means the value is always 0 on these MySQL Servers.

The events_statements_summary_by_digest table has these additional summary columns:
- FIRST_SEEN, LAST_SEEN

Timestamps indicating when statements with the given digest value were first seen and most recently seen.
- QUANTILE_95: The 95th percentile of the statement latency, in picoseconds. This percentile is a high estimate, computed from the histogram data collected. In other words, for a given digest, 95\% of the statements measured have a latency lower than QUANTILE_95.

For access to the histogram data, use the tables described in Section 29.12.20.4, "Statement Histogram Summary Tables".
- QUANTILE_99: Similar to QUANTILE_95, but for the 99th percentile.
- QUANTILE_999: Similar to QUANTILE_95, but for the 99.9th percentile.

The events_statements_summary_by_digest table contains the following columns. These are neither grouping nor summary columns; they support statement sampling:
- QUERY_SAMPLE_TEXT

A sample SQL statement that produces the digest value in the row. This column enables applications to access, for a given digest value, a statement actually seen by the server that produces that digest. One use for this might be to run EXPLAIN on the statement to examine the execution plan for a representative statement associated with a frequently occurring digest.

When the QUERY_SAMPLE_TEXT column is assigned a value, the QUERY_SAMPLE_SEEN and QUERY_SAMPLE_TIMER_WAIT columns are assigned values as well.

The maximum space available for statement display is 1024 bytes by default. To change this value, set the performance_schema_max_sql_text_length system variable at server startup. (Changing this value affects columns in other Performance Schema tables as well. See Section 29.10, "Performance Schema Statement Digests and Sampling".)

For information about statement sampling, see Section 29.10, "Performance Schema Statement Digests and Sampling".
- QUERY_SAMPLE_SEEN

A timestamp indicating when the statement in the QUERY_SAMPLE_TEXT column was seen.
- QUERY_SAMPLE_TIMER_WAIT

The wait time for the sample statement in the QUERY_SAMPLE_TEXT column.
The events_statements_summary_by_program table has these additional summary columns:
- COUNT_STATEMENTS, SUM_STATEMENTS_WAIT, MIN_STATEMENTS_WAIT, AVG_STATEMENTS_WAIT, MAX_STATEMENTS_WAIT

Statistics about nested statements invoked during stored program execution.
The prepared_statements_instances table has these additional summary columns:
- COUNT_EXECUTE, SUM_TIMER_EXECUTE, MIN_TIMER_EXECUTE, AVG_TIMER_EXECUTE, MAX_TIMER_EXECUTE

Aggregated statistics for executions of the prepared statement.
The statement summary tables have these indexes:
- events_transactions_summary_by_account_by_event_name:
- Primary key on (USER, HOST, EVENT_NAME)
- events_statements_summary_by_digest:
- Primary key on (SCHEMA_NAME, DIGEST)
- events_transactions_summary_by_host_by_event_name:
- Primary key on (HOST, EVENT_NAME)
- events_statements_summary_by_program:
- Primary key on (OBJECT_TYPE, OBJECT_SCHEMA, OBJECT_NAME)
- events_statements_summary_by_thread_by_event_name:
- Primary key on (THREAD_ID, EVENT_NAME)
- events_transactions_summary_by_user_by_event_name:
- Primary key on (USER, EVENT_NAME)
- events_statements_summary_global_by_event_name:
- Primary key on (EVENT_NAME)

TRUNCATE TABLE is permitted for statement summary tables. It has these effects:
- For events_statements_summary_by_digest, it removes the rows.
- For other summary tables not aggregated by account, host, or user, truncation resets the summary columns to zero rather than removing rows.
- For other summary tables aggregated by account, host, or user, truncation removes rows for accounts, hosts, or users with no connections, and resets the summary columns to zero for the remaining rows.

In addition, each statement summary table that is aggregated by account, host, user, or thread is implicitly truncated by truncation of the connection table on which it depends, or truncation of events_statements_summary_global_by_event_name. For details, see Section 29.12.8, "Performance Schema Connection Tables".

In addition, truncating events_statements_summary_by_digest implicitly truncates events_statements_histogram_by_digest, and truncating events_statements_summary_global_by_event_name implicitly truncates events_statements_histogram_global.

\section*{Statement Digest Aggregation Rules}

If the statements_digest consumer is enabled, aggregation into events_statements_summary_by_digest occurs as follows when a statement completes. Aggregation is based on the DIGEST value computed for the statement.
- If a events_statements_summary_by_digest row already exists with the digest value for the statement that just completed, statistics for the statement are aggregated to that row. The LAST_SEEN column is updated to the current time.
- If no row has the digest value for the statement that just completed, and the table is not full, a new row is created for the statement. The FIRST_SEEN and LAST_SEEN columns are initialized with the current time.
- If no row has the statement digest value for the statement that just completed, and the table is full, the statistics for the statement that just completed are added to a special "catch-all" row with DIGEST = NULL, which is created if necessary. If the row is created, the FIRST_SEEN and LAST_SEEN columns are initialized with the current time. Otherwise, the LAST_SEEN column is updated with the current time.

The row with DIGEST = NULL is maintained because Performance Schema tables have a maximum size due to memory constraints. The DIGEST = NULL row permits digests that do not match other rows to be counted even if the summary table is full, using a common "other" bucket. This row helps you estimate whether the digest summary is representative:
- A DIGEST = NULL row that has a COUNT_STAR value that represents $5 \%$ of all digests shows that the digest summary table is very representative; the other rows cover $95 \%$ of the statements seen.
- A DIGEST = NULL row that has a COUNT_STAR value that represents $50 \%$ of all digests shows that the digest summary table is not very representative; the other rows cover only half the statements seen. Most likely the DBA should increase the maximum table size so that more of the rows counted in the DIGEST = NULL row would be counted using more specific rows instead. By default, the table is autosized, but if this size is too small, set the performance_schema_digests_size system variable to a larger value at server startup.

\section*{Stored Program Instrumentation Behavior}

For stored program types for which instrumentation is enabled in the setup_objects table, events_statements_summary_by_program maintains statistics for stored programs as follows:
- A row is added for an object when it is first used in the server.
- The row for an object is removed when the object is dropped.
- Statistics are aggregated in the row for an object as it executes.

See also Section 29.4.3, "Event Pre-Filtering".

\subsection*{29.12.20.4 Statement Histogram Summary Tables}

The Performance Schema maintains statement event summary tables that contain information about minimum, maximum, and average statement latency (see Section 29.12.20.3, "Statement Summary Tables"). Those tables permit high-level assessment of system performance. To permit assessment at a more fine-grained level, the Performance Schema also collects histogram data for statement latencies. These histograms provide additional insight into latency distributions.

Section 29.12.6, "Performance Schema Statement Event Tables" describes the events on which statement summaries are based. See that discussion for information about the content of statement events, the current and historical statement event tables, and how to control statement event collection, which is partially disabled by default.

Example statement histogram information:
```
mysql> SELECT *
        FROM performance_schema.events_statements_histogram_by_digest
        WHERE SCHEMA_NAME = 'mydb' AND DIGEST = 'bb3f69453119b2d7b3ae40673a9d4c7c'
        AND COUNT_BUCKET > 0 ORDER BY BUCKET_NUMBER\G
************************** 1. rOW ******************************
                SCHEMA_NAME: mydb
                    DIGEST: bb3f69453119b2d7b3ae40673a9d4c7c
            BUCKET_NUMBER: 42
        BUCKET_TIMER_LOW: 66069344
    BUCKET_TIMER_HIGH: 69183097
                COUNT_BUCKET: 1
COUNT_BUCKET_AND_LOWER: 1
        BUCKET_QUANTILE: 0.058824
************************** 2. row
                SCHEMA_NAME: mydb
                    DIGEST: bb3f69453119b2d7b3ae40673a9d4c7c
            BUCKET_NUMBER: 43
        BUCKET_TIMER_LOW: 69183097
    BUCKET_TIMER_HIGH: 72443596
                COUNT_BUCKET: 1
COUNT_BUCKET_AND_LOWER: 2
        BUCKET_QUANTILE: 0.117647
************************** 3. row *****************************************
                SCHEMA_NAME: mydb
                    DIGEST: bb3f69453119b2d7b3ae40673a9d4c7c
            BUCKET_NUMBER: 44
    BUCKET_TIMER_LOW: 72443596
    BUCKET_TIMER_HIGH: 75857757
                COUNT_BUCKET: 2
COUNT_BUCKET_AND_LOWER: 4
        BUCKET_QUANTILE: 0.235294
*************************** 4 row *****************************************
```

```
                SCHEMA_NAME: mydb
                    DIGEST: bb3f69453119b2d7b3ae40673a9d4c7c
            BUCKET_NUMBER: 45
        BUCKET_TIMER_LOW: 75857757
    BUCKET_TIMER_HIGH: 79432823
                COUNT_BUCKET: 6
COUNT_BUCKET_AND_LOWER: 10
        BUCKET_QUANTILE: 0.625000
...
```


For example, in row 3 , these values indicate that $23.52 \%$ of queries run in under 75.86 microseconds:
```
BUCKET_TIMER_HIGH: 75857757
    BUCKET_QUANTILE: 0.235294
```


In row 4, these values indicate that 62.50\% of queries run in under 79.44 microseconds:
```
BUCKET_TIMER_HIGH: 79432823
    BUCKET_QUANTILE: 0.625000
```


Each statement histogram summary table has one or more grouping columns to indicate how the table aggregates events:
- events_statements_histogram_by_digest has SCHEMA_NAME, DIGEST, and BUCKET_NUMBER columns:
- The SCHEMA_NAME and DIGEST columns identify a statement digest row in the events_statements_summary_by_digest table.
- The events_statements_histogram_by_digest rows with the same SCHEMA_NAME and DIGEST values comprise the histogram for that schema/digest combination.
- Within a given histogram, the BUCKET_NUMBER column indicates the bucket number.
- events_statements_histogram_global has a BUCKET_NUMBER column. This table summarizes latencies globally across schema name and digest values, using a single histogram. The BUCKET_NUMBER column indicates the bucket number within this global histogram.

A histogram consists of $N$ buckets, where each row represents one bucket, with the bucket number indicated by the BUCKET_NUMBER column. Bucket numbers begin with 0 .

Each statement histogram summary table has these summary columns containing aggregated values:
- BUCKET_TIMER_LOW, BUCKET_TIMER_HIGH

A bucket counts statements that have a latency, in picoseconds, measured between BUCKET_TIMER_LOW and BUCKET_TIMER_HIGH:
- The value of BUCKET_TIMER_LOW for the first bucket $($ BUCKET_NUMBER $=0)$ is 0 .
- The value of BUCKET_TIMER_LOW for a bucket (BUCKET_NUMBER $=k$ ) is the same as BUCKET_TIMER_HIGH for the previous bucket (BUCKET_NUMBER $=k-1$ )
- The last bucket is a catchall for statements that have a latency exceeding previous buckets in the histogram.
- COUNT_BUCKET

The number of statements measured with a latency in the interval from BUCKET_TIMER_LOW up to but not including BUCKET_TIMER_HIGH.
- COUNT_BUCKET_AND_LOWER

The number of statements measured with a latency in the interval from 0 up to but not including BUCKET_TIMER_HIGH.
- BUCKET_QUANTILE

The proportion of statements that fall into this or a lower bucket. This proportion corresponds by definition to COUNT_BUCKET_AND_LOWER / SUM(COUNT_BUCKET) and is displayed as a convenience column.

The statement histogram summary tables have these indexes:
- events_statements_histogram_by_digest:
- Unique index on (SCHEMA_NAME, DIGEST, BUCKET_NUMBER)
- events_statements_histogram_global:
- Primary key on (BUCKET_NUMBER)

TRUNCATE TABLE is permitted for statement histogram summary tables. Truncation sets the COUNT_BUCKET and COUNT_BUCKET_AND_LOWER columns to 0 .

In addition, truncating events_statements_summary_by_digest implicitly truncates events_statements_histogram_by_digest, and truncating events_statements_summary_global_by_event_name implicitly truncates events_statements_histogram_global.

\subsection*{29.12.20.5 Transaction Summary Tables}

The Performance Schema maintains tables for collecting current and recent transaction events, and aggregates that information in summary tables. Section 29.12.7, "Performance Schema Transaction Tables" describes the events on which transaction summaries are based. See that discussion for information about the content of transaction events, the current and historical transaction event tables, and how to control transaction event collection, which is disabled by default.

Example transaction event summary information:
```
mysql> SELECT *
            FROM performance_schema.events_transactions_summary_global_by_event_name
                LIMIT 1\G
                    ***************** 1. row
                    EVENT_NAME: transaction
                    COUNT_STAR: 5
            SUM_TIMER_WAIT: 19550092000
            MIN_TIMER_WAIT: 2954148000
            AVG_TIMER_WAIT: 3910018000
            MAX_TIMER_WAIT: 5486275000
        COUNT_READ_WRITE: 5
SUM_TIMER_READ_WRITE: 19550092000
MIN_TIMER_READ_WRITE: 2954148000
AVG_TIMER_READ_WRITE: 3910018000
MAX_TIMER_READ_WRITE: 5486275000
        COUNT_READ_ONLY: 0
    SUM_TIMER_READ_ONLY: 0
    MIN_TIMER_READ_ONLY: 0
    AVG_TIMER_READ_ONLY: 0
    MAX_TIMER_READ_ONLY: 0
```


Each transaction summary table has one or more grouping columns to indicate how the table aggregates events. Event names refer to names of event instruments in the setup_instruments table:
- events_transactions_summary_by_account_by_event_name has USER, HOST, and EVENT_NAME columns. Each row summarizes events for a given account (user and host combination) and event name.
- events_transactions_summary_by_host_by_event_name has HOST and EVENT_NAME columns. Each row summarizes events for a given host and event name.
- events_transactions_summary_by_thread_by_event_name has THREAD_ID and EVENT_NAME columns. Each row summarizes events for a given thread and event name.
- events_transactions_summary_by_user_by_event_name has USER and EVENT_NAME columns. Each row summarizes events for a given user and event name.
- events_transactions_summary_global_by_event_name has an EVENT_NAME column. Each row summarizes events for a given event name.

Each transaction summary table has these summary columns containing aggregated values:
- COUNT_STAR, SUM_TIMER_WAIT, MIN_TIMER_WAIT, AVG_TIMER_WAIT, MAX_TIMER_WAIT

These columns are analogous to the columns of the same names in the wait event summary tables (see Section 29.12.20.1, "Wait Event Summary Tables"), except that the transaction summary tables aggregate events from events_transactions_current rather than events_waits_current. These columns summarize read-write and read-only transactions.
- COUNT_READ_WRITE, SUM_TIMER_READ_WRITE, MIN_TIMER_READ_WRITE, AVG_TIMER_READ_WRITE, MAX_TIMER_READ_WRITE

These are similar to the COUNT_STAR and $x x x \_$TIMER_WAIT columns, but summarize read-write transactions only. The transaction access mode specifies whether transactions operate in read/write or read-only mode.
- COUNT_READ_ONLY, SUM_TIMER_READ_ONLY, MIN_TIMER_READ_ONLY, AVG_TIMER_READ_ONLY, MAX_TIMER_READ_ONLY

These are similar to the COUNT_STAR and $x x x \_$TIMER_WAIT columns, but summarize read-only transactions only. The transaction access mode specifies whether transactions operate in read/write or read-only mode.

The transaction summary tables have these indexes:
- events_transactions_summary_by_account_by_event_name:
- Primary key on (USER, HOST, EVENT_NAME)
- events_transactions_summary_by_host_by_event_name:
- Primary key on (HOST, EVENT_NAME)
- events_transactions_summary_by_thread_by_event_name:
- Primary key on (THREAD_ID, EVENT_NAME)
- events_transactions_summary_by_user_by_event_name:
- Primary key on (USER, EVENT_NAME)
- events_transactions_summary_global_by_event_name:
- Primary key on (EVENT_NAME)

TRUNCATE TABLE is permitted for transaction summary tables. It has these effects:
- For summary tables not aggregated by account, host, or user, truncation resets the summary columns to zero rather than removing rows.
- For summary tables aggregated by account, host, or user, truncation removes rows for accounts, hosts, or users with no connections, and resets the summary columns to zero for the remaining rows.

In addition, each transaction summary table that is aggregated by account, host, user, or thread is implicitly truncated by truncation of the connection table on which it depends, or truncation of
events_transactions_summary_global_by_event_name. For details, see Section 29.12.8, "Performance Schema Connection Tables".

\section*{Transaction Aggregation Rules}

Transaction event collection occurs without regard to isolation level, access mode, or autocommit mode.

Transaction event collection occurs for all non-aborted transactions initiated by the server, including empty transactions.

Read-write transactions are generally more resource intensive than read-only transactions, therefore transaction summary tables include separate aggregate columns for read-write and read-only transactions.

Resource requirements may also vary with transaction isolation level. However, presuming that only one isolation level would be used per server, aggregation by isolation level is not provided.

\subsection*{29.12.20.6 Object Wait Summary Table}

The Performance Schema maintains the objects_summary_global_by_type table for aggregating object wait events.

Example object wait event summary information:
```
mysql> SELECT * FROM performance_schema.objects_summary_global_by_type\G
...
************************* 3. row ******************************************
    OBJECT_TYPE: TABLE
    OBJECT_SCHEMA: test
        OBJECT_NAME: t
            COUNT_STAR: 3
SUM_TIMER_WAIT: 263126976
MIN_TIMER_WAIT: 1522272
AVG_TIMER_WAIT: 87708678
MAX_TIMER_WAIT: 258428280
...
        *********************** 10. row
        OBJECT_TYPE: TABLE
    OBJECT_SCHEMA: mysql
        OBJECT_NAME: user
            COUNT_STAR: 14
SUM_TIMER_WAIT: 365567592
MIN_TIMER_WAIT: 1141704
AVG_TIMER_WAIT: 26111769
MAX_TIMER_WAIT: 334783032
...
```


The objects_summary_global_by_type table has these grouping columns to indicate how the table aggregates events: OBJECT_TYPE, OBJECT_SCHEMA, and OBJECT_NAME. Each row summarizes events for the given object.
objects_summary_global_by_type has the same summary columns as the events_waits_summary_by_xxx tables. See Section 29.12.20.1, "Wait Event Summary Tables".

The objects_summary_global_by_type table has these indexes:
- Primary key on (OBJECT_TYPE, OBJECT_SCHEMA, OBJECT_NAME)

TRUNCATE TABLE is permitted for the object summary table. It resets the summary columns to zero rather than removing rows.

\subsection*{29.12.20.7 File I/O Summary Tables}

The Performance Schema maintains file I/O summary tables that aggregate information about I/O operations.

Example file I/O event summary information:
```
mysql> SELECT * FROM performance_schema.file_summary_by_event_name\G
...
************************* 2. row *******************************
            EVENT_NAME: wait/io/file/sql/binlog
            COUNT_STAR: 31
        SUM_TIMER_WAIT: 8243784888
        MIN_TIMER_WAIT: 0
        AVG_TIMER_WAIT: 265928484
        MAX_TIMER_WAIT: 6490658832
...
mysql> SELECT * FROM performance_schema.file_summary_by_instance\G
...
************************** 2. row *****************************************
            FILE_NAME: /var/mysql/share/english/errmsg.sys
            EVENT_NAME: wait/io/file/sql/ERRMSG
            EVENT_NAME: wait/io/file/sql/ERRMSG
    OBJECT_INSTANCE_BEGIN: 4686193384
            COUNT_STAR: 5
        SUM_TIMER_WAIT: 13990154448
        MIN_TIMER_WAIT: 26349624
        AVG_TIMER_WAIT: 2798030607
        MAX_TIMER_WAIT: 8150662536
...
```


Each file I/O summary table has one or more grouping columns to indicate how the table aggregates events. Event names refer to names of event instruments in the setup_instruments table:
- file_summary_by_event_name has an EVENT_NAME column. Each row summarizes events for a given event name.
- file_summary_by_instance has FILE_NAME, EVENT_NAME, and OBJECT_INSTANCE_BEGIN columns. Each row summarizes events for a given file and event name.

Each file I/O summary table has the following summary columns containing aggregated values. Some columns are more general and have values that are the same as the sum of the values of more finegrained columns. In this way, aggregations at higher levels are available directly without the need for user-defined views that sum lower-level columns.
- COUNT_STAR, SUM_TIMER_WAIT, MIN_TIMER_WAIT, AVG_TIMER_WAIT, MAX_TIMER_WAIT These columns aggregate all I/O operations.
- COUNT_READ, SUM_TIMER_READ, MIN_TIMER_READ, AVG_TIMER_READ, MAX_TIMER_READ, SUM_NUMBER_OF_BYTES_READ These columns aggregate all read operations, including FGETS, FGETC, FREAD, and READ.
- COUNT_WRITE, SUM_TIMER_WRITE, MIN_TIMER_WRITE, AVG_TIMER_WRITE, MAX_TIMER_WRITE, SUM_NUMBER_OF_BYTES_WRITE

These columns aggregate all write operations, including FPUTS, FPUTC, FPRINTF, VFPRINTF, FWRITE, and PWRITE.
- COUNT_MISC, SUM_TIMER_MISC, MIN_TIMER_MISC, AVG_TIMER_MISC, MAX_TIMER_MISC

These columns aggregate all other I/O operations, including CREATE, DELETE, OPEN, CLOSE, STREAM_OPEN, STREAM_CLOSE, SEEK, TELL, FLUSH, STAT, FSTAT, CHSIZE, RENAME, and SYNC. There are no byte counts for these operations.

The file I/O summary tables have these indexes:
- file_summary_by_event_name:
- Primary key on (EVENT_NAME)
- file_summary_by_instance:
- Primary key on (OBJECT_INSTANCE_BEGIN)
- Index on (FILE_NAME)
- Index on (EVENT_NAME)

TRUNCATE TABLE is permitted for file I/O summary tables. It resets the summary columns to zero rather than removing rows.

The MySQL server uses several techniques to avoid I/O operations by caching information read from files, so it is possible that statements you might expect to result in I/O events do not do so. You may be able to ensure that I/O does occur by flushing caches or restarting the server to reset its state.

\subsection*{29.12.20.8 Table I/O and Lock Wait Summary Tables}

The following sections describe the table I/O and lock wait summary tables:
- table_io_waits_summary_by_index_usage: Table I/O waits per index
- table_io_waits_summary_by_table: Table I/O waits per table
- table_lock_waits_summary_by_table: Table lock waits per table

\section*{The table_io_waits_summary_by_table Table}

The table_io_waits_summary_by_table table aggregates all table I/O wait events, as generated by the wait/io/table/sql/handler instrument. The grouping is by table.

The table_io_waits_summary_by_table table has these grouping columns to indicate how the table aggregates events: OBJECT_TYPE, OBJECT_SCHEMA, and OBJECT_NAME. These columns have the same meaning as in the events_waits_current table. They identify the table to which the row applies.
table_io_waits_summary_by_table has the following summary columns containing aggregated values. As indicated in the column descriptions, some columns are more general and have values that are the same as the sum of the values of more fine-grained columns. For example, columns that aggregate all writes hold the sum of the corresponding columns that aggregate inserts, updates, and deletes. In this way, aggregations at higher levels are available directly without the need for userdefined views that sum lower-level columns.
- COUNT_STAR, SUM_TIMER_WAIT, MIN_TIMER_WAIT, AVG_TIMER_WAIT, MAX_TIMER_WAIT

These columns aggregate all I/O operations. They are the same as the sum of the corresponding $x x x \_\mathrm{READ}$ and $x x x \_$WRITE columns.
- COUNT_READ, SUM_TIMER_READ, MIN_TIMER_READ, AVG_TIMER_READ, MAX_TIMER_READ

These columns aggregate all read operations. They are the same as the sum of the corresponding $x x x \_$FETCH columns.
- COUNT_WRITE, SUM_TIMER_WRITE, MIN_TIMER_WRITE, AVG_TIMER_WRITE, MAX_TIMER_WRITE

These columns aggregate all write operations. They are the same as the sum of the corresponding $x x x \_$INSERT, $x x x \_$UPDATE, and $x x x \_$DELETE columns.
- COUNT_FETCH, SUM_TIMER_FETCH, MIN_TIMER_FETCH, AVG_TIMER_FETCH, MAX_TIMER_FETCH

These columns aggregate all fetch operations.
- COUNT_INSERT, SUM_TIMER_INSERT, MIN_TIMER_INSERT, AVG_TIMER_INSERT, MAX_TIMER_INSERT

These columns aggregate all insert operations.
- COUNT_UPDATE, SUM_TIMER_UPDATE, MIN_TIMER_UPDATE, AVG_TIMER_UPDATE, MAX_TIMER_UPDATE

These columns aggregate all update operations.
- COUNT_DELETE, SUM_TIMER_DELETE, MIN_TIMER_DELETE, AVG_TIMER_DELETE, MAX_TIMER_DELETE

These columns aggregate all delete operations.
The table_io_waits_summary_by_table table has these indexes:
- Unique index on (OBJECT_TYPE, OBJECT_SCHEMA, OBJECT_NAME)

TRUNCATE TABLE is permitted for table I/O summary tables. It resets the summary columns to zero rather than removing rows. Truncating this table also truncates the table_io_waits_summary_by_index_usage table.

\section*{The table_io_waits_summary_by_index_usage Table}

The table_io_waits_summary_by_index_usage table aggregates all table index I/O wait events, as generated by the wait/io/table/sql/handler instrument. The grouping is by table index.

The columns of table_io_waits_summary_by_index_usage are nearly identical to table_io_waits_summary_by_table. The only difference is the additional group column, INDEX_NAME, which corresponds to the name of the index that was used when the table I/O wait event was recorded:
- A value of PRIMARY indicates that table I/O used the primary index.
- A value of NULL means that table I/O used no index.
- Inserts are counted against INDEX_NAME = NULL.

The table_io_waits_summary_by_index_usage table has these indexes:
- Unique index on (OBJECT_TYPE, OBJECT_SCHEMA, OBJECT_NAME, INDEX_NAME)

TRUNCATE TABLE is permitted for table I/O summary tables. It resets the summary columns to zero rather than removing rows. This table is also truncated by truncation of the table_io_waits_summary_by_table table. A DDL operation that changes the index structure of a table may cause the per-index statistics to be reset.

\section*{The table_lock_waits_summary_by_table Table}

The table_lock_waits_summary_by_table table aggregates all table lock wait events, as generated by the wait/lock/table/sql/handler instrument. The grouping is by table.

This table contains information about internal and external locks:
- An internal lock corresponds to a lock in the SQL layer. This is currently implemented by a call to thr_lock ( ). In event rows, these locks are distinguished by the OPERATION column, which has one of these values:
```
read normal
read with shared locks
read high priority
```

```
read no insert
write allow write
write concurrent insert
write delayed
write low priority
write normal
```

- An external lock corresponds to a lock in the storage engine layer. This is currently implemented by a call to handler: :external_lock( ). In event rows, these locks are distinguished by the OPERATION column, which has one of these values:
```
read external
write external
```


The table_lock_waits_summary_by_table table has these grouping columns to indicate how the table aggregates events: OBJECT_TYPE, OBJECT_SCHEMA, and OBJECT_NAME. These columns have the same meaning as in the events_waits_current table. They identify the table to which the row applies.
table_lock_waits_summary_by_table has the following summary columns containing aggregated values. As indicated in the column descriptions, some columns are more general and have values that are the same as the sum of the values of more fine-grained columns. For example, columns that aggregate all locks hold the sum of the corresponding columns that aggregate read and write locks. In this way, aggregations at higher levels are available directly without the need for user-defined views that sum lower-level columns.
- COUNT_STAR, SUM_TIMER_WAIT, MIN_TIMER_WAIT, AVG_TIMER_WAIT, MAX_TIMER_WAIT

These columns aggregate all lock operations. They are the same as the sum of the corresponding $x x x \_$READ and $x x x \_$WRITE columns.
- COUNT_READ, SUM_TIMER_READ, MIN_TIMER_READ, AVG_TIMER_READ, MAX_TIMER_READ

These columns aggregate all read-lock operations. They are the same as the sum of the corresponding $x x x$ _READ_NORMAL, $x x x$ _READ_WITH_SHARED_LOCKS, $x x x \_$READ_HIGH_PRIORITY, and $x x x \_$READ_NO_INSERT columns.
- COUNT_WRITE, SUM_TIMER_WRITE, MIN_TIMER_WRITE, AVG_TIMER_WRITE, MAX_TIMER_WRITE

These columns aggregate all write-lock operations. They are the same as the sum of the corresponding $x x x \_$WRITE_ALLOW_WRITE, $x x x \_$WRITE_CONCURRENT_INSERT, $x x x \_$WRITE_LOW_PRIORITY, and $x x x \_$WRITE_NORMAL columns.
- COUNT_READ_NORMAL, SUM_TIMER_READ_NORMAL, MIN_TIMER_READ_NORMAL, AVG_TIMER_READ_NORMAL, MAX_TIMER_READ_NORMAL

These columns aggregate internal read locks.
- COUNT_READ_WITH_SHARED_LOCKS, SUM_TIMER_READ_WITH_SHARED_LOCKS, MIN_TIMER_READ_WITH_SHARED_LOCKS, AVG_TIMER_READ_WITH_SHARED_LOCKS, MAX_TIMER_READ_WITH_SHARED_LOCKS

These columns aggregate internal read locks.
- COUNT_READ_HIGH_PRIORITY, SUM_TIMER_READ_HIGH_PRIORITY, MIN_TIMER_READ_HIGH_PRIORITY, AVG_TIMER_READ_HIGH_PRIORITY, MAX_TIMER_READ_HIGH_PRIORITY

These columns aggregate internal read locks.
- COUNT_READ_NO_INSERT, SUM_TIMER_READ_NO_INSERT, MIN_TIMER_READ_NO_INSERT, AVG_TIMER_READ_NO_INSERT, MAX_TIMER_READ_NO_INSERT

These columns aggregate internal read locks.
- COUNT_READ_EXTERNAL, SUM_TIMER_READ_EXTERNAL, MIN_TIMER_READ_EXTERNAL, AVG_TIMER_READ_EXTERNAL, MAX_TIMER_READ_EXTERNAL

These columns aggregate external read locks.
- COUNT_WRITE_ALLOW_WRITE, SUM_TIMER_WRITE_ALLOW_WRITE, MIN_TIMER_WRITE_ALLOW_WRITE, AVG_TIMER_WRITE_ALLOW_WRITE, MAX_TIMER_WRITE_ALLOW_WRITE

These columns aggregate internal write locks.
- COUNT_WRITE_CONCURRENT_INSERT, SUM_TIMER_WRITE_CONCURRENT_INSERT, MIN_TIMER_WRITE_CONCURRENT_INSERT, AVG_TIMER_WRITE_CONCURRENT_INSERT, MAX_TIMER_WRITE_CONCURRENT_INSERT

These columns aggregate internal write locks.
- COUNT_WRITE_LOW_PRIORITY, SUM_TIMER_WRITE_LOW_PRIORITY, MIN_TIMER_WRITE_LOW_PRIORITY, AVG_TIMER_WRITE_LOW_PRIORITY, MAX_TIMER_WRITE_LOW_PRIORITY

These columns aggregate internal write locks.
- COUNT_WRITE_NORMAL, SUM_TIMER_WRITE_NORMAL, MIN_TIMER_WRITE_NORMAL, AVG_TIMER_WRITE_NORMAL, MAX_TIMER_WRITE_NORMAL

These columns aggregate internal write locks.
- COUNT_WRITE_EXTERNAL, SUM_TIMER_WRITE_EXTERNAL, MIN_TIMER_WRITE_EXTERNAL, AVG_TIMER_WRITE_EXTERNAL, MAX_TIMER_WRITE_EXTERNAL

These columns aggregate external write locks.
The table_lock_waits_summary_by_table table has these indexes:
- Unique index on (OBJECT_TYPE, OBJECT_SCHEMA, OBJECT_NAME)

TRUNCATE TABLE is permitted for table lock summary tables. It resets the summary columns to zero rather than removing rows.

\subsection*{29.12.20.9 Socket Summary Tables}

These socket summary tables aggregate timer and byte count information for socket operations:
- socket_summary_by_event_name: Aggregate timer and byte count statistics generated by the wait/io/socket/* instruments for all socket I/O operations, per socket instrument.
- socket_summary_by_instance: Aggregate timer and byte count statistics generated by the wait/io/socket/* instruments for all socket I/O operations, per socket instance. When a connection terminates, the row in socket_summary_by_instance corresponding to it is deleted.

The socket summary tables do not aggregate waits generated by idle events while sockets are waiting for the next request from the client. For idle event aggregations, use the wait-event summary tables; see Section 29.12.20.1, "Wait Event Summary Tables".

Each socket summary table has one or more grouping columns to indicate how the table aggregates events. Event names refer to names of event instruments in the setup_instruments table:
- socket_summary_by_event_name has an EVENT_NAME column. Each row summarizes events for a given event name.
- socket_summary_by_instance has an OBJECT_INSTANCE_BEGIN column. Each row summarizes events for a given object.

Each socket summary table has these summary columns containing aggregated values:
- COUNT_STAR, SUM_TIMER_WAIT, MIN_TIMER_WAIT, AVG_TIMER_WAIT, MAX_TIMER_WAIT These columns aggregate all operations.
- COUNT_READ, SUM_TIMER_READ, MIN_TIMER_READ, AVG_TIMER_READ, MAX_TIMER_READ, SUM_NUMBER_OF_BYTES_READ

These columns aggregate all receive operations (RECV, RECVFROM, and RECVMSG).
- COUNT_WRITE, SUM_TIMER_WRITE, MIN_TIMER_WRITE, AVG_TIMER_WRITE, MAX_TIMER_WRITE, SUM_NUMBER_OF_BYTES_WRITE

These columns aggregate all send operations (SEND, SENDTO, and SENDMSG).
- COUNT_MISC, SUM_TIMER_MISC, MIN_TIMER_MISC, AVG_TIMER_MISC, MAX_TIMER_MISC

These columns aggregate all other socket operations, such as CONNECT, LISTEN, ACCEPT, CLOSE, and SHUTDOWN. There are no byte counts for these operations.

The socket_summary_by_instance table also has an EVENT_NAME column that indicates the class of the socket: client_connection, server_tcpip_socket, server_unix_socket. This column can be grouped on to isolate, for example, client activity from that of the server listening sockets.

The socket summary tables have these indexes:
- socket_summary_by_event_name:
- Primary key on (EVENT_NAME)
- socket_summary_by_instance:
- Primary key on (OBJECT_INSTANCE_BEGIN)
- Index on (EVENT_NAME)

TRUNCATE TABLE is permitted for socket summary tables. Except for events_statements_summary_by_digest, it resets the summary columns to zero rather than removing rows.

\subsection*{29.12.20.10 Memory Summary Tables}

The Performance Schema instruments memory usage and aggregates memory usage statistics, detailed by these factors:
- Type of memory used (various caches, internal buffers, and so forth)
- Thread, account, user, host indirectly performing the memory operation

The Performance Schema instruments the following aspects of memory use
- Memory sizes used
- Operation counts
- Low and high water marks

Memory sizes help to understand or tune the memory consumption of the server.

Operation counts help to understand or tune the overall pressure the server is putting on the memory allocator, which has an impact on performance. Allocating a single byte one million times is not the same as allocating one million bytes a single time; tracking both sizes and counts can expose the difference.

Low and high water marks are critical to detect workload spikes, overall workload stability, and possible memory leaks.

Memory summary tables do not contain timing information because memory events are not timed.
For information about collecting memory usage data, see Memory Instrumentation Behavior.
Example memory event summary information:
```
mysql> SELECT *
        FROM performance_schema.memory_summary_global_by_event_name
        WHERE EVENT_NAME = 'memory/sql/TABLE'\G
************************** 1. rOW ******************************
                    EVENT_NAME: memory/sql/TABLE
                COUNT_ALLOC: 1381
                    COUNT_FREE: 924
    SUM_NUMBER_OF_BYTES_ALLOC: 2059873
        SUM_NUMBER_OF_BYTES_FREE: 1407432
                    LOW_COUNT_USED: 0
                CURRENT_COUNT_USED: 457
                    HIGH_COUNT_USED: 461
        LOW_NUMBER_OF_BYTES_USED: 0
CURRENT_NUMBER_OF_BYTES_USED: 652441
    HIGH_NUMBER_OF_BYTES_USED: 669269
```


Each memory summary table has one or more grouping columns to indicate how the table aggregates events. Event names refer to names of event instruments in the setup_instruments table:
- memory_summary_by_account_by_event_name has USER, HOST, and EVENT_NAME columns. Each row summarizes events for a given account (user and host combination) and event name.
- memory_summary_by_host_by_event_name has HOST and EVENT_NAME columns. Each row summarizes events for a given host and event name.
- memory_summary_by_thread_by_event_name has THREAD_ID and EVENT_NAME columns. Each row summarizes events for a given thread and event name.
- memory_summary_by_user_by_event_name has USER and EVENT_NAME columns. Each row summarizes events for a given user and event name.
- memory_summary_global_by_event_name has an EVENT_NAME column. Each row summarizes events for a given event name.

Each memory summary table has these summary columns containing aggregated values:
- COUNT_ALLOC, COUNT_FREE

The aggregated numbers of calls to memory-allocation and memory-free functions.
- SUM_NUMBER_OF_BYTES_ALLOC, SUM_NUMBER_OF_BYTES_FREE

The aggregated sizes of allocated and freed memory blocks.
- CURRENT_COUNT_USED

The aggregated number of currently allocated blocks that have not been freed yet. This is a convenience column, equal to COUNT_ALLOC - COUNT_FREE.
- CURRENT_NUMBER_OF_BYTES_USED

The aggregated size of currently allocated memory blocks that have not been freed yet. This is a convenience column, equal to SUM_NUMBER_OF_BYTES_ALLOC - SUM_NUMBER_OF_BYTES_FREE.
- LOW_COUNT_USED, HIGH_COUNT_USED

The low and high water marks corresponding to the CURRENT_COUNT_USED column.
- LOW_NUMBER_OF_BYTES_USED, HIGH_NUMBER_OF_BYTES_USED

The low and high water marks corresponding to the CURRENT_NUMBER_OF_BYTES_USED column.
The memory summary tables have these indexes:
- memory_summary_by_account_by_event_name:
- Primary key on (USER, HOST, EVENT_NAME)
- memory_summary_by_host_by_event_name:
- Primary key on (HOST, EVENT_NAME)
- memory_summary_by_thread_by_event_name:
- Primary key on (THREAD_ID, EVENT_NAME)
- memory_summary_by_user_by_event_name:
- Primary key on (USER, EVENT_NAME)
- memory_summary_global_by_event_name:
- Primary key on (EVENT_NAME)

TRUNCATE TABLE is permitted for memory summary tables. It has these effects:
- In general, truncation resets the baseline for statistics, but does not change the server state. That is, truncating a memory table does not free memory.
- COUNT_ALLOC and COUNT_FREE are reset to a new baseline, by reducing each counter by the same value.
- Likewise, SUM_NUMBER_OF_BYTES_ALLOC and SUM_NUMBER_OF_BYTES_FREE are reset to a new baseline.
- LOW_COUNT_USED and HIGH_COUNT_USED are reset to CURRENT_COUNT_USED.
- LOW_NUMBER_OF_BYTES_USED and HIGH_NUMBER_OF_BYTES_USED are reset to CURRENT_NUMBER_OF_BYTES_USED.

In addition, each memory summary table that is aggregated by account, host, user, or thread is implicitly truncated by truncation of the connection table on which it depends, or truncation of memory_summary_global_by_event_name. For details, see Section 29.12.8, "Performance Schema Connection Tables".

\section*{Memory Instrumentation Behavior}

Memory instruments are listed in the setup_instruments table and have names of the form memory/code_area/instrument_name. Memory instrumentation is enabled by default.

Instruments named with the prefix memory/performance_schema/ expose how much memory is allocated for internal buffers in the Performance Schema itself. The memory/performance_schema/
instruments are built in, always enabled, and cannot be disabled at startup or runtime. Built-in memory instruments are displayed only in the memory_summary_global_by_event_name table.

To control memory instrumentation state at server startup, use lines like these in your my.cnf file:
- Enable:
```
[mysqld]
performance-schema-instrument='memory/%=ON'
```

- Disable:
```
[mysqld]
performance-schema-instrument='memory/%=0FF'
```


To control memory instrumentation state at runtime, update the ENABLED column of the relevant instruments in the setup_instruments table:
- Enable:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES'
WHERE NAME LIKE 'memory/%';
```

- Disable:
```
UPDATE performance_schema.setup_instruments
SET ENABLED = 'NO'
WHERE NAME LIKE 'memory/%';
```


For memory instruments, the TIMED column in setup_instruments is ignored because memory operations are not timed.

When a thread in the server executes a memory allocation that has been instrumented, these rules apply:
- If the thread is not instrumented or the memory instrument is not enabled, the memory block allocated is not instrumented.
- Otherwise (that is, both the thread and the instrument are enabled), the memory block allocated is instrumented.

For deallocation, these rules apply:
- If a memory allocation operation was instrumented, the corresponding free operation is instrumented, regardless of the current instrument or thread enabled status.
- If a memory allocation operation was not instrumented, the corresponding free operation is not instrumented, regardless of the current instrument or thread enabled status.

For the per-thread statistics, the following rules apply.
When an instrumented memory block of size $N$ is allocated, the Performance Schema makes these updates to memory summary table columns:
- COUNT_ALLOC: Increased by 1
- CURRENT_COUNT_USED: Increased by 1
- HIGH_COUNT_USED: Increased if CURRENT_COUNT_USED is a new maximum
- SUM_NUMBER_OF_BYTES_ALLOC: Increased by $N$
- CURRENT_NUMBER_OF_BYTES_USED: Increased by $N$
- HIGH_NUMBER_OF_BYTES_USED: Increased if CURRENT_NUMBER_OF_BYTES_USED is a new maximum

When an instrumented memory block is deallocated, the Performance Schema makes these updates to memory summary table columns:
- COUNT_FREE: Increased by 1
- CURRENT_COUNT_USED: Decreased by 1
- LOW_COUNT_USED: Decreased if CURRENT_COUNT_USED is a new minimum
- SUM_NUMBER_OF_BYTES_FREE: Increased by $N$
- CURRENT_NUMBER_OF_BYTES_USED: Decreased by $N$
- LOW_NUMBER_OF_BYTES_USED: Decreased if CURRENT_NUMBER_OF_BYTES_USED is a new minimum

For higher-level aggregates (global, by account, by user, by host), the same rules apply as expected for low and high water marks.
- LOW_COUNT_USED and LOW_NUMBER_OF_BYTES_USED are lower estimates. The value reported by the Performance Schema is guaranteed to be less than or equal to the lowest count or size of memory effectively used at runtime.
- HIGH_COUNT_USED and HIGH_NUMBER_OF_BYTES_USED are higher estimates. The value reported by the Performance Schema is guaranteed to be greater than or equal to the highest count or size of memory effectively used at runtime.

For lower estimates in summary tables other than memory_summary_global_by_event_name, it is possible for values to go negative if memory ownership is transferred between threads.

Here is an example of estimate computation; but note that estimate implementation is subject to change:

Thread 1 uses memory in the range from 1 MB to 2 MB during execution, as reported by the LOW_NUMBER_OF_BYTES_USED and HIGH_NUMBER_OF_BYTES_USED columns of the memory_summary_by_thread_by_event_name table.

Thread 2 uses memory in the range from 10 MB to 12 MB during execution, as reported likewise.
When these two threads belong to the same user account, the per-account summary estimates that this account used memory in the range from 11 MB to 14 MB . That is, the LOW_NUMBER_OF_BYTES_USED for the higher level aggregate is the sum of each LOW_NUMBER_OF_BYTES_USED (assuming the worst case). Likewise, the HIGH_NUMBER_OF_BYTES_USED for the higher level aggregate is the sum of each HIGH_NUMBER_OF_BYTES_USED (assuming the worst case).

11 MB is a lower estimate that can occur only if both threads hit the low usage mark at the same time.
14 MB is a higher estimate that can occur only if both threads hit the high usage mark at the same time.
The real memory usage for this account could have been in the range from 11.5 MB to 13.5 MB .
For capacity planning, reporting the worst case is actually the desired behavior, as it shows what can potentially happen when sessions are uncorrelated, which is typically the case.

\subsection*{29.12.20.11 Error Summary Tables}

The Performance Schema maintains summary tables for aggregating statistical information about server errors (and warnings). For a list of server errors, see Server Error Message Reference.

Collection of error information is controlled by the error instrument, which is enabled by default. Timing information is not collected.

Each error summary table has three columns that identify the error:
- ERROR_NUMBER is the numeric error value. The value is unique.
- ERROR_NAME is the symbolic error name corresponding to the ERROR_NUMBER value. The value is unique.
- SQLSTATE is the SQLSTATE value corresponding to the ERROR_NUMBER value. The value is not necessarily unique.

For example, if ERROR_NUMBER is 1050, ERROR_NAME is ER_TABLE_EXISTS_ERROR and SQLSTATE is $42 S 01$.

Example error event summary information:
```
mysql> SELECT *
        FROM performance_schema.events_errors_summary_global_by_error
        WHERE SUM_ERROR_RAISED <> 0\G
************************** 1. row *****************************************
    ERROR_NUMBER: 1064
        ERROR_NAME: ER_PARSE_ERROR
            SQL_STATE: 42000
SUM_ERROR_RAISED: 1
SUM_ERROR_HANDLED: 0
        FIRST_SEEN: 2016-06-28 07:34:02
            LAST_SEEN: 2016-06-28 07:34:02
************************** 2 row *******************************
    ERROR_NUMBER: 1146
        ERROR_NAME: ER_NO_SUCH_TABLE
            SQL_STATE: 42S02
SUM_ERROR_RAISED: 2
SUM_ERROR_HANDLED: 0
        FIRST_SEEN: 2016-06-28 07:34:05
            LAST_SEEN: 2016-06-28 07:36:18
************************** 3. rOW *****************************************
    ERROR_NUMBER: 1317
        ERROR_NAME: ER_QUERY_INTERRUPTED
            SQL_STATE: 70100
SUM_ERROR_RAISED: 1
SUM_ERROR_HANDLED: 0
        FIRST_SEEN: 2016-06-28 11:01:49
            LAST_SEEN: 2016-06-28 11:01:49
```


Each error summary table has one or more grouping columns to indicate how the table aggregates errors:
- events_errors_summary_by_account_by_error has USER, HOST, and ERROR_NUMBER columns. Each row summarizes events for a given account (user and host combination) and error.
- events_errors_summary_by_host_by_error has HOST and ERROR_NUMBER columns. Each row summarizes events for a given host and error.
- events_errors_summary_by_thread_by_error has THREAD_ID and ERROR_NUMBER columns. Each row summarizes events for a given thread and error.
- events_errors_summary_by_user_by_error has USER and ERROR_NUMBER columns. Each row summarizes events for a given user and error.
- events_errors_summary_global_by_error has an ERROR_NUMBER column. Each row summarizes events for a given error.

Each error summary table has these summary columns containing aggregated values:
- SUM_ERROR_RAISED

This column aggregates the number of times the error occurred.
- SUM_ERROR_HANDLED

This column aggregates the number of times the error was handled by an SQL exception handler.
- FIRST_SEEN, LAST_SEEN

Timestamp indicating when the error was first seen and most recently seen.
A NULL row in each error summary table is used to aggregate statistics for all errors that lie out of range of the instrumented errors. For example, if MySQL Server errors lie in the range from $M$ to $N$ and an error is raised with number $Q$ not in that range, the error is aggregated in the NULL row. The NULL row is the row with ERROR_NUMBER=0, ERROR_NAME=NULL, and SQLSTATE=NULL.

The error summary tables have these indexes:
- events_errors_summary_by_account_by_error:
- Primary key on (USER, HOST, ERROR_NUMBER)
- events_errors_summary_by_host_by_error:
- Primary key on (HOST, ERROR_NUMBER)
- events_errors_summary_by_thread_by_error:
- Primary key on (THREAD_ID, ERROR_NUMBER)
- events_errors_summary_by_user_by_error:
- Primary key on (USER, ERROR_NUMBER)
- events_errors_summary_global_by_error:
- Primary key on (ERROR_NUMBER)

TRUNCATE TABLE is permitted for error summary tables. It has these effects:
- For summary tables not aggregated by account, host, or user, truncation resets the summary columns to zero or NULL rather than removing rows.
- For summary tables aggregated by account, host, or user, truncation removes rows for accounts, hosts, or users with no connections, and resets the summary columns to zero or NULL for the remaining rows.

In addition, each error summary table that is aggregated by account, host, user, or thread is implicitly truncated by truncation of the connection table on which it depends, or truncation of events_errors_summary_global_by_error.For details, see Section 29.12.8, "Performance Schema Connection Tables".

\subsection*{29.12.20.12 Status Variable Summary Tables}

The Performance Schema makes status variable information available in the tables described in Section 29.12.15, "Performance Schema Status Variable Tables". It also makes aggregated status variable information available in summary tables, described here. Each status variable summary table has one or more grouping columns to indicate how the table aggregates status values:
- status_by_account has USER, HOST, and VARIABLE_NAME columns to summarize status variables by account.
- status_by_host has HOST and VARIABLE_NAME columns to summarize status variables by the host from which clients connected.
- status_by_user has USER and VARIABLE_NAME columns to summarize status variables by client user name.

Each status variable summary table has this summary column containing aggregated values:
- VARIABLE_VALUE

The aggregated status variable value for active and terminated sessions.
The status variable summary tables have these indexes:
- status_by_account:
- Primary key on (USER, HOST, VARIABLE_NAME)
- status_by_host:
- Primary key on (HOST, VARIABLE_NAME)
- status_by_user:
- Primary key on (USER, VARIABLE_NAME)

The meaning of "account" in these tables is similar to its meaning in the MySQL grant tables in the mysql system database, in the sense that the term refers to a combination of user and host values. They differ in that, for grant tables, the host part of an account can be a pattern, whereas for Performance Schema tables, the host value is always a specific nonpattern host name.

Account status is collected when sessions terminate. The session status counters are added to the global status counters and the corresponding account status counters. If account statistics are not collected, the session status is added to host and user status, if host and user status are collected.

Account, host, and user statistics are not collected if the performance_schema_accounts_size, performance_schema_hosts_size, and performance_schema_users_size system variables, respectively, are set to 0 .

The Performance Schema supports TRUNCATE TABLE for status variable summary tables as follows; in all cases, status for active sessions is unaffected:
- status_by_account: Aggregates account status from terminated sessions to user and host status, then resets account status.
- status_by_host: Resets aggregated host status from terminated sessions.
- status_by_user: Resets aggregated user status from terminated sessions.

FLUSH STATUS adds the session status from all active sessions to the global status variables, resets the status of all active sessions, and resets account, host, and user status values aggregated from disconnected sessions.

\subsection*{29.12.21 Performance Schema Telemetry Tables}

The following sections describe tables associated with the Telemetry services:

\subsection*{29.12.21.1 The setup_meters Table}

The setup_meters table lists the registered meters:
```
mysql> select * from performance_schema.setup_meters;
+--------------------------+-----------+---------+-----------------------------------------
    NAME | FREQUENCY | ENABLED | DESCRIPTION
```

```
+--------------------------+-----------+---------+-----------------------------------------

\begin{tabular}{|l|l|l|l|}
\hline mysql.inno & 10 & YES & MySql InnoDB metrics \\
\hline mysql.inno.buffer_pool & 10 & YES & MySql InnoDB buffer pool metrics \\
\hline mysql.inno.data & 10 & YES & MySql InnoDB data metrics \\
\hline mysql.x & 10 & YES & MySql X plugin metrics \\
\hline mysql.x.stmt & 10 & YES & MySql X plugin statement statistics \\
\hline mysql.stats & 10 & YES & MySql core metrics \\
\hline mysql.stats.com & 10 & YES & MySql command stats \\
\hline mysql.stats.connection & 10 & YES & MySql connection stats \\
\hline mysql.stats.handler & 10 & YES & MySql handler stats \\
\hline mysql.stats.ssl & 10 & YES & MySql TLS related stats \\
\hline mysql.myisam & 10 & YES & MySql MyISAM storage engine stats \\
\hline mysql.perf_schema & 10 & YES & MySql performance_schema lost instruments \\
\hline
\end{tabular}
```

- NAME: Name of the meter.
- FREQUENCY: Frequency in seconds of metric export. Default is every 10 seconds. This value can be edited for registered meters.
- ENABLED: Whether the meter is enabled. The value is YES or NO. A disabled meter exports no metrics. This column can be modified
- DESCRIPTION: A string describing the meter.

FREQUENCY and ENABLED can be edited.

\subsection*{29.12.21.2 The setup_metrics Table}

The setup_metrics table lists the available metrics:
```
mysql> select * from performance_schema.setup_metrics\G
*************************** 34. row ***************************************
            NAME: undo_tablespaces_active
        METER: mysql.inno
METRIC_TYPE: ASYNC GAUGE COUNTER
    NUM_TYPE: INTEGER
            UNIT:
DESCRIPTION: Number of active undo tablespaces, including implicit and explicit tablespaces (innodb_und
...
************************** 48 row *****************************************
            NAME: wait_free
        METER: mysql.inno.buffer_pool
METRIC_TYPE: ASYNC COUNTER
    NUM_TYPE: INTEGER
            UNIT:
DESCRIPTION: Number of times waited for free buffer (innodb_buffer_pool_wait_free)
...
*************************** 55. r ow **************************************
            NAME: reads
        METER: mysql.inno.data
METRIC_TYPE: ASYNC COUNTER
    NUM_TYPE: INTEGER
            UNIT:
DESCRIPTION: Number of reads initiated (innodb_data_reads)
*************************** 101. rOW **************************************
            NAME: ssl_finished_accepts
        METER: mysql.x
METRIC_TYPE: ASYNC COUNTER
    NUM_TYPE: INTEGER
        UNIT:
DESCRIPTION: The number of successful SSL connections to the server (Mysqlx_ssl_finished_accepts)
...
************************** 115. row ***************************************
        NAME: list_clients
```

```
        METER: mysql.x.stmt
METRIC_TYPE: ASYNC COUNTER
    NUM_TYPE: INTEGER
            UNIT:
DESCRIPTION: The number of list client statements received (Mysqlx_stmt_list_clients)
...
************************* 162. row
            NAME: slow_queries
        METER: mysql.stats
METRIC_TYPE: ASYNC COUNTER
    NUM_TYPE: INTEGER
            UNIT:
DESCRIPTION: The number of queries that have taken more than long_query_time seconds (Slow_queries)
...
************************* 346. row ****************************************
            NAME: stmt_reprepare
        METER: mysql.stats.com
METRIC_TYPE: ASYNC COUNTER
    NUM_TYPE: INTEGER
            UNIT:
DESCRIPTION: Number of times corresponding command statement has been executed.
...
************************** 353. row ***************************************
            NAME: errors_tcpwrap
        METER: mysql.stats.connection
METRIC_TYPE: ASYNC COUNTER
    NUM_TYPE: INTEGER
            UNIT:
DESCRIPTION: The number of connections refused by the libwrap library (Connection_errors_tcpwrap)
...
            NAME: update
        METER: mysql.stats.handler
METRIC_TYPE: ASYNC COUNTER
    NUM_TYPE: INTEGER
            UNIT:
DESCRIPTION: The number of requests to update a row in a table (Handler_update)
...
************************* 384. row ****************************************
            NAME: callback_cache_hits
        METER: mysql.stats.ssl
METRIC_TYPE: ASYNC COUNTER
    NUM_TYPE: INTEGER
            UNIT:
DESCRIPTION: The number of accepted SSL connections (Ssl_callback_cache_hits)
...
************************** 391. row ***************************************
            NAME: key_writes
        METER: mysql.myisam
METRIC_TYPE: ASYNC COUNTER
    NUM_TYPE: INTEGER
            UNIT:
DESCRIPTION: The number of physical writes of a key block from the MyISAM key cache to disk (Key_writes)
...
*************************** 424 row ***************************************
            NAME: users_lost
        METER: mysql.perf_schema
METRIC_TYPE: ASYNC COUNTER
    NUM_TYPE: INTEGER
        UNIT:
DESCRIPTION: The number of times a row could not be added to the users table because it was full (Performar
```


The setup_metrics table has the following columns:
- NAME: Name of the metric.
- METER: Name of the meter group of the metric.
- METRIC_TYPE: The OpenTelemetry metric type.
- NUM_TYPE: The numeric type. INTEGER or DOUBLE.
- DESCRIPTION: A string describing the metric's purpose.

\subsection*{29.12.22 Performance Schema Miscellaneous Tables}

The following sections describe tables that do not fall into the table categories discussed in the preceding sections:
- component_scheduler_tasks: The current status of each scheduled task.
- error_log: The most recent events written to the error log.
- host_cache: Information from the internal host cache.
- innodb_redo_log_files: Information about InnoDB redo log files.
- log_status: Information about server logs for backup purposes.
- performance_timers: Which event timers are available.
- processlist: Information about server processes.
- threads: Information about server threads.
- tls_channel_status: TLS context properties for connection interfaces.
- user_defined_functions: Loadable functions registered by a component, plugin, or CREATE FUNCTION statement.

\subsection*{29.12.22.1 The component_scheduler_tasks Table}

The component_scheduler_tasks table contains a row for each scheduled task. Each row contains information about the ongoing progress of a task that applications, components, and plugins can implement, optionally, using the scheduler component (see Section 7.5.5, "Scheduler Component"). For example, the audit_log server plugin utilizes the scheduler component to run a regular, recurring flush of its memory cache:
```
mysql> select * from performance_schema.component_scheduler_tasks\G
************************** 1. row ******************************
                NAME: plugin_audit_log_flush_scheduler
                STATUS: WAITING
            COMMENT: Registered by the audit log plugin. Does a periodic refresh of the audit log
                    in-memory rules cache by calling audit_log_flush
INTERVAL_SECONDS: 100
        TIMES_RUN: 5
    TIMES_FAILED: 0
1 row in set (0.02 sec)
```


The component_scheduler_tasks table has the following columns:
- NAME

The name supplied during the registration.
- STATUS

The values are:
- RUNNING if the task is active and being executed.
- WAITING if the task is idle and waiting for the background thread to pick it up or waiting for the next time it needs to be run to arrive.

\section*{- COMMENT}

A compile-time comment provided by an application, component, or plugin. In the previous example, MySQL Enterprise Audit provides the comment using a server plugin named audit_log.
- INTERVAL_SECONDS

The time in seconds to run a task, which an application, component, or plugin provides. MySQL Enterprise Audit enables you to specify this value using the audit_log_flush_interval_seconds system variable.
- TIMES_RUN

A counter that increments by one every time the task runs successfully. It wraps around.
- TIMES_FAILED

A counter that increments by one every time the execution of the task fails. It wraps around.

\subsection*{29.12.22.2 The error_log Table}

Of the logs the MySQL server maintains, one is the error log to which it writes diagnostic messages (see Section 7.4.2, "The Error Log"). Typically, the server writes diagnostics to a file on the server host or to a system log service. Depending on error log configuration, the server can also write the most recent error events to the Performance Schema error_log table. Granting the SELECT privilege for the error_log table thus gives clients and applications access to error log contents using SQL queries, enabling DBAs to provide access to the log without the need to permit direct file system access on the server host.

The error_log table supports focused queries based on its more structured columns. It also includes the full text of error messages to support more free-form analysis.

The table implementation uses a fixed-size, in-memory ring buffer, with old events automatically discarded as necessary to make room for new ones.

Example error_log contents:
```
mysql> SELECT * FROM performance_schema.error_log\G
************************* 1. rOW *******************************
        LOGGED: 2020-08-06 09:25:00.338624
    THREAD_ID: 0
            PRIO: System
ERROR_CODE: MY-010116
    SUBSYSTEM: Server
            DATA: mysqld (mysqld 8.4.9) starting as process 96344
************************** 2. row ******************************
        LOGGED: 2020-08-06 09:25:00.363521
    THREAD_ID: 1
            PRIO: System
ERROR_CODE: MY-013576
    SUBSYSTEM: InnoDB
            DATA: InnoDB initialization has started.
*************************** 65. r ow ****************************
        LOGGED: 2020-08-06 09:25:02.936146
    THREAD_ID: 0
            PRIO: Warning
ERROR_CODE: MY-010068
    SUBSYSTEM: Server
            DATA: CA certificate /var/mysql/sslinfo/cacert.pem is self signed.
...
************************* 89. row *****************************************
        LOGGED: 2020-08-06 09:25:03.112801
```

```
THREAD_ID: 0
    PRIO: System
ERROR_CODE: MY-013292
SUBSYSTEM: Server
    DATA: Admin interface ready for connections, address: '127.0.0.1' port: 33062
```


The error_log table has the following columns. As indicated in the descriptions, all but the DATA column correspond to fields of the underlying error event structure, which is described in Section 7.4.2.3, "Error Event Fields".
- LOGGED

The event timestamp, with microsecond precision. LOGGED corresponds to the time field of error events, although with certain potential differences:
- time values in the error log are displayed according to the log_timestamps system variable setting; see Early-Startup Logging Output Format.
- The LOGGED column stores values using the TIMESTAMP data type, for which values are stored in UTC but displayed when retrieved in the current session time zone; see Section 13.2.2, "The DATE, DATETIME, and TIMESTAMP Types".

To display LOGGED values in the same time zone as displayed in the error log file, first set the session time zone as follows:
```
SET @@session.time_zone = @@global.log_timestamps;
```


If the log_timestamps value is UTC and your system does not have named time zone support installed (see Section 7.1.15, "MySQL Server Time Zone Support"), set the time zone like this:

SET @@session.time_zone = '+00:00';
- THREAD_ID

The MySQL thread ID. THREAD_ID corresponds to the thread field of error events.
Within the Performance Schema, the THREAD_ID column in the error_log table is most similar to the PROCESSLIST_ID column of the threads table:
- For foreground threads, THREAD_ID and PROCESSLIST_ID represent a connection identifier. This is the same value displayed in the ID column of the INFORMATION_SCHEMA PROCESSLIST table, displayed in the Id column of SHOW PROCESSLIST output, and returned by the CONNECTION_ID( ) function within the thread.
- For background threads, THREAD_ID is 0 and PROCESSLIST_ID is NULL.

Many Performance Schema tables other than error_log has a column named THREAD_ID, but in those tables, the THREAD_ID column is a value assigned internally by the Performance Schema.
- PRIO

The event priority. Permitted values are System, Error, Warning, Note. The PRIO column is based on the label field of error events, which itself is based on the underlying numeric prio field value.
- ERROR_CODE

The numeric event error code. ERROR_CODE corresponds to the error_code field of error events.
- SUBSYSTEM

The subsystem in which the event occurred. SUBSYSTEM corresponds to the subsystem field of error events.
- DATA

The text representation of the error event. The format of this value depends on the format produced by the log sink component that generates the error_log row. For example, if the log sink is log_sink_internal or log_sink_json, DATA values represent error events in traditional or JSON format, respectively. (See Section 7.4.2.9, "Error Log Output Format".)

Because the error log can be reconfigured to change the log sink component that supplies rows to the error_log table, and because different sinks produce different output formats, it is possible for rows written to the error_log table at different times to have different DATA formats.

The error_log table has these indexes:
- Primary key on (LOGGED)
- Index on (THREAD_ID)
- Index on (PRIO)
- Index on (ERROR_CODE)
- Index on (SUBSYSTEM)

TRUNCATE TABLE is not permitted for the error_log table.

\section*{Implementation and Configuration of the error_log Table}

The Performance Schema error_log table is populated by error log sink components that write to the table in addition to writing formatted error events to the error log. Performance Schema support by log sinks has two parts:
- A log sink can write new error events to the error_log table as they occur.
- A log sink can provide a parser for extraction of previously written error messages. This enables a server instance to read messages written to an error log file by the previous instance and store them in the error_log table. Messages written during shutdown by the previous instance may be useful for diagnosing why shutdown occurred.

Currently, the traditional-format log_sink_internal and JSON-format log_sink_json sinks support writing new events to the error_log table and provide a parser for reading previously written error log files.

The log_error_services system variable controls which log components to enable for error logging. Its value is a pipeline of log filter and log sink components to be executed in left-to-right order when error events occur. The log_error_services value pertains to populating the error_log table as follows:
- At startup, the server examines the log_error_services value and chooses from it the leftmost log sink that satisfies these conditions:
- A sink that supports the error_log table and provides a parser.
- If none, a sink that supports the error_log table but provides no parser.

If no log sink satisfies those conditions, the error_log table remains empty. Otherwise, if the sink provides a parser and log configuration enables a previously written error log file to be found, the server uses the sink parser to read the last part of the file and writes the old events it contains to the table. The sink then writes new error events to the table as they occur.
- At runtime, if the value of log_error_services changes, the server again examines it, this time looking for the leftmost enabled log sink that supports the error_log table, regardless of whether it provides a parser.

If no such log sink exists, no additional error events are written to the error_log table. Otherwise, the newly configured sink writes new error events to the table as they occur.

Any configuration that affects output written to the error log affects error_log table contents. This includes settings such as those for verbosity, message suppression, and message filtering. It also applies to information read at startup from a previous log file. For example, messages not written during a previous server instance configured with low verbosity do not become available if the file is read by a current instance configured with higher verbosity.

The error_log table is a view on a fixed-size, in-memory ring buffer, with old events automatically discarded as necessary to make room for new ones. As shown in the following table, several status variables provide information about ongoing error_log operation.

\begin{tabular}{|l|l|}
\hline Status Variable & Meaning \\
\hline Error_log_buffered_bytes & Bytes used in table \\
\hline Error_log_buffered_events & Events present in table \\
\hline Error_log_expired_events & Events discarded from table \\
\hline Error_log_latest_write & Time of last write to table \\
\hline
\end{tabular}

\subsection*{29.12.22.3 The host_cache Table}

The MySQL server maintains an in-memory host cache that contains client host name and IP address information and is used to avoid Domain Name System (DNS) lookups. The host_cache table exposes the contents of this cache. The host_cache_size system variable controls the size of the host cache, as well as the size of the host_cache table. For operational and configuration information about the host cache, see Section 7.1.12.3, "DNS Lookups and the Host Cache".

Because the host_cache table exposes the contents of the host cache, it can be examined using SELECT statements. This may help you diagnose the causes of connection problems.

The host_cache table has these columns:
- IP

The IP address of the client that connected to the server, expressed as a string.
- HOST

The resolved DNS host name for that client IP, or NULL if the name is unknown.
- HOST_VALIDATED

Whether the IP-to-host name-to-IP DNS resolution was performed successfully for the client IP. If HOST_VALIDATED is YES, the HOST column is used as the host name corresponding to the IP so that additional calls to DNS can be avoided. While HOST_VALIDATED is NO, DNS resolution is attempted for each connection attempt, until it eventually completes with either a valid result or a permanent error. This information enables the server to avoid caching bad or missing host names during temporary DNS failures, which would negatively affect clients forever.
- SUM_CONNECT_ERRORS

The number of connection errors that are deemed "blocking" (assessed against the max_connect_errors system variable). Only protocol handshake errors are counted, and only for hosts that passed validation (HOST_VALIDATED = YES).

Once SUM_CONNECT_ERRORS for a given host reaches the value of max_connect_errors, new connections from that host are blocked. The SUM_CONNECT_ERRORS value can exceed the max_connect_errors value because multiple connection attempts from a host can occur
simultaneously while the host is not blocked. Any or all of them can fail, independently incrementing SUM_CONNECT_ERRORS, possibly beyond the value of max_connect_errors.

Suppose that max_connect_errors is 200 and SUM_CONNECT_ERRORS for a given host is 199 . If 10 clients attempt to connect from that host simultaneously, none of them are blocked because SUM_CONNECT_ERRORS has not reached 200. If blocking errors occur for five of the clients, SUM_CONNECT_ERRORS is increased by one for each client, for a resulting SUM_CONNECT_ERRORS value of 204. The other five clients succeed and are not blocked because the value of SUM_CONNECT_ERRORS when their connection attempts began had not reached 200. New connections from the host that begin after SUM_CONNECT_ERRORS reaches 200 are blocked.
- COUNT_HOST_BLOCKED_ERRORS

The number of connections that were blocked because SUM_CONNECT_ERRORS exceeded the value of the max_connect_errors system variable.
- COUNT_NAMEINFO_TRANSIENT_ERRORS

The number of transient errors during IP-to-host name DNS resolution.
- COUNT_NAMEINFO_PERMANENT_ERRORS

The number of permanent errors during IP-to-host name DNS resolution.
- COUNT_FORMAT_ERRORS

The number of host name format errors. MySQL does not perform matching of Host column values in the mysql.user system table against host names for which one or more of the initial components of the name are entirely numeric, such as 1.2.example.com. The client IP address is used instead. For the rationale why this type of matching does not occur, see Section 8.2.4, "Specifying Account Names".
- COUNT_ADDRINFO_TRANSIENT_ERRORS

The number of transient errors during host name-to-IP reverse DNS resolution.
- COUNT_ADDRINFO_PERMANENT_ERRORS

The number of permanent errors during host name-to-IP reverse DNS resolution.
- COUNT_FCRDNS_ERRORS

The number of forward-confirmed reverse DNS errors. These errors occur when IP-to-host name-toIP DNS resolution produces an IP address that does not match the client originating IP address.
- COUNT_HOST_ACL_ERRORS

The number of errors that occur because no users are permitted to connect from the client host. In such cases, the server returns ER_HOST_NOT_PRIVILEGED and does not even ask for a user name or password.
- COUNT_NO_AUTH_PLUGIN_ERRORS

The number of errors due to requests for an unavailable authentication plugin. A plugin can be unavailable if, for example, it was never loaded or a load attempt failed.
- COUNT_AUTH_PLUGIN_ERRORS

The number of errors reported by authentication plugins.
An authentication plugin can report different error codes to indicate the root cause of a failure. Depending on the type of error, one of these columns is
incremented: COUNT_AUTHENTICATION_ERRORS, COUNT_AUTH_PLUGIN_ERRORS, COUNT_HANDSHAKE_ERRORS. New return codes are an optional extension to the existing plugin API. Unknown or unexpected plugin errors are counted in the COUNT_AUTH_PLUGIN_ERRORS column.
- COUNT_HANDSHAKE_ERRORS

The number of errors detected at the wire protocol level.
- COUNT_PROXY_USER_ERRORS

The number of errors detected when proxy user A is proxied to another user B who does not exist.
- COUNT_PROXY_USER_ACL_ERRORS

The number of errors detected when proxy user A is proxied to another user B who does exist but for whom A does not have the PROXY privilege.
- COUNT_AUTHENTICATION_ERRORS

The number of errors caused by failed authentication.
- COUNT_SSL_ERRORS

The number of errors due to SSL problems.
- COUNT_MAX_USER_CONNECTIONS_ERRORS

The number of errors caused by exceeding per-user connection quotas. See Section 8.2.21, "Setting Account Resource Limits".
- COUNT_MAX_USER_CONNECTIONS_PER_HOUR_ERRORS

The number of errors caused by exceeding per-user connections-per-hour quotas. See Section 8.2.21, "Setting Account Resource Limits".
- COUNT_DEFAULT_DATABASE_ERRORS

The number of errors related to the default database. For example, the database does not exist or the user has no privileges to access it.
- COUNT_INIT_CONNECT_ERRORS

The number of errors caused by execution failures of statements in the init_connect system variable value.
- COUNT_LOCAL_ERRORS

The number of errors local to the server implementation and not related to the network, authentication, or authorization. For example, out-of-memory conditions fall into this category.
- COUNT_UNKNOWN_ERRORS

The number of other, unknown errors not accounted for by other columns in this table. This column is reserved for future use, in case new error conditions must be reported, and if preserving the backward compatibility and structure of the host_cache table is required.
- FIRST_SEEN

The timestamp of the first connection attempt seen from the client in the IP column.
- LAST_SEEN

The timestamp of the most recent connection attempt seen from the client in the IP column.
- FIRST_ERROR_SEEN

The timestamp of the first error seen from the client in the IP column.
- LAST_ERROR_SEEN

The timestamp of the most recent error seen from the client in the IP column.
The host_cache table has these indexes:
- Primary key on (IP)
- Index on (HOST)

TRUNCATE TABLE is permitted for the host_cache table. It requires the DROP privilege for the table. Truncating the table flushes the host cache, which has the effects described in Flushing the Host Cache.

\subsection*{29.12.22.4 The innodb_redo_log_files Table}

The innodb_redo_log_files table contains a row for each active InnoDB redo log file.
The innodb_redo_log_files table has the following columns:
- FILE_ID

The ID of the redo log file. The value corresponds to the redo log file number.
- FILE_NAME

The path and file name of the redo log file.
- START_LSN

The log sequence number of the first block in the redo log file.
- END_LSN

The log sequence number after the last block in the redo log file.
- SIZE_IN_BYTES

The size of the redo log data in the file, in bytes. Data size is measured from the END_LSN to the start >START_LSN. The redo log file size on disk is slightly larger due to the file header (2048 bytes), which is not included in the value reported by this column.
- IS_FULL

Whether the redo log file is full. A value of 0 indicates that free space in the file. A value of 1 indicates that the file is full.
- CONSUMER_LEVEL

Reserved for future use.

\subsection*{29.12.22.5 The log_status Table}

The log_status table provides information that enables an online backup tool to copy the required log files without locking those resources for the duration of the copy process.

When the log_status table is queried, the server blocks logging and related administrative changes for just long enough to populate the table, then releases the resources. The log_status table informs
the online backup which point it should copy up to in the source's binary log and gtid_executed record, and the relay log for each replication channel. It also provides relevant information for individual storage engines, such as the last log sequence number (LSN) and the LSN of the last checkpoint taken for the InnoDB storage engine.

The log_status table has these columns:
- SERVER_UUID

The server UUID for this server instance. This is the generated unique value of the read-only system variable server_uuid.
- LOCAL

The log position state information from the source, provided as a single JSON object with the following keys:

\begin{tabular}{|l|l|}
\hline binary_log_file & The name of the current binary log file. \\
\hline binary_log_position & The current binary log position at the time the log_status table was accessed. \\
\hline gtid_executed & The current value of the global server variable gtid_executed at the time the log_status table was accessed. This information is consistent with the binary_log_file and binary_log_position keys. \\
\hline
\end{tabular}
- REPLICATION

A JSON array of channels, each with the following information:
```
channel_name
relay_log_file
relay_log_pos
```


The name of the replication channel. The default replication channel's name is the empty string ("").

The name of the current relay log file for the replication channel.
The current relay log position at the time the log_status table was accessed.
- STORAGE_ENGINES

Relevant information from individual storage engines, provided as a JSON object with one key for each applicable storage engine.

The log_status table has no indexes.
The BACKUP_ADMIN privilege, as well as the SELECT privilege, is required for access to the log_status table.

TRUNCATE TABLE is not permitted for the log_status table.

\subsection*{29.12.22.6 The performance_timers Table}

The performance_timers table shows which event timers are available:
```
mysql> SELECT * FROM performance_schema.performance_timers;
+-------------+-----------------+------------------+----------------+
| TIMER_NAME | TIMER_FREQUENCY | TIMER_RESOLUTION | TIMER_OVERHEAD |
+-------------+-----------------+------------------+---------------+

\begin{tabular}{|l|r|r|r|} 
CYCLE & 2389029850 & 1 & 72 \\
NANOSECOND & 1000000000 & 1 & 112 \\
MICROSECOND & 1000000 & 1 & 1 \\
MILLISECOND & 1036 & 136 \\
\hline
\end{tabular}
```


\begin{tabular}{|l|l|l|l|}
\hline THREAD_CPU & 339101694 & 1 & 798 \\
\hline & & & \\
\hline
\end{tabular}

If the values associated with a given timer name are NULL, that timer is not supported on your platform. For an explanation of how event timing occurs, see Section 29.4.1, "Performance Schema Event Timing".

The performance_timers table has these columns:
- TIMER_NAME

The timer name.
- TIMER_FREQUENCY

The number of timer units per second. For a cycle timer, the frequency is generally related to the CPU speed. For example, on a system with a 2.4 GHz processor, the CYCLE may be close to 2400000000.
- TIMER_RESOLUTION

Indicates the number of timer units by which timer values increase. If a timer has a resolution of 10, its value increases by 10 each time.
- TIMER_OVERHEAD

The minimal number of cycles of overhead to obtain one timing with the given timer. The Performance Schema determines this value by invoking the timer 20 times during initialization and picking the smallest value. The total overhead really is twice this amount because the instrumentation invokes the timer at the start and end of each event. The timer code is called only for timed events, so this overhead does not apply for nontimed events.

The performance_timers table has no indexes.
TRUNCATE TABLE is not permitted for the performance_timers table.

\subsection*{29.12.22.7 The processlist Table}

The MySQL process list indicates the operations currently being performed by the set of threads executing within the server. The processlist table is one source of process information. For a comparison of this table with other sources, see Sources of Process Information.

The processlist table can be queried directly. If you have the PROCESS privilege, you can see all threads, even those belonging to other users. Otherwise (without the PROCESS privilege), nonanonymous users have access to information about their own threads but not threads for other users, and anonymous users have no access to thread information.

Note
If the performance_schema_show_processlist system variable is enabled, the processlist table also serves as the basis for an alternative implementation underlying the SHOW PROCESSLIST statement. For details, see later in this section.

The processlist table contains a row for each server process:
```
mysql> SELECT * FROM performance_schema.processlist\G
*************************** 1. row *****************************
        ID: 5
    USER: event_scheduler
    HOST: localhost
        DB: NULL
COMMAND: Daemon
```

```
    TIME: 137
    STATE: Waiting on empty queue
        INFO: NULL
************************* 2. row
            ID: 9
        USER: me
        HOST: localhost:58812
            DB: NULL
COMMAND: Sleep
        TIME: 95
    STATE:
        INFO: NULL
************************* 3. rOW ******************************************
            ID: 10
        USER: me
        HOST: localhost:58834
            DB: test
COMMAND: Query
        TIME: 0
    STATE: executing
        INFO: SELECT * FROM performance_schema.processlist
...
```


The processlist table has these columns:
- ID

The connection identifier. This is the same value displayed in the Id column of the SHOW PROCESSLIST statement, displayed in the PROCESSLIST_ID column of the Performance Schema threads table, and returned by the CONNECTION_ID( ) function within the thread.
- USER

The MySQL user who issued the statement. A value of system user refers to a nonclient thread spawned by the server to handle tasks internally, for example, a delayed-row handler thread or an I/O or SQL thread used on replica hosts. For system user, there is no host specified in the Host column. unauthenticated user refers to a thread that has become associated with a client connection but for which authentication of the client user has not yet occurred. event_scheduler refers to the thread that monitors scheduled events (see Section 27.4, "Using the Event Scheduler").

\section*{Note}

A USER value of system user is distinct from the SYSTEM_USER privilege. The former designates internal threads. The latter distinguishes the system user and regular user account categories (see Section 8.2.11, "Account Categories").
- HOST

The host name of the client issuing the statement (except for system user, for which there is no host). The host name for TCP/IP connections is reported in host_name : client_port format to make it easier to determine which client is doing what.
- DB

The default database for the thread, or NULL if none has been selected.
- COMMAND

The type of command the thread is executing on behalf of the client, or Sleep if the session is idle. For descriptions of thread commands, see Section 10.14, "Examining Server Thread (Process) Information". The value of this column corresponds to the COM_ $x x x$ commands of the client/server protocol and Com_xxx status variables. See Section 7.1.10, "Server Status Variables"
- TIME

The time in seconds that the thread has been in its current state. For a replica SQL thread, the value is the number of seconds between the timestamp of the last replicated event and the real time of the replica host. See Section 19.2.3, "Replication Threads".
- STATE

An action, event, or state that indicates what the thread is doing. For descriptions of STATE values, see Section 10.14, "Examining Server Thread (Process) Information".

Most states correspond to very quick operations. If a thread stays in a given state for many seconds, there might be a problem that needs to be investigated.
- INFO

The statement the thread is executing, or NULL if it is executing no statement. The statement might be the one sent to the server, or an innermost statement if the statement executes other statements. For example, if a CALL statement executes a stored procedure that is executing a SELECT statement, the INFO value shows the SELECT statement.
- EXECUTION_ENGINE

The query execution engine. The value is either PRIMARY or SECONDARY. For use with MySQL HeatWave Service and MySQL HeatWave, where the PRIMARY engine is InnoDB and the SECONDARY engine is MySQL HeatWave (RAPID). For MySQL Community Edition Server, MySQL Enterprise Edition Server (on-premise), and MySQL HeatWave Service without MySQL HeatWave, the value is always PRIMARY.

The processlist table has these indexes:
- Primary key on (ID)

TRUNCATE TABLE is not permitted for the processlist table.
As mentioned previously, if the performance_schema_show_processlist system variable is enabled, the processlist table serves as the basis for an alternative implementation of other process information sources:
- The SHOW PROCESSLIST statement.
- The mysqladmin processlist command (which uses SHOW PROCESSLIST statement).

The default SHOW PROCESSLIST implementation iterates across active threads from within the thread manager while holding a global mutex. This has negative performance consequences, particularly on busy systems. The alternative SHOW PROCESSLIST implementation is based on the Performance Schema processlist table. This implementation queries active thread data from the Performance Schema rather than the thread manager and does not require a mutex.

MySQL configuration affects processlist table contents as follows:
- Minimum required configuration:
- The MySQL server must be configured and built with thread instrumentation enabled. This is true by default; it is controlled using the DISABLE_PSI_THREAD CMake option.
- The Performance Schema must be enabled at server startup. This is true by default; it is controlled using the performance_schema system variable.

With that configuration satisfied, performance_schema_show_processlist enables or disables the alternative SHOW PROCESSLIST implementation. If the minimum configuration is not satisfied, the processlist table (and thus SHOW PROCESSLIST) may not return all data.
- Recommended configuration:
- To avoid having some threads ignored:
- Leave the performance_schema_max_thread_instances system variable set to its default or set it at least as great as the max_connections system variable.
- Leave the performance_schema_max_thread_classes system variable set to its default.
- To avoid having some STATE column values be empty, leave the performance_schema_max_stage_classes system variable set to its default.

The default for those configuration parameters is -1 , which causes the Performance Schema to autosize them at server startup. With the parameters set as indicated, the processlist table (and thus SHOW PROCESSLIST) produce complete process information.

The preceding configuration parameters affect the contents of the processlist table. For a given configuration, however, the processlist contents are unaffected by the performance_schema_show_processlist setting.

The alternative process list implementation does not apply to the INFORMATION_SCHEMA PROCESSLIST table or the COM_PROCESS_INFO command of the MySQL client/server protocol.

\subsection*{29.12.22.8 The threads Table}

The threads table contains a row for each server thread. Each row contains information about a thread and indicates whether monitoring and historical event logging are enabled for it:
```
mysql> SELECT * FROM performance_schema.threads\G
************************** 1. row ******************************
                    THREAD_ID: 1
                            NAME: thread/sql/main
                            TYPE: BACKGROUND
            PROCESSLIST_ID: NULL
        PROCESSLIST_USER: NULL
        PROCESSLIST_HOST: NULL
            PROCESSLIST_DB: mysql
    PROCESSLIST_COMMAND: NULL
        PROCESSLIST_TIME: 418094
        PROCESSLIST_STATE: NULL
        PROCESSLIST_INFO: NULL
        PARENT_THREAD_ID: NULL
                            ROLE: NULL
                INSTRUMENTED: YES
                        HISTORY: YES
            CONNECTION_TYPE: NULL
                THREAD_OS_ID: 5856
            RESOURCE_GROUP: SYS_default
        EXECUTION_ENGINE: PRIMARY
        CONTROLLED_MEMORY: 1456
MAX_CONTROLLED_MEMORY: 67480
                TOTAL_MEMORY: 1270430
        MAX_TOTAL_MEMORY: 1307317
        TELEMETRY_ACTIVE: NO
...
```


When the Performance Schema initializes, it populates the threads table based on the threads in existence then. Thereafter, a new row is added each time the server creates a thread.

The INSTRUMENTED and HISTORY column values for new threads are determined by the contents of the setup_actors table. For information about how to use the setup_actors table to control these columns, see Section 29.4.6, "Pre-Filtering by Thread".

Removal of rows from the threads table occurs when threads end. For a thread associated with a client session, removal occurs when the session ends. If a client has auto-reconnect enabled and
the session reconnects after a disconnect, the session becomes associated with a new row in the threads table that has a different PROCESSLIST_ID value. The initial INSTRUMENTED and HISTORY values for the new thread may be different from those of the original thread: The setup_actors table may have changed in the meantime, and if the INSTRUMENTED or HISTORY value for the original thread was changed after the row was initialized, the change does not carry over to the new thread.

You can enable or disable thread monitoring (that is, whether events executed by the thread are instrumented) and historical event logging. To control the initial INSTRUMENTED and HISTORY values for new foreground threads, use the setup_actors table. To control these aspects of existing threads, set the INSTRUMENTED and HISTORY columns of threads table rows. (For more information about the conditions under which thread monitoring and historical event logging occur, see the descriptions of the INSTRUMENTED and HISTORY columns.)

For a comparison of the threads table columns with names having a prefix of PROCESSLIST_ to other process information sources, see Sources of Process Information.

\section*{Important}

For thread information sources other than the threads table, information about threads for other users is shown only if the current user has the PROCESS privilege. That is not true of the threads table; all rows are shown to any user who has the SELECT privilege for the table. Users who should not be able to see threads for other users by accessing the threads table should not be given the SELECT privilege for it.

The threads table has these columns:
- THREAD_ID

A unique thread identifier.
- NAME

The name associated with the thread instrumentation code in the server. For example, thread/ sql/one_connection corresponds to the thread function in the code responsible for handling a user connection, and thread/sql/main stands for the main() function of the server.
- TYPE

The thread type, either FOREGROUND or BACKGROUND. User connection threads are foreground threads. Threads associated with internal server activity are background threads. Examples are internal InnoDB threads, "binlog dump" threads sending information to replicas, and replication I/O and SQL threads.
- PROCESSLIST_ID

For a foreground thread (associated with a user connection), this is the connection identifier. This is the same value displayed in the ID column of the INFORMATION_SCHEMA PROCESSLIST table, displayed in the Id column of SHOW PROCESSLIST output, and returned by the CONNECTION_ID() function within the thread.

For a background thread (not associated with a user connection), PROCESSLIST_ID is NULL, so the values are not unique.
- PROCESSLIST_USER

The user associated with a foreground thread, NULL for a background thread.
- PROCESSLIST_HOST

The host name of the client associated with a foreground thread, NULL for a background thread.

Unlike the HOST column of the INFORMATION_SCHEMA PROCESSLIST table or the Host column of SHOW PROCESSLIST output, the PROCESSLIST_HOST column does not include the port number for TCP/IP connections. To obtain this information from the Performance Schema, enable the socket instrumentation (which is not enabled by default) and examine the socket_instances table:
```
mysql> SELECT NAME, ENABLED, TIMED
    FROM performance_schema.setup_instruments
    WHERE NAME LIKE 'wait/io/socket%';
+-----------------------------------------+--------+-------+
| NAME | ENABLED | TIMED |
+------------------------------------------+--------+-------+
| wait/io/socket/sql/server_tcpip_socket | NO | NO
| wait/io/socket/sql/server_unix_socket | NO | NO
| wait/io/socket/sql/client_connection | NO | NO
+------------------------------------------+--------+------+
3 rows in set (0.01 sec)
mysql> UPDATE performance_schema.setup_instruments
    SET ENABLED='YES'
    WHERE NAME LIKE 'wait/io/socket%';
Query OK, 3 rows affected (0.00 sec)
Rows matched: 3 Changed: 3 Warnings: 0
mysql> SELECT * FROM performance_schema.socket_instances\G
*************************** 1. row ****************************
        EVENT_NAME: wait/io/socket/sql/client_connection
OBJECT_INSTANCE_BEGIN: 140612577298432
        THREAD_ID: 31
        SOCKET_ID: 53
                IP: ::ffff:127.0.0.1
            PORT: 55642
            STATE: ACTIVE
...
```

- PROCESSLIST_DB

The default database for the thread, or NULL if none has been selected.
- PROCESSLIST_COMMAND

For foreground threads, the type of command the thread is executing on behalf of the client, or Sleep if the session is idle. For descriptions of thread commands, see Section 10.14, "Examining Server Thread (Process) Information". The value of this column corresponds to the COM_xxx commands of the client/server protocol and Com_xxx status variables. See Section 7.1.10, "Server Status Variables"

Background threads do not execute commands on behalf of clients, so this column may be NULL.
- PROCESSLIST_TIME

The time in seconds that the thread has been in its current state. For a replica SQL thread, the value is the number of seconds between the timestamp of the last replicated event and the real time of the replica host. See Section 19.2.3, "Replication Threads".
- PROCESSLIST_STATE

An action, event, or state that indicates what the thread is doing. For descriptions of PROCESSLIST_STATE values, see Section 10.14, "Examining Server Thread (Process) Information". If the value if NULL, the thread may correspond to an idle client session or the work it is doing is not instrumented with stages.

Most states correspond to very quick operations. If a thread stays in a given state for many seconds, there might be a problem that bears investigation.
- PROCESSLIST_INFO

The statement the thread is executing, or NULL if it is executing no statement. The statement might be the one sent to the server, or an innermost statement if the statement executes other statements. For example, if a CALL statement executes a stored procedure that is executing a SELECT statement, the PROCESSLIST_INFO value shows the SELECT statement.
- PARENT_THREAD_ID

If this thread is a subthread (spawned by another thread), this is the THREAD_ID value of the spawning thread.
- ROLE

Unused.
- INSTRUMENTED

Whether events executed by the thread are instrumented. The value is YES or NO.
- For foreground threads, the initial INSTRUMENTED value is determined by whether the user account associated with the thread matches any row in the setup_actors table. Matching is based on the values of the PROCESSLIST_USER and PROCESSLIST_HOST columns.

If the thread spawns a subthread, matching occurs again for the threads table row created for the subthread.
- For background threads, INSTRUMENTED is YES by default. setup_actors is not consulted because there is no associated user for background threads.
- For any thread, its INSTRUMENTED value can be changed during the lifetime of the thread.

For monitoring of events executed by the thread to occur, these things must be true:
- The thread_instrumentation consumer in the setup_consumers table must be YES.
- The threads. INSTRUMENTED column must be YES.
- Monitoring occurs only for those thread events produced from instruments that have the ENABLED column set to YES in the setup_instruments table.
- HISTORY

Whether to log historical events for the thread. The value is YES or NO.
- For foreground threads, the initial HISTORY value is determined by whether the user account associated with the thread matches any row in the setup_actors table. Matching is based on the values of the PROCESSLIST_USER and PROCESSLIST_HOST columns.

If the thread spawns a subthread, matching occurs again for the threads table row created for the subthread.
- For background threads, HISTORY is YES by default. setup_actors is not consulted because there is no associated user for background threads.
- For any thread, its HISTORY value can be changed during the lifetime of the thread.

For historical event logging for the thread to occur, these things must be true:
- The appropriate history-related consumers in the setup_consumers table must be enabled. For example, wait event logging in the events_waits_history and events_waits_history_long tables requires the corresponding events_waits_history and events_waits_history_long consumers to be YES.
- The threads. HISTORY column must be YES.
- Logging occurs only for those thread events produced from instruments that have the ENABLED column set to YES in the setup_instruments table.
- CONNECTION_TYPE

The protocol used to establish the connection, or NULL for background threads. Permitted values are TCP/IP (TCP/IP connection established without encryption), SSL/TLS (TCP/IP connection established with encryption), Socket (Unix socket file connection), Named Pipe (Windows named pipe connection), and Shared Memory (Windows shared memory connection).
- THREAD_OS_ID

The thread or task identifier as defined by the underlying operating system, if there is one:
- When a MySQL thread is associated with the same operating system thread for its lifetime, THREAD_OS_ID contains the operating system thread ID.
- When a MySQL thread is not associated with the same operating system thread for its lifetime, THREAD_OS_ID contains NULL. This is typical for user sessions when the thread pool plugin is used (see Section 7.6.3, "MySQL Enterprise Thread Pool").

For Windows, THREAD_OS_ID corresponds to the thread ID visible in Process Explorer (https:// technet.microsoft.com/en-us/sysinternals/bb896653.aspx).

For Linux, THREAD_OS_ID corresponds to the value of the gettid ( ) function. This value is exposed, for example, using the perf or ps - L commands, or in the proc file system (/ proc/[pid]/task/[tid]). For more information, see the perf-stat(1), ps(1), and proc(5) man pages.
- RESOURCE_GROUP

The resource group label. This value is NULL if resource groups are not supported on the current platform or server configuration (see Resource Group Restrictions).
- EXECUTION_ENGINE

The query execution engine. The value is either PRIMARY or SECONDARY. For use with MySQL HeatWave Service and MySQL HeatWave, where the PRIMARY engine is InnoDB and the SECONDARY engine is MySQL HeatWave (RAPID). For MySQL Community Edition Server, MySQL Enterprise Edition Server (on-premise), and MySQL HeatWave Service without MySQL HeatWave, the value is always PRIMARY.
- CONTROLLED_MEMORY

Amount of controlled memory used by the thread.
- MAX_CONTROLLED_MEMORY

Maximum value of CONTROLLED_MEMORY seen during the thread execution.
- TOTAL_MEMORY

The current amount of memory, controlled or not, used by the thread.
- MAX_TOTAL_MEMORY

The maximum value of TOTAL_MEMORY seen during the thread execution.
- TELEMETRY_ACTIVE

Whether the thread has an active telemetry seesion attached. The value is YES or NO.
The threads table has these indexes:
- Primary key on (THREAD_ID)
- Index on (NAME)
- Index on (PROCESSLIST_ID)
- Index on (PROCESSLIST_USER, PROCESSLIST_HOST)
- Index on (PROCESSLIST_HOST)
- Index on (THREAD_OS_ID)
- Index on (RESOURCE_GROUP)

TRUNCATE TABLE is not permitted for the threads table.

\subsection*{29.12.22.9 The tls_channel_status Table}

Connection interface TLS properties are set at server startup, and can be updated at runtime using the ALTER INSTANCE RELOAD TLS statement. See Server-Side Runtime Configuration and Monitoring for Encrypted Connections.

The tls_channel_status table provides information about connection interface TLS properties:
```
mysql> SELECT * FROM performance_schema.tls_channel_status\G
************************* 1. row ******************************
    CHANNEL: mysql_main
PROPERTY: Enabled
        VALUE: Yes
************************* 2. row *******************************
    CHANNEL: mysql_main
PROPERTY: ssl_accept_renegotiates
        VALUE: 0
************************** 3.row ******************************************
    CHANNEL: mysql_main
PROPERTY: Ssl_accepts
        VALUE: 2
...
************************** 29. row ****************************************
    CHANNEL: mysql_admin
PROPERTY: Enabled
        VALUE: No
************************** 30. row ****************************************
    CHANNEL: mysql_admin
PROPERTY: ssl_accept_renegotiates
        VALUE: 0
************************** 31. row ****************************************
    CHANNEL: mysql_admin
PROPERTY: Ssl_accepts
        VALUE: 0
...
```


The tls_channel_status table has these columns:
- CHANNEL

The name of the connection interface to which the TLS property row applies. mysql_main and mysql_admin are the channel names for the main and administrative connection interfaces, respectively. For information about the different interfaces, see Section 7.1.12.1, "Connection Interfaces".
- PROPERTY

The TLS property name. The row for the Enabled property indicates overall interface status, where the interface and its status are named in the CHANNEL and VALUE columns, respectively. Other property names indicate particular TLS properties. These often correspond to the names of TLSrelated status variables.
- VALUE

The TLS property value.
The properties exposed by this table are not fixed and depend on the instrumentation implemented by each channel.

For each channel, the row with a PROPERTY value of Enabled indicates whether the channel supports encrypted connections, and other channel rows indicate TLS context properties:
- For mysql_main, the Enabled property is yes or no to indicate whether the main interface supports encrypted connections. Other channel rows display TLS context properties for the main interface.

For the main interface, similar status information can be obtained using these statements:
```
SHOW GLOBAL STATUS LIKE 'current_tls%';
SHOW GLOBAL STATUS LIKE 'ssl%';
```

- For mysql_admin, the Enabled property is no if the administrative interface is not enabled or it is enabled but does not support encrypted connections. Enabled is yes if the interface is enabled and supports encrypted connections.

When Enabled is yes, the other mysql_admin rows indicate channel properties for the administrative interface TLS context only if some nondefault TLS parameter value is configured for that interface. (This is the case if any admin_tls_ $x x x$ or admin_ssl_ $x x x$ system variable is set to a value different from its default.) Otherwise, the administrative interface uses the same TLS context as the main interface.

The tls_channel_status table has no indexes.
TRUNCATE TABLE is not permitted for the tls_channel_status table.

\subsection*{29.12.22.10 The user_defined_functions Table}

The user_defined_functions table contains a row for each loadable function registered automatically by a component or plugin, or manually by a CREATE FUNCTION statement. For information about operations that add or remove table rows, see Section 7.7.1, "Installing and Uninstalling Loadable Functions".

\section*{Note}

The name of the user_defined_functions table stems from the terminology used at its inception for the type of function now known as a loadable function (that is, user-defined function, or UDF).

The user_defined_functions table has these columns:
- UDF_NAME

The function name as referred to in SQL statements. The value is NULL if the function was registered by a CREATE FUNCTION statement and is in the process of unloading.
- UDF_RETURN_TYPE

The function return value type. The value is one of int, decimal, real, char, or row.
- UDF_TYPE

The function type. The value is one of function (scalar) or aggregate.
- UDF_LIBRARY

The name of the library file containing the executable function code. The file is located in the directory named by the plugin_dir system variable. The value is NULL if the function was registered by a component or plugin rather than by a CREATE FUNCTION statement.
- UDF_USAGE_COUNT

The current function usage count. This is used to tell whether statements currently are accessing the function.

The user_defined_functions table has these indexes:
- Primary key on (UDF_NAME)

TRUNCATE TABLE is not permitted for the user_defined_functions table.
The mysql. func system table also lists installed loadable functions, but only those installed using CREATE FUNCTION. The user_defined_functions table lists loadable functions installed using CREATE FUNCTION as well as loadable functions installed automatically by components or plugins. This difference makes user_defined_functions preferable to mysql.func for checking which loadable functions are installed.

\subsection*{29.13 Performance Schema Option and Variable Reference}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 29.16 Performance Schema Variable Reference}
\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline \begin{tabular}{l}
$\_\_\_\_$ \\
performance_s
\end{tabular} & słbema & \section*{Yes} & \section*{Yes} & & Global & ![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4964.jpg?height=47\&width=61\&top_left_y=1373\&top_left_x=1652) \\
\hline \begin{tabular}{l}
$\_\_\_\_$ \\
Performance
\end{tabular} & schema_accou
$\_\_\_\_$ & \begin{tabular}{l}
$\_\_\_\_$ \\
nts_lost
\end{tabular} & & Yes & Global & No \\
\hline \begin{tabular}{l}
$\_\_\_\_$ \\
słbema_accou
\end{tabular} & \begin{tabular}{l}
$\_\_\_\_$ \\
performance
\end{tabular} & néssize
$\_\_\_\_$ & Yes & & \section*{Global} & No \\
\hline \begin{tabular}{l}
$\_\_\_\_$ \\
schema_cond
\end{tabular} & \begin{tabular}{l}
□ \\
Performance
\end{tabular} & ![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4964.jpg?height=54\&width=206\&top_left_y=1538\&top_left_x=745) & & Yes & Global & No \\
\hline \begin{tabular}{l}
$\_\_\_\_$ \\
schema_cond
\end{tabular} & Performance
$\_\_\_\_$ & instances_lost & instances_lost & Yes & \begin{tabular}{l}
$\_\_\_\_$ \\
Glabla
\end{tabular} & No \\
\hline performance-schema-consumer-events-stagescurrent & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-stageshistory & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-stages-history-long & Yes & Yes & & & & \\
\hline performance-schema-consumer-events- & Yes & Yes & & & & \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline statementscpu & & & & & & \\
\hline performance-schema-consumer-events-statementscurrent & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-statementshistory & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-statements-history-long & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-transactionscurrent & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-transactionshistory & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-transactions-history-long & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-waitscurrent & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-waitshistory & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-waits-history-long & Yes & Yes & & & & \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Performance Schema Option and Variable Reference}
\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline performance-schema-consumer-globalinstrumentation & Yes & Yes & & & & \\
\hline performance-schema-consumer-statementsdigest & Yes & Yes & & & & \\
\hline performance-schema-consumer-threadinstrumentation & Yes & Yes & & & & \\
\hline Performance_s & schema_digest & _lost & & Yes & Global & No \\
\hline performance_s & słbema_digest & SYessze & Yes & & Global & No \\
\hline performance_s & słbema_events & Yerages_histo & Yelsong_size & & Global & No \\
\hline performance_s & słebema_events & Yetages_histo & Yesize & & Global & No \\
\hline performance_s & słebema_events & Yeratements_ & history_long_si & ze & Global & No \\
\hline performance_s & syterma_events & Yetatements_ & hisesty_size & & Global & No \\
\hline performance_s & słebema_events & Yeansactions & Missory_long_\$ & size & Global & No \\
\hline performance_s & słebema_events & Yeansactions & Minsory_size & & Global & No \\
\hline performance_s & słebema_events & Yemits_history & Yesg_size & & Global & No \\
\hline performance_s & sckesma_events & Yeaits_history & Ysise & & Global & No \\
\hline Performance_s & schema_file_cl & lasses_lost & & Yes & Global & No \\
\hline Performance_s & schema_file_ha & andles_lost & & Yes & Global & No \\
\hline Performance_s & schema_file_in & stances_lost & & Yes & Global & No \\
\hline Performance_s & schema_hosts & lost & & Yes & Global & No \\
\hline performance_s & słbema_hosts & \$es & Yes & & Global & No \\
\hline performance-schemainstrument & Yes & Yes & & & & \\
\hline Performance_s & schema_locker & _lost & & Yes & Global & No \\
\hline performance_s & sterema_max_c & cored_classes & Yes & & Global & No \\
\hline performance_s & słebema_max_c & cored_instance\$ & Yes & & Global & No \\
\hline performance_s & słberma_max_ & Cigesst_length & Yes & & Global & No \\
\hline performance_s & słberma_max_ & fileesclasses & Yes & & Global & No \\
\hline performance_s & słébma_max_ & fileeshandles & Yes & & Global & No \\
\hline performance_s & słbema_max_ & fileesnstances & Yes & & Global & No \\
\hline performance_s & słberma_max_ & ாணesory_classe & \&es & & Global & No \\
\hline performance_s & słbema_max_ & MYetadata_locks & Yes & & Global & No \\
\hline performance_s & syclesma_max_ & nYetsr_classes & Yes & & Global & No \\
\hline performance_s & stébema_max_ & Metsic_classes & Yes & & Global & No \\
\hline performance_s & słberma_max_ & Medex_classes & Yes & & Global & No \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline performance & scbema_max_musx_instance & & Ses & & Global & No \\
\hline performance_ & scbema_max_pYesared_stater & & Mests_instance & & Global & No \\
\hline performance_ & scbema_max_pY@gram_instan & & des & & Global & No \\
\hline performance_ & sterema_max_rwlesck_classes & & Yes & & Global & No \\
\hline performance_ & scbema_max_rwlesk_instance & & ebes & & Global & No \\
\hline performance_ & słbema_max_syelset_classes & & Yes & & Global & No \\
\hline performance_ & słbema_max_søelset_instance & & ebes & & Global & No \\
\hline performance_ & scbema_max_słœre_classes & & Yes & & Global & No \\
\hline performance_ & scberma_max_słuerment_clas & & S)Pess & & Global & No \\
\hline performance_ & słberma_max_słuement_stad & & Nes & & Global & No \\
\hline performance_ & schema_max_tâlde_handles & & Yes & & Global & No \\
\hline performance_ & scbema_max_tâcte _instances & & Yes & & Global & No \\
\hline performance_ & straema_max_ttYesd_classes & & Yes & & Global & No \\
\hline performance_ & scresma_max_ttresd_instance & & ebes & & Global & No \\
\hline Performance & schema_memory_classes_lost & & & Yes & Global & No \\
\hline Performance & schema_metadata_lock_lost & & & Yes & Global & No \\
\hline Performance & schema_meter_lost & & & Yes & Global & No \\
\hline Performance & schema_metric_lost & & & Yes & Global & No \\
\hline Performance & schema_mutex_classes_lost & & & Yes & Global & No \\
\hline Performance & schema_mutex_instances_lost & & & Yes & Global & No \\
\hline Performance & schema_nested & __statement_lo & st & Yes & Global & No \\
\hline Performance & schema_prepar & red_statements & _lost & Yes & Global & No \\
\hline Performance & schema_progra & m_lost & & Yes & Global & No \\
\hline Performance & schema_rwlock_ & _classes_lost & & Yes & Global & No \\
\hline Performance & schema_rwlock_ & _instances_lost & & Yes & Global & No \\
\hline Performance & schema_sessio & n_connect_attrs & & Yes & Global & No \\
\hline performance_ & słebema_sessio & Yesonnect_attr & yesize & & Global & No \\
\hline performance_ & słésma_setup & aebors_size & Yes & & Global & No \\
\hline performance_ & słésma_setup_ & bejects_size & Yes & & Global & No \\
\hline Performance & schema_socket & t_classes_lost & & Yes & Global & No \\
\hline Performance & schema_socket & t_instances_lost & & Yes & Global & No \\
\hline Performance & schema_stage & classes_lost & & Yes & Global & No \\
\hline Performance & schema_statem & nent_classes_lo & lost & Yes & Global & No \\
\hline Performance & schema_table_ & handles_lost & & Yes & Global & No \\
\hline Performance & schema_table_i & instances_lost & & Yes & Global & No \\
\hline Performance & schema_thread & _classes_lost & & Yes & Global & No \\
\hline Performance & schema_thread & _instances_lost & & Yes & Global & No \\
\hline Performance & schema_users & lost & & Yes & Global & No \\
\hline performance_ & sytbema_users & HES & Yes & & Global & No \\
\hline
\end{tabular}

\subsection*{29.14 Performance Schema Command Options}

Performance Schema parameters can be specified at server startup on the command line or in option files to configure Performance Schema instruments and consumers. Runtime configuration is also possible in many cases (see Section 29.4, "Performance Schema Runtime Configuration"), but startup configuration must be used when runtime configuration is too late to affect instruments that have already been initialized during the startup process.

Performance Schema consumers and instruments can be configured at startup using the following syntax. For additional details, see Section 29.3, "Performance Schema Startup Configuration".
- --performance-schema-consumer-consumer_name=value

Configure a Performance Schema consumer. Consumer names in the setup_consumers table use underscores, but for consumers set at startup, dashes and underscores within the name are equivalent. Options for configuring individual consumers are detailed later in this section.
- --performance-schema-instrument=instrument_name=value

Configure a Performance Schema instrument. The name may be given as a pattern to configure instruments that match the pattern.

The following items configure individual consumers:
- --performance-schema-consumer-events-stages-current=value

Configure the events-stages-current consumer.
- --performance-schema-consumer-events-stages-history=value

Configure the events-stages-history consumer.
- --performance-schema-consumer-events-stages-history-long=value

Configure the events-stages-history-long consumer.
- --performance-schema-consumer-events-statements-cpu=value

Configure the events-statements-cpu consumer.
- --performance-schema-consumer-events-statements-current=value

Configure the events-statements-current consumer.
- --performance-schema-consumer-events-statements-history=value

Configure the events-statements-history consumer.
- --performance-schema-consumer-events-statements-history-long=value

Configure the events-statements-history-long consumer.
- --performance-schema-consumer-events-transactions-current=value

Configure the Performance Schema events-transactions-current consumer.
- --performance-schema-consumer-events-transactions-history=value

Configure the Performance Schema events-transactions-history consumer.
- --performance-schema-consumer-events-transactions-history-long=value

Configure the Performance Schema events-transactions-history-long consumer.
- --performance-schema-consumer-events-waits-current=value

Configure the events-waits-current consumer.
- --performance-schema-consumer-events-waits-history=value

Configure the events-waits-history consumer.
- --performance-schema-consumer-events-waits-history-long=value

Configure the events-waits-history-long consumer.
- --performance-schema-consumer-global-instrumentation=value

Configure the global-instrumentation consumer.
- --performance-schema-consumer-statements-digest=value

Configure the statements-digest consumer.
- --performance-schema-consumer-thread-instrumentation=value

Configure the thread-instrumentation consumer.

\subsection*{29.15 Performance Schema System Variables}

The Performance Schema implements several system variables that provide configuration information:
```
mysql> SHOW VARIABLES LIKE 'perf%';
+---------------------------------------------------------------------
| Variable_name | Value |
| performance_schema | ON
| performance_schema_accounts_size | -1
| performance_schema_digests_size |10000
| performance_schema_error_size |5377
| performance_schema_events_stages_history_long_size |10000
| performance_schema_events_stages_history_size |10
| performance_schema_events_statements_history_long_size |10000
| performance_schema_events_statements_history_size |10
| performance_schema_events_transactions_history_long_size | 10000
| performance_schema_events_transactions_history_size |10
| performance_schema_events_waits_history_long_size |10000
| performance_schema_events_waits_history_size |10
| performance_schema_hosts_size | -1
| performance_schema_max_cond_classes |150
| performance_schema_max_cond_instances | -1
| performance_schema_max_digest_length | 1024
| performance_schema_max_digest_sample_age |60
| performance_schema_max_file_classes |80
| performance_schema_max_file_handles |32768
| performance_schema_max_file_instances | -1
| performance_schema_max_index_stat | -1
| performance_schema_max_memory_classes |470
| performance_schema_max_metadata_locks | -1
| performance_schema_max_meter_classes | 30
| performance_schema_max_metric_classes |600
| performance_schema_max_mutex_classes |350
| performance_schema_max_mutex_instances | -1
| performance_schema_max_prepared_statements_instances | -1
| performance_schema_max_program_instances | -1
| performance_schema_max_rwlock_classes |100
| performance_schema_max_rwlock_instances | -1
| performance_schema_max_socket_classes |10
| performance_schema_max_socket_instances | -1
| performance_schema_max_sql_text_length |1024
| performance_schema_max_stage_classes |175
| performance_schema_max_statement_classes | 220
```

```
performance_schema_max_statement_stack |10
performance_schema_max_table_handles | -1
performance_schema_max_table_instances | -1
performance_schema_max_table_lock_stat | -1
performance_schema_max_thread_classes |100
performance_schema_max_thread_instances | -1
performance_schema_session_connect_attrs_size |512
performance_schema_setup_actors_size | -1
performance_schema_setup_objects_size | -1
performance_schema_show_processlist | OFF
performance_schema_users_size | -1
```


Performance Schema system variables can be set at server startup on the command line or in option files, and many can be set at runtime. See Section 29.13, "Performance Schema Option and Variable Reference".

The Performance Schema automatically sizes the values of several of its parameters at server startup if they are not set explicitly. For more information, see Section 29.3, "Performance Schema Startup Configuration".

Performance Schema system variables have the following meanings:
- performance_schema

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema [=\{OFF|ON\}] \\
\hline System Variable & performance_schema \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

The value of this variable is ON or OFF to indicate whether the Performance Schema is enabled. By default, the value is ON. At server startup, you can specify this variable with no value or a value of ON or 1 to enable it, or with a value of 0FF or 0 to disable it.

Even when the Performance Schema is disabled, it continues to populate the global_variables, session_variables, global_status, and session_status tables. This occurs as necessary to permit the results for the SHOW VARIABLES and SHOW STATUS statements to be drawn from those tables. The Performance Schema also populates some of the replication tables when disabled.
- performance_schema_accounts_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-accounts-size=\# \\
\hline System Variable & performance_schema_accounts_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

The number of rows in the accounts table. If this variable is 0 , the Performance Schema does not maintain connection statistics in the accounts table or status variable information in the status_by_account table.
- performance_schema_digests_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-digests-size=\# \\
\hline System Variable & performance_schema_digests_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autosizing; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

The maximum number of rows in the events_statements_summary_by_digest table. If this maximum is exceeded such that a digest cannot be instrumented, the Performance Schema increments the Performance_schema_digest_lost status variable.

For more information about statement digesting, see Section 29.10, "Performance Schema Statement Digests and Sampling".
- performance_schema_error_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-error-size=\# \\
\hline System Variable & performance_schema_error_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & number of server error codes \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

The number of instrumented server error codes. The default value is the actual number of server error codes. Although the value can be set anywhere from 0 to its maximum, the intended use is to set it to either its default (to instrument all errors) or 0 (to instrument no errors).

Error information is aggregated in summary tables; see Section 29.12.20.11, "Error Summary Tables". If an error occurs that is not instrumented, information for the occurrence is aggregated to the NULL row in each summary table; that is, to the row with ERROR_NUMBER=0, ERROR_NAME=NULL, and SQLSTATE=NULL.
- performance_schema_events_stages_history_long_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
-- performance-schema-events-stages - \\
history-long-size=\#
\end{tabular} \\
\hline System Variable & performance_schema_events_stages_history_lo \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Performance Schema System Variables}
\begin{tabular}{|l|l|}
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autosizing; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}
\end{table}

The number of rows in the events_stages_history_long table.
- performance_schema_events_stages_history_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-events-stages-history-size=\# \\
\hline System Variable & performance_schema_events_stages_history_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autosizing; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 1024 \\
\hline
\end{tabular}

The number of rows per thread in the events_stages_history table.
- performance_schema_events_statements_history_long_size

\begin{tabular}{|l|l|l|}
\hline Command-Line Format & --performance-schema-events-statements-history-long-size=\# & \\
\hline System Variable & performance_schema_events_statements_history_l & \\
\hline Scope & Global & \\
\hline Dynamic & No & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & Integer & \\
\hline Default Value & -1 (signifies autosizing; do not assign this literal value) & \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) & \\
\hline Maximum Value & 1048576 & \\
\hline
\end{tabular}

The number of rows in the events_statements_history_long table.
- performance_schema_events_statements_history_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- - performance-schema-events - \\
statements-history-size=\#
\end{tabular} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline System Variable & performance_schema_events_statements_histor & \\
\hline Scope & Global & \\
\hline Dynamic & No & \\
\hline SET_VAR Hint Applies & No & \\
\hline Type & Integer & \\
\hline Default Value & -1 (signifies autosizing; do not assign this literal value) & \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) & \\
\hline Maximum Value & 1024 & \\
\hline
\end{tabular}

The number of rows per thread in the events_statements_history table.
- performance_schema_events_transactions_history_long_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-events-transactions-history-long-size=\# \\
\hline System Variable & performance_schema_events_transactions_hist \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autosizing; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

The number of rows in the events_transactions_history_long table.
- performance_schema_events_transactions_history_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-events-transactions-history-size=\# \\
\hline System Variable & performance_schema_events_transactions_hist \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autosizing; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 1024 \\
\hline
\end{tabular}

The number of rows per thread in the events_transactions_history table.
- performance_schema_events_waits_history_long_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - performance-schema-events-waits-history-long-size=\# \\
\hline System Variable & performance_schema_events_waits_history_long_s \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autosizing; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

The number of rows in the events_waits_history_long table.
- performance_schema_events_waits_history_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - performance-schema-events-waits-history-size=\# \\
\hline System Variable & performance_schema_events_waits_history_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autosizing; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 1024 \\
\hline
\end{tabular}

The number of rows per thread in the events_waits_history table.
- performance_schema_hosts_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-hosts-size=\# \\
\hline System Variable & performance_schema_hosts_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

The number of rows in the hosts table. If this variable is 0 , the Performance Schema does not maintain connection statistics in the hosts table or status variable information in the status_by_host table.
- performance_schema_max_cond_classes

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-condclasses=\# \\
\hline System Variable & performance_schema_max_cond_classes \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 150 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1024 \\
\hline
\end{tabular}

The maximum number of condition instruments. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".
- performance_schema_max_cond_instances

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-condinstances=\# \\
\hline System Variable & performance_schema_max_cond_instances \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

The maximum number of instrumented condition objects. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".
- performance_schema_max_digest_length

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-digestlength=\# \\
\hline System Variable & performance_schema_max_digest_length \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1024 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Minimum Value & 0 \\
\hline Maximum Value & 1048576 \\
\hline Unit & bytes \\
\hline
\end{tabular}

The maximum number of bytes of memory reserved per statement for computation of normalized statement digest values in the Performance Schema. This variable is related to max_digest_length; see the description of that variable in Section 7.1.8, "Server System Variables".

For more information about statement digesting, including considerations regarding memory use, see Section 29.10, "Performance Schema Statement Digests and Sampling".
- performance_schema_max_digest_sample_age

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-digest-sample-age=\# \\
\hline System Variable & performance_schema_max_digest_sample_age \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 60 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1048576 \\
\hline Unit & seconds \\
\hline
\end{tabular}

This variable affects statement sampling for the events_statements_summary_by_digest table. When a new table row is inserted, the statement that produced the row digest value is stored as the current sample statement associated with the digest. Thereafter, when the server sees other statements with the same digest value, it determines whether to use the new statement to replace the current sample statement (that is, whether to resample). Resampling policy is based on the comparative wait times of the current sample statement and new statement and, optionally, the age of the current sample statement:
- Resampling based on wait times: If the new statement wait time has a wait time greater than that of the current sample statement, it becomes the current sample statement.
- Resampling based on age: If the performance_schema_max_digest_sample_age system variable has a value greater than zero and the current sample statement is more than that many seconds old, the current statement is considered "too old" and the new statement replaces it. This occurs even if the new statement wait time is less than that of the current sample statement.

For information about statement sampling, see Section 29.10, "Performance Schema Statement Digests and Sampling".
- performance_schema_max_file_classes

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-fileclasses=\# \\
\hline System Variable & performance_schema_max_file_classes \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET VAR Hint Applies & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Integer \\
\hline Default Value & 80 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1024 \\
\hline
\end{tabular}

The maximum number of file instruments. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".
- performance_schema_max_file_handles

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-filehandles=\# \\
\hline System Variable & performance_schema_max_file_handles \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 32768 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

The maximum number of opened file objects. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".

The value of performance_schema_max_file_handles should be greater than the value of open_files_limit: open_files_limit affects the maximum number of open file handles the server can support and performance_schema_max_file_handles affects how many of these file handles can be instrumented.
- performance_schema_max_file_instances

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-fileinstances=\# \\
\hline System Variable & performance_schema_max_file_instances \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

The maximum number of instrumented file objects. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".
- performance_schema_max_index_stat

\begin{tabular}{|l|l|l|}
\cline { 2 - 3 } & Command-Line Format & - - performance-schema-max-index- \\
\hline & stat=\# \\
\cline { 2 - 3 } & & 4947 \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Performance Schema System Variables}
\begin{tabular}{|l|l|}
\hline System Variable & performance_schema_max_index_stat \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autosizing; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}
\end{table}

The maximum number of indexes for which the Performance Schema maintains statistics. If this maximum is exceeded such that index statistics are lost, the Performance Schema increments the Performance_schema_index_stat_lost status variable. The default value is autosized using the value of performance_schema_max_table_instances.
- performance_schema_max_memory_classes

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-memoryclasses=\# \\
\hline System Variable & performance_schema_max_memory_classes \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 470 \\
\hline Default Value & 450 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1024 \\
\hline
\end{tabular}

The maximum number of memory instruments. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".
- performance_schema_max_metadata_locks

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-metadatalocks=\# \\
\hline System Variable & performance_schema_max_metadata_locks \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Maximum Value & 10485760 \\
\hline
\end{tabular}

The maximum number of metadata lock instruments. This value controls the size of the metadata_locks table. If this maximum is exceeded such that a metadata lock cannot be instrumented, the Performance Schema increments the Performance_schema_metadata_lock_lost status variable.
- performance_schema_max_meter_classes

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-meterclasses=\# \\
\hline System Variable & performance_schema_max_meter_classes \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 30 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 64 \\
\hline
\end{tabular}

Maximum number of meter instruments which can be created
- performance_schema_max_metric_classes

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-metricclasses=\# \\
\hline System Variable & performance_schema_max_metric_classes \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 600 \\
\hline Minimum Value & 30 \\
\hline Maximum Value & 11000 \\
\hline
\end{tabular}

Maximum number of metric instruments which can be created.
- performance_schema_max_mutex_classes

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - performance-schema-max-mutexclasses=\# \\
\hline System Variable & performance_schema_max_mutex_classes \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 350 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Maximum Value & 1024 \\
\hline
\end{tabular}

The maximum number of mutex instruments. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".
- performance_schema_max_mutex_instances

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-mutexinstances=\# \\
\hline System Variable & performance_schema_max_mutex_instances \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 104857600 \\
\hline
\end{tabular}

The maximum number of instrumented mutex objects. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".
- performance_schema_max_prepared_statements_instances

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - performance-schema-max-prepared-statements-instances=\# \\
\hline System Variable & performance_schema_max_prepared_statements_ins \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 4194304 \\
\hline
\end{tabular}

The maximum number of rows in the prepared_statements_instances table. If this maximum is exceeded such that a prepared statement cannot be instrumented, the Performance Schema increments the Performance_schema_prepared_statements_lost status variable. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".

The default value of this variable is autosized based on the value of the max_prepared_stmt_count system variable.
- performance_schema_max_rwlock_classes

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- - performance - schema -max - rwlock - \\
classes $=\#$
\end{tabular} \\
\hline System Variable & performance_schema_max_rwlock_classes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 100 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1024 \\
\hline
\end{tabular}

The maximum number of rwlock instruments. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".
- performance_schema_max_program_instances

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - performance-schema-max-programinstances=\# \\
\hline System Variable & performance_schema_max_program_instances \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

The maximum number of stored programs for which the Performance Schema maintains statistics. If this maximum is exceeded, the Performance Schema increments the Performance_schema_program_lost status variable. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".
- performance_schema_max_rwlock_instances

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-rwlockinstances=\# \\
\hline System Variable & performance_schema_max_rwlock_instances \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autosizing; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autosizing; do not assign this literal value) \\
\hline Maximum Value & 104857600 \\
\hline
\end{tabular}

The maximum number of instrumented rwlock objects. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".
- performance_schema_max_socket_classes

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - performance-schema-max-socketclasses=\# \\
\hline System Variable & performance_schema_max_socket_classes \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 10 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1024 \\
\hline
\end{tabular}

The maximum number of socket instruments. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".
- performance_schema_max_socket_instances

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-socketinstances=\# \\
\hline System Variable & performance_schema_max_socket_instances \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

The maximum number of instrumented socket objects. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".
- performance_schema_max_sql_text_length

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-sql-textlength=\# \\
\hline System Variable & performance_schema_max_sql_text_length \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1024 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Unit & bytes \\
\hline
\end{tabular}

The maximum number of bytes used to store SQL statements. The value applies to storage required for these columns:
- The SQL_TEXT column of the events_statements_current, events_statements_history, and events_statements_history_long statement event tables.
- The QUERY_SAMPLE_TEXT column of the events_statements_summary_by_digest summary table.

Any bytes in excess of performance_schema_max_sql_text_length are discarded and do not appear in the column. Statements differing only after that many initial bytes are indistinguishable in the column.

Decreasing the performance_schema_max_sql_text_length value reduces memory use but causes more statements to become indistinguishable if they differ only at the end. Increasing the value increases memory use but permits longer statements to be distinguished.
- performance_schema_max_stage_classes

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-stageclasses=\# \\
\hline System Variable & performance_schema_max_stage_classes \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 175 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1024 \\
\hline
\end{tabular}

The maximum number of stage instruments. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".
- performance_schema_max_statement_classes

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-statementclasses=\# \\
\hline System Variable & performance_schema_max_statement_classes \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

Maximum Value

The maximum number of statement instruments. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".

The default value is calculated at server build time based on the number of commands in the client/ server protocol and the number of SQL statement types supported by the server.

This variable should not be changed, unless to set it to 0 to disable all statement instrumentation and save all memory associated with it. Setting the variable to nonzero values other than the default has no benefit; in particular, values larger than the default cause more memory to be allocated then is needed.
- performance_schema_max_statement_stack

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-statementstack=\# \\
\hline System Variable & performance_schema_max_statement_stack \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 10 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 256 \\
\hline
\end{tabular}

The maximum depth of nested stored program calls for which the Performance Schema maintains statistics. When this maximum is exceeded, the Performance Schema increments the Performance_schema_nested_statement_lost status variable for each stored program statement executed.
- performance_schema_max_table_handles

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-tablehandles=\# \\
\hline System Variable & performance_schema_max_table_handles \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

The maximum number of opened table objects. This value controls the size of the table_handles table. If this maximum is exceeded such that a table handle cannot be instrumented, the Performance Schema increments the Performance_schema_table_handles_lost status variable. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".
- performance_schema_max_table_instances

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - performance - schema-max-tableinstances=\# \\
\hline System Variable & performance_schema_max_table_instances \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

The maximum number of instrumented table objects. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".
- performance_schema_max_table_lock_stat

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-table-lockstat=\# \\
\hline System Variable & performance_schema_max_table_lock_stat \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autosizing; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

The maximum number of tables for which the Performance Schema maintains lock statistics. If this maximum is exceeded such that table lock statistics are lost, the Performance Schema increments the Performance_schema_table_lock_stat_lost status variable.
- performance_schema_max_thread_classes

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-max-threadclasses=\# \\
\hline System Variable & performance_schema_max_thread_classes \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 100 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Maximum Value & 1024
\end{tabular}

The maximum number of thread instruments. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".
- performance_schema_max_thread_instances

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - performance-schema-max-threadinstances=\# \\
\hline System Variable & performance_schema_max_thread_instances \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autosizing; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

The maximum number of instrumented thread objects. The value controls the size of the threads table. If this maximum is exceeded such that a thread cannot be instrumented, the Performance Schema increments the Performance_schema_thread_instances_lost status variable. For information about how to set and use this variable, see Section 29.7, "Performance Schema Status Monitoring".

The max_connections system variable affects how many threads can run in the server. performance_schema_max_thread_instances affects how many of these running threads can be instrumented.

The variables_by_thread and status_by_thread tables contain system and status variable information only about foreground threads. If not all threads are instrumented by the Performance Schema, this table misses some rows. In this case, the Performance_schema_thread_instances_lost status variable is greater than zero.
- performance_schema_session_connect_attrs_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-session-connect-attrs-size=\# \\
\hline System Variable & performance_schema_session_connect_attrs_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autosizing; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autosizing; do not assign this literal value) \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Unit & bytes \\
\hline
\end{tabular}

The amount of preallocated memory per thread reserved to hold connection attribute keyvalue pairs. If the aggregate size of connection attribute data sent by a client is larger than this amount, the Performance Schema truncates the attribute data, increments the Performance_schema_session_connect_attrs_lost status variable, and writes a message to the error log indicating that truncation occurred if the log_error_verbosity system variable is greater than 1. A _truncated attribute is also added to the session attributes with a value indicating how many bytes were lost, if the attribute buffer has sufficient space. This enables the Performance Schema to expose per-connection truncation information in the connection attribute tables. This information can be examined without having to check the error log.

The default value of performance_schema_session_connect_attrs_size is autosized at server startup. This value may be small, so if truncation occurs (Performance_schema_session_connect_attrs_lost becomes nonzero), you may wish to set performance_schema_session_connect_attrs_size explicitly to a larger value.

Although the maximum permitted performance_schema_session_connect_attrs_size value is 1 MB , the effective maximum is 64 KB because the server imposes a limit of 64 KB on the aggregate size of connection attribute data it accepts. If a client attempts to send more than 64 KB of attribute data, the server rejects the connection. For more information, see Section 29.12.9, "Performance Schema Connection Attribute Tables".
- performance_schema_setup_actors_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-setup-actorssize=\# \\
\hline System Variable & performance_schema_setup_actors_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autosizing; do not assign this literal value) \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

The number of rows in the setup_actors table.
- performance_schema_setup_objects_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-setup-objectssize=\# \\
\hline System Variable & performance_schema_setup_objects_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Maximum Value & 1048576 \\
\hline
\end{tabular}

The number of rows in the setup_objects table.
- performance_schema_show_processlist

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - performance - schema-showprocesslist[=\{OFF|ON\}] \\
\hline Deprecated & Yes \\
\hline System Variable & performance_schema_show_processlist \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

The SHOW PROCESSLIST statement provides process information by collecting thread data from all active threads. The performance_schema_show_processlist variable determines which SHOW PROCESSLIST implementation to use:
- The default implementation iterates across active threads from within the thread manager while holding a global mutex. This has negative performance consequences, particularly on busy systems.
- The alternative SHOW PROCESSLIST implementation is based on the Performance Schema processlist table. This implementation queries active thread data from the Performance Schema rather than the thread manager and does not require a mutex.

To enable the alternative implementation, enable the performance_schema_show_processlist system variable. To ensure that the default and alternative implementations yield the same information, certain configuration requirements must be met; see Section 29.12.22.7, "The processlist Table".
- performance_schema_users_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --performance-schema-users-size=\# \\
\hline System Variable & performance_schema_users_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Minimum Value & -1 (signifies autoscaling; do not assign this literal value) \\
\hline Maximum Value & 1048576 \\
\hline
\end{tabular}

The number of rows in the users table. If this variable is 0 , the Performance Schema does not maintain connection statistics in the users table or status variable information in the status_by_user table.

\subsection*{29.16 Performance Schema Status Variables}

The Performance Schema implements several status variables that provide information about instrumentation that could not be loaded or created due to memory constraints:
```
mysql> SHOW STATUS LIKE 'perf%';
+-------------------------------------------------------------------
| Variable_name | Value |
+-----------------------------------------------------------------
| Performance_schema_accounts_lost | 0
| Performance_schema_cond_classes_lost | 0
| Performance_schema_cond_instances_lost | 0
| Performance_schema_digest_lost | 0
| Performance_schema_file_classes_lost | 0
| Performance_schema_file_handles_lost | 0
| Performance_schema_file_instances_lost | 0
| Performance_schema_hosts_lost | 0
| Performance_schema_index_stat_lost | 0
| Performance_schema_locker_lost | 0
| Performance_schema_memory_classes_lost | 0
| Performance_schema_metadata_lock_lost | 0
| Performance_schema_meter_lost | 0
| Performance_schema_metric_lost | 0
| Performance_schema_mutex_classes_lost | 0
| Performance_schema_mutex_instances_lost | 0
| Performance_schema_nested_statement_lost | 0
| Performance_schema_prepared_statements_lost | 0
| Performance_schema_program_lost |0
| Performance_schema_rwlock_classes_lost | 0
| Performance_schema_rwlock_instances_lost | 0
| Performance_schema_session_connect_attrs_longest_seen | 131
| Performance_schema_session_connect_attrs_lost | 0
| Performance_schema_socket_classes_lost | 0
| Performance_schema_socket_instances_lost | 0
| Performance_schema_stage_classes_lost |0
| Performance_schema_statement_classes_lost | 0
| Performance_schema_table_handles_lost |0
| Performance_schema_table_instances_lost |0
| Performance_schema_table_lock_stat_lost |0
| Performance_schema_thread_classes_lost |0
| Performance_schema_thread_instances_lost | 0
| Performance_schema_users_lost | 0
+-----------------------------------------------------------------
```


For information on using these variables to check Performance Schema status, see Section 29.7, "Performance Schema Status Monitoring".

Performance Schema status variables have the following meanings:
- Performance_schema_accounts_lost

The number of times a row could not be added to the accounts table because it was full.
- Performance_schema_cond_classes_lost

How many condition instruments could not be loaded.
- Performance_schema_cond_instances_lost

How many condition instrument instances could not be created.
- Performance_schema_digest_lost

The number of digest instances that could not be instrumented in the events_statements_summary_by_digest table. This can be nonzero if the value of performance_schema_digests_size is too small.
- Performance_schema_file_classes_lost

How many file instruments could not be loaded.
- Performance_schema_file_handles_lost

How many file instrument instances could not be opened.
- Performance_schema_file_instances_lost

How many file instrument instances could not be created.
- Performance_schema_hosts_lost

The number of times a row could not be added to the hosts table because it was full.
- Performance_schema_index_stat_lost

The number of indexes for which statistics were lost. This can be nonzero if the value of performance_schema_max_index_stat is too small.
- Performance_schema_locker_lost

How many events are "lost" or not recorded, due to the following conditions:
- Events are recursive (for example, waiting for A caused a wait on B, which caused a wait on C).
- The depth of the nested events stack is greater than the limit imposed by the implementation.

Events recorded by the Performance Schema are not recursive, so this variable should always be 0 .
- Performance_schema_memory_classes_lost

The number of times a memory instrument could not be loaded.
- Performance_schema_metadata_lock_lost

The number of metadata locks that could not be instrumented in the metadata_locks table. This can be nonzero if the value of performance_schema_max_metadata_locks is too small.
- Performance_schema_meter_lost

Number of meter instruments that failed to be created.
- Performance_schema_metric_lost

Number of metric instruments that failed to be created.
- Performance_schema_mutex_classes_lost

How many mutex instruments could not be loaded.
- Performance_schema_mutex_instances_lost

How many mutex instrument instances could not be created.
- Performance_schema_nested_statement_lost

The number of stored program statements for which statistics were lost. This can be nonzero if the value of performance_schema_max_statement_stack is too small.
- Performance_schema_prepared_statements_lost

The number of prepared statements that could not be instrumented in the prepared_statements_instances table. This can be nonzero if the value of performance_schema_max_prepared_statements_instances is too small.
- Performance_schema_program_lost

The number of stored programs for which statistics were lost. This can be nonzero if the value of performance_schema_max_program_instances is too small.
- Performance_schema_rwlock_classes_lost

How many rwlock instruments could not be loaded.
- Performance_schema_rwlock_instances_lost

How many rwlock instrument instances could not be created.
- Performance_schema_session_connect_attrs_longest_seen

In addition to the connection attribute size-limit check performed by the Performance Schema against the value of the performance_schema_session_connect_attrs_size system variable, the server performs a preliminary check, imposing a limit of 64 KB on the aggregate size of connection attribute data it accepts. If a client attempts to send more than 64 KB of attribute data, the server rejects the connection. Otherwise, the server considers the attribute buffer valid and tracks the size of the longest such buffer in the Performance_schema_session_connect_attrs_longest_seen status variable. If this value is larger than performance_schema_session_connect_attrs_size, DBAs may wish to increase the latter value, or, alternatively, investigate which clients are sending large amounts of attribute data.

For more information about connection attributes, see Section 29.12.9, "Performance Schema Connection Attribute Tables".
- Performance_schema_session_connect_attrs_lost

The number of connections for which connection attribute truncation has occurred.
For a given connection, if the client sends connection attribute key-value pairs for which the aggregate size is larger than the reserved storage permitted by the value of the performance_schema_session_connect_attrs_size system variable, the Performance Schema truncates the attribute data and increments Performance_schema_session_connect_attrs_lost. If this value is nonzero, you may wish to set performance_schema_session_connect_attrs_size to a larger value.

For more information about connection attributes, see Section 29.12.9, "Performance Schema Connection Attribute Tables".
- Performance_schema_socket_classes_lost

How many socket instruments could not be loaded.
- Performance_schema_socket_instances_lost

How many socket instrument instances could not be created.
- Performance_schema_stage_classes_lost

How many stage instruments could not be loaded.
- Performance_schema_statement_classes_lost

How many statement instruments could not be loaded.
- Performance_schema_table_handles_lost

How many table instrument instances could not be opened. This can be nonzero if the value of performance_schema_max_table_handles is too small.
- Performance_schema_table_instances_lost

How many table instrument instances could not be created.
- Performance_schema_table_lock_stat_lost

The number of tables for which lock statistics were lost. This can be nonzero if the value of performance_schema_max_table_lock_stat is too small.
- Performance_schema_thread_classes_lost

How many thread instruments could not be loaded.
- Performance_schema_thread_instances_lost

The number of thread instances that could not be instrumented in the threads table. This can be nonzero if the value of performance_schema_max_thread_instances is too small.
- Performance_schema_users_lost

The number of times a row could not be added to the users table because it was full.

\subsection*{29.17 The Performance Schema Memory-Allocation Model}

The Performance Schema uses this memory allocation model:
- May allocate memory at server startup
- May allocate additional memory during server operation
- Never free memory during server operation (although it might be recycled)
- Free all memory used at shutdown

The result is to relax memory constraints so that the Performance Schema can be used with less configuration, and to decrease the memory footprint so that consumption scales with server load. Memory used depends on the load actually seen, not the load estimated or explicitly configured for.

Several Performance Schema sizing parameters are autoscaled and need not be configured explicitly unless you want to establish an explicit limit on memory allocation:
```
performance_schema_accounts_size
performance_schema_hosts_size
performance_schema_max_cond_instances
performance_schema_max_file_instances
performance_schema_max_index_stat
performance_schema_max_metadata_locks
performance_schema_max_mutex_instances
performance_schema_max_prepared_statements_instances
performance_schema_max_program_instances
performance_schema_max_rwlock_instances
performance_schema_max_socket_instances
performance_schema_max_table_handles
performance_schema_max_table_instances
performance_schema_max_table_lock_stat
performance_schema_max_thread_instances
performance_schema_users_size
```


For an autoscaled parameter, configuration works like this:
- With the value set to -1 (the default), the parameter is autoscaled:
- The corresponding internal buffer is empty initially and no memory is allocated.
- As the Performance Schema collects data, memory is allocated in the corresponding buffer. The buffer size is unbounded, and may grow with the load.
- With the value set to 0 :
- The corresponding internal buffer is empty initially and no memory is allocated.
- With the value set to $N>0$ :
- The corresponding internal buffer is empty initially and no memory is allocated.
- As the Performance Schema collects data, memory is allocated in the corresponding buffer, until the buffer size reaches $N$.
- Once the buffer size reaches $N$, no more memory is allocated. Data collected by the Performance Schema for this buffer is lost, and any corresponding "lost instance" counters are incremented.

To see how much memory the Performance Schema is using, check the instruments designed for that purpose. The Performance Schema allocates memory internally and associates each buffer with a dedicated instrument so that memory consumption can be traced to individual buffers. Instruments named with the prefix memory/performance_schema/ expose how much memory is allocated for these internal buffers. The buffers are global to the server, so the instruments are displayed only in the memory_summary_global_by_event_name table, and not in other memory_summary_by_xxx_by_event_name tables.

This query shows the information associated with the memory instruments:
SELECT * FROM performance_schema.memory_summary_global_by_event_name
WHERE EVENT_NAME LIKE 'memory/performance_schema/\%';

\subsection*{29.18 Performance Schema and Plugins}

Removing a plugin with UNINSTALL PLUGIN does not affect information already collected for code in that plugin. Time spent executing the code while the plugin was loaded was still spent even if the plugin is unloaded later. The associated event information, including aggregate information, remains readable in performance_schema database tables. For additional information about the effect of plugin installation and removal, see Section 29.7, "Performance Schema Status Monitoring".

A plugin implementor who instruments plugin code should document its instrumentation characteristics to enable those who load the plugin to account for its requirements. For example, a third-party storage engine should include in its documentation how much memory the engine needs for mutex and other instruments.

\subsection*{29.19 Using the Performance Schema to Diagnose Problems}

The Performance Schema is a tool to help a DBA do performance tuning by taking real measurements instead of "wild guesses." This section demonstrates some ways to use the Performance Schema for this purpose. The discussion here relies on the use of event filtering, which is described in Section 29.4.2, "Performance Schema Event Filtering".

The following example provides one methodology that you can use to analyze a repeatable problem, such as investigating a performance bottleneck. To begin, you should have a repeatable use case where performance is deemed "too slow" and needs optimization, and you should enable all instrumentation (no pre-filtering at all).
1. Run the use case.
2. Using the Performance Schema tables, analyze the root cause of the performance problem. This analysis relies heavily on post-filtering.
3. For problem areas that are ruled out, disable the corresponding instruments. For example, if analysis shows that the issue is not related to file I/O in a particular storage engine, disable the file I/O instruments for that engine. Then truncate the history and summary tables to remove previously collected events.
4. Repeat the process at step 1.

With each iteration, the Performance Schema output, particularly the events_waits_history_long table, contains less and less "noise" caused by nonsignificant instruments, and given that this table has a fixed size, contains more and more data relevant to the analysis of the problem at hand.

With each iteration, investigation should lead closer and closer to the root cause of the problem, as the "signal/noise" ratio improves, making analysis easier.
5. Once a root cause of performance bottleneck is identified, take the appropriate corrective action, such as:
- Tune the server parameters (cache sizes, memory, and so forth).
- Tune a query by writing it differently,
- Tune the database schema (tables, indexes, and so forth).
- Tune the code (this applies to storage engine or server developers only).
6. Start again at step 1, to see the effects of the changes on performance.

The mutex_instances. LOCKED_BY_THREAD_ID and rwlock_instances.WRITE_LOCKED_BY_THREAD_ID columns are extremely important for investigating performance bottlenecks or deadlocks. This is made possible by Performance Schema instrumentation as follows:
1. Suppose that thread 1 is stuck waiting for a mutex.
2. You can determine what the thread is waiting for:

SELECT * FROM performance_schema.events_waits_current
WHERE THREAD_ID = thread_1;
Say the query result identifies that the thread is waiting for mutex A , found in events_waits_current.OBJECT_INSTANCE_BEGIN.
3. You can determine which thread is holding mutex A:

SELECT * FROM performance_schema.mutex_instances
WHERE OBJECT_INSTANCE_BEGIN = mutex_A;
Say the query result identifies that it is thread 2 holding mutex A, as found in mutex_instances. LOCKED_BY_THREAD_ID.
4. You can see what thread 2 is doing:

SELECT * FROM performance_schema.events_waits_current
WHERE THREAD_ID = thread_2;

\subsection*{29.19.1 Query Profiling Using Performance Schema}

The following example demonstrates how to use Performance Schema statement events and stage events to retrieve data comparable to profiling information provided by SHOW PROFILES and SHOW PROFILE statements.

The setup_actors table can be used to limit the collection of historical events by host, user, or account to reduce runtime overhead and the amount of data collected in history tables. The first step of the example shows how to limit collection of historical events to a specific user.

Performance Schema displays event timer information in picoseconds (trillionths of a second) to normalize timing data to a standard unit. In the following example, TIMER_WAIT values are divided
by 1000000000000 to show data in units of seconds. Values are also truncated to 6 decimal places to display data in the same format as SHOW PROFILES and SHOW PROFILE statements.
1. Limit the collection of historical events to the user that runs the query. By default, setup_actors is configured to allow monitoring and historical event collection for all foreground threads:
```
mysql> SELECT * FROM performance_schema.setup_actors;
+------+-------+-------+---------+---------+
| HOST | USER | ROLE | ENABLED | HISTORY |
+------+-------+-------+---------+---------+
| % | % | % | YES | YES |
+------+-------+------+---------+---------+
```


Update the default row in the setup_actors table to disable historical event collection and monitoring for all foreground threads, and insert a new row that enables monitoring and historical event collection for the user that runs the query:
```
mysql> UPDATE performance_schema.setup_actors
    SET ENABLED = 'NO', HISTORY = 'NO'
    WHERE HOST = '%' AND USER = '%';
mysql> INSERT INTO performance_schema.setup_actors
    (HOST, USER, ROLE, ENABLED, HISTORY)
    VALUES('localhost','test_user','%','YES','YES');
```


Data in the setup_actors table should now appear similar to the following:
```
mysql> SELECT * FROM performance_schema.setup_actors;
+------------+------------+------+----------+----------+

\begin{tabular}{|l|l|l|l|l|}
\hline HOST & USER & ROLE & ENABLED & HISTORY \\
\hline \% & \% & \% & NO & NO \\
\hline localhost & test_user & \% & YES & YES \\
\hline
\end{tabular}
```

2. Ensure that statement and stage instrumentation is enabled by updating the setup_instruments table. Some instruments may already be enabled by default.
```
mysql> UPDATE performance_schema.setup_instruments
    SET ENABLED = 'YES', TIMED = 'YES'
    WHERE NAME LIKE '%statement/%';
mysql> UPDATE performance_schema.setup_instruments
    SET ENABLED = 'YES', TIMED = 'YES'
    WHERE NAME LIKE '%stage/%';
```

3. Ensure that events_statements_* and events_stages_* consumers are enabled. Some consumers may already be enabled by default.
```
mysql> UPDATE performance_schema.setup_consumers
    SET ENABLED = 'YES'
    WHERE NAME LIKE '%events_statements_%';
mysql> UPDATE performance_schema.setup_consumers
    SET ENABLED = 'YES'
    WHERE NAME LIKE '%events_stages_%';
```

4. Under the user account you are monitoring, run the statement that you want to profile. For example:
```
mysql> SELECT * FROM employees.employees WHERE emp_no = 10001;
+--------+-------------+------------+-----------+--------+-----------+
| emp_no | birth_date | first_name | last_name | gender | hire_date |
+--------+------------+------------+-----------+--------+------------+
| 10001 | 1953-09-02 | Georgi | Facello | M | 1986-06-26 |
+--------+------------+------------+-----------+--------+-----------+
```

5. Identify the EVENT_ID of the statement by querying the events_statements_history_long table. This step is similar to running SHOW PROFILES to identify the Query_ID. The following query produces output similar to SHOW PROFILES:
```
mysql> SELECT EVENT_ID, TRUNCATE(TIMER_WAIT/1000000000000,6) as Duration, SQL_TEXT
    FROM performance_schema.events_statements_history_long WHERE SQL_TEXT like '%10001%';
+----------+----------+-------------------------------------------------------
| event_id | duration | sql_text |
+----------+-----------+-------------------------------------------------------
| 31 | 0.028310 | SELECT * FROM employees.employees WHERE emp_no = 10001 |
+----------+-----------+-------------------------------------------------------
```

6. Query the events_stages_history_long table to retrieve the statement's stage events. Stages are linked to statements using event nesting. Each stage event record has a NESTING_EVENT_ID column that contains the EVENT_ID of the parent statement.
```
mysql> SELECT event_name AS Stage, TRUNCATE(TIMER_WAIT/1000000000000,6) AS Duration
    FROM performance_schema.events_stages_history_long WHERE NESTING_EVENT_ID=31;
+---------------------------------+----------+
| Stage | Duration |
+---------------------------------+----------+
| stage/sql/starting | 0.000080 |
| stage/sql/checking permissions | 0.000005 |
| stage/sql/Opening tables | 0.027759 |
| stage/sql/init |0.000052 |
| stage/sql/System lock | 0.000009 |
| stage/sql/optimizing | 0.000006 |
| stage/sql/statistics | 0.000082 |
| stage/sql/preparing | 0.000008 |
| stage/sql/executing |0.000000 |
| stage/sql/Sending data |0.000017 |
| stage/sql/end |0.000001 |
| stage/sql/query end |0.000004
| stage/sql/closing tables |0.000006
| stage/sql/freeing items | 0.000272 |
| stage/sql/cleaning up | 0.000001 |
+---------------------------------+---------+
```


\subsection*{29.19.2 Obtaining Parent Event Information}

The data_locks table shows data locks held and requested. Rows of this table have a THREAD_ID column indicating the thread ID of the session that owns the lock, and an EVENT_ID column indicating the Performance Schema event that caused the lock. Tuples of (THREAD_ID, EVENT_ID) values implicitly identify a parent event in other Performance Schema tables:
- The parent wait event in the events_waits_xxx tables
- The parent stage event in the events_stages_xxx tables
- The parent statement event in the events_statements_xxx tables
- The parent transaction event in the events_transactions_current table

To obtain details about the parent event, join the THREAD_ID and EVENT_ID columns with the columns of like name in the appropriate parent event table. The relation is based on a nested set data model, so the join has several clauses. Given parent and child tables represented by parent and child, respectively, the join looks like this:
```
WHERE
    parent.THREAD_ID = child.THREAD_ID /* 1 */
    AND parent.EVENT_ID < child.EVENT_ID /* 2 */
    AND (
        child.EVENT_ID <= parent.END_EVENT_ID /* 3a */
        OR parent.END_EVENT_ID IS NULL /* 3b */
    )
```


The conditions for the join are:
1. The parent and child events are in the same thread.
2. The child event begins after the parent event, so its EVENT_ID value is greater than that of the parent.
3. The parent event has either completed or is still running.

To find lock information, data_locks is the table containing child events.
The data_locks table shows only existing locks, so these considerations apply regarding which table contains the parent event:
- For transactions, the only choice is events_transactions_current. If a transaction is completed, it may be in the transaction history tables, but the locks are gone already.
- For statements, it all depends on whether the statement that took a lock is a statement in a transaction that has already completed (use events_statements_history) or the statement is still running (use events_statements_current).
- For stages, the logic is similar to that for statements; use events_stages_history or events_stages_current.
- For waits, the logic is similar to that for statements; use events_waits_history or events_waits_current. However, so many waits are recorded that the wait that caused a lock is most likely gone from the history tables already.

Wait, stage, and statement events disappear quickly from the history. If a statement that executed a long time ago took a lock but is in a still-open transaction, it might not be possible to find the statement, but it is possible to find the transaction.

This is why the nested set data model works better for locating parent events. Following links in a parent/child relationship (data lock -> parent wait -> parent stage -> parent transaction) does not work well when intermediate nodes are already gone from the history tables.

The following scenario illustrates how to find the parent transaction of a statement in which a lock was taken:

Session A:
```
[1] START TRANSACTION;
[2] SELECT * FROM t1 WHERE pk = 1;
[3] SELECT 'Hello, world';
```


Session B:
```
SELECT ...
FROM performance_schema.events_transactions_current AS parent
    INNER JOIN performance_schema.data_locks AS child
WHERE
    parent.THREAD_ID = child.THREAD_ID
    AND parent.EVENT_ID < child.EVENT_ID
    AND (
        child.EVENT_ID <= parent.END_EVENT_ID
        OR parent.END_EVENT_ID IS NULL
    );
```


The query for session B should show statement [2] as owning a data lock on the record with $\mathrm{pk}=1$.
If session A executes more statements, [2] fades out of the history table.
The query should show the transaction that started in [1], regardless of how many statements, stages, or waits were executed.

To see more data, you can also use the events_xxx_history_long tables, except for transactions, assuming no other query runs in the server (so that history is preserved).

\subsection*{29.20 Restrictions on Performance Schema}

The Performance Schema avoids using mutexes to collect or produce data, so there are no guarantees of consistency and results can sometimes be incorrect. Event values in performance_schema tables are nondeterministic and nonrepeatable.

If you save event information in another table, you should not assume that the original events remain available later. For example, if you select events from a performance_schema table into a temporary table, intending to join that table with the original table later, there might be no matches.
mysqldump and BACKUP DATABASE ignore tables in the performance_schema database.
Tables in the performance_schema database cannot be locked with LOCK TABLES, except the setup_xxx tables.

Tables in the performance_schema database cannot be indexed.
Tables in the performance_schema database are not replicated.
The types of timers might vary per platform. The performance_timers table shows which event timers are available. If the values in this table for a given timer name are NULL, that timer is not supported on your platform.

Instruments that apply to storage engines might not be implemented for all storage engines. Instrumentation of each third-party engine is the responsibility of the engine maintainer.

