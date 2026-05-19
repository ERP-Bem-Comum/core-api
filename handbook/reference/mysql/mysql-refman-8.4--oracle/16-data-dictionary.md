\section*{Chapter 16 MySQL Data Dictionary}

\section*{Table of Contents}
16.1 Data Dictionary Schema ..... 2943
16.2 Removal of File-based Metadata Storage ..... 2944
16.3 Transactional Storage of Dictionary Data ..... 2945
16.4 Dictionary Object Cache ..... 2945
16.5 INFORMATION_SCHEMA and Data Dictionary Integration ..... 2946
16.6 Serialized Dictionary Information (SDI) ..... 2948
16.7 Data Dictionary Usage Differences ..... 2948
16.8 Data Dictionary Limitations ..... 2950
MySQL Server incorporates a transactional data dictionary that stores information about database objects. In previous MySQL releases, dictionary data was stored in metadata files, nontransactional tables, and storage engine-specific data dictionaries.
This chapter describes the main features, benefits, usage differences, and limitations of the data dictionary. For other implications of the data dictionary feature, refer to the "Data Dictionary Notes" section in the MySQL 8.4 Release Notes.
Benefits of the MySQL data dictionary include:
- Simplicity of a centralized data dictionary schema that uniformly stores dictionary data. See Section 16.1, "Data Dictionary Schema".
- Removal of file-based metadata storage. See Section 16.2, "Removal of File-based Metadata Storage".
- Transactional, crash-safe storage of dictionary data. See Section 16.3, "Transactional Storage of Dictionary Data".
- Uniform and centralized caching for dictionary objects. See Section 16.4, "Dictionary Object Cache".
- A simpler and improved implementation for some INFORMATION_SCHEMA tables. See Section 16.5, "INFORMATION_SCHEMA and Data Dictionary Integration".
- Atomic DDL. See Section 15.1.1, "Atomic Data Definition Statement Support".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2973.jpg?height=124&width=118&top_left_y=1852&top_left_x=360)

\section*{Important}
A data dictionary-enabled server entails some general operational differences compared to a server that does not have a data dictionary; see Section 16.7, "Data Dictionary Usage Differences". Also, for upgrades to MySQL 8.0, the upgrade procedure differs somewhat from previous MySQL releases and requires that you verify the upgrade readiness of your installation by checking specific prerequisites. For more information, see Chapter 3, Upgrading MySQL, particularly Section 3.6, "Preparing Your Installation for Upgrade".

\subsection*{16.1 Data Dictionary Schema}

Data dictionary tables are protected and may only be accessed in debug builds of MySQL. However, MySQL supports access to data stored in data dictionary tables through INFORMATION_SCHEMA tables and SHOW statements. For an overview of the tables that comprise the data dictionary, see Data Dictionary Tables.

MySQL system tables still exist in MySQL 8.4 and can be viewed by issuing a SHOW TABLES statement on the mysql system database. Generally, the difference between MySQL data dictionary tables and system tables is that data dictionary tables contain metadata required to execute SQL
queries, whereas system tables contain auxiliary data such as time zone and help information. MySQL system tables and data dictionary tables also differ in how they are upgraded. The MySQL server manages data dictionary upgrades. See How the Data Dictionary is Upgraded. Upgrading MySQL system tables requires running the full MySQL upgrade procedure. See Section 3.4, "What the MySQL Upgrade Process Upgrades".

\section*{How the Data Dictionary is Upgraded}

New versions of MySQL may include changes to data dictionary table definitions. Such changes are present in newly installed versions of MySQL, but when performing an in-place upgrade of MySQL binaries, changes are applied when the MySQL server is restarted using the new binaries. At startup, the data dictionary version of the server is compared to the version information stored in the data dictionary to determine if data dictionary tables should be upgraded. If an upgrade is necessary and supported, the server creates data dictionary tables with updated definitions, copies persisted metadata to the new tables, atomically replaces the old tables with the new ones, and reinitializes the data dictionary. If an upgrade is not necessary, startup continues without updating the data dictionary tables.

Upgrade of data dictionary tables is an atomic operation, which means that all of the data dictionary tables are upgraded as necessary or the operation fails. If the upgrade operation fails, server startup fails with an error. In this case, the old server binaries can be used with the old data directory to start the server. When the new server binaries are used again to start the server, the data dictionary upgrade is reattempted.

Generally, after data dictionary tables are successfully upgraded, it is not possible to restart the server using the old server binaries. As a result, downgrading MySQL server binaries to a previous MySQL version is not supported after data dictionary tables are upgraded.

\section*{Viewing Data Dictionary Tables Using a Debug Build of MySQL}

Data dictionary tables are protected by default but can be accessed by compiling MySQL with debugging support (using the - DWITH_DEBUG=1 CMake option) and specifying the +d,skip_dd_table_access_check debug option and modifier. For information about compiling debug builds, see Section 7.9.1.1, "Compiling MySQL for Debugging".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2974.jpg?height=126&width=113&top_left_y=1599&top_left_x=301)

\section*{Warning}

Modifying or writing to data dictionary tables directly is not recommended and may render your MySQL instance inoperable.

After compiling MySQL with debugging support, use this SET statement to make data dictionary tables visible to the mysql client session:
```
mysql> SET SESSION debug='+d,skip_dd_table_access_check';
```


Use this query to retrieve a list of data dictionary tables:
```
mysql> SELECT name, schema_id, hidden, type FROM mysql.tables where schema_id=1 AND hidden='System';
```


Use SHOW CREATE TABLE to view data dictionary table definitions. For example:
mysql> SHOW CREATE TABLE mysql.catalogs\G

\subsection*{16.2 Removal of File-based Metadata Storage}

In previous MySQL releases, dictionary data was partially stored in metadata files. Issues with filebased metadata storage included expensive file scans, susceptibility to file system-related bugs, complex code for handling of replication and crash recovery failure states, and a lack of extensibility that made it difficult to add metadata for new features and relational objects.

The metadata files listed below are removed from MySQL. Unless otherwise noted, data previously stored in metadata files is now stored in data dictionary tables.
- .frm files: Table metadata files. With the removal of .frm files:
- The 64 KB table definition size limit imposed by the .frm file structure is removed.
- The Information Schema TABLES table's VERSION column reports a hardcoded value of 10 , which is the last. frm file version used in MySQL 5.7.
- . par files: Partition definition files. InnoDB stopped using partition definition files in MySQL 5.7 with the introduction of native partitioning support for InnoDB tables.
- . TRN files: Trigger namespace files.
- . TRG files: Trigger parameter files.
- . isl files: InnoDB Symbolic Link files containing the location of file-per-table tablespace files created outside of the data directory.
- db.opt files: Database configuration files. These files, one per database directory, contained database default character set attributes.
- ddl_log.log file: The file contained records of metadata operations generated by data definition statements such as DROP TABLE and ALTER TABLE.

\subsection*{16.3 Transactional Storage of Dictionary Data}

The data dictionary schema stores dictionary data in transactional (InnoDB) tables. Data dictionary tables are located in the mysql database together with non-data dictionary system tables.

Data dictionary tables are created in a single InnoDB tablespace named mysql.ibd, which resides in the MySQL data directory. The mysql. ibd tablespace file must reside in the MySQL data directory and its name cannot be modified or used by another tablespace.

Dictionary data is protected by the same commit, rollback, and crash-recovery capabilities that protect user data that is stored in InnoDB tables.

\subsection*{16.4 Dictionary Object Cache}

The dictionary object cache is a shared global cache that stores previously accessed data dictionary objects in memory to enable object reuse and minimize disk I/O. Similar to other cache mechanisms used by MySQL, the dictionary object cache uses an LRU-based eviction strategy to evict least recently used objects from memory.

The dictionary object cache comprises cache partitions that store different object types. Some cache partition size limits are configurable, whereas others are hardcoded.
- tablespace definition cache partition: Stores tablespace definition objects. The tablespace_definition_cache option sets a limit for the number of tablespace definition objects that can be stored in the dictionary object cache. The default value is 256 .
- schema definition cache partition: Stores schema definition objects. The schema_definition_cache option sets a limit for the number of schema definition objects that can be stored in the dictionary object cache. The default value is 256 .
- table definition cache partition: Stores table definition objects. The object limit is set to the value of max_connections, which has a default value of 151 .

The table definition cache partition exists in parallel with the table definition cache that is configured using the table_definition_cache configuration option. Both caches store table definitions but serve different parts of the MySQL server. Objects in one cache have no dependence on the existence of objects in the other.
- stored program definition cache partition: Stores stored program definition objects. The stored_program_definition_cache option sets a limit for the number of stored program definition objects that can be stored in the dictionary object cache. The default value is 256.

The stored program definition cache partition exists in parallel with the stored procedure and stored function caches that are configured using the stored_program_cache option.

The stored_program_cache option sets a soft upper limit for the number of cached stored procedures or functions per connection, and the limit is checked each time a connection executes a stored procedure or function. The stored program definition cache partition, on the other hand, is a shared cache that stores stored program definition objects for other purposes. The existence of objects in the stored program definition cache partition has no dependence on the existence of objects in the stored procedure cache or stored function cache, and vice versa.
- character set definition cache partition: Stores character set definition objects and has a hardcoded object limit of 256.
- collation definition cache partition: Stores collation definition objects and has a hardcoded object limit of 256.

For information about valid values for dictionary object cache configuration options, refer to Section 7.1.8, "Server System Variables".

\subsection*{16.5 INFORMATION_SCHEMA and Data Dictionary Integration}

With the introduction of the data dictionary, the following INFORMATION_SCHEMA tables are implemented as views on data dictionary tables:
- CHARACTER_SETS
- CHECK_CONSTRAINTS
- COLLATIONS
- COLLATION_CHARACTER_SET_APPLICABILITY
- COLUMNS
- COLUMN_STATISTICS
- EVENTS
- FILES
- INNODB_COLUMNS
- INNODB_DATAFILES
- INNODB_FIELDS
- INNODB_FOREIGN
- INNODB_FOREIGN_COLS
- INNODB_INDEXES
- INNODB_TABLES
- INNODB_TABLESPACES
- INNODB_TABLESPACES_BRIEF
- INNODB_TABLESTATS
- KEY_COLUMN_USAGE
- KEYWORDS
- PARAMETERS
- PARTITIONS
- REFERENTIAL_CONSTRAINTS
- RESOURCE_GROUPS
- ROUTINES
- SCHEMATA
- STATISTICS
- ST_GEOMETRY_COLUMNS
- ST_SPATIAL_REFERENCE_SYSTEMS
- TABLES
- TABLE_CONSTRAINTS
- TRIGGERS
- VIEWS
- VIEW_ROUTINE_USAGE
- VIEW_TABLE_USAGE

Queries on those tables are now more efficient because they obtain information from data dictionary tables rather than by other, slower means. In particular, for each INFORMATION_SCHEMA table that is a view on data dictionary tables:
- The server no longer must create a temporary table for each query of the INFORMATION_SCHEMA table.
- When the underlying data dictionary tables store values previously obtained by directory scans (for example, to enumerate database names or table names within databases) or file-opening operations (for example, to read information from .frm files), INFORMATION_SCHEMA queries for those values now use table lookups instead. (Additionally, even for a non-view INFORMATION_SCHEMA table, values such as database and table names are retrieved by lookups from the data dictionary and do not require directory or file scans.)
- Indexes on the underlying data dictionary tables permit the optimizer to construct efficient query execution plans, something not true for the previous implementation that processed the INFORMATION_SCHEMA table using a temporary table per query.

The preceding improvements also apply to SHOW statements that display information corresponding to the INFORMATION_SCHEMA tables that are views on data dictionary tables. For example, SHOW DATABASES displays the same information as the SCHEMATA table.

In addition to the introduction of views on data dictionary tables, table statistics contained in the STATISTICS and TABLES tables is now cached to improve INFORMATION_SCHEMA query performance. The information_schema_stats_expiry system variable defines the period of time before cached table statistics expire. The default is 86400 seconds ( 24 hours). If there are no cached statistics or statistics have expired, statistics are retrieved from storage engine when querying table statistics columns. To update cached values at any time for a given table, use ANALYZE TABLE
information_schema_stats_expiry can be set to 0 to have INFORMATION_SCHEMA queries retrieve the latest statistics directly from the storage engine, which is not as fast as retrieving cached statistics.

For more information, see Section 10.2.3, "Optimizing INFORMATION_SCHEMA Queries".
INFORMATION_SCHEMA tables in MySQL 8.4 are closely tied to the data dictionary, resulting in several usage differences. See Section 16.7, "Data Dictionary Usage Differences".

\subsection*{16.6 Serialized Dictionary Information (SDI)}

In addition to storing metadata about database objects in the data dictionary, MySQL stores it in serialized form. This data is referred to as serialized dictionary information (SDI). InnoDB stores SDI data within its tablespace files. NDBCLUSTER stores SDI data in the NDB dictionary. Other storage engines store SDI data in . sdi files that are created for a given table in the table's database directory. SDI data is generated in a compact JSON format.

Serialized dictionary information (SDI) is present in all InnoDB tablespace files except for temporary tablespace and undo tablespace files. SDI records in an InnoDB tablespace file only describe table and tablespace objects contained within the tablespace.

SDI data is updated by DDL operations on a table or CHECK TABLE FOR UPGRADE. SDI data is not updated when the MySQL server is upgraded to a new release or version.

The presence of SDI data provides metadata redundancy. For example, if the data dictionary becomes unavailable, object metadata can be extracted directly from InnoDB tablespace files using the ibd2sdi tool.

For InnoDB, an SDI record requires a single index page, which is 16 KB in size by default. However, SDI data is compressed to reduce the storage footprint.

For partitioned InnoDB tables comprised of multiple tablespaces, SDI data is stored in the tablespace file of the first partition.

The MySQL server uses an internal API that is accessed during DDL operations to create and maintain SDI records.

The IMPORT TABLE statement imports MyISAM tables based on information contained in . sdi files. For more information, see Section 15.2.6, "IMPORT TABLE Statement".

\subsection*{16.7 Data Dictionary Usage Differences}

Use of a data dictionary-enabled MySQL server entails some operational differences compared to a server that does not have a data dictionary:
- Previously, enabling the innodb_read_only system variable prevented creating and dropping tables only for the InnoDB storage engine. As of MySQL 8.4, enabling innodb_read_only prevents these operations for all storage engines. Table creation and drop operations for any storage engine modify data dictionary tables in the mysql system database, but those tables use the InnoDB storage engine and cannot be modified when innodb_read_only is enabled. The same principle applies to other table operations that require modifying data dictionary tables. Examples:
- ANALYZE TABLE fails because it updates table statistics, which are stored in the data dictionary.
- ALTER TABLE tbl_name ENGINE=engine_name fails because it updates the storage engine designation, which is stored in the data dictionary.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2978.jpg?height=126&width=99&top_left_y=2179&top_left_x=342)

> Note
> Enabling innodb_read_only also has important implications for nondata dictionary tables in the mysql system database. For details, see the description of innodb_read_only in Section 17.14, "InnoDB Startup Options and System Variables"
- Previously, tables in the mysql system database were visible to DML and DDL statements. As of MySQL 8.4, data dictionary tables are invisible and cannot be modified or queried directly. However, in most cases there are corresponding INFORMATION_SCHEMA tables that can be queried instead. This enables the underlying data dictionary tables to be changed as server development proceeds, while maintaining a stable INFORMATION_SCHEMA interface for application use.
- INFORMATION_SCHEMA tables in MySQL 8.4 are closely tied to the data dictionary, resulting in several usage differences:
- Previously, INFORMATION_SCHEMA queries for table statistics in the STATISTICS and TABLES tables retrieved statistics directly from storage engines. As of MySQL 8.4, cached table statistics are used by default. The information_schema_stats_expiry system variable defines the period of time before cached table statistics expire. The default is 86400 seconds ( 24 hours). (To update the cached values at any time for a given table, use ANALYZE TABLE.) If there are no cached statistics or statistics have expired, statistics are retrieved from storage engines when querying table statistics columns. To always retrieve the latest statistics directly from storage engines, set information_schema_stats_expiry to 0 . For more information, see Section 10.2.3, "Optimizing INFORMATION_SCHEMA Queries".
- Several INFORMATION_SCHEMA tables are views on data dictionary tables, which enables the optimizer to use indexes on those underlying tables. Consequently, depending on optimizer choices, the row order of results for INFORMATION_SCHEMA queries might differ from previous results. If a query result must have specific row ordering characteristics, include an ORDER BY clause.
- Queries on INFORMATION_SCHEMA tables may return column names in a different lettercase than in earlier MySQL series. Applications should test result set column names in case-insensitive fashion. If that is not feasible, a workaround is to use column aliases in the select list that return column names in the required lettercase. For example:

SELECT TABLE_SCHEMA AS table_schema, TABLE_NAME AS table_name
FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'users';
- mysqldump no longer dumps the INFORMATION_SCHEMA database, even if explicitly named on the command line.
- CREATE TABLE dst_tbl LIKE src_tbl requires that src_tbl be a base table and fails if it is an INFORMATION_SCHEMA table that is a view on data dictionary tables.
- Previously, result set headers of columns selected from INFORMATION_SCHEMA tables used the capitalization specified in the query. This query produces a result set with a header of table_name:

SELECT table_name FROM INFORMATION_SCHEMA.TABLES;
As of MySQL 8.4, these headers are capitalized; the preceding query produces a result set with a header of TABLE_NAME. If necessary, a column alias can be used to achieve a different lettercase.
For example:
SELECT table_name AS 'table_name' FROM INFORMATION_SCHEMA.TABLES;
- The data directory affects how mysqldump dumps information from the mysql system database:
- mysqldump only dumps non-data dictionary tables in that database, when previously it was possible to dump all tables in the mysql system database.
- Previously, the --routines and --events options were not required to include stored routines and events when using the --all-databases option: The dump included the mysql system database, and therefore also the proc and event tables containing stored routine and event definitions. As of MySQL 8.4, the event and proc tables are not used. Definitions for the corresponding objects are stored in data dictionary tables, but those tables are not dumped. To include stored routines and events in a dump made using --all-databases, use the -routines and --events options explicitly.
- Previously, the - - routines option required the SELECT privilege for the proc table. As of MySQL 8.4, that table is not used; - - routines requires the global SELECT privilege instead.
- Previously, it was possible to dump stored routine and event definitions together with their creation and modification timestamps, by dumping the proc and event tables. As of MySQL 8.4, those tables are not used, so it is not possible to dump timestamps.
- Previously, creating a stored routine that contains illegal characters produced a warning. As of MySQL 8.4, this is an error.

\subsection*{16.8 Data Dictionary Limitations}

This section describes temporary limitations introduced with the MySQL data dictionary.
- Manual creation of database directories under the data directory (for example, with mkdir) is unsupported. Manually created database directories are not recognized by the MySQL Server.
- DDL operations take longer due to writing to storage, undo logs, and redo logs instead of . frm files.

