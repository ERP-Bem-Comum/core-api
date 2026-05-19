\section*{Help Options}

The following options display information about the mysqldump command itself.
- --help, -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- help \\
\hline
\end{tabular}

Display a help message and exit.
- --version, -V

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.

\section*{Internationalization Options}

The following options change how the mysqldump command represents character data with national language settings.
- --character-sets-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -character-sets-dir=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

The directory where character sets are installed. See Section 12.15, "Character Set Configuration".
- --default-character-set=charset_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --default-character-set=charset_name \\
\hline Type & String \\
\hline Default Value & utf8 \\
\hline
\end{tabular}

Use charset_name as the default character set. See Section 12.15, "Character Set Configuration". If no character set is specified, mysqldump uses utf 8 mb 4 .
- --no-set-names, -N

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - set - names \\
\hline Deprecated & Yes \\
\hline
\end{tabular}

Turns off the --set-charset setting, the same as specifying--skip-set-charset.
- --set-charset

\begin{tabular}{|l|l|}
\hline Command-Line Format & --set-charset \\
\hline Disabled by & skip-set-charset \\
\hline
\end{tabular}

Write SET NAMES default_character_set to the output. This option is enabled by default. To suppress the SET NAMES statement, use--skip-set-charset.

\section*{Replication Options}

The mysqldump command is frequently used to create an empty instance, or an instance including data, on a replica server in a replication configuration. The following options apply to dumping and restoring data on replication source servers and replicas.
- --apply-replica-statements

\begin{tabular}{|l|l|}
\hline Command-Line Format & --apply-replica-statements \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

For a replica dump produced with the --dump-replica option, this option adds a STOP REPLICA statement before the statement with the binary log coordinates, and a START REPLICA statement at the end of the output.
- --apply-slave-statements

\begin{tabular}{|l|l|}
\hline Command-Line Format & --apply-slave-statements \\
\hline Deprecated & Yes \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

This is a deprecated alias for --apply-replica-statements.
- --delete-source-logs

\begin{tabular}{|l|l|}
\hline Command-Line Format & --delete-source-logs \\
\hline
\end{tabular}

On a replication source server, delete the binary logs by sending a PURGE BINARY LOGS statement to the server after performing the dump operation. The options require the RELOAD privilege as well as privileges sufficient to execute that statement. This option automatically enables --sourcedata.
- --delete-master-logs

\begin{tabular}{|l|l|}
\hline Command-Line Format & --delete-master-logs \\
\hline Deprecated & Yes \\
\hline
\end{tabular}

This is a deprecated alias for--delete-source-logs.
- --dump-replica[=value]

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - dump - replica[=value] \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Type & Numeric \\
\hline Default Value & 1 \\
\hline Valid Values & \begin{tabular}{l}
1 \\
2
\end{tabular} \\
\hline
\end{tabular}

This option is similar to --source-data, except that it is used to dump a replica server to produce a dump file that can be used to set up another server as a replica that has the same source as the dumped server. The option causes the dump output to include a CHANGE REPLICATION SOURCE TO statement that indicates the binary log coordinates (file name and position) of the dumped replica's source. The CHANGE REPLICATION SOURCE TO statement reads the values of Relay_Master_Log_File and Exec_Master_Log_Pos from the SHOW REPLICA STATUS output and uses them for SOURCE_LOG_FILE and SOURCE_LOG_POS respectively. These are the replication source server coordinates from which the replica starts replicating.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0479.jpg?height=120&width=97&top_left_y=934&top_left_x=404)

\section*{Note \\ Inconsistencies in the sequence of transactions from the relay log which have been executed can cause the wrong position to be used. See Section 19.5.1.34, "Replication and Transaction Inconsistencies" for more information.}
--dump-replica causes the coordinates from the source to be used rather than those of the dumped server, as is done by the--source-data option. In addition, specifying this option overrides the --source-data option.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0479.jpg?height=124&width=106&top_left_y=1366&top_left_x=402)

> Warning
> --dump-replica should not be used if the server where the dump is going to be applied uses gtid_mode=0N and SOURCE_AUTO_POSITION=1.

The option value is handled the same way as for --source-data. Setting no value or 1 causes a CHANGE REPLICATION SOURCE TO statement to be written to the dump. Setting 2 causes the statement to be written but encased in SQL comments. It has the same effect as --source-data in terms of enabling or disabling other options and in how locking is handled.
--dump-replica causes mysqldump to stop the replication SQL thread before the dump and restart it again after.
--dump-replica sends a SHOW REPLICA STATUS statement to the server to obtain information, so they require privileges sufficient to execute that statement.
--apply-replica-statements and--include-source-host-port options can be used in conjunction with --dump-replica.
- --dump-slave[=value]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --dump-slave[=value] \\
\hline Deprecated & Yes \\
\hline Type & Numeric \\
\hline Default Value & 1 \\
\hline Valid Values & \begin{tabular}{l}
1 \\
2
\end{tabular} \\
\hline
\end{tabular}

This is a deprecated alias for --dump-replica.
- --include-source-host-port

\begin{tabular}{|l|l|}
\hline Command-Line Format & --include-source-host-port \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Adds the SOURCE_HOST and SOURCE_PORT options for the host name and TCP/IP port number of the replica's source, to the CHANGE REPLICATION SOURCE TO statement in a replica dump produced with the --dump-replica option.
- --include-master-host-port

\begin{tabular}{|l|l|}
\hline Command-Line Format & --include-master-host-port \\
\hline Deprecated & Yes \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

This is a deprecated alias for--include-source-host-port.
- --master-data[=value]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --master-data[=value] \\
\hline Deprecated & Yes \\
\hline Type & Numeric \\
\hline Default Value & 1 \\
\hline Valid Values & \begin{tabular}{l}
1 \\
2
\end{tabular} \\
\hline
\end{tabular}

This is a deprecated alias for --source-data.
- --output-as-version=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & --output-as-version=value \\
\hline Type & Enumeration \\
\hline Default Value & SERVER \\
\hline Valid Values & \begin{tabular}{l}
BEFORE_8_0_23 \\
BEFORE_8_2_0
\end{tabular} \\
\hline
\end{tabular}

Determines the level of terminology used for statements relating to replicas and events, making it possible to create dumps compatible with older versions of MySQL that do not accept the newer terminology. This option can take any one of the following values, with effects described as listed here:
- SERVER: Reads the server version and uses the latest versions of statements compatible with that version. This is the default value.
- BEFORE_8_0_23: Replication SQL statements using deprecated terms such as "slave" and "master" are written to the output in place of those using "replica" and "source", as in MySQL versions prior to 8.0.23.

This option also duplicates the effects of BEFORE_8_2_0 on the output of SHOW CREATE EVENT.
- BEFORE_8_2_0: This option causes SHOW CREATE EVENT to reflect how the event would have been created in a MySQL server prior to version 8.2.0, displaying DISABLE ON SLAVE rather than DISABLE ON REPLICA.

This option affects the output from --events, --dump-replica, --source-data, --apply-replica-statements, and --include-source-host-port.
- --source-data[=value]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --source-data[=value] \\
\hline Type & Numeric \\
\hline Default Value & 1 \\
\hline Valid Values & \begin{tabular}{l}
1 \\
2
\end{tabular} \\
\hline
\end{tabular}

Used to dump a replication source server to produce a dump file that can be used to set up another server as a replica of the source. The options cause the dump output to include a CHANGE REPLICATION SOURCE TO statement that indicates the binary log coordinates (file name and position) of the dumped server. These are the replication source server coordinates from which the replica should start replicating after you load the dump file into the replica.

If the option value is 2 , the CHANGE REPLICATION SOURCE TO statement is written as an SQL comment, and thus is informative only; it has no effect when the dump file is reloaded. If the option value is 1 , the statement is not written as a comment and takes effect when the dump file is reloaded. If no option value is specified, the default value is 1 .
--source-data sends a SHOW BINARY LOG STATUS statement to the server to obtain information, so they require privileges sufficient to execute that statement. This option also requires the RELOAD privilege and the binary log must be enabled.
--source-data automatically turns off --lock-tables. They also turn on --lock-alltables, unless--single-transaction also is specified, in which case, a global read lock is acquired only for a short time at the beginning of the dump (see the description for --singletransaction). In all cases, any action on logs happens at the exact moment of the dump.

It is also possible to set up a replica by dumping an existing replica of the source, using the --dumpreplica option, which overrides --source-data causing it to be ignored.
- --set-gtid-purged=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & --set-gtid-purged=value \\
\hline Type & Enumeration \\
\hline Default Value & AUTO \\
\hline Valid Values & \begin{tabular}{l}
OFF \\
ON
\end{tabular} \\
\hline
\end{tabular}

This option is for servers that use GTID-based replication (gtid_mode=0N). It controls the inclusion of a SET @@GLOBAL.gtid_purged statement in the dump output, which updates the value of gtid_purged on a server where the dump file is reloaded, to add the GTID set from the source server's gtid_executed system variable. gtid_purged holds the GTIDs of all transactions that have been applied on the server, but do not exist on any binary log file on the server. mysqldump therefore adds the GTIDs for the transactions that were executed on the source server, so that the target server records these transactions as applied, although it does not have them in its binary logs. --set-gtid-purged also controls the inclusion of a SET @@SESSION.sql_log_bin=0 statement, which disables binary logging while the dump file is being reloaded. This statement prevents new GTIDs from being generated and assigned to the transactions in the dump file as they are executed, so that the original GTIDs for the transactions are used.

If you do not set the --set-gtid-purged option, the default is that a SET @@GLOBAL.gtid_purged statement is included in the dump output if GTIDs are enabled on the server you are backing up, and the set of GTIDs in the global value of the gtid_executed system variable is not empty. A SET @@SESSION . sql_log_bin=0 statement is also included if GTIDs are enabled on the server.

You can either replace the value of gtid_purged with a specified GTID set, or add a plus sign ( + ) to the statement to append a specified GTID set to the GTID set that is already held by gtid_purged. The SET @@GLOBAL.gtid_purged statement recorded by mysqldump includes a plus sign (+) in a version-specific comment, such that MySQL adds the GTID set from the dump file to the existing gtid_purged value.

It is important to note that the value that is included by mysqldump for the SET @@GLOBAL.gtid_purged statement includes the GTIDs of all transactions in the gtid_executed set on the server, even those that changed suppressed parts of the database, or other databases on the server that were not included in a partial dump. This can mean that after the gtid_purged value has been updated on the server where the dump file is replayed, GTIDs are present that do not relate to any data on the target server. If you do not replay any further dump files on the target server, the extraneous GTIDs do not cause any problems with the future operation of the server, but they make it harder to compare or reconcile GTID sets on different servers in the replication topology. If you do replay a further dump file on the target server that contains the same GTIDs (for example, another partial dump from the same origin server), any SET @@GLOBAL.gtid_purged statement in the second dump file fails. In this case, either remove the statement manually before replaying the dump file, or output the dump file without the statement.

If the SET @@GLOBAL.gtid_purged statement would not have the desired result on your target server, you can exclude the statement from the output, or include it but comment it out so that it is not actioned automatically. You can also include the statement but manually edit it in the dump file to achieve the desired result.

The possible values for the--set-gtid-purged option are as follows:

\section*{AUTO}

The default value. If GTIDs are enabled on the server you are backing up and gtid_executed is not empty, SET @@GLOBAL.gtid_purged is added to the output, containing the GTID set from gtid_executed. If GTIDs are enabled, SET @@SESSION. sql_log_bin=0 is added to the output. If GTIDs are not enabled on the server, the statements are not added to the output.

\section*{OFF}

SET @@GLOBAL.gtid_purged is not added to the output, and SET @@SESSION.sql_log_bin=0 is not added to the output. For a server where GTIDs are not in use, use this option or

AUT0. Only use this option for a server where GTIDs are in use if you are sure that the required GTID set is already present in gtid_purged on the target server and should not be changed, or if you plan to identify and add any missing GTIDs manually.

\section*{ON}

If GTIDs are enabled on the server you are backing up, SET @@GLOBAL.gtid_purged is added to the output (unless gtid_executed is empty), and SET @@SESSION. sql_log_bin=0 is added to the output. An error occurs if you set this option but GTIDs are not enabled on the server. For a server where GTIDs are in use, use this option or AUTO, unless you are sure that the GTIDs in gtid_executed are not needed on the target server.

\section*{COMMENTED}

If GTIDs are enabled on the server you are backing up, SET @@GLOBAL.gtid_purged is added to the output (unless gtid_executed is empty), but it is commented out. This means that the value of gtid_executed is available in the output, but no action is taken automatically when the dump file is reloaded. SET @@SESSION.sql_log_bin=0 is added to the output, and it is not commented out. With COMMENTED, you can control the use of the gtid_executed set manually or through automation. For example, you might prefer to do this if you are migrating data to another server that already has different active databases.

\section*{Format Options}

The following options specify how to represent the entire dump file or certain kinds of data in the dump file. They also control whether certain optional information is written to the dump file.
- --compact

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - compact \\
\hline
\end{tabular}

Produce more compact output. This option enables the --skip-add-drop-table, --skip-addlocks, --skip-comments, --skip-disable-keys, and --skip-set-charset options.
- --compatible=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -compatible=name $[$, name, . . . $]$ \\
\hline Type & String \\
\hline Default Value & ' ' \\
\hline Valid Values & ansi \\
\hline
\end{tabular}

Produce output that is more compatible with other database systems or with older MySQL servers. The only permitted value for this option is ansi, which has the same meaning as the corresponding option for setting the server SQL mode. See Section 7.1.11, "Server SQL Modes".
- --complete-insert, -c

\begin{tabular}{|l|l|}
\hline Command-Line Format & --complete-insert \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Command-Line Format & --create-options \\
\hline
\end{tabular}

Include all MySQL-specific table options in the CREATE TABLE statements.
- --fields-terminated-by=...,--fields-enclosed-by=...,--fields-optionally-enclosed-by=...,--fields-escaped-by=...

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- fields - terminated - by=string \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- fields-enclosed-by=string \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--fields-optionally-enclosed - \\
by=string
\end{tabular} \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- fields - escaped - by \\
\hline Type & String \\
\hline
\end{tabular}

These options are used with the --tab option and have the same meaning as the corresponding FIELDS clauses for LOAD DATA. See Section 15.2.9, "LOAD DATA Statement".
- --hex-blob

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - hex-blob \\
\hline
\end{tabular}

Dump binary columns using hexadecimal notation (for example, ' abc ' becomes 0x616263). The affected data types are BINARY, VARBINARY, BLOB types, BIT, all spatial data types, and other nonbinary data types when used with the binary character set.

The --hex-blob option is ignored when the --tab is used.
- --lines-terminated-by=...

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- lines - terminated - by=string \\
\hline Type & String \\
\hline
\end{tabular}

This option is used with the --tab option and has the same meaning as the corresponding LINES clause for LOAD DATA. See Section 15.2.9, "LOAD DATA Statement".
- --quote-names, -Q
enabled by default. It can be disabled with --skip-quote-names, but this option should be given after any option such as --compatible that may enable--quote-names.
- --result-file=file_name, -r file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --result-file=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

Direct output to the named file. The result file is created and its previous contents overwritten, even if an error occurs while generating the dump.

This option should be used on Windows to prevent newline \n characters from being converted to $\backslash r \backslash n$ carriage return/newline sequences.
- --show-create-skip-secondary-engine=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & --show-create-skip-secondary-engine \\
\hline
\end{tabular}

Excludes the SECONDARY ENGINE clause from CREATE TABLE statements. It does so by enabling the show_create_table_skip_secondary_engine system variable for the duration of the dump operation. Alternatively, you can enable the show_create_table_skip_secondary_engine system variable prior to using mysqldump.
- --tab=dir_name, -T dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - tab=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

Produce tab-separated text-format data files. For each dumped table, mysqldump creates a tbl_name.sql file that contains the CREATE TABLE statement that creates the table, and the server writes a tbl_name.txt file that contains its data. The option value is the directory in which to write the files.

\section*{Note}

This option should be used only when mysqldump is run on the same machine as the mysqld server. Because the server creates *. txt files in the directory that you specify, the directory must be writable by the server and the MySQL account that you use must have the FILE privilege. Because mysqldump creates *. sql in the same directory, it must be writable by your system login account.

By default, the . txt data files are formatted using tab characters between column values and a newline at the end of each line. The format can be specified explicitly using the --fields- $x x x$ and --lines-terminated-by options.

Column values are converted to the character set specified by the--default-character-set option.
- --tz-utc

\begin{tabular}{|l|l|} 
Disabled by & skip-tz-utc \\
\hline
\end{tabular}

This option enables TIMESTAMP columns to be dumped and reloaded between servers in different time zones. mysqldump sets its connection time zone to UTC and adds SET TIME_ZONE='+00:00' to the dump file. Without this option, TIMESTAMP columns are dumped and reloaded in the time zones local to the source and destination servers, which can cause the values to change if the servers are in different time zones. --tz-utc also protects against changes due to daylight saving time. --tz-utc is enabled by default. To disable it, use --skip-tz-utc.
- --xml, -X

\begin{tabular}{|l|l|}
\hline Command-Line Format & --xml \\
\hline
\end{tabular}

Write dump output as well-formed XML.
NULL, 'NULL', and Empty Values: For a column named column_name, the NULL value, an empty string, and the string value 'NULL' are distinguished from one another in the output generated by this option as follows.

\begin{tabular}{|l|l|}
\hline Value: & XML Representation: \\
\hline NULL (unknown value) & <field name="column_name" xsi:nil="true" /> \\
\hline ' ' (empty string) & <field name="column_name"></field> \\
\hline 'NULL' (string value) & <field name="column_name">NULL</ field> \\
\hline
\end{tabular}

The output from the mysql client when run using the --xml option also follows the preceding rules. (See Section 6.5.1.1, "mysql Client Options".)

XML output from mysqldump includes the XML namespace, as shown here:
```
$> mysqldump --xml -u root world City
<?xml version="1.0"?>
<mysqldump xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<database name="world">
<table_structure name="City">
<field Field="ID" Type="int(11)" Null="NO" Key="PRI" Extra="auto_increment" />
<field Field="Name" Type="char(35)" Null="NO" Key="" Default="" Extra="" />
<field Field="CountryCode" Type="char(3)" Null="NO" Key="" Default="" Extra="" />
<field Field="District" Type="char(20)" Null="NO" Key="" Default="" Extra="" />
<field Field="Population" Type="int(11)" Null="NO" Key="" Default="0" Extra="" />
<key Table="City" Non_unique="0" Key_name="PRIMARY" Seq_in_index="1" Column_name="ID"
Collation="A" Cardinality="4079" Null="" Index_type="BTREE" Comment="" />
<options Name="City" Engine="MyISAM" Version="10" Row_format="Fixed" Rows="4079"
Avg_row_length="67" Data_length="273293" Max_data_length="18858823439613951"
Index_length="43008" Data_free="0" Auto_increment="4080"
Create_time="2007-03-31 01:47:01" Update_time="2007-03-31 01:47:02"
Collation="latin1_swedish_ci" Create_options="" Comment="" />
</table_structure>
<table_data name="City">
<row>
<field name="ID">1</field>
<field name="Name">Kabul</field>
<field name="CountryCode">AFG</field>
<field name="District">Kabol</field>
<field name="Population">1780000</field>
</row>
...
<row>
<field name="ID">4079</field>
```

```
<field name="Name">Rafah</field>
<field name="CountryCode">PSE</field>
<field name="District">Rafah</field>
<field name="Population">92020</field>
</row>
</table_data>
</database>
</mysqldump>
```


\section*{Filtering Options}

The following options control which kinds of schema objects are written to the dump file: by category, such as triggers or events; by name, for example, choosing which databases and tables to dump; or even filtering rows from the table data using a WHERE clause.
- --all-databases, -A

\begin{tabular}{|l|l|}
\hline Command-Line Format & --all-databases \\
\hline
\end{tabular}

Dump all tables in all databases. This is the same as using the --databases option and naming all the databases on the command line.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0487.jpg?height=182&width=268&top_left_y=1210&top_left_x=402)

\section*{Note}

See the--add-drop-database description for information about an incompatibility of that option with --all-databases.

Prior to MySQL 8.4, the --routines and --events options for mysqldump were not required to include stored routines and events when using the --all-databases option: The dump included the mysql system database, and therefore also the mysql.proc and mysql.event tables containing stored routine and event definitions. As of MySQL 8.4, the mysql. event and mysql.proc tables are not used. Definitions for the corresponding objects are stored in data dictionary tables, but those tables are not dumped. To include stored routines and events in a dump made using --all-databases, use the --routines and --events options explicitly.
- --databases, -B

\begin{tabular}{|l|l|}
\hline Command-Line Format & --databases \\
\hline
\end{tabular}

Dump several databases. Normally, mysqldump treats the first name argument on the command line as a database name and following names as table names. With this option, it treats all name arguments as database names. CREATE DATABASE and USE statements are included in the output before each new database.

This option may be used to dump the performance_schema database, which normally is not dumped even with the --all-databases option. (Also use the --skip-lock-tables option.)
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0487.jpg?height=106&width=95&top_left_y=2378&top_left_x=406)

\section*{Note}

See the--add-drop-database description for information about an incompatibility of that option with --databases.
- --events, -E

Command-Line Format

The output generated by using --events contains CREATE EVENT statements to create the events.
- --ignore-error=error[,error]...

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ignore-error=error[,error]... \\
\hline Type & String \\
\hline
\end{tabular}

Ignore the specified errors. The option value is a list of comma-separated error numbers specifying the errors to ignore during mysqldump execution. If the --force option is also given to ignore all errors, --force takes precedence.
- --ignore-table=db_name.tbl_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ignore-table=db_name.tbl_name \\
\hline Type & String \\
\hline
\end{tabular}

Do not dump the given table, which must be specified using both the database and table names. To ignore multiple tables, use this option multiple times. This option also can be used to ignore views.
- --ignore-views=boolean

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ignore-views \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Skips table views in the dump file.
- --init-command=str

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - init - command $=$ str \\
\hline Type & String \\
\hline
\end{tabular}

Single SQL statement to execute after connecting to the MySQL server. The definition resets existing statements defined by it or init-command-add.
- --init-command-add=str

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - init - command - add $=$ str \\
\hline Type & String \\
\hline
\end{tabular}

Add an additional SQL statement to execute after connecting or reconnecting to the MySQL server. It's usable without --init-command but has no effect if used before it because init-command resets the list of commands to call.
- --no-data, -d

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - data \\
\hline
\end{tabular}

Do not write any table row information (that is, do not dump table contents). This is useful if you want to dump only the CREATE TABLE statement for the table (for example, to create an empty copy of the table by loading the dump file).
- --routines, -R

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - routines \\
\hline
\end{tabular}

Include stored routines (procedures and functions) for the dumped databases in the output. This option requires the global SELECT privilege.

The output generated by using --routines contains CREATE PROCEDURE and CREATE FUNCTION statements to create the routines.
- --skip-generated-invisible-primary-key

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--skip-generated-invisible-primary- \\
key
\end{tabular} \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

This option causes generated invisible primary keys to be excluded from the output. For more information, see Section 15.1.20.11, "Generated Invisible Primary Keys".
- --tables

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - tables \\
\hline
\end{tabular}

Override the --databases or -B option. mysqldump regards all name arguments following the option as table names.
- --triggers

\begin{tabular}{|l|l|}
\hline Command-Line Format & --triggers \\
\hline Disabled by & skip-triggers \\
\hline
\end{tabular}

Include triggers for each dumped table in the output. This option is enabled by default; disable it with --skip-triggers.

To be able to dump a table's triggers, you must have the TRIGGER privilege for the table.
Multiple triggers are permitted. mysqldump dumps triggers in activation order so that when the dump file is reloaded, triggers are created in the same activation order. However, if a mysqldump dump file contains multiple triggers for a table that have the same trigger event and action time, an error occurs for attempts to load the dump file into an older server that does not support multiple triggers. (For a workaround, see Downgrade Notes; you can convert triggers to be compatible with older servers.)
- --where='where_condition',-w 'where_condition'

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- where='where_condition' \\
\hline
\end{tabular}

Dump only rows selected by the given WHERE condition. Quotes around the condition are mandatory if it contains spaces or other characters that are special to your command interpreter.

Examples:
```
--where="user='jimf'"
-w"userid>1"
```

-w"userid<1"

\section*{Performance Options}

The following options are the most relevant for the performance particularly of the restore operations. For large data sets, restore operation (processing the INSERT statements in the dump file) is the most time-consuming part. When it is urgent to restore data quickly, plan and test the performance of this stage in advance. For restore times measured in hours, you might prefer an alternative backup and restore solution, such as MySQL Enterprise Backup for InnoDB-only and mixed-use databases.

Performance is also affected by the transactional options, primarily for the dump operation.
- --column-statistics

\begin{tabular}{|l|l|}
\hline Command-Line Format & --column-statistics \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Add ANALYZE TABLE statements to the output to generate histogram statistics for dumped tables when the dump file is reloaded. This option is disabled by default because histogram generation for large tables can take a long time.
- --disable-keys, -K

\begin{tabular}{|l|l|}
\hline Command-Line Format & --disable-keys \\
\hline
\end{tabular}

For each table, surround the INSERT statements with /*!40000 ALTER TABLE tbl_name DISABLE KEYS */; and /*!40000 ALTER TABLE tbl_name ENABLE KEYS */; statements. This makes loading the dump file faster because the indexes are created after all rows are inserted. This option is effective only for nonunique indexes of MyISAM tables.
- --extended-insert, -e

\begin{tabular}{|l|l|}
\hline Command-Line Format & --extended-insert \\
\hline Disabled by & skip-extended-insert \\
\hline
\end{tabular}

Write INSERT statements using multiple-row syntax that includes several VALUES lists. This results in a smaller dump file and speeds up inserts when the file is reloaded.
- --insert-ignore

\begin{tabular}{|l|l|}
\hline Command-Line Format & --insert-ignore \\
\hline
\end{tabular}

Write INSERT IGNORE statements rather than INSERT statements.
- --max-allowed-packet=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - max-allowed - packet=value \\
\hline Type & Numeric \\
\hline Default Value & 25165824 \\
\hline
\end{tabular}

The maximum size of the buffer for client/server communication. The default is 24 MB , the maximum is 1 GB .

\section*{Note}

The value of this option is specific to mysqldump and should not be confused with the MySQL server's max_allowed_packet system variable; the server value cannot be exceeded by a single packet from mysqldump, regardless of any setting for the mysqldump option, even if the latter is larger.
- --mysqld-long-query-time=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqld-long-query-time=value \\
\hline Type & Numeric \\
\hline Default Value & Server global setting \\
\hline
\end{tabular}

Set the session value of the long_query_time system variable. Use this option if you want to increase the time allowed for queries from mysqldump before they are logged to the slow query log file. mysqldump performs a full table scan, which means its queries can often exceed a global long_query_time setting that is useful for regular queries. The default global setting is 10 seconds.

You can use--mysqld-long-query-time to specify a session value from 0 (meaning that every query from mysqldump is logged to the slow query log) to 31536000 , which is 365 days in seconds. For mysqldump's option, you can only specify whole seconds. When you do not specify this option, the server's global setting applies to mysqldump's queries.
- --net-buffer-length=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - net - buffer - length=value \\
\hline Type & Numeric \\
\hline Default Value & 16384 \\
\hline
\end{tabular}

The initial size of the buffer for client/server communication. When creating multiple-row INSERT statements (as with the --extended-insert or--opt option), mysqldump creates rows up to --net-buffer-length bytes long. If you increase this variable, ensure that the MySQL server net_buffer_length system variable has a value at least this large.
- --network-timeout, -M

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - network - timeout $[=\{0 \mid 1\}]$ \\
\hline Type & Boolean \\
\hline Default Value & TRUE \\
\hline
\end{tabular}

Enable large tables to be dumped by setting --max-allowed-packet to its maximum value and network read and write timeouts to a large value. This option is enabled by default. To disable it, use --skip-network-timeout.
- --opt

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -opt \\
\hline Disabled by & skip-opt \\
\hline \hline
\end{tabular}
--set-charset. It gives a fast dump operation and produces a dump file that can be reloaded into a MySQL server quickly.

Because the--opt option is enabled by default, you only specify its converse, the--skip-opt to turn off several default settings. See the discussion of mysqldump option groups for information about selectively enabling or disabling a subset of the options affected by --opt.
- --quick, -q

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -quick \\
\hline Disabled by & skip-quick \\
\hline
\end{tabular}

This option is useful for dumping large tables. It forces mysqldump to retrieve rows for a table from the server a row at a time rather than retrieving the entire row set and buffering it in memory before writing it out.
- --skip-opt

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-opt \\
\hline
\end{tabular}

See the description for the --opt option.

\section*{Transactional Options}

The following options trade off the performance of the dump operation, against the reliability and consistency of the exported data.
- --add-locks

\begin{tabular}{|l|l|}
\hline Command-Line Format & --add-locks \\
\hline
\end{tabular}

Surround each table dump with LOCK TABLES and UNLOCK TABLES statements. This results in faster inserts when the dump file is reloaded. See Section 10.2.5.1, "Optimizing INSERT Statements".
- --flush-logs, -F

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- flush-logs \\
\hline
\end{tabular}

Flush the MySQL server log files before starting the dump. This option requires the RELOAD privilege. If you use this option in combination with the --all-databases option, the logs are flushed for each database dumped. The exception is when using--lock-all-tables, -source-data, or--single-transaction. In these cases, the logs are flushed only once, corresponding to the moment that all tables are locked by FLUSH TABLES WITH READ LOCK. If you want your dump and the log flush to happen at exactly the same moment, you should use --flush-logs together with --lock-all-tables, --source-data, or --singletransaction.
- --flush-privileges

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- flush-privileges \\
\hline
\end{tabular}

Add a FLUSH PRIVILEGES statement to the dump output after dumping the mysql database. This option should be used any time the dump contains the mysql database and any other database that depends on the data in the mysql database for proper restoration.

Because the dump file contains a FLUSH PRIVILEGES statement, reloading the file requires privileges sufficient to execute that statement.
- --lock-all-tables, -x

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lock-all-tables \\
\hline
\end{tabular}

Lock all tables across all databases. This is achieved by acquiring a global read lock for the duration of the whole dump. This option automatically turns off--single-transaction and--locktables.
- --lock-tables, -l

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lock-tables \\
\hline
\end{tabular}

For each dumped database, lock all tables to be dumped before dumping them. The tables are locked with READ LOCAL to permit concurrent inserts in the case of MyISAM tables. For transactional tables such as InnoDB, --single-transaction is a much better option than--lock-tables because it does not need to lock the tables at all.

Because--lock-tables locks tables for each database separately, this option does not guarantee that the tables in the dump file are logically consistent between databases. Tables in different databases may be dumped in completely different states.

Some options, such as --opt, automatically enable--lock-tables. If you want to override this, use--skip-lock-tables at the end of the option list.
- --no-autocommit

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - autocommit \\
\hline
\end{tabular}

Enclose the INSERT statements for each dumped table within SET autocommit $=0$ and COMMIT statements.
- --order-by-primary

\begin{tabular}{|l|l|}
\hline Command-Line Format & --order-by-primary \\
\hline
\end{tabular}

Dump each table's rows sorted by its primary key, or by its first unique index, if such an index exists. This is useful when dumping a MyISAM table to be loaded into an InnoDB table, but makes the dump operation take considerably longer.
- --shared-memory-base-name=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - shared - memory - base - name=name \\
\hline Platform Specific & Windows \\
\hline
\end{tabular}

On Windows, the shared-memory name to use for connections made using shared memory to a lond server. The default value is MYSQL. The shared-memory name is case-sensitive.

This option applies only if the server was started with the shared_memory system variable enabled
- --single-transaction

\begin{tabular}{|l|l|}
\hline Command-Line Format & --single-transaction \\
\hline
\end{tabular}

This option sets the transaction isolation mode to REPEATABLE READ and sends a START TRANSACTION SQL statement to the server before dumping data. It is useful only with transactional tables such as InnoDB, because then it dumps the consistent state of the database at the time when START TRANSACTION was issued without blocking any applications.

The RELOAD or FLUSH_TABLES privilege is required with --single-transaction if both gtid_mode=ON and gtid_purged=ON | AUTO.

When using this option, you should keep in mind that only InnoDB tables are dumped in a consistent state. For example, any MyISAM or MEMORY tables dumped while using this option may still change state.

While a--single-transaction dump is in process, to ensure a valid dump file (correct table contents and binary log coordinates), no other connection should use the following statements: ALTER TABLE, CREATE TABLE, DROP TABLE, RENAME TABLE, TRUNCATE TABLE. A consistent read is not isolated from those statements, so use of them on a table to be dumped can cause the SELECT that is performed by mysqldump to retrieve the table contents to obtain incorrect contents or fail.

The--single-transaction option and the--lock-tables option are mutually exclusive because LOCK TABLES causes any pending transactions to be committed implicitly.

To dump large tables, combine the --single-transaction option with the --quick option.

\section*{Option Groups}
- The --opt option turns on several settings that work together to perform a fast dump operation. All of these settings are on by default, because --opt is on by default. Thus you rarely if ever specify --opt. Instead, you can turn these settings off as a group by specifying --skip-opt, then optionally re-enable certain settings by specifying the associated options later on the command line.
- The --compact option turns off several settings that control whether optional statements and comments appear in the output. Again, you can follow this option with other options that re-enable certain settings, or turn all the settings on by using the --skip-compact form.

When you selectively enable or disable the effect of a group option, order is important because options are processed first to last. For example, --disable-keys --lock-tables --skip-opt would not have the intended effect; it is the same as--skip-opt by itself.

\section*{Examples}

To make a backup of an entire database:
mysqldump db_name > backup-file.sql
To load the dump file back into the server:
mysql db_name < backup-file.sql
Another way to reload the dump file:
mysql -e "source /path-to-backup/backup-file.sql" db_name
mysqldump is also very useful for populating databases by copying data from one MySQL server to another:
mysqldump --opt db_name | mysql --host=remote_host -c db_name

You can dump several databases with one command:
```
mysqldump --databases db_name1 [db_name2 ...] > my_databases.sql
```


To dump all databases, use the --all-databases option:
```
mysqldump --all-databases > all_databases.sql
```


For InnoDB tables, mysqldump provides a way of making an online backup:
```
mysqldump --all-databases --source-data --single-transaction > all_databases.sql
```


This backup acquires a global read lock on all tables (using FLUSH TABLES WITH READ LOCK) at the beginning of the dump. As soon as this lock has been acquired, the binary log coordinates are read and the lock is released. If long updating statements are running when the FLUSH statement is issued, the MySQL server may get stalled until those statements finish. After that, the dump becomes lock free and does not disturb reads and writes on the tables. If the update statements that the MySQL server receives are short (in terms of execution time), the initial lock period should not be noticeable, even with many updates.

For point-in-time recovery (also known as "roll-forward," when you need to restore an old backup and replay the changes that happened since that backup), it is often useful to rotate the binary log (see Section 7.4.4, "The Binary Log") or at least know the binary log coordinates to which the dump corresponds:
```
mysqldump --all-databases --source-data=2 > all_databases.sql
```


Or:
```
mysqldump --all-databases --flush-logs --source-data=2 > all_databases.sql
```


The --source-data option can be used simultaneously with the --single-transaction option, which provides a convenient way to make an online backup suitable for use prior to point-in-time recovery if tables are stored using the InnoDB storage engine.

For more information on making backups, see Section 9.2, "Database Backup Methods", and Section 9.3, "Example Backup and Recovery Strategy".
- To select the effect of --opt except for some features, use the --skip option for each feature. To disable extended inserts and memory buffering, use --opt --skip-extended-insert--skipquick. (Actually, --skip-extended-insert--skip-quick is sufficient because--opt is on by default.)
- To reverse --opt for all features except disabling of indexes and table locking, use --skip-opt --disable-keys --lock-tables.

\section*{Restrictions}
mysqldump does not dump the performance_schema or sys schema by default. To dump any of these, name them explicitly on the command line. You can also name them with the --databases option. For performance_schema, also use the --skip-lock-tables option.
mysqldump does not dump the INFORMATION_SCHEMA schema.
mysqldump does not dump InnoDB CREATE TABLESPACE statements.
mysqldump does not dump the NDB Cluster ndbinfo information database.
mysqldump includes statements to recreate the general_log and slow_query_log tables for dumps of the mysql database. Log table contents are not dumped.

If you encounter problems backing up views due to insufficient privileges, see Section 27.9, "Restrictions on Views" for a workaround.

\subsection*{6.5.5 mysqlimport - A Data Import Program}

The mysqlimport client provides a command-line interface to the LOAD DATA SQL statement. Most options to mysqlimport correspond directly to clauses of LOAD DATA syntax. See Section 15.2.9, "LOAD DATA Statement".

Invoke mysqlimport like this:
mysqlimport [options] db_name textfile1 [textfile2 ...]
For each text file named on the command line, mysqlimport strips any extension from the file name and uses the result to determine the name of the table into which to import the file's contents. For example, files named patient.txt, patient.text, and patient all would be imported into a table named patient.
mysqlimport supports the following options, which can be specified on the command line or in the [mysqlimport] and [client] groups of an option file. For information about option files used by MySQL programs, see Section 6.2.2.2, "Using Option Files".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.14 mysqlimport Options}
\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --bind-address & Use specified network interface to connect to MySQL Server \\
\hline --character-sets-dir & Directory where character sets can be found \\
\hline --columns & This option takes a comma-separated list of column names as its value \\
\hline --compress & Compress all information sent between client and server \\
\hline --compression-algorithms & Permitted compression algorithms for connections to server \\
\hline --debug & Write debugging log \\
\hline --debug-check & Print debugging information when program exits \\
\hline --debug-info & Print debugging information, memory, and CPU statistics when program exits \\
\hline --default-auth & Authentication plugin to use \\
\hline --default-character-set & Specify default character set \\
\hline --defaults-extra-file & Read named option file in addition to usual option files \\
\hline --defaults-file & Read only named option file \\
\hline --defaults-group-suffix & Option group suffix value \\
\hline --delete & Empty the table before importing the text file \\
\hline --enable-cleartext-plugin & Enable cleartext authentication plugin \\
\hline --fields-enclosed-by & This option has the same meaning as the corresponding clause for LOAD DATA \\
\hline --fields-escaped-by & This option has the same meaning as the corresponding clause for LOAD DATA \\
\hline --fields-optionally-enclosed-by & This option has the same meaning as the corresponding clause for LOAD DATA \\
\hline --fields-terminated-by & This option has the same meaning as the corresponding clause for LOAD DATA \\
\hline --force & Continue even if an SQL error occurs \\
\hline --get-server-public-key & Request RSA public key from server \\
\hline --help & Display help message and exit \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --host & Host on which MySQL server is located \\
\hline --ignore & See the description for the --replace option \\
\hline --ignore-lines & Ignore the first N lines of the data file \\
\hline --lines-terminated-by & This option has the same meaning as the corresponding clause for LOAD DATA \\
\hline --local & Read input files locally from the client host \\
\hline --lock-tables & Lock all tables for writing before processing any text files \\
\hline --login-path & Read login path options from .mylogin.cnf \\
\hline --low-priority & Use LOW_PRIORITY when loading the table \\
\hline --no-defaults & Read no option files \\
\hline --no-login-paths & Do not read login paths from the login path file \\
\hline --password & Password to use when connecting to server \\
\hline --password1 & First multifactor authentication password to use when connecting to server \\
\hline --password2 & Second multifactor authentication password to use when connecting to server \\
\hline --password3 & Third multifactor authentication password to use when connecting to server \\
\hline --pipe & Connect to server using named pipe (Windows only) \\
\hline --plugin-dir & Directory where plugins are installed \\
\hline --port & TCP/IP port number for connection \\
\hline --print-defaults & Print default options \\
\hline --protocol & Transport protocol to use \\
\hline --replace & The --replace and --ignore options control handling of input rows that duplicate existing rows on unique key values \\
\hline --server-public-key-path & Path name to file containing RSA public key \\
\hline --shared-memory-base-name & Shared-memory name for shared-memory connections (Windows only) \\
\hline --silent & Produce output only when errors occur \\
\hline --socket & Unix socket file or Windows named pipe to use \\
\hline --ssl-ca & File that contains list of trusted SSL Certificate Authorities \\
\hline --ssl-capath & Directory that contains trusted SSL Certificate Authority certificate files \\
\hline --ssl-cert & File that contains X. 509 certificate \\
\hline --ssl-cipher & Permissible ciphers for connection encryption \\
\hline --ssl-crl & File that contains certificate revocation lists \\
\hline --ssl-crlpath & Directory that contains certificate revocation-list files \\
\hline --ssl-fips-mode & Whether to enable FIPS mode on client side \\
\hline --ssl-key & File that contains X. 509 key \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --ssl-mode & Desired security state of connection to server \\
\hline --ssl-session-data & File that contains SSL session data \\
\hline --ssl-session-data-continue-on-failed-reuse & Whether to establish connections if session reuse fails \\
\hline --tls-ciphersuites & Permissible TLSv1.3 ciphersuites for encrypted connections \\
\hline --tls-sni-servername & Server name supplied by the client \\
\hline --tls-version & Permissible TLS protocols for encrypted connections \\
\hline --use-threads & Number of threads for parallel file-loading \\
\hline --user & MySQL user name to use when connecting to server \\
\hline --verbose & Verbose mode \\
\hline --version & Display version information and exit \\
\hline --zstd-compression-level & Compression level for connections to server that use zstd compression \\
\hline
\end{tabular}
- --help, -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- help \\
\hline
\end{tabular}

Display a help message and exit.
- --bind-address=ip_address

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - bind - address=ip_address \\
\hline
\end{tabular}

On a computer having multiple network interfaces, use this option to select which interface to use for connecting to the MySQL server.
- --character-sets-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

The directory where character sets are installed. See Section 12.15, "Character Set Configuration".
- --columns=column_list, -c column_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & --columns=column_list \\
\hline
\end{tabular}

This option takes a list of comma-separated column names as its value. The order of the column names indicates how to match data file columns with table columns.
- --compress, -C

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -compress $[=\{\mathrm{OFF} \mid \mathrm{ON}\}]$ \\
\hline Deprecated & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Compress all information sent between the client and the server if possible. See Section 6.2.8, "Connection Compression Control".

This option is deprecated. Expect it to be removed in a future version of MySQL. See Configuring Legacy Connection Compression.
- --compression-algorithms=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & --compression-algorithms=value \\
\hline Type & Set \\
\hline Default Value & uncompressed \\
\hline Valid Values & \begin{tabular}{l}
zlib \\
zstd \\
uncompressed
\end{tabular} \\
\hline
\end{tabular}

The permitted compression algorithms for connections to the server. The available algorithms are the same as for the protocol_compression_algorithms system variable. The default value is uncompressed.

For more information, see Section 6.2.8, "Connection Compression Control".
- --debug[=debug_options], -\# [debug_options]

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug [=debug_options] \\
\hline Type & String \\
\hline Default Value & d: t: o \\
\hline
\end{tabular}

Write a debugging log. A typical debug_options string is $\mathrm{d}: \mathrm{t}: \mathrm{o}$, file_name. The default is d:t:o.

This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- --debug-check

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug - check \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Print some debugging information when the program exits.
This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- --debug-info

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug-info \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & FALSE \\
\hline
\end{tabular}

Print debugging information and memory and CPU usage statistics when the program exits.
This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- --default-character-set=charset_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - default - character - set=charset_name \\
\hline Type & String \\
\hline
\end{tabular}

Use charset_name as the default character set. See Section 12.15, "Character Set Configuration".
- --default-auth=plugin

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - default - auth=plugin \\
\hline Type & String \\
\hline
\end{tabular}

A hint about which client-side authentication plugin to use. See Section 8.2.17, "Pluggable Authentication".
- --defaults-extra-file=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

Read this option file after the global option file but (on Unix) before the user option file. If the file does not exist or is otherwise inaccessible, an error occurs. If file_name is not an absolute path name, it is interpreted relative to the current directory.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --defaults-file=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-file=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

Use only the given option file. If the file does not exist or is otherwise inaccessible, an error occurs. If file_name is not an absolute path name, it is interpreted relative to the current directory.

Exception: Even with --defaults-file, client programs read .mylogin.cnf.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".

\begin{tabular}{|l|l|} 
Type & String \\
\hline
\end{tabular}

Read not only the usual option groups, but also groups with the usual names and a suffix of str. For example, mysqlimport normally reads the [client] and [mysqlimport] groups. If this option is given as --defaults-group-suffix=_other, mysqlimport also reads the [client_other] and [mysqlimport_other] groups.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --delete, -D

\begin{tabular}{|l|l|}
\hline Command-Line Format & --delete \\
\hline
\end{tabular}

Empty the table before importing the text file.
- --enable-cleartext-plugin

\begin{tabular}{|l|l|}
\hline Command-Line Format & --enable-cleartext-plugin \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Enable the mysql_clear_password cleartext authentication plugin. (See Section 8.4.1.4, "ClientSide Cleartext Pluggable Authentication".)
- --fields-terminated-by=...,--fields-enclosed-by=...,--fields-optionally-enclosed-by=...,--fields-escaped-by=...

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- fields - terminated - by=string \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- fields - enclosed - by=string \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--fields-optionally-enclosed- \\
by=string
\end{tabular} \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- fields - escaped - by \\
\hline Type & String \\
\hline
\end{tabular}
- --force, -f

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - force \\
\hline
\end{tabular}

Ignore errors. For example, if a table for a text file does not exist, continue processing any remaining files. Without --force, mysqlimport exits if a table does not exist.
- --get-server-public-key

\begin{tabular}{|l|l|}
\hline Command-Line Format & --get-server-public-key \\
\hline Type & Boolean \\
\hline
\end{tabular}

Request from the server the public key required for RSA key pair-based password exchange. This option applies to clients that authenticate with the caching_sha2_password authentication plugin. For that plugin, the server does not send the public key unless requested. This option is ignored for accounts that do not authenticate with that plugin. It is also ignored if RSA-based password exchange is not used, as is the case when the client connects to the server using a secure connection.

If --server-public-key-path=file_name is given and specifies a valid public key file, it takes precedence over--get-server-public-key.

For information about the caching_sha2_password plugin, see Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".
- --host=host_name, -h host_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- host=host_name \\
\hline Type & String \\
\hline Default Value & localhost \\
\hline
\end{tabular}

Import data to the MySQL server on the given host. The default host is localhost.
- --ignore, -i

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ignore \\
\hline
\end{tabular}

See the description for the --replace option.
- --ignore-lines= $N$

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ignore-lines=\# \\
\hline Type & Numeric \\
\hline
\end{tabular}

Ignore the first $N$ lines of the data file.
- --lines-terminated-by=...

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- lines - terminated - by=string \\
\hline Type & String \\
\hline
\end{tabular}

This option has the same meaning as the corresponding clause for LOAD DATA. For example, to import Windows files that have lines terminated with carriage return/linefeed pairs, use --lines-
terminated-by="\r \n". (You might have to double the backslashes, depending on the escaping conventions of your command interpreter.) See Section 15.2.9, "LOAD DATA Statement".
- --local, - L

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- local \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

By default, files are read by the server on the server host. With this option, mysqlimport reads input files locally on the client host.

Successful use of LOCAL load operations within mysqlimport also requires that the server permits local loading; see Section 8.1.6, "Security Considerations for LOAD DATA LOCAL"
- --lock-tables, -l

\begin{tabular}{|l|l|}
\hline Command-Line Format & --lock-tables \\
\hline
\end{tabular}

Lock all tables for writing before processing any text files. This ensures that all tables are synchronized on the server.
- --login-path=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login-path=name \\
\hline Type & String \\
\hline
\end{tabular}

Read options from the named login path in the .mylogin. cnf login path file. A "login path" is an option group containing options that specify which MySQL server to connect to and which account to authenticate as. To create or modify a login path file, use the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
See--login-path for related information.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --low-priority
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --no-defaults \\
\hline
\end{tabular}

Do not read any option files. If program startup fails due to reading unknown options from an option file, --no-defaults can be used to prevent them from being read.

The exception is that the .mylogin. cnf file is read in all cases, if it exists. This permits passwords to be specified in a safer way than on the command line even when --no-defaults is used. To create. mylogin.cnf, use the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --password[=password], -p[password]

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- password [=password] \\
\hline Type & String \\
\hline
\end{tabular}

The password of the MySQL account used for connecting to the server. The password value is optional. If not given, mysqlimport prompts for one. If given, there must be no space between -password= or -p and the password following it. If no password option is specified, the default is to send no password.

Specifying a password on the command line should be considered insecure. To avoid giving the password on the command line, use an option file. See Section 8.1.2.1, "End-User Guidelines for Password Security".

To explicitly specify that there is no password and that mysqlimport should not prompt for one, use the --skip-password option.
- --password1[=pass_val]

The password for multifactor authentication factor 1 of the MySQL account used for connecting to the server. The password value is optional. If not given, mysqlimport prompts for one. If given, there must be no space between --password1= and the password following it. If no password option is specified, the default is to send no password.

Specifying a password on the command line should be considered insecure. To avoid giving the password on the command line, use an option file. See Section 8.1.2.1, "End-User Guidelines for Password Security".

To explicitly specify that there is no password and that mysqlimport should not prompt for one, use the --skip-password1 option.
--password1 and --password are synonymous, as are--skip-password1 and --skippassword.
- --password2[=pass_val]

The password for multifactor authentication factor 2 of the MySQL account used for connecting to the server. The semantics of this option are similar to the semantics for --password1; see the description of that option for details.
- --password3[=pass_val]

The password for multifactor authentication factor 3 of the MySQL account used for connecting to the server. The semantics of this option are similar to the semantics for --password1; see the description of that option for details.
- --pipe, -W

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- pipe \\
\hline Type & String \\
\hline
\end{tabular}

On Windows, connect to the server using a named pipe. This option applies only if the server was started with the named_pipe system variable enabled to support named-pipe connections. In addition, the user making the connection must be a member of the Windows group specified by the named_pipe_full_access_group system variable.
- --plugin-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- plugin-dir=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

The directory in which to look for plugins. Specify this option if the --default-auth option is used to specify an authentication plugin but mysqlimport does not find it. See Section 8.2.17, "Pluggable Authentication".
- --port=port_num, -P port_num

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- port=port_num \\
\hline Type & Numeric \\
\hline Default Value & 3306 \\
\hline
\end{tabular}

For TCP/IP connections, the port number to use.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print the program name and all options that it gets from option files.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --protocol=\{TCP|SOCKET|PIPE|MEMORY\}

\begin{tabular}{|l|l|}
\hline Command-Line Format & --protocol=type \\
\hline Type & String \\
\hline Default Value & [see text] \\
\hline Valid Values & \begin{tabular}{l}
TCP \\
SOCKET \\
PIPE \\
MEMORY
\end{tabular} \\
\hline
\end{tabular}

The transport protocol to use for connecting to the server. It is useful when the other connection parameters normally result in use of a protocol other than the one you want. For details on the permissible values, see Section 6.2.7, "Connection Transport Protocols".
- --replace, -r

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - replace \\
\hline
\end{tabular}

The --replace and --ignore options control handling of input rows that duplicate existing rows on unique key values. If you specify - - replace, new rows replace existing rows that have the same unique key value. If you specify--ignore, input rows that duplicate an existing row on a unique key value are skipped. If you do not specify either option, an error occurs when a duplicate key value is found, and the rest of the text file is ignored.
- --server-public-key-path=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -server - public - key - path=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

The path name to a file in PEM format containing a client-side copy of the public key required by the server for RSA key pair-based password exchange. This option applies to clients that authenticate with the sha256_password (deprecated) or caching_sha2_password authentication plugin. This option is ignored for accounts that do not authenticate with one of those plugins. It is also ignored if RSA-based password exchange is not used, as is the case when the client connects to the server using a secure connection.

If --server-public-key-path=file_name is given and specifies a valid public key file, it takes precedence over--get-server-public-key.

For sha256_password (deprecated), this option applies only if MySQL was built using OpenSSL.
For information about the sha256_password and caching_sha2_password plugins, see Section 8.4.1.3, "SHA-256 Pluggable Authentication", and Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".
- --shared-memory-base-name=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - shared - memory - base - name $=$ name \\
\hline Platform Specific & Windows \\
\hline
\end{tabular}

On Windows, the shared-memory name to use for connections made using shared memory to a local server. The default value is MYSQL. The shared-memory name is case-sensitive.

This option applies only if the server was started with the shared_memory system variable enabled to support shared-memory connections.
- --silent, -s

\begin{tabular}{|l|l|}
\hline Command-Line Format & --silent \\
\hline
\end{tabular}
- --socket=path, -s path

\begin{tabular}{|l|l|}
\hline Command-Line Format & --socket=\{file_name|pipe_name $\}$ \\
\hline Type & String \\
\hline
\end{tabular}

For connections to localhost, the Unix socket file to use, or, on Windows, the name of the named pipe to use.

On Windows, this option applies only if the server was started with the named_pipe system variable enabled to support named-pipe connections. In addition, the user making the connection must be a member of the Windows group specified by the named_pipe_full_access_group system variable.
- --ssl*

Options that begin with --ssl specify whether to connect to the server using encryption and indicate where to find SSL keys and certificates. See Command Options for Encrypted Connections.
- --ssl-fips-mode=\{OFF|ON|STRICT\}

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-fips-mode=\{OFF | ON | STRICT\} \\
\hline Deprecated & Yes \\
\hline Type & Enumeration \\
\hline Default Value & OFF \\
\hline Valid Values & \begin{tabular}{l}
OFF \\
ON \\
STRICT
\end{tabular} \\
\hline
\end{tabular}

Controls whether to enable FIPS mode on the client side. The --ssl-fips-mode option differs from other --ssl- $x x x$ options in that it is not used to establish encrypted connections, but rather to affect which cryptographic operations to permit. See Section 8.8, "FIPS Support".

These--ssl-fips-mode values are permitted:
- OFF: Disable FIPS mode.
- ON: Enable FIPS mode.
- STRICT: Enable "strict" FIPS mode.

\section*{Note}

If the OpenSSL FIPS Object Module is not available, the only permitted value for --ssl-fips-mode is OFF. In this case, setting --ssl-fips-mode to ON or STRICT causes the client to produce a warning at startup and to operate in non-FIPS mode.

This option is deprecated. Expect it to be removed in a future version of MySQL.
- --tls-ciphersuites=ciphersuite_list

\begin{tabular}{|l|l|} 
Type & String \\
\hline
\end{tabular}

The permissible ciphersuites for encrypted connections that use TLSv1.3. The value is a list of one or more colon-separated ciphersuite names. The ciphersuites that can be named for this option depend on the SSL library used to compile MySQL. For details, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".
- --tls-sni-servername=server_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tls-sni-servername=server_name \\
\hline Type & String \\
\hline
\end{tabular}

When specified, the name is passed to the libmysqlclient C API library using the MYSQL_OPT_TLS_SNI_SERVERNAME option of mysql_options(). The server name is not casesensitive. To show which server name the client specified for the current session, if any, check the Tls_sni_server_name status variable.

Server Name Indication (SNI) is an extension to the TLS protocol (OpenSSL must be compiled using TLS extensions for this option to function). The MySQL implementation of SNI represents the clientside only.
- --tls-version=protocol_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tls-version=protocol_list \\
\hline Type & String \\
\hline Default Value & \begin{tabular}{l}
TLSv1, TLSv1.1, TLSv1.2, TLSv1.3 (OpenSSL 1.1.1 or higher) \\
TLSv1, TLSv1.1, TLSv1.2 (otherwise)
\end{tabular} \\
\hline
\end{tabular}

The permissible TLS protocols for encrypted connections. The value is a list of one or more commaseparated protocol names. The protocols that can be named for this option depend on the SSL library used to compile MySQL. For details, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".
- --user=user_name, - u user_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - user=user_name, \\
\hline Type & String \\
\hline
\end{tabular}

The user name of the MySQL account to use for connecting to the server.
- --use-threads= $N$

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - use - threads $=\#$ \\
\hline Type & Numeric \\
\hline
\end{tabular}

Load files in parallel using $N$ threads.
- --verbose, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & --verbose \\
\hline
\end{tabular}

Verbose mode. Print more information about what the program does.
- --version, -V

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.
- --zstd-compression-level=level

\begin{tabular}{|l|l|}
\hline Command-Line Format & --zstd-compression-level=\# \\
\hline Type & Integer \\
\hline
\end{tabular}

The compression level to use for connections to the server that use the zstd compression algorithm. The permitted levels are from 1 to 22, with larger values indicating increasing levels of compression. The default zstd compression level is 3 . The compression level setting has no effect on connections that do not use zstd compression.

For more information, see Section 6.2.8, "Connection Compression Control".
Here is a sample session that demonstrates use of mysqlimport:
```
$> mysql -e 'CREATE TABLE imptest(id INT, n VARCHAR(30))' test
$> ed
a
100 Max Sydow
101 Count Dracula
.
w imptest.txt
32
q

\begin{tabular}{|l|l|l|l|l|l|l|l|l|l|l|l|l|l|l|l|}
\hline \multicolumn{16}{|l|}{\$> od -c imptest.txt} \\
\hline 0000000 & 1 & 0 & 0 & \t & M & a & x & S & y & d & o & w & \n & 1 & 0 \\
\hline 0000020 & 1 & \t & C & o & u & n & t & D & r & a & C & u & 1 & a & \n \\
\hline
\end{tabular}
0000040
$> mysqlimport --local test imptest.txt
test.imptest: Records: 2 Deleted: 0 Skipped: 0 Warnings: 0
$> mysql -e 'SELECT * FROM imptest' test
+------+---------------+
| id | n |
+------+----------------+
| 100 | Max Sydow |
| 101 | Count Dracula |
+------+----------------+
```


\subsection*{6.5.6 mysqlshow - Display Database, Table, and Column Information}

The mysqlshow client can be used to quickly see which databases exist, their tables, or a table's columns or indexes.
mysqlshow provides a command-line interface to several SQL SHOW statements. See Section 15.7.7, "SHOW Statements". The same information can be obtained by using those statements directly. For example, you can issue them from the mysql client program.

Invoke mysqlshow like this:
```
mysqlshow [options] [db_name [tbl_name [col_name]]]
```

- If no database is given, a list of database names is shown.
- If no table is given, all matching tables in the database are shown.
- If no column is given, all matching columns and column types in the table are shown.

The output displays only the names of those databases, tables, or columns for which you have some privileges.

If the last argument contains shell or SQL wildcard characters (*, ?, \%, or _), only those names that are matched by the wildcard are shown. If a database name contains any underscores, those should be escaped with a backslash (some Unix shells require two) to get a list of the proper tables or columns. * and ? characters are converted into SQL \% and _ wildcard characters. This might cause some confusion when you try to display the columns for a table with a _ in the name, because in this case, mysqlshow shows you only the table names that match the pattern. This is easily fixed by adding an extra \% last on the command line as a separate argument.
mysqlshow supports the following options, which can be specified on the command line or in the [mysqlshow] and [client] groups of an option file. For information about option files used by MySQL programs, see Section 6.2.2.2, "Using Option Files".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.15 mysqlshow Options}
\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --bind-address & Use specified network interface to connect to MySQL Server \\
\hline --character-sets-dir & Directory where character sets can be found \\
\hline --compress & Compress all information sent between client and server \\
\hline --compression-algorithms & Permitted compression algorithms for connections to server \\
\hline --count & Show the number of rows per table \\
\hline --debug & Write debugging log \\
\hline --debug-check & Print debugging information when program exits \\
\hline --debug-info & Print debugging information, memory, and CPU statistics when program exits \\
\hline --default-auth & Authentication plugin to use \\
\hline --default-character-set & Specify default character set \\
\hline --defaults-extra-file & Read named option file in addition to usual option files \\
\hline --defaults-file & Read only named option file \\
\hline --defaults-group-suffix & Option group suffix value \\
\hline --enable-cleartext-plugin & Enable cleartext authentication plugin \\
\hline --get-server-public-key & Request RSA public key from server \\
\hline --help & Display help message and exit \\
\hline --host & Host on which MySQL server is located \\
\hline --keys & Show table indexes \\
\hline --login-path & Read login path options from .mylogin.cnf \\
\hline --no-defaults & Read no option files \\
\hline --no-login-paths & Do not read login paths from the login path file \\
\hline --password & Password to use when connecting to server \\
\hline --password1 & First multifactor authentication password to use when connecting to server \\
\hline --password2 & Second multifactor authentication password to use when connecting to server \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --password3 & Third multifactor authentication password to use when connecting to server \\
\hline --pipe & Connect to server using named pipe (Windows only) \\
\hline --plugin-dir & Directory where plugins are installed \\
\hline --port & TCP/IP port number for connection \\
\hline --print-defaults & Print default options \\
\hline --protocol & Transport protocol to use \\
\hline --server-public-key-path & Path name to file containing RSA public key \\
\hline --shared-memory-base-name & Shared-memory name for shared-memory connections (Windows only) \\
\hline --show-table-type & Show a column indicating the table type \\
\hline --socket & Unix socket file or Windows named pipe to use \\
\hline --ssl-ca & File that contains list of trusted SSL Certificate Authorities \\
\hline --ssl-capath & Directory that contains trusted SSL Certificate Authority certificate files \\
\hline --ssl-cert & File that contains X. 509 certificate \\
\hline --ssl-cipher & Permissible ciphers for connection encryption \\
\hline --ssl-crl & File that contains certificate revocation lists \\
\hline --ssl-crlpath & Directory that contains certificate revocation-list files \\
\hline --ssl-fips-mode & Whether to enable FIPS mode on client side \\
\hline --ssl-key & File that contains X. 509 key \\
\hline --ssl-mode & Desired security state of connection to server \\
\hline --ssl-session-data & File that contains SSL session data \\
\hline --ssl-session-data-continue-on-failed-reuse & Whether to establish connections if session reuse fails \\
\hline --status & Display extra information about each table \\
\hline --tls-ciphersuites & Permissible TLSv1.3 ciphersuites for encrypted connections \\
\hline --tls-sni-servername & Server name supplied by the client \\
\hline --tls-version & Permissible TLS protocols for encrypted connections \\
\hline --user & MySQL user name to use when connecting to server \\
\hline --verbose & Verbose mode \\
\hline --version & Display version information and exit \\
\hline --zstd-compression-level & Compression level for connections to server that use zstd compression \\
\hline
\end{tabular}
- --help, -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display a help message and exit.
- --bind-address=ip_address

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - bind - address=ip_address \\
\hline
\end{tabular}

On a computer having multiple network interfaces, use this option to select which interface to use for connecting to the MySQL server.
- --character-sets-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -character -sets - dir=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

The directory where character sets are installed. See Section 12.15, "Character Set Configuration".
- --compress, -C

\begin{tabular}{|l|l|}
\hline Command-Line Format & --compress $[=\{$ OFF $\mid$ ON $\}]$ \\
\hline Deprecated & Yes \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Compress all information sent between the client and the server if possible. See Section 6.2.8, "Connection Compression Control".

This option is deprecated. Expect it to be removed in a future version of MySQL. See Configuring Legacy Connection Compression.
- --compression-algorithms=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & --compression-algorithms=value \\
\hline Type & Set \\
\hline Default Value & uncompressed \\
\hline Valid Values & \begin{tabular}{l}
zlib \\
zstd \\
uncompressed
\end{tabular} \\
\hline
\end{tabular}

The permitted compression algorithms for connections to the server. The available algorithms are the same as for the protocol_compression_algorithms system variable. The default value is uncompressed.
- --count

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - count \\
\hline
\end{tabular}

Show the number of rows per table. This can be slow for non-MyISAM tables.
- --debug[=debug_options], -\# [debug_options]

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug [=debug_options] \\
\hline Type & String \\
\hline Default Value & d: t:o \\
\hline
\end{tabular}

Write a debugging log. A typical debug_options string is $\mathrm{d}: \mathrm{t}: \mathrm{o}$,file_name. The default is d:t:o.

This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- --debug-check

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug - check \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Print some debugging information when the program exits.
This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- --debug-info

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug - info \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Print debugging information and memory and CPU usage statistics when the program exits.
This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- --default-character-set=charset_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --default-character-set=charset_name \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
\hline
\end{tabular}

A hint about which client-side authentication plugin to use. See Section 8.2.17, "Pluggable Authentication".
- --defaults-extra-file=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

Read this option file after the global option file but (on Unix) before the user option file. If the file does not exist or is otherwise inaccessible, an error occurs. If file_name is not an absolute path name, it is interpreted relative to the current directory.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --defaults-file=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-file=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

Use only the given option file. If the file does not exist or is otherwise inaccessible, an error occurs. If file_name is not an absolute path name, it is interpreted relative to the current directory.

Exception: Even with --defaults-file, client programs read .mylogin.cnf.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --defaults-group-suffix=str

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=str \\
\hline Type & String \\
\hline
\end{tabular}

Read not only the usual option groups, but also groups with the usual names and a suffix of str. For example, mysqlshow normally reads the [client] and [mysqlshow] groups. If this option is given as --defaults-group-suffix=_other, mysqlshow also reads the [client_other] and [mysqlshow_other] groups.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --enable-cleartext-plugin

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - enable-cleartext-plugin \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}
- --get-server-public-key

\begin{tabular}{|l|l|}
\hline Command-Line Format & --get-server-public-key \\
\hline Type & Boolean \\
\hline
\end{tabular}

Request from the server the RSA public key that it uses for key pair-based password exchange. This option applies to clients that connect to the server using an account that authenticates with the caching_sha2_password authentication plugin. For connections by such accounts, the server does not send the public key to the client unless requested. The option is ignored for accounts that do not authenticate with that plugin. It is also ignored if RSA-based password exchange is not needed, as is the case when the client connects to the server using a secure connection.

If --server-public-key-path=file_name is given and specifies a valid public key file, it takes precedence over--get-server-public-key.

For information about the caching_sha2_password plugin, see Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".
- --host=host_name, -h host_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - host=host_name \\
\hline Type & String \\
\hline Default Value & localhost \\
\hline
\end{tabular}

Connect to the MySQL server on the given host.
- --keys, -k

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - keys \\
\hline
\end{tabular}

Show table indexes.
- --login-path=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login-path=name \\
\hline Type & String \\
\hline
\end{tabular}

Read options from the named login path in the .mylogin. cnf login path file. A "login path" is an option group containing options that specify which MySQL server to connect to and which account to authenticate as. To create or modify a login path file, use the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
See--login-path for related information.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read any option files. If program startup fails due to reading unknown options from an option file, --no-defaults can be used to prevent them from being read.

The exception is that the .mylogin.cnf file is read in all cases, if it exists. This permits passwords to be specified in a safer way than on the command line even when --no-defaults is used. To create .mylogin.cnf, use the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --password[=password], -p[password]

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- password [=password] \\
\hline Type & String \\
\hline
\end{tabular}

The password of the MySQL account used for connecting to the server. The password value is optional. If not given, mysqlshow prompts for one. If given, there must be no space between password= or - p and the password following it. If no password option is specified, the default is to send no password.

Specifying a password on the command line should be considered insecure. To avoid giving the password on the command line, use an option file. See Section 8.1.2.1, "End-User Guidelines for Password Security".

To explicitly specify that there is no password and that mysqlshow should not prompt for one, use the --skip-password option.
- --password1[=pass_val]

The password for multifactor authentication factor 1 of the MySQL account used for connecting to the server. The password value is optional. If not given, mysqlshow prompts for one. If given, there
must be no space between--password1= and the password following it. If no password option is specified, the default is to send no password.

Specifying a password on the command line should be considered insecure. To avoid giving the password on the command line, use an option file. See Section 8.1.2.1, "End-User Guidelines for Password Security".

To explicitly specify that there is no password and that mysqlshow should not prompt for one, use the --skip-password1 option.
--password1 and --password are synonymous, as are --skip-password1 and --skippassword.
- --password2[=pass_val]

The password for multifactor authentication factor 2 of the MySQL account used for connecting to the server. The semantics of this option are similar to the semantics for --password1; see the description of that option for details.
- --password3[=pass_val]

The password for multifactor authentication factor 3 of the MySQL account used for connecting to the server. The semantics of this option are similar to the semantics for - - password1; see the description of that option for details.
- --pipe, -W

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- pipe \\
\hline Type & String \\
\hline
\end{tabular}

On Windows, connect to the server using a named pipe. This option applies only if the server was started with the named_pipe system variable enabled to support named-pipe connections. In addition, the user making the connection must be a member of the Windows group specified by the named_pipe_full_access_group system variable.
- --plugin-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- plugin-dir=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

The directory in which to look for plugins. Specify this option if the --default-auth option is used to specify an authentication plugin but mysqlshow does not find it. See Section 8.2.17, "Pluggable Authentication".
- --port=port_num, -P port_num

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- port=port_num \\
\hline Type & Numeric \\
\hline Default Value & 3306 \\
\hline
\end{tabular}

For TCP/IP connections, the port number to use.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print the program name and all options that it gets from option files.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --protocol=\{TCP|SOCKET|PIPE|MEMORY\}

\begin{tabular}{|l|l|}
\hline Command-Line Format & --protocol=type \\
\hline Type & String \\
\hline Default Value & [see text] \\
\hline Valid Values & \begin{tabular}{l}
TCP \\
SOCKET \\
PIPE \\
MEMORY
\end{tabular} \\
\hline
\end{tabular}

The transport protocol to use for connecting to the server. It is useful when the other connection parameters normally result in use of a protocol other than the one you want. For details on the permissible values, see Section 6.2.7, "Connection Transport Protocols".
- --server-public-key-path=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -server - public - key - path=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

The path name to a file in PEM format containing a client-side copy of the public key required by the server for RSA key pair-based password exchange. This option applies to clients that authenticate with the sha256_password (deprecated) or caching_sha2_password authentication plugin. This option is ignored for accounts that do not authenticate with one of those plugins. It is also ignored if RSA-based password exchange is not used, as is the case when the client connects to the server using a secure connection.

If --server-public-key-path=file_name is given and specifies a valid public key file, it takes precedence over--get-server-public-key.

For sha256_password (deprecated), this option applies only if MySQL was built using OpenSSL.
For information about the sha256_password and caching_sha2_password plugins, see Section 8.4.1.3, "SHA-256 Pluggable Authentication", and Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".
- --shared-memory-base-name=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - shared - memory - base - name=name \\
\hline Platform Specific & Windows \\
\hline
\end{tabular}

On Windows, the shared-memory name to use for connections made using shared memory to a local server. The default value is MYSQL. The shared-memory name is case-sensitive.

This option applies only if the server was started with the shared_memory system variable enabled to support shared-memory connections.
- --show-table-type, -t

\begin{tabular}{|l|l|}
\hline Command-Line Format & --show-table-type \\
\hline
\end{tabular}

Show a column indicating the table type, as in SHOW FULL TABLES. The type is BASE TABLE or VIEW.
- --socket=path, -S path

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- socket $=\{$ file_name $\mid$ pipe_name $\}$ \\
\hline Type & String \\
\hline
\end{tabular}

For connections to localhost, the Unix socket file to use, or, on Windows, the name of the named pipe to use.

On Windows, this option applies only if the server was started with the named_pipe system variable enabled to support named-pipe connections. In addition, the user making the connection must be a member of the Windows group specified by the named_pipe_full_access_group system variable.
- --ssl*

Options that begin with --ssl specify whether to connect to the server using encryption and indicate where to find SSL keys and certificates. See Command Options for Encrypted Connections.
- --ssl-fips-mode=\{OFF|ON|STRICT\}

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-fips-mode=\{OFF|ON|STRICT\} \\
\hline Deprecated & Yes \\
\hline Type & Enumeration \\
\hline Default Value & OFF \\
\hline Valid Values & \begin{tabular}{l}
OFF \\
ON \\
STRICT
\end{tabular} \\
\hline
\end{tabular}

Controls whether to enable FIPS mode on the client side. The --ssl-fips-mode option differs from other - $-\mathrm{ssl}-x x x$ options in that it is not used to establish encrypted connections, but rather to affect which cryptographic operations to permit. See Section 8.8, "FIPS Support".

These--ssl-fips-mode values are permitted:
- OFF: Disable FIPS mode.
- ON: Enable FIPS mode.
- STRICT: Enable "strict" FIPS mode.

\section*{Note}

If the OpenSSL FIPS Object Module is not available, the only permitted value for --ssl-fips-mode is OFF. In this case, setting--ssl-fips-mode to ON or STRICT causes the client to produce a warning at startup and to operate in non-FIPS mode.

This option is deprecated. Expect it to be removed in a future version of MySQL.
- --status, -i

\begin{tabular}{|l|l|}
\hline Command-Line Format & --status \\
\hline
\end{tabular}

Display extra information about each table.
- --tls-ciphersuites=ciphersuite_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tls-ciphersuites=ciphersuite_list \\
\hline Type & String \\
\hline
\end{tabular}

The permissible ciphersuites for encrypted connections that use TLSv1.3. The value is a list of one or more colon-separated ciphersuite names. The ciphersuites that can be named for this option depend on the SSL library used to compile MySQL. For details, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".
- --tls-sni-servername=server_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tls-sni-servername=server_name \\
\hline Type & String \\
\hline
\end{tabular}

When specified, the name is passed to the libmysqlclient C API library using the MYSQL_OPT_TLS_SNI_SERVERNAME option of mysql_options(). The server name is not casesensitive. To show which server name the client specified for the current session, if any, check the Tls_sni_server_name status variable.

Server Name Indication (SNI) is an extension to the TLS protocol (OpenSSL must be compiled using TLS extensions for this option to function). The MySQL implementation of SNI represents the clientside only.
- --tls-version=protocol_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tls-version=protocol_list \\
\hline Type & String \\
\hline Default Value & \begin{tabular}{l}
TLSv1, TLSv1.1, TLSv1.2, TLSv1.3 (OpenSSL 1.1.1 or higher) \\
TLSv1, TLSv1.1, TLSv1.2 (otherwise)
\end{tabular} \\
\hline
\end{tabular}

The permissible TLS protocols for encrypted connections. The value is a list of one or more commaseparated protocol names. The protocols that can be named for this option depend on the SSL library used to compile MySQL. For details, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".
- --user=user_name, - u user_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - user=user_name, \\
\hline Type & String \\
\hline
\end{tabular}
- --verbose, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- verbose \\
\hline
\end{tabular}

Verbose mode. Print more information about what the program does. This option can be used multiple times to increase the amount of information.
- --version, -V

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.
- --zstd-compression-level=level

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- zstd-compression-level=\# \\
\hline Type & Integer \\
\hline
\end{tabular}

The compression level to use for connections to the server that use the zstd compression algorithm. The permitted levels are from 1 to 22, with larger values indicating increasing levels of compression. The default zstd compression level is 3 . The compression level setting has no effect on connections that do not use zstd compression.

For more information, see Section 6.2.8, "Connection Compression Control".

\subsection*{6.5.7 mysqlslap - A Load Emulation Client}
mysqlslap is a diagnostic program designed to emulate client load for a MySQL server and to report the timing of each stage. It works as if multiple clients are accessing the server.

Invoke mysqlslap like this:
mysqlslap [options]
Some options such as --create or --query enable you to specify a string containing an SQL statement or a file containing statements. If you specify a file, by default it must contain one statement per line. (That is, the implicit statement delimiter is the newline character.) Use the --delimiter option to specify a different delimiter, which enables you to specify statements that span multiple lines or place multiple statements on a single line. You cannot include comments in a file; mysqlslap does not understand them.
mysqlslap runs in three stages:
1. Create schema, table, and optionally any stored programs or data to use for the test. This stage uses a single client connection.
2. Run the load test. This stage can use many client connections.
3. Clean up (disconnect, drop table if specified). This stage uses a single client connection.

Examples:
Supply your own create and query SQL statements, with 50 clients querying and 200 selects for each (enter the command on a single line):
```
mysqlslap --delimiter=";"
    --create="CREATE TABLE a (b int);INSERT INTO a VALUES (23)"
    --query="SELECT * FROM a" --concurrency=50 --iterations=200
```


Let mysqlslap build the query SQL statement with a table of two INT columns and three VARCHAR columns. Use five clients querying 20 times each. Do not create the table or insert the data (that is, use the previous test's schema and data):
```
mysqlslap --concurrency=5 --iterations=20
    --number-int-cols=2 --number-char-cols=3
    --auto-generate-sql
```


Tell the program to load the create, insert, and query SQL statements from the specified files, where the create.sql file has multiple table creation statements delimited by ' ; ' and multiple insert statements delimited by ' ; '. The --query file should contain multiple queries delimited by ' ; ' . Run all the load statements, then run all the queries in the query file with five clients (five times each):
```
mysqlslap --concurrency=5
    --iterations=5 --query=query.sql --create=create.sql
    --delimiter=";"
```

mysqlslap supports the following options, which can be specified on the command line or in the [mysqlslap] and [client] groups of an option file. For information about option files used by MySQL programs, see Section 6.2.2.2, "Using Option Files".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.16 mysqlslap Options}
\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --auto-generate-sql & Generate SQL statements automatically when they are not supplied in files or using command options \\
\hline --auto-generate-sql-add-autoincrement & Add AUTO_INCREMENT column to automatically generated tables \\
\hline --auto-generate-sql-execute-number & Specify how many queries to generate automatically \\
\hline --auto-generate-sql-guid-primary & Add a GUID-based primary key to automatically generated tables \\
\hline --auto-generate-sql-load-type & Specify the test load type \\
\hline --auto-generate-sql-secondary-indexes & Specify how many secondary indexes to add to automatically generated tables \\
\hline --auto-generate-sql-unique-query-number & How many different queries to generate for automatic tests \\
\hline --auto-generate-sql-unique-write-number & How many different queries to generate for --auto-generate-sql-write-number \\
\hline --auto-generate-sql-write-number & How many row inserts to perform on each thread \\
\hline --commit & How many statements to execute before committing \\
\hline --compress & Compress all information sent between client and server \\
\hline --compression-algorithms & Permitted compression algorithms for connections to server \\
\hline --concurrency & Number of clients to simulate when issuing the SELECT statement \\
\hline --create & File or string containing the statement to use for creating the table \\
\hline --create-schema & Schema in which to run the tests \\
\hline --CSV & Generate output in comma-separated values format \\
\hline --debug & Write debugging log \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --debug-check & Print debugging information when program exits \\
\hline --debug-info & Print debugging information, memory, and CPU statistics when program exits \\
\hline --default-auth & Authentication plugin to use \\
\hline --defaults-extra-file & Read named option file in addition to usual option files \\
\hline --defaults-file & Read only named option file \\
\hline --defaults-group-suffix & Option group suffix value \\
\hline --delimiter & Delimiter to use in SQL statements \\
\hline --detach & Detach (close and reopen) each connection after each N statements \\
\hline --enable-cleartext-plugin & Enable cleartext authentication plugin \\
\hline --engine & Storage engine to use for creating the table \\
\hline --get-server-public-key & Request RSA public key from server \\
\hline --help & Display help message and exit \\
\hline --host & Host on which MySQL server is located \\
\hline --iterations & Number of times to run the tests \\
\hline --login-path & Read login path options from .mylogin.cnf \\
\hline --no-defaults & Read no option files \\
\hline --no-drop & Do not drop any schema created during the test run \\
\hline --no-login-paths & Do not read login paths from the login path file \\
\hline --number-char-cols & Number of VARCHAR columns to use if --auto-generate-sql is specified \\
\hline --number-int-cols & Number of INT columns to use if --auto-generatesql is specified \\
\hline --number-of-queries & Limit each client to approximately this number of queries \\
\hline --only-print & Do not connect to databases. mysqlslap only prints what it would have done \\
\hline --password & Password to use when connecting to server \\
\hline --password1 & First multifactor authentication password to use when connecting to server \\
\hline --password2 & Second multifactor authentication password to use when connecting to server \\
\hline --password3 & Third multifactor authentication password to use when connecting to server \\
\hline --pipe & Connect to server using named pipe (Windows only) \\
\hline --plugin-dir & Directory where plugins are installed \\
\hline --port & TCP/IP port number for connection \\
\hline --post-query & File or string containing the statement to execute after the tests have completed \\
\hline --post-system & String to execute using system() after the tests have completed \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --pre-query & File or string containing the statement to execute before running the tests \\
\hline --pre-system & String to execute using system() before running the tests \\
\hline --print-defaults & Print default options \\
\hline --protocol & Transport protocol to use \\
\hline --query & File or string containing the SELECT statement to use for retrieving data \\
\hline --server-public-key-path & Path name to file containing RSA public key \\
\hline --shared-memory-base-name & Shared-memory name for shared-memory connections (Windows only) \\
\hline --silent & Silent mode \\
\hline --socket & Unix socket file or Windows named pipe to use \\
\hline --sql-mode & Set SQL mode for client session \\
\hline --ssl-ca & File that contains list of trusted SSL Certificate Authorities \\
\hline --ssl-capath & Directory that contains trusted SSL Certificate Authority certificate files \\
\hline --ssl-cert & File that contains X. 509 certificate \\
\hline --ssl-cipher & Permissible ciphers for connection encryption \\
\hline --ssl-crl & File that contains certificate revocation lists \\
\hline --ssl-crlpath & Directory that contains certificate revocation-list files \\
\hline --ssl-fips-mode & Whether to enable FIPS mode on client side \\
\hline --ssl-key & File that contains X. 509 key \\
\hline --ssl-mode & Desired security state of connection to server \\
\hline --ssl-session-data & File that contains SSL session data \\
\hline --ssl-session-data-continue-on-failed-reuse & Whether to establish connections if session reuse fails \\
\hline --tls-ciphersuites & Permissible TLSv1.3 ciphersuites for encrypted connections \\
\hline --tls-sni-servername & Server name supplied by the client \\
\hline --tls-version & Permissible TLS protocols for encrypted connections \\
\hline --user & MySQL user name to use when connecting to server \\
\hline --verbose & Verbose mode \\
\hline --version & Display version information and exit \\
\hline --zstd-compression-level & Compression level for connections to server that use zstd compression \\
\hline
\end{tabular}
- --help, -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display a help message and exit.
- --auto-generate-sql, -a

\begin{tabular}{|l|l|}
\hline Command-Line Format & --auto-generate-sql \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Generate SQL statements automatically when they are not supplied in files or using command options.
- --auto-generate-sql-add-autoincrement

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- - auto- generate-sql-add - \\
autoincrement
\end{tabular} \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Add an AUTO_INCREMENT column to automatically generated tables.
- --auto-generate-sql-execute-number $=N$

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - auto-generate-sql-execute- number $=\#$ \\
\hline Type & Numeric \\
\hline
\end{tabular}

Specify how many queries to generate automatically.
- --auto-generate-sql-guid-primary

\begin{tabular}{|l|l|}
\hline Command-Line Format & --auto-generate-sql-guid-primary \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Add a GUID-based primary key to automatically generated tables.
- --auto-generate-sql-load-type=type

\begin{tabular}{|l|l|}
\hline Command-Line Format & --auto-generate-sql-load-type=type \\
\hline Type & Enumeration \\
\hline Default Value & mixed \\
\hline Valid Values & \begin{tabular}{l}
read \\
write
\end{tabular} \\
\hline
\end{tabular}

Specify the test load type. The permissible values are read (scan tables), write (insert into tables), key (read primary keys), update (update primary keys), or mixed (half inserts, half scanning selects). The default is mixed.
- --auto-generate-sql-secondary-indexes= $N$

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
- -auto-generate-sql-secondary- \\
indexes=\#
\end{tabular} \\
\hline Type & Numeric \\
\hline Default Value & 0 \\
\hline
\end{tabular}

Specify how many secondary indexes to add to automatically generated tables. By default, none are added.
- --auto-generate-sql-unique-query-number $=N$

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
- -auto-generate-sql-unique-query- \\
number $=\#$
\end{tabular} \\
\hline Type & Numeric \\
\hline Default Value & 10 \\
\hline
\end{tabular}

How many different queries to generate for automatic tests. For example, if you run a key test that performs 1000 selects, you can use this option with a value of 1000 to run 1000 unique queries, or with a value of 50 to perform 50 different selects. The default is 10 .
- --auto-generate-sql-unique-write-number $=N$

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
- -auto-generate-sql-unique-write- \\
number $=\#$
\end{tabular} \\
\hline Type & Numeric \\
\hline Default Value & 10 \\
\hline
\end{tabular}

How many different queries to generate for--auto-generate-sql-write-number. The default is 10 .
- --auto-generate-sql-write-number=N

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - auto- generate-sql-write- number=\# \\
\hline Type & Numeric \\
\hline Default Value & 100 \\
\hline
\end{tabular}

How many row inserts to perform. The default is 100.
- --commit=N

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -commit $=\#$ \\
\hline Type & Numeric \\
\hline Default Value & 0 \\
\hline
\end{tabular}

How many statements to execute before committing. The default is 0 (no commits are done).
- --compress, -C

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -compress $[=\{$ OFF $\mid$ ON $\}]$ \\
\hline Deprecated & Yes \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Compress all information sent between the client and the server if possible. See Section 6.2.8, "Connection Compression Control".

This option is deprecated. Expect it to be removed in a future version of MySQL. See Configuring Legacy Connection Compression.
- --compression-algorithms=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & --compression-algorithms=value \\
\hline Type & Set \\
\hline Default Value & uncompressed \\
\hline Valid Values & \begin{tabular}{l}
zlib \\
zstd \\
uncompressed
\end{tabular} \\
\hline
\end{tabular}

The permitted compression algorithms for connections to the server. The available algorithms are the same as for the protocol_compression_algorithms system variable. The default value is uncompressed.

For more information, see Section 6.2.8, "Connection Compression Control".
- --concurrency $=N$, -c $N$

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -concurrency $=\#$ \\
\hline Type & Numeric \\
\hline
\end{tabular}

The number of parallel clients to simulate.
- --create=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -create=value \\
\hline Type & String \\
\hline
\end{tabular}

The file or string containing the statement to use for creating the table.
- --create-schema-value

\begin{tabular}{|l|l|} 
Type & String \\
\hline
\end{tabular}

The schema in which to run the tests.

\section*{Note}

If the--auto-generate-sql option is also given, mysqlslap drops the schema at the end of the test run. To avoid this, use the --no-drop option as well.
- --csv[=file_name]

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -csv $=[$ file $]$ \\
\hline Type & File name \\
\hline
\end{tabular}

Generate output in comma-separated values format. The output goes to the named file, or to the standard output if no file is given.
- --debug[=debug_options], -\# [debug_options]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --debug[=debug_options] \\
\hline Type & String \\
\hline Default Value & d:t:o,/tmp/mysqlslap.trace \\
\hline
\end{tabular}

Write a debugging log. A typical debug_options string is $\mathrm{d}: \mathrm{t}: \mathrm{o}$, file_name. The default is d:t:o,/tmp/mysqlslap.trace.

This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- --debug-check

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug - check \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Print some debugging information when the program exits.
This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- --debug-info, -T

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug - info \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Print debugging information and memory and CPU usage statistics when the program exits.
This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- --default-auth=plugin

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - default - auth=plugin \\
\hline Type & String \\
\hline
\end{tabular}

A hint about which client-side authentication plugin to use. See Section 8.2.17, "Pluggable Authentication".
- --defaults-extra-file=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

Read this option file after the global option file but (on Unix) before the user option file. If the file does not exist or is otherwise inaccessible, an error occurs. If file_name is not an absolute path name, it is interpreted relative to the current directory.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --defaults-file=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - defaults - file=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

Use only the given option file. If the file does not exist or is otherwise inaccessible, an error occurs. If file_name is not an absolute path name, it is interpreted relative to the current directory.

Exception: Even with --defaults-file, client programs read .mylogin.cnf.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --defaults-group-suffix=str

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=str \\
\hline Type & String \\
\hline
\end{tabular}

Read not only the usual option groups, but also groups with the usual names and a suffix of str. For example, mysqlslap normally reads the [client] and [mysqlslap] groups. If this option is given as --defaults-group-suffix=_other, mysqlslap also reads the [client_other] and [mysqlslap_other] groups.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --delimiter=str, -F str

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- delimiter=str \\
\hline Type & String \\
\hline
\end{tabular}
- --detach=N

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - detach $=\#$ \\
\hline Type & Numeric \\
\hline Default Value & 0 \\
\hline
\end{tabular}

Detach (close and reopen) each connection after each $N$ statements. The default is 0 (connections are not detached).
- --enable-cleartext-plugin

\begin{tabular}{|l|l|}
\hline Command-Line Format & --enable-cleartext-plugin \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Enable the mysql_clear_password cleartext authentication plugin. (See Section 8.4.1.4, "ClientSide Cleartext Pluggable Authentication".)
- --engine=engine_name, -e engine_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --engine=engine_name \\
\hline Type & String \\
\hline
\end{tabular}

The storage engine to use for creating tables.
- --get-server-public-key

\begin{tabular}{|l|l|}
\hline Command-Line Format & --get-server-public-key \\
\hline Type & Boolean \\
\hline
\end{tabular}

Request from the server the RSA public key that it uses for key pair-based password exchange. This option applies to clients that connect to the server using an account that authenticates with the caching_sha2_password authentication plugin. For connections by such accounts, the server does not send the public key to the client unless requested. The option is ignored for accounts that do not authenticate with that plugin. It is also ignored if RSA-based password exchange is not needed, as is the case when the client connects to the server using a secure connection.

If--server-public-key-path=file_name is given and specifies a valid public key file, it takes precedence over--get-server-public-key.

For information about the caching_sha2_password plugin, see Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".
- --host=host_name, -h host_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- host=host_name \\
\hline Type & String \\
\hline Default Value & localhost \\
\hline
\end{tabular}

Connect to the MySQL server on the given host.
- --iterations=N, -i N

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - iterations $=\#$ \\
\hline Type & Numeric \\
\hline
\end{tabular}

The number of times to run the tests.
- --login-path=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login - path=name \\
\hline Type & String \\
\hline
\end{tabular}

Read options from the named login path in the .mylogin. cnf login path file. A "login path" is an option group containing options that specify which MySQL server to connect to and which account to authenticate as. To create or modify a login path file, use the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & --no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
See--login-path for related information.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --no-drop

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - drop \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Prevent mysqlslap from dropping any schema it creates during the test run.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --no-defaults \\
\hline
\end{tabular}

Do not read any option files. If program startup fails due to reading unknown options from an option file, --no-defaults can be used to prevent them from being read.

The exception is that the .mylogin. cnf file is read in all cases, if it exists. This permits passwords to be specified in a safer way than on the command line even when --no-defaults is used. To create. mylogin.cnf, use the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --number-char-cols $=N$, -x $N$

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - number - char - cols=\# \\
\hline Type & Numeric \\
\hline
\end{tabular}

The number of VARCHAR columns to use if - - auto-generate-sql is specified.
- --number-int-cols= $N$, -y $N$

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- number - int - cols $=\#$ \\
\hline Type & Numeric \\
\hline
\end{tabular}

The number of INT columns to use if --auto-generate-sql is specified.
- - - number-of-queries= $N$

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - number - of-queries=\# \\
\hline Type & Numeric \\
\hline
\end{tabular}

Limit each client to approximately this many queries. Query counting takes into account the statement delimiter. For example, if you invoke mysqlslap as follows, the ; delimiter is recognized so that each instance of the query string counts as two queries. As a result, 5 rows (not 10) are inserted.
```
mysqlslap --delimiter=";" --number-of-queries=10
    --query="use test;insert into t values(null)"
```

- --only-print

\begin{tabular}{|l|l|}
\hline Command-Line Format & --only-print \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Do not connect to databases. mysqlslap only prints what it would have done.
- --password[=password], -p[password]

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- password [=password] \\
\hline Type & String \\
\hline
\end{tabular}

The password of the MySQL account used for connecting to the server. The password value is optional. If not given, mysqlslap prompts for one. If given, there must be no space between -password= or - p and the password following it. If no password option is specified, the default is to send no password.

Specifying a password on the command line should be considered insecure. To avoid giving the password on the command line, use an option file. See Section 8.1.2.1, "End-User Guidelines for Password Security".

To explicitly specify that there is no password and that mysqlslap should not prompt for one, use the --skip-password option.
- --password1[=pass_val]

The password for multifactor authentication factor 1 of the MySQL account used for connecting to the server. The password value is optional. If not given, mysqlslap prompts for one. If given, there must be no space between --password1= and the password following it. If no password option is specified, the default is to send no password.

Specifying a password on the command line should be considered insecure. To avoid giving the password on the command line, use an option file. See Section 8.1.2.1, "End-User Guidelines for Password Security".

To explicitly specify that there is no password and that mysqlslap should not prompt for one, use the --skip-password1 option.
--password1 and --password are synonymous, as are --skip-password1 and --skippassword.
- --password2[=pass_val]

The password for multifactor authentication factor 2 of the MySQL account used for connecting to the server. The semantics of this option are similar to the semantics for - - password1; see the description of that option for details.
- --password3[=pass_val]

The password for multifactor authentication factor 3 of the MySQL account used for connecting to the server. The semantics of this option are similar to the semantics for --password1; see the description of that option for details.
- --pipe, -W

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- pipe \\
\hline Type & String \\
\hline
\end{tabular}

On Windows, connect to the server using a named pipe. This option applies only if the server was started with the named_pipe system variable enabled to support named-pipe connections. In addition, the user making the connection must be a member of the Windows group specified by the named_pipe_full_access_group system variable.
- --plugin-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- plugin-dir=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

The directory in which to look for plugins. Specify this option if the --default-auth option is used to specify an authentication plugin but mysqlslap does not find it. See Section 8.2.17, "Pluggable Authentication".
- --port=port_num, -P port_num

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- port=port_num \\
\hline Type & Numeric \\
\hline Default Value & 3306 \\
\hline
\end{tabular}

For TCP/IP connections, the port number to use.
- --post-query=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - post - query=value \\
\hline Type & String \\
\hline
\end{tabular}

The file or string containing the statement to execute after the tests have completed. This execution is not counted for timing purposes.
- --post-system=str

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- post - system $=$ str \\
\hline Type & String \\
\hline
\end{tabular}

The string to execute using system( ) after the tests have completed. This execution is not counted for timing purposes.
- --pre-query=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -pre-query=value \\
\hline Type & String \\
\hline
\end{tabular}

The file or string containing the statement to execute before running the tests. This execution is not counted for timing purposes.
- --pre-system=str

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- pre-system=str \\
\hline Type & String \\
\hline
\end{tabular}

The string to execute using system( ) before running the tests. This execution is not counted for timing purposes.
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print the program name and all options that it gets from option files.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --protocol=\{TCP|SOCKET|PIPE|MEMORY\}

\begin{tabular}{|l|l|}
\hline Command-Line Format & --protocol=type \\
\hline Type & String \\
\hline Default Value & [see text] \\
\hline Valid Values & \begin{tabular}{l}
TCP \\
SOCKET \\
PIPE \\
MEMORY
\end{tabular} \\
\hline
\end{tabular}

The transport protocol to use for connecting to the server. It is useful when the other connection parameters normally result in use of a protocol other than the one you want. For details on the permissible values, see Section 6.2.7, "Connection Transport Protocols".
- --query=value, -q value

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -query=value \\
\hline Type & String \\
\hline
\end{tabular}

The file or string containing the SELECT statement to use for retrieving data.
- --server-public-key-path=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -server - public - key - path=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

The path name to a file in PEM format containing a client-side copy of the public key required by the server for RSA key pair-based password exchange. This option applies to clients that authenticate with the sha256_password (deprecated) or caching_sha2_password authentication plugin. This option is ignored for accounts that do not authenticate with one of those plugins. It is also ignored if RSA-based password exchange is not used, as is the case when the client connects to the server using a secure connection.

If --server-public-key-path=file_name is given and specifies a valid public key file, it takes precedence over--get-server-public-key.

For sha256_password (deprecated), this option applies only if MySQL was built using OpenSSL.
For information about the sha256_password and caching_sha2_password plugins, see Section 8.4.1.3, "SHA-256 Pluggable Authentication", and Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".
- --shared-memory-base-name=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - shared - memory - base - name=name \\
\hline Platform Specific & Windows \\
\hline
\end{tabular}

On Windows, the shared-memory name to use for connections made using shared memory to a local server. The default value is MYSQL. The shared-memory name is case-sensitive.

This option applies only if the server was started with the shared_memory system variable enabled to support shared-memory connections.
- --silent, -s

\begin{tabular}{|l|l|}
\hline Command-Line Format & --silent \\
\hline
\end{tabular}

Silent mode. No output.
- --socket=path, -S path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - socket $=\{$ file_name $\mid$ pipe_name $\}$ \\
\hline Type & String \\
\hline
\end{tabular}

For connections to localhost, the Unix socket file to use, or, on Windows, the name of the named pipe to use.

On Windows, this option applies only if the server was started with the named_pipe system variable enabled to support named-pipe connections. In addition, the user making the connection must be a member of the Windows group specified by the named_pipe_full_access_group system variable.
- --sql-mode=mode

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sql-mode=mode \\
\hline Type & String \\
\hline
\end{tabular}

Set the SQL mode for the client session.
- --ssl*

Options that begin with --ssl specify whether to connect to the server using encryption and indicate where to find SSL keys and certificates. See Command Options for Encrypted Connections.
- --ssl-fips-mode=\{OFF|ON|STRICT\}

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-fips-mode=\{OFF|ON|STRICT\} \\
\hline Deprecated & Yes \\
\hline Type & Enumeration \\
\hline Default Value & OFF \\
\hline Valid Values & \begin{tabular}{l}
OFF \\
ON \\
STRICT
\end{tabular} \\
\hline
\end{tabular}

Controls whether to enable FIPS mode on the client side. The --ssl-fips-mode option differs from other --ssl- $x x x$ options in that it is not used to establish encrypted connections, but rather to affect which cryptographic operations to permit. See Section 8.8, "FIPS Support".

These--ssl-fips-mode values are permitted:
- OFF: Disable FIPS mode.
- ON: Enable FIPS mode.
- STRICT: Enable "strict" FIPS mode.

\section*{Note}

If the OpenSSL FIPS Object Module is not available, the only permitted value for --ssl-fips-mode is OFF. In this case, setting--ssl-fips-mode to ON or STRICT causes the client to produce a warning at startup and to operate in non-FIPS mode.

This option is deprecated. Expect it to be removed in a future version of MySQL.
- --tls-ciphersuites=ciphersuite_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tls-ciphersuites=ciphersuite_list \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
\hline
\end{tabular}

The permissible ciphersuites for encrypted connections that use TLSv1.3. The value is a list of one or more colon-separated ciphersuite names. The ciphersuites that can be named for this option depend on the SSL library used to compile MySQL. For details, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".
- --tls-sni-servername=server_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tls-sni-servername=server_name \\
\hline Type & String \\
\hline
\end{tabular}

When specified, the name is passed to the libmysqlclient C API library using the MYSQL_OPT_TLS_SNI_SERVERNAME option of mysql_options ( ). The server name is not casesensitive. To show which server name the client specified for the current session, if any, check the Tls_sni_server_name status variable.

Server Name Indication (SNI) is an extension to the TLS protocol (OpenSSL must be compiled using TLS extensions for this option to function). The MySQL implementation of SNI represents the clientside only.
- --tls-version=protocol_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tls-version=protocol_list \\
\hline Type & String \\
\hline Default Value & \begin{tabular}{l}
TLSv1, TLSv1.1, TLSv1.2, TLSv1.3 (OpenSSL 1.1.1 or higher) \\
TLSv1, TLSv1.1, TLSv1.2 (otherwise)
\end{tabular} \\
\hline
\end{tabular}

The permissible TLS protocols for encrypted connections. The value is a list of one or more commaseparated protocol names. The protocols that can be named for this option depend on the SSL library used to compile MySQL. For details, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".
- --user=user_name, -u user_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - user=user_name, \\
\hline Type & String \\
\hline
\end{tabular}

The user name of the MySQL account to use for connecting to the server.
- --verbose, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- verbose \\
\hline
\end{tabular}
- --version, -V

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.
- --zstd-compression-level=level

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- zstd-compression-level=\# \\
\hline Type & Integer \\
\hline
\end{tabular}

The compression level to use for connections to the server that use the zstd compression algorithm. The permitted levels are from 1 to 22, with larger values indicating increasing levels of compression. The default zstd compression level is 3 . The compression level setting has no effect on connections that do not use zstd compression.

For more information, see Section 6.2.8, "Connection Compression Control".

\subsection*{6.6 Administrative and Utility Programs}

This section describes administrative programs and programs that perform miscellaneous utility operations.

\subsection*{6.6.1 ibd2sdi - InnoDB Tablespace SDI Extraction Utility}
ibd2sdi is a utility for extracting serialized dictionary information (SDI) from InnoDB tablespace files. SDI data is present in all persistent InnoDB tablespace files.
ibd2sdi can be run on file-per-table tablespace files (*. ibd files), general tablespace files (*. ibd files), system tablespace files (ibdata* files), and the data dictionary tablespace (mysql.ibd). It is not supported for use with temporary tablespaces or undo tablespaces.
ibd2sdi can be used at runtime or while the server is offline. During DDL operations, ROLLBACK operations, and undo log purge operations related to SDI, there may be a short interval of time when ibd2sdi fails to read SDI data stored in the tablespace.
ibd2sdi performs an uncommitted read of SDI from the specified tablespace. Redo logs and undo logs are not accessed.

Invoke the ibd2sdi utility like this:
ibd2sdi [options] file_name1 [file_name2 file_name3 ...]
ibd2sdi supports multi-file tablespaces like the InnoDB system tablespace, but it cannot be run on more than one tablespace at a time. For multi-file tablespaces, specify each file:
ibd2sdi ibdata1 ibdata2
The files of a multi-file tablespace must be specified in order of the ascending page number. If two successive files have the same space ID, the later file must start with the last page number of the previous file + 1.
ibd2sdi outputs SDI (containing id, type, and data fields) in JSON format.

\section*{ibd2sdi Options}
ibd2sdi supports the following options:
- --help, -h

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Display a help message and exit. For example:
```
Usage: ./ibd2sdi [-v] [-c <strict-check>] [-d <dump file name>] [-n] filename1 [filenames]
See http://dev.mysql.com/doc/refman/8.4/en/ibd2sdi.html for usage hints.
    -h, --help Display this help and exit.
    -v, --version Display version information and exit.
    -#, --debug[=name] Output debug log. See
        http://dev.mysql.com/doc/refman/8.4/en/dbug-package.html
    -d, --dump-file=name
        Dump the tablespace SDI into the file passed by user.
        Without the filename, it will default to stdout
    -s, --skip-data Skip retrieving data from SDI records. Retrieve only id
        and type.
    -i, --id=# Retrieve the SDI record matching the id passed by user.
    -t, --type=# Retrieve the SDI records matching the type passed by
        user.
    -c, --strict-check=name
        Specify the strict checksum algorithm by the user.
        Allowed values are innodb, crc32, none.
    -n, --no-check Ignore the checksum verification.
    -p, --pretty Pretty format the SDI output.If false, SDI would be not
        human readable but it will be of less size
        (Defaults to on; use --skip-pretty to disable.)
Variables (--variable-name=value)
and boolean options {FALSE|TRUE} Value (after reading options)
debug (No default value)
dump-file (No default value)
skip-data FALSE
id 0
type 0
strict-check crc32
no-check FALSE
pretty TRUE
```

- --version, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- version \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Display version information and exit. For example:
```
ibd2sdi Ver 8.4.9 for Linux on x86_64 (Source distribution)
```

- --debug[=debug_options], -\# [debug_options]

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug=options \\
\hline Type & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & [none] \\
\hline
\end{tabular}

Prints a debug log. For debug options, refer to Section 7.9.4, "The DBUG Package".
```
ibd2sdi --debug=d:t /tmp/ibd2sdi.trace
```


This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- --dump-file=, -d

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - dump - file=file \\
\hline Type & File name \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Dumps serialized dictionary information (SDI) into the specified dump file. If a dump file is not specified, the tablespace SDI is dumped to stdout.
```
ibd2sdi --dump-file=file_name ../data/test/t1.ibd
```

- --skip-data, -s

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-data \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Skips retrieval of data field values from the serialized dictionary information (SDI) and only retrieves the id and type field values, which are primary keys for SDI records.
```
$> ibd2sdi --skip-data ../data/test/t1.ibd
["ibd2sdi"
'
    "type": 1,
    "id": 330
}
'
    "type": 2,
    "id": 7
}
]
```

- --id=\#, -i \#

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- id $=\#$ \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline
\end{tabular}

Retrieves serialized dictionary information (SDI) matching the specified table or tablespace object id. An object id is unique to the object type. Table and tablespace object IDs are also found in the about data dictionary tables, see Section 16.1, "Data Dictionary Schema".
```
$> ibd2sdi --id=7 ../data/test/t1.ibd
["ibd2sdi"
```

```
{
    "type": 2,
    "id": 7,
    "object":
    }
        "mysqld_version_id": 80003,
        "dd_version": 80003,
        "sdi_version": 1,
        "dd_object_type": "Tablespace",
        "dd_object": {
            "name": "test/t1",
            "comment": "",
            "options": "",
            "se_private_data": "flags=16417;id=2;server_version=80003;space_version=1;",
            "engine": "InnoDB",
            "files": [
                {
                    "ordinal_position": 1,
                    "filename": "./test/t1.ibd",
                    "se_private_data": "id=2;"
                }
            ]
        }
}
}
]
```

- --type=\#,-t \#

\begin{tabular}{|l|l|}
\hline Command-Line Format & --type=\# \\
\hline Type & Enumeration \\
\hline Default Value & 0 \\
\hline Valid Values & \begin{tabular}{l}
1 \\
2
\end{tabular} \\
\hline
\end{tabular}

Retrieves serialized dictionary information (SDI) matching the specified object type. SDI is provided for table (type=1) and tablespace (type=2) objects.

This example shows output for a tablespace ts1 in the test database:
```
$> ibd2sdi --type=2 ../data/test/ts1.ibd
["ibd2sdi"
'
    "type": 2,
    "id": 7,
    "object":
        {
            "mysqld_version_id": 80003,
            "dd_version": 80003,
            "sdi_version": 1,
            "dd_object_type": "Tablespace",
            "dd_object": {
                "name": "test/ts1",
                "comment": "",
                "options": "",
                "se_private_data": "flags=16417;id=2;server_version=80003;space_version=1;",
                "engine": "InnoDB",
                "files": [
                    {
                        "ordinal_position": 1,
                        "filename": "./test/ts1.ibd",
                        "se_private_data": "id=2;"
                    }
                ]
        }
```

```
}
}
]
```


Due to the way in which InnoDB handles default value metadata, a default value may be present and non-empty in ibd2sdi output for a given table column even if it is not defined using DEFAULT. Consider the two tables created using the following statements, in the database named i :
```
CREATE TABLE t1 (c VARCHAR(16) NOT NULL);
CREATE TABLE t2 (c VARCHAR(16) NOT NULL DEFAULT "Sakila");
```


Using ibd2sdi, we can see that the default_value for column c is nonempty and is in fact padded to length in both tables, like this:
```
$> ibd2sdi ../data/i/t1.ibd | grep -m1 '\"default_value\"' | cut -b34- | sed -e s/,//
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAA="
$> ibd2sdi ../data/i/t2.ibd | grep -m1 '\"default_value\"' | cut -b34- | sed -e s/,//
"BlNha2lsYQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAA="
```


Examination of ibd2sdi output may be easier using a JSON-aware utility like jq, as shown here:
```
$> ibd2sdi ../data/i/t1.ibd | jq '.[1]["object"]["dd_object"]["columns"][0]["default_value"]'
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAA="
$> ibd2sdi ../data/i/t2.ibd | jq '.[1]["object"]["dd_object"]["columns"][0]["default_value"]' "BlNha2lsYQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAA="
```


For more information, see the MySQL Internals documentation.
- --strict-check, -c

\begin{tabular}{|l|l|}
\hline Command-Line Format & --strict-check=algorithm \\
\hline Type & Enumeration \\
\hline Default Value & crc32 \\
\hline Valid Values & \begin{tabular}{l}
crc32 \\
innodb \\
none
\end{tabular} \\
\hline
\end{tabular}

Specifies a strict checksum algorithm for validating the checksum of pages that are read. Options include innodb, crc32, and none.

In this example, the strict version of the innodb checksum algorithm is specified:
```
ibd2sdi --strict-check=innodb ../data/test/t1.ibd
```


In this example, the strict version of crc32 checksum algorithm is specified:
```
ibd2sdi -c crc32 ../data/test/t1.ibd
```


If you do not specify the--strict-check option, validation is performed against non-strict innodb, crc32 and none checksums.
- --no-check, -n

\begin{tabular}{l|l|l|}
\cline { 2 - 3 } & Command-Line Format & - - no - check \\
\hline 512 & Type & Boolean \\
\cline { 2 - 3 } & &
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & false \\
\hline
\end{tabular}

Skips checksum validation for pages that are read.
```
ibd2sdi --no-check ../data/test/t1.ibd
```

- --pretty, -p

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- pretty \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Outputs SDI data in JSON pretty print format. Enabled by default. If disabled, SDI is not human readable but is smaller in size. Use --skip-pretty to disable.
```
ibd2sdi --skip-pretty ../data/test/t1.ibd
```


\subsection*{6.6.2 innochecksum - Offline InnoDB File Checksum Utility}
innochecksum prints checksums for InnoDB files. This tool reads an InnoDB tablespace file, calculates the checksum for each page, compares the calculated checksum to the stored checksum, and reports mismatches, which indicate damaged pages. It was originally developed to speed up verifying the integrity of tablespace files after power outages but can also be used after file copies. Because checksum mismatches cause InnoDB to deliberately shut down a running server, it may be preferable to use this tool rather than waiting for an in-production server to encounter the damaged pages.
innochecksum cannot be used on tablespace files that the server already has open. For such files, you should use CHECK TABLE to check tables within the tablespace. Attempting to run innochecksum on a tablespace that the server already has open results in an Unable to lock file error.

If checksum mismatches are found, restore the tablespace from backup or start the server and attempt to use mysqldump to make a backup of the tables within the tablespace.

Invoke innochecksum like this:
```
innochecksum [options] file_name
```


\section*{innochecksum Options}
innochecksum supports the following options. For options that refer to page numbers, the numbers are zero-based.
- --help, -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Displays command line help. Example usage:
```
innochecksum --help
```

- --info, -I

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - info \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Synonym for - - help. Displays command line help. Example usage:
```
innochecksum --info
```

- --version, -V

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- version \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Displays version information. Example usage:
```
innochecksum --version
```

- --verbose, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- verbose \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Verbose mode; prints a progress indicator to the log file every five seconds. In order for the progress indicator to be printed, the log file must be specified using the --log option. To turn on verbose mode, run:
```
innochecksum --verbose
```


To turn off verbose mode, run:
```
innochecksum --verbose=FALSE
```


The --verbose option and --log option can be specified at the same time. For example:
```
innochecksum --verbose --log=/var/lib/mysql/test/logtest.txt
```


To locate the progress indicator information in the log file, you can perform the following search:
```
cat ./logtest.txt | grep -i "okay"
```


The progress indicator information in the log file appears similar to the following:
```
page 1663 okay: 2.863% done
page 8447 okay: 14.537% done
page 13695 okay: 23.568% done
page 18815 okay: 32.379% done
page 23039 okay: 39.648% done
page 28351 okay: 48.789% done
page 33023 okay: 56.828% done
page 37951 okay: 65.308% done
page 44095 okay: 75.881% done
page 49407 okay: 85.022% done
page 54463 okay: 93.722% done
```

...

\begin{tabular}{|l|l|} 
Type & Base name \\
\hline Default Value & true \\
\hline
\end{tabular}

Print a count of the number of pages in the file and exit. Example usage:
```
innochecksum --count ../data/test/tab1.ibd
```

- --start-page=num, -s num

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - start - page $=\#$ \\
\hline Type & Numeric \\
\hline Default Value & 0 \\
\hline
\end{tabular}

Start at this page number. Example usage:
```
innochecksum --start-page=600 ../data/test/tab1.ibd
```

or:
```
innochecksum -s 600 ../data/test/tab1.ibd
```

- --end-page=num, -e num

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -end - page=\# \\
\hline Type & Numeric \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 18446744073709551615 \\
\hline
\end{tabular}

End at this page number. Example usage:
```
innochecksum --end-page=700 ../data/test/tab1.ibd
```

or:
```
innochecksum --p 700 ../data/test/tab1.ibd
```

- --page=num, -p num

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - page $=\#$ \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline
\end{tabular}

Check only this page number. Example usage:
```
innochecksum --page=701 ../data/test/tab1.ibd
```

- --strict-check, -C

\begin{tabular}{|l|l|}
\hline Command-Line Format & --strict-check=algorithm \\
\hline Type & Enumeration \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline & crc32 \\
none \\
\hline
\end{tabular}

Specify a strict checksum algorithm. Options include innodb, crc32, and none.
In this example, the innodb checksum algorithm is specified:
```
innochecksum --strict-check=innodb ../data/test/tab1.ibd
```


In this example, the crc32 checksum algorithm is specified:
```
innochecksum -C crc32 ../data/test/tab1.ibd
```


The following conditions apply:
- If you do not specify the --strict-check option, innochecksum validates against innodb, crc32 and none.
- If you specify the none option, only checksums generated by none are allowed.
- If you specify the innodb option, only checksums generated by innodb are allowed.
- If you specify the crc32 option, only checksums generated by crc32 are allowed.
- --no-check, -n

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - check \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Ignore the checksum verification when rewriting a checksum. This option may only be used with the innochecksum --write option. If the --write option is not specified, innochecksum terminates.

In this example, an innodb checksum is rewritten to replace an invalid checksum:
innochecksum --no-check --write innodb ../data/test/tab1.ibd
- --allow-mismatches, -a

\begin{tabular}{|l|l|}
\hline Command-Line Format & --allow-mismatches=\# \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 18446744073709551615 \\
\hline
\end{tabular}

The maximum number of checksum mismatches allowed before innochecksum terminates. The default setting is 0 . If - -allow-mismatches $=N$, where $N>=0, N$ mismatches are permitted and
innochecksum terminates at $N+1$. When --allow-mismatches is set to 0 , innochecksum terminates on the first checksum mismatch.

In this example, an existing innodb checksum is rewritten to set --allow-mismatches to 1 .
innochecksum --allow-mismatches=1 --write innodb ../data/test/tab1.ibd
With - -allow-mismatches set to 1 , if there is a mismatch at page 600 and another at page 700 on a file with 1000 pages, the checksum is updated for pages 0-599 and 601-699. Because -allow-mismatches is set to 1 , the checksum tolerates the first mismatch and terminates on the second mismatch, leaving page 600 and pages 700-999 unchanged.
- --write=name, -w num

\begin{tabular}{|l|l|}
\hline Command-Line Format & --write=algorithm \\
\hline Type & Enumeration \\
\hline Default Value & crc32 \\
\hline Valid Values & \begin{tabular}{l}
innodb \\
crc32 \\
none
\end{tabular} \\
\hline
\end{tabular}

Rewrite a checksum. When rewriting an invalid checksum, the --no-check option must be used together with the --write option. The --no-check option tells innochecksum to ignore verification of the invalid checksum. You do not have to specify the --no-check option if the current checksum is valid.

An algorithm must be specified when using the --write option. Possible values for the --write option are:
- innodb: A checksum calculated in software, using the original algorithm from InnoDB.
- crc32: A checksum calculated using the crc32 algorithm, possibly done with a hardware assist.
- none: A constant number.

The --write option rewrites entire pages to disk. If the new checksum is identical to the existing checksum, the new checksum is not written to disk in order to minimize I/O.
innochecksum obtains an exclusive lock when the --write option is used.
In this example, a crc32 checksum is written for tab1.ibd:
```
innochecksum -w crc32 ../data/test/tab1.ibd
```


In this example, a crc32 checksum is rewritten to replace an invalid crc32 checksum:
```
innochecksum --no-check --write crc32 ../data/test/tab1.ibd
```

- --page-type-summary, -S

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - page- type-summary \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & false \\
\hline
\end{tabular}

Display a count of each page type in a tablespace. Example usage:
```
innochecksum --page-type-summary ../data/test/tab1.ibd
```


Sample output for --page-type-summary:
```
File::../data/test/tab1.ibd
================================
#PAGE_COUNT PAGE_TYPE
==================================================
    2 Index page
    0 Undo log page
    1 Inode page
    0 Insert buffer free list page
    2 Freshly allocated page
    1 Insert buffer bitmap
    0 System page
    0 Transaction system page
    1 File Space Header
    0 Extent descriptor page
    0 BLOB page
    0 Compressed BLOB page
    0 Other type of page
Additional information:
Undo page type: 0 insert, 0 update, 0 other
Undo page state: 0 active, 0 cached, 0 to_free, 0 to_purge, 0 prepared, 0 other
```

- --page-type-dump, -D

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - page - type - dump=name \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Dump the page type information for each page in a tablespace to stderr or stdout. Example usage:
```
innochecksum --page-type-dump=/tmp/a.txt ../data/test/tab1.ibd
```

- --log, -l

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- log=path \\
\hline Type & File name \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Log output for the innochecksum tool. A log file name must be provided. Log output contains checksum values for each tablespace page. For uncompressed tables, LSN values are also provided. Example usage:
```
innochecksum --log=/tmp/log.txt ../data/test/tab1.ibd
```

or:
```
innochecksum -l /tmp/log.txt ../data/test/tab1.ibd
```

- - option.

Specify the - option to read from standard input. If the - option is missing when "read from standard in" is expected, innochecksum prints innochecksum usage information indicating that the "-" option was omitted. Example usages:
```
cat t1.ibd | innochecksum -
```


In this example, innochecksum writes the crc32 checksum algorithm to a.ibd without changing the original t1. ibd file.
```
cat t1.ibd | innochecksum --write=crc32 - > a.ibd
```


\section*{Running innochecksum on Multiple User-defined Tablespace Files}

The following examples demonstrate how to run innochecksum on multiple user-defined tablespace files (.ibd files).

Run innochecksum for all tablespace (.ibd) files in the "test" database:
```
innochecksum ./data/test/*.ibd
```


Run innochecksum for all tablespace files (.ibd files) that have a file name starting with " t ":
```
innochecksum ./data/test/t*.ibd
```


Run innochecksum for all tablespace files (.ibd files) in the data directory:
```
innochecksum ./data/*/*.ibd
```


\section*{Note}

Running innochecksum on multiple user-defined tablespace files is not supported on Windows operating systems, as Windows shells such as cmd . exe do not support glob pattern expansion. On Windows systems, innochecksum must be run separately for each user-defined tablespace file. For example:
```
innochecksum.exe t1.ibd
innochecksum.exe t2.ibd
innochecksum.exe t3.ibd
```


