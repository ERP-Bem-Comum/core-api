\section*{Note \\ If installed, the audit_log plugin involves some minimal overhead even when disabled. To avoid this overhead, do not install MySQL Enterprise Audit unless you plan to use it.}

To be usable by the server, the plugin library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup.

To install MySQL Enterprise Audit, look in the share directory of your MySQL installation and choose the script that is appropriate for your platform. The available scripts differ in the file name used to refer to the script:
- audit_log_filter_win_install.sql
- audit_log_filter_linux_install.sql

Run the script as follows. The example here uses the Linux installation script and the default mysql system database. Make the appropriate substitution for your system.
```
$> mysql -u root -p -D mysql < audit_log_filter_linux_install.sql
Enter password: (enter root password here)
```


It is possible to specify a custom database for storing JSON filter tables when you run the installation script. Create the database first; its name should not exceed 64 characters. For example:
```
mysql> CREATE DATABASE IF NOT EXISTS database-name;
```


Next, run the script using the alternative database name.
```
$> mysql -u root -p -D database-name < audit_log_filter_linux_install.sql
Enter password: (enter root password here)
```


\section*{Note}

Some MySQL versions have introduced changes to the structure of the MySQL Enterprise Audit tables. To ensure that your tables are up to date for upgrades from earlier versions of MySQL, perform the MySQL upgrade procedure, making sure to use the option that forces an update (see Chapter 3, Upgrading MySQL). If you prefer to run the update statements only for the MySQL Enterprise Audit tables, see the following discussion.

For new MySQL installations, the USER and HOST columns in the audit_log_user table used by MySQL Enterprise Audit have definitions that better correspond to the definitions of the User and Host columns in the mysql. user system table. For upgrades to an installation for which MySQL Enterprise Audit is already installed, it is recommended that you alter the table definitions as follows:
```
ALTER TABLE mysql.audit_log_user
    DROP FOREIGN KEY audit_log_user_ibfk_1;
ALTER TABLE mysql.audit_log_filter
    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci;
ALTER TABLE mysql.audit_log_user
    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci;
ALTER TABLE mysql.audit_log_user
    MODIFY COLUMN USER VARCHAR(32);
ALTER TABLE mysql.audit_log_user
    ADD FOREIGN KEY (FILTERNAME) REFERENCES mysql.audit_log_filter(NAME);
```


\section*{Note}

To use MySQL Enterprise Audit in the context of source/replica replication, Group Replication, or InnoDB Cluster, you must prepare the replica nodes prior to running the installation script on the source node. This is necessary because the INSTALL PLUGIN statement in the script is not replicated.
1. On each replica node, extract the INSTALL PLUGIN statement from the installation script and execute it manually.
2. On the source node, run the installation script as described previously.

To verify plugin installation, examine the Information Schema PLUGINS table or use the SHOW PLUGINS statement (see Section 7.6.2, "Obtaining Server Plugin Information"). For example:
```
mysql> SELECT PLUGIN_NAME, PLUGIN_STATUS
    FROM INFORMATION_SCHEMA.PLUGINS
    WHERE PLUGIN_NAME LIKE 'audit%';
+--------------+----------------+
| PLUGIN_NAME | PLUGIN_STATUS |
+--------------+---------------+
```

```
| audit_log | ACTIVE |
+--------------+----------------+
```


If the plugin fails to initialize, check the server error log for diagnostic messages.
After MySQL Enterprise Audit is installed, you can use the --audit-log option for subsequent server startups to control audit_log plugin activation. For example, to prevent the plugin from being removed at runtime, use this option:
```
[mysqld]
audit-log=FORCE_PLUS_PERMANENT
```


If it is desired to prevent the server from running without the audit plugin, use --audit-log with a value of FORCE or FORCE_PLUS_PERMANENT to force server startup to fail if the plugin does not initialize successfully.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1467.jpg?height=99&width=109&top_left_y=900&top_left_x=360)

\section*{Important}

By default, rule-based audit log filtering logs no auditable events for any users. This differs from legacy audit log behavior, which logs all auditable events for all users (see Section 8.4.5.10, "Legacy Mode Audit Log Filtering"). Should you wish to produce log-everything behavior with rule-based filtering, create a simple filter to enable logging and assign it to the default account:
```
SELECT audit_log_filter_set_filter('log_all', '{ "filter": { "log": true } }');
SELECT audit_log_filter_set_user('%', 'log_all');
```


The filter assigned to \% is used for connections from any account that has no explicitly assigned filter (which initially is true for all accounts).

When installed as just described, MySQL Enterprise Audit remains installed until uninstalled. To remove it, run the uninstall script located in the share directory of your MySQL installation. The example here specifies the default system database, mysql. Make the appropriate substitution for your system.
```
$> mysql -u root -p -D mysql < audit_log_filter_uninstall.sql
Enter password: (enter root password here)
```


\subsection*{8.4.5.3 MySQL Enterprise Audit Security Considerations}

By default, contents of audit log files produced by the audit log plugin are not encrypted and may contain sensitive information, such as the text of SQL statements. For security reasons, audit log files should be written to a directory accessible only to the MySQL server and to users with a legitimate reason to view the log. The default file name is audit. log in the data directory. This can be changed by setting the audit_log_file system variable at server startup. Other audit log files may exist due to log rotation.

For additional security, enable audit log file encryption. See Encrypting Audit Log Files.

\subsection*{8.4.5.4 Audit Log File Formats}

The MySQL server calls the audit log plugin to write an audit record to its log file whenever an auditable event occurs. Typically the first audit record written after plugin startup contains the server description and startup options. Elements following that one represent events such as client connect and disconnect events, executed SQL statements, and so forth. Only top-level statements are logged, not statements within stored programs such as triggers or stored procedures. Contents of files referenced by statements such as LOAD DATA are not logged.

To select the log format that the audit log plugin uses to write its log file, set the audit_log_format system variable at server startup. These formats are available:
- New-style XML format (audit_log_format=NEW): An XML format that has better compatibility with Oracle Audit Vault than old-style XML format. MySQL 8.4 uses new-style XML format by default.
- Old-style XML format (audit_log_format=OLD): The original audit log format used by default in older MySQL series.
- JSON format (audit_log_format=JSON): Writes the audit log as a JSON array. Only this format supports the optional query time and size statistics.

By default, audit log file contents are written in new-style XML format, without compression or encryption.

If you change audit_log_format, it is recommended that you also change audit_log_file. For example, if you set audit_log_format to JSON, set audit_log_file to audit.json. Otherwise, newer log files will have a different format than older files, but they will all have the same base name with nothing to indicate when the format changed.
- New-Style XML Audit Log File Format
- Old-Style XML Audit Log File Format
- JSON Audit Log File Format

\section*{New-Style XML Audit Log File Format}

Here is a sample log file in new-style XML format (audit_log_format=NEW), reformatted slightly for readability:
```
<?xml version="1.0" encoding="utf-8"?>
<AUDIT>
    <AUDIT_RECORD>
    <TIMESTAMP>2019-10-03T14:06:33 UTC</TIMESTAMP>
    <RECORD_ID>1_2019-10-03T14:06:33</RECORD_ID>
    <NAME>Audit</NAME>
    <SERVER_ID>1</SERVER_ID>
    <VERSION>1</VERSION>
    <STARTUP_OPTIONS>/usr/local/mysql/bin/mysqld
        --socket=/usr/local/mysql/mysql.sock
        --port=3306</STARTUP_OPTIONS>
    <OS_VERSION>i686-Linux</OS_VERSION>
    <MYSQL_VERSION>5.7.21-log</MYSQL_VERSION>
</AUDIT_RECORD>
<AUDIT_RECORD>
    <TIMESTAMP>2019-10-03T14:09:38 UTC</TIMESTAMP>
    <RECORD_ID>2_2019-10-03T14:06:33</RECORD_ID>
    <NAME>Connect</NAME>
    <CONNECTION_ID>5</CONNECTION_ID>
    <STATUS>0</STATUS>
    <STATUS_CODE>0</STATUS_CODE>
    <USER>root</USER>
    <OS_LOGIN/>
    <HOST>localhost</HOST>
    <IP>127.0.0.1</IP>
    <COMMAND_CLASS>connect</COMMAND_CLASS>
    <CONNECTION_TYPE>SSL/TLS</CONNECTION_TYPE>
    <CONNECTION_ATTRIBUTES>
        <ATTRIBUTE>
        <NAME>_pid</NAME>
        <VALUE>42794</VALUE>
        </ATTRIBUTE>
        ...
        <ATTRIBUTE>
            <NAME>program_name</NAME>
            <VALUE>mysqladmin</VALUE>
        </ATTRIBUTE>
    </CONNECTION_ATTRIBUTES>
    <PRIV_USER>root</PRIV_USER>
    <PROXY_USER/>
```

```
    <DB>test</DB>
    </AUDIT_RECORD>
...
    <AUDIT_RECORD>
        <TIMESTAMP>2019-10-03T14:09:38 UTC</TIMESTAMP>
        <RECORD_ID>6_2019-10-03T14:06:33</RECORD_ID>
        <NAME>Query</NAME>
        <CONNECTION_ID>5</CONNECTION_ID>
        <STATUS>0</STATUS>
        <STATUS_CODE>0</STATUS_CODE>
        <USER>root[root] @ localhost [127.0.0.1]</USER>
        <OS_LOGIN/>
        <HOST>localhost</HOST>
        <IP>127.0.0.1</IP>
        <COMMAND_CLASS>drop_table</COMMAND_CLASS>
        <SQLTEXT>DROP TABLE IF EXISTS t</SQLTEXT>
    </AUDIT_RECORD>
...
    <AUDIT_RECORD>
        <TIMESTAMP>2019-10-03T14:09:39 UTC</TIMESTAMP>
        <RECORD_ID>8_2019-10-03T14:06:33</RECORD_ID>
        <NAME>Quit</NAME>
        <CONNECTION_ID>5</CONNECTION_ID>
        <STATUS>0</STATUS>
        <STATUS_CODE>0</STATUS_CODE>
        <USER>root</USER>
        <OS_LOGIN/>
        <HOST>localhost</HOST>
        <IP>127.0.0.1</IP>
        <COMMAND_CLASS>connect</COMMAND_CLASS>
        <CONNECTION_TYPE>SSL/TLS</CONNECTION_TYPE>
    </AUDIT_RECORD>
...
    <AUDIT_RECORD>
        <TIMESTAMP>2019-10-03T14:09:43 UTC</TIMESTAMP>
        <RECORD_ID>11_2019-10-03T14:06:33</RECORD_ID>
        <NAME>Quit</NAME>
        <CONNECTION_ID>6</CONNECTION_ID>
        <STATUS>0</STATUS>
        <STATUS_CODE>0</STATUS_CODE>
        <USER>root</USER>
        <OS_LOGIN/>
        <HOST>localhost</HOST>
        <IP>127.0.0.1</IP>
        <COMMAND_CLASS>connect</COMMAND_CLASS>
        <CONNECTION_TYPE>SSL/TLS</CONNECTION_TYPE>
    </AUDIT_RECORD>
    <AUDIT_RECORD>
        <TIMESTAMP>2019-10-03T14:09:45 UTC</TIMESTAMP>
        <RECORD_ID>12_2019-10-03T14:06:33</RECORD_ID>
        <NAME>NoAudit</NAME>
        <SERVER_ID>1</SERVER_ID>
    </AUDIT_RECORD>
</AUDIT>
```


The audit log file is written as XML, using UTF-8 (up to 4 bytes per character). The root element is <AUDIT>. The root element contains <AUDIT_RECORD> elements, each of which provides information about an audited event. When the audit log plugin begins writing a new log file, it writes the XML declaration and opening <AUDIT> root element tag. When the plugin closes a log file, it writes the closing </AUDIT> root element tag. The closing tag is not present while the file is open.

Elements within <AUDIT_RECORD> elements have these characteristics:
- Some elements appear in every <AUDIT_RECORD> element. Others are optional and may appear depending on the audit record type.
- Order of elements within an <AUDIT_RECORD> element is not guaranteed.
- Element values are not fixed length. Long values may be truncated as indicated in the element descriptions given later.
- The <, >, ", and \& characters are encoded as \&lt;, \&gt;, \&quot; , and \&amp; , respectively. NUL bytes $(\mathrm{U}+00)$ are encoded as the ? character.
- Characters not valid as XML characters are encoded using numeric character references. Valid XML characters are:
```
#x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]
```


The following elements are mandatory in every <AUDIT_RECORD> element:
- <NAME>

A string representing the type of instruction that generated the audit event, such as a command that the server received from a client.

Example:
```
<NAME>Query</NAME>
```


Some common <NAME> values:
```
Audit When auditing starts, which may be server startup time
Connect When a client connects, also known as logging in
Query An SQL statement (executed directly)
Prepare Preparation of an SQL statement; usually followed by Execute
Execute Execution of an SQL statement; usually follows Prepare
Shutdown Server shutdown
Quit When a client disconnects
NoAudit Auditing has been turned off
```


The possible values are Audit, Binlog Dump, Change user, Close stmt, Connect Out, Connect, Create DB, Daemon, Debug, Delayed insert, Drop DB, Execute, Fetch, Field List, Init DB, Kill, Long Data, NoAudit, Ping, Prepare, Processlist, Query, Quit, Refresh, Register Slave, Reset stmt, Set option, Shutdown, Sleep, Statistics, Table Dump, TableDelete, TableInsert, TableRead, TableUpdate, Time.

Many of these values correspond to the COM_xxx command values listed in the my_command.h header file. For example, Create DB and Change user correspond to COM_CREATE_DB and COM_CHANGE_USER, respectively.

Events having <NAME> values of Table $X X X$ accompany Query events. For example, the following statement generates one Query event, two TableRead events, and a TableInsert events:
```
INSERT INTO t3 SELECT t1.* FROM t1 JOIN t2;
```


Each TableXXX event contains <TABLE> and <DB> elements to identify the table to which the event refers and the database that contains the table.
- <RECORD_ID>

A unique identifier for the audit record. The value is composed from a sequence number and timestamp, in the format SEQ_TIMESTAMP. When the audit log plugin opens the audit log file, it initializes the sequence number to the size of the audit log file, then increments the sequence by 1 for each record logged. The timestamp is a UTC value in $Y Y Y Y-M M-D D T h h: m m: s s$ format indicating the date and time when the audit log plugin opened the file.

Example:
```
<RECORD_ID>12_2019-10-03T14:06:33</RECORD_ID>
```

- <TIMESTAMP>

A string representing a UTC value in $Y Y Y Y-M M-D D T h h$ : $m m$ : ss UTC format indicating the date and time when the audit event was generated. For example, the event corresponding to execution of an SQL statement received from a client has a <TIMESTAMP> value occurring after the statement finishes, not when it was received.

Example:
<TIMESTAMP>2019-10-03T14:09:45 UTC</TIMESTAMP>
The following elements are optional in <AUDIT_RECORD> elements. Many of them occur only with specific <NAME> element values.
- <COMMAND_CLASS>

A string that indicates the type of action performed.
Example:
<COMMAND_CLASS>drop_table</COMMAND_CLASS>
The values correspond to the statement/sql/ $x x x$ command counters. For example, $x x x$ is drop_table and select for DROP TABLE and SELECT statements, respectively. The following statement displays the possible names:
```
SELECT REPLACE(EVENT_NAME, 'statement/sql/', '') AS name
FROM performance_schema.events_statements_summary_global_by_event_name
WHERE EVENT_NAME LIKE 'statement/sql/%'
ORDER BY name;
```

- <CONNECTION_ATTRIBUTES>

Events with a <COMMAND_CLASS> value of connect may include a <CONNECTION_ATTRIBUTES> element to display the connection attributes passed by the client at connect time. (For information about these attributes, which are also exposed in Performance Schema tables, see Section 29.12.9, "Performance Schema Connection Attribute Tables".)

The <CONNECTION_ATTRIBUTES> element contains one <ATTRIBUTE> element per attribute, each of which contains <NAME> and <VALUE> elements to indicate the attribute name and value, respectively.

Example:
```
<CONNECTION_ATTRIBUTES>
    <ATTRIBUTE>
        <NAME>_pid</NAME>
        <VALUE>42794</VALUE>
    </ATTRIBUTE>
    <ATTRIBUTE>
        <NAME>_os</NAME>
        <VALUE>macos0.14</VALUE>
    </ATTRIBUTE>
    <ATTRIBUTE>
        <NAME>_platform</NAME>
        <VALUE>x86_64</VALUE>
    </ATTRIBUTE>
    <ATTRIBUTE>
        <NAME>_client_version</NAME>
        <VALUE>8.4.0</VALUE>
    </ATTRIBUTE>
    <ATTRIBUTE>
        <NAME>_client_name</NAME>
        <VALUE>libmysql</VALUE>
    </ATTRIBUTE>
    <ATTRIBUTE>
        <NAME>program_name</NAME>
```

```
    <VALUE>mysqladmin</VALUE>
</ATTRIBUTE>
</CONNECTION_ATTRIBUTES>
```


If no connection attributes are present in the event, none are logged and no <CONNECTION_ATTRIBUTES> element appears. This can occur if the connection attempt is unsuccessful, the client passes no attributes, or the connection occurs internally such as during server startup or when initiated by a plugin.
- <CONNECTION_ID>

An unsigned integer representing the client connection identifier. This is the same as the value returned by the CONNECTION_ID( ) function within the session.

Example:
```
<CONNECTION_ID>127</CONNECTION_ID>
```

- <CONNECTION_TYPE>

The security state of the connection to the server. Permitted values are TCP/IP (TCP/IP connection established without encryption), SSL/TLS (TCP/IP connection established with encryption), Socket (Unix socket file connection), Named Pipe (Windows named pipe connection), and Shared Memory (Windows shared memory connection).

\section*{Example:}
```
<CONNECTION_TYPE>SSL/TLS</CONNECTION_TYPE>
```

- <DB>

A string representing a database name.
Example:
```
<DB>test</DB>
```


For connect events, this element indicates the default database; the element is empty if there is no default database. For table-access events, the element indicates the database to which the accessed table belongs.
- <HOST>

A string representing the client host name.
Example:
```
<HOST>localhost</HOST>
```

- <IP>

A string representing the client IP address.
Example:
```
<IP>127.0.0.1</IP>
```

- <MYSQL_VERSION>

A string representing the MySQL server version. This is the same as the value of the VERSION ( ) function or version system variable.

\section*{Example:}
```
<MYSQL_VERSION>5.7.21-log</MYSQL_VERSION>
```

- <OS_LOGIN>

A string representing the external user name used during the authentication process, as set by the plugin used to authenticate the client. With native (built-in) MySQL authentication, or if the plugin does not set the value, this element is empty. The value is the same as that of the external_user system variable (see Section 8.2.19, "Proxy Users").

Example:
```
<OS_LOGIN>jeffrey</OS_LOGIN>
```

- <OS_VERSION>

A string representing the operating system on which the server was built or is running.
Example:
```
<OS_VERSION>x86_64-Linux</OS_VERSION>
```

- <PRIV_USER>

A string representing the user that the server authenticated the client as. This is the user name that the server uses for privilege checking, and may differ from the <USER> value.

Example:
```
<PRIV_USER>jeffrey</PRIV_USER>
```

- <PROXY_USER>

A string representing the proxy user (see Section 8.2.19, "Proxy Users"). The value is empty if user proxying is not in effect.

Example:
<PROXY_USER>developer</PROXY_USER>
- <SERVER_ID>

An unsigned integer representing the server ID. This is the same as the value of the server_id system variable.

Example:
<SERVER_ID>1</SERVER_ID>
- <SQLTEXT>

A string representing the text of an SQL statement. The value can be empty. Long values may be truncated. The string, like the audit log file itself, is written using UTF-8 (up to 4 bytes per character), so the value may be the result of conversion. For example, the original statement might have been received from the client as an SJIS string.

Example:
<SQLTEXT>DELETE FROM t1</SQLTEXT>
- <STARTUP_OPTIONS>

A string representing the options that were given on the command line or in option files when the MySQL server was started. The first option is the path to the server executable.

Example:
<STARTUP_OPTIONS>/usr/local/mysql/bin/mysqld
```
--port=3306 --log_output=FILE</STARTUP_OPTIONS>
```

- <STATUS>

An unsigned integer representing the command status: 0 for success, nonzero if an error occurred. This is the same as the value of the mysql_errno ( ) C API function. See the description for <STATUS_CODE> for information about how it differs from <STATUS>.

The audit log does not contain the SQLSTATE value or error message. To see the associations between error codes, SQLSTATE values, and messages, see Server Error Message Reference.

Warnings are not logged.
Example:
```
<STATUS>1051</STATUS>
```

- <STATUS_CODE>

An unsigned integer representing the command status: 0 for success, 1 if an error occurred.
The STATUS_CODE value differs from the STATUS value: STATUS_CODE is 0 for success and 1 for error, which is compatible with the EZ_collector consumer for Audit Vault. STATUS is the value of the mysql_errno ( ) C API function. This is 0 for success and nonzero for error, and thus is not necessarily 1 for error.

Example:
<STATUS_CODE>0</STATUS_CODE>
- <TABLE>

A string representing a table name.
Example:
<TABLE>t3</TABLE>
- <USER>

A string representing the user name sent by the client. This may differ from the <PRIV_USER> value.
Example:
```
<USER>root[root] @ localhost [127.0.0.1]</USER>
```

- <VERSION>

An unsigned integer representing the version of the audit log file format.
Example:
```
<VERSION>1</VERSION>
```


\section*{Old-Style XML Audit Log File Format}

Here is a sample log file in old-style XML format (audit_log_format=OLD), reformatted slightly for readability:
```
<?xml version="1.0" encoding="utf-8"?>
<AUDIT>
    <AUDIT_RECORD
        TIMESTAMP="2019-10-03T14:25:00 UTC"
        RECORD_ID="1_2019-10-03T14:25:00"
        NAME="Audit"
        SERVER_ID="1"
```

```
        VERSION="1"
        STARTUP_OPTIONS="--port=3306"
        OS_VERSION="i686-Linux"
        MYSQL_VERSION="5.7.21-log"/>
    <AUDIT_RECORD
        TIMESTAMP="2019-10-03T14:25:24 UTC"
        RECORD_ID="2_2019-10-03T14:25:00"
        NAME="Connect"
        CONNECTION_ID="4"
        STATUS="0"
        STATUS_CODE="0"
        USER="root"
        OS_LOGIN=""
        HOST="localhost"
        IP="127.0.0.1"
        COMMAND_CLASS="connect"
        CONNECTION_TYPE="SSL/TLS"
        PRIV_USER="root"
        PROXY_USER=""
        DB="test"/>
...
    <AUDIT_RECORD
        TIMESTAMP="2019-10-03T14:25:24 UTC"
        RECORD_ID="6_2019-10-03T14:25:00"
        NAME="Query"
        CONNECTION_ID="4"
        STATUS="0"
        STATUS_CODE="0"
        USER="root[root] @ localhost [127.0.0.1]"
        OS_LOGIN=""
        HOST="localhost"
        IP="127.0.0.1"
        COMMAND_CLASS="drop_table"
        SQLTEXT="DROP TABLE IF EXISTS t"/>
...
    <AUDIT_RECORD
        TIMESTAMP="2019-10-03T14:25:24 UTC"
        RECORD_ID="8_2019-10-03T14:25:00"
        NAME="Quit"
        CONNECTION_ID="4"
        STATUS="0"
        STATUS_CODE="0"
        USER="root"
        OS_LOGIN=""
        HOST="localhost"
        IP="127.0.0.1"
        COMMAND_CLASS="connect"
        CONNECTION_TYPE="SSL/TLS"/>
    <AUDIT_RECORD
        TIMESTAMP="2019-10-03T14:25:32 UTC"
        RECORD_ID="12_2019-10-03T14:25:00"
        NAME="NoAudit"
        SERVER_ID="1"/>
</AUDIT>
```


The audit log file is written as XML, using UTF-8 (up to 4 bytes per character). The root element is <AUDIT>. The root element contains <AUDIT_RECORD> elements, each of which provides information about an audited event. When the audit log plugin begins writing a new log file, it writes the XML declaration and opening <AUDIT> root element tag. When the plugin closes a log file, it writes the closing </AUDIT> root element tag. The closing tag is not present while the file is open.

Attributes of <AUDIT_RECORD> elements have these characteristics:
- Some attributes appear in every <AUDIT_RECORD> element. Others are optional and may appear depending on the audit record type.
- Order of attributes within an <AUDIT_RECORD> element is not guaranteed.
- Attribute values are not fixed length. Long values may be truncated as indicated in the attribute descriptions given later.
- The <, >, ", and \& characters are encoded as \&lt;, \&gt;, \&quot; , and \&amp; , respectively. NUL bytes $(\mathrm{U}+00)$ are encoded as the ? character.
- Characters not valid as XML characters are encoded using numeric character references. Valid XML characters are:
```
#x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]
```


The following attributes are mandatory in every <AUDIT_RECORD> element:
- NAME

A string representing the type of instruction that generated the audit event, such as a command that the server received from a client.

Example: NAME="Query"
Some common NAME values:
```
Audit When auditing starts, which may be server startup time
Connect When a client connects, also known as logging in
Query An SQL statement (executed directly)
Prepare Preparation of an SQL statement; usually followed by Execute
Execute Execution of an SQL statement; usually follows Prepare
Shutdown Server shutdown
Quit When a client disconnects
NoAudit Auditing has been turned off
```


The possible values are Audit, Binlog Dump, Change user, Close stmt, Connect Out, Connect, Create DB, Daemon, Debug, Delayed insert, Drop DB, Execute, Fetch, Field List, Init DB, Kill, Long Data, NoAudit, Ping, Prepare, Processlist, Query, Quit, Refresh, Register Slave, Reset stmt, Set option, Shutdown, Sleep, Statistics, Table Dump, TableDelete, TableInsert, TableRead, TableUpdate, Time.

Many of these values correspond to the COM_xxx command values listed in the my_command.h header file. For example, "Create DB" and "Change user" correspond to COM_CREATE_DB and COM_CHANGE_USER, respectively.

Events having NAME values of Table $X X X$ accompany Query events. For example, the following statement generates one Query event, two TableRead events, and a TableInsert events:

INSERT INTO t3 SELECT t1.* FROM t1 JOIN t2;
Each Table $X X X$ event has TABLE and DB attributes to identify the table to which the event refers and the database that contains the table.

Connect events for old-style XML audit log format do not include connection attributes.
- RECORD_ID

A unique identifier for the audit record. The value is composed from a sequence number and timestamp, in the format SEQ_TIMESTAMP. When the audit log plugin opens the audit log file, it initializes the sequence number to the size of the audit log file, then increments the sequence by 1 for each record logged. The timestamp is a UTC value in $Y Y Y Y-M M-D D T h h$ : mm: s format indicating the date and time when the audit log plugin opened the file.

Example: RECORD_ID="12_2019-10-03T14:25:00"
- TIMESTAMP

A string representing a UTC value in $Y Y Y Y-M M-D D T h h$ : $m m$ : ss UTC format indicating the date and time when the audit event was generated. For example, the event corresponding to execution of an SQL statement received from a client has a TIMESTAMP value occurring after the statement finishes, not when it was received.

Example: TIMESTAMP="2019-10-03T14:25:32 UTC"
The following attributes are optional in <AUDIT_RECORD> elements. Many of them occur only for elements with specific values of the NAME attribute.
- COMMAND_CLASS

A string that indicates the type of action performed.
Example: COMMAND_CLASS="drop_table"
The values correspond to the statement/sql/ $x x x$ command counters. For example, $x x x$ is drop_table and select for DROP TABLE and SELECT statements, respectively. The following statement displays the possible names:
```
SELECT REPLACE(EVENT_NAME, 'statement/sql/', '') AS name
FROM performance_schema.events_statements_summary_global_by_event_name
WHERE EVENT_NAME LIKE 'statement/sql/%'
ORDER BY name;
```

- CONNECTION_ID

An unsigned integer representing the client connection identifier. This is the same as the value returned by the CONNECTION_ID( ) function within the session.

Example: CONNECTION_ID="127"
- CONNECTION_TYPE

The security state of the connection to the server. Permitted values are TCP/IP (TCP/IP connection established without encryption), SSL/TLS (TCP/IP connection established with encryption), Socket (Unix socket file connection), Named Pipe (Windows named pipe connection), and Shared Memory (Windows shared memory connection).

Example: CONNECTION_TYPE="SSL/TLS"
- DB

A string representing a database name.
Example: DB="test"
For connect events, this attribute indicates the default database; the attribute is empty if there is no default database. For table-access events, the attribute indicates the database to which the accessed table belongs.
- HOST

A string representing the client host name.
Example: HOST="localhost"
- IP

A string representing the client IP address.
Example: IP="127.0.0.1"
- MYSQL_VERSION

A string representing the MySQL server version. This is the same as the value of the VERSION ( ) function or version system variable.

Example: MYSQL_VERSION="5.7.21-log"
- OS_LOGIN

A string representing the external user name used during the authentication process, as set by the plugin used to authenticate the client. With native (built-in) MySQL authentication, or if the plugin does not set the value, this attribute is empty. The value is the same as that of the external_user system variable (see Section 8.2.19, "Proxy Users").

Example: OS_LOGIN="jeffrey"
- OS_VERSION

A string representing the operating system on which the server was built or is running.
Example: OS_VERSION="x86_64-Linux"
- PRIV_USER

A string representing the user that the server authenticated the client as. This is the user name that the server uses for privilege checking, and it may differ from the USER value.

Example: PRIV_USER="jeffrey"
- PROXY_USER

A string representing the proxy user (see Section 8.2.19, "Proxy Users"). The value is empty if user proxying is not in effect.

Example: PROXY_USER="developer"
- SERVER_ID

An unsigned integer representing the server ID. This is the same as the value of the server_id system variable.

Example: SERVER_ID="1"
- SQLTEXT

A string representing the text of an SQL statement. The value can be empty. Long values may be truncated. The string, like the audit log file itself, is written using UTF-8 (up to 4 bytes per character), so the value may be the result of conversion. For example, the original statement might have been received from the client as an SJIS string.

Example: SQLTEXT="DELETE FROM t1"
- STARTUP_OPTIONS

A string representing the options that were given on the command line or in option files when the MySQL server was started.

Example: STARTUP_OPTIONS="--port=3306 --log_output=FILE"
- STATUS

An unsigned integer representing the command status: 0 for success, nonzero if an error occurred. This is the same as the value of the mysql_errno ( ) C API function. See the description for STATUS_CODE for information about how it differs from STATUS.

The audit log does not contain the SQLSTATE value or error message. To see the associations between error codes, SQLSTATE values, and messages, see Server Error Message Reference.

Warnings are not logged.
Example: STATUS="1051"
- STATUS_CODE

An unsigned integer representing the command status: 0 for success, 1 if an error occurred.
The STATUS_CODE value differs from the STATUS value: STATUS_CODE is 0 for success and 1 for error, which is compatible with the EZ_collector consumer for Audit Vault. STATUS is the value of the mysql_errno( ) C API function. This is 0 for success and nonzero for error, and thus is not necessarily 1 for error.

Example: STATUS_CODE="0"
- TABLE

A string representing a table name.
Example: TABLE="t3"
- USER

A string representing the user name sent by the client. This may differ from the PRIV_USER value.
- VERSION

An unsigned integer representing the version of the audit log file format.
Example: VERSION="1"

\section*{JSON Audit Log File Format}

For JSON-format audit logging (audit_log_format=JSON), the log file contents form a JSON array with each array element representing an audited event as a JSON hash of key-value pairs. Examples of complete event records appear later in this section. The following is an excerpt of partial events:
```
[
    {
        "timestamp": "2019-10-03 13:50:01",
        "id": 0,
        "class": "audit",
        "event": "startup",
        ...
    },
    {
        "timestamp": "2019-10-03 15:02:32",
        "id": 0,
        "class": "connection",
        "event": "connect",
        ...
    },
    ...
    {
        "timestamp": "2019-10-03 17:37:26",
        "id": 0,
        "class": "table_access",
```

```
        "event": "insert",
            ...
    }
    ...
]
```


The audit log file is written using UTF-8 (up to 4 bytes per character). When the audit log plugin begins writing a new log file, it writes the opening [ array marker. When the plugin closes a log file, it writes the closing ] array marker. The closing marker is not present while the file is open.

Items within audit records have these characteristics:
- Some items appear in every audit record. Others are optional and may appear depending on the audit record type.
- Order of items within an audit record is not guaranteed.
- Item values are not fixed length. Long values may be truncated as indicated in the item descriptions given later.
- The " and $\backslash$ characters are encoded as \" and \ \\, respectively.

JSON format is the only audit log file format that supports the optional query time and size statistics. This data is available in the slow query log for qualifying queries, and in the context of the audit log it similarly helps to detect outliers for activity analysis.

To add the query statistics to the log file, you must set them up as a filter using the audit_log_filter_set_filter() audit log function as the service element of the JSON filtering syntax. For instructions to do this, see Adding Query Statistics for Outlier Detection. For the bytes_sent and bytes_received fields to be populated, the system variable log_slow_extra must be set to ON.

The following examples show the JSON object formats for different event types (as indicated by the class and event items), reformatted slightly for readability:

Auditing startup event:
```
{ "timestamp": "2019-10-03 14:21:56",
    "id": 0,
    "class": "audit",
    "event": "startup",
    "connection_id": 0,
    "startup_data": { "server_id": 1,
        "os_version": "i686-Linux",
        "mysql_version": "5.7.21-log",
        "args": ["/usr/local/mysql/bin/mysqld",
            "--loose-audit-log-format=JSON",
            "--log-error=log.err",
            "--pid-file=mysqld.pid",
            "--port=3306" ] } }
```


When the audit log plugin starts as a result of server startup (as opposed to being enabled at runtime), connection_id is set to 0 , and account and login are not present.

Auditing shutdown event:
```
{ "timestamp": "2019-10-03 14:28:20",
    "id": 3,
    "class": "audit",
    "event": "shutdown",
    "connection_id": 0,
    "shutdown_data": { "server_id": 1 } }
```


When the audit log plugin is uninstalled as a result of server shutdown (as opposed to being disabled at runtime), connection_id is set to 0 , and account and login are not present.

Connect or change-user event:
```
{ "timestamp": "2019-10-03 14:23:18",
    "id": 1,
    "class": "connection",
    "event": "connect",
    "connection_id": 5,
    "account": { "user": "root", "host": "localhost" },
    "login": { "user": "root", "os": "", "ip": "::1", "proxy": "" },
    "connection_data": { "connection_type": "ssl",
        "status": 0,
        "db": "test",
        "connection_attributes": {
            "_pid": "43236",
            ...
            "program_name": "mysqladmin"
        } }
}
```


Disconnect event:
```
{ "timestamp": "2019-10-03 14:24:45",
    "id": 3,
    "class": "connection",
    "event": "disconnect",
    "connection_id": 5,
    "account": { "user": "root", "host": "localhost" },
    "login": { "user": "root", "os": "", "ip": "::1", "proxy": "" },
    "connection_data": { "connection_type": "ssl" } }
```


\section*{Query event:}
```
{ "timestamp": "2019-10-03 14:23:35",
    "id": 2,
    "class": "general",
    "event": "status",
    "connection_id": 5,
    "account": { "user": "root", "host": "localhost" },
    "login": { "user": "root", "os": "", "ip": "::1", "proxy": "" },
    "general_data": { "command": "Query",
        "sql_command": "show_variables",
        "query": "SHOW VARIABLES",
        "status": 0 } }
```


Query event with optional query statistics for outlier detection:
```
{ "timestamp": "2022-01-28 13:09:30",
    "id": 0,
    "class": "general",
    "event": "status",
    "connection_id": 46,
    "account": { "user": "user", "host": "localhost" },
    "login": { "user": "user", "os": "", "ip": "127.0.0.1", "proxy": "" },
    "general_data": { "command": "Query",
            "sql_command": "insert",
        "query": "INSERT INTO audit_table VALUES(4)",
        "status": 1146 }
    "query_statistics": { "query_time": 0.116250,
                "bytes_sent": 18384,
                "bytes_received": 78858,
                "rows_sent": 3,
                "rows_examined": 20878 } }
```


Table access event (read, delete, insert, update):
```
{ "timestamp": "2019-10-03 14:23:41",
    "id": 0,
    "class": "table_access",
    "event": "insert",
    "connection_id": 5,
    "account": { "user": "root", "host": "localhost" },
    "login": { "user": "root", "os": "", "ip": "127.0.0.1", "proxy": "" },
    "table_access_data": { "db": "test",
```

```
"table": "t1",
"query": "INSERT INTO t1 (i) VALUES(1),(2),(3)",
"sql_command": "insert" } }
```


The items in the following list appear at the top level of JSON-format audit records: Each item value is either a scalar or a JSON hash. For items that have a hash value, the description lists only the item names within that hash. For more complete descriptions of second-level hash items, see later in this section.
- account

The MySQL account associated with the event. The value is a hash containing these items equivalent to the value of the CURRENT_USER( ) function within the section: user, host.

\section*{Example:}
```
"account": { "user": "root", "host": "localhost" }
```

- class

A string representing the event class. The class defines the type of event, when taken together with the event item that specifies the event subclass.

\section*{Example:}
"class": "connection"
The following table shows the permitted combinations of class and event values.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.33 Audit Log Class and Event Combinations}
\begin{tabular}{|l|l|}
\hline Class Value & Permitted Event Values \\
\hline audit & startup, shutdown \\
\hline connection & connect, change_user, disconnect \\
\hline general & status \\
\hline table_access_data & read, delete, insert, update \\
\hline
\end{tabular}
\end{table}
- connection_data

Information about a client connection. The value is a hash containing these items: connection_type, status, db, and possibly connection_attributes. This item occurs only for audit records with a class value of connection.

\section*{Example:}
```
"connection_data": { "connection_type": "ssl",
    "status": 0,
    "db": "test" }
```


Events with a class value of connection and event value of connect may include a connection_attributes item to display the connection attributes passed by the client at connect time. (For information about these attributes, which are also exposed in Performance Schema tables, see Section 29.12.9, "Performance Schema Connection Attribute Tables".)

The connection_attributes value is a hash that represents each attribute by its name and value.

Example:
```
"connection_attributes": {
    "_pid": "43236",
    "_os": "macos0.14",
```

```
    "_platform": "x86_64",
    "_client_version": "8.4.0",
    "_client_name": "libmysql",
    "program_name": "mysqladmin"
}
```


If no connection attributes are present in the event, none are logged and no connection_attributes item appears. This can occur if the connection attempt is unsuccessful, the client passes no attributes, or the connection occurs internally such as during server startup or when initiated by a plugin.
- connection_id

An unsigned integer representing the client connection identifier. This is the same as the value returned by the CONNECTION_ID( ) function within the session.

Example:
```
"connection_id": 5
```

- event

A string representing the subclass of the event class. The subclass defines the type of event, when taken together with the class item that specifies the event class. For more information, see the class item description.

Example:
```
"event": "connect"
```

- general_data

Information about an executed statement or command. The value is a hash containing these items: command, sql_command, query, status. This item occurs only for audit records with a class value of general.

Example:
```
"general_data": { "command": "Query",
    "sql_command": "show_variables",
    "query": "SHOW VARIABLES",
    "status": 0 }
```

- id

An unsigned integer representing an event ID.
Example:
"id": 2
For audit records that have the same timestamp value, their id values distinguish them and form a sequence. Within the audit log, timestamp/id pairs are unique. These pairs are bookmarks that identify event locations within the log.
- login

Information indicating how a client connected to the server. The value is a hash containing these items: user, os, ip, proxy.

Example:
```
"login": { "user": "root", "os": "", "ip": "::1", "proxy": "" }
```

- query_statistics

Optional query statistics for outlier detection. The value is a hash containing these items: query_time, rows_sent, rows_examined, bytes_received, bytes_sent. For instructions to set up the query statistics, see Adding Query Statistics for Outlier Detection.

Example:
```
"query_statistics": { "query_time": 0.116250,
    "bytes_sent": 18384,
    "bytes_received": 78858,
    "rows_sent": 3,
    "rows_examined": 20878 }
```

- shutdown_data

Information pertaining to audit log plugin termination. The value is a hash containing these items: server_id This item occurs only for audit records with class and event values of audit and shutdown, respectively.

Example:
```
"shutdown_data": { "server_id": 1 }
```

- startup_data

Information pertaining to audit log plugin initialization. The value is a hash containing these items: server_id, os_version, mysql_version, args. This item occurs only for audit records with class and event values of audit and startup, respectively.

Example:
```
"startup_data": { "server_id": 1,
    "os_version": "i686-Linux",
    "mysql_version": "5.7.21-log",
    "args": ["/usr/local/mysql/bin/mysqld",
        "--loose-audit-log-format=JSON",
        "--log-error=log.err",
        "--pid-file=mysqld.pid",
        "--port=3306" ] }
```

- table_access_data

Information about an access to a table. The value is a hash containing these items: db, table, query, sql_command, This item occurs only for audit records with a class value of table_access.

Example:
```
"table_access_data": { "db": "test",
    "table": "t1",
    "query": "INSERT INTO t1 (i) VALUES(1),(2),(3)",
    "sql_command": "insert" }
```

- time

This field is similar to that in the timestamp field, but the value is an integer and represents the UNIX timestamp value indicating the date and time when the audit event was generated.

Example:
"time" : 1618498687
The time field occurs in JSON-format log files only if the audit_log_format_unix_timestamp system variable is enabled.
- timestamp

A string representing a UTC value in $Y Y Y Y-M M-D D \quad h h: m m: s s$ format indicating the date and time when the audit event was generated. For example, the event corresponding to execution of an SQL statement received from a client has a timestamp value occurring after the statement finishes, not when it was received.

Example:
```
"timestamp": "2019-10-03 13:50:01"
```


For audit records that have the same timestamp value, their id values distinguish them and form a sequence. Within the audit log, timestamp/id pairs are unique. These pairs are bookmarks that identify event locations within the log.

These items appear within hash values associated with top-level items of JSON-format audit records:
- args

An array of options that were given on the command line or in option files when the MySQL server was started. The first option is the path to the server executable.

Example:
```
"args": ["/usr/local/mysql/bin/mysqld",
    "--loose-audit-log-format=JSON",
    "--log-error=log.err",
    "--pid-file=mysqld.pid",
    "--port=3306" ]
```

- bytes_received

The number of bytes received from the client. This item is part of the optional query statistics. For this field to be populated, the system variable log_slow_extra must be set to ON.

Example:
"bytes_received": 78858
- bytes_sent

The number of bytes sent to the client. This item is part of the optional query statistics. For this field to be populated, the system variable log_slow_extra must be set to ON.

Example:
```
"bytes_sent": 18384
```

- command

A string representing the type of instruction that generated the audit event, such as a command that the server received from a client.

Example:
```
"command": "Query"
```

- connection_type

The security state of the connection to the server. Permitted values are tcp/ip (TCP/IP connection established without encryption), ssl (TCP/IP connection established with encryption), socket (Unix socket file connection), named_pipe (Windows named pipe connection), and shared_memory (Windows shared memory connection).

Example:
```
"connection_type": "tcp/tcp"
```

- db

A string representing a database name. For connection_data, it is the default database. For table_access_data, it is the table database.

Example:
```
"db": "test"
```

- host

A string representing the client host name.
Example:
```
"host": "localhost"
```

- ip

A string representing the client IP address.
Example:
"ip": "::1"
- mysql_version

A string representing the MySQL server version. This is the same as the value of the VERSION ( ) function or version system variable.

Example:
```
"mysql_version": "5.7.21-log"
```

- OS

A string representing the external user name used during the authentication process, as set by the plugin used to authenticate the client. With native (built-in) MySQL authentication, or if the plugin does not set the value, this attribute is empty. The value is the same as that of the external_user system variable. See Section 8.2.19, "Proxy Users".

Example:
```
"os": "jeffrey"
```

- os_version

A string representing the operating system on which the server was built or is running.

\section*{Example:}
```
"os_version": "i686-Linux"
```

- proxy

A string representing the proxy user (see Section 8.2.19, "Proxy Users"). The value is empty if user proxying is not in effect.

Example:
```
"proxy": "developer"
```

- query

A string representing the text of an SQL statement. The value can be empty. Long values may be truncated. The string, like the audit log file itself, is written using UTF-8 (up to 4 bytes per character), so the value may be the result of conversion. For example, the original statement might have been received from the client as an SJIS string.

Example:
```
"query": "DELETE FROM t1"
```

- query_time

The query execution time in microseconds (if the longlong data type is selected) or seconds (if the double data type is selected). This item is part of the optional query statistics.

Example:
```
"query_time": 0.116250
```

- rows_examined

The number of rows accessed during the query. This item is part of the optional query statistics.
Example:
```
"rows_examined": 20878
```

- rows_sent

The number of rows sent to the client as a result. This item is part of the optional query statistics.
Example:
```
"rows_sent": 3
```

- server_id

An unsigned integer representing the server ID. This is the same as the value of the server_id system variable.

Example:
"server_id": 1
- sql_command

A string that indicates the SQL statement type.
Example:
```
"sql_command": "insert"
```


The values correspond to the statement/sql/ $x x x$ command counters. For example, $x x x$ is drop_table and select for DROP TABLE and SELECT statements, respectively. The following statement displays the possible names:
```
SELECT REPLACE(EVENT_NAME, 'statement/sql/', '') AS name
FROM performance_schema.events_statements_summary_global_by_event_name
WHERE EVENT_NAME LIKE 'statement/sql/%'
ORDER BY name;
```

- status

An unsigned integer representing the command status: 0 for success, nonzero if an error occurred. This is the same as the value of the mysql_errno ( ) C API function.

The audit log does not contain the SQLSTATE value or error message. To see the associations between error codes, SQLSTATE values, and messages, see Server Error Message Reference.

Warnings are not logged.
Example:
"status": 1051
- table

A string representing a table name.
Example:
"table": "t1"
- user

A string representing a user name. The meaning differs depending on the item within which user occurs:
- Within account items, user is a string representing the user that the server authenticated the client as. This is the user name that the server uses for privilege checking.
- Within login items, user is a string representing the user name sent by the client.

Example:
"user": "root"

\subsection*{8.4.5.5 Configuring Audit Logging Characteristics}

This section describes how to configure audit logging characteristics, such as the file to which the audit log plugin writes events, the format of written events, whether to enable log file compression and encryption, and space management.
- Naming Conventions for Audit Log Files
- Selecting Audit Log File Format
- Enabling the Audit Log Flush Task
- Adding Query Statistics for Outlier Detection
- Compressing Audit Log Files
- Encrypting Audit Log Files
- Manually Uncompressing and Decrypting Audit Log Files
- Space Management of Audit Log Files
- Write Strategies for Audit Logging

For additional information about the functions and system variables that affect audit logging, see Audit Log Functions, and Audit Log Options and Variables.

The audit log plugin can also control which audited events are written to the audit log file, based on event content or the account from which events originate. See Section 8.4.5.7, "Audit Log Filtering".

\section*{Naming Conventions for Audit Log Files}

To configure the audit log file name, set the audit_log_file system variable at server startup. The default name is audit. log in the server data directory. For best security, write the audit log to a directory accessible only to the MySQL server and to users with a legitimate reason to view the log.

The plugin interprets the audit_log_file value as composed of an optional leading directory name, a base name, and an optional suffix. If compression or encryption are enabled, the effective file name (the name actually used to create the log file) differs from the configured file name because it has additional suffixes:
- If compression is enabled, the plugin adds a suffix of . gz.
- If encryption is enabled, the plugin adds a suffix of .pwd_id.enc, where pwd_id indicates which encryption password to use for log file operations. The audit log plugin stores encryption passwords in the keyring; see Encrypting Audit Log Files.

The effective audit log file name is the name resulting from the addition of applicable compression and encryption suffixes to the configured file name. For example, if the configured audit_log_file value is audit. log, the effective file name is one of the values shown in the following table.

\begin{tabular}{|l|l|}
\hline Enabled Features & Effective File Name \\
\hline No compression or encryption & audit.log \\
\hline Compression & audit.log.gz \\
\hline Encryption & audit.log.pwd_id.enc \\
\hline Compression, encryption & audit.log.gz.pwd_id.enc \\
\hline
\end{tabular}
pwd_id indicates the ID of the password used to encrypt or decrypt a file. pwd_id format is pwd_timestamp-seq, where:
- pwd_timestamp is a UTC value in YYYYMMDDThhmmss format indicating when the password was created.
- seq is a sequence number. Sequence numbers start at 1 and increase for passwords that have the same pwd_timestamp value.

Here are some example pwd_id password ID values:
```
20190403T142359-1
20190403T142400-1
20190403T142400-2
```


To construct the corresponding keyring IDs for storing passwords in the keyring, the audit log plugin adds a prefix of audit_log - to the pwd_id values. For the example password IDs just shown, the corresponding keyring IDs are:
```
audit_log-20190403T142359-1
audit_log-20190403T142400-1
audit_log-20190403T142400-2
```


The ID of the password currently used for encryption by the audit log plugin is the one having the largest pwd_timestamp value. If multiple passwords have that pwd_timestamp value, the current password ID is the one with the largest sequence number. For example, in the preceding set of password IDs, two of them have the largest timestamp, 20190403T142400, so the current password ID is the one with the largest sequence number (2).

The audit log plugin performs certain actions during initialization and termination based on the effective audit log file name:
- During initialization, the plugin checks whether a file with the audit log file name already exists and renames it if so. (In this case, the plugin assumes that the previous server invocation exited unexpectedly with the audit log plugin running.) The plugin then writes to a new empty audit log file.
- During termination, the plugin renames the audit log file.
- File renaming (whether during plugin initialization or termination) occurs according to the usual rules for automatic size-based log file rotation; see Manual Audit Log File Rotation.

\section*{Selecting Audit Log File Format}

To configure the audit log file format, set the audit_log_format system variable at server startup. These formats are available:
- NEW: New-style XML format. This is the default.
- OLD: Old-style XML format.
- JSON: JSON format. Writes the audit log as a JSON array. Only this format supports the optional query time and size statistics.

For details about each format, see Section 8.4.5.4, "Audit Log File Formats".

\section*{Enabling the Audit Log Flush Task}

MySQL Enterprise Audit provides the capability of setting a refresh interval to dispose of the in-memory cache automatically. A flush task configured using the audit_log_flush_interval_seconds system variable has a value of zero by default, which means the task is not scheduled to run.

When the task is configured to run (the value is non-zero), MySQL Enterprise Audit attempts to call the scheduler component at its initialization and configure a regular, recurring flush of its memory cache:
- If the audit log cannot find an implementation of the scheduler registration service, it does not schedule the flush and continue loading.
- Audit log implements the dynamic_loader_services_loaded_notification service and listens for new registrations of mysql_scheduler so that audit log can register its scheduled task into the newly loaded scheduler.
- Audit log only registers itself into the first scheduler implementation loaded.

Similarly, MySQL Enterprise Audit calls the scheduler component at its deinitialization and unconfigures the recurring flush that it has scheduled. It keeps an active reference to the scheduler registration service until the scheduled task is unregistered, ensuring that the scheduler component cannot be unloaded while there are active scheduled jobs. All of the results from executing the scheduler and its tasks are written to the server error log.

To schedule an audit log flush task:
1. Confirm that the scheduler component is loaded and enabled. The component is enabled (ON) by default (see component_scheduler. enabled).
```
SELECT * FROM mysql.components;
+---------------+--------------------+-----------------------------
| component_id | component_group_id | component_urn |
+---------------+---------------------+-----------------------------
| 1 | 1 | file://component_scheduler |
+---------------+---------------------+----------------------------
```

2. Install the audit_log plugin, if it is not installed already (see Section 8.4.5.2, "Installing or Uninstalling MySQL Enterprise Audit").
3. Start the server using audit_log_flush_interval_seconds and set the value to a number greater than 59 . The upper limit of the value varies by platform. For example, to configure the flush task to recur every two minutes:
```
$> mysqld --audit_log_flush_interval_seconds=120
```


For more information, see the audit_log_flush_interval_seconds system variable.

\section*{Adding Query Statistics for Outlier Detection}

In MySQL 8.4, you can extend log files in JSON format with optional data fields to show the query time, the number of bytes sent and received, the number of rows returned to the client, and the number of rows examined. This data is available in the slow query log for qualifying queries, and in the context of the audit log it similarly helps to detect outliers for activity analysis. The extended data fields can be added only when the audit log is in JSON format (audit_log_format=JSON), which is not the default setting.

The query statistics are delivered to the audit log through component services that you set up as an audit log filtering function. The services are named mysql_audit_print_service_longlong_data_source and mysql_audit_print_service_double_data_source. You can choose either data type for each output item. For the query time, longlong outputs the value in microseconds, and double outputs the value in seconds.

You add the query statistics using the audit_log_filter_set_filter() audit log function, as the service element of the JSON filtering syntax, as follows:
```
SELECT audit_log_filter_set_filter('QueryStatistics',
    '{ "filter": { "class": { "name": "general", "event": { "name": "sta
    '{ "service": { "implementation": "mysql_server", "tag": "query_stat
    '{ "name": "query_time", "type": "double" }, '
    '{ "name": "bytes_sent", "type": "longlong" }, '
    '{ "name": "bytes_received", "type": "longlong" }, '
    '{ "name": "rows_sent", "type": "longlong" }, '
    '{ "name": "rows_examined", "type": "longlong" } ] } } } } } }');
```


For the bytes_sent and bytes_received fields to be populated, the system variable log_slow_extra must be set to ON. If the system variable value is OFF, a null value is written to the log file for these fields.

If you want to stop collecting the query statistics, use the audit_log_filter_set_filter() audit log function to remove the filter, for example:

SELECT audit_log_filter_remove_filter('QueryStatistics');

\section*{Compressing Audit Log Files}

Audit log file compression can be enabled for any logging format.
To configure audit log file compression, set the audit_log_compression system variable at server startup. Permitted values are NONE (no compression; the default) and GZIP (GNU Zip compression).

If both compression and encryption are enabled, compression occurs before encryption. To recover the original file manually, first decrypt it, then uncompress it. See Manually Uncompressing and Decrypting Audit Log Files.

\section*{Encrypting Audit Log Files}

Audit log file encryption can be enabled for any logging format. Encryption is based on user-defined passwords (with the exception of the initial password that the audit log plugin generates). To use this feature, the MySQL keyring must be enabled because audit logging uses it for password storage. Any keyring component or plugin can be used; for instructions, see Section 8.4.4, "The MySQL Keyring".

To configure audit log file encryption, set the audit_log_encryption system variable at server startup. Permitted values are NONE (no encryption; the default) and AES (AES-256-CBC cipher encryption).

To set or get an encryption password at runtime, use these audit log functions:
- To set the current encryption password, invoke audit_log_encryption_password_set (). This function stores the new password in the keyring. If encryption is enabled, it also performs a log file rotation operation that renames the current log file, and begins a new log file encrypted with
the password. File renaming occurs according to the usual rules for automatic size-based log file rotation; see Manual Audit Log File Rotation.

If the audit_log_password_history_keep_days system variable is nonzero, invoking audit_log_encryption_password_set ( ) also causes expiration of old archived audit log encryption passwords. For information about audit log password history, including password archiving and expiration, see the description of that variable.
- To get the current encryption password, invoke audit_log_encryption_password_get ( ) with no argument. To get a password by ID, pass an argument that specifies the keyring ID of the current password or an archived password.

To determine which audit log keyring IDs exist, query the Performance Schema keyring_keys table:
```
mysql> SELECT KEY_ID FROM performance_schema.keyring_keys
    WHERE KEY_ID LIKE 'audit_log%'
    ORDER BY KEY_ID;
+-------------------------------+
| KEY_ID |
+-------------------------------+
| audit_log-20190415T152248-1 |
| audit_log-20190415T153507-1 |
| audit_log-20190416T125122-1 |
| audit_log-20190416T141608-1 |
+------------------------------+
```


For additional information about audit log encryption functions, see Audit Log Functions.
When the audit log plugin initializes, if it finds that log file encryption is enabled, it checks whether the keyring contains an audit log encryption password. If not, the plugin automatically generates a random initial encryption password and stores it in the keyring. To discover this password, invoke audit_log_encryption_password_get().

If both compression and encryption are enabled, compression occurs before encryption. To recover the original file manually, first decrypt it, then uncompress it. See Manually Uncompressing and Decrypting Audit Log Files.

\section*{Manually Uncompressing and Decrypting Audit Log Files}

Audit log files can be uncompressed and decrypted using standard tools. This should be done only for log files that have been closed (archived) and are no longer in use, not for the log file that the audit log plugin is currently writing. You can recognize archived log files because they have been renamed by the audit log plugin to include a timestamp in the file name just after the base name.

For this discussion, assume that audit_log_file is set to audit.log. In that case, an archived audit log file has one of the names shown in the following table.

\begin{tabular}{|l|l|}
\hline Enabled Features & Archived File Name \\
\hline No compression or encryption & audit.timestamp.log \\
\hline Compression & audit.timestamp.log.gz \\
\hline Encryption & audit.timestamp.log.pwd_id.enc \\
\hline Compression, encryption & audit.timestamp.log.gz.pwd_id.enc \\
\hline
\end{tabular}

As discussed in Naming Conventions for Audit Log Files, pwd_id format is pwd_timestamp-seq. Thus, the names of archived encrypted log files actually contain two timestamps. The first indicates file rotation time, and the second indicates when the encryption password was created.

Consider the following set of archived encrypted log file names:
```
audit.20190410T205827.log.20190403T185337-1.enc
audit.20190410T210243.log.20190403T185337-1.enc
audit.20190415T145309.log.20190414T223342-1.enc
```

```
audit.20190415T151322.log.20190414T223342-2.enc
```


Each file name has a unique rotation-time timestamp. By contrast, the password timestamps are not unique:
- The first two files have the same password ID and sequence number (20190403T185337-1). They have the same encryption password.
- The second two files have the same password ID (20190414T223342) but different sequence numbers $(1,2)$. These files have different encryption passwords.

To uncompress a compressed log file manually, use gunzip, gzip -d, or equivalent command. For example:
```
gunzip -c audit.timestamp.log.gz > audit.timestamp.log
```


To decrypt an encrypted log file manually, use the openssl command. For example:
```
openssl enc -d -aes-256-cbc -pass pass:password -md sha256
    -in audit.timestamp.log.pwd_id.enc
    -out audit.timestamp.log
```


To execute that command, you must obtain password, the encryption password. To do this, use audit_log_encryption_password_get ( ). For example, if the audit log file name is audit. 20190415T151322.log. 20190414T223342-2.enc, the password ID is 20190414T223342-2 and the keyring ID is audit-log-20190414T223342-2. Retrieve the keyring password like this:
```
SELECT audit_log_encryption_password_get('audit-log-20190414T223342-2');
```


If both compression and encryption are enabled for audit logging, compression occurs before encryption. In this case, the file name has . gz and . pwd_id. enc suffixes added, corresponding to the order in which those operations occur. To recover the original file manually, perform the operations in reverse. That is, first decrypt the file, then uncompress it:
```
openssl enc -d -aes-256-cbc -pass pass:password -md sha256
    -in audit.timestamp.log.gz.pwd_id.enc
    -out audit.timestamp.log.gz
gunzip -c audit.timestamp.log.gz > audit.timestamp.log
```


\section*{Space Management of Audit Log Files}

The audit log file has the potential to grow quite large and consume a great deal of disk space. If you are collecting the optional query time and size statistics, this increases the space requirements. The query statistics are only supported with JSON format.

To manage the space used, employ these methods:
- Log file rotation. This involves rotating the current log file by renaming it, then opening a new current log file using the original name. Rotation can be performed manually, or configured to occur automatically.
- Pruning of rotated JSON-format log files, if automatic rotation is enabled. Pruning can be performed based on log file age or combined log file size.

To configure audit log file space management, use the following system variables:
- If audit_log_rotate_on_size is 0 (the default), automatic log file rotation is disabled.
- No rotation occurs unless performed manually.
- To rotate the current file, use one of the following methods:
- Run SELECT audit_log_rotate( ); to rename the file and open a new audit log file using the original name.

With this file rotation method, pruning of rotated JSON-format log files occurs if audit_log_max_size or audit_log_prune_seconds has a value greater than 0 .
- Manually rename the file, then enable audit_log_flush to close it and open a new current log file using the original name. This file rotation method and the audit_log_flush variable are deprecated.

With this file rotation method, pruning of rotated JSON-format log files does not occur; audit_log_max_size and audit_log_prune_seconds have no effect.

See Manual Audit Log File Rotation, for more information.
- If audit_log_rotate_on_size is greater than 0 , automatic audit log file rotation is enabled:
- Automatic rotation occurs when a write to the current log file causes its size to exceed the audit_log_rotate_on_size value, as well as under certain other conditions; see Automatic Audit Log File Rotation. When automatic rotation occurs, the audit log plugin renames the current log file and opens a new current log file using the original name.
- Pruning of rotated JSON-format log files occurs if audit_log_max_size or audit_log_prune_seconds has a value greater than 0 .
- audit_log_flush has no effect.

\section*{Note}

For JSON-format log files, rotation also occurs when the value of the audit_log_format_unix_timestamp system variable is changed at runtime. However, this does not occur for space-management purposes, but rather so that, for a given JSON-format log file, all records in the file either do or do not include the time field.

\section*{Note}

Rotated (renamed) log files are not removed automatically. For example, with size-based log file rotation, renamed log files have unique names and accumulate indefinitely. They do not rotate off the end of the name sequence. To avoid excessive use of space:
- For JSON-format log files: Enable log file pruning as described in Audit Log File Pruning.
- Otherwise: Remove old files periodically, backing them up first as necessary. If backed-up log files are encrypted, also back up the corresponding encryption passwords to a safe place, should you need to decrypt the files later.

The following sections describe log file rotation and pruning in greater detail.
- Manual Audit Log File Rotation
- Manual Audit Log File Rotation (Old Method)
- Automatic Audit Log File Rotation
- Audit Log File Pruning

\section*{Manual Audit Log File Rotation}

If audit_log_rotate_on_size is 0 (the default), no log rotation occurs unless performed manually.

To rotate the audit log file manually, run SELECT audit_log_rotate( ) ; to rename the current audit log file and open a new audit log file. Files are renamed according to the conventions described in Naming Conventions for Audit Log Files.

The AUDIT_ADMIN privilege is required to use the audit_log_rotate( ) function.
Managing the number of archived log files (the files that have been renamed) and the space they use is a manual task that involves removing archived audit log files that are no longer needed from your file system.

The content of audit log files that are renamed using the audit_log_rotate( ) function can be read by audit_log_read() function.

\section*{Manual Audit Log File Rotation (Old Method)}

\section*{Note}

The audit_log_flush variable and this method of audit log file rotation are deprecated; expect support to be removed in a future version of MySQL.

If audit_log_rotate_on_size is 0 (the default), no log rotation occurs unless performed manually. In this case, the audit log plugin closes and reopens the log file when the audit_log_flush value changes from disabled to enabled. Log file renaming must be done externally to the server. Suppose that the log file name is audit. log and you want to maintain the three most recent log files, cycling through the names audit.log. 1 through audit. log.3. On Unix, perform rotation manually like this:
1. From the command line, rename the current log files:
```
mv audit.log.2 audit.log.3
mv audit.log.1 audit.log.2
mv audit.log audit.log.1
```


This strategy overwrites the current audit. log. 3 contents, placing a bound on the number of archived log files and the space they use.
2. At this point, the plugin is still writing to the current log file, which has been renamed to audit. log. 1. Connect to the server and flush the log file so the plugin closes it and reopens a new audit.log file:
```
SET GLOBAL audit_log_flush = ON;
```

audit_log_flush is special in that its value remains OFF so that you need not disable it explicitly before enabling it again to perform another flush.

Note
If compression or encryption are enabled, log file names include suffixes that signify the enabled features, as well as a password ID if encryption is enabled. If file names include a password ID, be sure to retain the ID in the name of any files you rename manually so that the password to use for decryption operations can be determined.

\section*{Note}

For JSON-format logging, renaming audit log files manually makes them unavailable to the log-reading functions because the audit log plugin can no longer determine that they are part of the log file sequence (see Section 8.4.5.6, "Reading Audit Log Files"). Consider setting audit_log_rotate_on_size greater than 0 to use size-based rotation instead.

\section*{Automatic Audit Log File Rotation}

If audit_log_rotate_on_size is greater than 0, setting audit_log_flush has no effect. Instead, whenever a write to the current log file causes its size to exceed the audit_log_rotate_on_size
value, the audit log plugin automatically renames the current log file and opens a new current log file using the original name.

Automatic size-based rotation also occurs under these conditions:
- During plugin initialization, if a file with the audit log file name already exists (see Naming Conventions for Audit Log Files).
- During plugin termination.
- When the audit_log_encryption_password_set ( ) function is called to set the encryption password, if encryption is enabled. (Rotation does not occur if encryption is disabled.)

The plugin renames the original file by inserting a timestamp just after its base name. For example, if the file name is audit. log, the plugin renames it to a value such as audit. 20210115T140633. log. The timestamp is a UTC value in YYYYMMDDThhmmss format. For XML logging, the timestamp indicates rotation time. For JSON logging, the timestamp is that of the last event written to the file.

If log files are encrypted, the original file name already contains a timestamp indicating the encryption password creation time (see Naming Conventions for Audit Log Files). In this case, the file name after rotation contains two timestamps. For example, an encrypted log file named audit.log.20210110T130749-1.enc is renamed to a value such as audit.20210115T140633.log.20210110T130749-1.enc.

\section*{Audit Log File Pruning}

The audit log plugin supports pruning of rotated JSON-format audit log files, if automatic log file rotation is enabled. To use this capability:
- Set audit_log_format to JSON. (In addition, consider also changing audit_log_file; see Selecting Audit Log File Format.)
- Set audit_log_rotate_on_size greater than 0 to specify the size in bytes at which automatic log file rotation occurs.
- By default, no pruning of automatically rotated JSON-format log files occurs. To enable pruning, set one of these system variables to a value greater than 0 :
- Set audit_log_max_size greater than 0 to specify the limit in bytes on the combined size of rotated log files above which the files become subject to pruning.
- Set audit_log_prune_seconds greater than 0 to specify the number of seconds after which rotated log files become subject to pruning.

Nonzero values of audit_log_max_size take precedence over nonzero values of audit_log_prune_seconds. If both are set greater than 0 at plugin initialization, a warning is written to the server error log. If a client sets both greater than 0 at runtime, a warning is returned to the client.

\section*{Note}

Warnings to the error log are written as Notes, which are information messages. To ensure that such messages appear in the error log and are not discarded, make sure that error-logging verbosity is sufficient to include information messages. For example, if you are using priority-based log filtering, as described in Section 7.4.2.5, "Priority-Based Error Log Filtering (log_filter_internal)", set the log_error_verbosity system variable to a value of 3.

Pruning of JSON-format log files, if enabled, occurs as follows:
- When automatic rotation takes place; for the conditions under which this happens, see Automatic Audit Log File Rotation.
- When the global audit_log_max_size or audit_log_prune_seconds system variable is set at runtime.

For pruning based on combined rotated log file size, if the combined size is greater than the limit specified by audit_log_max_size, the audit log plugin removes the oldest files until their combined size does not exceed the limit.

For pruning based on rotated log file age, the pruning point is the current time minus the value of audit_log_prune_seconds. In rotated JSON-format log files, the timestamp part of each file name indicates the timestamp of the last event written to the file. The audit log plugin uses file name timestamps to determine which files contain only events older than the pruning point, and removes them.

\section*{Write Strategies for Audit Logging}

The audit log plugin can use any of several strategies for log writes. Regardless of strategy, logging occurs on a best-effort basis, with no guarantee of consistency.

To specify a write strategy, set the audit_log_strategy system variable at server startup. By default, the strategy value is ASYNCHRONOUS and the plugin logs asynchronously to a buffer, waiting if the buffer is full. You can tell the plugin not to wait (PERFORMANCE) or to log synchronously, either using file system caching (SEMISYNCHRONOUS) or forcing output with a sync ( ) call after each write request (SYNCHRONOUS).

In many cases, the plugin writes directly to a JSON-format audit log if the current query is too large for the buffer. The write strategy determines how the plugin increments the direct write count. You can track the number direct writes with the Audit_log_direct_writes status variable.

For asynchronous write strategy, the audit_log_buffer_size system variable is the buffer size in bytes. Set this variable at server startup to change the buffer size. The plugin uses a single buffer, which it allocates when it initializes and removes when it terminates. The plugin does not allocate this buffer for nonasynchronous write strategies.

Asynchronous logging strategy has these characteristics:
- Minimal impact on server performance and scalability.
- Blocking of threads that generate audit events for the shortest possible time; that is, time to allocate the buffer plus time to copy the event to the buffer.
- Output goes to the buffer. A separate thread handles writes from the buffer to the log file.

With asynchronous logging, the integrity of the log file may be compromised if a problem occurs during a write to the file or if the plugin does not shut down cleanly (for example, in the event that the server host exits unexpectedly). To reduce this risk, set audit_log_strategy to use synchronous logging.

A disadvantage of PERFORMANCE strategy is that it drops events when the buffer is full. For a heavily loaded server, the audit log may have events missing.

\subsection*{8.4.5.6 Reading Audit Log Files}

The audit log plugin supports functions that provide an SQL interface for reading JSON-format audit log files. (This capability does not apply to log files written in other formats.)

When the audit log plugin initializes and is configured for JSON logging, it uses the directory containing the current audit log file as the location to search for readable audit log files. The plugin determines the file location, base name, and suffix from the value of the audit_log_file system variable, then looks for files with names that match the following pattern, where [...] indicates optional file name parts:
basename[.timestamp].suffix[.gz][[.pwd_id].enc]
If a file name ends with . enc, the file is encrypted and reading its unencrypted contents requires a decryption password obtained from the keyring. The audit log plugin determines the keyring ID of the decryption password as follows:
- If .enc is preceded by pwd_id, the keyring ID is audit_log-pwd_id.
- If . enc is not preceded by pwd_id, the file has an old name from before audit log encryption password history was implemented. The keyring ID is audit_log.

For more information about encrypted audit log files, see Encrypting Audit Log Files.
The plugin ignores files that have been renamed manually and do not match the pattern, and files that were encrypted with a password no longer available in the keyring. The plugin opens each remaining candidate file, verifies that the file actually contains JSON audit events, and sorts the files using the timestamps from the first event of each file. The result is a sequence of files that are subject to access using the log-reading functions:
- audit_log_read ( ) reads events from the audit log or closes the reading process.
- audit_log_read_bookmark( ) returns a bookmark for the most recently written audit log event. This bookmark is suitable for passing to audit_log_read ( ) to indicate where to begin reading.
audit_log_read( ) takes an optional JSON string argument, and the result returned from a successful call to either function is a JSON string.

To use the functions to read the audit log, follow these principles:
- Call audit_log_read ( ) to read events beginning from a given position or the current position, or to close reading:
- To initialize an audit log read sequence, pass an argument that indicates the position at which to begin. One way to do so is to pass the bookmark returned by audit_log_read_bookmark ( ):
```
SELECT audit_log_read(audit_log_read_bookmark());
```

- To continue reading from the current position in the sequence, call audit_log_read ( ) with no position specified:
```
SELECT audit_log_read();
```

- To explicitly close the read sequence, pass a JSON null argument:
```
SELECT audit_log_read('null');
```


It is unnecessary to close reading explicitly. Reading is closed implicitly when the session ends or a new read sequence is initialized by calling audit_log_read ( ) with an argument that indicates the position at which to begin.
- A successful call to audit_log_read( ) to read events returns a JSON string containing an array of audit events:
- If the final value of the returned array is not a JSON null value, there are more events following those just read and audit_log_read ( ) can be called again to read more of them.
- If the final value of the returned array is a JSON null value, there are no more events left to be read in the current read sequence.

Each non-null array element is an event represented as a JSON hash. For example:
```
[
    {
        "timestamp": "2020-05-18 13:39:33", "id": 0,
```

```
        "class": "connection", "event": "connect",
        ...
    },
    {
        "timestamp": "2020-05-18 13:39:33", "id": 1,
        "class": "general", "event": "status",
        ...
    },
    {
        "timestamp": "2020-05-18 13:39:33", "id": 2,
        "class": "connection", "event": "disconnect",
        ...
    },
    null
]
```


For more information about the content of JSON-format audit events, see JSON Audit Log File Format.
- An audit_log_read ( ) call to read events that does not specify a position produces an error under any of these conditions:
- A read sequence has not yet been initialized by passing a position to audit_log_read ( ).
- There are no more events left to be read in the current read sequence; that is, audit_log_read ( ) previously returned an array ending with a JSON null value.
- The most recent read sequence has been closed by passing a JSON null value to audit_log_read().

To read events under those conditions, it is necessary to first initialize a read sequence by calling audit_log_read() with an argument that specifies a position.

To specify a position to audit_log_read( ), include an argument that indicates where to begin reading. For example, pass a bookmark, which is a JSON hash containing timestamp and id elements that uniquely identify a particular event. Here is an example bookmark, obtained by calling the audit_log_read_bookmark ( ) function:
```
mysql> SELECT audit_log_read_bookmark();
+----------------------------------------------------
| audit_log_read_bookmark() |
+-----------------------------------------------------
| { "timestamp": "2020-05-18 21:03:44", "id": 0 } |
+----------------------------------------------------
```


Passing the current bookmark to audit_log_read ( ) initializes event reading beginning at the bookmark position:
```
mysql> SELECT audit_log_read(audit_log_read_bookmark());
+---------------------------------------------------------------------------
| audit_log_read(audit_log_read_bookmark()) |
+-------------------------------------------------------------------------
| [ {"timestamp":"2020-05-18 22:41:24","id":0,"class":"connection", ... |
+--------------------------------------------------------------------------
```


The argument to audit_log_read ( ) is optional. If present, it can be a JSON null value to close the read sequence, or a JSON hash.

Within a hash argument to audit_log_read ( ), items are optional and control aspects of the read operation such as the position at which to begin reading or how many events to read. The following items are significant (other items are ignored):
- start: The position within the audit log of the first event to read. The position is given as a timestamp and the read starts from the first event that occurs on or after the timestamp value. The start item has this format, where value is a literal timestamp value:
```
"start": { "timestamp": "value" }
```

- timestamp, id: The position within the audit log of the first event to read. The timestamp and id items together comprise a bookmark that uniquely identify a particular event. If an audit_log_read ( ) argument includes either item, it must include both to completely specify a position or an error occurs.
- max_array_length: The maximum number of events to read from the log. If this item is omitted, the default is to read to the end of the log or until the read buffer is full, whichever comes first.

To specify a starting position to audit_log_read( ), pass a hash argument that includes either a start item or a bookmark consisting of timestamp and id items. If a hash argument includes both a start item and a bookmark, an error occurs.

If a hash argument specifies no starting position, reading continues from the current position.
If a timestamp value includes no time part, a time part of $00: 00: 00$ is assumed.
Example arguments accepted by audit_log_read( ):
- Read events starting with the first event that occurs on or after the given timestamp:
```
audit_log_read('{ "start": { "timestamp": "2020-05-24 12:30:00" } }')
```

- Like the previous example, but read at most 3 events:
```
audit_log_read('{ "start": { "timestamp": "2020-05-24 12:30:00" }, "max_array_length": 3 }')
```

- Read events starting with the first event that occurs on or after 2020-05-24 00:00:00 (the timestamp includes no time part, so $00: 00: 00$ is assumed):
```
audit_log_read('{ "start": { "timestamp": "2020-05-24" } }')
```

- Read events starting with the event that has the exact timestamp and event ID:
```
audit_log_read('{ "timestamp": "2020-05-24 12:30:00", "id": 0 }')
```

- Like the previous example, but read at most 3 events:
```
audit_log_read('{ "timestamp": "2020-05-24 12:30:00", "id": 0, "max_array_length": 3 }')
```

- Read events from the current position in the read sequence:
```
audit_log_read()
```

- Read at most 5 events beginning at the current position in the read sequence:
```
audit_log_read('{ "max_array_length": 5 }')
```

- Close the current read sequence:
```
audit_log_read('null')
```


A JSON string returned from either log-reading function can be manipulated as necessary. Suppose that a call to obtain a bookmark produces this value:
```
mysql> SET @mark := audit_log_read_bookmark();
mysql> SELECT @mark;
+---------------------------------------------------+
| @mark |
+---------------------------------------------------+
| { "timestamp": "2020-05-18 16:10:28", "id": 2 } |
+----------------------------------------------------
```


Calling audit_log_read ( ) with that argument can return multiple events. To limit audit_log_read ( ) to reading at most $N$ events, add to the string a max_array_length item with that value. For example, to read a single event, modify the string as follows:
```
mysql> SET @mark := JSON_SET(@mark, '$.max_array_length', 1);
mysql> SELECT @mark;
+-------------------------------------------------------------------------
| @mark |
+---------------------------------------------------------------------------
| {"id": 2, "timestamp": "2020-05-18 16:10:28", "max_array_length": 1} |
+--------------------------------------------------------------------------
```


The modified string, when passed to audit_log_read( ), produces a result containing at most one event, no matter how many are available.

If an audit log function is invoked from within the mysql client, binary string results display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".

To set a limit on the number of bytes that audit_log_read ( ) reads, set the audit_log_read_buffer_size system variable. This variable has a default of 32 KB and can be set at runtime. Each client should set its session value of audit_log_read_buffer_size appropriately for its use of audit_log_read( ).

Each call to audit_log_read ( ) returns as many available events as fit within the buffer size. Events that do not fit within the buffer size are skipped and generate warnings. Given this behavior, consider these factors when assessing the proper buffer size for an application:
- There is a tradeoff between number of calls to audit_log_read ( ) and events returned per call:
- With a smaller buffer size, calls return fewer events, so more calls are needed.
- With a larger buffer size, calls return more events, so fewer calls are needed.
- With a smaller buffer size, such as the default size of 32 KB , there is a greater chance for events to exceed the buffer size and thus to be skipped.

For additional information about audit log-reading functions, see Audit Log Functions.

\subsection*{8.4.5.7 Audit Log Filtering}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1501.jpg?height=113&width=99&top_left_y=1704&top_left_x=370)

\section*{Note}

For audit log filtering to work as described here, the audit log plugin and the accompanying audit tables and functions must be installed. If the plugin is installed without the accompanying audit tables and functions needed for rule-based filtering, the plugin operates in legacy filtering mode, described in Section 8.4.5.10, "Legacy Mode Audit Log Filtering". Legacy mode (deprecated) is filtering behavior as it was prior to MySQL 5.7.13; that is, before the introduction of rule-based filtering.
- Properties of Audit Log Filtering
- Constraints on Audit Log Filtering Functions
- Using Audit Log Filtering Functions

\section*{Properties of Audit Log Filtering}

The audit log plugin has the capability of controlling logging of audited events by filtering them:
- Audited events can be filtered using these characteristics:
- User account
- Audit event class
- Audit event subclass
- Audit event fields such as those that indicate operation status or SQL statement executed
- Audit filtering is rule based:
- A filter definition creates a set of auditing rules. Definitions can be configured to include or exclude events for logging based on the characteristics just described.
- Filter rules have the capability of blocking (aborting) execution of qualifying events, in addition to existing capabilities for event logging.
- Multiple filters can be defined, and any given filter can be assigned to any number of user accounts.
- It is possible to define a default filter to use with any user account that has no explicitly assigned filter.

Audit log filtering is used to implement component services. To get the optional query statistics available from that release, you set them up as a filter using the service component, which implements the services that write the statistics to the audit log. For instructions to set this filter up, see Adding Query Statistics for Outlier Detection.

For information about writing filtering rules, see Section 8.4.5.8, "Writing Audit Log Filter Definitions".
- Audit log filters can be defined and modified using an SQL interface based on function calls. By default, audit log filter definitions are stored in the mysql system database, and you can display audit filters by querying the mysql.audit_log_filter table. It is possible to use a different database for this purpose, in which case you should query the database_name.audit_log_filter table instead. See Section 8.4.5.2, "Installing or Uninstalling MySQL Enterprise Audit", for more information.
- Within a given session, the value of the read-only audit_log_filter_id system variable indicates whether a filter is assigned to the session.

\section*{Note}

By default, rule-based audit log filtering logs no auditable events for any users. To log all auditable events for all users, use the following statements, which create a simple filter to enable logging and assign it to the default account:

SELECT audit_log_filter_set_filter('log_all', '\{ "filter": \{ "log": true \} \}'); SELECT audit_log_filter_set_user('\%', 'log_all');

The filter assigned to \% is used for connections from any account that has no explicitly assigned filter (which initially is true for all accounts).

As previously mentioned, the SQL interface for audit filtering control is function based. The following list briefly summarizes these functions:
- audit_log_filter_set_filter( ): Define a filter.
- audit_log_filter_remove_filter(): Remove a filter.
- audit_log_filter_set_user( ): Start filtering a user account.
- audit_log_filter_remove_user( ): Stop filtering a user account.
- audit_log_filter_flush( ): Flush manual changes to the filter tables to affect ongoing filtering.

For usage examples and complete details about the filtering functions, see Using Audit Log Filtering Functions, and Audit Log Functions.

\section*{Constraints on Audit Log Filtering Functions}

Audit log filtering functions are subject to these constraints:
- To use any filtering function, the audit_log plugin must be enabled or an error occurs. In addition, the audit tables must exist or an error occurs. To install the audit_log plugin and its accompanying functions and tables, see Section 8.4.5.2, "Installing or Uninstalling MySQL Enterprise Audit".
- To use any filtering function, a user must possess the AUDIT_ADMIN SUPER privilege or an error occurs. To grant one of these privileges to a user account, use this statement:
```
GRANT privilege ON *.* TO user;
```


Alternatively, should you prefer to avoid granting the AUDIT_ADMIN or SUPER privilege while still permitting users to access specific filtering functions, "wrapper" stored programs can be defined. This technique is described in the context of keyring functions in Using General-Purpose Keyring Functions; it can be adapted for use with filtering functions.
- The audit_log plugin operates in legacy mode if it is installed but the accompanying audit tables and functions are not created. The plugin writes these messages to the error log at server startup:
```
[Warning] Plugin audit_log reported: 'Failed to open the audit log filter tables.'
[Warning] Plugin audit_log reported: 'Audit Log plugin supports a filtering,
which has not been installed yet. Audit Log plugin will run in the legacy
mode, which will be disabled in the next release.'
```


In legacy mode, which is deprecated, filtering can be done based only on event account or status. For details, see Section 8.4.5.10, "Legacy Mode Audit Log Filtering".
- It is theoretically possible for a user with sufficient permissions to mistakenly create an "abort" item in the audit log filter that prevents themselves and other administrators from accessing the system. The AUDIT_ABORT_EXEMPT privilege is available to permit a user account's queries to always be executed even if an "abort" item would block them. Accounts with this privilege can therefore be used to regain access to a system following an audit misconfiguration. The query is still logged in the audit log, but instead of being rejected, it is permitted due to the privilege.

Accounts created with the SYSTEM_USER privilege have the AUDIT_ABORT_EXEMPT privilege assigned automatically when they are created. The AUDIT_ABORT_EXEMPT privilege is also assigned to existing accounts with the SYSTEM_USER privilege when you carry out an upgrade procedure, if no existing accounts have that privilege assigned.

\section*{Using Audit Log Filtering Functions}

Before using the audit log functions, install them according to the instructions provided in Section 8.4.5.2, "Installing or Uninstalling MySQL Enterprise Audit". The AUDIT_ADMIN or SUPER privilege is required to use any of these functions.

The audit log filtering functions enable filtering control by providing an interface to create, modify, and remove filter definitions and assign filters to user accounts.

Filter definitions are JSON values. For information about using JSON data in MySQL, see Section 13.5, "The JSON Data Type". This section shows some simple filter definitions. For more information about filter definitions, see Section 8.4.5.8, "Writing Audit Log Filter Definitions".

When a connection arrives, the audit log plugin determines which filter to use for the new session by searching for the user account name in the current filter assignments:
- If a filter is assigned to the user, the audit log uses that filter.
- Otherwise, if no user-specific filter assignment exists, but there is a filter assigned to the default account (\%), the audit log uses the default filter.
- Otherwise, the audit log selects no audit events from the session for processing.

If a change-user operation occurs during a session (see mysql_change_user()), filter assignment for the session is updated using the same rules but for the new user.

By default, no accounts have a filter assigned, so no processing of auditable events occurs for any account.

Suppose that you want to change the default to be to log only connection-related activity (for example, to see connect, change-user, and disconnect events, but not the SQL statements users execute while connected). To achieve this, define a filter (shown here named log_conn_events) that enables logging only of events in the connection class, and assign that filter to the default account, represented by the \% account name:
```
SET @f = '{ "filter": { "class": { "name": "connection" } } }';
SELECT audit_log_filter_set_filter('log_conn_events', @f);
SELECT audit_log_filter_set_user('%', 'log_conn_events');
```


Now the audit log uses this default account filter for connections from any account that has no explicitly defined filter.

To assign a filter explicitly to a particular user account or accounts, define the filter, then assign it to the relevant accounts:
```
SELECT audit_log_filter_set_filter('log_all', '{ "filter": { "log": true } }');
SELECT audit_log_filter_set_user('user1@localhost', 'log_all');
SELECT audit_log_filter_set_user('user2@localhost', 'log_all');
```


Now full logging is enabled for user1@localhost and user2@localhost. Connections from other accounts continue to be filtered using the default account filter.

To disassociate a user account from its current filter, either unassign the filter or assign a different filter:
- To unassign the filter from the user account:
```
SELECT audit_log_filter_remove_user('user1@localhost');
```


Filtering of current sessions for the account remains unaffected. Subsequent connections from the account are filtered using the default account filter if there is one, and are not logged otherwise.
- To assign a different filter to the user account:
```
SELECT audit_log_filter_set_filter('log_nothing', '{ "filter": { "log": false } }');
SELECT audit_log_filter_set_user('user1@localhost', 'log_nothing');
```


Filtering of current sessions for the account remains unaffected. Subsequent connections from the account are filtered using the new filter. For the filter shown here, that means no logging for new connections from user1@localhost.

For audit log filtering, user name and host name comparisons are case-sensitive. This differs from comparisons for privilege checking, for which host name comparisons are not case-sensitive.

To remove a filter, do this:
```
SELECT audit_log_filter_remove_filter('log_nothing');
```


Removing a filter also unassigns it from any users to whom it is assigned, including any current sessions for those users.

The filtering functions just described affect audit filtering immediately and update the audit log tables in the mysql system database that store filters and user accounts (see Audit Log Tables). It is also possible to modify the audit log tables directly using statements such as INSERT, UPDATE, and DELETE, but such changes do not affect filtering immediately. To flush your changes and make them operational, call audit_log_filter_flush( ):
```
SELECT audit_log_filter_flush();
```


\section*{Warning}
audit_log_filter_flush() should be used only after modifying the audit tables directly, to force reloading all filters. Otherwise, this function should be avoided. It is, in effect, a simplified version of unloading and reloading the audit_log plugin with UNINSTALL PLUGIN plus INSTALL PLUGIN.
audit_log_filter_flush() affects all current sessions and detaches them from their previous filters. Current sessions are no longer logged unless they disconnect and reconnect, or execute a change-user operation.

To determine whether a filter is assigned to the current session, check the session value of the readonly audit_log_filter_id system variable. If the value is 0 , no filter is assigned. A nonzero value indicates the internally maintained ID of the assigned filter:
```
mysql> SELECT @@audit_log_filter_id;
+-------------------------+
| @@audit_log_filter_id |
+------------------------+
| 2 |
+-------------------------+
```


\subsection*{8.4.5.8 Writing Audit Log Filter Definitions}

Filter definitions are JSON values. For information about using JSON data in MySQL, see Section 13.5, "The JSON Data Type".

Filter definitions have this form, where actions indicates how filtering takes place:
```
{ "filter": actions }
```


The following discussion describes permitted constructs in filter definitions.
- Logging All Events
- Logging Specific Event Classes
- Logging Specific Event Subclasses
- Inclusive and Exclusive Logging
- Testing Event Field Values
- Blocking Execution of Specific Events
- Logical Operators
- Referencing Predefined Variables
- Referencing Predefined Functions
- Replacement of Event Field Values
- Replacing a User Filter

\section*{Logging All Events}

To explicitly enable or disable logging of all events, use a log item in the filter:
```
{
    "filter": { "log": true }
}
```


The log value can be either true or false.
The preceding filter enables logging of all events. It is equivalent to:
```
{
    "filter": { }
}
```


Logging behavior depends on the log value and whether class or event items are specified:
- With log specified, its given value is used.
- Without log specified, logging is true if no class or event item is specified, and false otherwise (in which case, class or event can include their own log item).

\section*{Logging Specific Event Classes}

To log events of a specific class, use a class item in the filter, with its name field denoting the name of the class to log:
```
{
    "filter": {
        "class": { "name": "connection" }
    }
}
```


The name value can be connection, general, or table_access to log connection, general, or table-access events, respectively.

The preceding filter enables logging of events in the connection class. It is equivalent to the following filter with log items made explicit:
```
{
    "filter": {
        "log": false,
        "class": { "log": true,
                "name": "connection" }
    }
}
```


To enable logging of multiple classes, define the class value as a JSON array element that names the classes:
```
{
    "filter": {
        "class": [
            { "name": "connection" },
            { "name": "general" },
            { "name": "table_access" }
        ]
    }
}
```


\section*{Note}

When multiple instances of a given item appear at the same level within a filter definition, the item values can be combined into a single instance of that item within an array value. The preceding definition can be written like this:
```
{
    "filter": {
        "class": [
            { "name": [ "connection", "general", "table_access" ] }
        ]
    }
}
```


\section*{Logging Specific Event Subclasses}

To select specific event subclasses, use an event item containing a name item that names the subclasses. The default action for events selected by an event item is to log them. For example, this filter enables logging for the named event subclasses:
```
{
    "filter": {
        "class": [
            {
                "name": "connection",
                "event": [
                    { "name": "connect" },
                    { "name": "disconnect" }
                ]
            },
            { "name": "general" },
            {
                "name": "table_access",
                "event": [
                    { "name": "insert" },
                    { "name": "delete" },
                    { "name": "update" }
                ]
            }
        ]
    }
}
```


The event item can also contain explicit log items to indicate whether to log qualifying events. This event item selects multiple events and explicitly indicates logging behavior for them:
```
"event": [
    { "name": "read", "log": false },
    { "name": "insert", "log": true },
    { "name": "delete", "log": true },
    { "name": "update", "log": true }
]
```


The event item can also indicate whether to block qualifying events, if it contains an abort item. For details, see Blocking Execution of Specific Events.

Table 8.34, "Event Class and Subclass Combinations" describes the permitted subclass values for
each event class.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.34 Event Class and Subclass Combinations}
\begin{tabular}{|l|l|l|}
\hline Event Class & Event Subclass & Description \\
\hline connection & connect & Connection initiation (successful or unsuccessful) \\
\hline connection & change_user & User re-authentication with different user/password during session \\
\hline connection & disconnect & Connection termination \\
\hline general & status & General operation information \\
\hline message & internal & Internally generated message \\
\hline message & user & Message generated by audit_api_message_emit_udf() \\
\hline table_access & read & Table read statements, such as SELECT or INSERT INTO ... SELECT \\
\hline table_access & delete & Table delete statements, such as DELETE or TRUNCATE TABLE \\
\hline table_access & insert & Table insert statements, such as INSERT or REPLACE \\
\hline table_access & update & Table update statements, such as UPDATE \\
\hline
\end{tabular}
\end{table}

Table 8.35, "Log and Abort Characteristics Per Event Class and Subclass Combination" describes for each event subclass whether it can be logged or aborted.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.35 Log and Abort Characteristics Per Event Class and Subclass Combination}
\begin{tabular}{|l|l|l|l|}
\hline Event Class & Event Subclass & Can be Logged & Can be Aborted \\
\hline connection & connect & Yes & No \\
\hline connection & change_user & Yes & No \\
\hline connection & disconnect & Yes & No \\
\hline general & status & Yes & No \\
\hline message & internal & Yes & Yes \\
\hline message & user & Yes & Yes \\
\hline table_access & read & Yes & Yes \\
\hline table_access & delete & Yes & Yes \\
\hline table_access & insert & Yes & Yes \\
\hline table_access & update & Yes & Yes \\
\hline
\end{tabular}
\end{table}

\section*{Inclusive and Exclusive Logging}

A filter can be defined in inclusive or exclusive mode:
- Inclusive mode logs only explicitly specified items.
- Exclusive mode logs everything but explicitly specified items.

To perform inclusive logging, disable logging globally and enable logging for specific classes. This filter logs connect and disconnect events in the connection class, and events in the general class:
```
{
    "filter": {
        "log": false,
        "class": [
            {
                "name": "connection",
                "event": [
                    { "name": "connect", "log": true },
                    { "name": "disconnect", "log": true }
                ]
            },
            { "name": "general", "log": true }
        ]
    }
}
```


To perform exclusive logging, enable logging globally and disable logging for specific classes. This filter logs everything except events in the general class:
```
{
    "filter": {
        "log": true,
        "class":
            { "name": "general", "log": false }
    }
}
```


This filter logs change_user events in the connection class, message events, and table_access events, by virtue of not logging everything else:
```
{
    "filter": {
        "log": true,
        "class": [
```

```
                "name": "connection",
                "event": [
                    { "name": "connect", "log": false },
                    { "name": "disconnect", "log": false }
                ]
            },
            { "name": "general", "log": false }
        ]
    }
}
```


\section*{Testing Event Field Values}

To enable logging based on specific event field values, specify a field item within the log item that indicates the field name and its expected value:
```
{
    "filter": {
        "class": {
        "name": "general",
            "event": {
                "name": "status",
                "log": {
                    "field": { "name": "general_command.str", "value": "Query" }
                }
            }
        }
    }
}
```


Each event contains event class-specific fields that can be accessed from within a filter to perform custom filtering.

An event in the connection class indicates when a connection-related activity occurs during a session, such as a user connecting to or disconnecting from the server. Table 8.36, "Connection Event Fields" indicates the permitted fields for connection events.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.36 Connection Event Fields}
\begin{tabular}{|l|l|l|}
\hline Field Name & Field Type & Description \\
\hline status & integer & \begin{tabular}{l}
Event status: \\
0: OK \\
Otherwise: Failed
\end{tabular} \\
\hline connection_id & unsigned integer & Connection ID \\
\hline user.str & string & User name specified during authentication \\
\hline user.length & unsigned integer & User name length \\
\hline priv_user.str & string & Authenticated user name (account user name) \\
\hline priv_user.length & unsigned integer & Authenticated user name length \\
\hline external_user.str & string & External user name (provided by third-party authentication plugin) \\
\hline external_user.length & unsigned integer & External user name length \\
\hline proxy_user.str & string & Proxy user name \\
\hline proxy_user.length & unsigned integer & Proxy user name length \\
\hline host.str & string & Connected user host \\
\hline host.length & unsigned integer & Connected user host length \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Field Name & Field Type & Description \\
\hline ip.str & string & Connected user IP address \\
\hline ip.length & unsigned integer & Connected user IP address length \\
\hline database.str & string & Database name specified at connect time \\
\hline database.length & unsigned integer & Database name length \\
\hline connection_type & integer & \begin{tabular}{l}
Connection type: \\
0 or "::undefined": \\
Undefined \\
1 or ": : tcp/ip": TCP/IP \\
2 or ": :socket": Socket \\
3 or ": :named_pipe": Named pipe \\
4 or ": :ssl": TCP/IP with encryption \\
5 or ": :shared_memory": Shared memory
\end{tabular} \\
\hline
\end{tabular}

The " : : $x x x$ " values are symbolic pseudo-constants that may be given instead of the literal numeric values. They must be quoted as strings and are case-sensitive.

An event in the general class indicates the status code of an operation and its details. Table 8.37, "General Event Fields" indicates the permitted fields for general events.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.37 General Event Fields}
\begin{tabular}{|l|l|l|}
\hline Field Name & Field Type & Description \\
\hline general_error_code & integer & \begin{tabular}{l}
Event status: \\
0: OK \\
Otherwise: Failed
\end{tabular} \\
\hline general_thread_id & unsigned integer & Connection/thread ID \\
\hline general_user.str & string & User name specified during authentication \\
\hline general_user.length & unsigned integer & User name length \\
\hline general_command.str & string & Command name \\
\hline general_command.length & unsigned integer & Command name length \\
\hline general_query.str & string & SQL statement text \\
\hline general_query.length & unsigned integer & SQL statement text length \\
\hline general_host.str & string & Host name \\
\hline general_host.length & unsigned integer & Host name length \\
\hline general_sql_command.str & string & SQL command type name \\
\hline general_sql_command.lengt & |unsigned integer & SQL command type name length \\
\hline general_external_user.str & string & External user name (provided by third-party authentication plugin) \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Field Name & Field Type & Description \\
\hline general_external_user.len & gunsigned integer & External user name length \\
\hline general_ip.str & string & Connected user IP address \\
\hline general_ip.length & unsigned integer & Connection user IP address length \\
\hline
\end{tabular}
general_command.str indicates a command name: Query, Execute, Quit, or Change user.
A general event with the general_command.str field set to Query or Execute contains general_sql_command.str set to a value that specifies the type of SQL command: alter_db, alter_db_upgrade, admin_commands, and so forth. The available general_sql_command.str values can be seen as the last components of the Performance Schema instruments displayed by this statement:
```
mysql> SELECT NAME FROM performance_schema.setup_instruments
    WHERE NAME LIKE 'statement/sql/%' ORDER BY NAME;
+----------------------------------------+
| NAME |
+-----------------------------------------+
| statement/sql/alter_db
| statement/sql/alter_db_upgrade
| statement/sql/alter_event
| statement/sql/alter_function
| statement/sql/alter_instance
| statement/sql/alter_procedure
| statement/sql/alter_server
...
```


An event in the table_access class provides information about a specific type of access to a table. Table 8.38, "Table-Access Event Fields" indicates the permitted fields for table_access events.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.38 Table-Access Event Fields}
\begin{tabular}{|l|l|l|}
\hline Field Name & Field Type & Description \\
\hline connection_id & unsigned integer & Event connection ID \\
\hline sql_command_id & integer & SQL command ID \\
\hline query.str & string & SQL statement text \\
\hline query.length & unsigned integer & SQL statement text length \\
\hline table_database.str & string & Database name associated with event \\
\hline table_database.length & unsigned integer & Database name length \\
\hline table_name.str & string & Table name associated with event \\
\hline table_name.length & unsigned integer & Table name length \\
\hline
\end{tabular}
\end{table}

The following list shows which statements produce which table-access events:
- read event:
- SELECT
- INSERT ... SELECT (for tables referenced in SELECT clause)
- REPLACE ... SELECT (for tables referenced in SELECT clause)
- UPDATE ... WHERE (for tables referenced in WHERE clause)
- HANDLER ... READ
- delete event:
- DELETE
- TRUNCATE TABLE
- insert event:
- INSERT
- INSERT ... SELECT (for table referenced in INSERT clause)
- REPLACE
- REPLACE ... SELECT (for table referenced in REPLACE clause
- LOAD DATA
- LOAD XML
- update event:
- UPDATE
- UPDATE ... WHERE (for tables referenced in UPDATE clause)

\section*{Blocking Execution of Specific Events}
event items can include an abort item that indicates whether to prevent qualifying events from executing. abort enables rules to be written that block execution of specific SQL statements.

\section*{Important}

It is theoretically possible for a user with sufficient permissions to mistakenly create an abort item in the audit log filter that prevents themselves and other administrators from accessing the system. The AUDIT_ABORT_EXEMPT privilege is available to permit a user account's queries to always be executed even if an abort item would block them. Accounts with this privilege can therefore be used to regain access to a system following an audit misconfiguration. The query is still logged in the audit log, but instead of being rejected, it is permitted due to the privilege.

Accounts created with the SYSTEM_USER privilege have the AUDIT_ABORT_EXEMPT privilege assigned automatically when they are created. The AUDIT_ABORT_EXEMPT privilege is also assigned to existing accounts with the SYSTEM_USER privilege when you carry out an upgrade procedure, if no existing accounts have that privilege assigned.

The abort item must appear within an event item. For example:
```
"event": {
    "name": qualifying event subclass names
    "abort": condition
}
```


For event subclasses selected by the name item, the abort action is true or false, depending on condition evaluation. If the condition evaluates to true, the event is blocked. Otherwise, the event continues executing.

The condition specification can be as simple as true or false, or it can be more complex such that evaluation depends on event characteristics.

This filter blocks INSERT, UPDATE, and DELETE statements:
```
{
    "filter": {
        "class": {
            "name": "table_access",
            "event": {
                "name": [ "insert", "update", "delete" ],
                "abort": true
            }
        }
    }
}
```


This more complex filter blocks the same statements, but only for a specific table (finances.bank_account):
```
{
    "filter": {
        "class": {
            "name": "table_access",
            "event": {
                "name": [ "insert", "update", "delete" ],
                "abort": {
                    "and": [
                        { "field": { "name": "table_database.str", "value": "finances" } },
                        { "field": { "name": "table_name.str", "value": "bank_account" } }
                    ]
                }
            }
        }
    }
}
```


Statements matched and blocked by the filter return an error to the client:
```
ERROR 1045 (28000): Statement was aborted by an audit log filter
```


Not all events can be blocked (see Table 8.35, "Log and Abort Characteristics Per Event Class and Subclass Combination"). For an event that cannot be blocked, the audit log writes a warning to the error log rather than blocking it.

For attempts to define a filter in which the abort item appears elsewhere than in an event item, an error occurs.

\section*{Logical Operators}

Logical operators (and, or, not) permit construction of complex conditions, enabling more advanced filtering configurations to be written. The following log item logs only general events with general_command fields having a specific value and length:
```
{
    "filter": {
        "class": {
            "name": "general",
            "event": {
                "name": "status",
                "log": {
                    "or": [
                        {
                            "and": [
                                { "field": { "name": "general_command.str", "value": "Query" } },
                                { "field": { "name": "general_command.length", "value": 5 } }
                            ]
                        },
                        {
                            "and": [
                                { "field": { "name": "general_command.str", "value": "Execute" } },
                                { "field": { "name": "general_command.length", "value": 7 } }
                            ]
                        }
```

```
                    ]
                }
            }
        }
    }
}
```


\section*{Referencing Predefined Variables}

To refer to a predefined variable in a log condition, use a variable item, which takes name and value items and tests equality of the named variable against a given value:
```
"variable": {
    "name": "variable_name",
    "value": comparison_value
}
```


This is true if variable_name has the value comparison_value, false otherwise.
Example:
```
{
    "filter": {
        "class": {
            "name": "general",
            "event": {
                "name": "status",
                "log": {
                    "variable": {
                        "name": "audit_log_connection_policy_value",
                        "value": "::none"
                    }
                }
            }
        }
    }
}
```


Each predefined variable corresponds to a system variable. By writing a filter that tests a predefined variable, you can modify filter operation by setting the corresponding system variable, without having to redefine the filter. For example, by writing a filter that tests the value of the audit_log_connection_policy_value predefined variable, you can modify filter operation by changing the value of the audit_log_connection_policy system variable.

The audit_log_xxx_policy system variables are used for the deprecated legacy mode audit log (see Section 8.4.5.10, "Legacy Mode Audit Log Filtering"). With rule-based audit log filtering, those variables remain visible (for example, using SHOW VARIABLES), but changes to them have no effect unless you write filters containing constructs that refer to them.

The following list describes the permitted predefined variables for variable items:
- audit_log_connection_policy_value

This variable corresponds to the value of the audit_log_connection_policy system variable. The value is an unsigned integer. Table 8.39, "audit_log_connection_policy_value Values" shows the permitted values and the corresponding audit_log_connection_policy values.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.39 audit_log_connection_policy_value Values}
\begin{tabular}{|l|l|}
\hline Value & Corresponding audit_log_connection_policy Value \\
\hline 0 or ": :none" & NONE \\
\hline 1 or ": :errors" & ERRORS \\
\hline 2 or "::all" & ALL \\
\hline
\end{tabular}
\end{table}

The " : : $x x x$ " values are symbolic pseudo-constants that may be given instead of the literal numeric values. They must be quoted as strings and are case-sensitive.
- audit_log_policy_value

This variable corresponds to the value of the audit_log_policy system variable. The value is an unsigned integer. Table 8.40, "audit_log_policy_value Values" shows the permitted values and the corresponding audit_log_policy values.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.40 audit_log_policy_value Values}
\begin{tabular}{|l|l|}
\hline Value & Corresponding audit_log_policy Value \\
\hline 0 or ": :none" & NONE \\
\hline 1 or ": :logins" & LOGINS \\
\hline 2 or "::all" & ALL \\
\hline 3 or ": :queries" & QUERIES \\
\hline
\end{tabular}
\end{table}

The " : : $x x x$ " values are symbolic pseudo-constants that may be given instead of the literal numeric values. They must be quoted as strings and are case-sensitive.
- audit_log_statement_policy_value

This variable corresponds to the value of the audit_log_statement_policy system variable. The value is an unsigned integer. Table 8.41, "audit_log_statement_policy_value Values" shows the permitted values and the corresponding audit_log_statement_policy values.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.41 audit_log_statement_policy_value Values}
\begin{tabular}{|l|l|}
\hline Value & Corresponding audit_log_statement_policy Value \\
\hline 0 or ": :none" & NONE \\
\hline 1 or ": :errors" & ERRORS \\
\hline 2 or "::all" & ALL \\
\hline
\end{tabular}
\end{table}

The ": : $x x x$ " values are symbolic pseudo-constants that may be given instead of the literal numeric values. They must be quoted as strings and are case-sensitive.

\section*{Referencing Predefined Functions}

To refer to a predefined function in a log condition, use a function item, which takes name and args items to specify the function name and its arguments, respectively:
```
"function": {
    "name": "function_name",
    "args": arguments
}
```


The name item should specify the function name only, without parentheses or the argument list.
The args item must satisfy these conditions:
- If the function takes no arguments, no args item should be given.
- If the function does take arguments, an args item is needed, and the arguments must be given in the order listed in the function description. Arguments can refer to predefined variables, event fields, or string or numeric constants.

If the number of arguments is incorrect or the arguments are not of the correct data types required by the function an error occurs.

Example:
```
{
    "filter": {
        "class": {
            "name": "general",
            "event": {
                "name": "status",
                "log": {
                    "function": {
                        "name": "find_in_include_list",
                        "args": [ { "string": [ { "field": "user.str" },
                            { "string": "@"},
                            { "field": "host.str" } ] } ]
                    }
                }
            }
        }
    }
}
```


The preceding filter determines whether to log general class status events depending on whether the current user is found in the audit_log_include_accounts system variable. That user is constructed using fields in the event.

The following list describes the permitted predefined functions for function items:
- audit_log_exclude_accounts_is_null()

Checks whether the audit_log_exclude_accounts system variable is NULL. This function can be helpful when defining filters that correspond to the legacy audit log implementation.

Arguments:
None.
- audit_log_include_accounts_is_null()

Checks whether the audit_log_include_accounts system variable is NULL. This function can be helpful when defining filters that correspond to the legacy audit log implementation.

Arguments:
None.
- debug_sleep(millisec)

Sleeps for the given number of milliseconds. This function is used during performance measurement.
debug_sleep( ) is available for debug builds only.
Arguments:
- millisec: An unsigned integer that specifies the number of milliseconds to sleep.
- find_in_exclude_list(account)

Checks whether an account string exists in the audit log exclude list (the value of the audit_log_exclude_accounts system variable).

Arguments:
- account: A string that specifies the user account name.
- find_in_include_list(account)

Checks whether an account string exists in the audit log include list (the value of the audit_log_include_accounts system variable).

Arguments:
- account: A string that specifies the user account name.
- query_digest([str])

This function has differing behavior depending on whether an argument is given:
- With no argument, query_digest returns the statement digest value corresponding to the statement literal text in the current event.
- With an argument, query_digest returns a Boolean indicating whether the argument is equal to the current statement digest.

Arguments:
- str: This argument is optional. If given, it specifies a statement digest to be compared against the digest for the statement in the current event.

Examples:
This function item includes no argument, so query_digest returns the current statement digest as a string:
```
"function": {
    "name": "query_digest"
}
```


This function item includes an argument, so query_digest returns a Boolean indicating whether the argument equals the current statement digest:
```
"function": {
    "name": "query_digest",
    "args": "SELECT ?"
}
```

- string_find(text, substr)

Checks whether the substr value is contained in the text value. This search is case-sensitive.
Arguments:
- text: The text string to search.
- substr: The substring to search for in text.

\section*{Replacement of Event Field Values}

Audit filter definitions support replacement of certain audit event fields, so that logged events contain the replacement value rather than the original value. This capability enables logged audit records to include statement digests rather than literal statements, which can be useful for MySQL deployments for which statements may expose sensitive values.

Field replacement in audit events works like this:
- Field replacements are specified in audit filter definitions, so audit log filtering must be enabled as described in Section 8.4.5.7, "Audit Log Filtering".
- Not all fields can be replaced. Table 8.42 , "Event Fields Subject to Replacement" shows which fields are replaceable in which event classes.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.42 Event Fields Subject to Replacement}
\begin{tabular}{|l|l|}
\hline Event Class & Field Name \\
\hline general & general_query.str \\
\hline table_access & query.str \\
\hline
\end{tabular}
\end{table}
- Replacement is conditional. Each replacement specification in a filter definition includes a condition, enabling a replaceable field to be changed, or left unchanged, depending on the condition result.
- If replacement occurs, the replacement specification indicates the replacement value using a function that is permitted for that purpose.

As Table 8.42, "Event Fields Subject to Replacement" shows, currently the only replaceable fields are those that contain statement text (which occurs in events of the general and table_access classes). In addition, the only function permitted for specifying the replacement value is query_digest. This means that the only permitted replacement operation is to replace statement literal text by its corresponding digest.

Because field replacement occurs at an early auditing stage (during filtering), the choice of whether to write statement literal text or digest values applies regardless of log format written later (that is, whether the audit log plugin produces XML or JSON output).

Field replacement can take place at differing levels of event granularity:
- To perform field replacement for all events in a class, filter events at the class level.
- To perform replacement on a more fine-grained basis, include additional event-selection items. For example, you can perform field replacement only for specific subclasses of a given event class, or only in events for which fields have certain characteristics.

Within a filter definition, specify field replacement by including a print item, which has this syntax:
```
"print": {
    "field": {
        "name": "field_name",
        "print": condition,
        "replace": replacement_value
    }
}
```


Within the print item, its field item takes these three items to indicate how whether and how replacement occurs:
- name: The field for which replacement (potentially) occurs. field_name must be one of those shown in Table 8.42, "Event Fields Subject to Replacement".
- print: The condition that determines whether to retain the original field value or replace it:
- If condition evaluates to true, the field remains unchanged.
- If condition evaluates to false, replacement occurs, using the value of the replace item.

To unconditionally replace a field, specify the condition like this:
```
"print": false
```

- replace: The replacement value to use when the print condition evaluates to false. Specify replacement_value using a function item.

For example, this filter definition applies to all events in the general class, replacing the statement literal text with its digest:
```
{
```

```
    "filter": {
        "class": {
            "name": "general",
            "print": {
                "field": {
                    "name": "general_query.str",
                    "print": false,
                    "replace": {
                        "function": {
                            "name": "query_digest"
                        }
                    }
                }
            }
        }
    }
}
```


The preceding filter uses this print item to unconditionally replace the statement literal text contained in general_query.str by its digest value:
```
"print": {
    "field": {
        "name": "general_query.str",
        "print": false,
        "replace": {
            "function": {
                "name": "query_digest"
            }
        }
    }
}
```

print items can be written different ways to implement different replacement strategies. The replace item just shown specifies the replacement text using this function construct to return a string representing the current statement digest:
```
"function": {
    "name": "query_digest"
}
```


The query_digest function can also be used in another way, as a comparator that returns a Boolean, which enables its use in the print condition. To do this, provide an argument that specifies a comparison statement digest:
```
"function": {
    "name": "query_digest",
    "args": "digest"
}
```


In this case, query_digest returns true or false depending on whether the current statement digest is the same as the comparison digest. Using query_digest this way enables filter definitions to detect statements that match particular digests. The condition in the following construct is true only for statements that have a digest equal to SELECT ?, thus effecting replacement only for statements that do not match the digest:
```
"print": {
    "field": {
        "name": "general_query.str",
        "print": {
            "function": {
                "name": "query_digest",
                "args": "SELECT ?"
            }
        },
        "replace": {
            "function": {
                "name": "query_digest"
            }
```

```
        }
    }
}
```


To perform replacement only for statements that do match the digest, use not to invert the condition:
```
"print": {
    "field": {
        "name": "general_query.str",
        "print": {
            "not": {
                "function": {
                    "name": "query_digest",
                    "args": "SELECT ?"
                }
            }
        },
        "replace": {
            "function": {
                "name": "query_digest"
            }
        }
    }
}
```


Suppose that you want the audit log to contain only statement digests and not literal statements. To achieve this, you must perform replacement on all events that contain statement text; that is, events in the general and table_access classes. An earlier filter definition showed how to unconditionally replace statement text for general events. To do the same for table_access events, use a filter that is similar but changes the class from general to table_access and the field name from general_query.str to query.str:
```
{
    "filter": {
        "class": {
            "name": "table_access",
            "print": {
                "field": {
                    "name": "query.str",
                    "print": false,
                    "replace": {
                        "function": {
                            "name": "query_digest"
                        }
                    }
                }
            }
        }
    }
}
```


Combining the general and table_access filters results in a single filter that performs replacement for all statement text-containing events:
```
{
    "filter": {
        "class": [
            {
                "name": "general",
                "print": {
                    "field": {
                        "name": "general_query.str",
                        "print": false,
                        "replace": {
                            "function": {
                                "name": "query_digest"
                            }
                        }
                    }
                }
```

```
            },
            {
                "name": "table_access",
                "print": {
                    "field": {
                        "name": "query.str",
                        "print": false,
                        "replace": {
                            "function": {
                                "name": "query_digest"
                            }
                        }
                    }
                }
            }
        ]
    }
}
```


To perform replacement on only some events within a class, add items to the filter that indicate more specifically when replacement occurs. The following filter applies to events in the table_access class, but performs replacement only for insert and update events (leaving read and delete events unchanged):
```
{
    "filter": {
        "class": {
            "name": "table_access",
            "event": {
                "name": [
                    "insert",
                    "update"
                ],
                "print": {
                    "field": {
                        "name": "query.str",
                        "print": false,
                        "replace": {
                            "function": {
                                "name": "query_digest"
                            }
                        }
                    }
                }
            }
        }
    }
}
```


This filter performs replacement for general class events corresponding to the listed accountmanagement statements (the effect being to hide credential and data values in the statements):
```
{
    "filter": {
        "class": {
            "name": "general",
            "event": {
                "name": "status",
                "print": {
                    "field": {
                        "name": "general_query.str",
                        "print": false,
                        "replace": {
                            "function": {
                                "name": "query_digest"
                            }
                        }
                    }
                },
                "log": {
                    "or": [
```

```
                        "field": {
                            "name": "general_sql_command.str",
                                "value": "alter_user"
                            }
                        },
                        {
                            "field": {
                                "name": "general_sql_command.str",
                                "value": "alter_user_default_role"
                            }
                        },
                        {
                            "field": {
                                "name": "general_sql_command.str",
                                "value": "create_role"
                            }
                        },
                        {
                            "field": {
                                "name": "general_sql_command.str",
                                "value": "create_user"
                            }
                        }
                    ]
                }
            }
        }
    }
}
```


For information about the possible general_sql_command.str values, see Testing Event Field Values.

\section*{Replacing a User Filter}

In some cases, the filter definition can be changed dynamically. To do this, define a filter configuration within an existing filter. For example:
```
{
    "filter": {
        "id": "main",
        "class": {
            "name": "table_access",
            "event": {
                "name": [ "update", "delete" ],
                "log": false,
                "filter": {
                    "class": {
                        "name": "general",
                        "event" : { "name": "status",
                                "filter": { "ref": "main" } }
                    },
                    "activate": {
                        "or": [
                            { "field": { "name": "table_name.str", "value": "temp_1" } },
                            { "field": { "name": "table_name.str", "value": "temp_2" } }
                        ]
                    }
                }
            }
        }
    }
}
```


A new filter is activated when the activate item within a subfilter evaluates to true. Using activate in a top-level filter is not permitted.

A new filter can be replaced with the original one by using a ref item inside the subfilter to refer to the original filter id.

The filter shown operates like this:
- The main filter waits for table_access events, either update or delete.
- If the update or delete table_access event occurs on the temp_1 or temp_2 table, the filter is replaced with the internal one (without an id, since there is no need to refer to it explicitly).
- If the end of the command is signalled (general / status event), an entry is written to the audit log file and the filter is replaced with the main filter.

The filter is useful to log statements that update or delete anything from the temp_1 or temp_2 tables, such as this one:

UPDATE temp_1, temp_3 SET temp_1.a=21, temp_3.a=23;
The statement generates multiple table_access events, but the audit log file contains only general I status entries.

\section*{Note}

Any id values used in the definition are evaluated with respect only to that definition. They have nothing to do with the value of the audit_log_filter_id system variable.

\subsection*{8.4.5.9 Disabling Audit Logging}

The audit_log_disable variable permits disabling audit logging for all connecting and connected sessions. The audit_log_disable variable can be set in a MySQL Server option file, in a command-line startup string, or at runtime using a SET statement; for example:

SET GLOBAL audit_log_disable = true;
Setting audit_log_disable to true disables the audit log plugin. The plugin is re-enabled when audit_log_disable is set back to false, which is the default setting.

Starting the audit log plugin with audit_log_disable = true generates a warning (ER_WARN_AUDIT_LOG_DISABLED) with the following message: Audit Log is disabled. Enable it with audit_log_disable = false. Setting audit_log_disable to false also generates warning. When audit_log_disable is set to true, audit log function calls and variable changes generate a session warning.

Setting the runtime value of audit_log_disable requires the AUDIT_ADMIN privilege, in addition to the SYSTEM_VARIABLES_ADMIN privilege (or the deprecated SUPER privilege) normally required to set a global system variable runtime value.

\subsection*{8.4.5.10 Legacy Mode Audit Log Filtering}

\section*{Note}

This section describes legacy audit log filtering, which applies if the audit_log plugin is installed without the accompanying audit tables and functions needed for rule-based filtering.

Legacy Mode Audit Log Filtering is deprecated.
The audit log plugin can filter audited events. This enables you to control whether audited events are written to the audit log file based on the account from which events originate or event status. Status filtering occurs separately for connection events and statement events.
- Legacy Event Filtering by Account
- Legacy Event Filtering by Status

\section*{Legacy Event Filtering by Account}

To filter audited events based on the originating account, set one (not both) of the following system variables at server startup or runtime. These deprecated variables apply only for legacy audit log filtering.
- audit_log_include_accounts: The accounts to include in audit logging. If this variable is set, only these accounts are audited.
- audit_log_exclude_accounts: The accounts to exclude from audit logging. If this variable is set, all but these accounts are audited.

The value for either variable can be NULL or a string containing one or more comma-separated account names, each in user_name@host_name format. By default, both variables are NULL, in which case, no account filtering is done and auditing occurs for all accounts.

Modifications to audit_log_include_accounts or audit_log_exclude_accounts affect only connections created subsequent to the modification, not existing connections.

Example: To enable audit logging only for the user1 and user2 local host accounts, set the audit_log_include_accounts system variable like this:

SET GLOBAL audit_log_include_accounts = 'user1@localhost,user2@localhost';
Only one of audit_log_include_accounts or audit_log_exclude_accounts can be non-NULL at a time:
- If you set audit_log_include_accounts, the server sets audit_log_exclude_accounts to NULL.
- If you attempt to set audit_log_exclude_accounts, an error occurs unless audit_log_include_accounts is NULL. In this case, you must first clear audit_log_include_accounts by setting it to NULL.
```
-- This sets audit_log_exclude_accounts to NULL
SET GLOBAL audit_log_include_accounts = value;
-- This fails because audit_log_include_accounts is not NULL
SET GLOBAL audit_log_exclude_accounts = value;
-- To set audit_log_exclude_accounts, first set
-- audit_log_include_accounts to NULL
SET GLOBAL audit_log_include_accounts = NULL;
SET GLOBAL audit_log_exclude_accounts = value;
```


If you inspect the value of either variable, be aware that SHOW VARIABLES displays NULL as an empty string. To display NULL as NULL, use SELECT instead:
```
mysql> SHOW VARIABLES LIKE 'audit_log_include_accounts';
+------------------------------+-------+
| Variable_name | Value |
+------------------------------+-------+
| audit_log_include_accounts | |
+-----------------------------+-------+
mysql> SELECT @@audit_log_include_accounts;
+-------------------------------+
| @@audit_log_include_accounts |
+-------------------------------+
| NULL |
+-------------------------------+
```


If a user name or host name requires quoting because it contains a comma, space, or other special character, quote it using single quotes. If the variable value itself is quoted with single quotes, double each inner single quote or escape it with a backslash. The following statements each enable audit logging for the local root account and are equivalent, even though the quoting styles differ:
```
SET GLOBAL audit_log_include_accounts = 'root@localhost';
SET GLOBAL audit_log_include_accounts = '''root''@''localhost''';
SET GLOBAL audit_log_include_accounts = '\'root\'@\'localhost\'';
SET GLOBAL audit_log_include_accounts = "'root'@'localhost'";
```


The last statement does not work if the ANSI_QUOTES SQL mode is enabled because in that mode double quotes signify identifier quoting, not string quoting.

\section*{Legacy Event Filtering by Status}

To filter audited events based on status, set the following system variables at server startup or runtime. These deprecated variables apply only for legacy audit log filtering. For JSON audit log filtering, different status variables apply; see Audit Log Options and Variables.
- audit_log_connection_policy: Logging policy for connection events
- audit_log_statement_policy: Logging policy for statement events

Each variable takes a value of ALL (log all associated events; this is the default), ERRORS (log only failed events), or NONE (do not log events). For example, to log all statement events but only failed connection events, use these settings:
```
SET GLOBAL audit_log_statement_policy = ALL;
SET GLOBAL audit_log_connection_policy = ERRORS;
```


Another policy system variable, audit_log_policy, is available but does not afford as much control as audit_log_connection_policy and audit_log_statement_policy. It can be set only at server startup.

\section*{Note}

The audit_log_policy legacy-mode system variable is deprecated.

At runtime, it is a read-only variable. It takes a value of ALL (log all events; this is the default), LOGINS (log connection events), QUERIES (log statement events), or NONE (do not log events). For any of those values, the audit log plugin logs all selected events without distinction as to success or failure. Use of audit_log_policy at startup works as follows:
- If you do not set audit_log_policy or set it to its default of ALL, any explicit settings for audit_log_connection_policy or audit_log_statement_policy apply as specified. If not specified, they default to ALL.
- If you set audit_log_policy to a non-ALL value, that value takes precedence over and is used to set audit_log_connection_policy and audit_log_statement_policy, as indicated in the following table. If you also set either of those variables to a value other than their default of ALL, the server writes a message to the error log to indicate that their values are being overridden.

\begin{tabular}{|l|l|l|}
\hline Startup audit_log_policy Value & Resulting audit_log_connection_policy Value & Resulting audit_log_statement_policy Value \\
\hline LOGINS & ALL & NONE \\
\hline QUERIES & NONE & ALL \\
\hline NONE & NONE & NONE \\
\hline
\end{tabular}

\subsection*{8.4.5.11 Audit Log Reference}

The following sections provide a reference to MySQL Enterprise Audit elements:
- Audit Log Tables
- Audit Log Functions
- Audit Log Option and Variable Reference
- Audit Log Options and Variables
- Audit Log Status Variables

To install the audit log tables and functions, use the instructions provided in Section 8.4.5.2, "Installing or Uninstalling MySQL Enterprise Audit". Unless those objects are installed, the audit_log plugin operates in (deprecated) legacy mode. See Section 8.4.5.10, "Legacy Mode Audit Log Filtering".

\section*{Audit Log Tables}

MySQL Enterprise Audit uses tables in the mysql system database for persistent storage of filter and user account data. The tables can be accessed only by users who have privileges for that database. To use a different database, set the audit_log_database system variable at server startup. The tables use the InnoDB storage engine.

If these tables are missing, the audit_log plugin operates in (deprecated) legacy mode. See Section 8.4.5.10, "Legacy Mode Audit Log Filtering".

The audit_log_filter table stores filter definitions. The table has these columns:
- NAME

The filter name.
- FILTER

The filter definition associated with the filter name. Definitions are stored as JSON values.
The audit_log_user table stores user account information. The table has these columns:
- USER

The user name part of an account. For an account user1@localhost, the USER part is user1.
- HOST

The host name part of an account. For an account user1@localhost, the HOST part is localhost.
- FILTERNAME

The name of the filter assigned to the account. The filter name associates the account with a filter defined in the audit_log_filter table.

\section*{Audit Log Functions}

This section describes, for each audit log function, its purpose, calling sequence, and return value. For information about the conditions under which these functions can be invoked, see Section 8.4.5.7, "Audit Log Filtering".

Each audit log function returns a string that indicates whether the operation succeeded. OK indicates success. ERROR: message indicates failure.

Audit log functions convert string arguments to utf8mb4 and string return values are utf8mb4 strings. Previously, audit log functions treated string arguments as binary strings (which means they did not distinguish lettercase), and string return values were binary strings.

If an audit log function is invoked from within the mysql client, binary string results display using hexadecimal notation, depending on the value of the --binary-as-hex. For more information about that option, see Section 6.5.1, "mysql - The MySQL Command-Line Client".

To verify installation of audit log functions, use this command:
SELECT * FROM performance_schema.user_defined_functions;
To learn more, see Section 7.7.2, "Obtaining Information About Loadable Functions".
These audit log functions are available:
- audit_log_encryption_password_get([keyring_id])

This function fetches an audit log encryption password from the MySQL keyring, which must be enabled or an error occurs. Any keyring component or plugin can be used; for instructions, see Section 8.4.4, "The MySQL Keyring".

With no argument, the function retrieves the current encryption password as a binary string. An argument may be given to specify which audit log encryption password to retrieve. The argument must be the keyring ID of the current password or an archived password.

For additional information about audit log encryption, see Encrypting Audit Log Files.
Arguments:
keyring_id: This optional argument indicates the keyring ID of the password to retrieve. The maximum permitted length is 766 bytes. If omitted, the function retrieves the current password.

Return value:
The password string for success (up to 766 bytes), or NULL and an error for failure.
Example:
Retrieve the current password:
```
mysql> SELECT audit_log_encryption_password_get();
+---------------------------------------+
| audit_log_encryption_password_get() |
+--------------------------------------+
| secret
+--------- |
```


To retrieve a password by ID, you can determine which audit log keyring IDs exist by querying the Performance Schema keyring_keys table:
```
mysql> SELECT KEY_ID FROM performance_schema.keyring_keys
    WHERE KEY_ID LIKE 'audit_log%'
    ORDER BY KEY_ID;
+-------------------------------+
| KEY_ID |
+-------------------------------+
| audit_log-20190415T152248-1 |
| audit_log-20190415T153507-1 |
| audit_log-20190416T125122-1 |
| audit_log-20190416T141608-1 |
+------------------------------+
mysql> SELECT audit_log_encryption_password_get('audit_log-20190416T125122-1');
+------------------------------------------------------------------------
| audit_log_encryption_password_get('audit_log-20190416T125122-1') |
+---------------------------------------------------------------------
| segreto |
```

- audit_log_encryption_password_set(password)

Sets the current audit log encryption password to the argument and stores the password in the MySQL keyring. The password is stored as a utf8mb4 string. Previously, the password was stored in binary form.

If encryption is enabled, this function performs a log file rotation operation that renames the current log file, and begins a new log file encrypted with the password. The keyring must be enabled or an error occurs. Any keyring component or plugin can be used; for instructions, see Section 8.4.4, "The MySQL Keyring".

For additional information about audit log encryption, see Encrypting Audit Log Files.
Arguments:
password: The password string. The maximum permitted length is 766 bytes.
Return value:
1 for success, 0 for failure.
Example:
```
mysql> SELECT audit_log_encryption_password_set(password);
+-----------------------------------------------
| audit_log_encryption_password_set(password) |
+-----------------------------------------------
| 1 |
+-----------------------------------------------
```

- audit_log_filter_flush()

Calling any of the other filtering functions affects operational audit log filtering immediately and updates the audit log tables. If instead you modify the contents of those tables directly using statements such as INSERT, UPDATE, and DELETE, the changes do not affect filtering immediately. To flush your changes and make them operational, call audit_log_filter_flush().

\section*{Warning}
audit_log_filter_flush() should be used only after modifying the audit tables directly, to force reloading all filters. Otherwise, this function should be avoided. It is, in effect, a simplified version of unloading and reloading the audit_log plugin with UNINSTALL PLUGIN plus INSTALL PLUGIN.
audit_log_filter_flush() affects all current sessions and detaches them from their previous filters. Current sessions are no longer logged unless they disconnect and reconnect, or execute a change-user operation.

If this function fails, an error message is returned and the audit log is disabled until the next successful call to audit_log_filter_flush().

Arguments:
None.
Return value:
A string that indicates whether the operation succeeded. OK indicates success. ERROR: message indicates failure.

Example:
```
mysql> SELECT audit_log_filter_flush();
+---------------------------+
| audit_log_filter_flush() |
+---------------------------+
| OK |
+----------------------------+
```

```
- audit_log_filter_remove_filter(filter_name)
```


Given a filter name, removes the filter from the current set of filters. It is not an error for the filter not to exist.

If a removed filter is assigned to any user accounts, those users stop being filtered (they are removed from the audit_log_user table). Termination of filtering includes any current sessions for those users: They are detached from the filter and no longer logged.

\section*{Arguments:}
- filter_name: A string that specifies the filter name.

\section*{Return value:}

A string that indicates whether the operation succeeded. OK indicates success. ERROR: message indicates failure.

Example:
```
mysql> SELECT audit_log_filter_remove_filter('SomeFilter');
+-----------------------------------------------+
| audit_log_filter_remove_filter('SomeFilter') |
+------------------------------------------------
| OK |
+------------------------------------------------+
```

- audit_log_filter_remove_user(user_name)

Given a user account name, cause the user to be no longer assigned to a filter. It is not an error if the user has no filter assigned. Filtering of current sessions for the user remains unaffected. New connections for the user are filtered using the default account filter if there is one, and are not logged otherwise.

If the name is \%, the function removes the default account filter that is used for any user account that has no explicitly assigned filter.

\section*{Arguments:}
- user_name: The user account name as a string in user_name@host_name format, or \% to represent the default account.

\section*{Return value:}

A string that indicates whether the operation succeeded. OK indicates success. ERROR: message indicates failure.

Example:
```
mysql> SELECT audit_log_filter_remove_user('user1@localhost');
+----------------------------------------------------
| audit_log_filter_remove_user('user1@localhost') |
+-----------------------------------------------------
| OK |
+----------------------------------------------------
```

- audit_log_filter_set_filter(filter_name, definition)

Given a filter name and definition, adds the filter to the current set of filters. If the filter already exists and is used by any current sessions, those sessions are detached from the filter and are no longer logged. This occurs because the new filter definition has a new filter ID that differs from its previous ID.

Arguments:
- filter_name: A string that specifies the filter name.
- definition: A JSON value that specifies the filter definition.

Return value:
A string that indicates whether the operation succeeded. OK indicates success. ERROR: message indicates failure.

Example:
```
mysql> SET @f = '{ "filter": { "log": false } }';
mysql> SELECT audit_log_filter_set_filter('SomeFilter', @f);
+--------------------------------------------------
| audit_log_filter_set_filter('SomeFilter', @f) |
+--------------------------------------------------
| OK |
+-------------------------------------------------+
```

- audit_log_filter_set_user(user_name, filter_name)

Given a user account name and a filter name, assigns the filter to the user. A user can be assigned only one filter, so if the user was already assigned a filter, the assignment is replaced. Filtering of current sessions for the user remains unaffected. New connections are filtered using the new filter.

As a special case, the name $\%$ represents the default account. The filter is used for connections from any user account that has no explicitly assigned filter.

Arguments:
- user_name: The user account name as a string in user_name@host_name format, or \% to represent the default account.
- filter_name: A string that specifies the filter name.

Return value:
A string that indicates whether the operation succeeded. OK indicates success. ERROR: message indicates failure.

\section*{Example:}
```
mysql> SELECT audit_log_filter_set_user('user1@localhost', 'SomeFilter');
+----------------------------------------------------------------
| audit_log_filter_set_user('user1@localhost', 'SomeFilter') |
+----------------------------------------------------------------
| OK |
+--------------------------------------------------------------
```

- audit_log_read([arg])

Reads the audit log and returns a JSON string result. If the audit log format is not JSON, an error occurs.

With no argument or a JSON hash argument, audit_log_read( ) reads events from the audit log and returns a JSON string containing an array of audit events. Items in the hash argument influence how reading occurs, as described later. Each element in the returned array is an event represented
as a JSON hash, with the exception that the last element may be a JSON null value to indicate no following events are available to read.

With an argument consisting of a JSON null value, audit_log_read( ) closes the current read sequence.

For additional details about the audit log-reading process, see Section 8.4.5.6, "Reading Audit Log Files".

\section*{Arguments:}

To obtain a bookmark for the most recently written event, call audit_log_read_bookmark ( ).
arg: The argument is optional. If omitted, the function reads events from the current position. If present, the argument can be a JSON null value to close the read sequence, or a JSON hash. Within a hash argument, items are optional and control aspects of the read operation such as the position at which to begin reading or how many events to read. The following items are significant (other items are ignored):
- start: The position within the audit log of the first event to read. The position is given as a timestamp and the read starts from the first event that occurs on or after the timestamp value. The start item has this format, where value is a literal timestamp value:
```
"start": { "timestamp": "value" }
```

- timestamp, id: The position within the audit log of the first event to read. The timestamp and id items together comprise a bookmark that uniquely identify a particular event. If an audit_log_read ( ) argument includes either item, it must include both to completely specify a position or an error occurs.
- max_array_length: The maximum number of events to read from the log. If this item is omitted, the default is to read to the end of the log or until the read buffer is full, whichever comes first.

To specify a starting position to audit_log_read ( ), pass a hash argument that includes either a start item or a bookmark consisting of timestamp and id items. If a hash argument includes both a start item and a bookmark, an error occurs.

If a hash argument specifies no starting position, reading continues from the current position.
If a timestamp value includes no time part, a time part of $00: 00: 00$ is assumed.
Return value:
If the call succeeds, the return value is a JSON string containing an array of audit events, or a JSON null value if that was passed as the argument to close the read sequence. If the call fails, the return value is NULL and an error occurs.

\section*{Example:}
```
mysql> SELECT audit_log_read(audit_log_read_bookmark());
+---------------------------------------------------------------------------
| audit_log_read(audit_log_read_bookmark()) |
+---------------------------------------------------------------------------
| [ {"timestamp":"2020-05-18 22:41:24","id":0,"class":"connection", ... |
+---------------------------------------------------------------------------
mysql> SELECT audit_log_read('null');
+-------------------------+
| audit_log_read('null') |
+-------------------------+
| null
```


\section*{Notes:}

Prior to MySQL 8.4, string return values could be binary JSON strings. For information about converting such values to nonbinary strings, see Section 8.4.5.6, "Reading Audit Log Files".
audit_log_read_bookmark()
Returns a JSON string representing a bookmark for the most recently written audit log event. If the audit log format is not JSON, an error occurs.

The bookmark is a JSON hash with timestamp and id items that uniquely identify the position of an event within the audit log. It is suitable for passing to audit_log_read ( ) to indicate to that function the position at which to begin reading.

For additional details about the audit log-reading process, see Section 8.4.5.6, "Reading Audit Log Files".

Arguments:
None.
Return value:
A JSON string containing a bookmark for success, or NULL and an error for failure.
Example:
```
mysql> SELECT audit_log_read_bookmark();
+----------------------------------------------------
| audit_log_read_bookmark() |
+-----------------------------------------------------
| { "timestamp": "2019-10-03 21:03:44", "id": 0 } |
+----------------------------------------------------
```


Notes:
Prior to MySQL 8.4, string return values could be binary JSON strings. For information about converting such values to nonbinary strings, see Section 8.4.5.6, "Reading Audit Log Files".
- audit_log_rotate()

Arguments:
None.
Return value:
The renamed file name.
Example:
```
mysql> SELECT audit_log_rotate();
```


Using audit_log_rotate( ) requires the AUDIT_ADMIN privilege.

\section*{Audit Log Option and Variable Reference}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.43 Audit Log Option and Variable Reference}
\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline audit-log & Yes & Yes & & & & \\
\hline audit_log_bufferesize & Yes & Yes & & Global & No \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline audit_log_com & pression & Yes & Yes & & Global & No \\
\hline audit_log_conn & heesion_policy & Yes & Yes & & Global & Yes \\
\hline audit_log_curre & ent_session & & Yes & & Both & No \\
\hline Audit_log_curr & ent_size & & & Yes & Global & No \\
\hline audit_log_datal & base & Yes & Yes & & Global & No \\
\hline Audit_log_direc & ct_writes & & & Yes & Global & No \\
\hline audit_log_disad & Mes & Yes & Yes & & Global & Yes \\
\hline audit_log_encrỳ & Yetson & Yes & Yes & & Global & No \\
\hline Audit_log_even & nt_max_drop_s & size & & Yes & Global & No \\
\hline Audit_log_even & nts & & & Yes & Global & No \\
\hline Audit_log_even & nts_filtered & & & Yes & Global & No \\
\hline Audit_log_even & nts_lost & & & Yes & Global & No \\
\hline Audit_log_eve & nts_written & & & Yes & Global & No \\
\hline audit_log_exc & UYdes_accounts & Yes & Yes & & Global & Yes \\
\hline audit_log_file & Yes & Yes & Yes & & Global & No \\
\hline audit_log_filter & _id & & Yes & & Both & No \\
\hline audit_log_flush & & & Yes & & Global & Yes \\
\hline audit_log_flus & \multicolumn{2}{|l|}{Yresterval_seconds} & Yes & & Global & No \\
\hline audit_log_form & Yes & Yes & Yes & & Global & No \\
\hline audit_log_inclu & Mes accounts & Yes & Yes & & Global & Yes \\
\hline audit_log_pass & sheesd_history & Ademp_days & Yes & & Global & Yes \\
\hline audit_log_policy & yes & Yes & Yes & & Global & No \\
\hline audit_log_prun & éseconds & Yes & Yes & & Global & Yes \\
\hline audit_log_read\} & Yeaffer_size & Yes & Yes & & Both & Yes \\
\hline audit_log_rotate & とeon_size & Yes & Yes & & Global & Yes \\
\hline audit_log_statel & Yesnt_policy & Yes & Yes & & Global & Yes \\
\hline audit_log_stratt & yes & Yes & Yes & & Global & No \\
\hline Audit_log_total & _size & & & Yes & Global & No \\
\hline Audit_log_write & _waits & & & Yes & Global & No \\
\hline
\end{tabular}

\section*{Audit Log Options and Variables}

This section describes the command options and system variables that configure operation of MySQL Enterprise Audit. If values specified at startup time are incorrect, the audit_log plugin may fail to initialize properly and the server does not load it. In this case, the server may also produce error messages for other audit log settings because it does not recognize them.

To configure activation of the audit log plugin, use this option:
- --audit-log[=value]

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- audit $-\log [=$ value $]$ \\
\hline Type & Enumeration \\
\hline Default Value & ON \\
\hline Valid Values & ON
\end{tabular}

\begin{tabular}{|l|l|} 
& OFF \\
& FORCE \\
& FORCE_PLUS_PERMANENT \\
\hline
\end{tabular}

This option controls how the server loads the audit_log plugin at startup. It is available only if the plugin has been previously registered with INSTALL PLUGIN or is loaded with --plugin-load or --plugin-load-add. See Section 8.4.5.2, "Installing or Uninstalling MySQL Enterprise Audit".

The option value should be one of those available for plugin-loading options, as described in Section 7.6.1, "Installing and Uninstalling Plugins". For example, - - audit log=FORCE_PLUS_PERMANENT tells the server to load the plugin and prevent it from being removed while the server is running.

If the audit log plugin is enabled, it exposes several system variables that permit control over logging:
```
mysql> SHOW VARIABLES LIKE 'audit_log%';
+----------------------------------------+-------------+
| Variable_name | Value |
| audit_log_buffer_size | 1048576 |
| audit_log_compression | NONE
| audit_log_connection_policy | ALL
| audit_log_current_session | OFF
| audit_log_database | mysql
| audit_log_disable | OFF
| audit_log_encryption | NONE
| audit_log_exclude_accounts |
| audit_log_file | audit.log
| audit_log_filter_id | 0
| audit_log_flush | OFF
| audit_log_flush_interval_seconds | 0
| audit_log_format | NEW
| audit_log_format_unix_timestamp | OFF
| audit_log_include_accounts |
| audit_log_max_size | 0
| audit_log_password_history_keep_days | 0
| audit_log_policy | ALL
| audit_log_prune_seconds | 0
| audit_log_read_buffer_size | 32768
| audit_log_rotate_on_size | 0
| audit_log_statement_policy | ALL
| audit_log_strategy | ASYNCHRONOUS |
```


You can set any of these variables at server startup, and some of them at runtime. Those that are available only for legacy mode audit log filtering are so noted.
- audit_log_buffer_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --audit-log-buffer-size=\# \\
\hline System Variable & audit_log_buffer_size \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1048576 \\
\hline Minimum Value & 4096 \\
\hline Maximum Value (64-bit platforms) & 18446744073709547520 \\
\hline Maximum Value (32-bit platforms) & 4294967295 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Unit & bytes \\
\hline Block Size & 4096 \\
\hline
\end{tabular}

When the audit log plugin writes events to the log asynchronously, it uses a buffer to store event contents prior to writing them. This variable controls the size of that buffer, in bytes. The server adjusts the value to a multiple of 4096. The plugin uses a single buffer, which it allocates when it initializes and removes when it terminates. The plugin allocates this buffer only if logging is asynchronous.
- audit_log_compression

\begin{tabular}{|l|l|}
\hline Command-Line Format & --audit-log-compression=value \\
\hline System Variable & audit_log_compression \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & NONE \\
\hline Valid Values & \begin{tabular}{l}
NONE \\
GZIP
\end{tabular} \\
\hline
\end{tabular}

The type of compression for the audit log file. Permitted values are NONE (no compression; the default) and GZIP (GNU Zip compression). For more information, see Compressing Audit Log Files.
- audit_log_connection_policy

\begin{tabular}{|l|l|}
\hline Command-Line Format & --audit-log-connection-policy=value \\
\hline Deprecated & Yes \\
\hline System Variable & audit_log_connection_policy \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & ALL \\
\hline Valid Values & \begin{tabular}{l}
ALL \\
ERRORS \\
NONE
\end{tabular} \\
\hline
\end{tabular}

\section*{Note}

This deprecated variable applies only to legacy mode audit log filtering (see Section 8.4.5.10, "Legacy Mode Audit Log Filtering").

The policy controlling how the audit log plugin writes connection events to its log file. The following table shows the permitted values.

\begin{tabular}{|l|l|}
\hline Value & Description \\
\hline ALL & Log all connection events \\
\hline ERRORS & Log only failed connection events \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Value & Description \\
\hline NONE & Do not log connection events \\
\hline
\end{tabular}

\section*{Note}

At server startup, any explicit value given for audit_log_connection_policy may be overridden if audit_log_policy is also specified, as described in Section 8.4.5.5, "Configuring Audit Logging Characteristics".
- audit_log_current_session

\begin{tabular}{|l|l|}
\hline System Variable & audit_log_current_session \\
\hline Scope & Global, Session \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & depends on filtering policy \\
\hline
\end{tabular}

Whether audit logging is enabled for the current session. The session value of this variable is read only. It is set when the session begins based on the values of the audit_log_include_accounts and audit_log_exclude_accounts system variables. The audit log plugin uses the session value to determine whether to audit events for the session. (There is a global value, but the plugin does not use it.)
- audit_log_database

\begin{tabular}{|l|l|}
\hline Command-Line Format & --audit-log-database=value \\
\hline System Variable & audit_log_database \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & mysql \\
\hline
\end{tabular}

Specifies which database the audit_log plugin uses to find its tables. This variable is read only. For more information, see Section 8.4.5.2, "Installing or Uninstalling MySQL Enterprise Audit").
- audit_log_disable

\begin{tabular}{|l|l|}
\hline Command-Line Format & --audit-log-disable[=\{OFF|ON\}] \\
\hline System Variable & audit_log_disable \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Permits disabling audit logging for all connecting and connected sessions. In addition to the SYSTEM_VARIABLES_ADMIN privilege, disabling audit logging requires the AUDIT_ADMIN privilege.
- audit_log_encryption

\begin{tabular}{|l|l|}
\hline Command-Line Format & --audit-log-encryption=value \\
\hline System Variable & audit_log_encryption \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & NONE \\
\hline Valid Values & \begin{tabular}{l}
NONE \\
AES
\end{tabular} \\
\hline
\end{tabular}

The type of encryption for the audit log file. Permitted values are NONE (no encryption; the default) and AES (AES-256-CBC cipher encryption). For more information, see Encrypting Audit Log Files.
- audit_log_exclude_accounts

\begin{tabular}{|l|l|}
\hline Command-Line Format & --audit-log-exclude-accounts=value \\
\hline Deprecated & Yes \\
\hline System Variable & audit_log_exclude_accounts \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & NULL \\
\hline
\end{tabular}

\section*{Note}

This deprecated variable applies only to legacy mode audit log filtering (see Section 8.4.5.10, "Legacy Mode Audit Log Filtering").

The accounts for which events should not be logged. The value should be NULL or a string containing a list of one or more comma-separated account names. For more information, see Section 8.4.5.7, "Audit Log Filtering".

Modifications to audit_log_exclude_accounts affect only connections created subsequent to the modification, not existing connections.
- audit_log_file

\begin{tabular}{|l|l|}
\hline Command-Line Format & --audit-log-file=file_name \\
\hline System Variable & audit_log_file \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & File name \\
\hline Default Value & audit.log \\
\hline
\end{tabular}

The base name and suffix of the file to which the audit log plugin writes events. The default value is audit. log, regardless of logging format. To have the name suffix correspond to the format, sett the7
name explicitly, choosing a different suffix (for example, audit.xml for XML format, audit.json for JSON format).

If the value of audit_log_file is a relative path name, the plugin interprets it relative to the data directory. If the value is a full path name, the plugin uses the value as is. A full path name may be useful if it is desirable to locate audit files on a separate file system or directory. For security reasons, write the audit log file to a directory accessible only to the MySQL server and to users with a legitimate reason to view the log.

For details about how the audit log plugin interprets the audit_log_file value and the rules for file renaming that occurs at plugin initialization and termination, see Naming Conventions for Audit Log Files.

The audit log plugin uses the directory containing the audit log file (determined from the audit_log_file value) as the location to search for readable audit log files. From these log files and the current file, the plugin constructs a list of the ones that are subject to use with the audit log bookmarking and reading functions. See Section 8.4.5.6, "Reading Audit Log Files".
- audit_log_filter_id

\begin{tabular}{|l|l|}
\hline System Variable & audit_log_filter_id \\
\hline Scope & Global, Session \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 1 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline
\end{tabular}

The session value of this variable indicates the internally maintained ID of the audit filter for the current session. A value of 0 means that the session has no filter assigned.
- audit_log_flush

\begin{tabular}{|l|l|}
\hline System Variable & audit_log_flush \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

\section*{Note}

The audit_log_flush variable is deprecated; expect support for it to be removed in a future version of MySQL. It is superseded by the audit_log_rotate() function.

If audit_log_rotate_on_size is 0, automatic audit log file rotation is disabled and rotation occurs only when performed manually. In that case, enabling audit_log_flush by setting it to 1 or ON causes the audit log plugin to close and reopen its log file to flush it. (The variable value remains 0FF so that you need not disable it explicitly before enabling it again to perform another flush.) For more information, see Section 8.4.5.5, "Configuring Audit Logging Characteristics".
- audit_log_flush_interval_seconds

\begin{tabular}{|l|l|}
\hline Command-Line Format & --audit-log-flush-intervalseconds[=value] \\
\hline System Variable & audit_log_flush_interval_seconds \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Unsigned Long \\
\hline Default Value & 0 \\
\hline Maximum Value (Windows) & 4294967295 \\
\hline Maximum Value (Other) & 18446744073709551615 \\
\hline Unit & seconds \\
\hline
\end{tabular}

This system variable depends on the scheduler component, which must be installed and enabled (see Section 7.5.5, "Scheduler Component"). To check the status of the component:
```
SHOW VARIABLES LIKE 'component_scheduler%';
+------------------------------+-------+
| Variable_name | Value |
+-------------------------------+-------|
| component_scheduler.enabled | On |
```


When audit_log_flush_interval_seconds has a value of zero (the default), no automatic refresh of the privileges occurs, even if the scheduler component is enabled (ON).

Values between 0 and 60 (1 to 59) are not acknowledged; instead, these values adjust to 60 automatically and the server emits a warning. Values greater than 60 define the number of seconds the scheduler component waits from startup, or from the beginning of the previous execution, until it attempts to schedule another execution.

To persist this global system variable to the mysqld-auto.cnf file without setting the global variable runtime value, precede the variable name by the PERSIST_ONLY keyword or the @@PERSIST_ONLY. qualifier.
- audit_log_format

\begin{tabular}{|l|l|}
\hline Command-Line Format & --audit-log-format=value \\
\hline System Variable & audit_log_format \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & NEW \\
\hline Valid Values & \begin{tabular}{l}
OLD \\
NEW \\
JSON
\end{tabular} \\
\hline
\end{tabular}

The audit log file format. Permitted values are OLD (old-style XML), NEW (new-style XML; the default), and JSON. For details about each format, see Section 8.4.5.4, "Audit Log File Formats".
- audit_log_format_unix_timestamp

\begin{tabular}{|l|l|}
\hline Command-Line Format & --audit-log-format-unixtimestamp[=\{OFF|ON\}] \\
\hline System Variable & audit_log_format_unix_timestamp \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

This variable applies only for JSON-format audit log output. When that is true, enabling this variable causes each log file record to include a time field. The field value is an integer that represents the UNIX timestamp value indicating the date and time when the audit event was generated.

Changing the value of this variable at runtime causes log file rotation so that, for a given JSONformat log file, all records in the file either do or do not include the time field.

Setting the runtime value of audit_log_format_unix_timestamp requires the AUDIT_ADMIN privilege, in addition to the SYSTEM_VARIABLES_ADMIN privilege (or the deprecated SUPER privilege) normally required to set a global system variable runtime value.
- audit_log_include_accounts

\begin{tabular}{|l|l|}
\hline Command-Line Format & --audit-log-include-accounts=value \\
\hline Deprecated & Yes \\
\hline System Variable & audit_log_include_accounts \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & String \\
\hline Default Value & NULL \\
\hline
\end{tabular}

\section*{Note}

This deprecated variable applies only to legacy mode audit log filtering (see Section 8.4.5.10, "Legacy Mode Audit Log Filtering").

The accounts for which events should be logged. The value should be NULL or a string containing a list of one or more comma-separated account names. For more information, see Section 8.4.5.7, "Audit Log Filtering".

Modifications to audit_log_include_accounts affect only connections created subsequent to the modification, not existing connections.
- audit_log_max_size
audit_log_max_size pertains to audit log file pruning, which is supported for JSON-format log files only. It controls pruning based on combined log file size:
- A value of 0 (the default) disables size-based pruning. No size limit is enforced.
- A value greater than 0 enables size-based pruning. The value is the combined size above which audit log files become subject to pruning.

If you set audit_log_max_size to a value that is not a multiple of 4096, it is truncated to the nearest multiple. In particular, setting it to a value less than 4096 sets it to 0 and no size-based pruning occurs.

If both audit_log_max_size and audit_log_rotate_on_size are greater than 0 , audit_log_max_size should be more than 7 times the value of audit_log_rotate_on_size. Otherwise, a warning is written to the server error log because in this case the "granularity" of sizebased pruning may be insufficient to prevent removal of all or most rotated log files each time it occurs.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1541.jpg?height=127&width=101&top_left_y=1064&top_left_x=404)

\section*{Note}

Setting audit_log_max_size by itself is not sufficient to cause log file pruning to occur because the pruning algorithm uses audit_log_rotate_on_size, audit_log_max_size, and audit_log_prune_seconds in conjunction. For details, see Space Management of Audit Log Files.
- audit_log_password_history_keep_days

\begin{tabular}{|l|l|}
\hline Command-Line Format & --audit-log-password-history-keepdays=\# \\
\hline System Variable & audit_log_password_history_keep_days \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 4294967295 \\
\hline Unit & days \\
\hline
\end{tabular}

The audit log plugin implements log file encryption using encryption passwords stored in the MySQL keyring (see Encrypting Audit Log Files). The plugin also implements password history, which includes password archiving and expiration (removal).

When the audit log plugin creates a new encryption password, it archives the previous password, if one exists, for later use. The audit_log_password_history_keep_days variable controls automatic removal of expired archived passwords. Its value indicates the number of days after which
archived audit log encryption passwords are removed. The default of 0 disables password expiration: the password retention period is forever.

New audit log encryption passwords are created under these circumstances:
- During plugin initialization, if the plugin finds that log file encryption is enabled, it checks whether the keyring contains an audit log encryption password. If not, the plugin automatically generates a random initial encryption password.
- When the audit_log_encryption_password_set ( ) function is called to set a specific password.

In each case, the plugin stores the new password in the key ring and uses it to encrypt new log files.
Removal of expired audit log encryption passwords occurs under these circumstances:
- During plugin initialization.
- When the audit_log_encryption_password_set() function is called.
- When the runtime value of audit_log_password_history_keep_days is changed from its current value to a value greater than 0 . Runtime value changes occur for SET statements that use the GLOBAL or PERSIST keyword, but not the PERSIST_ONLY keyword. PERSIST_ONLY writes the variable setting to mysqld-auto.cnf, but has no effect on the runtime value.

When password removal occurs, the current value of audit_log_password_history_keep_days determines which passwords to remove:
- If the value is 0 , the plugin removes no passwords.
- If the value is $N>0$, the plugin removes passwords more than $N$ days old.

\section*{Note}

Take care not to expire old passwords that are still needed to read archived encrypted log files.

If you normally leave password expiration disabled (that is, audit_log_password_history_keep_days has a value of 0), it is possible to perform an ondemand cleanup operation by temporarily assigning the variable a value greater than zero. For example, to expire passwords older than 365 days, do this:

SET GLOBAL audit_log_password_history_keep_days = 365; SET GLOBAL audit_log_password_history_keep_days = 0;

Setting the runtime value of audit_log_password_history_keep_days requires the AUDIT_ADMIN privilege, in addition to the SYSTEM_VARIABLES_ADMIN privilege (or the deprecated SUPER privilege) normally required to set a global system variable runtime value.
- audit_log_policy

\begin{tabular}{|l|l|}
\hline Command-Line Format & --audit-log-policy=value \\
\hline Deprecated & Yes \\
\hline System Variable & audit_log_policy \\
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & ALL \\
\hline \multirow[t]{2}{*}{Valid Values} & ALL \\
\hline & LOGINS \\
\hline
\end{tabular}

\section*{Note}

This deprecated variable applies only to legacy mode audit log filtering (see Section 8.4.5.10, "Legacy Mode Audit Log Filtering").

The policy controlling how the audit log plugin writes events to its log file. The following table shows the permitted values.

\begin{tabular}{|l|l|}
\hline Value & Description \\
\hline ALL & Log all events \\
\hline LOGINS & Log only login events \\
\hline QUERIES & Log only query events \\
\hline NONE & Log nothing (disable the audit stream) \\
\hline
\end{tabular}
audit_log_policy can be set only at server startup. At runtime, it is a read-only variable. Two other system variables, audit_log_connection_policy and audit_log_statement_policy, provide finer control over logging policy and can be set either at startup or at runtime. If you use audit_log_policy at startup instead of the other two variables, the server uses its value to set those variables. For more information about the policy variables and their interaction, see Section 8.4.5.5, "Configuring Audit Logging Characteristics".
- audit_log_prune_seconds

\begin{tabular}{|l|l|}
\hline Command-Line Format & --audit-log-prune-seconds=\# \\
\hline System Variable & audit_log_prune_seconds \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value (Windows) & 4294967295 \\
\hline Maximum Value (Other) & 18446744073709551615 \\
\hline Unit & bytes \\
\hline
\end{tabular}
audit_log_prune_seconds pertains to audit log file pruning, which is supported for JSON-format log files only. It controls pruning based on log file age:
- A value of 0 (the default) disables age-based pruning. No age limit is enforced.
- A value greater than 0 enables age-based pruning. The value is the number of seconds after which audit log files become subject to pruning.

\section*{Note}

Setting audit_log_prune_seconds by itself is not sufficient to cause log file pruning to occur because the pruning algorithm uses audit_log_rotate_on_size, audit_log_max_size, and audit_log_prune_seconds in conjunction. For details, see Space Management of Audit Log Files.
- audit_log_read_buffer_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --audit-log-read-buffer-size=\# \\
\hline System Variable & audit_log_read_buffer_size \\
\hline Scope & Global, Session \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 32768 \\
\hline Minimum Value & 32768 \\
\hline Maximum Value & 4194304 \\
\hline Unit & bytes \\
\hline
\end{tabular}

The buffer size for reading from the audit log file, in bytes. The audit_log_read ( ) function reads no more than this many bytes. Log file reading is supported only for JSON log format. For more information, see Section 8.4.5.6, "Reading Audit Log Files".

This variable has a default of 32 KB and can be set at runtime. Each client should set its session value of audit_log_read_buffer_size appropriately for its use of audit_log_read ( ).
- audit_log_rotate_on_size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --audit-log-rotate-on-size=\# \\
\hline System Variable & audit_log_rotate_on_size \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Integer \\
\hline Default Value & 0 \\
\hline Minimum Value & 0 \\
\hline Maximum Value & 18446744073709551615 \\
\hline Unit & bytes \\
\hline Block Size & 4096 \\
\hline
\end{tabular}

If audit_log_rotate_on_size is 0, the audit log plugin does not perform automatic size-based log file rotation. If rotation is to occur, you must perform it manually; see Manual Audit Log File Rotation.

If audit_log_rotate_on_size is greater than 0 , automatic size-based log file rotation occurs. Whenever a write to the log file causes its size to exceed the audit_log_rotate_on_size value,
the audit log plugin renames the current log file and opens a new current log file using the original name.

If you set audit_log_rotate_on_size to a value that is not a multiple of 4096, it is truncated to the nearest multiple. In particular, setting it to a value less than 4096 sets it to 0 and no rotation occurs, except manually.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1545.jpg?height=129&width=101&top_left_y=536&top_left_x=402)

\section*{Note}
audit_log_rotate_on_size controls whether audit log file rotation occurs. It can also be used in conjunction with audit_log_max_size and audit_log_prune_seconds to configure pruning of rotated JSON-format log files. For details, see Space Management of Audit Log Files.
- audit_log_statement_policy

\begin{tabular}{|l|l|}
\hline Command-Line Format & --audit-log-statement-policy=value \\
\hline Deprecated & Yes \\
\hline System Variable & audit_log_statement_policy \\
\hline Scope & Global \\
\hline Dynamic & Yes \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & ALL \\
\hline Valid Values & \begin{tabular}{l}
ALL \\
ERRORS \\
NONE
\end{tabular} \\
\hline
\end{tabular}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1545.jpg?height=119&width=101&top_left_y=1647&top_left_x=404)

\section*{Note}

This deprecated variable applies only to legacy mode audit log filtering (see Section 8.4.5.10, "Legacy Mode Audit Log Filtering").

The policy controlling how the audit log plugin writes statement events to its log file. The following table shows the permitted values.

\begin{tabular}{|l|l|}
\hline Value & Description \\
\hline ALL & Log all statement events \\
\hline ERRORS & Log only failed statement events \\
\hline NONE & Do not log statement events \\
\hline
\end{tabular}

\section*{Note}

At server startup, any explicit value given for audit_log_statement_policy may be overridden if audit_log_policy is also specified, as described in Section 8.4.5.5, "Configuring Audit Logging Characteristics".
- audit_log_strategy

\begin{tabular}{|l|l|}
\hline Command-Line Format & --audit-log-strategy=value \\
\hline System Variable & audit_log_strategy 1515 \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Scope & Global \\
\hline Dynamic & No \\
\hline SET_VAR Hint Applies & No \\
\hline Type & Enumeration \\
\hline Default Value & ASYNCHRONOUS \\
\hline Valid Values & \begin{tabular}{l}
ASYNCHRONOUS \\
PERFORMANCE \\
SEMISYNCHRONOUS \\
SYNCHRONOUS
\end{tabular} \\
\hline
\end{tabular}

The logging method used by the audit log plugin. These strategy values are permitted:
- ASYNCHRONOUS: Log asynchronously. Wait for space in the output buffer.
- PERFORMANCE: Log asynchronously. Drop requests for which there is insufficient space in the output buffer.
- SEMISYNCHRONOUS: Log synchronously. Permit caching by the operating system.
- SYNCHRONOUS: Log synchronously. Call sync ( ) after each request.

\section*{Audit Log Status Variables}

If the audit log plugin is enabled, it exposes several status variables that provide operational information. These variables are available for legacy mode audit filtering (deprecated) and JSON mode audit filtering.
- Audit_log_current_size

The size of the current audit log file. The value increases when an event is written to the log and is reset to 0 when the log is rotated.
- Audit_log_direct_writes

When the audit log plugin writes events to the JSON-format audit log, it uses a buffer to store event contents prior to writing them. If the query length is greater than the size of the buffer, then the plugin writes the event directly to the log, bypassing the buffer. This variable shows the number of direct writes. The plugin determines the count based on the current write strategy in use (see audit_log_strategy).

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.44 Write-Strategy Effect on the Direct Write Count}
\begin{tabular}{|l|l|}
\hline Write Strategy & Description \\
\hline ASYNCHRONOUS & Incremented if the event size does not fit into the internal buffer (audit_log_buffer_size server system variable). \\
\hline PERFORMANCE & Not incremented. The plugin discards events larger than internal buffer. \\
\hline SEMISYNCHRONOUS & Always incremented. \\
\hline SYNCHRONOUS & Always incremented. \\
\hline
\end{tabular}
\end{table}
- Audit_log_event_max_drop_size

The size of the largest dropped event in performance logging mode. For a description of logging modes, see Section 8.4.5.5, "Configuring Audit Logging Characteristics".
- Audit_log_events

The number of events handled by the audit log plugin, whether or not they were written to the log based on filtering policy (see Section 8.4.5.5, "Configuring Audit Logging Characteristics").
- Audit_log_events_filtered

The number of events handled by the audit log plugin that were filtered (not written to the log) based on filtering policy (see Section 8.4.5.5, "Configuring Audit Logging Characteristics").
- Audit_log_events_lost

The number of events lost in performance logging mode because an event was larger than the available audit log buffer space. This value may be useful for assessing how to set audit_log_buffer_size to size the buffer for performance mode. For a description of logging modes, see Section 8.4.5.5, "Configuring Audit Logging Characteristics".
- Audit_log_events_written

The number of events written to the audit log.
- Audit_log_total_size

The total size of events written to all audit log files. Unlike Audit_log_current_size, the value of Audit_log_total_size increases even when the log is rotated.
- Audit_log_write_waits

The number of times an event had to wait for space in the audit log buffer in asynchronous logging mode. For a description of logging modes, see Section 8.4.5.5, "Configuring Audit Logging Characteristics".

\subsection*{8.4.5.12 Audit Log Restrictions}

MySQL Enterprise Audit is subject to these general restrictions:
- Only SQL statements are logged. Changes made by no-SQL APIs, such as memcached, Node.JS, and the NDB API, are not logged.
- Only top-level statements are logged, not statements within stored programs such as triggers or stored procedures.
- Contents of files referenced by statements such as LOAD DATA are not logged.

NDB Cluster. It is possible to use MySQL Enterprise Audit with MySQL NDB Cluster, subject to the following conditions:
- All changes to be logged must be done using the SQL interface. Changes using no-SQL interfaces, such as those provided by the NDB API, memcached, or ClusterJ, are not logged.
- The plugin must be installed on each MySQL server that is used to execute SQL on the cluster.
- Audit plugin data must be aggregated amongst all MySQL servers used with the cluster. This aggregation is the responsibility of the application or user.

\subsection*{8.4.6 The Audit Message Component}

The audit_api_message_emit component enables applications to add their own message events to the audit log, using the audit_api_message_emit_udf( ) function.

The audit_api_message_emit component cooperates with all plugins of audit type. For concreteness, examples use the audit_log plugin described in Section 8.4.5, "MySQL Enterprise Audit".
- Installing or Uninstalling the Audit Message Component
- Audit Message Function

\section*{Installing or Uninstalling the Audit Message Component}

To be usable by the server, the component library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup.

To install the audit_api_message_emit component, use this statement:
INSTALL COMPONENT "file://component_audit_api_message_emit";
Component installation is a one-time operation that need not be done per server startup. INSTALL COMPONENT loads the component, and also registers it in the mysql.component system table to cause it to be loaded during subsequent server startups.

To uninstall the audit_api_message_emit component, use this statement:
UNINSTALL COMPONENT "file://component_audit_api_message_emit";
UNINSTALL COMPONENT unloads the component, and unregisters it from the mysql.component system table to cause it not to be loaded during subsequent server startups.

Because installing and uninstalling the audit_api_message_emit component installs and uninstalls the audit_api_message_emit_udf() function that the component implements, it is not necessary to use CREATE FUNCTION or DROP FUNCTION to do so.

