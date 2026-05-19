\section*{TRUE}

Whether to enable or disable processing of local mysql client commands. Setting this option to FALSE disables such processing, and has the effects listed here:
- The following mysql client commands are disabled:
- charset (/C remains enabled)
- clear
- connect
- edit
- ego
- exit
- go
- help
- nopager
- notee
- nowarning
- pager
- print
- prompt
- query_attributes
- quit
- rehash
- resetconnection
- ssl_session_data_print
- source
- status
- system
- tee
- \u (use is passed to the server)
- warnings
- The \C and delimiter commands remain enabled.
- The --system-command option is ignored, and has no effect.

This option has no effect when --binary-mode is enabled.
When --commands is enabled, it is possible to disable (only) the system command using the --system-command option.

This option was added in MySQL 8.4.6.
- --comments, -c

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - comments \\
\hline Type & Boolean \\
\hline Default Value & TRUE \\
\hline
\end{tabular}

Whether to preserve or strip comments in statements sent to the server. The default is to preserve them; to strip them, start mysql with --skip-comments.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0393.jpg?height=127&width=99&top_left_y=1048&top_left_x=402)

\section*{Note}

The mysql client always passes optimizer hints to the server, regardless of whether this option is given.

Comment stripping is deprecated. Expect this feature and the options to control it to be removed in a future MySQL release.
- --compress, -C

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -compress $[=\{\mathrm{OFF} \mid \mathrm{ON}\}]$ \\
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
- --connect-expired-password

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-expired-password \\
\hline
\end{tabular}

Indicate to the server that the client can handle sandbox mode if the account used to connect has an expired password. This can be useful for noninteractive invocations of mysql because normally the server disconnects noninteractive clients that attempt to connect using an account with an expired password. (See Section 8.2.16, "Server Handling of Expired Passwords".)
- --connect-timeout=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-timeout=value \\
\hline Type & Numeric \\
\hline Default Value & 0 \\
\hline
\end{tabular}

The number of seconds before connection timeout. (Default value is 0.)
- --database=db_name, -D db_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - database $=$ dbname \\
\hline Type & String \\
\hline
\end{tabular}

The database to use. This is useful primarily in an option file.
- --debug[=debug_options], -\# [debug_options]

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug [=debug_options] \\
\hline Type & String \\
\hline Default Value & d:t:o,/tmp/mysql.trace \\
\hline
\end{tabular}

Write a debugging log. A typical debug_options string is $\mathrm{d}: \mathrm{t}: \mathrm{o}$, file_name. The default is d:t:o,/tmp/mysql.trace.

This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- --debug-check

\begin{tabular}{|l|l|}
\hline Command-Line Format & --debug-check \\
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
\hline Command-Line Format & -- default - auth=plugin \\
\hline Type & String \\
\hline
\end{tabular}

A hint about which client-side authentication plugin to use. See Section 8.2.17, "Pluggable Authentication".
- --default-character-set=charset_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - default - character - set=charset_name \\
\hline Type & String \\
\hline
\end{tabular}

Use charset_name as the default character set for the client and connection.
This option can be useful if the operating system uses one character set and the mysql client by default uses another. In this case, output may be formatted incorrectly. You can usually fix such issues by using this option to force the client to use the system character set instead.

For more information, see Section 12.4, "Connection Character Sets and Collations", and Section 12.15, "Character Set Configuration".
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

Read not only the usual option groups, but also groups with the usual names and a suffix of str. For example, mysql normally reads the [client] and [mysql] groups. If this option is given as --defaults-group-suffix=_other, mysql also reads the [client_other] and [mysql_other] groups.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --delimiter=str

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -delimiter $=$ str \\
\hline Type & String \\
\hline Default Value & $;$ \\
\hline
\end{tabular}

Set the statement delimiter. The default is the semicolon character (;).
- --disable-named-commands

Disable named commands. Use the \* form only, or use named commands only at the beginning of a line ending with a semicolon (;). mysql starts with this option enabled by default. However, even with this option, long-format commands still work from the first line. See Section 6.5.1.2, "mysql Client Commands".
- --dns-srv-name=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - dns - s rv - name=name \\
\hline Type & String \\
\hline
\end{tabular}

Specifies the name of a DNS SRV record that determines the candidate hosts to use for establishing a connection to a MySQL server. For information about DNS SRV support in MySQL, see Section 6.2.6, "Connecting to the Server Using DNS SRV Records".

Suppose that DNS is configured with this SRV information for the example.com domain:

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & TTL & Class & Priority & Weight & Port & Target \\
\hline mysql._tcp.example.com. & 86400 & IN SRV & 0 & 5 & 3306 & host1.example.com \\
\hline mysql._tcp.example.com. & 86400 & IN SRV & 0 & 10 & 3306 & host2.example.com \\
\hline mysql._tcp.example.com. & 86400 & IN SRV & 10 & 5 & 3306 & host3.example.com \\
\hline mysql._tcp.example.com. & 86400 & IN SRV & 20 & 5 & 3306 & host4.example.com \\
\hline
\end{tabular}

To use that DNS SRV record, invoke mysql like this:
mysql --dns-srv-name=_mysql._tcp.example.com
mysql then attempts a connection to each server in the group until a successful connection is established. A failure to connect occurs only if a connection cannot be established to any of the
servers. The priority and weight values in the DNS SRV record determine the order in which servers should be tried.

When invoked with --dns-srv-name, mysql attempts to establish TCP connections only.
The --dns-srv-name option takes precedence over the --host option if both are given. --dns-srv-name causes connection establishment to use the mysql_real_connect_dns_srv() C API function rather than mysql_real_connect ( ). However, if the connect command is subsequently used at runtime and specifies a host name argument, that host name takes precedence over any --dns-srv-name option given at mysql startup to specify a DNS SRV record.
- --enable-cleartext-plugin

\begin{tabular}{|l|l|}
\hline Command-Line Format & --enable-cleartext-plugin \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Enable the mysql_clear_password cleartext authentication plugin. (See Section 8.4.1.4, "ClientSide Cleartext Pluggable Authentication".)
- --execute=statement, -e statement

\begin{tabular}{|l|l|}
\hline Command-Line Format & --execute=statement \\
\hline Type & String \\
\hline
\end{tabular}

Execute the statement and quit. The default output format is like that produced with --batch. See Section 6.2.2.1, "Using Options on the Command Line", for some examples. With this option, mysql does not use the history file.
- --force, -f

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - force \\
\hline
\end{tabular}

Continue even if an SQL error occurs.
- --get-server-public-key

\begin{tabular}{|l|l|}
\hline Command-Line Format & --get-server-public-key \\
\hline Type & Boolean \\
\hline
\end{tabular}

Request from the server the public key required for RSA key pair-based password exchange. This option applies to clients that authenticate with the caching_sha2_password authentication plugin. For that plugin, the server does not send the public key unless requested. This option is ignored for accounts that do not authenticate with that plugin. It is also ignored if RSA-based password exchange is not used, as is the case when the client connects to the server using a secure connection.

If --server-public-key-path=file_name is given and specifies a valid public key file, it takes precedence over--get-server-public-key.

For information about the caching_sha2_password plugin, see Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".
- --histignore

\begin{tabular}{|l|l|}
\hline Command-Line Format & --histignore=pattern_list \\
\hline Type & String \\
\hline
\end{tabular}

A list of one or more colon-separated patterns specifying statements to ignore for logging purposes. These patterns are added to the default pattern list (" *IDENTIFIED* : *PASSWORD*"). The value specified for this option affects logging of statements written to the history file, and to syslog if the --syslog option is given. For more information, see Section 6.5.1.3, "mysql Client Logging".
- --host=host_name, -h host_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - host=host_name \\
\hline Type & String \\
\hline Default Value & localhost \\
\hline
\end{tabular}

Connect to the MySQL server on the given host.
The --dns-srv-name option takes precedence over the --host option if both are given. --dns-srv-name causes connection establishment to use the mysql_real_connect_dns_srv( ) C API function rather than mysql_real_connect ( ). However, if the connect command is subsequently used at runtime and specifies a host name argument, that host name takes precedence over any -dns-srv-name option given at mysql startup to specify a DNS SRV record.
- --html, -H

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- html \\
\hline
\end{tabular}

Produce HTML output.
- --ignore-spaces, -i

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ignore-spaces \\
\hline
\end{tabular}

Ignore spaces after function names. The effect of this is described in the discussion for the IGNORE_SPACE SQL mode (see Section 7.1.11, "Server SQL Modes").
- --init-command=str

\begin{tabular}{|l|l|}
\hline Command-Line Format & --init-command=str \\
\hline
\end{tabular}

Single SQL statement to execute after connecting to the server. If auto-reconnect is enabled, the statement is executed again after reconnection occurs. The definition resets existing statements defined by it or init-command-add.
- --init-command-add=str

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - init - command - add $=$ str \\
\hline
\end{tabular}
- --line-numbers

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- line-numbers \\
\hline Disabled by & skip-line-numbers \\
\hline
\end{tabular}

Write line numbers for errors. Disable this with --skip-line-numbers.
- --load-data-local-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --load-data-local-dir=dir_name \\
\hline Type & Directory name \\
\hline Default Value & empty string \\
\hline
\end{tabular}

This option affects the client-side LOCAL capability for LOAD DATA operations. It specifies the directory in which files named in LOAD DATA LOCAL statements must be located. The effect of -load-data-local-dir depends on whether LOCAL data loading is enabled or disabled:
- If LOCAL data loading is enabled, either by default in the MySQL client library or by specifying - -local-infile[=1], the--load-data-local-dir option is ignored.
- If LOCAL data loading is disabled, either by default in the MySQL client library or by specifying - -local-infile=0, the--load-data-local-dir option applies.

When--load-data-local-dir applies, the option value designates the directory in which local data files must be located. Comparison of the directory path name and the path name of files to be loaded is case-sensitive regardless of the case sensitivity of the underlying file system. If the option value is the empty string, it names no directory, with the result that no files are permitted for local data loading.

For example, to explicitly disable local data loading except for files located in the /my/local/data directory, invoke mysql like this:
mysql --local-infile=0 --load-data-local-dir=/my/local/data
When both--local-infile and--load-data-local-dir are given, the order in which they are given does not matter.

Successful use of LOCAL load operations within mysql also requires that the server permits local loading; see Section 8.1.6, "Security Considerations for LOAD DATA LOCAL"
- --local-infile[=\{0|1\}]

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- local-infile $[=\{0 \mid 1\}]$ \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

By default, LOCAL capability for LOAD DATA is determined by the default compiled into the MySQL client library. To enable or disable LOCAL data loading explicitly, use the --local-infile option. When given with no value, the option enables LOCAL data loading. When given as --localinfile=0 or --local-infile=1, the option disables or enables LOCAL data loading.

If LOCAL capability is disabled, the --load-data-local-dir option can be used to permit restricted local loading of files located in a designated directory.

Successful use of LOCAL load operations within mysql also requires that the server permits local loading; see Section 8.1.6, "Security Considerations for LOAD DATA LOCAL"
- --login-path=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login- path=name \\
\hline Type & String \\
\hline
\end{tabular}

Read options from the named login path in the .mylogin. cnf login path file. A "login path" is an option group containing options that specify which MySQL server to connect to and which account to authenticate as. To create or modify a login path file, use the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
See--login-path for related information.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --max-allowed-packet=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - max-allowed - packet=value \\
\hline Type & Numeric \\
\hline Default Value & 16777216 \\
\hline
\end{tabular}

The maximum size of the buffer for client/server communication. The default is 16 MB , the maximum is 1 GB .
- --max-join-size=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & --max-join-size=value \\
\hline Type & Numeric \\
\hline Default Value & 1000000 \\
\hline
\end{tabular}

The automatic limit for rows in a join when using --safe-updates. (Default value is $1,000,000$.)
- --named-commands, -G

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - named - commands \\
\hline Disabled by & skip-named - commands \\
\hline
\end{tabular}

Enable named mysql commands. Long-format commands are permitted, not just short-format commands. For example, quit and \q both are recognized. Use--skip-named-commands to disable named commands. See Section 6.5.1.2, "mysql Client Commands".
- --net-buffer-length=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - net - buffer - length=value \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & Numeric \\
\hline Default Value & 16384 \\
\hline
\end{tabular}

The buffer size for TCP/IP and socket communication. (Default value is 16 KB .)
- - - network - namespace=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - network - namespace=name \\
\hline Type & String \\
\hline
\end{tabular}

The network namespace to use for TCP/IP connections. If omitted, the connection uses the default (global) namespace. For information about network namespaces, see Section 7.1.14, "Network Namespace Support".

This option is available only on platforms that implement network namespace support.
- --no-auto-rehash, -A

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - auto - rehash \\
\hline Deprecated & Yes \\
\hline
\end{tabular}

This has the same effect as --skip-auto-rehash. See the description for--auto-rehash.
- --no-beep, -b

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - beep \\
\hline
\end{tabular}

Do not beep when errors occur.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read any option files. If program startup fails due to reading unknown options from an option file, --no-defaults can be used to prevent them from being read.

The exception is that the .mylogin. cnf file is read in all cases, if it exists. This permits passwords to be specified in a safer way than on the command line even when --no-defaults is used. To create .mylogin.cnf, use the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --oci-config-file=PATH

\begin{tabular}{|l|l|}
\hline Command-Line Format & --oci-config-file \\
\hline Type & String \\
\hline Default Value & \\
\hline
\end{tabular}
option. However, if you have an existing configuration file, with multiple profiles or a different default from the tenancy of the user you want to connect with, specify this option.
- --one-database, -o

\begin{tabular}{|l|l|}
\hline Command-Line Format & --one-database \\
\hline
\end{tabular}

Ignore statements except those that occur while the default database is the one named on the command line. This option is rudimentary and should be used with care. Statement filtering is based only on USE statements.

Initially, mysql executes statements in the input because specifying a database $d b \_n$ ame on the command line is equivalent to inserting USE $d b \_n$ ame at the beginning of the input. Then, for each USE statement encountered, mysql accepts or rejects following statements depending on whether the database named is the one on the command line. The content of the statements is immaterial.

Suppose that mysql is invoked to process this set of statements:
```
DELETE FROM db2.t2;
USE db2;
DROP TABLE db1.t1;
CREATE TABLE db1.t1 (i INT);
USE db1;
INSERT INTO t1 (i) VALUES(1);
CREATE TABLE db2.t1 (j INT);
```


If the command line is mysql --force --one-database db1, mysql handles the input as follows:
- The DELETE statement is executed because the default database is db1, even though the statement names a table in a different database.
- The DROP TABLE and CREATE TABLE statements are not executed because the default database is not db1, even though the statements name a table in db1.
- The INSERT and CREATE TABLE statements are executed because the default database is db1, even though the CREATE TABLE statement names a table in a different database.
- --pager[=command]

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- pager $[=$ command $]$ \\
\hline Disabled by & skip-pager \\
\hline Type & String \\
\hline
\end{tabular}

Use the given command for paging query output. If the command is omitted, the default pager is the value of your PAGER environment variable. Valid pagers are less, more, cat [> filename], and so forth. This option works only on Unix and only in interactive mode. To disable paging, use - -skip-pager. Section 6.5.1.2, "mysql Client Commands", discusses output paging further.
---password[=password], -p[password]

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- password [=password] \\
\hline Type & String \\
\hline
\end{tabular}

The password of the MySQL account used for connecting to the server. The password value is optional. If not given, mysql prompts for one. If given, there must be no space between - -
password= or -p and the password following it. If no password option is specified, the default is to send no password.

Specifying a password on the command line should be considered insecure. To avoid giving the password on the command line, use an option file. See Section 8.1.2.1, "End-User Guidelines for Password Security".

To explicitly specify that there is no password and that mysql should not prompt for one, use the -skip-password option.
- --password1[=pass_val]

The password for multifactor authentication factor 1 of the MySQL account used for connecting to the server. The password value is optional. If not given, mysql prompts for one. If given, there must be no space between - - password1= and the password following it. If no password option is specified, the default is to send no password.

Specifying a password on the command line should be considered insecure. To avoid giving the password on the command line, use an option file. See Section 8.1.2.1, "End-User Guidelines for Password Security".

To explicitly specify that there is no password and that mysql should not prompt for one, use the -skip-password1 option.
--password1 and --password are synonymous, as are--skip-password1 and --skippassword.
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
- --plugin-authentication-kerberos-client-mode=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & --plugin-authentication-kerberos-client-mode \\
\hline Type & String \\
\hline Default Value & SSPI \\
\hline Valid Values & \begin{tabular}{l}
GSSAPI \\
SSPI
\end{tabular} \\
\hline
\end{tabular}

On Windows, the authentication_kerberos_client authentication plugin supports this plugin option. It provides two possible values that the client user can set at runtime: SSPI and GSSAPI.

The default value for the client-side plugin option uses Security Support Provider Interface (SSPI), which is capable of acquiring credentials from the Windows in-memory cache. Alternatively, the client user can select a mode that supports Generic Security Service Application Program Interface (GSSAPI) through the MIT Kerberos library on Windows. GSSAPI is capable of acquiring cached credentials previously generated by using the kinit command.

For more information, see Commands for Windows Clients in GSSAPI Mode.
- --plugin-authentication-webauthn-client-preserve-privacy=\{OFF|ON\}

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l} 
- - plugin-authentication-webauthn- \\
client-preserve-privacy
\end{tabular} \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Determines how assertions are sent to server in case there is more than one discoverable credential stored for a given RP ID (a unique name given to the relying-party server, which is the MySQL server). If the FIDO2 device contains multiple resident keys for a given RP ID, this option allows the user to choose a key to be used for assertion. It provides two possible values that the client user can set. The default value is OFF. If set to OFF, the challenge is signed by all credentials available for a given RP ID and all signatures are sent to server. If set to 0N, the user is prompted to choose the credential to be used for signature.

\section*{Note}

This option has no effect if the device does not support the resident-key feature.

For more information, see Section 8.4.1.11, "WebAuthn Pluggable Authentication".
- --plugin-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- plugin-dir=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

The directory in which to look for plugins. Specify this option if the --default-auth option is used to specify an authentication plugin but mysql does not find it. See Section 8.2.17, "Pluggable Authentication".
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
- --prompt=format_str

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - prompt=format_str \\
\hline Type & String \\
\hline Default Value & mysql> \\
\hline
\end{tabular}

Set the prompt to the specified format. The default is mysql>. The special sequences that the prompt can contain are described in Section 6.5.1.2, "mysql Client Commands".
- --protocol=\{TCP | SOCKET | PIPE | MEMORY\}

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
- --quick, -q

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - quick \\
\hline
\end{tabular}

Do not cache each query result, print each row as it is received. This may slow down the server if the output is suspended. With this option, mysql does not use the history file.

By default, mysql fetches all result rows before producing any output; while storing these, it calculates a running maximum column length from the actual value of each column in succession. When printing the output, it uses this maximum to format it. When --quick is specified, mysql does not have the rows for which to calculate the length before starting, and so uses the maximum length. In the following example, table t1 has a single column of type BIGINT and containing 4 rows. The default output is 9 characters wide; this width is equal the maximum number of characters in any of the column values in the rows returned (5), plus 2 characters each for the spaces used as padding and the | characters used as column delimiters). The output when using the - quick option is 25 characters wide; this is equal to the number of characters needed to represent -9223372036854775808, which is the longest possible value that can be stored in a (signed) BIGINT column, or 19 characters, plus the 4 characters used for padding and column delimiters. The difference can be seen here:
```

\begin{tabular}{|r|}
100 \\
$\mid$ \\
1000 \\
10000 \\
$\mid$ \\
10 \\
+------+
\end{tabular}
$> mysql --quick -t test -e "SELECT * FROM t1"

\begin{tabular}{|l|l|}
\hline | c1 & \\
\hline \multirow{4}{*}{} & 100 \\
\hline & \\
\hline & 10000 \\
\hline & 10 \\
\hline & \\
\hline
\end{tabular}
```

- --raw, -r

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - raw \\
\hline
\end{tabular}

For tabular output, the "boxing" around columns enables one column value to be distinguished from another. For nontabular output (such as is produced in batch mode or when the - - batch or - silent option is given), special characters are escaped in the output so they can be identified easily. Newline, tab, NUL, and backslash are written as \n, \t, \0, and \t. The - - raw option disables this character escaping.

The following example demonstrates tabular versus nontabular output and the use of raw mode to disable escaping:
```
% mysql
mysql> SELECT CHAR(92);
+-----------+
| CHAR(92) |
+----------+
| \ |
+-----------+
% mysql -s
mysql> SELECT CHAR(92);
CHAR(92)
\\
% mysql -s -r
mysql> SELECT CHAR(92);
CHAR(92)
\
```

- --reconnect

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - reconnect \\
\hline Disabled by & skip-reconnect \\
\hline
\end{tabular}

If the connection to the server is lost, automatically try to reconnect. A single reconnect attempt is made each time the connection is lost. To suppress reconnection behavior, use --skipreconnect.
- --register-factor=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & --register-factor=value \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
\hline
\end{tabular}

The factor or factors for which FIDO/FIDO2 device registration must be performed before WebAuthn device-based authentication can be used. This option value must be a single value, or two values separated by commas. Each value must be 2 or 3 , so the permitted option values are ' 2 ', ' 3 ', ' 2,3 ' and ' 3,2 '.

For example, an account that requires registration for a third authentication factor invokes the mysql client as follows:
```
mysql --user=user_name --register-factor=3
```


An account that requires registration for second and third authentication factors invokes the mysql client as follows:
```
mysql --user=user_name --register-factor=2,3
```


If registration is successful, a connection is established. If there is an authentication factor with a pending registration, a connection is placed into pending registration mode when attempting to connect to the server. In this case, disconnect and reconnect with the correct - -register-factor value to complete the registration.

Registration is a two-step process comprising initiate registration and finish registration steps. The initiate registration step executes this statement:

\section*{ALTER USER user factor INITIATE REGISTRATION}

The statement returns a result set containing a 32 byte challenge, the user name, and the relying party ID (see authentication_webauthn_rp_id).

The finish registration step executes this statement:
```
ALTER USER user factor FINISH REGISTRATION SET CHALLENGE_RESPONSE AS 'auth_string'
```


The statement completes the registration and sends the following information to the server as part of the auth_string: authenticator data, an optional attestation certificate in X. 509 format, and a signature.

The initiate and registration steps must be performed in a single connection, as the challenge received by the client during the initiate step is saved to the client connection handler. Registration would fail if the registration step was performed by a different connection. The --registerfactor option executes both the initiate and registration steps, which avoids the failure scenario described above and prevents having to execute the ALTER USER initiate and registration statements manually.

The --register-factor option is only available for the mysql and MySQL Shell clients. Other MySQL client programs do not support it.

For related information, see Using WebAuthn Authentication.
- --safe-updates, --i-am-a-dummy, -U

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
- -safe-updates \\
- -i-am-a-dummy
\end{tabular} \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & FALSE
\end{tabular}

If this option is enabled, UPDATE and DELETE statements that do not use a key in the WHERE clause or a LIMIT clause produce an error. In addition, restrictions are placed on SELECT statements that produce (or are estimated to produce) very large result sets. If you have set this option in an option file, you can use--skip-safe-updates on the command line to override it. For more information about this option, see Using Safe-Updates Mode (--safe-updates).
- --select-limit=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & --select-limit=value \\
\hline Type & Numeric \\
\hline Default Value & 1000 \\
\hline
\end{tabular}

The automatic limit for SELECT statements when using --safe-updates. (Default value is 1,000 .)
- --server-public-key-path=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --server-public-key-path=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

The path name to a file in PEM format containing a client-side copy of the public key required by the server for RSA key pair-based password exchange. This option applies to clients that authenticate with the sha256_password (deprecated) or caching_sha2_password authentication plugin. This option is ignored for accounts that do not authenticate with one of those plugins. It is also ignored if RSA-based password exchange is not used, as is the case when the client connects to the server using a secure connection.

If--server-public-key-path=file_name is given and specifies a valid public key file, it takes precedence over--get-server-public-key.

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
- --show-warnings

\begin{tabular}{|l|l|}
\hline Command-Line Format & --show-warnings \\
\hline
\end{tabular}

Cause warnings to be shown after each statement if there are any. This option applies to interactive and batch mode.
- --sigint-ignore

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sigint-ignore \\
\hline
\end{tabular}

Ignore SIGINT signals (typically the result of typing Control+C).
Without this option, typing Control+C interrupts the current statement if there is one, or cancels any partial input line otherwise.
- --silent, -s

\begin{tabular}{|l|l|}
\hline Command-Line Format & --silent \\
\hline
\end{tabular}

Silent mode. Produce less output. This option can be given multiple times to produce less and less output.

This option results in nontabular output format and escaping of special characters. Escaping may be disabled by using raw mode; see the description for the - - raw option.
- --skip-column-names, -N

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-column-names \\
\hline
\end{tabular}

Do not write column names in results. Use of this option causes the output to be right-aligned, as shown here:
```
$> echo "SELECT * FROM t1" | mysql -t test
+-------+
| c1 |
+-------+
| a,c,d
| c |
+-------+
$> echo "SELECT * FROM t1" | ./mysql -uroot -Nt test
+-------+
a,c,d |
| c |
+--------+
```

- --skip-line-numbers, -L

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-line-numbers \\
\hline
\end{tabular}

Do not write line numbers for errors. Useful when you want to compare result files that include error messages.
- --skip-system-command

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-system-command \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
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

Controls whether to enable FIPS mode on the client side. The --ssl-fips-mode option differs from other - $-\mathrm{ssl}-x x x$ options in that it is not used to establish encrypted connections, but rather to affect which cryptographic operations to permit. See Section 8.8, "FIPS Support".

These--ssl-fips-mode values are permitted:
- OFF: Disable FIPS mode.
- ON: Enable FIPS mode.
- STRICT: Enable "strict" FIPS mode.

\section*{Note}

If the OpenSSL FIPS Object Module is not available, the only permitted value for--ssl-fips-mode is OFF. In this case, setting--ssl-fips-mode to ON or STRICT causes the client to produce a warning at startup and to operate in non-FIPS mode.

This option is deprecated. Expect it to be removed in a future version of MySQL.
- --syslog, -j

\begin{tabular}{|l|l|}
\hline Command-Line Format & --syslog \\
\hline
\end{tabular}

This option causes mysql to send interactive statements to the system logging facility. On Unix, this is syslog; on Windows, it is the Windows Event Log. The destination where logged messages appear is system dependent. On Linux, the destination is often the /var/log/messages file.

Here is a sample of output generated on Linux by using --syslog. This output is formatted for readability; each logged message actually takes a single line.
```
Mar 7 12:39:25 myhost MysqlClient[20824]:
    SYSTEM_USER:'oscar', MYSQL_USER:'my_oscar', CONNECTION_ID:23,
    DB_SERVER:'127.0.0.1', DB:'--', QUERY:'USE test;'
Mar 7 12:39:28 myhost MysqlClient[20824]:
    SYSTEM_USER:'oscar', MYSQL_USER:'my_oscar', CONNECTION_ID:23,
    DB_SERVER:'127.0.0.1', DB:'test', QUERY:'SHOW TABLES;'
```


For more information, see Section 6.5.1.3, "mysql Client Logging".
- --system-command [=\{ON|OFF\}]

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -system-command $[=\{\mathrm{ON} \mid \mathrm{OFF}\}]$ \\
\hline Disabled by & skip-system-command \\
\hline Type & Boolean \\
\hline Default Value & ON \\
\hline
\end{tabular}

Enable or disable the system ( \!) command. When this option is disabled, either by --systemcommand=0FF or by --skip-system-command, the system command is rejected with an error.
(MySQL 8.4.6 and later:) - - commands, when disabled (set to FALSE), causes the server to disregard any setting for this option.
- --table, -t

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - table \\
\hline
\end{tabular}

Display output in table format. This is the default for interactive use, but can be used to produce table output in batch mode.
- --tee=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - tee=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

Append a copy of output to the given file. This option works only in interactive mode. Section 6.5.1.2, "mysql Client Commands", discusses tee files further.
- --tls-ciphersuites=ciphersuite_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tls-ciphersuites=ciphersuite_list \\
\hline Type & String \\
\hline
\end{tabular}

The permissible ciphersuites for encrypted connections that use TLSv1.3. The value is a list of one or more colon-separated ciphersuite names. The ciphersuites that can be named for this option
depend on the SSL library used to compile MySQL. For details, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".
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
- --unbuffered, -n

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - unbuffered \\
\hline
\end{tabular}

Flush the buffer after each query.
- --user=user_name, - u user_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - user=user_name \\
\hline Type & String \\
\hline
\end{tabular}

The user name of the MySQL account to use for connecting to the server.
- --verbose, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & --verbose \\
\hline
\end{tabular}

Verbose mode. Produce more output about what the program does. This option can be given multiple times to produce more and more output. (For example, $-\mathrm{v}-\mathrm{v}-\mathrm{v}$ produces table output
- --version, -V

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.
- --vertical, -E

\begin{tabular}{|l|l|}
\hline Command-Line Format & --vertical \\
\hline
\end{tabular}

Print query output rows vertically (one line per column value). Without this option, you can specify vertical output for individual statements by terminating them with \G.
- --wait, -w

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - wait \\
\hline
\end{tabular}

If the connection cannot be established, wait and retry instead of aborting.
- --xml, -X

\begin{tabular}{|l|l|}
\hline Command-Line Format & --xml \\
\hline
\end{tabular}

Produce XML output.
```
<field name="column_name">NULL</field>
```


The output when --xml is used with mysql matches that of mysqldump --xml. See Section 6.5.4, "mysqldump - A Database Backup Program", for details.

The XML output also uses an XML namespace, as shown here:
```
$> mysql --xml -uroot -e "SHOW VARIABLES LIKE 'version%'"
<?xml version="1.0"?>
<resultset statement="SHOW VARIABLES LIKE 'version%'" xmlns:xsi="http://www.w3.org/2001/XMLSchema-ins
<row>
<field name="Variable_name">version</field>
<field name="Value">5.0.40-debug</field>
</row>
<row>
<field name="Variable_name">version_comment</field>
<field name="Value">Source distribution</field>
</row>
<row>
<field name="Variable_name">version_compile_machine</field>
<field name="Value">i686</field>
</row>
<row>
<field name="Variable_name">version_compile_os</field>
<field name="Value">suse-linux-gnu</field>
</row>
</resultset>
```

- --zstd-compression-level=level

\begin{tabular}{|l|l|}
\hline Command-Line Format & --zstd-compression-level=\# \\
\hline Type & Integer \\
\hline
\end{tabular}

The compression level to use for connections to the server that use the zstd compression algorithm. The permitted levels are from 1 to 22, with larger values indicating increasing levels of compression. The default zstd compression level is 3 . The compression level setting has no effect on connections that do not use zstd compression.

For more information, see Section 6.2.8, "Connection Compression Control".
- telemetry_client

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - telemetry_client \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Enables the telemetry client plugin (Linux only).
For more information, see Chapter 35, Telemetry.

\subsection*{6.5.1.2 mysql Client Commands}
mysql sends each SQL statement that you issue to the server to be executed. There is also a set of commands that mysql itself interprets. For a list of these commands, type help or \hat the mysql> prompt:
```
mysql> help
List of all MySQL commands:
Note that all text commands must be first on line and end with ';'
? (\?) Synonym for ˋhelp'.
clear (\c) Clear the current input statement.
connect (\r) Reconnect to the server. Optional arguments are db and host.
delimiter (\d) Set statement delimiter.
edit (\e) Edit command with $EDITOR.
ego (\G) Send command to mysql server, display result vertically.
exit (\q) Exit mysql. Same as quit.
go (\g) Send command to mysql server.
help (\h) Display this help.
nopager (\n) Disable pager, print to stdout.
notee (\t) Don't write into outfile.
pager (\P) Set PAGER [to_pager]. Print the query results via PAGER.
print (\p) Print current command.
prompt (\R) Change your mysql prompt.
quit (\q) Quit mysql.
rehash (\#) Rebuild completion hash.
source (\.) Execute an SQL script file. Takes a file name as an argument.
status (\s) Get status information from the server.
system (\!) Execute a system shell command.
tee (\T) Set outfile [to_outfile]. Append everything into given
outfile.
use (\u) Use another database. Takes database name as argument.
charset (\C) Switch to another charset. Might be needed for processing
    binlog with multi-byte charsets.
warnings (\W) Show warnings after every statement.
nowarning (\w) Don't show warnings after every statement.
resetconnection(\x) Clean session context.
query_attributes Sets string parameters (name1 value1 name2 value2 ...)
for the next query to pick up.
ssl_session_data_print Serializes the current SSL session data to stdout
or file.
For server side help, type 'help contents'
```


If mysql is invoked with the --binary-mode option, all mysql commands are disabled except charset and delimiter in noninteractive mode (for input piped to mysql or loaded using the
source command). Beginning with MySQL 8.4.6, the --commands option can be used to enable or disable all commands except /C, delimiter, and use.

Each command has both a long and short form. The long form is not case-sensitive; the short form is. The long form can be followed by an optional semicolon terminator, but the short form should not.

The use of short-form commands within multiple-line /* . . . */ comments is not supported. Shortform commands do work within single-line /*! ... */ version comments, as do /*+ ... */ optimizer-hint comments, which are stored in object definitions. If there is a concern that optimizerhint comments may be stored in object definitions so that dump files when reloaded with mysql would result in execution of such commands, either invoke mysql with the --binary-mode option or use a reload client other than mysql.
- help [arg], \h [arg], \? [arg], ? [arg]

Display a help message listing the available mysql commands.
If you provide an argument to the help command, mysql uses it as a search string to access server-side help from the contents of the MySQL Reference Manual. For more information, see Section 6.5.1.4, "mysql Client Server-Side Help".
- charset charset_name, \C charset_name

Change the default character set and issue a SET NAMES statement. This enables the character set to remain synchronized on the client and server if mysql is run with auto-reconnect enabled (which is not recommended), because the specified character set is used for reconnects.
- clear, \c

Clear the current input. Use this if you change your mind about executing the statement that you are entering.
- connect [db_name [host_name]], \r [db_name [host_name]]

Reconnect to the server. The optional database name and host name arguments may be given to specify the default database or the host where the server is running. If omitted, the current values are used.

If the connect command specifies a host name argument, that host takes precedence over any --dns-srv-name option given at mysql startup to specify a DNS SRV record.
- delimiter str, \d str

Change the string that mysql interprets as the separator between SQL statements. The default is the semicolon character (;).

The delimiter string can be specified as an unquoted or quoted argument on the delimiter command line. Quoting can be done with either single quote ( ' ), double quote ("), or backtick (ˋ) characters. To include a quote within a quoted string, either quote the string with a different quote character or escape the quote with a backslash ( \\) character. Backslash should be avoided outside of quoted strings because it is the escape character for MySQL. For an unquoted argument, the delimiter is read up to the first space or end of line. For a quoted argument, the delimiter is read up to the matching quote on the line.
mysql interprets instances of the delimiter string as a statement delimiter anywhere it occurs, except within quoted strings. Be careful about defining a delimiter that might occur within other words. For example, if you define the delimiter as X , it is not possible to use the word INDEX in statements. mysql interprets this as INDE followed by the delimiter X .

When the delimiter recognized by mysql is set to something other than the default of ;, instances of that character are sent to the server without interpretation. However, the server itself still interprets ; as a statement delimiter and processes statements accordingly. This behavior on the server side
comes into play for multiple-statement execution (see Multiple Statement Execution Support), and for parsing the body of stored procedures and functions, triggers, and events (see Section 27.1, "Defining Stored Programs").
- edit, \e

Edit the current input statement. mysql checks the values of the EDITOR and VISUAL environment variables to determine which editor to use. The default editor is vi if neither variable is set.

The edit command works only in Unix.
- ego, \G

Send the current statement to the server to be executed and display the result using vertical format.
- exit, \q

Exit mysql.
- go, \g

Send the current statement to the server to be executed.
- nopager, \n

Disable output paging. See the description for pager.
The nopager command works only in Unix.
- notee, \t

Disable output copying to the tee file. See the description for tee.
- nowarning, \w

Disable display of warnings after each statement.
- pager [command], \P [command]

Enable output paging. By using the --pager option when you invoke mysql, it is possible to browse or search query results in interactive mode with Unix programs such as less, more, or any other similar program. If you specify no value for the option, mysql checks the value of the PAGER environment variable and sets the pager to that. Pager functionality works only in interactive mode.

Output paging can be enabled interactively with the pager command and disabled with nopager. The command takes an optional argument; if given, the paging program is set to that. With no argument, the pager is set to the pager that was set on the command line, or stdout if no pager was specified.

Output paging works only in Unix because it uses the popen ( ) function, which does not exist on Windows. For Windows, the tee option can be used instead to save query output, although it is not as convenient as pager for browsing output in some situations.
- print, \p

Print the current input statement without executing it.
- prompt [str],\R [str]

Reconfigure the mysql prompt to the given string. The special character sequences that can be used in the prompt are described later in this section.

If you specify the prompt command with no argument, mysql resets the prompt to the default of mysql>.
- query_attributes name value [name value ...]

Define query attributes that apply to the next query sent to the server. For discussion of the purpose and use of query attributes, see Section 11.6, "Query Attributes".

The query_attributes command follows these rules:
- The format and quoting rules for attribute names and values are the same as for the delimiter command.
- The command permits up to 32 attribute name/value pairs. Names and values may be up to 1024 characters long. If a name is given without a value, an error occurs.
- If multiple query_attributes commands are issued prior to query execution, only the last command applies. After sending the query, mysql clears the attribute set.
- If multiple attributes are defined with the same name, attempts to retrieve the attribute value have an undefined result.
- An attribute defined with an empty name cannot be retrieved by name.
- If a reconnect occurs while mysql executes the query, mysql restores the attributes after reconnecting so the query can be executed again with the same attributes.
- quit, \q

Exit mysql.
- rehash, \\#

Rebuild the completion hash that enables database, table, and column name completion while you are entering statements. (See the description for the - - auto - rehash option.)
- resetconnection, \x

Reset the connection to clear the session state. This includes clearing any current query attributes defined using the query_attributes command.

Resetting a connection has effects similar to mysql_change_user ( ) or an auto-reconnect except that the connection is not closed and reopened, and re-authentication is not done. See mysql_change_user(), and Automatic Reconnection Control.

This example shows how resetconnection clears a value maintained in the session state:
```
mysql> SELECT LAST_INSERT_ID(3);
+--------------------+
| LAST_INSERT_ID(3) |
+--------------------+
| 3 |
+--------------------+
mysql> SELECT LAST_INSERT_ID();
+-------------------+
| LAST_INSERT_ID() |
+-------------------+
| 3 |
```

```
+-------------------+
mysql> resetconnection;
mysql> SELECT LAST_INSERT_ID();
+-------------------+
| LAST_INSERT_ID() |
+-------------------+
| 0 |
+-------------------+
```

- source file_name, \. file_name

Read the named file and executes the statements contained therein. On Windows, specify path name separators as / or \\.

Quote characters are taken as part of the file name itself. For best results, the name should not include space characters.
- ssl_session_data_print [file_name]

Fetches, serializes, and optionally stores the session data of a successful connection. The optional file name and arguments may be given to specify the file to store serialized session data. If omitted, the session data is printed to stdout.

If the MySQL session is configured for reuse, session data from the file is deserialized and supplied to the connect command to reconnect. When the session is reused successfully, the status command contains a row showing SSL session reused: true while the client remains reconnected to the server.
- status, \s

Provide status information about the connection and the server you are using. If you are running with --safe-updates enabled, status also prints the values for the mysql variables that affect your queries.
- system command, \! command

Execute the given command using your default command interpreter.
In MySQL 8.4.3 and later, this command can be disabled by starting the client with --systemcommand=0FF or--skip-system-command.
- tee [file_name], \T [file_name]

By using the --tee option when you invoke mysql, you can log statements and their output. All the data displayed on the screen is appended into a given file. This can be very useful for debugging purposes also. mysql flushes results to the file after each statement, just before it prints its next prompt. Tee functionality works only in interactive mode.

You can enable this feature interactively with the tee command. Without a parameter, the previous file is used. The tee file can be disabled with the notee command. Executing tee again re-enables logging.
- use db_name, \u db_name

Use db_name as the default database.
- warnings, \W

Enable display of warnings after each statement (if there are any).
Here are a few tips about the pager command:
- You can use it to write to a file and the results go only to the file:
```
mysql> pager cat > /tmp/log.txt
```


You can also pass any options for the program that you want to use as your pager:
```
mysql> pager less -n -i -S
```

- In the preceding example, note the -S option. You may find it very useful for browsing wide query results. Sometimes a very wide result set is difficult to read on the screen. The - S option to less can make the result set much more readable because you can scroll it horizontally using the leftarrow and right-arrow keys. You can also use -S interactively within less to switch the horizontalbrowse mode on and off. For more information, read the less manual page:
```
man less
```

- The - $F$ and - $X$ options may be used with less to cause it to exit if output fits on one screen, which is convenient when no scrolling is necessary:
```
mysql> pager less -n -i -S -F -X
```

- You can specify very complex pager commands for handling query output:
```
mysql> pager cat | tee /dr1/tmp/res.txt \
    | tee /dr2/tmp/res2.txt | less -n -i -S
```


In this example, the command would send query results to two files in two different directories on two different file systems mounted on /dr1 and /dr2, yet still display the results onscreen using less.

You can also combine the tee and pager functions. Have a tee file enabled and pager set to less, and you are able to browse the results using the less program and still have everything appended into a file the same time. The difference between the Unix tee used with the pager command and the mysql built-in tee command is that the built-in tee works even if you do not have the Unix tee available. The built-in tee also logs everything that is printed on the screen, whereas the Unix tee used with pager does not log quite that much. Additionally, tee file logging can be turned on and off interactively from within mysql. This is useful when you want to log some queries to a file, but not others.

The prompt command reconfigures the default mysql> prompt. The string for defining the prompt can contain the following special sequences.

\begin{tabular}{|l|l|}
\hline Option & Description \\
\hline \c & The current connection identifier \\
\hline \c & A counter that increments for each statement you issue \\
\hline \D & The full current date \\
\hline \d & The default database \\
\hline \h & The server host \\
\hline \l & The current delimiter \\
\hline \m & Minutes of the current time \\
\hline \n & A newline character \\
\hline \0 & The current month in three-letter format (Jan, Feb, ...) \\
\hline \o & The current month in numeric format \\
\hline \P & am/pm \\
\hline \p & The current TCP/IP port or socket file \\
\hline \R & The current time, in 24-hour military time (0-23) \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Option & Description \\
\hline \r & The current time, standard 12-hour time (1-12) \\
\hline \s & Semicolon \\
\hline \s & Seconds of the current time \\
\hline \T & Print an asterisk (*) if the current session is inside a transaction block \\
\hline \t & A tab character \\
\hline \U & Your full user_name@host_name account name \\
\hline \u & Your user name \\
\hline \v & The server version \\
\hline \w & The current day of the week in three-letter format (Mon, Tue, ...) \\
\hline \Y & The current year, four digits \\
\hline \y & The current year, two digits \\
\hline \_ & A space \\
\hline \} & A space (a space follows the backslash) \\
\hline \' & Single quote \\
\hline \" & Double quote \\
\hline \\ & A literal \backslash character \\
\hline \x & $x$, for any " $x$ " not listed above \\
\hline
\end{tabular}

You can set the prompt in several ways:
- Use an environment variable. You can set the MYSQL_PS1 environment variable to a prompt string. For example:
```
export MYSQL_PS1="(\u@\h) [\d]> "
```

- Use a command-line option. You can set the --prompt option on the command line to mysql. For example:
```
$> mysql --prompt="(\u@\h) [\d]> "
(user@host) [database]>
```

- Use an option file. You can set the prompt option in the [mysql] group of any MySQL option file, such as /etc/my.cnf or the .my.cnf file in your home directory. For example:
```
[mysql]
prompt=(\\u@\\h) [\\d]>\\_
```


In this example, note that the backslashes are doubled. If you set the prompt using the prompt option in an option file, it is advisable to double the backslashes when using the special prompt options. There is some overlap in the set of permissible prompt options and the set of special escape sequences that are recognized in option files. (The rules for escape sequences in option files are listed in Section 6.2.2.2, "Using Option Files".) The overlap may cause you problems if you use single backslashes. For example, \s is interpreted as a space rather than as the current seconds value. The following example shows how to define a prompt within an option file to include the current time in $h h$ : mm: ss> format:
```
[mysql]
prompt="\\r:\\m:\\s> "
```

- Set the prompt interactively. You can change your prompt interactively by using the prompt (or \R) command. For example:
```
mysql> prompt (\u@\h) [\d]>\_
PROMPT set to '(\u@\h) [\d]>\_'
(user@host) [database]>
(user@host) [database]> prompt
Returning to default PROMPT of mysql>
mysql>
```


\subsection*{6.5.1.3 mysql Client Logging}

The mysql client can do these types of logging for statements executed interactively:
- On Unix, mysql writes the statements to a history file. By default, this file is named .mysql_history in your home directory. To specify a different file, set the value of the MYSQL_HISTFILE environment variable.
- On all platforms, if the --syslog option is given, mysql writes the statements to the system logging facility. On Unix, this is syslog; on Windows, it is the Windows Event Log. The destination where logged messages appear is system dependent. On Linux, the destination is often the /var/log/ messages file.

The following discussion describes characteristics that apply to all logging types and provides information specific to each logging type.
- How Logging Occurs
- Controlling the History File
- syslog Logging Characteristics

\section*{How Logging Occurs}

For each enabled logging destination, statement logging occurs as follows:
- Statements are logged only when executed interactively. Statements are noninteractive, for example, when read from a file or a pipe. It is also possible to suppress statement logging by using the - batch or --execute option.
- Statements are ignored and not logged if they match any pattern in the "ignore" list. This list is described later.
- mysql logs each nonignored, nonempty statement line individually.
- If a nonignored statement spans multiple lines (not including the terminating delimiter), mysql concatenates the lines to form the complete statement, maps newlines to spaces, and logs the result, plus a delimiter.

Consequently, an input statement that spans multiple lines can be logged twice. Consider this input:
```
mysql> SELECT
    -> 'Today is'
    -> ,
    -> CURDATE()
    -> ;
```


In this case, mysql logs the "SELECT", "'Today is'", ",", "CURDATE()", and ";" lines as it reads them. It also logs the complete statement, after mapping SELECT\n'Today is'\n, \nCURDATE() to SELECT 'Today is' , CURDATE(), plus a delimiter. Thus, these lines appear in logged output:
```
SELECT
'Today is'
\prime
CURDATE()
;
SELECT 'Today is' , CURDATE();
```

mysql ignores for logging purposes statements that match any pattern in the "ignore" list. By default, the pattern list is " *IDENTIFIED* : *PASSWORD*", to ignore statements that refer to passwords. Pattern matching is not case-sensitive. Within patterns, two characters are special:
- ? matches any single character.
- * matches any sequence of zero or more characters.

To specify additional patterns, use the --histignore option or set the MYSQL_HISTIGNORE environment variable. (If both are specified, the option value takes precedence.) The value should be a list of one or more colon-separated patterns, which are appended to the default pattern list.

Patterns specified on the command line might need to be quoted or escaped to prevent your command interpreter from treating them specially. For example, to suppress logging for UPDATE and DELETE statements in addition to statements that refer to passwords, invoke mysql like this:
```
mysql --histignore="*UPDATE*:*DELETE*"
```


\section*{Controlling the History File}

The .mysql_history file should be protected with a restrictive access mode because sensitive information might be written to it, such as the text of SQL statements that contain passwords. See Section 8.1.2.1, "End-User Guidelines for Password Security". Statements in the file are accessible from the mysql client when the up-arrow key is used to recall the history. See Disabling Interactive History.

If you do not want to maintain a history file, first remove . mysql_history if it exists. Then use either of the following techniques to prevent it from being created again:
- Set the MYSQL_HISTFILE environment variable to / dev/null. To cause this setting to take effect each time you log in, put it in one of your shell's startup files.
- Create . mysql_history as a symbolic link to /dev/null; this need be done only once:
```
ln -s /dev/null $HOME/.mysql_history
```


\section*{syslog Logging Characteristics}

If the--syslog option is given, mysql writes interactive statements to the system logging facility. Message logging has the following characteristics.

Logging occurs at the "information" level. This corresponds to the LOG_INFO priority for syslog on Unix/Linux syslog capability and to EVENTLOG_INFORMATION_TYPE for the Windows Event Log. Consult your system documentation for configuration of your logging capability.

Message size is limited to 1024 bytes.
Messages consist of the identifier MysqlClient followed by these values:
- SYSTEM_USER

The operating system user name (login name) or - - if the user is unknown.
- MYSQL_USER

The MySQL user name (specified with the --user option) or - - if the user is unknown.
- CONNECTION_ID:

The client connection identifier. This is the same as the CONNECTION_ID( ) function value within the session.
- DB_SERVER

The server host or - - if the host is unknown.
- DB

The default database or - - if no database has been selected.
- QUERY

The text of the logged statement.
Here is a sample of output generated on Linux by using --syslog. This output is formatted for readability; each logged message actually takes a single line.
```
Mar 7 12:39:25 myhost MysqlClient[20824]:
    SYSTEM_USER:'oscar', MYSQL_USER:'my_oscar', CONNECTION_ID:23,
    DB_SERVER:'127.0.0.1', DB:'--', QUERY:'USE test;'
Mar 7 12:39:28 myhost MysqlClient[20824]:
    SYSTEM_USER:'oscar', MYSQL_USER:'my_oscar', CONNECTION_ID:23,
    DB_SERVER:'127.0.0.1', DB:'test', QUERY:'SHOW TABLES;'
```


\subsection*{6.5.1.4 mysql Client Server-Side Help}
```
mysql> help search_string
```


If you provide an argument to the help command, mysql uses it as a search string to access serverside help from the contents of the MySQL Reference Manual. The proper operation of this command requires that the help tables in the mysql database be initialized with help topic information (see Section 7.1.17, "Server-Side Help Support").

If there is no match for the search string, the search fails:
```
mysql> help me
Nothing found
Please try to run 'help contents' for a list of all accessible topics
```


Use help contents to see a list of the help categories:
```
mysql> help contents
You asked for help about help category: "Contents"
For more information, type 'help <item>', where <item> is one of the
following categories:
    Account Management
    Administration
    Data Definition
    Data Manipulation
    Data Types
    Functions
    Functions and Modifiers for Use with GROUP BY
    Geographic Features
    Language Structure
    Plugins
    Storage Engines
    Stored Routines
    Table Maintenance
    Transactions
    Triggers
```


If the search string matches multiple items, mysql shows a list of matching topics:
```
mysql> help logs
Many help items for your request exist.
To make a more specific request, please type 'help <item>',
where <item> is one of the following topics:
    SHOW
    SHOW BINARY LOGS
    SHOW ENGINE
    SHOW LOGS
```


Use a topic as the search string to see the help entry for that topic:
```
mysql> help show binary logs
Name: 'SHOW BINARY LOGS'
Description:
Syntax:
SHOW BINARY LOGS
Lists the binary log files on the server. This statement is used as
part of the procedure described in [purge-binary-logs], that shows how
to determine which logs can be purged.
```

```
mysql> SHOW BINARY LOGS;
+----------------+-----------+-----------+
| Log_name | File_size | Encrypted |
+----------------+------------+-----------+
| binlog.000015 | 724935 | Yes
| binlog.000016 | 733481 | Yes |
+----------------+-----------+-----------+
```


The search string can contain the wildcard characters $\%$ and _. These have the same meaning as for pattern-matching operations performed with the LIKE operator. For example, HELP rep\% returns a list of topics that begin with rep:
```
mysql> HELP rep%
Many help items for your request exist.
To make a more specific request, please type 'help <item>',
where <item> is one of the following
topics:
    REPAIR TABLE
    REPEAT FUNCTION
    REPEAT LOOP
    REPLACE
    REPLACE FUNCTION
```


\subsection*{6.5.1.5 Executing SQL Statements from a Text File}

The mysql client typically is used interactively, like this:
```
mysql db_name
```


However, it is also possible to put your SQL statements in a file and then tell mysql to read its input from that file. To do so, create a text file text_file that contains the statements you wish to execute. Then invoke mysql as shown here:
```
mysql db_name < text_file
```


If you place a USE db_name statement as the first statement in the file, it is unnecessary to specify the database name on the command line:
```
mysql < text_file
```


If you are already running mysql, you can execute an SQL script file using the source command or \. command:
```
mysql> source file_name
mysql> \. file_name
```


Sometimes you may want your script to display progress information to the user. For this you can insert statements like this:
```
SELECT '<info_to_display>' AS ' ';
```


The statement shown outputs <info_to_display>.
You can also invoke mysql with the --verbose option, which causes each statement to be displayed before the result that it produces.
mysql ignores Unicode byte order mark (BOM) characters at the beginning of input files. Previously, it read them and sent them to the server, resulting in a syntax error. Presence of a BOM does not
cause mysql to change its default character set. To do that, invoke mysql with an option such as --default-character-set=utf8mb4.

For more information about batch mode, see Section 5.5, "Using mysql in Batch Mode".

\subsection*{6.5.1.6 mysql Client Tips}

This section provides information about techniques for more effective use of mysql and about mysql operational behavior.
- Input-Line Editing
- Disabling Interactive History
- Unicode Support on Windows
- Displaying Query Results Vertically
- Using Safe-Updates Mode (--safe-updates)
- Disabling mysql Auto-Reconnect
- mysql Client Parser Versus Server Parser

\section*{Input-Line Editing}
mysql supports input-line editing, which enables you to modify the current input line in place or recall previous input lines. For example, the left-arrow and right-arrow keys move horizontally within the current input line, and the up-arrow and down-arrow keys move up and down through the set of previously entered lines. Backspace deletes the character before the cursor and typing new characters enters them at the cursor position. To enter the line, press Enter.

On Windows, the editing key sequences are the same as supported for command editing in console windows. On Unix, the key sequences depend on the input library used to build mysql (for example, the libedit or readline library).

Documentation for the libedit and readline libraries is available online. To change the set of key sequences permitted by a given input library, define key bindings in the library startup file. This is a file in your home directory: .editrc for libedit and .inputrc for readline.

For example, in libedit, Control+W deletes everything before the current cursor position and Control+U deletes the entire line. In readline, Control+W deletes the word before the cursor and Control+U deletes everything before the current cursor position. If mysql was built using libedit, a user who prefers the readline behavior for these two keys can put the following lines in the .editrc file (creating the file if necessary):
```
bind "^W" ed-delete-prev-word
bind "^U" vi-kill-line-prev
```


To see the current set of key bindings, temporarily put a line that says only bind at the end of .editrc. mysql shows the bindings when it starts.

\section*{Disabling Interactive History}

The up-arrow key enables you to recall input lines from current and previous sessions. In cases where a console is shared, this behavior may be unsuitable. mysql supports disabling the interactive history partially or fully, depending on the host platform.

On Windows, the history is stored in memory. Alt+F7 deletes all input lines stored in memory for the current history buffer. It also deletes the list of sequential numbers in front of the input lines displayed with F7 and recalled (by number) with F9. New input lines entered after you press Alt+F7 repopulate the current history buffer. Clearing the buffer does not prevent logging to the Windows Event Viewer, if the --syslog option was used to start mysql. Closing the console window also clears the current history buffer.

To disable interactive history on Unix, first delete the . mysql_history file, if it exists (previous entries are recalled otherwise). Then start mysql with the --histignore="*" option to ignore all new input lines. To re-enable the recall (and logging) behavior, restart mysql without the option.

If you prevent the .mysql_history file from being created (see Controlling the History File) and use --histignore="*" to start the mysql client, the interactive history recall facility is disabled fully. Alternatively, if you omit the --histignore option, you can recall the input lines entered during the current session.

\section*{Unicode Support on Windows}

Windows provides APIs based on UTF-16LE for reading from and writing to the console; the mysql client for Windows is able to use these APIs. The Windows installer creates an item in the MySQL menu named MySQL command line client - Unicode. This item invokes the mysql client with properties set to communicate through the console to the MySQL server using Unicode.

To take advantage of this support manually, run mysql within a console that uses a compatible Unicode font and set the default character set to a Unicode character set that is supported for communication with the server:
1. Open a console window.
2. Go to the console window properties, select the font tab, and choose Lucida Console or some other compatible Unicode font. This is necessary because console windows start by default using a DOS raster font that is inadequate for Unicode.
3. Execute mysql.exe with the--default-character-set=utf8mb4 (or utf8mb3) option. This option is necessary because utf16le is one of the character sets that cannot be used as the client character set. See Impermissible Client Character Sets.

With those changes, mysql uses the Windows APIs to communicate with the console using UTF-16LE, and communicate with the server using UTF-8. (The menu item mentioned previously sets the font and character set as just described.)

To avoid those steps each time you run mysql, you can create a shortcut that invokes mysql.exe. The shortcut should set the console font to Lucida Console or some other compatible Unicode font, and pass the --default-character-set=utf8mb4 (or utf8mb3) option to mysql.exe.

Alternatively, create a shortcut that only sets the console font, and set the character set in the [mysql] group of your my. ini file:
```
[mysql]
default-character-set=utf8mb4 # or utf8mb3
```


\section*{Displaying Query Results Vertically}

Some query results are much more readable when displayed vertically, instead of in the usual horizontal table format. Queries can be displayed vertically by terminating the query with \G instead of a semicolon. For example, longer text values that include newlines often are much easier to read with vertical output:
```
mysql> SELECT * FROM mails WHERE LENGTH(txt) < 300 LIMIT 300,1\G
************************** 1. row ******************************
    msg_nro: 3068
            date: 2000-03-01 23:29:50
time_zone: +0200
mail_from: Jones
        reply: jones@example.com
    mail_to: "John Smith" <smith@example.com>
            sbj: UTF-8
            txt: >>>>> "John" == John Smith writes:
John> Hi. I think this is a good idea. Is anyone familiar
John> with UTF-8 or Unicode? Otherwise, I'll put this on my
John> TODO list and see what happens.
```

```
Yes, please do that.
Regards,
Jones
    file: inbox-jani-1
    hash: 190402944
1 row in set (0.09 sec)
```


\section*{Using Safe-Updates Mode (--safe-updates)}

For beginners, a useful startup option is--safe-updates (or--i-am-a-dummy, which has the same effect). Safe-updates mode is helpful for cases when you might have issued an UPDATE or DELETE statement but forgotten the WHERE clause indicating which rows to modify. Normally, such statements update or delete all rows in the table. With --safe-updates, you can modify rows only by specifying the key values that identify them, or a LIMIT clause, or both. This helps prevent accidents. Safe-updates mode also restricts SELECT statements that produce (or are estimated to produce) very large result sets.

The --safe-updates option causes mysql to execute the following statement when it connects to the MySQL server, to set the session values of the sql_safe_updates, sql_select_limit, and max_join_size system variables:

SET sql_safe_updates=1, sql_select_limit=1000, max_join_size=1000000;
The SET statement affects statement processing as follows:
- Enabling sql_safe_updates causes UPDATE and DELETE statements to produce an error if they do not specify a key constraint in the WHERE clause, or provide a LIMIT clause, or both. For example:
```
UPDATE tbl_name SET not_key_column=val WHERE key_column=val;
UPDATE tbl_name SET not_key_column=val LIMIT 1;
```

- Setting sql_select_limit to 1,000 causes the server to limit all SELECT result sets to 1,000 rows unless the statement includes a LIMIT clause.
- Setting max_join_size to $1,000,000$ causes multiple-table SELECT statements to produce an error if the server estimates it must examine more than $1,000,000$ row combinations.

To specify result set limits different from 1,000 and $1,000,000$, you can override the defaults by using the --select-limit and --max-join-size options when you invoke mysql:
```
mysql --safe-updates --select-limit=500 --max-join-size=10000
```


It is possible for UPDATE and DELETE statements to produce an error in safe-updates mode even with a key specified in the WHERE clause, if the optimizer decides not to use the index on the key column:
- Range access on the index cannot be used if memory usage exceeds that permitted by the range_optimizer_max_mem_size system variable. The optimizer then falls back to a table scan. See Limiting Memory Use for Range Optimization.
- If key comparisons require type conversion, the index may not be used (see Section 10.3.1, "How MySQL Uses Indexes"). Suppose that an indexed string column c1 is compared to a numeric value using WHERE c1 $=2222$. For such comparisons, the string value is converted to a number and the operands are compared numerically (see Section 14.3, "Type Conversion in Expression Evaluation"), preventing use of the index. If safe-updates mode is enabled, an error occurs.

These behaviors are included in safe-updates mode:
- EXPLAIN with UPDATE and DELETE statements does not produce safe-updates errors. This enables use of EXPLAIN plus SHOW WARNINGS to see why an index is not used, which can be helpful in cases such as when a range_optimizer_max_mem_size violation or type conversion occurs and the optimizer does not use an index even though a key column was specified in the WHERE clause.
- When a safe-updates error occurs, the error message includes the first diagnostic that was produced, to provide information about the reason for failure. For example, the message may indicate that the range_optimizer_max_mem_size value was exceeded or type conversion occurred, either of which can preclude use of an index.
- For multiple-table deletes and updates, an error is produced with safe updates enabled only if any target table uses a table scan.

\section*{Disabling mysql Auto-Reconnect}

If the mysql client loses its connection to the server while sending a statement, it immediately and automatically tries to reconnect once to the server and send the statement again. However, even if mysql succeeds in reconnecting, your first connection has ended and all your previous session objects and settings are lost: temporary tables, the autocommit mode, and user-defined and session variables. Also, any current transaction rolls back. This behavior may be dangerous for you, as in the following example where the server was shut down and restarted between the first and second statements without you knowing it:
```
mysql> SET @a=1;
Query OK, 0 rows affected (0.05 sec)
mysql> INSERT INTO t VALUES(@a);
ERROR 2006: MySQL server has gone away
No connection. Trying to reconnect...
Connection id: 1
Current database: test
Query OK, 1 row affected (1.30 sec)
mysql> SELECT * FROM t;
+------+
| a |
+------+
| NULL |
+------+
1 row in set (0.05 sec)
```


The @a user variable has been lost with the connection, and after the reconnection it is undefined. If it is important to have mysql terminate with an error if the connection has been lost, you can start the mysql client with the --skip-reconnect option.

For more information about auto-reconnect and its effect on state information when a reconnection occurs, see Automatic Reconnection Control.

\section*{mysql Client Parser Versus Server Parser}

The mysql client uses a parser on the client side that is not a duplicate of the complete parser used by the mysqld server on the server side. This can lead to differences in treatment of certain constructs. Examples:
- The server parser treats strings delimited by " characters as identifiers rather than as plain strings if the ANSI_QUOTES SQL mode is enabled.

The mysql client parser does not take the ANSI_QUOTES SQL mode into account. It treats strings delimited by ", ', and ˋ characters the same, regardless of whether ANSI_QUOTES is enabled.
- Within /*! ... */ and /*+ ... */ comments, the mysql client parser interprets short-form mysql commands. The server parser does not interpret them because these commands have no meaning on the server side.

If it is desirable for mysql not to interpret short-form commands within comments, a partial workaround is to use the --binary-mode option, which causes all mysql commands to be disabled except \C and \d in noninteractive mode (for input piped to mysql or loaded using the source command).

\subsection*{6.5.2 mysqladmin - A MySQL Server Administration Program}
mysqladmin is a client for performing administrative operations. You can use it to check the server's configuration and current status, to create and drop databases, and more.

Invoke mysqladmin like this:
mysqladmin [options] command [command-arg] [command [command-arg]] ...
mysqladmin supports the following commands. Some of the commands take an argument following the command name.
- create db_name

Create a new database named $d b \_n$ ame.
- debug

Tells the server to write debug information to the error log. The connected user must have the SUPER privilege. Format and content of this information is subject to change.

This includes information about the Event Scheduler. See Section 27.4.5, "Event Scheduler Status".
- drop db_name

Delete the database named $d b \_n$ ame and all its tables.
- extended-status

Display the server status variables and their values.
- flush-hosts

Flush all information in the host cache. See Section 7.1.12.3, "DNS Lookups and the Host Cache".
- flush-logs [log_type ...]

Flush all logs.
The mysqladmin flush-logs command permits optional log types to be given, to specify which logs to flush. Following the flush-logs command, you can provide a space-separated list of one or more of the following log types: binary, engine, error, general, relay, slow. These correspond to the log types that can be specified for the FLUSH LOGS SQL statement.
- flush-privileges

Reload the grant tables (same as reload).
- flush-status

Clear status variables.
- flush-tables

Flush all tables.
- kill id,id,...

Kill server threads. If multiple thread ID values are given, there must be no spaces in the list.
To kill threads belonging to other users, the connected user must have the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege).
- password new_password

Set a new password. This changes the password to new_password for the account that you use with mysqladmin for connecting to the server. Thus, the next time you invoke mysqladmin (or any other client program) using the same account, you must specify the new password.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0430.jpg?height=122&width=113&top_left_y=404&top_left_x=333)

\section*{Warning}

Setting a password using mysqladmin should be considered insecure. On some systems, your password becomes visible to system status programs such as ps that may be invoked by other users to display command lines. MySQL clients typically overwrite the command-line password argument with zeros during their initialization sequence. However, there is still a brief interval during which the value is visible. Also, on some systems this overwriting strategy is ineffective and the password remains visible to ps. (SystemV Unix systems and perhaps others are subject to this problem.)

If the new_password value contains spaces or other characters that are special to your command interpreter, you need to enclose it within quotation marks. On Windows, be sure to use double quotation marks rather than single quotation marks; single quotation marks are not stripped from the password, but rather are interpreted as part of the password. For example:
mysqladmin password "my new password"
The new password can be omitted following the password command. In this case, mysqladmin prompts for the password value, which enables you to avoid specifying the password on the command line. Omitting the password value should be done only if password is the final command on the mysqladmin command line. Otherwise, the next argument is taken as the password.

\section*{Caution}

Do not use this command used if the server was started with the --skip-grant-tables option. No password change is applied. This is true even if you precede the password command with flush-privileges on the same command line to re-enable the grant tables because the flush operation occurs after you connect. However, you can use mysqladmin flush-privileges to re-enable the grant tables and then use a separate mysqladmin password command to change the password.
- ping

Check whether the server is available. The return status from mysqladmin is 0 if the server is running, 1 if it is not. This is 0 even in case of an error such as Access denied, because this means that the server is running but refused the connection, which is different from the server not running.
- processlist

Show a list of active server threads. This is like the output of the SHOW PROCESSLIST statement. If the --verbose option is given, the output is like that of SHOW FULL PROCESSLIST. (See Section 15.7.7.31, "SHOW PROCESSLIST Statement".)
- reload

Reload the grant tables.
- refresh

Flush all tables and close and open log files.
- shutdown

Stop the server.
- start-replica

Start replication on a replica server.
- start-slave

This is a deprecated alias for start-replica.
- status

Display a short server status message.
- stop-replica

Stop replication on a replica server.
- stop-slave

This is a deprecated alias for stop-replica.
- variables

Display the server system variables and their values.
- version

Display version information from the server.
All commands can be shortened to any unique prefix. For example:
```
$> mysqladmin proc stat
+----+-------+------------+----+---------+------+-------+------------------
| Id | User | Host | db | Command | Time | State | Info |
+----+--------+------------+----+---------+------+-------+------------------
| 51 | jones | localhost | | Query | 0 | | show processlist |
+----+-------+------------+----+---------+------+-------+------------------+
Uptime: 1473624 Threads: 1 Questions: 39487
Slow queries: 0 Opens: 541 Flush tables: 1
Open tables: 19 Queries per second avg: 0.0268
```


The mysqladmin status command result displays the following values:
- Uptime

The number of seconds the MySQL server has been running.
- Threads

The number of active threads (clients).
- Questions

The number of questions (queries) from clients since the server was started.
- Slow queries

The number of queries that have taken more than long_query_time seconds. See Section 7.4.5, "The Slow Query Log".
- Opens

The number of tables the server has opened.
- Flush tables

The number of flush-*, refresh, and reload commands the server has executed.
- Open tables

The number of tables that currently are open.
If you execute mysqladmin shutdown when connecting to a local server using a Unix socket file, mysqladmin waits until the server's process ID file has been removed, to ensure that the server has stopped properly.
mysqladmin supports the following options, which can be specified on the command line or in the [mysqladmin] and [client] groups of an option file. For information about option files used by MySQL programs, see Section 6.2.2.2, "Using Option Files".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.11 mysqladmin Options}
\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --bind-address & Use specified network interface to connect to MySQL Server \\
\hline --character-sets-dir & Directory where character sets can be found \\
\hline --compress & Compress all information sent between client and server \\
\hline --compression-algorithms & Permitted compression algorithms for connections to server \\
\hline --connect-timeout & Number of seconds before connection timeout \\
\hline --count & Number of iterations to make for repeated command execution \\
\hline --debug & Write debugging log \\
\hline --debug-check & Print debugging information when program exits \\
\hline --debug-info & Print debugging information, memory, and CPU statistics when program exits \\
\hline --default-auth & Authentication plugin to use \\
\hline --default-character-set & Specify default character set \\
\hline --defaults-extra-file & Read named option file in addition to usual option files \\
\hline --defaults-file & Read only named option file \\
\hline --defaults-group-suffix & Option group suffix value \\
\hline --enable-cleartext-plugin & Enable cleartext authentication plugin \\
\hline --force & Continue even if an SQL error occurs \\
\hline --get-server-public-key & Request RSA public key from server \\
\hline --help & Display help message and exit \\
\hline --host & Host on which MySQL server is located \\
\hline --login-path & Read login path options from .mylogin.cnf \\
\hline --no-beep & Do not beep when errors occur \\
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
\hline --relative & Show the difference between the current and previous values when used with the --sleep option \\
\hline --server-public-key-path & Path name to file containing RSA public key \\
\hline --shared-memory-base-name & Shared-memory name for shared-memory connections (Windows only) \\
\hline --show-warnings & Show warnings after statement execution \\
\hline --shutdown-timeout & The maximum number of seconds to wait for server shutdown \\
\hline --silent & Silent mode \\
\hline --sleep & Execute commands repeatedly, sleeping for delay seconds in between \\
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
\hline --tls-ciphersuites & Permissible TLSv1.3 ciphersuites for encrypted connections \\
\hline --tls-sni-servername & Server name supplied by the client \\
\hline --tls-version & Permissible TLS protocols for encrypted connections \\
\hline --user & MySQL user name to use when connecting to server \\
\hline --verbose & Verbose mode \\
\hline --version & Display version information and exit \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --vertical & Print query output rows vertically (one line per column value) \\
\hline --wait & If the connection cannot be established, wait and retry instead of aborting \\
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
\hline Command-Line Format & --character-sets-dir=path \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

The directory where character sets are installed. See Section 12.15, "Character Set Configuration".
- --compress, -C

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -compress $[=\{\mathrm{OFF} \mid \mathrm{ON}\}]$ \\
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
- --connect-timeout=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & --connect-timeout=value \\
\hline Type & Numeric \\
\hline Default Value & 43200 \\
\hline
\end{tabular}

The maximum number of seconds before connection timeout. The default value is 43200 ( 12 hours).
- --count $=N$, -c $N$

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- count $=\#$ \\
\hline
\end{tabular}

The number of iterations to make for repeated command execution if the --sleep option is given.
- --debug[=debug_options], -\# [debug_options]

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug [=debug_options] \\
\hline Type & String \\
\hline Default Value & d:t:o,/tmp/mysqladmin.trace \\
\hline
\end{tabular}

Write a debugging log. A typical debug_options string is $\mathrm{d}: \mathrm{t}: \mathrm{o}$, file_name. The default is d:t:o,/tmp/mysqladmin.trace.

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

\begin{tabular}{l|l|lc|}
\cline { 2 - 4 } & Command-Line Format & - - debug - info & 405 \\
\hline & Type & Boolean & \\
\cline { 2 - 4 } & &
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & FALSE \\
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
- --default-character-set=charset_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - default - character - set=charset_name \\
\hline Type & String \\
\hline
\end{tabular}

Use charset_name as the default character set. See Section 12.15, "Character Set Configuration".
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

Read not only the usual option groups, but also groups with the usual names and a suffix of str. For example, mysqladmin normally reads the [client] and [mysqladmin] groups. If this option is given as --defaults-group-suffix=_other, mysqladmin also reads the [client_other] and [mysqladmin_other] groups.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --enable-cleartext-plugin

\begin{tabular}{|l|l|}
\hline Command-Line Format & --enable-cleartext-plugin \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Enable the mysql_clear_password cleartext authentication plugin. (See Section 8.4.1.4, "ClientSide Cleartext Pluggable Authentication".)
- --force, -f

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - force \\
\hline
\end{tabular}

Do not ask for confirmation for the drop db_name command. With multiple commands, continue even if an error occurs.
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

\begin{tabular}{l|l|l|}
\cline { 2 - 3 } & Command-Line Format & - - host=host_name \\
\cline { 2 - 3 } & Type & String \\
\hline & Default Value & localhost \\
\cline { 2 - 3 } &
\end{tabular}
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
\hline Command-Line Format & - - no - login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.
See--login-path for related information.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --no-beep, -b

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - beep \\
\hline
\end{tabular}

Suppress the warning beep that is emitted by default for errors such as a failure to connect to the server.
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

The password of the MySQL account used for connecting to the server. The password value is optional. If not given, mysqladmin prompts for one. If given, there must be no space between - password= or -p and the password following it. If no password option is specified, the default is to send no password.

Specifying a password on the command line should be considered insecure. To avoid giving the password on the command line, use an option file. See Section 8.1.2.1, "End-User Guidelines for Password Security".

To explicitly specify that there is no password and that mysqladmin should not prompt for one, use the --skip-password option.
- --password1[=pass_val]

The password for multifactor authentication factor 1 of the MySQL account used for connecting to the server. The password value is optional. If not given, mysql prompts for one. If given, there must be no space between - - password1 = and the password following it. If no password option is specified, the default is to send no password.

Specifying a password on the command line should be considered insecure. To avoid giving the password on the command line, use an option file. See Section 8.1.2.1, "End-User Guidelines for Password Security".

To explicitly specify that there is no password and that mysqladmin should not prompt for one, use the --skip-password1 option.
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

The directory in which to look for plugins. Specify this option if the --default-auth option is used to specify an authentication plugin but mysqladmin does not find it. See Section 8.2.17, "Pluggable Authentication".
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
---protocol=\{TCP|SOCKET|PIPE|MEMORY\}

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
- --relative, -r

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - relative \\
\hline
\end{tabular}

Show the difference between the current and previous values when used with the --sleep option. This option works only with the extended-status command.
- --server-public-key-path=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -server - public - key - path=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

The path name to a file in PEM format containing a client-side copy of the public key required by the server for RSA key pair-based password exchange. This option applies to clients that authenticate with the sha256_password (deprecated) or caching_sha2_password authentication plugin. This

RSA-based password exchange is not used, as is the case when the client connects to the server using a secure connection.

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
- --show-warnings

\begin{tabular}{|l|l|}
\hline Command-Line Format & --show-warnings \\
\hline
\end{tabular}

Show warnings resulting from execution of statements sent to the server.
- --shutdown-timeout=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - shutdown - timeout=seconds \\
\hline Type & Numeric \\
\hline Default Value & 3600 \\
\hline
\end{tabular}

The maximum number of seconds to wait for server shutdown. The default value is 3600 (1 hour).
- --silent, -s

\begin{tabular}{|l|l|}
\hline Command-Line Format & --silent \\
\hline
\end{tabular}

Exit silently if a connection to the server cannot be established.
- --sleep=delay, -i delay

\begin{tabular}{|l|l|}
\hline Command-Line Format & --sleep=delay \\
\hline
\end{tabular}

Execute commands repeatedly, sleeping for delay seconds in between. The --count option determines the number of iterations. If - - count is not given, mysqladmin executes commands indefinitely until interrupted.

\begin{tabular}{|l|l|} 
Type & String \\
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

Controls whether to enable FIPS mode on the client side. The --ssl-fips-mode option differs from other - $-\mathrm{ssl}-x x x$ options in that it is not used to establish encrypted connections, but rather to affect which cryptographic operations to permit. See Section 8.8, "FIPS Support".

These--ssl-fips-mode values are permitted:
- OFF: Disable FIPS mode.
- ON: Enable FIPS mode.
- STRICT: Enable "strict" FIPS mode.

\section*{Note}

If the OpenSSL FIPS Object Module is not available, the only permitted value for--ssl-fips-mode is OFF. In this case, setting--ssl-fips-mode to ON or STRICT causes the client to produce a warning at startup and to operate in non-FIPS mode.

This option is deprecated. Expect it to be removed in a future version of MySQL.
- --tls-ciphersuites=ciphersuite_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tls-ciphersuites=ciphersuite_list \\
\hline Type & String \\
\hline
\end{tabular}

The permissible ciphersuites for encrypted connections that use TLSv1.3. The value is a list of one or more colon-separated ciphersuite names. The ciphersuites that can be named for this option
depend on the SSL library used to compile MySQL. For details, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".
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
- --user=user_name, - u user_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - user=user_name, \\
\hline Type & String \\
\hline
\end{tabular}

The user name of the MySQL account to use for connecting to the server.
If you are using the Rewriter plugin, grant this user the SKIP_QUERY_REWRITE privilege.
- --verbose, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & --verbose \\
\hline
\end{tabular}

Verbose mode. Print more information about what the program does.
- --version, -V
- --vertical, -E

\begin{tabular}{|l|l|}
\hline Command-Line Format & --vertical \\
\hline
\end{tabular}

Print output vertically. This is similar to --relative, but prints output vertically.
- --wait[=count], -w[count]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --wait \\
\hline
\end{tabular}

If the connection cannot be established, wait and retry instead of aborting. If a count value is given, it indicates the number of times to retry. The default is one time.
- --zstd-compression-level=level

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- zstd-compression-level=\# \\
\hline Type & Integer \\
\hline
\end{tabular}

The compression level to use for connections to the server that use the zstd compression algorithm. The permitted levels are from 1 to 22, with larger values indicating increasing levels of compression. The default zstd compression level is 3 . The compression level setting has no effect on connections that do not use zstd compression.

For more information, see Section 6.2.8, "Connection Compression Control".

\subsection*{6.5.3 mysqlcheck - A Table Maintenance Program}

The mysqlcheck client performs table maintenance: It checks, repairs, optimizes, or analyzes tables.
Each table is locked and therefore unavailable to other sessions while it is being processed, although for check operations, the table is locked with a READ lock only (see Section 15.3.6, "LOCK TABLES and UNLOCK TABLES Statements", for more information about READ and WRITE locks). Table maintenance operations can be time-consuming, particularly for large tables. If you use the databases or --all-databases option to process all tables in one or more databases, an invocation of mysqlcheck might take a long time. (This is also true for the MySQL upgrade procedure if it determines that table checking is needed because it processes tables the same way.)
mysqlcheck must be used when the mysqld server is running, which means that you do not have to stop the server to perform table maintenance.
mysqlcheck uses the SQL statements CHECK TABLE, REPAIR TABLE, ANALYZE TABLE, and OPTIMIZE TABLE in a convenient way for the user. It determines which statements to use for the operation you want to perform, and then sends the statements to the server to be executed. For details about which storage engines each statement works with, see the descriptions for those statements in Section 15.7.3, "Table Maintenance Statements".

All storage engines do not necessarily support all four maintenance operations. In such cases, an error message is displayed. For example, if test. t is an MEMORY table, an attempt to check it produces this result:
```
$> mysqlcheck test t
test.t
note : The storage engine for the table doesn't support check
```


If mysqlcheck is unable to repair a table, see Section 3.14, "Rebuilding or Repairing Tables or Indexes" for manual table repair strategies. This is the case, for example, for InnoDB tables, which can be checked with CHECK TABLE, but not repaired with REPAIR TABLE.

\section*{Caution}

It is best to make a backup of a table before performing a table repair operation; under some circumstances the operation might cause data loss. Possible causes include but are not limited to file system errors.

There are three general ways to invoke mysqlcheck:
```
mysqlcheck [options] db_name [tbl_name ...]
mysqlcheck [options] --databases db_name ...
mysqlcheck [options] --all-databases
```


If you do not name any tables following $d b \_$name or if you use the --databases or --alldatabases option, entire databases are checked.
mysqlcheck has a special feature compared to other client programs. The default behavior of checking tables (--check) can be changed by renaming the binary. If you want to have a tool that repairs tables by default, you should just make a copy of mysqlcheck named mysqlrepair, or make a symbolic link to mysqlcheck named mysqlrepair. If you invoke mysqlrepair, it repairs tables.

The names shown in the following table can be used to change mysqlcheck default behavior.

\begin{tabular}{|l|l|}
\hline Command & Meaning \\
\hline mysqlrepair & The default option is - - repair \\
\hline mysqlanalyze & The default option is - - analyze \\
\hline mysqloptimize & The default option is - - optimize \\
\hline
\end{tabular}
mysqlcheck supports the following options, which can be specified on the command line or in the [mysqlcheck] and [client] groups of an option file. For information about option files used by MySQL programs, see Section 6.2.2.2, "Using Option Files".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.12 mysqlcheck Options}
\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --all-databases & Check all tables in all databases \\
\hline --all-in-1 & Execute a single statement for each database that names all the tables from that database \\
\hline --analyze & Analyze the tables \\
\hline --auto-repair & If a checked table is corrupted, automatically fix it \\
\hline --bind-address & Use specified network interface to connect to MySQL Server \\
\hline --character-sets-dir & Directory where character sets are installed \\
\hline --check & Check the tables for errors \\
\hline --check-only-changed & Check only tables that have changed since the last check \\
\hline --check-upgrade & Invoke CHECK TABLE with the FOR UPGRADE option \\
\hline --compress & Compress all information sent between client and server \\
\hline --compression-algorithms & Permitted compression algorithms for connections to server \\
\hline --databases & Interpret all arguments as database names \\
\hline --debug & Write debugging log \\
\hline --debug-check & Print debugging information when program exits \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --debug-info & Print debugging information, memory, and CPU statistics when program exits \\
\hline --default-auth & Authentication plugin to use \\
\hline --default-character-set & Specify default character set \\
\hline --defaults-extra-file & Read named option file in addition to usual option files \\
\hline --defaults-file & Read only named option file \\
\hline --defaults-group-suffix & Option group suffix value \\
\hline --enable-cleartext-plugin & Enable cleartext authentication plugin \\
\hline --extended & Check and repair tables \\
\hline --fast & Check only tables that have not been closed properly \\
\hline --force & Continue even if an SQL error occurs \\
\hline --get-server-public-key & Request RSA public key from server \\
\hline --help & Display help message and exit \\
\hline --host & Host on which MySQL server is located \\
\hline --login-path & Read login path options from .mylogin.cnf \\
\hline --medium-check & Do a check that is faster than an --extended operation \\
\hline --no-defaults & Read no option files \\
\hline --no-login-paths & Do not read login paths from the login path file \\
\hline --optimize & Optimize the tables \\
\hline --password & Password to use when connecting to server \\
\hline --password1 & First multifactor authentication password to use when connecting to server \\
\hline --password2 & Second multifactor authentication password to use when connecting to server \\
\hline --password3 & Third multifactor authentication password to use when connecting to server \\
\hline --pipe & Connect to server using named pipe (Windows only) \\
\hline --plugin-dir & Directory where plugins are installed \\
\hline --port & TCP/IP port number for connection \\
\hline --print-defaults & Print default options \\
\hline --protocol & Transport protocol to use \\
\hline --quick & The fastest method of checking \\
\hline --repair & Perform a repair that can fix almost anything except unique keys that are not unique \\
\hline --server-public-key-path & Path name to file containing RSA public key \\
\hline --shared-memory-base-name & Shared-memory name for shared-memory connections (Windows only) \\
\hline --silent & Silent mode \\
\hline --skip-database & Omit this database from performed operations \\
\hline --socket & Unix socket file or Windows named pipe to use \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
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
\hline --tables & Overrides the --databases or -B option \\
\hline --tls-ciphersuites & Permissible TLSv1.3 ciphersuites for encrypted connections \\
\hline --tls-sni-servername & Server name supplied by the client \\
\hline --tls-version & Permissible TLS protocols for encrypted connections \\
\hline --use-frm & For repair operations on MyISAM tables \\
\hline --user & MySQL user name to use when connecting to server \\
\hline --verbose & Verbose mode \\
\hline --version & Display version information and exit \\
\hline --write-binlog & Log ANALYZE, OPTIMIZE, REPAIR statements to binary log. --skip-write-binlog adds NO_WRITE_TO_BINLOG to these statements \\
\hline --zstd-compression-level & Compression level for connections to server that use zstd compression \\
\hline
\end{tabular}
- --help, -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- help \\
\hline
\end{tabular}

Display a help message and exit.
- --all-databases, -A

\begin{tabular}{|l|l|}
\hline Command-Line Format & --all-databases \\
\hline
\end{tabular}

Check all tables in all databases. This is the same as using the --databases option and naming all the databases on the command line, except that the INFORMATION_SCHEMA and performance_schema databases are not checked. They can be checked by explicitly naming them with the --databases option.
- --all-in-1, -1

\begin{tabular}{|l|l|}
\hline Command-Line Format & --all-in-1 \\
\hline
\end{tabular}

Instead of issuing a statement for each table, execute a single statement for each database that names all the tables from that database to be processed.
- --analyze, -a

\begin{tabular}{|l|l|}
\hline Command-Line Format & --analyze \\
\hline
\end{tabular}

Analyze the tables.
- --auto-repair

\begin{tabular}{|l|l|}
\hline Command-Line Format & --auto-repair \\
\hline
\end{tabular}

If a checked table is corrupted, automatically fix it. Any necessary repairs are done after all tables have been checked.
- --bind-address=ip_address

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - bind - address=ip_address \\
\hline
\end{tabular}

On a computer having multiple network interfaces, use this option to select which interface to use for connecting to the MySQL server.
- --character-sets-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --character-sets-dir=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

The directory where character sets are installed. See Section 12.15, "Character Set Configuration".
- --check, -c

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - check \\
\hline
\end{tabular}

Check the tables for errors. This is the default operation.
- --check-only-changed, - C

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - check - only-changed \\
\hline
\end{tabular}

Check only tables that have changed since the last check or that have not been closed properly.
- --check-upgrade, -g

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - check - upgrade \\
\hline
\end{tabular}

Invoke CHECK TABLE with the FOR UPGRADE option to check tables for incompatibilities with the current version of the server.
- --compress

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
- --databases, -B

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - databases \\
\hline
\end{tabular}

Process all tables in the named databases. Normally, mysqlcheck treats the first name argument on the command line as a database name and any following names as table names. With this option, it treats all name arguments as database names.
- --debug[=debug_options], -\# [debug_options]

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug [=debug_options] \\
\hline Type & String \\
\hline Default Value & d: t: o \\
\hline
\end{tabular}

Write a debugging log. A typical debug_options string is $\mathrm{d}: \mathrm{t}: \mathrm{o}$,file_name. The default is d:t:o.

This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- --debug-check

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug - check \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Default Value & FALSE \\
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
\hline Command-Line Format & - - default - character - set=charset_name \\
\hline Type & String \\
\hline
\end{tabular}

Use charset_name as the default character set. See Section 12.15, "Character Set Configuration".
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

Read not only the usual option groups, but also groups with the usual names and a suffix of str. For example, mysqlcheck normally reads the [client] and [mysqlcheck] groups. If this option is given as --defaults-group-suffix=_other, mysqlcheck also reads the [client_other] and [mysqlcheck_other] groups.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --extended, -e

\begin{tabular}{|l|l|}
\hline Command-Line Format & --extended \\
\hline
\end{tabular}

If you are using this option to check tables, it ensures that they are $100 \%$ consistent but takes a long time.

If you are using this option to repair tables, it runs an extended repair that may not only take a long time to execute, but may produce a lot of garbage rows also!
- --default-auth=plugin

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - default - auth=plugin \\
\hline Type & String \\
\hline
\end{tabular}

A hint about which client-side authentication plugin to use. See Section 8.2.17, "Pluggable Authentication".
- --enable-cleartext-plugin

\begin{tabular}{|l|l|}
\hline Command-Line Format & --enable-cleartext-plugin \\
\hline Type & Boolean \\
\hline Default Value & FALSE \\
\hline
\end{tabular}

Enable the mysql_clear_password cleartext authentication plugin. (See Section 8.4.1.4, "ClientSide Cleartext Pluggable Authentication".)
- --fast, -F

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - fast \\
\hline
\end{tabular}

Check only tables that have not been closed properly.
- --force, -f

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - force \\
\hline
\end{tabular}

Continue even if an SQL error occurs.
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
\hline Command-Line Format & - - host=host_name \\
\hline Type & String \\
\hline Default Value & localhost \\
\hline
\end{tabular}

Connect to the MySQL server on the given host.
- --login-path=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login- path=name \\
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
- --medium-check, -m

\begin{tabular}{|l|l|}
\hline Command-Line Format & --medium-check \\
\hline
\end{tabular}

Do a check that is faster than an --extended operation. This finds only $99.99 \%$ of all errors, which should be good enough in most cases.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read any option files. If program startup fails due to reading unknown options from an option file, --no-defaults can be used to prevent them from being read.

The exception is that the .mylogin.cnf file is read in all cases, if it exists. This permits passwords to be specified in a safer way than on the command line even when --no-defaults is used. To create. mylogin.cnf, use the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --optimize, -o

\begin{tabular}{|l|l|}
\hline Command-Line Format & --optimize \\
\hline
\end{tabular}

Optimize the tables.
- --password[=password], -p[password]

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- password [=password] \\
\hline Type & String \\
\hline
\end{tabular}

The password of the MySQL account used for connecting to the server. The password value is optional. If not given, mysqlcheck prompts for one. If given, there must be no space between - password= or - p and the password following it. If no password option is specified, the default is to send no password.

Specifying a password on the command line should be considered insecure. To avoid giving the password on the command line, use an option file. See Section 8.1.2.1, "End-User Guidelines for Password Security".

To explicitly specify that there is no password and that mysqlcheck should not prompt for one, use the --skip-password option.
- --password1[=pass_val]

The password for multifactor authentication factor 1 of the MySQL account used for connecting to the server. The password value is optional. If not given, mysqlcheck prompts for one. If given, there must be no space between --password1= and the password following it. If no password option is specified, the default is to send no password.

Specifying a password on the command line should be considered insecure. To avoid giving the password on the command line, use an option file. See Section 8.1.2.1, "End-User Guidelines for Password Security".

To explicitly specify that there is no password and that mysqlcheck should not prompt for one, use the --skip-password1 option.
- - -password2[=pass_val]

The password for multifactor authentication factor 2 of the MySQL account used for connecting to the server. The semantics of this option are similar to the semantics for --password1; see the description of that option for details.
- --password3[=pass_val]

The password for multifactor authentication factor 3 of the MySQL account used for connecting to the server. The semantics of this option are similar to the semantics for --password1; see the description of that option for details.
- --pipe, -W

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -pipe \\
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

The directory in which to look for plugins. Specify this option if the --default-auth option is used to specify an authentication plugin but mysqlcheck does not find it. See Section 8.2.17, "Pluggable Authentication".
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
\hline Command-Line Format & -- protocol=type \\
\hline Type & String \\
\hline Default Value & {$[$ see text $]$} \\
\hline Valid Values & TCP
\end{tabular}

\begin{tabular}{|l|l|}
\hline & \begin{tabular}{l}
SOCKET \\
PIPE \\
MEMORY
\end{tabular} \\
\hline
\end{tabular}

The transport protocol to use for connecting to the server. It is useful when the other connection parameters normally result in use of a protocol other than the one you want. For details on the permissible values, see Section 6.2.7, "Connection Transport Protocols".
- --quick, -q

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - quick \\
\hline
\end{tabular}

If you are using this option to check tables, it prevents the check from scanning the rows to check for incorrect links. This is the fastest check method.

If you are using this option to repair tables, it tries to repair only the index tree. This is the fastest repair method.
- --repair, - r

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - repair \\
\hline
\end{tabular}

Perform a repair that can fix almost anything except unique keys that are not unique.
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

Silent mode. Print only error messages.
- --skip-database=db_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-database=db_name \\
\hline
\end{tabular}

Do not include the named database (case-sensitive) in the operations performed by mysqlcheck.
- --socket=path, -S path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -socket $=\{$ file_name $\mid$ pipe_name $\}$ \\
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
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0457.jpg?height=122&width=95&top_left_y=331&top_left_x=406)

> Note
> If the OpenSSL FIPS Object Module is not available, the only permitted value for --ssl-fips-mode is OFF. In this case, setting--ssl-fips-mode to ON or STRICT causes the client to produce a warning at startup and to operate in non-FIPS mode.

This option is deprecated. Expect it to be removed in a future version of MySQL.
- --tables

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - tables \\
\hline
\end{tabular}

Override the --databases or - B option. All name arguments following the option are regarded as table names.
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
library used to compile MySQL. For details, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".
- --use-frm

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - use - frm \\
\hline
\end{tabular}

For repair operations on MyISAM tables, get the table structure from the data dictionary so that the table can be repaired even if the . MYI header is corrupted.
- --user=user_name, - u user_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - user=user_name, \\
\hline Type & String \\
\hline
\end{tabular}

The user name of the MySQL account to use for connecting to the server.
- --verbose, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -verbose \\
\hline
\end{tabular}

Verbose mode. Print information about the various stages of program operation.
- --version, -V

\begin{tabular}{|l|l|}
\hline Command-Line Format & --version \\
\hline
\end{tabular}

Display version information and exit.
- --write-binlog

\begin{tabular}{|l|l|}
\hline Command-Line Format & --write-binlog \\
\hline
\end{tabular}

This option is enabled by default, so that ANALYZE TABLE, OPTIMIZE TABLE, and REPAIR TABLE statements generated by mysqlcheck are written to the binary log. Use --skip-write-binlog to cause NO_WRITE_TO_BINLOG to be added to the statements so that they are not logged. Use the --skip-write-binlog when these statements should not be sent to replicas or run when using the binary logs for recovery from backup.
---zstd-compression-level=level

\begin{tabular}{|l|l|}
\hline Command-Line Format & --zstd-compression-level=\# \\
\hline Type & Integer \\
\hline
\end{tabular}

The compression level to use for connections to the server that use the zstd compression algorithm. The permitted levels are from 1 to 22, with larger values indicating increasing levels of compression. The default zstd compression level is 3 . The compression level setting has no effect on connections that do not use zstd compression.

The mysqldump client utility performs logical backups, producing a set of SQL statements that can be executed to reproduce the original database object definitions and table data. It dumps one or more MySQL databases for backup or transfer to another SQL server. The mysqldump command can also generate output in CSV, other delimited text, or XML format.

\section*{Tip}

Consider using the MySQL Shell dump utilities, which provide parallel dumping with multiple threads, file compression, and progress information display, as well as cloud features such as Oracle Cloud Infrastructure Object Storage streaming, and MySQL HeatWave compatibility checks and modifications. Dumps can be easily imported into a MySQL Server instance or a MySQL HeatWave DB System using the MySQL Shell load dump utilities. Installation instructions for MySQL Shell can be found here.
- Performance and Scalability Considerations
- Invocation Syntax
- Option Syntax - Alphabetical Summary
- Connection Options
- Option-File Options
- DDL Options
- Debug Options
- Help Options
- Internationalization Options
- Replication Options
- Format Options
- Filtering Options
- Performance Options
- Transactional Options
- Option Groups
- Examples
- Restrictions
mysqldump requires at least the SELECT privilege for dumped tables, SHOW VIEW for dumped views, TRIGGER for dumped triggers, LOCK TABLES if the --single-transaction option is not used, PROCESS if the --no-tablespaces option is not used, and the RELOAD or FLUSH_TABLES privilege with --single-transaction if both gtid_mode=ON and gtid_purged=ON|AUTO. Certain options might require other privileges as noted in the option descriptions.

To reload a dump file, you must have the privileges required to execute the statements that it contains, such as the appropriate CREATE privileges for objects created by those statements.
mysqldump output can include ALTER DATABASE statements that change the database collation. These may be used when dumping stored programs to preserve their character encodings. To reload a dump file containing such statements, the ALTER privilege for the affected database is required.

\section*{Note}

A dump made using PowerShell on Windows with output redirection creates a file that has UTF-16 encoding:
mysqldump [options] > dump.sql
However, UTF-16 is not permitted as a connection character set (see Impermissible Client Character Sets), so the dump file cannot be loaded correctly. To work around this issue, use the --result-file option, which creates the output in ASCII format:
mysqldump [options] --result-file=dump.sql
It is not recommended to load a dump file when GTIDs are enabled on the server (gtid_mode=0N), if your dump file includes system tables. mysqldump issues DML instructions for the system tables which use the non-transactional MyISAM storage engine, and this combination is not permitted when GTIDs are enabled.

\section*{Performance and Scalability Considerations}
mysqldump advantages include the convenience and flexibility of viewing or even editing the output before restoring. You can clone databases for development and DBA work, or produce slight variations of an existing database for testing. It is not intended as a fast or scalable solution for backing up substantial amounts of data. With large data sizes, even if the backup step takes a reasonable time, restoring the data can be very slow because replaying the SQL statements involves disk I/O for insertion, index creation, and so on.

For large-scale backup and restore, a physical backup is more appropriate, to copy the data files in their original format so that they can be restored quickly.

If your tables are primarily InnoDB tables, or if you have a mix of InnoDB and MyISAM tables, consider using mysqlbackup, which is available as part of MySQL Enterprise. This tool provides high performance for InnoDB backups with minimal disruption; it can also back up tables from MyISAM and other storage engines; it also provides a number of convenient options to accommodate different backup scenarios. See Section 32.1, "MySQL Enterprise Backup Overview".
mysqldump can retrieve and dump table contents row by row, or it can retrieve the entire content from a table and buffer it in memory before dumping it. Buffering in memory can be a problem if you are dumping large tables. To dump tables row by row, use the --quick option (or --opt, which enables --quick). The --opt option (and hence--quick) is enabled by default, so to enable memory buffering, use --skip-quick.

If you are using a recent version of mysqldump to generate a dump to be reloaded into a very old MySQL server, use the --skip-opt option instead of the --opt or--extended-insert option.

For additional information about mysqldump, see Section 9.4, "Using mysqldump for Backups".

\section*{Invocation Syntax}

There are in general three ways to use mysqldump-in order to dump a set of one or more tables, a set of one or more complete databases, or an entire MySQL server-as shown here:
```
mysqldump [options] db_name [tbl_name ...]
mysqldump [options] --databases db_name ...
mysqldump [options] --all-databases
```


To dump entire databases, do not name any tables following $d b \_n a m e$, or use the --databases or --all-databases option.

To see a list of the options your version of mysqldump supports, issue the command mysqldump -help.

\section*{Option Syntax - Alphabetical Summary}
mysqldump supports the following options, which can be specified on the command line or in the [mysqldump] and [client] groups of an option file. For information about option files used by MySQL programs, see Section 6.2.2.2, "Using Option Files".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.13 mysqldump Options}
\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --add-drop-database & Add DROP DATABASE statement before each CREATE DATABASE statement \\
\hline --add-drop-table & Add DROP TABLE statement before each CREATE TABLE statement \\
\hline --add-drop-trigger & Add DROP TRIGGER statement before each CREATE TRIGGER statement \\
\hline --add-locks & Surround each table dump with LOCK TABLES and UNLOCK TABLES statements \\
\hline --all-databases & Dump all tables in all databases \\
\hline --allow-keywords & Allow creation of column names that are keywords \\
\hline --apply-replica-statements & Include STOP REPLICA prior to CHANGE REPLICATION SOURCE TO statement and START REPLICA at end of output \\
\hline --apply-slave-statements & Include STOP SLAVE prior to CHANGE MASTER statement and START SLAVE at end of output \\
\hline --bind-address & Use specified network interface to connect to MySQL Server \\
\hline --character-sets-dir & Directory where character sets are installed \\
\hline --column-statistics & Write ANALYZE TABLE statements to generate statistics histograms \\
\hline --comments & Add comments to dump file \\
\hline --compact & Produce more compact output \\
\hline --compatible & Produce output that is more compatible with other database systems or with older MySQL servers \\
\hline --complete-insert & Use complete INSERT statements that include column names \\
\hline --compress & Compress all information sent between client and server \\
\hline --compression-algorithms & Permitted compression algorithms for connections to server \\
\hline --create-options & Include all MySQL-specific table options in CREATE TABLE statements \\
\hline --databases & Interpret all name arguments as database names \\
\hline --debug & Write debugging log \\
\hline --debug-check & Print debugging information when program exits \\
\hline --debug-info & Print debugging information, memory, and CPU statistics when program exits \\
\hline --default-auth & Authentication plugin to use \\
\hline --default-character-set & Specify default character set \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --defaults-extra-file & Read named option file in addition to usual option files \\
\hline --defaults-file & Read only named option file \\
\hline --defaults-group-suffix & Option group suffix value \\
\hline --delete-master-logs & On a replication source server, delete the binary logs after performing the dump operation \\
\hline --delete-source-logs & On a replication source server, delete the binary logs after performing the dump operation \\
\hline --disable-keys & For each table, surround INSERT statements with statements to disable and enable keys \\
\hline --dump-date & Include dump date as "Dump completed on" comment if --comments is given \\
\hline --dump-replica & Include CHANGE REPLICATION SOURCE TO statement that lists binary log coordinates of replica's source \\
\hline --dump-slave & Include CHANGE MASTER statement that lists binary log coordinates of replica's source \\
\hline --enable-cleartext-plugin & Enable cleartext authentication plugin \\
\hline --events & Dump events from dumped databases \\
\hline --extended-insert & Use multiple-row INSERT syntax \\
\hline --fields-enclosed-by & This option is used with the --tab option and has the same meaning as the corresponding clause for LOAD DATA \\
\hline --fields-escaped-by & This option is used with the --tab option and has the same meaning as the corresponding clause for LOAD DATA \\
\hline --fields-optionally-enclosed-by & This option is used with the --tab option and has the same meaning as the corresponding clause for LOAD DATA \\
\hline --fields-terminated-by & This option is used with the --tab option and has the same meaning as the corresponding clause for LOAD DATA \\
\hline --flush-logs & Flush MySQL server log files before starting dump \\
\hline --flush-privileges & Emit a FLUSH PRIVILEGES statement after dumping mysql database \\
\hline --force & Continue even if an SQL error occurs during a table dump \\
\hline --get-server-public-key & Request RSA public key from server \\
\hline --help & Display help message and exit \\
\hline --hex-blob & Dump binary columns using hexadecimal notation \\
\hline --host & Host on which MySQL server is located \\
\hline --ignore-error & Ignore specified errors \\
\hline --ignore-table & Do not dump given table \\
\hline --ignore-views & Skip dumping table views \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --include-master-host-port & Include MASTER_HOST/MASTER_PORT options in CHANGE MASTER statement produced with --dump-slave \\
\hline --include-source-host-port & Include SOURCE_HOST and SOURCE_PORT options in CHANGE REPLICATION SOURCE TO statement produced with --dump-replica \\
\hline --init-command & Single SQL statement to execute after connecting or re-connecting to MySQL server; resets existing defined commands \\
\hline --init-command-add & Add an additional SQL statement to execute after connecting or re-connecting to MySQL server \\
\hline --insert-ignore & Write INSERT IGNORE rather than INSERT statements \\
\hline --lines-terminated-by & This option is used with the --tab option and has the same meaning as the corresponding clause for LOAD DATA \\
\hline --lock-all-tables & Lock all tables across all databases \\
\hline --lock-tables & Lock all tables before dumping them \\
\hline --log-error & Append warnings and errors to named file \\
\hline --login-path & Read login path options from .mylogin.cnf \\
\hline --master-data & Write the binary log file name and position to the output \\
\hline --max-allowed-packet & Maximum packet length to send to or receive from server \\
\hline --mysqld-long-query-time & Session value for slow query threshold \\
\hline --net-buffer-length & Buffer size for TCP/IP and socket communication \\
\hline --network-timeout & Increase network timeouts to permit larger table dumps \\
\hline --no-autocommit & Enclose the INSERT statements for each dumped table within SET autocommit = 0 and COMMIT statements \\
\hline --no-create-db & Do not write CREATE DATABASE statements \\
\hline --no-create-info & Do not write CREATE TABLE statements that recreate each dumped table \\
\hline --no-data & Do not dump table contents \\
\hline --no-defaults & Read no option files \\
\hline --no-login-paths & Do not read login paths from the login path file \\
\hline --no-set-names & Same as --skip-set-charset \\
\hline --no-tablespaces & Do not write any CREATE LOGFILE GROUP or CREATE TABLESPACE statements in output \\
\hline --opt & Shorthand for --add-drop-table --add-locks --create-options --disable-keys --extended-insert --lock-tables --quick --set-charset \\
\hline --order-by-primary & Dump each table's rows sorted by its primary key, or by its first unique index \\
\hline --output-as-version & Determines replica and event terminology used in dumps; for compatibility with older versions \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --password & Password to use when connecting to server \\
\hline --password1 & First multifactor authentication password to use when connecting to server \\
\hline --password2 & Second multifactor authentication password to use when connecting to server \\
\hline --password3 & Third multifactor authentication password to use when connecting to server \\
\hline --pipe & Connect to server using named pipe (Windows only) \\
\hline --plugin-authentication-kerberos-client-mode & Permit GSSAPI pluggable authentication through the MIT Kerberos library on Windows \\
\hline --plugin-dir & Directory where plugins are installed \\
\hline --port & TCP/IP port number for connection \\
\hline --print-defaults & Print default options \\
\hline --protocol & Transport protocol to use \\
\hline --quick & Retrieve rows for a table from the server a row at a time \\
\hline --quote-names & Quote identifiers within backtick characters \\
\hline --replace & Write REPLACE statements rather than INSERT statements \\
\hline --result-file & Direct output to a given file \\
\hline --routines & Dump stored routines (procedures and functions) from dumped databases \\
\hline --server-public-key-path & Path name to file containing RSA public key \\
\hline --set-charset & Add SET NAMES default_character_set to output \\
\hline --set-gtid-purged & Whether to add SET @@GLOBAL.GTID_PURGED to output \\
\hline --shared-memory-base-name & Shared-memory name for shared-memory connections (Windows only) \\
\hline --show-create-skip-secondary-engine & Exclude SECONDARY ENGINE clause from CREATE TABLE statements \\
\hline --single-transaction & Issue a BEGIN SQL statement before dumping data from server \\
\hline --skip-add-drop-table & Do not add a DROP TABLE statement before each CREATE TABLE statement \\
\hline --skip-add-locks & Do not add locks \\
\hline --skip-comments & Do not add comments to dump file \\
\hline --skip-compact & Do not produce more compact output \\
\hline --skip-disable-keys & Do not disable keys \\
\hline --skip-extended-insert & Turn off extended-insert \\
\hline --skip-generated-invisible-primary-key & Do not include generated invisible primary keys in dump file \\
\hline --skip-opt & Turn off options set by --opt \\
\hline --skip-quick & Do not retrieve rows for a table from the server a row at a time \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --skip-quote-names & Do not quote identifiers \\
\hline --skip-set-charset & Do not write SET NAMES statement \\
\hline --skip-triggers & Do not dump triggers \\
\hline --skip-tz-utc & Turn off tz-utc \\
\hline --socket & Unix socket file or Windows named pipe to use \\
\hline --source-data & Write the binary log file name and position to the output \\
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
\hline --tab & Produce tab-separated data files \\
\hline --tables & Override --databases or -B option \\
\hline --tls-ciphersuites & Permissible TLSv1.3 ciphersuites for encrypted connections \\
\hline --tls-sni-servername & Server name supplied by the client \\
\hline --tls-version & Permissible TLS protocols for encrypted connections \\
\hline --triggers & Dump triggers for each dumped table \\
\hline --tz-utc & Add SET TIME_ZONE='+00:00' to dump file \\
\hline --user & MySQL user name to use when connecting to server \\
\hline --verbose & Verbose mode \\
\hline --version & Display version information and exit \\
\hline --where & Dump only rows selected by given WHERE condition \\
\hline --xml & Produce XML output \\
\hline --zstd-compression-level & Compression level for connections to server that use zstd compression \\
\hline
\end{tabular}

\section*{Connection Options}

The mysqldump command logs into a MySQL server to extract information. The following options specify how to connect to the MySQL server, either on the same machine or a remote system.
- --bind-address=ip_address

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - bind - address=ip_address \\
\hline
\end{tabular}

On a computer having multiple network interfaces, use this option to select which interface to use for connecting to the MySQL server.
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
- --default-auth=plugin

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - default - auth=plugin \\
\hline Type & String \\
\hline
\end{tabular}

A hint about which client-side authentication plugin to use. See Section 8.2.17, "Pluggable Authentication".
- --enable-cleartext-plugin

\begin{tabular}{|l|l|}
\hline Command-Line Format & --enable-cleartext-plugin \\
\hline Type & Boolean \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline Default Value & FALSE \\
\hline
\end{tabular}

Enable the mysql_clear_password cleartext authentication plugin. (See Section 8.4.1.4, "ClientSide Cleartext Pluggable Authentication".)
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
\hline Command-Line Format & - - host \\
\hline
\end{tabular}

Dump data from the MySQL server on the given host. The default host is localhost.
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
\hline Command-Line Format & - - no-login-paths \\
\hline
\end{tabular}

Skips reading options from the login path file.

See--login-path for related information.
For additional information about this and other option-file options, see Section 6.2.2.3, "Command-
- --password[=password], -p[password]

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- password [=password] \\
\hline Type & String \\
\hline
\end{tabular}

The password of the MySQL account used for connecting to the server. The password value is optional. If not given, mysqldump prompts for one. If given, there must be no space between - password= or -p and the password following it. If no password option is specified, the default is to send no password.

Specifying a password on the command line should be considered insecure. To avoid giving the password on the command line, use an option file. See Section 8.1.2.1, "End-User Guidelines for Password Security".

To explicitly specify that there is no password and that mysqldump should not prompt for one, use the --skip-password option.
- --password1[=pass_val]

The password for multifactor authentication factor 1 of the MySQL account used for connecting to the server. The password value is optional. If not given, mysqldump prompts for one. If given, there must be no space between --password1= and the password following it. If no password option is specified, the default is to send no password.

Specifying a password on the command line should be considered insecure. To avoid giving the password on the command line, use an option file. See Section 8.1.2.1, "End-User Guidelines for Password Security".

To explicitly specify that there is no password and that mysqldump should not prompt for one, use the --skip-password1 option.
--password1 and --password are synonymous, as are--skip-password1 and --skippassword.
- --password2[=pass_val]

The password for multifactor authentication factor 2 of the MySQL account used for connecting to the server. The semantics of this option are similar to the semantics for - - password1; see the description of that option for details.
- --password3[=pass_val]

The password for multifactor authentication factor 3 of the MySQL account used for connecting to the server. The semantics of this option are similar to the semantics for--password1; see the description of that option for details.
- --pipe, -W

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- pipe \\
\hline Type & String \\
\hline
\end{tabular}

On Windows, connect to the server using a named pipe. This option applies only if the server was started with the named_pipe system variable enabled to support named-pipe connections. In addition, the user making the connection must be a member of the Windows group specified by the
- --plugin-authentication-kerberos-client-mode=value

\begin{tabular}{|l|l|}
\hline Command-Line Format & --plugin-authentication-kerberos-client-mode \\
\hline Type & String \\
\hline Default Value & SSPI \\
\hline Valid Values & GSSAPI \\
\hline
\end{tabular}

On Windows, the authentication_kerberos_client authentication plugin supports this plugin option. It provides two possible values that the client user can set at runtime: SSPI and GSSAPI.

The default value for the client-side plugin option uses Security Support Provider Interface (SSPI), which is capable of acquiring credentials from the Windows in-memory cache. Alternatively, the client user can select a mode that supports Generic Security Service Application Program Interface (GSSAPI) through the MIT Kerberos library on Windows. GSSAPI is capable of acquiring cached credentials previously generated by using the kinit command.

For more information, see Commands for Windows Clients in GSSAPI Mode.
- --plugin-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- plugin-dir=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

The directory in which to look for plugins. Specify this option if the --default-auth option is used to specify an authentication plugin but mysqldump does not find it. See Section 8.2.17, "Pluggable Authentication".
- --port=port_num, -P port_num

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- port=port_num \\
\hline Type & Numeric \\
\hline Default Value & 3306 \\
\hline
\end{tabular}

For TCP/IP connections, the port number to use.
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

The transport protocol to use for connecting to the server. It is useful when the other connection parameters normally result in use of a protocol other than the one you want. For details on the
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
- --socket=path, -S path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -socket=\{file_name|pipe_name \} \\
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
ON
\end{tabular} \\
\hline
\end{tabular}

\section*{STRICT}

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

\begin{tabular}{|l|l|l|}
\cline { 2 - 3 } & Command-Line Format & --tls-version=protocol_list \\
\cline { 2 - 3 } & Type & String \\
\cline { 2 - 4 } & Defautt Value & \begin{tabular}{l} 
TLSV1, TLSV1.1, TLSV1.2, TLSV1.3 \\
(OpenSSL 1.1.1 or higher)
\end{tabular}
\end{tabular}

The permissible TLS protocols for encrypted connections. The value is a list of one or more commaseparated protocol names. The protocols that can be named for this option depend on the SSL library used to compile MySQL. For details, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".
- --user=user_name, - u user_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - user=user_name \\
\hline Type & String \\
\hline
\end{tabular}

The user name of the MySQL account to use for connecting to the server.
If you are using the Rewriter plugin, you should grant this user the SKIP_QUERY_REWRITE privilege.
- --zstd-compression-level=level

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- zstd-compression-level=\# \\
\hline Type & Integer \\
\hline
\end{tabular}

The compression level to use for connections to the server that use the zstd compression algorithm. The permitted levels are from 1 to 22, with larger values indicating increasing levels of compression. The default zstd compression level is 3 . The compression level setting has no effect on connections that do not use zstd compression.

For more information, see Section 6.2.8, "Connection Compression Control".

\section*{Option-File Options}

These options are used to control which option files to read.
- --defaults-extra-file=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

Read this option file after the global option file but (on Unix) before the user option file. If the file does not exist or is otherwise inaccessible, an error occurs. If file_name is not an absolute path name, it is interpreted relative to the current directory.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --defaults-file=file_name

\begin{tabular}{l|l|l|}
\cline { 2 - 3 } \multicolumn{1}{c|}{} & Command-Line Format & --defaults-file=file_name \\
\hline 442 & Type & File name \\
\cline { 2 - 3 } & &
\end{tabular}

Exception: Even with --defaults-file, client programs read .mylogin.cnf.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --defaults-group-suffix=str

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=str \\
\hline Type & String \\
\hline
\end{tabular}

Read not only the usual option groups, but also groups with the usual names and a suffix of str. For example, mysqldump normally reads the [client] and [mysqldump] groups. If this option is given as --defaults-group-suffix=_other, mysqldump also reads the [client_other] and [mysqldump_other] groups.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read any option files. If program startup fails due to reading unknown options from an option file, --no-defaults can be used to prevent them from being read.

The exception is that the .mylogin. cnf file is read in all cases, if it exists. This permits passwords to be specified in a safer way than on the command line even when --no-defaults is used. To create .mylogin.cnf, use the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --print-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & --print-defaults \\
\hline
\end{tabular}

Print the program name and all options that it gets from option files.
For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".

\section*{DDL Options}

Usage scenarios for mysqldump include setting up an entire new MySQL instance (including database tables), and replacing data inside an existing instance with existing databases and tables. The following options let you specify which things to tear down and set up when restoring a dump, by encoding various DDL statements within the dump file.
- --add-drop-database

\begin{tabular}{|l|l|}
\hline Command-Line Format & --add-drop-database \\
\hline
\end{tabular}

Write a DROP DATABASE statement before each CREATE DATABASE statement. This option is typically used in conjunction with the --all-databases or --databases option because no CREATE DATABASE statements are written unless one of those options is specified.

\section*{Note}

In MySQL 8.4, the mysql schema is considered a system schema that cannot be dropped by end users. If --add-drop-database is used with --all-databases or with --databases where the list of schemas to be dumped includes mysql, the dump file contains a DROP DATABASE mysqlˋ statement that causes an error when the dump file is reloaded.

Instead, to use --add-drop-database, use --databases with a list of schemas to be dumped, where the list does not include mysql.
- --add-drop-table

\begin{tabular}{|l|l|}
\hline Command-Line Format & --add-drop-table \\
\hline
\end{tabular}

Write a DROP TABLE statement before each CREATE TABLE statement.
- --add-drop-trigger

\begin{tabular}{|l|l|}
\hline Command-Line Format & --add-drop-trigger \\
\hline
\end{tabular}

Write a DROP TRIGGER statement before each CREATE TRIGGER statement.
- --all-tablespaces, -Y

\begin{tabular}{|l|l|}
\hline Command-Line Format & --all-tablespaces \\
\hline
\end{tabular}

Adds to a table dump all SQL statements needed to create any tablespaces used by an NDB table. This information is not otherwise included in the output from mysqldump. This option is currently relevant only to NDB Cluster tables.
- --no-create-db, -n

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no-create-db \\
\hline
\end{tabular}

Suppress the CREATE DATABASE statements that are otherwise included in the output if the databases or --all-databases option is given.
- --no-create-info, -t

\begin{tabular}{|l|l|}
\hline Command-Line Format & --no-create-info \\
\hline
\end{tabular}

Do not write CREATE TABLE statements that create each dumped table.

\section*{Note}

This option does not exclude statements creating log file groups or
- --no-tablespaces, -y

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - tablespaces \\
\hline
\end{tabular}

This option suppresses all CREATE LOGFILE GROUP and CREATE TABLESPACE statements in the output of mysqldump.
- --replace

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - replace \\
\hline
\end{tabular}

Write REPLACE statements rather than INSERT statements.

\section*{Debug Options}

The following options print debugging information, encode debugging information in the dump file, or let the dump operation proceed regardless of potential problems.
- --allow-keywords

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- allow- keywords \\
\hline
\end{tabular}

Permit creation of column names that are keywords. This works by prefixing each column name with the table name.
- --comments, -i

\begin{tabular}{|l|l|}
\hline Command-Line Format & --comments \\
\hline
\end{tabular}

Write additional information in the dump file such as program version, server version, and host. This option is enabled by default. To suppress this additional information, use--skip-comments.
- --debug[=debug_options], -\# [debug_options]

\begin{tabular}{|l|l|}
\hline Command-Line Format & --debug[=debug_options] \\
\hline Type & String \\
\hline Default Value & d:t:o,/tmp/mysqldump.trace \\
\hline
\end{tabular}

Write a debugging log. A typical debug_options string is $\mathrm{d}: \mathrm{t}: \mathrm{o}$, file_name. The default value is d:t:o,/tmp/mysqldump.trace.

This option is available only if MySQL was built using WITH_DEBUG. MySQL release binaries provided by Oracle are not built using this option.
- --debug-check

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug-check \\
\hline Type & Boolean \\
\hline Default Value & FALSE
\end{tabular}

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
- --dump-date

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - dump - date \\
\hline Type & Boolean \\
\hline Default Value & TRUE \\
\hline
\end{tabular}

If the --comments option is given, mysqldump produces a comment at the end of the dump of the following form:
-- Dump completed on DATE
However, the date causes dump files taken at different times to appear to be different, even if the data are otherwise identical. --dump-date and --skip-dump-date control whether the date is added to the comment. The default is --dump-date (include the date in the comment). --skip-dump-date suppresses date printing.
- --force, -f

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - force \\
\hline
\end{tabular}

Ignore all errors; continue even if an SQL error occurs during a table dump.
One use for this option is to cause mysqldump to continue executing even when it encounters a view that has become invalid because the definition refers to a table that has been dropped. Without --force, mysqldump exits with an error message. With - - force, mysqldump prints the error message, but it also writes an SQL comment containing the view definition to the dump output and continues executing.

If the--ignore-error option is also given to ignore specific errors, --force takes precedence.
- --log-error=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-error=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

Log warnings and errors by appending them to the named file. The default is to do no logging.
- --skip-comments

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-comments \\
\hline
\end{tabular}

See the description for the--comments option.
- --verbose, -v

\begin{tabular}{|l|l|}
\hline Command-Line Format & --verbose \\
\hline
\end{tabular}

Verbose mode. Print more information about what the program does.

