\section*{Performance Considerations}

By default, the entire table is read row by row and the checksum is calculated. For large tables, this could take a long time, thus you would only perform this operation occasionally. This row-by-row calculation is what you get with the EXTENDED clause, with InnoDB and all other storage engines other than MyISAM, and with MyISAM tables not created with the CHECKSUM $=1$ clause.

For MyISAM tables created with the CHECKSUM=1 clause, CHECKSUM TABLE or CHECKSUM TABLE . . . QUICK returns the "live" table checksum that can be returned very fast. If the table does not meet all these conditions, the QUICK method returns NULL. The QUICK method is not supported with InnoDB tables. See Section 15.1.20, "CREATE TABLE Statement" for the syntax of the CHECKSUM clause.

The checksum value depends on the table row format. If the row format changes, the checksum also changes. For example, the storage format for temporal types such as TIME, DATETIME, and TIMESTAMP changed in MySQL 5.6 prior to MySQL 5.6.5, so if a 5.5 table is upgraded to MySQL 5.6, the checksum value may change.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2877.jpg?height=106&width=104&top_left_y=1359&top_left_x=365)

\section*{Important}

If the checksums for two tables are different, then it is almost certain that the tables are different in some way. However, because the hashing function used by CHECKSUM TABLE is not guaranteed to be collision-free, there is a slight chance that two tables which are not identical can produce the same checksum.

\subsection*{15.7.3.4 OPTIMIZE TABLE Statement}
```
OPTIMIZE [NO_WRITE_TO_BINLOG | LOCAL]
    TABLE tbl_name [, tbl_name] ...
```


OPTIMIZE TABLE reorganizes the physical storage of table data and associated index data, to reduce storage space and improve I/O efficiency when accessing the table. The exact changes made to each table depend on the storage engine used by that table.

Use OPTIMIZE TABLE in these cases, depending on the type of table:
- After doing substantial insert, update, or delete operations on an InnoDB table that has its own .ibd file because it was created with the innodb_file_per_table option enabled. The table and indexes are reorganized, and disk space can be reclaimed for use by the operating system.
- After doing substantial insert, update, or delete operations on columns that are part of a FULLTEXT index in an InnoDB table. Set the configuration option innodb_optimize_fulltext_only=1 first. To keep the index maintenance period to a reasonable time, set the innodb_ft_num_word_optimize option to specify how many words to update in the search index, and run a sequence of OPTIMIZE TABLE statements until the search index is fully updated.
- After deleting a large part of a MyISAM or ARCHIVE table, or making many changes to a MyISAM or ARCHIVE table with variable-length rows (tables that have VARCHAR, VARBINARY, BLOB, or TEXT columns). Deleted rows are maintained in a linked list and subsequent INSERT operations reuse old row positions. You can use OPTIMIZE TABLE to reclaim the unused space and to defragment
the data file. After extensive changes to a table, this statement may also improve performance of statements that use the table, sometimes significantly.

This statement requires SELECT and INSERT privileges for the table.
OPTIMIZE TABLE works for InnoDB, MyISAM, and ARCHIVE tables. OPTIMIZE TABLE is also supported for dynamic columns of in-memory NDB tables. It does not work for fixed-width columns of inmemory tables, nor does it work for Disk Data tables. The performance of OPTIMIZE on NDB Cluster tables can be tuned using--ndb-optimization-delay, which controls the length of time to wait between processing batches of rows by OPTIMIZE TABLE.

For NDB Cluster tables, OPTIMIZE TABLE can be interrupted by (for example) killing the SQL thread performing the OPTIMIZE operation.

By default, OPTIMIZE TABLE does not work for tables created using any other storage engine and returns a result indicating this lack of support. You can make OPTIMIZE TABLE work for other storage engines by starting mysqld with the --skip-new option. In this case, OPTIMIZE TABLE is just mapped to ALTER TABLE.

This statement does not work with views.
OPTIMIZE TABLE is supported for partitioned tables. For information about using this statement with partitioned tables and table partitions, see Section 26.3.4, "Maintenance of Partitions".

By default, the server writes OPTIMIZE TABLE statements to the binary log so that they replicate to replicas. To suppress logging, specify the optional NO_WRITE_TO_BINLOG keyword or its alias LOCAL. You must have the OPTIMIZE_LOCAL_TABLE privilege to use this option.
- OPTIMIZE TABLE Output
- InnoDB Details
- MyISAM Details
- Other Considerations

\section*{OPTIMIZE TABLE Output}

OPTIMIZE TABLE returns a result set with the columns shown in the following table.

\begin{tabular}{|l|l|}
\hline Column & Value \\
\hline Table & The table name \\
\hline Op & Always optimize \\
\hline Msg_type & status, error, info, note, or warning \\
\hline Msg_text & An informational message \\
\hline
\end{tabular}

OPTIMIZE TABLE table catches and throws any errors that occur while copying table statistics from the old file to the newly created file. For example. if the user ID of the owner of the . MYD or . MYI file is different from the user ID of the mysqld process, OPTIMIZE TABLE generates a "cannot change ownership of the file" error unless mysqld is started by the root user.

\section*{InnoDB Details}

For InnoDB tables, OPTIMIZE TABLE is mapped to ALTER TABLE ... FORCE, which rebuilds the table to update index statistics and free unused space in the clustered index. This is displayed in the output of OPTIMIZE TABLE when you run it on an InnoDB table, as shown here:
```
mysql> OPTIMIZE TABLE foo;
+----------+----------+----------+---------------------------------------------------------------
```

```
| Table | Op | Msg_type | Msg_text
+----------+-----------+----------+-----------------------------------------------------------------+
| test.foo | optimize | note | Table does not support optimize, doing recreate + analyze instead
| test.foo | optimize | status | OK |
+----------+-----------+-----------+-------------------------------------------------------------------
```


OPTIMIZE TABLE uses online DDL for regular and partitioned InnoDB tables, which reduces downtime for concurrent DML operations. The table rebuild triggered by OPTIMIZE TABLE is completed in place. An exclusive table lock is only taken briefly during the prepare phase and the commit phase of the operation. During the prepare phase, metadata is updated and an intermediate table is created. During the commit phase, table metadata changes are committed.

OPTIMIZE TABLE rebuilds the table using the table copy method under the following conditions:
- When the old_alter_table system variable is enabled.
- When the server is started with the --skip-new option.

OPTIMIZE TABLE using online DDL is not supported for InnoDB tables that contain FULLTEXT indexes. The table copy method is used instead.

InnoDB stores data using a page-allocation method and does not suffer from fragmentation in the same way that legacy storage engines (such as MyISAM) do. When considering whether or not to run optimize, consider the workload of transactions that your server is expected to process:
- Some level of fragmentation is expected. InnoDB only fills pages $93 \%$ full, to leave room for updates without having to split pages.
- Delete operations might leave gaps that leave pages less filled than desired, which could make it worthwhile to optimize the table.
- Updates to rows usually rewrite the data within the same page, depending on the data type and row format, when sufficient space is available. See Section 17.9.1.5, "How Compression Works for InnoDB Tables" and Section 17.10, "InnoDB Row Formats".
- High-concurrency workloads might leave gaps in indexes over time, as InnoDB retains multiple versions of the same data due through its MVCC mechanism. See Section 17.3, "InnoDB MultiVersioning".

\section*{MyISAM Details}

For MyISAM tables, OPTIMIZE TABLE works as follows:
1. If the table has deleted or split rows, repair the table.
2. If the index pages are not sorted, sort them.
3. If the table's statistics are not up to date (and the repair could not be accomplished by sorting the index), update them.

\section*{Other Considerations}

OPTIMIZE TABLE is performed online for regular and partitioned InnoDB tables. Otherwise, MySQL locks the table during the time OPTIMIZE TABLE is running.

OPTIMIZE TABLE does not sort R-tree indexes, such as spatial indexes on POINT columns. (Bug \#23578)

\subsection*{15.7.3.5 REPAIR TABLE Statement}
```
REPAIR [NO_WRITE_TO_BINLOG | LOCAL]
    TABLE tbl_name [, tbl_name] ...
```

[QUICK] [EXTENDED] [USE_FRM]
REPAIR TABLE repairs a possibly corrupted table, for certain storage engines only.
This statement requires SELECT and INSERT privileges for the table.
Although normally you should never have to run REPAIR TABLE, if disaster strikes, this statement is very likely to get back all your data from a MyISAM table. If your tables become corrupted often, try to find the reason for it, to eliminate the need to use REPAIR TABLE. See Section B.3.3.3, "What to Do If MySQL Keeps Crashing", and Section 18.2.4, "MyISAM Table Problems".

REPAIR TABLE checks the table to see whether an upgrade is required. If so, it performs the upgrade, following the same rules as CHECK TABLE ... FOR UPGRADE. See Section 15.7.3.2, "CHECK TABLE Statement", for more information.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2880.jpg?height=99&width=104&top_left_y=845&top_left_x=301)

\section*{Important}
- Make a backup of a table before performing a table repair operation; under some circumstances the operation might cause data loss. Possible causes include but are not limited to file system errors. See Chapter 9, Backup and Recovery.
- If the server exits during a REPAIR TABLE operation, it is essential after restarting it that you immediately execute another REPAIR TABLE statement for the table before performing any other operations on it. In the worst case, you might have a new clean index file without information about the data file, and then the next operation you perform could overwrite the data file. This is an unlikely but possible scenario that underscores the value of making a backup first.
- In the event that a table on the source becomes corrupted and you run REPAIR TABLE on it, any resulting changes to the original table are not propagated to replicas.
- REPAIR TABLE Storage Engine and Partitioning Support
- REPAIR TABLE Options
- REPAIR TABLE Output
- Table Repair Considerations

\section*{REPAIR TABLE Storage Engine and Partitioning Support}

REPAIR TABLE works for MyISAM, ARCHIVE, and CSV tables. For MyISAM tables, it has the same effect as myisamchk --recover tbl_name by default. This statement does not work with views.

REPAIR TABLE is supported for partitioned tables. However, the USE_FRM option cannot be used with this statement on a partitioned table.

You can use ALTER TABLE ... REPAIR PARTITION to repair one or more partitions; for more information, see Section 15.1.9, "ALTER TABLE Statement", and Section 26.3.4, "Maintenance of Partitions".

\section*{REPAIR TABLE Options}
- NO_WRITE_TO_BINLOG or LOCAL

By default, the server writes REPAIR TABLE statements to the binary log so that they replicate to replicas. To suppress logging, specify the optional NO_WRITE_TO_BINLOG keyword or its alias LOCAL.
- QUICK

If you use the QUICK option, REPAIR TABLE tries to repair only the index file, and not the data file. This type of repair is like that done by myisamchk --recover --quick.
- EXTENDED

If you use the EXTENDED option, MySQL creates the index row by row instead of creating one index at a time with sorting. This type of repair is like that done by myisamchk --safe-recover.
- USE_FRM

The USE_FRM option is available for use if the . MYI index file is missing or if its header is corrupted. This option tells MySQL not to trust the information in the .MYI file header and to re-create it using information from the data dictionary. This kind of repair cannot be done with myisamchk.

\section*{Caution}

Use the USE_FRM option only if you cannot use regular REPAIR modes. Telling the server to ignore the . MYI file makes important table metadata stored in the .MYI unavailable to the repair process, which can have deleterious consequences:
- The current AUTO_INCREMENT value is lost.
- The link to deleted records in the table is lost, which means that free space for deleted records remains unoccupied thereafter.
- The . MYI header indicates whether the table is compressed. If the server ignores this information, it cannot tell that a table is compressed and repair can cause change or loss of table contents. This means that USE_FRM should not be used with compressed tables. That should not be necessary, anyway: Compressed tables are read only, so they should not become corrupt.

If you use USE_FRM for a table that was created by a different version of the MySQL server than the one you are currently running, REPAIR TABLE does not attempt to repair the table. In this case, the result set returned by REPAIR TABLE contains a line with a Msg_type value of error and a Msg_text value of Failed repairing incompatible .FRM file.

If USE_FRM is used, REPAIR TABLE does not check the table to see whether an upgrade is required.

\section*{REPAIR TABLE Output}

REPAIR TABLE returns a result set with the columns shown in the following table.

\begin{tabular}{|l|l|}
\hline Column & Value \\
\hline Table & The table name \\
\hline Op & Always repair \\
\hline Msg_type & status, error, info, note, or warning \\
\hline Msg_text & An informational message \\
\hline
\end{tabular}

The REPAIR TABLE statement might produce many rows of information for each repaired table. The last row has a Msg_type value of status and Msg_test normally should be OK. For a MyISAM table, if you do not get OK, you should try repairing it with myisamchk --safe-recover. (REPAIR TABLE does not implement all the options of myisamchk. With myisamchk --safe-recover, you can also use options that REPAIR TABLE does not support, such as--max-record-length.)

REPAIR TABLE table catches and throws any errors that occur while copying table statistics from the old corrupted file to the newly created file. For example. if the user ID of the owner of the . MYD or . MYI file is different from the user ID of the mysqld process, REPAIR TABLE generates a "cannot change ownership of the file" error unless mysqld is started by the root user.

\section*{Table Repair Considerations}

You may be able to increase REPAIR TABLE performance by setting certain system variables. See Section 10.6.3, "Optimizing REPAIR TABLE Statements".

REPAIR TABLE upgrades a table if it contains old temporal columns in pre-5.6.4 format; namely, the TIME, DATETIME, and TIMESTAMP columns that lacked support for fractional seconds precision.

\subsection*{15.7.4 Component, Plugin, and Loadable Function Statements}

\subsection*{15.7.4.1 CREATE FUNCTION Statement for Loadable Functions}
```
CREATE [AGGREGATE] FUNCTION [IF NOT EXISTS] function_name
    RETURNS {STRING|INTEGER|REAL|DECIMAL}
    SONAME shared_library_name
```


This statement loads the loadable function named function_name. (CREATE FUNCTION is also used to created stored functions; see Section 15.1.17, "CREATE PROCEDURE and CREATE FUNCTION Statements".)

A loadable function is a way to extend MySQL with a new function that works like a native (built-in) MySQL function such as ABS() or CONCAT( ). See Adding a Loadable Function.
function_name is the name that should be used in SQL statements to invoke the function. The RETURNS clause indicates the type of the function's return value. DECIMAL is a legal value after RETURNS, but currently DECIMAL functions return string values and should be written like STRING functions.

IF NOT EXISTS prevents an error from occurring if there already exists a loadable function with the same name. It does not prevent an error from occurring if there already exists a built-in function having the same name. IF NOT EXISTS is also supported for CREATE FUNCTION statements. See Function Name Resolution.

The AGGREGATE keyword, if given, signifies that the function is an aggregate (group) function. An aggregate function works exactly like a native MySQL aggregate function such as SUM() or COUNT( ).
shared_library_name is the base name of the shared library file containing the code that implements the function. The file must be located in the plugin directory. This directory is given by the value of the plugin_dir system variable. For more information, see Section 7.7.1, "Installing and Uninstalling Loadable Functions".

CREATE FUNCTION requires the INSERT privilege for the mysql system schema because it adds a row to the mysql. func system table to register the function.

CREATE FUNCTION also adds the function to the Performance Schema user_defined_functions table that provides runtime information about installed loadable functions. See Section 29.12.22.10, "The user_defined_functions Table".
```
Note
Like the mysql. func system table, the Performance Schema user_defined_functions table lists loadable functions installed using CREATE FUNCTION. Unlike the mysql. func table, the user_defined_functions table also lists loadable functions installed automatically by server components or plugins. This difference makes
```

> user_defined_functions preferable to mysql.func for checking which loadable functions are installed.

During the normal startup sequence, the server loads functions registered in the mysql. func table. If the server is started with the --skip-grant-tables option, functions registered in the table are not loaded and are unavailable.

\section*{Note}

To upgrade the shared library associated with a loadable function, issue a DROP FUNCTION statement, upgrade the shared library, and then issue a CREATE FUNCTION statement. If you upgrade the shared library first and then use DROP FUNCTION, the server may unexpectedly shut down.

\subsection*{15.7.4.2 DROP FUNCTION Statement for Loadable Functions}

DROP FUNCTION [IF EXISTS] function_name
This statement drops the loadable function named function_name. (DROP FUNCTION is also used to drop stored functions; see Section 15.1.29, "DROP PROCEDURE and DROP FUNCTION Statements".)

DROP FUNCTION is the complement of CREATE FUNCTION. It requires the DELETE privilege for the mysql system schema because it removes the row from the mysql. func system table that registers the function.

DROP FUNCTION also removes the function from the Performance Schema user_defined_functions table that provides runtime information about installed loadable functions. See Section 29.12.22.10, "The user_defined_functions Table".

During the normal startup sequence, the server loads functions registered in the mysql. func table. Because DROP FUNCTION removes the mysql. func row for the dropped function, the server does not load the function during subsequent restarts.

DROP FUNCTION cannot be used to drop a loadable function that is installed automatically by components or plugins rather than by using CREATE FUNCTION. Such a function is also dropped automatically, when the component or plugin that installed it is uninstalled.

\section*{Note}

To upgrade the shared library associated with a loadable function, issue a DROP FUNCTION statement, upgrade the shared library, and then issue a CREATE FUNCTION statement. If you upgrade the shared library first and then use DROP FUNCTION, the server may unexpectedly shut down.

\subsection*{15.7.4.3 INSTALL COMPONENT Statement}
```
INSTALL COMPONENT component_name [, component_name ...
        [SET variable = expr [, variable = expr] ...]
    variable: {
        {GLOBAL | @@GLOBAL.} [component_prefix.]system_var_name
    | {PERSIST | @@PERSIST.} [component_prefix.]system_var_name
}
```


This statement installs one or more components, which become active immediately. A component provides services that are available to the server and other components; see Section 7.5, "MySQL Components". INSTALL COMPONENT requires the INSERT privilege for the mysql.component system table because it adds a row to that table to register the component.

Example:
```
INSTALL COMPONENT 'file://component1', 'file://component2';
```


A component is named using a URN that begins with file:// and indicates the base name of the library file that implements the component, located in the directory named by the plugin_dir system variable. Component names do not include any platform-dependent file name suffix such as .so or .dll. (These naming details are subject to change because component name interpretation is itself performed by a service and the component infrastructure makes it possible to replace the default service implementation with alternative implementations.)

INSTALL COMPONENT permits setting the values of component system variables when you install one or more components. The SET clause enables you to specify variable values precisely when they are needed, without the inconvenience or limitations associated with other forms of assignment. Specifically, you can also set component variables with these alternatives:
- At server startup using options on the command line or in an option file, but doing so involves a server restart. The values do not take effect until you install the component. You can specify an invalid variable name for a component on the command line without triggering an error.
- Dynamically while the server is running by means of the SET statement, which enables you to modify operation of the server without having to stop and restart it. Setting a read-only variable is not permitted.

The optional SET clause applies a value, or values, only to the component specified in the INSTALL COMPONENT statement, rather than to all subsequent installations of that component. SET GLOBAL | PERSIST works for all types of variables, including read-only variables, without having to restart the server. A component system variable that you set using INSTALL COMPONENT takes precedence over any conflicting value coming from the command line or an option file.

Example:
```
INSTALL COMPONENT 'file://component1', 'file://component2'
    SET GLOBAL component1.var1 = 12 + 3, PERSIST component2.var2 = 'strings';
```


Omitting PERSIST or GLOBAL is equivalent to specifying GLOBAL.
Specifying PERSIST for any variable in SET silently executes SET PERSIST_ONLY immediately after INSTALL COMPONENT loads the components, but before updating the mysql.component table.
If SET PERSIST_ONLY fails, then the server unloads all of the previously loaded new components without persisting anything to mysql.component.

The SET clause accepts only valid variable names of the component being installed and emits an error message for all invalid names. Subqueries, stored functions, and aggregate functions are not permitted as part of the value expression. If you install a single component, it is not necessary to prefix the variable name with the component name.

\section*{Note}

While specifying a variable value using the SET clause is similar to that of the command line-it is available immediately at variable registrationthere is a distinct difference in how the SET clause handles invalid numerical values for boolean variables. For example, if you set a boolean variable to 11 (component1.boolvar = 11), you see the following behavior:
- SET clause yields true
- Command line yields false ( 11 is neither ON nor 1 )

If any error occurs, the statement fails and has no effect. For example, this happens if a component name is erroneous, a named component does not exist or is already installed, or component initialization fails.

A loader service handles component loading, which includes adding installed components to the mysql. component system table that serves as a registry. For subsequent server restarts, any
components listed in mysql. component are loaded by the loader service during the startup sequence. This occurs even if the server is started with the --skip-grant-tables option.

If a component depends on services not present in the registry and you attempt to install the component without also installing the component or components that provide the services on which it depends, an error occurs:

ERROR 3527 (HY000): Cannot satisfy dependency for service 'component_a' required by component 'component_b'.

To avoid this problem, either install all components in the same statement, or install the dependent component after installing any components on which it depends.

\section*{Note}

For keyring components, do not use INSTALL COMPONENT. Instead, configure keyring component loading using a manifest file. See Section 8.4.4.2, "Keyring Component Installation".

\subsection*{15.7.4.4 INSTALL PLUGIN Statement}

INSTALL PLUGIN plugin_name SONAME 'shared_library_name'
This statement installs a server plugin. It requires the INSERT privilege for the mysql.plugin system table because it adds a row to that table to register the plugin.
plugin_name is the name of the plugin as defined in the plugin descriptor structure contained in the library file (see Plugin Data Structures). Plugin names are not case-sensitive. For maximal compatibility, plugin names should be limited to ASCII letters, digits, and underscore because they are used in C source files, shell command lines, M4 and Bourne shell scripts, and SQL environments.
shared_library_name is the name of the shared library that contains the plugin code. The name includes the file name extension (for example, libmyplugin.so, libmyplugin.dll, or libmyplugin.dylib).

The shared library must be located in the plugin directory (the directory named by the plugin_dir system variable). The library must be in the plugin directory itself, not in a subdirectory. By default, plugin_dir is the plugin directory under the directory named by the pkglibdir configuration variable, but it can be changed by setting the value of plugin_dir at server startup. For example, set its value in a my.cnf file:
[mysqld]
plugin_dir=/path/to/plugin/directory
If the value of plugin_dir is a relative path name, it is taken to be relative to the MySQL base directory (the value of the basedir system variable).

INSTALL PLUGIN loads and initializes the plugin code to make the plugin available for use. A plugin is initialized by executing its initialization function, which handles any setup that the plugin must perform before it can be used. When the server shuts down, it executes the deinitialization function for each plugin that is loaded so that the plugin has a chance to perform any final cleanup.

INSTALL PLUGIN also registers the plugin by adding a line that indicates the plugin name and library file name to the mysql.plugin system table. During the normal startup sequence, the server loads and initializes plugins registered in mysql.plugin. This means that a plugin is installed with INSTALL PLUGIN only once, not every time the server starts. If the server is started with the --skip-granttables option, plugins registered in the mysql.plugin table are not loaded and are unavailable.

A plugin library can contain multiple plugins. For each of them to be installed, use a separate INSTALL PLUGIN statement. Each statement names a different plugin, but all of them specify the same library name.

INSTALL PLUGIN causes the server to read option (my.cnf) files just as during server startup. This enables the plugin to pick up any relevant options from those files. It is possible to add plugin options to an option file even before loading a plugin (if the loose prefix is used). It is also possible to uninstall a plugin, edit my.cnf, and install the plugin again. Restarting the plugin this way enables it to the new option values without a server restart.

For options that control individual plugin loading at server startup, see Section 7.6.1, "Installing and Uninstalling Plugins". If you need to load plugins for a single server startup when the --skip-granttables option is given (which tells the server not to read system tables), use the --plugin-load option. See Section 7.1.7, "Server Command Options".

To remove a plugin, use the UNINSTALL PLUGIN statement.
For additional information about plugin loading, see Section 7.6.1, "Installing and Uninstalling Plugins".
To see what plugins are installed, use the SHOW PLUGINS statement or query the INFORMATION_SCHEMA the PLUGINS table.

If you recompile a plugin library and need to reinstall it, you can use either of the following methods:
- Use UNINSTALL PLUGIN to uninstall all plugins in the library, install the new plugin library file in the plugin directory, and then use INSTALL PLUGIN to install all plugins in the library. This procedure has the advantage that it can be used without stopping the server. However, if the plugin library contains many plugins, you must issue many INSTALL PLUGIN and UNINSTALL PLUGIN statements.
- Stop the server, install the new plugin library file in the plugin directory, and restart the server.

\subsection*{15.7.4.5 UNINSTALL COMPONENT Statement}

UNINSTALL COMPONENT component_name [, component_name ] ...
This statement deactivates and uninstalls one or more components. A component provides services that are available to the server and other components; see Section 7.5, "MySQL Components". UNINSTALL COMPONENT is the complement of INSTALL COMPONENT. It requires the DELETE privilege for the mysql.component system table because it removes the row from that table that registers the component. UNINSTALL COMPONENT does not undo persisted variables, including the variables persisted using INSTALL COMPONENT ... SET PERSIST.

Example:
UNINSTALL COMPONENT 'file://component1', 'file://component2';
For information about component naming, see Section 15.7.4.3, "INSTALL COMPONENT Statement".
If any error occurs, the statement fails and has no effect. For example, this happens if a component name is erroneous, a named component is not installed, or cannot be uninstalled because other installed components depend on it.

A loader service handles component unloading, which includes removing uninstalled components from the mysql. component system table that serves as a registry. As a result, unloaded components are not loaded during the startup sequence for subsequent server restarts.

\section*{Note}

This statement has no effect for keyring components, which are loaded using a manifest file and cannot be uninstalled. See Section 8.4.4.2, "Keyring Component Installation".

\subsection*{15.7.4.6 UNINSTALL PLUGIN Statement}

UNINSTALL PLUGIN plugin_name

This statement removes an installed server plugin. UNINSTALL PLUGIN is the complement of INSTALL PLUGIN. It requires the DELETE privilege for the mysql.plugin system table because it removes the row from that table that registers the plugin.
plugin_name must be the name of some plugin that is listed in the mysql.plugin table. The server executes the plugin's deinitialization function and removes the row for the plugin from the mysql.plugin system table, so that subsequent server restarts do not load and initialize the plugin. UNINSTALL PLUGIN does not remove the plugin's shared library file.

You cannot uninstall a plugin if any table that uses it is open.
Plugin removal has implications for the use of associated tables. For example, if a full-text parser plugin is associated with a FULLTEXT index on the table, uninstalling the plugin makes the table unusable. Any attempt to access the table results in an error. The table cannot even be opened, so you cannot drop an index for which the plugin is used. This means that uninstalling a plugin is something to do with care unless you do not care about the table contents. If you are uninstalling a plugin with no intention of reinstalling it later and you care about the table contents, you should dump the table with mysqldump and remove the WITH PARSER clause from the dumped CREATE TABLE statement so that you can reload the table later. If you do not care about the table, DROP TABLE can be used even if any plugins associated with the table are missing.

For additional information about plugin loading, see Section 7.6.1, "Installing and Uninstalling Plugins".

\subsection*{15.7.5 CLONE Statement}
```
CLONE clone_action
clone_action: {
        LOCAL DATA DIRECTORY [=] 'clone_dir';
    | INSTANCE FROM 'user'@'host':port
        IDENTIFIED BY 'password'
        [DATA DIRECTORY [=] 'clone_dir']
        [REQUIRE [NO] SSL]
}
```


The CLONE statement is used to clone data locally or from a remote MySQL server instance. To use CLONE syntax, the clone plugin must be installed. See Section 7.6.7, "The Clone Plugin".

CLONE LOCAL DATA DIRECTORY syntax clones data from the local MySQL data directory to a directory on the same server or node where the MySQL server instance runs. The 'clone_dir' directory is the full path of the local directory that data is cloned to. An absolute path is required. The specified directory must not exist, but the specified path must be an existent path. The MySQL server requires the necessary write access to create the specified directory. For more information, see Section 7.6.7.2, "Cloning Data Locally".

CLONE INSTANCE syntax clones data from a remote MySQL server instance (the donor) and transfers it to the MySQL instance where the cloning operation was initiated (the recipient).
- user is the clone user on the donor MySQL server instance.
- host is the hostname address of the donor MySQL server instance. Internet Protocol version 6 (IPv6) address format is not supported. An alias to the IPv6 address can be used instead. An IPv4 address can be used as is.
- port is the port number of the donor MySQL server instance. (The X Protocol port specified by mysqlx_port is not supported. Connecting to the donor MySQL server instance through MySQL Router is also not supported.)
- IDENTIFIED BY 'password' specifies the password of the clone user on the donor MySQL server instance.
- DATA DIRECTORY [=] 'clone_dir' is an optional clause used to specify a directory on the recipient for the data you are cloning. Use this option if you do not want to remove existing data
in the recipient data directory. An absolute path is required, and the directory must not exist. The MySQL server must have the necessary write access to create the directory.

When the optional DATA DIRECTORY [=] 'clone_dir' clause is not used, a cloning operation removes existing data in the recipient data directory, replaces it with the cloned data, and automatically restarts the server afterward.
- [REQUIRE [NO] SSL] explicitly specifies whether an encrypted connection is to be used or not when transferring cloned data over the network. An error is returned if the explicit specification cannot be satisfied. If an SSL clause is not specified, clone attempts to establish an encrypted connection by default, falling back to an insecure connection if the secure connection attempt fails. A secure connection is required when cloning encrypted data regardless of whether this clause is specified. For more information, see Configuring an Encrypted Connection for Cloning.

For additional information about cloning data from a remote MySQL server instance, see Section 7.6.7.3, "Cloning Remote Data".

\subsection*{15.7.6 SET Statements}

The SET statement has several forms. Descriptions for those forms that are not associated with a specific server capability appear in subsections of this section:
- SET var_name = value enables you to assign values to variables that affect the operation of the server or clients. See Section 15.7.6.1, "SET Syntax for Variable Assignment".
- SET CHARACTER SET and SET NAMES assign values to character set and collation variables associated with the current connection to the server. See Section 15.7.6.2, "SET CHARACTER SET Statement", and Section 15.7.6.3, "SET NAMES Statement".

Descriptions for the other forms appear elsewhere, grouped with other statements related to the capability they help implement:
- SET DEFAULT ROLE and SET ROLE set the default role and current role for user accounts. See Section 15.7.1.9, "SET DEFAULT ROLE Statement", and Section 15.7.1.11, "SET ROLE Statement".
- SET PASSWORD assigns account passwords. See Section 15.7.1.10, "SET PASSWORD Statement".
- SET RESOURCE GROUP assigns threads to a resource group. See Section 15.7.2.4, "SET RESOURCE GROUP Statement".
- SET TRANSACTION ISOLATION LEVEL sets the isolation level for transaction processing. See Section 15.3.7, "SET TRANSACTION Statement".

\subsection*{15.7.6.1 SET Syntax for Variable Assignment}
```
SET variable = expr [, variable = expr] ...
variable: {
        user_var_name
    | param_name
    | local_var_name
    | {GLOBAL | @@GLOBAL.} system_var_name
    | {PERSIST | @@PERSIST.} system_var_name
    | {PERSIST_ONLY | @@PERSIST_ONLY.} system_var_name
    | [SESSION | @@SESSION. | @@] system_var_name
}
```


SET syntax for variable assignment enables you to assign values to different types of variables that affect the operation of the server or clients:
- User-defined variables. See Section 11.4, "User-Defined Variables".
- Stored procedure and function parameters, and stored program local variables. See Section 15.6.4, "Variables in Stored Programs".
- System variables. See Section 7.1.8, "Server System Variables". System variables also can be set at server startup, as described in Section 7.1.9, "Using System Variables".

A SET statement that assigns variable values is not written to the binary log, so in replication scenarios it affects only the host on which you execute it. To affect all replication hosts, execute the statement on each host.

The following sections describe SET syntax for setting variables. They use the $=$ assignment operator, but the := assignment operator is also permitted for this purpose.
- User-Defined Variable Assignment
- Parameter and Local Variable Assignment
- System Variable Assignment
- SET Error Handling
- Multiple Variable Assignment
- System Variable References in Expressions

\section*{User-Defined Variable Assignment}

User-defined variables are created locally within a session and exist only within the context of that session; see Section 11.4, "User-Defined Variables".

A user-defined variable is written as @var_name and is assigned an expression value as follows:
SET @var_name = expr;
Examples:
```
SET @name = 43;
SET @total_tax = (SELECT SUM(tax) FROM taxable_transactions);
```


As demonstrated by those statements, expr can range from simple (a literal value) to more complex (the value returned by a scalar subquery).

The Performance Schema user_variables_by_thread table contains information about userdefined variables. See Section 29.12.10, "Performance Schema User-Defined Variable Tables".

\section*{Parameter and Local Variable Assignment}

SET applies to parameters and local variables in the context of the stored object within which they are defined. The following procedure uses the increment procedure parameter and counter local variable:
```
CREATE PROCEDURE p(increment INT)
BEGIN
    DECLARE counter INT DEFAULT 0;
    WHILE counter < 10 DO
        -- ... do work ...
        SET counter = counter + increment;
    END WHILE;
END;
```


\section*{System Variable Assignment}

The MySQL server maintains system variables that configure its operation. A system variable can have a global value that affects server operation as a whole, a session value that affects the current session, or both. Many system variables are dynamic and can be changed at runtime using the SET statement to affect operation of the current server instance. SET can also be used to persist certain system variables to the mysqld-auto.cnf file in the data directory, to affect server operation for subsequent startups.

If a SET statement is issued for a sensitive system variable, the query is rewritten to replace the value with "<redacted>" before it is logged to the general log and audit log. This takes place even if secure storage through a keyring component is not available on the server instance.

If you change a session system variable, the value remains in effect within your session until you change the variable to a different value or the session ends. The change has no effect on other sessions.

If you change a global system variable, the value is remembered and used to initialize the session value for new sessions until you change the variable to a different value or the server exits. The change is visible to any client that accesses the global value. However, the change affects the corresponding session value only for clients that connect after the change. The global variable change does not affect the session value for any current client sessions (not even the session within which the global value change occurs).

To make a global system variable setting permanent so that it applies across server restarts, you can persist it to the mysqld-auto.cnf file in the data directory. It is also possible to make persistent configuration changes by manually modifying a my.cnf option file, but that is more cumbersome, and an error in a manually entered setting might not be discovered until much later. SET statements that persist system variables are more convenient and avoid the possibility of malformed settings because settings with syntax errors do not succeed and do not change server configuration. For more information about persisting system variables and the mysqld-auto.cnf file, see Section 7.1.9.3, "Persisted System Variables".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2890.jpg?height=127&width=99&top_left_y=1233&top_left_x=306)

\section*{Note}

Setting or persisting a global system variable value always requires special privileges. Setting a session system variable value normally requires no special privileges and can be done by any user, although there are exceptions. For more information, see Section 7.1.9.1, "System Variable Privileges".

The following discussion describes the syntax options for setting and persisting system variables:
- To assign a value to a global system variable, precede the variable name by the GLOBAL keyword or the @@GLOBAL . qualifier:
```
SET GLOBAL max_connections = 1000;
SET @@GLOBAL.max_connections = 1000;
```

- To assign a value to a session system variable, precede the variable name by the SESSION or LOCAL keyword, by the @@SESSION . , @@LOCAL . , or @@ qualifier, or by no keyword or no modifier at all:
```
SET SESSION sql_mode = 'TRADITIONAL';
SET LOCAL sql_mode = 'TRADITIONAL';
SET @@SESSION.sql_mode = 'TRADITIONAL';
SET @@LOCAL.sql_mode = 'TRADITIONAL';
SET @@sql_mode = 'TRADITIONAL';
SET sql_mode = 'TRADITIONAL';
```


A client can change its own session variables, but not those of any other client.
- To persist a global system variable to the mysqld-auto . cnf option file in the data directory, precede the variable name by the PERSIST keyword or the @@PERSIST. qualifier:
```
SET PERSIST max_connections = 1000;
SET @@PERSIST.max_connections = 1000;
```


This SET syntax enables you to make configuration changes at runtime that also persist across server restarts. Like SET GLOBAL, SET PERSIST sets the global variable runtime value, but also writes the variable setting to the mysqld-auto.cnf file (replacing any existing variable setting if there is one).
- To persist a global system variable to the mysqld-auto.cnf file without setting the global variable runtime value, precede the variable name by the PERSIST_ONLY keyword or the @@PERSIST_ONLY. qualifier:
```
SET PERSIST_ONLY back_log = 100;
SET @@PERSIST_ONLY.back_log = 100;
```


Like PERSIST, PERSIST_ONLY writes the variable setting to mysqld-auto.cnf. However, unlike PERSIST, PERSIST_ONLY does not modify the global variable runtime value. This makes PERSIST_ONLY suitable for configuring read-only system variables that can be set only at server startup.

To set a global system variable value to the compiled-in MySQL default value or a session system variable to the current corresponding global value, set the variable to the value DEFAULT. For example, the following two statements are identical in setting the session value of max_join_size to the current global value:
```
SET @@SESSION.max_join_size = DEFAULT;
SET @@SESSION.max_join_size = @@GLOBAL.max_join_size;
```


Using SET to persist a global system variable to a value of DEFAULT or to its literal default value assigns the variable its default value and adds a setting for the variable to mysqld-auto.cnf. To remove the variable from the file, use RESET PERSIST.

Some system variables cannot be persisted or are persist-restricted. See Section 7.1.9.4, "Nonpersistible and Persist-Restricted System Variables".

A system variable implemented by a plugin can be persisted if the plugin is installed when the SET statement is executed. Assignment of the persisted plugin variable takes effect for subsequent server restarts if the plugin is still installed. If the plugin is no longer installed, the plugin variable no longer exists when the server reads the mysqld-auto.cnf file. In this case, the server writes a warning to the error log and continues:
```
currently unknown variable 'var_name'
was read from the persisted config file
```


To display system variable names and values:
- Use the SHOW VARIABLES statement; see Section 15.7.7.41, "SHOW VARIABLES Statement".
- Several Performance Schema tables provide system variable information. See Section 29.12.14, "Performance Schema System Variable Tables".
- The Performance Schema variables_info table contains information showing when and by which user each system variable was most recently set. See Section 29.12.14.2, "Performance Schema variables_info Table".
- The Performance Schema persisted_variables table provides an SQL interface to the mysqld-auto.cnf file, enabling its contents to be inspected at runtime using SELECT statements. See Section 29.12.14.1, "Performance Schema persisted_variables Table".

\section*{SET Error Handling}

If any variable assignment in a SET statement fails, the entire statement fails and no variables are changed, nor is the mysqld-auto.cnf file changed.

SET produces an error under the circumstances described here. Most of the examples show SET statements that use keyword syntax (for example, GLOBAL or SESSION), but the principles are also true for statements that use the corresponding modifiers (for example, @@GLOBAL . or @@SESSION . ).
- Use of SET (any variant) to set a read-only variable:
```
mysql> SET GLOBAL version = 'abc';
```

```
ERROR 1238 (HY000): Variable 'version' is a read only variable
```

- Use of GLOBAL, PERSIST, or PERSIST_ONLY to set a variable that has only a session value:
```
mysql> SET GLOBAL sql_log_bin = ON;
ERROR 1228 (HY000): Variable 'sql_log_bin' is a SESSION
variable and can't be used with SET GLOBAL
```

- Use of SESSION to set a variable that has only a global value:
```
mysql> SET SESSION max_connections = 1000;
ERROR 1229 (HY000): Variable 'max_connections' is a
GLOBAL variable and should be set with SET GLOBAL
```

- Omission of GLOBAL, PERSIST, or PERSIST_ONLY to set a variable that has only a global value:
```
mysql> SET max_connections = 1000;
ERROR 1229 (HY000): Variable 'max_connections' is a
GLOBAL variable and should be set with SET GLOBAL
```

- Use of PERSIST or PERSIST_ONLY to set a variable that cannot be persisted:
```
mysql> SET PERSIST port = 3307;
ERROR 1238 (HY000): Variable 'port' is a read only variable
mysql> SET PERSIST_ONLY port = 3307;
ERROR 1238 (HY000): Variable 'port' is a non persistent read only variable
```

- The @@GLOBAL . , @@PERSIST . , @@PERSIST_ONLY . , @@SESSION . , and @@ modifiers apply only to system variables. An error occurs for attempts to apply them to user-defined variables, stored procedure or function parameters, or stored program local variables.
- Not all system variables can be set to DEFAULT. In such cases, assigning DEFAULT results in an error.
- An error occurs for attempts to assign DEFAULT to user-defined variables, stored procedure or function parameters, or stored program local variables.

\section*{Multiple Variable Assignment}

A SET statement can contain multiple variable assignments, separated by commas. This statement assigns values to a user-defined variable and a system variable:
```
SET @x = 1, SESSION sql_mode = '';
```


If you set multiple system variables in a single statement, the most recent GLOBAL, PERSIST, PERSIST_ONLY, or SESSION keyword in the statement is used for following assignments that have no keyword specified.

Examples of multiple-variable assignment:
```
SET GLOBAL sort_buffer_size = 1000000, SESSION sort_buffer_size = 1000000;
SET @@GLOBAL.sort_buffer_size = 1000000, @@LOCAL.sort_buffer_size = 1000000;
SET GLOBAL max_connections = 1000, sort_buffer_size = 1000000;
```


The @@GLOBAL . , @@PERSIST . , @@PERSIST_ONLY . , @@SESSION . , and @@ modifiers apply only to the immediately following system variable, not any remaining system variables. This statement sets the sort_buffer_size global value to 50000 and the session value to 1000000 :
```
SET @@GLOBAL.sort_buffer_size = 50000, sort_buffer_size = 1000000;
```


\section*{System Variable References in Expressions}

To refer to the value of a system variable in expressions, use one of the @@-modifiers (except @@PERSIST. and @@PERSIST_ONLY. , which are not permitted in expressions). For example, you can retrieve system variable values in a SELECT statement like this:

SELECT @@GLOBAL.sql_mode, @@SESSION.sql_mode, @@sql_mode;

\section*{Note}

A reference to a system variable in an expression as @@var_name (with @@ rather than @@GLOBAL . or @@SESSION . ) returns the session value if it exists and the global value otherwise. This differs from SET @@var_name = expr, which always refers to the session value.

\subsection*{15.7.6.2 SET CHARACTER SET Statement}
```
SET {CHARACTER SET | CHARSET}
    {'charset_name' | DEFAULT}
```


This statement maps all strings sent between the server and the current client with the given mapping. SET CHARACTER SET sets three session system variables: character_set_client and character_set_results are set to the given character set, and character_set_connection to the value of character_set_database. See Section 12.4, "Connection Character Sets and Collations".
charset_name may be quoted or unquoted.
The default character set mapping can be restored by using the value DEFAULT. The default depends on the server configuration.

Some character sets cannot be used as the client character set. Attempting to use them with SET CHARACTER SET produces an error. See Impermissible Client Character Sets.

\subsection*{15.7.6.3 SET NAMES Statement}
```
SET NAMES {'charset_name'
    [COLLATE 'collation_name'] | DEFAULT}
```


This statement sets the three session system variables character_set_client, character_set_connection, and character_set_results to the given character set. Setting character_set_connection to charset_name also sets collation_connection to the default collation for charset_name. See Section 12.4, "Connection Character Sets and Collations".

The optional COLLATE clause may be used to specify a collation explicitly. If given, the collation must one of the permitted collations for charset_name.
charset_name and collation_name may be quoted or unquoted.
The default mapping can be restored by using a value of DEFAULT. The default depends on the server configuration.

Some character sets cannot be used as the client character set. Attempting to use them with SET NAMES produces an error. See Impermissible Client Character Sets.

\subsection*{15.7.7 SHOW Statements}

SHOW has many forms that provide information about databases, tables, columns, or status information about the server. This section describes those following:
```
SHOW BINARY LOG STATUS
SHOW BINARY LOGS
SHOW BINLOG EVENTS [IN 'log_name'] [FROM pos] [LIMIT [offset,] row_count]
SHOW {CHARACTER SET | CHARSET} [like_or_where]
SHOW COLLATION [like_or_where]
SHOW [FULL] COLUMNS FROM tbl_name [FROM db_name] [like_or_where]
SHOW CREATE DATABASE db_name
SHOW CREATE EVENT event_name
```

```
SHOW CREATE FUNCTION func_name
SHOW CREATE PROCEDURE proc_name
SHOW CREATE TABLE tbl_name
SHOW CREATE TRIGGER trigger_name
SHOW CREATE VIEW view_name
SHOW DATABASES [like_or_where]
SHOW ENGINE engine_name {STATUS | MUTEX}
SHOW [STORAGE] ENGINES
SHOW ERRORS [LIMIT [offset,] row_count]
SHOW EVENTS
SHOW FUNCTION CODE func_name
SHOW FUNCTION STATUS [like_or_where]
SHOW GRANTS FOR user
SHOW INDEX FROM tbl_name [FROM db_name]
SHOW OPEN TABLES [FROM db_name] [like_or_where]
SHOW PLUGINS
SHOW PROCEDURE CODE proc_name
SHOW PROCEDURE STATUS [like_or_where]
SHOW PRIVILEGES
SHOW [FULL] PROCESSLIST
SHOW PROFILE [types] [FOR QUERY n] [OFFSET n] [LIMIT n]
SHOW PROFILES
SHOW RELAYLOG EVENTS [IN 'log_name'] [FROM pos] [LIMIT [offset,] row_count]
SHOW REPLICA STATUS [FOR CHANNEL channel]
SHOW REPLICAS
SHOW [GLOBAL | SESSION] STATUS [like_or_where]
SHOW TABLE STATUS [FROM db_name] [like_or_where]
SHOW [FULL] TABLES [FROM db_name] [like_or_where]
SHOW TRIGGERS [FROM db_name] [like_or_where]
SHOW [GLOBAL | SESSION] VARIABLES [like_or_where]
SHOW WARNINGS [LIMIT [offset,] row_count]
like_or_where: {
        LIKE 'pattern'
    | WHERE expr
}
```


If the syntax for a given SHOW statement includes a LIKE 'pattern' part, 'pattern' is a string that can contain the SQL \% and _ wildcard characters. The pattern is useful for restricting statement output to matching values.

Several SHOW statements also accept a WHERE clause that provides more flexibility in specifying which rows to display. See Section 28.8, "Extensions to SHOW Statements".

In SHOW statement results, user names and host names are quoted using backticks (ˋ).
Many MySQL APIs (such as PHP) enable you to treat the result returned from a SHOW statement as you would a result set from a SELECT; see Chapter 31, Connectors and APIs, or your API documentation for more information. In addition, you can work in SQL with results from queries on tables in the INFORMATION_SCHEMA database, which you cannot easily do with results from SHOW statements. See Chapter 28, INFORMATION_SCHEMA Tables.

\subsection*{15.7.7.1 SHOW BINARY LOG STATUS Statement}
```
SHOW BINARY LOG STATUS
```


This statement provides status information about binary log files on the source server, and requires the REPLICATION CLIENT privilege (or the deprecated SUPER privilege).

Example:
```
mysql> SHOW BINARY LOG STATUS\G
************************** 1. row *****************************************
            File: source-bin.000002
        Position: 1307
    Binlog_Do_DB: test
    log_Ignore_DB: manual, mysql
Executed_Gtid_Set: 3E11FA47-71CA-11E1-9E33-C80AA9429562:1-5
```


1 row in set (0.00 sec)
When global transaction IDs are in use, Executed_Gtid_Set shows the set of GTIDs for transactions that have been executed on the source. This is the same as the value for the gtid_executed system variable on this server, as well as the value for Executed_Gtid_Set in the output of SHOW REPLICA STATUS on this server.

\subsection*{15.7.7.2 SHOW BINARY LOGS Statement}

SHOW BINARY LOGS
Lists the binary log files on the server. This statement is used as part of the procedure described in Section 15.4.1.1, "PURGE BINARY LOGS Statement", that shows how to determine which logs can be purged. SHOW BINARY LOGS requires the REPLICATION CLIENT privilege (or the deprecated SUPER privilege).

Encrypted binary log files have a 512-byte file header that stores information required for encryption and decryption of the file. This is included in the file size displayed by SHOW BINARY LOGS. The Encrypted column shows whether or not the binary log file is encrypted. Binary log encryption is active if binlog_encryption=0N is set for the server. Existing binary log files are not encrypted or decrypted if binary log encryption is activated or deactivated while the server is running.
```
mysql> SHOW BINARY LOGS;
+----------------+-----------+-----------+
| Log_name | File_size | Encrypted |
+----------------+-----------+-----------+
| binlog.000015 | 724935 | Yes |
| binlog.000016 | 733481 | Yes |
+----------------+-----------+-----------+
```


\subsection*{15.7.7.3 SHOW BINLOG EVENTS Statement}
```
SHOW BINLOG EVENTS
    [IN 'log_name']
    [FROM pos]
    [LIMIT [offset,] row_count]
```


Shows the events in the binary log. If you do not specify 'log_name ', the first binary log is displayed. SHOW BINLOG EVENTS requires the REPLICATION SLAVE privilege.

The LIMIT clause has the same syntax as for the SELECT statement. See Section 15.2.13, "SELECT Statement".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2895.jpg?height=126&width=99&top_left_y=1850&top_left_x=370)

\section*{Note}

Issuing a SHOW BINLOG EVENTS with no LIMIT clause could start a very timeand resource-consuming process because the server returns to the client the complete contents of the binary log (which includes all statements executed by the server that modify data). As an alternative to SHOW BINLOG EVENTS, use the mysqlbinlog utility to save the binary log to a text file for later examination and analysis. See Section 6.6.9, "mysqlbinlog — Utility for Processing Binary Log Files".

SHOW BINLOG EVENTS displays the following fields for each event in the binary log:
- Log_name

The name of the file that is being listed.
- Pos

The position at which the event occurs.
- Event_type

An identifier that describes the event type.
- Server_id

The server ID of the server on which the event originated.
- End_log_pos

The position at which the next event begins, which is equal to Pos plus the size of the event.
- Info

More detailed information about the event type. The format of this information depends on the event type.

For compressed transaction payloads, the Transaction_payload_event is first printed as a single unit, then it is unpacked and each event inside it is printed.

Some events relating to the setting of user and system variables are not included in the output from SHOW BINLOG EVENTS. To get complete coverage of events within a binary log, use mysqlbinlog.

SHOW BINLOG EVENTS does not work with relay log files. You can use SHOW RELAYLOG EVENTS for this purpose.

\subsection*{15.7.7.4 SHOW CHARACTER SET Statement}
```
SHOW {CHARACTER SET | CHARSET}
    [LIKE 'pattern' | WHERE expr]
```


The SHOW CHARACTER SET statement shows all available character sets. The LIKE clause, if present, indicates which character set names to match. The WHERE clause can be given to select rows using more general conditions, as discussed in Section 28.8, "Extensions to SHOW Statements". For example:
```
mysql> SHOW CHARACTER SET LIKE 'latin%';
+----------+------------------------------+------------------------------
| Charset | Description | Default collation | Maxlen |
+----------+------------------------------+------------------+----------
| latin1 | cp1252 West European | latin1_swedish_ci | 1 |
| latin2 | ISO 8859-2 Central European | latin2_general_ci | 1 |
| latin5 | ISO 8859-9 Turkish | latin5_turkish_ci | 1 |
| latin7 | ISO 8859-13 Baltic | latin7_general_ci | 1 |
+----------+------------------------------+-----------------------------
```


SHOW CHARACTER SET output has these columns:
- Charset

The character set name.
- Description

A description of the character set.
- Default collation

The default collation for the character set.
- Maxlen

The maximum number of bytes required to store one character.
The filename character set is for internal use only; consequently, SHOW CHARACTER SET does not display it.

Character set information is also available from the INFORMATION_SCHEMA CHARACTER_SETS table.

\subsection*{15.7.7.5 SHOW COLLATION Statement}
```
SHOW COLLATION
    [LIKE 'pattern' | WHERE expr]
```


This statement lists collations supported by the server. By default, the output from SHOW COLLATION includes all available collations. The LIKE clause, if present, indicates which collation names to match. The WHERE clause can be given to select rows using more general conditions, as discussed in Section 28.8, "Extensions to SHOW Statements". For example:
```
mysql> SHOW COLLATION WHERE Charset = 'latin1';
+--------------------+----------+----+---------+----------+--------+
| Collation | Charset | Id | Default | Compiled | Sortlen |
+--------------------+----------+----+---------+----------+---------+
| latin1_german1_ci | latin1 | 5 | | Yes | 
| latin1_swedish_ci | latin1 | 8 | Yes | Yes | 1 |
| latin1_danish_ci | latin1 | 15 | 1 |
| latin1_german2_ci | latin1 | 31 | | Yes | 2 |
| latin1_bin | latin1 | 47 | | Yes
| latin1_general_ci | latin1 | 48 | | Yes
| latin1_general_cs | latin1 | 49 | | Yes
| latin1_spanish_ci | latin1 | 94 | | Yes | 
+--------------------+----------+----+---------+---------+---------+
```


SHOW COLLATION output has these columns:
- Collation

The collation name.
- Charset

The name of the character set with which the collation is associated.
- Id

The collation ID.
- Default

Whether the collation is the default for its character set.
- Compiled

Whether the character set is compiled into the server.
- Sortlen

This is related to the amount of memory required to sort strings expressed in the character set.
- Pad_attribute

The collation pad attribute, one of NO PAD or PAD SPACE. This attribute affects whether trailing spaces are significant in string comparisons; for more information, see Trailing Space Handling in Comparisons.

To see the default collation for each character set, use the following statement. Default is a reserved word, so to use it as an identifier, it must be quoted as such:
```
mysql> SHOW COLLATION WHERE ˋDefaultˋ = 'Yes';
+-----------------------+----------+----+---------+----------+--------+
| Collation | Charset | Id | Default | Compiled | Sortlen |
+----------------------+----------+----+---------+----------+--------+
| big5_chinese_ci | big5 | 1 | Yes | Yes | 1 |
```

```

\begin{tabular}{|l|l|l|l|l|l|} 
dec8_swedish_ci & dec8 & 3 & Yes & Yes & 1 \\
cp850_general_ci & cp850 & 4 & Yes & Yes & 1 \\
hp8_english_ci & hp8 & 6 & Yes & Yes & 1 \\
koi8r_general_ci & koi8r & 7 & Yes & Yes & 1 \\
latin1_swedish_ci & latin1 & 8 & Yes & Yes & 1 \\
\hline
\end{tabular}
```


Collation information is also available from the INFORMATION_SCHEMA COLLATIONS table. See Section 28.3.6, "The INFORMATION_SCHEMA COLLATIONS Table".

\subsection*{15.7.7.6 SHOW COLUMNS Statement}
```
SHOW [EXTENDED] [FULL] {COLUMNS | FIELDS}
    {FROM | IN} tbl_name
    [{FROM | IN} db_name]
    [LIKE 'pattern' | WHERE expr]
```


SHOW COLUMNS displays information about the columns in a given table. It also works for views. SHOW COLUMNS displays information only for those columns for which you have some privilege.
```
mysql> SHOW COLUMNS FROM City;

\begin{tabular}{|l|l|l|l|l|l|}
\hline Field & Type & Null & Key & Default & Extra \\
\hline ID & int(11) & N0 & PRI & NULL & auto_increment \\
\hline Name & char(35) & N0 & & & \\
\hline CountryCode & char (3) & N0 & MUL & & \\
\hline District & char(20) & N0 & & & \\
\hline Population & int(11) & NO & & 0 & \\
\hline
\end{tabular}
```


An alternative to tbl_name FROM db_name syntax is db_name.tbl_name. These two statements are equivalent:

SHOW COLUMNS FROM mytable FROM mydb;
SHOW COLUMNS FROM mydb.mytable;
The optional EXTENDED keyword causes the output to include information about hidden columns that MySQL uses internally and are not accessible by users.

The optional FULL keyword causes the output to include the column collation and comments, as well as the privileges you have for each column.

The LIKE clause, if present, indicates which column names to match. The WHERE clause can be given to select rows using more general conditions, as discussed in Section 28.8, "Extensions to SHOW Statements".

The data types may differ from what you expect them to be based on a CREATE TABLE statement because MySQL sometimes changes data types when you create or alter a table. The conditions under which this occurs are described in Section 15.1.20.7, "Silent Column Specification Changes".

SHOW COLUMNS displays the following values for each table column:
- Field

The name of the column.
- Type

The column data type.
- Collation

The collation for nonbinary string columns, or NULL for other columns. This value is displayed only if you use the FULL keyword.
- Null

The column nullability. The value is YES if NULL values can be stored in the column, NO if not.
- Key

Whether the column is indexed:
- If Key is empty, the column either is not indexed or is indexed only as a secondary column in a multiple-column, nonunique index.
- If Key is PRI, the column is a PRIMARY KEY or is one of the columns in a multiple-column PRIMARY KEY.
- If Key is UNI, the column is the first column of a UNIQUE index. (A UNIQUE index permits multiple NULL values, but you can tell whether the column permits NULL by checking the Null field.)
- If Key is MUL, the column is the first column of a nonunique index in which multiple occurrences of a given value are permitted within the column.

If more than one of the Key values applies to a given column of a table, Key displays the one with the highest priority, in the order PRI, UNI, MUL.

A UNIQUE index may be displayed as PRI if it cannot contain NULL values and there is no PRIMARY KEY in the table. A UNIQUE index may display as MUL if several columns form a composite UNIQUE index; although the combination of the columns is unique, each column can still hold multiple occurrences of a given value.
- Default

The default value for the column. This is NULL if the column has an explicit default of NULL, or if the column definition includes no DEFAULT clause.
- Extra

Any additional information that is available about a given column. The value is nonempty in these cases:
- auto_increment for columns that have the AUTO_INCREMENT attribute.
- on update CURRENT_TIMESTAMP for TIMESTAMP or DATETIME columns that have the ON UPDATE CURRENT_TIMESTAMP attribute.
- VIRTUAL GENERATED or STORED GENERATED for generated columns.
- DEFAULT_GENERATED for columns that have an expression default value.
- Privileges

The privileges you have for the column. This value is displayed only if you use the FULL keyword.
- Comment

Any comment included in the column definition. This value is displayed only if you use the FULL keyword.

Table column information is also available from the INFORMATION_SCHEMA COLUMNS table. See Section 28.3.8, "The INFORMATION_SCHEMA COLUMNS Table". The extended information about hidden columns is available only using SHOW EXTENDED COLUMNS; it cannot be obtained from the COLUMNS table.

You can list a table's columns with the mysqlshow db_name tbl_name command.

The DESCRIBE statement provides information similar to SHOW COLUMNS. See Section 15.8.1, "DESCRIBE Statement".

The ShOW CREATE TABLE, SHOW TABLE STATUS, and SHOW INDEX statements also provide information about tables. See Section 15.7.7, "SHOW Statements".

SHOW COLUMNS includes the table's generated invisible primary key, if it has one, by default. You can cause this information to be suppressed in the statement's output by setting show_gipk_in_create_table_and_information_schema = OFF. For more information, see Section 15.1.20.11, "Generated Invisible Primary Keys".

\subsection*{15.7.7.7 SHOW CREATE DATABASE Statement}

SHOW CREATE \{DATABASE | SCHEMA\} [IF NOT EXISTS] db_name
Shows the CREATE DATABASE statement that creates the named database. If the SHOW statement includes an IF NOT EXISTS clause, the output too includes such a clause. SHOW CREATE SCHEMA is a synonym for SHOW CREATE DATABASE.
```
mysql> SHOW CREATE DATABASE test\G
************************** 1. rOW ****************************************
    Database: test
Create Database: CREATE DATABASE ˋtestˋ /*!40100 DEFAULT CHARACTER SET utf8mb4
        COLLATE utf8mb4_0900_ai_ci */ /*!80014 DEFAULT ENCRYPTION='N' */
mysql> SHOW CREATE SCHEMA test\G
*************************** 1. rOW ***************************************
    Database: test
Create Database: CREATE DATABASE ˋtestˋ /*!40100 DEFAULT CHARACTER SET utf8mb4
        COLLATE utf8mb4_0900_ai_ci */ /*!80014 DEFAULT ENCRYPTION='N' */
```


SHOW CREATE DATABASE quotes table and column names according to the value of the sql_quote_show_create option. See Section 7.1.8, "Server System Variables".

\subsection*{15.7.7.8 SHOW CREATE EVENT Statement}
```
SHOW CREATE EVENT event_name
```


This statement displays the CREATE EVENT statement needed to re-create a given event. It requires the EVENT privilege for the database from which the event is to be shown. For example (using the same event e_daily defined and then altered in Section 15.7.7.19, "SHOW EVENTS Statement"):
```
mysql> SHOW CREATE EVENT myschema.e_daily\G
************************** 1. row ******************************
                Event: e_daily
            sql_mode: ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,
                    NO_ZERO_IN_DATE,NO_ZERO_DATE,
                    ERROR_FOR_DIVISION_BY_ZERO,
                    NO_ENGINE_SUBSTITUTION
            time_zone: SYSTEM
        Create Event: CREATE DEFINER=ˋjonˋ@ˋghidoraˋ EVENT ˋe_dailyˋ
                        ON SCHEDULE EVERY 1 DAY
                        STARTS CURRENT_TIMESTAMP + INTERVAL 6 HOUR
                        ON COMPLETION NOT PRESERVE
                        ENABLE
                        COMMENT 'Saves total number of sessions then
                                        clears the table each day'
                        DO BEGIN
                            INSERT INTO site_activity.totals (time, total)
                                SELECT CURRENT_TIMESTAMP, COUNT(*)
                                    FROM site_activity.sessions;
                            DELETE FROM site_activity.sessions;
                        END
character_set_client: utf8mb4
collation_connection: utf8mb4_0900_ai_ci
    Database Collation: utf8mb4_0900_ai_ci
```

character_set_client is the session value of the character_set_client system variable when the event was created. collation_connection is the session value of the collation_connection system variable when the event was created. Database Collation is the collation of the database with which the event is associated.

The output reflects the current status of the event (ENABLE) rather than the status with which it was created.

\subsection*{15.7.7.9 SHOW CREATE FUNCTION Statement}

SHOW CREATE FUNCTION func_name
This statement is similar to SHOW CREATE PROCEDURE but for stored functions. See Section 15.7.7.10, "SHOW CREATE PROCEDURE Statement".

\subsection*{15.7.7.10 SHOW CREATE PROCEDURE Statement}

SHOW CREATE PROCEDURE proc_name
This statement is a MySQL extension. It returns the exact string that can be used to re-create the named stored procedure. A similar statement, SHOW CREATE FUNCTION, displays information about stored functions (see Section 15.7.7.9, "SHOW CREATE FUNCTION Statement").

To use either statement, you must be the user named as the routine DEFINER, have the SHOW_ROUTINE privilege, have the SELECT privilege at the global level, or have the CREATE ROUTINE, ALTER ROUTINE, or EXECUTE privilege granted at a scope that includes the routine. The value displayed for the Create Procedure or Create Function field is NULL if you have only CREATE ROUTINE, ALTER ROUTINE, or EXECUTE.
```
mysql> SHOW CREATE PROCEDURE test.citycount\G
*************************** 1. rOW ***************************************
            Procedure: citycount
                sql_mode: ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,
                    NO_ZERO_IN_DATE,NO_ZERO_DATE,
                    ERROR_FOR_DIVISION_BY_ZERO,
                    NO_ENGINE_SUBSTITUTION
        Create Procedure: CREATE DEFINER=ˋmeˋ@ˋlocalhostˋ
                    PROCEDURE ˋcitycountˋ(IN country CHAR(3), OUT cities INT)
                    BEGIN
                        SELECT COUNT(*) INTO cities FROM world.city
                        WHERE CountryCode = country;
                END
character_set_client: utf8mb4
collation_connection: utf8mb4_0900_ai_ci
    Database Collation: utf8mb4_0900_ai_ci
mysql> SHOW CREATE FUNCTION test.hello\G
*************************** 1. rOW ***************************************
            Function: hello
                sql_mode: ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,
                    NO_ZERO_IN_DATE,NO_ZERO_DATE,
                    ERROR_FOR_DIVISION_BY_ZERO,
                    NO_ENGINE_SUBSTITUTION
        Create Function: CREATE DEFINER=ˋmeˋ@ˋlocalhostˋ
                FUNCTION ˋhelloˋ(s CHAR(20))
                RETURNS char(50) CHARSET utf8mb4
                DETERMINISTIC
                RETURN CONCAT('Hello, ',s,'!')
character_set_client: utf8mb4
collation_connection: utf8mb4_0900_ai_ci
    Database Collation: utf8mb4_0900_ai_ci
```

character_set_client is the session value of the character_set_client system variable when the routine was created. collation_connection is the session value of the collation_connection system variable when the routine was created. Database Collation is the collation of the database with which the routine is associated.

\subsection*{15.7.7.11 SHOW CREATE TABLE Statement}

SHOW CREATE TABLE tbl_name
Shows the CREATE TABLE statement that creates the named table. To use this statement, you must have some privilege for the table. This statement also works with views.
```
mysql> SHOW CREATE TABLE t\G
************************** 1. row ****************************************
        Table: t
Create Table: CREATE TABLE ˋtˋ (
    ˋidˋ int NOT NULL AUTO_INCREMENT,
    ˋsˋ char(60) DEFAULT NULL,
    PRIMARY KEY (ˋidˋ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
```


SHOW CREATE TABLE displays all CHECK constraints as table constraints. That is, a CHECK constraint originally specified as part of a column definition displays as a separate clause not part of the column definition. Example:
```
mysql> CREATE TABLE t1 (
            i1 INT CHECK (i1 <> 0), -- column constraint
            i2 INT,
            CHECK (i2 > i1), -- table constraint
            CHECK (i2 <> 0) NOT ENFORCED -- table constraint, not enforced
        );
mysql> SHOW CREATE TABLE t1\G
************************** 1. row ******************************
        Table: t1
Create Table: CREATE TABLE ˋt1ˋ (
    ˋi1ˋ int DEFAULT NULL,
    ˋi2ˋ int DEFAULT NULL,
    CONSTRAINT ˋt1_chk_1ˋ CHECK ((ˋi1ˋ <> 0)),
    CONSTRAINT ˋt1_chk_2ˋ CHECK ((ˋi2ˋ > ˋi1ˋ)),
    CONSTRAINT ˋt1_chk_3ˋ CHECK ((ˋi2ˋ <> 0)) /*!80016 NOT ENFORCED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
```


SHOW CREATE TABLE quotes table and column names according to the value of the sql_quote_show_create option. See Section 7.1.8, "Server System Variables".

When altering the storage engine of a table, table options that are not applicable to the new storage engine are retained in the table definition to enable reverting the table with its previously defined options to the original storage engine, if necessary. For example, when changing the storage engine from InnoDB to MyISAM, options specific to InnoDB, such as ROW_FORMAT=COMPACT, are retained, as shown here:
```
mysql> CREATE TABLE t1 (c1 INT PRIMARY KEY) ROW_FORMAT=COMPACT ENGINE=InnoDB;
mysql> ALTER TABLE t1 ENGINE=MyISAM;
mysql> SHOW CREATE TABLE t1\G
************************** 1. row *****************************************
        Table: t1
Create Table: CREATE TABLE ˋt1ˋ (
    ˋc1ˋ int NOT NULL,
    PRIMARY KEY (ˋc1ˋ)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=COMPACT
```


When creating a table with strict mode disabled, the storage engine's default row format is used if the specified row format is not supported. The actual row format of the table is reported in the Row_format column in response to SHOW TABLE STATUS. SHOW CREATE TABLE shows the row format that was specified in the CREATE TABLE statement.

SHOW CREATE TABLE also includes the definition of the table's generated invisible primary key, if it has such a key, by default. You can cause this information to be suppressed in the statement's output by setting show_gipk_in_create_table_and_information_schema = OFF. For more information, see Section 15.1.20.11, "Generated Invisible Primary Keys".

\subsection*{15.7.7.12 SHOW CREATE TRIGGER Statement}

SHOW CREATE TRIGGER trigger_name
This statement shows the CREATE TRIGGER statement that creates the named trigger. This statement requires the TRIGGER privilege for the table associated with the trigger.
```
mysql> SHOW CREATE TRIGGER ins_sum\G
*************************** 1. row
            Trigger: ins_sum
            sql_mode: ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,
                NO_ZERO_IN_DATE,NO_ZERO_DATE,
                ERROR_FOR_DIVISION_BY_ZERO,
                NO_ENGINE_SUBSTITUTION
SQL Original Statement: CREATE DEFINER=ˋmeˋ@ˋlocalhostˋ TRIGGER ˋins_sumˋ
                BEFORE INSERT ON ˋaccountˋ
                FOR EACH ROW SET @sum = @sum + NEW.amount
    character_set_client: utf8mb4
    collation_connection: utf8mb4_0900_ai_ci
        Database Collation: utf8mb4_0900_ai_ci
            Created: 2018-08-08 10:10:12.61
```


SHOW CREATE TRIGGER output has these columns:
- Trigger: The trigger name.
- sql_mode: The SQL mode in effect when the trigger executes.
- SQL Original Statement: The CREATE TRIGGER statement that defines the trigger.
- character_set_client: The session value of the character_set_client system variable when the trigger was created.
- collation_connection: The session value of the collation_connection system variable when the trigger was created.
- Database Collation: The collation of the database with which the trigger is associated.
- Created: The date and time when the trigger was created. This is a TIMESTAMP ( 2 ) value (with a fractional part in hundredths of seconds) for triggers.

Trigger information is also available from the INFORMATION_SCHEMA TRIGGERS table. See Section 28.3.44, "The INFORMATION_SCHEMA TRIGGERS Table".

\subsection*{15.7.7.13 SHOW CREATE USER Statement}

SHOW CREATE USER user
This statement shows the CREATE USER statement that creates the named user. An error occurs if the user does not exist. The statement requires the SELECT privilege for the mysql system schema, except to see information for the current user. For the current user, the SELECT privilege for the mysql. user system table is required for display of the password hash in the IDENTIFIED AS clause; otherwise, the hash displays as <secret>.

To name the account, use the format described in Section 8.2.4, "Specifying Account Names". The host name part of the account name, if omitted, defaults to ' $\%$ ' . It is also possible to specify CURRENT_USER or CURRENT_USER( ) to refer to the account associated with the current session.

Password hash values displayed in the IDENTIFIED WITH clause of output from SHOW CREATE USER may contain unprintable characters that have adverse effects on terminal displays and in other environments. Enabling the print_identified_with_as_hex system variable causes SHOW CREATE USER to display such hash values as hexadecimal strings rather than as regular string literals. Hash values that do not contain unprintable characters still display as regular string literals, even with this variable enabled.
```
mysql> CREATE USER 'u1'@'localhost' IDENTIFIED BY 'secret';
```

```
mysql> SET print_identified_with_as_hex = ON;
mysql> SHOW CREATE USER 'u1'@'localhost'\G
*************************** 1. row *****************************
CREATE USER for u1@localhost: CREATE USER ˋu1ˋ@ˋlocalhostˋ
IDENTIFIED WITH 'caching_sha2_password'
AS 0x244124303035240C7745603626313D613C4C10633E0A104B1E14135A544A7871567245614F4872344643546336546F624F6C78
REQUIRE NONE PASSWORD EXPIRE DEFAULT ACCOUNT UNLOCK
PASSWORD HISTORY DEFAULT PASSWORD REUSE INTERVAL DEFAULT
PASSWORD REQUIRE CURRENT DEFAULT
```


To display the privileges granted to an account, use the SHOW GRANTS statement. See Section 15.7.7.22, "SHOW GRANTS Statement".

\subsection*{15.7.7.14 SHOW CREATE VIEW Statement}

SHOW CREATE VIEW view_name
This statement shows the CREATE VIEW statement that creates the named view.
```
mysql> SHOW CREATE VIEW v\G
*************************** 1. r OW ***************************************
        View: v
    Create View: CREATE ALGORITHM=UNDEFINED
            DEFINER=ˋbobˋ@ˋlocalhostˋ
            SQL SECURITY DEFINER VIEW
                vˋ AS select 1 AS ˋaˋ,2 AS ˋbˋ
character_set_client: utf8mb4
collation_connection: utf8mb4_0900_ai_ci
```

character_set_client is the session value of the character_set_client system variable when the view was created. collation_connection is the session value of the collation_connection system variable when the view was created.

Use of SHOW CREATE VIEW requires the SHOW VIEW privilege, and the SELECT privilege for the view in question.

View information is also available from the INFORMATION_SCHEMA VIEWS table. See Section 28.3.47, "The INFORMATION_SCHEMA VIEWS Table".

MySQL lets you use different sql_mode settings to tell the server the type of SQL syntax to support. For example, you might use the ANSI SQL mode to ensure MySQL correctly interprets the standard SQL concatenation operator, the double bar ( $|\mid$ ), in your queries. If you then create a view that concatenates items, you might worry that changing the sql_mode setting to a value different from ANSI could cause the view to become invalid. But this is not the case. No matter how you write out a view definition, MySQL always stores it the same way, in a canonical form. Here is an example that shows how the server changes a double bar concatenation operator to a CONCAT( ) function:
```
mysql> SET sql_mode = 'ANSI';
Query OK, 0 rows affected (0.00 sec)
mysql> CREATE VIEW test.v AS SELECT 'a' || 'b' as col1;
Query OK, 0 rows affected (0.01 sec)
mysql> SHOW CREATE VIEW test.v\G
***************************** 1. row
        View: v
    Create View: CREATE VIEW "v" AS select concat('a','b') AS "col1"
...
1 row in set (0.00 sec)
```


The advantage of storing a view definition in canonical form is that changes made later to the value of sql_mode do not affect the results from the view. However an additional consequence is that comments prior to SELECT are stripped from the definition by the server.

\subsection*{15.7.7.15 SHOW DATABASES Statement}

SHOW \{DATABASES | SCHEMAS\}

\section*{[LIKE 'pattern' | WHERE expr]}

SHOW DATABASES lists the databases on the MySQL server host. SHOW SCHEMAS is a synonym for SHOW DATABASES. The LIKE clause, if present, indicates which database names to match. The WHERE clause can be given to select rows using more general conditions, as discussed in Section 28.8, "Extensions to SHOW Statements".

You see only those databases for which you have some kind of privilege, unless you have the global SHOW DATABASES privilege. You can also get this list using the mysqlshow command.

If the server was started with the --skip-show-database option, you cannot use this statement at all unless you have the SHOW DATABASES privilege.

MySQL implements databases as directories in the data directory, so this statement simply lists directories in that location. However, the output may include names of directories that do not correspond to actual databases.

Database information is also available from the INFORMATION_SCHEMA SCHEMATA table. See Section 28.3.31, "The INFORMATION_SCHEMA SCHEMATA Table".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2905.jpg?height=108&width=104&top_left_y=1014&top_left_x=365)

\section*{Caution}

Because any static global privilege is considered a privilege for all databases, any static global privilege enables a user to see all database names with SHOW DATABASES or by examining the SCHEMATA table of INFORMATION_SCHEMA, except databases that have been restricted at the database level by partial revokes.

\subsection*{15.7.7.16 SHOW ENGINE Statement}

SHOW ENGINE engine_name \{STATUS | MUTEX\}
SHOW ENGINE displays operational information about a storage engine. It requires the PROCESS privilege. The statement has these variants:

SHOW ENGINE INNODB STATUS
SHOW ENGINE INNODB MUTEX
SHOW ENGINE PERFORMANCE_SCHEMA STATUS
SHOW ENGINE INNODB STATUS displays extensive information from the standard InnoDB Monitor about the state of the InnoDB storage engine. For information about the standard monitor and other InnoDB Monitors that provide information about InnoDB processing, see Section 17.17, "InnoDB Monitors".

SHOW ENGINE INNODB MUTEX displays InnoDB mutex and rw-lock statistics.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2905.jpg?height=108&width=99&top_left_y=1987&top_left_x=370)

\section*{Note}

InnoDB mutexes and rwlocks can also be monitored using Performance Schema tables. See Section 17.16.2, "Monitoring InnoDB Mutex Waits Using Performance Schema".

Mutex statistics collection is configured dynamically using the following options:
- To enable the collection of mutex statistics, run:

SET GLOBAL innodb_monitor_enable='latch';
- To reset mutex statistics, run:

SET GLOBAL innodb_monitor_reset='latch';
- To disable the collection of mutex statistics, run:
```
SET GLOBAL innodb_monitor_disable='latch';
```


Collection of mutex statistics for SHOW ENGINE INNODB MUTEX can also be enabled by setting innodb_monitor_enable='all', or disabled by setting innodb_monitor_disable='all'.

SHOW ENGINE INNODB MUTEX output has these columns:
- Type

\section*{Always InnoDB.}
- Name

For mutexes, the Name field reports only the mutex name. For rwlocks, the Name field reports the source file where the rwlock is implemented, and the line number in the file where the rwlock is created. The line number is specific to your version of MySQL.

\section*{- Status}

The mutex status. This field reports the number of spins, waits, and calls. Statistics for low-level operating system mutexes, which are implemented outside of InnoDB, are not reported.
- spins indicates the number of spins.
- waits indicates the number of mutex waits.
- calls indicates how many times the mutex was requested.

SHOW ENGINE INNODB MUTEX does not list mutexes and rw-locks for each buffer pool block, as the amount of output would be overwhelming on systems with a large buffer pool. SHOW ENGINE INNODB MUTEX does, however, print aggregate BUF_BLOCK_MUTEX spin, wait, and call values for buffer pool block mutexes and rw-locks. SHOW ENGINE INNODB MUTEX also does not list any mutexes or rwlocks that have never been waited on (os_waits=0). Thus, SHOW ENGINE INNODB MUTEX only displays information about mutexes and rw-locks outside of the buffer pool that have caused at least one OS-level wait.

Use SHOW ENGINE PERFORMANCE_SCHEMA STATUS to inspect the internal operation of the Performance Schema code:
```
mysql> SHOW ENGINE PERFORMANCE_SCHEMA STATUS\G
...
************************** 3.row ******************************************
    Type: performance_schema
    Name: events_waits_history.size
Status: 76
************************** 4. row
    Type: performance_schema
    Name: events_waits_history.count
Status: 10000
************************** 5. row *****************************************
    Type: performance_schema
    Name: events_waits_history.memory
Status: 760000
...
************************** 57. row ****************************************
    Type: performance_schema
    Name: performance_schema.memory
Status: 26459600
...
```


This statement is intended to help the DBA understand the effects that different Performance Schema options have on memory requirements.

Name values consist of two parts, which name an internal buffer and a buffer attribute, respectively. Interpret buffer names as follows:
- An internal buffer that is not exposed as a table is named within parentheses. Examples: (pfs_cond_class).size, (pfs_mutex_class).memory.
- An internal buffer that is exposed as a table in the performance_schema database is named after the table, without parentheses. Examples: events_waits_history.size, mutex_instances.count.
- A value that applies to the Performance Schema as a whole begins with performance_schema. Example: performance_schema.memory.

Buffer attributes have these meanings:
- size is the size of the internal record used by the implementation, such as the size of a row in a table. size values cannot be changed.
- count is the number of internal records, such as the number of rows in a table. count values can be changed using Performance Schema configuration options.
- For a table, tbl_name.memory is the product of size and count. For the Performance Schema as a whole, performance_schema.memory is the sum of all the memory used (the sum of all other memory values).

In some cases, there is a direct relationship between a Performance Schema configuration parameter and a SHOW ENGINE value. For example, events_waits_history_long.count corresponds to performance_schema_events_waits_history_long_size. In other cases, the relationship is more complex. For example, events_waits_history.count corresponds to performance_schema_events_waits_history_size (the number of rows per thread) multiplied by performance_schema_max_thread_instances (the number of threads).

SHOW ENGINE NDB STATUS. If the server has the NDB storage engine enabled, SHOW ENGINE NDB STATUS displays cluster status information such as the number of connected data nodes, the cluster connectstring, and cluster binary log epochs, as well as counts of various Cluster API objects created by the MySQL Server when connected to the cluster. Sample output from this statement is shown here:
```
mysql> SHOW ENGINE NDB STATUS;
+-------------+------------------------+-------------------------------------------------
| Type | Name | Status |
+-------------+-----------------------+--------------------------------------------------
| ndbcluster | connection | cluster_node_id=7,
    connected_host=198.51.100.103, connected_port=1186, number_of_data_nodes=4,
    number_of_ready_data_nodes=3, connect_count=0
| ndbcluster | NdbTransaction | created=6, free=0, sizeof=212
| ndbcluster | NdbOperation | created=8, free=8, sizeof=660
| ndbcluster | NdbIndexScanOperation | created=1, free=1, sizeof=744
| ndbcluster | NdbIndexOperation | created=0, free=0, sizeof=664
| ndbcluster | NdbRecAttr | created=1285, free=1285, sizeof=60
| ndbcluster | NdbApiSignal | created=16, free=16, sizeof=136
| ndbcluster | NdbLabel | created=0, free=0, sizeof=196
| ndbcluster | NdbBranch | created=0, free=0, sizeof=24
| ndbcluster | NdbSubroutine | created=0, free=0, sizeof=68
| ndbcluster | NdbCall | created=0, free=0, sizeof=16
| ndbcluster | NdbBlob | created=1, free=1, sizeof=264
| ndbcluster | NdbReceiver | created=4, free=0, sizeof=68
| ndbcluster | binlog | latest_epoch=155467, latest_trans_epoch=148126,
    latest_received_binlog_epoch=0, latest_handled_binlog_epoch=0,
    latest_applied_binlog_epoch=0 |
+-------------+-----------------------+-------------------------------------------------
```


The Status column in each of these rows provides information about the MySQL server's connection to the cluster and about the cluster binary log's status, respectively. The Status information is in the form of comma-delimited set of name-value pairs.

The connection row's Status column contains the name-value pairs described in the following table.

\begin{tabular}{|l|l|}
\hline Name & Value \\
\hline cluster_node_id & The node ID of the MySQL server in the cluster \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Name & Value \\
\hline connected_host & The host name or IP address of the cluster management server to which the MySQL server is connected \\
\hline connected_port & The port used by the MySQL server to connect to the management server (connected_host) \\
\hline number_of_data_nodes & The number of data nodes configured for the cluster (that is, the number of [ndbd] sections in the cluster config.ini file) \\
\hline number_of_ready_data_nodes & The number of data nodes in the cluster that are actually running \\
\hline connect_count & The number of times this mysqld has connected or reconnected to cluster data nodes \\
\hline
\end{tabular}

The binlog row's Status column contains information relating to NDB Cluster Replication. The name-value pairs it contains are described in the following table.

\begin{tabular}{|l|l|}
\hline Name & Value \\
\hline latest_epoch & The most recent epoch most recently run on this MySQL server (that is, the sequence number of the most recent transaction run on the server) \\
\hline latest_trans_epoch & The most recent epoch processed by the cluster's data nodes \\
\hline latest_received_binlog_epoch & The most recent epoch received by the binary log thread \\
\hline latest_handled_binlog_epoch & The most recent epoch processed by the binary log thread (for writing to the binary log) \\
\hline latest_applied_binlog_epoch & The most recent epoch actually written to the binary log \\
\hline
\end{tabular}

See Section 25.7, "NDB Cluster Replication", for more information.
The remaining rows from the output of SHOW ENGINE NDB STATUS which are most likely to prove useful in monitoring the cluster are listed here by Name:
- NdbTransaction: The number and size of NdbTransaction objects that have been created. An NdbTransaction is created each time a table schema operation (such as CREATE TABLE or ALTER TABLE) is performed on an NDB table.
- NdbOperation: The number and size of NdbOperation objects that have been created.
- NdbIndexScanOperation: The number and size of NdbIndexScanOperation objects that have been created.
- NdbIndexOperation: The number and size of NdbIndexOperation objects that have been created.
- NdbRecAttr: The number and size of NdbRecAttr objects that have been created. In general, one of these is created each time a data manipulation statement is performed by an SQL node.
- NdbBlob: The number and size of NdbBlob objects that have been created. An NdbBlob is created for each new operation involving a BLOB column in an NDB table.
- NdbReceiver: The number and size of any NdbReceiver object that have been created. The number in the created column is the same as the number of data nodes in the cluster to which the MySQL server has connected.

\section*{Note}

SHOW ENGINE NDB STATUS returns an empty result if no operations involving NDB tables have been performed during the current session by the MySQL client accessing the SQL node on which this statement is run.

\subsection*{15.7.7.17 SHOW ENGINES Statement}

\section*{SHOW [STORAGE] ENGINES}

SHOW ENGINES displays status information about the server's storage engines. This is particularly useful for checking whether a storage engine is supported, or to see what the default engine is.

For information about MySQL storage engines, see Chapter 17, The InnoDB Storage Engine, and Chapter 18, Alternative Storage Engines.
```
mysql> SHOW ENGINES\G
************************** 1. rOW *****************************************
            Engine: MEMORY
        Support: YES
        Comment: Hash based, stored in memory, useful for temporary tables
Transactions: NO
                XA: NO
    Savepoints: NO
                    2. row **************************
            Engine: InnoDB
        Support: DEFAULT
        Comment: Supports transactions, row-level locking, and foreign keys
Transactions: YES
                XA: YES
    Savepoints: YES
************************* 3. row *******************************
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
            Engine: MRG_MYISAM
        Support: YES
        Comment: Collection of identical MyISAM tables
Transactions: NO
                XA: NO
    Savepoints: NO
************************** 6. row *****************************************
            Engine: BLACKHOLE
        Support: YES
        Comment: /dev/null storage engine (anything you write to it disappears)
Transactions: NO
                XA: NO
    Savepoints: NO
************************** 7row ********************************
            Engine: CSV
        Support: YES
        Comment: CSV storage engine
Transactions: NO
                XA: NO
    Savepoints: NO
************************* 8. rOW ******************************************
            Engine: ARCHIVE
        Support: YES
        Comment: Archive storage engine
```

```
Transactions: NO
        XA: NO
    Savepoints: NO
```


The output from SHOW ENGINES may vary according to the MySQL version used and other factors.
SHOW ENGINES output has these columns:
- Engine

The name of the storage engine.
- Support

The server's level of support for the storage engine, as shown in the following table.

\begin{tabular}{|l|l|}
\hline Value & Meaning \\
\hline YES & The engine is supported and is active \\
\hline DEFAULT & Like YES, plus this is the default engine \\
\hline NO & The engine is not supported \\
\hline DISABLED & The engine is supported but has been disabled \\
\hline
\end{tabular}

A value of NO means that the server was compiled without support for the engine, so it cannot be enabled at runtime.

A value of DISABLED occurs either because the server was started with an option that disables the engine, or because not all options required to enable it were given. In the latter case, the error log should contain a reason indicating why the option is disabled. See Section 7.4.2, "The Error Log".

You might also see DISABLED for a storage engine if the server was compiled to support it, but was started with a --skip-engine_name option. For the NDB storage engine, DISABLED means the server was compiled with support for NDB Cluster, but was not started with the --ndbcluster option.

All MySQL servers support MyISAM tables. It is not possible to disable MyISAM.
- Comment

A brief description of the storage engine.
- Transactions

Whether the storage engine supports transactions.
- XA

Whether the storage engine supports XA transactions.
- Savepoints

Whether the storage engine supports savepoints.
Storage engine information is also available from the INFORMATION_SCHEMA ENGINES table. See Section 28.3.13, "The INFORMATION_SCHEMA ENGINES Table".

\subsection*{15.7.7.18 SHOW ERRORS Statement}

SHOW ERRORS [LIMIT [offset,] row_count]
SHOW COUNT(*) ERRORS
SHOW ERRORS is a diagnostic statement that is similar to SHOW WARNINGS, except that it displays information only for errors, rather than for errors, warnings, and notes.

The LIMIT clause has the same syntax as for the SELECT statement. See Section 15.2.13, "SELECT Statement".

The SHOW COUNT( *) ERRORS statement displays the number of errors. You can also retrieve this number from the error_count variable:
```
SHOW COUNT(*) ERRORS;
SELECT @@error_count;
```


SHOW ERRORS and error_count apply only to errors, not warnings or notes. In other respects, they are similar to SHOW WARNINGS and warning_count. In particular, SHOW ERRORS cannot display information for more than max_error_count messages, and error_count can exceed the value of max_error_count if the number of errors exceeds max_error_count.

For more information, see Section 15.7.7.42, "SHOW WARNINGS Statement".

\subsection*{15.7.7.19 SHOW EVENTS Statement}
```
SHOW EVENTS
    [{FROM | IN} schema_name]
    [LIKE 'pattern' | WHERE expr]
```


This statement displays information about Event Manager events, which are discussed in Section 27.4, "Using the Event Scheduler". It requires the EVENT privilege for the database from which the events are to be shown.

In its simplest form, SHOW EVENTS lists all of the events in the current schema:
```
mysql> SELECT CURRENT_USER(), SCHEMA();
+-----------------+----------+
| CURRENT_USER() | SCHEMA() |
+-----------------+----------+
| jon@ghidora | myschema |
+-----------------+----------+
1 row in set (0.00 sec)
mysql> SHOW EVENTS\G
************************** 1. row ******************************
                            Db: myschema
                    Name: e_daily
                Definer: jon@ghidora
                Time zone: SYSTEM
                    Type: RECURRING
            Execute at: NULL
        Interval value: 1
        Interval field: DAY
                Starts: 2018-08-08 11:06:34
                    Ends: NULL
                Status: ENABLED
            Originator: 1
character_set_client: utf8mb4
collation_connection: utf8mb4_0900_ai_ci
    Database Collation: utf8mb4_0900_ai_ci
```


To see events for a specific schema, use the FROM clause. For example, to see events for the test schema, use the following statement:

SHOW EVENTS FROM test;
The LIKE clause, if present, indicates which event names to match. The WHERE clause can be given to select rows using more general conditions, as discussed in Section 28.8, "Extensions to SHOW Statements".

SHOW EVENTS output has these columns:
- Db

The name of the schema (database) to which the event belongs.
- Name

The name of the event.
- Definer

The account of the user who created the event, in 'user_name'@'host_name' format.
- Time zone

The event time zone, which is the time zone used for scheduling the event and that is in effect within the event as it executes. The default value is SYSTEM.
- Type

The event repetition type, either ONE TIME (transient) or RECURRING (repeating).
- Execute At

For a one-time event, this is the DATETIME value specified in the AT clause of the CREATE EVENT statement used to create the event, or of the last ALTER EVENT statement that modified the event. The value shown in this column reflects the addition or subtraction of any INTERVAL value included in the event's AT clause. For example, if an event is created using ON SCHEDULE AT CURRENT_TIMESTAMP + '1:6' DAY_HOUR, and the event was created at 2018-02-09 14:05:30, the value shown in this column would be '2018-02-10 $20: 05: 30$ '. If the event's timing is determined by an EVERY clause instead of an AT clause (that is, if the event is recurring), the value of this column is NULL.
- Interval Value

For a recurring event, the number of intervals to wait between event executions. For a transient event, the value of this column is always NULL.
- Interval Field

The time units used for the interval which a recurring event waits before repeating. For a transient event, the value of this column is always NULL.
- Starts

The start date and time for a recurring event. This is displayed as a DATETIME value, and is NULL if no start date and time are defined for the event. For a transient event, this column is always NULL. For a recurring event whose definition includes a STARTS clause, this column contains the corresponding DATETIME value. As with the Execute At column, this value resolves any expressions used. If there is no STARTS clause affecting the timing of the event, this column is NULL
- Ends

For a recurring event whose definition includes a ENDS clause, this column contains the corresponding DATETIME value. As with the Execute At column, this value resolves any expressions used. If there is no ENDS clause affecting the timing of the event, this column is NULL.
- Status

The event status. One of ENABLED, DISABLED, or REPLICA_SIDE_DISABLED. REPLICA_SIDE_DISABLED indicates that the creation of the event occurred on another MySQL server acting as a replication source and replicated to the current MySQL server which is acting as a replica, but the event is not presently being executed on the replica. For more information, see Section 19.5.1.16, "Replication of Invoked Features". information.

REPLICA_SIDE_DISABLED replaces SLAVESIDE_DISABLED, which is now deprecated and subject to removal in a future version of MySQL.
- Originator

The server ID of the MySQL server on which the event was created; used in replication. This value may be updated by ALTER EVENT to the server ID of the server on which that statement occurs, if executed on a source server. The default value is 0 .
- character_set_client

The session value of the character_set_client system variable when the event was created.
- collation_connection

The session value of the collation_connection system variable when the event was created.
- Database Collation

The collation of the database with which the event is associated.
For more information about REPLICA_SIDE_DISABLED and the Originator column, see Section 19.5.1.16, "Replication of Invoked Features".

Times displayed by SHOW EVENTS are given in the event time zone, as discussed in Section 27.4.4, "Event Metadata".

Event information is also available from the INFORMATION_SCHEMA EVENTS table. See Section 28.3.14, "The INFORMATION_SCHEMA EVENTS Table".

The event action statement is not shown in the output of SHOW EVENTS. Use SHOW CREATE EVENT or the INFORMATION_SCHEMA EVENTS table.

\subsection*{15.7.7.20 SHOW FUNCTION CODE Statement}

SHOW FUNCTION CODE func_name
This statement is similar to SHOW PROCEDURE CODE but for stored functions. See Section 15.7.7.29, "SHOW PROCEDURE CODE Statement".

\subsection*{15.7.7.21 SHOW FUNCTION STATUS Statement}
```
SHOW FUNCTION STATUS
    [LIKE 'pattern' | WHERE expr]
```


This statement is similar to SHOW PROCEDURE STATUS but for stored functions. See Section 15.7.7.30, "SHOW PROCEDURE STATUS Statement".

\subsection*{15.7.7.22 SHOW GRANTS Statement}
```
SHOW GRANTS
        [FOR user_or_role
            [USING role [, role] ...]]
user_or_role: {
        user (see Section 8.2.4, "Specifying Account Names")
    | role (see Section 8.2.5, "Specifying Role Names".
}
```


This statement displays the privileges and roles that are assigned to a MySQL user account or role, in the form of GRANT statements that must be executed to duplicate the privilege and role assignments.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2914.jpg?height=148&width=106&top_left_y=239&top_left_x=294)

\section*{Note}

To display nonprivilege information for MySQL accounts, use the SHOW CREATE USER statement. See Section 15.7.7.13, "SHOW CREATE USER Statement".

SHOW GRANTS requires the SELECT privilege for the mysql system schema, except to display privileges and roles for the current user.

To name the account or role for SHOW GRANTS, use the same format as for the GRANT statement (for example, 'jeffrey'@'localhost'):
```
mysql> SHOW GRANTS FOR 'jeffrey'@'localhost';
+------------------------------------------------------------------------
| Grants for jeffrey@localhost |
+----------------------------------------------------------------------
| GRANT USAGE ON *.* TO ˋjeffreyˋ@ˋlocalhostˋ
| GRANT SELECT, INSERT, UPDATE ON ˋdb1ˋ.* TO ˋjeffreyˋ@ˋlocalhostˋ |
+---------------------------------------------------------------------
```


The host part, if omitted, defaults to ' $\%$ '. For additional information about specifying account and role names, see Section 8.2.4, "Specifying Account Names", and Section 8.2.5, "Specifying Role Names".

To display the privileges granted to the current user (the account you are using to connect to the server), you can use any of the following statements:
```
SHOW GRANTS;
SHOW GRANTS FOR CURRENT_USER;
SHOW GRANTS FOR CURRENT_USER();
```


If SHOW GRANTS FOR CURRENT_USER (or any equivalent syntax) is used in definer context, such as within a stored procedure that executes with definer rather than invoker privileges, the grants displayed are those of the definer and not the invoker.

In MySQL 8.4 compared to previous series, SHOW GRANTS no longer displays ALL PRIVILEGES in its global-privileges output because the meaning of ALL PRIVILEGES at the global level varies depending on which dynamic privileges are defined. Instead, SHOW GRANTS explicitly lists each granted global privilege:
```
mysql> SHOW GRANTS FOR 'root'@'localhost';
+--------------------------------------------------------------------------
| Grants for root@localhost |
+-------------------------------------------------------------------------
| GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, RELOAD,
| SHUTDOWN, PROCESS, FILE, REFERENCES, INDEX, ALTER, SHOW DATABASES,
| SUPER, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE, REPLICATION
| SLAVE, REPLICATION CLIENT, CREATE VIEW, SHOW VIEW, CREATE ROUTINE,
| ALTER ROUTINE, CREATE USER, EVENT, TRIGGER, CREATE TABLESPACE,
| CREATE ROLE, DROP ROLE ON *.* TO ˋrootˋ@ˋlocalhostˋ WITH GRANT
| OPTION
| GRANT PROXY ON ''@'' TO ˋrootˋ@ˋlocalhostˋ WITH GRANT OPTION
```


Applications that process SHOW GRANTS output should be adjusted accordingly.
At the global level, GRANT OPTION applies to all granted static global privileges if granted for any of them, but applies individually to granted dynamic privileges. SHOW GRANTS displays global privileges this way:
- One line listing all granted static privileges, if there are any, including WITH GRANT OPTION if appropriate.
- One line listing all granted dynamic privileges for which GRANT OPTION is granted, if there are any, including WITH GRANT OPTION.
- One line listing all granted dynamic privileges for which GRANT OPTION is not granted, if there are any, without WITH GRANT OPTION.

With the optional USING clause, SHOW GRANTS enables you to examine the privileges associated with roles for the user. Each role named in the USING clause must be granted to the user.

Suppose that user $u 1$ is assigned roles $r 1$ and $r 2$, as follows:
```
CREATE ROLE 'r1', 'r2';
GRANT SELECT ON db1.* TO 'r1';
GRANT INSERT, UPDATE, DELETE ON db1.* TO 'r2';
CREATE USER 'u1'@'localhost' IDENTIFIED BY 'u1pass';
GRANT 'r1', 'r2' TO 'u1'@'localhost';
```


SHOW GRANTS without USING shows the granted roles:
```
mysql> SHOW GRANTS FOR 'u1'@'localhost';
+-----------------------------------------------
| Grants for u1@localhost |
+------------------------------------------------
| GRANT USAGE ON *.* TO ˋu1ˋ @ˋlocalhostˋ
| GRANT ˋr1ˋ@ˋ%ˋ,ˋr2ˋ@ˋ%ˋ TO ˋu1ˋ@ˋlocalhostˋ |
+---------------------------------------------+
```


Adding a USING clause causes the statement to also display the privileges associated with each role named in the clause:
```
mysql> SHOW GRANTS FOR 'u1'@'localhost' USING 'r1';
+-----------------------------------------------
| Grants for u1@localhost |
+----------------------------------------------+
| GRANT USAGE ON *.* TO ˋu1ˋ@ˋlocalhostˋ
| GRANT SELECT ON ˋdb1ˋ.* TO ˋu1ˋ@ˋlocalhostˋ |
| GRANT ˋr1ˋ@ˋ%ˋ,ˋr2ˋ@ˋ%ˋ TO ˋu1ˋ@ˋlocalhostˋ |
+-----------------------------------------------+
mysql> SHOW GRANTS FOR 'u1'@'localhost' USING 'r2';
+-----------------------------------------------------------------
| Grants for u1@localhost |
+------------------------------------------------------------------
| GRANT USAGE ON *.* TO ˋu1ˋ@ˋlocalhost
| GRANT INSERT, UPDATE, DELETE ON ˋdb1ˋ.* TO ˋu1ˋ @ˋlocalhostˋ
| GRANT ˋr1ˋ@ˋ%ˋ,ˋr2ˋ@ˋ%ˋ TO ˋu1 @ˋlocalhostˋ
+----------------------------------------------------------------
mysql> SHOW GRANTS FOR 'u1'@'localhost' USING 'r1', 'r2';
+--------------------------------------------------------------------------
| Grants for u1@localhost |
| GRANT USAGE ON *.* TO ˋu1ˋ@ˋlocalhostˋ
| GRANT SELECT, INSERT, UPDATE, DELETE ON ˋdb1ˋ.* TO ˋu1ˋ@ˋlocalhostˋ |
| GRANT ˋr1ˋ@ˋ%ˋ,ˋr2ˋ@ˋ%ˋ TO ˋu1ˋ@ˋlocalhostˋ |
```


\section*{Note}

A privilege granted to an account is always in effect, but a role is not. The active roles for an account can differ across and within sessions, depending on the value of the activate_all_roles_on_login system variable, the account default roles, and whether SET ROLE has been executed within a session.

MySQL supports partial revocation of global privileges, such that a global privilege can be restricted from applying to particular schemas (see Section 8.2.12, "Privilege Restriction Using Partial Revokes"). To indicate which global schema privileges have been revoked for particular schemas, SHOW GRANTS output includes REVOKE statements:
```
mysql> SET PERSIST partial_revokes = ON;
mysql> CREATE USER u1;
mysql> GRANT SELECT, INSERT, DELETE ON *.* TO u1;
mysql> REVOKE SELECT, INSERT ON mysql.* FROM u1;
mysql> REVOKE DELETE ON world.* FROM u1;
mysql> SHOW GRANTS FOR u1;
+------------------------------------------------------
| Grants for u1@%
```

```
+------------------------------------------------------
| GRANT SELECT, INSERT, DELETE ON *.* TO ˋu1ˋ@ˋ%ˋ
| REVOKE SELECT, INSERT ON ˋmysqlˋ.* FROM ˋu1ˋ@ˋ%ˋ
| REVOKE DELETE ON ˋworldˋ.* FROM ˋu1ˋ@ˋ%ˋ |
+------------------------------------------------------
```


SHOW GRANTS does not display privileges that are available to the named account but are granted to a different account. For example, if an anonymous account exists, the named account might be able to use its privileges, but SHOW GRANTS does not display them.

SHOW GRANTS displays mandatory roles named in the mandatory_roles system variable value as follows:
- SHOW GRANTS without a FOR clause displays privileges for the current user, and includes mandatory roles.
- SHOW GRANTS FOR user displays privileges for the named user, and does not include mandatory roles.

This behavior is for the benefit of applications that use the output of SHOW GRANTS FOR user to determine which privileges are granted explicitly to the named user. Were that output to include mandatory roles, it would be difficult to distinguish roles granted explicitly to the user from mandatory roles.

For the current user, applications can determine privileges with or without mandatory roles by using SHOW GRANTS or SHOW GRANTS FOR CURRENT_USER, respectively.

\subsection*{15.7.7.23 SHOW INDEX Statement}
```
SHOW [EXTENDED] {INDEX | INDEXES | KEYS}
        {FROM | IN} tbl_name
        [{FROM | IN} db_name]
        [WHERE expr]
```


SHOW INDEX returns table index information. The format resembles that of the SQLStatistics call in ODBC. This statement requires some privilege for any column in the table.
```
mysql> SHOW INDEX FROM City\G
************************** 1. row *****************************************
                    Table: city
        Non_unique: 0
            Key_name: PRIMARY
    Seq_in_index: 1
    Column_name: ID
        Collation: A
    Cardinality: 4188
            Sub_part: NULL
                    Packed: NULL
                        Null:
        Index_type: BTREE
                Comment:
Index_comment:
                Visible: YES
        Expression: NULL
************************* 2. rOW ******************************************
                        Table: city
        Non_unique: 1
            Key_name: CountryCode
Seq_in_index: 1
    Column_name: CountryCode
        Collation: A
    Cardinality: 232
            Sub_part: NULL
                    Packed: NULL
                        Null:
        Index_type: BTREE
                Comment:
```

```
Index_comment:
        Visible: YES
    Expression: NULL
```


An alternative to tbl_name FROM db_name syntax is db_name.tbl_name. These two statements are equivalent:

SHOW INDEX FROM mytable FROM mydb;
SHOW INDEX FROM mydb.mytable;
The optional EXTENDED keyword causes the output to include information about hidden indexes that MySQL uses internally and are not accessible by users.

The WHERE clause can be given to select rows using more general conditions, as discussed in Section 28.8, "Extensions to SHOW Statements".

SHOW INDEX returns the following fields:
- Table

The name of the table.
- Non_unique

0 if the index cannot contain duplicates, 1 if it can.
- Key_name

The name of the index. If the index is the primary key, the name is always PRIMARY.
- Seq_in_index

The column sequence number in the index, starting with 1.
- Column_name

The column name. See also the description for the Expression column.
- Collation

How the column is sorted in the index. This can have values A (ascending), D (descending), or NULL (not sorted).
- Cardinality

An estimate of the number of unique values in the index. To update this number, run ANALYZE TABLE or (for MyISAM tables) myisamchk -a.

Cardinality is counted based on statistics stored as integers, so the value is not necessarily exact even for small tables. The higher the cardinality, the greater the chance that MySQL uses the index when doing joins.
- Sub_part

The index prefix. That is, the number of indexed characters if the column is only partly indexed, NULL if the entire column is indexed.

\section*{Note}

Prefix limits are measured in bytes. However, prefix lengths for index specifications in CREATE TABLE, ALTER TABLE, and CREATE INDEX statements are interpreted as number of characters for nonbinary string types (CHAR, VARCHAR, TEXT) and number of bytes for binary string types (BINARY,

VARBINARY, BLOB). Take this into account when specifying a prefix length for a nonbinary string column that uses a multibyte character set.

For additional information about index prefixes, see Section 10.3.5, "Column Indexes", and Section 15.1.15, "CREATE INDEX Statement".
- Packed

Indicates how the key is packed. NULL if it is not.
- Null

Contains YES if the column may contain NULL values and ' ' if not.
- Index_type

The index method used (BTREE, FULLTEXT, HASH, RTREE).
- Comment

Information about the index not described in its own column, such as disabled if the index is disabled.
- Index_comment

Any comment provided for the index with a COMMENT attribute when the index was created.
- Visible

Whether the index is visible to the optimizer. See Section 10.3.12, "Invisible Indexes".
- Expression

MySQL supports functional key parts (see Functional Key Parts); this affects both the Column_name and Expression columns:
- For a nonfunctional key part, Column_name indicates the column indexed by the key part and Expression is NULL.
- For a functional key part, Column_name column is NULL and Expression indicates the expression for the key part.

Information about table indexes is also available from the INFORMATION_SCHEMA STATISTICS table. See Section 28.3.34, "The INFORMATION_SCHEMA STATISTICS Table". The extended information about hidden indexes is available only using SHOW EXTENDED INDEX; it cannot be obtained from the STATISTICS table.

You can list a table's indexes with the mysqlshow - k db_name tbl_name command.
SHOW INDEX includes the table's generated invisible key, if it has one, by default.
You can cause this information to be suppressed in the statement's output by setting show_gipk_in_create_table_and_information_schema = OFF. For more information, see Section 15.1.20.11, "Generated Invisible Primary Keys".

\subsection*{15.7.7.24 SHOW MASTER STATUS Statement (no longer supported)}

This statement is no longer supported, and has been replaced by SHOW BINARY LOG STATUS.

\subsection*{15.7.7.25 SHOW OPEN TABLES Statement}

SHOW OPEN TABLES
[\{FROM | IN\} db_name]

\section*{[LIKE 'pattern' | WHERE expr]}

SHOW OPEN TABLES lists the non-TEMPORARY tables that are currently open in the table cache. See Section 10.4.3.1, "How MySQL Opens and Closes Tables". The FROM clause, if present, restricts the tables shown to those present in the $d b \_n a m e$ database. The LIKE clause, if present, indicates which table names to match. The WHERE clause can be given to select rows using more general conditions, as discussed in Section 28.8, "Extensions to SHOW Statements".

SHOW OPEN TABLES output has these columns:
- Database

The database containing the table.
- Table

The table name.
- In_use

The number of table locks or lock requests there are for the table. For example, if one client acquires a lock for a table using LOCK TABLE t1 WRITE, In_use is 1 . If another client issues LOCK TABLE t1 WRITE while the table remains locked, the client blocks, waiting for the lock, but the lock request causes In_use to be 2 . If the count is zero, the table is open but not currently being used. In_use is also increased by the HANDLER ... OPEN statement and decreased by HANDLER ... CLOSE.
- Name_locked

Whether the table name is locked. Name locking is used for operations such as dropping or renaming tables.

If you have no privileges for a table, it does not show up in the output from SHOW OPEN TABLES.

\subsection*{15.7.7.26 SHOW PARSE_TREE Statement}

SHOW PARSE_TREE select_statement
SHOW PARSE_TREE displays a representation of the parse tree for the input SELECT statement, in JSON format.

\section*{Note}

This statement is available only in debug builds, or if the MySQL server was built using - DWITH_SHOW_PARSE_TREE. It is intended for use in testing and development only, and not in production.

Example:
```
mysql> SHOW PARSE_TREE SELECT * FROM t3 WHERE o_id > 2\G
************************** 1. row *****************************
Show_parse_tree: {
    "text": "SELECT * FROM t3 WHERE o_id > 2",
    "type": "PT_select_stmt",
    "components": [
        {
            "text": "SELECT * FROM t3 WHERE o_id > 2",
            "type": "PT_query_expression",
            "components": [
                {
                    "text": "SELECT * FROM t3 WHERE o_id > 2",
                    "type": "PT_query_specification",
                    "components": [
                        {
                            "text": "*",
                            "type": "PT_select_item_list",
```

```
                        "components": [
                                {
                                    "text": "*",
                                    "type": "Item_asterisk"
                                }
                            ]
                        },
                        {
                            "text": "t3",
                            "type": "PT_table_factor_table_ident",
                            "table_ident": "ˋt3ˋ"
                        },
                        {
                            "text": "o_id > 2",
                            "type": "PTI_where",
                            "components": [
                                {
                                    "text": "o_id > 2",
                                    "type": "PTI_comp_op",
                                    "operator": ">",
                                    "components": [
                                        {
                                            "text": "o_id",
                                            "type": "PTI_simple_ident_ident"
                                        },
                                        {
                                            "text": "2",
                                            "type": "Item_int"
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}
1 row in set (0.01 sec)
```


\subsection*{15.7.7.27 SHOW PLUGINS Statement}

\section*{SHOW PLUGINS}

SHOW PLUGINS displays information about server plugins.
Example of SHOW PLUGINS output:
```
mysql> SHOW PLUGINS\G
************************** 1. row ******************************
        Name: binlog
    Status: ACTIVE
        Type: STORAGE ENGINE
Library: NULL
License: GPL
    ************************* 2. row ******************************************
        Name: CSV
    Status: ACTIVE
        Type: STORAGE ENGINE
Library: NULL
License: GPL
************************* 3.row ********************************
        Name: MEMORY
    Status: ACTIVE
        Type: STORAGE ENGINE
Library: NULL
License: GPL
***************************************************************************
        Name: MyISAM
    Status: ACTIVE
        Type: STORAGE ENGINE
```

```
Library: NULL
License: GPL
...
```


SHOW PLUGINS output has these columns:
- Name

The name used to refer to the plugin in statements such as INSTALL PLUGIN and UNINSTALL PLUGIN.
- Status

The plugin status, one of ACTIVE, INACTIVE, DISABLED, DELETING, or DELETED.
- Type

The type of plugin, such as STORAGE ENGINE, INFORMATION_SCHEMA, or AUTHENTICATION.
- Library

The name of the plugin shared library file. This is the name used to refer to the plugin file in statements such as INSTALL PLUGIN and UNINSTALL PLUGIN. This file is located in the directory named by the plugin_dir system variable. If the library name is NULL, the plugin is compiled in and cannot be uninstalled with UNINSTALL PLUGIN.
- License

How the plugin is licensed (for example, GPL).
For plugins installed with INSTALL PLUGIN, the Name and Library values are also registered in the mysql.plugin system table.

For information about plugin data structures that form the basis of the information displayed by SHOW PLUGINS, see The MySQL Plugin API.

Plugin information is also available from the INFORMATION_SCHEMA .PLUGINS table. See Section 28.3.22, "The INFORMATION_SCHEMA PLUGINS Table".

\subsection*{15.7.7.28 SHOW PRIVILEGES Statement}

\section*{SHOW PRIVILEGES}

SHOW PRIVILEGES shows the list of system privileges that the MySQL server supports. The privileges displayed include all static privileges, and all currently registered dynamic privileges.
```
mysql> SHOW PRIVILEGES\G
************************* 1. row ******************************
Privilege: Alter
    Context: Tables
    Comment: To alter the table
*************************** 2. row ****************************************
Privilege: Alter routine
    Context: Functions,Procedures
    Comment: To alter or drop stored functions/procedures
************************** 3. row *****************************************
Privilege: Create
    Context: Databases,Tables,Indexes
    Comment: To create new databases and tables
*************************** 4. row ****************************************
Privilege: Create routine
    Context: Databases
    Comment: To use CREATE FUNCTION/PROCEDURE
************************** 5. rOW *****************************************
Privilege: Create role
    Context: Server Admin
```

```
    Comment: To create new roles
...
```


Privileges belonging to a specific user are displayed by the SHOW GRANTS statement. See Section 15.7.7.22, "SHOW GRANTS Statement", for more information.

\subsection*{15.7.7.29 SHOW PROCEDURE CODE Statement}
```
SHOW PROCEDURE CODE proc_name
```


This statement is a MySQL extension that is available only for servers that have been built with debugging support. It displays a representation of the internal implementation of the named stored procedure. A similar statement, SHOW FUNCTION CODE, displays information about stored functions (see Section 15.7.7.20, "SHOW FUNCTION CODE Statement").

To use either statement, you must be the user named as the routine DEFINER, have the SHOW_ROUTINE privilege, or have the SELECT privilege at the global level.

If the named routine is available, each statement produces a result set. Each row in the result set corresponds to one "instruction" in the routine. The first column is Pos, which is an ordinal number beginning with 0 . The second column is Instruction, which contains an SQL statement (usually changed from the original source), or a directive which has meaning only to the stored-routine handler.
```
mysql> DELIMITER //
mysql> CREATE PROCEDURE p1 ()
    BEGIN
        DECLARE fanta INT DEFAULT 55;
        DROP TABLE t2;
        LOOP
            INSERT INTO t3 VALUES (fanta);
            END LOOP;
        END//
Query OK, 0 rows affected (0.01 sec)
mysql> SHOW PROCEDURE CODE p1//
+-----+-----------------------------------------+
| Pos | Instruction |
+-----+------------------------------------------
| 0 | set fanta@0 55
| 1 | stmt 9 "DROP TABLE t2"
| 2 | stmt 5 "INSERT INTO t3 VALUES (fanta)"
| 3 | jump 2 |
+-----+------------------------------------------
4 rows in set (0.00 sec)
mysql> CREATE FUNCTION test.hello (s CHAR(20))
    RETURNS CHAR(50) DETERMINISTIC
    RETURN CONCAT('Hello, ',s,'!');
Query OK, 0 rows affected (0.00 sec)
mysql> SHOW FUNCTION CODE test.hello;
+------+-----------------------------------------
| Pos | Instruction |
+------+-----------------------------------------
| 0 | freturn 254 concat('Hello, ',s@0,'!') |
+------+-----------------------------------------
1 row in set (0.00 sec)
```


In this example, the nonexecutable BEGIN and END statements have disappeared, and for the DECLARE variable_name statement, only the executable part appears (the part where the default is assigned). For each statement that is taken from source, there is a code word stmt followed by a type ( 9 means DROP, 5 means INSERT, and so on). The final row contains an instruction jump 2 , meaning GOTO instruction \#2.

\subsection*{15.7.7.30 SHOW PROCEDURE STATUS Statement}

SHOW PROCEDURE STATUS
```
[LIKE 'pattern' | WHERE expr]
```


This statement is a MySQL extension. It returns characteristics of a stored procedure, such as the database, name, type, creator, creation and modification dates, and character set information. A similar statement, SHOW FUNCTION STATUS, displays information about stored functions (see Section 15.7.7.21, "SHOW FUNCTION STATUS Statement").

To use either statement, you must be the user named as the routine DEFINER, have the SHOW_ROUTINE privilege, have the SELECT privilege at the global level, or have the CREATE ROUTINE, ALTER ROUTINE, or EXECUTE privilege granted at a scope that includes the routine.

The LIKE clause, if present, indicates which procedure or function names to match. The WHERE clause can be given to select rows using more general conditions, as discussed in Section 28.8, "Extensions to SHOW Statements".
```
mysql> SHOW PROCEDURE STATUS LIKE 'sp1'\G
************************** 1. row ****************************************
                        Db: test
                    Name: sp1
                    Type: PROCEDURE
                Definer: testuser@localhost
            Modified: 2018-08-08 13:54:11
                Created: 2018-08-08 13:54:11
        Security_type: DEFINER
                Comment:
character_set_client: utf8mb4
collation_connection: utf8mb4_0900_ai_ci
    Database Collation: utf8mb4_0900_ai_ci
mysql> SHOW FUNCTION STATUS LIKE 'hello'\G
************************** 1. rOW ******************************
                            Db: test
                        Name: hello
                        Type: FUNCTION
                Definer: testuser@localhost
            Modified: 2020-03-10 11:10:03
                Created: 2020-03-10 11:10:03
        Security_type: DEFINER
                Comment:
character_set_client: utf8mb4
collation_connection: utf8mb4_0900_ai_ci
    Database Collation: utf8mb4_0900_ai_ci
```

character_set_client is the session value of the character_set_client system variable when the routine was created. collation_connection is the session value of the collation_connection system variable when the routine was created. Database Collation is the collation of the database with which the routine is associated.

Stored routine information is also available from the INFORMATION_SCHEMA PARAMETERS and ROUTINES tables. See Section 28.3.20, "The INFORMATION_SCHEMA PARAMETERS Table", and Section 28.3.30, "The INFORMATION_SCHEMA ROUTINES Table".

\subsection*{15.7.7.31 SHOW PROCESSLIST Statement}

\section*{SHOW [FULL] PROCESSLIST}

\section*{Important}

The INFORMATION SCHEMA implementation of SHOW PROCESSLIST is deprecated and subject to removal in a future MySQL release. It is recommended to use the Performance Schema implementation of SHOW PROCESSLIST instead.

The MySQL process list indicates the operations currently being performed by the set of threads executing within the server. The SHOW PROCESSLIST statement is one source of process information. For a comparison of this statement with other sources, see Sources of Process Information.

\section*{Note}

An alternative implementation for SHOW PROCESSLIST is available based on the Performance Schema processlist table, which, unlike the default SHOW PROCESSLIST implementation, does not require a mutex and has better performance characteristics. For details, see Section 29.12.22.7, "The processlist Table".

If you have the PROCESS privilege, you can see all threads, even those belonging to other users. Otherwise (without the PROCESS privilege), nonanonymous users have access to information about their own threads but not threads for other users, and anonymous users have no access to thread information.

Without the FULL keyword, SHOW PROCESSLIST displays only the first 100 characters of each statement in the Info field.

The SHOW PROCESSLIST statement is very useful if you get the "too many connections" error message and want to find out what is going on. MySQL reserves one extra connection to be used by accounts that have the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege), to ensure that administrators should always be able to connect and check the system (assuming that you are not giving this privilege to all your users).

Threads can be killed with the KILL statement. See Section 15.7.8.4, "KILL Statement".
Example of SHOW PROCESSLIST output:
```
mysql> SHOW FULL PROCESSLIST\G
************************** 1. row ******************************
            Id: 1
        User: system user
        Host:
            db: NULL
Command: Connect
        Time: 1030455
    State: Waiting for source to send event
        Info: NULL
************************** 2. row *****************************************
            Id: 2
        User: system user
        Host:
            db: NULL
Command: Connect
        Time: 1004
    State: Has read all relay log; waiting for the replica
                I/O thread to update it
        Info: NULL
************************** 3. row *****************************************
            Id: 3112
        User: replikator
        Host: artemis:2204
            db: NULL
Command: Binlog Dump
        Time: 2144
    State: Has sent all binlog to replica; waiting for binlog to be updated
        Info: NULL
************************** 4. r ow ****************************************
            Id: 3113
        User: replikator
        Host: iconnect2:45781
            db: NULL
Command: Binlog Dump
        Time: 2086
    State: Has sent all binlog to replica; waiting for binlog to be updated
        Info: NULL
*************************** 5. row ****************************************
            Id: 3123
        User: stefan
        Host: localhost
```

```
        db: apollon
Command: Query
        Time: 0
    State: NULL
        Info: SHOW FULL PROCESSLIST
```


SHOW PROCESSLIST output has these columns:
- Id

The connection identifier. This is the same value displayed in the ID column of the INFORMATION_SCHEMA PROCESSLIST table, displayed in the PROCESSLIST_ID column of the Performance Schema threads table, and returned by the CONNECTION_ID( ) function within the thread.
- User

The MySQL user who issued the statement. A value of system user refers to a nonclient thread spawned by the server to handle tasks internally, for example, a delayed-row handler thread or an I/O (receiver) or SQL (applier) thread used on replica hosts. For system user, there is no host specified in the Host column. unauthenticated user refers to a thread that has become associated with a client connection but for which authentication of the client user has not yet occurred. event_scheduler refers to the thread that monitors scheduled events (see Section 27.4, "Using the Event Scheduler").
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2925.jpg?height=109&width=97&top_left_y=1235&top_left_x=404)

> Note
> A User value of system user is distinct from the SYSTEM_USER privilege. The former designates internal threads. The latter distinguishes the system user and regular user account categories (see Section 8.2.11, "Account Categories").
- Host

The host name of the client issuing the statement (except for system user, for which there is no host). The host name for TCP/IP connections is reported in host_name : client_port format to make it easier to determine which client is doing what.
- db

The default database for the thread, or NULL if none has been selected.
- Command

The type of command the thread is executing on behalf of the client, or Sleep if the session is idle. For descriptions of thread commands, see Section 10.14, "Examining Server Thread (Process) Information". The value of this column corresponds to the COM_ $x x x$ commands of the client/server protocol and Com_xxx status variables. See Section 7.1.10, "Server Status Variables".
- Time

The time in seconds that the thread has been in its current state. For a replica SQL thread, the value is the number of seconds between the timestamp of the last replicated event and the real time of the replica host. See Section 19.2.3, "Replication Threads".
- State

An action, event, or state that indicates what the thread is doing. For descriptions of State values, see Section 10.14, "Examining Server Thread (Process) Information".

Most states correspond to very quick operations. If a thread stays in a given state for many seconds, there might be a problem that needs to be investigated.
- Info

The statement the thread is executing, or NULL if it is executing no statement. The statement might be the one sent to the server, or an innermost statement if the statement executes other statements. For example, if a CALL statement executes a stored procedure that is executing a SELECT statement, the Info value shows the SELECT statement.

\subsection*{15.7.7.32 SHOW PROFILE Statement}
```
SHOW PROFILE [type [, type] ... ]
    [FOR QUERY n]
    [LIMIT row_count [OFFSET offset]]
type: {
    ALL
    | BLOCK IO
    | CONTEXT SWITCHES
    | CPU
    | IPC
    | MEMORY
    | PAGE FAULTS
    | SOURCE
    | SWAPS
}
```


The SHOW PROFILE and SHOW PROFILES statements display profiling information that indicates resource usage for statements executed during the course of the current session.

\section*{Note}

The SHOW PROFILE and SHOW PROFILES statements are deprecated; expect them to be removed in a future MySQL release. Use the Performance Schema instead; see Section 29.19.1, "Query Profiling Using Performance Schema".

To control profiling, use the profiling session variable, which has a default value of 0 (OFF). Enable profiling by setting profiling to 1 or ON:
mysql> SET profiling = 1;
SHOW PROFILES displays a list of the most recent statements sent to the server. The size of the list is controlled by the profiling_history_size session variable, which has a default value of 15 . The maximum value is 100 . Setting the value to 0 has the practical effect of disabling profiling.

All statements are profiled except SHOW PROFILE and SHOW PROFILES, so neither of those statements appears in the profile list. Malformed statements are profiled. For example, SHOW PROFILING is an illegal statement, and a syntax error occurs if you try to execute it, but it shows up in the profiling list.

SHOW PROFILE displays detailed information about a single statement. Without the FOR QUERY $n$ clause, the output pertains to the most recently executed statement. If FOR QUERY $n$ is included, SHOW PROFILE displays information for statement $n$. The values of $n$ correspond to the Query_ID values displayed by SHOW PROFILES.

The LIMIT row_count clause may be given to limit the output to row_count rows. If LIMIT is given, OFFSET offset may be added to begin the output offset rows into the full set of rows.

By default, SHOW PROFILE displays Status and Duration columns. The Status values are like the State values displayed by SHOW PROCESSLIST, although there might be some minor differences in interpretation for the two statements for some status values (see Section 10.14, "Examining Server Thread (Process) Information").

Optional type values may be specified to display specific additional types of information:
- ALL displays all information
- BLOCK IO displays counts for block input and output operations
- CONTEXT SWITCHES displays counts for voluntary and involuntary context switches
- CPU displays user and system CPU usage times
- IPC displays counts for messages sent and received
- MEMORY is not currently implemented
- PAGE FAULTS displays counts for major and minor page faults
- SOURCE displays the names of functions from the source code, together with the name and line number of the file in which the function occurs
- SWAPS displays swap counts

Profiling is enabled per session. When a session ends, its profiling information is lost.
```
mysql> SELECT @@profiling;
+--------------+
| @@profiling |
+--------------+
| 0 |
+--------------+
1 row in set (0.00 sec)
mysql> SET profiling = 1;
Query OK, 0 rows affected (0.00 sec)
mysql> DROP TABLE IF EXISTS t1;
Query OK, 0 rows affected, 1 warning (0.00 sec)
mysql> CREATE TABLE T1 (id INT);
Query OK, 0 rows affected (0.01 sec)
mysql> SHOW PROFILES;
+----------+----------+-------------------------+
| Query_ID | Duration | Query |
+----------+----------+-------------------------+
| 0 | 0.000088 | SET PROFILING = 1
| 1 | 0.000136 | DROP TABLE IF EXISTS t1 |
| 2 | 0.011947 | CREATE TABLE t1 (id INT) |
+----------+----------+-------------------------+
3 rows in set (0.00 sec)
mysql> SHOW PROFILE;
+-----------------------+----------+
| Status | Duration |
+-----------------------+----------+
| checking permissions | 0.000040 |
| creating table |0.000056 |
| After create |0.011363 |
| query end |0.000375 |
| freeing items | 0.000089 |
| logging slow query | 0.000019 |
| cleaning up | 0.000005 |
+-----------------------+----------+
7rows in set (0.00 sec)
mysql> SHOW PROFILE FOR QUERY 1;
+---------------------+----------+
| Status | Duration |
+---------------------+----------+
| query end | 0.000107 |
| freeing items | 0.000008 |
| logging slow query | 0.000015 |
| cleaning up | 0.000006 |
```

```
+----------------------+----------+
4 rows in set (0.00 sec)
mysql> SHOW PROFILE CPU FOR QUERY 2;
+-----------------------+----------+----------+-----------+
| Status | Duration | CPU_user | CPU_system |
+-----------------------+----------+----------+-----------+
| checking permissions | 0.000040 | 0.000038 | 0.000002 |
| creating table |0.000056 | 0.000028 | 0.000028 |
| After create |0.011363 |0.000217 | 0.001571 |
| query end | 0.000375 | 0.000013 | 0.000028
| freeing items | 0.000089 | 0.000010 | 0.000014
| logging slow query | 0.000019 误 0.000009 | 0.000010
+-----------------------+----------+----------+-----------+
rows in set (0.00 sec)
```


\section*{Note}

Profiling is only partially functional on some architectures. For values that depend on the getrusage() system call, NULL is returned on systems such as Windows that do not support the call. In addition, profiling is per process and not per thread. This means that activity on threads within the server other than your own may affect the timing information that you see.

Profiling information is also available from the INFORMATION_SCHEMA PROFILING table. See Section 28.3.24, "The INFORMATION_SCHEMA PROFILING Table". For example, the following queries are equivalent:
```
SHOW PROFILE FOR QUERY 2;
SELECT STATE, FORMAT(DURATION, 6) AS DURATION
FROM INFORMATION_SCHEMA.PROFILING
WHERE QUERY_ID = 2 ORDER BY SEQ;
```


\subsection*{15.7.7.33 SHOW PROFILES Statement}

\section*{SHOW PROFILES}

The SHOW PROFILES statement, together with SHOW PROFILE, displays profiling information that indicates resource usage for statements executed during the course of the current session. For more information, see Section 15.7.7.32, "SHOW PROFILE Statement".

\section*{Note}

The SHOW PROFILE and SHOW PROFILES statements are deprecated; expect it to be removed in a future MySQL release. Use the Performance Schema instead; see Section 29.19.1, "Query Profiling Using Performance Schema".

\subsection*{15.7.7.34 SHOW RELAYLOG EVENTS Statement}
```
SHOW RELAYLOG EVENTS
    [IN 'log_name']
    [FROM pos]
    [LIMIT [offset,] row_count]
    [channel_option]
channel_option:
    FOR CHANNEL channel
```


Shows the events in the relay log of a replica. If you do not specify 'log_name ', the first relay log is displayed. This statement has no effect on the source. SHOW RELAYLOG EVENTS requires the REPLICATION SLAVE privilege.

The LIMIT clause has the same syntax as for the SELECT statement. See Section 15.2.13, "SELECT Statement".

\section*{Note}

Issuing a SHOW RELAYLOG EVENTS with no LIMIT clause could start a very time- and resource-consuming process because the server returns to the client the complete contents of the relay log (including all statements modifying data that have been received by the replica).

The optional FOR CHANNEL channel clause enables you to name which replication channel the statement applies to. Providing a FOR CHANNEL channel clause applies the statement to a specific replication channel. If no channel is named and no extra channels exist, the statement applies to the default channel.

When using multiple replication channels, if a SHOW RELAYLOG EVENTS statement does not have a channel defined using a FOR CHANNEL channel clause an error is generated. See Section 19.2.2, "Replication Channels" for more information.

SHOW RELAYLOG EVENTS displays the following fields for each event in the relay log:
- Log_name

The name of the file that is being listed.
- Pos

The position at which the event occurs.
- Event_type

An identifier that describes the event type.
- Server_id

The server ID of the server on which the event originated.
- End_log_pos

The value of End_log_pos for this event in the source's binary log.
- Info

More detailed information about the event type. The format of this information depends on the event type.

For compressed transaction payloads, the Transaction_payload_event is first printed as a single unit, then it is unpacked and each event inside it is printed.

Some events relating to the setting of user and system variables are not included in the output from SHOW RELAYLOG EVENTS. To get complete coverage of events within a relay log, use mysqlbinlog.

\subsection*{15.7.7.35 SHOW REPLICA STATUS Statement}

SHOW REPLICA STATUS [FOR CHANNEL channel]
This statement provides status information on essential parameters of the replica threads. The statement requires the REPLICATION CLIENT privilege (or the deprecated SUPER privilege).

SHOW REPLICA STATUS is nonblocking. When run concurrently with STOP REPLICA, SHOW REPLICA STATUS returns without waiting for STOP REPLICA to finish shutting down the replication SQL (applier) thread or replication I/O (receiver) thread (or both). This permits use in monitoring and other applications where getting an immediate response from SHOW REPLICA STATUS is more important than ensuring that it returned the latest data.

If you issue this statement using the mysql client, you can use a \G statement terminator rather than a semicolon to obtain a more readable vertical layout:
```
mysql> SHOW REPLICA STATUS\G
************************** 1. rOW *******************************
                            Replica_IO_State: Waiting for source to send event
                                            Source_Host: 127.0.0.1
                                            Source_User: root
                                            Source_Port: 13000
                                        Connect_Retry: 1
                                Source_Log_File: master-bin.000001
                    Read_Source_Log_Pos: 927
                                Relay_Log_File: slave-relay-bin.000002
                                    Relay_Log_Pos: 1145
                    Relay_Source_Log_File: master-bin.000001
                        Replica_IO_Running: Yes
                        Replica_SQL_Running: Yes
                                Replicate_Do_DB:
                    Replicate_Ignore_DB:
                        Replicate_Do_Table:
            Replicate_Ignore_Table:
            Replicate_Wild_Do_Table:
    Replicate_Wild_Ignore_Table:
                                                    Last_Errno: 0
                                                        Last_Error:
                                                Skip_Counter: 0
                    Exec_Source_Log_Pos: 927
                                Relay_Log_Space: 1355
                            Until_Condition: None
                                    Until_Log_File:
                                        Until_Log_Pos: 0
                        Source_SSL_Allowed: No
                        Source_SSL_CA_File:
                        Source_SSL_CA_Path:
                                Source_SSL_Cert:
                        Source_SSL_Cipher:
                                    Source_SSL_Key:
                    Seconds_Behind_Source: 0
Source_SSL_Verify_Server_Cert: No
                                        Last_IO_Errno: 0
                                        Last_IO_Error:
                                Last_SQL_Errno: 0
                                Last_SQL_Error:
    Replicate_Ignore_Server_Ids:
                            Source_Server_Id: 1
                                        Source_UUID: 73f86016-978b-11ee-ade5-8d2a2a562feb
                            Source_Info_File: mysql.slave_master_info
                                                SQL_Delay: 0
                    SQL_Remaining_Delay: NULL
        Replica_SQL_Running_State: Replica has read all relay log; waiting for more updates
                        Source_Retry_Count: 10
                                            Source_Bind:
            Last_IO_Error_Timestamp:
        Last_SQL_Error_Timestamp:
                                Source_SSL_Crl:
                        Source_SSL_Crlpath:
                        Retrieved_Gtid_Set: 73f86016-978b-11ee-ade5-8d2a2a562feb:1-3
                            Executed_Gtid_Set: 73f86016-978b-11ee-ade5-8d2a2a562feb:1-3
                                    Auto_Position: 1
                    Replicate_Rewrite_DB:
                                        Channel_Name:
                        Source_TLS_Version:
            Source_public_key_path:
                Get_Source_public_key: 0
                        Network_Namespace:
```


The Performance Schema provides tables that expose replication information. This is similar to the information available from the SHOW REPLICA STATUS statement, but represented in table form. For details, see Section 29.12.11, "Performance Schema Replication Tables".

You can set the GTID_ONLY option for the CHANGE REPLICATION SOURCE TO statement to stop a replication channel from persisting file names and file positions in the replication metadata repositories. With this setting, file positions for the source binary log file and the relay log file are tracked in memory. The SHOW REPLICA STATUS statement still displays file positions in normal use. However, because
the file positions are not being regularly updated in the connection metadata repository and the applier metadata repository except in a few situations, they are likely to be out of date if the server is restarted.

For a replication channel with the GTID_ONLY setting after a server start, the read and applied file positions for the source binary log file (Read_Source_Log_Pos and Exec_Source_Log_Pos) are set to zero, and the file names (Source_Log_File and Relay_Source_Log_File) are set to INVALID. The relay log file name (Relay_Log_File) is set according to the relay_log_recovery setting, either a new file that was created at server start or the first relay log file present. The file position (Relay_Log_Pos) is set to position 4, and GTID auto-skip is used to skip any transactions in the file that were already applied.

When the receiver thread contacts the source and gets valid position information, the read position (Read_Source_Log_Pos) and file name (Source_Log_File) are updated with the correct data and become valid. When the applier thread applies a transaction from the source, or skips an already executed transaction, the executed position (Exec_Source_Log_Pos) and file name (Relay_Source_Log_File) are updated with the correct data and become valid. The relay log file position (Relay_Log_Pos) is also updated at that time.

The following list describes the fields returned by SHOW REPLICA STATUS. For additional information about interpreting their meanings, see Section 19.1.7.1, "Checking Replication Status".
- Replica_IO_State

A copy of the State field of the SHOW PROCESSLIST output for the replica I/O (receiver) thread. This tells you what the thread is doing: trying to connect to the source, waiting for events from the source, reconnecting to the source, and so on. For a listing of possible states, see Section 10.14.5, "Replication I/O (Receiver) Thread States".
- Source_Host

The source host that the replica is connected to.
- Source_User

The user name of the account used to connect to the source.
- Source_Port

The port used to connect to the source.
- Connect_Retry

The number of seconds between connect retries (default 60). This can be set with a CHANGE REPLICATION SOURCE TO statement.
- Source_Log_File

The name of the source binary log file from which the I/O (receiver) thread is currently reading. This is set to INVALID for a replication channel with the GTID_ONLY setting after a server start. It will be updated when the replica contacts the source.
- Read_Source_Log_Pos

The position in the current source binary log file up to which the I/O (receiver) thread has read. This is set to zero for a replication channel with the GTID_ONLY setting after a server start. It will be updated when the replica contacts the source.
- Relay_Log_File

The name of the relay log file from which the SQL (applier) thread is currently reading and executing.
- Relay_Log_Pos

The position in the current relay log file up to which the SQL (applier) thread has read and executed.
- Relay_Source_Log_File

The name of the source binary log file containing the most recent event executed by the SQL (applier) thread. This is set to INVALID for a replication channel with the GTID_ONLY setting after a server start. It will be updated when a transaction is executed or skipped.
- Replica_IO_Running

Whether the replication I/O (receiver) thread is started and has connected successfully to the source. Internally, the state of this thread is represented by one of the following three values:
- MYSQL_REPLICA_NOT_RUN. The replication I/O (receiver) thread is not running. For this state, Replica_IO_Running is No.
- MYSQL_REPLICA_RUN_NOT_CONNECT. The replication I/O (receiver) thread is running, but is not connected to a replication source. For this state, Replica_IO_Running is Connecting.
- MYSQL_REPLICA_RUN_CONNECT. The replication I/O (receiver) thread is running, and is connected to a replication source. For this state, Replica_IO_Running is Yes.
- Replica_SQL_Running

Whether the replication SQL (applier) thread is started.
- Replicate_Do_DB, Replicate_Ignore_DB

The names of any databases that were specified with the --replicate-do-db and -replicate-ignore-db options, or the CHANGE REPLICATION FILTER statement. If the FOR CHANNEL clause was used, the channel specific replication filters are shown. Otherwise, the replication filters for every replication channel are shown.
- Replicate_Do_Table, Replicate_Ignore_Table, Replicate_Wild_Do_Table, Replicate_Wild_Ignore_Table

The names of any tables that were specified with the - -replicate-do-table, - -replicate-ignore-table, --replicate-wild-do-table, and --replicate-wild-ignore-table options, or the CHANGE REPLICATION FILTER statement. If the FOR CHANNEL clause was used, the channel specific replication filters are shown. Otherwise, the replication filters for every replication channel are shown.
- Last_Errno, Last_Error

These columns are aliases for Last_SQL_Errno and Last_SQL_Error.
Issuing RESET BINARY LOGS AND GTIDS or RESET REPLICA resets the values shown in these columns.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2932.jpg?height=127&width=101&top_left_y=2151&top_left_x=340)

\section*{Note}

When the replication SQL thread receives an error, it reports the error first, then stops the SQL thread. This means that there is a small window of time during which SHOW REPLICA STATUS shows a nonzero value for Last_SQL_Errno even though Replica_SQL_Running still displays Yes.
- Skip_Counter

The current value of the sql_replica_skip_counter system variable.
- Exec_Source_Log_Pos

The position in the current source binary log file to which the replication SQL thread has read and executed, marking the start of the next transaction or event to be processed. This is set to zero for a replication channel with the GTID_ONLY setting after a server start. It will be updated when a transaction is executed or skipped.

You can use this value with the CHANGE REPLICATION SOURCE TO statement's SOURCE_LOG_POS option when starting a new replica from an existing replica, so that the new replica reads from this point. The coordinates given by (Relay_Source_Log_File, Exec_Source_Log_Pos) in the source's binary log correspond to the coordinates given by (Relay_Log_File, Relay_Log_Pos) in the relay log.

Inconsistencies in the sequence of transactions from the relay log which have been executed can cause this value to be a "low-water mark". In other words, transactions appearing before the position are guaranteed to have committed, but transactions after the position may have committed or not. If these gaps need to be corrected, use START REPLICA UNTIL SQL_AFTER_MTS_GAPS. See Section 19.5.1.34, "Replication and Transaction Inconsistencies" for more information.
- Relay_Log_Space

The total combined size of all existing relay log files.
- Until_Condition, Until_Log_File, Until_Log_Pos

The values specified in the UNTIL clause of the START REPLICA statement.
Until_Condition has these values:
- None if no UNTIL clause was specified.
- Source if the replica is reading until a given position in the source's binary log.
- Relay if the replica is reading until a given position in its relay log.
- SQL_BEFORE_GTIDS if the replication SQL thread is processing transactions until it has reached the first transaction whose GTID is listed in the gtid_set.
- SQL_AFTER_GTIDS if the replication threads are processing all transactions until the last transaction in the gtid_set has been processed by both threads.
- SQL_AFTER_MTS_GAPS if a multithreaded replica's SQL threads are running until no more gaps are found in the relay log.

Until_Log_File and Until_Log_Pos indicate the log file name and position that define the coordinates at which the replication SQL thread stops executing.

For more information on UNTIL clauses, see Section 15.4.2.4, "START REPLICA Statement".
- Source_SSL_Allowed, Source_SSL_CA_File, Source_SSL_CA_Path, Source_SSL_Cert, Source_SSL_Cipher, Source_SSL_CRL_File, Source_SSL_CRL_Path, Source_SSL_Key, Source_SSL_Verify_Server_Cert

These fields show the SSL parameters used by the replica to connect to the source, if any.
Source_SSL_Allowed has these values:
- Yes if an SSL connection to the source is permitted.
- No if an SSL connection to the source is not permitted.
- Ignored if an SSL connection is permitted but the replica server does not have SSL support enabled.

The values of the other SSL-related fields correspond to the values of the SOURCE_SSL_* options of the CHANGE REPLICATION SOURCE TO statement.
- Seconds_Behind_Source

This field is an indication of how "late" the replica is:
- When the replica is actively processing updates, this field shows the difference between the current timestamp on the replica and the original timestamp logged on the source for the event currently being processed on the replica.
- When no event is currently being processed on the replica, this value is 0 .

In essence, this field measures the time difference in seconds between the replication SQL (applier) thread and the replication I/O (receiver) thread. If the network connection between source and replica is fast, the replication receiver thread is very close to the source, so this field is a good approximation of how late the replication applier thread is compared to the source. If the network is slow, this is not a good approximation; the replication applier thread may quite often be caught up with the slowreading replication receiver thread, so Seconds_Behind_Source often shows a value of 0 , even if the replication receiver thread is late compared to the source. In other words, this column is useful only for fast networks.

This time difference computation works even if the source and replica do not have identical clock times, provided that the difference, computed when the replica receiver thread starts, remains constant from then on. Any changes, including NTP updates, can lead to clock skews that can make calculation of Seconds_Behind_Source less reliable.

In MySQL 8.4, this field is NULL (undefined or unknown) if the replication applier thread is not running, or if the applier thread has consumed all of the relay log and the replication receiver thread is not running. (In older versions of MySQL, this field was NULL if the replication applier thread or the replication receiver thread was not running or was not connected to the source.) If the replication receiver thread is running but the relay log is exhausted, Seconds_Behind_Source is set to 0 .

The value of Seconds_Behind_Source is based on the timestamps stored in events, which are preserved through replication. This means that if a source M1 is itself a replica of M0, any event from M1's binary log that originates from M0's binary log has M0's timestamp for that event. This enables MySQL to replicate TIMESTAMP successfully. However, the problem for Seconds_Behind_Source is that if M1 also receives direct updates from clients, the Seconds_Behind_Source value randomly fluctuates because sometimes the last event from M1 originates from M0 and sometimes is the result of a direct update on M1.

When using a multithreaded replica, you should keep in mind that this value is based on Exec_Source_Log_Pos, and so may not reflect the position of the most recently committed transaction.
- Last_IO_Errno, Last_IO_Error

The error number and error message of the most recent error that caused the replication I/O (receiver) thread to stop. An error number of 0 and message of the empty string mean "no error." If the Last_IO_Error value is not empty, the error values also appear in the replica's error log.

I/O error information includes a timestamp showing when the most recent I/O (receiver)thread error occurred. This timestamp uses the format YYMMDD hh:mm:ss, and appears in the Last_IO_Error_Timestamp column.

Issuing RESET BINARY LOGS AND GTIDS or RESET REPLICA resets the values shown in these columns.
- Last_SQL_Errno, Last_SQL_Error

The error number and error message of the most recent error that caused the replication SQL (applier) thread to stop. An error number of 0 and message of the empty string mean "no error." If the Last_SQL_Error value is not empty, the error values also appear in the replica's error log.

If the replica is multithreaded, the replication SQL thread is the coordinator for worker threads. In this case, the Last_SQL_Error field shows exactly what the Last_Error_Message column in the Performance Schema replication_applier_status_by_coordinator table shows. The field value is modified to suggest that there may be more failures in the other worker threads which can be seen in the replication_applier_status_by_worker table that shows each worker thread's status. If that table is not available, the replica error log can be used. The log or the replication_applier_status_by_worker table should also be used to learn more about the failure shown by SHOW REPLICA STATUS or the coordinator table.

SQL error information includes a timestamp showing when the most recent SQL (applier) thread error occurred. This timestamp uses the format YYMMDD hh:mm:ss, and appears in the Last_SQL_Error_Timestamp column.

Issuing RESET BINARY LOGS AND GTIDS or RESET REPLICA resets the values shown in these columns.

In MySQL 8.4, all error codes and messages displayed in the Last_SQL_Errno and Last_SQL_Error columns correspond to error values listed in Server Error Message Reference. This was not always true in previous versions. (Bug \#11760365, Bug \#52768)
- Replicate_Ignore_Server_Ids

Any server IDs that have been specified using the IGNORE_SERVER_IDS option of the CHANGE REPLICATION SOURCE TO statement, so that the replica ignores events from these servers. This option is used in a circular or other multi-source replication setup when one of the servers is removed. If any server IDs have been set in this way, a comma-delimited list of one or more numbers is shown. If no server IDs have been set, the field is blank.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2935.jpg?height=497&width=31&top_left_y=1653&top_left_x=625)

\section*{Note}

The Ignored_server_ids value in the slave_master_info table also shows the server IDs to be ignored, but as a space-delimited list, preceded by the total number of server IDs to be ignored. For example, if a CHANGE REPLICATION SOURCE TO statement containing the IGNORE_SERVER_IDS $=(2,6,9)$ option has been issued to tell a replica to ignore sources having the server ID 2, 6 , or 9 , that information appears as shown here:
```
Replicate_Ignore_Server_Ids: 2, 6, 9
Ignored_server_ids: 3, 2, 6, 9
```


Replicate_Ignore_Server_Ids filtering is performed by the I/O (receiver) thread, rather than by the SQL (applier) thread, which means that events which are filtered out are not written to the relay log. This differs from the filtering actions taken by server options such --replicate-do-table, which apply to the applier thread.

If SET gtid_mode=0N is issued when any channel has existing server IDs set with IGNORE_SERVER_IDS, the statement is rejected with an error. Before starting GTID-based replication, use SHOW REPLICA STATUS to check for and clear all ignored server ID lists on the servers involved. You can clear a list by issuing a CHANGE REPLICATION SOURCE TO statement using IGNORE_SERVER_IDS=( )-that is, with an empty list of server IDs.
- Source_Server_Id

The server id value from the source.
- Source_UUID

The server_uuid value from the source.
- Source_Info_File

The location of the master . info file, the use of which is now deprecated. By default, a table is used instead for the replica's connection metadata repository.
- SQL_Delay

The number of seconds that the replica must lag the source.
- SQL_Remaining_Delay

When Replica_SQL_Running_State is Waiting until SOURCE_DELAY seconds after source executed event, this field contains the number of delay seconds remaining. At other times, this field is NULL.
- Replica_SQL_Running_State

The state of the SQL thread (analogous to Replica_IO_State). The value is identical to the State value of the SQL thread as displayed by SHOW PROCESSLIST. Section 10.14.6, "Replication SQL Thread States", provides a listing of possible states.
- Source_Retry_Count

The number of times the replica can attempt to reconnect to the source in the event of a lost connection. This value can be set using the SOURCE_RETRY_COUNT option of the CHANGE REPLICATION SOURCE TO statement.
- Source_Bind

The network interface that the replica is bound to, if any. This is set using the SOURCE_BIND option for the CHANGE REPLICATION SOURCE TO statement.
- Last_IO_Error_Timestamp

A timestamp in YYMMDD hh:mm:ss format that shows when the most recent I/O error took place.
- Last_SQL_Error_Timestamp

A timestamp in YYMMDD hh:mm:ss format that shows when the most recent SQL error occurred.
- Retrieved_Gtid_Set

The set of global transaction IDs corresponding to all transactions received by this replica. Empty if GTIDs are not in use. See GTID Sets for more information.

This is the set of all GTIDs that exist or have existed in the relay logs. Each GTID is added as soon as the Gtid_log_event is received. This can cause partially transmitted transactions to have their GTIDs included in the set.

When all relay logs are lost due to executing RESET REPLICA or CHANGE REPLICATION SOURCE TO, or due to the effects of the --relay-log-recovery option, the set is cleared. When relay_log_purge $=1$, the newest relay log is always kept, and the set is not cleared.
- Executed_Gtid_Set

The set of global transaction IDs written in the binary log. This is the same as the value for the global gtid_executed system variable on this server, as well as the value for Executed_Gtid_Set in the output of SHOW BINARY LOG STATUS on this server. Empty if GTIDs are not in use. See GTID Sets for more information.
- Auto_Position

1 if GTID auto-positioning is in use for the channel, otherwise 0 .
- Replicate_Rewrite_DB

The Replicate_Rewrite_DB value displays any replication filtering rules that were specified. For example, if the following replication filter rule was set:

CHANGE REPLICATION FILTER REPLICATE_REWRITE_DB=((db1,db2), (db3,db4));
the Replicate_Rewrite_DB value displays:
Replicate_Rewrite_DB: (db1,db2),(db3,db4)
For more information, see Section 15.4.2.1, "CHANGE REPLICATION FILTER Statement".
- Channel_name

The replication channel which is being displayed. There is always a default replication channel, and more replication channels can be added. See Section 19.2.2, "Replication Channels" for more information.
- Master_TLS_Version

The TLS version used on the source. For TLS version information, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".
- Source_public_key_path

The path name to a file containing a replica-side copy of the public key required by the source for RSA key pair-based password exchange. The file must be in PEM format. This column applies to replicas that authenticate with the sha256_password (deprecated) or caching_sha2_password authentication plugin.

If Source_public_key_path is given and specifies a valid public key file, it takes precedence over Get_source_public_key.
- Get_source_public_key

Whether to request from the source the public key required for RSA key pair-based password exchange. This column applies to replicas that authenticate with the caching_sha2_password authentication plugin. For that plugin, the source does not send the public key unless requested.

If Source_public_key_path is given and specifies a valid public key file, it takes precedence over Get_source_public_key.
- Network_Namespace

The network namespace name; empty if the connection uses the default (global) namespace. For information about network namespaces, see Section 7.1.14, "Network Namespace Support".

\subsection*{15.7.7.36 SHOW REPLICAS Statement}

SHOW REPLICAS
Displays a list of replicas currently registered with the source. SHOW REPLICAS requires the REPLICATION SLAVE privilege.

SHOW REPLICAS should be executed on a server that acts as a replication source. The statement displays information about servers that are or have been connected as replicas, with each row of the result corresponding to one replica server, as shown here:
```
mysql> SHOW REPLICAS;
+------------+-----------+------+-----------+------------------------------------
| Server_id | Host | Port | Source_id | Replica_UUID |
+-------------+------------+-------+-----------+--------------------------------------
| 10 | iconnect2 | 3306 | 3 | 14cb6624-7f93-11e0-b2c0-c80aa9429562 |
| 21 | athena | 3306 | 3 | 07af4990-f41f-11df-a566-7ac56fdaf645 |
+-------------+------------+------+-----------+-----------------------------------
```

- Server_id: The unique server ID of the replica server, as configured in the replica server's option file, or on the command line with --server-id=value.
- Host: The host name of the replica server, as specified on the replica with the --report-host option. This can differ from the machine name as configured in the operating system.
- User: The replica server user name, as specified on the replica with the --report-user option. Statement output includes this column only if the source server is started with the --show-replica-auth-info option.
- Password: The replica server password, as specified on the replica with the --report-password option. Statement output includes this column only if the source server is started with the --show-replica-auth-info option.
- Port: The port on the source to which the replica server is listening, as specified on the replica with the--report-port option.

A zero in this column means that the replica port (--report-port) was not set.
- Source_id: The unique server ID of the source server that the replica server is replicating from. This is the server ID of the server on which SHOW REPLICAS is executed, so this same value is listed for each row in the result.
- Replica_UUID: The globally unique ID of this replica, as generated on the replica and found in the replica's auto. cnf file.

\subsection*{15.7.7.37 SHOW STATUS Statement}
```
SHOW [GLOBAL | SESSION] STATUS
    [LIKE 'pattern' | WHERE expr]
```


SHOW STATUS provides server status information (see Section 7.1.10, "Server Status Variables"). This statement does not require any privilege. It requires only the ability to connect to the server.

Status variable information is also available from these sources:
- Performance Schema tables. See Section 29.12.15, "Performance Schema Status Variable Tables".
- The mysqladmin extended-status command. See Section 6.5.2, "mysqladmin - A MySQL Server Administration Program".

For SHOW STATUS, a LIKE clause, if present, indicates which variable names to match. A WHERE clause can be given to select rows using more general conditions, as discussed in Section 28.8, "Extensions to SHOW Statements".

SHOW STATUS accepts an optional GLOBAL or SESSION variable scope modifier:
- With a GLOBAL modifier, the statement displays the global status values. A global status variable may represent status for some aspect of the server itself (for example, Aborted_connects), or the aggregated status over all connections to MySQL (for example, Bytes_received and Bytes_sent). If a variable has no global value, the session value is displayed.
- With a SESSION modifier, the statement displays the status variable values for the current connection. If a variable has no session value, the global value is displayed. LOCAL is a synonym for SESSION.
- If no modifier is present, the default is SESSION.

The scope for each status variable is listed at Section 7.1.10, "Server Status Variables".
Each invocation of the SHOW STATUS statement uses an internal temporary table and increments the global Created_tmp_tables value.

Partial output is shown here. The list of names and values may differ for your server. The meaning of each variable is given in Section 7.1.10, "Server Status Variables".
```
mysql> SHOW STATUS;

\begin{tabular}{l|l|}
+ +--------------------------+------------+ \\
$\mid$ Variable_name & $\mid$ Value \\
$+=-------------------+---------+$ \\
$\mid$ Aborted_clients & 0 \\
$\mid$ Aborted_connects & 0 \\
$\mid$ Bytes_received & 155372598 \\
$\mid$ Bytes_sent & 1176560426 \\
$\mid$ Connections & 30023 \\
$\mid$ Created_tmp_disk_tables & 0 \\
$\mid$ Created_tmp_tables & 8340 \\
$\mid$ Created_tmp_files & 60
\end{tabular}
| Open_tables | 1
| Open_files | 2
| Open_streams | 0
\begin{array} { l | l | l } { \text { Opened_tables } } & { 4 4 6 0 0 } \\ { \text { Questions (20268} } \end{array}
...
| Table_locks_immediate | 1920382
| Table_locks_waited | 0
| Threads_cached | 0
| Threads_created | 30022
| Threads_connected | 1
| Threads_running | 1
| Uptime | 80380
+---------------------------+-----------+
```


With a LIKE clause, the statement displays only rows for those variables with names that match the pattern:
```
mysql> SHOW STATUS LIKE 'Key%';
+----------------------+----------+
| Variable_name | Value |
+---------------------+----------+
| Key_blocks_used | 14955
| Key_read_requests | 96854827
| Key_reads | 162040
| Key_write_requests | 7589728
| Key_writes | 3813196
+---------------------+----------+
```


\subsection*{15.7.7.38 SHOW TABLE STATUS Statement}
```
SHOW TABLE STATUS
    [{FROM | IN} db_name]
    [LIKE 'pattern' | WHERE expr]
```


SHOW TABLE STATUS works like SHOW TABLES, but provides a lot of information about each non-TEMPORARY table. You can also get this list using the mysqlshow --status db_name command. The LIKE clause, if present, indicates which table names to match. The WHERE clause can be given to select rows using more general conditions, as discussed in Section 28.8, "Extensions to SHOW Statements".

This statement also displays information about views.
SHOW TABLE STATUS output has these columns:
- Name

The name of the table.
- Engine

The storage engine for the table. See Chapter 17, The InnoDB Storage Engine, and Chapter 18, Alternative Storage Engines.

For partitioned tables, Engine shows the name of the storage engine used by all partitions.
- Version

This column is unused. With the removal of .frm files in MySQL 8.0, this column now reports a hardcoded value of 10, which was the last. frm file version used in MySQL 5.7.
- Row_format

The row-storage format (Fixed, Dynamic, Compressed, Redundant, Compact). For MyISAM tables, Dynamic corresponds to what myisamchk -dvv reports as Packed.
- Rows

The number of rows. Some storage engines, such as MyISAM, store the exact count. For other storage engines, such as InnoDB, this value is an approximation, and may vary from the actual value by as much as $40 \%$ to $50 \%$. In such cases, use SELECT COUNT (*) to obtain an accurate count.

The Rows value is NULL for INFORMATION_SCHEMA tables.
For InnoDB tables, the row count is only a rough estimate used in SQL optimization. (This is also true if the InnoDB table is partitioned.)
- Avg_row_length

The average row length.
- Data_length

For MyISAM, Data_length is the length of the data file, in bytes.
For InnoDB, Data_length is the approximate amount of space allocated for the clustered index, in bytes. Specifically, it is the clustered index size, in pages, multiplied by the InnoDB page size.

Refer to the notes at the end of this section for information regarding other storage engines.
- Max_data_length

For MyISAM, Max_data_length is maximum length of the data file. This is the total number of bytes of data that can be stored in the table, given the data pointer size used.

Unused for InnoDB.
Refer to the notes at the end of this section for information regarding other storage engines.
- Index_length

For MyISAM, Index_length is the length of the index file, in bytes.
For InnoDB, Index_length is the approximate amount of space allocated for non-clustered indexes, in bytes. Specifically, it is the sum of non-clustered index sizes, in pages, multiplied by the InnoDB page size.

Refer to the notes at the end of this section for information regarding other storage engines.
- Data_free

The number of allocated but unused bytes.
InnoDB tables report the free space of the tablespace to which the table belongs. For a table located in the shared tablespace, this is the free space of the shared tablespace. If you are using multiple tablespaces and the table has its own tablespace, the free space is for only that table. Free space means the number of bytes in completely free extents minus a safety margin. Even if free space displays as 0 , it may be possible to insert rows as long as new extents need not be allocated.

For NDB Cluster, Data_free shows the space allocated on disk for, but not used by, a Disk Data table or fragment on disk. (In-memory data resource usage is reported by the Data_length column.)

For partitioned tables, this value is only an estimate and may not be absolutely correct. A more accurate method of obtaining this information in such cases is to query the INFORMATION_SCHEMA PARTITIONS table, as shown in this example:
```
SELECT SUM(DATA_FREE)
    FROM INFORMATION_SCHEMA.PARTITIONS
    WHERE TABLE_SCHEMA = 'mydb'
    AND TABLE_NAME = 'mytable';
```


For more information, see Section 28.3.21, "The INFORMATION_SCHEMA PARTITIONS Table".
- Auto_increment

The next AUTO_INCREMENT value.
- Create_time

When the table was created.
- Update_time

When the data file was last updated. For some storage engines, this value is NULL. For example, InnoDB stores multiple tables in its system tablespace and the data file timestamp does not apply. Even with file-per-table mode with each InnoDB table in a separate .ibd file, change buffering can delay the write to the data file, so the file modification time is different from the time of the last insert, update, or delete. For MyISAM, the data file timestamp is used; however, on Windows the timestamp is not updated by updates, so the value is inaccurate.

Update_time displays a timestamp value for the last UPDATE, INSERT, or DELETE performed on InnoDB tables that are not partitioned. For MVCC, the timestamp value reflects the COMMIT time, which is considered the last update time. Timestamps are not persisted when the server is restarted or when the table is evicted from the InnoDB data dictionary cache.
- Check_time

When the table was last checked. Not all storage engines update this time, in which case, the value is always NULL.

For partitioned InnoDB tables, Check_time is always NULL.
- Collation

The table default collation. The output does not explicitly list the table default character set, but the collation name begins with the character set name.
- Checksum

The live checksum value, if any.
- Create_options

Extra options used with CREATE TABLE.
Create_options shows partitioned for a partitioned table.
Create_options shows the ENCRYPTION clause for file-per-table tablespaces if the table is encrypted or if the specified encryption differs from the schema encryption. The encryption clause is not shown for tables created in general tablespaces. To identify encrypted file-per-table and general tablespaces, query the INNODB_TABLESPACES ENCRYPTION column.

When creating a table with strict mode disabled, the storage engine's default row format is used if the specified row format is not supported. The actual row format of the table is reported in the Row_format column. Create_options shows the row format that was specified in the CREATE TABLE statement.

When altering the storage engine of a table, table options that are not applicable to the new storage engine are retained in the table definition to enable reverting the table with its previously defined options to the original storage engine, if necessary. Create_options may show retained options.
- Comment

The comment used when creating the table (or information as to why MySQL could not access the table information).

\section*{Notes}
- For InnoDB tables, SHOW TABLE STATUS does not give accurate statistics except for the physical size reserved by the table. The row count is only a rough estimate used in SQL optimization.
- For NDB tables, the output of this statement shows appropriate values for the Avg_row_length and Data_length columns, with the exception that BLOB columns are not taken into account.
- For NDB tables, Data_length includes data stored in main memory only; the Max_data_length and Data_free columns apply to Disk Data.
- For NDB Cluster Disk Data tables, Max_data_length shows the space allocated for the disk part of a Disk Data table or fragment. (In-memory data resource usage is reported by the Data_length column.)
- For MEMORY tables, the Data_length, Max_data_length, and Index_length values approximate the actual amount of allocated memory. The allocation algorithm reserves memory in large amounts to reduce the number of allocation operations.
- For views, most columns displayed by SHOW TABLE STATUS are 0 or NULL except that Name indicates the view name, Create_time indicates the creation time, and Comment says VIEW.

Table information is also available from the INFORMATION_SCHEMA TABLES table. See Section 28.3.38, "The INFORMATION_SCHEMA TABLES Table".

\subsection*{15.7.7.39 SHOW TABLES Statement}
```
SHOW [EXTENDED] [FULL] TABLES
    [{FROM | IN} db_name]
    [LIKE 'pattern' | WHERE expr]
```


SHOW TABLES lists the non-TEMPORARY tables in a given database. You can also get this list using the mysqlshow db_name command. The LIKE clause, if present, indicates which table names to match. The WHERE clause can be given to select rows using more general conditions, as discussed in Section 28.8, "Extensions to SHOW Statements".

Matching performed by the LIKE clause is dependent on the setting of the lower_case_table_names system variable.

The optional EXTENDED modifier causes SHOW TABLES to list hidden tables created by failed ALTER TABLE statements. These temporary tables have names beginning with \#sql and can be dropped using DROP TABLE.

This statement also lists any views in the database. The optional FULL modifier causes SHOW TABLES to display a second output column with values of BASE TABLE for a table, VIEW for a view, or SYSTEM VIEW for an INFORMATION_SCHEMA table.

If you have no privileges for a base table or view, it does not show up in the output from SHOW TABLES or mysqlshow db_name.

Table information is also available from the INFORMATION_SCHEMA TABLES table. See Section 28.3.38, "The INFORMATION_SCHEMA TABLES Table".

\subsection*{15.7.7.40 SHOW TRIGGERS Statement}
```
SHOW TRIGGERS
    [{FROM | IN} db_name]
    [LIKE 'pattern' | WHERE expr]
```


SHOW TRIGGERS lists the triggers currently defined for tables in a database (the default database unless a FROM clause is given). This statement returns results only for databases and tables for which you have the TRIGGER privilege. The LIKE clause, if present, indicates which table names (not trigger names) to match and causes the statement to display triggers for those tables. The WHERE clause can be given to select rows using more general conditions, as discussed in Section 28.8, "Extensions to SHOW Statements".

For the ins_sum trigger defined in Section 27.3, "Using Triggers", the output of SHOW TRIGGERS is as shown here:
```
mysql> SHOW TRIGGERS LIKE 'acc%'\G
************************** 1. row ******************************
            Trigger: ins_sum
                Event: INSERT
                Table: account
        Statement: SET @sum = @sum + NEW.amount
                Timing: BEFORE
            Created: 2018-08-08 10:10:12.61
        sql_mode: ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,
                    NO_ZERO_IN_DATE,NO_ZERO_DATE,
                    ERROR_FOR_DIVISION_BY_ZERO,
                    NO_ENGINE_SUBSTITUTION
            Definer: me@localhost
character_set_client: utf8mb4
collation_connection: utf8mb4_0900_ai_ci
    Database Collation: utf8mb4_0900_ai_ci
```


SHOW TRIGGERS output has these columns:
- Trigger

The name of the trigger.
- Event

The trigger event. This is the type of operation on the associated table for which the trigger activates. The value is INSERT (a row was inserted), DELETE (a row was deleted), or UPDATE (a row was modified).
- Table

The table for which the trigger is defined.
- Statement

The trigger body; that is, the statement executed when the trigger activates.
- Timing

Whether the trigger activates before or after the triggering event. The value is BEFORE or AFTER.
- Created

The date and time when the trigger was created. This is a TIMESTAMP ( 2 ) value (with a fractional part in hundredths of seconds) for triggers.
- sql_mode

The SQL mode in effect when the trigger was created, and under which the trigger executes. For the permitted values, see Section 7.1.11, "Server SQL Modes".
- Definer

The account of the user who created the trigger, in 'user_name'@'host_name' format.
- character_set_client

The session value of the character_set_client system variable when the trigger was created.
- collation_connection

The session value of the collation_connection system variable when the trigger was created.
- Database Collation

The collation of the database with which the trigger is associated.
Trigger information is also available from the INFORMATION_SCHEMA TRIGGERS table. See Section 28.3.44, "The INFORMATION_SCHEMA TRIGGERS Table".

\subsection*{15.7.7.41 SHOW VARIABLES Statement}
```
SHOW [GLOBAL | SESSION] VARIABLES
    [LIKE 'pattern' | WHERE expr]
```


SHOW VARIABLES shows the values of MySQL system variables (see Section 7.1.8, "Server System Variables"). This statement does not require any privilege. It requires only the ability to connect to the server.

System variable information is also available from these sources:
- Performance Schema tables. See Section 29.12.14, "Performance Schema System Variable Tables".
- The mysqladmin variables command. See Section 6.5.2, "mysqladmin - A MySQL Server Administration Program".

For SHOW VARIABLES, a LIKE clause, if present, indicates which variable names to match. A WHERE clause can be given to select rows using more general conditions, as discussed in Section 28.8, "Extensions to SHOW Statements".

SHOW VARIABLES accepts an optional GLOBAL or SESSION variable scope modifier:
- With a GLOBAL modifier, the statement displays global system variable values. These are the values used to initialize the corresponding session variables for new connections to MySQL. If a variable has no global value, no value is displayed.
- With a SESSION modifier, the statement displays the system variable values that are in effect for the current connection. If a variable has no session value, the global value is displayed. LOCAL is a synonym for SESSION.
- If no modifier is present, the default is SESSION.

The scope for each system variable is listed at Section 7.1.8, "Server System Variables".
SHOW VARIABLES is subject to a version-dependent display-width limit. For variables with very long values that are not completely displayed, use SELECT as a workaround. For example:

SELECT @@GLOBAL.innodb_data_file_path;
Most system variables can be set at server startup (read-only variables such as version_comment are exceptions). Many can be changed at runtime with the SET statement. See Section 7.1.9, "Using System Variables", and Section 15.7.6.1, "SET Syntax for Variable Assignment".

Partial output is shown here. The list of names and values may differ for your server. Section 7.1.8, "Server System Variables", describes the meaning of each variable, and Section 7.1.1, "Configuring the Server", provides information about tuning them.
```
mysql> SHOW VARIABLES;
+--------------------------------------------------------+----------------------
| Variable_name | Value |
+--------------------------------------------------------+----------------------
| activate_all_roles_on_login | OFF
| admin_address
| admin_port | 33062
| admin_ssl_ca
| admin_ssl_capath
| admin_ssl_cert
| admin_ssl_cipher
| admin_ssl_crl
| admin_ssl_crlpath
| admin_ssl_key
| admin_tls_ciphersuites
| admin_tls_version | TLSv1.2,TLSv1.3
| authentication_policy | *,,
| auto_generate_certs | ON
| auto_increment_increment | 1
| auto_increment_offset | 1
| autocommit | ON
| automatic_sp_privileges | ON
| avoid_temporal_upgrade | OFF
| back_log | 151
| basedir | /local/mysql-8.4/
| big_tables | OFF
| bind_address | 127.0.0.1
| binlog_cache_size | 32768
| binlog_checksum | CRC32
| binlog_direct_non_transactional_updates | OFF
| binlog_encryption | OFF
| binlog_error_action | ABORT_SERVER
| binlog_expire_logs_auto_purge | ON
| binlog_expire_logs_seconds | 2592000 |
...
| max_error_count | 1024
| max_execution_time | 0
| max_heap_table_size | 16777216
| max_insert_delayed_threads |20
| max_join_size | 18446744073709551615
| max_length_for_sort_data | 4096
| max_points_in_geometry | 65536
| max_prepared_stmt_count | 16382
| max_relay_log_size | 0
| max_seeks_for_key | 18446744073709551615
| max_sort_length | 1024
| max_sp_recursion_depth | 0
| max_user_connections | 0
| max_write_lock_count | 18446744073709551615 |
...
```

```
| time_zone | SYSTEM
| timestamp | 1682684938.710453
| tls_certificates_enforced_validation | OFF
| tls_ciphersuites
| tls_version | TLSv1.2,TLSv1.3
| tmp_table_size | 16777216
| tmpdir | /tmp
| transaction_alloc_block_size | 8192
| transaction_allow_batching | OFF
| transaction_isolation | REPEATABLE-READ
| transaction_prealloc_size | 4096
| transaction_read_only | OFF
| unique_checks | ON
| updatable_views_with_limit | YES
| use_secondary_engine | ON
| version | 8.4.9
| version_comment | Source distribution
| version_compile_machine | x86_64
| version_compile_os | Linux
| version_compile_zlib | 1.2.13
| wait_timeout | 28800
| warning_count | 0
| windowing_use_high_precision | ON
| xa_detach_on_prepare | ON
```


With a LIKE clause, the statement displays only rows for those variables with names that match the pattern. To obtain the row for a specific variable, use a LIKE clause as shown:
```
SHOW VARIABLES LIKE 'max_join_size';
SHOW SESSION VARIABLES LIKE 'max_join_size';
```


To get a list of variables whose name match a pattern, use the \% wildcard character in a LIKE clause:
```
SHOW VARIABLES LIKE '%size%';
SHOW GLOBAL VARIABLES LIKE '%size%';
```


Wildcard characters can be used in any position within the pattern to be matched. Strictly speaking, because _ is a wildcard that matches any single character, you should escape it as \_ to match it literally. In practice, this is rarely necessary.

\subsection*{15.7.7.42 SHOW WARNINGS Statement}

SHOW WARNINGS [LIMIT [offset,] row_count]
SHOW COUNT(*) WARNINGS
SHOW WARNINGS is a diagnostic statement that displays information about the conditions (errors, warnings, and notes) resulting from executing a statement in the current session. Warnings are generated for DML statements such as INSERT, UPDATE, and LOAD DATA as well as DDL statements such as CREATE TABLE and ALTER TABLE.

The LIMIT clause has the same syntax as for the SELECT statement. See Section 15.2.13, "SELECT Statement".

SHOW WARNINGS is also used following EXPLAIN, to display the extended information generated by EXPLAIN. See Section 10.8.3, "Extended EXPLAIN Output Format".

SHOW WARNINGS displays information about the conditions resulting from execution of the most recent nondiagnostic statement in the current session. If the most recent statement resulted in an error during parsing, SHOW WARNINGS shows the resulting conditions, regardless of statement type (diagnostic or nondiagnostic).

The SHOW COUNT( * ) WARNINGS diagnostic statement displays the total number of errors, warnings, and notes. You can also retrieve this number from the warning_count system variable:
```
SHOW COUNT(*) WARNINGS;
SELECT @@warning_count;
```


A difference in these statements is that the first is a diagnostic statement that does not clear the message list. The second, because it is a SELECT statement is considered nondiagnostic and does clear the message list.

A related diagnostic statement, SHOW ERRORS, shows only error conditions (it excludes warnings and notes), and SHOW COUNT( *) ERRORS statement displays the total number of errors. See Section 15.7.7.18, "SHOW ERRORS Statement". GET DIAGNOSTICS can be used to examine information for individual conditions. See Section 15.6.7.3, "GET DIAGNOSTICS Statement".

Here is a simple example that shows data-conversion warnings for INSERT. The example assumes that strict SQL mode is disabled. With strict mode enabled, the warnings would become errors and terminate the INSERT.
```
mysql> CREATE TABLE t1 (a TINYINT NOT NULL, b CHAR(4));
Query OK, 0 rows affected (0.05 sec)
mysql> INSERT INTO t1 VALUES(10,'mysql'), (NULL,'test'), (300,'xyz');
Query OK, 3 rows affected, 3 warnings (0.00 sec)
Records: 3 Duplicates: 0 Warnings: 3
mysql> SHOW WARNINGS\G
************************** 1. row *****************************************
    Level: Warning
        Code: 1265
Message: Data truncated for column 'b' at row 1
************************** 2. row ******************************
    Level: Warning
        Code: 1048
Message: Column 'a' cannot be null
************************** 3. row
    Level: Warning
        Code: 1264
Message: Out of range value for column 'a' at row 3
3 rows in set (0.00 sec)
```


The max_error_count system variable controls the maximum number of error, warning, and note messages for which the server stores information, and thus the number of messages that SHOW WARNINGS displays. To change the number of messages the server can store, change the value of max_error_count.
max_error_count controls only how many messages are stored, not how many are counted. The value of warning_count is not limited by max_error_count, even if the number of messages generated exceeds max_error_count. The following example demonstrates this. The ALTER TABLE statement produces three warning messages (strict SQL mode is disabled for the example to prevent an error from occurring after a single conversion issue). Only one message is stored and displayed because max_error_count has been set to 1, but all three are counted (as shown by the value of warning_count):
```
mysql> SHOW VARIABLES LIKE 'max_error_count';
+-------------------+-------+
| Variable_name | Value |
+------------------+-------+
| max_error_count | 1024 |
+------------------+-------+
1 row in set (0.00 sec)
mysql> SET max_error_count=1, sql_mode = '';
Query OK, 0 rows affected (0.00 sec)
mysql> ALTER TABLE t1 MODIFY b CHAR;
Query OK, 3 rows affected, 3 warnings (0.00 sec)
Records: 3 Duplicates: 0 Warnings: 3
mysql> SHOW WARNINGS;
+----------+------+------------------------------------------
| Level | Code | Message |
+----------+------+----------------------------------------
```

```
| Warning | 1263 | Data truncated for column 'b' at row 1 |
+----------+------+-----------------------------------------
1 row in set (0.00 sec)
mysql> SELECT @@warning_count;
+------------------+
| @@warning_count |
+------------------+
| 3 |
+------------------+
1 row in set (0.01 sec)
```


To disable message storage, set max_error_count to 0 . In this case, warning_count still indicates how many warnings occurred, but messages are not stored and cannot be displayed.

The sql_notes system variable controls whether note messages increment warning_count and whether the server stores them. By default, sql_notes is 1 , but if set to 0 , notes do not increment warning_count and the server does not store them:
```
mysql> SET sql_notes = 1;
mysql> DROP TABLE IF EXISTS test.no_such_table;
Query OK, 0 rows affected, 1 warning (0.00 sec)
mysql> SHOW WARNINGS;
+--------+------+--------------------------------------
| Level | Code | Message |
+--------+------+-----------------------------------+
| Note | 1051 | Unknown table 'test.no_such_table' |
+--------+------+--------------------------------------
1 row in set (0.00 sec)
mysql> SET sql_notes = 0;
mysql> DROP TABLE IF EXISTS test.no_such_table;
Query OK, 0 rows affected (0.00 sec)
mysql> SHOW WARNINGS;
Empty set (0.00 sec)
```


The MySQL server sends to each client a count indicating the total number of errors, warnings, and notes resulting from the most recent statement executed by that client. From the C API, this value can be obtained by calling mysql_warning_count ( ). See mysql_warning_count().

In the mysql client, you can enable and disable automatic warnings display using the warnings and nowarning commands, respectively, or their shortcuts, \Wand \w(see Section 6.5.1.2, "mysql Client Commands"). For example:
```
mysql> \W
Show warnings enabled.
mysql> SELECT 1/0;
+------+
| 1/0 |
+------+
| NULL |
+------+
1 row in set, 1 warning (0.03 sec)
Warning (Code 1365): Division by 0
mysql> \w
Show warnings disabled.
```


\subsection*{15.7.8 Other Administrative Statements}

\subsection*{15.7.8.1 BINLOG Statement}
```
BINLOG 'str'
```


BINLOG is an internal-use statement. It is generated by the mysqlbinlog program as the printable representation of certain events in binary log files. (See Section 6.6.9, "mysqlbinlog - Utility for Processing Binary Log Files".) The 'str' value is a base 64-encoded string the that server decodes to determine the data change indicated by the corresponding event.

To execute BINLOG statements when applying mysqlbinlog output, a user account requires the BINLOG_ADMIN privilege (or the deprecated SUPER privilege), or the REPLICATION_APPLIER privilege plus the appropriate privileges to execute each log event.

This statement can execute only format description events and row events.

\subsection*{15.7.8.2 CACHE INDEX Statement}
```
CACHE INDEX {
            tbl_index_list [, tbl_index_list] ...
        | tbl_name PARTITION (partition_list)
    }
    IN key_cache_name
tbl_index_list:
    tbl_name [{INDEX|KEY} (index_name[, index_name] ...)]
partition_list: {
        partition_name[, partition_name] ...
    | ALL
}
```


The CACHE INDEX statement assigns table indexes to a specific key cache. It applies only to MyISAM tables, including partitioned MyISAM tables. After the indexes have been assigned, they can be preloaded into the cache if desired with LOAD INDEX INTO CACHE.

The following statement assigns indexes from the tables t1, t2, and t3 to the key cache named hot_cache:
```
mysql> CACHE INDEX t1, t2, t3 IN hot_cache;
+---------+---------------------+----------+---------+
| Table | Op | Msg_type | Msg_text |
+---------+---------------------+----------+----------+
| test.t1 | assign_to_keycache | status | OK
| test.t2 | assign_to_keycache | status | OK
| test.t3 | assign_to_keycache | status | OK
+---------+---------------------+----------+----------+
```


The syntax of CACHE INDEX enables you to specify that only particular indexes from a table should be assigned to the cache. However, the implementation assigns all the table's indexes to the cache, so there is no reason to specify anything other than the table name.

The key cache referred to in a CACHE INDEX statement can be created by setting its size with a parameter setting statement or in the server parameter settings. For example:
```
SET GLOBAL keycache1.key_buffer_size=128*1024;
```


Key cache parameters are accessed as members of a structured system variable. See Section 7.1.9.5, "Structured System Variables".

A key cache must exist before you assign indexes to it, or an error occurs:
```
mysql> CACHE INDEX t1 IN non_existent_cache;
ERROR 1284 (HY000): Unknown key cache 'non_existent_cache'
```


By default, table indexes are assigned to the main (default) key cache created at the server startup. When a key cache is destroyed, all indexes assigned to it are reassigned to the default key cache.

Index assignment affects the server globally: If one client assigns an index to a given cache, this cache is used for all queries involving the index, no matter which client issues the queries.

CACHE INDEX is supported for partitioned MyISAM tables. You can assign one or more indexes for one, several, or all partitions to a given key cache. For example, you can do the following:
```
CREATE TABLE pt (c1 INT, c2 VARCHAR(50), INDEX i(c1))
    ENGINE=MyISAM
```

```
    PARTITION BY HASH(c1)
    PARTITIONS 4;
SET GLOBAL kc_fast.key_buffer_size = 128 * 1024;
SET GLOBAL kc_slow.key_buffer_size = 128 * 1024;
CACHE INDEX pt PARTITION (p0) IN kc_fast;
CACHE INDEX pt PARTITION (p1, p3) IN kc_slow;
```


The previous set of statements performs the following actions:
- Creates a partitioned table with 4 partitions; these partitions are automatically named $p 0, \ldots, p 3$; this table has an index named i on column c1.
- Creates 2 key caches named kc_fast and kc_slow
- Assigns the index for partition p0 to the kc_fast key cache and the index for partitions p1 and p3 to the kc_slow key cache; the index for the remaining partition (p2) uses the server's default key cache.

If you wish instead to assign the indexes for all partitions in table pt to a single key cache named kc_all, you can use either of the following two statements:
```
CACHE INDEX pt PARTITION (ALL) IN kc_all;
CACHE INDEX pt IN kc_all;
```


The two statements just shown are equivalent, and issuing either one has exactly the same effect. In other words, if you wish to assign indexes for all partitions of a partitioned table to the same key cache, the PARTITION (ALL) clause is optional.

When assigning indexes for multiple partitions to a key cache, the partitions need not be contiguous, and you need not list their names in any particular order. Indexes for any partitions not explicitly assigned to a key cache automatically use the server default key cache.

Index preloading is also supported for partitioned MyISAM tables. For more information, see Section 15.7.8.5, "LOAD INDEX INTO CACHE Statement".

\subsection*{15.7.8.3 FLUSH Statement}
```
FLUSH [NO_WRITE_TO_BINLOG | LOCAL] {
        flush_option [, flush_option] ...
    | tables_option
}
flush_option: {
        BINARY LOGS
    | ENGINE LOGS
    | ERROR LOGS
    | GENERAL LOGS
    | LOGS
    | PRIVILEGES
    | OPTIMIZER_COSTS
    | RELAY LOGS [FOR CHANNEL channel]
    | SLOW LOGS
    | STATUS
    | USER_RESOURCES
}
tables_option: {
        table_synonym
    | table_synonym tbl_name [, tbl_name] ...
    | table_synonym WITH READ LOCK
    | table_synonym tbl_name [, tbl_name] ... WITH READ LOCK
    | table_synonym tbl_name [, tbl_name] ... FOR EXPORT
}
table_synonym: {
```

```
        TABLE
    | TABLES
}
```


The FLUSH statement has several variant forms that clear or reload various internal caches, flush tables, or acquire locks. Each FLUSH operation requires the privileges indicated in its description.

\section*{Note}

It is not possible to issue FLUSH statements within stored functions or triggers. However, you may use FLUSH in stored procedures, so long as these are not called from stored functions or triggers. See Section 27.8, "Restrictions on Stored Programs".

By default, the server writes FLUSH statements to the binary log so that they replicate to replicas. To suppress logging, specify the optional NO_WRITE_TO_BINLOG keyword or its alias LOCAL.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2951.jpg?height=255&width=269&top_left_y=895&top_left_x=367)

\section*{Note}

FLUSH LOGS, FLUSH BINARY LOGS, FLUSH TABLES WITH READ LOCK (with or without a table list), and FLUSH TABLES tbl_name ... FOR EXPORT are not written to the binary log in any case because they would cause problems if replicated to a replica.

The FLUSH statement causes an implicit commit. See Section 15.3.3, "Statements That Cause an Implicit Commit".

The mysqladmin utility provides a command-line interface to some flush operations, using commands such as flush-logs, flush-privileges, flush-status, and flush-tables. See Section 6.5.2, "mysqladmin - A MySQL Server Administration Program".

Sending a SIGHUP or SIGUSR1 signal to the server causes several flush operations to occur that are similar to various forms of the FLUSH statement. Signals can be sent by the root system account or the system account that owns the server process. This enables the flush operations to be performed without having to connect to the server, which requires a MySQL account that has privileges sufficient for those operations. See Section 6.10, "Unix Signal Handling in MySQL".

The RESET statement is similar to FLUSH. See Section 15.7.8.6, "RESET Statement", for information about using RESET with replication.

The following list describes the permitted FLUSH statement flush_option values. For descriptions of the permitted tables_option values, see FLUSH TABLES Syntax.

\section*{- FLUSH BINARY LOGS}

Closes and reopens any binary log file to which the server is writing. If binary logging is enabled, the sequence number of the binary log file is incremented by one relative to the previous file.

This operation requires the RELOAD privilege.
- FLUSH ENGINE LOGS

Closes and reopens any flushable logs for installed storage engines. This causes InnoDB to flush its logs to disk.

This operation requires the RELOAD privilege.
- FLUSH ERROR LOGS

Closes and reopens any error log file to which the server is writing.
This operation requires the RELOAD privilege.
- FLUSH GENERAL LOGS

Closes and reopens any general query log file to which the server is writing.
This operation requires the RELOAD privilege.
This operation has no effect on tables used for the general query log (see Section 7.4.1, "Selecting General Query Log and Slow Query Log Output Destinations").
- FLUSH LOGS

Closes and reopens any log file to which the server is writing.
This operation requires the RELOAD privilege.
The effect of this operation is equivalent to the combined effects of these operations:
FLUSH BINARY LOGS
FLUSH ENGINE LOGS
FLUSH ERROR LOGS
FLUSH GENERAL LOGS
FLUSH RELAY LOGS
FLUSH SLOW LOGS
- FLUSH OPTIMIZER_COSTS

Re-reads the cost model tables so that the optimizer starts using the current cost estimates stored in them.

This operation requires the FLUSH_OPTIMIZER_COSTS or RELOAD privilege.
The server writes a warning to the error log for any unrecognized cost model table entries. For information about these tables, see Section 10.9.5, "The Optimizer Cost Model". This operation affects only sessions that begin subsequent to the flush. Existing sessions continue to use the cost estimates that were current when they began.
- FLUSH PRIVILEGES

Re-reads the privileges from the grant tables in the mysql system schema. As part of this operation, the server reads the global_grants table containing dynamic privilege assignments and registers any unregistered privileges found there.

Reloading the grant tables is necessary to enable updates to MySQL privileges and users only if you make such changes directly to the grant tables; it is not needed for account management statements such as GRANT or REVOKE, which take effect immediately. See Section 8.2.13, "When Privilege Changes Take Effect", for more information.

This operation requires the RELOAD or FLUSH_PRIVILEGES privilege.
If the--skip-grant-tables option was specified at server startup to disable the MySQL privilege system, FLUSH PRIVILEGES provides a way to enable the privilege system at runtime.

Resets failed-login tracking (or enables it if the server was started with --skip-grant-tables) and unlocks any temporarily locked accounts. See Section 8.2.15, "Password Management".

Frees memory cached by the server as a result of GRANT, CREATE USER, CREATE SERVER, and INSTALL PLUGIN statements. This memory is not released by the corresponding REVOKE, DROP USER, DROP SERVER, and UNINSTALL PLUGIN statements, so for a server that executes many instances of the statements that cause caching, there is an increase in cached memory use unless it is freed with FLUSH PRIVILEGES.

Clears the in-memory cache used by the caching_sha2_password authentication plugin. See Cache Operation for SHA-2 Pluggable Authentication.
- FLUSH RELAY LOGS [FOR CHANNEL channel]

Closes and reopens any relay log file to which the server is writing. If relay logging is enabled, the sequence number of the relay log file is incremented by one relative to the previous file.

This operation requires the RELOAD privilege.
The FOR CHANNEL channel clause enables you to name which replication channel the operation applies to. Execute FLUSH RELAY LOGS FOR CHANNEL channel to flush the relay log for a specific replication channel. If no channel is named and no extra replication channels exist, the operation applies to the default channel. If no channel is named and multiple replication channels exist, the operation applies to all replication channels. For more information, see Section 19.2.2, "Replication Channels".
- FLUSH SLOW LOGS

Closes and reopens any slow query log file to which the server is writing.
This operation requires the RELOAD privilege.
This operation has no effect on tables used for the slow query log (see Section 7.4.1, "Selecting General Query Log and Slow Query Log Output Destinations").
- FLUSH STATUS

Flushes status indicators.

This operation adds the current thread's session status variable values to the global values and resets the session values to zero. Some global variables may be reset to zero as well. It also resets the counters for key caches (default and named) to zero and sets Max_used_connections to the current number of open connections. This information may be of use when debugging a query. See Section 1.6, "How to Report Bugs or Problems".

FLUSH STATUS is unaffected by read_only or super_read_only, and is always written to the binary log.

This operation requires the FLUSH_STATUS or RELOAD privilege.
- FLUSH USER_RESOURCES

Resets all per-hour user resource indicators to zero.
This operation requires the FLUSH_USER_RESOURCES or RELOAD privilege.
Resetting resource indicators enables clients that have reached their hourly connection, query, or update limits to resume activity immediately. FLUSH USER_RESOURCES does not apply to the limit on maximum simultaneous connections that is controlled by the max_user_connections system variable. See Section 8.2.21, "Setting Account Resource Limits".

\section*{FLUSH TABLES Syntax}

FLUSH TABLES flushes tables, and, depending on the variant used, acquires locks. Any TABLES variant used in a FLUSH statement must be the only option used. FLUSH TABLE is a synonym for FLUSH TABLES.

\section*{Note}

The descriptions here that indicate tables are flushed by closing them apply differently for InnoDB, which flushes table contents to disk but leaves them open. This still permits table files to be copied while the tables are open, as long as other activity does not modify them.
- FLUSH TABLES

Closes all open tables, forces all tables in use to be closed, and flushes the prepared statement cache.

This operation requires the FLUSH_TABLES or RELOAD privilege.
For information about prepared statement caching, see Section 10.10.3, "Caching of Prepared Statements and Stored Programs".

FLUSH TABLES is not permitted when there is an active LOCK TABLES ... READ. To flush and lock tables, use FLUSH TABLES tbl_name ... WITH READ LOCK instead.
- FLUSH TABLES tbl_name [, tbl_name] ...

With a list of one or more comma-separated table names, this operation is like FLUSH TABLES with no names except that the server flushes only the named tables. If a named table does not exist, no error occurs.

This operation requires the FLUSH_TABLES or RELOAD privilege.
- FLUSH TABLES WITH READ LOCK

Closes all open tables and locks all tables for all databases with a global read lock.
This operation requires the FLUSH_TABLES or RELOAD privilege.
This operation is a very convenient way to get backups if you have a file system such as Veritas or ZFS that can take snapshots in time. Use UNLOCK TABLES to release the lock.

FLUSH TABLES WITH READ LOCK acquires a global read lock rather than table locks, so it is not subject to the same behavior as LOCK TABLES and UNLOCK TABLES with respect to table locking and implicit commits:
- UNLOCK TABLES implicitly commits any active transaction only if any tables currently have been locked with LOCK TABLES. The commit does not occur for UNLOCK TABLES following FLUSH TABLES WITH READ LOCK because the latter statement does not acquire table locks.
- Beginning a transaction causes table locks acquired with LOCK TABLES to be released, as though you had executed UNLOCK TABLES. Beginning a transaction does not release a global read lock acquired with FLUSH TABLES WITH READ LOCK.

FLUSH TABLES WITH READ LOCK does not prevent the server from inserting rows into the log tables (see Section 7.4.1, "Selecting General Query Log and Slow Query Log Output Destinations").
- FLUSH TABLES tbl_name [, tbl_name] ... WITH READ LOCK

Flushes and acquires read locks for the named tables.
This operation requires the FLUSH_TABLES or RELOAD privilege. Because it acquires table locks, it also requires the LOCK TABLES privilege for each table.

The operation first acquires exclusive metadata locks for the tables, so it waits for transactions that have those tables open to complete. Then the operation flushes the tables from the table cache, reopens the tables, acquires table locks (like LOCK TABLES ... READ), and downgrades the
metadata locks from exclusive to shared. After the operation acquires locks and downgrades the metadata locks, other sessions can read but not modify the tables.

This operation applies only to existing base (non-TEMPORARY) tables. If a name refers to a base table, that table is used. If it refers to a TEMPORARY table, it is ignored. If a name applies to a view, an ER_WRONG_OBJECT error occurs. Otherwise, an ER_NO_SUCH_TABLE error occurs.

Use UNLOCK TABLES to release the locks, LOCK TABLES to release the locks and acquire other locks, or START TRANSACTION to release the locks and begin a new transaction.

This FLUSH TABLES variant enables tables to be flushed and locked in a single operation. It provides a workaround for the restriction that FLUSH TABLES is not permitted when there is an active LOCK TABLES ... READ.

This operation does not perform an implicit UNLOCK TABLES, so an error results if you perform the operation while there is any active LOCK TABLES or use it a second time without first releasing the locks acquired.

If a flushed table was opened with HANDLER, the handler is implicitly flushed and loses its position.

\section*{- FLUSH TABLES tbl_name [, tbl_name] ... FOR EXPORT}

This FLUSH TABLES variant applies to InnoDB tables. It ensures that changes to the named tables have been flushed to disk so that binary table copies can be made while the server is running.

This operation requires the FLUSH_TABLES or RELOAD privilege. Because it acquires locks on tables in preparation for exporting them, it also requires the LOCK TABLES and SELECT privileges for each table.

The operation works like this:
1. It acquires shared metadata locks for the named tables. The operation blocks as long as other sessions have active transactions that have modified those tables or hold table locks for them. When the locks have been acquired, the operation blocks transactions that attempt to update the tables, while permitting read-only operations to continue.
2. It checks whether all storage engines for the tables support FOR EXPORT. If any do not, an ER_ILLEGAL_HA error occurs and the operation fails.
3. The operation notifies the storage engine for each table to make the table ready for export. The storage engine must ensure that any pending changes are written to disk.
4. The operation puts the session in lock-tables mode so that the metadata locks acquired earlier are not released when the FOR EXPORT operation completes.

This operation applies only to existing base (non-TEMPORARY) tables. If a name refers to a base table, that table is used. If it refers to a TEMPORARY table, it is ignored. If a name applies to a view, an ER_WRONG_OBJECT error occurs. Otherwise, an ER_NO_SUCH_TABLE error occurs.

InnoDB supports FOR EXPORT for tables that have their own . ibd file file (that is, tables created with the innodb_file_per_table setting enabled). InnoDB ensures when notified by the FOR EXPORT operation that any changes have been flushed to disk. This permits a binary copy of table contents to be made while the FOR EXPORT operation is in effect because the . ibd file is transaction consistent and can be copied while the server is running. FOR EXPORT does not apply to InnoDB system tablespace files, or to InnoDB tables that have FULLTEXT indexes.

FLUSH TABLES ...FOR EXPORT is supported for partitioned InnoDB tables.
When notified by FOR EXPORT, InnoDB writes to disk certain kinds of data that is normally held in memory or in separate disk buffers outside the tablespace files. For each table, InnoDB also
produces a file named table_name.cfg in the same database directory as the table. The .cfg file contains metadata needed to reimport the tablespace files later, into the same or different server.

When the FOR EXPORT operation completes, InnoDB has flushed all dirty pages to the table data files. Any change buffer entries are merged prior to flushing. At this point, the tables are locked and quiescent: The tables are in a transactionally consistent state on disk and you can copy the .ibd tablespace files along with the corresponding. cfg files to get a consistent snapshot of those tables.

For the procedure to reimport the copied table data into a MySQL instance, see Section 17.6.1.3, "Importing InnoDB Tables".

After you are done with the tables, use UNLOCK TABLES to release the locks, LOCK TABLES to release the locks and acquire other locks, or START TRANSACTION to release the locks and begin a new transaction.

While any of these statements is in effect within the session, attempts to use FLUSH TABLES ... FOR EXPORT produce an error:
```
FLUSH TABLES ... WITH READ LOCK
FLUSH TABLES ... FOR EXPORT
LOCK TABLES ... READ
LOCK TABLES ... WRITE
```


While FLUSH TABLES ... FOR EXPORT is in effect within the session, attempts to use any of these statements produce an error:
```
FLUSH TABLES WITH READ LOCK
FLUSH TABLES ... WITH READ LOCK
FLUSH TABLES ... FOR EXPORT
```


\subsection*{15.7.8.4 KILL Statement}

KILL [CONNECTION | QUERY] processlist_id
Each connection to mysqld runs in a separate thread. You can kill a thread with the KILL processlist_id statement.

Thread processlist identifiers can be determined from the ID column of the INFORMATION_SCHEMA PROCESSLIST table, the Id column of SHOW PROCESSLIST output, and the PROCESSLIST_ID column of the Performance Schema threads table. The value for the current thread is returned by the CONNECTION_ID() function.

KILL permits an optional CONNECTION or QUERY modifier:
- KILL CONNECTION is the same as KILL with no modifier: It terminates the connection associated with the given processlist_id, after terminating any statement the connection is executing.
- KILL QUERY terminates the statement the connection is currently executing, but leaves the connection itself intact.

The ability to see which threads are available to be killed depends on the PROCESS privilege:
- Without PROCESS, you can see only your own threads.
- With PROCESS, you can see all threads.

The ability to kill threads and statements depends on the CONNECTION_ADMIN privilege and the deprecated SUPER privilege:
- Without CONNECTION_ADMIN or SUPER, you can kill only your own threads and statements.
- With CONNECTION_ADMIN or SUPER, you can kill all threads and statements, except that to affect a thread or statement that is executing with the SYSTEM_USER privilege, your own session must additionally have the SYSTEM_USER privilege.

You can also use the mysqladmin processlist and mysqladmin kill commands to examine and kill threads.

When you use KILL, a thread-specific kill flag is set for the thread. In most cases, it might take some time for the thread to die because the kill flag is checked only at specific intervals:
- During SELECT operations, for ORDER BY and GROUP BY loops, the flag is checked after reading a block of rows. If the kill flag is set, the statement is aborted.
- ALTER TABLE operations that make a table copy check the kill flag periodically for each few copied rows read from the original table. If the kill flag was set, the statement is aborted and the temporary table is deleted.

The KILL statement returns without waiting for confirmation, but the kill flag check aborts the operation within a reasonably small amount of time. Aborting the operation to perform any necessary cleanup also takes some time.
- During UPDATE or DELETE operations, the kill flag is checked after each block read and after each updated or deleted row. If the kill flag is set, the statement is aborted. If you are not using transactions, the changes are not rolled back.
- GET_LOCK( ) aborts and returns NULL.
- If the thread is in the table lock handler (state: Locked), the table lock is quickly aborted.
- If the thread is waiting for free disk space in a write call, the write is aborted with a "disk full" error message.
- EXPLAIN ANALYZE aborts and prints the first row of output.

\section*{Warning}

Killing a REPAIR TABLE or OPTIMIZE TABLE operation on a MyISAM table results in a table that is corrupted and unusable. Any reads or writes to such a table fail until you optimize or repair it again (without interruption).

\subsection*{15.7.8.5 LOAD INDEX INTO CACHE Statement}
```
LOAD INDEX INTO CACHE
    tbl_index_list [, tbl_index_list] ...
tbl_index_list:
    tbl_name
        [PARTITION (partition_list)]
        [{INDEX|KEY} (index_name[, index_name] ...)]
        [IGNORE LEAVES]
partition_list: {
        partition_name[, partition_name] ...
    | ALL
}
```


The LOAD INDEX INTO CACHE statement preloads a table index into the key cache to which it has been assigned by an explicit CACHE INDEX statement, or into the default key cache otherwise.

LOAD INDEX INTO CACHE applies only to MyISAM tables, including partitioned MyISAM tables. In addition, indexes on partitioned tables can be preloaded for one, several, or all partitions.

The IGNORE LEAVES modifier causes only blocks for the nonleaf nodes of the index to be preloaded.
IGNORE LEAVES is also supported for partitioned MyISAM tables.
The following statement preloads nodes (index blocks) of indexes for the tables t1 and t2:
```
mysql> LOAD INDEX INTO CACHE t1, t2 IGNORE LEAVES;
+----------+---------------+----------+----------+
```

```
| Table | Op | Msg_type | Msg_text |
+----------+---------------+----------+----------+
| test.t1 | preload_keys | status | OK
| test.t2 | preload_keys | status | OK |
+----------+---------------+----------+----------+
```


This statement preloads all index blocks from t1. It preloads only blocks for the nonleaf nodes from t2.
The syntax of LOAD INDEX INTO CACHE enables you to specify that only particular indexes from a table should be preloaded. However, the implementation preloads all the table's indexes into the cache, so there is no reason to specify anything other than the table name.

It is possible to preload indexes on specific partitions of partitioned MyISAM tables. For example, of the following 2 statements, the first preloads indexes for partition p0 of a partitioned table pt, while the second preloads the indexes for partitions p1 and p3 of the same table:
```
LOAD INDEX INTO CACHE pt PARTITION (p0);
LOAD INDEX INTO CACHE pt PARTITION (p1, p3);
```


To preload the indexes for all partitions in table pt, you can use either of the following two statements:
```
LOAD INDEX INTO CACHE pt PARTITION (ALL);
LOAD INDEX INTO CACHE pt;
```


The two statements just shown are equivalent, and issuing either one has exactly the same effect. In other words, if you wish to preload indexes for all partitions of a partitioned table, the PARTITION (ALL) clause is optional.

When preloading indexes for multiple partitions, the partitions need not be contiguous, and you need not list their names in any particular order.

LOAD INDEX INTO CACHE ... IGNORE LEAVES fails unless all indexes in a table have the same block size. To determine index block sizes for a table, use myisamchk -dv and check the Blocksize column.

\subsection*{15.7.8.6 RESET Statement}
```
RESET reset_option [, reset_option] ...
reset_option: {
        BINARY LOGS AND GTIDS
    | REPLICA
}
```


The RESET statement is used to clear the state of various server operations. You must have the RELOAD privilege to execute RESET.

For information about the RESET PERSIST statement that removes persisted global system variables, see Section 15.7.8.7, "RESET PERSIST Statement".

RESET acts as a stronger version of the FLUSH statement. See Section 15.7.8.3, "FLUSH Statement".
The RESET statement causes an implicit commit. See Section 15.3.3, "Statements That Cause an Implicit Commit".

The following list describes the permitted RESET statement reset_option values:
- RESET BINARY LOGS AND GTIDS

Deletes all binary logs listed in the index file, resets the binary log index file to be empty, and creates a new binary log file.
- RESET REPLICA

Makes the replica forget its replication position in the source binary logs. Also resets the relay log by deleting any existing relay log files and beginning a new one.

\subsection*{15.7.8.7 RESET PERSIST Statement}

RESET PERSIST [[IF EXISTS] system_var_name]
RESET PERSIST removes persisted global system variable settings from the mysqld-auto.cnf option file in the data directory. Removing a persisted system variable causes the variable no longer to be initialized from mysqld-auto.cnf at server startup. For more information about persisting system variables and the mysqld-auto.cnf file, see Section 7.1.9.3, "Persisted System Variables".

The privileges required for RESET PERSIST depend on the type of system variable to be removed:
- For dynamic system variables, this statement requires the SYSTEM_VARIABLES_ADMIN privilege (or the deprecated SUPER privilege).
- For read-only system variables, this statement requires the SYSTEM_VARIABLES_ADMIN and PERSIST_RO_VARIABLES_ADMIN privileges.

See Section 7.1.9.1, "System Variable Privileges".
Depending on whether the variable name and IF EXISTS clauses are present, the RESET PERSIST statement has these forms:
- To remove all persisted variables from mysqld-auto.cnf, use RESET PERSIST without naming any system variable:

RESET PERSIST;
You must have privileges for removing both dynamic and read-only system variables if mysqldauto. cnf contains both kinds of variables.
- To remove a specific persisted variable from mysqld-auto.cnf, name it in the statement:

RESET PERSIST system_var_name;
This includes plugin system variables, even if the plugin is not currently installed. If the variable is not present in the file, an error occurs.
- To remove a specific persisted variable from mysqld-auto.cnf, but produce a warning rather than an error if the variable is not present in the file, add an IF EXISTS clause to the previous syntax:

RESET PERSIST IF EXISTS system_var_name;
RESET PERSIST is not affected by the value of the persisted_globals_load system variable.
RESET PERSIST affects the contents of the Performance Schema persisted_variables table because the table contents correspond to the contents of the mysqld-auto.cnf file. On the other hand, because RESET PERSIST does not change variable values, it has no effect on the contents of the Performance Schema variables_info table until the server is restarted.

For information about RESET statement variants that clear the state of other server operations, see Section 15.7.8.6, "RESET Statement".

\subsection*{15.7.8.8 RESTART Statement}

\section*{RESTART}

This statement stops and restarts the MySQL server. It requires the SHUTDOWN privilege.
One use for RESTART is when it is not possible or convenient to gain command-line access to the MySQL server on the server host to restart it. For example, SET PERSIST_ONLY can be used at runtime to make configuration changes to system variables that can be set only at server startup, but the server must still be restarted for those changes to take effect. The RESTART statement provides a way to do so from within client sessions, without requiring command-line access on the server host.

\section*{Note}

After executing a RESTART statement, the client can expect the current connection to be lost. If auto-reconnect is enabled, the connection is reestablished after the server restarts. Otherwise, the connection must be reestablished manually.

A successful RESTART operation requires mysqld to be running in an environment that has a monitoring process available to detect a server shutdown performed for restart purposes:
- In the presence of a monitoring process, RESTART causes mysqld to terminate such that the monitoring process can determine that it should start a new mysqld instance.
- If no monitoring process is present, RESTART fails with an error.

These platforms provide the necessary monitoring support for the RESTART statement:
- Windows, when mysqld is started as a Windows service or standalone. (mysqld forks, and one process acts as a monitor to the other, which acts as the server.)
- Unix and Unix-like systems that use systemd or mysqld_safe to manage mysqld.

To configure a monitoring environment such that mysqld enables the RESTART statement:
1. Set the MYSQLD_PARENT_PID environment variable to the value of the process ID of the process that starts mysqld, before starting mysqld.
2. When mysqld performs a shutdown due to use of the RESTART statement, it returns exit code 16.
3. When the monitoring process detects an exit code of 16 , it starts mysqld again. Otherwise, it exits.

Here is a minimal example as implemented in the bash shell:
```
#!/bin/bash
export MYSQLD_PARENT_PID=$$
export MYSQLD_RESTART_EXIT=16
while true ; do
    bin/mysqld mysqld options here
    if [ $? -ne $MYSQLD_RESTART_EXIT ]; then
        break
    fi
done
```


On Windows, the forking used to implement RESTART makes determining the server process to attach to for debugging more difficult. To alleviate this, starting the server with --gdb suppresses forking, in addition to its other actions done to set up a debugging environment. In non-debug settings, - - no monitor may be used for the sole purpose of suppressing forking the monitor process. For a server started with either --gdb or --no-monitor, executing RESTART causes the server to simply exit without restarting.

The Com_restart status variable tracks the number of RESTART statements. Because status variables are initialized for each server startup and do not persist across restarts, Com_restart normally has a value of zero, but can be nonzero if RESTART statements were executed but failed.

\subsection*{15.7.8.9 SHUTDOWN Statement}

SHUTDOWN
This statement stops the MySQL server. It requires the SHUTDOWN privilege.
SHUTDOWN provides an SQL-level interface to the same functionality available using the mysqladmin shutdown command. A successful SHUTDOWN sequence consists of checking the privileges, validating the arguments, and sending an OK packet to the client. Then the server is shut down.

The Com_shutdown status variable tracks the number of SHUTDOWN statements. Because status variables are initialized for each server startup and do not persist across restarts, Com_shutdown normally has a value of zero, but can be nonzero if SHUTDOWN statements were executed but failed.

Another way to stop the server is to send it a SIGTERM signal, which can be done by root or the account that owns the server process. SIGTERM enables server shutdown to be performed without having to connect to the server. See Section 6.10, "Unix Signal Handling in MySQL".

\subsection*{15.8 Utility Statements}

\subsection*{15.8.1 DESCRIBE Statement}

The DESCRIBE and EXPLAIN statements are synonyms, used either to obtain information about table structure or query execution plans. For more information, see Section 15.7.7.6, "SHOW COLUMNS Statement", and Section 15.8.2, "EXPLAIN Statement".

\subsection*{15.8.2 EXPLAIN Statement}
```
{EXPLAIN | DESCRIBE | DESC}
        tbl_name [col_name | wild]
{EXPLAIN | DESCRIBE | DESC}
        [explain_type] [INTO variable]
        {[schema_spec] explainable_stmt | FOR CONNECTION connection_id}
{EXPLAIN | DESCRIBE | DESC} ANALYZE [FORMAT = TREE] [schema_spec] select_statement
explain_type: {
        FORMAT = format_name
}
format_name: {
        TRADITIONAL
    | JSON
    | TREE
}
explainable_stmt: {
        SELECT statement
    | TABLE statement
    | DELETE statement
    | INSERT statement
    | REPLACE statement
    | UPDATE statement
}
schema_spec:
FOR {SCHEMA | DATABASE} schema_name
```


The DESCRIBE and EXPLAIN statements are synonyms. In practice, the DESCRIBE keyword is more often used to obtain information about table structure, whereas EXPLAIN is used to obtain a query execution plan (that is, an explanation of how MySQL would execute a query).

The following discussion uses the DESCRIBE and EXPLAIN keywords in accordance with those uses, but the MySQL parser treats them as completely synonymous.
- Obtaining Table Structure Information
- Obtaining Execution Plan Information
- Obtaining Information with EXPLAIN ANALYZE

\section*{Obtaining Table Structure Information}

DESCRIBE provides information about the columns in a table:
```
mysql> DESCRIBE City;
```

```
+-------------+----------+------+-----+----------+-----------------+
+-------------+----------+------+-----+---------+----------------
| Id | int(11) | NO | PRI | NULL | auto_increment
| Name | char(35) | NO | | |
| Country | char(3) | NO | UNI
| District | char(20) | YES | MUL
| Population | int(11) | NO | | 0
+-------------+----------+------+-----+---------+---------------+
```


DESCRIBE is a shortcut for SHOW COLUMNS. These statements also display information for views. The description for SHOW COLUMNS provides more information about the output columns. See Section 15.7.7.6, "SHOW COLUMNS Statement".

By default, DESCRIBE displays information about all columns in the table. col_name, if given, is the name of a column in the table. In this case, the statement displays information only for the named column. wild, if given, is a pattern string. It can contain the SQL \% and _ wildcard characters. In this case, the statement displays output only for the columns with names matching the string. There is no need to enclose the string within quotation marks unless it contains spaces or other special characters.

The DESCRIBE statement is provided for compatibility with Oracle.
The SHOW CREATE TABLE, SHOW TABLE STATUS, and SHOW INDEX statements also provide information about tables. See Section 15.7.7, "SHOW Statements".

The explain_format system variable has no effect on the output of EXPLAIN when used to obtain information about table columns.

\section*{Obtaining Execution Plan Information}

The EXPLAIN statement provides information about how MySQL executes statements:
- EXPLAIN works with SELECT, DELETE, INSERT, REPLACE, UPDATE, and TABLE statements.
- When EXPLAIN is used with an explainable statement, MySQL displays information from the optimizer about the statement execution plan. That is, MySQL explains how it would process the statement, including information about how tables are joined and in which order. For information about using EXPLAIN to obtain execution plan information, see Section 10.8.2, "EXPLAIN Output Format".
- When EXPLAIN is used with FOR CONNECTION connection_id rather than an explainable statement, it displays the execution plan for the statement executing in the named connection. See Section 10.8.4, "Obtaining Execution Plan Information for a Named Connection".
- For explainable statements, EXPLAIN produces additional execution plan information that can be displayed using SHOW WARNINGS. See Section 10.8.3, "Extended EXPLAIN Output Format".
- EXPLAIN is useful for examining queries involving partitioned tables. See Section 26.3.5, "Obtaining Information About Partitions".
- The FORMAT option can be used to select the output format. TRADITIONAL presents the output in tabular format. This is the default if no FORMAT option is present. JSON format displays the information in JSON format. TREE provides tree-like output with more precise descriptions of query handling than the TRADITIONAL format; it is the only format which shows hash join usage (see Section 10.2.1.4, "Hash Join Optimization") and is always used for EXPLAIN ANALYZE.

In MySQL 8.4, the default output format used by EXPLAIN (that is, when it has no FORMAT option) is determined by the value of the explain_format system variable. The precise effects of this variable are described later in this section.

MySQL 8.4 supports an additional INTO option with EXPLAIN FORMAT=JSON, which enables saving the JSON formatted output into a user variable, like this:
```
mysql> EXPLAIN FORMAT=JSON INTO @myselect
```

```
        -> SELECT name FROM a WHERE id = 2;
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @myselect\G
************************** 1. row *****************************************
@myex: {
    "query_block": {
        "select_id": 1,
        "cost_info": {
            "query_cost": "1.00"
        },
        "table": {
            "table_name": "a",
            "access_type": "const",
            "possible_keys": [
                "PRIMARY"
            ],
            "key": "PRIMARY",
            "used_key_parts": [
                "id"
            ],
            "key_length": "4",
            "ref": [
                "const"
            ],
            "rows_examined_per_scan": 1,
            "rows_produced_per_join": 1,
            "filtered": "100.00",
            "cost_info": {
                "read_cost": "0.00",
                "eval_cost": "0.10",
                "prefix_cost": "0.00",
                "data_read_per_join": "408"
            },
            "used_columns": [
                "id",
                "name"
            ]
        }
    }
}
1 row in set (0.00 sec)
```


This works with any explainable statement (SELECT, TABLE, INSERT, UPDATE, REPLACE, or DELETE). Examples using UPDATE and DELETE statements are shown here:
```
mysql> EXPLAIN FORMAT=JSON INTO @myupdate
        -> UPDATE a SET name2 = "garcia" WHERE id = 3;
Query OK, 0 rows affected (0.00 sec)
mysql> EXPLAIN FORMAT=JSON INTO @mydelete
        -> DELETE FROM a WHERE name1 LIKE '%e%';
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @myupdate, @mydelete\G
*************************** 1. row ****************************************
@myupdate: {
    "query_block": {
        "select_id": 1,
        "table": {
            "update": true,
            "table_name": "a",
            "access_type": "range",
            "possible_keys": [
                "PRIMARY"
            ],
            "key": "PRIMARY",
            "used_key_parts": [
                "id"
            ],
            "key_length": "4",
            "ref": [
```

```
                "const"
            ],
            "rows_examined_per_scan": 1,
            "filtered": "100.00",
            "attached_condition": "(ˋdbˋ.ˋaˋ.ˋidˋ = 3)"
        }
    }
}
@mydelete: {
    "query_block": {
        "select_id": 1,
        "table": {
            "delete": true,
            "table_name": "a",
            "access_type": "ALL",
            "rows_examined_per_scan": 2,
            "filtered": "100.00",
            "attached_condition": "(ˋdbˋ.ˋaˋ.ˋname1ˋ like '%e%')"
        }
    }
}
1 row in set (0.00 sec)
```


You can work with this value using MySQL JSON functions as you would with any other JSON value, as in these examples using JSON_EXTRACT ( ):
```
mysql> SELECT JSON_EXTRACT(@myselect, "$.query_block.table.key");
+------------------------------------------------------+
| JSON_EXTRACT(@myselect, "$.query_block.table.key") |
+-------------------------------------------------------
| "PRIMARY" |
+-------------------------------------------------------
1 row in set (0.01 sec)
mysql> SELECT JSON_EXTRACT(@myupdate, "$.query_block.table.access_type") AS U_acc,
    -> JSON_EXTRACT(@mydelete, "$.query_block.table.access_type") AS D_acc;
+---------+-------+
| U_acc | D_acc |
+---------+-------+
| "range" | "ALL" |
+---------+-------+
1 row in set (0.00 sec)
```


For complex statements, the JSON output can be quite large; in particular, it can be difficult when reading it to pair the closing bracket and opening brackets; to cause the JSON structure's key, if it has one, to be repeated near the closing bracket, set end_markers_in_json=ON. You should be aware that while this makes the output easier to read, it also renders the JSON invalid, causing JSON functions to raise an error.

See also Section 14.17, "JSON Functions".
Trying to use an INTO clause without explicitly including FORMAT=JSON causes EXPLAIN to be rejected with ER_EXPLAIN_INTO_IMPLICIT_FORMAT_NOT_SUPPORTED. This is true regardless of the current value of the explain_format system variable.

The INTO clause is not supported with FOR CONNECTION.
INTO is also not supported with EXPLAIN ANALYZE when explain_json_format_version=1.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2964.jpg?height=129&width=113&top_left_y=2389&top_left_x=331)

\section*{Important}

If, for any reason, the statement to be analyzed is rejected, the user variable is not updated.
- MySQL 8.4 supports a FOR SCHEMA clause, which causes EXPLAIN to behave as if the statement to be analyzed had been executed in the named database; FOR DATABASE is supported as a synonym. A simple example of use is shown here:
```
mysql> USE b;
Database changed
mysql> CREATE SCHEMA s1;
Query OK, 1 row affected (0.01 sec)
mysql> CREATE SCHEMA s2;
Query OK, 1 row affected (0.01 sec)
mysql> USE s1;
Database changed
mysql> CREATE TABLE t (c1 INT NOT NULL AUTO_INCREMENT PRIMARY KEY, c2 INT NOT NULL);
Query OK, 0 rows affected (0.04 sec)
mysql> USE s2;
Database changed
mysql> CREATE TABLE t (c1 INT NOT NULL AUTO_INCREMENT PRIMARY KEY, c2 INT NOT NULL, KEY i1 (c2));
Query OK, 0 rows affected (0.04 sec)
mysql> USE b;
Database changed
mysql> EXPLAIN FORMAT=TREE FOR SCHEMA s1 SELECT * FROM t WHERE c2 > 50\G
*************************** 1. row ***************************************
EXPLAIN: -> Filter: (t.c2 > 50) (cost=0.35 rows=1)
    -> Table scan on t (cost=0.35 rows=1)
1 row in set (0.00 sec)
mysql> EXPLAIN FORMAT=TREE FOR SCHEMA s2 SELECT * FROM t WHERE c2 > 50\G
************************** 1. row ******************************
EXPLAIN: -> Filter: (t.c2 > 50) (cost=0.35 rows=1)
    -> Covering index scan on t using i1 (cost=0.35 rows=1)
1 row in set (0.00 sec)
```


If the database does not exist, the statement is rejected with ER_BAD_DB_ERROR. If the user does not have the necessary privileges to run the statement, it is rejected with ER_DBACCESS_DENIED_ERROR.

FOR SCHEMA is not compatible with FOR CONNECTION.
EXPLAIN requires the same privileges required to execute the explained statement. Additionally, EXPLAIN also requires the SHOW VIEW privilege for any explained view. EXPLAIN . . . FOR CONNECTION also requires the PROCESS privilege if the specified connection belongs to a different user.

The explain_format system variable determines the format of the output from EXPLAIN when used to display a query execution plan. This variable can take any of the values used with the FORMAT option, with the addition of DEFAULT as a synonym for TRADITIONAL. The following example uses the country table from the world database which can be obtained from MySQL: Other Downloads:
```
mysql> USE world; # Make world the current database
Database changed
```


Checking the value of explain_format, we see that it has the default value, and that EXPLAIN (with no FORMAT option) therefore uses the traditional tabular output:
```
mysql> SELECT @@explain_format;
+-------------------+
| @@explain_format |
+-------------------+
| TRADITIONAL |
+-------------------+
1 row in set (0.00 sec)
```

```
mysql> EXPLAIN SELECT Name FROM country WHERE Code Like 'A%';
+----+--------------+---------+------------+-------+---------------+---------+---------+------+------+-----
| id | select_type | table | partitions | type | possible_keys | key | key_len | ref | rows | filt
+----+-------------+---------+------------+-------+---------------+---------+---------+------+------+-----
+----+--------------+----------+------------+-------+---------------+---------+---------+------+------+-----
1 row in set, 1 warning (0.00 sec)
```


If we set the value of explain_format to TREE, then rerun the same EXPLAIN statement, the output uses the tree-like format:
```
mysql> SET @@explain_format=TREE;
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @@explain_format;
+-------------------+
| @@explain_format |
+-------------------+
| TREE |
+-------------------+
1 row in set (0.00 sec)
mysql> EXPLAIN SELECT Name FROM country WHERE Code LIKE 'A%';
| EXPLAIN
+---------------------------------------------------------------
        -> Index range scan on country using PRIMARY over ('A' <= Code <= 'A????????') (cost=3.67 rows=17)
+--------------------------------------------------------------------------------
1 row in set, 1 warning (0.00 sec)
```


As stated previously, the FORMAT option overrides this setting. Executing the same EXPLAIN statement using FORMAT=JSON instead of FORMAT=TREE shows that this is the case:
```
mysql> EXPLAIN FORMAT=JSON SELECT Name FROM country WHERE Code LIKE 'A%';
+-------------------------------------------------------------------------------
    EXPLAIN
+---------------------------------------------------------------------------------
    {
    "query_block": {
        "select_id": 1,
        "cost_info": {
            "query_cost": "3.67"
        },
        "table": {
            "table_name": "country",
            "access_type": "range",
            "possible_keys": [
                "PRIMARY"
            ],
            "key": "PRIMARY",
            "used_key_parts": [
                "Code"
            ],
            "key_length": "12",
            "rows_examined_per_scan": 17,
            "rows_produced_per_join": 17,
            "filtered": "100.00",
            "cost_info": {
                "read_cost": "1.97",
                "eval_cost": "1.70",
                "prefix_cost": "3.67",
                "data_read_per_join": "16K"
            },
            "used_columns": [
                "Code",
                "Name"
            ],
            "attached_condition": "(ˋworldˋ.ˋcountryˋ.ˋCodeˋ like 'A%')"
        }
    }
}
```

```
1 row in set, 1 warning (0.00 sec)
```


To return the default output of EXPLAIN to the tabular format, set explain_format to TRADITIONAL. Alternatively, you can set it to DEFAULT, which has the same effect, as shown here:
```
mysql> SET @@explain_format=DEFAULT;
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @@explain_format;
+-------------------+
| @@explain_format |
+-------------------+
| TRADITIONAL |
+-------------------+
1 row in set (0.00 sec)
```


MySQL 8.4 supports two versions of the JSON output format. Version 1 is the linear format always used in MySQL 8.2 and earlier; this remains the default in MySQL 8.4, and is used in the examples already shown in this section. Version 2 of the JSON output format is based on access paths, and is intended to provide compatibility with future versions of the MySQL Optimizer. You can switch to the Version 2 format by setting the value of the explain_json_format_version server system variable to 2, as shown here for the same EXPLAIN statement used in the previous example:
```
mysql> SELECT @@explain_json_format_version;
+--------------------------------+
| @@explain_json_format_version |
+---------------------------------+
| 1 |
+--------------------------------+
1 row in set (0.00 sec)
mysql> SET @@explain_json_format_version = 2;
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @@explain_json_format_version;
+---------------------------------+
| @@explain_json_format_version |
+--------------------------------+
| 2 |
+---------------------------------+
1 row in set (0.00 sec)
mysql> EXPLAIN FORMAT=JSON SELECT Name FROM country WHERE Code LIKE 'A%';
+--------------------------------------------------------------------------------
| EXPLAIN |
+-------------------------------------------------------------------------------
| {
    "query": "/* select#1 */ select ˋworldˋ.ˋcountryˋ.ˋNameˋ AS ˋNameˋ from ˋworldˋ.ˋcountryˋ where (ˋwor
    "inputs": [
        {
            "ranges": [
                "('A' <= Code <= 'A????????')"
            ],
            "covering": false,
            "operation": "Index range scan on country using PRIMARY over ('A' <= Code < 'A????????')",
            "index_name": "PRIMARY",
            "table_name": "country",
            "access_type": "index",
            "estimated_rows": 17.0,
            "index_access_type": "index_range_scan",
            "estimated_total_cost": 3.668778400708174
        }
    ],
    "condition": "(country.ˋCodeˋ like 'A%')",
    "operation": "Filter: (country.ˋCodeˋ like 'A%')",
    "access_type": "filter",
    "estimated_rows": 17.0,
    "estimated_total_cost": 3.668778400708174
}
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-2968.jpg?height=47&width=1345&top_left_y=244&top_left_x=287&polygon=1326,0,1323,3,1234,3,1232,5,1230,5,1228,3,1218,3,1216,5,1209,5,1207,3,1205,3,1202,5,1170,5,1168,3,1164,3,1161,5,1154,5,1152,3,1145,3,1143,5,1134,5,1132,3,1127,3,1125,5,1118,5,1116,3,1109,3,1106,5,1097,5,1095,3,1090,3,1088,5,1077,5,1074,3,1072,5,1006,5,1004,3,999,3,997,5,990,5,988,3,979,3,976,5,974,5,972,3,958,3,956,5,953,3,942,3,940,5,905,5,903,7,901,7,899,5,889,5,887,7,860,7,857,5,823,5,821,3,816,3,814,5,805,5,803,3,798,3,796,5,787,5,784,3,780,3,778,5,768,5,766,3,762,3,759,5,752,5,750,3,743,3,741,5,732,5,730,3,725,3,723,5,716,5,714,3,704,3,702,5,698,5,695,3,686,3,684,5,679,5,677,3,670,3,668,5,659,5,656,3,652,3,650,5,640,5,638,3,634,3,631,5,583,5,581,3,579,5,551,5,549,3,542,3,540,5,526,5,524,7,513,7,510,5,508,5,506,7,497,7,494,5,487,5,485,7,481,7,478,5,469,5,467,7,462,7,460,5,449,5,446,7,444,7,442,5,430,5,428,7,426,7,423,5,414,5,412,7,407,7,405,5,396,5,394,7,389,7,387,5,378,5,375,7,369,7,366,5,364,5,362,7,316,7,314,5,305,5,302,7,298,7,296,5,286,5,284,7,280,7,277,5,268,5,266,7,261,7,259,5,250,5,248,7,243,7,241,5,234,5,232,7,222,7,220,5,213,5,211,7,206,7,204,5,193,5,190,7,188,7,186,5,179,5,177,7,170,7,168,5,158,5,156,7,152,7,149,5,142,5,140,7,120,7,117,10,115,10,110,14,108,12,106,12,99,19,97,19,94,21,92,21,88,26,83,26,81,23,76,28,76,30,74,32,69,32,67,35,63,30,58,35,47,35,44,32,42,32,40,35,24,35,21,37,15,37,10,42,8,39,5,42,3,42,1,44,1,46,44,46,47,44,49,44,51,46,58,46,60,44,69,44,72,46,76,46,79,44,99,44,101,42,117,42,122,37,124,39,149,39,152,42,154,42,156,39,174,39,177,37,184,37,186,39,197,39,200,37,202,37,204,39,209,39,211,37,222,37,225,39,229,39,232,37,238,37,241,39,277,39,280,42,282,42,284,39,332,39,334,42,337,42,339,39,350,39,353,42,355,39,357,39,359,37,364,37,366,39,375,39,378,37,385,37,387,39,394,39,396,37,403,37,405,39,458,39,460,42,465,42,467,39,478,39,481,42,483,42,485,39,497,39,499,42,501,42,503,39,515,39,517,42,519,42,522,39,531,39,533,42,538,42,540,39,551,39,554,42,556,42,558,39,567,39,570,42,574,42,576,39,588,39,590,42,592,42,595,39,604,39,606,42,611,42,613,39,620,39,622,42,629,42,631,39,643,39,645,42,647,39,661,39,663,42,666,42,668,39,675,39,677,42,686,42,688,39,691,39,693,42,704,42,707,39,711,39,714,42,720,42,723,39,734,39,736,42,739,42,741,39,743,39,746,37,748,37,750,39,759,39,762,37,766,37,768,39,771,39,773,42,775,39,778,39,780,37,784,37,787,39,796,39,798,37,803,37,805,39,814,39,816,37,823,37,825,39,830,39,832,37,841,37,844,39,851,39,853,37,857,37,860,39,862,39,864,42,867,42,869,39,880,39,883,42,885,39,887,39,889,37,899,37,901,39,903,39,905,37,917,37,919,39,921,39,924,37,931,37,933,39,935,39,937,42,940,39,944,39,947,37,949,39,953,39,956,42,958,42,960,39,972,39,974,42,976,42,979,39,990,39,992,42,995,42,997,39,1008,39,1011,42,1013,42,1015,39,1024,39,1027,42,1031,42,1033,39,1043,39,1045,42,1052,42,1054,39,1058,39,1061,42,1068,42,1070,39,1081,39,1084,42,1086,42,1088,39,1090,39,1093,37,1095,37,1097,39,1100,39,1102,42,1104,42,1106,39,1118,39,1120,42,1122,42,1125,39,1134,39,1136,42,1143,42,1145,39,1150,39,1152,42,1159,42,1161,39,1173,39,1175,42,1177,42,1180,39,1191,39,1193,42,1196,42,1198,39,1200,39,1202,37,1209,37,1212,39,1216,35,1218,35,1221,32,1228,32,1230,35,1237,35,1239,32,1241,32,1244,35,1253,35,1255,32,1271,32,1273,30,1282,30,1285,32,1287,32,1289,30,1294,30,1296,28,1298,30,1312,30,1314,28,1342,28,1344,26,1342,23,1342,3,1337,3,1335,0)

After using the Version 2 format, you can cause the JSON output from all subsequent EXPLAIN FORMAT=JSON statements to revert to the Version 1 format by setting explain_json_format_version back to 1 (the default).

The value of explain_json_format_version determines the version of the JSON output format employed by all EXPLAIN statements which use it, whether the JSON format is used because a given EXPLAIN statement includes an explicit FORMAT=JSON option, or because the JSON format is used automatically due to the explain_format system variable being set to JSON.

With the help of EXPLAIN, you can see where you should add indexes to tables so that the statement executes faster by using indexes to find rows. You can also use EXPLAIN to check whether the optimizer joins the tables in an optimal order. To give a hint to the optimizer to use a join order corresponding to the order in which the tables are named in a SELECT statement, begin the statement with SELECT STRAIGHT_JOIN rather than just SELECT. (See Section 15.2.13, "SELECT Statement".)

The optimizer trace may sometimes provide information complementary to that of EXPLAIN. However, the optimizer trace format and content are subject to change between versions. For details, see Section 10.15, "Tracing the Optimizer".

If you have a problem with indexes not being used when you believe that they should be, run ANALYZE TABLE to update table statistics, such as cardinality of keys, that can affect the choices the optimizer makes. See Section 15.7.3.1, "ANALYZE TABLE Statement".

\section*{Note}

MySQL Workbench has a Visual Explain capability that provides a visual representation of EXPLAIN output. See Tutorial: Using Explain to Improve Query Performance.

\section*{Obtaining Information with EXPLAIN ANALYZE}

EXPLAIN ANALYZE runs a statement and produces EXPLAIN output along with timing and additional, iterator-based, information about how the optimizer's expectations matched the actual execution. For each iterator, the following information is provided:
- Estimated execution cost
(Some iterators are not accounted for by the cost model, and so are not included in the estimate.)
- Estimated number of returned rows
- Time to return first row
- Time spent executing this iterator (including child iterators, but not parent iterators), in milliseconds. (When there are multiple loops, this figure shows the average time per loop.)
- Number of rows returned by the iterator
- Number of loops

The query execution information is displayed using the TREE output format, in which nodes represent iterators. EXPLAIN ANALYZE always uses the TREE output format. This can optionally be specified explicitly using FORMAT=TREE; formats other than TREE remain unsupported.

EXPLAIN ANALYZE can be used with SELECT statements, multi-table UPDATE and DELETE statements, and TABLE statements.

You can terminate this statement using KILL QUERY or CTRL-C.

EXPLAIN ANALYZE cannot be used with FOR CONNECTION.
Example output:
```
mysql> EXPLAIN ANALYZE SELECT * FROM t1 JOIN t2 ON (t1.c1 = t2.c2)\G
*************************** 1. row ***************************************
EXPLAIN: -> Inner hash join (t2.c2 = t1.c1) (cost=3.5 rows=5)
(actual time=0.121..0.131 rows=1 loops=1)
    -> Table scan on t2 (cost=0.07 rows=5)
(actual time=0.0126..0.0221 rows=5 loops=1)
    -> Hash
        -> Table scan on t1 (cost=0.75 rows=5)
(actual time=0.0372..0.0534 rows=5 loops=1)
mysql> EXPLAIN ANALYZE SELECT * FROM t3 WHERE i > 8\G
*************************** 1. row ***************************************
EXPLAIN: -> Filter: (t3.i > 8) (cost=0.75 rows=1.67)
(actual time=0.0168..0.0182 rows=1 loops=1)
    -> Table scan on t3 (cost=0.75 rows=5)
(actual time=0.015..0.0167 rows=5 loops=1)
mysql> EXPLAIN ANALYZE FORMAT=TREE SELECT * FROM t3 WHERE pk > 17\G
*************************** 1. row ******************************
EXPLAIN: -> Filter: (t3.pk > 17) (cost=0.91 rows=2)
(actual time=0.0334..0.042 rows=2 loops=1)
    -> Index range scan on t3 using PRIMARY over (17 < pk)
(cost=0.91 rows=2) (actual time=0.0306..0.0384 rows=2 loops=1)
```


The tables used in the example output were created by the statements shown here:
```
CREATE TABLE t1 (
    c1 INTEGER DEFAULT NULL,
    c2 INTEGER DEFAULT NULL
);
CREATE TABLE t2 (
    c1 INTEGER DEFAULT NULL,
    c2 INTEGER DEFAULT NULL
);
CREATE TABLE t3 (
    pk INTEGER NOT NULL PRIMARY KEY,
    i INTEGER DEFAULT NULL
);
```


Values shown for actual time in the output of this statement are expressed in milliseconds.
explain_format has the following effects on EXPLAIN ANALYZE:
- If the value of this variable is TRADITIONAL or TREE (or the synonym DEFAULT), EXPLAIN ANALYZE uses the TREE format. This ensures that this statement continues to use the TREE format by default, as it did prior to the introduction of explain_format.
- If the value of explain_format is JSON, EXPLAIN ANALYZE returns an error unless FORMAT=TREE is specified as part of the statement. This is due to the fact that EXPLAIN ANALYZE supports only the TREE output format.

We illustrate the behavior described in the second point here, re-using the last EXPLAIN ANALYZE statement from the previous example:
```
mysql> SET @@explain_format=JSON;
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT @@explain_format;
+-------------------+
| @@explain_format |
+-------------------+
| JSON |
+-------------------+
```

```
1 row in set (0.00 sec)
mysql> EXPLAIN ANALYZE SELECT * FROM t3 WHERE pk > 17\G
ERROR 1235 (42000): This version of MySQL doesn't yet support 'EXPLAIN ANALYZE with JSON format'
mysql> EXPLAIN ANALYZE FORMAT=TRADITIONAL SELECT * FROM t3 WHERE pk > 17\G
ERROR 1235 (42000): This version of MySQL doesn't yet support 'EXPLAIN ANALYZE with TRADITIONAL format'
mysql> EXPLAIN ANALYZE FORMAT=TREE SELECT * FROM t3 WHERE pk > 17\G
*************************** 1. row *****************************
EXPLAIN: -> Filter: (t3.pk > 17) (cost=1.26 rows=5)
(actual time=0.013..0.016 rows=5 loops=1)
    -> Index range scan on t3 using PRIMARY (cost=1.26 rows=5)
(actual time=0.012..0.014 rows=5 loops=1)
```


Using FORMAT=TRADITIONAL or FORMAT=JSON with EXPLAIN ANALYZE always raises an error, regardless of the value of explain_format.

In MySQL 8.4, numbers in the output of EXPLAIN ANALYZE and EXPLAIN FORMAT=TREE are formatted according to the following rules:
- Numbers in the range $0.001-999999.5$ are printed as decimal numbers.

Decimal numbers less than 1000 have three significant digits; the remainder have four, five, or six.
- Numbers outside the range 0.001-999999.5 are printed in engineering format. Examples of such values are $1.23 \mathrm{e}+9$ and 934e-6.
- No trailing zeros are printed. For example, we print 2.3 rather than 2.30 , and $1.2 \mathrm{e}+6$ rather than 1. $20 \mathrm{e}+6$.
- Numbers less than $1 \mathrm{e}-12$ are printed as 0 .

\subsection*{15.8.3 HELP Statement}

HELP 'search_string'
The HELP statement returns online information from the MySQL Reference Manual. Its proper operation requires that the help tables in the mysql database be initialized with help topic information (see Section 7.1.17, "Server-Side Help Support").

The HELP statement searches the help tables for the given search string and displays the result of the search. The search string is not case-sensitive.

The search string can contain the wildcard characters \% and _. These have the same meaning as for pattern-matching operations performed with the LIKE operator. For example, HELP 'rep\%' returns a list of topics that begin with rep.

The HELP statement does not require a terminator such as ; or \G.
The HELP statement understands several types of search strings:
- At the most general level, use contents to retrieve a list of the top-level help categories:
```
HELP 'contents'
```

- For a list of topics in a given help category, such as Data Types, use the category name:
```
HELP 'data types'
```

- For help on a specific help topic, such as the ASCII() function or the CREATE TABLE statement, use the associated keyword or keywords:
```
HELP 'ascii'
HELP 'create table'
```


In other words, the search string matches a category, many topics, or a single topic. The following descriptions indicate the forms that the result set can take.
- Empty result

No match could be found for the search string.
Example: HELP 'fake'
Yields:
```
Nothing found
Please try to run 'help contents' for a list of all accessible topics
```

- Result set containing a single row

This means that the search string yielded a hit for the help topic. The result includes the following items:
- name: The topic name.
- description: Descriptive help text for the topic.
- example: One or more usage examples. (May be empty.)

Example: HELP 'log'
Yields:
```
Name: 'LOG'
Description:
Syntax:
LOG(X), LOG(B,X)
If called with one parameter, this function returns the natural
logarithm of X. If X is less than or equal to 0.0E0, the function
returns NULL and a warning "Invalid argument for logarithm" is
reported. Returns NULL if X or B is NULL.
The inverse of this function (when called with a single argument) is
the EXP() function.
URL: https://dev.mysql.com/doc/refman/8.4/en/mathematical-functions.html
Examples:
mysql> SELECT LOG(2);
    -> 0.69314718055995
mysql> SELECT LOG(-2);
    -> NULL
```

- List of topics.

This means that the search string matched multiple help topics.
Example: HELP 'status'
Yields:
```
Many help items for your request exist.
To make a more specific request, please type 'help <item>',
where <item> is one of the following topics:
    FLUSH
    SHOW
    SHOW BINARY LOG STATUS
    SHOW ENGINE
    SHOW FUNCTION STATUS
    SHOW PROCEDURE STATUS
    SHOW REPLICA STATUS
```

```
SHOW STATUS
SHOW TABLE STATUS
```

- List of topics.

A list is also displayed if the search string matches a category.
Example: HELP 'functions'
Yields:
```
You asked for help about help category: "Functions"
For more information, type 'help <item>', where <item> is one of the following
categories:
    Aggregate Functions and Modifiers
    Bit Functions
    Cast Functions and Operators
    Comparison Operators 
    Date and Time Functions
    Encryption Functions
    Enterprise Encryption Functions
    Flow Control Functions
    GROUP BY Functions and Modifiers
    GTID
    Information Functions
    Internal Functions
    Locking Functions
    Logical Operators
    Miscellaneous Functions
    Numeric Functions
    Performance Schema Functions
    Spatial Functions
    String Functions
    Window Functions
    XML
```


\subsection*{15.8.4 USE Statement}

USE db_name
The USE statement tells MySQL to use the named database as the default (current) database for subsequent statements. This statement requires some privilege for the database or some object within it.

The named database remains the default until the end of the session or another USE statement is issued:
```
USE db1;
SELECT COUNT(*) FROM mytable; # selects from db1.mytable
USE db2;
SELECT COUNT(*) FROM mytable; # selects from db2.mytable
```


The database name must be specified on a single line. Newlines in database names are not supported.
Making a particular database the default by means of the USE statement does not preclude accessing tables in other databases. The following example accesses the author table from the db1 database and the editor table from the db2 database:
```
USE db1;
SELECT author_name,editor_name FROM author,db2.editor
    WHERE author.editor_id = db2.editor.editor_id;
```


