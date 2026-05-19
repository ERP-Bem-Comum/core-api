\section*{Chapter 3 Upgrading MySQL}
Table of Contents
3.1 Before You Begin ..... 223
3.2 Upgrade Paths ..... 224
3.3 Upgrade Best Practices ..... 225
3.4 What the MySQL Upgrade Process Upgrades ..... 228
3.5 Changes in MySQL 8.4 ..... 230
3.6 Preparing Your Installation for Upgrade ..... 232
3.7 Upgrading MySQL Binary or Package-based Installations on Unix/Linux ..... 234
3.8 Upgrading MySQL with the MySQL Yum Repository ..... 238
3.9 Upgrading MySQL with the MySQL APT Repository ..... 240
3.10 Upgrading MySQL with the MySQL SLES Repository ..... 240
3.11 Upgrading MySQL on Windows ..... 240
3.12 Upgrading a Docker Installation of MySQL ..... 241
3.13 Upgrade Troubleshooting ..... 241
3.14 Rebuilding or Repairing Tables or Indexes ..... 242
3.15 Copying MySQL Databases to Another Machine ..... 243

This chapter describes the steps to upgrade a MySQL installation.
Upgrading is a common procedure, as you pick up bug fixes within the same MySQL release series or significant features between major MySQL releases. You perform this procedure first on some test systems to make sure everything works smoothly, and then on the production systems.

\section*{Note}

In the following discussion, MySQL commands that must be run using a MySQL account with administrative privileges include - u root on the command line to specify the MySQL root user. Commands that require a password for root also include a - p option. Because - p is followed by no option value, such commands prompt for the password. Type the password when prompted and press Enter.

SQL statements can be executed using the mysql command-line client (connect as root to ensure that you have the necessary privileges).

\subsection*{3.1 Before You Begin}

Review the information in this section before upgrading. Perform any recommended actions.
- Understand what may occur during an upgrade. See Section 3.4, "What the MySQL Upgrade Process Upgrades".
- Protect your data by creating a backup. The backup should include the mysql system database, which contains the MySQL data dictionary tables and system tables. See Section 9.2, "Database Backup Methods".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0253.jpg?height=127&width=108&top_left_y=2343&top_left_x=397)

\section*{Important}

Downgrade from MySQL 8.4 to MySQL 8.3, or from a MySQL 8.4 release to a previous MySQL 8.4 release, is not supported. The only supported alternative is to restore a backup taken before upgrading. It is therefore imperative that you back up your data before starting the upgrade process.
- Review Section 3.2, "Upgrade Paths" to ensure that your intended upgrade path is supported.
- Review Section 3.5, "Changes in MySQL 8.4" for changes that you should be aware of before upgrading. Some changes may require action.
- Review Section 1.4, "What Is New in MySQL 8.4 since MySQL 8.0" for deprecated and removed features. An upgrade may require changes with respect to those features if you use any of them.
- Review Section 1.5, "Server and Status Variables and Options Added, Deprecated, or Removed in MySQL 8.4 since 8.0 ". If you use deprecated or removed variables, an upgrade may require configuration changes.
- Review the Release Notes for information about fixes, changes, and new features.
- If you use replication, review Section 19.5.3, "Upgrading or Downgrading a Replication Topology".
- Review Section 3.3, "Upgrade Best Practices" and plan accordingly.
- Upgrade procedures vary by platform and how the initial installation was performed. Use the procedure that applies to your current MySQL installation:
- For binary and package-based installations on non-Windows platforms, refer to Section 3.7, "Upgrading MySQL Binary or Package-based Installations on Unix/Linux".

> Note
> For supported Linux distributions, the preferred method for upgrading package-based installations is to use the MySQL software repositories (MySQL Yum Repository, MySQL APT Repository, and MySQL SLES Repository).
- For installations on an Enterprise Linux platform or Fedora using the MySQL Yum Repository, refer to Section 3.8, "Upgrading MySQL with the MySQL Yum Repository".
- For installations on Ubuntu using the MySQL APT repository, refer to Section 3.9, "Upgrading MySQL with the MySQL APT Repository".
- For installations on SLES using the MySQL SLES repository, refer to Section 3.10, "Upgrading MySQL with the MySQL SLES Repository".
- For installations performed using Docker, refer to Section 3.12, "Upgrading a Docker Installation of MySQL".
- For installations on Windows, refer to Section 3.11, "Upgrading MySQL on Windows".
- If your MySQL installation contains a large amount of data that might take a long time to convert after an in-place upgrade, it may be useful to create a test instance for assessing the conversions that are required and the work involved to perform them. To create a test instance, make a copy of your MySQL instance that contains the mysql database and other databases without the data. Run the upgrade procedure on the test instance to assess the work involved to perform the actual data conversion.
- Rebuilding and reinstalling MySQL language interfaces is recommended when you install or upgrade to a new release of MySQL. This applies to MySQL interfaces such as PHP mysql extensions and the Perl DBD: : mysql module.

\subsection*{3.2 Upgrade Paths}

\section*{Notes}
- Make sure you understand the MySQL release model for MySQL for MySQL long long-term support (LTS) and Innovation versions before proceeding with a downgrade.
- We recommend checking upgrade compatibility with MySQL Shell's Upgrade Checker Utility before performing an upgrade.
- A replication topology is upgraded by following the rolling upgrade scheme described at Section 19.5.3, "Upgrading or Downgrading a Replication Topology", which uses one of the supported single-server methods for each individual server upgrade.
- Monthly Rapid Updates (MRUs) and hot fixes also count as releases in this documentation.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 3.1 Upgrade Paths for MySQL Server}
\begin{tabular}{|l|l|l|}
\hline Upgrade Path & Path Examples & Supported Upgrade Methods \\
\hline Within an LTS or Bugfix series & 8.0.37 to 8.0.41 or 8.4.0 to 8.4.4 & In-place upgrade, logical dump and load, replication, and MySQL Clone \\
\hline From an LTS or Bugfix series to the next LTS series & 8.0.37 to 8.4.x LTS & In-place upgrade, logical dump and load, and replication \\
\hline From an LTS or Bugfix release to an Innovation release before the next LTS series & 8.0.34 to 8.3.0 or 8.4.0 to 9.0.0 & In-place upgrade, logical dump and load, and replication \\
\hline From an Innovation series to the next LTS series & 8.3.0 to 8.4 LTS & In-place upgrade, logical dump and load, and replication \\
\hline From an Innovation series to an Innovation release after the next LTS series & Not allowed, two steps are required: 8.3.0 to 8.4 LTS, and 8.4 LTS to 9.x Innovation & In-place upgrade, logical dump and load, and replication \\
\hline From within an Innovation series & 8.1.0 to 8.3.0 & In-place upgrade, logical dump and load, and replication \\
\hline From MySQL 5.7 to an LTS or Innovation release & MySQL 5.7 to 8.4 & A bugfix or LTS series cannot be skipped, so in this example first upgrade MySQL 5.7 to MySQL 8.0, and then upgrade MySQL 8.0 to MySQL 8.4. \\
\hline
\end{tabular}
\end{table}

\subsection*{3.3 Upgrade Best Practices}

MySQL supports upgrading between minor versions (within an LTS series) and to the next major version (across an LTS series). Upgrading provides the latest features, performance, and security fixes.

To prepare and help ensure that your upgrade to the latest MySQL release is successful, we recommend the following best practices:
- Decide on Major or Minor Version for Upgrade
- Decide on Upgrade Type
- Review Supported Platforms
- Understand MySQL Server Changes
- Run Upgrade Checker and Fix Incompatibilities
- Run Applications in a Test Environment
- Benchmark Applications and Workload Performance
- Run Both MySQL Versions in Parallel
- Run Final Test Upgrade
- Check MySQL Backup
- Upgrade Production Server
- Enterprise Support

\section*{Decide on Major or Minor Version for Upgrade}

The MySQL Release Model makes a distinction between LTS (Long Term Support) and Innovation Releases. LTS releases have $8+$ years of support and are meant for production use. Innovation Releases provide users with the latest features and capabilities. Learn more about the MySQL Release Model.

Performing a minor version upgrade is straightforward while major version upgrades require strategic planning and additional testing before the upgrade. This guide is especially useful for major version upgrades.

\section*{Decide on Upgrade Type}

There are three main ways to upgrade MySQL; read the associated documentation to determine which type of upgrade is best suited for your situation.
- An in-place upgrade: replacing the MySQL Server packages.
- A logical upgrade: exporting SQL from the old MySQL instance to the new.
- A replication topology upgrade: account for each server's topology role.

\section*{Review Supported Platforms}

If your current operating system is not supported by the new version of MySQL, then plan to upgrade the operating system as otherwise an in-place upgrade is not supported.

For a current list of supported platforms, see: https://www.mysql.com/support/supportedplatforms/ database.html

\section*{Understand MySQL Server Changes}

Each major version comes with new features, changes in behavior, deprecations, and removals. It is important to understand the impact of each of these to existing applications.

See: Section 3.5, "Changes in MySQL 8.4".

\section*{Run Upgrade Checker and Fix Incompatibilities}

MySQL Shell's Upgrade Checker Utility detects incompatibilities between database versions that must be addressed before performing the upgrade. The util.checkForServerUpgrade() function verifies that MySQL server instances are ready to upgrade. Connect to the existing MySQL server and select the MySQL Server version you plan to upgrade to for the utility to report issues to address prior to an upgrade. These include incompatibilities in data types, storage engines, and so on.

You are ready to upgrade when the upgrade checking utility no longer reports any issues.

\section*{Run Applications in a Test Environment}

After completing the upgrade checker's requirements, next test your applications on the new target MySQL server. Check for errors and warnings in the MySQL error log and application logs.

\section*{Benchmark Applications and Workload Performance}

We recommend benchmarking your own applications and workloads by comparing how they perform using the previous and new versions of MySQL. Usually, newer MySQL versions add features and improve performance but there are cases where an upgrade might run slower for specific queries. Possible issues resulting in performance regressions:
- Prior server configuration is not optimal for newer version
- Changes to data types
- Additional storage required by Multi-byte character set support
- Storage engines changes
- Dropped or changed indexes
- Stronger encryption
- Stronger authentication
- SQL optimizer changes
- Newer version of MySQL require additional memory
- Physical or Virtual Hardware is slower - compute or storage

For related information and potential mitigation techniques, see Valid Performance Regressions.

\section*{Run Both MySQL Versions in Parallel}

To minimize risk, it is best keep the current system running while running the upgraded system in parallel.

\section*{Run Final Test Upgrade}

Practice and do a run though prior to upgrading your production server. Thoroughly test the upgrade procedures before upgrading a production system.

\section*{Check MySQL Backup}

Check that the full backup exists and is viable before performing the upgrade.

\section*{Upgrade Production Server}

You are ready to complete the upgrade.

\section*{Enterprise Support}

If you're a MySQL Enterprise Edition customer, you can also contact the MySQL Support Team experts with any questions you may have.

\subsection*{3.4 What the MySQL Upgrade Process Upgrades}

Installing a new version of MySQL may require upgrading these parts of the existing installation:
- The mysql system schema, which contains tables that store information required by the MySQL server as it runs (see Section 7.3, "The mysql System Schema"). mysql schema tables fall into two broad categories:
- Data dictionary tables, which store database object metadata.
- System tables (that is, the remaining non-data dictionary tables), which are used for other operational purposes.
- Other schemas, some of which are built in and may be considered "owned" by the server, and others which are not:
- The performance_schema, INFORMATION_SCHEMA, ndbinfo, and sys schemas.
- User schemas.

Two distinct version numbers are associated with parts of the installation that may require upgrading:
- The data dictionary version. This applies to the data dictionary tables.
- The server version, also known as the MySQL version. This applies to the system tables and objects in other schemas.

In both cases, the actual version applicable to the existing MySQL installation is stored in the data dictionary, and the current expected version is compiled into the new version of MySQL. When an actual version is lower than the current expected version, those parts of the installation associated with that version must be upgraded to the current version. If both versions indicate an upgrade is needed, the data dictionary upgrade must occur first.

As a reflection of the two distinct versions just mentioned, the upgrade occurs in two steps:
- Step 1: Data dictionary upgrade.

This step upgrades:
- The data dictionary tables in the mysql schema. If the actual data dictionary version is lower than the current expected version, the server creates data dictionary tables with updated definitions, copies persisted metadata to the new tables, atomically replaces the old tables with the new ones, and reinitializes the data dictionary.
- The Performance Schema, INFORMATION_SCHEMA, and ndbinfo.
- Step 2: Server upgrade.

This step comprises all other upgrade tasks. If the server version of the existing MySQL installation is lower than that of the new installed MySQL version, everything else must be upgraded:
- The system tables in the mysql schema (the remaining non-data dictionary tables).
- The sys schema.
- User schemas.

The data dictionary upgrade (step 1) is the responsibility of the server, which performs this task as necessary at startup unless invoked with an option that prevents it from doing so. The option is - upgrade=NONE.

If the data dictionary is out of date but the server is prevented from upgrading it, the server does not run, and exits with an error instead. For example:
```
[ERROR] [MY-013381] [Server] Server shutting down because upgrade is
required, yet prohibited by the command line option '--upgrade=NONE'.
[ERROR] [MY-010334] [Server] Failed to initialize DD Storage Engine
[ERROR] [MY-010020] [Server] Data Dictionary initialization failed.
```


The --upgrade server option controls whether and how the server performs an automatic upgrade at startup:
- With no option or with - - upgrade=AUTO, the server upgrades anything it determines to be out of date (steps 1 and 2).
- With - - upgrade=NONE, the server upgrades nothing (skips steps 1 and 2), but also exits with an error if the data dictionary must be upgraded. It is not possible to run the server with an out-of-date data dictionary; the server insists on either upgrading it or exiting.
- With - - upgrade=MINIMAL, the server upgrades the data dictionary, the Performance Schema, and the INFORMATION_SCHEMA, if necessary (step 1). Note that following an upgrade with this option, Group Replication cannot be started, because system tables on which the replication internals depend are not updated, and reduced functionality might also be apparent in other areas.
- With - - upgrade=FORCE, the server upgrades the data dictionary, the Performance Schema, and the INFORMATION_SCHEMA, if necessary (step 1), and forces an upgrade of everything else (step 2). Expect server startup to take longer with this option because the server checks all objects in all schemas.

FORCE is useful to force step 2 actions to be performed if the server thinks they are not necessary. One way that FORCE differs from AUTO is that with FORCE, the server re-creates system tables such as help tables or time zone tables if they are missing.

Additional notes about what occurs during upgrade step 2:
- Step 2 installs the sys schema if it is not installed, and upgrades it to the current version otherwise. An error occurs if a sys schema exists but has no version view, on the assumption that its absence indicates a user-created schema:
```
A sys schema exists with no sys.version view. If
you have a user created sys schema, this must be renamed for the
upgrade to succeed.
```


To upgrade in this case, remove or rename the existing sys schema first. Then perform the upgrade procedure again. (It may be necessary to force step 2.)

To prevent the sys schema check, start the server with the --upgrade=NONE or - upgrade=MINIMAL option.
- Step 2 upgrades the system tables to ensure that they have the current structure, and this includes the help tables but not the time zone tables. The procedure for loading time zone tables is platform dependent and requires decision making by the DBA, so it cannot be done automatically.
- When Step 2 is upgrading the system tables in the mysql schema, the column order in the primary key of the mysql.db, mysql.tables_priv, mysql.columns_priv and mysql.procs_priv tables is changed to place the host name and user name columns together. Placing the host name and user name together means that index lookup can be used, which improves performance for CREATE USER, DROP USER, and RENAME USER statements, and for ACL checks for multiple users with multiple privileges. Dropping and re-creating the index is necessary and might take some time if the system has a large number of users and privileges.
- Step 2 processes all tables in all user schemas as necessary. Table checking might take a long time to complete. Each table is locked and therefore unavailable to other sessions while it is being processed. Check and repair operations can be time-consuming, particularly for large tables. Table checking uses the FOR UPGRADE option of the CHECK TABLE statement. For details about what this option entails, see Section 15.7.3.2, "CHECK TABLE Statement".

To prevent table checking, start the server with the --upgrade=NONE or --upgrade=MINIMAL option.

To force table checking, start the server with the --upgrade=FORCE option.
- Step 2 marks all checked and repaired tables with the current MySQL version number. This ensures that the next time upgrade checking occurs with the same version of the server, it can be determined whether there is any need to check or repair a given table again.

\subsection*{3.5 Changes in MySQL 8.4}

Before upgrading to MySQL 8.4, review the changes described in the following sections to identify those that apply to your current MySQL installation and applications.
- Incompatible Changes in MySQL 8.4
- Changed Server Defaults

In addition, you can consult the resources listed here:
- Section 1.4, "What Is New in MySQL 8.4 since MySQL 8.0"
- MySQL 8.4 Release Notes

\section*{Incompatible Changes in MySQL 8.4}

This section contains information about incompatible changes in MySQL 8.4.
- Spatial indexes. When upgrading to MySQL 8.4.4 or later, it is recommended that you drop any spatial indexes beforehand, then re-create them after the upgrade is complete. Alternatively, you can drop and re-create such indexes immediately following the upgrade, but before making use of any of the tables in which they occur.

For more information, see Section 13.4.10, "Creating Spatial Indexes".
- WAIT_UNTIL_SQL_THREAD_AFTER_GTIDS() function removed. The WAIT_UNTIL_SQL_THREAD_AFTER_GTIDS( ) SQL function, deprecated in MySQL 8.0 has been removed; attempting to invoke it now causes a syntax error. Use WAIT_FOR_EXECUTED_GTID_SET( ) instead.
- authentication_fido and authentication_fido_client no longer available on some platforms. Due to upgrading the libfido2 library bundled with the server to version 1.13.0, which requires OpenSSL 1.1.1 or higher, the authentication_fido and authentication_fido_client authentication plugins are no longer available on Enterprise Linux 6, Enterprise Linux 7, Solaris 11, or SUSE Enterprise Linux 12.
- NULL disallowed for command-line options. Setting server variables equal to SQL NULL on the command line is not supported. In MySQL 8.4, setting any of these to NULL is specifically disallowed, and attempting to do is rejected with an error.

The following variables are excepted from this restriction: admin_ssl_ca, admin_ssl_capath, admin_ssl_cert, admin_ssl_cipher, admin_tls_ciphersuites, admin_ssl_key, admin_ssl_crl, admin_ssl_crlpath, basedir, character_sets_dir, ft_stopword_file, group_replication_recovery_tls_ciphersuites, init_file, lc_messages_dir, plugin_dir, relay_log, relay_log_info_file, replica_load_tmpdir, ssl_ca, ssl_capath, ssl_cert, ssl_cipher, ssl_crl, ssl_crlpath, ssl_key, socket, tls_ciphersuites, and tmpdir.

See also Section 7.1.8, "Server System Variables".

For additional information about changes in MySQL 8.4, see Section 1.4, "What Is New in MySQL 8.4 since MySQL 8.0".

\section*{Changed Server Defaults}

This section contains information about MySQL server system variables whose default values have changed in MySQL 8.4 as compared to MySQL 8.0.

\begin{tabular}{|l|l|l|l|}
\hline System Variable & Old Default & New Default & \\
\hline InnoDB changes & & & \\
\hline innodb_adaptive_hash_inde & ON & 0FF & \\
\hline innodb_buffer_pool_in_cor & @Nfile & OFF & \\
\hline innodb_buffer_pool_instan & ciensodb_buffer_pool_size < 1GB: 1; otherwise: 8 & innodb_buffer_pool_size <= 1GB: 1; otherwise: MIN( 0.5 * (innodb_buffer_pool_size / innodb_buffer_pool_chunk 0.25 * number_of_cpus) & size), \\
\hline innodb_change_buffering & all & none & \\
\hline innodb_doublewrite_files & innodb_buffer_pool_instan * 2 & 2es & \\
\hline innodb_doublewrite_pages & Value of innodb_write_io_threads & 128 & \\
\hline innodb_flush_method & fsync & O_DIRECT if supported, otherwise fsync & \\
\hline innodb_io_capacity & 200 & 10000 & \\
\hline innodb_io_capacity_max & MIN(2 * innodb_io_capacity, 2000) & 2 * innodb_io_capacity & \\
\hline innodb_log_buffer_size & 16777216 & 67108864 & \\
\hline innodb_numa_interleave & 0FF & ON & \\
\hline innodb_page_cleaners & 4 & Value of innodb_buffer_pool_instance & \\
\hline innodb_parallel_read_thre & adds & MIN(number_of_cpus / 8, 4) & \\
\hline innodb_purge_threads & 4 & If number_of_cpus <= 16: 1; otherwise: 4 & \\
\hline innodb_use_fdatasync & OFF & ON & \\
\hline Group Replication changes & & & \\
\hline group_replication_consist & ENCENTUAL & BEFORE_ON_PRIMARY_FAILOVER & \\
\hline group_replication_exit_st & REEA DacONLOM & OFFLINE_MODE & \\
\hline Temporary table changes & & & \\
\hline temptable_max_mmap & 1073741824 & 0 & \\
\hline temptable_max_ram & 1073741824 & 3\% of total memory within a range of 1-4 (GB) & \\
\hline temptable_use_mmap & ON & 0FF & \\
\hline
\end{tabular}

For more information about options or variables which have been added, see Option and Variable Changes for MySQL 8.4, in the MySQL Server Version Reference.

Although the new defaults are the best configuration choices for most use cases, there are special cases, as well as legacy reasons for using existing configuration choices. For example, some people prefer to upgrade to MySQL 8.4 with as few changes to their applications or operational environment as possible. We recommend to evaluate all the new defaults and use as many as you can.

The Performance Schema variables_info table shows, for each system variable, the source from which it was most recently set, as well as its range of values. This provides SQL access to all there is to know about a system variable and its values.

\subsection*{3.6 Preparing Your Installation for Upgrade}

Before upgrading to the latest MySQL 8.4 release, ensure the upgrade readiness of your current MySQL 8.0 or MySQL 8.4 server instance by performing the preliminary checks described below. The upgrade process may fail otherwise.

> Tip
> Consider using the MySQL Shell upgrade checker utility that enables you to verify whether MySQL server instances are ready for upgrade. You can select a target MySQL Server release to which you plan to upgrade, ranging from the MySQL Server 8.0.11 up to the MySQL Server release number that matches the current MySQL Shell release number. The upgrade checker utility carries out the automated checks that are relevant for the specified target release, and advises you of further relevant checks that you should make manually. The upgrade checker works for all Bugfix, Innovation, and LTS releases of MySQL. Installation instructions for MySQL Shell can be found here.

Preliminary checks:
1. The following issues must not be present:
- There must be no tables that use obsolete data types or functions.
- There must be no orphan .frm files.
- Triggers must not have a missing or empty definer or an invalid creation context (indicated by the character_set_client, collation_connection, Database Collation attributes displayed by SHOW TRIGGERS or the INFORMATION_SCHEMA TRIGGERS table). Any such triggers must be dumped and restored to fix the issue.

To check for these issues, execute this command:
```
mysqlcheck -u root -p --all-databases --check-upgrade
```


If mysqlcheck reports any errors, correct the issues.
2. There must be no partitioned tables that use a storage engine that does not have native partitioning support. To identify such tables, execute this query:
```
SELECT TABLE_SCHEMA, TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE ENGINE NOT IN ('innodb', 'ndbcluster')
        AND CREATE_OPTIONS LIKE '%partitioned%';
```


Any table reported by the query must be altered to use InnoDB or be made nonpartitioned. To change a table storage engine to InnoDB, execute this statement:
```
ALTER TABLE table_name ENGINE = INNODB;
```


For information about converting MyISAM tables to InnoDB, see Section 17.6.1.5, "Converting Tables from MyISAM to InnoDB".

To make a partitioned table nonpartitioned, execute this statement:
```
ALTER TABLE table_name REMOVE PARTITIONING;
```

3. Some keywords may be reserved in MySQL 8.4 that were not reserved previously. See Section 11.3, "Keywords and Reserved Words". This can cause words previously used as identifiers to become illegal. To fix affected statements, use identifier quoting. See Section 11.2, "Schema Object Names".
4. There must be no tables in the MySQL 8.3 mysql system database that have the same name as a table used by the MySQL 8.4 data dictionary. To identify tables with those names, execute this query:
```
SELECT TABLE_SCHEMA, TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE
    LOWER(TABLE_SCHEMA) = 'mysql'
    AND
    LOWER(TABLE_NAME) IN
    (
    'catalogs',
    'character_sets',
    'check_constraints',
    'collations',
    'column_statistics',
    'column_type_elements',
    'columns',
    'dd_properties',
    'events',
    'foreign_key_column_usage',
    'foreign_keys',
    'index_column_usage',
    'index_partitions',
    'index_stats',
    'indexes',
    'parameter_type_elements',
    'parameters',
    'resource_groups',
    'routines',
    'schemata',
    'st_spatial_reference_systems',
    'table_partition_values',
    'table_partitions',
    'table_stats',
    'tables',
    'tablespace_files',
    'tablespaces',
    'triggers',
    'view_routine_usage',
    'view_table_usage'
    );
```


Any tables reported by the query must be dropped or renamed (use RENAME TABLE). This may also entail changes to applications that use the affected tables.
5. There must be no tables that have foreign key constraint names longer than 64 characters. Use this query to identify tables with constraint names that are too long:
```
SELECT TABLE_SCHEMA, TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME IN
    (SELECT LEFT(SUBSTR(ID,INSTR(ID,'/')+1),
            INSTR(SUBSTR(ID,INSTR(ID,'/')+1),'_ibfk_' )-1)
        FROM INFORMATION_SCHEMA.INNODB_SYS_FOREIGN
        WHERE LENGTH(SUBSTR(ID,INSTR(ID,'/')+1))>64);
```


For a table with a constraint name that exceeds 64 characters, drop the constraint and add it back with constraint name that does not exceed 64 characters (use ALTER TABLE).
6. There must be no obsolete SQL modes defined by sql_mode system variable. Attempting to use an obsolete SQL mode prevents MySQL 8.4 from starting. Applications that use obsolete SQL modes should be revised to avoid them. For information about SQL modes removed in MySQL 8.4, see Server Changes.
7. Only upgrade a MySQL server instance that was properly shut down. If the instance unexpectedly shutdown, then restart the instance and shut it down with innodb_fast_shutdown=0 before upgrade.
8. There must be no views with explicitly defined columns names that exceed 64 characters (views with column names up to 255 characters were permitted in MySQL 5.7). To avoid upgrade errors, such views should be altered before upgrading. Currently, the only method of identify views with column names that exceed 64 characters is to inspect the view definition using SHOW CREATE VIEW. You can also inspect view definitions by querying the Information Schema VIEWS table.
9. There must be no tables or stored procedures with individual ENUM or SET column elements that exceed 255 characters or 1020 bytes in length. Prior to MySQL 8.4, the maximum combined length of ENUM or SET column elements was 64 K . In MySQL 8.4, the maximum character length of an individual ENUM or SET column element is 255 characters, and the maximum byte length is 1020 bytes. (The 1020 byte limit supports multibyte character sets). Before upgrading to MySQL 8.0, modify any ENUM or SET column elements that exceed the new limits. Failing to do so causes the upgrade to fail with an error.
10. Your MySQL 8.3 installation must not use features that are not supported by MySQL 8.4. Any changes here are necessarily installation specific, but the following example illustrates the kind of thing to look for:

Some server startup options and system variables have been removed in MySQL 8.4. See Features Removed in MySQL 8.4, and Section 1.5, "Server and Status Variables and Options Added, Deprecated, or Removed in MySQL 8.4 since 8.0 ". If you use any of these, an upgrade requires configuration changes.
11. If you intend to change the lower_case_table_names setting to 1 at upgrade time, ensure that schema and table names are lowercase before upgrading. Otherwise, a failure could occur due to a schema or table name lettercase mismatch. You can use the following queries to check for schema and table names containing uppercase characters:
```
mysql> select TABLE_NAME, if(sha(TABLE_NAME) !=sha(lower(TABLE_NAME)),'Yes','No') as UpperCase from inf
If lower_case_table_names=1, table and schema names are checked by the upgrade process
to ensure that all characters are lowercase. If table or schema names are found to contain uppercase characters, the upgrade process fails with an error.
```


\section*{Note}

Changing the lower_case_table_names setting at upgrade time is not recommended.

If upgrade to MySQL 8.4 fails due to any of the issues outlined above, the server reverts all changes to the data directory. In this case, remove all redo log files and restart the MySQL 8.3 server on the existing data directory to address the errors. The redo log files (ib_logfile*) reside in the MySQL data directory by default. After the errors are fixed, perform a slow shutdown (by setting innodb_fast_shutdown=0) before attempting the upgrade again.

\subsection*{3.7 Upgrading MySQL Binary or Package-based Installations on Unix/Linux}

This section describes how to upgrade MySQL binary and package-based installations on Unix/Linux. In-place and logical upgrade methods are described.
- In-Place Upgrade
- Logical Upgrade
- MySQL Cluster Upgrade

\section*{In-Place Upgrade}

An in-place upgrade involves shutting down the old MySQL server, replacing the old MySQL binaries or packages with the new ones, restarting MySQL on the existing data directory, and upgrading any remaining parts of the existing installation that require upgrading. For details about what may need upgrading, see Section 3.4, "What the MySQL Upgrade Process Upgrades".

\section*{Note}

If you are upgrading an installation originally produced by installing multiple RPM packages, upgrade all the packages, not just some. For example, if you previously installed the server and client RPMs, do not upgrade just the server RPM.

For some Linux platforms, MySQL installation from RPM or Debian packages includes systemd support for managing MySQL server startup and shutdown. On these platforms, mysqld_safe is not installed. In such cases, use systemd for server startup and shutdown instead of the methods used in the following instructions. See Section 2.5.9, "Managing MySQL Server with systemd".

For upgrades to MySQL Cluster installations, see also MySQL Cluster Upgrade.
To perform an in-place upgrade:
1. Review the information in Section 3.1, "Before You Begin".
2. Ensure the upgrade readiness of your installation by completing the preliminary checks in Section 3.6, "Preparing Your Installation for Upgrade".
3. If you use XA transactions with InnoDB, run XA RECOVER before upgrading to check for uncommitted XA transactions. If results are returned, either commit or rollback the XA transactions by issuing an XA COMMIT or XA ROLLBACK statement.
4. If you normally run your MySQL server configured with innodb_fast_shutdown set to 2 (cold shutdown), configure it to perform a fast or slow shutdown by executing either of these statements:
```
SET GLOBAL innodb_fast_shutdown = 1; -- fast shutdown
SET GLOBAL innodb_fast_shutdown = 0; -- slow shutdown
```


With a fast or slow shutdown, InnoDB leaves its undo logs and data files in a state that can be dealt with in case of file format differences between releases.
5. Shut down the old MySQL server. For example:
```
mysqladmin -u root -p shutdown
```

6. Upgrade the MySQL binaries or packages. If upgrading a binary installation, unpack the new MySQL binary distribution package. See Obtain and Unpack the Distribution. For package-based installations, install the new packages.
7. Start the MySQL 8.4 server, using the existing data directory. For example:
```
mysqld_safe --user=mysql --datadir=/path/to/existing-datadir &
```


If there are encrypted InnoDB tablespaces, use the --early-plugin-load option to load the keyring plugin.

When you start the MySQL 8.4 server, it automatically detects whether data dictionary tables are present. If not, the server creates them in the data directory, populates them with metadata, and then proceeds with its normal startup sequence. During this process, the server upgrades metadata for all database objects, including databases, tablespaces, system and user tables, views, and stored programs (stored procedures and functions, triggers, and Event Scheduler events). The server also removes files that previously were used for metadata storage. For example, after upgrading from MySQL 8.3 to MySQL 8.4, you may notice that tables no longer have .frm files.

If this step fails, the server reverts all changes to the data directory. In this case, you should remove all redo log files, start your MySQL 8.3 server on the same data directory, and fix the cause of any errors. Then perform another slow shutdown of the 8.3 server and start the MySQL 8.4 server to try again.
8. In the previous step, the server upgrades the data dictionary as necessary, making any changes required in the mysql system database between MySQL 8.3 and MySQL 8.4, so that you can take advantage of new privileges or capabilities. It also brings the Performance Schema, INFORMATION_SCHEMA, and sys databases up to date for MySQL 8.4, and examines all user databases for incompatibilities with the current version of MySQL.

\section*{Note}

The upgrade process does not upgrade the contents of the time zone tables. For upgrade instructions, see Section 7.1.15, "MySQL Server Time Zone Support".

\section*{Logical Upgrade}

A logical upgrade involves exporting SQL from the old MySQL instance using a backup or export utility such as mysqldump, installing the new MySQL server, and applying the SQL to your new MySQL instance. For details about what may need upgrading, see Section 3.4, "What the MySQL Upgrade Process Upgrades".

\section*{Note}

For some Linux platforms, MySQL installation from RPM or Debian packages includes systemd support for managing MySQL server startup and shutdown. On these platforms, mysqld_safe is not installed. In such cases, use systemd for server startup and shutdown instead of the methods used in the following instructions. See Section 2.5.9, "Managing MySQL Server with systemd".

\section*{Warning}

Applying SQL extracted from a previous MySQL release to a new MySQL release may result in errors due to incompatibilities introduced by new, changed, deprecated, or removed features and capabilities. Consequently, SQL extracted from a previous MySQL release may require modification to enable a logical upgrade.

To identify incompatibilities before upgrading to the latest MySQL 8.4 release, perform the steps described in Section 3.6, "Preparing Your Installation for Upgrade".

To perform a logical upgrade:
1. Review the information in Section 3.1, "Before You Begin".
2. Export your existing data from the previous MySQL installation:
```
mysqldump -u root -p
```

```
--add-drop-table --routines --events
--all-databases --force > data-for-upgrade.sql
```


\section*{Note}

Use the --routines and --events options with mysqldump (as shown above) if your databases include stored programs. The --all-databases option includes all databases in the dump, including the mysql database that holds the system tables.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0267.jpg?height=95&width=100&top_left_y=639&top_left_x=424)

\section*{Important}

If you have tables that contain generated columns, use the mysqldump utility provided with MySQL 5.7.9 or higher to create your dump files. The mysqldump utility provided in earlier releases uses incorrect syntax for generated column definitions (Bug \#20769542). You can use the Information Schema COLUMNS table to identify tables with generated columns.
3. Shut down the old MySQL server. For example:
```
mysqladmin -u root -p shutdown
```

4. Install MySQL 8.4. For installation instructions, see Chapter 2, Installing MySQL.
5. Initialize a new data directory, as described in Section 2.9.1, "Initializing the Data Directory". For example:
```
mysqld --initialize --datadir=/path/to/8.4-datadir
```


Copy the temporary 'root '@'localhost ' password displayed to your screen or written to your error log for later use.
6. Start the MySQL 8.4 server, using the new data directory. For example:
```
mysqld_safe --user=mysql --datadir=/path/to/8.4-datadir &
```

7. Reset the root password:
```
$> mysql -u root -p
Enter password: **** <- enter temporary root password
mysql> ALTER USER USER() IDENTIFIED BY 'your new password';
```

8. Load the previously created dump file into the new MySQL server. For example:
```
mysql -u root -p --force < data-for-upgrade.sql
```


\section*{Note}

It is not recommended to load a dump file when GTIDs are enabled on the server (gtid_mode=0N), if your dump file includes system tables. mysqldump issues DML instructions for the system tables which use the non-transactional MyISAM storage engine, and this combination is not permitted when GTIDs are enabled. Also be aware that loading a dump file from a server with GTIDs enabled, into another server with GTIDs enabled, causes different transaction identifiers to be generated.
9. Perform any remaining upgrade operations:

Shut down the server, then restart it with the --upgrade=FORCE option to perform the remaining upgrade tasks:
```
mysqladmin -u root -p shutdown
```

```
mysqld_safe --user=mysql --datadir=/path/to/8.4-datadir --upgrade=FORCE &
```


Upon restart with --upgrade=FORCE, the server makes any changes required in the mysql system schema between MySQL 8.3 and MySQL 8.4, so that you can take advantage of new privileges or capabilities. It also brings the Performance Schema, INFORMATION_SCHEMA, and sys schema up to date for MySQL 8.4, and examines all user schemas for incompatibilities with the current version of MySQL.

\section*{Note}

The upgrade process does not upgrade the contents of the time zone tables. For upgrade instructions, see Section 7.1.15, "MySQL Server Time Zone Support".

\section*{MySQL Cluster Upgrade}

The information in this section is an adjunct to the in-place upgrade procedure described in In-Place Upgrade, for use if you are upgrading MySQL Cluster.

A MySQL Cluster upgrade can be performed as a regular rolling upgrade, following the usual three ordered steps:
1. Upgrade MGM nodes.
2. Upgrade data nodes one at a time.
3. Upgrade API nodes one at a time (including MySQL servers).

There are two steps to upgrading each individual mysqld:
1. Import the data dictionary.

Start the new server with the --upgrade=MINIMAL option to upgrade the data dictionary but not the system tables.

The MySQL server must be connected to NDB for this phase to complete. If any NDB or NDBINFO tables exist, and the server cannot connect to the cluster, it exits with an error message:

Failed to Populate DD tables.
2. Upgrade the system tables by restarting each individual mysqld without the --upgrade=MINIMAL option.

\subsection*{3.8 Upgrading MySQL with the MySQL Yum Repository}

For supported Yum-based platforms (see Section 2.5.1, "Installing MySQL on Linux Using the MySQL Yum Repository", for a list), you can perform an in-place upgrade for MySQL (that is, replacing the old version and then running the new version using the old data files) with the MySQL Yum repository.

\section*{Notes}
- An innovation series, such as MySQL 9.6, is in a separate track than an LTS series, such as MySQL 8.4. The LTS series is active by default.
- Before performing any update to MySQL, follow carefully the instructions in Chapter 3, Upgrading MySQL. Among other instructions discussed there, it is especially important to back up your database before the update.
- The following instructions assume you have installed MySQL with the MySQL Yum repository or with an RPM package directly downloaded from MySQL

I
Developer Zone's MySQL Download page; if that is not the case, following the instructions in Replacing a Native Third-Party Distribution of MySQL.

\section*{Selecting a Target Series}

By default, the MySQL Yum repository updates MySQL to the latest version in the release track you have chosen during installation (see Selecting a Release Series for details), which means, for example, a 8.0.x installation is not updated to a 8.4.x release automatically. To update to another release series, you must first disable the subrepository for the series that has been selected (by default, or by yourself) and enable the subrepository for your target series. To do that, see the general instructions given in Selecting a Release Series for editing the subrepository entries in the /etc/yum.repos.d/mysql-community.repo file.

As a general rule, to upgrade from one bugfix series to another, go to the next bugfix series rather than skipping a bugfix series. For example, if you are currently running MySQL 5.7 and wish to upgrade to MySQL 8.4, upgrade to MySQL 8.0 first before upgrading to MySQL 8.4. For additional details, see Section 3.5, "Changes in MySQL 8.4".
- For important information about upgrading from MySQL 5.7 to 8.0, see Upgrading from MySQL 5.7 to 8.0.
- For important information about upgrading from MySQL 8.0 to 8.4, see Upgrading from MySQL 8.0 to 8.4.
- In-place downgrading of MySQL is not supported by the MySQL Yum repository. Follow the instructions in Chapter 4, Downgrading MySQL.

\section*{Upgrading MySQL}

Upgrade MySQL components using standard yum (or dnf) commands, such as MySQL Server:
```
sudo yum update mysql-server
```


For platforms that are dnf-enabled:
```
sudo dnf upgrade mysql-server
```


Alternatively, you can update MySQL by telling Yum to update everything on your system, which might take considerably more time. For platforms that are not dnf-enabled:
```
sudo yum update
```


For platforms that are dnf-enabled:
```
sudo dnf upgrade
```


\section*{Note}

The MySQL server always restarts after an update by Yum.

You can also update only a specific component. Use the following command to list all the installed packages for the MySQL components (for dnf-enabled systems, replace yum in the command with dnf):
```
sudo yum list installed | grep "^mysql"
```


After identifying the package name of the component of your choice, update the package with the following command, replacing package-name with the name of the package. For platforms that are not dnf-enabled:
```
sudo yum update package-name
```


For dnf-enabled platforms:
sudo dnf upgrade package-name

\section*{Upgrading the Shared Client Libraries}

After updating MySQL using the Yum repository, applications compiled with older versions of the shared client libraries should continue to work.

If you recompile applications and dynamically link them with the updated libraries: As typical with new versions of shared libraries where there are differences or additions in symbol versioning between the newer and older libraries (for example, between the newer, standard 8.4 shared client libraries and some older-prior or variant-versions of the shared libraries shipped natively by the Linux distributions' software repositories, or from some other sources), any applications compiled using the updated, newer shared libraries require those updated libraries on systems where the applications are deployed. As expected, if those libraries are not in place, the applications requiring the shared libraries fail. For this reason, be sure to deploy the packages for the shared libraries from MySQL on those systems. To do this, add the MySQL Yum repository to the systems (see Adding the MySQL Yum Repository) and install the latest shared libraries using the instructions given in Installing Additional MySQL Products and Components with Yum.

\subsection*{3.9 Upgrading MySQL with the MySQL APT Repository}

On Debian and Ubuntu platforms, to perform an in-place upgrade of MySQL and its components, use the MySQL APT repository. See Upgrading MySQL with the MySQL APT Repository.

\subsection*{3.10 Upgrading MySQL with the MySQL SLES Repository}

On the SUSE Linux Enterprise Server (SLES) platform, to perform an in-place upgrade of MySQL and its components, use the MySQL SLES repository. See Upgrading MySQL with the MySQL SLES Repository.

\subsection*{3.11 Upgrading MySQL on Windows}

To upgrade MySQL on Windows, either download and execute the latest MySQL Server MSI or use the Windows ZIP archive distribution.

> Note
> Unlike MySQL 8.4, MySQL 8.0 uses MySQL Installer to install and upgrade MySQL Server along with most other MySQL products; but MySQL Installer is not available with MySQL 8.1 and higher. However, the configuration functionality used in MySQL Installer is available as of MySQL 8.1 using Section 2.3.2, "Configuration: Using MySQL Configurator" that is bundled with both the MSI and Zip archive.

The approach you select depends on how the existing installation was performed. Before proceeding, review Chapter 3, Upgrading MySQL for additional information on upgrading MySQL that is not specific to Windows.

\section*{Upgrading MySQL with MSI}

Download and execute the latest MSI. Although upgrading between release series is not directly supported, the "Custom Setup" option allows defining an installation location as otherwise the MSI installs to the standard location, such as C: \Program Files\MySQL\MySQL Server 8.4\.

Execute MySQL Configurator to configure your installation.

\section*{Upgrading MySQL Using the Windows ZIP Distribution}

To perform an upgrade using the Windows ZIP archive distribution:
1. Download the latest Windows ZIP Archive distribution of MySQL from https://dev.mysql.com/ downloads/.
2. If the server is running, stop it. If the server is installed as a service, stop the service with the following command from the command prompt:

C:\> SC STOP mysqld_service_name

Alternatively, use NET STOP mysqld_service_name .
If you are not running the MySQL server as a service, use mysqladmin to stop it. For example, before upgrading from MySQL 8.3 to 8.4, use mysqladmin from MySQL 8.3 as follows:

C:\> "C:\Program Files\MySQL\MySQL Server 8.3\bin\mysqladmin" -u root shutdown

Note
If the MySQL root user account has a password, invoke mysqladmin with the - p option and enter the password when prompted.
3. Extract the ZIP archive. You may either overwrite your existing MySQL installation (usually located at C: \mysql), or install it into a different directory, such as C: \mysql8. Overwriting the existing installation is recommended.
4. Restart the server. For example, use the SC START mysqld_service_name or NET START mysqld_service_name command if you run MySQL as a service, or invoke mysqld directly otherwise.
5. If you encounter errors, see Section 2.3.4, "Troubleshooting a Microsoft Windows MySQL Server Installation".

\subsection*{3.12 Upgrading a Docker Installation of MySQL}

To upgrade a Docker installation of MySQL, refer to Upgrading a MySQL Server Container.

\subsection*{3.13 Upgrade Troubleshooting}
- A schema mismatch in a MySQL 8.3 instance between the .frm file of a table and the InnoDB data dictionary can cause an upgrade to MySQL 8.4 to fail. Such mismatches may be due to . frm file corruption. To address this issue, dump and restore affected tables before attempting the upgrade again.
- If problems occur, such as that the new mysqld server does not start, verify that you do not have an old my.cnf file from your previous installation. You can check this with the --print-defaults option (for example, mysqld --print-defaults). If this command displays anything other than the program name, you have an active my.cnf file that affects server or client operation.
- If, after an upgrade, you experience problems with compiled client programs, such as Commands out of sync or unexpected core dumps, you probably have used old header or library files when compiling your programs. In this case, check the date for your mysql.h file and libmysqlclient . a library to verify that they are from the new MySQL distribution. If not, recompile your programs with the new headers and libraries. Recompilation might also be necessary for programs compiled against the shared client library if the library major version number has changed (for example, from libmysqlclient.so. 20 to libmysqlclient.so.21).
- If you have created a loadable function with a given name and upgrade MySQL to a version that implements a new built-in function with the same name, the loadable function becomes inaccessible. To correct this, use DROP FUNCTION to drop the loadable function, and then use CREATE FUNCTION to re-create the loadable function with a different nonconflicting name. The same is true if the new version of MySQL implements a built-in function with the same name as an existing stored function. See Section 11.2.5, "Function Name Parsing and Resolution", for the rules describing how the server interprets references to different kinds of functions.
- If upgrade to MySQL 8.4 fails due to any of the issues outlined in Section 3.6, "Preparing Your Installation for Upgrade", the server reverts all changes to the data directory. In this case, remove all redo log files and restart the MySQL 8.3 server on the existing data directory to address the errors. The redo log files (ib_logfile*) reside in the MySQL data directory by default. After the errors are fixed, perform a slow shutdown (by setting innodb_fast_shutdown=0) before attempting the upgrade again.

\subsection*{3.14 Rebuilding or Repairing Tables or Indexes}

This section describes how to rebuild or repair tables or indexes, which may be necessitated by:
- Changes to how MySQL handles data types or character sets. For example, an error in a collation might have been corrected, necessitating a table rebuild to update the indexes for character columns that use the collation.
- Required table repairs or upgrades reported by CHECK TABLE or mysqlcheck.

Methods for rebuilding a table include:
- Dump and Reload Method
- ALTER TABLE Method
- REPAIR TABLE Method

\section*{Dump and Reload Method}

If you are rebuilding tables because a different version of MySQL cannot handle them after a binary (in-place) upgrade or downgrade, you must use the dump-and-reload method. Dump the tables before upgrading or downgrading using your original version of MySQL. Then reload the tables after upgrading or downgrading.

If you use the dump-and-reload method of rebuilding tables only for the purpose of rebuilding indexes, you can perform the dump either before or after upgrading or downgrading. Reloading still must be done afterward.

If you need to rebuild an InnoDB table because a CHECK TABLE operation indicates that a table upgrade is required, use mysqldump to create a dump file and mysql to reload the file. If the CHECK TABLE operation indicates that there is a corruption or causes InnoDB to fail, refer to Section 17.20.3, "Forcing InnoDB Recovery" for information about using the innodb_force_recovery option to restart InnoDB. To understand the type of problem that CHECK TABLE may be encountering, refer to the InnoDB notes in Section 15.7.3.2, "CHECK TABLE Statement".

To rebuild a table by dumping and reloading it, use mysqldump to create a dump file and mysql to reload the file:
```
mysqldump db_name t1 > dump.sql
mysql db_name < dump.sql
```


To rebuild all the tables in a single database, specify the database name without any following table name:
```
mysqldump db_name > dump.sql
```

```
mysql db_name < dump.sql
```


To rebuild all tables in all databases, use the --all-databases option:
```
mysqldump --all-databases > dump.sql
mysql < dump.sql
```


\section*{ALTER TABLE Method}

To rebuild a table with ALTER TABLE, use a "null" alteration; that is, an ALTER TABLE statement that "changes" the table to use the storage engine that it already has. For example, if t1 is an InnoDB table, use this statement:
```
ALTER TABLE t1 ENGINE = InnoDB;
```


If you are not sure which storage engine to specify in the ALTER TABLE statement, use SHOW CREATE TABLE to display the table definition.

\section*{REPAIR TABLE Method}

The REPAIR TABLE method is only applicable to MyISAM, ARCHIVE, and CSV tables.
You can use REPAIR TABLE if the table checking operation indicates that there is a corruption or that an upgrade is required. For example, to repair a MyISAM table, use this statement:
```
REPAIR TABLE t1;
```

mysqlcheck --repair provides command-line access to the REPAIR TABLE statement. This can be a more convenient means of repairing tables because you can use the --databases or --alldatabases option to repair all tables in specific databases or all databases, respectively:
```
mysqlcheck --repair --databases db_name ...
mysqlcheck --repair --all-databases
```


\subsection*{3.15 Copying MySQL Databases to Another Machine}

In cases where you need to transfer databases between different architectures, you can use mysqldump to create a file containing SQL statements. You can then transfer the file to the other machine and feed it as input to the mysql client.

Use mysqldump --help to see what options are available.

> Note
> If GTIDs are in use on the server where you create the dump (gtid_mode=0N), by default, mysqldump includes the contents of the gtid_executed set in the dump to transfer these to the new machine. The results of this can vary depending on the MySQL Server versions involved. Check the description for the mysqldump--set-gtid-purged option to find what happens with the versions you are using, and how to change the behavior if the outcome of the default behavior is not suitable for your situation.

The easiest (although not the fastest) way to move a database between two machines is to run the following commands on the machine on which the database is located:
```
mysqladmin -h 'other_hostname' create db_name
mysqldump db_name | mysql -h 'other_hostname' db_name
```


If you want to copy a database from a remote machine over a slow network, you can use these commands:
```
mysqladmin create db_name
```

```
mysqldump -h 'other_hostname' --compress db_name | mysql db_name
```


You can also store the dump in a file, transfer the file to the target machine, and then load the file into the database there. For example, you can dump a database to a compressed file on the source machine like this:
```
mysqldump --quick db_name | gzip > db_name.gz
```


Transfer the file containing the database contents to the target machine and run these commands there:
```
mysqladmin create db_name
gunzip < db_name.gz | mysql db_name
```


You can also use mysqldump and mysqlimport to transfer the database. For large tables, this is much faster than simply using mysqldump. In the following commands, DUMPDIR represents the full path name of the directory you use to store the output from mysqldump.

First, create the directory for the output files and dump the database:
```
mkdir DUMPDIR
mysqldump --tab=DUMPDIR
    db_name
```


Then transfer the files in the DUMPDIR directory to some corresponding directory on the target machine and load the files into MySQL there:
```
mysqladmin create db_name # create database
cat DUMPDIR/*.sql | mysql db_name # create tables in database
mysqlimport db_name
    DUMPDIR/*.txt # load data into tables
```


Do not forget to copy the mysql database because that is where the grant tables are stored. You might have to run commands as the MySQL root user on the new machine until you have the mysql database in place.

After you import the mysql database on the new machine, execute mysqladmin flushprivileges so that the server reloads the grant table information.

