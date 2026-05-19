\section*{Chapter 30 MySQL sys Schema}

\section*{Table of Contents}
30.1 Prerequisites for Using the sys Schema ....................................................................... 4969
30.2 Using the sys Schema .............................................................................................. 4970
30.3 sys Schema Progress Reporting .................................................................................... 4971
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4999.jpg?height=45&width=1609&top_left_y=616&top_left_x=342)
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-4999.jpg?height=45&width=1522&top_left_y=657&top_left_x=429)
30.4.2 sys Schema Tables and Triggers ..................................................................... 4977
30.4.3 sys Schema Views ........................................................................................ 4979
30.4.4 sys Schema Stored Procedures ....................................................................... 5019
30.4.5 sys Schema Stored Functions ........................................................................... 5037

MySQL 8.4 includes the sys schema, a set of objects that helps DBAs and developers interpret data collected by the Performance Schema. sys schema objects can be used for typical tuning and diagnosis use cases. Objects in this schema include:
- Views that summarize Performance Schema data into more easily understandable form.
- Stored procedures that perform operations such as Performance Schema configuration and generating diagnostic reports.
- Stored functions that query Performance Schema configuration and provide formatting services.

For new installations, the sys schema is installed by default during data directory initialization if you use mysqld with the --initialize or --initialize-insecure option. If this is not desired, you can drop the sys schema manually after initialization if it is unneeded.

The MySQL upgrade procedure produces an error if a sys schema exists but has no version view, on the assumption that absence of this view indicates a user-created sys schema. To upgrade in this case, remove or rename the existing sys schema first.
sys schema objects have a DEFINER of 'mysql.sys '@'localhost'. Use of the dedicated mysql. sys account avoids problems that occur if a DBA renames or removes the root account.

\subsection*{30.1 Prerequisites for Using the sys Schema}

Before using the sys schema, the prerequisites described in this section must be satisfied.
Because the sys schema provides an alternative means of accessing the Performance Schema, the Performance Schema must be enabled for the sys schema to work. See Section 29.3, "Performance Schema Startup Configuration".

For full access to the sys schema, a user must have these privileges:
- SELECT on all sys tables and views
- EXECUTE on all sys stored procedures and functions
- INSERT and UPDATE for the sys_config table, if changes are to be made to it
- Additional privileges for certain sys schema stored procedures and functions, as noted in their descriptions (for example, the ps_setup_save( ) procedure)

It is also necessary to have privileges for the objects underlying the sys schema objects:
- SELECT on any Performance Schema tables accessed by sys schema objects, and UPDATE for any tables to be updated using sys schema objects
- PROCESS for the INFORMATION_SCHEMA INNODB_BUFFER_PAGE table

Certain Performance Schema instruments and consumers must be enabled and (for instruments) timed to take full advantage of sys schema capabilities:
- All wait instruments
- All stage instruments
- All statement instruments
- xxx_current and xxx_history_long consumers for all events

You can use the sys schema itself to enable all of the additional instruments and consumers:
```
CALL sys.ps_setup_enable_instrument('wait');
CALL sys.ps_setup_enable_instrument('stage');
CALL sys.ps_setup_enable_instrument('statement');
CALL sys.ps_setup_enable_consumer('current');
CALL sys.ps_setup_enable_consumer('history_long');
```


\section*{Note}

For many uses of the sys schema, the default Performance Schema is sufficient for data collection. Enabling all the instruments and consumers just mentioned has a performance impact, so it is preferable to enable only the additional configuration you need. Also, remember that if you enable additional configuration, you can easily restore the default configuration like this:

CALL sys.ps_setup_reset_to_default(TRUE);

\subsection*{30.2 Using the sys Schema}

You can make the sys schema the default schema so that references to its objects need not be qualified with the schema name:
```
mysql> USE sys;
Database changed
mysql> SELECT * FROM version;
+--------------+---------------+
| sys_version | mysql_version |
+--------------+---------------+
| 2.1.1 | 8.4.0-tr |
+--------------+---------------+
```

(The version view shows the sys schema and MySQL server versions.)
To access sys schema objects while a different schema is the default (or simply to be explicit), qualify object references with the schema name:
```
mysql> SELECT * FROM sys.version;
+--------------+---------------+
| sys_version | mysql_version |
+--------------+---------------+
| 2.1.1 | 8.4.0-tr |
+--------------+---------------+
```


The sys schema contains many views that summarize Performance Schema tables in various ways. Most of these views come in pairs, such that one member of the pair has the same name as the other member, plus a $\times \$$ prefix. For example, the host_summary_by_file_io view summarizes file I/ O grouped by host and displays latencies converted from picoseconds to more readable values (with units);
```
mysql> SELECT * FROM sys.host_summary_by_file_io;
+-------------+-------+------------+
| host | ios | io_latency |
+-------------+-------+------------+
| localhost | 67570 | 5.38 s |
| background | 3468 | 4.18 s |
```

