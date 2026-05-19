\section*{Usage}
ndb_redo_log_reader file_name [options]
file_name is the name of a cluster redo log file. redo log files are located in the numbered directories under the data node's data directory (DataDir); the path under this directory to the redo log files matches the pattern ndb_nodeid_fs/D\#/DBLQH/S\#. FragLog. nodeid is the data node's node ID. The two instances of \# each represent a number (not necessarily the same number); the number following $D$ is in the range $8-39$ inclusive; the range of the number following $S$ varies according to the value of the NoOfFragmentLogFiles configuration parameter, whose default value is 16 ; thus, the default range of the number in the file name is $0-15$ inclusive. For more information, see NDB Cluster Data Node File System Directory.

The name of the file to be read may be followed by one or more of the options listed here:
- -dump

\begin{tabular}{|l|l|}
\hline Command-Line Format & -dump \\
\hline
\end{tabular}

Print dump info.
- --file-key, -K

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- file-key=key \\
\hline
\end{tabular}

Supply file decryption key using stdin, tty, or a my.cnf file.
- --file-key-from-stdin

\begin{tabular}{|l|l|}
\hline Command-Line Format & --file-key-from-stdin \\
\hline
\end{tabular}

Supply file decryption key using stdin.
- Command-Line Format -filedescriptors
-filedescriptors: Print file descriptors only.
- Command-Line Format $\quad$ - - help
--help: Print usage information.
- - lap

\begin{tabular}{|l|l|}
\hline Command-Line Format & -lap \\
\hline
\end{tabular}

Provide lap info, with max GCI started and completed.

\begin{tabular}{|l|l|}
\hline - Command-Line Format & -mbyte \# \\
\hline Type & Numeric \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 15 \\
\hline
\end{tabular}
-mbyte \#: Starting megabyte.
\# is an integer in the range 0 to 15 , inclusive.
• □
Command-Line Format
-mbyteheaders
-mbyteheaders: Show only the first page header of every megabyte in the file.
•

\begin{tabular}{|l|l|}
\hline Command-Line Format & -noprint \\
\hline
\end{tabular}
-noprint: Do not print the contents of the log file.
•

\begin{tabular}{|l|l|}
\hline Command-Line Format & -nocheck \\
\hline
\end{tabular}
-nocheck: Do not check the log file for errors.
•

\begin{tabular}{|l|l|}
\hline Command-Line Format & -page \# \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 31 \\
\hline
\end{tabular}
- page \#: Start at this page.
\# is an integer in the range 0 to 31 , inclusive.
• □
Command-Line Format
- pageheaders
- pageheaders: Show page headers only.
•

\begin{tabular}{|l|l|}
\hline Command-Line Format & -pageindex \# \\
\hline Type & Integer \\
\hline Default Value & 12 \\
\hline Minimum Value & 12 \\
\hline Maximum Value & 8191 \\
\hline
\end{tabular}
-pageindex \#: Start at this page index.
\# is an integer between 12 and 8191, inclusive.
- -twiddle

\begin{tabular}{|l|l|}
\hline Command-Line Format & -twiddle \\
\hline
\end{tabular}

Bit-shifted dump.
Like ndb_print_backup_file and ndb_print_schema_file (and unlike most of the NDB utilities that are intended to be run on a management server host or to connect to a management server) ndb_redo_log_reader must be run on a cluster data node, since it accesses the data node file system directly. Because it does not make use of the management server, this utility can be used when the management server is not running, and even when the cluster has been completely shut down.

\subsection*{25.5.23 ndb_restore - Restore an NDB Cluster Backup}

The NDB Cluster restoration program is implemented as a separate command-line utility ndb_restore, which can normally be found in the MySQL bin directory. This program reads the files created as a result of the backup and inserts the stored information into the database.
ndb_restore must be executed once for each of the backup files that were created by the START BACKUP command used to create the backup (see Section 25.6.8.2, "Using The NDB Cluster Management Client to Create a Backup"). This is equal to the number of data nodes in the cluster at the time that the backup was created.

\section*{Note}

Before using ndb_restore, it is recommended that the cluster be running in single user mode, unless you are restoring multiple data nodes in parallel. See Section 25.6.6, "NDB Cluster Single User Mode", for more information.

Options that can be used with ndb_restore are shown in the following table. Additional descriptions follow the table.
- --allow-pk-changes

\begin{tabular}{|l|l|}
\hline Command-Line Format & --allow-pk-changes[=0|1] \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1 \\
\hline
\end{tabular}

When this option is set to 1 , ndb_restore allows the primary keys in a table definition to differ from that of the same table in the backup. This may be desirable when backing up and restoring between different schema versions with primary key changes on one or more tables, and it appears that performing the restore operation using ndb_restore is simpler or more efficient than issuing many ALTER TABLE statements after restoring table schemas and data.

The following changes in primary key definitions are supported by --allow-pk-changes:
- Extending the primary key: A non-nullable column that exists in the table schema in the backup becomes part of the table's primary key in the database.

\section*{Important}

When extending a table's primary key, any columns which become part of primary key must not be updated while the backup is being taken; any such updates discovered by ndb_restore cause the restore operation to fail, even when no change in value takes place. In some cases, it may be possible to override this behavior using the --ignore-extended-pkupdates option; see the description of this option for more information.
- Contracting the primary key (1): A column that is already part of the table's primary key in the backup schema is no longer part of the primary key, but remains in the table.
- Contracting the primary key (2): A column that is already part of the table's primary key in the backup schema is removed from the table entirely.

These differences can be combined with other schema differences supported by ndb_restore, including changes to blob and text columns requiring the use of staging tables.

Basic steps in a typical scenario using primary key schema changes are listed here:
1. Restore table schemas using ndb_restore--restore-meta
2. Alter schema to that desired, or create it
3. Back up the desired schema
4. Run ndb_restore--disable-indexes using the backup from the previous step, to drop indexes and constraints
5. Run ndb_restore--allow-pk-changes (possibly along with --ignore-extended-pkupdates, --disable-indexes, and possibly other options as needed) to restore all data
6. Run ndb_restore--rebuild-indexes using the backup made with the desired schema, to rebuild indexes and constraints

When extending the primary key, it may be necessary for ndb_restore to use a temporary secondary unique index during the restore operation to map from the old primary key to the new one. Such an index is created only when necessary to apply events from the backup log to a table which has an extended primary key. This index is named NDB\$RESTORE_PK_MAPPING, and is created on each table requiring it; it can be shared, if necessary, by multiple instances of ndb_restore instances running in parallel. (Running ndb_restore--rebuild-indexes at the end of the restore process causes this index to be dropped.)
- --append

\begin{tabular}{|l|l|}
\hline Command-Line Format & --append \\
\hline
\end{tabular}

When used with the --tab and --print-data options, this causes the data to be appended to any existing files having the same names.
- --backup-path=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - backup - path=path \\
\hline Type & Directory name \\
\hline Default Value &.$/$ \\
\hline
\end{tabular}

The path to the backup directory is required; this is supplied to ndb_restore using the - - backuppath option, and must include the subdirectory corresponding to the ID backup of the backup to be restored. For example, if the data node's DataDir is /var/lib/mysql-cluster, then the backup directory is /var/lib/mysql-cluster/BACKUP, and the backup files for the backup with the ID 3 can be found in /var/lib/mysql-cluster/BACKUP/BACKUP-3. The path may be absolute or relative to the directory in which the ndb_restore executable is located, and may be optionally prefixed with backup-path=.

It is possible to restore a backup to a database with a different configuration than it was created from. For example, suppose that a backup with backup ID 12, created in a cluster with two storage nodes having the node IDs 2 and 3, is to be restored to a cluster with four nodes. Then ndb_restore must be run twice-once for each storage node in the cluster where the backup was taken. However, ndb_restore cannot always restore backups made from a cluster running one version of MySQL to a cluster running a different MySQL version. See Section 25.3.7, "Upgrading and Downgrading NDB Cluster", for more information.

\section*{Important}

It is not possible to restore a backup made from a newer version of NDB Cluster using an older version of ndb_restore. You can restore a backup
made from a newer version of MySQL to an older cluster, but you must use a copy of ndb_restore from the newer NDB Cluster version to do so.

For example, to restore a cluster backup taken from a cluster running NDB Cluster 8.4.7 to a cluster running NDB Cluster 8.0.44, you must use the ndb_restore that comes with the NDB Cluster 8.0.44 distribution.

For more rapid restoration, the data may be restored in parallel, provided that there is a sufficient number of cluster connections available. That is, when restoring to multiple nodes in parallel, you must have an [api] or [mysqld] section in the cluster config.ini file available for each concurrent ndb_restore process. However, the data files must always be applied before the logs.
- --backup-password=password

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - backup-password=password \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

This option specifies a password to be used when decrypting an encrypted backup with the -decrypt option. This must be the same password that was used to encrypt the backup.

The password must be 1 to 256 characters in length, and must be enclosed by single or double quotation marks. It can contain any of the ASCII characters having character codes 32, 35, 38, 40-91, 93, 95, and 97-126; in other words, it can use any printable ASCII characters except for !, ', ", \$, \%, , and ^.

It is possible to omit the password, in which case ndb_restore waits for it to be supplied from stdin, as when using --backup-password-from-stdin.
- --backup-password-from-stdin[=TRUE|FALSE]
\begin{tabular}{|l|l|}
\hline Command-Line Format & - - backup-password-from-stdin
\end{tabular}
When used in place of - - backup-password, this option enables input of the backup password from the system shell (stdin), similar to how this is done when supplying the password interactively to mysql when using the --password without supplying the password on the command line.
- --backupid=\#, -b

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - backupid $=\#$ \\
\hline Type & Numeric \\
\hline Default Value & none \\
\hline
\end{tabular}

This option is required; it is used to specify the ID or sequence number of the backup, and is the same number shown by the management client in the Backup backup_id completed message displayed upon completion of a backup. (See Section 25.6.8.2, "Using The NDB Cluster Management Client to Create a Backup".)

\section*{Important}

When restoring cluster backups, you must be sure to restore all data nodes from backups having the same backup ID. Using files from different backups results at best in restoring the cluster to an inconsistent state, and is likely to fail altogether.
- --character-sets-dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline
\end{tabular}

Directory containing character sets.
- --connect, -c

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect=connection_string \\
\hline Type & String \\
\hline Default Value & localhost $: 1186$ \\
\hline
\end{tabular}

Alias for --ndb-connectstring.
- --connect-retries

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retries=\# \\
\hline Type & Integer \\
\hline Default Value & 12 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 12 \\
\hline
\end{tabular}

Number of times to retry connection before giving up.
- --connect-retry-delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retry-delay=\# \\
\hline Type & Integer \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 5 \\
\hline
\end{tabular}

Number of seconds to wait between attempts to contact management server.
- --connect-string

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-string=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --core-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file \\
\hline
\end{tabular}

Write core file on error; used in debugging.
- --decrypt

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - decrypt \\
\hline
\end{tabular}

Decrypt an encrypted backup using the password supplied by the --backup-password option.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & [none] \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - defaults-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --disable-indexes

\begin{tabular}{|l|l|}
\hline Command-Line Format & --disable-indexes \\
\hline
\end{tabular}

Disable restoration of indexes during restoration of the data from a native NDB backup. Afterwards, you can restore indexes for all tables at once with multithreaded building of indexes using --rebuild-indexes, which should be faster than rebuilding indexes concurrently for very large tables.

This option also drops any foreign keys specified in the backup.
MySQL can open an NDB table for which one or more indexes cannot be found, provided the query does not use any of the affected indexes; otherwise the query is rejected with ER_NOT_KEYFILE. In the latter case, you can temporarily work around the problem by executing an ALTER TABLE statement such as this one:

ALTER TABLE tbl ALTER INDEX idx INVISIBLE;
This causes MySQL to ignore the index idx on table tbl. See Primary Keys and Indexes, for more information, as well as Section 10.3.12, "Invisible Indexes".
- --dont-ignore-systab-0, -f

\begin{tabular}{|l|l|}
\hline Command-Line Format & --dont-ignore-systab-0 \\
\hline
\end{tabular}

Normally, when restoring table data and metadata, ndb_restore ignores the copy of the NDB system table that is present in the backup. --dont-ignore-systab-0 causes the system table to be restored. This option is intended for experimental and development use only, and is not recommended in a production environment.
- --exclude-databases=db-list

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -exclude - databases=list \\
\hline Type & String \\
\hline
\end{tabular}

\section*{Default Value}

Comma-delimited list of one or more databases which should not be restored.
This option is often used in combination with --exclude-tables; see that option's description for further information and examples.
- --exclude-intermediate-sql-tables[=TRUE|FALSE]

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--exclude-intermediate-sql- \\
tables [=TRUE | FALSE]
\end{tabular} \\
\hline Type & Boolean \\
\hline Default Value & TRUE \\
\hline
\end{tabular}

When performing copying ALTER TABLE operations, mysqld creates intermediate tables (whose names are prefixed with \#sql-). When TRUE, the --exclude-intermediate-sql-tables option keeps ndb_restore from restoring such tables that may have been left over from these operations. This option is TRUE by default.
- --exclude-missing-columns

\begin{tabular}{|l|l|}
\hline Command-Line Format & --exclude-missing-columns \\
\hline
\end{tabular}

It is possible to restore only selected table columns using this option, which causes ndb_restore to ignore any columns missing from tables being restored as compared to the versions of those tables found in the backup. This option applies to all tables being restored. If you wish to apply this option only to selected tables or databases, you can use it in combination with one or more of the - include - * or - -exclude - * options described elsewhere in this section to do so, then restore data to the remaining tables using a complementary set of these options.
- --exclude-missing-tables

\begin{tabular}{|l|l|}
\hline Command-Line Format & --exclude-missing-tables \\
\hline
\end{tabular}

It is possible to restore only selected tables using this option, which causes ndb_restore to ignore any tables from the backup that are not found in the target database.
- --exclude-tables=table-list

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- exclude-tables=list \\
\hline Type & String \\
\hline
\end{tabular}

Default Value

List of one or more tables to exclude; each table reference must include the database name. Often used together with --exclude-databases.

When --exclude-databases or --exclude-tables is used, only those databases or tables named by the option are excluded; all other databases and tables are restored by ndb_restore.

This table shows several invocations of ndb_restore using --exclude - * options (other options possibly required have been omitted for clarity), and the effects these options have on restoring from an NDB Cluster backup:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.23 Several invocations of ndb_restore using --exclude-* options, and the effects these options have on restoring from an NDB Cluster backup.}
\begin{tabular}{|l|l|}
\hline Option & Result \\
\hline --exclude-databases=db1 & All tables in all databases except db1 are restored; no tables in db1 are restored \\
\hline --exclude-databases=db1,db2 (or --exclude-databases=db1 --excludedatabases=db2) & All tables in all databases except db1 and db2 are restored; no tables in db1 or db2 are restored \\
\hline --exclude-tables=db1.t1 & All tables except t1 in database db1 are restored; all other tables in db1 are restored; all tables in all other databases are restored \\
\hline --exclude-tables=db1.t2,db2.t1 (or --exclude-tables=db1.t2--excludetables=db2.t1) & All tables in database db1 except for t2 and all tables in database db2 except for table t1 are restored; no other tables in db1 or db2 are restored; all tables in all other databases are restored \\
\hline
\end{tabular}
\end{table}

You can use these two options together. For example, the following causes all tables in all databases except for databases db1 and db2, and tables t1 and t2 in database db3, to be restored:
```
$> ndb_restore [...] --exclude-databases=db1,db2 --exclude-tables=db3.t1,db3.t2
```

(Again, we have omitted other possibly necessary options in the interest of clarity and brevity from the example just shown.)

You can use --include - * and - -exclude - * options together, subject to the following rules:
- The actions of all - -include - * and - -exclude - * options are cumulative.
- All - - include - * and - -exclude - * options are evaluated in the order passed to ndb_restore, from right to left.
- In the event of conflicting options, the first (rightmost) option takes precedence. In other words, the first option (going from right to left) that matches against a given database or table "wins".

For example, the following set of options causes ndb_restore to restore all tables from database db1 except db1.t1, while restoring no other tables from any other databases:
```
--include-databases=db1 --exclude-tables=db1.t1
```


However, reversing the order of the options just given simply causes all tables from database db1 to be restored (including db1.t1, but no tables from any other database), because the --includedatabases option, being farthest to the right, is the first match against database db1 and thus takes precedence over any other option that matches db1 or any tables in db1:
- --fields-enclosed-by=char

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- fields -enclosed - by=char \\
\hline Type & String \\
\hline Default Value & \\
\hline
\end{tabular}

Each column value is enclosed by the string passed to this option (regardless of data type; see the description of--fields-optionally-enclosed-by).
- --fields-optionally-enclosed-by

\begin{tabular}{|l|l|}
\hline Command-Line Format & --fields-optionally-enclosed-by \\
\hline Type & String \\
\hline Default Value & \\
\hline
\end{tabular}

The string passed to this option is used to enclose column values containing character data (such as CHAR, VARCHAR, BINARY, TEXT, or ENUM).
- --fields-terminated-by=char

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - fields - terminated - by=char \\
\hline Type & String \\
\hline Default Value & \t (tab) \\
\hline
\end{tabular}

The string passed to this option is used to separate column values. The default value is a tab character ( $\backslash t$ ).
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display help text and exit.
- - - hex

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - hex \\
\hline
\end{tabular}

If this option is used, all binary values are output in hexadecimal format.
- --ignore-extended-pk-updates

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ignore-extended-pk-updates[=0|1] \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1 \\
\hline
\end{tabular}

When using --allow-pk-changes, columns which become part of a table's primary key must not be updated while the backup is being taken; such columns should keep the same values from the time values are inserted into them until the rows containing the values are deleted. If ndb_restore encounters updates to these columns when restoring a backup, the restore fails. Because some applications may set values for all columns when updating a row, even when some column values are not changed, the backup may include log events appearing to update columns which are not in fact modified. In such cases you can set--ignore-extended-pk-updates to 1, forcing ndb_restore to ignore such updates.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4245.jpg?height=104&width=108&top_left_y=264&top_left_x=397)

\section*{Important}

When causing these updates to be ignored, the user is responsible for ensuring that there are no updates to the values of any columns that become part of the primary key.

For more information, see the description of --allow-pk-changes.
- --include-databases=db-list

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - include - databases $=$ list \\
\hline Type & String \\
\hline Default Value & \\
\hline
\end{tabular}

Comma-delimited list of one or more databases to restore. Often used together with --includetables; see the description of that option for further information and examples.
- --include-stored-grants

\begin{tabular}{|l|l|}
\hline Command-Line Format & --include-stored-grants \\
\hline
\end{tabular}
ndb_restore does not by default restore shared users and grants (see Section 25.6.13, "Privilege Synchronization and NDB_STORED_USER") to the ndb_sql_metadata table. Specifying this option causes it to do so.
- --include-tables=table-list

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - include-tables=list \\
\hline Type & String \\
\hline Default Value & \\
\hline
\end{tabular}

Comma-delimited list of tables to restore; each table reference must include the database name.
When --include-databases or --include-tables is used, only those databases or tables named by the option are restored; all other databases and tables are excluded by ndb_restore, and are not restored.

The following table shows several invocations of ndb_restore using --include - * options (other options possibly required have been omitted for clarity), and the effects these have on restoring from an NDB Cluster backup:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.24 Several invocations of ndb_restore using --include-* options, and their effects on restoring from an NDB Cluster backup.}
\begin{tabular}{|l|l|}
\hline Option & Result \\
\hline --include-databases=db1 & Only tables in database db1 are restored; all tables in all other databases are ignored \\
\hline --include-databases=db1,db2 (or --include-databases=db1 --includedatabases=db2) & Only tables in databases db1 and db2 are restored; all tables in all other databases are ignored \\
\hline --include-tables=db1.t1 & Only table t1 in database db1 is restored; no other tables in db1 or in any other database are restored \\
\hline --include-tables=db1.t2,db2.t1 (or --include-tables=db1.t2--includetables=db2.t1) & Only the table t2 in database db1 and the table t1 in database db2 are restored; no other tables in db1, db2, or any other database are restored \\
\hline
\end{tabular}
\end{table}

You can also use these two options together. For example, the following causes all tables in databases db1 and db2, together with the tables t1 and t2 in database db3, to be restored (and no other databases or tables):
```
$> ndb_restore [...] --include-databases=db1,db2 --include-tables=db3.t1,db3.t2
```

(Again we have omitted other, possibly required, options in the example just shown.)
It also possible to restore only selected databases, or selected tables from a single database, without any --include - * (or --exclude - *) options, using the syntax shown here:
```
ndb_restore other_options db_name,[db_name[,...] | tbl_name[,tbl_name][,...]]
```


In other words, you can specify either of the following to be restored:
- All tables from one or more databases
- One or more tables from a single database
- --lines-terminated-by=char

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lines-terminated - by=char \\
\hline Type & String \\
\hline Default Value & \n (linebreak) \\
\hline
\end{tabular}

Specifies the string used to end each line of output. The default is a linefeed character $(\backslash n)$.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login-path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --lossy-conversions, - L

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lossy-conversions \\
\hline
\end{tabular}

This option is intended to complement the --promote-attributes option. Using --lossyconversions allows lossy conversions of column values (type demotions or changes in sign) when restoring data from backup. With some exceptions, the rules governing demotion are the same as for MySQL replication; see Replication of Columns Having Different Data Types, for information about specific type conversions currently supported by attribute demotion.

This option also makes it possible to restore a NULL column as NOT NULL. The column must not contain any NULL entries; otherwise ndb_restore stops with an error.
ndb_restore reports any truncation of data that it performs during lossy conversions once per attribute and column.
- --no-binlog

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - binlog \\
\hline
\end{tabular}

This option prevents any connected SQL nodes from writing data restored by ndb_restore to their binary logs.
- --no-restore-disk-objects, -d

\begin{tabular}{|l|l|}
\hline Command-Line Format & --no-restore-disk-objects \\
\hline
\end{tabular}

This option stops ndb_restore from restoring any NDB Cluster Disk Data objects, such as tablespaces and log file groups; see Section 25.6.11, "NDB Cluster Disk Data Tables", for more information about these.
- --no-upgrade, - u

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - upgrade \\
\hline
\end{tabular}

When using ndb_restore to restore a backup, VARCHAR columns created using the old fixed format are resized and recreated using the variable-width format now employed. This behavior can be overridden by specifying --no-upgrade.
- --ndb-connectstring

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- - ndb - \\
connectstring=connection_string
\end{tabular} \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set connection string for connecting to ndb_mgmd. Syntax: [nodeid=id;]
[host=]hostname[:port]. Overrides entries in NDB_CONNECTSTRING and my.cnf.
- --ndb-mgm-tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgm-tls=level \\
\hline Type & Enumeration \\
\hline Default Value & relaxed \\
\hline Valid Values & \begin{tabular}{l}
relaxed \\
strict
\end{tabular} \\
\hline
\end{tabular}

Sets the level of TLS support required to connect to the management server; one of relaxed or strict. relaxed (the default) means that a TLS connection is attempted, but success is not required; strict means that TLS is required to connect.
- --ndb-mgmd-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb-mgmd-host=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --ndb-nodegroup-map=map, -z

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb - nodegroup - map=map \\
\hline
\end{tabular}

Any value set for this option is ignored, and the option itself does nothing.
- --ndb-nodeid

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb - nodeid $=\#$ \\
\hline Type & Integer \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set node ID for this node, overriding any ID set by --ndb-connectstring.
- --ndb-optimized-node-selection

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-optimized-node-selection \\
\hline
\end{tabular}

Enable optimizations for selection of nodes for transactions. Enabled by default; use --skip-ndb-optimized-node-selection to disable.
- --ndb-tls-search-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb - tls - search - path=list \\
\hline Type & Path name \\
\hline Default Value (Unix) & \$HOME/ndb - tls \\
\hline Default Value (Windows) & \$HOMEDIR/ndb - tls \\
\hline
\end{tabular}

Specify a list of directories to search for a CA file. On Unix platforms, the directory names are separated by colons (:); on Windows systems, the semicolon character (;) is used as the separator. A directory reference may be relative or absolute; it may contain one or more environment variables, each denoted by a prefixed dollar sign (\$), and expanded prior to use.

Searching begins with the leftmost named directory and proceeds from left to right until a file is found. An empty string denotes an empty search path, which causes all searches to fail. A string consisting of a single dot (.) indicates that the search path limited to the current working directory.

If no search path is supplied, the compiled-in default value is used. This value depends on the platform used: On Windows, this is \ndb-tls; on other platforms (including Linux), it is $\$$ HOME/ndb-tls. This can be overridden by compiling NDB Cluster using DWITH_NDB_TLS_SEARCH_PATH.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --no-defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --nodeid=\#, -n

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- nodeid $=\#$ \\
\hline Type & Numeric \\
\hline Default Value & none \\
\hline
\end{tabular}

Specify the node ID of the data node on which the backup was taken; required.
When restoring to a cluster with different number of data nodes from that where the backup was taken, this information helps identify the correct set or sets of files to be restored to a given node. (In such cases, multiple files usually need to be restored to a single data node.) See Restoring to a different number of data nodes, for additional information and examples.
- --num-slices=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - num-slices=\# \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 1024 \\
\hline
\end{tabular}

When restoring a backup by slices, this option sets the number of slices into which to divide the backup. This allows multiple instances of ndb_restore to restore disjoint subsets in parallel, potentially reducing the amount of time required to perform the restore operation.

A slice is a subset of the data in a given backup; that is, it is a set of fragments having the same slice ID, specified using the--slice-id option. The two options must always be used together, and the value set by--slice-id must always be less than the number of slices.
ndb_restore encounters fragments and assigns each one a fragment counter. When restoring by slices, a slice ID is assigned to each fragment; this slice ID is in the range 0 to 1 less than the number of slices. For a table that is not a BLOB table, the slice to which a given fragment belongs is determined using the formula shown here:
```
[slice_ID] = [fragment_counter] % [number_of_slices]
```


For a BLOB table, a fragment counter is not used; the fragment number is used instead, along with the ID of the main table for the BLOB table (recall that NDB stores BLOB values in a separate table internally). In this case, the slice ID for a given fragment is calculated as shown here:
```
[slice_ID] =
([main_table_ID] + [fragment_ID]) % [number_of_slices]
```


Thus, restoring by $N$ slices means running $N$ instances of ndb_restore, all with --num-slices= $N$ (along with any other necessary options) and one each with --slice-id=1, --slice-id=2, --slice-id=3, and so on through slice-id=N-1.

Example. Assume that you want to restore a backup named BACKUP-1, found in the default directory /var/lib/mysql-cluster/BACKUP/BACKUP-3 on the node file system on each data node, to a cluster with four data nodes having the node IDs 1, 2, 3, and 4. To perform this operation using five slices, execute the sets of commands shown in the following list:
1. Restore the cluster metadata using ndb_restore as shown here:
```
$> ndb_restore -b 1 -n 1 -m --disable-indexes --backup-path=/home/ndbuser/backups
```

2. Restore the cluster data to the data nodes invoking ndb_restore as shown here:
```
$> ndb_restore -b 1 -n 1 -r --num-slices=5 --slice-id=0 --backup-path=/var/lib/mysql-cluster/BACK
$> ndb_restore -b 1 -n 1 -r --num-slices=5 --slice-id=1 --backup-path=/var/lib/mysql-cluster/BACK
$> ndb_restore -b 1 -n 1 -r --num-slices=5 --slice-id=2 --backup-path=/var/lib/mysql-cluster/BACK
$> ndb_restore -b 1 -n 1 -r --num-slices=5 --slice-id=3 --backup-path=/var/lib/mysql-cluster/BACK
$> ndb_restore -b 1 -n 1 -r --num-slices=5 --slice-id=4 --backup-path=/var/lib/mysql-cluster/BACK!
$> ndb_restore -b 1 -n 2 -r --num-slices=5 --slice-id=0 --backup-path=/var/lib/mysql-cluster/BACK
$> ndb_restore -b 1 -n 2 -r --num-slices=5 --slice-id=1 --backup-path=/var/lib/mysql-cluster/BACK
$> ndb_restore -b 1 -n 2 -r --num-slices=5 --slice-id=2 --backup-path=/var/lib/mysql-cluster/BACK
$> ndb_restore -b 1 -n 2 -r --num-slices=5 --slice-id=3 --backup-path=/var/lib/mysql-cluster/BACK
$> ndb_restore -b 1 -n 2 -r --num-slices=5 --slice-id=4 --backup-path=/var/lib/mysql-cluster/BACK!
$> ndb_restore -b 1 -n 3 -r --num-slices=5 --slice-id=0 --backup-path=/var/lib/mysql-cluster/BACK
$> ndb_restore -b 1 -n 3 -r --num-slices=5 --slice-id=1 --backup-path=/var/lib/mysql-cluster/BACK
$> ndb_restore -b 1 -n 3 -r --num-slices=5 --slice-id=2 --backup-path=/var/lib/mysql-cluster/BACK
$> ndb_restore -b 1 -n 3 -r --num-slices=5 --slice-id=3 --backup-path=/var/lib/mysql-cluster/BACK
$> ndb_restore -b 1 -n 3 -r --num-slices=5 --slice-id=4 --backup-path=/var/lib/mysql-cluster/BACK
```

```
$> ndb_restore -b 1 -n 4 -r --num-slices=5 --slice-id=0 --backup-path=/var/lib/mysql-cluster/BACKUP/B
$> ndb_restore -b 1 -n 4 -r --num-slices=5 --slice-id=1 --backup-path=/var/lib/mysql-cluster/BACKUP/B
$> ndb_restore -b 1 -n 4 -r --num-slices=5 --slice-id=2 --backup-path=/var/lib/mysql-cluster/BACKUP/B
$> ndb_restore -b 1 -n 4 -r --num-slices=5 --slice-id=3 --backup-path=/var/lib/mysql-cluster/BACKUP/B
$> ndb_restore -b 1 -n 4 -r --num-slices=5 --slice-id=4 --backup-path=/var/lib/mysql-cluster/BACKUP/B
```


All of the commands just shown in this step can be executed in parallel, provided there are enough slots for connections to the cluster (see the description for the --backup-path option).
3. Restore indexes as usual, as shown here:
```
$> ndb_restore -b 1 -n 1 --rebuild-indexes --backup-path=/var/lib/mysql-cluster/BACKUP/BACKUP-1
```

4. Finally, restore the epoch, using the command shown here:
```
$> ndb_restore -b 1 -n 1 --restore-epoch --backup-path=/var/lib/mysql-cluster/BACKUP/BACKUP-1
```


You should use slicing to restore the cluster data only; it is not necessary to employ --num-slices or --slice-id when restoring the metadata, indexes, or epoch information. If either or both of these options are used with the ndb_restore options controlling restoration of these, the program ignores them.

The effects of using the --parallelism option on the speed of restoration are independent of those produced by slicing or parallel restoration using multiple instances of ndb_restore (- parallelism specifies the number of parallel transactions executed by a single ndb_restore thread), but it can be used together with either or both of these. You should be aware that increasing --parallelism causes ndb_restore to impose a greater load on the cluster; if the system can handle this, restoration should complete even more quickly.

The value of --num-slices is not directly dependent on values relating to hardware such as number of CPUs or CPU cores, amount of RAM, and so forth, nor does it depend on the number of LDMs.

It is possible to employ different values for this option on different data nodes as part of the same restoration; doing so should not in and of itself produce any ill effects.
- --parallelism=\#, -p

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - parallelism=\# \\
\hline Type & Numeric \\
\hline Default Value & 128 \\
\hline Minimum Value & 1 \\
\hline Maximum Value & 1024 \\
\hline
\end{tabular}
ndb_restore uses single-row transactions to apply many rows concurrently. This parameter determines the number of parallel transactions (concurrent rows) that an instance of ndb_restore tries to use. By default, this is 128 ; the minimum is 1 , and the maximum is 1024.

The work of performing the inserts is parallelized across the threads in the data nodes involved. This mechanism is employed for restoring bulk data from the . Data file-that is, the fuzzy snapshot of the data; it is not used for building or rebuilding indexes. The change log is applied serially; index drops and builds are DDL operations and handled separately. There is no thread-level parallelism on the client side of the restore.
- --preserve-trailing-spaces, -P

\begin{tabular}{|l|l|}
\hline Command-Line Format & --preserve-trailing-spaces \\
\hline
\end{tabular}

Cause trailing spaces to be preserved when promoting a fixed-width character data type to its variable-width equivalent-that is, when promoting a CHAR column value to VARCHAR, or a BINARY column value to VARBINARY. Otherwise, any trailing spaces are dropped from such column values when they are inserted into the new columns.

\section*{Note}

Although you can promote CHAR columns to VARCHAR and BINARY columns to VARBINARY, you cannot promote VARCHAR columns to CHAR or VARBINARY columns to BINARY.
- --print

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- print \\
\hline
\end{tabular}

Causes ndb_restore to print all data, metadata, and logs to stdout. Equivalent to using the --print-data, --print-meta, and--print-log options together.

\section*{Note}

Use of --print or any of the --print_* options is in effect performing a dry run. Including one or more of these options causes any output to be redirected to stdout; in such cases, ndb_restore makes no attempt to restore data or metadata to an NDB Cluster.
- --print-data

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-data \\
\hline
\end{tabular}

Cause ndb_restore to direct its output to stdout. Often used together with one or more of - - tab, --fields-enclosed-by, --fields-optionally-enclosed-by, --fields-terminatedby, --hex, and --append.

TEXT and BLOB column values are always truncated. Such values are truncated to the first 256 bytes in the output. This cannot currently be overridden when using--print-data.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --print-log

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- print-log \\
\hline
\end{tabular}

Cause ndb_restore to output its log to stdout.
- --print-meta
- print-sql-log

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-sql-log \\
\hline
\end{tabular}

Log SQL statements to stdout. Use the option to enable; normally this behavior is disabled. The option checks before attempting to log whether all the tables being restored have explicitly defined primary keys; queries on a table having only the hidden primary key implemented by NDB cannot be converted to valid SQL.

This option does not work with tables having BLOB columns.
- --progress-frequency=N

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - progress - frequency=\# \\
\hline Type & Numeric \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 65535 \\
\hline
\end{tabular}

Print a status report each $N$ seconds while the backup is in progress. 0 (the default) causes no status reports to be printed. The maximum is 65535.
- --promote-attributes, -A

\begin{tabular}{|l|l|}
\hline Command-Line Format & --promote-attributes \\
\hline
\end{tabular}
ndb_restore supports limited attribute promotion in much the same way that it is supported by MySQL replication; that is, data backed up from a column of a given type can generally be restored to a column using a "larger, similar" type. For example, data from a CHAR( 20 ) column can be restored to a column declared as $\operatorname{VARCHAR}(20), \operatorname{VARCHAR}(30)$, or $\operatorname{CHAR}(30)$; data from a MEDIUMINT column can be restored to a column of type INT or BIGINT. See Replication of Columns Having Different Data Types, for a table of type conversions currently supported by attribute promotion.

This option also makes it possible to restore a NOT NULL column as NULL.
Attribute promotion by ndb_restore must be enabled explicitly, as follows:
1. Prepare the table to which the backup is to be restored. ndb_restore cannot be used to recreate the table with a different definition from the original; this means that you must either create the table manually, or alter the columns which you wish to promote using ALTER TABLE after restoring the table metadata but before restoring the data.
2. Invoke ndb_restore with the --promote-attributes option (short form -A) when restoring the table data. Attribute promotion does not occur if this option is not used; instead, the restore operation fails with an error.

When converting between character data types and TEXT or BLOB, only conversions between character types (CHAR and VARCHAR) and binary types (BINARY and VARBINARY) can be performed at the same time. For example, you cannot promote an INT column to BIGINT while promoting a VARCHAR column to TEXT in the same invocation of ndb_restore.

Converting between TEXT columns using different character sets is not supported, and is expressly disallowed.

When performing conversions of character or binary types to TEXT or BLOB with ndb_restore, you

These tables are not needed afterwards, and are normally deleted by ndb_restore following a successful restoration.
- --rebuild-indexes

Command-Line Format
--rebuild-indexes

Enable multithreaded rebuilding of the ordered indexes while restoring a native NDB backup. The number of threads used for building ordered indexes by ndb_restore with this option is controlled by the BuildIndexThreads data node configuration parameter and the number of LDMs.

It is necessary to use this option only for the first run of ndb_restore; this causes all ordered indexes to be rebuilt without using --rebuild-indexes again when restoring subsequent nodes. You should use this option prior to inserting new rows into the database; otherwise, it is possible for a row to be inserted that later causes a unique constraint violation when trying to rebuild the indexes.

Building of ordered indices is parallelized with the number of LDMs by default. Offline index builds performed during node and system restarts can be made faster using the BuildIndexThreads data node configuration parameter; this parameter has no effect on dropping and rebuilding of indexes by ndb_restore, which is performed online.

Rebuilding of unique indexes uses disk write bandwidth for redo logging and local checkpointing. An insufficient amount of this bandwidth can lead to redo buffer overload or log overload errors. In such cases you can run ndb_restore --rebuild-indexes again; the process resumes at the point where the error occurred. You can also do this when you have encountered temporary errors. You can repeat execution of ndb_restore - -rebuild-indexes indefinitely; you may be able to stop such errors by reducing the value of - -parallelism. If the problem is insufficient space, you can increase the size of the redo log (FragmentLogFileSize node configuration parameter), or you can increase the speed at which LCPs are performed (MaxDiskWriteSpeed and related parameters), in order to free space more quickly.
- --remap-column=db.tbl.col:fn:args

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - remap-column=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

When used together with --restore-data, this option applies a function to the value of the indicated column. Values in the argument string are listed here:
- $d b$ : Database name, following any renames performed by --rewrite-database.
- tbl: Table name.
- col: Name of the column to be updated. This column must be of type INT or BIGINT. The column can also be but is not required to be UNSIGNED.
- fn: Function name; currently, the only supported name is offset.
- args: Arguments supplied to the function. Currently, only a single argument, the size of the offset to be added by the offset function, is supported. Negative values are supported. The size of the argument cannot exceed that of the signed variant of the column's type; for example, if col is an INT column, then the allowed range of the argument passed to the offset function is - 2147483648 to 2147483647 (see Section 13.1.2, "Integer Types (Exact Value) - INTEGER, INT, SMALLINT, TINYINT, MEDIUMINT, BIGINT").

If applying the offset value to the column would cause an overflow or underflow, the restore operation fails. This could happen, for example, if the column is a BIGINT, and the option
attempts to apply an offset value of 8 on a row in which the column value is 4294967291 , since $4294967291+8=4294967299>4294967295$.

This option can be useful when you wish to merge data stored in multiple source instances of NDB Cluster (all using the same schema) into a single destination NDB Cluster, using NDB native backup (see Section 25.6.8.2, "Using The NDB Cluster Management Client to Create a Backup") and ndb_restore to merge the data, where primary and unique key values are overlapping between source clusters, and it is necessary as part of the process to remap these values to ranges that do not overlap. It may also be necessary to preserve other relationships between tables. To fulfill such requirements, it is possible to use the option multiple times in the same invocation of ndb_restore to remap columns of different tables, as shown here:
```
$> ndb_restore --restore-data --remap-column=hr.employee.id:offset:1000 \
    --remap-column=hr.manager.id:offset:1000 --remap-column=hr.firstaiders.id:offset:1000
```

(Other options not shown here may also be used.)
--remap-column can also be used to update multiple columns of the same table. Combinations of multiple tables and columns are possible. Different offset values can also be used for different columns of the same table, like this:
```
$> ndb_restore --restore-data --remap-column=hr.employee.salary:offset:10000 \
    --remap-column=hr.employee.hours:offset:-10
```


When source backups contain duplicate tables which should not be merged, you can handle this by using--exclude-tables, --exclude-databases, or by some other means in your application.

Information about the structure and other characteristics of tables to be merged can obtained using SHOW CREATE TABLE; the ndb_desc tool; and MAX(), MIN(), LAST_INSERT_ID(), and other MySQL functions.

Replication of changes from merged to unmerged tables, or from unmerged to merged tables, in separate instances of NDB Cluster is not supported.
- --restore-data, -r

\begin{tabular}{|l|l|}
\hline Command-Line Format & --restore-data \\
\hline
\end{tabular}

Output NDB table data and logs.
- --restore-epoch, -e

\begin{tabular}{|l|l|}
\hline Command-Line Format & --restore-epoch \\
\hline
\end{tabular}

Add (or restore) epoch information to the cluster replication status table. This is useful for starting replication on an NDB Cluster replica. When this option is used, the row in the mysql.ndb_apply_status having 0 in the id column is updated if it already exists; such a row is inserted if it does not already exist. (See Section 25.7.9, "NDB Cluster Backups With NDB Cluster Replication".)
- --restore-meta, -m

\begin{tabular}{|l|l|}
\hline Command-Line Format & --restore-meta \\
\hline
\end{tabular}

This option causes ndb_restore to print NDB table metadata.
The first time you run the ndb_restore restoration program, you also need to restore the metadata. In other words, you must re-create the database tables-this can be done by running it with the --
restore-meta (-m) option. Restoring the metadata need be done only on a single data node; this is sufficient to restore it to the entire cluster.
ndb_restore uses the default number of partitions for the target cluster, unless the number of local data manager threads is also changed from what it was for data nodes in the original cluster.

When using this option, it is recommended that auto synchronization be disabled by setting ndb_metadata_check=0FF until ndb_restore has completed restoring the metadata, after which it can it turned on again to synchronize objects newly created in the NDB dictionary.

\section*{Note}

The cluster should have an empty database when starting to restore a backup. (In other words, you should start the data nodes with --initial prior to performing the restore.)
- --restore-privilege-tables

\begin{tabular}{|l|l|}
\hline Command-Line Format & --restore-privilege-tables \\
\hline Deprecated & Yes \\
\hline
\end{tabular}

No longer used.
- --rewrite-database=olddb,newdb

\begin{tabular}{|l|l|}
\hline Command-Line Format & --rewrite-database=string \\
\hline Type & String \\
\hline Default Value & none \\
\hline
\end{tabular}

This option makes it possible to restore to a database having a different name from that used in the backup. For example, if a backup is made of a database named products, you can restore the data it contains to a database named inventory, use this option as shown here (omitting any other options that might be required):
\$> ndb_restore --rewrite-database=product,inventory
The option can be employed multiple times in a single invocation of ndb_restore. Thus it is possible to restore simultaneously from a database named db1 to a database named db2 and from a database named db3 to one named db4 using --rewrite-database=db1, db2 --rewritedatabase=db3,db4. Other ndb_restore options may be used between multiple occurrences of --rewrite-database.

In the event of conflicts between multiple--rewrite-database options, the last --rewritedatabase option used, reading from left to right, is the one that takes effect. For example, if - -rewrite-database=db1, db2 --rewrite-database=db1, db3 is used, only --rewrite-database=db1, db3 is honored, and - -rewrite-database=db1, db2 is ignored. It is also possible to restore from multiple databases to a single database, so that - -rewritedatabase=db1,db3 --rewrite-database=db2,db3 restores all tables and data from databases db1 and db2 into database db3.

\section*{Important}

When restoring from multiple backup databases into a single target database using - -rewrite-database, no check is made for collisions between table or other object names, and the order in which rows are restored is not guaranteed. This means that it is possible in such cases for rows to be overwritten and updates to be lost.
- --skip-broken-objects

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-broken-objects \\
\hline
\end{tabular}

This option causes ndb_restore to ignore corrupt tables while reading a native NDB backup, and to continue restoring any remaining tables (that are not also corrupted). Currently, the --skip-broken-objects option works only in the case of missing blob parts tables.
- --skip-fk-checks

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-fk-checks \\
\hline
\end{tabular}

This option modifies the behavior of ndb_restore--rebuild-indexes so that, when foreign keys are re-enabled, the existing data in the table is not checked for consistency.
- --skip-table-check, -s

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-table-check \\
\hline
\end{tabular}

It is possible to restore data without restoring table metadata. By default when doing this, ndb_restore fails with an error if a mismatch is found between the table data and the table schema; this option overrides that behavior.

Some of the restrictions on mismatches in column definitions when restoring data using ndb_restore are relaxed; when one of these types of mismatches is encountered, ndb_restore does not stop with an error as it did previously, but rather accepts the data and inserts it into the target table while issuing a warning to the user that this is being done. This behavior occurs whether or not either of the options--skip-table-check or--promote-attributes is in use. These differences in column definitions are of the following types:
- Different COLUMN_FORMAT settings (FIXED, DYNAMIC, DEFAULT)
- Different STORAGE settings (MEMORY, DISK)
- Different default values
- Different distribution key settings
- --skip-unknown-objects

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-unknown-objects \\
\hline
\end{tabular}

This option causes ndb_restore to ignore any schema objects it does not recognize while reading a native NDB backup. This can be used for restoring a backup made from a cluster running (for example) NDB 7.6 to a cluster running NDB Cluster 7.5.
- --slice-id=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --slice-id=\# \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 1023 \\
\hline
\end{tabular}

When restoring by slices, this is the ID of the slice to restore. This option is always used together with --num-slices, and its value must be always less than that of --num-slices.

For more information, see the description of the --num-slices elsewhere in this section.
- --tab=dir_name, -T dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- tab=path \\
\hline Type & Directory name \\
\hline
\end{tabular}

Causes --print-data to create dump files, one per table, each named tbl_name.txt. It requires as its argument the path to the directory where the files should be saved; use . for the current directory.
- --timestamp-printouts

\begin{tabular}{|l|l|}
\hline Command-Line Format & --timestamp-printouts\{=true|false\} \\
\hline Type & Boolean \\
\hline Default Value & true \\
\hline
\end{tabular}

Causes info, error, and debug log messages to be prefixed with timestamps.
This option is enabled by default. Disable it with --timestamp-printouts=false.
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as - - help.
- --verbose=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --verbose=\# \\
\hline Type & Numeric \\
\hline Default Value & 1 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 255 \\
\hline
\end{tabular}

Sets the level for the verbosity of the output. The minimum is 0 ; the maximum is 255 . The default value is 1 .
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.
- --with-apply-status

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -with-apply-status \\
\hline
\end{tabular}

Restore all rows from the backup's ndb_apply_status table (except for the row having server_id $=0$, which is generated using --restore-epoch). This option requires that --restore-data also be used.

If the ndb_apply_status table from the backup already contains a row with server_id = 0 , ndb_restore - with - apply-status deletes it. For this reason, we recommend that you use ndb_restore - -restore-epoch after invoking ndb_restore with the --with-applystatus option. You can also use --restore-epoch concurrently with the last of any invocations of ndb_restore --with-apply-status used to restore the cluster.

For more information, see ndb_apply_status Table.

Typical options for this utility are shown here:
```
ndb_restore [-c connection_string] -n node_id -b backup_id \
    [-m] -r --backup-path=/path/to/backup/files
```


Normally, when restoring from an NDB Cluster backup, ndb_restore requires at a minimum the -nodeid (short form: - n), --backupid (short form: -b), and --backup-path options.

The -c option is used to specify a connection string which tells ndb_restore where to locate the cluster management server (see Section 25.4.3.3, "NDB Cluster Connection Strings"). If this option is not used, then ndb_restore attempts to connect to a management server on localhost: 1186 . This utility acts as a cluster API node, and so requires a free connection "slot" to connect to the cluster management server. This means that there must be at least one [api] or [mysqld] section that can be used by it in the cluster config. ini file. It is a good idea to keep at least one empty [api] or [mysqld] section in config.ini that is not being used for a MySQL server or other application for this reason (see Section 25.4.3.7, "Defining SQL and Other API Nodes in an NDB Cluster").
ndb_restore can decrypt an encrypted backup using --decrypt and - -backup-password. Both options must be specified to perform decryption. See the documentation for the START BACKUP management client command for information on creating encrypted backups.

You can verify that ndb_restore is connected to the cluster by using the SHOW command in the ndb_mgm management client. You can also accomplish this from a system shell, as shown here:
\$> ndb_mgm -e "SHOW"

\section*{Error reporting.}
ndb_restore reports both temporary and permanent errors. In the case of temporary errors, it may able to recover from them, and reports Restore successful, but encountered temporary error, please look at configuration in such cases.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4258.jpg?height=120&width=108&top_left_y=1466&top_left_x=301)

\section*{Important}

After using ndb_restore to initialize an NDB Cluster for use in circular replication, binary logs on the SQL node acting as the replica are not automatically created, and you must cause them to be created manually. To cause the binary logs to be created, issue a SHOW TABLES statement on that SQL node before running START REPLICA. This is a known issue in NDB Cluster.

\subsection*{25.5.24 ndb_secretsfile_reader — Obtain Key Information from an Encrypted NDB Data File}
ndb_secretsfile_reader gets the encryption key from an NDB encryption secrets file, given the password.

\section*{Usage}
ndb_secretsfile_reader options file
The options must include one of --filesystem-password or --filesystem-password-fromstdin, and the encryption password must be supplied, as shown here:
> ndb_secretsfile_reader --filesystem-password=54kl14 ndb_5_fs/D1/NDBCNTR/S0.sysfile ndb_secretsfile_reader: [Warning] Using a password on the command line interface can be insecure. cac256e18b2ddf6b5ef82d99a72f18e864b78453cc7fa40bfaf0c40b91122d18

These and other options that can be used with ndb_secretsfile_reader are shown in the following table. Additional descriptions follow the table.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-file=path \\
\hline Type & String \\
\hline Default Value & [none] \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --filesystem-password

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- filesystem-password=password \\
\hline
\end{tabular}

Pass the filesystem encryption and decryption password to ndb_secretsfile_reader using stdin, tty, or the my. cnf file.
- --filesystem-password-from-stdin

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- - filesystem-password - from - \\
stdin=\{TRUE|FALSE\}
\end{tabular} \\
\hline
\end{tabular}

Pass the filesystem encryption and decryption password to ndb_secretsfile_reader from stdin (only).
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- help \\
\hline
\end{tabular}

Display help text and exit.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login-path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as --help.
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.

\subsection*{25.5.25 ndb_select_all - Print Rows from an NDB Table}
ndb_select_all prints all rows from an NDB table to stdout.

\section*{Usage}
ndb_select_all -c connection_string tbl_name -d db_name [> file_name]
Options that can be used with ndb_select_all are shown in the following table. Additional descriptions follow the table.
- --character-sets-dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline
\end{tabular}

Directory containing character sets.
- --connect-retries

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retries=\# \\
\hline Type & Integer \\
\hline Default Value & 12 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 12 \\
\hline
\end{tabular}

Number of times to retry connection before giving up.
- --connect-retry-delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retry-delay=\# \\
\hline Type & Integer \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Maximum Value & 5 \\
\hline
\end{tabular}

Number of seconds to wait between attempts to contact management server.
- --connect-string

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-string=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --core-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file \\
\hline
\end{tabular}

Write core file on error; used in debugging.
- --database=dbname, -d dbname

Name of the database in which the table is found. The default value is TEST_DB.
- --descending, -z

Sorts the output in descending order. This option can be used only in conjunction with the - o (- order) option.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-file=path \\
\hline Type & String \\
\hline Default Value & [none] \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --delimiter=character, -D character

Causes the character to be used as a column delimiter. Only table data columns are separated by this delimiter.

The default delimiter is the tab character.
- --disk

Adds a disk reference column to the output. The column is nonempty only for Disk Data tables having nonindexed columns.
- --gci

Adds a GCI column to the output showing the global checkpoint at which each row was last updated. See Section 25.2, "NDB Cluster Overview", and Section 25.6.3.2, "NDB Cluster Log Events", for more information about checkpoints.
- --gci64

Adds a ROW\$GCI64 column to the output showing the global checkpoint at which each row was last updated, as well as the number of the epoch in which this update occurred.
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display help text and exit.
- --lock=lock_type,-l lock_type

Employs a lock when reading the table. Possible values for lock_type are:
- 0: Read lock
- 1: Read lock with hold
- 2: Exclusive read lock

There is no default value for this option.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login - path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- - - header=FALSE

Excludes column headers from the output.
- --nodata

Causes any table data to be omitted.
- --ndb-connectstring

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
- -ndb- \\
connectstring=connection_string
\end{tabular} \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & [none] \\
\hline
\end{tabular}

Set connection string for connecting to ndb_mgmd. Syntax: [nodeid=id;] [host=]hostname[:port]. Overrides entries in NDB_CONNECTSTRING and my.cnf.
- --ndb-mgm-tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgm-tls=level \\
\hline Type & Enumeration \\
\hline Default Value & relaxed \\
\hline Valid Values & \begin{tabular}{l}
relaxed \\
strict
\end{tabular} \\
\hline
\end{tabular}

Sets the level of TLS support required to connect to the management server; one of relaxed or strict. relaxed (the default) means that a TLS connection is attempted, but success is not required; strict means that TLS is required to connect.
- --ndb-mgmd-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb-mgmd-host=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --ndb-nodeid

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb - nodeid $=\#$ \\
\hline Type & Integer \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set node ID for this node, overriding any ID set by --ndb-connectstring.
- --ndb-optimized-node-selection

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-optimized-node-selection \\
\hline
\end{tabular}

Enable optimizations for selection of nodes for transactions. Enabled by default; use --skip-ndb-optimized-node-selection to disable.
- --ndb-tls-search-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb-tls-search-path=list \\
\hline Type & Path name \\
\hline Default Value (Unix) & \$HOME/ndb-tls \\
\hline Default Value (Windows) & \$HOMEDIR/ndb-tls \\
\hline
\end{tabular}

Specify a list of directories to search for a CA file. On Unix platforms, the directory names are separated by colons (:); on Windows systems, the semicolon character (;) is used as the separator.

A directory reference may be relative or absolute; it may contain one or more environment variables, each denoted by a prefixed dollar sign (\$), and expanded prior to use.

Searching begins with the leftmost named directory and proceeds from left to right until a file is found. An empty string denotes an empty search path, which causes all searches to fail. A string consisting of a single dot (.) indicates that the search path limited to the current working directory.

If no search path is supplied, the compiled-in default value is used. This value depends on the platform used: On Windows, this is \ndb-tls; on other platforms (including Linux), it is $\$$ HOME/ndb-tls. This can be overridden by compiling NDB Cluster using DWITH_NDB_TLS_SEARCH_PATH.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --order=index_name, -o index_name

Orders the output according to the index named index_name.

\section*{Note}

This is the name of an index, not of a column; the index must have been explicitly named when created.
- parallelism=\#, - p \#

Specifies the degree of parallelism.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --rowid

Adds a ROWID column providing information about the fragments in which rows are stored.
- --tupscan, -t

Scan the table in the order of the tuples.
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as - - help.
- --useHexFormat -x

Causes all numeric values to be displayed in hexadecimal format. This does not affect the output of numerals contained in strings or datetime values.
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.

\section*{Sample Output}

Output from a MySQL SELECT statement:
```
mysql> SELECT * FROM ctest1.fish;
+----+------------+
| id | name |
+----+------------+
| 3 | shark
| 6 | puffer
| 2 | tuna
| 4 | manta ray
| 5 | grouper
| 1 | guppy |
+----+------------+
6 rows in set (0.04 sec)
```


Output from the equivalent invocation of ndb_select_all:
```
$> ./ndb_select_all -c localhost fish -d ctest1
id name
3 [shark]
6 [puffer]
2 [tuna]
4 [manta ray]
5 [grouper]
1 [guppy]
6 rows returned
```


All string values are enclosed by square brackets ([…]) in the output of ndb_select_all. For another example, consider the table created and populated as shown here:
```
CREATE TABLE dogs (
    id INT(11) NOT NULL AUTO_INCREMENT,
    name VARCHAR(25) NOT NULL,
    breed VARCHAR(50) NOT NULL,
    PRIMARY KEY pk (id),
    KEY ix (name)
)
TABLESPACE ts STORAGE DISK
ENGINE=NDBCLUSTER;
INSERT INTO dogs VALUES
    ('', 'Lassie', 'collie'),
    ('', 'Scooby-Doo', 'Great Dane'),
    ('', 'Rin-Tin-Tin', 'Alsatian'),
    ('', 'Rosscoe', 'Mutt');
```


This demonstrates the use of several additional ndb_select_all options:
```
$> ./ndb_select_all -d ctest1 dogs -o ix -z --gci --disk
GCI id name breed DISK_REF
834461 2 [Scooby-Doo] [Great Dane] [ m_file_no: 0 m_page: 98 m_page_idx: 0 ]
834878 4 [Rosscoe] [Mutt] [ m_file_no: 0 m_page: 98 m_page_idx: 16 ]
834463 3 [Rin-Tin-Tin] [Alsatian] [ m_file_no: 0 m_page: 34 m_page_idx: 0 ]
835657 1 [Lassie] [Collie] [ m_file_no: 0 m_page: 66 m_page_idx: 0 ]
4 rows returned
```


\subsection*{25.5.26 ndb_select_count — Print Row Counts for NDB Tables}
ndb_select_count prints the number of rows in one or more NDB tables. With a single table, the result is equivalent to that obtained by using the MySQL statement SELECT COUNT (*) FROM tbl_name.

\section*{Usage}
```
ndb_select_count [-c connection_string] -ddb_name tbl_name[, tbl_name2[, ...]]
```


Options that can be used with ndb_select_count are shown in the following table. Additional descriptions follow the table.
- --character-sets-dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline
\end{tabular}

Directory containing character sets.
- --connect-retries

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retries=\# \\
\hline Type & Integer \\
\hline Default Value & 12 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 12 \\
\hline
\end{tabular}

Number of times to retry connection before giving up.
- --connect-retry-delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retry-delay=\# \\
\hline Type & Integer \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 5 \\
\hline
\end{tabular}

Number of seconds to wait between attempts to contact management server.
- --connect-string

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-string=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --core-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file \\
\hline
\end{tabular}

Write core file on error; used in debugging.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -defaults-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- -login-path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & --no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- help \\
\hline
\end{tabular}

Display help text and exit.
- --ndb-connectstring

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- - ndb - \\
connectstring=connection_string
\end{tabular} \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set connection string for connecting to ndb_mgmd. Syntax: [nodeid=id;]
[host=]hostname[:port]. Overrides entries in NDB_CONNECTSTRING and my.cnf.
- --ndb-mgm-tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgm-tls=level \\
\hline Type & Enumeration \\
\hline Default Value & relaxed \\
\hline Valid Values & \begin{tabular}{l}
relaxed \\
strict
\end{tabular} \\
\hline
\end{tabular}

Sets the level of TLS support required to connect to the management server; one of relaxed or strict. relaxed (the default) means that a TLS connection is attempted, but success is not required; strict means that TLS is required to connect.
- --ndb-mgmd-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb-mgmd-host=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --ndb-nodeid

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb - nodeid $=\#$ \\
\hline Type & Integer \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set node ID for this node, overriding any ID set by --ndb-connectstring.
- --ndb-optimized-node-selection

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-optimized-node-selection \\
\hline
\end{tabular}

Enable optimizations for selection of nodes for transactions. Enabled by default; use--skip-ndb-optimized-node-selection to disable.
- --ndb-tls-search-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb - tls - search - path=list \\
\hline Type & Path name \\
\hline Default Value (Unix) & \$HOME/ndb-tls \\
\hline Default Value (Windows) & \$HOMEDIR/ndb-tls \\
\hline
\end{tabular}

Specify a list of directories to search for a CA file. On Unix platforms, the directory names are separated by colons (:); on Windows systems, the semicolon character (;) is used as the separator. A directory reference may be relative or absolute; it may contain one or more environment variables, each denoted by a prefixed dollar sign (\$), and expanded prior to use.

Searching begins with the leftmost named directory and proceeds from left to right until a file is found. An empty string denotes an empty search path, which causes all searches to fail. A string consisting of a single dot (.) indicates that the search path limited to the current working directory.

If no search path is supplied, the compiled-in default value is used. This value depends on the platform used: On Windows, this is \ndb-tls; on other platforms (including Linux), it is $\$$ HOME/ndb-tls. This can be overridden by compiling NDB Cluster using DWITH_NDB_TLS_SEARCH_PATH.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as - - help.
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.
You can obtain row counts from multiple tables in the same database by listing the table names separated by spaces when invoking this command, as shown under Sample Output.

\section*{Sample Output}
```
$> ./ndb_select_count -c localhost -d ctest1 fish dogs
6 records in table fish
4 records in table dogs
```


\subsection*{25.5.27 ndb_show_tables - Display List of NDB Tables}
ndb_show_tables displays a list of all NDB database objects in the cluster. By default, this includes not only both user-created tables and NDB system tables, but NDB-specific indexes, internal triggers, and NDB Cluster Disk Data objects as well.

Options that can be used with ndb_show_tables are shown in the following table. Additional descriptions follow the table.

\section*{Usage}
ndb_show_tables [-c connection_string]
- --character-sets-dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline
\end{tabular}

Directory containing character sets.
- --connect-retries

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retries=\# \\
\hline Type & Integer \\
\hline Default Value & 12 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 12 \\
\hline
\end{tabular}

Number of times to retry connection before giving up.
- --connect-retry-delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retry-delay=\# \\
\hline Type & Integer \\
\hline Default Value & 54239 \\
\hline Minimum Value & 0 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Maximum Value & 5 \\
\hline
\end{tabular}

Number of seconds to wait between attempts to contact management server.
- --connect-string

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-string=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --core-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file \\
\hline
\end{tabular}

Write core file on error; used in debugging.
- --database, -d

Specifies the name of the database in which the desired table is found. If this option is given, the name of a table must follow the database name.

If this option has not been specified, and no tables are found in the TEST_DB database, ndb_show_tables issues a warning.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -defaults-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display help text and exit.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- -login-path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & --no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --loops, -l

Specifies the number of times the utility should execute. This is 1 when this option is not specified, but if you do use the option, you must supply an integer argument for it.
- --ndb-connectstring

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- - ndb - \\
connectstring=connection_string
\end{tabular} \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set connection string for connecting to ndb_mgmd. Syntax: [nodeid=id;]
[host=]hostname[:port]. Overrides entries in NDB_CONNECTSTRING and my.cnf.
- --ndb-mgm-tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-mgm-tls=level \\
\hline Type & Enumeration \\
\hline Default Value & relaxed \\
\hline Valid Values & \begin{tabular}{l}
relaxed \\
strict
\end{tabular} \\
\hline
\end{tabular}

Sets the level of TLS support required to connect to the management server; one of relaxed or strict. relaxed (the default) means that a TLS connection is attempted, but success is not required; strict means that TLS is required to connect.
- --ndb-mgmd-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb-mgmd-host=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --ndb-nodeid

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb - nodeid $=\#$ \\
\hline Type & Integer \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set node ID for this node, overriding any ID set by --ndb-connectstring.
- --ndb-optimized-node-selection

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-optimized-node-selection \\
\hline
\end{tabular}

Enable optimizations for selection of nodes for transactions. Enabled by default; use--skip-ndb-optimized-node-selection to disable.
- --ndb-tls-search-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb - tls - search - path=list \\
\hline Type & Path name \\
\hline Default Value (Unix) & \$HOME/ndb - tls \\
\hline Default Value (Windows) & \$HOMEDIR/ndb - tls \\
\hline
\end{tabular}

Specify a list of directories to search for a CA file. On Unix platforms, the directory names are separated by colons (:); on Windows systems, the semicolon character (;) is used as the separator. A directory reference may be relative or absolute; it may contain one or more environment variables, each denoted by a prefixed dollar sign (\$), and expanded prior to use.

Searching begins with the leftmost named directory and proceeds from left to right until a file is found. An empty string denotes an empty search path, which causes all searches to fail. A string consisting of a single dot (.) indicates that the search path limited to the current working directory.

If no search path is supplied, the compiled-in default value is used. This value depends on the platform used: On Windows, this is \ndb-tls; on other platforms (including Linux), it is $\$$ HOME/ndb-tls. This can be overridden by compiling NDB Cluster using DWITH_NDB_TLS_SEARCH_PATH.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --parsable, -p

Using this option causes the output to be in a format suitable for use with LOAD DATA.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --show-temp-status

If specified, this causes temporary tables to be displayed.
- --type, -t

Can be used to restrict the output to one type of object, specified by an integer type code as shown here:
- 1: System table
- 2: User-created table
- 3: Unique hash index

Any other value causes all NDB database objects to be listed (the default).
- --unqualified, -u

If specified, this causes unqualified object names to be displayed.
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as - -help.
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- version \\
\hline
\end{tabular}

Display version information and exit.

\section*{Note}

Only user-created NDB Cluster tables may be accessed from MySQL; system tables such as SYSTAB_0 are not visible to mysqld. However, you can examine the contents of system tables using NDB API applications such as ndb_select_all (see Section 25.5.25, "ndb_select_all — Print Rows from an NDB Table").

\subsection*{25.5.28 ndb_sign_keys - Create, Sign, and Manage TLS Keys and Certificates for NDB Cluster}

Management of TLS keys and certificates in implemented in NDB Cluster as the executable utility program ndb_sign_keys, which can normally be found in the MySQL bin directory. The program performs such functions as creating, signing, and retiring keys and certificates, and normally works as follows:
1. ndb_sign_keys connects to ndb_mgmd and fetches the cluster' configuration.
2. For each cluster node that is configured to run on the local machine, ndb_sign_keys finds the node' private key and sign it, creating an active node certificate.

Some additional tasks that can be performed by ndb_sign_keys are listed here:
- Obtaining configuration information from a config.ini file rather than a running ndb_mgmd
- Creating the cluster' certificate authority (CA) if it does not yet exist
- Creating private keys
- Saving keys and certificates as pending rather than active
- Signing the key for a single node as specified using command-line options described later in this section
- Requesting a CA located on a remote host to sign a local key

Options that can be used with ndb_sign_keys are shown in the following table. Additional descriptions follow the table.
- --bind-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - bind - host=host \\
\hline Type & String \\
\hline Default Value & mgmd, api \\
\hline
\end{tabular}

Create a certificate bound to a hostname list of node types that should have certificate hostname bindings, from the set (mgmd, db, api).
- --bound-hostname

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - bound - hostname=hostname \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Create a certificate bound to the hostname passed to this option.
- --CA-cert

\begin{tabular}{|l|l|}
\hline Command-Line Format & --CA-cert=name \\
\hline Type & File name \\
\hline Default Value & NDB-Cluster-cert \\
\hline
\end{tabular}

Use the name passed to this option for the CA Certificate file.
- - - CA-days

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -CA - days=\# \\
\hline Type & Integer \\
\hline Default Value & 1461 \\
\hline Minimum Value & -1 \\
\hline Maximum Value & 2147483647 \\
\hline
\end{tabular}

Set the lifetime of the certificate to this many days. The default is equivalent to 4 years plus 1 day. -1 means the certificate never expires.

This option was added in NDB 8.4.1.
- - - CA- key

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - CA - key=name \\
\hline Type & File name \\
\hline Default Value & NDB-Cluster-private-key \\
\hline
\end{tabular}

Use the name passed to this option for the CA private key file.
- --CA-ordinal

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -CA-ordinal=name \\
\hline Type & String \\
\hline Default Value & [none] \\
\hline Valid Values & \begin{tabular}{l}
First \\
Second
\end{tabular} \\
\hline
\end{tabular}

Set the ordinal CA name; defaults to First for --create-CA and Second for--rotate-CA. The Common Name in the CA certificate is "MySQL NDB Cluster ordinal Certificate", where ordinal is the ordinal name passed to this option.
- --CA-search-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -CA - search - path=name \\
\hline Type & File name \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Specify a list of directories to search for a CA file. On Unix platforms, the directory names are separated by colons (:); on Windows systems, the semicolon character (;) is used as the separator. A directory reference may be relative or absolute; it may contain one or more environment variables, each denoted by a prefixed dollar sign (\$), and expanded prior to use.

Searching begins with the leftmost named directory and proceeds from left to right until a file is found. An empty string denotes an empty search path, which causes all searches to fail. A string consisting of a single dot (.) indicates that the search path is limited to the current working directory.

If no search path is supplied, the compiled-in default value is used. This value depends on the platform used: On Windows, this is \$HOMEPATH\ndb-tls; on other platforms (including Linux), it is $\$$ HOME/ndb-tls. This default can be overridden by compiling NDB Cluster using DWITH_NDB_TLS_SEARCH_PATH.
- --CA-tool

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - CA - tool=name \\
\hline Type & File name \\
\hline Default Value & [none] \\
\hline
\end{tabular}

Designate an executable helper tool, including the path.
- --check

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - check \\
\hline
\end{tabular}

Check certificate expiry dates.
- --config-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --config-file=file \\
\hline Disabled by & no-config \\
\hline Type & File name \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Supply the path to the cluster configuration file (usually config.ini).
- --connect-retries

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retries=\# \\
\hline Type & Integer \\
\hline Default Value & 12 \\
\hline Minimum Value & -1 \\
\hline Maximum Value & 12 \\
\hline
\end{tabular}

Set the number of times that ndb_sign_keys attempts to connect to the cluster. If you use -1 , the program keeps trying to connect until it succeeds or is forced to stop.
- --connect-retry-delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retry-delay=\# \\
\hline Type & Integer \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 5 \\
\hline
\end{tabular}

Set the number of seconds after a failed connection attempt which ndb_sign_keys waits before trying again, up to the number of times determined by --connect-retries.
- --create-CA

\begin{tabular}{|l|l|}
\hline Command-Line Format & --create-CA \\
\hline
\end{tabular}

Create the CA key and certificate.
- --create-key

\begin{tabular}{|l|l|}
\hline Command-Line Format & --create-key \\
\hline
\end{tabular}

Create or replace private keys.
- --curve

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - curve=name \\
\hline Type & String \\
\hline Default Value & P-256 \\
\hline
\end{tabular}

Use the named curve for encrypting node keys.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read this option file after the global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -defaults-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read this option file only.
- --defaults-group-suffix

\begin{tabular}{l|l|l|}
\cline { 2 - 3 } & Command-Line Format & --defaults-group-suffix=string \\
\hline \multirow{2}{*}{4246} & Type & String \\
\cline { 2 - 3 } & Default Value & {$[$ none $]$} \\
\cline { 2 - 3 } & &
\end{tabular}
- --duration

\begin{tabular}{|l|l|}
\hline Command-Line Format & --duration=\# \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & -500000 \\
\hline Maximum Value & 0 \\
\hline Unit & seconds \\
\hline
\end{tabular}

Set the lifetime of certificates or signing requests, in seconds.
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- help \\
\hline
\end{tabular}

Print help text and exit.
- --keys-to-dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - keys - to - dir=dirname \\
\hline Type & Directory name \\
\hline Default Value & [none] \\
\hline
\end{tabular}

Specify output directory for private keys (only); for this purpose, it overrides any value set for - - to dir.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login-path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read this path from the login file.
- --ndb-connectstring

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
- -ndb- \\
connectstring=connection_string
\end{tabular} \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set the connection string to use for connecting to ndb_mgmd, using the syntax [nodeid=id;] [host=]hostname[:port]. If this option is set, it overrides the value set for NDB_CONNECTSTRING (if any), as well as any value set in a my.cnf. file.
- --ndb-mgm-tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb-mgm-tls=level \\
\hline Type & Enumeration \\
\hline Default Value & relaxed \\
\hline Valid Values & relaxed
\end{tabular}

Sets the level of TLS support required for the ndb_mgm client; one of relaxed or strict. relaxed (the default) means that a TLS connection is attempted, but success is not required; strict means that TLS is required to connect.
- --ndb-tls-search-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb - tls - search - path=list \\
\hline Type & Path name \\
\hline Default Value (Unix) & \$HOME/ndb - tls \\
\hline Default Value (Windows) & \$HOMEDIR/ndb - tls \\
\hline
\end{tabular}

Specify a list of directories containing TLS keys and certificates.
For syntax, see the description of the --CA-search-path option.
- --no-config

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - config \\
\hline
\end{tabular}

Do not obtain the cluster configuration; create a single certificate based on the options supplied (including defaults for those not specified).
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than the login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - login-paths \\
\hline
\end{tabular}

Do not read login paths from the login path file.
- --passphrase

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- passphrase=phrase \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Specify a CA key pass phrase.
- --node-id

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -node-id=\# \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 255 \\
\hline
\end{tabular}

Create or sign a key for the node having the specified node ID.
- --node-type

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - node - type=set \\
\hline Type & Set \\
\hline Default Value & $\mathrm{mgmd,db,api}$ \\
\hline
\end{tabular}

Create or sign keys for the specified type or types from the set (mgmd, db, api).
- --pending

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- pending \\
\hline
\end{tabular}

Save keys and certificates as pending, rather than active.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print the program argument list, then exit.
- --promote

\begin{tabular}{|l|l|}
\hline Command-Line Format & --promote \\
\hline
\end{tabular}

Promote pending files to active, then exit.
- --remote-CA-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - remote-CA-host=hostname \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Specify the address or hostname of a remote CA host.
- --remote-exec-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - remote - exec - path \\
\hline Type & Path name \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Provide the full path to an executable on the remote CA host specified with--remote-CA-host.
- --remote-openssl

\begin{tabular}{|l|l|}
\hline Command-Line Format & --remote-openssl \\
\hline
\end{tabular}

Use OpenSSL for signing of keys on the remote CA host specified with --remote-CA-host.
- --replace-by

$\left.$\begin{tabular}{|l|l|l|}
\cline { 2 - 3 } & Command-Line Format & -- replace - by $=\#$ \\
\hline & Type & Integer \\
\cline { 2 - 3 } & Default Value & -10 \\
\cline { 2 - 3 } & Minimum Value & -128
\end{tabular} 4249 \right\rvert\,

\begin{tabular}{|l|l|} 
Maximum Value & 127
\end{tabular}

Suggest a certificate replacement date for periodic checks, as a number of days after the CA expiration date. Use a negative number to indicate days before expiration.
- --rotate-CA

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - rotate-CA \\
\hline
\end{tabular}

Replace an older CA with a newer one. The new CA can be created using OpenSSL, or you can allow ndb_sign_keys to create the new one, in which case the new CA is created with an intermediate CA certificate, signed by the old CA.
- --schedule

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- schedule $=$ list \\
\hline Type & String \\
\hline Default Value & $120,10,130,10,150,0$ \\
\hline
\end{tabular}

Assign a schedule of expiration dates to certificates. The schedule is defined as a comma-delimited list of six integers, in the format shown here:
api_valid,api_extra,dn_valid,dn_extra,mgm_valid,mgm_extra
These values are defined as follows:
- api_valid: A fixed number of days of validity for client certificates.
api_extra: A number of extra days for client certificates.
dn_valid: A fixed number of days of validity for client certificates for data node certificates.
dn_extra: A number of extra days for data node certificates.
mgm_valid: A fixed number of days of validity for management server certificates.
mgm_extra: A number of extra days for management server certificates.
In other words, for each node type (API node, data node, management node), certificates are created with a lifetime equal to a whole fixed number of days, plus some random amount of time less than or equal to the number of extra days. The default schedule is shown here:
--schedule=120, 10, 130, 10, 150, 0
Following the default schedule, client certificates begin expiring on the $120{ }^{\text {th }}$ day, and expire at random intervals over the next 10 days; data node certificates expire at random times between the $130^{\text {th }}$ and $140^{\text {th }}$ days; and management node certificates expire on the $150{ }^{\text {th }}$ day (with no random interval following).
- --sign

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -sign \\
\hline Disabled by & skip-sign \\
\hline
\end{tabular}

Create signed certificates; enabled by default. Use --skip-sign to create certificate signing requests instead.
- --skip-sign

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-sign \\
\hline
\end{tabular}

Create certificate signing requests instead of signed certificates.
- --stdio

\begin{tabular}{|l|l|}
\hline Command-Line Format & --stdio \\
\hline
\end{tabular}

Read certificate signing requests from stdin, and write X. 509 to stdout.
- --to-dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - to - dir=dirname \\
\hline Type & Directory name \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Specify the output directory for created files. For private key files, this can be overriden using --keys-to-dir.
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Print help text, then exit (alias for - - help).
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- version \\
\hline
\end{tabular}

Print version information, then exit.

\subsection*{25.5.29 ndb_size.pl — NDBCLUSTER Size Requirement Estimator}

This is a Perl script that can be used to estimate the amount of space that would be required by a MySQL database if it were converted to use the NDBCLUSTER storage engine. Unlike the other utilities discussed in this section, it does not require access to an NDB Cluster (in fact, there is no reason for it to do so). However, it does need to access the MySQL server on which the database to be tested resides.

\section*{Note}
ndb_size.pl is deprecated, and no longer supported, in NDB 8.4.3 and later. You should expect it to be removed from a future version of the NDB Cluster distribution, and modify any dependent applications accordingly.

\section*{Requirements}
- A running MySQL server. The server instance does not have to provide support for NDB Cluster.
- A working installation of Perl.
- The DBI module, which can be obtained from CPAN if it is not already part of your Perl installation. (Many Linux and other operating system distributions provide their own packages for this library.)
- A MySQL user account having the necessary privileges. If you do not wish to use an existing account, then creating one using GRANT USAGE ON $d b \_n a m e$. *-where $d b \_n a m e$ is the name of the database to be examined-is sufficient for this purpose.
ndb_size.pl can also be found in the MySQL sources in storage/ndb/tools.
Options that can be used with ndb_size.pl are shown in the following table. Additional descriptions follow the table.

\section*{Usage}
```
perl ndb_size.pl [--database={db_name|ALL}] [--hostname=host[:port]] [--socket=socket] \
    [--user=user] [--password=password] \
    [--help|-h] [--format={html|text}] \
    [--loadqueries=file_name] [--savequeries=file_name]
```


By default, this utility attempts to analyze all databases on the server. You can specify a single database using the --database option; the default behavior can be made explicit by using ALL for the name of the database. You can also exclude one or more databases by using the --excludedbs option with a comma-separated list of the names of the databases to be skipped. Similarly, you can cause specific tables to be skipped by listing their names, separated by commas, following the optional --excludetables option. A host name can be specified using --hostname; the default is localhost. You can specify a port in addition to the host using host:port format for the value of hostname. The default port number is 3306 . If necessary, you can also specify a socket; the default is /var/lib/mysql.sock. A MySQL user name and password can be specified the corresponding options shown. It also possible to control the format of the output using the --format option; this can take either of the values html or text, with text being the default. An example of the text output is shown here:
```
$> ndb_size.pl --database=test --socket=/tmp/mysql.sock
ndb_size.pl report for database: 'test' (1 tables)
Connected to: DBI:mysql:host=localhost;mysql_socket=/tmp/mysql.sock
Including information for versions: 4.1, 5.0, 5.1
test.t1
-------
DataMemory for Columns (* means varsized DataMemory):

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Column Name & Type & Varsized & Key & 4.1 & 5.0 & 5.1 \\
\hline HIDDEN_NDB_PKEY & bigint & & PRI & 8 & 8 & 8 \\
\hline c2 & varchar(50) & Y & & 52 & 52 & 4* \\
\hline c1 & int(11) & & & 4 & 4 & 4 \\
\hline & & & & -- & -- & -- \\
\hline Fixed Size Columns DM/Row & & & & 64 & 64 & 12 \\
\hline Varsize Columns DM/Row & & & & 0 & 0 & 4 \\
\hline
\end{tabular}
DataMemory for Indexes:

\begin{tabular}{|l|l|l|l|}
\hline Index Name & Type & 4.1 & 5.0 \\
\hline PRIMARY & BTREE & 16 & 16 \\
\hline & & -- & -- \\
\hline Total Index DM/Row & & 16 & 16 \\
\hline \multicolumn{4}{|l|}{IndexMemory for Indexes:} \\
\hline Index Name & 4.1 & 5.0 & 5.1 \\
\hline PRIMARY & 33 & 16 & 16 \\
\hline & - - & -- & -- \\
\hline Indexes IM/Row & 33 & 16 & 16 \\
\hline \multicolumn{4}{|l|}{Summary (for THIS table):} \\
\hline & 4.1 & 5.0 & 5.1 \\
\hline Fixed Overhead DM/Row & 12 & 12 & 16 \\
\hline NULL Bytes/Row & 4 & 4 & 4 \\
\hline DataMemory/Row & 96 & 96 & 48 \\
\hline \multicolumn{4}{|r|}{(Includes overhead, bitmap and indexes} \\
\hline Varsize Overhead DM/Row & 0 & 0 & 8 \\
\hline Varsize NULL Bytes/Row & 0 & 0 & 4 \\
\hline Avg Varside DM/Row & 0 & 0 & 16 \\
\hline No. Rows & 0 & 0 & 0 \\
\hline Rows/32kb DM Page & 340 & 340 & 680 \\
\hline Fixedsize DataMemory (KB) & 0 & 0 & 0 \\
\hline Rows/32kb Varsize DM Page & 0 & 0 & 2040 \\
\hline
\end{tabular}
```


\begin{tabular}{|l|l|l|l|l|}
\hline Varsize DataMemory (KB) & 0 & 0 & 0 & \multirow{5}{*}{} \\
\hline Rows/8kb IM Page & 248 & 512 & 512 & \\
\hline IndexMemory (KB) & 0 & 0 & 0 & \\
\hline \multicolumn{5}{|l|}{\multirow[t]{2}{*}{Parameter Minimum Requirements}} \\
\hline \multicolumn{5}{|l|}{* indicates greater than default} \\
\hline Parameter & Default & 4.1 & 5.0 & 5.1 \\
\hline DataMemory (KB) & 81920 & 0 & 0 & 0 \\
\hline NoOfOrderedIndexes & 128 & 1 & 1 & 1 \\
\hline NoOfTables & 128 & 1 & 1 & 1 \\
\hline IndexMemory (KB) & 18432 & 0 & 0 & 0 \\
\hline NoOfUniqueHashIndexes & 64 & 0 & 0 & 0 \\
\hline NoOfAttributes & 1000 & 3 & 3 & 3 \\
\hline NoOfTriggers & 768 & 5 & 5 & 5 \\
\hline
\end{tabular}

For debugging purposes, the Perl arrays containing the queries run by this script can be read from the file specified using can be saved to a file using --savequeries; a file containing such arrays to be read during script execution can be specified using --loadqueries. Neither of these options has a default value.

To produce output in HTML format, use the --format option and redirect the output to a file, as shown here:
```
$> ndb_size.pl --database=test --socket=/tmp/mysql.sock --format=html > ndb_size.html
```

(Without the redirection, the output is sent to stdout.)
The output from this script includes the following information:
- Minimum values for the DataMemory, IndexMemory, MaxNoOfTables, MaxNoOfAttributes, MaxNoOfOrderedIndexes, and MaxNoOfTriggers configuration parameters required to accommodate the tables analyzed.
- Memory requirements for all of the tables, attributes, ordered indexes, and unique hash indexes defined in the database.
- The IndexMemory and DataMemory required per table and table row.

\subsection*{25.5.30 ndb_top - View CPU usage information for NDB threads}
ndb_top displays running information in the terminal about CPU usage by NDB threads on an NDB Cluster data node. Each thread is represented by two rows in the output, the first showing system statistics, the second showing the measured statistics for the thread.
ndb_top is available beginning with MySQL NDB Cluster 7.6.3.

\section*{Usage}
ndb_top [-h hostname] [-t port] [-u user] [-p pass] [-n node_id]
ndb_top connects to a MySQL Server running as an SQL node of the cluster. By default, it attempts to connect to a mysqld running on localhost and port 3306, as the MySQL root user with no password specified. You can override the default host and port using, respectively, --host (-h) and --port (-t). To specify a MySQL user and password, use the --user (-u) and --passwd (-p) options. This user must be able to read tables in the ndbinfo database (ndb_top uses information from ndbinfo.cpustat and related tables).

For more information about MySQL user accounts and passwords, see Section 8.2, "Access Control and Account Management".

Output is available as plain text or an ASCII graph; you can specify this using the --text (-x) and graph (-g) options, respectively. These two display modes provide the same information; they can be used concurrently. At least one display mode must be in use.

Color display of the graph is supported and enabled by default (--color or-c option). With color support enabled, the graph display shows OS user time in blue, OS system time in green, and idle time as blank. For measured load, blue is used for execution time, yellow for send time, red for time spent in send buffer full waits, and blank spaces for idle time. The percentage shown in the graph display is the sum of percentages for all threads which are not idle. Colors are not currently configurable; you can use grayscale instead by using --skip-color.

The sorted view (--sort, -r) is based on the maximum of the measured load and the load reported by the OS. Display of these can be enabled and disabled using the --measured-load (-m) and --os-load (-o) options. Display of at least one of these loads must be enabled.

The program tries to obtain statistics from a data node having the node ID given by the --node-id (n) option; if unspecified, this is 1 . ndb_top cannot provide information about other types of nodes.

The view adjusts itself to the height and width of the terminal window; the minimum supported width is 76 characters.

Once started, ndb_top runs continuously until forced to exit; you can quit the program using Ctrl-C. The display updates once per second; to set a different delay interval, use--sleep-time (-s).
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4284.jpg?height=122&width=99&top_left_y=1224&top_left_x=306)

\section*{Note}
ndb_top is available on macOS, Linux, and Solaris. It is not currently supported on Windows platforms.

The following table includes all options that are specific to the NDB Cluster program ndb_top. Additional descriptions follow the table.

\section*{Additional Options}
- --color, -c

\begin{tabular}{|l|l|}
\hline Command-Line Format & --color \\
\hline
\end{tabular}

Show ASCII graphs in color; use--skip-colors to disable.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- defaults-extra-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- defaults-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix
ndb_top - View CPU usage information for NDB threads

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --graph, -g

\begin{tabular}{|l|l|}
\hline Command-Line Format & --graph \\
\hline
\end{tabular}

Display data using graphs; use--skip-graphs to disable. This option or --text must be true; both options may be true.
- - -help, -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Show program usage information.
- --host[=name], -h

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- host=string \\
\hline Type & String \\
\hline Default Value & localhost \\
\hline
\end{tabular}

Host name or IP address of MySQL Server to connect to.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login-path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & --no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --measured-load, -m

\begin{tabular}{|l|l|}
\hline Command-Line Format & --measured-load \\
\hline
\end{tabular}

Show measured load by thread. This option or--os-load must be true; both options may be true.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --no-defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --node-id[=\#], -n

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- node - id=\# \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Integer \\
\hline Default Value & 1 \\
\hline
\end{tabular}

Watch the data node having this node ID.
- --os-load, -o

\begin{tabular}{|l|l|}
\hline Command-Line Format & --os-load \\
\hline
\end{tabular}

Show load measured by operating system. This option or --measured-load must be true; both options may be true.
- --password[=password], -p

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- password=password \\
\hline Type & String \\
\hline Default Value & NULL \\
\hline
\end{tabular}

Connect to a MySQL Server using this password and the MySQL user specified by - - user.
This password is associated with a MySQL user account only, and is not related in any way to the password used with encrypted NDB backups.
- --port[=\#], -P

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- port $=\#$ \\
\hline Type & Integer \\
\hline Default Value & 3306 \\
\hline
\end{tabular}

Port number to use when connecting to MySQL Server.
(Formerly, the short form for this option was - $t$, which was repurposed as the short form of - - text.)
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --sleep-time[=seconds], -s

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - sleep - time=\# \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline
\end{tabular}

Time to wait between display refreshes, in seconds.
- --socket=path/to/file, -S

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- socket=path \\
\hline Type & Path name \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Use the specified socket file for the connection.
- --sort, -r

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sort \\
\hline
\end{tabular}

Sort threads by usage; use--skip-sort to disable.
- --text, -t

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - text \\
\hline
\end{tabular}

Display data using text. This option or --graph must be true; both options may be true.
(The short form for this option was - x in previous versions of NDB Cluster, but this is no longer supported.)
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as - -help.
- --user[=name], - u

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- user $=$ name \\
\hline Type & String \\
\hline Default Value & root \\
\hline
\end{tabular}

Connect as this MySQL user. Normally requires a password supplied by the --password option.
Sample Output. The next figure shows ndb_top running in a terminal window on a Linux system with an ndbmtd data node under a moderate load. Here, the program has been invoked using ndb_top - n8 - x to provide both text and graph output:

\begin{figure}
\captionsetup{labelformat=empty}
\caption{Figure 25.5 ndb_top Running in Terminal}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4288.jpg?height=1310&width=1543&top_left_y=328&top_left_x=310}
\end{figure}
ndb_top also shows spin times for threads, displayed in green.

\subsection*{25.5.31 ndb_waiter - Wait for NDB Cluster to Reach a Given Status}
ndb_waiter repeatedly (each 100 milliseconds) prints out the status of all cluster data nodes until either the cluster reaches a given status or the --timeout limit is exceeded, then exits. By default, it waits for the cluster to achieve STARTED status, in which all nodes have started and connected to the cluster. This can be overridden using the --no-contact and--not-started options.

The node states reported by this utility are as follows:
- NO_CONTACT: The node cannot be contacted.
- UNKNOWN: The node can be contacted, but its status is not yet known. Usually, this means that the node has received a START or RESTART command from the management server, but has not yet acted on it.
- NOT_STARTED: The node has stopped, but remains in contact with the cluster. This is seen when restarting the node using the management client's RESTART command.
- STARTING: The node's ndbd process has started, but the node has not yet joined the cluster.
- STARTED: The node is operational, and has joined the cluster.
- SHUTTING_DOWN: The node is shutting down.
- SINGLE USER MODE: This is shown for all cluster data nodes when the cluster is in single user mode.

Options that can be used with ndb_waiter are shown in the following table. Additional descriptions follow the table.

\section*{Usage}
ndb_waiter [-c connection_string]

\section*{Additional Options}
- --character-sets-dir

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline
\end{tabular}

Directory containing character sets.
- --connect-retries

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retries=\# \\
\hline Type & Integer \\
\hline Default Value & 12 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 12 \\
\hline
\end{tabular}

Number of times to retry connection before giving up.
- --connect-retry-delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-retry-delay=\# \\
\hline Type & Integer \\
\hline Default Value & 5 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 5 \\
\hline
\end{tabular}

Number of seconds to wait between attempts to contact management server.
- --connect-string

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-string=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --core-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file \\
\hline
\end{tabular}

Write core file on error; used in debugging.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -defaults-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Also read groups with concat(group, suffix).
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login - path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display help text and exit.
- --ndb-connectstring

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
- -ndb- \\
connectstring=connection_string
\end{tabular} \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set connection string for connecting to ndb_mgmd. Syntax: [nodeid=id;] [host=]hostname[:port]. Overrides entries in NDB_CONNECTSTRING and my.cnf.
- --ndb-mgm-tls

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb-mgm-tls=level \\
\hline Type & Enumeration \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & relaxed \\
\hline Valid Values & relaxed \\
& strict \\
\hline
\end{tabular}

Sets the level of TLS support required to connect to the management server; one of relaxed or strict. relaxed (the default) means that a TLS connection is attempted, but success is not required; strict means that TLS is required to connect.
- --ndb-mgmd-host

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb-mgmd-host=connection_string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Same as --ndb-connectstring.
- --ndb-nodeid

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- ndb - nodeid $=\#$ \\
\hline Type & Integer \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Set node ID for this node, overriding any ID set by --ndb-connectstring.
- --ndb-optimized-node-selection

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ndb-optimized-node-selection \\
\hline
\end{tabular}

Enable optimizations for selection of nodes for transactions. Enabled by default; use--skip-ndb-optimized-node-selection to disable.
- --ndb-tls-search-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ndb-tls-search-path=list \\
\hline Type & Path name \\
\hline Default Value (Unix) & \$HOME/ndb-tls \\
\hline Default Value (Windows) & \$HOMEDIR/ndb-tls \\
\hline
\end{tabular}

Specify a list of directories to search for a CA file. On Unix platforms, the directory names are separated by colons (:); on Windows systems, the semicolon character (;) is used as the separator. A directory reference may be relative or absolute; it may contain one or more environment variables, each denoted by a prefixed dollar sign (\$), and expanded prior to use.

Searching begins with the leftmost named directory and proceeds from left to right until a file is found. An empty string denotes an empty search path, which causes all searches to fail. A string consisting of a single dot (.) indicates that the search path limited to the current working directory.

If no search path is supplied, the compiled-in default value is used. This value depends on the platform used: On Windows, this is \ndb-tls; on other platforms (including Linux), it is $\$$ HOME/ndb-tls. This can be overridden by compiling NDB Cluster using DWITH_NDB_TLS_SEARCH_PATH.
- --no-contact, -n

Instead of waiting for the STARTED state, ndb_waiter continues running until the cluster reaches NO_CONTACT status before exiting.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --not-started

Instead of waiting for the STARTED state, ndb_waiter continues running until the cluster reaches NOT_STARTED status before exiting.
- --nowait-nodes=list

When this option is used, ndb_waiter does not wait for the nodes whose IDs are listed. The list is comma-delimited; ranges can be indicated by dashes, as shown here:
\$> ndb_waiter --nowait-nodes=1,3,7-9
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4292.jpg?height=113&width=113&top_left_y=904&top_left_x=333)

\section*{Important}

Do not use this option together with the --wait-nodes option.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --timeout=seconds,-t seconds

Time to wait. The program exits if the desired state is not achieved within this number of seconds. The default is 120 seconds (1200 reporting cycles).
- --single-user

The program waits for the cluster to enter single user mode.
- --usage

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Display help text and exit; same as - - help.
- --verbose

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -verbose=\# \\
\hline Type & Integer \\
\hline Default Value & 2 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2 \\
\hline
\end{tabular}

Controls verbosity level of printout. Possible levels and their effects are listed here:
- 0: Do not print (return exit code only; see following for exit codes).
- 1: Print final connection status only.
- 2: Print status each time it is checked.

This is the same behavior as in versions of NDB Cluster previous to 8.4.

Exit codes returned by ndb_waiter are listed here, with their meanings:
- 0: Success.
-1: Wait timed out.
- 2: Parameter error, such as an invalid node ID.
- 3: Failed to connect to the management server.
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.
- --wait-nodes=list, -w list

When this option is used, ndb_waiter waits only for the nodes whose IDs are listed. The list is comma-delimited; ranges can be indicated by dashes, as shown here:
```
$> ndb_waiter --wait-nodes=2,4-6,10
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4293.jpg?height=127&width=113&top_left_y=1128&top_left_x=397)

\section*{Important}

Do not use this option together with the --nowait-nodes option.

Sample Output. Shown here is the output from ndb_waiter when run against a 4-node cluster in which two nodes have been shut down and then started again manually. Duplicate reports (indicated by . . .) are omitted.
```
$> ./ndb_waiter -c localhost
Connecting to mgmsrv at (localhost)
State node 1 STARTED
State node 2 NO_CONTACT
State node 3 STARTED
State node 4 NO_CONTACT
Waiting for cluster enter state STARTED
...
State node 1 STARTED
State node 2 UNKNOWN
State node 3 STARTED
State node 4 NO_CONTACT
Waiting for cluster enter state STARTED
...
State node 1 STARTED
State node 2 STARTING
State node 3 STARTED
State node 4 NO_CONTACT
Waiting for cluster enter state STARTED
...
State node 1 STARTED
State node 2 STARTING
State node 3 STARTED
State node 4 UNKNOWN
Waiting for cluster enter state STARTED
...
```

```
State node 1 STARTED
State node 2 STARTING
State node 3 STARTED
State node 4 STARTING
Waiting for cluster enter state STARTED
...
State node 1 STARTED
State node 2 STARTED
State node 3 STARTED
State node 4 STARTING
Waiting for cluster enter state STARTED
...
State node 1 STARTED
State node 2 STARTED
State node 3 STARTED
State node 4 STARTED
Waiting for cluster enter state STARTED
```


\section*{Note}

If no connection string is specified, then ndb_waiter tries to connect to a management on localhost, and reports Connecting to mgmsrv at (null).

\subsection*{25.5.32 ndbxfrm - Compress, Decompress, Encrypt, and Decrypt Files Created by NDB Cluster}

The ndbxfrm utility can be used to decompress, decrypt, and output information about files created by NDB Cluster that are compressed, encrypted, or both. It can also be used to compress or encrypt files.

\section*{Usage}
```
ndbxfrm --info file[ file ...]
ndbxfrm --compress input_file output_file
ndbxfrm --decrypt-password=password input_file output_file
ndbxfrm [--encrypt-ldf-iter-count=#] --encrypt-password=password input_file output_file
```

input_file and output_file cannot be the same file.

\section*{Options}
- --compress, -c

\begin{tabular}{|l|l|}
\hline Command-Line Format & --compress \\
\hline
\end{tabular}

Compresses the input file, using the same compression method as is used for compressing NDB Cluster backups, and writes the output to an output file. To decompress a compressed NDB backup file that is not encrypted, it is necessary only to invoke ndbxfrm using the names of the compressed file and an output file (with no options required).
- --decrypt-key=key, -K key

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - decrypt-key=key \\
\hline
\end{tabular}

Decrypts a file encrypted by NDB using the supplied key.

\section*{Note}

This option cannot be used together with --decrypt-password.
- --decrypt-key-from-stdin

\begin{tabular}{|l|l|}
\hline Command-Line Format & --decrypt-key-from-stdin \\
\hline
\end{tabular}

Decrypts a file encrypted by NDB using the key supplied from stdin.
- --decrypt-password=password

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - decrypt-password=password \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Decrypts a file encrypted by NDB using the password supplied.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4295.jpg?height=122&width=99&top_left_y=1119&top_left_x=404)

Note
This option cannot be used together with --decrypt-key.
- --decrypt-password-from-stdin[=TRUE|FALSE]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --decrypt-password-from-stdin \\
\hline
\end{tabular}

Decrypts a file encrypted by NDB, using a password supplied from standard input. This is similar to entering a password after invoking mysql --password with no password following the option.
- --defaults-extra-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given file after global files are read.
- --defaults-file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-file=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read default options from given file only.
- --defaults-group-suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}
- --detailed-info

\begin{tabular}{|l|l|}
\hline Command-Line Format & --encrypt-block-size=\# \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Print out file information like --info, but include the file's header and trailer.

\section*{Example:}
```
$> ndbxfrm --detailed-info S0.sysfile
File=/var/lib/cluster-data/ndb_7_fs/D1/NDBCNTR/S0.sysfile, compression=no, encryption=yes
header: {
    fixed_header: {
        magic: {
            magic: { 78, 68, 66, 88, 70, 82, 77, 49 },
            endian: 18364758544493064720,
            header_size: 32768,
            fixed_header_size: 160,
            zeros: { 0, 0 }
        },
        flags: 73728,
        flag_extended: 0,
        flag_zeros: 0,
        flag_file_checksum: 0,
        flag_data_checksum: 0,
        flag_compress: 0,
        flag_compress_method: 0,
        flag_compress_padding: 0,
        flag_encrypt: 18,
        flag_encrypt_cipher: 2,
        flag_encrypt_krm: 1,
        flag_encrypt_padding: 0,
        flag_encrypt_key_selection_mode: 0,
        dbg_writer_ndb_version: 524320,
        octets_size: 32,
        file_block_size: 32768,
        trailer_max_size: 80,
        file_checksum: { 0, 0, 0, 0 },
        data_checksum: { 0, 0, 0, 0 },
        zeros01: { 0 },
        compress_dbg_writer_header_version: { ... },
        compress_dbg_writer_library_version: { ... },
        encrypt_dbg_writer_header_version: { ... },
        encrypt_dbg_writer_library_version: { ... },
        encrypt_key_definition_iterator_count: 100000,
        encrypt_krm_keying_material_size: 32,
        encrypt_krm_keying_material_count: 1,
        encrypt_key_data_unit_size: 32768,
        encrypt_krm_keying_material_position_in_octets: 0,
    },
    octets: {
            102, 68, 56, 125, 78, 217, 110, 94, 145, 121, 203, 234, 26, 164, 137, 180,
            100, 224, 7, 88, 173, 123, 209, 110, 185, 227, 85, 174, 109, 123, 96, 156,
    }
}
trailer: {
    fixed_trailer: {
        flags: 48,
        flag_extended: 0,
        flag_zeros: 0,
        flag_file_checksum: 0,
        flag_data_checksum: 3,
        data_size: 512,
        file_checksum: { 0, 0, 0, 0 },
        data_checksum: { 226, 223, 102, 207 },
        magic: {
            zeros: { 0, 0 }
            fixed_trailer_size: 56,
```

```
            trailer_size: 32256,
            endian: 18364758544493064720,
            magic: { 78, 68, 66, 88, 70, 82, 77, 49 },
        },
    }
}
```

- --encrypt-block-size=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --encrypt-block-size=\# \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2147483647 \\
\hline
\end{tabular}

Size of input data chunks that are encrypted as a unit. Used with XTS; set to 0 (the default) for CBC mode.
- --encrypt-cipher=\#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --encrypt-cipher=\# \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2147483647 \\
\hline
\end{tabular}

Cipher used for encryption. Set to 1 for CBC mode (the default), or 2 for XTS.
- --encrypt-kdf-iter-count=\#, -k \#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --encrypt-kdf-iter-count=\# \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 2147483647 \\
\hline
\end{tabular}

When encrypting a file, specifies the number of iterations to use for the encryption key. Requires the --encrypt-password option.
- --encrypt-key=key

\begin{tabular}{|l|l|}
\hline Command-Line Format & --encrypt-key=key \\
\hline
\end{tabular}

Encrypts a file using the supplied key.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4297.jpg?height=122&width=97&top_left_y=2147&top_left_x=404)

\section*{Note}

This option cannot be used together with --encrypt-password.
- --encrypt-key-from-stdin

\begin{tabular}{|l|l|}
\hline Command-Line Format & --encrypt-key-from-stdin \\
\hline
\end{tabular}

Encrypt a file using the key supplied from stdin.
- --encrypt-password=password

\begin{tabular}{|l|l|}
\hline Command-Line Format & --encrypt-password=password \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Encrypts the backup file using the password supplied by the option. The password must meet the requirements listed here:
- Uses any of the printable ASCII characters except!, ', ", $\$, \%, \backslash$, , and $\wedge$
- Is no more than 256 characters in length
- Is enclosed by single or double quotation marks
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4298.jpg?height=124&width=99&top_left_y=815&top_left_x=338)

Note
This option cannot be used together with --encrypt-key.
- --encrypt-password-from-stdin[=TRUE|FALSE]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --encrypt-password-from-stdin \\
\hline
\end{tabular}

Encrypts a file using a password supplied from standard input. This is similar to entering a password is entered after invoking mysql --password with no password following the option.
- --help, -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Prints usage information for the program.
- --info, -i

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - info \\
\hline
\end{tabular}

Prints the following information about one or more input files:
- The name of the file
- Whether the file is compressed (compression=yes or compression=no)
- Whether the file is encrypted (encryption=yes or encryption=no)

Example:
```
$> ndbxfrm -i BACKUP-10-0.5.Data BACKUP-10.5.ctl BACKUP-10.5.log
File=BACKUP-10-0.5.Data, compression=no, encryption=yes
File=BACKUP-10.5.ctl, compression=no, encryption=yes
File=BACKUP-10.5.log, compression=no, encryption=yes
```


You can also see the file's header and trailer using the --detailed-info option.
- --login-path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login- path=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read given path from login file.
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read default options from any option file other than login file.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print program argument list and exit.
- --usage, - ?

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - usage \\
\hline
\end{tabular}

Synonym for --help.
- --version, -V

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Prints out version information.
ndbxfrm can encrypt backups created by any version of NDB Cluster. The .Data, .ctl, and . log files comprising the backup must be encrypted separately, and these files must be encrypted separately for each data node. Once encrypted, such backups can be decrypted only by ndbxfrm, ndb_restore, or ndb_print_backup.

An encrypted file can be re-encrypted with a new password using the --encrypt-password and --decrypt-password options together, like this:
```
ndbxfrm --decrypt-password=old --encrypt-password=new input_file output_file
```


In the example just shown, old and new are the old and new passwords, respectively; both of these must be quoted. The input file is decrypted and then encrypted as the output file. The input file itself is not changed; if you do not want it to be accessible using the old password, you must remove the input file manually.

\subsection*{25.6 Management of NDB Cluster}

Managing an NDB Cluster involves a number of tasks, the first of which is to configure and start NDB Cluster. This is covered in Section 25.4, "Configuration of NDB Cluster", and Section 25.5, "NDB Cluster Programs".

The next few sections cover the management of a running NDB Cluster.
For general information about security issues relating to management and deployment of an NDB Cluster, see Section 25.6.19, "NDB Cluster Security". For information about encrypted file systems and NDB, see Section 25.6.19.4, "File System Encryption for NDB Cluster". Section 25.6.19.5, "TLS Link Encryption for NDB Cluster", provides information about support for encrypted connections between nodes. NDB Cluster also supports encrypted backups which can be read by many NDB commandline programs including ndb_restore, ndbxfrm, ndb_print_backup_file, and ndb_mgm. See Section 25.6.8.2, "Using The NDB Cluster Management Client to Create a Backup", for more information.

There are essentially two methods of actively managing a running NDB Cluster. The first of these is through the use of commands entered into the management client whereby cluster status can be checked, log levels changed, backups started and stopped, and nodes stopped and started. The second method involves studying the contents of the cluster log ndb_node_id_cluster.log; this is usually found in the management server's DataDir directory, but this location can be overridden using the LogDestination option. (Recall that node_id represents the unique identifier of the node whose activity is being logged.) The cluster log contains event reports generated by ndbd. It is also possible to send cluster log entries to a Unix system log.

Some aspects of the cluster's operation can be also be monitored from an SQL node using the SHOW ENGINE NDB STATUS statement.

More detailed information about NDB Cluster operations is available in real time through an SQL interface using the ndbinfo database. For more information, see Section 25.6.15, "ndbinfo: The NDB Cluster Information Database".

NDB statistics counters provide improved monitoring using the mysql client. These counters, implemented in the NDB kernel, relate to operations performed by or affecting Ndb objects, such as starting, closing, and aborting transactions; primary key and unique key operations; table, range, and pruned scans; blocked threads waiting for various operations to complete; and data and events sent and received by NDB Cluster. The counters are incremented by the NDB kernel whenever NDB API calls are made or data is sent to or received by the data nodes.
mysqld exposes the NDB API statistics counters as system status variables, which can be identified from the prefix common to all of their names (Ndb_api_). The values of these variables can be read in the mysql client from the output of a SHOW STATUS statement, or by querying either the Performance Schema session_status or global_status table. By comparing the values of the status variables before and after the execution of an SQL statement that acts on NDB tables, you can observe the actions taken on the NDB API level that correspond to this statement, which can be beneficial for monitoring and performance tuning of NDB Cluster.

MySQL Cluster Manager provides an advanced command-line interface that simplifies many otherwise complex NDB Cluster management tasks, such as starting, stopping, or restarting an NDB Cluster with a large number of nodes. The MySQL Cluster Manager client also supports commands for getting and setting the values of most node configuration parameters as well as mysqld server options and variables relating to NDB Cluster. See MySQL Cluster Manager 8.4.9 User Manual, for more information.

\subsection*{25.6.1 Commands in the NDB Cluster Management Client}

In addition to the central configuration file, a cluster may also be controlled through a commandline interface available through the management client ndb_mgm. This is the primary administrative interface to a running cluster.

Commands for the event logs are given in Section 25.6.3, "Event Reports Generated in NDB Cluster"; commands for creating backups and restoring from them are provided in Section 25.6.8, "Online Backup of NDB Cluster".

Using ndb_mgm with MySQL Cluster Manager. MySQL Cluster Manager handles starting and stopping processes and tracks their states internally, so it is not necessary to use ndb_mgm for these tasks for an NDB Cluster that is under MySQL Cluster Manager control. It is recommended not to use the ndb_mgm command-line client that comes with the NDB Cluster distribution to perform operations that involve starting or stopping nodes. These include but are not limited to the START, STOP, RESTART, and SHUTDOWN commands. For more information, see MySQL Cluster Manager Process Commands.

The management client has the following basic commands. In the listing that follows, node_id denotes either a data node ID or the keyword ALL, which indicates that the command should be applied to all of the cluster's data nodes.
- CONNECT connection-string

Connects to the management server indicated by the connection string. If the client is already connected to this server, the client reconnects.
- CREATE NODEGROUP nodeid[, nodeid, ...]

Creates a new NDB Cluster node group and causes data nodes to join it.
This command is used after adding new data nodes online to an NDB Cluster, and causes them to join a new node group and thus to begin participating fully in the cluster. The command takes as its sole parameter a comma-separated list of node IDs-these are the IDs of the nodes just added and started, and that are to join the new node group. The list must contain no duplicate IDs; the presence of any duplicates causes the command to return an error. The number of nodes in the list must be the same as the number of nodes in each node group that is already part of the cluster (each NDB Cluster node group must have the same number of nodes). In other words, if the NDB Cluster consists of 2 node groups having 2 data nodes each, then the new node group must also have 2 data nodes.

The node group ID of the new node group created by this command is determined automatically, and always the next highest unused node group ID in the cluster; it is not possible to set it manually.

For more information, see Section 25.6.7, "Adding NDB Cluster Data Nodes Online".
- DROP NODEGROUP nodegroup_id

Drops the NDB Cluster node group with the given nodegroup_id.
This command can be used to drop a node group from an NDB Cluster. DROP NODEGROUP takes as its sole argument the node group ID of the node group to be dropped.

DROP NODEGROUP acts only to remove the data nodes in the effected node group from that node group. It does not stop data nodes, assign them to a different node group, or remove them from the cluster's configuration. A data node that does not belong to a node group is indicated in the output of the management client SHOW command with no nodegroup in place of the node group ID, like this (indicated using bold text):
id=3 @10.100.2.67 (8.4.7-ndb-8.4.7, no nodegroup)
DROP NODEGROUP works only when all data nodes in the node group to be dropped are completely empty of any table data and table definitions. Since there is currently no way using ndb_mgm or the mysql client to remove all data from a specific data node or node group, this means that the command succeeds only in the two following cases:
1. After issuing CREATE NODEGROUP in the ndb_mgm client, but before issuing any ALTER TABLE ... REORGANIZE PARTITION statements in the mysql client.
2. After dropping all NDBCLUSTER tables using DROP TABLE.

TRUNCATE TABLE does not work for this purpose because this removes only the table data; the data nodes continue to store an NDBCLUSTER table's definition until a DROP TABLE statement is issued that causes the table metadata to be dropped.

For more information about DROP NODEGROUP, see Section 25.6.7, "Adding NDB Cluster Data Nodes Online".
- ENTER SINGLE USER MODE node_id

Enters single user mode, whereby only the MySQL server identified by the node ID node_id is permitted to access the database.

The ndb_mgm client provides a clear acknowledgement that this command has been issued and has taken effect, as shown here:
```
ndb_mgm> ENTER SINGLE USER MODE 100
Single user mode entered
Access is granted for API node 100 only.
```


In addition, the API or SQL node having exclusive access when in single user mode is indicated in the output of the SHOW command, like this:
```
ndb_mgm> SHOW
Cluster Configuration
----------------------
[ndbd(NDB)] 2 node(s)
id=5 @127.0.0.1 (mysql-8.4.7 ndb-8.4.7, single user mode, Nodegroup: 0, *)
id=6 @127.0.0.1 (mysql-8.4.7 ndb-8.4.7, single user mode, Nodegroup: 0)
[ndb_mgmd(MGM)] 1 node(s)
id=50 @127.0.0.1 (mysql-8.4.7 ndb-8.4.7)
[mysqld(API)] 2 node(s)
id=100 @127.0.0.1 (mysql-8.4.7 ndb-8.4.7, allowed single user)
id=101 (not connected, accepting connect from any host)
```

- EXIT SINGLE USER MODE

Exits single user mode, enabling all SQL nodes (that is, all running mysqld processes) to access the database.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4302.jpg?height=122&width=99&top_left_y=1142&top_left_x=342)

\section*{Note}

It is possible to use EXIT SINGLE USER MODE even when not in single user mode, although the command has no effect in this case.
- HELP

Displays information on all available commands.
- node_id NODELOG DEBUG \{ON|OFF\}

Toggles debug logging in the node log, as though the effected data node or nodes had been started with the --verbose option. NODELOG DEBUG ON starts debug logging; NODELOG DEBUG OFF switches debug logging off.
- PROMPT [prompt]

Changes the prompt shown by ndb_mgm to the string literal prompt.
prompt should not be quoted (unless you want the prompt to include the quotation marks). Unlike the case with the mysql client, special character sequences and escapes are not recognized. If called without an argument, the command resets the prompt to the default value (ndb_mgm>).

Some examples are shown here:
```
ndb_mgm> PROMPT mgm#1:
mgm#1: SHOW
Cluster Configuration
...
mgm#1: PROMPT mymgm >
mymgm > PROMPT 'mymgm:'
'mymgm:' PROMPT mymgm:
mymgm: PROMPT
ndb_mgm> EXIT
$>
```


Note that leading spaces and spaces within the prompt string are not trimmed. Trailing spaces are removed.
- QUIT, EXIT

Terminates the management client.
This command does not affect any nodes connected to the cluster.
- node_id REPORT report-type

Displays a report of type report-type for the data node identified by node_id, or for all data nodes using ALL.

Currently, there are three accepted values for report-type:
- BackupStatus provides a status report on a cluster backup in progress
- MemoryUsage displays how much data memory and index memory is being used by each data node as shown in this example:
```
ndb_mgm> ALL REPORT MEMORY
Node 1: Data usage is 5%(177 32K pages of total 3200)
Node 1: Index usage is 0%(108 8K pages of total 12832)
Node 2: Data usage is 5%(177 32K pages of total 3200)
Node 2: Index usage is 0%(108 8K pages of total 12832)
```


This information is also available from the ndbinfo . memoryusage table.
- EventLog reports events from the event log buffers of one or more data nodes.
report-type is case-insensitive and "fuzzy"; for MemoryUsage, you can use MEMORY (as shown in the prior example), memory, or even simply MEM (or mem). You can abbreviate BackupStatus in a similar fashion.
- node_id RESTART [-n] [-i] [-a] [-f]

Restarts the data node identified by node_id (or all data nodes).
Using the - i option with RESTART causes the data node to perform an initial restart; that is, the node's file system is deleted and recreated. The effect is the same as that obtained from stopping the data node process and then starting it again using ndbd --initial from the system shell.

\section*{Note}

Backup files and Disk Data files are not removed when this option is used.

Using the - $n$ option causes the data node process to be restarted, but the data node is not actually brought online until the appropriate START command is issued. The effect of this option is the same as that obtained from stopping the data node and then starting it again using ndbd --nostart or ndbd - n from the system shell.

Using the - a causes all current transactions relying on this node to be aborted. No GCP check is done when the node rejoins the cluster.

Normally, RESTART fails if taking the node offline would result in an incomplete cluster. The - f option forces the node to restart without checking for this. If this option is used and the result is an incomplete cluster, the entire cluster is restarted.
- SHOW

Displays basic information about the cluster and cluster nodes. For all nodes, the output includes the node's ID, type, and NDB software version. If the node is connected, its IP address is also shown;
otherwise the output shows not connected, accepting connect from ip_address, with any host used for nodes that are permitted to connect from any address.

In addition, for data nodes, the output includes starting if the node has not yet started, and shows the node group of which the node is a member. If the data node is acting as the master node, this is indicated with an asterisk (*).

Consider a cluster whose configuration file includes the information shown here (possible additional settings are omitted for clarity):
```
[ndbd default]
DataMemory= 128G
NoOfReplicas= 2
[ndb_mgmd]
NodeId=50
HostName=198.51.100.150
[ndbd]
NodeId=5
HostName=198.51.100.10
DataDir=/var/lib/mysql-cluster
[ndbd]
NodeId=6
HostName=198.51.100.20
DataDir=/var/lib/mysql-cluster
[ndbd]
NodeId=7
HostName=198.51.100.30
DataDir=/var/lib/mysql-cluster
[ndbd]
NodeId=8
HostName=198.51.100.40
DataDir=/var/lib/mysql-cluster
[mysqld]
NodeId=100
HostName=198.51.100.100
[api]
NodeId=101
```


After this cluster (including one SQL node) has been started, SHOW displays the following output:
```
ndb_mgm> SHOW
Connected to Management Server at: localhost:1186 (using cleartext)
Cluster Configuration
-----------------------
[ndbd(NDB)] 4 node(s)
id=5 @198.51.100.10 (mysql-8.4.7 ndb-8.4.7, Nodegroup: 0, *)
id=6 @198.51.100.20 (mysql-8.4.7 ndb-8.4.7, Nodegroup: 0)
id=7 @198.51.100.30 (mysql-8.4.7 ndb-8.4.7, Nodegroup: 1)
id=8 @198.51.100.40 (mysql-8.4.7 ndb-8.4.7, Nodegroup: 1)
[ndb_mgmd(MGM)] 1 node(s)
id=50 @198.51.100.150 (mysql-8.4.7 ndb-8.4.7)
[mysqld(API)] 2 node(s)
id=100 @198.51.100.100 (mysql-8.4.7 ndb-8.4.7)
id=101 (not connected, accepting connect from any host)
```


The output from this command also indicates when the cluster is in single user mode (see the description of the ENTER SINGLE USER MODE command, as well as Section 25.6.6, "NDB Cluster Single User Mode"). It also indicates which API or SQL node has exclusive access when this mode is in effect.
- SHUTDOWN

Shuts down all cluster data nodes and management nodes. To exit the management client after this has been done, use EXIT or QUIT.

This command does not shut down any SQL nodes or API nodes that are connected to the cluster.
- node_id START

Brings online the data node identified by node_id (or all data nodes).
ALL START works on all data nodes only, and does not affect management nodes.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4305.jpg?height=119&width=108&top_left_y=715&top_left_x=397)

\section*{Important}

To use this command to bring a data node online, the data node must have been started using --nostart or -n.

\section*{- node_id STATUS}

Displays status information for the data node identified by node_id (or for all data nodes).
Possible node status values include UNKNOWN, NO_CONTACT, NOT_STARTED, STARTING, STARTED, SHUTTING_DOWN, and RESTARTING.

The output from this command also indicates when the cluster is in single user mode.
- node_id STOP [-a] [-f]

Stops the data or management node identified by node_id.

\section*{Note}

ALL STOP works to stop all data nodes only, and does not affect management nodes.

A node affected by this command disconnects from the cluster, and its associated ndbd or ndb_mgmd process terminates.

The - a option causes the node to be stopped immediately, without waiting for the completion of any pending transactions.

Normally, STOP fails if the result would cause an incomplete cluster. The - $f$ option forces the node to shut down without checking for this. If this option is used and the result is an incomplete cluster, the cluster immediately shuts down.

\section*{Warning}

Use of the - a option also disables the safety check otherwise performed when STOP is invoked to insure that stopping the node does not cause an incomplete cluster. In other words, you should exercise extreme care when using the - a option with the STOP command, due to the fact that this option makes it possible for the cluster to undergo a forced shutdown because it no longer has a complete copy of all data stored in NDB.
- TLS INFO

Displays cluster TLS information such as whether the current connection is using TLS, TLS certificates currently known to the management node, and the management node's counts of total connections, connections upgraded to TLS, and authorization failures. Sample output is shown here:
```
ndb_mgm> TLS INFO
```

```
Session ID: 1
Peer address: 127.0.0.1
Certificate name: NDB Management Node Jun 2023
Certificate serial: B5:23:8F:D1:11:85:E5:93:ED
Certificate expires: 23-Nov-2023
Server statistics since restart
Total accepted connections: 6
Total connections upgraded to TLS: 2
Current connections: 3
Current connections using TLS: 2
Authorization failures: 0
ndb_mgm>
```


For more information, see Section 25.6.19.5, "TLS Link Encryption for NDB Cluster".
Additional commands. A number of other commands available in the ndb_mgm client are described elsewhere, as shown in the following list:
- START BACKUP is used to perform an online backup in the ndb_mgm client; the ABORT BACKUP command is used to cancel a backup already in progress. For more information, see Section 25.6.8, "Online Backup of NDB Cluster".
- The CLUSTERLOG command is used to perform various logging functions. See Section 25.6.3, "Event Reports Generated in NDB Cluster", for more information and examples. NODELOG DEBUG activates or deactivates debug printouts in node logs, as described previously in this section.
- For testing and diagnostics work, the client supports a DUMP command which can be used to execute internal commands on the cluster. It should never be used in a production setting unless directed to do so by MySQL Support. For more information, see NDB Cluster Management Client DUMP Commands.

\subsection*{25.6.2 NDB Cluster Log Messages}

This section contains information about the messages written to the cluster log in response to different cluster log events. It provides additional, more specific information on NDB transporter errors.

\subsection*{25.6.2.1 NDB Cluster: Messages in the Cluster Log}

The following table lists the most common NDB cluster log messages. For information about the cluster log, log events, and event types, see Section 25.6.3, "Event Reports Generated in NDB Cluster". These log messages also correspond to log event types in the MGM API; see The Ndb_logevent_type Type, for related information of interest to Cluster API developers.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.25 Common NDB cluster log messages}
\begin{tabular}{|l|l|l|l|l|l|}
\hline Log Message & Description & Event Name & Event Type & Priority & Severity \\
\hline Node mgm_node_id: Node data_node_id Connected & The data node having node ID node_id has connected to the management server (node mgm_node_id). & Connected & Connection & 8 & INFO \\
\hline Node mgm_node_id: Node data_node_id Disconnected & The data node having node ID data_node_id has disconnected from the management & Disconnected & Connection & 8 & ALERT \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Log Message & Description & Event Name & Event Type & Priority & Severity \\
\hline & server (node mgm_node_id). & & & & \\
\hline Node data_node_id Communicatio to Node api_node_id closed & The API node or SQL node having node ID api_node_id is no longer communicating with data node data_node_id. & Communicatio & ncdrorsectt ion & 8 & INFO \\
\hline Node data_node_id Communicatio to Node api_node_id opened & The API node or SQL node having node ID api_node_id is now communicating with data node data_node_id. & Communicatio & соргетесстt ion & 8 & INFO \\
\hline Node mgm_node_id: Node api_node_id: API version & The API node having node ID api_node_id has connected to management node mgm_node_id using NDB API version version (generally the same as the MySQL version number). & ConnectedApi & Meonsiemt ion & 8 & INFO \\
\hline Node node_id: Global checkpoint gci started & A global checkpoint with the ID gci has been started; node node_id is the master responsible for this global checkpoint. & GlobalCheckppo & poimeZStprotiætd & 9 & INFO \\
\hline Node node_id: Global checkpoint gci completed & The global checkpoint having the ID gci has been completed; node node_id was the master responsible for this global checkpoint. & GlobalCheckpp & poim\&Clopmpirett. ed. & 10 & INFO \\
\hline Node node_id: Local & The local checkpoint having & LocalCheckpo & iChtesctlaptcierat & 7 & INFO \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Log Message & Description & Event Name & Event Type & Priority & Severity \\
\hline checkpoint lcp started. Keep GCI = current_gci oldest restorable GCI = old_gci & sequence ID lcp has been started on node node_id. The most recent GCI that can be used has the index current_gci, and the oldest GCI from which the cluster can be restored has the index old_gci. & & & & \\
\hline Node node_id: Local checkpoint lcp completed & The local checkpoint having sequence ID lcp on node node_id has been completed. & LocalCheckpoi@tceolnpderted & & 8 & INFO \\
\hline Node node_id: Local Checkpoint stopped in CALCULATED_K & The node was unable to determine the most recent usable GCI. EEP_GCI & LCPStopped Incalæcke (concti & & 0 & ALERT \\
\hline Node node_id: Table ID = table_id, fragment ID = fragment_id has completed LCP on Node node_id maxGciStarte started_gci maxGciComple completed_gc & A table fragment has been checkpointed to disk on node node_id. The GCI in progress has the index started_gci, and the most recent GCI to have been completed tras: the index icompleted_gci. & \multicolumn{2}{|l|}{LCPF ragment Codpdeltredint} & 11 & INFO \\
\hline Node node_id: ACC Blocked num_1 and TUP Blocked num_2 times last second & Undo logging is blocked because the log buffer is close to overflowing. & \multicolumn{2}{|l|}{UndoLogBlockecheckpoint} & 7 & INFO \\
\hline Node node_id: Start & Data node node_id, running & NDBStartStar & tetdartUp & 1 & INFO \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Log Message & Description & Event Name & Event Type & Priority & Severity \\
\hline initiated version & NDB version version, is beginning its startup process. & & & & \\
\hline Node node_id: Started version & Data node node_id, running NDB version version, has started successfully. & NDBStartComp & setætdtUp & 1 & INFO \\
\hline Node node_id: STTORRY received after restart finished & The node has received a signal indicating that a cluster restart has completed. & STTORRYRecie & Stdar tup & 15 & INFO \\
\hline Node node_id: Start phase phase completed (type) & The node has completed start phase phase of a type start. For a listing of start phases, see Section 25.6.4, "Summary of NDB Cluster Start Phases". (type is one of initial, system, node, initial node, or <Unknown>.) & StartPhaseCo & stlærtedp & 4 & INFO \\
\hline Node node_id: CM_REGCONF president = president_id own Node = own_id, our dynamic id = dynamic_id & Node president_id has been selected as "president". own_id and dynamic_id should always be the same as the ID (node_id) of the reporting node. & CM_REGCONF & StartUp & 3 & INFO \\
\hline Node node_id: CM_REGREF from Node president_id to our Node & The reporting node (ID node_id) was unable to accept node president_id & CM_REGREF & StartUp & 8 & INFO \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Log Message & Description & Event Name & Event Type & Priority & Severity \\
\hline node_id. Cause = cause & \begin{tabular}{l}
as president. \\
The cause of the problem is given as one of Busy, Election with wait = false, Not president, Election without selecting new candidate, or No such cause.
\end{tabular} & & & & \\
\hline Node node_id: We are Node own_id with dynamic ID dynamic_id, our left neighbor is Node id_1, our right is Node id_2 & The node has discovered its neighboring nodes in the cluster (node id_1 and node id_2). node_id, own_id, and dynamic_id should always be the same; if they are not, this indicates a serious misconfiguration of the cluster nodes. & FIND_NEIGHBOUBISartUp & & 8 & INFO \\
\hline Node node_id: type shutdown initiated & The node has received a shutdown signal. The type of shutdown is either Cluster or Node. & NDBStopStart & esttartup & 1 & INFO \\
\hline Node node_id: Node shutdown completed [, action] [Initiated by signal signal.] & The node has been shut down. This report may include an action, which if present is one of restarting, no start, or initial. The report may also include a & NDBStopComple & estealr tup & 1 & INFO \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Log Message & Description & Event Name & Event Type & Priority & Severity \\
\hline & reference to an NDB Protocol signal; for possible signals, refer to Operations and Signals. & & & & \\
\hline Node node_id: Forced node shutdown completed [, action]. [Occurred during startphase start_phase. [ Initiated by signal.] [Caused by error error_code: 'error_messa error_status [(extra info extra_code)]] & The node has been forcibly shut down. The action (one of restarting, no start, or initial) subsequently being taken, if any, is also reported. If the shutdown occurred while the node was starting, théerepont_clas includes the start_phase during which the node failed. If this was a result of a signal sent to the node, this information is also provided (see Operations and Signals, for more information). If the error causing the failure is known, this is also included; for more information about NDB error messages and classifications, see NDB Cluster API Errors. & NDBStopForce & StartUp & 1 & ALERT \\
\hline Node node_id: Node shutdown aborted & The node shutdown process was aborted by the user. & NDBStopAbort & estrartup & 1 & INFO \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Log Message & Description & Event Name & Event Type & Priority & Severity \\
\hline Node node_id: StartLog: [GCI Keep: keep_pos LastComplete last_pos NewestRestor restore_pos] & This reports global checkpoints referenced during a node start. The redo log prior to abdepa_pos is dropped. last_pos is the last global checkpoint in which data node the participated; restore_pos is the global checkpoint which is actually used to restore all data nodes. & StartREDOLog & StartUp & 4 & INFO \\
\hline startup_mess [Listed separately; see below.] & głere are a number of possible startup messages that can be logged under different circumstances. These are listed separately; see Section 25.6.2.2 "NDB Cluster Log Startup Messages". & StartReport & StartUp & 4 & INFO \\
\hline Node node_id: Node restart completed copy of dictionary information & Copying of data dictionary information to the restarted node has been completed. & NR_CopyDict & NodeRestart & 8 & INFO \\
\hline Node node_id: Node restart completed copy of distribution information & Copying of data distribution information to the restarted node has been completed. & NR_CopyDistr & NodeRestart & 8 & INFO \\
\hline Node node_id: Node restart & Copy of fragments to starting data & NR_CopyFrags & SItcadterelstart & 8 & INFO \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Log Message & Description & Event Name & Event Type & Priority & Severity \\
\hline starting to copy the fragments to Node node_id & node node_id has begun & & & & \\
\hline Node node_id: Table ID = table_id, fragment ID = fragment_id have been copied to Node node_id & Fragment fragment_id from table table_id has been copied to data node node_id & NR_CopyFragD & DNwdeRestart & 10 & INFO \\
\hline Node node_id: Node restart completed copying the fragments to Node node_id & Copying of all table fragments to restarting data node node_id has been completed & NR_CopyFrags & anompdrectar : & 8 & INFO \\
\hline Node node_id: Node node1_id completed failure of Node node2_id & Data node node1_id has detected the failure of data node node2_id & NodeFailComp & IMctcestart & 8 & ALERT \\
\hline All nodes completed failure of Node node_id & All (remaining) data nodes have detected the failure of data node node_id & NodeFailComp & IMctcestart & 8 & ALERT \\
\hline Node failure of node_idblock completed & The failure of data node node_id has been detected in the blockNDB kernel block, where block is 1 of DBTC, DBDICT, DBDIH, or DBLQH; for more information, see & NodeFailComp & I'ctce Restart & 8 & ALERT \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Log Message & Description & Event Name & Event Type & Priority & Severity \\
\hline & NDB Kernel Blocks & & & & \\
\hline Node mgm_node_id: Node data_node_id has failed. The Node state at failure was state_code & A data node has failed. Its state at the time of failure is described by an arbitration state code state_code: possible state code values can be found in the file include/ kernel/ signaldata/ ArbitSignalDa & NODE_FAILREP & NodeRestart & 8 & ALERT \\
\hline President restarts arbitration thread [state=state] or Prepare arbitrator node node_id [ticket=tick or Receive arbitrator node node_id [ticket=ticke or Started arbitrator node node_id [ticket=ticke or Lost arbitrator node node_id - process failure [state=state] or Lost arbitrator node node_id - process exit [state=state] or Lost arbitrator node node_id - & This is a report on the current state and progress of arbitcation in the cluster. node_id is the node ID of the management atodædgr SQL node selected as the arbitrator. state_code is andalrbitration state code, as found in include/ kernel/ stiginaldata/ ArbitSignalD When an error has occurred, an error_message, also defined in Arodiet]SignalData.hpp, is provided. ticket_id is a unique identifier handed out by the arbitrator where it is selected to all the nodes that participated in its selection; & ArbitState & NodeRestart & 6 & INFO \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Log Message & Description & Event Name & Event Type & Priority & Severity \\
\hline error_messag [state=state & this is used to enssure that each node requesting arbitration was one of the nodes that took part in the selection process. & & & & \\
\hline Arbitration check lost - less than 1/2 nodes left or Arbitration check won - all node groups and more than 1/2 nodes left or Arbitration check won node group majority or Arbitration check lost - missing node group or Network partitioning arbitration required or Arbitration won positive reply from node node_id or Arbitration lost negative reply from node node_id or Network partitioning - no arbitrator available or Network partitioning - no arbitrator & This message reports on the result of arbitration. In the event of arbitration failure, an error_message and an arbitration state_code are provided; definitions for both of these are found in include/ kernel/ signaldata/ ArbitSignalData.hpp. & ArbitResult & NodeRestart & 2 & ALERT \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Log Message & Description & Event Name & Event Type & Priority & Severity \\
\hline configured or Arbitration failure error_message [state=state] & code] & & & & \\
\hline Node node_id: GCP Take over started & This node is attempting to assume responsibility for the next global checkpoint (that is, it is becoming the master node) & GCP_Takeover Stcadtealstart & & 7 & INFO \\
\hline Node node_id: GCP Take over completed & This node has become the master, and has assumed responsibility for the next global checkpoint & GCP_Takeover Commbdrecetart & & 7 & INFO \\
\hline Node node_id: LCP Take over started & This node is attempting to assume responsibility for the next set of local checkpoints (that is, it is becoming the master node) & LCP_Takeover Stcadterelstart & & 7 & INFO \\
\hline Node node_id: LCP Take over completed & This node has become the master, and has assumed responsibility for the next set of local checkpoints & LCP_Takeover & Admpal Recetciar t & 7 & INFO \\
\hline Node node_id: Trans. Count = transactions Commit Count = commits, Read Count = reads, Simple Read Count = simple_reads, & This report of transaction activity is given approximately once every 10 seconds & TransReportCo & Stnateisst ic & 8 & INFO \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Log Message & Description & Event Name & Event Type & Priority & Severity \\
\hline Write Count = writes, AttrInfo Count = AttrInfo_objects, Concurrent Operations = concurrent_operations, Abort Count = aborts, Scans = scans, Range scans = range_scans & & & & & \\
\hline Node node_id: Operations=o & Number of operations rerformæds by this node, provided approximately once every 10 seconds & OperationRep & p8t\&toisttter s & 8 & INFO \\
\hline Node node_id: Table with ID = table_id created & A table having the table ID shown has been created & TableCreated & Statistic & 7 & INFO \\
\hline Node node_id: Mean loop Counter in doJob last 8192 times = count & & JobStatistic & Statistic & 9 & INFO \\
\hline Mean send size to Node = node_id last 4096 sends = bytes bytes & This node is sending an average of bytes bytes per send to node node_id & SendBytesSta & -Ststticstic & 9 & INFO \\
\hline Mean receive size to Node = node_id last 4096 sends = bytes bytes & This node is receiving an average of bytes of data each time it receives data from node node_id & ReceiveBytes & sstattissticc & 9 & INFO \\
\hline Node node_id: & This report is generated & MemoryUsage & Statistic & 5 & INFO \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Log Message & Description & Event Name & Event Type & Priority & Severity \\
\hline Data usage is data_memory (data_pages 32K pages of total data_pages_t / Node node_id: Index usage is index_memory (index_pages 8K pages of total index_pages_ & \begin{tabular}{l}
when a DUMP 1000 command is issuedage\% the ccluster management client tal) \\
percentage\% used \\
total)
\end{tabular} & & & & \\
\hline Node node1_id: Transporter to node node2_id reported error error_code: error_messag & A transporter error occurred while communicating with node node2_id; for a listing of transporter error codes and messages, see NDB Transporter Errors, in MySQL NDB Cluster Internals Manual & TransporterE & Fromor & 2 & ERROR \\
\hline Node node1_id: Transporter to node node2_id reported error error_code: error_messag & A warning of a potential transporter problem while communicating with node node2_id; for a listing of transporter error codes and messages, see NDB Transporter Errors, for more information & TransporterWaFınnimig & & 8 & WARNING \\
\hline Node node1_id: Node node2_id missed heartbeat heartbeat_id & This node missed a heartbeat from node node2_id & MissedHeartb & & 8 & WARNING \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Log Message & Description & Event Name & Event Type & Priority & Severity \\
\hline Node node1_id: Node node2_id declared dead due to missed heartbeat & This node has missed at least 3 heartbeats from node node2_id, and so has declared that node "dead" & DeadDueToHea & 目breaut & 8 & ALERT \\
\hline Node node1_id: Node Sent Heartbeat to node = node2_id & This node has sent a heartbeat to node node2_id & SentHeartbea & Info & 12 & INFO \\
\hline Node node_id: Event buffer status (object_id): used=bytes_u (percent_use of alloc) alloc=bytes max=bytes_av latest_consu latest_buffe report_reaso & This report is seen during heavy event buffer usage, for example, when many capdates are being applied in a relatively qshlortplatical aoftinoe; the & EventBufferS & - 五ttices 2 & 7 & INFO \\
\hline Node node_id: Entering single user mode, Node node_id: Entered single user mode Node API_node_id & These reports are written to the cluster log when entering and exiting single user mode; API_node_id is the node ID of the API or & SingleUser & Info & 7 & INFO \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Log Message & Description & Event Name & Event Type & Priority & Severity \\
\hline has exclusive access, Node node_id: Entering single user mode & SQL having exclusive access to the cluster (for more information, see Section 25.6.6, "NDB Cluster Single User Mode"); the message Unknown single user report API_node_id indicates an error has taken place and should never be seen in normal operation & & & & \\
\hline Node node_id: Backup backup_id started from node mgm_node_id & A backup has been started using the management node having mgm_node_id; this message is also displayed in the cluster management client when the START BACKUP command is issued; for more information, see Section 25.6.8.2 "Using The NDB Cluster Management Client to Create a Backup" & BackupStartedBackup & & 7 & INFO \\
\hline Node node_id: Backup backup_id started from node mgm_node_id completed. StartGCP: start_gcp StopGCP: stop_gcp \#Records: & The backup having the ID backup_id has been completed; for more information, see Section 25.6.8.2. "Using The NDB Cluster Management Client to Create a Backup" & BackupComple & toralckup & 7 & INFO \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Log Message & Description & Event Name & Event Type & Priority & Severity \\
\hline records \#LogRecords: log_records Data: data_bytes bytes Log: log_bytes bytes & & & & & \\
\hline Node node_id: Backup request from mgm_node_id failed to start. Error: error_code & The backup failed to start; for error codes, see MGM API Errors & BackupFailed & HB) Stleunt & 7 & ALERT \\
\hline Node node_id: Backup backup_id started from mgm_node_id has been aborted. Error: error_code & The backup was terminated after starting, possibly due to user intervention & BackupAborte & DBackup & 7 & ALERT \\
\hline
\end{tabular}

\subsection*{25.6.2.2 NDB Cluster Log Startup Messages}

Possible startup messages with descriptions are provided in the following list:
- Initial start, waiting for \%s to connect, nodes [ all: \%s connected: \%s no-wait: \%s ]
- Waiting until nodes: \%s connects, nodes [ all: \%s connected: \%s no-wait: \%s ]
- Waiting \%u sec for nodes \%s to connect, nodes [ all: \%s connected: \%s nowait: \%s ]
- Waiting for non partitioned start, nodes [ all: \%s connected: \%s missing: \%s no-wait: \%s ]
- Waiting \%u sec for non partitioned start, nodes [ all: \%s connected: \%s missing: \%s no-wait: \%s ]
- Initial start with nodes \%s [ missing: \%s no-wait: \%s ]
- Start with all nodes \%s
- Start with nodes \%s [ missing: \%s no-wait: \%s ]
- Start potentially partitioned with nodes \%s [ missing: \%s no-wait: \%s ]
- Unknown startreport: 0x\%x [ \%s \%s \%s \%s ]

\subsection*{25.6.2.3 Event Buffer Reporting in the Cluster Log}

NDB uses one or more memory buffers for events received from the data nodes. There is one such buffer for each Ndb object subscribing to table events, which means that there are usually two buffers for each mysqld performing binary logging (one buffer for schema events, and one for data events). Each buffer contains epochs made up of events. These events consist of operation types (insert, update, delete) and row data (before and after images plus metadata).

NDB generates messages in the cluster log to describe the state of these buffers. Although these reports appear in the cluster log, they refer to buffers on API nodes (unlike most other cluster log messages, which are generated by data nodes).

Event buffer logging reports in the cluster log use the format shown here:
```
Node node_id: Event buffer status (object_id):
used=bytes_used (percent_used% of alloc)
alloc=bytes_allocated (percent_alloc% of max) max=bytes_available
latest_consumed_epoch=latest_consumed_epoch
latest_buffered_epoch=latest_buffered_epoch
report_reason=report_reason
```


The fields making up this report are listed here, with descriptions:
- node_id: ID of the node where the report originated.
- object_id: ID of the Ndb object where the report originated.
- bytes_used: Number of bytes used by the buffer.
- percent_used: Percentage of allocated bytes used.
- bytes_allocated: Number of bytes allocated to this buffer.
- percent_alloc: Percentage of available bytes used; not printed if ndb_eventbuffer_max_alloc is equal to 0 (unlimited).
- bytes_available: Number of bytes available; this is 0 if ndb_eventbuffer_max_alloc is 0 (unlimited).
- latest_consumed_epoch: The epoch most recently consumed to completion. (In NDB API applications, this is done by calling nextEvent ( ).)
- latest_buffered_epoch: The epoch most recently buffered (completely) in the event buffer.
- report_reason: The reason for making the report. Possible reasons are shown later in this section.

Possible reasons for reporting are described in the following list:
- ENOUGH_FREE_EVENTBUFFER: The event buffer has sufficient space.

LOW_FREE_EVENTBUFFER: The event buffer is running low on free space.
The threshold free percentage level triggering these reports can be adjusted by setting the ndb_report_thresh_binlog_mem_usage server variable.
- BUFFERED_EPOCHS_OVER_THRESHOLD: Whether the number of buffered epochs has exceeded the configured threshold. This number is the difference between the latest epoch that has been received in its entirety and the epoch that has most recently been consumed (in NDB API applications, this is done by calling nextEvent() or nextEvent2( )). The report is generated every second until the number of buffered epochs goes below the threshold, which can be adjusted by setting the ndb_report_thresh_binlog_epoch_slip server variable. You can also adjust the threshold in NDB API applications by calling setEventBufferQueueEmptyEpoch().
- PARTIALLY_DISCARDING: Event buffer memory is exhausted-that is, $100 \%$ of ndb_eventbuffer_max_alloc has been used. Any partially buffered epoch is buffered to completion even is usage exceeds $100 \%$, but any new epochs received are discarded. This means that a gap has occurred in the event stream.
- COMPLETELY_DISCARDING: No epochs are buffered.
- PARTIALLY_BUFFERING: The buffer free percentage following the gap has risen to the threshold, which can be set in the mysql client using the ndb_eventbuffer_free_percent server system variable or in NDB API applications by calling set_eventbuffer_free_percent ( ). New epochs are buffered. Epochs that could not be completed due to the gap are discarded.
- COMPLETELY_BUFFERING: All epochs received are being buffered, which means that there is sufficient event buffer memory. The gap in the event stream has been closed.

\subsection*{25.6.2.4 NDB Cluster: NDB Transporter Errors}

This section lists error codes, names, and messages that are written to the cluster log in the event of transporter errors.

\begin{tabular}{|l|l|}
\hline 0x00 & TE_NO_ERROR \\
\hline & No error \\
\hline 0x01 & TE_ERROR_CLOSING_SOCKET \\
\hline & Error found during closing of socket \\
\hline 0x02 & TE_ERROR_IN_SELECT_BEFORE_ACCEPT \\
\hline & Error found before accept. The transporter will retry \\
\hline 0x03 & TE_INVALID_MESSAGE_LENGTH \\
\hline & Error found in message (invalid message length) \\
\hline 0x04 & TE_INVALID_CHECKSUM \\
\hline & Error found in message (checksum) \\
\hline 0x05 & TE_COULD_NOT_CREATE_SOCKET \\
\hline & Error found while creating socket(can't create socket) \\
\hline 0x06 & TE_COULD_NOT_BIND_SOCKET \\
\hline & Error found while binding server socket \\
\hline 0x07 & TE_LISTEN_FAILED \\
\hline & Error found while listening to server socket \\
\hline 0x08 & TE_ACCEPT_RETURN_ERROR \\
\hline & Error found during accept(accept return error) \\
\hline 0x0b & TE_SHM_DISCONNECT \\
\hline & The remote node has disconnected \\
\hline 0x0c & TE_SHM_IPC_STAT \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline & Unable to check shm segment \\
\hline 0x0d & TE_SHM_UNABLE_TO_CREATE_SEGMENT \\
\hline \multirow{3}{*}{0x0e} & Unable to create shm segment \\
\hline & TE_SHM_UNABLE_TO_ATTACH_SEGMENT \\
\hline & Unable to attach shm segment \\
\hline \multirow[t]{2}{*}{0x0f} & TE_SHM_UNABLE_TO_REMOVE_SEGMENT \\
\hline & Unable to remove shm segment \\
\hline \multirow[t]{2}{*}{$0 \times 10$} & TE_TOO_SMALL_SIGID \\
\hline & Sig ID too small \\
\hline \multirow[t]{2}{*}{$0 \times 11$} & TE_TOO_LARGE_SIGID \\
\hline & Sig ID too large \\
\hline \multirow[t]{2}{*}{$0 \times 12$} & TE_WAIT_STACK_FULL \\
\hline & Wait stack was full \\
\hline \multirow[t]{2}{*}{$0 \times 13$} & TE_RECEIVE_BUFFER_FULL \\
\hline & Receive buffer was full \\
\hline \multirow[t]{2}{*}{$0 \times 14$} & TE_SIGNAL_LOST_SEND_BUFFER_FULL \\
\hline & Send buffer was full,and trying to force send fails \\
\hline \multirow[t]{2}{*}{$0 \times 15$} & TE_SIGNAL_LOST \\
\hline & Send failed for unknown reason(signal lost) \\
\hline \multirow[t]{2}{*}{$0 \times 16$} & TE_SEND_BUFFER_FULL \\
\hline & The send buffer was full, but sleeping for a while solved \\
\hline \multirow[t]{2}{*}{$0 \times 21$} & TE_SHM_IPC_PERMANENT \\
\hline & Shm ipc Permanent error \\
\hline
\end{tabular}

\section*{Note}

Transporter error codes 0x17 through 0x20 and 0x22 are reserved for SCI connections, which are not supported in this version of NDB Cluster, and so are not included here.

\subsection*{25.6.3 Event Reports Generated in NDB Cluster}

In this section, we discuss the types of event logs provided by NDB Cluster, and the types of events that are logged.

NDB Cluster provides two types of event log:
- The cluster log, which includes events generated by all cluster nodes. The cluster log is the log recommended for most uses because it provides logging information for an entire cluster in a single location.

By default, the cluster log is saved to a file named ndb_node_id_cluster.log, (where node_id is the node ID of the management server) in the management server's DataDir.

Cluster logging information can also be sent to stdout or a syslog facility in addition to or instead of being saved to a file, as determined by the values set for the DataDir and LogDestination configuration parameters. See Section 25.4.3.5, "Defining an NDB Cluster Management Server", for more information about these parameters.
- Node logs are local to each node.

Output generated by node event logging is written to the file ndb_node_id_out.log (where node_id is the node's node ID) in the node's DataDir. Node event logs are generated for both management nodes and data nodes.

Node logs are intended to be used only during application development, or for debugging application code.

Each reportable event can be distinguished according to three different criteria:
- Category: This can be any one of the following values: STARTUP, SHUTDOWN, STATISTICS, CHECKPOINT, NODERESTART, CONNECTION, ERROR, or INFO.
- Priority: This is represented by one of the numbers from 0 to 15 inclusive, where 0 indicates "most important" and 15 "least important."
- Severity Level: This can be any one of the following values: ON, DEBUG, INFO, WARNING, ERROR, CRITICAL, ALERT, or ALL. (This is also sometimes referred to as the log level.)

The cluster log can be filtered on these properties using the NDB management client CLUSTERLOG command. This command affects the cluster log only, and has no effect on the node logs; debug logging in one or more node logs can be turned on and off using the ndb_mgm NODELOG DEBUG command.

The format used in a log message generated by NDB Cluster is as shown here:
```
timestamp [node_type] level -- Node node_id: message
```


Each line in the log, or log message, contains the following information:
- A timestamp in $Y Y Y Y$-MM-DD HH:MM:SS format. The timestamp value currently resolves to whole seconds only; fractional seconds are not supported.
- The node_type, or type of node or application which is performing the logging. In the cluster log, this is always [MgmSrvr]; in the data node log, it is always [ndbd]. [NdbApi] and other values are possible in logs generated by NDB API applications and tools.
- The level of the event, sometimes also referred to as its severity level or log level. See earlier in this section, as well as Section 25.6.3.1, "NDB Cluster Logging Management Commands", for more information about severity levels.
- The ID of the node reporting the event (node_id).
- A message containing a description of the event. The most common types of events to appear in the log are connections and disconnections between different nodes in the cluster, and when checkpoints occur. In some cases, the description may contain status or other information.

A sample from an actual cluster log is shown here:
```
2021-06-10 10:01:07 [MgmtSrvr] INFO -- Node 5: Start phase 5 completed (system restart)
2021-06-10 10:01:07 [MgmtSrvr] INFO -- Node 6: Start phase 5 completed (system restart)
2021-06-10 10:01:07 [MgmtSrvr] INFO -- Node 5: Start phase 6 completed (system restart)
```


\begin{tabular}{|l|l|l|l|l|l|l|l|}
\hline 2021-06-10 & 10:01:07 & [MgmtSrvr] & INFO & -- Node & & 6: Start phase 6 completed (system restart) & \\
\hline 2021-06-10 & 10:01:07 & [MgmtSrvr] & INFO & -- Node & & & 5: President restarts arbitration thread [state=1] \\
\hline 2021-06-10 & 10:01:07 & [MgmtSrvr] & INFO & - - Node & & 5: Start phase 7 completed (system restart) & \\
\hline 2021-06-10 & 10:01:07 & [MgmtSrvr] & INFO & -- Node & & 6: Start phase 7 completed & (system restart) \\
\hline 2021-06-10 & 10:01:07 & [MgmtSrvr] & INFO & -- Node & 5: Start & phase 8 completed & (system restart) \\
\hline 2021-06-10 & 10:01:07 & [MgmtSrvr] & INFO & - - Node & 6: Start & phase 8 completed & (system restart) \\
\hline 2021-06-10 & 10:01:07 & [MgmtSrvr] & INFO & - - Node & 5: Start & phase 9 completed & (system restart) \\
\hline 2021-06-10 & 10:01:07 & [MgmtSrvr] & INFO & - - Node & 6: Start & phase 9 completed & (system restart) \\
\hline 2021-06-10 & 10:01:07 & [MgmtSrvr] & INFO & - - Node & 5: Start & phase & (system restart) \\
\hline 2021-06-10 & 10:01:07 & [MgmtSrvr] & INFO & - - Node & 6: Start & phase & 50 completed \\
\hline 2021-06-10 & 10:01:07 & [MgmtSrvr] & INFO & -- Node & 5: Start phase & 101 completed & (system restart) \\
\hline 2021-06-10 & 10:01:07 & [MgmtSrvr] & INFO & -- Node & 6: Start phase & 101 completed & (system restart) \\
\hline 2021-06-10 & 10:01:07 & [MgmtSrvr] & INFO & -- Node & & 5: Started (mysql-8.4.7 ndb-8.4.7) & \\
\hline 2021-06-10 & 10:01:07 & [MgmtSrvr] & INFO & -- Node & 6: Started & (mysql-8.4.7 ndb-8.4.7) & \\
\hline 2021-06-10 & 10:01:07 & [MgmtSrvr] & INFO & -- Node & 5: Node & 50: API mysql-8.4.7 & ndb - 8.4.7 \\
\hline 2021-06-10 & 10:01:07 & [MgmtSrvr] & INFO & -- Node & 6: Node & 50: & API mysql-8.4.7 \\
\hline 2021-06-10 & 10:01:08 & [MgmtSrvr] & INFO & -- Node & & 6: Prepare arbitrator node & 50 \\
\hline 2021-06-10 & 10:01:08 & [MgmtSrvr] & INFO & -- Node & & 5: Started arbitrator node & 50 \\
\hline 2021-06-10 & 10:01:08 & [MgmtSrvr] & INFO & - - Node & & 6: Communication to Node & 100 \\
\hline 2021-06-10 & 10:01:08 & [MgmtSrvr] & INFO & -- Node & & 6: Communication to Node & 101 \\
\hline 2021-06-10 & 10:01:08 & [MgmtSrvr] & INFO & -- Node & & 5: Communication to Node & 100 \\
\hline 2021-06-10 & 10:01:08 & [MgmtSrvr] & INFO & -- Node & 5: & Communication to Node 101 opened & \\
\hline 2021-06-10 & 10:01:36 & [MgmtSrvr] & INFO & -- Alloc & & node id 100 succeeded & \\
\hline 2021-06-10 & 10:01:36 & [MgmtSrvr] & INFO & -- Nodeid & \multicolumn{3}{|c|}{100 allocated for API at 127.0.0.1} \\
\hline 2021-06-10 & 10:01:36 & [MgmtSrvr] & INFO & -- Node & 100: mysqld & \multicolumn{2}{|c|}{--server-id=1} \\
\hline 2021-06-10 & 10:01:36 & [MgmtSrvr] & INFO & -- Node & 5: Node 100 & Connected & \\
\hline 2021-06-10 & 10:01:36 & [MgmtSrvr] & INFO & -- Node & 6: & 100 & \\
\hline 2021-06-10 & 10:01:36 & [MgmtSrvr] & INFO & -- Node & 5: & 100: & mysql-8.4.7 ndb-8.4.7 \\
\hline 2021-06-10 & 10:01:36 & [MgmtSrvr] & INFO & -- Node & 6: & 100: & mysql-8.4.7 \\
\hline
\end{tabular}

For additional information, see Section 25.6.3.2, "NDB Cluster Log Events".

\subsection*{25.6.3.1 NDB Cluster Logging Management Commands}
ndb_mgm supports a number of management commands related to the cluster log and node logs. In the listing that follows, node_id denotes either a storage node ID or the keyword ALL, which indicates that the command should be applied to all of the cluster's data nodes.
- CLUSTERLOG ON

Turns the cluster log on.
- CLUSTERLOG OFF

Turns the cluster log off.
- CLUSTERLOG INFO

Provides information about cluster log settings.
- node_id CLUSTERLOG category=threshold

Logs category events with priority less than or equal to threshold in the cluster log.
- CLUSTERLOG TOGGLE severity_level

Toggles cluster logging of events of the specified severity_level.
The following table describes the default setting (for all data nodes) of the cluster log category threshold. If an event has a priority with a value lower than or equal to the priority threshold, it is reported in the cluster log.

Note
Events are reported per data node, and that the threshold can be set to different values on different nodes.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.26 Cluster log categories, with default threshold setting}
\begin{tabular}{|l|l|}
\hline Category & Default threshold (All data nodes) \\
\hline STARTUP & 7 \\
\hline SHUTDOWN & 7 \\
\hline STATISTICS & 7 \\
\hline CHECKPOINT & 7 \\
\hline NODERESTART & 7 \\
\hline CONNECTION & 8 \\
\hline ERROR & 15 \\
\hline INFO & 7 \\
\hline BACKUP & 15 \\
\hline CONGESTION & 7 \\
\hline SCHEMA & 7 \\
\hline
\end{tabular}
\end{table}

The STATISTICS category can provide a great deal of useful data. See Section 25.6.3.3, "Using CLUSTERLOG STATISTICS in the NDB Cluster Management Client", for more information.

Thresholds are used to filter events within each category. For example, a STARTUP event with a priority of 3 is not logged unless the threshold for STARTUP is set to 3 or higher. Only events with priority 3 or lower are sent if the threshold is 3 .

The following table shows the event severity levels.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4327.jpg?height=170&width=261&top_left_y=1425&top_left_x=370)

\section*{Note}

These correspond to Unix syslog levels, except for LOG_EMERG and LOG_NOTICE, which are not used or mapped.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.27 Event severity levels}
\begin{tabular}{|l|l|l|}
\hline Severity Level Value & Severity & Description \\
\hline 1 & ALERT & A condition that should be corrected immediately, such as a corrupted system database \\
\hline 2 & CRITICAL & Critical conditions, such as device errors or insufficient resources \\
\hline 3 & ERROR & Conditions that should be corrected, such as configuration errors \\
\hline 4 & WARNING & Conditions that are not errors, but that might require special handling \\
\hline 5 & INFO & Informational messages \\
\hline 6 & DEBUG & Debugging messages used for NDBCLUSTER development \\
\hline
\end{tabular}
\end{table}

Event severity levels can be turned on or off using CLUSTERLOG TOGGLE. If a severity level is turned on, then all events with a priority less than or equal to the category thresholds are logged. If the severity level is turned off then no events belonging to that severity level are logged.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4328.jpg?height=101&width=104&top_left_y=267&top_left_x=301)

\section*{Important}

Cluster log levels are set on a per ndb_mgmd, per subscriber basis. This means that, in an NDB Cluster with multiple management servers, using a CLUSTERLOG command in an instance of ndb_mgm connected to one management server affects only logs generated by that management server but not by any of the others. This also means that, should one of the management servers be restarted, only logs generated by that management server are affected by the resetting of log levels caused by the restart.

\subsection*{25.6.3.2 NDB Cluster Log Events}

An event report reported in the event logs has the following format:
```
datetime [string] severity -- message
```


For example:
09:19:30 2005-07-24 [NDB] INFO -- Node 4 Start phase 4 completed
This section discusses all reportable events, ordered by category and severity level within each category.

In the event descriptions, GCP and LCP mean "Global Checkpoint" and "Local Checkpoint", respectively.

\section*{CONNECTION Events}

These events are associated with connections between Cluster nodes.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.28 Events associated with connections between cluster nodes}
\begin{tabular}{|l|l|l|l|}
\hline Event & Priority & Severity Level & Description \\
\hline Connected & 8 & INFO & Data nodes connected \\
\hline Disconnected & 8 & ALERT & Data nodes disconnected \\
\hline CommunicationClosed & 8 & INFO & SQL node or data node connection closed \\
\hline CommunicationOpened & 8 & INFO & SQL node or data node connection open \\
\hline ConnectedApiVersion & 8 & INFO & Connection using API version \\
\hline
\end{tabular}
\end{table}

\section*{CHECKPOINT Events}

The logging messages shown here are associated with checkpoints.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.29 Events associated with checkpoints}
\begin{tabular}{|l|l|l|l|}
\hline Event & Priority & Severity Level & Description \\
\hline GlobalCheckpointSta & 9ted & INFO & Start of GCP: REDO log is written to disk \\
\hline GlobalCheckpointCom & ற@eted & INFO & GCP finished \\
\hline LocalCheckpointStar & Zed & INFO & Start of LCP: data written to disk \\
\hline LocalCheckpointComp & Zeted & INFO & LCP completed normally \\
\hline LCPStoppedInCalcKeep & 0Gci & ALERT & LCP stopped \\
\hline LCPFragmentComplete & ⇓1 & INFO & LCP on a fragment has been completed \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|}
\hline Event & Priority & Severity Level & Description \\
\hline UndoLogBlocked & 7 & INF0 & \begin{tabular}{l} 
UNDO logging blocked; \\
buffer near overflow
\end{tabular} \\
\hline RedoStatus & 7 & INF0 & Redo status \\
\hline
\end{tabular}

\section*{STARTUP Events}

The following events are generated in response to the startup of a node or of the cluster and of its success or failure. They also provide information relating to the progress of the startup process, including information concerning logging activities.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.30 Events relating to the startup of a node or cluster}
\begin{tabular}{|l|l|l|l|}
\hline Event & Priority & Severity Level & Description \\
\hline NDBStartStarted & 1 & INFO & Data node start phases initiated (all nodes starting) \\
\hline NDBStartCompleted & 1 & INFO & Start phases completed, all data nodes \\
\hline STTORRYRecieved & 15 & INFO & Blocks received after completion of restart \\
\hline StartPhaseCompleted & 4 & INFO & Data node start phase $X$ completed \\
\hline CM_REGCONF & 3 & INFO & Node has been successfully included into the cluster; shows the node, managing node, and dynamic ID \\
\hline CM_REGREF & 8 & INFO & Node has been refused for inclusion in the cluster; cannot be included in cluster due to misconfiguration, inability to establish communication, or other problem \\
\hline FIND_NEIGHBOURS & 8 & INFO & Shows neighboring data nodes \\
\hline NDBStopStarted & 1 & INFO & Data node shutdown initiated \\
\hline NDBStopCompleted & 1 & INFO & Data node shutdown complete \\
\hline NDBStopForced & 1 & ALERT & Forced shutdown of data node \\
\hline NDBStopAborted & 1 & INFO & Unable to shut down data node normally \\
\hline StartREDOLog & 4 & INFO & New redo log started; GCI keep $X$, newest restorable GCI $Y$ \\
\hline StartLog & 10 & INFO & New log started; log part $X$, start MB $Y$, stop MB $Z$ \\
\hline UNDORecordsExecuted & 15 & INFO & Undo records executed \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|}
\hline Event & Priority & Severity Level & Description \\
\hline StartReport & 4 & INFO & Report started \\
\hline LogFileInitStatus & 7 & INFO & Log file initialization status \\
\hline LogFileInitCompStat & Us & INFO & Log file completion status \\
\hline StartReadLCP & 10 & INFO & Start read for local checkpoint \\
\hline ReadLCPComplete & 10 & INFO & Read for local checkpoint completed \\
\hline RunRedo & 8 & INFO & Running the redo log \\
\hline RebuildIndex & 10 & INFO & Rebuilding indexes \\
\hline
\end{tabular}

\section*{NODERESTART Events}

The following events are generated when restarting a node and relate to the success or failure of the node restart process.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.31 Events relating to restarting a node}
\begin{tabular}{|l|l|l|l|}
\hline Event & Priority & Severity Level & Description \\
\hline NR_CopyDict & 7 & INFO & Completed copying of dictionary information \\
\hline NR_CopyDistr & 7 & INFO & Completed copying distribution information \\
\hline NR_CopyFragsStarte & 7 & INFO & Starting to copy fragments \\
\hline NR_CopyFragDone & 10 & INFO & Completed copying a fragment \\
\hline NR_CopyFragsComple & $\boldsymbol{\epsilon}$ d & INFO & Completed copying all fragments \\
\hline NodeFailCompleted & 8 & ALERT & Node failure phase completed \\
\hline NODE_FAILREP & 8 & ALERT & Reports that a node has failed \\
\hline ArbitState & 6 & INFO & \begin{tabular}{l}
Report whether an arbitrator is found or not; there are seven different possible outcomes when seeking an arbitrator, listed here: \\
- Management server restarts arbitration thread [state $=X$ ] \\
- Prepare arbitrator node $X$ [ticket $=Y$ ] \\
- Receive arbitrator node $X$ [ticket $=Y$ ] \\
- Started arbitrator node $X$ [ticket $=Y$ ]
\end{tabular} \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|}
\hline Event & Priority & Severity Level & Description \\
\hline & & & \begin{tabular}{l}
- Lost arbitrator node $X$ - process failure [state $=Y$ ] \\
- Lost arbitrator node $X$ - process exit [state $=Y$ ] \\
- Lost arbitrator node $X$ <error msg> [state=Y]
\end{tabular} \\
\hline ArbitResult & 2 & ALERT & \begin{tabular}{l}
Report arbitrator results; there are eight different possible results for arbitration attempts, listed here: \\
- Arbitration check failed: less than 1/2 nodes left \\
- Arbitration check succeeded: node group majority \\
- Arbitration check failed: missing node group \\
- Network partitioning: arbitration required \\
- Arbitration succeeded: affirmative response from node $X$ \\
- Arbitration failed: negative response from node $X$ \\
- Network partitioning: no arbitrator available \\
- Network partitioning: no arbitrator configured
\end{tabular} \\
\hline GCP_TakeoverStarted & 7 & INFO & GCP takeover started \\
\hline GCP_TakeoverComplet & $\boldsymbol{7}$ d & INFO & GCP takeover complete \\
\hline LCP_TakeoverStarted & 7 & INFO & LCP takeover started \\
\hline LCP_TakeoverComplet & $\vec{e} \mathrm{~d}$ & INFO & LCP takeover complete (state = X) \\
\hline ConnectCheckStarted & 6 & INFO & Connection check started \\
\hline ConnectCheckComplet & 6d & INFO & Connection check completed \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|}
\hline Event & Priority & Severity Level & Description \\
\hline NodeFailRejected & 6 & ALERT & \begin{tabular}{l} 
Node failure phase \\
failed
\end{tabular} \\
\hline
\end{tabular}

\section*{STATISTICS Events}

The following events are of a statistical nature. They provide information such as numbers of transactions and other operations, amount of data sent or received by individual nodes, and memory usage.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.32 Events of a statistical nature}
\begin{tabular}{|l|l|l|l|}
\hline Event & Priority & Severity Level & Description \\
\hline TransReportCounters & 8 & INFO & Report transaction statistics, including numbers of transactions, commits, reads, simple reads, writes, concurrent operations, attribute information, and aborts \\
\hline OperationReportCoun & 8ers & INFO & Number of operations \\
\hline TableCreated & 7 & INFO & Report number of tables created \\
\hline JobStatistic & 9 & INFO & Mean internal job scheduling statistics \\
\hline ThreadConfigLoop & 9 & INFO & Number of thread configuration loops \\
\hline SendBytesStatistic & 9 & INFO & Mean number of bytes sent to node $X$ \\
\hline ReceiveBytesStatist & 2c & INFO & Mean number of bytes received from node $X$ \\
\hline MemoryUsage & 5 & INFO & Data and index memory usage (80\%, 90\%, and 100\%) \\
\hline MTSignalStatistics & 9 & INFO & Multithreaded signals \\
\hline
\end{tabular}
\end{table}

\section*{SCHEMA Events}

These events relate to NDB Cluster schema operations.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.33 Events relating to NDB Cluster schema operations}
\begin{tabular}{|l|l|l|l|}
\hline Event & Priority & Severity Level & Description \\
\hline CreateSchemaObject & 8 & INFO & Schema objected created \\
\hline AlterSchemaObject & 8 & INFO & Schema object updated \\
\hline DropSchemaObject & 8 & INFO & Schema object dropped \\
\hline
\end{tabular}
\end{table}

\section*{ERROR Events}

These events relate to Cluster errors and warnings. The presence of one or more of these generally indicates that a major malfunction or failure has occurred.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.34 Events relating to cluster errors and warnings}
\begin{tabular}{|l|l|l|l|}
\hline Event & Priority & Severity Level & Description \\
\hline TransporterError & 2 & ERROR & Transporter error \\
\hline TransporterWarning & 8 & WARNING & Transporter warning \\
\hline MissedHeartbeat & 8 & WARNING & Node $X$ missed heartbeat number $Y$ \\
\hline DeadDueToHeartbeat & 8 & ALERT & Node $X$ declared "dead" due to missed heartbeat \\
\hline WarningEvent & 2 & WARNING & General warning event \\
\hline SubscriptionStatus & 4 & WARNING & Change in subscription status \\
\hline
\end{tabular}
\end{table}

\section*{INFO Events}

These events provide general information about the state of the cluster and activities associated with Cluster maintenance, such as logging and heartbeat transmission.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.35 Information events}
\begin{tabular}{|l|l|l|l|}
\hline Event & Priority & Severity Level & Description \\
\hline SentHeartbeat & 12 & INFO & Sent heartbeat \\
\hline CreateLogBytes & 11 & INFO & Create log: Log part, log file, size in MB \\
\hline InfoEvent & 2 & INFO & General informational event \\
\hline EventBufferStatus & 7 & INFO & Event buffer status \\
\hline EventBufferStatus2 & 7 & INFO & Improved event buffer status information \\
\hline
\end{tabular}
\end{table}

\section*{Note}

SentHeartbeat events are available only if NDB Cluster was compiled with VM_TRACE enabled.

\section*{SINGLEUSER Events}

These events are associated with entering and exiting single user mode.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.36 Events relating to single user mode}
\begin{tabular}{|l|l|l|l|}
\hline Event & Priority & Severity Level & Description \\
\hline SingleUser & 7 & INF0 & \begin{tabular}{l} 
Entering or exiting single \\
user mode
\end{tabular} \\
\hline
\end{tabular}
\end{table}

\section*{BACKUP Events}

These events provide information about backups being created or restored.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 25.37 Backup events}
\begin{tabular}{|l|l|l|l|}
\hline Event & Priority & Severity Level & Description \\
\hline BackupStarted & 7 & INFO & Backup started \\
\hline BackupStatus & 7 & INFO & Backup status \\
\hline BackupCompleted & 7 & INFO & Backup completed \\
\hline BackupFailedToStart & 7 & ALERT & Backup failed to start \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|}
\hline Event & Priority & Severity Level & Description \\
\hline BackupAborted & 7 & ALERT & Backup aborted by user \\
\hline RestoreStarted & 7 & INFO & Started restoring from backup \\
\hline RestoreMetaData & 7 & INFO & Restoring metadata \\
\hline RestoreData & 7 & INFO & Restoring data \\
\hline RestoreLog & 7 & INFO & Restoring log files \\
\hline RestoreCompleted & 7 & INFO & Completed restoring from backup \\
\hline SavedEvent & 7 & INFO & Event saved \\
\hline
\end{tabular}

\subsection*{25.6.3.3 Using CLUSTERLOG STATISTICS in the NDB Cluster Management Client}

The NDB management client's CLUSTERLOG STATISTICS command can provide a number of useful statistics in its output. Counters providing information about the state of the cluster are updated at 5 second reporting intervals by the transaction coordinator (TC) and the local query handler (LQH), and written to the cluster log.

Transaction coordinator statistics. Each transaction has one transaction coordinator, which is chosen by one of the following methods:
- In a round-robin fashion
- By communication proximity
- By supplying a data placement hint when the transaction is started
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4334.jpg?height=127&width=99&top_left_y=1452&top_left_x=306)

\section*{Note}

You can determine which TC selection method is used for transactions started from a given SQL node using the ndb_optimized_node_selection system variable.

All operations within the same transaction use the same transaction coordinator, which reports the following statistics:
- Trans count. This is the number transactions started in the last interval using this TC as the transaction coordinator. Any of these transactions may have committed, have been aborted, or remain uncommitted at the end of the reporting interval.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4334.jpg?height=111&width=99&top_left_y=1980&top_left_x=342)

Note
Transactions do not migrate between TCs.
- Commit count. This is the number of transactions using this TC as the transaction coordinator that were committed in the last reporting interval. Because some transactions committed in this reporting interval may have started in a previous reporting interval, it is possible for Commit count to be greater than Trans count.
- Read count. This is the number of primary key read operations using this TC as the transaction coordinator that were started in the last reporting interval, including simple reads. This count also includes reads performed as part of unique index operations. A unique index read operation generates 2 primary key read operations- 1 for the hidden unique index table, and 1 for the table on which the read takes place.
- Simple read count. This is the number of simple read operations using this TC as the transaction coordinator that were started in the last reporting interval.
- Write count. This is the number of primary key write operations using this TC as the transaction coordinator that were started in the last reporting interval. This includes all inserts, updates, writes and deletes, as well as writes performed as part of unique index operations.

\section*{Note}

A unique index update operation can generate multiple PK read and write operations on the index table and on the base table.
- AttrInfoCount. This is the number of 32-bit data words received in the last reporting interval for primary key operations using this TC as the transaction coordinator. For reads, this is proportional to the number of columns requested. For inserts and updates, this is proportional to the number of columns written, and the size of their data. For delete operations, this is usually zero.

Unique index operations generate multiple PK operations and so increase this count. However, data words sent to describe the PK operation itself, and the key information sent, are not counted here. Attribute information sent to describe columns to read for scans, or to describe ScanFilters, is also not counted in AttrInfoCount.
- Concurrent Operations. This is the number of primary key or scan operations using this TC as the transaction coordinator that were started during the last reporting interval but that were not completed. Operations increment this counter when they are started and decrement it when they are completed; this occurs after the transaction commits. Dirty reads and writes-as well as failed operations-decrement this counter.

The maximum value that Concurrent Operations can have is the maximum number of operations that a TC block can support; currently, this is ( 2 * MaxNoOfConcurrentOperations) + 16 + MaxNoOfConcurrentTransactions. (For more information about these configuration parameters, see the Transaction Parameters section of Section 25.4.3.6, "Defining NDB Cluster Data Nodes".)
- Abort count. This is the number of transactions using this TC as the transaction coordinator that were aborted during the last reporting interval. Because some transactions that were aborted in the last reporting interval may have started in a previous reporting interval, Abort count can sometimes be greater than Trans count.
- Scans. This is the number of table scans using this TC as the transaction coordinator that were started during the last reporting interval. This does not include range scans (that is, ordered index scans).
- Range scans. This is the number of ordered index scans using this TC as the transaction coordinator that were started in the last reporting interval.
- Local reads. This is the number of primary-key read operations performed using a transaction coordinator on a node that also holds the primary fragment replica of the record. This count can also be obtained from the LOCAL_READS counter in the ndbinfo.counters table.
- Local writes. This contains the number of primary-key read operations that were performed using a transaction coordinator on a node that also holds the primary fragment replica of the record. This count can also be obtained from the LOCAL_WRITES counter in the ndbinfo.counters table.

Local query handler statistics (Operations). There is 1 cluster event per local query handler block (that is, 1 per data node process). Operations are recorded in the LQH where the data they are operating on resides.

Note
A single transaction may operate on data stored in multiple LQH blocks.

The Operations statistic provides the number of local operations performed by this LQH block in the last reporting interval, and includes all types of read and write operations (insert, update, write, and
delete operations). This also includes operations used to replicate writes. For example, in a cluster with two fragment replicas, the write to the primary fragment replica is recorded in the primary LQH, and the write to the backup is recorded in the backup LQH. Unique key operations may result in multiple local operations; however, this does not include local operations generated as a result of a table scan or ordered index scan, which are not counted.

Process scheduler statistics. In addition to the statistics reported by the transaction coordinator and local query handler, each ndbd process has a scheduler which also provides useful metrics relating to the performance of an NDB Cluster. This scheduler runs in an infinite loop; during each loop the scheduler performs the following tasks:
1. Read any incoming messages from sockets into a job buffer.
2. Check whether there are any timed messages to be executed; if so, put these into the job buffer as well.
3. Execute (in a loop) any messages in the job buffer.
4. Send any distributed messages that were generated by executing the messages in the job buffer.
5. Wait for any new incoming messages.

Process scheduler statistics include the following:
- Mean Loop Counter. This is the number of loops executed in the third step from the preceding list. This statistic increases in size as the utilization of the TCP/IP buffer improves. You can use this to monitor changes in performance as you add new data node processes.
- Mean send size and Mean receive size. These statistics enable you to gauge the efficiency of, respectively writes and reads between nodes. The values are given in bytes. Higher values mean a lower cost per byte sent or received; the maximum value is 64 K .

To cause all cluster log statistics to be logged, you can use the following command in the NDB management client:
```
ndb_mgm> ALL CLUSTERLOG STATISTICS=15
```


\section*{Note}

Setting the threshold for STATISTICS to 15 causes the cluster log to become very verbose, and to grow quite rapidly in size, in direct proportion to the number of cluster nodes and the amount of activity in the NDB Cluster.

For more information about NDB Cluster management client commands relating to logging and reporting, see Section 25.6.3.1, "NDB Cluster Logging Management Commands".

\subsection*{25.6.4 Summary of NDB Cluster Start Phases}

This section provides a simplified outline of the steps involved when NDB Cluster data nodes are started. More complete information can be found in NDB Cluster Start Phases, in the NDB Internals Guide.

These phases are the same as those reported in the output from the node_id STATUS command in the management client (see Section 25.6.1, "Commands in the NDB Cluster Management Client"). These start phases are also reported in the start_phase column of the ndbinfo. nodes table.

Start types. There are several different startup types and modes, as shown in the following list:
- Initial start. The cluster starts with a clean file system on all data nodes. This occurs either when the cluster started for the very first time, or when all data nodes are restarted using the --initial option.

\section*{Note}

Disk Data files are not removed when restarting a node using --initial.
- System restart. The cluster starts and reads data stored in the data nodes. This occurs when the cluster has been shut down after having been in use, when it is desired for the cluster to resume operations from the point where it left off.
- Node restart. This is the online restart of a cluster node while the cluster itself is running.
- Initial node restart. This is the same as a node restart, except that the node is reinitialized and started with a clean file system.

Setup and initialization (phase -1). Prior to startup, each data node (ndbd process) must be initialized. Initialization consists of the following steps:
1. Obtain a node ID
2. Fetch configuration data
3. Allocate ports to be used for inter-node communications
4. Allocate memory according to settings obtained from the configuration file

When a data node or SQL node first connects to the management node, it reserves a cluster node ID. To make sure that no other node allocates the same node ID, this ID is retained until the node has managed to connect to the cluster and at least one ndbd reports that this node is connected. This retention of the node ID is guarded by the connection between the node in question and ndb_mgmd.

After each data node has been initialized, the cluster startup process can proceed. The stages which the cluster goes through during this process are listed here:
- Phase 0. The NDBFS and NDBCNTR blocks start. Data node file systems are cleared on those data nodes that were started with --initial option.
- Phase 1. In this stage, all remaining NDB kernel blocks are started. NDB Cluster connections are set up, inter-block communications are established, and heartbeats are started. In the case of a node restart, API node connections are also checked.

\section*{Note}

When one or more nodes hang in Phase 1 while the remaining node or nodes hang in Phase 2, this often indicates network problems. One possible cause of such issues is one or more cluster hosts having multiple network interfaces. Another common source of problems causing this condition is the blocking of TCP/IP ports needed for communications between cluster nodes. In the latter case, this is often due to a misconfigured firewall.
- Phase 2. The NDBCNTR kernel block checks the states of all existing nodes. The master node is chosen, and the cluster schema file is initialized.
- Phase 3. The DBLQH and DBTC kernel blocks set up communications between them. The startup type is determined; if this is a restart, the DBDIH block obtains permission to perform the restart.
- Phase 4. For an initial start or initial node restart, the redo log files are created. The number of these files is equal to NoOfFragmentLogFiles.

For a system restart:
- Read schema or schemas.
- Read data from the local checkpoint.
- Apply all redo information until the latest restorable global checkpoint has been reached.

For a node restart, find the tail of the redo log.
- Phase 5. Most of the database-related portion of a data node start is performed during this phase. For an initial start or system restart, a local checkpoint is executed, followed by a global checkpoint. Periodic checks of memory usage begin during this phase, and any required node takeovers are performed.
- Phase 6. In this phase, node groups are defined and set up.
- Phase 7. The arbitrator node is selected and begins to function. The next backup ID is set, as is the backup disk write speed. Nodes reaching this start phase are marked as Started. It is now possible for API nodes (including SQL nodes) to connect to the cluster.
- Phase 8. If this is a system restart, all indexes are rebuilt (by DBDIH).
- Phase 9. The node internal startup variables are reset.
- Phase 100 (OBSOLETE). Formerly, it was at this point during a node restart or initial node restart that API nodes could connect to the node and begin to receive events. Currently, this phase is empty.
- Phase 101. At this point in a node restart or initial node restart, event delivery is handed over to the node joining the cluster. The newly-joined node takes over responsibility for delivering its primary data to subscribers. This phase is also referred to as SUMA handover phase.

After this process is completed for an initial start or system restart, transaction handling is enabled. For a node restart or initial node restart, completion of the startup process means that the node may now act as a transaction coordinator.

\subsection*{25.6.5 Performing a Rolling Restart of an NDB Cluster}

This section discusses how to perform a rolling restart of an NDB Cluster installation, so called because it involves stopping and starting (or restarting) each node in turn, so that the cluster itself remains operational. This is often done as part of a rolling upgrade or rolling downgrade, where high availability of the cluster is mandatory and no downtime of the cluster as a whole is permissible. Where we refer to upgrades, the information provided here also generally applies to downgrades as well.

There are a number of reasons why a rolling restart might be desirable. These are described in the next few paragraphs.

\section*{Configuration change.}

To make a change in the cluster's configuration, such as adding an SQL node to the cluster, or setting a configuration parameter to a new value.

NDB Cluster software upgrade or downgrade. To upgrade the cluster to a newer version of the NDB Cluster software (or to downgrade it to an older version). This is usually referred to as a "rolling upgrade" (or "rolling downgrade", when reverting to an older version of NDB Cluster).

Change on node host. To make changes in the hardware or operating system on which one or more NDB Cluster node processes are running.

\section*{System reset (cluster reset).}

To reset the cluster because it has reached an undesirable state. In such cases it is often desirable to reload the data and metadata of one or more data nodes. This can be done in any of three ways:
- Start each data node process (ndbd or possibly ndbmtd) with the --initial option, which forces the data node to clear its file system and to reload all NDB Cluster data and metadata from the other data nodes. This also forces the removal of all Disk Data objects and files associated with those objects.
- Create a backup using the ndb_mgm client START BACKUP command prior to performing the restart. Following the upgrade, restore the node or nodes using ndb_restore.

See Section 25.6.8, "Online Backup of NDB Cluster", and Section 25.5.23, "ndb_restore - Restore an NDB Cluster Backup", for more information.
- Use mysqldump to create a backup prior to the upgrade; afterward, restore the dump using LOAD DATA.

\section*{Resource Recovery.}

To free memory previously allocated to a table by successive INSERT and DELETE operations, for reuse by other NDB Cluster tables.

The process for performing a rolling restart may be generalized as follows:
1. Stop all cluster management nodes (ndb_mgmd processes), reconfigure them, then restart them. (See Rolling restarts with multiple management servers.)
2. Stop, reconfigure, then restart each cluster data node (ndbd process) in turn.

Some node configuration parameters can be updated by issuing RESTART for each of the data nodes in the ndb_mgm client following the previous step. Other parameters require that the data node be stopped completely using the management client STOP command, then started again from a system shell by invoking the ndbd or ndbmtd executable as appropriate. (A shell command such as kill can also be used on most Unix systems to stop a data node process, but the STOP command is preferred and usually simpler.)

