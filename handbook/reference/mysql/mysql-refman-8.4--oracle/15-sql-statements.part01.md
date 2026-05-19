\section*{Chapter 15 SQL Statements}
Table of Contents
15.1 Data Definition Statements ..... 2444
15.1.1 Atomic Data Definition Statement Support ..... 2444
15.1.2 ALTER DATABASE Statement ..... 2448
15.1.3 ALTER EVENT Statement ..... 2453
15.1.4 ALTER FUNCTION Statement ..... 2455
15.1.5 ALTER INSTANCE Statement ..... 2455
15.1.6 ALTER LOGFILE GROUP Statement ..... 2457
15.1.7 ALTER PROCEDURE Statement ..... 2458
15.1.8 ALTER SERVER Statement ..... 2459
15.1.9 ALTER TABLE Statement ..... 2459
15.1.10 ALTER TABLESPACE Statement ..... 2482
15.1.11 ALTER VIEW Statement ..... 2484
15.1.12 CREATE DATABASE Statement ..... 2484
15.1.13 CREATE EVENT Statement ..... 2485
15.1.14 CREATE FUNCTION Statement ..... 2489
15.1.15 CREATE INDEX Statement ..... 2489
15.1.16 CREATE LOGFILE GROUP Statement ..... 2503
15.1.17 CREATE PROCEDURE and CREATE FUNCTION Statements ..... 2505
15.1.18 CREATE SERVER Statement ..... 2510
15.1.19 CREATE SPATIAL REFERENCE SYSTEM Statement ..... 2511
15.1.20 CREATE TABLE Statement ..... 2516
15.1.21 CREATE TABLESPACE Statement ..... 2574
15.1.22 CREATE TRIGGER Statement ..... 2581
15.1.23 CREATE VIEW Statement ..... 2584
15.1.24 DROP DATABASE Statement ..... 2587
15.1.25 DROP EVENT Statement ..... 2588
15.1.26 DROP FUNCTION Statement ..... 2588
15.1.27 DROP INDEX Statement ..... 2589
15.1.28 DROP LOGFILE GROUP Statement ..... 2589
15.1.29 DROP PROCEDURE and DROP FUNCTION Statements ..... 2589
15.1.30 DROP SERVER Statement ..... 2590
15.1.31 DROP SPATIAL REFERENCE SYSTEM Statement ..... 2590
15.1.32 DROP TABLE Statement ..... 2591
15.1.33 DROP TABLESPACE Statement ..... 2592
15.1.34 DROP TRIGGER Statement ..... 2593
15.1.35 DROP VIEW Statement ..... 2593
15.1.36 RENAME TABLE Statement ..... 2593
15.1.37 TRUNCATE TABLE Statement ..... 2595
15.2 Data Manipulation Statements ..... 2596
15.2.1 CALL Statement ..... 2596
15.2.2 DELETE Statement ..... 2598
15.2.3 DO Statement ..... 2602
15.2.4 EXCEPT Clause ..... 2602
15.2.5 HANDLER Statement ..... 2603
15.2.6 IMPORT TABLE Statement ..... 2605
15.2.7 INSERT Statement ..... 2607
15.2.8 INTERSECT Clause ..... 2617
15.2.9 LOAD DATA Statement ..... 2618
15.2.10 LOAD XML Statement ..... 2629
15.2.11 Parenthesized Query Expressions ..... 2636
15.2.12 REPLACE Statement ..... 2638
15.2.13 SELECT Statement ..... 2641
15.2.14 Set Operations with UNION, INTERSECT, and EXCEPT ..... 2656
15.2.15 Subqueries ..... 2661
15.2.16 TABLE Statement ..... 2676
15.2.17 UPDATE Statement ..... 2679
15.2.18 UNION Clause ..... 2682
15.2.19 VALUES Statement ..... 2683
15.2.20 WITH (Common Table Expressions) ..... 2685
15.3 Transactional and Locking Statements ..... 2696
15.3.1 START TRANSACTION, COMMIT, and ROLLBACK Statements ..... 2696
15.3.2 Statements That Cannot Be Rolled Back ..... 2699
15.3.3 Statements That Cause an Implicit Commit ..... 2699
15.3.4 SAVEPOINT, ROLLBACK TO SAVEPOINT, and RELEASE SAVEPOINT Statements ..... 2700
15.3.5 LOCK INSTANCE FOR BACKUP and UNLOCK INSTANCE Statements ..... 2701
15.3.6 LOCK TABLES and UNLOCK TABLES Statements ..... 2702
15.3.7 SET TRANSACTION Statement ..... 2707
15.3.8 XA Transactions ..... 2710
15.4 Replication Statements ..... 2715
15.4.1 SQL Statements for Controlling Source Servers ..... 2715
15.4.2 SQL Statements for Controlling Replica Servers ..... 2718
15.4.3 SQL Statements for Controlling Group Replication ..... 2740
15.5 Prepared Statements ..... 2742
15.5.1 PREPARE Statement ..... 2745
15.5.2 EXECUTE Statement ..... 2747
15.5.3 DEALLOCATE PREPARE Statement ..... 2747
15.6 Compound Statement Syntax ..... 2748
15.6.1 BEGIN ... END Compound Statement ..... 2748
15.6.2 Statement Labels ..... 2748
15.6.3 DECLARE Statement ..... 2749
15.6.4 Variables in Stored Programs ..... 2749
15.6.5 Flow Control Statements ..... 2751
15.6.6 Cursors ..... 2755
15.6.7 Condition Handling ..... 2757
15.6.8 Restrictions on Condition Handling ..... 2782
15.7 Database Administration Statements ..... 2782
15.7.1 Account Management Statements ..... 2782
15.7.2 Resource Group Management Statements ..... 2834
15.7.3 Table Maintenance Statements ..... 2837
15.7.4 Component, Plugin, and Loadable Function Statements ..... 2852
15.7.5 CLONE Statement ..... 2857
15.7.6 SET Statements ..... 2858
15.7.7 SHOW Statements ..... 2863
15.7.8 Other Administrative Statements ..... 2918
15.8 Utility Statements ..... 2931
15.8.1 DESCRIBE Statement ..... 2931
15.8.2 EXPLAIN Statement ..... 2931
15.8.3 HELP Statement ..... 2940
15.8.4 USE Statement ..... 2942

This chapter describes the syntax for the SQL statements supported by MySQL.

\subsection*{15.1 Data Definition Statements}

\subsection*{15.1.1 Atomic Data Definition Statement Support}

MySQL 8.4 supports atomic Data Definition Language (DDL) statements. This feature is referred to as atomic DDL. An atomic DDL statement combines the data dictionary updates, storage engine operations, and binary log writes associated with a DDL operation into a single, atomic operation. The
operation is either committed, with applicable changes persisted to the data dictionary, storage engine, and binary log, or is rolled back, even if the server halts during the operation.

\section*{Note}

Atomic DDL is not transactional DDL. DDL statements, atomic or otherwise, implicitly end any transaction that is active in the current session, as if you had done a COMMIT before executing the statement. This means that DDL statements cannot be performed within another transaction, within transaction control statements such as START TRANSACTION ... COMMIT, or combined with other statements within the same transaction.

Atomic DDL is made possible by the MySQL data dictionary, which provides centralized, transactional metadata storage.

The atomic DDL feature is described under the following topics in this section:
- Supported DDL Statements
- Atomic DDL Characteristics
- DDL Statement Behavior
- Storage Engine Support
- Viewing DDL Logs

\section*{Supported DDL Statements}

The atomic DDL feature supports both table and non-table DDL statements. Table-related DDL operations require storage engine support, whereas non-table DDL operations do not. Currently, only the InnoDB storage engine supports atomic DDL.
- Supported table DDL statements include CREATE, ALTER, and DROP statements for databases, tablespaces, tables, and indexes, and the TRUNCATE TABLE statement.
- Supported non-table DDL statements include:
- CREATE and DROP statements, and, if applicable, ALTER statements for stored programs, triggers, views, and loadable functions.
- Account management statements: CREATE, ALTER, DROP, and, if applicable, RENAME statements for users and roles, as well as GRANT and REVOKE statements.

The following statements are not supported by the atomic DDL feature:
- Table-related DDL statements that involve a storage engine other than InnoDB.
- INSTALL PLUGIN and UNINSTALL PLUGIN statements.
- INSTALL COMPONENT and UNINSTALL COMPONENT statements.
- CREATE SERVER, ALTER SERVER, and DROP SERVER statements.

\section*{Atomic DDL Characteristics}

The characteristics of atomic DDL statements include the following:
- Metadata updates, binary log writes, and storage engine operations, where applicable, are combined into a single atomic operation.
- There are no intermediate commits at the SQL layer during the DDL operation.
- Where applicable:
- The state of data dictionary, routine, event, and loadable function caches is consistent with the status of the DDL operation, meaning that caches are updated to reflect whether or not the DDL operation was completed successfully or rolled back.
- The storage engine methods involved in a DDL operation do not perform intermediate commits, and the storage engine registers itself as part of the DDL operation.
- The storage engine supports redo and rollback of DDL operations, which is performed in the PostDDL phase of the DDL operation.
- The visible behaviour of DDL operations is atomic.

\section*{DDL Statement Behavior}

This section describes some important aspects of DDL statement behavior when using a storage engine that support atomic DDL, such as InnoDB.
- DROP TABLE operations are fully atomic if all named tables use a storage engine which supports atomic DDL. The statement either drops all tables successfully or is rolled back.

DROP TABLE fails with an error if a named table does not exist, and no changes are made, regardless of the storage engine.
- DROP DATABASE is atomic if all tables use a storage engine which supports atomic DDL. The statement either drops all objects successfully or is rolled back. You should be aware that removal of the database directory from the file system occurs last and is not part of the atomic operation; thus, if removal of the database directory fails due to a file system error or server halt, the DROP DATABASE transaction is not rolled back.
- For tables that do not use a storage engine which supports atomic DDL, table deletion occurs outside of the atomic DROP TABLE or DROP DATABASE transaction. Such table deletions are written to the binary log individually, which limits the discrepancy between the storage engine, data dictionary, and binary log to one table at most in the case of an interrupted DROP TABLE or DROP DATABASE operation. For operations that drop multiple tables, any tables that do not use a storage engine which supports atomic DDL are dropped before tables that do so.
- CREATE TABLE, ALTER TABLE, RENAME TABLE, TRUNCATE TABLE, CREATE TABLESPACE, and DROP TABLESPACE operations for tables that use a storage engine which supports atomic DDL are either fully committed or rolled back if the server halts during their operation. RENAME TABLE operations are atomic only if all named tables use a storage engine which supports atomic DDL.
- For storage engines that support atomic DDL, the CREATE TABLE ... SELECT statement is logged as one transaction in the binary log when row-based replication is in use.

On storage engines that support both atomic DDL and foreign key constraints, creation of foreign keys is not permitted in CREATE TABLE ... SELECT statements when row-based replication is in use. Foreign key constraints can be added later using ALTER TABLE.

When CREATE TABLE ... SELECT is applied as an atomic operation, a metadata lock is held on the table while data is inserted, which prevents concurrent access to the table for the duration of the operation.
- DROP VIEW fails if a named view does not exist, and no changes are made.
- Account management statements either succeed for all named users or roll back and have no effect if an error occurs.

\section*{Storage Engine Support}

Currently, only the InnoDB storage engine supports atomic DDL. Storage engines that do not support atomic DDL are exempted from DDL atomicity. DDL operations involving exempted storage engines
remain capable of introducing inconsistencies that can occur when operations are interrupted or only partially completed.

To support redo and rollback of DDL operations, InnoDB writes DDL logs to the mysql.innodb_ddl_log table, which is a hidden data dictionary table that resides in the mysql.ibd data dictionary tablespace.

To view DDL logs that are written to the mysql.innodb_ddl_log table during a DDL operation, enable the innodb_print_ddl_logs configuration option. For more information, see Viewing DDL Logs.

\section*{Note}

The redo logs for changes to the mysql.innodb_ddl_log table are flushed to disk immediately regardless of the innodb_flush_log_at_trx_commit setting. Flushing the redo logs immediately avoids situations where data files are modified by DDL operations but the redo logs for changes to the mysql.innodb_ddl_log table resulting from those operations are not persisted to disk. Such a situation could cause errors during rollback or recovery.

The InnoDB storage engine executes DDL operations in phases. DDL operations such as ALTER TABLE may perform the Prepare and Perform phases multiple times prior to the Commit phase.
1. Prepare: Create the required objects and write the DDL logs to the mysql.innodb_ddl_log table. The DDL logs define how to roll forward and roll back the DDL operation.
2. Perform: Perform the DDL operation. For example, perform a create routine for a CREATE TABLE operation.
3. Commit: Update the data dictionary and commit the data dictionary transaction.
4. Post-DDL: Replay and remove DDL logs from the mysql.innodb_ddl_log table. To ensure that rollback can be performed safely without introducing inconsistencies, file operations such as renaming or removing data files are performed in this final phase. This phase also removes dynamic metadata from the mysql.innodb_dynamic_metadata data dictionary table for DROP TABLE, TRUNCATE TABLE, and other DDL operations that rebuild the table.

DDL logs are replayed and removed from the mysql.innodb_ddl_log table during the Post-DDL phase, regardless of whether the DDL operation is committed or rolled back. DDL logs should only remain in the mysql.innodb_ddl_log table if the server is halted during a DDL operation. In this case, the DDL logs are replayed and removed after recovery.

In a recovery situation, a DDL operation may be committed or rolled back when the server is restarted. If the data dictionary transaction that was performed during the Commit phase of a DDL operation is present in the redo log and binary log, the operation is considered successful and is rolled forward. Otherwise, the incomplete data dictionary transaction is rolled back when InnoDB replays data dictionary redo logs, and the DDL operation is rolled back.

\section*{Viewing DDL Logs}

To view DDL logs that are written to the mysql.innodb_ddl_log data dictionary table during atomic DDL operations that involve the InnoDB storage engine, enable innodb_print_ddl_logs to have MySQL write the DDL logs to stderr. Depending on the host operating system and MySQL configuration, stderr may be the error log, terminal, or console window. See Section 7.4.2.2, "Default Error Log Destination Configuration".

InnoDB writes DDL logs to the mysql.innodb_ddl_log table to support redo and rollback of DDL operations. The mysql.innodb_ddl_log table is a hidden data dictionary table that resides in the mysql. ibd data dictionary tablespace. Like other hidden data dictionary tables, the mysql.innodb_ddl_log table cannot be accessed directly in non-debug versions of MySQL.
(See Section 16.1, "Data Dictionary Schema".) The structure of the mysql.innodb_ddl_log table corresponds to this definition:
```
CREATE TABLE mysql.innodb_ddl_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    thread_id BIGINT UNSIGNED NOT NULL,
    type INT UNSIGNED NOT NULL,
    space_id INT UNSIGNED,
    page_no INT UNSIGNED,
    index_id BIGINT UNSIGNED,
    table_id BIGINT UNSIGNED,
    old_file_path VARCHAR(512) COLLATE utf8mb4_bin,
    new_file_path VARCHAR(512) COLLATE utf8mb4_bin,
    KEY(thread_id)
);
```

- id: A unique identifier for a DDL log record.
- thread_id: Each DDL log record is assigned a thread_id, which is used to replay and remove DDL logs that belong to a particular DDL operation. DDL operations that involve multiple data file operations generate multiple DDL log records.
- type: The DDL operation type. Types include FREE (drop an index tree), DELETE (delete a file), RENAME (rename a file), or DROP (drop metadata from the mysql.innodb_dynamic_metadata data dictionary table).
- space_id: The tablespace ID.
- page_no: A page that contains allocation information; an index tree root page, for example.
- index_id: The index ID.
- table_id: The table ID.
- old_file_path: The old tablespace file path. Used by DDL operations that create or drop tablespace files; also used by DDL operations that rename a tablespace.
- new_file_path: The new tablespace file path. Used by DDL operations that rename tablespace files.

This example demonstrates enabling innodb_print_ddl_logs to view DDL logs written to strderr for a CREATE TABLE operation.
```
mysql> SET GLOBAL innodb_print_ddl_logs=1;
mysql> CREATE TABLE t1 (c1 INT) ENGINE = InnoDB;
[Note] [000000] InnoDB: DDL log insert : [DDL record: DELETE SPACE, id=18, thread_id=7,
space_id=5, old_file_path=./test/t1.ibd]
[Note] [000000] InnoDB: DDL log delete : by id 18
[Note] [000000] InnoDB: DDL log insert : [DDL record: REMOVE CACHE, id=19, thread_id=7,
table_id=1058, new_file_path=test/t1]
[Note] [000000] InnoDB: DDL log delete : by id 19
[Note] [000000] InnoDB: DDL log insert : [DDL record: FREE, id=20, thread_id=7,
space_id=5, index_id=132, page_no=4]
[Note] [000000] InnoDB: DDL log delete : by id 20
[Note] [000000] InnoDB: DDL log post ddl : begin for thread id : 7
[Note] [000000] InnoDB: DDL log post ddl : end for thread id : 7
```


\subsection*{15.1.2 ALTER DATABASE Statement}
```
ALTER {DATABASE | SCHEMA} [db_name]
        alter_option ...
alter_option: {
        [DEFAULT] CHARACTER SET [=] charset_name
    | [DEFAULT] COLLATE [=] collation_name
    | [DEFAULT] ENCRYPTION [=] {'Y' | 'N'}
    | READ ONLY [=] {DEFAULT | 0 | 1}
}
```


ALTER DATABASE enables you to change the overall characteristics of a database. These characteristics are stored in the data dictionary. This statement requires the ALTER privilege on the database. ALTER SCHEMA is a synonym for ALTER DATABASE.

If the database name is omitted, the statement applies to the default database. In that case, an error occurs if there is no default database.

For any alter_option omitted from the statement, the database retains its current option value, with the exception that changing the character set may change the collation and vice versa.
- Character Set and Collation Options
- Encryption Option
- Read Only Option

\section*{Character Set and Collation Options}

The CHARACTER SET option changes the default database character set. The COLLATE option changes the default database collation. For information about character set and collation names, see Chapter 12, Character Sets, Collations, Unicode.

To see the available character sets and collations, use the SHOW CHARACTER SET and SHOW COLLATION statements, respectively. See Section 15.7.7.4, "SHOW CHARACTER SET Statement", and Section 15.7.7.5, "SHOW COLLATION Statement".

A stored routine that uses the database defaults when the routine is created includes those defaults as part of its definition. (In a stored routine, variables with character data types use the database defaults if the character set or collation are not specified explicitly. See Section 15.1.17, "CREATE PROCEDURE and CREATE FUNCTION Statements".) If you change the default character set or collation for a database, any stored routines that are to use the new defaults must be dropped and recreated.

\section*{Encryption Option}

The ENCRYPTION option, defines the default database encryption, which is inherited by tables created in the database. The permitted values are ' $Y$ ' (encryption enabled) and ' $N$ ' (encryption disabled).

The mysql system schema cannot be set to default encryption. The existing tables within it are part of the general mysql tablespace, which may be encrypted. The information_schema contains only views. It is not possible to create any tables within it. There is nothing on the disk to encrypt. All tables in the performance_schema use the PERFORMANCE_SCHEMA engine, which is purely in-memory. It is not possible to create any other tables in it. There is nothing on the disk to encrypt.

Only newly created tables inherit the default database encryption. For existing tables associated with the database, their encryption remains unchanged. If the table_encryption_privilege_check system variable is enabled, the TABLE_ENCRYPTION_ADMIN privilege is required to specify a default encryption setting that differs from the value of the default_table_encryption system variable. For more information, see Defining an Encryption Default for Schemas and General Tablespaces.

\section*{Read Only Option}

The READ ONLY option controls whether to permit modification of the database and objects within it. The permitted values are DEFAULT or 0 (not read only) and 1 (read only). This option is useful for database migration because a database for which READ ONLY is enabled can be migrated to another MySQL instance without concern that the database might be changed during the operation.

With NDB Cluster, making a database read only on one mysqld server is synchronized to other mysqld servers in the same cluster, so that the database becomes read only on all mysqld servers.

The READ ONLY option, if enabled, is displayed in the INFORMATION_SCHEMA SCHEMATA_EXTENSIONS table. See Section 28.3.32, "The INFORMATION_SCHEMA SCHEMATA_EXTENSIONS Table".

The READ ONLY option cannot be enabled for these system schemas: mysql, information_schema, performance_schema.

In ALTER DATABASE statements, the READ ONLY option interacts with other instances of itself and with other options as follows:
- An error occurs if multiple instances of READ ONLY conflict (for example, READ ONLY $=1$ READ ONLY = 0).
- An ALTER DATABASE statement that contains only (nonconflicting) READ ONLY options is permitted even for a read-only database.
- A mix of (nonconflicting) READ ONLY options with other options is permitted if the read-only state of the database either before or after the statement permits modifications. If the read-only state both before and after prohibits changes, an error occurs.

This statement succeeds whether or not the database is read only:
```
ALTER DATABASE mydb READ ONLY = 0 DEFAULT COLLATE utf8mb4_bin;
```


This statement succeeds if the database is not read only, but fails if it is already read only:
```
ALTER DATABASE mydb READ ONLY = 1 DEFAULT COLLATE utf8mb4_bin;
```


Enabling READ ONLY affects all users of the database, with these exceptions that are not subject to read-only checks:
- Statements executed by the server as part of server initialization, restart, upgrade, or replication.
- Statements in a file named at server startup by the init_file system variable.
- TEMPORARY tables; it is possible to create, alter, drop, and write to TEMPORARY tables in a read-only database.
- NDB Cluster non-SQL inserts and updates.

Other than for the excepted operations just listed, enabling READ ONLY prohibits write operations to the database and its objects, including their definitions, data, and metadata. The following list details affected SQL statements and operations:
- The database itself:
- CREATE DATABASE
- ALTER DATABASE (except to change the READ ONLY option)
- DROP DATABASE
- Views:
- CREATE VIEW
- ALTER VIEW
- DROP VIEW
- Selecting from views that invoke functions with side effects.
- Updating updatable views.
- Statements that create or drop objects in a writable database are rejected if they affect metadata of a view in a read-only database (for example, by making the view valid or invalid).
- Stored routines:
- CREATE PROCEDURE
- DROP PROCEDURE
- CALL (of procedures with side effects)
- CREATE FUNCTION
- DROP FUNCTION
- SELECT (of functions with side effects)
- For procedures and functions, read-only checks follow prelocking behavior. For CALL statements, read-only checks are done on a per-statement basis, so if some conditionally executed statement writing to a read-only database does not actually execute, the call still succeeds. On the other hand, for a function called within a SELECT, execution of the function body happens in prelocked mode. As long as a some statement within the function writes to a read-only database, execution of the function fails with an error regardless of whether the statement actually executes.
- Triggers:
- CREATE TRIGGER
- DROP TRIGGER
- Trigger invocation.
- Events:
- CREATE EVENT
- ALTER EVENT
- DROP EVENT
- Event execution:
- Executing an event in the database fails because that would change the last-execution timestamp, which is event metadata stored in the data dictionary. Failure of event execution also has the effect of causing the event scheduler to stop.
- If an event writes to an object in a read-only database, execution of the event fails with an error, but the event scheduler is not stopped.
- Tables:
- CREATE TABLE
- ALTER TABLE
- CREATE INDEX
- DROP INDEX
- RENAME TABLE
- TRUNCATE TABLE
- DROP TABLE
- DELETE
- INSERT
- IMPORT TABLE
- LOAD DATA
- LOAD XML
- REPLACE
- UPDATE
- For cascading foreign keys where the child table is in a read-only database, updates and deletes on the parent are rejected even if the child table is not directly affected.
- For a MERGE table such as CREATE TABLE s1.t(i int) ENGINE MERGE UNION (s2.t, s3.t), INSERT_METHOD=..., the following behavior applies:
- Inserting into the MERGE table (INSERT into s1.t) fails if at least one of s1, s2, s3 is read only, regardless of insert method. The insert is refused even if it would actually end up in a writable table.
- Dropping the MERGE table (DROP TABLE $\mathrm{s} 1 . \mathrm{t}$ ) succeeds as long as s 1 is not read only. It is permitted to drop a MERGE table that refers to a read-only database.

An ALTER DATABASE statement blocks until all concurrent transactions that have already accessed an object in the database being altered have committed. Conversely, a write transaction accessing an object in a database being altered in a concurrent ALTER DATABASE blocks until the ALTER DATABASE has committed.

If the Clone plugin is used to clone a local or remote data directory, the databases in the clone retain the read-only state they had in the source data directory. The read-only state does not affect the cloning process itself. If it is not desirable to have the same database read-only state in the clone, the option must be changed explicitly for the clone after the cloning process has finished, using ALTER DATABASE operations on the clone.

When cloning from a donor to a recipient, if the recipient has a user database that is read only, cloning fails with an error message. Cloning may be retried after making the database writable.

READ ONLY is permitted for ALTER DATABASE, but not for CREATE DATABASE. However, for a readonly database, the statement produced by SHOW CREATE DATABASE does include READ ONLY=1 within a comment to indicate its read-only status:
```
mysql> ALTER DATABASE mydb READ ONLY = 1;
mysql> SHOW CREATE DATABASE mydb\G
*************************** 1. row ****************************************
    Database: mydb
Create Database: CREATE DATABASE ˋmydbˋ
        /*!40100 DEFAULT CHARACTER SET utf8mb4
            COLLATE utf8mb4_0900_ai_ci */
        /*!80016 DEFAULT ENCRYPTION='N' */
        /* READ ONLY = 1 */
```


If the server executes a CREATE DATABASE statement containing such a comment, the server ignores the comment and the READ ONLY option is not processed. This has implications for mysqldump, which uses SHOW CREATE DATABASE to produce CREATE DATABASE statements in dump output:
- In a dump file, the CREATE DATABASE statement for a read-only database contains the commented READ ONLY option.
- The dump file can be restored as usual, but because the server ignores the commented READ ONLY option, the restored database is not read only. If the database is to be read only after being restored, you must execute ALTER DATABASE manually to make it so.

Suppose that mydb is read only and you dump it as follows:
```
$> mysqldump --databases mydb > mydb.sql
```


A restore operation later must be followed by ALTER DATABASE if mydb should still be read only:
```
$> mysql
mysql> SOURCE mydb.sql;
mysql> ALTER DATABASE mydb READ ONLY = 1;
```


MySQL Enterprise Backup is not subject to this issue. It backs up and restores a read-only database like any other, but enables the READ ONLY option at restore time if it was enabled at backup time.

ALTER DATABASE is written to the binary log, so a change to the READ ONLY option on a replication source server also affects replicas. To prevent this from happening, binary logging must be disabled prior to execution of the ALTER DATABASE statement. For example, to prepare for migrating a database without affecting replicas, perform these operations:
1. Within a single session, disable binary logging and enable READ ONLY for the database:
```
mysql> SET sql_log_bin = OFF;
mysql> ALTER DATABASE mydb READ ONLY = 1;
```

2. Dump the database, for example, with mysqldump:
```
$> mysqldump --databases mydb > mydb.sql
```

3. Within a single session, disable binary logging and disable READ ONLY for the database:
```
mysql> SET sql_log_bin = OFF;
mysql> ALTER DATABASE mydb READ ONLY = 0;
```


\subsection*{15.1.3 ALTER EVENT Statement}
```
ALTER
    [DEFINER = user]
    EVENT event_name
    [ON SCHEDULE schedule]
    [ON COMPLETION [NOT] PRESERVE]
    [RENAME TO new_event_name]
    [ENABLE | DISABLE | DISABLE ON {REPLICA | SLAVE}]
    [COMMENT 'string']
    [DO event_body]
```


The ALTER EVENT statement changes one or more of the characteristics of an existing event without the need to drop and recreate it. The syntax for each of the DEFINER, ON SCHEDULE, ON COMPLETION, COMMENT, ENABLE / DISABLE, and DO clauses is exactly the same as when used with CREATE EVENT. (See Section 15.1.13, "CREATE EVENT Statement".)

Any user can alter an event defined on a database for which that user has the EVENT privilege. When a user executes a successful ALTER EVENT statement, that user becomes the definer for the affected event.

ALTER EVENT works only with an existing event:
```
mysql> ALTER EVENT no_such_event
    > ON SCHEDULE
    > EVERY '2:3' DAY_HOUR;
ERROR 1517 (HY000): Unknown event 'no_such_event'
```


In each of the following examples, assume that the event named myevent is defined as shown here:
```
CREATE EVENT myevent
    ON SCHEDULE
        EVERY 6 HOUR
    COMMENT 'A sample comment.'
    DO
```

```
UPDATE myschema.mytable SET mycol = mycol + 1;
```


The following statement changes the schedule for myevent from once every six hours starting immediately to once every twelve hours, starting four hours from the time the statement is run:
```
ALTER EVENT myevent
    ON SCHEDULE
        EVERY 12 HOUR
    STARTS CURRENT_TIMESTAMP + INTERVAL 4 HOUR;
```


It is possible to change multiple characteristics of an event in a single statement. This example changes the SQL statement executed by myevent to one that deletes all records from mytable; it also changes the schedule for the event such that it executes once, one day after this ALTER EVENT statement is run.
```
ALTER EVENT myevent
    ON SCHEDULE
        AT CURRENT_TIMESTAMP + INTERVAL 1 DAY
    DO
        TRUNCATE TABLE myschema.mytable;
```


Specify the options in an ALTER EVENT statement only for those characteristics that you want to change; omitted options keep their existing values. This includes any default values for CREATE EVENT such as ENABLE.

To disable myevent, use this ALTER EVENT statement:
```
ALTER EVENT myevent
    DISABLE;
```


The ON SCHEDULE clause may use expressions involving built-in MySQL functions and user variables to obtain any of the timestamp or interval values which it contains. You cannot use stored routines or loadable functions in such expressions, and you cannot use any table references; however, you can use SELECT FROM DUAL. This is true for both ALTER EVENT and CREATE EVENT statements. References to stored routines, loadable functions, and tables in such cases are specifically not permitted, and fail with an error (see Bug \#22830).

Although an ALTER EVENT statement that contains another ALTER EVENT statement in its DO clause appears to succeed, when the server attempts to execute the resulting scheduled event, the execution fails with an error.

To rename an event, use the ALTER EVENT statement's RENAME TO clause. This statement renames the event myevent to yourevent:
```
ALTER EVENT myevent
    RENAME TO yourevent;
```


You can also move an event to a different database using ALTER EVENT ... RENAME TO ... and db_name.event_name notation, as shown here:

ALTER EVENT olddb.myevent
RENAME TO newdb.myevent;
To execute the previous statement, the user executing it must have the EVENT privilege on both the olddb and newdb databases.

\section*{Note}

There is no RENAME EVENT statement.

The value DISABLE ON REPLICA is used on a replica instead of ENABLE or DISABLE to indicate an event that was created on the replication source server and replicated to the replica, but that is not executed on the replica. Normally, DISABLE ON REPLICA is set automatically as required; however, there are some circumstances under which you may want or need to change it manually. See Section 19.5.1.16, "Replication of Invoked Features", for more information.

DISABLE ON REPLICA replaces DISABLE ON SLAVE, which is deprecated, and subject to removal in a future version of MySQL.

\subsection*{15.1.4 ALTER FUNCTION Statement}
```
ALTER FUNCTION func_name [characteristic ...]
characteristic: {
        COMMENT 'string'
    | LANGUAGE SQL
    | { CONTAINS SQL | NO SQL | READS SQL DATA | MODIFIES SQL DATA }
    | SQL SECURITY { DEFINER | INVOKER }
}
```


This statement can be used to change the characteristics of a stored function. More than one change may be specified in an ALTER FUNCTION statement. However, you cannot change the parameters or body of a stored function using this statement; to make such changes, you must drop and re-create the function using DROP FUNCTION and CREATE FUNCTION.

You must have the ALTER ROUTINE privilege for the function. (That privilege is granted automatically to the function creator.) If binary logging is enabled, the ALTER FUNCTION statement might also require the SUPER privilege, as described in Section 27.7, "Stored Program Binary Logging".

\subsection*{15.1.5 ALTER INSTANCE Statement}
```
ALTER INSTANCE instance_action
instance_action: {
    | {ENABLE|DISABLE} INNODB REDO_LOG
    | ROTATE INNODB MASTER KEY
    | ROTATE BINLOG MASTER KEY
    | RELOAD TLS
        [FOR CHANNEL {mysql_main | mysql_admin}]
        [NO ROLLBACK ON ERROR]
    | RELOAD KEYRING
}
```


ALTER INSTANCE defines actions applicable to a MySQL server instance. The statement supports these actions:
- ALTER INSTANCE \{ENABLE | DISABLE\} INNODB REDO_LOG

This action enables or disables InnoDB redo logging. Redo logging is enabled by default. This feature is intended only for loading data into a new MySQL instance. The statement is not written to the binary log.

\section*{Warning}

Do not disable redo logging on a production system. While it is permitted to shut down and restart the server while redo logging is disabled, an unexpected server stoppage while redo logging is disabled can cause data loss and instance corruption.

An ALTER INSTANCE [ENABLE|DISABLE] INNODB REDO_LOG operation requires an exclusive backup lock, which prevents other ALTER INSTANCE operations from executing concurrently. Other ALTER INSTANCE operations must wait for the lock to be released before executing.

For more information, see Disabling Redo Logging.
- ALTER INSTANCE ROTATE INNODB MASTER KEY

This action rotates the master encryption key used for InnoDB tablespace encryption. Key rotation requires the ENCRYPTION_KEY_ADMIN or SUPER privilege. To perform this action, a keyring plugin must be installed and configured. For instructions, see Section 8.4.4, "The MySQL Keyring".

ALTER INSTANCE ROTATE INNODB MASTER KEY supports concurrent DML. However, it cannot be run concurrently with CREATE TABLE ... ENCRYPTION or ALTER TABLE ... ENCRYPTION operations, and locks are taken to prevent conflicts that could arise from concurrent execution of these statements. If one of the conflicting statements is running, it must complete before another can proceed.

ALTER INSTANCE ROTATE INNODB MASTER KEY statements are written to the binary log so that they can be executed on replicated servers.

For additional ALTER INSTANCE ROTATE INNODB MASTER KEY usage information, see Section 17.13, "InnoDB Data-at-Rest Encryption".
- ALTER INSTANCE ROTATE BINLOG MASTER KEY

This action rotates the binary log master key used for binary log encryption. Key rotation for the binary log master key requires the BINLOG_ENCRYPTION_ADMIN or SUPER privilege. The statement cannot be used if the binlog_encryption system variable is set to OFF. To perform this action, a keyring plugin must be installed and configured. For instructions, see Section 8.4.4, "The MySQL Keyring".

ALTER INSTANCE ROTATE BINLOG MASTER KEY actions are not written to the binary log and are not executed on replicas. Binary log master key rotation can therefore be carried out in replication environments including a mix of MySQL versions. To schedule regular rotation of the binary log master key on all applicable source and replica servers, you can enable the MySQL Event Scheduler on each server and issue the ALTER INSTANCE ROTATE BINLOG MASTER KEY statement using a CREATE EVENT statement. If you rotate the binary log master key because you suspect that the current or any of the previous binary log master keys might have been compromised, issue the statement on every applicable source and replica server, which enables you to verify immediate compliance.

For additional ALTER INSTANCE ROTATE BINLOG MASTER KEY usage information, including what to do if the process does not complete correctly or is interrupted by an unexpected server halt, see Section 19.3.2, "Encrypting Binary Log Files and Relay Log Files".
- ALTER INSTANCE RELOAD TLS

This action reconfigures a TLS context from the current values of the system variables that define the context. It also updates the status variables that reflect the active context values. This action requires the CONNECTION_ADMIN privilege. For additional information about reconfiguring the TLS context, including which system and status variables are context-related, see Server-Side Runtime Configuration and Monitoring for Encrypted Connections.

By default, the statement reloads the TLS context for the main connection interface. If the FOR CHANNEL clause is given, the statement reloads the TLS context for the named channel: mysql_main for the main connection interface, mysql_admin for the administrative connection interface. For information about the different interfaces, see Section 7.1.12.1, "Connection Interfaces". The updated TLS context properties are exposed in the Performance Schema tls_channel_status table. See Section 29.12.22.9, "The tls_channel_status Table".

Updating the TLS context for the main interface may also affect the administrative interface because unless some nondefault TLS value is configured for that interface, it uses the same TLS context as the main interface.

\section*{Note}

When you reload the TLS context, OpenSSL reloads the file containing the CRL (certificate revocation list) as part of the process. If the CRL file is large, the server allocates a large chunk of memory (ten times the file size), which is doubled while the new instance is being loaded and the old one has not
> yet been released. The process resident memory is not immediately reduced after a large allocation is freed, so if you issue the ALTER INSTANCE RELOAD TLS statement repeatedly with a large CRL file, the process resident memory usage may grow as a result of this.

By default, the RELOAD TLS action rolls back with an error and has no effect if the configuration values do not permit creation of the new TLS context. The previous context values continue to be used for new connections. If the optional NO ROLLBACK ON ERROR clause is given and the new context cannot be created, rollback does not occur. Instead, a warning is generated and encryption is disabled for new connections on the interface to which the statement applies.

ALTER INSTANCE RELOAD TLS statements are not written to the binary log (and thus are not replicated). TLS configuration is local and depends on local files not necessarily present on all servers involved.

\section*{- ALTER INSTANCE RELOAD KEYRING}

If a keyring component is installed, this action tells the component to re-read its configuration file and reinitialize any keyring in-memory data. If you modify the component configuration at runtime, the new configuration does not take effect until you perform this action. Keyring reloading requires the ENCRYPTION_KEY_ADMIN privilege.

This action enables reconfiguring only the currently installed keyring component. It does not enable changing which component is installed. For example, if you change the configuration for the installed keyring component, ALTER INSTANCE RELOAD KEYRING causes the new configuration to take effect. On the other hand, if you change the keyring component named in the server manifest file, ALTER INSTANCE RELOAD KEYRING has no effect and the current component remains installed.

ALTER INSTANCE RELOAD KEYRING statements are not written to the binary log (and thus are not replicated).

\subsection*{15.1.6 ALTER LOGFILE GROUP Statement}
```
ALTER LOGFILE GROUP logfile_group
    ADD UNDOFILE 'file_name'
    [INITIAL_SIZE [=] size]
    [WAIT]
    ENGINE [=] engine_name
```


This statement adds an UNDO file named 'file_name' to an existing log file group logfile_group. An ALTER LOGFILE GROUP statement has one and only one ADD UNDOFILE clause. No DROP UNDOFILE clause is currently supported.

> Note
> All NDB Cluster Disk Data objects share the same namespace. This means that each Disk Data object must be uniquely named (and not merely each Disk Data object of a given type). For example, you cannot have a tablespace and an undo log file with the same name, or an undo log file and a data file with the same name.

The optional INITIAL_SIZE parameter sets the UNDO file's initial size in bytes; if not specified, the initial size defaults to $134217728(128 \mathrm{MB})$. You may optionally follow size with a one-letter abbreviation for an order of magnitude, similar to those used in my.cnf. Generally, this is one of the letters M (megabytes) or G (gigabytes). (Bug \#13116514, Bug \#16104705, Bug \#62858)

On 32-bit systems, the maximum supported value for INITIAL_SIZE is 4294967296 (4 GB). (Bug \#29186)

The minimum allowed value for INITIAL_SIZE is 1048576 (1 MB). (Bug \#29574)

> Note
> WAIT is parsed but otherwise ignored. This keyword currently has no effect, and is intended for future expansion.

The ENGINE clause (required) determines the storage engine which is used by this log file group, with engine_name being the name of the storage engine. Currently, the only accepted values for engine_name are "NDBCLUSTER" and "NDB". The two values are equivalent.

Here is an example, which assumes that the log file group $\lg \_3$ has already been created using CREATE LOGFILE GROUP (see Section 15.1.16, "CREATE LOGFILE GROUP Statement"):
```
ALTER LOGFILE GROUP lg_3
    ADD UNDOFILE 'undo_10.dat'
    INITIAL_SIZE=32M
    ENGINE=NDBCLUSTER;
```


When ALTER LOGFILE GROUP is used with ENGINE = NDBCLUSTER (alternatively, ENGINE = NDB), an undo log file is created on each NDB Cluster data node. You can verify that the undo files were created and obtain information about them by querying the Information Schema FILES table. For example:
```
mysql> SELECT FILE_NAME, LOGFILE_GROUP_NUMBER, EXTRA
    -> FROM INFORMATION_SCHEMA.FILES
    -> WHERE LOGFILE_GROUP_NAME = 'lg_3';
+--------------+-----------------------+---------------+
| FILE_NAME | LOGFILE_GROUP_NUMBER | EXTRA |
+--------------+-----------------------+---------------+
| newdata.dat | 0 | CLUSTER_NODE=3 |
| newdata.dat | 0 | CLUSTER_NODE=4 |
| undo_10.dat | 11 | CLUSTER_NODE=3 |
| undo_10.dat | 11 | CLUSTER_NODE=4 |
+--------------+-----------------------+---------------+
4 rows in set (0.01 sec)
```

(See Section 28.3.15, "The INFORMATION_SCHEMA FILES Table".)
Memory used for UNDO_BUFFER_SIZE comes from the global pool whose size is determined by the value of the SharedGlobalMemory data node configuration parameter. This includes any default value implied for this option by the setting of the InitialLogFileGroup data node configuration parameter.

ALTER LOGFILE GROUP is useful only with Disk Data storage for NDB Cluster. For more information, see Section 25.6.11, "NDB Cluster Disk Data Tables".

\subsection*{15.1.7 ALTER PROCEDURE Statement}
```
ALTER PROCEDURE proc_name [characteristic ...]
characteristic: {
        COMMENT 'string'
    | LANGUAGE SQL
    | { CONTAINS SQL | NO SQL | READS SQL DATA | MODIFIES SQL DATA }
    | SQL SECURITY { DEFINER | INVOKER }
}
```


This statement can be used to change the characteristics of a stored procedure. More than one change may be specified in an ALTER PROCEDURE statement. However, you cannot change the parameters or body of a stored procedure using this statement; to make such changes, you must drop and re-create the procedure using DROP PROCEDURE and CREATE PROCEDURE.

You must have the ALTER ROUTINE privilege for the procedure. By default, that privilege is granted automatically to the procedure creator. This behavior can be changed by disabling the automatic_sp_privileges system variable. See Section 27.2.2, "Stored Routines and MySQL Privileges".

\subsection*{15.1.8 ALTER SERVER Statement}
```
ALTER SERVER server_name
    OPTIONS (option [, option] ...)
```


Alters the server information for server_name, adjusting any of the options permitted in the CREATE SERVER statement. The corresponding fields in the mysql. servers table are updated accordingly. This statement requires the SUPER privilege.

For example, to update the USER option:
```
ALTER SERVER s OPTIONS (USER 'sally');
```


ALTER SERVER causes an implicit commit. See Section 15.3.3, "Statements That Cause an Implicit Commit".

ALTER SERVER is not written to the binary log, regardless of the logging format that is in use.

\subsection*{15.1.9 ALTER TABLE Statement}
```
ALTER TABLE tbl_name
        [alter_option [, alter_option] ...]
        [partition_options]
alter_option: {
        table_options
    | ADD [COLUMN] col_name column_definition
            [FIRST | AFTER col_name]
    | ADD [COLUMN] (col_name column_definition,...)
    | ADD {INDEX | KEY} [index_name]
            [index_type] (key_part,...) [index_option] ...
    | ADD {FULLTEXT | SPATIAL} [INDEX | KEY] [index_name]
            (key_part,...) [index_option] ...
    | ADD [CONSTRAINT [symbol]] PRIMARY KEY
            [index_type] (key_part,...)
            [index_option] ...
    | ADD [CONSTRAINT [symbol]] UNIQUE [INDEX | KEY]
            [index_name] [index_type] (key_part,...)
            [index_option] ...
    | ADD [CONSTRAINT [symbol]] FOREIGN KEY
            [index_name] (col_name,...)
            reference_definition
    | ADD [CONSTRAINT [symbol]] CHECK (expr) [[NOT] ENFORCED]
    | DROP {CHECK | CONSTRAINT} symbol
    | ALTER {CHECK | CONSTRAINT} symbol [NOT] ENFORCED
    | ALGORITHM [=] {DEFAULT | INSTANT | INPLACE | COPY}
    | ALTER [COLUMN] col_name {
            SET DEFAULT {literal | (expr)}
            | SET {VISIBLE | INVISIBLE}
            | DROP DEFAULT
        }
    | ALTER INDEX index_name {VISIBLE | INVISIBLE}
    | CHANGE [COLUMN] old_col_name new_col_name column_definition
            [FIRST | AFTER col_name]
    | [DEFAULT] CHARACTER SET [=] charset_name [COLLATE [=] collation_name]
    | CONVERT TO CHARACTER SET charset_name [COLLATE collation_name]
    | {DISABLE | ENABLE} KEYS
    | {DISCARD | IMPORT} TABLESPACE
    | DROP [COLUMN] col_name
    | DROP {INDEX | KEY} index_name
    | DROP PRIMARY KEY
    | DROP FOREIGN KEY fk_symbol
    | FORCE
    | LOCK [=] {DEFAULT | NONE | SHARED | EXCLUSIVE}
    | MODIFY [COLUMN] col_name column_definition
            [FIRST | AFTER col_name]
    | ORDER BY col_name [, col_name] ...
    | RENAME COLUMN old_col_name TO new_col_name
    | RENAME {INDEX | KEY} old_index_name TO new_index_name
    | RENAME [TO | AS] new_tbl_name
```

```
    | {WITHOUT | WITH} VALIDATION
}
partition_options:
        partition_option [partition_option] ...
partition_option: {
        ADD PARTITION (partition_definition)
    | DROP PARTITION partition_names
    | DISCARD PARTITION {partition_names | ALL} TABLESPACE
    | IMPORT PARTITION {partition_names | ALL} TABLESPACE
    | TRUNCATE PARTITION {partition_names | ALL}
    | COALESCE PARTITION number
    | REORGANIZE PARTITION partition_names INTO (partition_definitions)
    | EXCHANGE PARTITION partition_name WITH TABLE tbl_name [{WITH | WITHOUT} VALIDATION]
    | ANALYZE PARTITION {partition_names | ALL}
    | CHECK PARTITION {partition_names | ALL}
    | OPTIMIZE PARTITION {partition_names | ALL}
    | REBUILD PARTITION {partition_names | ALL}
    | REPAIR PARTITION {partition_names | ALL}
    | REMOVE PARTITIONING
}
key_part: {col_name [(length)] | (expr)} [ASC | DESC]
index_type:
        USING {BTREE | HASH}
index_option: {
        KEY_BLOCK_SIZE [=] value
    | index_type
    | WITH PARSER parser_name
    | COMMENT 'string'
    | {VISIBLE | INVISIBLE}
}
table_options:
        table_option [[,] table_option] ...
table_option: {
        AUTOEXTEND_SIZE [=] value
    | AUTO_INCREMENT [=] value
    | AVG_ROW_LENGTH [=] value
    | [DEFAULT] CHARACTER SET [=] charset_name
    | CHECKSUM [=] {0 | 1}
    | [DEFAULT] COLLATE [=] collation_name
    | COMMENT [=] 'string'
    | COMPRESSION [=] {'ZLIB' | 'LZ4' | 'NONE'}
    | CONNECTION [=] 'connect_string'
    | {DATA | INDEX} DIRECTORY [=] 'absolute path to directory'
    | DELAY_KEY_WRITE [=] {0 | 1}
    | ENCRYPTION [=] {'Y' | 'N'}
    | ENGINE [=] engine_name
    | ENGINE_ATTRIBUTE [=] 'string'
    | INSERT_METHOD [=] { NO | FIRST | LAST }
    | KEY_BLOCK_SIZE [=] value
    | MAX_ROWS [=] value
    | MIN_ROWS [=] value
    | PACK_KEYS [=] {0 | 1 | DEFAULT}
    | PASSWORD [=] 'string'
    | ROW_FORMAT [=] {DEFAULT | DYNAMIC | FIXED | COMPRESSED | REDUNDANT | COMPACT}
    | SECONDARY_ENGINE_ATTRIBUTE [=] 'string'
    | STATS_AUTO_RECALC [=] {DEFAULT | 0 | 1}
    | STATS_PERSISTENT [=] {DEFAULT | 0 | 1}
    | STATS_SAMPLE_PAGES [=] value
    | TABLESPACE tablespace_name [STORAGE {DISK | MEMORY}]
    | UNION [=] (tbl_name[,tbl_name]...)
}
partition_options:
        (see CREATE TABLE options)
```


ALTER TABLE changes the structure of a table. For example, you can add or delete columns, create or destroy indexes, change the type of existing columns, or rename columns or the table itself. You can also change characteristics such as the storage engine used for the table or the table comment.
- To use ALTER TABLE, you need ALTER, CREATE, and INSERT privileges for the table. Renaming a table requires ALTER and DROP on the old table, ALTER, CREATE, and INSERT on the new table.
- Following the table name, specify the alterations to be made. If none are given, ALTER TABLE does nothing.
- The syntax for many of the permissible alterations is similar to clauses of the CREATE TABLE statement. column_definition clauses use the same syntax for ADD and CHANGE as for CREATE TABLE. For more information, see Section 15.1.20, "CREATE TABLE Statement".
- The word COLUMN is optional and can be omitted, except for RENAME COLUMN (to distinguish a column-renaming operation from the RENAME table-renaming operation).
- Multiple ADD, ALTER, DROP, and CHANGE clauses are permitted in a single ALTER TABLE statement, separated by commas. This is a MySQL extension to standard SQL, which permits only one of each clause per ALTER TABLE statement. For example, to drop multiple columns in a single statement, do this:

\section*{ALTER TABLE t2 DROP COLUMN c, DROP COLUMN d;}
- If a storage engine does not support an attempted ALTER TABLE operation, a warning may result. Such warnings can be displayed with SHOW WARNINGS. See Section 15.7.7.42, "SHOW WARNINGS Statement". For information on troubleshooting ALTER TABLE, see Section B.3.6.1, "Problems with ALTER TABLE".
- For information about generated columns, see Section 15.1.9.2, "ALTER TABLE and Generated Columns".
- For usage examples, see Section 15.1.9.3, "ALTER TABLE Examples".
- InnoDB supports addition of multi-valued indexes on JSON columns using a key_part specification can take the form (CAST json_path AS type ARRAY). See Multi-Valued Indexes, for detailed information regarding multi-valued index creation and usage of, as well as restrictions and limitations on multi-valued indexes.
- With the mysql_info( ) C API function, you can find out how many rows were copied by ALTER TABLE. See mysql_info().

There are several additional aspects to the ALTER TABLE statement, described under the following topics in this section:
- Table Options
- Performance and Space Requirements
- Concurrency Control
- Adding and Dropping Columns
- Renaming, Redefining, and Reordering Columns
- Primary Keys and Indexes
- Foreign Keys and Other Constraints
- Changing the Character Set
- Importing InnoDB Tables
- Row Order for MyISAM Tables
- Partitioning Options

\section*{Table Options}
table_options signifies table options of the kind that can be used in the CREATE TABLE statement, such as ENGINE, AUTO_INCREMENT, AVG_ROW_LENGTH, MAX_ROWS, ROW_FORMAT, or TABLESPACE.

For descriptions of all table options, see Section 15.1.20, "CREATE TABLE Statement". However, ALTER TABLE ignores DATA DIRECTORY and INDEX DIRECTORY when given as table options. ALTER TABLE permits them only as partitioning options, and requires that you have the FILE privilege.

Use of table options with ALTER TABLE provides a convenient way of altering single table characteristics. For example:
- If t1 is currently not an InnoDB table, this statement changes its storage engine to InnoDB:
```
ALTER TABLE t1 ENGINE = InnoDB;
```

- See Section 17.6.1.5, "Converting Tables from MyISAM to InnoDB" for considerations when switching tables to the InnoDB storage engine.
- When you specify an ENGINE clause, ALTER TABLE rebuilds the table. This is true even if the table already has the specified storage engine.
- Running ALTER TABLE tbl_name ENGINE=INNODB on an existing InnoDB table performs a "null" ALTER TABLE operation, which can be used to defragment an InnoDB table, as described in Section 17.11.4, "Defragmenting a Table". Running ALTER TABLE tbl_name FORCE on an InnoDB table performs the same function.
- ALTER TABLE tbl_name ENGINE=INNODB and ALTER TABLE tbl_name FORCE use online DDL. For more information, see Section 17.12, "InnoDB and Online DDL".
- The outcome of attempting to change the storage engine of a table is affected by whether the desired storage engine is available and the setting of the NO_ENGINE_SUBSTITUTION SQL mode, as described in Section 7.1.11, "Server SQL Modes".
- To prevent inadvertent loss of data, ALTER TABLE cannot be used to change the storage engine of a table to MERGE or BLACKHOLE.
- To change the InnoDB table to use compressed row-storage format:
```
ALTER TABLE t1 ROW_FORMAT = COMPRESSED;
```

- The ENCRYPTION clause enables or disables page-level data encryption for an InnoDB table. A keyring plugin must be installed and configured to enable encryption.

If the table_encryption_privilege_check variable is enabled, the TABLE_ENCRYPTION_ADMIN privilege is required to use an ENCRYPTION clause with a setting that differs from the default schema encryption setting.

ENCRYPTION is also supported for tables residing in general tablespaces.
For tables that reside in general tablespaces, table and tablespace encryption must match.
The ENCRYPTION option is supported only by the InnoDB storage engine; thus it works only if the table already uses InnoDB (and you do not change the table's storage engine), or if the ALTER TABLE statement also specifies ENGINE=InnoDB. Otherwise the statement is rejected with ER_CHECK_NOT_IMPLEMENTED.

Altering table encryption by moving a table to a different tablespace or changing the storage engine is not permitted without explicitly specifying an ENCRYPTION clause.

Specifying an ENCRYPTION clause with a value other than ' $N$ ' or ' ' is not permitted if the table uses a storage engine that does not support encryption. Attempting to create a table without an ENCRYPTION clause in an encryption-enabled schema using a storage engine that does not support encryption is also not permitted.

For more information, see Section 17.13, "InnoDB Data-at-Rest Encryption".
- To reset the current auto-increment value:
```
ALTER TABLE t1 AUTO_INCREMENT = 13;
```


You cannot reset the counter to a value less than or equal to the value that is currently in use. For both InnoDB and MyISAM, if the value is less than or equal to the maximum value currently in the AUTO_INCREMENT column, the value is reset to the current maximum AUTO_INCREMENT column value plus one.
- To change the default table character set:
```
ALTER TABLE t1 CHARACTER SET = utf8mb4;
```


See also Changing the Character Set.
- To add (or change) a table comment:
```
ALTER TABLE t1 COMMENT = 'New table comment';
```

- Use ALTER TABLE with the TABLESPACE option to move InnoDB tables between existing general tablespaces, file-per-table tablespaces, and the system tablespace. See Moving Tables Between Tablespaces Using ALTER TABLE.
- ALTER TABLE ... TABLESPACE operations always cause a full table rebuild, even if the TABLESPACE attribute has not changed from its previous value.
- ALTER TABLE ... TABLESPACE syntax does not support moving a table from a temporary tablespace to a persistent tablespace.
- The DATA DIRECTORY clause, which is supported with CREATE TABLE ... TABLESPACE, is not supported with ALTER TABLE ... TABLESPACE, and is ignored if specified.
- For more information about the capabilities and limitations of the TABLESPACE option, see CREATE TABLE.
- MySQL NDB Cluster 8.4 supports setting NDB_TABLE options for controlling a table's partition balance (fragment count type), read-from-any-replica capability, full replication, or any combination of these, as part of the table comment for an ALTER TABLE statement in the same manner as for CREATE TABLE, as shown in this example:
```
ALTER TABLE t1 COMMENT = "NDB_TABLE=READ_BACKUP=0,PARTITION_BALANCE=FOR_RA_BY_NODE";
```


It is also possible to set NDB_COMMENT options for columns of NDB tables as part of an ALTER TABLE statement, like this one:
```
ALTER TABLE t1
    CHANGE COLUMN c1 c1 BLOB
        COMMENT = 'NDB_COLUMN=BLOB_INLINE_SIZE=4096,MAX_BLOB_PART_SIZE';
```


Bear in mind that ALTER TABLE ... COMMENT ... discards any existing comment for the table. See Setting NDB_TABLE options, for additional information and examples.
- ENGINE_ATTRIBUTE and SECONDARY_ENGINE_ATTRIBUTE options are used to specify table, column, and index attributes for primary and secondary storage engines. These options are reserved for future use. Index attributes cannot be altered. An index must be dropped and added back with the desired change, which can be performed in a single ALTER TABLE statement.

To verify that the table options were changed as intended, use SHOW CREATE TABLE, or query the Information Schema TABLES table.

\section*{Performance and Space Requirements}

ALTER TABLE operations are processed using one of the following algorithms:
- COPY: Operations are performed on a copy of the original table, and table data is copied from the original table to the new table row by row. Concurrent DML is not permitted.
- INPLACE: Operations avoid copying table data but may rebuild the table in place. An exclusive metadata lock on the table may be taken briefly during preparation and execution phases of the operation. Typically, concurrent DML is supported.
- INSTANT: Operations only modify metadata in the data dictionary. An exclusive metadata lock on the table may be taken briefly during the execution phase of the operation. Table data is unaffected, making operations instantaneous. Concurrent DML is permitted.

For tables using the NDB storage engine, these algorithms work as follows:
- COPY: NDB creates a copy of the table and alters it; the NDB Cluster handler then copies the data between the old and new versions of the table. Subsequently, NDB deletes the old table and renames the new one.

This is sometimes also referred to as a "copying" or "offline" ALTER TABLE.
- INPLACE: The data nodes make the required changes; the NDB Cluster handler does not copy data or otherwise take part.

This is sometimes also referred to as a "non-copying" or "online" ALTER TABLE.
- INSTANT: Not supported by NDB.

See Section 25.6.12, "Online Operations with ALTER TABLE in NDB Cluster", for more information.
The ALGORITHM clause is optional. If the ALGORITHM clause is omitted, MySQL uses
ALGORITHM=INSTANT for storage engines and ALTER TABLE clauses that support it. Otherwise,
ALGORITHM=INPLACE is used. If ALGORITHM=INPLACE is not supported, ALGORITHM=COPY is used.

\section*{Note}

After adding a column to a partitioned table using ALGORITHM=INSTANT, it is no longer possible to perform ALTER TABLE ... EXCHANGE PARTITION on the table.

Specifying an ALGORITHM clause requires the operation to use the specified algorithm for clauses and storage engines that support it, or fail with an error otherwise. Specifying ALGORITHM=DEFAULT is the same as omitting the ALGORITHM clause.

ALTER TABLE operations that use the COPY algorithm wait for other operations that are modifying the table to complete. After alterations are applied to the table copy, data is copied over, the original table is deleted, and the table copy is renamed to the name of the original table. While the ALTER TABLE operation executes, the original table is readable by other sessions (with the exception noted shortly). Updates and writes to the table started after the ALTER TABLE operation begins are stalled until the new table is ready, then are automatically redirected to the new table. The temporary copy of the table is created in the database directory of the original table unless it is a RENAME TO operation that moves the table to a database that resides in a different directory.

The exception referred to earlier is that ALTER TABLE blocks reads (not just writes) at the point where it is ready to clear outdated table structures from the table and table definition caches. At this point, it must acquire an exclusive lock. To do so, it waits for current readers to finish, and blocks new reads and writes.

An ALTER TABLE operation that uses the COPY algorithm prevents concurrent DML operations. Concurrent queries are still allowed. That is, a table-copying operation always includes at least the concurrency restrictions of LOCK=SHARED (allow queries but not DML). You can further restrict concurrency for operations that support the LOCK clause by specifying LOCK=EXCLUSIVE, which prevents DML and queries. For more information, see Concurrency Control.

To force use of the COPY algorithm for an ALTER TABLE operation that would otherwise not use it, specify ALGORITHM=COPY or enable the old_alter_table system variable. If there is a conflict between the old_alter_table setting and an ALGORITHM clause with a value other than DEFAULT, the ALGORITHM clause takes precedence.

For InnoDB tables, an ALTER TABLE operation that uses the COPY algorithm on a table that resides in a shared tablespace can increase the amount of space used by the tablespace. Such operations require as much additional space as the data in the table plus indexes. For a table residing in a shared tablespace, the additional space used during the operation is not released back to the operating system as it is for a table that resides in a file-per-table tablespace.

For information about space requirements for online DDL operations, see Section 17.12.3, "Online DDL Space Requirements".

ALTER TABLE operations that support the INPLACE algorithm include:
- ALTER TABLE operations supported by the InnoDB online DDL feature. See Section 17.12.1, "Online DDL Operations".
- Renaming a table. MySQL renames files that correspond to the table tbl_name without making a copy. (You can also use the RENAME TABLE statement to rename tables. See Section 15.1.36, "RENAME TABLE Statement".) Privileges granted specifically for the renamed table are not migrated to the new name. They must be changed manually.
- Operations that modify table metadata only. These operations are immediate because the server does not touch table contents. Metadata-only operations include:
- Renaming a column. In NDB Cluster, this operation can also be performed online.
- Changing the default value of a column (except for NDB tables).
- Modifying the definition of an ENUM or SET column by adding new enumeration or set members to the end of the list of valid member values, as long as the storage size of the data type does not change. For example, adding a member to a SET column that has 8 members changes the required storage per value from 1 byte to 2 bytes; this requires a table copy. Adding members in the middle of the list causes renumbering of existing members, which requires a table copy.
- Changing the definition of a spatial column to remove the SRID attribute. (Adding or changing an SRID attribute requires a rebuild, and cannot be done in place, because the server must verify that all values have the specified SRID value.)
- Changing a column character set, when these conditions apply:
- The column data type is CHAR, VARCHAR, a TEXT type, or ENUM.
- The character set change is from utf 8 mb 3 to utf 8 mb 4 , or any character set to binary.
- There is no index on the column.
- Changing a generated column, when these conditions apply:
- For InnoDB tables, statements that modify generated stored columns but do not change their type, expression, or nullability.
- For non-InnoDB tables, statements that modify generated stored or virtual columns but do not change their type, expression, or nullability.

An example of such a change is a change to the column comment.
- Renaming an index.
- Adding or dropping a secondary index, for InnoDB and NDB tables. See Section 17.12.1, "Online DDL Operations".
- For NDB tables, operations that add and drop indexes on variable-width columns. These operations occur online, without table copying and without blocking concurrent DML actions for most of their duration. See Section 25.6.12, "Online Operations with ALTER TABLE in NDB Cluster".
- Modifying index visibility with an ALTER INDEX operation.
- Column modifications of tables containing generated columns that depend on columns with a DEFAULT value if the modified columns are not involved in the generated column expressions. For example, changing the NULL property of a separate column can be done in place without a table rebuild.

ALTER TABLE operations that support the INSTANT algorithm include:
- Adding a column. This feature is referred to as "Instant ADD COLUMN". Limitations apply. See Section 17.12.1, "Online DDL Operations".
- Dropping a column. This feature is referred to as "Instant DROP COLUMN". Limitations apply. See Section 17.12.1, "Online DDL Operations".
- Adding or dropping a virtual column.
- Adding or dropping a column default value.
- Modifying the definition of an ENUM or SET column. The same restrictions apply as described above for ALGORITHM=INSTANT.
- Changing the index type.
- Renaming a table. The same restrictions apply as described above for ALGORITHM=INSTANT.

For more information about operations that support ALGORITHM=INSTANT, see Section 17.12.1, "Online DDL Operations".

ALTER TABLE upgrades MySQL 5.5 temporal columns to 5.6 format for ADD COLUMN, CHANGE COLUMN, MODIFY COLUMN, ADD INDEX, and FORCE operations. This conversion cannot be done using the INPLACE algorithm because the table must be rebuilt, so specifying ALGORITHM=INPLACE in these cases results in an error. Specify ALGORITHM=COPY if necessary.

If an ALTER TABLE operation on a multicolumn index used to partition a table by KEY changes the order of the columns, it can only be performed using ALGORITHM=COPY.

The WITHOUT VALIDATION and WITH VALIDATION clauses affect whether ALTER TABLE performs an in-place operation for virtual generated column modifications. See Section 15.1.9.2, "ALTER TABLE and Generated Columns".

NDB Cluster 8.4 supports online operations using the same ALGORITHM=INPLACE syntax used with the standard MySQL Server. NDB does not allow changing a tablespace online. See Section 25.6.12, "Online Operations with ALTER TABLE in NDB Cluster", for more information.

When performing a copying ALTER TABLE, NDB checks to ensure that no concurrent writes have been made to the affected table. If it finds that any have been made, NDB rejects the ALTER TABLE statement and raises ER_TABLE_DEF_CHANGED.

ALTER TABLE with DISCARD ... PARTITION ... TABLESPACE or IMPORT ... PARTITION ... TABLESPACE does not create any temporary tables or temporary partition files.

ALTER TABLE with ADD PARTITION, DROP PARTITION, COALESCE PARTITION, REBUILD PARTITION, or REORGANIZE PARTITION does not create temporary tables (except when used with NDB tables); however, these operations can and do create temporary partition files.

ADD or DROP operations for RANGE or LIST partitions are immediate operations or nearly so. ADD or COALESCE operations for HASH or KEY partitions copy data between all partitions, unless LINEAR HASH or LINEAR KEY was used; this is effectively the same as creating a new table, although the ADD or COALESCE operation is performed partition by partition. REORGANIZE operations copy only changed partitions and do not touch unchanged ones.

For MyISAM tables, you can speed up index re-creation (the slowest part of the alteration process) by setting the myisam_sort_buffer_size system variable to a high value.

\section*{Concurrency Control}

For ALTER TABLE operations that support it, you can use the LOCK clause to control the level of concurrent reads and writes on a table while it is being altered. Specifying a non-default value for this clause enables you to require a certain amount of concurrent access or exclusivity during the alter operation, and halts the operation if the requested degree of locking is not available.

Only LOCK $=$ DEFAULT is permitted for operations that use ALGORITHM=INSTANT. The other LOCK clause parameters are not applicable.

The parameters for the LOCK clause are:
- LOCK = DEFAULT

Maximum level of concurrency for the given ALGORITHM clause (if any) and ALTER TABLE operation: Permit concurrent reads and writes if supported. If not, permit concurrent reads if supported. If not, enforce exclusive access.
- LOCK = NONE

If supported, permit concurrent reads and writes. Otherwise, an error occurs.
- LOCK = SHARED

If supported, permit concurrent reads but block writes. Writes are blocked even if concurrent writes are supported by the storage engine for the given ALGORITHM clause (if any) and ALTER TABLE operation. If concurrent reads are not supported, an error occurs.
- LOCK = EXCLUSIVE

Enforce exclusive access. This is done even if concurrent reads/writes are supported by the storage engine for the given ALGORITHM clause (if any) and ALTER TABLE operation.

\section*{Adding and Dropping Columns}

Use ADD to add new columns to a table, and DROP to remove existing columns. DROP col_name is a MySQL extension to standard SQL.

To add a column at a specific position within a table row, use FIRST or AFTER col_name. The default is to add the column last.

If a table contains only one column, the column cannot be dropped. If what you intend is to remove the table, use the DROP TABLE statement instead.

If columns are dropped from a table, the columns are also removed from any index of which they are a part. If all columns that make up an index are dropped, the index is dropped as well. If you use CHANGE or MODIFY to shorten a column for which an index exists on the column, and the resulting column length is less than the index length, MySQL shortens the index automatically.

For ALTER TABLE ... ADD, if the column has an expression default value that uses a nondeterministic function, the statement may produce a warning or error. For further information, see Section 13.6, "Data Type Default Values", and Section 19.1.3.7, "Restrictions on Replication with GTIDs".

\section*{Renaming, Redefining, and Reordering Columns}

The CHANGE, MODIFY, RENAME COLUMN, and ALTER clauses enable the names and definitions of existing columns to be altered. They have these comparative characteristics:
- CHANGE:
- Can rename a column and change its definition, or both.
- Has more capability than MODIFY or RENAME COLUMN, but at the expense of convenience for some operations. CHANGE requires naming the column twice if not renaming it, and requires respecifying the column definition if only renaming it.
- With FIRST or AFTER, can reorder columns.
- MODIFY:
- Can change a column definition but not its name.
- More convenient than CHANGE to change a column definition without renaming it.
- With FIRST or AFTER, can reorder columns.
- RENAME COLUMN:
- Can change a column name but not its definition.
- More convenient than CHANGE to rename a column without changing its definition.
- ALTER: Used only to change a column default value.

CHANGE is a MySQL extension to standard SQL. MODIFY and RENAME COLUMN are MySQL extensions for Oracle compatibility.

To alter a column to change both its name and definition, use CHANGE, specifying the old and new names and the new definition. For example, to rename an INT NOT NULL column from $a$ to $b$ and change its definition to use the BIGINT data type while retaining the NOT NULL attribute, do this:

ALTER TABLE t1 CHANGE a b BIGINT NOT NULL;
To change a column definition but not its name, use CHANGE or MODIFY. With CHANGE, the syntax requires two column names, so you must specify the same name twice to leave the name unchanged. For example, to change the definition of column b, do this:

ALTER TABLE t1 CHANGE b b INT NOT NULL;
MODIFY is more convenient to change the definition without changing the name because it requires the column name only once:

ALTER TABLE t1 MODIFY b INT NOT NULL;
To change a column name but not its definition, use CHANGE or RENAME COLUMN. With CHANGE, the syntax requires a column definition, so to leave the definition unchanged, you must respecify the definition the column currently has. For example, to rename an INT NOT NULL column from b to a, do this:

ALTER TABLE t1 CHANGE b a INT NOT NULL;

RENAME COLUMN is more convenient to change the name without changing the definition because it requires only the old and new names:

ALTER TABLE t1 RENAME COLUMN b TO a;
In general, you cannot rename a column to a name that already exists in the table. However, this is sometimes not the case, such as when you swap names or move them through a cycle. If a table has columns named $a, b$, and $c$, these are valid operations:
```
-- swap a and b
ALTER TABLE t1 RENAME COLUMN a TO b,
    RENAME COLUMN b TO a;
-- "rotate" a, b, c through a cycle
ALTER TABLE t1 RENAME COLUMN a TO b,
    RENAME COLUMN b TO c,
    RENAME COLUMN c TO a;
```


For column definition changes using CHANGE or MODIFY, the definition must include the data type and all attributes that should apply to the new column, other than index attributes such as PRIMARY KEY or UNIQUE. Attributes present in the original definition but not specified for the new definition are not carried forward. Suppose that a column col1 is defined as INT UNSIGNED DEFAULT 1 COMMENT 'my column ' and you modify the column as follows, intending to change only INT to BIGINT:

ALTER TABLE t1 MODIFY col1 BIGINT;
That statement changes the data type from INT to BIGINT, but it also drops the UNSIGNED, DEFAULT, and COMMENT attributes. To retain them, the statement must include them explicitly:

ALTER TABLE t1 MODIFY col1 BIGINT UNSIGNED DEFAULT 1 COMMENT 'my column';
For data type changes using CHANGE or MODIFY, MySQL tries to convert existing column values to the new type as well as possible.

> Warning
> This conversion may result in alteration of data. For example, if you shorten a string column, values may be truncated. To prevent the operation from succeeding if conversions to the new data type would result in loss of data, enable strict SQL mode before using ALTER TABLE (see Section 7.1.11, "Server SQL Modes").

If you use CHANGE or MODIFY to shorten a column for which an index exists on the column, and the resulting column length is less than the index length, MySQL shortens the index automatically.

For columns renamed by CHANGE or RENAME COLUMN, MySQL automatically renames these references to the renamed column:
- Indexes that refer to the old column, including invisible indexes and disabled MyISAM indexes.
- Foreign keys that refer to the old column.

For columns renamed by CHANGE or RENAME COLUMN, MySQL does not automatically rename these references to the renamed column:
- Generated column and partition expressions that refer to the renamed column. You must use CHANGE to redefine such expressions in the same ALTER TABLE statement as the one that renames the column.
- Views and stored programs that refer to the renamed column. You must manually alter the definition of these objects to refer to the new column name.

To reorder columns within a table, use FIRST and AFTER in CHANGE or MODIFY operations.
ALTER ... SET DEFAULT or ALTER ... DROP DEFAULT specify a new default value for a column or remove the old default value, respectively. If the old default is removed and the column can be

NULL, the new default is NULL. If the column cannot be NULL, MySQL assigns a default value as described in Section 13.6, "Data Type Default Values".

ALTER ... SET VISIBLE and ALTER ... SET INVISIBLE enable column visibility to be changed. See Section 15.1.20.10, "Invisible Columns".

\section*{Primary Keys and Indexes}

DROP PRIMARY KEY drops the primary key. If there is no primary key, an error occurs. For information about the performance characteristics of primary keys, especially for InnoDB tables, see Section 10.3.2, "Primary Key Optimization".

If the sql_require_primary_key system variable is enabled, attempting to drop a primary key produces an error.

If you add a UNIQUE INDEX or PRIMARY KEY to a table, MySQL stores it before any nonunique index to permit detection of duplicate keys as early as possible.

DROP INDEX removes an index. This is a MySQL extension to standard SQL. See Section 15.1.27, "DROP INDEX Statement". To determine index names, use SHOW INDEX FROM tbl_name.

Some storage engines permit you to specify an index type when creating an index. The syntax for the index_type specifier is USING type_name. For details about USING, see Section 15.1.15, "CREATE INDEX Statement". The preferred position is after the column list. Expect support for use of the option before the column list to be removed in a future MySQL release.
index_option values specify additional options for an index. USING is one such option. For details about permissible index_option values, see Section 15.1.15, "CREATE INDEX Statement".

RENAME INDEX old_index_name TO new_index_name renames an index. This is a MySQL extension to standard SQL. The content of the table remains unchanged. old_index_name must be the name of an existing index in the table that is not dropped by the same ALTER TABLE statement. new_index_name is the new index name, which cannot duplicate the name of an index in the resulting table after changes have been applied. Neither index name can be PRIMARY.

If you use ALTER TABLE on a MyISAM table, all nonunique indexes are created in a separate batch (as for REPAIR TABLE). This should make ALTER TABLE much faster when you have many indexes.

For MyISAM tables, key updating can be controlled explicitly. Use ALTER TABLE ... DISABLE KEYS to tell MySQL to stop updating nonunique indexes. Then use ALTER TABLE ... ENABLE KEYS to re-create missing indexes. MyISAM does this with a special algorithm that is much faster than inserting keys one by one, so disabling keys before performing bulk insert operations should give a considerable speedup. Using ALTER TABLE ... DISABLE KEYS requires the INDEX privilege in addition to the privileges mentioned earlier.

While the nonunique indexes are disabled, they are ignored for statements such as SELECT and EXPLAIN that otherwise would use them.

After an ALTER TABLE statement, it may be necessary to run ANALYZE TABLE to update index cardinality information. See Section 15.7.7.23, "SHOW INDEX Statement".

The ALTER INDEX operation permits an index to be made visible or invisible. An invisible index is not used by the optimizer. Modification of index visibility applies to indexes other than primary keys (either explicit or implicit), and cannot be performed using ALGORITHM=INSTANT. This feature is storage engine neutral (supported for any engine). For more information, see Section 10.3.12, "Invisible Indexes".

\section*{Foreign Keys and Other Constraints}

The FOREIGN KEY and REFERENCES clauses are supported by the InnoDB and NDB storage engines, which implement ADD [CONSTRAINT [symbol]] FOREIGN KEY [index_name] (...) REFERENCES ... (...). See Section 15.1.20.5, "FOREIGN KEY Constraints". For other storage engines, the clauses are parsed but ignored.

For ALTER TABLE, unlike CREATE TABLE, ADD FOREIGN KEY ignores index_name if given and uses an automatically generated foreign key name. As a workaround, include the CONSTRAINT clause to specify the foreign key name:
```
ADD CONSTRAINT name FOREIGN KEY (....) ...
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2501.jpg?height=97&width=104&top_left_y=486&top_left_x=365)

\section*{Important}

MySQL silently ignores inline REFERENCES specifications, where the references are defined as part of the column specification. MySQL accepts only REFERENCES clauses defined as part of a separate FOREIGN KEY specification.

\section*{Note}

Partitioned InnoDB tables do not support foreign keys. This restriction does not apply to NDB tables, including those explicitly partitioned by [LINEAR] KEY. For more information, see Section 26.6.2, "Partitioning Limitations Relating to Storage Engines".

MySQL Server and NDB Cluster both support the use of ALTER TABLE to drop foreign keys:
```
ALTER TABLE tbl_name DROP FOREIGN KEY fk_symbol;
```


Adding and dropping a foreign key in the same ALTER TABLE statement is supported for ALTER TABLE ... ALGORITHM=INPLACE but not for ALTER TABLE ... ALGORITHM=COPY.

The server prohibits changes to foreign key columns that have the potential to cause loss of referential integrity. A workaround is to use ALTER TABLE ... DROP FOREIGN KEY before changing the column definition and ALTER TABLE ... ADD FOREIGN KEY afterward. Examples of prohibited changes include:
- Changes to the data type of foreign key columns that may be unsafe. For example, changing $\operatorname{VARCHAR(20)}$ to VARCHAR(30) is permitted, but changing it to VARCHAR(1024) is not because that alters the number of length bytes required to store individual values.
- Changing a NULL column to NOT NULL in non-strict mode is prohibited to prevent converting NULL values to default non-NULL values, for which there are no corresponding values in the referenced table. The operation is permitted in strict mode, but an error is returned if any such conversion is required.

ALTER TABLE tbl_name RENAME new_tbl_name changes internally generated foreign key constraint names and user-defined foreign key constraint names that begin with the string "tbl_name_ibfk_" to reflect the new table name. InnoDB interprets foreign key constraint names that begin with the string "tbl_name_ibfk_" as internally generated names.

ALTER TABLE permits CHECK constraints for existing tables to be added, dropped, or altered:
- Add a new CHECK constraint:
```
ALTER TABLE tbl_name
    ADD [CONSTRAINT [symbol]] CHECK (expr) [[NOT] ENFORCED];
```


The meaning of constraint syntax elements is the same as for CREATE TABLE. See Section 15.1.20.6, "CHECK Constraints".
- Drop an existing CHECK constraint named symbol:
```
ALTER TABLE tbl_name
    DROP CHECK symbol;
```

- Alter whether an existing CHECK constraint named symbol is enforced:
```
ALTER TABLE tbl_name
```

```
ALTER CHECK symbol [NOT] ENFORCED;
```


The DROP CHECK and ALTER CHECK clauses are MySQL extensions to standard SQL.
ALTER TABLE permits more general (and SQL standard) syntax for dropping and altering existing constraints of any type, where the constraint type is determined from the constraint name:
- Drop an existing constraint named symbol:
```
ALTER TABLE tbl_name
    DROP CONSTRAINT symbol;
```


If the sql_require_primary_key system variable is enabled, attempting to drop a primary key produces an error.
- Alter whether an existing constraint named symbol is enforced:
```
ALTER TABLE tbl_name
    ALTER CONSTRAINT symbol [NOT] ENFORCED;
```


Only CHECK constraints can be altered to be unenforced. All other constraint types are always enforced.

The SQL standard specifies that all types of constraints (primary key, unique index, foreign key, check) belong to the same namespace. In MySQL, each constraint type has its own namespace per schema. Consequently, names for each type of constraint must be unique per schema, but constraints of different types can have the same name. When multiple constraints have the same name, DROP CONSTRAINT and ADD CONSTRAINT are ambiguous and an error occurs. In such cases, constraintspecific syntax must be used to modify the constraint. For example, use DROP PRIMARY KEY or DROP FOREIGN KEY to drop a primary key or foreign key.

If a table alteration causes a violation of an enforced CHECK constraint, an error occurs and the table is not modified. Examples of operations for which an error occurs:
- Attempts to add the AUTO_INCREMENT attribute to a column that is used in a CHECK constraint.
- Attempts to add an enforced CHECK constraint or enforce a nonenforced CHECK constraint for which existing rows violate the constraint condition.
- Attempts to modify, rename, or drop a column that is used in a CHECK constraint, unless that constraint is also dropped in the same statement. Exception: If a CHECK constraint refers only to a single column, dropping the column automatically drops the constraint.

ALTER TABLE tbl_name RENAME new_tbl_name changes internally generated and user-defined CHECK constraint names that begin with the string "tbl_name_chk_" to reflect the new table name. MySQL interprets CHECK constraint names that begin with the string "tbl_name_chk_" as internally generated names.

\section*{Changing the Character Set}

To change the table default character set and all character columns (CHAR, VARCHAR, TEXT) to a new character set, use a statement like this:

ALTER TABLE tbl_name CONVERT TO CHARACTER SET charset_name;
The statement also changes the collation of all character columns. If you specify no COLLATE clause to indicate which collation to use, the statement uses default collation for the character set. If this collation is inappropriate for the intended table use (for example, if it would change from a case-sensitive collation to a case-insensitive collation), specify a collation explicitly.

For a column that has a data type of VARCHAR or one of the TEXT types, CONVERT TO CHARACTER SET changes the data type as necessary to ensure that the new column is long enough to store as many characters as the original column. For example, a TEXT column has two length bytes, which store the byte-length of values in the column, up to a maximum of 65,535. For a latin1 TEXT column,
each character requires a single byte, so the column can store up to 65,535 characters. If the column is converted to utf 8 mb 4 , each character might require up to 4 bytes, for a maximum possible length of $4 \times 65,535=262,140$ bytes. That length does not fit in a TEXT column's length bytes, so MySQL converts the data type to MEDIUMTEXT, which is the smallest string type for which the length bytes can record a value of 262,140. Similarly, a VARCHAR column might be converted to MEDIUMTEXT.

To avoid data type changes of the type just described, do not use CONVERT TO CHARACTER SET. Instead, use MODIFY to change individual columns. For example:

ALTER TABLE t MODIFY latin1_text_col TEXT CHARACTER SET utf8mb4;
ALTER TABLE t MODIFY latin1_varchar_col VARCHAR(M) CHARACTER SET utf8mb4;
If you specify CONVERT TO CHARACTER SET binary, the CHAR, VARCHAR, and TEXT columns are converted to their corresponding binary string types (BINARY, VARBINARY, BLOB). This means that the columns no longer have a character set and a subsequent CONVERT TO operation does not apply to them.

If charset_name is DEFAULT in a CONVERT TO CHARACTER SET operation, the character set named by the character_set_database system variable is used.

\section*{Warning}

The CONVERT TO operation converts column values between the original and named character sets. This is not what you want if you have a column in one character set (like latin1) but the stored values actually use some other, incompatible character set (like utf8mb4). In this case, you have to do the following for each such column:
```
ALTER TABLE t1 CHANGE c1 c1 BLOB;
ALTER TABLE t1 CHANGE c1 c1 TEXT CHARACTER SET utf8mb4;
```


The reason this works is that there is no conversion when you convert to or from BLOB columns.

To change only the default character set for a table, use this statement:
ALTER TABLE tbl_name DEFAULT CHARACTER SET charset_name;
The word DEFAULT is optional. The default character set is the character set that is used if you do not specify the character set for columns that you add to a table later (for example, with ALTER TABLE ... ADD column).

When the foreign_key_checks system variable is enabled, which is the default setting, character set conversion is not permitted on tables that include a character string column used in a foreign key constraint. The workaround is to disable foreign_key_checks before performing the character set conversion. You must perform the conversion on both tables involved in the foreign key constraint before re-enabling foreign_key_checks. If you re-enable foreign_key_checks after converting only one of the tables, an ON DELETE CASCADE or ON UPDATE CASCADE operation could corrupt data in the referencing table due to implicit conversion that occurs during these operations (Bug \#45290, Bug \#74816).

\section*{Importing InnoDB Tables}

An InnoDB table created in its own file-per-table tablespace can be imported from a backup or from another MySQL server instance using DISCARD TABLEPACE and IMPORT TABLESPACE clauses. See Section 17.6.1.3, "Importing InnoDB Tables".

\section*{Row Order for MyISAM Tables}

ORDER BY enables you to create the new table with the rows in a specific order. This option is useful primarily when you know that you query the rows in a certain order most of the time. By using this option after major changes to the table, you might be able to get higher performance. In some cases, it
might make sorting easier for MySQL if the table is in order by the column that you want to order it by later.

\section*{Note}

The table does not remain in the specified order after inserts and deletes.

ORDER BY syntax permits one or more column names to be specified for sorting, each of which optionally can be followed by ASC or DESC to indicate ascending or descending sort order, respectively. The default is ascending order. Only column names are permitted as sort criteria; arbitrary expressions are not permitted. This clause should be given last after any other clauses.

ORDER BY does not make sense for InnoDB tables because InnoDB always orders table rows according to the clustered index.

When used on a partitioned table, ALTER TABLE ... ORDER BY orders rows within each partition only.

\section*{Partitioning Options}
partition_options signifies options that can be used with partitioned tables for repartitioning, to add, drop, discard, import, merge, and split partitions, and to perform partitioning maintenance.

It is possible for an ALTER TABLE statement to contain a PARTITION BY or REMOVE PARTITIONING clause in an addition to other alter specifications, but the PARTITION BY or REMOVE PARTITIONING clause must be specified last after any other specifications. The ADD PARTITION, DROP PARTITION, DISCARD PARTITION, IMPORT PARTITION, COALESCE PARTITION, REORGANIZE PARTITION, EXCHANGE PARTITION, ANALYZE PARTITION, CHECK PARTITION, and REPAIR PARTITION options cannot be combined with other alter specifications in a single ALTER TABLE, since the options just listed act on individual partitions.

For more information about partition options, see Section 15.1.20, "CREATE TABLE Statement", and Section 15.1.9.1, "ALTER TABLE Partition Operations". For information about and examples of ALTER TABLE ... EXCHANGE PARTITION statements, see Section 26.3.3, "Exchanging Partitions and Subpartitions with Tables".

\subsection*{15.1.9.1 ALTER TABLE Partition Operations}

Partitioning-related clauses for ALTER TABLE can be used with partitioned tables for repartitioning, to add, drop, discard, import, merge, and split partitions, and to perform partitioning maintenance.
- Simply using a partition_options clause with ALTER TABLE on a partitioned table repartitions the table according to the partitioning scheme defined by the partition_options. This clause always begins with PARTITION BY, and follows the same syntax and other rules as apply to the partition_options clause for CREATE TABLE (for more detailed information, see Section 15.1.20, "CREATE TABLE Statement"), and can also be used to partition an existing table that is not already partitioned. For example, consider a (nonpartitioned) table defined as shown here:
```
CREATE TABLE t1 (
    id INT,
    year_col INT
);
```


This table can be partitioned by HASH, using the id column as the partitioning key, into 8 partitions by means of this statement:
```
ALTER TABLE t1
    PARTITION BY HASH(id)
    PARTITIONS 8;
```


MySQL supports an ALGORITHM option with [SUB]PARTITION BY [LINEAR] KEY. ALGORITHM=1 causes the server to use the same key-hashing functions as MySQL 5.1 when computing the placement of rows in partitions; ALGORITHM=2 means that the server employs the
key-hashing functions implemented and used by default for new KEY partitioned tables in MySQL 5.5 and later. (Partitioned tables created with the key-hashing functions employed in MySQL 5.5 and later cannot be used by a MySQL 5.1 server.) Not specifying the option has the same effect as using ALGORITHM=2. This option is intended for use chiefly when upgrading or downgrading [LINEAR] KEY partitioned tables between MySQL 5.1 and later MySQL versions, or for creating tables partitioned by KEY or LINEAR KEY on a MySQL 5.5 or later server which can be used on a MySQL 5.1 server.

The table that results from using an ALTER TABLE ... PARTITION BY statement must follow the same rules as one created using CREATE TABLE ... PARTITION BY. This includes the rules governing the relationship between any unique keys (including any primary key) that the table might have, and the column or columns used in the partitioning expression, as discussed in Section 26.6.1, "Partitioning Keys, Primary Keys, and Unique Keys". The CREATE TABLE ... PARTITION BY rules for specifying the number of partitions also apply to ALTER TABLE ... PARTITION BY.

The partition_definition clause for ALTER TABLE ADD PARTITION supports the same options as the clause of the same name for the CREATE TABLE statement. (See Section 15.1.20, "CREATE TABLE Statement", for the syntax and description.) Suppose that you have the partitioned table created as shown here:
```
CREATE TABLE t1 (
    id INT,
    year_col INT
)
PARTITION BY RANGE (year_col) (
    PARTITION p0 VALUES LESS THAN (1991),
    PARTITION p1 VALUES LESS THAN (1995),
    PARTITION p2 VALUES LESS THAN (1999)
);
```


You can add a new partition p3 to this table for storing values less than 2002 as follows:
ALTER TABLE t1 ADD PARTITION (PARTITION p3 VALUES LESS THAN (2002));
DROP PARTITION can be used to drop one or more RANGE or LIST partitions. This statement cannot be used with HASH or KEY partitions; instead, use COALESCE PARTITION (see later in this section). Any data that was stored in the dropped partitions named in the partition_names list is discarded. For example, given the table t1 defined previously, you can drop the partitions named p0 and p 1 as shown here:

ALTER TABLE t1 DROP PARTITION p0, p1;
Note
DROP PARTITION does not work with tables that use the NDB storage engine. See Section 26.3.1, "Management of RANGE and LIST Partitions", and Section 25.2.7, "Known Limitations of NDB Cluster".

ADD PARTITION and DROP PARTITION do not currently support IF [NOT] EXISTS.
The DISCARD PARTITION ... TABLESPACE and IMPORT PARTITION ... TABLESPACE options extend the Transportable Tablespace feature to individual InnoDB table partitions. Each InnoDB table partition has its own tablespace file (.ibd file). The Transportable Tablespace feature makes it easy to copy the tablespaces from a running MySQL server instance to another running
instance, or to perform a restore on the same instance. Both options take a comma-separated list of one or more partition names. For example:

ALTER TABLE t1 DISCARD PARTITION p2, p3 TABLESPACE;

ALTER TABLE t1 IMPORT PARTITION p2, p3 TABLESPACE;
When running DISCARD PARTITION ... TABLESPACE and IMPORT PARTITION ... TABLESPACE on subpartitioned tables, both partition and subpartition names are allowed. When a partition name is specified, subpartitions of that partition are included.

The Transportable Tablespace feature also supports copying or restoring partitioned InnoDB tables. For more information, see Section 17.6.1.3, "Importing InnoDB Tables".

Renames of partitioned tables are supported. You can rename individual partitions indirectly using ALTER TABLE ... REORGANIZE PARTITION; however, this operation copies the partition's data.

To delete rows from selected partitions, use the TRUNCATE PARTITION option. This option takes a list of one or more comma-separated partition names. Consider the table t1 created by this statement:
```
CREATE TABLE t1 (
    id INT,
    year_col INT
)
PARTITION BY RANGE (year_col) (
    PARTITION p0 VALUES LESS THAN (1991),
    PARTITION p1 VALUES LESS THAN (1995),
    PARTITION p2 VALUES LESS THAN (1999),
    PARTITION p3 VALUES LESS THAN (2003),
    PARTITION p4 VALUES LESS THAN (2007)
);
```


To delete all rows from partition p0, use the following statement:
```
ALTER TABLE t1 TRUNCATE PARTITION p0;
```


The statement just shown has the same effect as the following DELETE statement:
```
DELETE FROM t1 WHERE year_col < 1991;
```


When truncating multiple partitions, the partitions do not have to be contiguous: This can greatly simplify delete operations on partitioned tables that would otherwise require very complex WHERE conditions if done with DELETE statements. For example, this statement deletes all rows from partitions p1 and p3:
```
ALTER TABLE t1 TRUNCATE PARTITION p1, p3;
```


An equivalent DELETE statement is shown here:
```
DELETE FROM t1 WHERE
    (year_col >= 1991 AND year_col < 1995)
    OR
    (year_col >= 2003 AND year_col < 2007);
```


If you use the ALL keyword in place of the list of partition names, the statement acts on all table partitions.

TRUNCATE PARTITION merely deletes rows; it does not alter the definition of the table itself, or of any of its partitions.

To verify that the rows were dropped, check the INFORMATION_SCHEMA. PARTITIONS table, using a query such as this one:
```
FROM INFORMATION_SCHEMA.PARTITIONS
WHERE TABLE_NAME = 't1';
```


COALESCE PARTITION can be used with a table that is partitioned by HASH or KEY to reduce the number of partitions by number. Suppose that you have created table t2 as follows:
```
CREATE TABLE t2 (
    name VARCHAR (30),
    started DATE
)
PARTITION BY HASH( YEAR(started) )
PARTITIONS 6;
```


To reduce the number of partitions used by t2 from 6 to 4, use the following statement:

\section*{ALTER TABLE t2 COALESCE PARTITION 2;}

The data contained in the last number partitions is merged into the remaining partitions. In this case, partitions 4 and 5 are merged into the first 4 partitions (the partitions numbered $0,1,2$, and 3 ).

To change some but not all the partitions used by a partitioned table, you can use REORGANIZE PARTITION. This statement can be used in several ways:
- To merge a set of partitions into a single partition. This is done by naming several partitions in the partition_names list and supplying a single definition for partition_definition.
- To split an existing partition into several partitions. Accomplish this by naming a single partition for partition_names and providing multiple partition_definitions.
- To change the ranges for a subset of partitions defined using VALUES LESS THAN or the value lists for a subset of partitions defined using VALUES IN.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2507.jpg?height=127&width=106&top_left_y=1484&top_left_x=397)

\section*{Note}

For partitions that have not been explicitly named, MySQL automatically provides the default names p0, p1, p2, and so on. The same is true with regard to subpartitions.

For more detailed information about and examples of ALTER TABLE . . . REORGANIZE PARTITION statements, see Section 26.3.1, "Management of RANGE and LIST Partitions".
- To exchange a table partition or subpartition with a table, use the ALTER TABLE ... EXCHANGE PARTITION statement-that is, to move any existing rows in the partition or subpartition to the nonpartitioned table, and any existing rows in the nonpartitioned table to the table partition or subpartition.

Once one or more columns have been added to a partitioned table using ALGORITHM=INSTANT, it is no longer possible to exchange partitions with that table.

For usage information and examples, see Section 26.3.3, "Exchanging Partitions and Subpartitions with Tables".
- Several options provide partition maintenance and repair functionality analogous to that implemented for nonpartitioned tables by statements such as CHECK TABLE and REPAIR TABLE (which are also supported for partitioned tables; for more information, see Section 15.7.3, "Table Maintenance Statements"). These include ANALYZE PARTITION, CHECK PARTITION, OPTIMIZE PARTITION, REBUILD PARTITION, and REPAIR PARTITION. Each of these options takes a partition_names clause consisting of one or more names of partitions, separated by commas. The partitions must already exist in the target table. You can also use the ALL keyword in place of
partition_names, in which case the statement acts on all table partitions. For more information and examples, see Section 26.3.4, "Maintenance of Partitions".

InnoDB does not currently support per-partition optimization; ALTER TABLE ... OPTIMIZE PARTITION causes the entire table to rebuilt and analyzed, and an appropriate warning to be issued. (Bug \#11751825, Bug \#42822) To work around this problem, use ALTER TABLE ... REBUILD PARTITION and ALTER TABLE ... ANALYZE PARTITION instead.

The ANALYZE PARTITION, CHECK PARTITION, OPTIMIZE PARTITION, and REPAIR PARTITION options are not supported for tables which are not partitioned.
- REMOVE PARTITIONING enables you to remove a table's partitioning without otherwise affecting the table or its data. This option can be combined with other ALTER TABLE options such as those used to add, drop, or rename columns or indexes.
- Using the ENGINE option with ALTER TABLE changes the storage engine used by the table without affecting the partitioning. The target storage engine must provide its own partitioning handler. Only the InnoDB and NDB storage engines have native partitioning handlers.

It is possible for an ALTER TABLE statement to contain a PARTITION BY or REMOVE PARTITIONING clause in an addition to other alter specifications, but the PARTITION BY or REMOVE PARTITIONING clause must be specified last after any other specifications.

The ADD PARTITION, DROP PARTITION, COALESCE PARTITION, REORGANIZE PARTITION, ANALYZE PARTITION, CHECK PARTITION, and REPAIR PARTITION options cannot be combined with other alter specifications in a single ALTER TABLE, since the options just listed act on individual partitions. For more information, see Section 15.1.9.1, "ALTER TABLE Partition Operations".

Only a single instance of any one of the following options can be used in a given ALTER TABLE statement: PARTITION BY, ADD PARTITION, DROP PARTITION, TRUNCATE PARTITION, EXCHANGE PARTITION, REORGANIZE PARTITION, or COALESCE PARTITION, ANALYZE PARTITION, CHECK PARTITION, OPTIMIZE PARTITION, REBUILD PARTITION, REMOVE PARTITIONING.

For example, the following two statements are invalid:
```
ALTER TABLE t1 ANALYZE PARTITION p1, ANALYZE PARTITION p2;
ALTER TABLE t1 ANALYZE PARTITION p1, CHECK PARTITION p2;
```


In the first case, you can analyze partitions p1 and p2 of table t1 concurrently using a single statement with a single ANALYZE PARTITION option that lists both of the partitions to be analyzed, like this:
```
ALTER TABLE t1 ANALYZE PARTITION p1, p2;
```


In the second case, it is not possible to perform ANALYZE and CHECK operations on different partitions of the same table concurrently. Instead, you must issue two separate statements, like this:
```
ALTER TABLE t1 ANALYZE PARTITION p1;
ALTER TABLE t1 CHECK PARTITION p2;
```


REBUILD operations are currently unsupported for subpartitions. The REBUILD keyword is expressly disallowed with subpartitions, and causes ALTER TABLE to fail with an error if so used.

CHECK PARTITION and REPAIR PARTITION operations fail when the partition to be checked or repaired contains any duplicate key errors.

For more information about these statements, see Section 26.3.4, "Maintenance of Partitions".

\subsection*{15.1.9.2 ALTER TABLE and Generated Columns}

ALTER TABLE operations permitted for generated columns are ADD, MODIFY, and CHANGE.
- Generated columns can be added.
```
CREATE TABLE t1 (c1 INT);
ALTER TABLE t1 ADD COLUMN c2 INT GENERATED ALWAYS AS (c1 + 1) STORED;
```

- The data type and expression of generated columns can be modified.
```
CREATE TABLE t1 (c1 INT, c2 INT GENERATED ALWAYS AS (c1 + 1) STORED);
ALTER TABLE t1 MODIFY COLUMN c2 TINYINT GENERATED ALWAYS AS (c1 + 5) STORED;
```

- Generated columns can be renamed or dropped, if no other column refers to them.
```
CREATE TABLE t1 (c1 INT, c2 INT GENERATED ALWAYS AS (c1 + 1) STORED);
ALTER TABLE t1 CHANGE c2 c3 INT GENERATED ALWAYS AS (c1 + 1) STORED;
ALTER TABLE t1 DROP COLUMN c3;
```

- Virtual generated columns cannot be altered to stored generated columns, or vice versa. To work around this, drop the column, then add it with the new definition.
```
CREATE TABLE t1 (c1 INT, c2 INT GENERATED ALWAYS AS (c1 + 1) VIRTUAL);
ALTER TABLE t1 DROP COLUMN c2;
ALTER TABLE t1 ADD COLUMN c2 INT GENERATED ALWAYS AS (c1 + 1) STORED;
```

- Nongenerated columns can be altered to stored but not virtual generated columns.
```
CREATE TABLE t1 (c1 INT, c2 INT);
ALTER TABLE t1 MODIFY COLUMN c2 INT GENERATED ALWAYS AS (c1 + 1) STORED;
```

- Stored but not virtual generated columns can be altered to nongenerated columns. The stored generated values become the values of the nongenerated column.
```
CREATE TABLE t1 (c1 INT, c2 INT GENERATED ALWAYS AS (c1 + 1) STORED);
ALTER TABLE t1 MODIFY COLUMN c2 INT;
```

- ADD COLUMN is not an in-place operation for stored columns (done without using a temporary table) because the expression must be evaluated by the server. For stored columns, indexing changes are done in place, and expression changes are not done in place. Changes to column comments are done in place.
- For non-partitioned tables, ADD COLUMN and DROP COLUMN are in-place operations for virtual columns. However, adding or dropping a virtual column cannot be performed in place in combination with other ALTER TABLE operations.

For partitioned tables, ADD COLUMN and DROP COLUMN are not in-place operations for virtual columns.
- InnoDB supports secondary indexes on virtual generated columns. Adding or dropping a secondary index on a virtual generated column is an in-place operation. For more information, see Section 15.1.20.9, "Secondary Indexes and Generated Columns".
- When a VIRTUAL generated column is added to a table or modified, it is not ensured that data being calculated by the generated column expression is not out of range for the column. This can lead to inconsistent data being returned and unexpectedly failed statements. To permit control over whether validation occurs for such columns, ALTER TABLE supports WITHOUT VALIDATION and WITH VALIDATION clauses:
- With WITHOUT VALIDATION (the default if neither clause is specified), an in-place operation is performed (if possible), data integrity is not checked, and the statement finishes more quickly. However, later reads from the table might report warnings or errors for the column if values are out of range.
- With WITH VALIDATION, ALTER TABLE copies the table. If an out-of-range or any other error occurs, the statement fails. Because a table copy is performed, the statement takes longer.

WITHOUT VALIDATION and WITH VALIDATION are permitted only with ADD COLUMN, CHANGE COLUMN, and MODIFY COLUMN operations. Otherwise, an ER_WRONG_USAGE error occurs.
- If expression evaluation causes truncation or provides incorrect input to a function, the ALTER TABLE statement terminates with an error and the DDL operation is rejected.
- An ALTER TABLE statement that changes the default value of a column col_name may also change the value of a generated column expression that refers to the column using col_name, which may change the value of a generated column expression that refers to the column using DEFAULT(col_name). For this reason, ALTER TABLE operations that change the definition of a column cause a table rebuild if any generated column expression uses DEFAULT( ).

\subsection*{15.1.9.3 ALTER TABLE Examples}

Begin with a table t1 created as shown here:
CREATE TABLE t1 (a INTEGER, b CHAR(10));
To rename the table from t1 to t2:
ALTER TABLE t1 RENAME t2;
To change column a from INTEGER to TINYINT NOT NULL (leaving the name the same), and to change column b from CHAR(10) to CHAR(20) as well as renaming it from b to c:

ALTER TABLE t2 MODIFY a TINYINT NOT NULL, CHANGE b c CHAR(20);
To add a new TIMESTAMP column named d:
ALTER TABLE t2 ADD d TIMESTAMP;
To add an index on column d and a UNIQUE index on column a:
ALTER TABLE t2 ADD INDEX (d), ADD UNIQUE (a);
To remove column c:
ALTER TABLE t2 DROP COLUMN c;
To add a new AUTO_INCREMENT integer column named c:
ALTER TABLE t2 ADD c INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (c);

We indexed c (as a PRIMARY KEY) because AUTO_INCREMENT columns must be indexed, and we declare c as NOT NULL because primary key columns cannot be NULL.

For NDB tables, it is also possible to change the storage type used for a table or column. For example, consider an NDB table created as shown here:
mysql> CREATE TABLE t1 (c1 INT) TABLESPACE ts_1 ENGINE NDB;
Query OK, 0 rows affected $(1.27 \mathrm{sec})$
To convert this table to disk-based storage, you can use the following ALTER TABLE statement:
```
mysql> ALTER TABLE t1 TABLESPACE ts_1 STORAGE DISK;
Query OK, 0 rows affected (2.99 sec)
Records: 0 Duplicates: 0 Warnings: 0
mysql> SHOW CREATE TABLE t1\G
************************** 1. row ******************************
        Table: t1
Create Table: CREATE TABLE ˋt1ˋ (
    ˋc1ˋ int(11) DEFAULT NULL
) /*!50100 TABLESPACE ts_1 STORAGE DISK */
ENGINE=ndbcluster DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
1 row in set (0.01 sec)
```


It is not necessary that the tablespace was referenced when the table was originally created; however, the tablespace must be referenced by the ALTER TABLE:
```
mysql> CREATE TABLE t2 (c1 INT) ts_1 ENGINE NDB;
```

```
Query OK, 0 rows affected (1.00 sec)
mysql> ALTER TABLE t2 STORAGE DISK;
ERROR 1005 (HY000): Can't create table 'c.#sql-1750_3' (errno: 140)
mysql> ALTER TABLE t2 TABLESPACE ts_1 STORAGE DISK;
Query OK, 0 rows affected (3.42 sec)
Records: 0 Duplicates: 0 Warnings: 0
mysql> SHOW CREATE TABLE t2\G
************************** 1. row ******************************
        Table: t1
Create Table: CREATE TABLE ˋt2ˋ (
    ˋc1ˋ int(11) DEFAULT NULL
) /*!50100 TABLESPACE ts_1 STORAGE DISK */
ENGINE=ndbcluster DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
1 row in set (0.01 sec)
```


To change the storage type of an individual column, you can use ALTER TABLE ... MODIFY [COLUMN]. For example, suppose you create an NDB Cluster Disk Data table with two columns, using this CREATE TABLE statement:
```
mysql> CREATE TABLE t3 (c1 INT, c2 INT)
    -> TABLESPACE ts_1 STORAGE DISK ENGINE NDB;
Query OK, 0 rows affected (1.34 sec)
```


To change column c2 from disk-based to in-memory storage, include a STORAGE MEMORY clause in the column definition used by the ALTER TABLE statement, as shown here:
```
mysql> ALTER TABLE t3 MODIFY c2 INT STORAGE MEMORY;
Query OK, 0 rows affected (3.14 sec)
Records: 0 Duplicates: 0 Warnings: 0
```


You can make an in-memory column into a disk-based column by using STORAGE DISK in a similar fashion.

Column c1 uses disk-based storage, since this is the default for the table (determined by the tablelevel STORAGE DISK clause in the CREATE TABLE statement). However, column c2 uses in-memory storage, as can be seen here in the output of SHOW CREATE TABLE:
```
mysql> SHOW CREATE TABLE t3\G
************************** 1. row ****************************************
        Table: t3
Create Table: CREATE TABLE ˋt3ˋ (
    ˋc1ˋ int(11) DEFAULT NULL,
    ˋc2ˋ int(11) /*!50120 STORAGE MEMORY */ DEFAULT NULL
) /*!50100 TABLESPACE ts_1 STORAGE DISK */ ENGINE=ndbcluster DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_09
1 row in set (0.02 sec)
```


When you add an AUTO_INCREMENT column, column values are filled in with sequence numbers automatically. For MyISAM tables, you can set the first sequence number by executing SET INSERT_ID=value before ALTER TABLE or by using the AUTO_INCREMENT=value table option.

With MyISAM tables, if you do not change the AUTO_INCREMENT column, the sequence number is not affected. If you drop an AUTO_INCREMENT column and then add another AUTO_INCREMENT column, the numbers are resequenced beginning with 1 .

When replication is used, adding an AUTO_INCREMENT column to a table might not produce the same ordering of the rows on the replica and the source. This occurs because the order in which the rows are numbered depends on the specific storage engine used for the table and the order in which the rows were inserted. If it is important to have the same order on the source and replica, the rows must be ordered before assigning an AUTO_INCREMENT number. Assuming that you want to add an AUTO_INCREMENT column to the table t1, the following statements produce a new table t2 identical to t1 but with an AUTO_INCREMENT column:
```
CREATE TABLE t2 (id INT AUTO_INCREMENT PRIMARY KEY)
SELECT * FROM t1 ORDER BY col1, col2;
```


This assumes that the table t1 has columns col1 and col2.

This set of statements also produces a new table t2 identical to t1, with the addition of an AUTO_INCREMENT column:
```
CREATE TABLE t2 LIKE t1;
ALTER TABLE t2 ADD id INT AUTO_INCREMENT PRIMARY KEY;
INSERT INTO t2 SELECT * FROM t1 ORDER BY col1, col2;
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2512.jpg?height=118&width=104&top_left_y=497&top_left_x=301)

\section*{Important}

To guarantee the same ordering on both source and replica, all columns of t1 must be referenced in the ORDER BY clause.

Regardless of the method used to create and populate the copy having the AUTO_INCREMENT column, the final step is to drop the original table and then rename the copy:
```
DROP TABLE t1;
ALTER TABLE t2 RENAME t1;
```


\subsection*{15.1.10 ALTER TABLESPACE Statement}
```
ALTER [UNDO] TABLESPACE tablespace_name
    NDB only:
        {ADD | DROP} DATAFILE 'file_name'
        [INITIAL_SIZE [=] size]
        [WAIT]
    InnoDB and NDB:
        [RENAME TO tablespace_name]
    InnoDB only:
        [AUTOEXTEND_SIZE [=] 'value']
        [SET {ACTIVE | INACTIVE}]
        [ENCRYPTION [=] {'Y' | 'N'}]
    InnoDB and NDB:
        [ENGINE [=] engine_name]
    Reserved for future use:
        [ENGINE_ATTRIBUTE [=] 'string']
```


This statement is used with NDB and InnoDB tablespaces. It can be used to add a new data file to, or to drop a data file from an NDB tablespace. It can also be used to rename an NDB Cluster Disk Data tablespace, rename an InnoDB general tablespace, encrypt an InnoDB general tablespace, or mark an InnoDB undo tablespace as active or inactive.

The UNDO keyword is used with the SET \{ACTIVE | INACTIVE\} clause to mark an InnoDB undo tablespace as active or inactive. For more information, see Section 17.6.3.4, "Undo Tablespaces".

The ADD DATAFILE variant enables you to specify an initial size for an NDB Disk Data tablespace using an INITIAL_SIZE clause, where size is measured in bytes; the default value is 134217728 ( 128 MB ). You may optionally follow size with a one-letter abbreviation for an order of magnitude, similar to those used in my.cnf. Generally, this is one of the letters M (megabytes) or G (gigabytes).

On 32-bit systems, the maximum supported value for INITIAL_SIZE is 4294967296 (4 GB). (Bug \#29186)

INITIAL_SIZE is rounded, explicitly, as for CREATE TABLESPACE.
Once a data file has been created, its size cannot be changed; however, you can add more data files to an NDB tablespace using additional ALTER TABLESPACE ... ADD DATAFILE statements.

When ALTER TABLESPACE ... ADD DATAFILE is used with ENGINE = NDB, a data file is created on each Cluster data node, but only one row is generated in the Information Schema FILES table. See the description of this table, as well as Section 25.6.11.1, "NDB Cluster Disk Data Objects", for more information. ADD DATAFILE is not supported with InnoDB tablespaces.

Using DROP DATAFILE with ALTER TABLESPACE drops the data file 'file_name' from an NDB tablespace. You cannot drop a data file from a tablespace which is in use by any table; in other words, the data file must be empty (no extents used). See Section 25.6.11.1, "NDB Cluster Disk Data

Objects". In addition, any data file to be dropped must previously have been added to the tablespace with CREATE TABLESPACE or ALTER TABLESPACE. DROP DATAFILE is not supported with InnoDB tablespaces.

WAIT is parsed but otherwise ignored. It is intended for future expansion.
The ENGINE clause, which specifies the storage engine used by the tablespace, is deprecated, since the tablespace storage engine is known by the data dictionary, making the ENGINE clause obsolete. In MySQL 8.4, it is supported in the following two cases only:
-
```
ALTER TABLESPACE tablespace_name ADD DATAFILE 'file_name'
    ENGINE={NDB| NDBCLUSTER}
```

- ALTER UNDO TABLESPACE tablespace_name SET \{ACTIVE|INACTIVE\}

ENGINE=INNODB
You should expect the eventual removal of ENGINE from these statements as well, in a future version of MySQL.

RENAME TO operations are implicitly performed in autocommit mode, regardless of the value of autocommit.

A RENAME TO operation cannot be performed while LOCK TABLES or FLUSH TABLES WITH READ LOCK is in effect for tables that reside in the tablespace.

Exclusive metadata locks are taken on tables that reside in a general tablespace while the tablespace is renamed, which prevents concurrent DDL. Concurrent DML is supported.

The CREATE TABLESPACE privilege is required to rename an InnoDB general tablespace.
The AUTOEXTEND_SIZE option defines the amount by which InnoDB extends the size of a tablespace when it becomes full. The setting must be a multiple of 4 MB . The default setting is 0 , which causes the tablespace to be extended according to the implicit default behavior. For more information, see Section 17.6.3.9, "Tablespace AUTOEXTEND_SIZE Configuration".

The ENCRYPTION clause enables or disables page-level data encryption for an InnoDB general tablespace or the mysql system tablespace.

A keyring plugin must be installed and configured before encryption can be enabled.
If the table_encryption_privilege_check variable is enabled, the TABLE_ENCRYPTION_ADMIN privilege is required to alter a general tablespace with an ENCRYPTION clause setting that differs from the default_table_encryption setting.

Enabling encryption for a general tablespace fails if any table in the tablespace belongs to a schema defined with DEFAULT ENCRYPTION='N'. Similarly, disabling encryption fails if any table in the general tablespace belongs to a schema defined with DEFAULT ENCRYPTION=' Y'.

If an ALTER TABLESPACE statement executed on a general tablespace does not include an ENCRYPTION clause, the tablespace retains its current encryption status, regardless of the default_table_encryption setting.

When a general tablespace or the mysql system tablespace is encrypted, all tables residing in the tablespace are encrypted. Likewise, a table created in an encrypted tablespace is encrypted.

The INPLACE algorithm is used when altering the ENCRYPTION attribute of a general tablespace or the mysql system tablespace. The INPLACE algorithm permits concurrent DML on tables that reside in the tablespace. Concurrent DDL is blocked.

For more information, see Section 17.13, "InnoDB Data-at-Rest Encryption".
The ENGINE_ATTRIBUTE option is used to specify tablespace attributes for primary storage engines. The option is reserved for future use.

The value assigned to this option is a string literal containing a valid JSON document or an empty string ("). Invalid JSON is rejected.

ALTER TABLESPACE ts1 ENGINE_ATTRIBUTE='\{"key":"value"\}';
ENGINE_ATTRIBUTE values can be repeated without error. In this case, the last specified value is used.

ENGINE_ATTRIBUTE values are not checked by the server, nor are they cleared when the table's storage engine is changed.

It is not permitted to alter an individual element of a JSON attribute value. You can only add or replace an attribute.

\subsection*{15.1.11 ALTER VIEW Statement}
```
ALTER
    [ALGORITHM = {UNDEFINED | MERGE | TEMPTABLE}]
    [DEFINER = user]
    [SQL SECURITY { DEFINER | INVOKER }]
    VIEW view_name [(column_list)]
    AS select_statement
    [WITH [CASCADED | LOCAL] CHECK OPTION]
```


This statement changes the definition of a view, which must exist. The syntax is similar to that for CREATE VIEW see Section 15.1.23, "CREATE VIEW Statement"). This statement requires the CREATE VIEW and DROP privileges for the view, and some privilege for each column referred to in the SELECT statement. ALTER VIEW is permitted only to the definer or users with the SET_ANY_DEFINER or ALLOW_NONEXISTENT_DEFINER privilege.

\subsection*{15.1.12 CREATE DATABASE Statement}
```
CREATE {DATABASE | SCHEMA} [IF NOT EXISTS] db_name
        [create_option] ...
create_option: [DEFAULT] {
        CHARACTER SET [=] charset_name
    | COLLATE [=] collation_name
    | ENCRYPTION [=] {'Y' | 'N'}
}
```


CREATE DATABASE creates a database with the given name. To use this statement, you need the CREATE privilege for the database. CREATE SCHEMA is a synonym for CREATE DATABASE.

An error occurs if the database exists and you did not specify IF NOT EXISTS.
CREATE DATABASE is not permitted within a session that has an active LOCK TABLES statement.
Each create_option specifies a database characteristic. Database characteristics are stored in the data dictionary.
- The CHARACTER SET option specifies the default database character set. The COLLATE option specifies the default database collation. For information about character set and collation names, see Chapter 12, Character Sets, Collations, Unicode.

To see the available character sets and collations, use the the SHOW CHARACTER SET and SHOW COLLATION statements, respectively. See Section 15.7.7.4, "SHOW CHARACTER SET Statement", and Section 15.7.7.5, "SHOW COLLATION Statement".
- The ENCRYPTION option defines the default database encryption, which is inherited by tables created in the database. The permitted values are ' Y ' (encryption enabled) and ' $N$ ' (encryption disabled). If the ENCRYPTION option is not specified, the value of the default_table_encryption system variable defines the default database encryption. If the table_encryption_privilege_check system variable is enabled, the

TABLE_ENCRYPTION_ADMIN privilege is required to specify a default encryption setting that differs from the default_table_encryption setting. For more information, see Defining an Encryption Default for Schemas and General Tablespaces.

A database in MySQL is implemented as a directory containing files that correspond to tables in the database. Because there are no tables in a database when it is initially created, the CREATE DATABASE statement creates only a directory under the MySQL data directory. Rules for permissible database names are given in Section 11.2, "Schema Object Names". If a database name contains special characters, the name for the database directory contains encoded versions of those characters as described in Section 11.2.4, "Mapping of Identifiers to File Names".

Creating a database directory by manually creating a directory under the data directory (for example, with mkdir) is unsupported in MySQL 8.4.

When you create a database, let the server manage the directory and the files in it. Manipulating database directories and files directly can cause inconsistencies and unexpected results.

MySQL has no limit on the number of databases. The underlying file system may have a limit on the number of directories.

You can also use the mysqladmin program to create databases. See Section 6.5.2, "mysqladmin - A MySQL Server Administration Program".

\subsection*{15.1.13 CREATE EVENT Statement}
```
CREATE
        [DEFINER = user]
        EVENT
        [IF NOT EXISTS]
        event_name
        ON SCHEDULE schedule
        [ON COMPLETION [NOT] PRESERVE]
        [ENABLE | DISABLE | DISABLE ON {REPLICA | SLAVE}]
        [COMMENT 'string']
        DO event_body;
schedule: {
        AT timestamp [+ INTERVAL interval] ...
    | EVERY interval
        [STARTS timestamp [+ INTERVAL interval] ...]
        [ENDS timestamp [+ INTERVAL interval] ...]
}
interval:
        quantity {YEAR | QUARTER | MONTH | DAY | HOUR | MINUTE |
            WEEK | SECOND | YEAR_MONTH | DAY_HOUR | DAY_MINUTE |
            DAY_SECOND | HOUR_MINUTE | HOUR_SECOND | MINUTE_SECOND}
```


This statement creates and schedules a new event. The event does not run unless the Event Scheduler is enabled. For information about checking Event Scheduler status and enabling it if necessary, see Section 27.4.2, "Event Scheduler Configuration".

CREATE EVENT requires the EVENT privilege for the schema in which the event is to be created. If the DEFINER clause is present, the privileges required depend on the user value, as discussed in Section 27.6, "Stored Object Access Control".

The minimum requirements for a valid CREATE EVENT statement are as follows:
- The keywords CREATE EVENT plus an event name, which uniquely identifies the event in a database schema.
- An ON SCHEDULE clause, which determines when and how often the event executes.
- A DO clause, which contains the SQL statement to be executed by an event.

This is an example of a minimal CREATE EVENT statement:
```
CREATE EVENT myevent
    ON SCHEDULE AT CURRENT_TIMESTAMP + INTERVAL 1 HOUR
    DO
        UPDATE myschema.mytable SET mycol = mycol + 1;
```


The previous statement creates an event named myevent. This event executes once-one hour following its creation-by running an SQL statement that increments the value of the myschema. mytable table's mycol column by 1 .

The event_name must be a valid MySQL identifier with a maximum length of 64 characters. Event names are not case-sensitive, so you cannot have two events named myevent and MyEvent in the same schema. In general, the rules governing event names are the same as those for names of stored routines. See Section 11.2, "Schema Object Names".

An event is associated with a schema. If no schema is indicated as part of event_name, the default (current) schema is assumed. To create an event in a specific schema, qualify the event name with a schema using schema_name.event_name syntax.

The DEFINER clause specifies the MySQL account to be used when checking access privileges at event execution time. If the DEFINER clause is present, the user value should be a MySQL account specified as 'user_name'@'host_name', CURRENT_USER, or CURRENT_USER( ). The permitted user values depend on the privileges you hold, as discussed in Section 27.6, "Stored Object Access Control". Also see that section for additional information about event security.

If the DEFINER clause is omitted, the default definer is the user who executes the CREATE EVENT statement. This is the same as specifying DEFINER = CURRENT_USER explicitly.

Within an event body, the CURRENT_USER function returns the account used to check privileges at event execution time, which is the DEFINER user. For information about user auditing within events, see Section 8.2.23, "SQL-Based Account Activity Auditing".

IF NOT EXISTS has the same meaning for CREATE EVENT as for CREATE TABLE: If an event named event_name already exists in the same schema, no action is taken, and no error results. (However, a warning is generated in such cases.)

The ON SCHEDULE clause determines when, how often, and for how long the event_body defined for the event repeats. This clause takes one of two forms:
- AT timestamp is used for a one-time event. It specifies that the event executes one time only at the date and time given by timestamp, which must include both the date and time, or must be an expression that resolves to a datetime value. You may use a value of either the DATETIME or TIMESTAMP type for this purpose. If the date is in the past, a warning occurs, as shown here:
```
mysql> SELECT NOW();
+-----------------------+
| NOW() |
+-----------------------+
| 2006-02-10 23:59:01 |
+----------------------+
1 row in set (0.04 sec)
mysql> CREATE EVENT e_totals
        -> ON SCHEDULE AT '2006-02-10 23:59:00'
        -> DO INSERT INTO test.totals VALUES (NOW());
Query OK, 0 rows affected, 1 warning (0.00 sec)
mysql> SHOW WARNINGS\G
************************** 1. row *****************************************
    Level: Note
        Code: 1588
Message: Event execution time is in the past and ON COMPLETION NOT
            PRESERVE is set. The event was dropped immediately after
            creation.
```


CREATE EVENT statements which are themselves invalid-for whatever reason-fail with an error.

You may use CURRENT_TIMESTAMP to specify the current date and time. In such a case, the event acts as soon as it is created.

To create an event which occurs at some point in the future relative to the current date and timesuch as that expressed by the phrase "three weeks from now"-you can use the optional clause + INTERVAL interval. The interval portion consists of two parts, a quantity and a unit of time, and follows the syntax rules described in Temporal Intervals, except that you cannot use any units keywords that involving microseconds when defining an event. With some interval types, complex time units may be used. For example, "two minutes and ten seconds" can be expressed as + INTERVAL '2:10' MINUTE_SECOND.

You can also combine intervals. For example, AT CURRENT_TIMESTAMP + INTERVAL 3 WEEK + INTERVAL 2 DAY is equivalent to "three weeks and two days from now". Each portion of such a clause must begin with + INTERVAL.
- To repeat actions at a regular interval, use an EVERY clause. The EVERY keyword is followed by an interval as described in the previous discussion of the AT keyword. (+ INTERVAL is not used with EVERY.) For example, EVERY 6 WEEK means "every six weeks".

Although + INTERVAL clauses are not permitted in an EVERY clause, you can use the same complex time units permitted in a + INTERVAL.

An EVERY clause may contain an optional STARTS clause. STARTS is followed by a timestamp value that indicates when the action should begin repeating, and may also use + INTERVAL interval to specify an amount of time "from now". For example, EVERY 3 MONTH STARTS CURRENT_TIMESTAMP + INTERVAL 1 WEEK means "every three months, beginning one week from now". Similarly, you can express "every two weeks, beginning six hours and fifteen minutes from now" as EVERY 2 WEEK STARTS CURRENT_TIMESTAMP + INTERVAL '6:15' HOUR_MINUTE. Not specifying STARTS is the same as using STARTS CURRENT_TIMESTAMP-that is, the action specified for the event begins repeating immediately upon creation of the event.

An EVERY clause may contain an optional ENDS clause. The ENDS keyword is followed by a timestamp value that tells MySQL when the event should stop repeating. You may also use + INTERVAL interval with ENDS; for instance, EVERY 12 HOUR STARTS CURRENT_TIMESTAMP + INTERVAL 30 MINUTE ENDS CURRENT_TIMESTAMP + INTERVAL 4 WEEK is equivalent to "every twelve hours, beginning thirty minutes from now, and ending four weeks from now". Not using ENDS means that the event continues executing indefinitely.

ENDS supports the same syntax for complex time units as STARTS does.
You may use STARTS, ENDS, both, or neither in an EVERY clause.
If a repeating event does not terminate within its scheduling interval, the result may be multiple instances of the event executing simultaneously. If this is undesirable, you should institute a mechanism to prevent simultaneous instances. For example, you could use the GET_LOCK( ) function, or row or table locking.

The ON SCHEDULE clause may use expressions involving built-in MySQL functions and user variables to obtain any of the timestamp or interval values which it contains. You may not use stored functions or loadable functions in such expressions, nor may you use any table references; however, you may use SELECT FROM DUAL. This is true for both CREATE EVENT and ALTER EVENT statements. References to stored functions, loadable functions, and tables in such cases are specifically not permitted, and fail with an error (see Bug \#22830).

Times in the ON SCHEDULE clause are interpreted using the current session time_zone value. This becomes the event time zone; that is, the time zone that is used for event scheduling and is in effect within the event as it executes. These times are converted to UTC and stored along with the event time zone internally. This enables event execution to proceed as defined regardless of any subsequent changes to the server time zone or daylight saving time effects. For additional information about
representation of event times, see Section 27.4.4, "Event Metadata". See also Section 15.7.7.19, "SHOW EVENTS Statement", and Section 28.3.14, "The INFORMATION_SCHEMA EVENTS Table".

Normally, once an event has expired, it is immediately dropped. You can override this behavior by specifying ON COMPLETION PRESERVE. Using ON COMPLETION NOT PRESERVE merely makes the default nonpersistent behavior explicit.

You can create an event but prevent it from being active using the DISABLE keyword. Alternatively, you can use ENABLE to make explicit the default status, which is active. This is most useful in conjunction with ALTER EVENT (see Section 15.1.3, "ALTER EVENT Statement").

A third value may also appear in place of ENABLE or DISABLE; DISABLE ON REPLICA is set for the status of an event on a replica to indicate that the event was created on the replication source server and replicated to the replica, but is not executed on the replica. See Section 19.5.1.16, "Replication of Invoked Features".

DISABLE ON REPLICA replaces DISABLE ON SLAVE, which is deprecated, and thus subject to removal in a future version of MySQL.

You may supply a comment for an event using a COMMENT clause. comment may be any string of up to 64 characters that you wish to use for describing the event. The comment text, being a string literal, must be surrounded by quotation marks.

The DO clause specifies an action carried by the event, and consists of an SQL statement. Nearly any valid MySQL statement that can be used in a stored routine can also be used as the action statement for a scheduled event. (See Section 27.8, "Restrictions on Stored Programs".) For example, the following event e_hourly deletes all rows from the sessions table once per hour, where this table is part of the site_activity schema:
```
CREATE EVENT e_hourly
    ON SCHEDULE
        EVERY 1 HOUR
    COMMENT 'Clears out sessions table each hour.'
    DO
        DELETE FROM site_activity.sessions;
```


MySQL stores the sql_mode system variable setting in effect when an event is created or altered, and always executes the event with this setting in force, regardless of the current server SQL mode when the event begins executing.

A CREATE EVENT statement that contains an ALTER EVENT statement in its DO clause appears to succeed; however, when the server attempts to execute the resulting scheduled event, the execution fails with an error.

\section*{Note}

Statements such as SELECT or SHOW that merely return a result set have no effect when used in an event; the output from these is not sent to the MySQL Monitor, nor is it stored anywhere. However, you can use statements such as SELECT ... INTO and INSERT INTO ... SELECT that store a result. (See the next example in this section for an instance of the latter.)

The schema to which an event belongs is the default schema for table references in the DO clause. Any references to tables in other schemas must be qualified with the proper schema name.

As with stored routines, you can use compound-statement syntax in the DO clause by using the BEGIN and END keywords, as shown here:
```
delimiter |
CREATE EVENT e_daily
    ON SCHEDULE
        EVERY 1 DAY
    COMMENT 'Saves total number of sessions then clears the table each day'
    DO
```

```
    BEGIN
        INSERT INTO site_activity.totals (time, total)
            SELECT CURRENT_TIMESTAMP, COUNT(*)
                FROM site_activity.sessions;
        DELETE FROM site_activity.sessions;
    END |
delimiter ;
```


This example uses the delimiter command to change the statement delimiter. See Section 27.1, "Defining Stored Programs".

More complex compound statements, such as those used in stored routines, are possible in an event. This example uses local variables, an error handler, and a flow control construct:
```
delimiter |
CREATE EVENT e
    ON SCHEDULE
        EVERY 5 SECOND
    DO
        BEGIN
            DECLARE v INTEGER;
            DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
            SET v = 0;
            WHILE v < 5 DO
                INSERT INTO t1 VALUES (0);
                UPDATE t2 SET s1 = s1 + 1;
                SET v = v + 1;
            END WHILE;
    END |
delimiter ;
```


There is no way to pass parameters directly to or from events; however, it is possible to invoke a stored routine with parameters within an event:
```
CREATE EVENT e_call_myproc
    ON SCHEDULE
        AT CURRENT_TIMESTAMP + INTERVAL 1 DAY
    DO CALL myproc(5, 27);
```


If an event's definer has privileges sufficient to set global system variables (see Section 7.1.9.1, "System Variable Privileges"), the event can read and write global variables. As granting such privileges entails a potential for abuse, extreme care must be taken in doing so.

Generally, any statements that are valid in stored routines may be used for action statements executed by events. For more information about statements permissible within stored routines, see Section 27.2.1, "Stored Routine Syntax". It is not possible to create an event as part of a stored routine or to create an event by another event.

\subsection*{15.1.14 CREATE FUNCTION Statement}

The CREATE FUNCTION statement is used to create stored functions and loadable functions:
- For information about creating stored functions, see Section 15.1.17, "CREATE PROCEDURE and CREATE FUNCTION Statements".
- For information about creating loadable functions, see Section 15.7.4.1, "CREATE FUNCTION Statement for Loadable Functions".

\subsection*{15.1.15 CREATE INDEX Statement}
```
CREATE [UNIQUE | FULLTEXT | SPATIAL] INDEX index_name
    [index_type]
    ON tbl_name (key_part,...)
```

```
        [index_option]
        [algorithm_option | lock_option] ...
key_part: {col_name [(length)] | (expr)} [ASC | DESC]
index_option: {
        KEY_BLOCK_SIZE [=] value
    | index_type
    | WITH PARSER parser_name
    | COMMENT 'string'
    | {VISIBLE | INVISIBLE}
    | ENGINE_ATTRIBUTE [=] 'string'
    | SECONDARY_ENGINE_ATTRIBUTE [=] 'string'
}
index_type:
        USING {BTREE | HASH}
algorithm_option:
        ALGORITHM [=] {DEFAULT | INPLACE | COPY}
lock_option:
        LOCK [=] {DEFAULT | NONE | SHARED | EXCLUSIVE}
```


Normally, you create all indexes on a table at the time the table itself is created with CREATE TABLE. See Section 15.1.20, "CREATE TABLE Statement". This guideline is especially important for InnodB tables, where the primary key determines the physical layout of rows in the data file. CREATE INDEX enables you to add indexes to existing tables.

CREATE INDEX is mapped to an ALTER TABLE statement to create indexes. See Section 15.1.9, "ALTER TABLE Statement". CREATE INDEX cannot be used to create a PRIMARY KEY; use ALTER TABLE instead. For more information about indexes, see Section 10.3.1, "How MySQL Uses Indexes".

InnoDB supports secondary indexes on virtual columns. For more information, see Section 15.1.20.9, "Secondary Indexes and Generated Columns".

When the innodb_stats_persistent setting is enabled, run the ANALYZE TABLE statement for an InnoDB table after creating an index on that table.

The expr for a key_part specification can also take the form (CAST json_expression AS type ARRAY) to create a multi-valued index on a JSON column. See Multi-Valued Indexes.

An index specification of the form ( key_part1, key_part2, . . . ) creates an index with multiple key parts. Index key values are formed by concatenating the values of the given key parts. For example (col1, col2, col3) specifies a multiple-column index with index keys consisting of values from col1, col2, and col3.

A key_part specification can end with ASC or DESC to specify whether index values are stored in ascending or descending order. The default is ascending if no order specifier is given.

ASC and DESC are not supported for HASH indexes, multi-valued indexes or SPATIAL indexes.
The following sections describe different aspects of the CREATE INDEX statement:
- Column Prefix Key Parts
- Functional Key Parts
- Unique Indexes
- Full-Text Indexes
- Multi-Valued Indexes
- Spatial Indexes
- Index Options
- Table Copying and Locking Options

\section*{Column Prefix Key Parts}

For string columns, indexes can be created that use only the leading part of column values, using col_name(length) syntax to specify an index prefix length:
- Prefixes can be specified for CHAR, VARCHAR, BINARY, and VARBINARY key parts.
- Prefixes must be specified for BLOB and TEXT key parts. Additionally, BLOB and TEXT columns can be indexed only for InnoDB, MyISAM, and BLACKHOLE tables.
- Prefix limits are measured in bytes. However, prefix lengths for index specifications in CREATE TABLE, ALTER TABLE, and CREATE INDEX statements are interpreted as number of characters for nonbinary string types (CHAR, VARCHAR, TEXT) and number of bytes for binary string types (BINARY, VARBINARY, BLOB). Take this into account when specifying a prefix length for a nonbinary string column that uses a multibyte character set.

Prefix support and lengths of prefixes (where supported) are storage engine dependent. For example, a prefix can be up to 767 bytes long for InnoDB tables that use the REDUNDANT or COMPACT row format. The prefix length limit is 3072 bytes for InnoDB tables that use the DYNAMIC or COMPRESSED row format. For MyISAM tables, the prefix length limit is 1000 bytes. The NDB storage engine does not support prefixes (see Section 25.2.7.6, "Unsupported or Missing Features in NDB Cluster").

If a specified index prefix exceeds the maximum column data type size, CREATE INDEX handles the index as follows:
- For a nonunique index, either an error occurs (if strict SQL mode is enabled), or the index length is reduced to lie within the maximum column data type size and a warning is produced (if strict SQL mode is not enabled).
- For a unique index, an error occurs regardless of SQL mode because reducing the index length might enable insertion of nonunique entries that do not meet the specified uniqueness requirement.

The statement shown here creates an index using the first 10 characters of the name column (assuming that name has a nonbinary string type):

CREATE INDEX part_of_name ON customer (name(10));
If names in the column usually differ in the first 10 characters, lookups performed using this index should not be much slower than using an index created from the entire name column. Also, using column prefixes for indexes can make the index file much smaller, which could save a lot of disk space and might also speed up INSERT operations.

\section*{Functional Key Parts}

A "normal" index indexes column values or prefixes of column values. For example, in the following table, the index entry for a given t1 row includes the full col1 value and a prefix of the col2 value consisting of its first 10 characters:
```
CREATE TABLE t1 (
    col1 VARCHAR(10),
    col2 VARCHAR(20),
    INDEX (col1, col2(10))
);
```


Functional key parts that index expression values canalso be used in place of column or column prefix values. Use of functional key parts enables indexing of values not stored directly in the table. Examples:
```
CREATE TABLE t1 (col1 INT, col2 INT, INDEX func_index ((ABS(col1))));
CREATE INDEX idx1 ON t1 ((col1 + col2));
CREATE INDEX idx2 ON t1 ((col1 + col2), (col1 - col2), col1);
ALTER TABLE t1 ADD INDEX ((col1 * 40) DESC);
```


An index with multiple key parts can mix nonfunctional and functional key parts.
ASC and DESC are supported for functional key parts.
Functional key parts must adhere to the following rules. An error occurs if a key part definition contains disallowed constructs.
- In index definitions, enclose expressions within parentheses to distinguish them from columns or column prefixes. For example, this is permitted; the expressions are enclosed within parentheses:
```
INDEX ((col1 + col2), (col3 - col4))
```


This produces an error; the expressions are not enclosed within parentheses:
```
INDEX (col1 + col2, col3 - col4)
```

- A functional key part cannot consist solely of a column name. For example, this is not permitted:
```
INDEX ((col1), (col2))
```


Instead, write the key parts as nonfunctional key parts, without parentheses:
```
INDEX (col1, col2)
```

- A functional key part expression cannot refer to column prefixes. For a workaround, see the discussion of SUBSTRING ( ) and CAST ( ) later in this section.
- Functional key parts are not permitted in foreign key specifications.

For CREATE TABLE ... LIKE, the destination table preserves functional key parts from the original table.

Functional indexes are implemented as hidden virtual generated columns, which has these implications:
- Each functional key part counts against the limit on total number of table columns; see Section 10.4.7, "Limits on Table Column Count and Row Size".
- Functional key parts inherit all restrictions that apply to generated columns. Examples:
- Only functions permitted for generated columns are permitted for functional key parts.
- Subqueries, parameters, variables, stored functions, and loadable functions are not permitted.

For more information about applicable restrictions, see Section 15.1.20.8, "CREATE TABLE and Generated Columns", and Section 15.1.9.2, "ALTER TABLE and Generated Columns".
- The virtual generated column itself requires no storage. The index itself takes up storage space as any other index.

UNIQUE is supported for indexes that include functional key parts. However, primary keys cannot include functional key parts. A primary key requires the generated column to be stored, but functional key parts are implemented as virtual generated columns, not stored generated columns.

SPATIAL and FULLTEXT indexes cannot have functional key parts.
If a table contains no primary key, InnoDB automatically promotes the first UNIQUE NOT NULL index to the primary key. This is not supported for UNIQUE NOT NULL indexes that have functional key parts.

Nonfunctional indexes raise a warning if there are duplicate indexes. Indexes that contain functional key parts do not have this feature.

To remove a column that is referenced by a functional key part, the index must be removed first. Otherwise, an error occurs.

Although nonfunctional key parts support a prefix length specification, this is not possible for functional key parts. The solution is to use SUBSTRING() (or CAST( ), as described later in this section). For a functional key part containing the SUBSTRING( ) function to be used in a query, the WHERE clause must contain SUBSTRING( ) with the same arguments. In the following example, only the second SELECT is able to use the index because that is the only query in which the arguments to SUBSTRING() match the index specification:
```
CREATE TABLE tbl (
    col1 LONGTEXT,
    INDEX idx1 ((SUBSTRING(col1, 1, 10)))
);
SELECT * FROM tbl WHERE SUBSTRING(col1, 1, 9) = '123456789';
SELECT * FROM tbl WHERE SUBSTRING(col1, 1, 10) = '1234567890';
```


Functional key parts enable indexing of values that cannot be indexed otherwise, such as JSON values. However, this must be done correctly to achieve the desired effect. For example, this syntax does not work:
```
CREATE TABLE employees (
    data JSON,
    INDEX ((data->>'$.name'))
);
```


The syntax fails because:
- The ->> operator translates into JSON_UNQUOTE(JSON_EXTRACT(...)).
- JSON_UNQUOTE( ) returns a value with a data type of LONGTEXT, and the hidden generated column thus is assigned the same data type.
- MySQL cannot index LONGTEXT columns specified without a prefix length on the key part, and prefix lengths are not permitted in functional key parts.

To index the JSON column, you could try using the CAST( ) function as follows:
```
CREATE TABLE employees (
    data JSON,
    INDEX ((CAST(data->>'$.name' AS CHAR(30))))
);
```


The hidden generated column is assigned the VARCHAR(30) data type, which can be indexed. But this approach produces a new issue when trying to use the index:
- CAST( ) returns a string with the collation utf8mb4_0900_ai_ci (the server default collation).
- JSON_UNQUOTE( ) returns a string with the collation utf8mb4_bin (hard coded).

As a result, there is a collation mismatch between the indexed expression in the preceding table definition and the WHERE clause expression in the following query:
```
SELECT * FROM employees WHERE data->>'$.name' = 'James';
```


The index is not used because the expressions in the query and the index differ. To support this kind of scenario for functional key parts, the optimizer automatically strips CAST( ) when looking for an index to use, but only if the collation of the indexed expression matches that of the query expression. For an index with a functional key part to be used, either of the following two solutions work (although they differ somewhat in effect):
- Solution 1. Assign the indexed expression the same collation as JSON_UNQUOTE( ):
```
CREATE TABLE employees (
    data JSON,
    INDEX idx ((CAST(data->>"$.name" AS CHAR(30)) COLLATE utf8mb4_bin))
);
INSERT INTO employees VALUES
    ('{ "name": "james", "salary": 9000 }'),
    ('{ "name": "James", "salary": 10000 }'),
```

```
    ('{ "name": "Mary", "salary": 12000 }'),
    ('{ "name": "Peter", "salary": 8000 }');
SELECT * FROM employees WHERE data->>'$.name' = 'James';
```


The ->> operator is the same as JSON_UNQUOTE(JSON_EXTRACT(. . . )), and JSON_UNQUOTE( ) returns a string with collation utf8mb4_bin. The comparison is thus case-sensitive, and only one row matches:
```
+--------------------------------------+
| data |
+--------------------------------------+
| {"name": "James", "salary": 10000} |
+--------------------------------------+
```

- Solution 2. Specify the full expression in the query:
```
CREATE TABLE employees (
    data JSON,
    INDEX idx ((CAST(data->>"$.name" AS CHAR(30))))
);
INSERT INTO employees VALUES
    ('{ "name": "james", "salary": 9000 }'),
    ('{ "name": "James", "salary": 10000 }'),
    ('{ "name": "Mary", "salary": 12000 }'),
    ('{ "name": "Peter", "salary": 8000 }');
SELECT * FROM employees WHERE CAST(data->>'$.name' AS CHAR(30)) = 'James';
```


CAST( ) returns a string with collation utf8mb4_0900_ai_ci, so the comparison case-insensitive and two rows match:
```
+--------------------------------------+
| data
+------- |
| {"name": "james", "salary": 9000} |
| {"name": "James", "salary": 10000} |
+-------------------------------------+
```


Be aware that although the optimizer supports automatically stripping CAST ( ) with indexed generated columns, the following approach does not work because it produces a different result with and without an index (Bug\#27337092):
```
mysql> CREATE TABLE employees (
        data JSON,
        generated_col VARCHAR(30) AS (CAST(data->>'$.name' AS CHAR(30)))
    );
Query OK, 0 rows affected, 1 warning (0.03 sec)
mysql> INSERT INTO employees (data)
    VALUES ('{"name": "james"}'), ('{"name": "James"}');
Query OK, 2 rows affected, 1 warning (0.01 sec)
Records: 2 Duplicates: 0 Warnings: 1
mysql> SELECT * FROM employees WHERE data->>'$.name' = 'James';
+--------------------+---------------+
| data | generated_col |
+--------------------+---------------+
| {"name": "James"} | James |
+--------------------+---------------+
1 row in set (0.00 sec)
mysql> ALTER TABLE employees ADD INDEX idx (generated_col);
Query OK, 0 rows affected, 1 warning (0.03 sec)
Records: 0 Duplicates: 0 Warnings: 1
mysql> SELECT * FROM employees WHERE data->>'$.name' = 'James';
+--------------------+---------------+
| data | generated_col |
+--------------------+---------------+
| {"name": "james"} | james
| {"name": "James"} | James |
```

```
+--------------------+---------------+
2 rows in set (0.01 sec)
```


\section*{Unique Indexes}

A UNIQUE index creates a constraint such that all values in the index must be distinct. An error occurs if you try to add a new row with a key value that matches an existing row. If you specify a prefix value for a column in a UNIQUE index, the column values must be unique within the prefix length. A UNIQUE index permits multiple NULL values for columns that can contain NULL.

If a table has a PRIMARY KEY or UNIQUE NOT NULL index that consists of a single column that has an integer type, you can use _rowid to refer to the indexed column in SELECT statements, as follows:
- _rowid refers to the PRIMARY KEY column if there is a PRIMARY KEY consisting of a single integer column. If there is a PRIMARY KEY but it does not consist of a single integer column, _rowid cannot be used.
- Otherwise, _rowid refers to the column in the first UNIQUE NOT NULL index if that index consists of a single integer column. If the first UNIQUE NOT NULL index does not consist of a single integer column, _rowid cannot be used.

\section*{Full-Text Indexes}

FULLTEXT indexes are supported only for InnoDB and MyISAM tables and can include only CHAR, VARCHAR, and TEXT columns. Indexing always happens over the entire column; column prefix indexing is not supported and any prefix length is ignored if specified. See Section 14.9, "Full-Text Search Functions", for details of operation.

\section*{Multi-Valued Indexes}

InnoDB supports multi-valued indexes. A multi-valued index is a secondary index defined on a column that stores an array of values. A "normal" index has one index record for each data record ( $1: 1$ ). A multi-valued index can have multiple index records for a single data record ( $\mathrm{N}: 1$ ). Multi-valued indexes are intended for indexing JSON arrays. For example, a multi-valued index defined on the array of zip codes in the following JSON document creates an index record for each zip code, with each index record referencing the same data record.
```
{
    "user":"Bob",
    "user_id":31,
    "zipcode":[94477,94536]
}
```


\section*{Creating multi-valued Indexes}

You can create a multi-valued index in a CREATE TABLE, ALTER TABLE, or CREATE INDEX statement. This requires using CAST(... AS ... ARRAY) in the index definition, which casts sametyped scalar values in a JSON array to an SQL data type array. A virtual column is then generated transparently with the values in the SQL data type array; finally, a functional index (also referred to as a virtual index) is created on the virtual column. It is the functional index defined on the virtual column of values from the SQL data type array that forms the multi-valued index.

The examples in the following list show the three different ways in which a multi-valued index zips can be created on an array $\$$.zipcode on a JSON column custinfo in a table named customers. In each case, the JSON array is cast to an SQL data type array of UNSIGNED integer values.
- CREATE TABLE only:
```
CREATE TABLE customers (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    custinfo JSON,
    INDEX zips( (CAST(custinfo->'$.zipcode' AS UNSIGNED ARRAY)) )
    );
```

- CREATE TABLE plus ALTER TABLE:
```
CREATE TABLE customers (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    custinfo JSON
    );
ALTER TABLE customers ADD INDEX zips( (CAST(custinfo->'$.zipcode' AS UNSIGNED ARRAY)) );
```

- CREATE TABLE plus CREATE INDEX:
```
CREATE TABLE customers (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    custinfo JSON
    );
CREATE INDEX zips ON customers ( (CAST(custinfo->'$.zipcode' AS UNSIGNED ARRAY)) );
```


A multi-valued index can also be defined as part of a composite index. This example shows a composite index that includes two single-valued parts (for the id and modified columns), and one multi-valued part (for the custinfo column):
```
CREATE TABLE customers (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    custinfo JSON
    );
ALTER TABLE customers ADD INDEX comp(id, modified,
    (CAST(custinfo->'$.zipcode' AS UNSIGNED ARRAY)) );
```


Only one multi-valued key part can be used in a composite index. The multi-valued key part may be used in any order relative to the other parts of the key. In other words, the ALTER TABLE statement just shown could have used comp(id, (CAST(custinfo->'\$.zipcode' AS UNSIGNED ARRAY), modified)) (or any other ordering) and still have been valid.

\section*{Using multi-valued Indexes}

The optimizer uses a multi-valued index to fetch records when the following functions are specified in a WHERE clause:
- MEMBER OF()
- JSON_CONTAINS()
- JSON_OVERLAPS()

We can demonstrate this by creating and populating the customers table using the following CREATE TABLE and INSERT statements:
```
mysql> CREATE TABLE customers (
    -> id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    -> modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -> custinfo JSON
    -> );
Query OK, 0 rows affected (0.51 sec)
mysql> INSERT INTO customers VALUES
    -> (NULL, NOW(), '{"user":"Jack","user_id":37,"zipcode":[94582,94536]}'),
    -> (NULL, NOW(), '{"user":"Jill","user_id":22,"zipcode":[94568,94507,94582]}'),
    -> (NULL, NOW(), '{"user":"Bob","user_id":31,"zipcode":[94477,94507]}'),
    -> (NULL, NOW(), '{"user":"Mary","user_id":72,"zipcode":[94536]}'),
    -> (NULL, NOW(), '{"user":"Ted","user_id":56,"zipcode":[94507,94582]}');
Query OK, 5 rows affected (0.07 sec)
Records: 5 Duplicates: 0 Warnings: 0
```


First we execute three queries on the customers table, one each using MEMBER OF( ), JSON_CONTAINS( ), and JSON_OVERLAPS( ), with the result from each query shown here:
```
mysql> SELECT * FROM customers
    -> WHERE 94507 MEMBER OF(custinfo->'$.zipcode');
+----+-----------------------+--------------------------------------------------------------------
| id | modified | custinfo
+----+---------------------+---------------
| 2 | 2019-06-29 22:23:12 | {"user": "Jill", "user_id": 22, "zipcode": [94568, 94507, 94582]}
| 3 | 2019-06-29 22:23:12 | {"user": "Bob", "user_id": 31, "zipcode": [94477, 94507]}
| 5 | 2019-06-29 22:23:12 | {"user": "Ted", "user_id": 56, "zipcode": [94507, 94582]}
+----+-------------------
mysql> SELECT * FROM customers
    -> WHERE JSON_CONTAINS(custinfo->'$.zipcode', CAST('[94507,94582]' AS JSON));
+----+-----------------------+--------------------------------------------------------------------
| id | modified | custinfo
+----+---------------------+------------------------------------------------------------------
| 2 | 2019-06-29 22:23:12 | {"user": "Jill", "user_id": 22, "zipcode": [94568, 94507, 94582]}
| 5 | 2019-06-29 22:23:12 | {"user": "Ted", "user_id": 56, "zipcode": [94507, 94582]}
2 rows in set (0.00 sec)
mysql> SELECT * FROM customers
    -> WHERE JSON_OVERLAPS(custinfo->'$.zipcode', CAST('[94507,94582]' AS JSON));
+ | id | modified \ custinfo \ {"user": "Jack", "user_id": 37, "zipcode": [94582, 94536]} \t-------------------------------------------------------------------------------------------------------------------------------------
```


Next, we run EXPLAIN on each of the previous three queries:
```
mysql> EXPLAIN SELECT * FROM customers
    -> WHERE 94507 MEMBER OF(custinfo->'$.zipcode');
+----+--------------+------------+-------------+------+----------------+------+----------+-------+------+----
1 row in set, 1 warning (0.00 sec)
mysql> EXPLAIN SELECT * FROM customers
    -> WHERE JSON_CONTAINS(custinfo->'$.zipcode', CAST('[94507,94582]' AS JSON));
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2527.jpg?height=147&width=1716&top_left_y=1896&top_left_x=351)
```
+----+--------------+------------+--
mysql> EXPLAIN SELECT * FROM customers
    -> WHERE JSON_OVERLAPS(custinfo->'$.zipcode', CAST('[94507,94582]' AS JSON));
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2527.jpg?height=197&width=1716&top_left_y=2195&top_left_x=351)

None of the three queries just shown are able to use any keys. To solve this problem, we can add a multi-valued index on the zipcode array in the JSON column (custinfo), like this:
```
mysql> ALTER TABLE customers
    -> ADD INDEX zips( (CAST(custinfo->'$.zipcode' AS UNSIGNED ARRAY)) );
Query OK, 0 rows affected (0.47 sec)
Records: 0 Duplicates: 0 Warnings: 0
```


When we run the previous EXPLAIN statements again, we can now observe that the queries can (and do) use the index zips that was just created:
```
mysql> EXPLAIN SELECT * FROM customers
    -> WHERE 94507 MEMBER OF(custinfo->'$.zipcode');
+----+-------------+-----------+------------+------+---------------+------+---------+-------+------+------
| id | select_type | table | partitions | type | possible_keys | key | key_len | ref | rows | filter
+----+--------------+------------+------------+------+---------------+------+---------+-------+------+------
| 1 | SIMPLE | customers | NULL | ref | zips | zips |9 | const | 1 | 100
+----+--------------+------------+--
mysql> EXPLAIN SELECT * FROM customers
    -> WHERE JSON_CONTAINS(custinfo->'$.zipcode', CAST('[94507,94582]' AS JSON));
+----+--------------+------------+------------+-------+---------------+------+--------+------+------+-----
| id | select_type | table | partitions | type | possible_keys | key | key_len | ref | rows | filter
|+----+--------------+------------+-------------+-------+----------------+------+---------+------+------+------
+----+--------------+-----------+------------+-------+---------------+------+---------+------+------+------
1 row in set, 1 warning (0.00 sec)
mysql> EXPLAIN SELECT * FROM customers
    -> WHERE JSON_OVERLAPS(custinfo->'$.zipcode', CAST('[94507,94582]' AS JSON));
+----+--------------+------------+------------+-------+---------------+------+---------+------+------+------
| id | select_type | table | partitions | type | possible_keys | key | key_len | ref | rows | filter
| 1 | SIMPLE | customers | NULL | range | zips | zips | 9 | NULL | 6 | 100
+----+--------------+-----------+------------+-------+---------------+------+---------+------+------+------
1 row in set, 1 warning (0.01 sec)
```


A multi-valued index can be defined as a unique key. If defined as a unique key, attempting to insert a value already present in the multi-valued index returns a duplicate key error. If duplicate values are already present, attempting to add a unique multi-valued index fails, as shown here:
```
mysql> ALTER TABLE customers DROP INDEX zips;
Query OK, 0 rows affected (0.55 sec)
Records: 0 Duplicates: 0 Warnings: 0
mysql> ALTER TABLE customers
    -> ADD UNIQUE INDEX zips((CAST(custinfo->'$.zipcode' AS UNSIGNED ARRAY)));
ERROR 1062 (23000): Duplicate entry '[94507, ' for key 'customers.zips'
mysql> ALTER TABLE customers
    -> ADD INDEX zips((CAST(custinfo->'$.zipcode' AS UNSIGNED ARRAY)));
Query OK, 0 rows affected (0.36 sec)
Records: 0 Duplicates: 0 Warnings: 0
```


\section*{Characteristics of Multi-Valued Indexes}

Multi-valued indexes have the additional characteristics listed here:
- DML operations that affect multi-valued indexes are handled in the same way as DML operations that affect a normal index, with the only difference being that there may be more than one insert or update for a single clustered index record.
- Nullability and multi-valued indexes:
- If a multi-valued key part has an empty array, no entries are added to the index, and the data record is not accessible by an index scan.
- If multi-valued key part generation returns a NULL value, a single entry containing NULL is added to the multi-valued index. If the key part is defined as NOT NULL, an error is reported.
- If the typed array column is set to NULL, the storage engine stores a single record containing NULL that points to the data record.
- JSON null values are not permitted in indexed arrays. If any returned value is NULL, it is treated as a JSON null and an Invalid JSON value error is reported.
- Because multi-valued indexes are virtual indexes on virtual columns, they must adhere to the same rules as secondary indexes on virtual generated columns.
- Index records are not added for empty arrays.

\section*{Limitations and Restrictions on Multi-valued Indexes}

Multi-valued indexes are subject to the limitations and restrictions listed here:
- Only one multi-valued key part is permitted per multi-valued index. However, the CAST ( . . . AS ... ARRAY) expression can refer to multiple arrays within a JSON document, as shown here:
```
CAST(data->'$.arr[*][*]' AS UNSIGNED ARRAY)
```


In this case, all values matching the JSON expression are stored in the index as a single flat array.
- An index with a multi-valued key part does not support ordering and therefore cannot be used as a primary key. For the same reason, a multi-valued index cannot be defined using the ASC or DESC keyword.
- A multi-valued index cannot be a covering index.
- The maximum number of values per record for a multi-valued index is determined by the amount of data than can be stored on a single undo log page, which is 65221 bytes ( 64 K minus 315 bytes for overhead), which means that the maximum total length of key values is also 65221 bytes. The maximum number of keys depends on various factors, which prevents defining a specific limit. Tests have shown a multi-valued index to permit as many as 1604 integer keys per record, for example. When the limit is reached, an error similar to the following is reported: ERROR 3905 (HY000) : Exceeded max number of values per record for multi-valued index 'idx' by 1 value(s).
- The only type of expression that is permitted in a multi-valued key part is a JSON expression. The expression need not reference an existing element in a JSON document inserted into the indexed column, but must itself be syntactically valid.
- Because index records for the same clustered index record are dispersed throughout a multi-valued index, a multi-valued index does not support range scans or index-only scans.
- Multi-valued indexes are not permitted in foreign key specifications.
- Index prefixes cannot be defined for multi-valued indexes.
- Multi-valued indexes cannot be defined on data cast as BINARY (see the description of the CAST( ) function).
- Online creation of a multi-value index is not supported, which means the operation uses ALGORITHM=COPY. See Performance and Space Requirements.
- Character sets and collations other than the following two combinations of character set and collation are not supported for multi-valued indexes:
1. The binary character set with the default binary collation
2. The utf8mb4 character set with the default utf8mb4_0900_as_cs collation.
- As with other indexes on columns of InnoDB tables, a multi-valued index cannot be created with USING HASH; attempting to do so results in a warning: This storage engine does not support the HASH index algorithm, storage engine default was used instead. (USING BTREE is supported as usual.)

\section*{Spatial Indexes}

The MyISAM, InnoDB, NDB, and ARCHIVE storage engines support spatial columns such as POINT and GEOMETRY. (Section 13.4, "Spatial Data Types", describes the spatial data types.) However,
support for spatial column indexing varies among engines. Spatial and nonspatial indexes on spatial columns are available according to the following rules.

Spatial indexes on spatial columns have these characteristics:
- Available only for InnoDB and MyISAM tables. Specifying SPATIAL INDEX for other storage engines results in an error.
- An index on a spatial column must be a SPATIAL index. The SPATIAL keyword is thus optional but implicit for creating an index on a spatial column.
- Available for single spatial columns only. A spatial index cannot be created over multiple spatial columns.
- Indexed columns must be NOT NULL.
- Column prefix lengths are prohibited. The full width of each column is indexed.
- Not permitted for a primary key or unique index.

Nonspatial indexes on spatial columns (created with INDEX, UNIQUE, or PRIMARY KEY) have these characteristics:
- Permitted for any storage engine that supports spatial columns except ARCHIVE.
- Columns can be NULL unless the index is a primary key.
- The index type for a non-SPATIAL index depends on the storage engine. Currently, B-tree is used.
- Permitted for a column that can have NULL values only for InnoDB, MyISAM, and MEMORY tables.

\section*{Index Options}

Following the key part list, index options can be given. An index_option value can be any of the following:
- KEY_BLOCK_SIZE [=] value

For MyISAM tables, KEY_BLOCK_SIZE optionally specifies the size in bytes to use for index key blocks. The value is treated as a hint; a different size could be used if necessary. A KEY_BLOCK_SIZE value specified for an individual index definition overrides a table-level KEY_BLOCK_SIZE value.

KEY_BLOCK_SIZE is not supported at the index level for InnoDB tables. See Section 15.1.20, "CREATE TABLE Statement".
- index_type

Some storage engines permit you to specify an index type when creating an index. For example:
CREATE TABLE lookup (id INT) ENGINE = MEMORY;
CREATE INDEX id_index ON lookup (id) USING BTREE;
Table 15.1, "Index Types Per Storage Engine" shows the permissible index type values supported by different storage engines. Where multiple index types are listed, the first one is the default when no index type specifier is given. Storage engines not listed in the table do not support an index_type clause in index definitions.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 15.1 Index Types Per Storage Engine}
\begin{tabular}{|l|l|}
\hline Storage Engine & Permissible Index Types \\
\hline InnoDB & BTREE \\
\hline MyISAM & BTREE \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Storage Engine & Permissible Index Types \\
\hline MEMORY/HEAP & HASH, BTREE \\
\hline NDB & HASH, BTREE (see note in text) \\
\hline
\end{tabular}

The index_type clause cannot be used for FULLTEXT INDEX specifications. Full-text index implementation is storage-engine dependent. Spatial indexes are implemented as R-tree indexes.

If you specify an index type that is not valid for a given storage engine, but another index type is available that the engine can use without affecting query results, the engine uses the available type. The parser recognizes RTREE as a type name. This is permitted only for SPATIAL indexes.

BTREE indexes are implemented by the NDB storage engine as T-tree indexes.

\section*{Note}

For indexes on NDB table columns, the USING option can be specified only for a unique index or primary key. USING HASH prevents the creation of an ordered index; otherwise, creating a unique index or primary key on an NDB table automatically results in the creation of both an ordered index and a hash index, each of which indexes the same set of columns.

For unique indexes that include one or more NULL columns of an NDB table, the hash index can be used only to look up literal values, which means that IS [NOT] NULL conditions require a full scan of the table. One workaround is to make sure that a unique index using one or more NULL columns on such a table is always created in such a way that it includes the ordered index; that is, avoid employing USING HASH when creating the index.

If you specify an index type that is not valid for a given storage engine, but another index type is available that the engine can use without affecting query results, the engine uses the available type. The parser recognizes RTREE as a type name, but currently this cannot be specified for any storage engine.

\section*{Note}

Use of the index_type option before the ON tbl_name clause is deprecated; expect support for use of the option in this position to be removed in a future MySQL release. If an index_type option is given in both the earlier and later positions, the final option applies.

TYPE type_name is recognized as a synonym for USING type_name. However, USING is the preferred form.

The following tables show index characteristics for the storage engines that support the index_type option.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 15.2 InnoDB Storage Engine Index Characteristics}
\begin{tabular}{|l|l|l|l|l|l|}
\hline Index Class & Index Type & Stores NULL VALUES & Permits Multiple NULL Values & IS NULL Scan Type & IS NOT NULL Scan Type \\
\hline Primary key & BTREE & No & No & N/A & N/A \\
\hline Unique & BTREE & Yes & Yes & Index & Index \\
\hline Key & BTREE & Yes & Yes & Index & Index \\
\hline FULLTEXT & N/A & Yes & Yes & Table & Table \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Index Class & Index Type & \begin{tabular}{l} 
Stores NULL \\
VALUES
\end{tabular} & \begin{tabular}{l} 
Permits \\
Multiple NULL \\
Values
\end{tabular} & \begin{tabular}{l} 
IS NULL Scan \\
Type
\end{tabular} & \begin{tabular}{l} 
IS NOT NULL \\
Scan Type
\end{tabular} \\
\hline SPATIAL & N/A & No & No & N/A & N/A \\
\hline
\end{tabular}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 15.3 MyISAM Storage Engine Index Characteristics}
\begin{tabular}{|l|l|l|l|l|l|}
\hline Index Class & Index Type & Stores NULL VALUES & Permits Multiple NULL Values & IS NULL Scan Type & IS NOT NULL Scan Type \\
\hline Primary key & BTREE & No & No & N/A & N/A \\
\hline Unique & BTREE & Yes & Yes & Index & Index \\
\hline Key & BTREE & Yes & Yes & Index & Index \\
\hline FULLTEXT & N/A & Yes & Yes & Table & Table \\
\hline SPATIAL & N/A & No & No & N/A & N/A \\
\hline
\end{tabular}
\end{table}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 15.4 MEMORY Storage Engine Index Characteristics}
\begin{tabular}{|l|l|l|l|l|l|}
\hline Index Class & Index Type & Stores NULL VALUES & Permits Multiple NULL Values & IS NULL Scan Type & IS NOT NULL Scan Type \\
\hline Primary key & BTREE & No & No & N/A & N/A \\
\hline Unique & BTREE & Yes & Yes & Index & Index \\
\hline Key & BTREE & Yes & Yes & Index & Index \\
\hline Primary key & HASH & No & No & N/A & N/A \\
\hline Unique & HASH & Yes & Yes & Index & Index \\
\hline Key & HASH & Yes & Yes & Index & Index \\
\hline
\end{tabular}
\end{table}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 15.5 NDB Storage Engine Index Characteristics}
\begin{tabular}{|l|l|l|l|l|l|}
\hline Index Class & Index Type & Stores NULL VALUES & Permits Multiple NULL Values & IS NULL Scan Type & IS NOT NULL Scan Type \\
\hline Primary key & BTREE & No & No & Index & Index \\
\hline Unique & BTREE & Yes & Yes & Index & Index \\
\hline Key & BTREE & Yes & Yes & Index & Index \\
\hline Primary key & HASH & No & No & Table (see note 1) & Table (see note 1) \\
\hline Unique & HASH & Yes & Yes & Table (see note 1) & Table (see note 1) \\
\hline Key & HASH & Yes & Yes & Table (see note 1) & Table (see note 1) \\
\hline
\end{tabular}
\end{table}

Table note:
1. USING HASH prevents creation of an implicit ordered index.
- WITH PARSER parser_name

This option can be used only with FULLTEXT indexes. It associates a parser plugin with the index if full-text indexing and searching operations need special handling. InnoDB and MyISAM support full- text parser plugins. If you have a MyISAM table with an associated full-text parser plugin, you can
convert the table to InnoDB using ALTER TABLE. See Full-Text Parser Plugins and Writing Full-Text Parser Plugins for more information.
- COMMENT 'string'

Index definitions can include an optional comment of up to 1024 characters.
The MERGE_THRESHOLD for index pages can be configured for individual indexes using the index_option COMMENT clause of the CREATE INDEX statement. For example:

CREATE TABLE t1 (id INT);
CREATE INDEX id_index ON t1 (id) COMMENT 'MERGE_THRESHOLD=40';
If the page-full percentage for an index page falls below the MERGE_THRESHOLD value when a row is deleted or when a row is shortened by an update operation, InnoDB attempts to merge the index page with a neighboring index page. The default MERGE_THRESHOLD value is 50 , which is the previously hardcoded value.

MERGE_THRESHOLD can also be defined at the index level and table level using CREATE TABLE and ALTER TABLE statements. For more information, see Section 17.8.11, "Configuring the Merge Threshold for Index Pages".
- VISIBLE, INVISIBLE

Specify index visibility. Indexes are visible by default. An invisible index is not used by the optimizer. Specification of index visibility applies to indexes other than primary keys (either explicit or implicit). For more information, see Section 10.3.12, "Invisible Indexes".
- The ENGINE_ATTRIBUTE and SECONDARY_ENGINE_ATTRIBUTE are used to specify index attributes for primary and secondary storage engines. The options are reserved for future use.

The value assigned to this option is a string literal containing a valid JSON document or an empty string ("). Invalid JSON is rejected.

CREATE INDEX i1 ON t1 (c1) ENGINE_ATTRIBUTE='\{"key":"value"\}';
ENGINE_ATTRIBUTE and SECONDARY_ENGINE_ATTRIBUTE values can be repeated without error. In this case, the last specified value is used.

ENGINE_ATTRIBUTE and SECONDARY_ENGINE_ATTRIBUTE values are not checked by the server, nor are they cleared when the table's storage engine is changed.

\section*{Table Copying and Locking Options}

ALGORITHM and LOCK clauses may be given to influence the table copying method and level of concurrency for reading and writing the table while its indexes are being modified. They have the same meaning as for the ALTER TABLE statement. For more information, see Section 15.1.9, "ALTER TABLE Statement"

NDB Cluster supports online operations using the same ALGORITHM=INPLACE syntax used with the standard MySQL Server. See Section 25.6.12, "Online Operations with ALTER TABLE in NDB Cluster", for more information.

\subsection*{15.1.16 CREATE LOGFILE GROUP Statement}
```
CREATE LOGFILE GROUP logfile_group
    ADD UNDOFILE 'undo_file'
    [INITIAL_SIZE [=] initial_size]
    [UNDO_BUFFER_SIZE [=] undo_buffer_size]
    [REDO_BUFFER_SIZE [=] redo_buffer_size]
    [NODEGROUP [=] nodegroup_id]
    [WAIT]
    [COMMENT [=] 'string']
```


\section*{ENGINE [=] engine_name}

This statement creates a new log file group named logfile_group having a single undo file named 'undo_file'. A CREATE LOGFILE GROUP statement has one and only one ADD UNDOFILE clause. For rules covering the naming of log file groups, see Section 11.2, "Schema Object Names".

\section*{Note}

All NDB Cluster Disk Data objects share the same namespace. This means that each Disk Data object must be uniquely named (and not merely each Disk Data object of a given type). For example, you cannot have a tablespace and a log file group with the same name, or a tablespace and a data file with the same name.

There can be only one log file group per NDB Cluster instance at any given time.
The optional INITIAL_SIZE parameter sets the undo file's initial size; if not specified, it defaults to 128M (128 megabytes). The optional UNDO_BUFFER_SIZE parameter sets the size used by the undo buffer for the log file group; The default value for UNDO_BUFFER_SIZE is 8M (eight megabytes); this value cannot exceed the amount of system memory available. Both of these parameters are specified in bytes. You may optionally follow either or both of these with a one-letter abbreviation for an order of magnitude, similar to those used in my. cnf. Generally, this is one of the letters M (for megabytes) or G (for gigabytes).

Memory used for UNDO_BUFFER_SIZE comes from the global pool whose size is determined by the value of the SharedGlobalMemory data node configuration parameter. This includes any default value implied for this option by the setting of the InitialLogFileGroup data node configuration parameter.

The maximum permitted for UNDO_BUFFER_SIZE is $629145600(600 \mathrm{MB})$.
On 32-bit systems, the maximum supported value for INITIAL_SIZE is 4294967296 (4 GB). (Bug \#29186)

The minimum allowed value for INITIAL_SIZE is 1048576 (1 MB).
The ENGINE option determines the storage engine to be used by this log file group, with engine_name being the name of the storage engine. This must be NDB (or NDBCLUSTER). If ENGINE is not set, MySQL tries to use the engine specified by the default_storage_engine server system variable. In any case, if the engine is not specified as NDB or NDBCLUSTER, the CREATE LOGFILE GROUP statement appears to succeed but actually fails to create the log file group, as shown here:
```
mysql> CREATE LOGFILE GROUP lg1
    -> ADD UNDOFILE 'undo.dat' INITIAL_SIZE = 10M;
Query OK, 0 rows affected, 1 warning (0.00 sec)
mysql> SHOW WARNINGS;
+-------+-------+-------
+--------+------+---------------------------------------------------------------------------------------------
| Error | 1478 | Table storage engine 'InnoDB' does not support the create option 'TABLESPACE or LOGFILE GF
+--------+------+-----------------------------------------------------------------------------------------------------
1 row in set (0.00 sec)
mysql> DROP LOGFILE GROUP lg1 ENGINE = NDB;
ERROR 1529 (HY000): Failed to drop LOGFILE GROUP
mysql> CREATE LOGFILE GROUP lg1
    -> ADD UNDOFILE 'undo.dat' INITIAL_SIZE = 10M
    -> ENGINE = NDB;
Query OK, 0 rows affected (2.97 sec)
```


The fact that the CREATE LOGFILE GROUP statement does not actually return an error when a storage engine other than NDB is specified, but rather appears to succeed, is a known issue which we hope to address in a future version of NDB Cluster.

REDO_BUFFER_SIZE, NODEGROUP, WAIT, and COMMENT are parsed but ignored, and so have no effect in MySQL 8.4. These options are intended for future expansion.

When used with ENGINE [=] NDB, a log file group and associated undo log file are created on each Cluster data node. You can verify that the undo files were created and obtain information about them by querying the Information Schema FILES table. For example:
```
mysql> SELECT LOGFILE_GROUP_NAME, LOGFILE_GROUP_NUMBER, EXTRA
    -> FROM INFORMATION_SCHEMA.FILES
    -> WHERE FILE_NAME = 'undo_10.dat';
+----------------------+----------------------+-----------------
| LOGFILE_GROUP_NAME | LOGFILE_GROUP_NUMBER | EXTRA |
+----------------------+----------------------+----------------+
| lg_3 | 11 | CLUSTER_NODE=3 |
| lg_3 | 11 | CLUSTER_NODE=4 |
+----------------------+----------------------+----------------
2 rows in set (0.06 sec)
```


CREATE LOGFILE GROUP is useful only with Disk Data storage for NDB Cluster. See Section 25.6.11, "NDB Cluster Disk Data Tables".

\subsection*{15.1.17 CREATE PROCEDURE and CREATE FUNCTION Statements}
```
CREATE
        [DEFINER = user]
        PROCEDURE [IF NOT EXISTS] sp_name ([proc_parameter[,...]])
        [characteristic ...] routine_body
CREATE
        [DEFINER = user]
        FUNCTION [IF NOT EXISTS] sp_name ([func_parameter[,...]])
        RETURNS type
        [characteristic ...] routine_body
proc_parameter:
        [ IN | OUT | INOUT ] param_name type
func_parameter:
        param_name type
type:
        Any valid MySQL data type
characteristic: {
        COMMENT 'string'
    | LANGUAGE SQL
        [NOT] DETERMINISTIC
        { CONTAINS SQL | NO SQL | READS SQL DATA | MODIFIES SQL DATA }
        SQL SECURITY { DEFINER | INVOKER }
}
routine_body:
        SQL routine
```


These statements are used to create a stored routine (a stored procedure or function). That is, the specified routine becomes known to the server. By default, a stored routine is associated with the default database. To associate the routine explicitly with a given database, specify the name as db_name.sp_name when you create it.

The CREATE FUNCTION statement is also used in MySQL to support loadable functions. See Section 15.7.4.1, "CREATE FUNCTION Statement for Loadable Functions". A loadable function can be regarded as an external stored function. Stored functions share their namespace with loadable functions. See Section 11.2.5, "Function Name Parsing and Resolution", for the rules describing how the server interprets references to different kinds of functions.

To invoke a stored procedure, use the CALL statement (see Section 15.2.1, "CALL Statement"). To invoke a stored function, refer to it in an expression. The function returns a value during expression evaluation.

CREATE PROCEDURE and CREATE FUNCTION require the CREATE ROUTINE privilege. If the DEFINER clause is present, the privileges required depend on the user value, as discussed in Section 27.6, "Stored Object Access Control". If binary logging is enabled, CREATE FUNCTION might require the SUPER privilege, as discussed in Section 27.7, "Stored Program Binary Logging".

By default, MySQL automatically grants the ALTER ROUTINE and EXECUTE privileges to the routine creator. This behavior can be changed by disabling the automatic_sp_privileges system variable. See Section 27.2.2, "Stored Routines and MySQL Privileges".

The DEFINER and SQL SECURITY clauses specify the security context to be used when checking access privileges at routine execution time, as described later in this section.

If the routine name is the same as the name of a built-in SQL function, a syntax error occurs unless you use a space between the name and the following parenthesis when defining the routine or invoking it later. For this reason, avoid using the names of existing SQL functions for your own stored routines.

The IGNORE_SPACE SQL mode applies to built-in functions, not to stored routines. It is always permissible to have spaces after a stored routine name, regardless of whether IGNORE_SPACE is enabled.

IF NOT EXISTS prevents an error from occurring if there already exists a routine with the same name. This option is supported with both CREATE FUNCTION and CREATE PROCEDURE.

If a built-in function with the same name already exists, attempting to create a stored function with CREATE FUNCTION ... IF NOT EXISTS succeeds with a warning indicating that it has the same name as a native function; this is no different than when performing the same CREATE FUNCTION statement without specifying IF NOT EXISTS.

If a loadable function with the same name already exists, attempting to create a stored function using IF NOT EXISTS succeeds with a warning. This is the same as without specifying IF NOT EXISTS.

See Function Name Resolution, for more information.
The parameter list enclosed within parentheses must always be present. If there are no parameters, an empty parameter list of ( ) should be used. Parameter names are not case-sensitive.

Each parameter is an IN parameter by default. To specify otherwise for a parameter, use the keyword OUT or INOUT before the parameter name.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2536.jpg?height=123&width=95&top_left_y=1758&top_left_x=310)

\section*{Note}

Specifying a parameter as IN, OUT, or INOUT is valid only for a PROCEDURE. For a FUNCTION, parameters are always regarded as IN parameters.

An IN parameter passes a value into a procedure. The procedure might modify the value, but the modification is not visible to the caller when the procedure returns. An OUT parameter passes a value from the procedure back to the caller. Its initial value is NULL within the procedure, and its value is visible to the caller when the procedure returns. An INOUT parameter is initialized by the caller, can be modified by the procedure, and any change made by the procedure is visible to the caller when the procedure returns.

For each OUT or INOUT parameter, pass a user-defined variable in the CALL statement that invokes the procedure so that you can obtain its value when the procedure returns. If you are calling the procedure from within another stored procedure or function, you can also pass a routine parameter or local routine variable as an OUT or INOUT parameter. If you are calling the procedure from within a trigger, you can also pass NEW.col_name as an OUT or INOUT parameter.

For information about the effect of unhandled conditions on procedure parameters, see Section 15.6.7.8, "Condition Handling and OUT or INOUT Parameters".

Routine parameters cannot be referenced in statements prepared within the routine; see Section 27.8, "Restrictions on Stored Programs".

The following example shows a simple stored procedure that, given a country code, counts the number of cities for that country that appear in the city table of the world database. The country code is passed using an IN parameter, and the city count is returned using an OUT parameter:
```
mysql> delimiter //
mysql> CREATE PROCEDURE citycount (IN country CHAR(3), OUT cities INT)
    BEGIN
        SELECT COUNT(*) INTO cities FROM world.city
        WHERE CountryCode = country;
    END//
Query OK, 0 rows affected (0.01 sec)
mysql> delimiter ;
mysql> CALL citycount('JPN', @cities); -- cities in Japan
Query OK, 1 row affected (0.00 sec)
mysql> SELECT @cities;
+----------+
| @cities |
+---------+
| 248 |
+----------+
1 row in set (0.00 sec)
mysql> CALL citycount('FRA', @cities); -- cities in France
Query OK, 1 row affected (0.00 sec)
mysql> SELECT @cities;
+----------+
| @cities |
+---------+
| 40 |
+---------+
1 row in set (0.00 sec)
```


The example uses the mysql client delimiter command to change the statement delimiter from ; to // while the procedure is being defined. This enables the ; delimiter used in the procedure body to be passed through to the server rather than being interpreted by mysql itself. See Section 27.1, "Defining Stored Programs".

The RETURNS clause may be specified only for a FUNCTION, for which it is mandatory. It indicates the return type of the function, and the function body must contain a RETURN value statement. If the RETURN statement returns a value of a different type, the value is coerced to the proper type. For example, if a function specifies an ENUM or SET value in the RETURNS clause, but the RETURN statement returns an integer, the value returned from the function is the string for the corresponding ENUM member of set of SET members.

The following example function takes a parameter, performs an operation using an SQL function, and returns the result. In this case, it is unnecessary to use delimiter because the function definition contains no internal ; statement delimiters:
```
mysql> CREATE FUNCTION hello (s CHAR(20))
    -> RETURNS CHAR(50) DETERMINISTIC
    -> RETURN CONCAT('Hello, ',s,'!');
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT hello('world');
+-----------------+
| hello('world') |
+-----------------+
| Hello, world! |
+-----------------+
1 row in set (0.00 sec)
```


Parameter types and function return types can be declared to use any valid data type. The COLLATE attribute can be used if preceded by a CHARACTER SET specification.

The routine_body consists of a valid SQL routine statement. This can be a simple statement such as SELECT or INSERT, or a compound statement written using BEGIN and END. Compound statements can contain declarations, loops, and other control structure statements. The syntax for these statements is described in Section 15.6, "Compound Statement Syntax". In practice, stored functions tend to use compound statements, unless the body consists of a single RETURN statement.

MySQL permits routines to contain DDL statements, such as CREATE and DROP. MySQL also permits stored procedures (but not stored functions) to contain SQL transaction statements such as COMMIT. Stored functions may not contain statements that perform explicit or implicit commit or rollback. Support for these statements is not required by the SQL standard, which states that each DBMS vendor may decide whether to permit them.

Statements that return a result set can be used within a stored procedure but not within a stored function. This prohibition includes SELECT statements that do not have an INTO var_list clause and other statements such as SHOW, EXPLAIN, and CHECK TABLE. For statements that can be determined at function definition time to return a result set, a Not allowed to return a result set from a function error occurs (ER_SP_NO_RETSET). For statements that can be determined only at runtime to return a result set, a PROCEDURE \%s can't return a result set in the given context error occurs (ER_SP_BADSELECT).

USE statements within stored routines are not permitted. When a routine is invoked, an implicit USE db_name is performed (and undone when the routine terminates). The causes the routine to have the given default database while it executes. References to objects in databases other than the routine default database should be qualified with the appropriate database name.

For additional information about statements that are not permitted in stored routines, see Section 27.8, "Restrictions on Stored Programs".

For information about invoking stored procedures from within programs written in a language that has a MySQL interface, see Section 15.2.1, "CALL Statement".

MySQL stores the sql_mode system variable setting in effect when a routine is created or altered, and always executes the routine with this setting in force, regardless of the current server SQL mode when the routine begins executing.

The switch from the SQL mode of the invoker to that of the routine occurs after evaluation of arguments and assignment of the resulting values to routine parameters. If you define a routine in strict SQL mode but invoke it in nonstrict mode, assignment of arguments to routine parameters does not take place in strict mode. If you require that expressions passed to a routine be assigned in strict SQL mode, you should invoke the routine with strict mode in effect.

The COMMENT characteristic is a MySQL extension, and may be used to describe the stored routine. This information is displayed by the SHOW CREATE PROCEDURE and SHOW CREATE FUNCTION statements.

The LANGUAGE characteristic indicates the language in which the routine is written. The server ignores this characteristic; only SQL routines are supported.

A routine is considered "deterministic" if it always produces the same result for the same input parameters, and "not deterministic" otherwise. If neither DETERMINISTIC nor NOT DETERMINISTIC is given in the routine definition, the default is NOT DETERMINISTIC. To declare that a function is deterministic, you must specify DETERMINISTIC explicitly.

Assessment of the nature of a routine is based on the "honesty" of the creator: MySQL does not check that a routine declared DETERMINISTIC is free of statements that produce nondeterministic results. However, misdeclaring a routine might affect results or affect performance. Declaring a nondeterministic routine as DETERMINISTIC might lead to unexpected results by causing the optimizer to make incorrect execution plan choices. Declaring a deterministic routine as NONDETERMINISTIC might diminish performance by causing available optimizations not to be used.

If binary logging is enabled, the DETERMINISTIC characteristic affects which routine definitions MySQL accepts. See Section 27.7, "Stored Program Binary Logging".

A routine that contains the NOW ( ) function (or its synonyms) or RAND ( ) is nondeterministic, but it might still be replication-safe. For NOW ( ), the binary log includes the timestamp and replicates correctly. RAND ( ) also replicates correctly as long as it is called only a single time during the execution of a routine. (You can consider the routine execution timestamp and random number seed as implicit inputs that are identical on the source and replica.)

Several characteristics provide information about the nature of data use by the routine. In MySQL, these characteristics are advisory only. The server does not use them to constrain what kinds of statements a routine is permitted to execute.
- CONTAINS SQL indicates that the routine does not contain statements that read or write data. This is the default if none of these characteristics is given explicitly. Examples of such statements are SET @x = 1 or DO RELEASE_LOCK('abc'), which execute but neither read nor write data.
- NO SQL indicates that the routine contains no SQL statements.
- READS SQL DATA indicates that the routine contains statements that read data (for example, SELECT), but not statements that write data.
- MODIFIES SQL DATA indicates that the routine contains statements that may write data (for example, INSERT or DELETE).

The SQL SECURITY characteristic can be DEFINER or INVOKER to specify the security context; that is, whether the routine executes using the privileges of the account named in the routine DEFINER clause or the user who invokes it. This account must have permission to access the database with which the routine is associated. The default value is DEFINER. The user who invokes the routine must have the EXECUTE privilege for it, as must the DEFINER account if the routine executes in definer security context.

The DEFINER clause specifies the MySQL account to be used when checking access privileges at routine execution time for routines that have the SQL SECURITY DEFINER characteristic.

If the DEFINER clause is present, the user value should be a MySQL account specified as 'user_name'@'host_name', CURRENT_USER, or CURRENT_USER(). The permitted user values depend on the privileges you hold, as discussed in Section 27.6, "Stored Object Access Control". Also see that section for additional information about stored routine security.

If the DEFINER clause is omitted, the default definer is the user who executes the CREATE PROCEDURE or CREATE FUNCTION statement. This is the same as specifying DEFINER $=$ CURRENT_USER explicitly.

Within the body of a stored routine that is defined with the SQL SECURITY DEFINER characteristic, the CURRENT_USER function returns the routine's DEFINER value. For information about user auditing within stored routines, see Section 8.2.23, "SQL-Based Account Activity Auditing".

Consider the following procedure, which displays a count of the number of MySQL accounts listed in the mysql. user system table:
```
CREATE DEFINER = 'admin'@'localhost' PROCEDURE account_count()
BEGIN
    SELECT 'Number of accounts:', COUNT(*) FROM mysql.user;
END;
```


The procedure is assigned a DEFINER account of 'admin ' @ ' localhost ' no matter which user defines it. It executes with the privileges of that account no matter which user invokes it (because the default security characteristic is DEFINER). The procedure succeeds or fails depending on whether invoker has the EXECUTE privilege for it and 'admin'@'localhost' has the SELECT privilege for the mysql.user table.

Now suppose that the procedure is defined with the SQL SECURITY INVOKER characteristic:
```
CREATE DEFINER = 'admin'@'localhost' PROCEDURE account_count()
SQL SECURITY INVOKER
BEGIN
    SELECT 'Number of accounts:', COUNT(*) FROM mysql.user;
END;
```


The procedure still has a DEFINER of 'admin'@'localhost', but in this case, it executes with the privileges of the invoking user. Thus, the procedure succeeds or fails depending on whether the invoker has the EXECUTE privilege for it and the SELECT privilege for the mysql. user table.

By default, when a routine with the SQL SECURITY DEFINER characteristic is executed, MySQL Server does not set any active roles for the MySQL account named in the DEFINER clause, only the default roles. The exception is if the activate_all_roles_on_login system variable is enabled, in which case MySQL Server sets all roles granted to the DEFINER user, including mandatory roles. Any privileges granted through roles are therefore not checked by default when the CREATE PROCEDURE or CREATE FUNCTION statement is issued. For stored programs, if execution should occur with roles different from the default, the program body can execute SET ROLE to activate the required roles. This must be done with caution since the privileges assigned to roles can be changed.

The server handles the data type of a routine parameter, local routine variable created with DECLARE, or function return value as follows:
- Assignments are checked for data type mismatches and overflow. Conversion and overflow problems result in warnings, or errors in strict SQL mode.
- Only scalar values can be assigned. For example, a statement such as SET $\mathrm{x}=$ (SELECT 1, 2) is invalid.
- For character data types, if CHARACTER SET is included in the declaration, the specified character set and its default collation is used. If the COLLATE attribute is also present, that collation is used rather than the default collation.

If CHARACTER SET and COLLATE are not present, the database character set and collation in effect at routine creation time are used. To avoid having the server use the database character set and collation, provide an explicit CHARACTER SET and a COLLATE attribute for character data parameters.

If you alter the database default character set or collation, stored routines that are to use the new database defaults must be dropped and recreated.

The database character set and collation are given by the value of the character_set_database and collation_database system variables. For more information, see Section 12.3.3, "Database Character Set and Collation".

\subsection*{15.1.18 CREATE SERVER Statement}
```
CREATE SERVER server_name
        FOREIGN DATA WRAPPER wrapper_name
        OPTIONS (option [, option] ...)
option: {
        HOST character-literal
    | DATABASE character-literal
    | USER character-literal
    | PASSWORD character-literal
    | SOCKET character-literal
    | OWNER character-literal
    | PORT numeric-literal
}
```


This statement creates the definition of a server for use with the FEDERATED storage engine. The CREATE SERVER statement creates a new row in the servers table in the mysql database. This statement requires the SUPER privilege.

The server_name should be a unique reference to the server. Server definitions are global within the scope of the server, it is not possible to qualify the server definition to a specific database. server_name has a maximum length of 64 characters (names longer than 64 characters are silently truncated), and is case-insensitive. You may specify the name as a quoted string.

The wrapper_name is an identifier and may be quoted with single quotation marks.
For each option you must specify either a character literal or numeric literal. Character literals are UTF-8, support a maximum length of 64 characters and default to a blank (empty) string. String literals are silently truncated to 64 characters. Numeric literals must be a number between 0 and 9999, default value is 0 .

\section*{Note}

The OWNER option is currently not applied, and has no effect on the ownership or operation of the server connection that is created.

The CREATE SERVER statement creates an entry in the mysql. servers table that can later be used with the CREATE TABLE statement when creating a FEDERATED table. The options that you specify are used to populate the columns in the mysql. servers table. The table columns are Server_name, Host, Db, Username, Password, Port and Socket.

For example:
CREATE SERVER s
FOREIGN DATA WRAPPER mysql
OPTIONS (USER 'Remote', HOST '198.51.100.106', DATABASE 'test');
Be sure to specify all options necessary to establish a connection to the server. The user name, host name, and database name are mandatory. Other options might be required as well, such as password.

The data stored in the table can be used when creating a connection to a FEDERATED table:
CREATE TABLE t (s1 INT) ENGINE=FEDERATED CONNECTION='s';
For more information, see Section 18.8, "The FEDERATED Storage Engine".
CREATE SERVER causes an implicit commit. See Section 15.3.3, "Statements That Cause an Implicit Commit".

CREATE SERVER is not written to the binary log, regardless of the logging format that is in use.

\subsection*{15.1.19 CREATE SPATIAL REFERENCE SYSTEM Statement}
```
CREATE OR REPLACE SPATIAL REFERENCE SYSTEM
        srid srs_attribute ...
CREATE SPATIAL REFERENCE SYSTEM
        [IF NOT EXISTS]
        srid srs_attribute ...
srs_attribute: {
        NAME 'srs_name'
    | DEFINITION 'definition'
    | ORGANIZATION 'org_name' IDENTIFIED BY org_id
    | DESCRIPTION 'description'
}
srid, org_id: 32-bit unsigned integer
```


This statement creates a spatial reference system (SRS) definition and stores it in the data dictionary. It requires the SUPER privilege. The resulting data dictionary entry can be inspected using the INFORMATION_SCHEMA ST_SPATIAL_REFERENCE_SYSTEMS table.

SRID values must be unique, so if neither OR REPLACE nor IF NOT EXISTS is specified, an error occurs if an SRS definition with the given srid value already exists.

With CREATE OR REPLACE syntax, any existing SRS definition with the same SRID value is replaced, unless the SRID value is used by some column in an existing table. In that case, an error occurs. For example:
```
mysql> CREATE OR REPLACE SPATIAL REFERENCE SYSTEM 4326 ...;
ERROR 3716 (SR005): Can't modify SRID 4326. There is at
least one column depending on it.
```


To identify which column or columns use the SRID, use this query, replacing 4326 with the SRID of the definition you are trying to create:

SELECT * FROM INFORMATION_SCHEMA.ST_GEOMETRY_COLUMNS WHERE SRS_ID=4326;
With CREATE ... IF NOT EXISTS syntax, any existing SRS definition with the same SRID value causes the new definition to be ignored and a warning occurs.

SRID values must be in the range of 32 -bit unsigned integers, with these restrictions:
- SRID 0 is a valid SRID but cannot be used with CREATE SPATIAL REFERENCE SYSTEM.
- If the value is in a reserved SRID range, a warning occurs. Reserved ranges are [0,32767] (reserved by EPSG), [60,000,000, 69,999,999] (reserved by EPSG), and [2,000,000,000, 2,147,483,647] (reserved by MySQL). EPSG stands for the European Petroleum Survey Group.
- Users should not create SRSs with SRIDs in the reserved ranges. Doing so runs the risk of the SRIDs conflicting with future SRS definitions distributed with MySQL, with the result that the new system-provided SRSs are not installed for MySQL upgrades or that the user-defined SRSs are overwritten.

Attributes for the statement must satisfy these conditions:
- Attributes can be given in any order, but no attribute can be given more than once.
- The NAME and DEFINITION attributes are mandatory.
- The NAME srs_name attribute value must be unique. The combination of the ORGANIZATION org_name and org_id attribute values must be unique.
- The NAME srs_name attribute value and ORGANIZATION org_name attribute value cannot be empty or begin or end with whitespace.
- String values in attribute specifications cannot contain control characters, including newline.
- The following table shows the maximum lengths for string attribute values.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 15.6 CREATE SPATIAL REFERENCE SYSTEM Attribute Lengths}
\begin{tabular}{|l|l|}
\hline Attribute & Maximum Length (characters) \\
\hline NAME & 80 \\
\hline DEFINITION & 4096 \\
\hline ORGANIZATION & 256 \\
\hline DESCRIPTION & 2048 \\
\hline
\end{tabular}
\end{table}

Here is an example CREATE SPATIAL REFERENCE SYSTEM statement. The DEFINITION value is reformatted across multiple lines for readability. (For the statement to be legal, the value actually must be given on a single line.)
```
CREATE SPATIAL REFERENCE SYSTEM 4120
NAME 'Greek'
ORGANIZATION 'EPSG' IDENTIFIED BY 4120
DEFINITION
    'GEOGCS["Greek",DATUM["Greek",SPHEROID["Bessel 1841",
    6377397.155,299.1528128,AUTHORITY["EPSG","7004"]],
    AUTHORITY["EPSG","6120"]],PRIMEM["Greenwich",0,
```

```
AUTHORITY["EPSG","8901"]],UNIT["degree",0.017453292519943278,
AUTHORITY["EPSG","9122"]],AXIS["Lat",NORTH],AXIS["Lon",EAST],
AUTHORITY["EPSG","4120"]]';
```


The grammar for SRS definitions is based on the grammar defined in OpenGIS Implementation Specification: Coordinate Transformation Services, Revision 1.00, OGC 01-009, January 12, 2001, Section 7.2. This specification is available at http://www.opengeospatial.org/standards/ct.

MySQL incorporates these changes to the specification:
- Only the <horz cs> production rule is implemented (that is, geographic and projected SRSs).
- There is an optional, nonstandard <authority> clause for <parameter>. This makes it possible to recognize projection parameters by authority instead of name.
- The specification does not make AXIS clauses mandatory in GEOGCS spatial reference system definitions. However, if there are no AXIS clauses, MySQL cannot determine whether a definition has axes in latitude-longitude order or longitude-latitude order. MySQL enforces the nonstandard requirement that each GEOGCS definition must include two AXIS clauses. One must be NORTH or SOUTH, and the other EAST or WEST. The AXIS clause order determines whether the definition has axes in latitude-longitude order or longitude-latitude order.
- SRS definitions may not contain newlines.

If an SRS definition specifies an authority code for the projection (which is recommended), an error occurs if the definition is missing mandatory parameters. In this case, the error message indicates what the problem is. The projection methods and mandatory parameters that MySQL supports are shown in Table 15.7, "Supported Spatial Reference System Projection Methods" and Table 15.8, "Spatial Reference System Projection Parameters".

The following table shows the projection methods that MySQL supports. MySQL permits unknown projection methods but cannot check the definition for mandatory parameters and cannot convert spatial data to or from an unknown projection. For detailed explanations of how each projection works, including formulas, see EPSG Guidance Note 7-2.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 15.7 Supported Spatial Reference System Projection Methods}
\begin{tabular}{|l|l|l|}
\hline EPSG Code & Projection Name & Mandatory Parameters (EPSG Codes) \\
\hline 1024 & Popular Visualisation Pseudo Mercator & 8801, 8802, 8806, 8807 \\
\hline 1027 & Lambert Azimuthal Equal Area (Spherical) & 8801, 8802, 8806, 8807 \\
\hline 1028 & Equidistant Cylindrical & 8823, 8802, 8806, 8807 \\
\hline 1029 & Equidistant Cylindrical (Spherical) & 8823, 8802, 8806, 8807 \\
\hline 1041 & Krovak (North Orientated) & 8811, 8833, 1036, 8818, 8819, 8806, 8807 \\
\hline 1042 & Krovak Modified & 8811, 8833, 1036, 8818, 8819, 8806, 8807, 8617, 8618, 1026, 1027, 1028, 1029, 1030, 1031, 1032, 1033, 1034, 1035 \\
\hline 1043 & Krovak Modified (North Orientated) & 8811, 8833, 1036, 8818, 8819, 8806, 8807, 8617, 8618, 1026, 1027, 1028, 1029, 1030, 1031, 1032, 1033, 1034, 1035 \\
\hline 1051 & Lambert Conic Conformal (2SP Michigan) & 8821, 8822, 8823, 8824, 8826, 8827, 1038 \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline EPSG Code & Projection Name & Mandatory Parameters (EPSG Codes) \\
\hline 1052 & Colombia Urban & 8801, 8802, 8806, 8807, 1039 \\
\hline 9801 & Lambert Conic Conformal (1SP) & 8801, 8802, 8805, 8806, 8807 \\
\hline 9802 & Lambert Conic Conformal (2SP) & 8821, 8822, 8823, 8824, 8826, 8827 \\
\hline 9803 & Lambert Conic Conformal (2SP Belgium) & 8821, 8822, 8823, 8824, 8826, 8827 \\
\hline 9804 & Mercator (variant A) & 8801, 8802, 8805, 8806, 8807 \\
\hline 9805 & Mercator (variant B) & 8823, 8802, 8806, 8807 \\
\hline 9806 & Cassini-Soldner & 8801, 8802, 8806, 8807 \\
\hline 9807 & Transverse Mercator & 8801, 8802, 8805, 8806, 8807 \\
\hline 9808 & Transverse Mercator (South Orientated) & 8801, 8802, 8805, 8806, 8807 \\
\hline 9809 & Oblique Stereographic & 8801, 8802, 8805, 8806, 8807 \\
\hline 9810 & Polar Stereographic (variant A) & 8801, 8802, 8805, 8806, 8807 \\
\hline 9811 & New Zealand Map Grid & 8801, 8802, 8806, 8807 \\
\hline 9812 & Hotine Oblique Mercator (variant A) & 8811, 8812, 8813, 8814, 8815, 8806, 8807 \\
\hline 9813 & Laborde Oblique Mercator & 8811, 8812, 8813, 8815, 8806, 8807 \\
\hline 9815 & Hotine Oblique Mercator (variant B) & 8811, 8812, 8813, 8814, 8815, 8816, 8817 \\
\hline 9816 & Tunisia Mining Grid & 8821, 8822, 8826, 8827 \\
\hline 9817 & Lambert Conic Near-Conformal & 8801, 8802, 8805, 8806, 8807 \\
\hline 9818 & American Polyconic & 8801, 8802, 8806, 8807 \\
\hline 9819 & Krovak & 8811, 8833, 1036, 8818, 8819, 8806, 8807 \\
\hline 9820 & Lambert Azimuthal Equal Area & 8801, 8802, 8806, 8807 \\
\hline 9822 & Albers Equal Area & 8821, 8822, 8823, 8824, 8826, 8827 \\
\hline 9824 & Transverse Mercator Zoned Grid System & 8801, 8830, 8831, 8805, 8806, 8807 \\
\hline 9826 & Lambert Conic Conformal (West Orientated) & 8801, 8802, 8805, 8806, 8807 \\
\hline 9828 & Bonne (South Orientated) & 8801, 8802, 8806, 8807 \\
\hline 9829 & Polar Stereographic (variant B) & 8832, 8833, 8806, 8807 \\
\hline 9830 & Polar Stereographic (variant C) & 8832, 8833, 8826, 8827 \\
\hline 9831 & Guam Projection & 8801, 8802, 8806, 8807 \\
\hline 9832 & Modified Azimuthal Equidistant & 8801, 8802, 8806, 8807 \\
\hline 9833 & Hyperbolic Cassini-Soldner & 8801, 8802, 8806, 8807 \\
\hline 9834 & Lambert Cylindrical Equal Area (Spherical) & 8823, 8802, 8806, 8807 \\
\hline 9835 & Lambert Cylindrical Equal Area & 8823, 8802, 8806, 8807 \\
\hline
\end{tabular}

The following table shows the projection parameters that MySQL recognizes. Recognition occurs primarily by authority code. If there is no authority code, MySQL falls back to case-insensitive string matching on the parameter name. For details about each parameter, look it up by code in the EPSG Online Registry.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 15.8 Spatial Reference System Projection Parameters}
\begin{tabular}{|l|l|l|}
\hline EPSG Code & Fallback Name (Recognized by MySQL) & EPSG Name \\
\hline 1026 & c1 & C1 \\
\hline 1027 & c2 & C2 \\
\hline 1028 & c3 & C3 \\
\hline 1029 & c4 & C4 \\
\hline 1030 & c5 & C5 \\
\hline 1031 & c6 & C6 \\
\hline 1032 & c7 & C7 \\
\hline 1033 & c8 & C8 \\
\hline 1034 & c9 & C9 \\
\hline 1035 & c10 & C10 \\
\hline 1036 & azimuth & Co-latitude of cone axis \\
\hline 1038 & ellipsoid_scale_factor & Ellipsoid scaling factor \\
\hline 1039 & projection_plane_height_at_origin & Projection plane origin height \\
\hline 8617 & evaluation_point_ordinate_1 & Ordinate 1 of evaluation point \\
\hline 8618 & evaluation_point_ordinate_2 & Ordinate 2 of evaluation point \\
\hline 8801 & latitude_of_origin & Latitude of natural origin \\
\hline 8802 & central_meridian & Longitude of natural origin \\
\hline 8805 & scale_factor & Scale factor at natural origin \\
\hline 8806 & false_easting & False easting \\
\hline 8807 & false_northing & False northing \\
\hline 8811 & latitude_of_center & Latitude of projection centre \\
\hline 8812 & longitude_of_center & Longitude of projection centre \\
\hline 8813 & azimuth & Azimuth of initial line \\
\hline 8814 & rectified_grid_angle & Angle from Rectified to Skew Grid \\
\hline 8815 & scale_factor & Scale factor on initial line \\
\hline 8816 & false_easting & Easting at projection centre \\
\hline 8817 & false_northing & Northing at projection centre \\
\hline 8818 & pseudo_standard_parallel_1 & Latitude of pseudo standard parallel \\
\hline 8819 & scale_factor & Scale factor on pseudo standard parallel \\
\hline 8821 & latitude_of_origin & Latitude of false origin \\
\hline 8822 & central_meridian & Longitude of false origin \\
\hline 8823 & standard_parallel_1, standard_parallel1 & Latitude of 1st standard parallel \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline EPSG Code & Fallback Name (Recognized by MySQL) & EPSG Name \\
\hline 8824 & standard_parallel_2, standard_parallel2 & Latitude of 2nd standard parallel \\
\hline 8826 & false_easting & Easting at false origin \\
\hline 8827 & false_northing & Northing at false origin \\
\hline 8830 & initial_longitude & Initial longitude \\
\hline 8831 & zone_width & Zone width \\
\hline 8832 & standard_parallel & Latitude of standard parallel \\
\hline 8833 & longitude_of_center & Longitude of origin \\
\hline
\end{tabular}

\subsection*{15.1.20 CREATE TABLE Statement}
```
CREATE [TEMPORARY] TABLE [IF NOT EXISTS] tbl_name
        (create_definition,...)
        [table_options]
        [partition_options]
CREATE [TEMPORARY] TABLE [IF NOT EXISTS] tbl_name
        [(create_definition,...)]
        [table_options]
        [partition_options]
        [IGNORE | REPLACE]
        [AS] query_expression
CREATE [TEMPORARY] TABLE [IF NOT EXISTS] tbl_name
        { LIKE old_tbl_name | (LIKE old_tbl_name) }
create_definition: {
        col_name column_definition
    | {INDEX | KEY} [index_name] [index_type] (key_part,...)
            [index_option] ...
    | {FULLTEXT | SPATIAL} [INDEX | KEY] [index_name] (key_part,...)
            [index_option] ...
    | [CONSTRAINT [symbol]] PRIMARY KEY
            [index_type] (key_part,...)
            [index_option] ...
    | [CONSTRAINT [symbol]] UNIQUE [INDEX | KEY]
            [index_name] [index_type] (key_part,...)
            [index_option] ...
    | [CONSTRAINT [symbol]] FOREIGN KEY
            [index_name] (col_name,...)
            reference_definition
    | check_constraint_definition
}
column_definition: {
        data_type [NOT NULL | NULL] [DEFAULT {literal | (expr)} ]
            [VISIBLE | INVISIBLE]
            [AUTO_INCREMENT] [UNIQUE [KEY]] [[PRIMARY] KEY]
            [COMMENT 'string']
            [COLLATE collation_name]
            [COLUMN_FORMAT {FIXED | DYNAMIC | DEFAULT}]
            [ENGINE_ATTRIBUTE [=] 'string']
            [SECONDARY_ENGINE_ATTRIBUTE [=] 'string']
            [STORAGE {DISK | MEMORY}]
            [reference_definition]
            [check_constraint_definition]
    | data_type
            [COLLATE collation_name]
            [GENERATED ALWAYS] AS (expr)
            [VIRTUAL | STORED] [NOT NULL | NULL]
            [VISIBLE | INVISIBLE]
            [UNIQUE [KEY]] [[PRIMARY] KEY]
            [COMMENT 'string']
            [reference_definition]
```

```
            [check_constraint_definition]
}
data_type:
        (see Chapter 13, Data Types)
key_part: {col_name [(length)] | (expr)} [ASC | DESC]
index_type:
        USING {BTREE | HASH}
index_option: {
        KEY_BLOCK_SIZE [=] value
    | index_type
    | WITH PARSER parser_name
    | COMMENT 'string'
    | {VISIBLE | INVISIBLE}
    |ENGINE_ATTRIBUTE [=] 'string'
    |SECONDARY_ENGINE_ATTRIBUTE [=] 'string'
}
check_constraint_definition:
        [CONSTRAINT [symbol]] CHECK (expr) [[NOT] ENFORCED]
reference_definition:
        REFERENCES tbl_name (key_part,...)
            [MATCH FULL | MATCH PARTIAL | MATCH SIMPLE]
            [ON DELETE reference_option]
            [ON UPDATE reference_option]
reference_option:
        RESTRICT | CASCADE | SET NULL | NO ACTION | SET DEFAULT
table_options:
        table_option [[,] table_option] ...
table_option: {
        AUTOEXTEND_SIZE [=] value
    | AUTO_INCREMENT [=] value
    | AVG_ROW_LENGTH [=] value
        [DEFAULT] CHARACTER SET [=] charset_name
        CHECKSUM [=] {0 | 1}
        [DEFAULT] COLLATE [=] collation_name
        COMMENT [=] 'string'
        COMPRESSION [=] {'ZLIB' | 'LZ4' | 'NONE'}
        CONNECTION [=] 'connect_string'
        {DATA | INDEX} DIRECTORY [=] 'absolute path to directory'
        DELAY_KEY_WRITE [=] {0 | 1}
        ENCRYPTION [=] {'Y' | 'N'}
        ENGINE [=] engine_name
        ENGINE_ATTRIBUTE [=] 'string'
        INSERT_METHOD [=] { NO | FIRST | LAST }
        KEY_BLOCK_SIZE [=] value
        MAX_ROWS [=] value
        MIN_ROWS [=] value
        PACK_KEYS [=] {0 | 1 | DEFAULT}
        PASSWORD [=] 'string'
        ROW_FORMAT [=] {DEFAULT | DYNAMIC | FIXED | COMPRESSED | REDUNDANT | COMPACT}
        START TRANSACTION
        SECONDARY_ENGINE_ATTRIBUTE [=] 'string'
        STATS_AUTO_RECALC [=] {DEFAULT | 0 | 1}
        STATS_PERSISTENT [=] {DEFAULT | 0 | 1}
        STATS_SAMPLE_PAGES [=] value
        tablespace_option
    | UNION [=] (tbl_name[,tbl_name]...)
}
partition_options:
        PARTITION BY
                { [LINEAR] HASH(expr)
                | [LINEAR] KEY [ALGORITHM={1 | 2}] (column_list)
                | RANGE{(expr) | COLUMNS(column_list)}
```

```
                | LIST{(expr) | COLUMNS(column_list)} }
        [PARTITIONS num]
        [SUBPARTITION BY
                { [LINEAR] HASH(expr)
                | [LINEAR] KEY [ALGORITHM={1 | 2}] (column_list) }
            [SUBPARTITIONS num]
        ]
        [(partition_definition [, partition_definition] ...)]
partition_definition:
        PARTITION partition_name
                [VALUES
                    {LESS THAN {(expr | value_list) | MAXVALUE}
                    |
                    IN (value_list)}]
                [[STORAGE] ENGINE [=] engine_name]
                [COMMENT [=] 'string' ]
                [DATA DIRECTORY [=] 'data_dir']
                [INDEX DIRECTORY [=] 'index_dir']
                [MAX_ROWS [=] max_number_of_rows]
                [MIN_ROWS [=] min_number_of_rows]
                [TABLESPACE [=] tablespace_name]
                [(subpartition_definition [, subpartition_definition] ...)]
subpartition_definition:
        SUBPARTITION logical_name
                [[STORAGE] ENGINE [=] engine_name]
                [COMMENT [=] 'string' ]
                [DATA DIRECTORY [=] 'data_dir']
                [INDEX DIRECTORY [=] 'index_dir']
                [MAX_ROWS [=] max_number_of_rows]
                [MIN_ROWS [=] min_number_of_rows]
                [TABLESPACE [=] tablespace_name]
tablespace_option:
        TABLESPACE tablespace_name [STORAGE DISK]
    | [TABLESPACE tablespace_name] STORAGE MEMORY
query_expression:
        SELECT ... (Some valid select or union statement)
```


CREATE TABLE creates a table with the given name. You must have the CREATE privilege for the table.

By default, tables are created in the default database, using the InnoDB storage engine. An error occurs if the table exists, if there is no default database, or if the database does not exist.

MySQL has no limit on the number of tables. The underlying file system may have a limit on the number of files that represent tables. Individual storage engines may impose engine-specific constraints. InnoDB permits up to 4 billion tables.

For information about the physical representation of a table, see Section 15.1.20.1, "Files Created by CREATE TABLE".

There are several aspects to the CREATE TABLE statement, described under the following topics in this section:
- Table Name
- Temporary Tables
- Table Cloning and Copying
- Column Data Types and Attributes
- Indexes, Foreign Keys, and CHECK Constraints
- Table Options
- Table Partitioning

\section*{Table Name}
- tbl_name

The table name can be specified as db_name.tbl_name to create the table in a specific database. This works regardless of whether there is a default database, assuming that the database exists. If you use quoted identifiers, quote the database and table names separately. For example, write ˋmydbˋ. ˋmytblˋ, not ˋmydb.mytblˋ.

Rules for permissible table names are given in Section 11.2, "Schema Object Names".
- IF NOT EXISTS

Prevents an error from occurring if the table exists. However, there is no verification that the existing table has a structure identical to that indicated by the CREATE TABLE statement.

\section*{Temporary Tables}

You can use the TEMPORARY keyword when creating a table. A TEMPORARY table is visible only within the current session, and is dropped automatically when the session is closed. For more information, see Section 15.1.20.2, "CREATE TEMPORARY TABLE Statement".

\section*{Table Cloning and Copying}
- LIKE

Use CREATE TABLE . . . LIKE to create an empty table based on the definition of another table, including any column attributes and indexes defined in the original table:

CREATE TABLE new_tbl LIKE orig_tbl;
For more information, see Section 15.1.20.3, "CREATE TABLE ... LIKE Statement".
- [AS] query_expression

To create one table from another, add a SELECT statement at the end of the CREATE TABLE statement:

CREATE TABLE new_tbl AS SELECT * FROM orig_tbl;
For more information, see Section 15.1.20.4, "CREATE TABLE ... SELECT Statement".
- IGNORE | REPLACE

The IGNORE and REPLACE options indicate how to handle rows that duplicate unique key values when copying a table using a SELECT statement.

For more information, see Section 15.1.20.4, "CREATE TABLE ... SELECT Statement".

\section*{Column Data Types and Attributes}

There is a hard limit of 4096 columns per table, but the effective maximum may be less for a given table and depends on the factors discussed in Section 10.4.7, "Limits on Table Column Count and Row Size".
- data_type
data_type represents the data type in a column definition. For a full description of the syntax available for specifying column data types, as well as information about the properties of each type, see Chapter 13, Data Types.
- AUTO_INCREMENT applies only to integer types.
- Character data types (CHAR, VARCHAR, the TEXT types, ENUM, SET, and any synonyms) can include CHARACTER SET to specify the character set for the column. CHARSET is a synonym for CHARACTER SET. A collation for the character set can be specified with the COLLATE attribute, along with any other attributes. For details, see Chapter 12, Character Sets, Collations, Unicode. Example:

CREATE TABLE t (c CHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin);
MySQL 8.4 interprets length specifications in character column definitions in characters. Lengths for BINARY and VARBINARY are in bytes.
- For CHAR, VARCHAR, BINARY, and VARBINARY columns, indexes can be created that use only the leading part of column values, using col_name(length) syntax to specify an index prefix length. BLOB and TEXT columns also can be indexed, but a prefix length must be given. Prefix lengths are given in characters for nonbinary string types and in bytes for binary string types. That is, index entries consist of the first length characters of each column value for CHAR, VARCHAR, and TEXT columns, and the first length bytes of each column value for BINARY, VARBINARY, and BLOB columns. Indexing only a prefix of column values like this can make the index file much smaller. For additional information about index prefixes, see Section 15.1.15, "CREATE INDEX Statement".

Only the InnoDB and MyISAM storage engines support indexing on BLOB and TEXT columns. For example:

CREATE TABLE test (blob_col BLOB, INDEX(blob_col(10)));
If a specified index prefix exceeds the maximum column data type size, CREATE TABLE handles the index as follows:
- For a nonunique index, either an error occurs (if strict SQL mode is enabled), or the index length is reduced to lie within the maximum column data type size and a warning is produced (if strict SQL mode is not enabled).
- For a unique index, an error occurs regardless of SQL mode because reducing the index length might enable insertion of nonunique entries that do not meet the specified uniqueness requirement.
- JSON columns cannot be indexed. You can work around this restriction by creating an index on a generated column that extracts a scalar value from the JSON column. See Indexing a Generated Column to Provide a JSON Column Index, for a detailed example.
- NOT NULL | NULL

If neither NULL nor NOT NULL is specified, the column is treated as though NULL had been specified.

In MySQL 8.4, only the InnoDB, MyISAM, and MEMORY storage engines support indexes on columns that can have NULL values. In other cases, you must declare indexed columns as NOT NULL or an error results.
- DEFAULT

Specifies a default value for a column. For more information about default value handling, including the case that a column definition includes no explicit DEFAULT value, see Section 13.6, "Data Type Default Values".

If the NO_ZERO_DATE or NO_ZERO_IN_DATE SQL mode is enabled and a date-valued default is not correct according to that mode, CREATE TABLE produces a warning if strict SQL mode is not enabled and an error if strict mode is enabled. For example, with NO_ZERO_IN_DATE enabled, c1 DATE DEFAULT '2010-00-00' produces a warning.
- VISIBLE, INVISIBLE

Specify column visibility. The default is VISIBLE if neither keyword is present. A table must have at least one visible column. Attempting to make all columns invisible produces an error. For more information, see Section 15.1.20.10, "Invisible Columns".
- AUTO_INCREMENT

An integer column can have the additional attribute AUTO_INCREMENT. When you insert a value of NULL (recommended) or 0 into an indexed AUTO_INCREMENT column, the column is set to the next sequence value. Typically this is value+1, where value is the largest value for the column currently in the table. AUTO_INCREMENT sequences begin with 1 .

To retrieve an AUTO_INCREMENT value after inserting a row, use the LAST_INSERT_ID( ) SQL function or the mysql_insert_id( ) C API function. See Section 14.15, "Information Functions", and mysql_insert_id().

If the NO_AUTO_VALUE_ON_ZERO SQL mode is enabled, you can store 0 in AUTO_INCREMENT columns as 0 without generating a new sequence value. See Section 7.1.11, "Server SQL Modes".

There can be only one AUTO_INCREMENT column per table, it must be indexed, and it cannot have a DEFAULT value. An AUTO_INCREMENT column works properly only if it contains only positive values. Inserting a negative number is regarded as inserting a very large positive number. This is done to avoid precision problems when numbers "wrap" over from positive to negative and also to ensure that you do not accidentally get an AUTO_INCREMENT column that contains 0 .

For MyISAM tables, you can specify an AUTO_INCREMENT secondary column in a multiple-column key. See Section 5.6.9, "Using AUTO_INCREMENT".

To make MySQL compatible with some ODBC applications, you can find the AUTO_INCREMENT value for the last inserted row with the following query:

SELECT * FROM tbl_name WHERE auto_col IS NULL

This method requires that sql_auto_is_null variable is not set to 0. See Section 7.1.8, "Server System Variables".

For information about InnoDB and AUTO_INCREMENT, see Section 17.6.1.6, "AUTO_INCREMENT Handling in InnoDB". For information about AUTO_INCREMENT and MySQL Replication, see Section 19.5.1.1, "Replication and AUTO_INCREMENT".
- COMMENT

A comment for a column can be specified with the COMMENT option, up to 1024 characters long. The comment is displayed by the SHOW CREATE TABLE and SHOW FULL COLUMNS statements. It is also shown in the COLUMN_COMMENT column of the Information Schema COLUMNS table.
- COLUMN_FORMAT

In NDB Cluster, it is also possible to specify a data storage format for individual columns of NDB tables using COLUMN_FORMAT. Permissible column formats are FIXED, DYNAMIC, and DEFAULT. FIXED is used to specify fixed-width storage, DYNAMIC permits the column to be variable-width,
and DEFAULT causes the column to use fixed-width or variable-width storage as determined by the column's data type (possibly overridden by a ROW_FORMAT specifier).

For NDB tables, the default value for COLUMN_FORMAT is FIXED.
In NDB Cluster, the maximum possible offset for a column defined with COLUMN_FORMAT=FIXED is 8188 bytes. For more information and possible workarounds, see Section 25.2.7.5, "Limits Associated with Database Objects in NDB Cluster".

COLUMN_FORMAT currently has no effect on columns of tables using storage engines other than NDB. MySQL 8.4 silently ignores COLUMN_FORMAT.
- ENGINE_ATTRIBUTE and SECONDARY_ENGINE_ATTRIBUTE options are used to specify column attributes for primary and secondary storage engines. The options are reserved for future use.

The value assigned to this option is a string literal containing a valid JSON document or an empty string ("). Invalid JSON is rejected.

CREATE TABLE t1 (c1 INT ENGINE_ATTRIBUTE='\{"key":"value"\}');
ENGINE_ATTRIBUTE and SECONDARY_ENGINE_ATTRIBUTE values can be repeated without error. In this case, the last specified value is used.

ENGINE_ATTRIBUTE and SECONDARY_ENGINE_ATTRIBUTE values are not checked by the server, nor are they cleared when the table's storage engine is changed.
- STORAGE

For NDB tables, it is possible to specify whether the column is stored on disk or in memory by using a STORAGE clause. STORAGE DISK causes the column to be stored on disk, and STORAGE MEMORY causes in-memory storage to be used. The CREATE TABLE statement used must still include a TABLESPACE clause:
```
mysql> CREATE TABLE t1 (
    -> c1 INT STORAGE DISK,
    -> c2 INT STORAGE MEMORY
    -> ) ENGINE NDB;
ERROR 1005 (HY000): Can't create table 'c.t1' (errno: 140)
mysql> CREATE TABLE t1 (
    -> c1 INT STORAGE DISK,
    -> c2 INT STORAGE MEMORY
    -> ) TABLESPACE ts_1 ENGINE NDB;
Query OK, 0 rows affected (1.06 sec)
```


For NDB tables, STORAGE DEFAULT is equivalent to STORAGE MEMORY.
The STORAGE clause has no effect on tables using storage engines other than NDB. The STORAGE keyword is supported only in the build of mysqld that is supplied with NDB Cluster; it is not recognized in any other version of MySQL, where any attempt to use the STORAGE keyword causes a syntax error.
- GENERATED ALWAYS

Used to specify a generated column expression. For information about generated columns, see Section 15.1.20.8, "CREATE TABLE and Generated Columns".

Stored generated columns can be indexed. InnoDB supports secondary indexes on virtual generated columns. See Section 15.1.20.9, "Secondary Indexes and Generated Columns".

\section*{Indexes, Foreign Keys, and CHECK Constraints}

Several keywords apply to creation of indexes, foreign keys, and CHECK constraints. For general background in addition to the following descriptions, see Section 15.1.15, "CREATE INDEX

Statement", Section 15.1.20.5, "FOREIGN KEY Constraints", and Section 15.1.20.6, "CHECK Constraints".
- CONSTRAINT symbol

The CONSTRAINT symbol clause may be given to name a constraint. If the clause is not given, or a symbol is not included following the CONSTRAINT keyword, MySQL automatically generates a constraint name, with the exception noted below. The symbol value, if used, must be unique per schema (database), per constraint type. A duplicate symbol results in an error. See also the discussion about length limits of generated constraint identifiers at Section 11.2.1, "Identifier Length Limits".

\section*{Note}

If the CONSTRAINT symbol clause is not given in a foreign key definition, or a symbol is not included following the CONSTRAINT keyword, MySQL automatically generates a constraint name.

The SQL standard specifies that all types of constraints (primary key, unique index, foreign key, check) belong to the same namespace. In MySQL, each constraint type has its own namespace per schema. Consequently, names for each type of constraint must be unique per schema, but constraints of different types can have the same name.
- PRIMARY KEY

A unique index where all key columns must be defined as NOT NULL. If they are not explicitly declared as NOT NULL, MySQL declares them so implicitly (and silently). A table can have only one PRIMARY KEY. The name of a PRIMARY KEY is always PRIMARY, which thus cannot be used as the name for any other kind of index.

If you do not have a PRIMARY KEY and an application asks for the PRIMARY KEY in your tables, MySQL returns the first UNIQUE index that has no NULL columns as the PRIMARY KEY.

In InnoDB tables, keep the PRIMARY KEY short to minimize storage overhead for secondary indexes. Each secondary index entry contains a copy of the primary key columns for the corresponding row. (See Section 17.6.2.1, "Clustered and Secondary Indexes".)

In the created table, a PRIMARY KEY is placed first, followed by all UNIQUE indexes, and then the nonunique indexes. This helps the MySQL optimizer to prioritize which index to use and also more quickly to detect duplicated UNIQUE keys.

A PRIMARY KEY can be a multiple-column index. However, you cannot create a multiple-column index using the PRIMARY KEY key attribute in a column specification. Doing so only marks that single column as primary. You must use a separate PRIMARY KEY (key_part, . . . ) clause.

If a table has a PRIMARY KEY or UNIQUE NOT NULL index that consists of a single column that has an integer type, you can use _rowid to refer to the indexed column in SELECT statements, as described in Unique Indexes.

In MySQL, the name of a PRIMARY KEY is PRIMARY. For other indexes, if you do not assign a name, the index is assigned the same name as the first indexed column, with an optional suffix ( $\_2, \ldots 3, \ldots$ ) to make it unique. You can see index names for a table using SHOW INDEX FROM tbl_name. See Section 15.7.7.23, "SHOW INDEX Statement".
- KEY | INDEX

KEY is normally a synonym for INDEX. The key attribute PRIMARY KEY can also be specified as just KEY when given in a column definition. This was implemented for compatibility with other database systems.
- UNIQUE

A UNIQUE index creates a constraint such that all values in the index must be distinct. An error occurs if you try to add a new row with a key value that matches an existing row. For all engines, a UNIQUE index permits multiple NULL values for columns that can contain NULL. If you specify a prefix value for a column in a UNIQUE index, the column values must be unique within the prefix length.

If a table has a PRIMARY KEY or UNIQUE NOT NULL index that consists of a single column that has an integer type, you can use _rowid to refer to the indexed column in SELECT statements, as described in Unique Indexes.
- FULLTEXT

A FULLTEXT index is a special type of index used for full-text searches. Only the InnoDB and MyISAM storage engines support FULLTEXT indexes. They can be created only from CHAR, VARCHAR, and TEXT columns. Indexing always happens over the entire column; column prefix indexing is not supported and any prefix length is ignored if specified. See Section 14.9, "FullText Search Functions", for details of operation. A WITH PARSER clause can be specified as an index_option value to associate a parser plugin with the index if full-text indexing and searching operations need special handling. This clause is valid only for FULLTEXT indexes. InnoDB and MyISAM support full-text parser plugins. See Full-Text Parser Plugins and Writing Full-Text Parser Plugins for more information.
- SPATIAL

You can create SPATIAL indexes on spatial data types. Spatial types are supported only for InnoDB and MyISAM tables, and indexed columns must be declared as NOT NULL. See Section 13.4, "Spatial Data Types".
- FOREIGN KEY

MySQL supports foreign keys, which let you cross-reference related data across tables, and foreign key constraints, which help keep this spread-out data consistent. For definition and option information, see reference_definition, and reference_option.

Partitioned tables employing the InnoDB storage engine do not support foreign keys. See Section 26.6, "Restrictions and Limitations on Partitioning", for more information.
- CHECK

The CHECK clause enables the creation of constraints to be checked for data values in table rows. See Section 15.1.20.6, "CHECK Constraints".
- key_part
- A key_part specification can end with ASC or DESC to specify whether index values are stored in ascending or descending order. The default is ascending if no order specifier is given.
- Prefixes, defined by the length attribute, can be up to 767 bytes long for InnoDB tables that use the REDUNDANT or COMPACT row format. The prefix length limit is 3072 bytes for InnoDB tables that use the DYNAMIC or COMPRESSED row format. For MyISAM tables, the prefix length limit is 1000 bytes.

Prefix limits are measured in bytes. However, prefix lengths for index specifications in CREATE TABLE, ALTER TABLE, and CREATE INDEX statements are interpreted as number of characters for nonbinary string types (CHAR, VARCHAR, TEXT) and number of bytes for binary string types (BINARY, VARBINARY, BLOB). Take this into account when specifying a prefix length for a nonbinary string column that uses a multibyte character set.
- The expr for a key_part specification can take the form (CAST json_path AS type ARRAY) to create a multi-valued index on a JSON column. Multi-Valued Indexes, provides detailed
information regarding creation of, usage of, and restrictions and limitations on multi-valued indexes.
- index_type

Some storage engines permit you to specify an index type when creating an index. The syntax for the index_type specifier is USING type_name.

Example:
```
CREATE TABLE lookup
    (id INT, INDEX USING BTREE (id)
) ENGINE = MEMORY;
```


The preferred position for USING is after the index column list. It can be given before the column list, but support for use of the option in that position is deprecated and you should expect it to be removed in a future MySQL release.
- index_option
index_option values specify additional options for an index.
- KEY_BLOCK_SIZE

For MyISAM tables, KEY_BLOCK_SIZE optionally specifies the size in bytes to use for index key blocks. The value is treated as a hint; a different size could be used if necessary. A KEY_BLOCK_SIZE value specified for an individual index definition overrides the table-level KEY_BLOCK_SIZE value.

For information about the table-level KEY_BLOCK_SIZE attribute, see Table Options.
- WITH PARSER

The WITH PARSER option can be used only with FULLTEXT indexes. It associates a parser plugin with the index if full-text indexing and searching operations need special handling. InnoDB and MyISAM support full-text parser plugins. If you have a MyISAM table with an associated full-text parser plugin, you can convert the table to InnoDB using ALTER TABLE.
- COMMENT

Index definitions can include an optional comment of up to 1024 characters.
You can set the InnoDB MERGE_THRESHOLD value for an individual index using the index_option COMMENT clause. See Section 17.8.11, "Configuring the Merge Threshold for Index Pages".
- VISIBLE, INVISIBLE

Specify index visibility. Indexes are visible by default. An invisible index is not used by the optimizer. Specification of index visibility applies to indexes other than primary keys (either explicit or implicit). For more information, see Section 10.3.12, "Invisible Indexes".
- ENGINE_ATTRIBUTE and SECONDARY_ENGINE_ATTRIBUTE options are used to specify index attributes for primary and secondary storage engines. The options are reserved for future use.

For more information about permissible index_option values, see Section 15.1.15, "CREATE INDEX Statement". For more information about indexes, see Section 10.3.1, "How MySQL Uses Indexes".
- reference_definition

For reference_definition syntax details and examples, see Section 15.1.20.5, "FOREIGN KEY Constraints".

InnoDB and NDB tables support checking of foreign key constraints. The columns of the referenced table must always be explicitly named. Both ON DELETE and ON UPDATE actions on foreign keys are supported. For more detailed information and examples, see Section 15.1.20.5, "FOREIGN KEY Constraints".

For other storage engines, MySQL Server parses and ignores the FOREIGN KEY syntax in CREATE TABLE statements.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2556.jpg?height=118&width=103&top_left_y=785&top_left_x=338)

\section*{Important}

For users familiar with the ANSI/ISO SQL Standard, please note that no storage engine, including InnoDB, recognizes or enforces the MATCH clause used in referential integrity constraint definitions. Use of an explicit MATCH clause does not have the specified effect, and also causes ON DELETE and ON UPDATE clauses to be ignored. For these reasons, specifying MATCH should be avoided.

The MATCH clause in the SQL standard controls how NULL values in a composite (multiple-column) foreign key are handled when comparing to a primary key. InnoDB essentially implements the semantics defined by MATCH SIMPLE, which permit a foreign key to be all or partially NULL. In that case, the (child table) row containing such a foreign key is permitted to be inserted, and does not match any row in the referenced (parent) table. It is possible to implement other semantics using triggers.

Additionally, MySQL requires that the referenced columns be indexed for performance. However, InnoDB does not enforce any requirement that the referenced columns be declared UNIQUE or NOT NULL. The handling of foreign key references to nonunique keys or keys that contain NULL values is not well defined for operations such as UPDATE or DELETE CASCADE. You are advised to use foreign keys that reference only keys that are both UNIQUE (or PRIMARY) and NOT NULL.

MySQL parses but ignores "inline REFERENCES specifications" (as defined in the SQL standard) where the references are defined as part of the column specification. MySQL accepts REFERENCES clauses only when specified as part of a separate FOREIGN KEY specification. For more information, see Section 1.7.2.3, "FOREIGN KEY Constraint Differences".
- reference_option

For information about the RESTRICT, CASCADE, SET NULL, NO ACTION, and SET DEFAULT options, see Section 15.1.20.5, "FOREIGN KEY Constraints".

\section*{Table Options}

Table options are used to optimize the behavior of the table. In most cases, you do not have to specify any of them. These options apply to all storage engines unless otherwise indicated. Options that do not apply to a given storage engine may be accepted and remembered as part of the table definition. Such options then apply if you later use ALTER TABLE to convert the table to use a different storage engine.
- ENGINE

Specifies the storage engine for the table, using one of the names shown in the following table. The engine name can be unquoted or quoted. The quoted name 'DEFAULT' is recognized but ignored.

\begin{tabular}{|l|l|}
\hline Storage Engine & Description \\
\hline InnoDB & Transaction-safe tables with row locking and foreign keys. The default storage engine for new tables. See Chapter 17, The InnoDB Storage Engine, and in particular Section 17.1, "Introduction to InnoDB" if you have MySQL experience but are new to InnoDB. \\
\hline MyISAM & The binary portable storage engine that is primarily used for read-only or read-mostly workloads. See Section 18.2, "The MyISAM Storage Engine". \\
\hline MEMORY & The data for this storage engine is stored only in memory. See Section 18.3, "The MEMORY Storage Engine". \\
\hline CSV & Tables that store rows in comma-separated values format. See Section 18.4, "The CSV Storage Engine". \\
\hline ARCHIVE & The archiving storage engine. See Section 18.5, "The ARCHIVE Storage Engine". \\
\hline EXAMPLE & An example engine. See Section 18.9, "The EXAMPLE Storage Engine". \\
\hline FEDERATED & Storage engine that accesses remote tables. See Section 18.8, "The FEDERATED Storage Engine". \\
\hline HEAP & This is a synonym for MEMORY. \\
\hline MERGE & A collection of MyISAM tables used as one table. Also known as MRG_MyISAM. See Section 18.7, "The MERGE Storage Engine". \\
\hline NDB & Clustered, fault-tolerant, memory-based tables, supporting transactions and foreign keys. Also known as NDBCLUSTER. See Chapter 25, MySQL NDB Cluster 8.4. \\
\hline
\end{tabular}

By default, if a storage engine is specified that is not available, the statement fails with an error. You can override this behavior by removing NO_ENGINE_SUBSTITUTION from the server SQL mode (see Section 7.1.11, "Server SQL Modes") so that MySQL allows substitution of the specified engine with the default storage engine instead. Normally in such cases, this is InnoDB, which is the default value for the default_storage_engine system variable. When NO_ENGINE_SUBSTITUTION is disabled, a warning occurs if the storage engine specification is not honored.
- AUTOEXTEND_SIZE

Defines the amount by which InnoDB extends the size of the tablespace when it becomes full. The setting must be a multiple of 4 MB . The default setting is 0 , which causes the tablespace to be extended according to the implicit default behavior. For more information, see Section 17.6.3.9, "Tablespace AUTOEXTEND_SIZE Configuration".
- AUTO_INCREMENT

The initial AUTO_INCREMENT value for the table. In MySQL 8.4, this works for MyISAM, MEMORY, InnoDB, and ARCHIVE tables. To set the first auto-increment value for engines that do not support
the AUTO_INCREMENT table option, insert a "dummy" row with a value one less than the desired value after creating the table, and then delete the dummy row.

For engines that support the AUTO_INCREMENT table option in CREATE TABLE statements, you can also use ALTER TABLE tbl_name AUTO_INCREMENT $=N$ to reset the AUTO_INCREMENT value. The value cannot be set lower than the maximum value currently in the column.

\section*{- AVG_ROW_LENGTH}

An approximation of the average row length for your table. You need to set this only for large tables with variable-size rows.

When you create a MyISAM table, MySQL uses the product of the MAX_ROWS and AVG_ROW_LENGTH options to decide how big the resulting table is. If you don't specify either option, the maximum size for MyISAM data and index files is 256 TB by default. (If your operating system does not support files that large, table sizes are constrained by the file size limit.) If you want to keep down the pointer sizes to make the index smaller and faster and you don't really need big files, you can decrease the default pointer size by setting the myisam_data_pointer_size system variable. (See Section 7.1.8, "Server System Variables".) If you want all your tables to be able to grow above the default limit and are willing to have your tables slightly slower and larger than necessary, you can increase the default pointer size by setting this variable. Setting the value to 7 permits table sizes up to $65,536 \mathrm{~TB}$.
- [DEFAULT] CHARACTER SET

Specifies a default character set for the table. CHARSET is a synonym for CHARACTER SET. If the character set name is DEFAULT, the database character set is used.
- CHECKSUM

Set this to 1 if you want MySQL to maintain a live checksum for all rows (that is, a checksum that MySQL updates automatically as the table changes). This makes the table a little slower to update, but also makes it easier to find corrupted tables. The CHECKSUM TABLE statement reports the checksum. (MyISAM only.)
- [DEFAULT] COLLATE

Specifies a default collation for the table.
- COMMENT

A comment for the table, up to 2048 characters long.
You can set the InnoDB MERGE_THRESHOLD value for a table using the table_option COMMENT clause. See Section 17.8.11, "Configuring the Merge Threshold for Index Pages".

Setting NDB_TABLE options. The table comment in a CREATE TABLE that creates an NDB table or an ALTER TABLE statement which alters one can also be used to specify one to four of the NDB_TABLE options NOLOGGING, READ_BACKUP, PARTITION_BALANCE, or FULLY_REPLICATED as a set of name-value pairs, separated by commas if need be, immediately following the string NDB_TABLE= that begins the quoted comment text. An example statement using this syntax is shown here (emphasized text):
```
CREATE TABLE t1 (
    C1 INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    c2 VARCHAR(100),
    c3 VARCHAR(100) )
ENGINE=NDB
```


COMMENT="NDB_TABLE=READ_BACKUP=0,PARTITION_BALANCE=FOR_RP_BY_NODE";
Spaces are not permitted within the quoted string. The string is case-insensitive.
The comment is displayed as part of the output of SHOW CREATE TABLE. The text of the comment is also available as the TABLE_COMMENT column of the MySQL Information Schema TABLES table.

This comment syntax is also supported with ALTER TABLE statements for NDB tables. Keep in mind that a table comment used with ALTER TABLE replaces any existing comment which the table might have had previously.

Setting the MERGE_THRESHOLD option in table comments is not supported for NDB tables (it is ignored).

For complete syntax information and examples, see Section 15.1.20.12, "Setting NDB Comment Options".
- COMPRESSION

The compression algorithm used for page level compression for InnoDB tables. Supported values include Zlib, LZ4, and None. The COMPRESSION attribute was introduced with the transparent page compression feature. Page compression is only supported with InnoDB tables that reside in file-pertable tablespaces, and is only available on Linux and Windows platforms that support sparse files and hole punching. For more information, see Section 17.9.2, "InnoDB Page Compression".
- CONNECTION

The connection string for a FEDERATED table.
Note
Older versions of MySQL used a COMMENT option for the connection string.
- DATA DIRECTORY, INDEX DIRECTORY

For InnoDB, the DATA DIRECTORY='directory' clause permits creating tables outside of the data directory. The innodb_file_per_table variable must be enabled to use the DATA DIRECTORY clause. The full directory path must be specified, and known to InnodB. For more information, see Section 17.6.1.2, "Creating Tables Externally".

When creating MyISAM tables, you can use the DATA DIRECTORY='directory' clause, the INDEX DIRECTORY='directory' clause, or both. They specify where to put a MyISAM table's data file and index file, respectively. Unlike InnoDB tables, MySQL does not create subdirectories that correspond to the database name when creating a MyISAM table with a DATA DIRECTORY or INDEX DIRECTORY option. Files are created in the directory that is specified.

You must have the FILE privilege to use the DATA DIRECTORY or INDEX DIRECTORY table option.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2559.jpg?height=181&width=273&top_left_y=2234&top_left_x=397)

\section*{Important}

Table-level DATA DIRECTORY and INDEX DIRECTORY options are ignored for partitioned tables. (Bug \#32091)

These options work only when you are not using the --skip-symbolic-links option. Your operating system must also have a working, thread-safe realpath ( ) call. See Section 10.12.2.2, "Using Symbolic Links for MyISAM Tables on Unix", for more complete information.

If a MyISAM table is created with no DATA DIRECTORY option, the . MYD file is created in the database directory. By default, if MyISAM finds an existing . MYD file in this case, it overwrites it. The same applies to . MYI files for tables created with no INDEX DIRECTORY option. To suppress this
behavior, start the server with the --keep_files_on_create option, in which case MyISAM does not overwrite existing files and returns an error instead.

If a MyISAM table is created with a DATA DIRECTORY or INDEX DIRECTORY option and an existing . MYD or . MYI file is found, MyISAM always returns an error, and does not overwrite a file in the specified directory.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2560.jpg?height=117&width=99&top_left_y=539&top_left_x=342)
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2560.jpg?height=222&width=30&top_left_y=532&top_left_x=571)

\section*{Important}

You cannot use path names that contain the MySQL data directory with DATA DIRECTORY or INDEX DIRECTORY. This includes partitioned tables and individual table partitions. (See Bug \#32167.)

\section*{- DELAY_KEY_WRITE}

Set this to 1 if you want to delay key updates for the table until the table is closed. See the description of the delay_key_write system variable in Section 7.1.8, "Server System Variables". (MyISAM only.)
- ENCRYPTION

The ENCRYPTION clause enables or disables page-level data encryption for an InnoDB table. A keyring plugin must be installed and configured before encryption can be enabled. The ENCRYPTION clause can be specified when creating a table in an a file-per-table tablespace, or when creating a table in a general tablespace.

The ENCRYPTION option is supported only by the InnoDB storage engine; thus it works only if the default storage engine is InnoDB, or if the CREATE TABLE statement also specifies ENGINE=InnoDB. Otherwise the statement is rejected with ER_CHECK_NOT_IMPLEMENTED.

A table inherits the default schema encryption if an ENCRYPTION clause is not specified. If the table_encryption_privilege_check variable is enabled, the TABLE_ENCRYPTION_ADMIN privilege is required to create a table with an ENCRYPTION clause setting that differs from the default schema encryption. When creating a table in a general tablespace, table and tablespace encryption must match.

Specifying an ENCRYPTION clause with a value other than ' N ' or ' ' is not permitted when using a storage engine that does not support encryption.

For more information, see Section 17.13, "InnoDB Data-at-Rest Encryption".
- The ENGINE_ATTRIBUTE and SECONDARY_ENGINE_ATTRIBUTE options are used to specify table attributes for primary and secondary storage engines. The options are reserved for future use.

The value assigned to either of these options must be a string literal containing a valid JSON document or an empty string ("). Invalid JSON is rejected.

CREATE TABLE t1 (c1 INT) ENGINE_ATTRIBUTE='\{"key":"value"\}';
ENGINE_ATTRIBUTE and SECONDARY_ENGINE_ATTRIBUTE values can be repeated without error. In this case, the last specified value is used.

ENGINE_ATTRIBUTE and SECONDARY_ENGINE_ATTRIBUTE values are not checked by the server, nor are they cleared when the table's storage engine is changed.
- INSERT_METHOD

If you want to insert data into a MERGE table, you must specify with INSERT_METHOD the table into which the row should be inserted. INSERT_METHOD is an option useful for MERGE tables only. Use a value of FIRST or LAST to have inserts go to the first or last table, or a value of NO to prevent inserts. See Section 18.7, "The MERGE Storage Engine".
- KEY_BLOCK_SIZE

For MyISAM tables, KEY_BLOCK_SIZE optionally specifies the size in bytes to use for index key blocks. The value is treated as a hint; a different size could be used if necessary. A KEY_BLOCK_SIZE value specified for an individual index definition overrides the table-level KEY_BLOCK_SIZE value.

For InnoDB tables, KEY_BLOCK_SIZE specifies the page size in kilobytes to use for compressed InnoDB tables. The KEY_BLOCK_SIZE value is treated as a hint; a different size could be used by InnoDB if necessary. KEY_BLOCK_SIZE can only be less than or equal to the innodb_page_size value. A value of 0 represents the default compressed page size, which is half of the innodb_page_size value. Depending on innodb_page_size, possible KEY_BLOCK_SIZE values include $0,1,2,4,8$, and 16 . See Section 17.9.1, "InnoDB Table Compression" for more information.

Oracle recommends enabling innodb_strict_mode when specifying KEY_BLOCK_SIZE for InnoDB tables. When innodb_strict_mode is enabled, specifying an invalid KEY_BLOCK_SIZE value returns an error. If innodb_strict_mode is disabled, an invalid KEY_BLOCK_SIZE value results in a warning, and the KEY_BLOCK_SIZE option is ignored.

The Create_options column in response to SHOW TABLE STATUS reports the actual KEY_BLOCK_SIZE used by the table, as does SHOW CREATE TABLE.

InnoDB only supports KEY_BLOCK_SIZE at the table level.
KEY_BLOCK_SIZE is not supported with 32 KB and 64 KB innodb_page_size values. InnoDB table compression does not support these pages sizes.

InnoDB does not support the KEY_BLOCK_SIZE option when creating temporary tables.
- MAX_ROWS

The maximum number of rows you plan to store in the table. This is not a hard limit, but rather a hint to the storage engine that the table must be able to store at least this many rows.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2561.jpg?height=120&width=108&top_left_y=1699&top_left_x=397)

\section*{Important}

The use of MAX_ROWS with NDB tables to control the number of table partitions is deprecated. It remains supported in later versions for backward compatibility, but is subject to removal in a future release. Use PARTITION_BALANCE instead; see Setting NDB_TABLE options.

The NDB storage engine treats this value as a maximum. If you plan to create very large NDB Cluster tables (containing millions of rows), you should use this option to insure that NDB allocates sufficient number of index slots in the hash table used for storing hashes of the table's primary keys by setting MAX_ROWS = 2 * rows, where rows is the number of rows that you expect to insert into the table.

The maximum MAX_ROWS value is 4294967295; larger values are truncated to this limit.
- MIN_ROWS

The minimum number of rows you plan to store in the table. The MEMORY storage engine uses this option as a hint about memory use.
- PACK_KEYS

Takes effect only with MyISAM tables. Set this option to 1 if you want to have smaller indexes. This usually makes updates slower and reads faster. Setting the option to 0 disables all packing of
keys. Setting it to DEFAULT tells the storage engine to pack only long CHAR, VARCHAR, BINARY, or VARBINARY columns.

If you do not use PACK_KEYS, the default is to pack strings, but not numbers. If you use PACK_KEYS=1, numbers are packed as well.

When packing binary number keys, MySQL uses prefix compression:
- Every key needs one extra byte to indicate how many bytes of the previous key are the same for the next key.
- The pointer to the row is stored in high-byte-first order directly after the key, to improve compression.

This means that if you have many equal keys on two consecutive rows, all following "same" keys usually only take two bytes (including the pointer to the row). Compare this to the ordinary case where the following keys takes storage_size_for_key + pointer_size (where the pointer size is usually 4). Conversely, you get a significant benefit from prefix compression only if you have many numbers that are the same. If all keys are totally different, you use one byte more per key, if the key is not a key that can have NULL values. (In this case, the packed key length is stored in the same byte that is used to mark if a key is NULL.)
- PASSWORD

This option is unused.
- ROW_FORMAT

Defines the physical format in which the rows are stored.
When creating a table with strict mode disabled, the storage engine's default row format is used if the specified row format is not supported. The actual row format of the table is reported in the Row_format column in response to SHOW TABLE STATUS. The Create_options column shows the row format that was specified in the CREATE TABLE statement, as does SHOW CREATE TABLE.

Row format choices differ depending on the storage engine used for the table.
For InnoDB tables:
- The default row format is defined by innodb_default_row_format, which has a default setting of DYNAMIC. The default row format is used when the ROW_FORMAT option is not defined or when ROW_FORMAT=DEFAULT is used.

If the ROW_FORMAT option is not defined, or if ROW_FORMAT=DEFAULT is used, operations that rebuild a table also silently change the row format of the table to the default defined by innodb_default_row_format. For more information, see Defining the Row Format of a Table.
- For more efficient InnoDB storage of data types, especially BLOB types, use the DYNAMIC. See DYNAMIC Row Format for requirements associated with the DYNAMIC row format.
- To enable compression for InnoDB tables, specify ROW_FORMAT=COMPRESSED. The ROW_FORMAT=COMPRESSED option is not supported when creating temporary tables. See

Section 17.9, "InnoDB Table and Page Compression" for requirements associated with the COMPRESSED row format.
- The row format used in older versions of MySQL can still be requested by specifying the REDUNDANT row format.
- When you specify a non-default ROW_FORMAT clause, consider also enabling the innodb_strict_mode configuration option.
- ROW_FORMAT=FIXED is not supported. If ROW_FORMAT=FIXED is specified while innodb_strict_mode is disabled, InnoDB issues a warning and assumes ROW_FORMAT=DYNAMIC. If ROW_FORMAT=FIXED is specified while innodb_strict_mode is enabled, which is the default, InnoDB returns an error.
- For additional information about InnoDB row formats, see Section 17.10, "InnoDB Row Formats".

For MyISAM tables, the option value can be FIXED or DYNAMIC for static or variable-length row format. myisampack sets the type to COMPRESSED. See Section 18.2.3, "MyISAM Table Storage Formats".

For NDB tables, the default ROW_FORMAT is DYNAMIC.

\section*{- START TRANSACTION}

This is an internal-use table option, used to permit CREATE TABLE . . . SELECT to be logged as a single, atomic transaction in the binary log when using row-based replication with a storage engine that supports atomic DDL. Only BINLOG, COMMIT, and ROLLBACK statements are permitted after CREATE TABLE ... START TRANSACTION. For related information, see Section 15.1.1, "Atomic Data Definition Statement Support".
- STATS_AUTO_RECALC

Specifies whether to automatically recalculate persistent statistics for an InnoDB table. The value DEFAULT causes the persistent statistics setting for the table to be determined by the innodb_stats_auto_recalc configuration option. The value 1 causes statistics to be recalculated when $10 \%$ of the data in the table has changed. The value 0 prevents automatic recalculation for this table; with this setting, issue an ANALYZE TABLE statement to recalculate the statistics after making substantial changes to the table. For more information about the persistent statistics feature, see Section 17.8.10.1, "Configuring Persistent Optimizer Statistics Parameters".
- STATS_PERSISTENT

Specifies whether to enable persistent statistics for an InnoDB table. The value DEFAULT causes the persistent statistics setting for the table to be determined by the innodb_stats_persistent configuration option. The value 1 enables persistent statistics for the table, while the value 0 turns off this feature. After enabling persistent statistics through a CREATE TABLE or ALTER TABLE statement, issue an ANALYZE TABLE statement to calculate the statistics, after loading representative data into the table. For more information about the persistent statistics feature, see Section 17.8.10.1, "Configuring Persistent Optimizer Statistics Parameters".
- STATS_SAMPLE_PAGES

The number of index pages to sample when estimating cardinality and other statistics for an indexed column, such as those calculated by ANALYZE TABLE. For more information, see Section 17.8.10.1, "Configuring Persistent Optimizer Statistics Parameters".
- TABLESPACE

The TABLESPACE clause can be used to create an InnoDB table in an existing general tablespace, a file-per-table tablespace, or the system tablespace.

\footnotetext{
CREATE TABLE tbl_name ... TABLESPACE [=] tablespace_name
}

The general tablespace that you specify must exist prior to using the TABLESPACE clause. For information about general tablespaces, see Section 17.6.3.3, "General Tablespaces".

The tablespace_name is a case-sensitive identifier. It may be quoted or unquoted. The forward slash character ("/") is not permitted. Names beginning with "innodb_" are reserved for special use.

To create a table in the system tablespace, specify innodb_system as the tablespace name.
CREATE TABLE tbl_name ... TABLESPACE [=] innodb_system
Using TABLESPACE [=] innodb_system, you can place a table of any uncompressed row format in the system tablespace regardless of the innodb_file_per_table setting. For example, you can add a table with ROW_FORMAT=DYNAMIC to the system tablespace using TABLESPACE [=] innodb_system.

To create a table in a file-per-table tablespace, specify innodb_file_per_table as the tablespace name.

CREATE TABLE tbl_name ... TABLESPACE [=] innodb_file_per_table
```
Note
If innodb_file_per_table is enabled, you need not specify
TABLESPACE=innodb_file_per_table to create an InnoDB file-per-table tablespace. InnoDB tables are created in file-per-table tablespaces by default when innodb_file_per_table is enabled.
```


The DATA DIRECTORY clause is permitted with CREATE TABLE . . . TABLESPACE=innodb_file_per_table but is otherwise not supported for use in combination with the TABLESPACE clause. The directory specified in a DATA DIRECTORY clause must be known to InnodB. For more information, see Using the DATA DIRECTORY Clause.
```
Note
Support for TABLESPACE = innodb_file_per_table and TABLESPACE = innodb_temporary clauses with CREATE TEMPORARY TABLE is deprecated; expect it to be removed in a future version of MySQL.
```


The STORAGE table option is employed only with NDB tables. STORAGE determines the type of storage used, and can be either of DISK or MEMORY.

TABLESPACE ... STORAGE DISK assigns a table to an NDB Cluster Disk Data tablespace. STORAGE DISK cannot be used in CREATE TABLE unless preceded by TABLESPACE tablespace_name.

For STORAGE MEMORY, the tablespace name is optional, thus, you can use TABLESPACE tablespace_name STORAGE MEMORY or simply STORAGE MEMORY to specify explicitly that the table is in-memory.

See Section 25.6.11, "NDB Cluster Disk Data Tables", for more information.
- UNION

Used to access a collection of identical MyISAM tables as one. This works only with MERGE tables. See Section 18.7, "The MERGE Storage Engine".

You must have SELECT, UPDATE, and DELETE privileges for the tables you map to a MERGE table.

\section*{Note}

Formerly, all tables used had to be in the same database as the MERGE table itself. This restriction no longer applies.

\section*{Table Partitioning}
partition_options can be used to control partitioning of the table created with CREATE TABLE.
Not all options shown in the syntax for partition_options at the beginning of this section are available for all partitioning types. Please see the listings for the following individual types for information specific to each type, and see Chapter 26, Partitioning, for more complete information about the workings of and uses for partitioning in MySQL, as well as additional examples of table creation and other statements relating to MySQL partitioning.

Partitions can be modified, merged, added to tables, and dropped from tables. For basic information about the MySQL statements to accomplish these tasks, see Section 15.1.9, "ALTER TABLE Statement". For more detailed descriptions and examples, see Section 26.3, "Partition Management".
- PARTITION BY

If used, a partition_options clause begins with PARTITION BY. This clause contains the function that is used to determine the partition; the function returns an integer value ranging from 1 to num, where num is the number of partitions. (The maximum number of user-defined partitions which a table may contain is 1024; the number of subpartitions-discussed later in this section-is included in this maximum.)

\section*{Note}

The expression (expr) used in a PARTITION BY clause cannot refer to any columns not in the table being created; such references are specifically not permitted and cause the statement to fail with an error. (Bug \#29444)
- HASH(expr)

Hashes one or more columns to create a key for placing and locating rows. expr is an expression using one or more table columns. This can be any valid MySQL expression (including MySQL functions) that yields a single integer value. For example, these are both valid CREATE TABLE statements using PARTITION BY HASH:
```
CREATE TABLE t1 (col1 INT, col2 CHAR(5))
    PARTITION BY HASH(col1);
CREATE TABLE t1 (col1 INT, col2 CHAR(5), col3 DATETIME)
    PARTITION BY HASH ( YEAR(col3) );
```


You may not use either VALUES LESS THAN or VALUES IN clauses with PARTITION BY HASH.
PARTITION BY HASH uses the remainder of expr divided by the number of partitions (that is, the modulus). For examples and additional information, see Section 26.2.4, "HASH Partitioning".

The LINEAR keyword entails a somewhat different algorithm. In this case, the number of the partition in which a row is stored is calculated as the result of one or more logical AND operations. For discussion and examples of linear hashing, see Section 26.2.4.1, "LINEAR HASH Partitioning".
- KEY(column_list)

This is similar to HASH, except that MySQL supplies the hashing function so as to guarantee an even data distribution. The column_list argument is simply a list of 1 or more table columns (maximum: 16). This example shows a simple table partitioned by key, with 4 partitions:
```
CREATE TABLE tk (col1 INT, col2 CHAR(5), col3 DATE)
    PARTITION BY KEY(col3)
    PARTITIONS 4;
```


For tables that are partitioned by key, you can employ linear partitioning by using the LINEAR keyword. This has the same effect as with tables that are partitioned by HASH. That is, the partition number is found using the \& operator rather than the modulus (see Section 26.2.4.1, "LINEAR HASH Partitioning", and Section 26.2.5, "KEY Partitioning", for details). This example uses linear partitioning by key to distribute data between 5 partitions:
```
CREATE TABLE tk (col1 INT, col2 CHAR(5), col3 DATE)
    PARTITION BY LINEAR KEY(col3)
    PARTITIONS 5;
```


The ALGORITHM=\{1 | 2\} option is supported with [SUB]PARTITION BY [LINEAR] KEY. ALGORITHM=1 causes the server to use the same key-hashing functions as MySQL 5.1; ALGORITHM=2 means that the server employs the key-hashing functions implemented and used by default for new KEY partitioned tables in MySQL 5.5 and later. (Partitioned tables created with the key-hashing functions employed in MySQL 5.5 and later cannot be used by a MySQL 5.1 server.) Not specifying the option has the same effect as using ALGORITHM=2. This option is intended for use chiefly when upgrading or downgrading [LINEAR] KEY partitioned tables between MySQL 5.1 and later MySQL versions, or for creating tables partitioned by KEY or LINEAR KEY on a MySQL 5.5 or later server which can be used on a MySQL 5.1 server. For more information, see Section 15.1.9.1, "ALTER TABLE Partition Operations".
mysqldump writes this option encased in versioned comments.
ALGORITHM=1 is shown when necessary in the output of SHOW CREATE TABLE using versioned comments in the same manner as mysqldump. ALGORITHM=2 is always omitted from SHOW CREATE TABLE output, even if this option was specified when creating the original table.

You may not use either VALUES LESS THAN or VALUES IN clauses with PARTITION BY KEY.
- RANGE(expr)

In this case, expr shows a range of values using a set of VALUES LESS THAN operators. When using range partitioning, you must define at least one partition using VALUES LESS THAN. You cannot use VALUES IN with range partitioning.

\section*{Note}

For tables partitioned by RANGE, VALUES LESS THAN must be used with either an integer literal value or an expression that evaluates to a single integer value. In MySQL 8.4, you can overcome this limitation in a table that is defined using PARTITION BY RANGE COLUMNS, as described later in this section.

Suppose that you have a table that you wish to partition on a column containing year values, according to the following scheme.

\begin{tabular}{|l|l|}
\hline Partition Number: & Years Range: \\
\hline 0 & 1990 and earlier \\
\hline 1 & 1991 to 1994 \\
\hline 2 & 1995 to 1998 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Partition Number: & Years Range: \\
\hline 3 & 1999 to 2002 \\
\hline 4 & 2003 to 2005 \\
\hline 5 & 2006 and later \\
\hline
\end{tabular}

A table implementing such a partitioning scheme can be realized by the CREATE TABLE statement shown here:
```
CREATE TABLE t1 (
    year_col INT,
    some_data INT
)
PARTITION BY RANGE (year_col) (
    PARTITION p0 VALUES LESS THAN (1991),
    PARTITION p1 VALUES LESS THAN (1995),
    PARTITION p2 VALUES LESS THAN (1999),
    PARTITION p3 VALUES LESS THAN (2002),
    PARTITION p4 VALUES LESS THAN (2006),
    PARTITION p5 VALUES LESS THAN MAXVALUE
);
```


PARTITION ... VALUES LESS THAN ... statements work in a consecutive fashion. VALUES LESS THAN MAXVALUE works to specify "leftover" values that are greater than the maximum value otherwise specified.

VALUES LESS THAN clauses work sequentially in a manner similar to that of the case portions of a switch ... case block (as found in many programming languages such as C, Java, and PHP). That is, the clauses must be arranged in such a way that the upper limit specified in each successive VALUES LESS THAN is greater than that of the previous one, with the one referencing MAXVALUE coming last of all in the list.
- RANGE COLUMNS(column_list)

This variant on RANGE facilitates partition pruning for queries using range conditions on multiple columns (that is, having conditions such as WHERE $\mathrm{a}=1$ AND $\mathrm{b}<10$ or WHERE $\mathrm{a}=1$ AND $\mathrm{b}=10$ AND $\mathrm{c}<10$ ). It enables you to specify value ranges in multiple columns by using a list of columns in the COLUMNS clause and a set of column values in each PARTITION ... VALUES LESS THAN (value_list) partition definition clause. (In the simplest case, this set consists of a single column.) The maximum number of columns that can be referenced in the column_list and value_list is 16 .

The column_list used in the COLUMNS clause may contain only names of columns; each column in the list must be one of the following MySQL data types: the integer types; the string types; and time or date column types. Columns using BLOB, TEXT, SET, ENUM, BIT, or spatial data types are not permitted; columns that use floating-point number types are also not permitted. You also may not use functions or arithmetic expressions in the COLUMNS clause.

The VALUES LESS THAN clause used in a partition definition must specify a literal value for each column that appears in the COLUMNS( ) clause; that is, the list of values used for each VALUES LESS THAN clause must contain the same number of values as there are columns listed in the COLUMNS clause. An attempt to use more or fewer values in a VALUES LESS THAN clause than there are in the COLUMNS clause causes the statement to fail with the error Inconsistency in usage of column lists for partitioning.... You cannot use NULL for any value appearing in VALUES LESS THAN. It is possible to use MAXVALUE more than once for a given column other than the first, as shown in this example:
```
CREATE TABLE rc (
    a INT NOT NULL,
    b INT NOT NULL
)
PARTITION BY RANGE COLUMNS(a,b) (
    PARTITION p0 VALUES LESS THAN (10,5),
```

```
    PARTITION p1 VALUES LESS THAN (20,10),
    PARTITION p2 VALUES LESS THAN (50,MAXVALUE),
    PARTITION p3 VALUES LESS THAN (65,MAXVALUE),
    PARTITION p4 VALUES LESS THAN (MAXVALUE,MAXVALUE)
);
```


Each value used in a VALUES LESS THAN value list must match the type of the corresponding column exactly; no conversion is made. For example, you cannot use the string ' 1 ' for a value that matches a column that uses an integer type (you must use the numeral 1 instead), nor can you use the numeral 1 for a value that matches a column that uses a string type (in such a case, you must use a quoted string: '1').

For more information, see Section 26.2.1, "RANGE Partitioning", and Section 26.4, "Partition Pruning".
- LIST( expr)

This is useful when assigning partitions based on a table column with a restricted set of possible values, such as a state or country code. In such a case, all rows pertaining to a certain state or country can be assigned to a single partition, or a partition can be reserved for a certain set of states or countries. It is similar to RANGE, except that only VALUES IN may be used to specify permissible values for each partition.

VALUES IN is used with a list of values to be matched. For instance, you could create a partitioning scheme such as the following:
```
CREATE TABLE client_firms (
    id INT,
    name VARCHAR(35)
)
PARTITION BY LIST (id) (
    PARTITION r0 VALUES IN (1, 5, 9, 13, 17, 21),
    PARTITION r1 VALUES IN (2, 6, 10, 14, 18, 22),
    PARTITION r2 VALUES IN (3, 7, 11, 15, 19, 23),
    PARTITION r3 VALUES IN (4, 8, 12, 16, 20, 24)
);
```


When using list partitioning, you must define at least one partition using VALUES IN. You cannot use VALUES LESS THAN with PARTITION BY LIST.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2568.jpg?height=127&width=99&top_left_y=1781&top_left_x=342)

\section*{Note}

For tables partitioned by LIST, the value list used with VALUES IN must consist of integer values only. In MySQL 8.4, you can overcome this limitation using partitioning by LIST COLUMNS, which is described later in this section.
- LIST COLUMNS(column_list)

This variant on LIST facilitates partition pruning for queries using comparison conditions on multiple columns (that is, having conditions such as WHERE $\mathrm{a}=5$ AND $\mathrm{b}=5$ or WHERE $\mathrm{a}=1$ AND $\mathrm{b}=10$ AND $\mathrm{c}=5$ ). It enables you to specify values in multiple columns by using a list of columns in the COLUMNS clause and a set of column values in each PARTITION ... VALUES IN (value_list) partition definition clause.

The rules governing regarding data types for the column list used in LIST COLUMNS(column_list) and the value list used in VALUES IN(value_list) are the same as those for the column list used in RANGE COLUMNS(column_list) and the value list used in VALUES LESS THAN(value_list), respectively, except that in the VALUES IN clause, MAXVALUE is not permitted, and you may use NULL.

There is one important difference between the list of values used for VALUES IN with PARTITION BY LIST COLUMNS as opposed to when it is used with PARTITION BY LIST. When used with PARTITION BY LIST COLUMNS, each element in the VALUES IN clause must be a set of column
values; the number of values in each set must be the same as the number of columns used in the COLUMNS clause, and the data types of these values must match those of the columns (and occur in the same order). In the simplest case, the set consists of a single column. The maximum number of columns that can be used in the column_list and in the elements making up the value_list is 16.

The table defined by the following CREATE TABLE statement provides an example of a table using LIST COLUMNS partitioning:
```
CREATE TABLE lc (
    a INT NULL,
    b INT NULL
)
PARTITION BY LIST COLUMNS(a,b) (
    PARTITION p0 VALUES IN( (0,0), (NULL,NULL) ),
    PARTITION p1 VALUES IN( (0,1), (0,2), (0,3), (1,1), (1,2) ),
    PARTITION p2 VALUES IN( (1,0), (2,0), (2,1), (3,0), (3,1) ),
    PARTITION p3 VALUES IN( (1,3), (2,2), (2,3), (3,2), (3,3) )
);
```


\section*{PARTITIONS num}

The number of partitions may optionally be specified with a PARTITIONS num clause, where num is the number of partitions. If both this clause and any PARTITION clauses are used, num must be equal to the total number of any partitions that are declared using PARTITION clauses.

\section*{Note}

Whether or not you use a PARTITIONS clause in creating a table that is partitioned by RANGE or LIST, you must still include at least one PARTITION VALUES clause in the table definition (see below).

\section*{- SUBPARTITION BY}

A partition may optionally be divided into a number of subpartitions. This can be indicated by using the optional SUBPARTITION BY clause. Subpartitioning may be done by HASH or KEY. Either of these may be LINEAR. These work in the same way as previously described for the equivalent partitioning types. (It is not possible to subpartition by LIST or RANGE.)

The number of subpartitions can be indicated using the SUBPARTITIONS keyword followed by an integer value.
- Rigorous checking of the value used in PARTITIONS or SUBPARTITIONS clauses is applied and this value must adhere to the following rules:
- The value must be a positive, nonzero integer.
- No leading zeros are permitted.
- The value must be an integer literal, and cannot not be an expression. For example, PARTITIONS $0.2 \mathrm{E}+01$ is not permitted, even though $0.2 \mathrm{E}+01$ evaluates to 2 . (Bug \#15890)
- partition_definition

Each partition may be individually defined using a partition_definition clause. The individual parts making up this clause are as follows:
- PARTITION partition_name

Specifies a logical name for the partition.
- VALUES

For range partitioning, each partition must include a VALUES LESS THAN clause; for list partitioning, you must specify a VALUES IN clause for each partition. This is used to determine which rows are to be stored in this partition. See the discussions of partitioning types in Chapter 26, Partitioning, for syntax examples.
- [STORAGE] ENGINE

MySQL accepts a [STORAGE] ENGINE option for both PARTITION and SUBPARTITION. Currently, the only way in which this option can be used is to set all partitions or all subpartitions to the same storage engine, and an attempt to set different storage engines for partitions or subpartitions in the same table raises the error ERROR 1469 (HY000): The mix of handlers in the partitions is not permitted in this version of MySQL.
- COMMENT

An optional COMMENT clause may be used to specify a string that describes the partition. Example:
```
COMMENT = 'Data for the years previous to 1999'
```


The maximum length for a partition comment is 1024 characters.
- DATA DIRECTORY and INDEX DIRECTORY

DATA DIRECTORY and INDEX DIRECTORY may be used to indicate the directory where, respectively, the data and indexes for this partition are to be stored. Both the data_dir and the index_dir must be absolute system path names.

The directory specified in a DATA DIRECTORY clause must be known to InnoDB. For more information, see Using the DATA DIRECTORY Clause.

You must have the FILE privilege to use the DATA DIRECTORY or INDEX DIRECTORY partition option.

Example:
```
CREATE TABLE th (id INT, name VARCHAR(30), adate DATE)
PARTITION BY LIST(YEAR(adate))
(
    PARTITION p1999 VALUES IN (1995, 1999, 2003)
        DATA DIRECTORY = '/var/appdata/95/data'
        INDEX DIRECTORY = '/var/appdata/95/idx',
    PARTITION p2000 VALUES IN (1996, 2000, 2004)
        DATA DIRECTORY = '/var/appdata/96/data'
        INDEX DIRECTORY = '/var/appdata/96/idx',
    PARTITION p2001 VALUES IN (1997, 2001, 2005)
        DATA DIRECTORY = '/var/appdata/97/data'
        INDEX DIRECTORY = '/var/appdata/97/idx',
    PARTITION p2002 VALUES IN (1998, 2002, 2006)
        DATA DIRECTORY = '/var/appdata/98/data'
        INDEX DIRECTORY = '/var/appdata/98/idx'
```

);

DATA DIRECTORY and INDEX DIRECTORY behave in the same way as in the CREATE TABLE statement's table_option clause as used for MyISAM tables.

One data directory and one index directory may be specified per partition. If left unspecified, the data and indexes are stored by default in the table's database directory.

The DATA DIRECTORY and INDEX DIRECTORY options are ignored for creating partitioned tables if NO_DIR_IN_CREATE is in effect.
- MAX_ROWS and MIN_ROWS

May be used to specify, respectively, the maximum and minimum number of rows to be stored in the partition. The values for max_number_of_rows and min_number_of_rows must be positive integers. As with the table-level options with the same names, these act only as "suggestions" to the server and are not hard limits.
- TABLESPACE

May be used to designate an InnoDB file-per-table tablespace for the partition by specifying TABLESPACE ˋinnodb_file_per_tableˋ. All partitions must belong to the same storage engine.

Placing InnoDB table partitions in shared InnoDB tablespaces is not supported. Shared tablespaces include the InnoDB system tablespace and general tablespaces.

\section*{- subpartition_definition}

The partition definition may optionally contain one or more subpartition_definition clauses. Each of these consists at a minimum of the SUBPARTITION name, where name is an identifier for the subpartition. Except for the replacement of the PARTITION keyword with SUBPARTITION, the syntax for a subpartition definition is identical to that for a partition definition.

Subpartitioning must be done by HASH or KEY, and can be done only on RANGE or LIST partitions. See Section 26.2.6, "Subpartitioning".

\section*{Partitioning by Generated Columns}

Partitioning by generated columns is permitted. For example:
```
CREATE TABLE t1 (
    s1 INT,
    s2 INT AS (EXP(s1)) STORED
)
PARTITION BY LIST (s2) (
    PARTITION p1 VALUES IN (1)
);
```


Partitioning sees a generated column as a regular column, which enables workarounds for limitations on functions that are not permitted for partitioning (see Section 26.6.3, "Partitioning Limitations Relating to Functions"). The preceding example demonstrates this technique: EXP ( ) cannot be used directly in the PARTITION BY clause, but a generated column defined using EXP ( ) is permitted.

\subsection*{15.1.20.1 Files Created by CREATE TABLE}

For an InnoDB table created in a file-per-table tablespace or general tablespace, table data and associated indexes are stored in a .ibd file in the database directory. When an InnoDB table is created in the system tablespace, table data and indexes are stored in the ibdata* files that represent the system tablespace. The innodb_file_per_table option controls whether tables are created in file-per-table tablespaces or the system tablespace, by default. The TABLESPACE option can be used to place a table in a file-per-table tablespace, general tablespace, or the system tablespace, regardless of the innodb_file_per_table setting.

For MyISAM tables, the storage engine creates data and index files. Thus, for each MyISAM table tbl_name, there are two disk files.

\begin{tabular}{|l|l|}
\hline File & Purpose \\
\hline tbl_name.MYD & Data file \\
\hline tbl_name.MYI & Index file \\
\hline
\end{tabular}

Chapter 18, Alternative Storage Engines, describes what files each storage engine creates to represent tables. If a table name contains special characters, the names for the table files contain encoded versions of those characters as described in Section 11.2.4, "Mapping of Identifiers to File Names".

\subsection*{15.1.20.2 CREATE TEMPORARY TABLE Statement}

You can use the TEMPORARY keyword when creating a table. A TEMPORARY table is visible only within the current session, and is dropped automatically when the session is closed. This means that two different sessions can use the same temporary table name without conflicting with each other or with an existing non-TEMPORARY table of the same name. (The existing table is hidden until the temporary table is dropped.)

InnoDB does not support compressed temporary tables. When innodb_strict_mode is enabled (the default), CREATE TEMPORARY TABLE returns an error if ROW_FORMAT=COMPRESSED or KEY_BLOCK_SIZE is specified. If innodb_strict_mode is disabled, warnings are issued and the temporary table is created using a non-compressed row format. The innodb_file_per-table option does not affect the creation of InnoDB temporary tables.

CREATE TABLE causes an implicit commit, except when used with the TEMPORARY keyword. See Section 15.3.3, "Statements That Cause an Implicit Commit".

TEMPORARY tables have a very loose relationship with databases (schemas). Dropping a database does not automatically drop any TEMPORARY tables created within that database.

To create a temporary table, you must have the CREATE TEMPORARY TABLES privilege. After a session has created a temporary table, the server performs no further privilege checks on the table. The creating session can perform any operation on the table, such as DROP TABLE, INSERT, UPDATE, or SELECT.

One implication of this behavior is that a session can manipulate its temporary tables even if the current user has no privilege to create them. Suppose that the current user does not have the CREATE TEMPORARY TABLES privilege but is able to execute a definer-context stored procedure that executes with the privileges of a user who does have CREATE TEMPORARY TABLES and that creates a temporary table. While the procedure executes, the session uses the privileges of the defining user. After the procedure returns, the effective privileges revert to those of the current user, which can still see the temporary table and perform any operation on it.

You cannot use CREATE TEMPORARY TABLE ... LIKE to create an empty table based on the definition of a table that resides in the mysql tablespace, InnoDB system tablespace (innodb_system), or a general tablespace. The tablespace definition for such a table includes a TABLESPACE attribute that defines the tablespace where the table resides, and the aforementioned tablespaces do not support temporary tables. To create a temporary table based on the definition of such a table, use this syntax instead:

CREATE TEMPORARY TABLE new_tbl SELECT * FROM orig_tbl LIMIT 0;
Note
Support for TABLESPACE = innodb_file_per_table and TABLESPACE = innodb_temporary clauses with CREATE TEMPORARY TABLE is deprecated; expect it to be removed in a future version of MySQL.

\subsection*{15.1.20.3 CREATE TABLE ... LIKE Statement}

Use CREATE TABLE . . . LIKE to create an empty table based on the definition of another table, including any column attributes and indexes defined in the original table:

CREATE TABLE new_tbl LIKE orig_tbl;
The copy is created using the same version of the table storage format as the original table. The SELECT privilege is required on the original table.

LIKE works only for base tables, not for views.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2573.jpg?height=108&width=104&top_left_y=635&top_left_x=365)

\section*{Important}

You cannot execute CREATE TABLE or CREATE TABLE ... LIKE while a LOCK TABLES statement is in effect.

CREATE TABLE ... LIKE makes the same checks as CREATE TABLE. This means that if the current SQL mode is different from the mode in effect when the original table was created, the table definition might be considered invalid for the new mode and cause the statement to fail.

For CREATE TABLE ... LIKE, the destination table preserves generated column information from the original table.

For CREATE TABLE ... LIKE, the destination table preserves expression default values from the original table.

For CREATE TABLE . . . LIKE, the destination table preserves CHECK constraints from the original table, except that all the constraint names are generated.

CREATE TABLE ... LIKE does not preserve any DATA DIRECTORY or INDEX DIRECTORY table options that were specified for the original table, or any foreign key definitions.

If the original table is a TEMPORARY table, CREATE TABLE . . . LIKE does not preserve TEMPORARY. To create a TEMPORARY destination table, use CREATE TEMPORARY TABLE ... LIKE.

CREATE TABLE ... LIKE operations apply all ENGINE_ATTRIBUTE and SECONDARY_ENGINE_ATTRIBUTE values to the new table.

\subsection*{15.1.20.4 CREATE TABLE ... SELECT Statement}

You can create one table from another by adding a SELECT statement at the end of the CREATE TABLE statement:

CREATE TABLE new_tbl [AS] SELECT * FROM orig_tbl;
MySQL creates new columns for all elements in the SELECT. For example:
```
mysql> CREATE TABLE test (a INT NOT NULL AUTO_INCREMENT,
    -> PRIMARY KEY (a), KEY(b))
    -> ENGINE=InnoDB SELECT b,c FROM test2;
```


This creates an InnoDB table with three columns, $\mathrm{a}, \mathrm{b}$, and c . The ENGINE option is part of the CREATE TABLE statement, and should not be used following the SELECT; this would result in a syntax error. The same is true for other CREATE TABLE options such as CHARSET.

Notice that the columns from the SELECT statement are appended to the right side of the table, not overlapped onto it. Take the following example:
```
mysql> SELECT * FROM foo;
+---+
| n |
+---+
| 1 |
+---+
```

```
mysql> CREATE TABLE bar (m INT) SELECT n FROM foo;
Query OK, 1 row affected (0.02 sec)
Records: 1 Duplicates: 0 Warnings: 0
mysql> SELECT * FROM bar;
+------+---+
| m | n |
+------+---+
| NULL | 1 |
+------+---+
1 row in set (0.00 sec)
```


For each row in table foo, a row is inserted in bar with the values from foo and default values for the new columns.

In a table resulting from CREATE TABLE ... SELECT, columns named only in the CREATE TABLE part come first. Columns named in both parts or only in the SELECT part come after that. The data type of SELECT columns can be overridden by also specifying the column in the CREATE TABLE part.

For storage engines that support both atomic DDL and foreign key constraints, creation of foreign keys is not permitted in CREATE TABLE ... SELECT statements when row-based replication is in use. Foreign key constraints can be added later using ALTER TABLE.

You can precede the SELECT by IGNORE or REPLACE to indicate how to handle rows that duplicate unique key values. With IGNORE, rows that duplicate an existing row on a unique key value are discarded. With REPLACE, new rows replace rows that have the same unique key value. If neither IGNORE nor REPLACE is specified, duplicate unique key values result in an error. For more information, see The Effect of IGNORE on Statement Execution.

You can also use a VALUES statement in the SELECT part of CREATE TABLE ... SELECT; the VALUES portion of the statement must include a table alias using an AS clause. To name the columns coming from VALUES, supply column aliases with the table alias; otherwise, the default column names column_0, column_1, column_2, …, are used.

Otherwise, naming of columns in the table thus created follows the same rules as described previously in this section. Examples:
```
mysql> CREATE TABLE tv1
    > SELECT * FROM (VALUES ROW(1,3,5), ROW(2,4,6)) AS v;
mysql> TABLE tv1;
+----------+----------+----------+
| column_0 | column_1 | column_2 |
+----------+----------+----------+
| 3 | 3 | 6 |
mysql> CREATE TABLE tv2
    > SELECT * FROM (VALUES ROW(1,3,5), ROW(2,4,6)) AS v(x,y,z);
mysql> TABLE tv2;
+---+---+---+
| x | y | z |
+---+---+---+
| 1 | 3 | 5 |
| 2 | 4 | 6 |
+---+---+---+
mysql> CREATE TABLE tv3 (a INT, b INT, c INT)
    > SELECT * FROM (VALUES ROW(1,3,5), ROW(2,4,6)) AS v(x,y,z);
mysql> TABLE tv3;
+------+------+-------+-----------+----------+----------+
```

```
mysql> CREATE TABLE tv4 (a INT, b INT, c INT)
    > SELECT * FROM (VALUES ROW(1,3,5), ROW(2,4,6)) AS v(x,y,z);
mysql> TABLE tv4;
+------+------+------+---+---+---+
| a | b | c | x | y | z |
+------+------+------+---+---+---+
| NULL | NULL | NULL | 1 | 3 | 5 |
| NULL | NULL | NULL | 2 | 4 | 6 |
+------+------+------+---+---+---+
mysql> CREATE TABLE tv5 (a INT, b INT, c INT)
    > SELECT * FROM (VALUES ROW(1,3,5), ROW(2,4,6)) AS v(a,b,c);
mysql> TABLE tv5;
+------+-------+------+
| a | b | c |
+------+-------+------+
|}31 3 | 5 
+------+------+------+
```


When selecting all columns and using the default column names, you can omit SELECT *, so the statement just used to create table tv1 can also be written as shown here:
```
mysql> CREATE TABLE tv1 VALUES ROW(1,3,5), ROW(2,4,6);
mysql> TABLE tv1;
+----------+-----------+----------+
| column_0 | column_1 | column_2 |
+----------+----------+----------+
| 3 | 3 | 6 | 6 |
```


When using VALUES as the source of the SELECT, all columns are always selected into the new table, and individual columns cannot be selected as they can be when selecting from a named table; each of the following statements produces an error (ER_OPERAND_COLUMNS):
```
CREATE TABLE tvx
    SELECT (x,z) FROM (VALUES ROW(1,3,5), ROW(2,4,6)) AS v(x,y,z);
CREATE TABLE tvx (a INT, c INT)
    SELECT (x,z) FROM (VALUES ROW(1,3,5), ROW(2,4,6)) AS v(x,y,z);
```


Similarly, you can use a TABLE statement in place of the SELECT. This follows the same rules as with VALUES; all columns of the source table and their names in the source table are always inserted into the new table. Examples:
```
mysql> TABLE t1;
+----+-----+
| a | b |
+----+----+
| 1 | 2 |
| 6 | 7 |
| 10 | -4 |
| 14 | 6 |
+----+----+
mysql> CREATE TABLE tt1 TABLE t1;
mysql> TABLE tt1;
+----+----+
| a | b |
+----+----+
| 1 | 2 |
| 6 | 7 |
| 10 | -4 |
| 14 | 6 |
+----+----+
mysql> CREATE TABLE tt2 (x INT) TABLE t1;
mysql> TABLE tt2;
+------+----+----+
```

```
| x | a | b |
+-------+----+----+
| NULL | 1 | 2 |
| NULL | 6 | 7 |
| NULL | 10 | -4 |
| NULL | 14 | 6 |
+-------+----+----+
```


Because the ordering of the rows in the underlying SELECT statements cannot always be determined, CREATE TABLE ... IGNORE SELECT and CREATE TABLE ... REPLACE SELECT statements are flagged as unsafe for statement-based replication. Such statements produce a warning in the error log when using statement-based mode and are written to the binary log using the row-based format when using MIXED mode. See also Section 19.2.1.1, "Advantages and Disadvantages of Statement-Based and Row-Based Replication".

CREATE TABLE ... SELECT does not automatically create any indexes for you. This is done intentionally to make the statement as flexible as possible. If you want to have indexes in the created table, you should specify these before the SELECT statement:
```
mysql> CREATE TABLE bar (UNIQUE (n)) SELECT n FROM foo;
```


For CREATE TABLE . . . SELECT, the destination table does not preserve information about whether columns in the selected-from table are generated columns. The SELECT part of the statement cannot assign values to generated columns in the destination table.

For CREATE TABLE ... SELECT, the destination table does preserve expression default values from the original table.

Some conversion of data types might occur. For example, the AUTO_INCREMENT attribute is not preserved, and VARCHAR columns can become CHAR columns. Retrained attributes are NULL (or NOT NULL) and, for those columns that have them, CHARACTER SET, COLLATION, COMMENT, and the DEFAULT clause.

When creating a table with CREATE TABLE ... SELECT, make sure to alias any function calls or expressions in the query. If you do not, the CREATE statement might fail or result in undesirable column names.
```
CREATE TABLE artists_and_works
    SELECT artist.name, COUNT(work.artist_id) AS number_of_works
    FROM artist LEFT JOIN work ON artist.id = work.artist_id
    GROUP BY artist.id;
```


You can also explicitly specify the data type for a column in the created table:
CREATE TABLE foo (a TINYINT NOT NULL) SELECT $\mathrm{b}+1$ AS a FROM bar;
For CREATE TABLE ... SELECT, if IF NOT EXISTS is given and the target table exists, nothing is inserted into the destination table, and the statement is not logged.

To ensure that the binary log can be used to re-create the original tables, MySQL does not permit concurrent inserts during CREATE TABLE . . . SELECT. For more information, see Section 15.1.1, "Atomic Data Definition Statement Support".

You cannot use FOR UPDATE as part of the SELECT in a statement such as CREATE TABLE new_table SELECT ... FROM old_table .... If you attempt to do so, the statement fails.

CREATE TABLE ... SELECT operations apply ENGINE_ATTRIBUTE and SECONDARY_ENGINE_ATTRIBUTE values to columns only. Table and index ENGINE_ATTRIBUTE and SECONDARY_ENGINE_ATTRIBUTE values are not applied to the new table unless specified explicitly.

\subsection*{15.1.20.5 FOREIGN KEY Constraints}

MySQL supports foreign keys, which permit cross-referencing related data across tables, and foreign key constraints, which help keep the related data consistent.

A foreign key relationship involves a parent table that holds the initial column values, and a child table with column values that reference the parent column values. A foreign key constraint is defined on the child table.

The essential syntax for a defining a foreign key constraint in a CREATE TABLE or ALTER TABLE statement includes the following:
```
[CONSTRAINT [symbol]] FOREIGN KEY
    [index_name] (col_name, ...)
    REFERENCES tbl_name (col_name,...)
    [ON DELETE reference_option]
    [ON UPDATE reference_option]
reference_option:
    RESTRICT | CASCADE | SET NULL | NO ACTION | SET DEFAULT
```


Foreign key constraint usage is described under the following topics in this section:
- Identifiers
- Conditions and Restrictions
- Referential Actions
- Foreign Key Constraint Examples
- Adding Foreign Key Constraints
- Dropping Foreign Key Constraints
- Foreign Key Checks
- Locking
- Foreign Key Definitions and Metadata
- Foreign Key Errors

\section*{Identifiers}

Foreign key constraint naming is governed by the following rules:
- The CONSTRAINT symbol value is used, if defined.
- If the CONSTRAINT symbol clause is not defined, or a symbol is not included following the CONSTRAINT keyword, a constraint name name is generated automatically.

If the CONSTRAINT symbol clause is not defined, or a symbol is not included following the CONSTRAINT keyword, both InnoDB and NDB storage engines ignore FOREIGN_KEY index_name.
- The CONSTRAINT symbol value, if defined, must be unique in the database. A duplicate symbol results in an error similar to: ERROR 1005 (HY000): Can't create table 'test.fk1' (errno: 121).
- NDB Cluster stores foreign key names using the same lettercase with which they are created.

Table and column identifiers in a FOREIGN KEY ... REFERENCES clause can be quoted within backticks (ˋ). Alternatively, double quotation marks (") can be used if the ANSI_QUOTES SQL mode is enabled. The lower_case_table_names system variable setting is also taken into account.

\section*{Conditions and Restrictions}

Foreign key constraints are subject to the following conditions and restrictions:
- Parent and child tables must use the same storage engine, and they cannot be defined as temporary tables.
- Creating a foreign key constraint requires the REFERENCES privilege on the parent table.
- Corresponding columns in the foreign key and the referenced key must have similar data types. The size and sign of fixed precision types such as INTEGER and DECIMAL must be the same. The length of string types need not be the same. For nonbinary (character) string columns, the character set and collation must be the same.
- MySQL supports foreign key references between one column and another within a table. (A column cannot have a foreign key reference to itself.) In these cases, a "child table record" refers to a dependent record within the same table.
- MySQL requires indexes on foreign keys and referenced keys so that foreign key checks can be fast and not require a table scan. In the referencing table, there must be an index where the foreign key columns are listed as the first columns in the same order. Such an index is created on the referencing table automatically if it does not exist. This index might be silently dropped later if you create another index that can be used to enforce the foreign key constraint. index_name, if given, is used as described previously.
- Previously, InnoDB allowed a foreign key to reference any index column or group of columns, even a non-unique index or partial index, an extension of standard SQL. This is still allowed for backwards compatibility, but is now deprecated; in addition, it must be enabled by setting restrict_fk_on_non_standard_key. If this is done, there must still be an index in the referenced table where the referenced columns are the first columns in the same order. Hidden columns that InnoDB adds to an index are also considered in such cases (see Section 17.6.2.1, "Clustered and Secondary Indexes"). You should expect support for use of nonstandard keys to be removed in a future version of MySQL, and migrate away from their use.

NDB always requires an explicit unique key (or primary key) on any column referenced as a foreign key.
- Index prefixes on foreign key columns are not supported. Consequently, BLOB and TEXT columns cannot be included in a foreign key because indexes on those columns must always include a prefix length.
- InnoDB does not currently support foreign keys for tables with user-defined partitioning. This includes both parent and child tables.

This restriction does not apply for NDB tables that are partitioned by KEY or LINEAR KEY (the only user partitioning types supported by the NDB storage engine); these may have foreign key references or be the targets of such references.
- A table in a foreign key relationship cannot be altered to use another storage engine. To change the storage engine, you must drop any foreign key constraints first.
- A foreign key constraint cannot reference a virtual generated column.

For information about how the MySQL implementation of foreign key constraints differs from the SQL standard, see Section 1.7.2.3, "FOREIGN KEY Constraint Differences".

\section*{Referential Actions}

When an UPDATE or DELETE operation affects a key value in the parent table that has matching rows in the child table, the result depends on the referential action specified by ON UPDATE and ON DELETE subclauses of the FOREIGN KEY clause. Referential actions include:
- CASCADE: Delete or update the row from the parent table and automatically delete or update the matching rows in the child table. Both ON DELETE CASCADE and ON UPDATE CASCADE are supported. Between two tables, do not define several ON UPDATE CASCADE clauses that act on the same column in the parent table or in the child table.

If a FOREIGN KEY clause is defined on both tables in a foreign key relationship, making both tables a parent and child, an ON UPDATE CASCADE or ON DELETE CASCADE subclause defined for one FOREIGN KEY clause must be defined for the other in order for cascading operations to succeed. If an ON UPDATE CASCADE or ON DELETE CASCADE subclause is only defined for one FOREIGN KEY clause, cascading operations fail with an error.

\section*{Note}

Cascaded foreign key actions do not activate triggers.
- SET NULL: Delete or update the row from the parent table and set the foreign key column or columns in the child table to NULL. Both ON DELETE SET NULL and ON UPDATE SET NULL clauses are supported.

If you specify a SET NULL action, make sure that you have not declared the columns in the child table as NOT NULL.
- RESTRICT: Rejects the delete or update operation for the parent table. Specifying RESTRICT (or NO ACTION) is the same as omitting the ON DELETE or ON UPDATE clause.
- NO ACTION: A keyword from standard SQL. For InnoDB, this is equivalent to RESTRICT; the delete or update operation for the parent table is immediately rejected if there is a related foreign key value in the referenced table. NDB supports deferred checks, and NO ACTION specifies a deferred check; when this is used, constraint checks are not performed until commit time. Note that for NDB tables, this causes all foreign key checks made for both parent and child tables to be deferred.
- SET DEFAULT: This action is recognized by the MySQL parser, but both InnoDB and NDB reject table definitions containing ON DELETE SET DEFAULT or ON UPDATE SET DEFAULT clauses.

For storage engines that support foreign keys, MySQL rejects any INSERT or UPDATE operation that attempts to create a foreign key value in a child table if there is no matching candidate key value in the parent table.

For an ON DELETE or ON UPDATE that is not specified, the default action is always NO ACTION.
As the default, an ON DELETE NO ACTION or ON UPDATE NO ACTION clause that is specified explicitly does not appear in SHOW CREATE TABLE output or in tables dumped with mysqldump. RESTRICT, which is an equivalent non-default keyword, appears in SHOW CREATE TABLE output and in tables dumped with mysqldump.

For NDB tables, ON UPDATE CASCADE is not supported where the reference is to the parent table's primary key.

For NDB tables, ON DELETE CASCADE is not supported where the child table contains one or more columns of any of the TEXT or BLOB types. (Bug \#89511, Bug \#27484882)

InnoDB performs cascading operations using a depth-first search algorithm on the records of the index that corresponds to the foreign key constraint.

A foreign key constraint on a stored generated column cannot use CASCADE, SET NULL, or SET DEFAULT as ON UPDATE referential actions, nor can it use SET NULL or SET DEFAULT as ON DELETE referential actions.

A foreign key constraint on the base column of a stored generated column cannot use CASCADE, SET NULL, or SET DEFAULT as ON UPDATE or ON DELETE referential actions.

\section*{Foreign Key Constraint Examples}

This simple example relates parent and child tables through a single-column foreign key:
```
CREATE TABLE parent (
```

```
    id INT NOT NULL,
    PRIMARY KEY (id)
) ENGINE=INNODB;
CREATE TABLE child (
    id INT,
    parent_id INT,
    INDEX par_ind (parent_id),
    FOREIGN KEY (parent_id)
        REFERENCES parent(id)
        ON DELETE CASCADE
) ENGINE=INNODB;
```


This is a more complex example in which a product_order table has foreign keys for two other tables. One foreign key references a two-column index in the product table. The other references a single-column index in the customer table:
```
CREATE TABLE product (
    category INT NOT NULL, id INT NOT NULL,
    price DECIMAL,
    PRIMARY KEY(category, id)
) ENGINE=INNODB;
CREATE TABLE customer (
    id INT NOT NULL,
    PRIMARY KEY (id)
) ENGINE=INNODB;
CREATE TABLE product_order (
    no INT NOT NULL AUTO_INCREMENT,
    product_category INT NOT NULL,
    product_id INT NOT NULL,
    customer_id INT NOT NULL,
    PRIMARY KEY(no),
    INDEX (product_category, product_id),
    INDEX (customer_id),
    FOREIGN KEY (product_category, product_id)
        REFERENCES product(category, id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (customer_id)
        REFERENCES customer(id)
) ENGINE=INNODB;
```


\section*{Adding Foreign Key Constraints}

You can add a foreign key constraint to an existing table using the following ALTER TABLE syntax:
```
ALTER TABLE tbl_name
    ADD [CONSTRAINT [symbol]] FOREIGN KEY
    [index_name] (col_name, ...)
    REFERENCES tbl_name (col_name,...)
    [ON DELETE reference_option]
    [ON UPDATE reference_option]
```


The foreign key can be self referential (referring to the same table). When you add a foreign key constraint to a table using ALTER TABLE, remember to first create an index on the column(s) referenced by the foreign key.

\section*{Dropping Foreign Key Constraints}

You can drop a foreign key constraint using the following ALTER TABLE syntax:
```
ALTER TABLE tbl_name DROP FOREIGN KEY fk_symbol;
```


If the FOREIGN KEY clause defined a CONSTRAINT name when you created the constraint, you can refer to that name to drop the foreign key constraint. Otherwise, a constraint name was generated
internally, and you must use that value. To determine the foreign key constraint name, use SHOW CREATE TABLE:
```
mysql> SHOW CREATE TABLE child\G
************************** 1. row
        Table: child
Create Table: CREATE TABLE ˋchildˋ (
    ˋidˋ int DEFAULT NULL,
    ˋparent_idˋ int DEFAULT NULL,
    KEY ˋpar_indˋ (ˋparent_idˋ),
    CONSTRAINT ˋchild_ibfk_1ˋ FOREIGN KEY (ˋparent_idˋ)
    REFERENCES ˋparentˋ (ˋidˋ) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
mysql> ALTER TABLE child DROP FOREIGN KEY ˋchild_ibfk_1ˋ;
```


Adding and dropping a foreign key in the same ALTER TABLE statement is supported for ALTER TABLE ... ALGORITHM=INPLACE. It is not supported for ALTER TABLE ... ALGORITHM=COPY.

\section*{Foreign Key Checks}

In MySQL, InnoDB and NDB tables support checking of foreign key constraints. Foreign key checking is controlled by the foreign_key_checks variable, which is enabled by default. Typically, you leave this variable enabled during normal operation to enforce referential integrity. The foreign_key_checks variable has the same effect on NDB tables as it does for InnoDB tables.

The foreign_key_checks variable is dynamic and supports both global and session scopes. For information about using system variables, see Section 7.1.9, "Using System Variables".

Disabling foreign key checking is useful when:
- Dropping a table that is referenced by a foreign key constraint. A referenced table can only be dropped after foreign_key_checks is disabled. When you drop a table, constraints defined on the table are also dropped.
- Reloading tables in different order than required by their foreign key relationships. For example, mysqldump produces correct definitions of tables in the dump file, including foreign key constraints for child tables. To make it easier to reload dump files for tables with foreign key relationships, mysqldump automatically includes a statement in the dump output that disables foreign_key_checks. This enables you to import the tables in any order in case the dump file contains tables that are not correctly ordered for foreign keys. Disabling foreign_key_checks also speeds up the import operation by avoiding foreign key checks.
- Executing LOAD DATA operations, to avoid foreign key checking.
- Performing an ALTER TABLE operation on a table that has a foreign key relationship.

When foreign_key_checks is disabled, foreign key constraints are ignored, with the following exceptions:
- Recreating a table that was previously dropped returns an error if the table definition does not conform to the foreign key constraints that reference the table. The table must have the correct column names and types. It must also have indexes on the referenced keys. If these requirements are not satisfied, MySQL returns Error 1005 that refers to errno: 150 in the error message, which means that a foreign key constraint was not correctly formed.
- Altering a table returns an error (errno: 150) if a foreign key definition is incorrectly formed for the altered table.
- Dropping an index required by a foreign key constraint. The foreign key constraint must be removed before dropping the index.
- Creating a foreign key constraint where a column references a nonmatching column type.

Disabling foreign_key_checks has these additional implications:
- It is permitted to drop a database that contains tables with foreign keys that are referenced by tables outside the database.
- It is permitted to drop a table with foreign keys referenced by other tables.
- Enabling foreign_key_checks does not trigger a scan of table data, which means that rows added to a table while foreign_key_checks is disabled are not checked for consistency when foreign_key_checks is re-enabled.

