\section*{Chapter 6 MySQL Programs}
Table of Contents
6.1 Overview of MySQL Programs ..... 282
6.2 Using MySQL Programs ..... 285
6.2.1 Invoking MySQL Programs ..... 285
6.2.2 Specifying Program Options ..... 286
6.2.3 Command Options for Connecting to the Server ..... 300
6.2.4 Connecting to the MySQL Server Using Command Options ..... 312
6.2.5 Connecting to the Server Using URI-Like Strings or Key-Value Pairs ..... 315
6.2.6 Connecting to the Server Using DNS SRV Records ..... 322
6.2.7 Connection Transport Protocols ..... 323
6.2.8 Connection Compression Control ..... 324
6.2.9 Setting Environment Variables ..... 328
6.3 Server and Server-Startup Programs ..... 329
6.3.1 mysqld - The MySQL Server ..... 329
6.3.2 mysqld_safe - MySQL Server Startup Script ..... 329
6.3.3 mysql.server - MySQL Server Startup Script ..... 338
6.3.4 mysqld_multi - Manage Multiple MySQL Servers ..... 340
6.4 Installation-Related Programs ..... 345
6.4.1 comp_err — Compile MySQL Error Message File ..... 345
6.4.2 mysql_secure_installation - Improve MySQL Installation Security ..... 347
6.4.3 mysql_tzinfo_to_sql — Load the Time Zone Tables ..... 353
6.5 Client Programs ..... 353
6.5.1 mysql - The MySQL Command-Line Client ..... 353
6.5.2 mysqladmin - A MySQL Server Administration Program ..... 399
6.5.3 mysqlcheck - A Table Maintenance Program ..... 414
6.5.4 mysqldump - A Database Backup Program ..... 428
6.5.5 mysqlimport - A Data Import Program ..... 465
6.5.6 mysqlshow - Display Database, Table, and Column Information ..... 479
6.5.7 mysqlslap - A Load Emulation Client ..... 491
6.6 Administrative and Utility Programs ..... 508
6.6.1 ibd2sdi — InnoDB Tablespace SDI Extraction Utility ..... 508
6.6.2 innochecksum - Offline InnoDB File Checksum Utility ..... 513
6.6.3 myisam_ftdump - Display Full-Text Index information ..... 520
6.6.4 myisamchk - MyISAM Table-Maintenance Utility ..... 521
6.6.5 myisamlog - Display MyISAM Log File Contents ..... 540
6.6.6 myisampack — Generate Compressed, Read-Only MyISAM Tables ..... 541
6.6.7 mysql_config_editor - MySQL Configuration Utility ..... 547
6.6.8 mysql_migrate_keyring - Keyring Key Migration Utility ..... 554
6.6.9 mysqlbinlog - Utility for Processing Binary Log Files ..... 563
6.6.10 mysqldumpslow - Summarize Slow Query Log Files ..... 593
6.7 Program Development Utilities ..... 596
6.7.1 mysql_config - Display Options for Compiling Clients ..... 596
6.7.2 my_print_defaults - Display Options from Option Files ..... 597
6.8 Miscellaneous Programs ..... 599
6.8.1 perror - Display MySQL Error Message Information ..... 599
6.9 Environment Variables ..... 599
6.10 Unix Signal Handling in MySQL ..... 602
This chapter provides a brief overview of the MySQL command-line programs provided by Oracle Corporation. It also discusses the general syntax for specifying options when you run these programs. Most programs have options that are specific to their own operation, but the option syntax is similar for all of them. Finally, the chapter provides more detailed descriptions of individual programs, including which options they recognize.

\subsection*{6.1 Overview of MySQL Programs}

There are many different programs in a MySQL installation. This section provides a brief overview of them. Later sections provide a more detailed description of each one, with the exception of NDB Cluster programs. Each program's description indicates its invocation syntax and the options that it supports. Section 25.5, "NDB Cluster Programs", describes programs specific to NDB Cluster.

Most MySQL distributions include all of these programs, except for those programs that are platformspecific. (For example, the server startup scripts are not used on Windows.) The exception is that RPM distributions are more specialized. There is one RPM for the server, another for client programs, and so forth. If you appear to be missing one or more programs, see Chapter 2, Installing MySQL, for information on types of distributions and what they contain. It may be that you have a distribution that does not include all programs and you need to install an additional package.

Each MySQL program takes many different options. Most programs provide a --help option that you can use to get a description of the program's different options. For example, try mysql --help.

You can override default option values for MySQL programs by specifying options on the command line or in an option file. See Section 6.2, "Using MySQL Programs", for general information on invoking programs and specifying program options.

The MySQL server, mysqld, is the main program that does most of the work in a MySQL installation. The server is accompanied by several related scripts that assist you in starting and stopping the server:
- mysqld

The SQL daemon (that is, the MySQL server). To use client programs, mysqld must be running, because clients gain access to databases by connecting to the server. See Section 6.3.1, "mysqld The MySQL Server".
- mysqld_safe

A server startup script. mysqld_safe attempts to start mysqld. See Section 6.3.2, "mysqld_safe— MySQL Server Startup Script".
- mysql.server

A server startup script. This script is used on systems that use System V-style run directories containing scripts that start system services for particular run levels. It invokes mysqld_safe to start the MySQL server. See Section 6.3.3, "mysql.server - MySQL Server Startup Script".
- mysqld_multi

A server startup script that can start or stop multiple servers installed on the system. See Section 6.3.4, "mysqld_multi - Manage Multiple MySQL Servers".

Several programs perform setup operations during MySQL installation or upgrading:
- comp_err

This program is used during the MySQL build/installation process. It compiles error message files from the error source files. See Section 6.4.1, "comp_err - Compile MySQL Error Message File".
- mysql_secure_installation

This program enables you to improve the security of your MySQL installation. See Section 6.4.2, "mysql_secure_installation - Improve MySQL Installation Security".
- mysql_tzinfo_to_sql

This program loads the time zone tables in the mysql database using the contents of the host system zoneinfo database (the set of files describing time zones). See Section 6.4.3, "mysql_tzinfo_to_sql — Load the Time Zone Tables".

MySQL client programs that connect to the MySQL server:
- mysql

The command-line tool for interactively entering SQL statements or executing them from a file in batch mode. See Section 6.5.1, "mysql - The MySQL Command-Line Client".
- mysqladmin

A client that performs administrative operations, such as creating or dropping databases, reloading the grant tables, flushing tables to disk, and reopening log files. mysqladmin can also be used to retrieve version, process, and status information from the server. See Section 6.5.2, "mysqladmin A MySQL Server Administration Program".
- mysqlcheck

A table-maintenance client that checks, repairs, analyzes, and optimizes tables. See Section 6.5.3, "mysqlcheck - A Table Maintenance Program".
- mysqldump

A client that dumps a MySQL database into a file as SQL, text, or XML. See Section 6.5.4, "mysqldump - A Database Backup Program".
- mysqlimport

A client that imports text files into their respective tables using LOAD DATA. See Section 6.5.5, "mysqlimport - A Data Import Program".
- mysqlsh

MySQL Shell is an advanced client and code editor for MySQL Server. See MySQL Shell 8.4. In addition to the provided SQL functionality, similar to mysql, MySQL Shell provides scripting capabilities for JavaScript and Python and includes APIs for working with MySQL. X DevAPI enables you to work with both relational and document data, see Chapter 22, Using MySQL as a Document Store. AdminAPI enables you to work with InnoDB Cluster, see MySQL AdminAPI.
- mysqlshow

A client that displays information about databases, tables, columns, and indexes. See Section 6.5.6, "mysqlshow - Display Database, Table, and Column Information".
- mysqlslap

A client that is designed to emulate client load for a MySQL server and report the timing of each stage. It works as if multiple clients are accessing the server. See Section 6.5.7, "mysqlslap - A Load Emulation Client".

MySQL administrative and utility programs:
- innochecksum

An offline InnoDB offline file checksum utility. See Section 6.6.2, "innochecksum - Offline InnoDB File Checksum Utility".
- myisam_ftdump

A utility that displays information about full-text indexes in MyISAM tables. See Section 6.6.3, "myisam_ftdump - Display Full-Text Index information".
- myisamchk

A utility to describe, check, optimize, and repair MyISAM tables. See Section 6.6.4, "myisamchk MyISAM Table-Maintenance Utility".
- myisamlog

A utility that processes the contents of a MyISAM log file. See Section 6.6.5, "myisamlog - Display MyISAM Log File Contents".
- myisampack

A utility that compresses MyISAM tables to produce smaller read-only tables. See Section 6.6.6, "myisampack - Generate Compressed, Read-Only MyISAM Tables".
- mysql_config_editor

A utility that enables you to store authentication credentials in a secure, encrypted login path file named .mylogin.cnf. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".
- mysql_migrate_keyring

A utility for migrating keys between one keyring component and another. See Section 6.6.8, "mysql_migrate_keyring - Keyring Key Migration Utility".
- mysqlbinlog

A utility for reading statements from a binary log. The log of executed statements contained in the binary log files can be used to help recover from a crash. See Section 6.6.9, "mysqlbinlog - Utility for Processing Binary Log Files".
- mysqldumpslow

A utility to read and summarize the contents of a slow query log. See Section 6.6.10, "mysqldumpslow - Summarize Slow Query Log Files".

MySQL program-development utilities:
- mysql_config

A shell script that produces the option values needed when compiling MySQL programs. See Section 6.7.1, "mysql_config - Display Options for Compiling Clients".
- my_print_defaults

A utility that shows which options are present in option groups of option files. See Section 6.7.2, "my_print_defaults - Display Options from Option Files".

Miscellaneous utilities:
- perror

A utility that displays the meaning of system or MySQL error codes. See Section 6.8.1, "perror Display MySQL Error Message Information".

Oracle Corporation also provides the MySQL Workbench GUI tool, which is used to administer MySQL servers and databases, to create, execute, and evaluate queries, and to migrate schemas and data from other relational database management systems for use with MySQL.

MySQL client programs that communicate with the server using the MySQL client/server library use the following environment variables.

\begin{tabular}{|l|l|}
\hline Environment Variable & Meaning \\
\hline MYSQL_UNIX_PORT & The default Unix socket file; used for connections to localhost \\
\hline MYSQL_TCP_PORT & The default port number; used for TCP/IP connections \\
\hline MYSQL_DEBUG & Debug trace options when debugging \\
\hline TMPDIR & The directory where temporary tables and files are created \\
\hline
\end{tabular}

For a full list of environment variables used by MySQL programs, see Section 6.9, "Environment Variables".

\subsection*{6.2 Using MySQL Programs}

\subsection*{6.2.1 Invoking MySQL Programs}

To invoke a MySQL program from the command line (that is, from your shell or command prompt), enter the program name followed by any options or other arguments needed to instruct the program what you want it to do. The following commands show some sample program invocations. $\$>$ represents the prompt for your command interpreter; it is not part of what you type. The particular prompt you see depends on your command interpreter. Typical prompts are \$ for sh, ksh, or bash, \% for csh or tcsh, and c: \> for the Windows command.com or cmd. exe command interpreters.
```
$> mysql --user=root test
$> mysqladmin extended-status variables
$> mysqlshow --help
$> mysqldump -u root personnel
```


Arguments that begin with a single or double dash (-, - -) specify program options. Options typically indicate the type of connection a program should make to the server or affect its operational mode. Option syntax is described in Section 6.2.2, "Specifying Program Options".

Nonoption arguments (arguments with no leading dash) provide additional information to the program. For example, the mysql program interprets the first nonoption argument as a database name, so the command mysql --user=root test indicates that you want to use the test database.

Later sections that describe individual programs indicate which options a program supports and describe the meaning of any additional nonoption arguments.

Some options are common to a number of programs. The most frequently used of these are the host (or - h), --user (or - u), and - - password (or - p) options that specify connection parameters. They indicate the host where the MySQL server is running, and the user name and password of your MySQL account. All MySQL client programs understand these options; they enable you to specify which server to connect to and the account to use on that server. Other connection options are --port (or - P) to specify a TCP/IP port number and - socket (or - S) to specify a Unix socket file on Unix (or named-pipe name on Windows). For more information on options that specify connection options, see Section 6.2.4, "Connecting to the MySQL Server Using Command Options".

You may find it necessary to invoke MySQL programs using the path name to the bin directory in which they are installed. This is likely to be the case if you get a "program not found" error whenever you attempt to run a MySQL program from any directory other than the bin directory. To make it more convenient to use MySQL, you can add the path name of the bin directory to your PATH environment variable setting. That enables you to run a program by typing only its name, not its entire path name. For example, if mysql is installed in /usr/local/mysql/bin, you can run the program by invoking it as mysql, and it is not necessary to invoke it as /usr/local/mysql/bin/mysql.

Consult the documentation for your command interpreter for instructions on setting your PATH variable. The syntax for setting environment variables is interpreter-specific. (Some information is given in

Section 6.2.9, "Setting Environment Variables".) After modifying your PATH setting, open a new console window on Windows or log in again on Unix so that the setting goes into effect.

\subsection*{6.2.2 Specifying Program Options}

There are several ways to specify options for MySQL programs:
- List the options on the command line following the program name. This is common for options that apply to a specific invocation of the program.
- List the options in an option file that the program reads when it starts. This is common for options that you want the program to use each time it runs.
- List the options in environment variables (see Section 6.2.9, "Setting Environment Variables"). This method is useful for options that you want to apply each time the program runs. In practice, option files are used more commonly for this purpose, but Section 7.8.3, "Running Multiple MySQL Instances on Unix", discusses one situation in which environment variables can be very helpful. It describes a handy technique that uses such variables to specify the TCP/IP port number and Unix socket file for the server and for client programs.

Options are processed in order, so if an option is specified multiple times, the last occurrence takes precedence. The following command causes mysql to connect to the server running on localhost:
mysql -h example.com -h localhost
There is one exception: For mysqld, the first instance of the --user option is used as a security precaution, to prevent a user specified in an option file from being overridden on the command line.

If conflicting or related options are given, later options take precedence over earlier options. The following command runs mysql in "no column names" mode:
mysql --column-names --skip-column-names

MySQL programs determine which options are given first by examining environment variables, then by processing option files, and then by checking the command line. Because later options take precedence over earlier ones, the processing order means that environment variables have the lowest precedence and command-line options the highest.

For the server, one exception applies: The mysqld-auto.cnf option file in the data directory is processed last, so it takes precedence even over command-line options.

You can take advantage of the way that MySQL programs process options by specifying default option values for a program in an option file. That enables you to avoid typing them each time you run the program while enabling you to override the defaults if necessary by using command-line options.

\subsection*{6.2.2.1 Using Options on Command Line}

Program options specified on the command line follow these rules:
- Options are given after the command name.
- An option argument begins with one dash or two dashes, depending on whether it is a short form or long form of the option name. Many options have both short and long forms. For example, -? and - help are the short and long forms of the option that instructs a MySQL program to display its help message.
- Option names are case-sensitive. -v and -V are both legal and have different meanings. (They are the corresponding short forms of the --verbose and --version options.)
- Some options take a value following the option name. For example, -h localhost or - host=localhost indicate the MySQL server host to a client program. The option value tells the program the name of the host where the MySQL server is running.
- For a long option that takes a value, separate the option name and the value by an = sign. For a short option that takes a value, the option value can immediately follow the option letter, or there can be a space between: -hlocalhost and -h localhost are equivalent. An exception to this rule is the option for specifying your MySQL password. This option can be given in long form as -password=pass_val or as --password. In the latter case (with no password value given), the program interactively prompts you for the password. The password option also may be given in short form as - ppass_val or as - p. However, for the short form, if the password value is given, it must follow the option letter with no intervening space: If a space follows the option letter, the program has no way to tell whether a following argument is supposed to be the password value or some other kind of argument. Consequently, the following two commands have two completely different meanings:
```
mysql -ptest
mysql -p test
```


The first command instructs mysql to use a password value of test, but specifies no default database. The second instructs mysql to prompt for the password value and to use test as the default database.
- Within option names, dash (-) and underscore (_) may be used interchangeably in most cases, although the leading dashes cannot be given as underscores. For example, --skip-granttables and --skip_grant_tables are equivalent.

In this Manual, we use dashes in option names, except where underscores are significant. This is the case with, for example, --log-bin and --log_bin, which are different options. We encourage you to do so as well.
- The MySQL server has certain command options that may be specified only at startup, and a set of system variables, some of which may be set at startup, at runtime, or both. System variable names use underscores rather than dashes, and when referenced at runtime (for example, using SET or SELECT statements), must be written using underscores:
```
SET GLOBAL general_log = ON;
SELECT @@GLOBAL.general_log;
```


At server startup, the syntax for system variables is the same as for command options, so within variable names, dashes and underscores may be used interchangeably. For example, - general_log $=0 \mathrm{~N}$ and --general-log $=0 \mathrm{~N}$ are equivalent. (This is also true for system variables set within option files.)
- For options that take a numeric value, the value can be given with a suffix of $\mathrm{K}, \mathrm{M}$, or G to indicate a multiplier of 1024, $1024^{2}$ or $1024^{3}$. As of MySQL 8.0.14, a suffix can also be T, P, and E to indicate a multiplier of $1024^{4}, 1024^{5}$ or $1024^{6}$. Suffix letters can be uppercase or lowercase.

For example, the following command tells mysqladmin to ping the server 1024 times, sleeping 10 seconds between each ping:
```
mysqladmin --count=1K --sleep=10 ping
```

- When specifying file names as option values, avoid the use of the ~ shell metacharacter. It might not be interpreted as you expect.

Option values that contain spaces must be quoted when given on the command line. For example, the --execute (or-e) option can be used with mysql to pass one or more semicolon-separated SQL statements to the server. When this option is used, mysql executes the statements in the option value and exits. The statements must be enclosed by quotation marks. For example:
```
$> mysql -u root -p -e "SELECT VERSION();SELECT NOW()"
Enter password: ******
+-------------+
| VERSION() |
+-------------+
| 8.0.19 |
```

```
+-------------+
+----------------------+
| NOW() |
+----------------------+
| 2019-09-03 10:36:48 |
+----------------------+
$>
```


\section*{Note}

The long form (--execute) is followed by an equal sign (=).

To use quoted values within a statement, you must either escape the inner quotation marks, or use a different type of quotation marks within the statement from those used to quote the statement itself. The capabilities of your command processor dictate your choices for whether you can use single or double quotation marks and the syntax for escaping quote characters. For example, if your command processor supports quoting with single or double quotation marks, you can use double quotation marks around the statement, and single quotation marks for any quoted values within the statement.

\subsection*{6.2.2.2 Using Option Files}

Most MySQL programs can read startup options from option files (sometimes called configuration files). Option files provide a convenient way to specify commonly used options so that they need not be entered on the command line each time you run a program.

To determine whether a program reads option files, invoke it with the --help option. (For mysqld, use --verbose and - - help.) If the program reads option files, the help message indicates which files it looks for and which option groups it recognizes.

\section*{Note}

A MySQL program started with the --no-defaults option reads no option files other than .mylogin.cnf.

A server started with the persisted_globals_load system variable disabled does not read mysqld-auto.cnf.

Many option files are plain text files, created using any text editor. The exceptions are:
- The .mylogin.cnf file that contains login path options. This is an encrypted file created by the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility". A "login path" is an option group that permits only certain options: host, user, password, port and socket. Client programs specify which login path to read from .mylogin.cnf using the --login-path option.

To specify an alternative login path file name, set the MYSQL_TEST_LOGIN_FILE environment variable. This variable is used by the mysql-test-run.pl testing utility, but also is recognized by mysql_config_editor and by MySQL clients such as mysql, mysqladmin, and so forth.
- The mysqld-auto.cnf file in the data directory. This JSON-format file contains persisted system variable settings. It is created by the server upon execution of SET PERSIST or SET PERSIST_ONLY statements. See Section 7.1.9.3, "Persisted System Variables". Management of mysqld-auto.cnf should be left to the server and not performed manually.
- Option File Processing Order
- Option File Syntax
- Option File Inclusions

\section*{Option File Processing Order}

MySQL looks for option files in the order described in the following discussion and reads any that exist. If an option file you want to use does not exist, create it using the appropriate method, as just discussed.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0319.jpg?height=175&width=269&top_left_y=477&top_left_x=367)

\section*{Note}

For information about option files used with NDB Cluster programs, see Section 25.4, "Configuration of NDB Cluster".

On Windows, MySQL programs read startup options from the files shown in the following table, in the specified order (files listed first are read first, files read later take precedence).

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.1 Option Files Read on Windows Systems}
\begin{tabular}{|l|l|}
\hline File Name & Purpose \\
\hline \%WINDIR\%\my.ini,\%WINDIR\%\my.cnf & Global options \\
\hline C: \my.ini, C: \my.cnf & Global options \\
\hline BASEDIR \my.ini, BASEDIR\my.cnf & Global options \\
\hline defaults-extra-file & The file specified with - -defaults-extrafile, if any \\
\hline \%APPDATA\%\MySQL\.mylogin.cnf & Login path options (clients only) \\
\hline DATADIR\mysqld-auto.cnf & System variables persisted with SET PERSIST or SET PERSIST_ONLY (server only) \\
\hline
\end{tabular}
\end{table}

In the preceding table, \%WINDIR\% represents the location of your Windows directory. This is commonly C: \WINDOWS. Use the following command to determine its exact location from the value of the WINDIR environment variable:

C: \> echo \%WINDIR\%
\%APPDATA\% represents the value of the Windows application data directory. Use the following command to determine its exact location from the value of the APPDATA environment variable:

C:\> echo \%APPDATA\%
BASEDIR represents the MySQL base installation directory. When MySQL 8.4 has been installed using the MSI, this is typically C: $\backslash P R O G R A M D I R \backslash$ MySQL $\backslash$ MySQL Server 8.4 in which PROGRAMDIR represents the programs directory (usually Program Files for English-language versions of Windows).
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0319.jpg?height=104&width=106&top_left_y=1982&top_left_x=365)

\section*{Important}

Although MySQL Configurator places most files under PROGRAMDIR, it installs my.ini under the C: \ProgramData\MySQL\MySQL Server $8.4 \$ directory by default.

DATADIR represents the MySQL data directory. As used to find mysqld-auto.cnf, its default value is the data directory location built in when MySQL was compiled, but can be changed by --datadir specified as an option-file or command-line option processed before mysqld-auto.cnf is processed.

On Unix and Unix-like systems, MySQL programs read startup options from the files shown in the following table, in the specified order (files listed first are read first, files read later take precedence).

\section*{Note}

On Unix platforms, MySQL ignores configuration files that are world-writable. This is intentional as a security measure.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.2 Option Files Read on Unix and Unix-Like Systems}
\begin{tabular}{|l|l|}
\hline File Name & Purpose \\
\hline /etc/my.cnf & Global options \\
\hline /etc/mysql/my.cnf & Global options \\
\hline SYSCONFDIR/my.cnf & Global options \\
\hline \$MYSQL_HOME/my.cnf & Server-specific options (server only) \\
\hline defaults-extra-file & The file specified with --defaults-extrafile, if any \\
\hline ~/.my.cnf & User-specific options \\
\hline ~/.mylogin.cnf & User-specific login path options (clients only) \\
\hline DATADIR/mysqld-auto.cnf & System variables persisted with SET PERSIST or SET PERSIST_ONLY (server only) \\
\hline
\end{tabular}
\end{table}

In the preceding table, ~ represents the current user's home directory (the value of \$HOME).
SYSCONFDIR represents the directory specified with the SYSCONFDIR option to CMake when MySQL was built. By default, this is the etc directory located under the compiled-in installation directory.

MYSQL_HOME is an environment variable containing the path to the directory in which the server-specific my.cnf file resides. If MYSQL_HOME is not set and you start the server using the mysqld_safe program, mysqld_safe sets it to BASEDIR, the MySQL base installation directory.

DATADIR represents the MySQL data directory. As used to find mysqld-auto.cnf, its default value is the data directory location built in when MySQL was compiled, but can be changed by --datadir specified as an option-file or command-line option processed before mysqld-auto.cnf is processed.

If multiple instances of a given option are found, the last instance takes precedence, with one exception: For mysqld, the first instance of the --user option is used as a security precaution, to prevent a user specified in an option file from being overridden on the command line.

\section*{Option File Syntax}

The following description of option file syntax applies to files that you edit manually. This excludes .mylogin.cnf, which is created using mysql_config_editor and is encrypted, and mysqldauto.cnf, which the server creates in JSON format.

Any long option that may be given on the command line when running a MySQL program can be given in an option file as well. To get the list of available options for a program, run it with the --help option. (For mysqld, use --verbose and --help.)

The syntax for specifying options in an option file is similar to command-line syntax (see Section 6.2.2.1, "Using Options on the Command Line"). However, in an option file, you omit the leading two dashes from the option name and you specify only one option per line. For example, --quick and --host=localhost on the command line should be specified as quick and host=localhost on separate lines in an option file. To specify an option of the form --loose-opt_name in an option file, write it as loose-opt_name.

Empty lines in option files are ignored. Nonempty lines can take any of the following forms:
- \#comment, ; comment

Comment lines start with \# or ; . A \# comment can start in the middle of a line as well.
- [group]
group is the name of the program or group for which you want to set options. After a group line, any option-setting lines apply to the named group until the end of the option file or another group line is given. Option group names are not case-sensitive.
- opt_name

This is equivalent to --opt_name on the command line.
- opt_name=value

This is equivalent to --opt_name=value on the command line. In an option file, you can have spaces around the = character, something that is not true on the command line. The value optionally can be enclosed within single quotation marks or double quotation marks, which is useful if the value contains a \# comment character.

Leading and trailing spaces are automatically deleted from option names and values.
You can use the escape sequences \b, \t, \n, \r, \ and \s in option values to represent the backspace, tab, newline, carriage return, backslash, and space characters. In option files, these escaping rules apply:
- A backslash followed by a valid escape sequence character is converted to the character represented by the sequence. For example, \s is converted to a space.
- A backslash not followed by a valid escape sequence character remains unchanged. For example, $\backslash S$ is retained as is.

The preceding rules mean that a literal backslash can be given as \\, or as \is it is not followed by a valid escape sequence character.

The rules for escape sequences in option files differ slightly from the rules for escape sequences in string literals in SQL statements. In the latter context, if " $x$ " is not a valid escape sequence character, $\backslash x$ becomes " $x$ " rather than $\backslash x$. See Section 11.1.1, "String Literals".

The escaping rules for option file values are especially pertinent for Windows path names, which use as a path name separator. A separator in a Windows path name must be written as $\backslash \backslash$ if it is followed by an escape sequence character. It can be written as \\or \i if is not. Alternatively, / may be used in Windows path names and is treated as \. Suppose that you want to specify a base directory of C: \Program Files\MySQL\MySQL Server 8.4 in an option file. This can be done several ways. Some examples:
```
basedir="C:\Program Files\MySQL\MySQL Server 8.4"
basedir="C:\\Program Files\\MySQL\\MySQL Server 8.4"
basedir="C:/Program Files/MySQL/MySQL Server 8.4"
basedir=C:\\Program\sFiles\\MySQL\\MySQL\sServer\s8.4
```


If an option group name is the same as a program name, options in the group apply specifically to that program. For example, the [mysqld] and [mysql] groups apply to the mysqld server and the mysql client program, respectively.

The [client] option group is read by all client programs provided in MySQL distributions (but not by mysqld). To understand how third-party client programs that use the C API can use option files, see the C API documentation at mysql_options().

The [client] group enables you to specify options that apply to all clients. For example, [client] is the appropriate group to use to specify the password for connecting to the server. (But make sure that the option file is accessible only by yourself, so that other people cannot discover your password.) Be sure not to put an option in the [client] group unless it is recognized by all client programs that you use. Programs that do not understand the option quit after displaying an error message if you try to run them.

List more general option groups first and more specific groups later. For example, a [client] group is more general because it is read by all client programs, whereas a [mysqldump] group is read only by mysqldump. Options specified later override options specified earlier, so putting the option groups in the order [client], [mysqldump] enables mysqldump-specific options to override [client] options.

Here is a typical global option file:
```
[client]
port=3306
socket=/tmp/mysql.sock
[mysqld]
port=3306
socket=/tmp/mysql.sock
key_buffer_size=16M
max_allowed_packet=128M
[mysqldump]
quick
```


Here is a typical user option file:
```
[client]
# The following password is sent to all standard MySQL clients
password="my password"
[mysql]
no-auto-rehash
connect_timeout=2
```


To create option groups to be read only by mysqld servers from specific MySQL release series, use groups with names of [mysqld-8.3], [mysqld-8.4], and so forth. The following group indicates that the sql_mode setting should be used only by MySQL servers with 8.4.x version numbers:
```
[mysqld-8.4]
sql_mode=TRADITIONAL
```


\section*{Option File Inclusions}

It is possible to use ! include directives in option files to include other option files and ! includedir to search specific directories for option files. For example, to include the /home/mydir/myopt.cnf file, use the following directive:
```
!include /home/mydir/myopt.cnf
```


To search the /home/mydir directory and read option files found there, use this directive:
```
!includedir /home/mydir
```


MySQL makes no guarantee about the order in which option files in the directory are read.

\section*{Note}

Any files to be found and included using the ! includedir directive on Unix operating systems must have file names ending in.cnf. On Windows, this directive checks for files with the .ini or .cnf extension.

Write the contents of an included option file like any other option file. That is, it should contain groups of options, each preceded by a [group] line that indicates the program to which the options apply.

While an included file is being processed, only those options in groups that the current program is looking for are used. Other groups are ignored. Suppose that a my.cnf file contains this line:
```
!include /home/mydir/myopt.cnf
```


And suppose that /home/mydir/myopt. cnf looks like this:
```
[mysqladmin]
force
[mysqld]
key_buffer_size=16M
```


If my.cnf is processed by mysqld, only the [mysqld] group in /home/mydir/myopt.cnf is used. If the file is processed by mysqladmin, only the [mysqladmin] group is used. If the file is processed by any other program, no options in /home/mydir/myopt.cnf are used.

The ! includedir directive is processed similarly except that all option files in the named directory are read.

If an option file contains ! include or ! includedir directives, files named by those directives are processed whenever the option file is processed, no matter where they appear in the file.

For inclusion directives to work, the file path should not be specified within quotes and should have no escape sequences. For example, the following statements provided in my.ini read the option file myopts.ini:
```
!include C:/ProgramData/MySQL/MySQL Server/myopts.ini
!include C:\ProgramData\MySQL\MySQL Server\myopts.ini
!include C:\\ProgramData\\MySQL\\MySQL Server\\myopts.ini
```


On Windows, if ! include /path/to/extra.ini is the last line in the file, make sure that a newline is appended at the end; otherwise, the line is ignored.

\subsection*{6.2.2.3 Command-Line Options that Affect Option-File Handling}

Most MySQL programs that support option files handle the following options. Because these options affect option-file handling, they must be given on the command line and not in an option file. To work properly, each of these options must be given before other options, with these exceptions:
- --print-defaults may be used immediately after --defaults-file, --defaults-extrafile, --login-path, or --no-login-paths.
- On Windows, if the server is started with the --defaults-file and --install options, -install must be first. See Section 2.3.3.8, "Starting MySQL as a Windows Service".

When specifying file names as option values, avoid the use of the $\sim$ shell metacharacter because it might not be interpreted as you expect.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.3 Option File Option Summary}
\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --defaults-extra-file & Read named option file in addition to usual option files \\
\hline --defaults-file & Read only named option file \\
\hline --defaults-group-suffix & Option group suffix value \\
\hline --login-path & Read login path options from .mylogin.cnf \\
\hline --no-defaults & Read no option files \\
\hline --no-login-paths & Do not read options from login path file \\
\hline
\end{tabular}
\end{table}
- --defaults-extra-file=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=filename \\
\hline Type & File name \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read this option file after the global option file but (on Unix) before the user option file and (on all platforms) before the login path file. (For information about the order in which option files are used, see Section 6.2.2.2, "Using Option Files".) If the file does not exist or is otherwise inaccessible, an error occurs. If file_name is not an absolute path name, it is interpreted relative to the current directory.

See the introduction to this section regarding constraints on the position in which this option may be specified.
- --defaults-file=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -defaults-file=filename \\
\hline Type & File name \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read only the given option file. If the file does not exist or is otherwise inaccessible, an error occurs. file_name is interpreted relative to the current directory if given as a relative path name rather than a full path name.

Exceptions: Even with --defaults-file, mysqld reads mysqld-auto.cnf and client programs read .mylogin.cnf.

See the introduction to this section regarding constraints on the position in which this option may be specified.
- --defaults-group-suffix=str

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=string \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read not only the usual option groups, but also groups with the usual names and a suffix of str. For example, the mysql client normally reads the [client] and [mysql] groups. If this option is given as --defaults-group-suffix=_other, mysql also reads the [client_other] and [mysql_other] groups.
- --login-path=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- login - path=name \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

Read options from the named login path in the . mylogin. cnf login path file. A "login path" is an option group containing options that specify which MySQL server to connect to and which account to
authenticate as. To create or modify a login path file, use the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

A client program reads the option group corresponding to the named login path, in addition to option groups that the program reads by default. Consider this command:
mysql --login-path=mypath
By default, the mysql client reads the [client] and [mysql] option groups. So for the command shown, mysql reads [client] and [mysql] from other option files, and [client], [mysql], and [mypath] from the login path file.

Client programs read the login path file even when the --no-defaults option is used, unless --no-login-paths is set.

To specify an alternate login path file name, set the MYSQL_TEST_LOGIN_FILE environment variable.

See the introduction to this section regarding constraints on the position in which this option may be specified.
---no-login-paths

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no-login-paths \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Skips reading options from the login path file. Client programs always read the login path file without this option even when the --no-defaults option is used.

See--login-path for related information.
See the introduction to this section regarding constraints on the position in which this option may be specified.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Do not read any option files. If program startup fails due to reading unknown options from an option file, --no-defaults can be used to prevent them from being read.

The exception is that client programs read the . mylogin. cnf login path file, if it exists, even when --no-defaults is used unless --no-login-paths is set. This permits passwords to be specified in a safer way than on the command line even if - - no-defaults is present. To create .mylogin.cnf, use the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".
- --print-defaults

\begin{tabular}{l|l|l|}
\cline { 2 - 3 } & Command-Line Format & -- print-defaults \\
\hline & Type & Boolean \\
\cline { 2 - 3 } &
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & false \\
\hline
\end{tabular}

Print the program name and all options that it gets from option files. Password values are masked.
See the introduction to this section regarding constraints on the position in which this option may be specified.

\subsection*{6.2.2.4 Program Option Modifiers}

Some options are "boolean" and control behavior that can be turned on or off. For example, the mysql client supports a --column-names option that determines whether or not to display a row of column names at the beginning of query results. By default, this option is enabled. However, you may want to disable it in some instances, such as when sending the output of mysql into another program that expects to see only data and not an initial header line.

To disable column names, you can specify the option using any of these forms:
```
--disable-column-names
--skip-column-names
--column-names=0
```


The --disable and --skip prefixes and the =0 suffix all have the same effect: They turn the option off.

The "enabled" form of the option may be specified in any of these ways:
```
--column-names
--enable-column-names
--column-names=1
```


The values ON, TRUE, OFF, and FALSE are also recognized for boolean options (not case-sensitive).
If an option is prefixed by --loose, a program does not exit with an error if it does not recognize the option, but instead issues only a warning:
```
$> mysql --loose-no-such-option
mysql: WARNING: unknown option '--loose-no-such-option'
```


The --loose prefix can be useful when you run programs from multiple installations of MySQL on the same machine and list options in an option file. An option that may not be recognized by all versions of a program can be given using the --loose prefix (or loose in an option file). Versions of the program that recognize the option process it normally, and versions that do not recognize it issue a warning and ignore it.

The --maximum prefix is available for mysqld only and permits a limit to be placed on how large client programs can set session system variables. To do this, use a --maximum prefix with the variable name. For example, --maximum-max_heap_table_size=32M prevents any client from making the heap table size limit larger than 32 M .

The - -maximum prefix is intended for use with system variables that have a session value. If applied to a system variable that has only a global value, an error occurs. For example, with --maximumback_log=200, the server produces this error:

Maximum value of 'back_log' cannot be set

\subsection*{6.2.2.5 Using Options to Set Program Variables}

Many MySQL programs have internal variables that can be set at runtime using the SET statement. See Section 15.7.6.1, "SET Syntax for Variable Assignment", and Section 7.1.9, "Using System Variables".

Most of these program variables also can be set at server startup by using the same syntax that applies to specifying program options. For example, mysql has a max_allowed_packet variable that controls the maximum size of its communication buffer. To set the max_allowed_packet variable for mysql to a value of 16 MB , use either of the following commands:
```
mysql --max_allowed_packet=16777216
mysql --max_allowed_packet=16M
```


The first command specifies the value in bytes. The second specifies the value in megabytes. For variables that take a numeric value, the value can be given with a suffix of K, M, or G to indicate a multiplier of 1024, $1024^{2}$ or $1024^{3}$. (For example, when used to set max_allowed_packet, the suffixes indicate units of kilobytes, megabytes, or gigabytes.) As of MySQL 8.0.14, a suffix can also be $T, P$, and $E$ to indicate a multiplier of $1024^{4}, 1024^{5}$ or $1024^{6}$. Suffix letters can be uppercase or lowercase.

In an option file, variable settings are given without the leading dashes:
```
[mysql]
max_allowed_packet=16777216
```


Or:
```
[mysql]
max_allowed_packet=16M
```


If you like, underscores in an option name can be specified as dashes. The following option groups are equivalent. Both set the size of the server's key buffer to 512 MB :
```
[mysqld]
key_buffer_size=512M
[mysqld]
key-buffer-size=512M
```


Suffixes for specifying a value multiplier can be used when setting a variable at program invocation time, but not to set the value with SET at runtime. On the other hand, with SET, you can assign a variable's value using an expression, which is not true when you set a variable at server startup. For example, the first of the following lines is legal at program invocation time, but the second is not:
```
$> mysql --max_allowed_packet=16M
$> mysql --max_allowed_packet=16*1024*1024
```


Conversely, the second of the following lines is legal at runtime, but the first is not:
```
mysql> SET GLOBAL max_allowed_packet=16M;
mysql> SET GLOBAL max_allowed_packet=16*1024*1024;
```


\subsection*{6.2.2.6 Option Defaults, Options Expecting Values, and the $\mathbf{=}$ Sign}

By convention, long forms of options that assign a value are written with an equals (=) sign, like this:
```
mysql --host=tonfisk --user=jon
```


For options that require a value (that is, not having a default value), the equal sign is not required, and so the following is also valid:
```
mysql --host tonfisk --user jon
```


In both cases, the mysql client attempts to connect to a MySQL server running on the host named "tonfisk" using an account with the user name "jon".

Due to this behavior, problems can occasionally arise when no value is provided for an option that expects one. Consider the following example, where a user connects to a MySQL server running on host tonfisk as user jon:
```
$> mysql --host 85.224.35.45 --user jon
Welcome to the MySQL monitor. Commands end with ; or \g.
Your MySQL connection id is 3
Server version: 8.4.9 Source distribution
Type 'help;' or '\h' for help. Type '\c' to clear the buffer.
mysql> SELECT CURRENT_USER();
+------------------+
| CURRENT_USER() |
+-----------------+
| jon@% |
+-----------------+
1 row in set (0.00 sec)
```


Omitting the required value for one of these option yields an error, such as the one shown here:
```
$> mysql --host 85.224.35.45 --user
mysql: option '--user' requires an argument
```


In this case, mysql was unable to find a value following the --user option because nothing came after it on the command line. However, if you omit the value for an option that is not the last option to be used, you obtain a different error that you may not be expecting:
```
$> mysql --host --user jon
ERROR 2005 (HY000): Unknown MySQL server host '--user' (1)
```


Because mysql assumes that any string following --host on the command line is a host name, host - - user is interpreted as - - host=--user, and the client attempts to connect to a MySQL server running on a host named "--user".

Options having default values always require an equal sign when assigning a value; failing to do so causes an error. For example, the MySQL server--log-error option has the default value host_name.err, where host_name is the name of the host on which MySQL is running. Assume that you are running MySQL on a computer whose host name is "tonfisk", and consider the following invocation of mysqld_safe:
```
$> mysqld_safe &
[1] 11699
$> 080112 12:53:40 mysqld_safe Logging to '/usr/local/mysql/var/tonfisk.err'.
080112 12:53:40 mysqld_safe Starting mysqld daemon with databases from /usr/local/mysql/var
$>
```


After shutting down the server, restart it as follows:
```
$> mysqld_safe --log-error &
[1] 11699
$> 080112 12:53:40 mysqld_safe Logging to '/usr/local/mysql/var/tonfisk.err'.
080112 12:53:40 mysqld_safe Starting mysqld daemon with databases from /usr/local/mysql/var
$>
```


The result is the same, since--log-error is not followed by anything else on the command line, and it supplies its own default value. (The \& character tells the operating system to run MySQL in the background; it is ignored by MySQL itself.) Now suppose that you wish to log errors to a file named my-errors.err. You might try starting the server with--log-error my-errors, but this does not have the intended effect, as shown here:
```
$> mysqld_safe --log-error my-errors &
[1] 31357
$> 080111 22:53:31 mysqld_safe Logging to '/usr/local/mysql/var/tonfisk.err'.
080111 22:53:32 mysqld_safe Starting mysqld daemon with databases from /usr/local/mysql/var
080111 22:53:34 mysqld_safe mysqld from pid file /usr/local/mysql/var/tonfisk.pid ended
[1]+ Done ./mysqld_safe --log-error my-errors
```


The server attempted to start using /usr/local/mysql/var/tonfisk.err as the error log, but then shut down. Examining the last few lines of this file shows the reason:
```
$> tail /usr/local/mysql/var/tonfisk.err
2013-09-24T15:36:22.278034Z 0 [ERROR] Too many arguments (first extra is 'my-errors').
2013-09-24T15:36:22.278059Z 0 [Note] Use --verbose --help to get a list of available options!
2013-09-24T15:36:22.278076Z 0 [ERROR] Aborting
2013-09-24T15:36:22.279704Z 0 [Note] InnoDB: Starting shutdown...
2013-09-24T15:36:23.777471Z 0 [Note] InnoDB: Shutdown completed; log sequence number 2319086
2013-09-24T15:36:23.780134Z 0 [Note] mysqld: Shutdown complete
```


Because the--log-error option supplies a default value, you must use an equal sign to assign a different value to it, as shown here:
```
$> mysqld_safe --log-error=my-errors &
[1] 31437
$> 080111 22:54:15 mysqld_safe Logging to '/usr/local/mysql/var/my-errors.err'.
080111 22:54:15 mysqld_safe Starting mysqld daemon with databases from /usr/local/mysql/var
$>
```


Now the server has been started successfully, and is logging errors to the file /usr/local/mysql/ var/my-errors.err.

Similar issues can arise when specifying option values in option files. For example, consider a my .cnf file that contains the following:
```
[mysql]
host
user
```


When the mysql client reads this file, these entries are parsed as --host --user or --host=-user, with the result shown here:
```
$> mysql
ERROR 2005 (HY000): Unknown MySQL server host '--user' (1)
```


However, in option files, an equal sign is not assumed. Suppose the my.cnf file is as shown here:
```
[mysql]
user jon
```


Trying to start mysql in this case causes a different error:
```
$> mysql
mysql: unknown option '--user jon'
```


A similar error would occur if you were to write host tonfisk in the option file rather than host=tonfisk. Instead, you must use the equal sign:
```
[mysql]
user=jon
```


Now the login attempt succeeds:
```
$> mysql
Welcome to the MySQL monitor. Commands end with ; or \g.
Your MySQL connection id is 5
Server version: 8.4.9 Source distribution
Type 'help;' or '\h' for help. Type '\c' to clear the buffer.
mysql> SELECT USER();
+----------------+
| USER() |
+----------------+
| jon@localhost |
+----------------+
```

```
1 row in set (0.00 sec)
```


This is not the same behavior as with the command line, where the equal sign is not required:
```
$> mysql --user jon --host tonfisk
Welcome to the MySQL monitor. Commands end with ; or \g.
Your MySQL connection id is 6
Server version: 8.4.9 Source distribution
Type 'help;' or '\h' for help. Type '\c' to clear the buffer.
mysql> SELECT USER();
+----------------+
| USER() |
+----------------+
| jon@tonfisk
+---------------+
1 row in set (0.00 sec)
```


Specifying an option requiring a value without a value in an option file causes the server to abort with an error.

\subsection*{6.2.3 Command Options for Connecting to the Server}

This section describes options supported by most MySQL client programs that control how client programs establish connections to the server, whether connections are encrypted, and whether connections are compressed. These options can be given on the command line or in an option file.
- Command Options for Connection Establishment
- Command Options for Encrypted Connections
- Command Options for Connection Compression

\section*{Command Options for Connection Establishment}

This section describes options that control how client programs establish connections to the server. For additional information and examples showing how to use them, see Section 6.2.4, "Connecting to the MySQL Server Using Command Options".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.4 Connection-Establishment Option Summary}
\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --default-auth & Authentication plugin to use \\
\hline --host & Host on which MySQL server is located \\
\hline --password & Password to use when connecting to server \\
\hline --password1 & First multifactor authentication password to use when connecting to server \\
\hline --password2 & Second multifactor authentication password to use when connecting to server \\
\hline --password3 & Third multifactor authentication password to use when connecting to server \\
\hline --pipe & Connect to server using named pipe (Windows only) \\
\hline --plugin-dir & Directory where plugins are installed \\
\hline --port & TCP/IP port number for connection \\
\hline --protocol & Transport protocol to use \\
\hline --shared-memory-base-name & Shared-memory name for shared-memory connections (Windows only) \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --socket & Unix socket file or Windows named pipe to use \\
\hline --user & \begin{tabular}{l} 
MySQL user name to use when connecting to \\
server
\end{tabular} \\
\hline
\end{tabular}
- --default-auth=plugin

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - default - auth=plugin \\
\hline Type & String \\
\hline
\end{tabular}

A hint about which client-side authentication plugin to use. See Section 8.2.17, "Pluggable Authentication".
- --host=host_name, -h host_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- host=host_name \\
\hline Type & String \\
\hline Default Value & localhost \\
\hline
\end{tabular}

The host on which the MySQL server is running. The value can be a host name, IPv4 address, or IPv6 address. The default value is localhost.
- --password[=pass_val], -p[pass_val]

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- password [=password] \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

The password of the MySQL account used for connecting to the server. The password value is optional. If not given, the client program prompts for one. If given, there must be no space between --password= or -p and the password following it. If no password option is specified, the default is to send no password.

Specifying a password on the command line should be considered insecure. To avoid giving the password on the command line, use an option file. See Section 8.1.2.1, "End-User Guidelines for Password Security".

To explicitly specify that there is no password and that the client program should not prompt for one, use the --skip-password option.
- --password1[=pass_val]

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- password1[=password] \\
\hline Type & String \\
\hline
\end{tabular}

The password for multifactor authentication factor 1 of the MySQL account used for connecting to the server. The password value is optional. If not given, the client program prompts for one. If given, there must be no space between - - password1= and the password following it. If no password option is specified, the default is to send no password.

Specifying a password on the command line should be considered insecure. To avoid giving the password on the command line, use an option file. See Section 8.1.2.1, "End-User Guidelines for Password Security".

To explicitly specify that there is no password and that the client program should not prompt for one, use the --skip-password1 option.
--password1 and --password are synonymous, as are --skip-password1 and --skippassword.
- --password2[=pass_val]

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- password2[=password] \\
\hline Type & String \\
\hline
\end{tabular}

The password for multifactor authentication factor 2 of the MySQL account used for connecting to the server. The semantics of this option are similar to the semantics for --password1; see the description of that option for details.
- --password3[=pass_val]

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- password3[=password] \\
\hline Type & String \\
\hline
\end{tabular}

The password for multifactor authentication factor 3 of the MySQL account used for connecting to the server. The semantics of this option are similar to the semantics for --password1; see the description of that option for details.
- --pipe, -W

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - pipe \\
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

The directory in which to look for plugins. Specify this option if the --default-auth option is used to specify an authentication plugin but the client program does not find it. See Section 8.2.17, "Pluggable Authentication".
- --port=port_num, -P port_num

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- port=port_num \\
\hline Type & Numeric \\
\hline Default Value & 3306 \\
\hline
\end{tabular}

For TCP/IP connections, the port number to use. The default port number is 3306.
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

This option explicitly specifies which transport protocol to use for connecting to the server. It is useful when other connection parameters normally result in use of a protocol other than the one you want. For example, connections on Unix to localhost are made using a Unix socket file by default:
```
mysql --host=localhost
```


To force TCP/IP transport to be used instead, specify a --protocol option:
mysql --host=localhost --protocol=TCP
The following table shows the permissible - -protocol option values and indicates the applicable platforms for each value. The values are not case-sensitive.

\begin{tabular}{|l|l|l|}
\hline - -protocol Value & Transport Protocol Used & Applicable Platforms \\
\hline TCP & TCP/IP transport to local or remote server & All \\
\hline SOCKET & Unix socket-file transport to local server & Unix and Unix-like systems \\
\hline PIPE & Named-pipe transport to local server & Windows \\
\hline MEMORY & Shared-memory transport to local server & Windows \\
\hline
\end{tabular}

See also Section 6.2.7, "Connection Transport Protocols"
- --shared-memory-base-name=name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - shared - memory - base - name=name \\
\hline Platform Specific & Windows \\
\hline
\end{tabular}

On Windows, the shared-memory name to use for connections made using shared memory to a local server. The default value is MYSQL. The shared-memory name is case-sensitive.

This option applies only if the server was started with the shared_memory system variable enabled to support shared-memory connections.
- --socket=path, -S path

\begin{tabular}{|l|l|}
\hline Command-Line Format & --socket=\{file_name|pipe_name\} \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
\hline
\end{tabular}

On Unix, the name of the Unix socket file to use for connections made using a named pipe to a local server. The default Unix socket file name is /tmp/mysql. sock.

On Windows, the name of the named pipe to use for connections to a local server. The default Windows pipe name is MySQL. The pipe name is not case-sensitive.

On Windows, this option applies only if the server was started with the named_pipe system variable enabled to support named-pipe connections. In addition, the user making the connection must be a member of the Windows group specified by the named_pipe_full_access_group system variable.
- --user=user_name, - u user_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - user=user_name \\
\hline Type & String \\
\hline
\end{tabular}

The user name of the MySQL account to use for connecting to the server. The default user name is ODBC on Windows or your Unix login name on Unix.

\section*{Command Options for Encrypted Connections}

This section describes options for client programs that specify whether to use encrypted connections to the server, the names of certificate and key files, and other parameters related to encrypted-connection support. For examples of suggested use and how to check whether a connection is encrypted, see Section 8.3.1, "Configuring MySQL to Use Encrypted Connections".

\section*{Note}

These options have an effect only for connections that use a transport protocol subject to encryption; that is, TCP/IP and Unix socket-file connections. See Section 6.2.7, "Connection Transport Protocols"

For information about using encrypted connections from the MySQL C API, see Support for Encrypted Connections.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.5 Connection-Encryption Option Summary}
\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --get-server-public-key & Request RSA public key from server \\
\hline --server-public-key-path & Path name to file containing RSA public key \\
\hline --ssl-ca & File that contains list of trusted SSL Certificate Authorities \\
\hline --ssl-capath & Directory that contains trusted SSL Certificate Authority certificate files \\
\hline --ssl-cert & File that contains X. 509 certificate \\
\hline --ssl-cipher & Permissible ciphers for connection encryption \\
\hline --ssl-crl & File that contains certificate revocation lists \\
\hline --ssl-crlpath & Directory that contains certificate revocation-list files \\
\hline --ssl-fips-mode & Whether to enable FIPS mode on client side \\
\hline --ssl-key & File that contains X. 509 key \\
\hline --ssl-mode & Desired security state of connection to server \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --ssl-session-data & File that contains SSL session data \\
\hline --ssl-session-data-continue-on-failed-reuse & Whether to establish connections if session reuse fails \\
\hline --tls-ciphersuites & Permissible TLSv1.3 ciphersuites for encrypted connections \\
\hline --tls-version & Permissible TLS protocols for encrypted connections \\
\hline
\end{tabular}
- --get-server-public-key

\begin{tabular}{|l|l|}
\hline Command-Line Format & --get-server-public-key \\
\hline Type & Boolean \\
\hline
\end{tabular}

Request from the server the public key required for RSA key pair-based password exchange. This option applies to clients that authenticate with the caching_sha2_password authentication plugin. For that plugin, the server does not send the public key unless requested. This option is ignored for accounts that do not authenticate with that plugin. It is also ignored if RSA-based password exchange is not used, as is the case when the client connects to the server using a secure connection.

If --server-public-key-path=file_name is given and specifies a valid public key file, it takes precedence over--get-server-public-key.

For information about the caching_sha2_password plugin, see Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".
- --server-public-key-path=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -server-public-key-path=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

The path name to a file in PEM format containing a client-side copy of the public key required by the server for RA key pair-based password exchange. This option applies to clients that authenticate with the sha256_password (deprecated) or caching_sha2_password authentication plugin. This option is ignored for accounts that do not authenticate with one of those plugins. It is also ignored if RSA-based password exchange is not used, as is the case when the client connects to the server using a secure connection.

If--server-public-key-path=file_name is given and specifies a valid public key file, it takes precedence over--get-server-public-key.

This option is available only if MySQL was built using OpenSSL.
For information about the sha256_password (deprecated) and caching_sha2_password plugins, see Section 8.4.1.3, "SHA-256 Pluggable Authentication", and Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".
- --ssl-ca=file_name

\begin{tabular}{|l|l|} 
Type & File name \\
\hline
\end{tabular}

The path name of the Certificate Authority (CA) certificate file in PEM format. The file contains a list of trusted SSL Certificate Authorities.

To tell the client not to authenticate the server certificate when establishing an encrypted connection to the server, specify neither--ssl-ca nor--ssl-capath. The server still verifies the client according to any applicable requirements established for the client account, and it still uses any ssl_ca or ssl_capath system variable values specified on the server side.

To specify the CA file for the server, set the ssl_ca system variable.
- --ssl-capath=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-capath=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

The path name of the directory that contains trusted SSL certificate authority (CA) certificate files in PEM format.

To tell the client not to authenticate the server certificate when establishing an encrypted connection to the server, specify neither--ssl-ca nor--ssl-capath. The server still verifies the client according to any applicable requirements established for the client account, and it still uses any ssl_ca or ssl_capath system variable values specified on the server side.

To specify the CA directory for the server, set the ssl_capath system variable.
- --ssl-cert=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-cert=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

The path name of the client SSL public key certificate file in PEM format. Chained SSL certificates are supported.

To specify the server SSL public key certificate file, set the ssl_cert system variable.
- --ssl-cipher=cipher_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-cipher=name \\
\hline Type & String \\
\hline
\end{tabular}

The list of permissible encryption ciphers for connections that use TLSv1.2. If no cipher in the list is supported, encrypted connections that use these TLS protocols do not work.

For greatest portability, cipher_list should be a list of one or more cipher names, separated by colons. Examples:
--ssl-cipher=AES128-SHA
--ssl-cipher=DHE-RSA-AES128-GCM-SHA256:AES128-SHA
OpenSSL supports the syntax for specifying ciphers described in the OpenSSL documentation at https://www.openssl.org/docs/manmaster/man1/ciphers.html.

For information about which encryption ciphers MySQL supports, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".

To specify the encryption ciphers for the server, set the ssl_cipher system variable.
- --ssl-crl=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-crl=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

The path name of the file containing certificate revocation lists in PEM format.
If neither--ssl-crl nor--ssl-crlpath is given, no CRL checks are performed, even if the CA path contains certificate revocation lists.

To specify the revocation-list file for the server, set the ssl_crl system variable.
- --ssl-crlpath=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-crlpath=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

The path name of the directory that contains certificate revocation-list files in PEM format.
If neither--ssl-crl nor--ssl-crlpath is given, no CRL checks are performed, even if the CA path contains certificate revocation lists.

To specify the revocation-list directory for the server, set the ssl_crlpath system variable.
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

These--ssl-fips-mode values are permissible:
- OFF: Disable FIPS mode.
- ON: Enable FIPS mode.
- STRICT: Enable "strict" FIPS mode.

\section*{Note}

If the OpenSSL FIPS Object Module is not available, the only permissible value for--ssl-fips-mode is OFF. In this case, setting--ssl-fips-
> mode to ON or STRICT causes the client to produce a warning at startup and to operate in non-FIPS mode.

To specify the FIPS mode for the server, set the ssl_fips_mode system variable.
- --ssl-key=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-key=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

The path name of the client SSL private key file in PEM format. For better security, use a certificate with an RSA key size of at least 2048 bits.

If the key file is protected by a passphrase, the client program prompts the user for the passphrase. The password must be given interactively; it cannot be stored in a file. If the passphrase is incorrect, the program continues as if it could not read the key.

To specify the server SSL private key file, set the ssl_key system variable.
- --ssl-mode=mode

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-mode=mode \\
\hline Type & Enumeration \\
\hline Default Value & PREFERRED \\
\hline Valid Values & \begin{tabular}{l}
DISABLED \\
PREFERRED \\
REQUIRED \\
VERIFY_CA \\
VERIFY_IDENTITY
\end{tabular} \\
\hline
\end{tabular}

This option specifies the desired security state of the connection to the server. These mode values are permissible, in order of increasing strictness:
- DISABLED: Establish an unencrypted connection.
- PREFERRED: Establish an encrypted connection if the server supports encrypted connections, falling back to an unencrypted connection if an encrypted connection cannot be established. This is the default if--ssl-mode is not specified.

Connections over Unix socket files are not encrypted with a mode of PREFERRED. To enforce encryption for Unix socket-file connections, use a mode of REQUIRED or stricter. (However, socket-file transport is secure by default, so encrypting a socket-file connection makes it no more secure and increases CPU load.)
- REQUIRED: Establish an encrypted connection if the server supports encrypted connections. The connection attempt fails if an encrypted connection cannot be established.
- VERIFY_CA: Like REQUIRED, but additionally verify the server Certificate Authority (CA) certificate against the configured CA certificates. The connection attempt fails if no valid matching CA certificates are found.
- VERIFY_IDENTITY: Like VERIFY_CA, but additionally perform host name identity verification by checking the host name the client uses for connecting to the server against the identity in the certificate that the server sends to the client:
- If the client uses OpenSSL 1.0.2 or higher, the client checks whether the host name that it uses for connecting matches either the Subject Alternative Name value or the Common Name value in the server certificate. Host name identity verification also works with certificates that specify the Common Name using wildcards.
- Otherwise, the client checks whether the host name that it uses for connecting matches the Common Name value in the server certificate.

The connection fails if there is a mismatch. For encrypted connections, this option helps prevent man-in-the-middle attacks.

\section*{Note}

Host name identity verification with VERIFY_IDENTITY does not work with self-signed certificates that are created automatically by the server (see Section 8.3.3.1, "Creating SSL and RSA Certificates and Keys using MySQL"). Such self-signed certificates do not contain the server name as the Common Name value.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0339.jpg?height=496&width=280&top_left_y=1165&top_left_x=392)

\section*{Important}

The default setting,--ssl-mode=PREFERRED, produces an encrypted connection if the other default settings are unchanged. However, to help prevent sophisticated man-in-the-middle attacks, it is important for the client to verify the server's identity. The settings --ssl-mode=VERIFY_CA and -ssl-mode=VERIFY_IDENTITY are a better choice than the default setting to help prevent this type of attack. To implement one of these settings, you must first ensure that the CA certificate for the server is reliably available to all the clients that use it in your environment, otherwise availability issues will result. For this reason, they are not the default setting.

The--ssl-mode option interacts with CA certificate options as follows:
- If --ssl-mode is not explicitly set otherwise, use of --ssl-ca or --ssl-capath implies --ssl-mode=VERIFY_CA.
- For --ssl-mode values of VERIFY_CA or VERIFY_IDENTITY, --ssl-ca or --ssl-capath is also required, to supply a CA certificate that matches the one used by the server.
- An explicit --ssl-mode option with a value other than VERIFY_CA or VERIFY_IDENTITY, together with an explicit--ssl-ca or--ssl-capath option, produces a warning that no verification of the server certificate is performed, despite a CA certificate option being specified.

To require use of encrypted connections by a MySQL account, use CREATE USER to create the account with a REQUIRE SSL clause, or use ALTER USER for an existing account to add a REQUIRE SSL clause. This causes connection attempts by clients that use the account to be rejected unless MySQL supports encrypted connections and an encrypted connection can be established.

The REQUIRE clause permits other encryption-related options, which can be used to enforce security requirements stricter than REQUIRE SSL. For additional details about which command options may or must be specified by clients that connect using accounts configured using the various REQUIRE options, see CREATE USER SSL/TLS Options.
- --ssl-session-data=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --ssl-session-data=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

The path name of the client SSL session data file in PEM format for session reuse.
When you invoke a MySQL client program with the--ssl-session-data option, the client attempts to deserialize session data from the file, if provided, and then use it to establish a new connection. If you supply a file, but the session is not reused, then the connection fails unless you also specified the--ssl-session-data-continue-on-failed-reuse option on the command line when you invoked the client program.

The mysql command, ssl_session_data_print, generates the session data file (see Section 6.5.1.2, "mysql Client Commands").
- ssl-session-data-continue-on-failed-reuse

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--ssl-session-data-continue-on- \\
failed-reuse
\end{tabular} \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Controls whether a new connection is started to replace an attempted connection that tried but failed to reuse session data specified with the--ssl-session-data command-line option. By default, the--ssl-session-data-continue-on-failed-reuse command-line option is off, which causes a client program to return a connect failure when session data are supplied and not reused.

To ensure that a new, unrelated connection opens after session reuse fails silently, invoke MySQL client programs with both the --ssl-session-data and--ssl-session-data-continue-on-failed-reuse command-line options.
- --tls-ciphersuites=ciphersuite_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & --tls-ciphersuites=ciphersuite_list \\
\hline Type & String \\
\hline Default Value & empty string \\
\hline
\end{tabular}

This option specifies which ciphersuites the client permits for encrypted connections that use TLSv1.3. The value is a list of zero or more colon-separated ciphersuite names. For example:
```
mysql --tls-ciphersuites="suite1:suite2:suite3"
```


The ciphersuites that can be named for this option depend on the SSL library used to compile MySQL. If this option is not set, the client permits the default set of ciphersuites. If the option is set to the empty string, no ciphersuites are enabled and encrypted connections cannot be established. For more information, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".

To specify which ciphersuites the server permits, set the tls_ciphersuites system variable.
---tls-version=protocol_list

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- tls-version=protocol_list \\
\hline Tvpe & String \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Default Value & \begin{tabular}{l} 
TLSv1, TLSv1.1, TLSv1.2, TLSv1.3 \\
(OpenSSL 1.1.1 or higher) \\
TLSv1, TLSv1.1, TLSv1.2 (otherwise)
\end{tabular} \\
\hline
\end{tabular}

This option specifies the TLS protocols the client permits for encrypted connections. The value is a list of one or more comma-separated protocol versions. For example:
mysql --tls-version="TLSv1.2,TLSv1.3"
The protocols that can be named for this option depend on the SSL library used to compile MySQL, and on the MySQL Server release.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0341.jpg?height=122&width=108&top_left_y=831&top_left_x=397)

\section*{Important}
- Clients, including MySQL Shell, that support the--tls-version option cannot make a TLS/SSL connection with the protocol set to TLSv1 or TLSv1.1. If a client attempts to connect using these protocols, for TCP connections, the connection fails, and an error is returned to the client. For socket connections, if --ssl-mode is set to REQUIRED, the connection fails, otherwise the connection is made but with TLS/SSL disabled. See Removal of Support for the TLSv1 and TLSv1.1 Protocols for more information.
- Support for the TLSv1.3 protocol is available in MySQL Server, provided that MySQL Server was compiled using OpenSSL 1.1.1 or higher. The server checks the version of OpenSSL at startup, and if it is lower than 1.1.1, TLSv1.3 is removed from the default value for the server system variables relating to the TLS version (such as the tls_version system variable).

Permitted protocols should be chosen such as not to leave "holes" in the list. For example, these values do not have holes:
```
--tls-version="TLSv1.2,TLSv1.3"
--tls-version="TLSv1.3"
```


For details, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".
To specify which TLS protocols the server permits, set the tls_version system variable.

\section*{Command Options for Connection Compression}

This section describes options that enable client programs to control use of compression for connections to the server. For additional information and examples showing how to use them, see Section 6.2.8, "Connection Compression Control".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.6 Connection-Compression Option Summary}
\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --compress & Compress all information sent between client and server \\
\hline --compression-algorithms & Permitted compression algorithms for connections to server \\
\hline --zstd-compression-level & Compression level for connections to server that use zstd compression \\
\hline
\end{tabular}
\end{table}
- --compress, -C

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -compress $[=\{\mathrm{OFF} \mid \mathrm{ON}\}]$ \\
\hline Deprecated & Yes \\
\hline Type & Boolean \\
\hline Default Value & OFF \\
\hline
\end{tabular}

Compress all information sent between the client and the server if possible.
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
---zstd-compression-level=level

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- zstd-compression-level=\# \\
\hline Type & Integer \\
\hline
\end{tabular}

The compression level to use for connections to the server that use the zstd compression algorithm. The permitted levels are from 1 to 22, with larger values indicating increasing levels of compression. The default zstd compression level is 3 . The compression level setting has no effect on connections that do not use zstd compression.

\subsection*{6.2.4 Connecting to the MySQL Server Using Command Options}

This section describes use of command-line options to specify how to establish connections to the MySQL server, for clients such as mysql or mysqldump. For information on establishing connections using URI-like connection strings or key-value pairs, for clients such as MySQL Shell, see Section 6.2.5, "Connecting to the Server Using URI-Like Strings or Key-Value Pairs". For additional information if you are unable to connect, see Section 8.2.22, "Troubleshooting Problems Connecting to MySQL".

For a client program to connect to the MySQL server, it must use the proper connection parameters, such as the name of the host where the server is running and the user name and password of your MySQL account. Each connection parameter has a default value, but you can override default values as necessary using program options specified either on the command line or in an option file.

The examples here use the mysql client program, but the principles apply to other clients such as mysqldump, mysqladmin, or mysqlshow.

This command invokes mysql without specifying any explicit connection parameters:
```
mysql
```


Because there are no parameter options, the default values apply:
- The default host name is localhost. On Unix, this has a special meaning, as described later.
- The default user name is ODBC on Windows or your Unix login name on Unix.
- No password is sent because neither --password nor -p is given.
- For mysql, the first nonoption argument is taken as the name of the default database. Because there is no such argument, mysql selects no default database.

To specify the host name and user name explicitly, as well as a password, supply appropriate options on the command line. To select a default database, add a database-name argument. Examples:
```
mysql --host=localhost --user=myname --password=password mydb
mysql -h localhost -u myname -ppassword mydb
```


For password options, the password value is optional:
- If you use a - - password or - p option and specify a password value, there must be no space between --password= or -p and the password following it.
- If you use - - password or - p but do not specify a password value, the client program prompts you to enter the password. The password is not displayed as you enter it. This is more secure than giving the password on the command line, which might enable other users on your system to see the password line by executing a command such as ps. See Section 8.1.2.1, "End-User Guidelines for Password Security".
- To explicitly specify that there is no password and that the client program should not prompt for one, use the --skip-password option.

As just mentioned, including the password value on the command line is a security risk. To avoid this risk, specify the --password or -p option without any following password value:
```
mysql --host=localhost --user=myname --password mydb
mysql -h localhost -u myname -p mydb
```


When the --password or -p option is given with no password value, the client program prints a prompt and waits for you to enter the password. (In these examples, mydb is not interpreted as a password because it is separated from the preceding password option by a space.)

On some systems, the library routine that MySQL uses to prompt for a password automatically limits the password to eight characters. That limitation is a property of the system library, not MySQL. Internally, MySQL does not have any limit for the length of the password. To work around the limitation on systems affected by it, specify your password in an option file (see Section 6.2.2.2, "Using Option Files"). Another workaround is to change your MySQL password to a value that has eight or fewer characters, but that has the disadvantage that shorter passwords tend to be less secure.

Client programs determine what type of connection to make as follows:
- If the host is not specified or is localhost, a connection to the local host occurs:
- On Windows, the client connects using shared memory, if the server was started with the shared_memory system variable enabled to support shared-memory connections.
- On Unix, MySQL programs treat the host name localhost specially, in a way that is likely different from what you expect compared to other network-based programs: the client connects using a Unix socket file. The --socket option or the MYSQL_UNIX_PORT environment variable may be used to specify the socket name.
- On Windows, if host is . (period), or TCP/IP is not enabled and --socket is not specified or the host is empty, the client connects using a named pipe, if the server was started with the named_pipe system variable enabled to support named-pipe connections. If named-pipe
connections are not supported or if the user making the connection is not a member of the Windows group specified by the named_pipe_full_access_group system variable, an error occurs.
- Otherwise, the connection uses TCP/IP.

The --protocol option enables you to use a particular transport protocol even when other options normally result in use of a different protocol. That is, --protocol specifies the transport protocol explicitly and overrides the preceding rules, even for localhost.

Only connection options that are relevant to the selected transport protocol are used or checked. Other connection options are ignored. For example, with --host=localhost on Unix, the client attempts to connect to the local server using a Unix socket file, even if a --port or -P option is given to specify a TCP/IP port number.

To ensure that the client makes a TCP/IP connection to the local server, use - - host or - h to specify a host name value of 127.0.0.1 (instead of localhost), or the IP address or name of the local server. You can also specify the transport protocol explicitly, even for localhost, by using the protocol=TCP option. Examples:
```
mysql --host=127.0.0.1
mysql --protocol=TCP
```


If the server is configured to accept IPv6 connections, clients can connect to the local server over IPv6 using - -host=: : 1 . See Section 7.1.13, "IPv6 Support".

On Windows, to force a MySQL client to use a named-pipe connection, specify the --pipe or - - protocol=PIPE option, or specify . (period) as the host name. If the server was not started with the named_pipe system variable enabled to support named-pipe connections or if the user making the connection is not a member of the Windows group specified by the named_pipe_full_access_group system variable, an error occurs. Use the --socket option to specify the name of the pipe if you do not want to use the default pipe name.

Connections to remote servers use TCP/IP. This command connects to the server running on remote. example. com using the default port number (3306):
```
mysql --host=remote.example.com
```


To specify a port number explicitly, use the --port or -P option:
```
mysql --host=remote.example.com --port=13306
```


You can specify a port number for connections to a local server, too. However, as indicated previously, connections to localhost on Unix use a socket file by default, so unless you force a TCP/IP connection as previously described, any option that specifies a port number is ignored.

For this command, the program uses a socket file on Unix and the --port option is ignored:
```
mysql --port=13306 --host=localhost
```


To cause the port number to be used, force a TCP/IP connection. For example, invoke the program in either of these ways:
```
mysql --port=13306 --host=127.0.0.1
mysql --port=13306 --protocol=TCP
```


For additional information about options that control how client programs establish connections to the server, see Section 6.2.3, "Command Options for Connecting to the Server".

It is possible to specify connection parameters without entering them on the command line each time you invoke a client program:
- Specify the connection parameters in the [client] section of an option file. The relevant section of the file might look like this:
```
[client]
host=host_name
```

```
user=user_name
password=password
```


For more information, see Section 6.2.2.2, "Using Option Files".
- Some connection parameters can be specified using environment variables. Examples:
- To specify the host for mysql, use MYSQL_HOST.
- On Windows, to specify the MySQL user name, use USER.

For a list of supported environment variables, see Section 6.9, "Environment Variables".

\subsection*{6.2.5 Connecting to the Server Using URI-Like Strings or Key-Value Pairs}

This section describes use of URI-like connection strings or key-value pairs to specify how to establish connections to the MySQL server, for clients such as MySQL Shell. For information on establishing connections using command-line options, for clients such as mysql or mysqldump, see Section 6.2.4, "Connecting to the MySQL Server Using Command Options". For additional information if you are unable to connect, see Section 8.2.22, "Troubleshooting Problems Connecting to MySQL".

\section*{Note}

The term "URI-like" signifies connection-string syntax that is similar to but not identical to the URI (uniform resource identifier) syntax defined by RFC 3986.

The following MySQL clients support connecting to a MySQL server using a URI-like connection string or key-value pairs:
- MySQL Shell
- MySQL Connectors which implement X DevAPI

This section documents all valid URI-like string and key-value pair connection parameters, many of which are similar to those specified with command-line options:
- Parameters specified with a URI-like string use a syntax such as myuser@example.com:3306/ main-schema. For the full syntax, see Connecting Using URI-Like Connection Strings.
- Parameters specified with key-value pairs use a syntax such as \{user : 'myuser ', host:'example.com', port:3306, schema:'main-schema'\}. For the full syntax, see Connecting Using Key-Value Pairs.

Connection parameters are not case-sensitive. Each parameter, if specified, can be given only once. If a parameter is specified more than once, an error occurs.

This section covers the following topics:
- Base Connection Parameters
- Additional Connection parameters
- Connecting Using URI-Like Connection Strings
- Connecting Using Key-Value Pairs

\section*{Base Connection Parameters}

The following discussion describes the parameters available when specifying a connection to MySQL. These parameters can be provided using either a string that conforms to the base URI-like syntax (see Connecting Using URI-Like Connection Strings), or as key-value pairs (see Connecting Using KeyValue Pairs).
- scheme: The transport protocol to use. Use mysqlx for X Protocol connections and mysql for classic MySQL protocol connections. If no protocol is specified, the server attempts to guess the
protocol. Connectors that support DNS SRV can use the mysqlx+srv scheme (see Connections Using DNS SRV Records).
- user: The MySQL user account to provide for the authentication process.
- password: The password to use for the authentication process.

\section*{Warning}

Specifying an explicit password in the connection specification is insecure and not recommended. Later discussion shows how to cause an interactive prompt for the password to occur.
- host: The host on which the server instance is running. The value can be a host name, IPv4 address, or IPv6 address. If no host is specified, the default is localhost.
- port: The TCP/IP network port on which the target MySQL server is listening for connections. If no port is specified, the default is 33060 for X Protocol connections and 3306 for classic MySQL protocol connections.
- socket: The path to a Unix socket file or the name of a Windows named pipe. Values are local file paths. In URI-like strings, they must be encoded, using either percent encoding or by surrounding the path with parentheses. Parentheses eliminate the need to percent encode characters such as the / directory separator character. For example, to connect as root@localhost using the Unix socket /tmp/mysql.sock, specify the path using percent encoding as root@localhost? socket=\%2Ftmp\%2Fmysql.sock, or using parentheses as root@localhost?socket=(/tmp/ mysql.sock).
- schema: The default database for the connection. If no database is specified, the connection has no default database.

The handling of localhost on Unix depends on the type of transport protocol. Connections using classic MySQL protocol handle localhost the same way as other MySQL clients, which means that localhost is assumed to be for socket-based connections. For connections using X Protocol, the behavior of localhost differs in that it is assumed to represent the loopback address, for example, IPv4 address 127.0.0.1.

\section*{Additional Connection parameters}

You can specify options for the connection, either as attributes in a URI-like string by appending ?attribute=value, or as key-value pairs. The following options are available:
- ssl-mode: The desired security state for the connection. The following modes are permissible:
- DISABLED
- PREFERRED
- REQUIRED
- VERIFY_CA
- VERIFY_IDENTITY

\section*{Important}

VERIFY_CA and VERIFY_IDENTITY are better choices than the default PREFERRED, because they help prevent man-in-the-middle attacks.

For information about these modes, see the--ssl-mode option description in Command Options for Encrypted Connections.
- ssl-ca: The path to the X. 509 certificate authority file in PEM format.
- ssl-capath: The path to the directory that contains the X. 509 certificates authority files in PEM format.
- ssl-cert: The path to the X. 509 certificate file in PEM format.
- ssl-cipher: The encryption cipher to use for connections that use TLS protocols up through TLSv1.2.
- ssl-crl: The path to the file that contains certificate revocation lists in PEM format.
- ssl-crlpath: The path to the directory that contains certificate revocation-list files in PEM format.
- ssl-key: The path to the X. 509 key file in PEM format.
- tls-version: The TLS protocols permitted for classic MySQL protocol encrypted connections. This option is supported by MySQL Shell only. The value of tls-version (singular) is a comma separated list, for example TLSv1.2, TLSv1.3. For details, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers". This option depends on the ssl-mode option not being set to DISABLED.
- tls-versions: The permissible TLS protocols for encrypted X Protocol connections. The value of tls-versions (plural) is an array such as [TLSv1.2, TLSv1.3]. For details, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers". This option depends on the ssl-mode option not being set to DISABLED.
- tls-ciphersuites: The permitted TLS cipher suites. The value of tls-ciphersuites is a list of IANA cipher suite names as listed at TLS Ciphersuites. For details, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers". This option depends on the ssl-mode option not being set to DISABLED.
- auth-method: The authentication method to use for the connection. The default is AUTO, meaning that the server attempts to guess. The following methods are permissible:
- AUTO
- MYSQL41
- SHA256_MEMORY
- FROM_CAPABILITIES
- FALLBACK
- PLAIN

For X Protocol connections, any configured auth-method is overridden to this sequence of authentication methods: MYSQL41, SHA256_MEMORY, PLAIN.
- get-server-public-key: Request from the server the public key required for RSA key pairbased password exchange. Use when connecting to MySQL 8+ servers over classic MySQL protocol with SSL mode DISABLED. You must specify the protocol in this case. For example:
mysql://user@localhost:3306?get-server-public-key=true
This option applies to clients that authenticate with the caching_sha2_password authentication plugin. For that plugin, the server does not send the public key unless requested. This option is ignored for accounts that do not authenticate with that plugin. It is also ignored if RSA-based password exchange is not used, as is the case when the client connects to the server using a secure connection.

If server-public-key-path=file_name is given and specifies a valid public key file, it takes precedence over get-server-public-key.

For information about the caching_sha2_password plugin, see Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".
- server-public-key-path: The path name to a file in PEM format containing a client-side copy of the public key required by the server for RSA key pair-based password exchange. Use when connecting to MySQL 8+ servers over classic MySQL protocol with SSL mode DISABLED.

This option applies to clients that authenticate with the sha256_password (deprecated) or caching_sha2_password authentication plugin. This option is ignored for accounts that do not authenticate with one of those plugins. It is also ignored if RSA-based password exchange is not used, as is the case when the client connects to the server using a secure connection.

If server-public-key-path=file_name is given and specifies a valid public key file, it takes precedence over get-server-public-key.

For information about the sha256_password (deprecated) and caching_sha2_password plugins, see Section 8.4.1.3, "SHA-256 Pluggable Authentication", and Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".
- ssh: The URI for connection to an SSH server to access a MySQL server instance using SSH tunneling. The URI format is [user@]host [:port]. Use the uri option to specify the URI of the target MySQL server instance. For information on SSH tunnel connections from MySQL Shell, see Using an SSH Tunnel.
- uri: The URI for a MySQL server instance that is to be accessed through an SSH tunnel from the server specified by the ssh option. The URI format is [scheme://][user@]host[:port]. Do not use the base connection parameters (scheme, user, host, port) to specify the MySQL server connection for SSH tunneling, just use the uri option.
- ssh-password: The password for the connection to the SSH server.

\section*{Warning}

Specifying an explicit password in the connection specification is insecure and not recommended. MySQL Shell prompts for a password interactively when one is required.
- ssh-config-file: The SSH configuration file for the connection to the SSH server. You can use the MySQL Shell configuration option ssh.configFile to set a custom file as the default if this option is not specified. If ssh.configFile has not been set, the default is the standard SSH configuration file $\sim /$. ssh/config.
- ssh-identity-file: The identity file to use for the connection to the SSH server. The default if this option is not specified is any identity file configured in an SSH agent (if used), or in the SSH configuration file, or the standard private key file in the SSH configuration folder ( $\sim /$. ssh/id_rsa).
- ssh-identity-pass: The passphrase for the identity file specified by the ssh-identity-file option.

\section*{Warning}

Specifying an explicit password in the connection specification is insecure and not recommended. MySQL Shell prompts for a password interactively when one is required.
- connect-timeout: An integer value used to configure the number of seconds that clients, such as MySQL Shell, wait until they stop trying to connect to an unresponsive MySQL server.
- compression: This option requests or disables compression for the connection.

The values available for this option are: required, which requests compression and fails if the server does not support it; preferred, which requests compression and falls back to an uncompressed connection; and disabled, which requests an uncompressed connection and fails if the server does not permit those. preferred is the default for X Protocol connections, and disabled is the default for classic MySQL protocol connections. For information on X Plugin connection compression control, see Section 22.5.5, "Connection Compression with X Plugin".

\section*{Note}

Different MySQL clients implement their support for connection compression differently. Consult your client's documentation for details.
- compression-algorithms and compression-level: These options are available in MySQL Shell for more control over connection compression. You can specify them to select the compression algorithm used for the connection, and the numeric compression level used with that algorithm. You can also use compression-algorithms in place of compression to request compression for the connection. For information on MySQL Shell's connection compression control, see Using Compressed Connections.
- connection-attributes: Controls the key-value pairs that application programs pass to the server at connect time. For general information about connection attributes, see Section 29.12.9, "Performance Schema Connection Attribute Tables". Clients usually define a default set of attributes, which can be disabled or enabled. For example:
```
mysqlx://user@host?connection-attributes
mysqlx://user@host?connection-attributes=true
mysqlx://user@host?connection-attributes=false
```


The default behavior is to send the default attribute set. Applications can specify attributes to be passed in addition to the default attributes. You specify additional connection attributes as a connection-attributes parameter in a connection string. The connection-attributes parameter value must be empty (the same as specifying true), a Boolean value (true or false to enable or disable the default attribute set), or a list or zero or more key=value specifiers separated by commas (to be sent in addition to the default attribute set). Within a list, a missing key value evaluates as an empty string. Further examples:
```
mysqlx://user@host?connection-attributes=[attr1=val1,attr2,attr3=]
mysqlx://user@host?connection-attributes=[]
```


Application-defined attribute names cannot begin with _ because such names are reserved for internal attributes.

\section*{Connecting Using URI-Like Connection Strings}

You can specify a connection to MySQL Server using a URI-like string. Such strings can be used with the MySQL Shell with the --uri command option, the MySQL Shell \connect command, and MySQL Connectors which implement $\mathrm{X} \operatorname{DevAPI}$.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0349.jpg?height=122&width=99&top_left_y=2151&top_left_x=370)

\section*{Note}

The term "URI-like" signifies connection-string syntax that is similar to but not identical to the URI (uniform resource identifier) syntax defined by RFC 3986.

A URI-like connection string has the following syntax:
[scheme://][user[:[password]]@]host[:port][/schema][?attribute1=value1\&attribute2=value2...

\section*{Important}

Percent encoding must be used for reserved characters in the elements of the URI-like string. For example, if you specify a string that includes the @ character,

Ithe character must be replaced by \%40. If you include a zone ID in an IPv6 address, the \% character used as the separator must be replaced with \%25.

The parameters you can use in a URI-like connection string are described at Base Connection Parameters.

MySQL Shell's shell.parseUri() and shell.unparseUri() methods can be used to deconstruct and assemble a URI-like connection string. Given a URI-like connection string, shell.parseUri() returns a dictionary containing each element found in the string. shell. unparseUri( ) converts a dictionary of URI components and connection options into a valid URI-like connection string for connecting to MySQL, which can be used in MySQL Shell or by MySQL Connectors which implement $X \operatorname{DevAPI}$.

If no password is specified in the URI-like string, which is recommended, interactive clients prompt for the password. The following examples show how to specify URI-like strings with the user name user_name. In each case, the password is prompted for.
- An X Protocol connection to a local server instance listening at port 33065.
```
mysqlx://user_name@localhost:33065
```

- A classic MySQL protocol connection to a local server instance listening at port 3333.
```
mysql://user_name@localhost:3333
```

- An X Protocol connection to a remote server instance, using a host name, an IPv4 address, and an IPv6 address.
```
mysqlx://user_name@server.example.com/
mysqlx://user_name@198.51.100.14:123
mysqlx://user_name@[2001:db8:85a3:8d3:1319:8a2e:370:7348]
```

- An X Protocol connection using a socket, with the path provided using either percent encoding or parentheses.
```
mysqlx://user_name@/path%2Fto%2Fsocket.sock
mysqlx://user_name@(/path/to/socket.sock)
```

- An optional path can be specified, which represents a database.
```
# use 'world' as the default database
mysqlx://user_name@198.51.100.1/world
# use 'world_x' as the default database, encoding _ as %5F
mysqlx://user_name@198.51.100.2:33060/world%5Fx
```

- An optional query can be specified, consisting of values each given as a $k e y=$ value pair or as a single key. To specify multiple values, separate them by , characters. A mix of key=value and key values is permissible. Values can be of type list, with list values ordered by appearance. Strings must be either percent encoded or surrounded by parentheses. The following are equivalent.
```
ssluser@127.0.0.1?ssl-ca=%2Froot%2Fclientcert%2Fca-cert.pem\
&ssl-cert=%2Froot%2Fclientcert%2Fclient-cert.pem\
&ssl-key=%2Froot%2Fclientcert%2Fclient-key
ssluser@127.0.0.1?ssl-ca=(/root/clientcert/ca-cert.pem)\
&ssl-cert=(/root/clientcert/client-cert.pem)\
&ssl-key=(/root/clientcert/client-key)
```

- To specify a TLS version and ciphersuite to use for encrypted connections:
```
mysql://user_name@198.51.100.2:3306/world%5Fx?\
tls-versions=[TLSv1.2,TLSv1.3]&tls-ciphersuites=[TLS_DHE_PSK_WITH_AES_128_\
GCM_SHA256, TLS_CHACHA20_POLY1305_SHA256]
```


The previous examples assume that connections require a password. With interactive clients, the specified user's password is requested at the login prompt. If the user account has no password (which
is insecure and not recommended), or if socket peer-credential authentication is in use (for example, with Unix socket connections), you must explicitly specify in the connection string that no password is being provided and the password prompt is not required. To do this, place a : after the user_name in the string but do not specify a password after it. For example:
```
mysqlx://user_name:@localhost
```


\section*{Connecting Using Key-Value Pairs}

In MySQL Shell and some MySQL Connectors which implement $X$ DevAPI, you can specify a connection to MySQL Server using key-value pairs, supplied in language-natural constructs for the implementation. For example, you can supply connection parameters using key-value pairs as a JSON object in JavaScript, or as a dictionary in Python. Regardless of the way the key-value pairs are supplied, the concept remains the same: the keys as described in this section can be assigned values that are used to specify a connection. You can specify connections using key-value pairs in MySQL Shell's shell.connect () method or InnoDB Cluster's dba.createCluster() method, and with some of the MySQL Connectors which implement X DevAPI.

Generally, key-value pairs are surrounded by \{ and \} characters and the , character is used as a separator between key-value pairs. The : character is used between keys and values, and strings must be delimited (for example, using the ' character). It is not necessary to percent encode strings, unlike URI-like connection strings.

A connection specified as key-value pairs has the following format:
```
{ key: value, key: value, ...}
```


The parameters you can use as keys for a connection are described at Base Connection Parameters.
If no password is specified in the key-value pairs, which is recommended, interactive clients prompt for the password. The following examples show how to specify connections using key-value pairs with the user name 'user_name'. In each case, the password is prompted for.
- An X Protocol connection to a local server instance listening at port 33065.
```
{user:'user_name', host:'localhost', port:33065}
```

- A classic MySQL protocol connection to a local server instance listening at port 3333.
```
{user:'user_name', host:'localhost', port:3333}
```

- An X Protocol connection to a remote server instance, using a host name, an IPv4 address, and an IPv6 address.
```
{user:'user_name', host:'server.example.com'}
{user:'user_name', host:198.51.100.14:123}
{user:'user_name', host:[2001:db8:85a3:8d3:1319:8a2e:370:7348]}
```

- An X Protocol connection using a socket.
```
{user:'user_name', socket:'/path/to/socket/file'}
```

- An optional schema can be specified, which represents a database.
```
{user:'user_name', host:'localhost', schema:'world'}
```


The previous examples assume that connections require a password. With interactive clients, the specified user's password is requested at the login prompt. If the user account has no password (which is insecure and not recommended), or if socket peer-credential authentication is in use (for example, with Unix socket connections), you must explicitly specify that no password is being provided and the password prompt is not required. To do this, provide an empty string using ' ' after the password key. For example:
```
{user:'user_name', password:'', host:'localhost'}
```


\subsection*{6.2.6 Connecting to the Server Using DNS SRV Records}

In the Domain Name System (DNS), a SRV record (service location record) is a type of resource record that enables a client to specify a name that indicates a service, protocol, and domain. A DNS lookup on the name returns a reply containing the names of multiple available servers in the domain that provide the required service. For information about DNS SRV, including how a record defines the preference order of the listed servers, see RFC 2782.

MySQL supports the use of DNS SRV records for connecting to servers. A client that receives a DNS SRV lookup result attempts to connect to the MySQL server on each of the listed hosts in order of preference, based on the priority and weighting assigned to each host by the DNS administrator. A failure to connect occurs only if the client cannot connect to any of the servers.

When multiple MySQL instances, such as a cluster of servers, provide the same service for your applications, DNS SRV records can be used to assist with failover, load balancing, and replication services. It is cumbersome for applications to directly manage the set of candidate servers for connection attempts, and DNS SRV records provide an alternative:
- DNS SRV records enable a DNS administrator to map a single DNS domain to multiple servers. DNS SRV records also can be updated centrally by administrators when servers are added or removed from the configuration or when their host names are changed.
- Central management of DNS SRV records eliminates the need for individual clients to identify each possible host in connection requests, or for connections to be handled by an additional software component. An application can use the DNS SRV record to obtain information about candidate MySQL servers, instead of managing the server information itself.
- DNS SRV records can be used in combination with connection pooling, in which case connections to hosts that are no longer in the current list of DNS SRV records are removed from the pool when they become idle.

MySQL supports use of DNS SRV records to connect to servers in these contexts:
- Several MySQL Connectors implement DNS SRV support; connector-specific options enable requesting DNS SRV record lookup both for X Protocol connections and for classic MySQL protocol connections. For general information, see Connections Using DNS SRV Records. For details, see the documentation for individual MySQL Connectors.
- The C API provides a mysql_real_connect_dns_srv( ) function that is similar to mysql_real_connect ( ), except that the argument list does not specify the particular host of the MySQL server to connect to. Instead, it names a DNS SRV record that specifies a group of servers. See mysql_real_connect_dns_srv().
- The mysql client has a--dns-srv-name option to indicate a DNS SRV record that specifies a group of servers. See Section 6.5.1, "mysql - The MySQL Command-Line Client".

A DNS SRV name consists of a service, protocol, and domain, with the service and protocol each prefixed by an underscore:
```
service._protocol.domain
```


The following DNS SRV record identifies multiple candidate servers, such as might be used by clients for establishing X Protocol connections:

\begin{tabular}{|l|l|l|l|l|l|l|l|}
\hline Name & TTL & Class & & Priority & Weight & Port & Target \\
\hline mysqlx._tcp.example.com. & 86400 & IN & SRV & 0 & 5 & 33060 & server1.example.com. \\
\hline mysqlx._tcp.example.com. & 86400 & IN & SRV & 0 & 10 & 33060 & server2.example.com. \\
\hline mysqlx._tcp.example.com. & 86400 & IN & SRV & 10 & 5 & 33060 & server3.example.com. \\
\hline mysqlx._tcp.example.com. & 86400 & IN & SRV & 20 & 5 & 33060 & server4.example.com. \\
\hline
\end{tabular}

Here, mysqlx indicates the X Protocol service and tcp indicates the TCP protocol. A client can request this DNS SRV record using the name _mysqlx._tcp.example.com. The particular syntax
for specifying the name in the connection request depends on the type of client. For example, a client might support specifying the name within a URI-like connection string or as a key-value pair.

A DNS SRV record for classic protocol connections might look like this:

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & TTL & Class & Priority & Weight & Port Target \\
\hline mysql._tcp.example.com. & 86400 & IN SRV & 0 & 5 & 3306 server1.example.com. \\
\hline mysql._tcp.example.com. & 86400 & IN SRV & 0 & 10 & 3306 server2.example.com. \\
\hline mysql._tcp.example.com. & 86400 & IN SRV & 10 & 5 & 3306 server3.example.com. \\
\hline mysql._tcp.example.com. & 86400 & IN SRV & 20 & 5 & 3306 server4.example.com. \\
\hline
\end{tabular}

Here, the name mysql designates the classic MySQL protocol service, and the port is 3306 (the default classic MySQL protocol port) rather than 33060 (the default X Protocol port).

When DNS SRV record lookup is used, clients generally must apply these rules for connection requests (there may be client- or connector-specific exceptions):
- The request must specify the full DNS SRV record name, with the service and protocol names prefixed by underscores.
- The request must not specify multiple host names.
- The request must not specify a port number.
- Only TCP connections are supported. Unix socket files, Windows named pipes, and shared memory cannot be used.

For more information on using DNS SRV based connections in X DevAPI, see Connections Using DNS SRV Records.

\subsection*{6.2.7 Connection Transport Protocols}

For programs that use the MySQL client library (for example, mysql and mysqldump), MySQL supports connections to the server based on several transport protocols: TCP/IP, Unix socket file, named pipe, and shared memory. This section describes how to select these protocols, and how they are similar and different.
- Transport Protocol Selection
- Transport Support for Local and Remote Connections
- Interpretation of localhost
- Encryption and Security Characteristics
- Connection Compression

\section*{Transport Protocol Selection}

For a given connection, if the transport protocol is not specified explicitly, it is determined implicitly. For example, connections to localhost result in a socket file connection on Unix and Unix-like systems, and a TCP/IP connection to 127.0.0.1 otherwise. For additional information, see Section 6.2.4, "Connecting to the MySQL Server Using Command Options".

To specify the protocol explicitly, use the --protocol command option. The following table shows the permissible values for - - protocol and indicates the applicable platforms for each value. The values are not case-sensitive.

\begin{tabular}{|l|l|l|}
\hline - - protocol Value & Transport Protocol Used & Applicable Platforms \\
\hline TCP & TCP/IP & All \\
\hline SOCKET & Unix socket file & Unix and Unix-like systems \\
\hline PIPE & Named pipe & Windows \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline - - protocol Value & Transport Protocol Used & Applicable Platforms \\
\hline MEMORY & Shared memory & Windows \\
\hline
\end{tabular}

\section*{Transport Support for Local and Remote Connections}

TCP/IP transport supports connections to local or remote MySQL servers.
Socket-file, named-pipe, and shared-memory transports support connections only to local MySQL servers. (Named-pipe transport does allow for remote connections, but this capability is not implemented in MySQL.)

\section*{Interpretation of localhost}

If the transport protocol is not specified explicitly, localhost is interpreted as follows:
- On Unix and Unix-like systems, a connection to localhost results in a socket-file connection.
- Otherwise, a connection to localhost results in a TCP/IP connection to 127.0.0.1.

If the transport protocol is specified explicitly, localhost is interpreted with respect to that protocol. For example, with --protocol=TCP, a connection to localhost results in a TCP/IP connection to 127.0 .0 .1 on all platforms.

\section*{Encryption and Security Characteristics}

TCP/IP and socket-file transports are subject to TLS/SSL encryption, using the options described in Command Options for Encrypted Connections. Named-pipe and shared-memory transports are not subject to TLS/SSL encryption.

A connection is secure by default if made over a transport protocol that is secure by default. Otherwise, for protocols that are subject to TLS/SSL encryption, a connection may be made secure using encryption:
- TCP/IP connections are not secure by default, but can be encrypted to make them secure.
- Socket-file connections are secure by default. They can also be encrypted, but encrypting a socketfile connection makes it no more secure and increases CPU load.
- Named-pipe connections are not secure by default, and are not subject to encryption to make them secure. However, the named_pipe_full_access_group system variable is available to control which MySQL users are permitted to use named-pipe connections.
- Shared-memory connections are secure by default.

If the require_secure_transport system variable is enabled, the server permits only connections that use some form of secure transport. Per the preceding remarks, connections that use TCP/ IP encrypted using TLS/SSL, a socket file, or shared memory are secure connections. TCP/IP connections not encrypted using TLS/SSL and named-pipe connections are not secure.

See also Configuring Encrypted Connections as Mandatory.

\section*{Connection Compression}

All transport protocols are subject to use of compression on the traffic between the client and server. If both compression and encryption are used for a given connection, compression occurs before encryption. For more information, see Section 6.2.8, "Connection Compression Control".

\subsection*{6.2. Connection Compression Control}

Connections to the server can use compression on the traffic between client and server to reduce the number of bytes sent over the connection. By default, connections are uncompressed, but can be compressed if the server and the client agree on a mutually permitted compression algorithm.

Compressed connections originate on the client side but affect CPU load on both the client and server sides because both sides perform compression and decompression operations. Because enabling compression decreases performance, its benefits occur primarily when there is low network bandwidth, network transfer time dominates the cost of compression and decompression operations, and result sets are large.

This section describes the available compression-control configuration parameters and the information sources available for monitoring use of compression. It applies to classic MySQL protocol connections.

Compression control applies to connections to the server by client programs and by servers participating in source/replica replication or Group Replication. Compression control does not apply to connections for FEDERATED tables. In the following discussion, "client connection" is shorthand for a connection to the server originating from any source for which compression is supported, unless context indicates a specific connection type.

> Note
> X Protocol connections to a MySQL Server instance support compression, but compression for X Protocol connections operates independently from the compression for classic MySQL protocol connections described here, and is controlled separately. See Section 22.5.5, "Connection Compression with X Plugin" for information on X Protocol connection compression.
- Configuring Connection Compression
- Configuring Legacy Connection Compression
- Monitoring Connection Compression

\section*{Configuring Connection Compression}

These configuration parameters are available for controlling connection compression:
- The protocol_compression_algorithms system variable configures which compression algorithms the server permits for incoming connections.
- The --compression-algorithms and --zstd-compression-level command-line options configure permitted compression algorithms and zstd compression level for these client programs: mysql, mysqladmin, mysqlbinlog, mysqlcheck, mysqldump, mysqlimport, mysqlshow, mysqlslap, and mysqltest. MySQL Shell also offers these command-line options.
- The MYSQL_OPT_COMPRESSION_ALGORITHMS and MYSQL_OPT_ZSTD_COMPRESSION_LEVEL options for the mysql_options() function configure permitted compression algorithms and zstd compression level for client programs that use the MySQL C API.
- The SOURCE_COMPRESSION_ALGORITHMS and SOURCE_ZSTD_COMPRESSION_LEVEL options for the CHANGE REPLICATION SOURCE TO statement configure permitted compression algorithms and zstd compression level for replica servers participating in source/replica replication.
- The group_replication_recovery_compression_algorithms and group_replication_recovery_zstd_compression_level system variables configure permitted compression algorithms and zstd compression level for Group Replication recovery connections when a new member joins a group and connects to a donor.

Configuration parameters that enable specifying compression algorithms are string-valued and take a list of one or more comma-separated compression algorithm names, in any order, chosen from the following items (not case-sensitive):
- zlib: Permit connections that use the zlib compression algorithm.
- zstd: Permit connections that use the zstd compression algorithm.
- uncompressed: Permit uncompressed connections.

\section*{Note}

Because uncompressed is an algorithm name that may or may not be configured, it is possible to configure MySQL not to permit uncompressed connections.

Examples:
- To configure which compression algorithms the server permits for incoming connections, set the protocol_compression_algorithms system variable. By default, the server permits all available algorithms. To configure that setting explicitly at startup, use these lines in the server my.cnf file:
[mysqld]
protocol_compression_algorithms=zlib,zstd, uncompressed
To set and persist the protocol_compression_algorithms system variable to that value at runtime, use this statement:

SET PERSIST protocol_compression_algorithms='zlib,zstd,uncompressed';
SET PERSIST sets a value for the running MySQL instance. It also saves the value, causing it to carry over to subsequent server restarts. To change the value for the running MySQL instance without having it carry over to subsequent restarts, use the GLOBAL keyword rather than PERSIST. See Section 15.7.6.1, "SET Syntax for Variable Assignment".
- To permit only incoming connections that use zstd compression, configure the server at startup like this:
[mysqld]
protocol_compression_algorithms=zstd
Or, to make the change at runtime:
SET PERSIST protocol_compression_algorithms='zstd';
- To permit the mysql client to initiate zlib or uncompressed connections, invoke it like this:
mysql --compression-algorithms=zlib, uncompressed
- To configure replicas to connect to the source using zlib or zstd connections, with a compression level of 7 for zstd connections, use a CHANGE REPLICATION SOURCE TO statement:

CHANGE REPLICATION SOURCE TO
SOURCE_COMPRESSION_ALGORITHMS = 'zlib,zstd',
SOURCE_ZSTD_COMPRESSION_LEVEL = 7;
This assumes that the replica_compressed_protocol system variable is disabled, for reasons described in Configuring Legacy Connection Compression.

For successful connection setup, both sides of the connection must agree on a mutually permitted compression algorithm. The algorithm-negotiation process attempts to use zlib, then zstd, then uncompressed. If the two sides can find no common algorithm, the connection attempt fails.

Because both sides must agree on the compression algorithm, and because uncompressed is an algorithm value that is not necessarily permitted, fallback to an uncompressed connection does not necessarily occur. For example, if the server is configured to permit zstd and a client is configured to permit zlib, uncompressed, the client cannot connect at all. In this case, no algorithm is common to both sides, so connection attempts fail.

Configuration parameters that enable specifying the zstd compression level take an integer value from 1 to 22, with larger values indicating increasing levels of compression. The default zstd compression level is 3 . The compression level setting has no effect on connections that do not use zstd compression.

A configurable zstd compression level enables choosing between less network traffic and higher CPU load versus more network traffic and lower CPU load. Higher compression levels reduce network congestion but the additional CPU load may reduce server performance.

\section*{Configuring Legacy Connection Compression}

Prior to MySQL 8.0.18, these configuration parameters are available for controlling connection compression:
- Client programs support a --compress command-line option to specify use of compression for the connection to the server.
- For programs that use the MySQL C API, enabling the MYSQL_OPT_COMPRESS option for the mysql_options() function specifies use of compression for the connection to the server.
- For source/replica replication, enabling the system variable replica_compressed_protocol specifies use of compression for replica connections to the source.

In each case, when use of compression is specified, the connection uses the zlib compression algorithm if both sides permit it, with fallback to an uncompressed connection otherwise.

As of MySQL 8.0.18, the compression parameters just described become legacy parameters, due to the additional compression parameters introduced for more control over connection compression that are described in Configuring Connection Compression. An exception is MySQL Shell, where the compress command-line option remains current, and can be used to request compression without selecting compression algorithms. For information on MySQL Shell's connection compression control, see Using Compressed Connections.

The legacy compression parameters interact with the newer parameters and their semantics change as follows:
- The meaning of the legacy --compress option depends on whether --compressionalgorithms is specified:
- When --compression-algorithms is not specified, --compress is equivalent to specifying a client-side algorithm set of zlib, uncompressed.
- When --compression-algorithms is specified, --compress is equivalent to specifying an algorithm set of zlib and the full client-side algorithm set is the union of zlib plus the algorithms specified by --compression-algorithms. For example, with both -compress and --compression-algorithms=zlib,zstd, the permitted-algorithm set is zlib plus zlib, zstd; that is, zlib, zstd. With both --compress and -compression-algorithms=zstd, uncompressed, the permitted-algorithm set is zlib plus zstd, uncompressed; that is, zlib, zstd, uncompressed.
- The same type of interaction occurs between the legacy MYSQL_OPT_COMPRESS option and the MYSQL_OPT_COMPRESSION_ALGORITHMS option for the mysql_options ( ) C API function.
- If the replica_compressed_protocol system variable is enabled, it takes precedence over SOURCE_COMPRESSION_ALGORITHMS and connections to the source use zlib compression if both source and replica permit that algorithm. If replica_compressed_protocol is disabled, the value of SOURCE_COMPRESSION_ALGORITHMS applies.

\section*{Monitoring Connection Compression}

The Compression status variable is ON or OFF to indicate whether the current connection uses compression.

The mysql client \status command displays a line that says Protocol: Compressed if compression is enabled for the current connection. If that line is not present, the connection is uncompressed.

The MySQL Shell \status command displays a Compression: line that says Disabled or Enabled to indicate whether the connection is compressed.

These additional sources of information are available for monitoring connection compression:
- To monitor compression in use for client connections, use the Compression_algorithm and Compression_level status variables. For the current connection, their values indicate the compression algorithm and compression level, respectively.
- To determine which compression algorithms the server is configured to permit for incoming connections, check the protocol_compression_algorithms system variable.
- For source/replica replication connections, the configured compression algorithms and compression level are available from multiple sources:
- The Performance Schema replication_connection_configuration table has COMPRESSION_ALGORITHMS and ZSTD_COMPRESSION_LEVEL columns.
- The mysql.slave_master_info system table has Master_compression_algorithms and Master_zstd_compression_level columns. If the master.info file exists, it contains lines for those values as well.

\subsection*{6.2.9 Setting Environment Variables}

Environment variables can be set at the command prompt to affect the current invocation of your command processor, or set permanently to affect future invocations. To set a variable permanently, you can set it in a startup file or by using the interface provided by your system for this purpose. Consult the documentation for your command interpreter for specific details. Section 6.9, "Environment Variables", lists all environment variables that affect MySQL program operation.

To specify a value for an environment variable, use the syntax appropriate for your command processor. For example, on Windows, you can set the USER variable to specify your MySQL account name. To do so, use this syntax:

SET USER=your_name
The syntax on Unix depends on your shell. Suppose that you want to specify the TCP/IP port number using the MYSQL_TCP_PORT variable. Typical syntax (such as for sh, ksh, bash, zsh, and so on) is as follows:

MYSQL_TCP_PORT=3306
export MYSQL_TCP_PORT
The first command sets the variable, and the export command exports the variable to the shell environment so that its value becomes accessible to MySQL and other processes.

For csh and tcsh, use setenv to make the shell variable available to the environment:
setenv MYSQL_TCP_PORT 3306
The commands to set environment variables can be executed at your command prompt to take effect immediately, but the settings persist only until you log out. To have the settings take effect each time you log in, use the interface provided by your system or place the appropriate command or commands in a startup file that your command interpreter reads each time it starts.

On Windows, you can set environment variables using the System Control Panel (under Advanced).
On Unix, typical shell startup files are .bashrc or .bash_profile for bash, or .tcshrc for tcsh.
Suppose that your MySQL programs are installed in /usr/local/mysql/bin and that you want to make it easy to invoke these programs. To do this, set the value of the PATH environment variable to include that directory. For example, if your shell is bash, add the following line to your . bashrc file:
```
PATH=${PATH}:/usr/local/mysql/bin
```

bash uses different startup files for login and nonlogin shells, so you might want to add the setting to .bashrc for nonlogin shells and to .bash_profile for login shells to make sure that PATH is set regardless.

If your shell is tcsh, add the following line to your . tcshrc file:
```
setenv PATH ${PATH}:/usr/local/mysql/bin
```


If the appropriate startup file does not exist in your home directory, create it with a text editor.
After modifying your PATH setting, open a new console window on Windows or log in again on Unix so that the setting goes into effect.

\subsection*{6.3 Server and Server-Startup Programs}

This section describes mysqld, the MySQL server, and several programs that are used to start the server.

\subsection*{6.3.1 mysqld - The MySQL Server}
mysqld, also known as MySQL Server, is a single multithreaded program that does most of the work in a MySQL installation. It does not spawn additional processes. MySQL Server manages access to the MySQL data directory that contains databases and tables. The data directory is also the default location for other information such as log files and status files.

When MySQL server starts, it listens for network connections from client programs and manages access to databases on behalf of those clients.

The mysqld program has many options that can be specified at startup. For a complete list of options, run this command:
```
mysqld --verbose --help
```


MySQL Server also has a set of system variables that affect its operation as it runs. System variables can be set at server startup, and many of them can be changed at runtime to effect dynamic server reconfiguration. MySQL Server also has a set of status variables that provide information about its operation. You can monitor these status variables to access runtime performance characteristics.

For a full description of MySQL Server command options, system variables, and status variables, see Section 7.1, "The MySQL Server". For information about installing MySQL and setting up the initial configuration, see Chapter 2, Installing MySQL.

\subsection*{6.3.2 mysqld_safe - MySQL Server Startup Script}
mysqld_safe is the recommended way to start a mysqld server on Unix. mysqld_safe adds some safety features such as restarting the server when an error occurs and logging runtime information to an error log. A description of error logging is given later in this section.

\section*{Note}

For some Linux platforms, MySQL installation from RPM or Debian packages includes systemd support for managing MySQL server startup and shutdown.

> On these platforms, mysqld_safe is not installed because it is unnecessary. For more information, see Section 2.5.9, "Managing MySQL Server with systemd".

> One implication of the non-use of mysqld_safe on platforms that use systemd for server management is that use of [mysqld_safe] or [safe_mysqld] sections in option files is not supported and might lead to unexpected behavior.

mysqld_safe tries to start an executable named mysqld. To override the default behavior and specify explicitly the name of the server you want to run, specify a--mysqld or--mysqld-version option to mysqld_safe. You can also use --ledir to indicate the directory where mysqld_safe should look for the server.

Many of the options to mysqld_safe are the same as the options to mysqld. See Section 7.1.7, "Server Command Options".

Options unknown to mysqld_safe are passed to mysqld if they are specified on the command line, but ignored if they are specified in the [mysqld_safe] group of an option file. See Section 6.2.2.2, "Using Option Files".
mysqld_safe reads all options from the [mysqld], [server], and [mysqld_safe] sections in option files. For example, if you specify a [mysqld] section like this, mysqld_safe finds and uses the--log-error option:
[mysqld]
log-error=error.log
For backward compatibility, mysqld_safe also reads [safe_mysqld] sections, but to be current you should rename such sections to [mysqld_safe].
mysqld_safe accepts options on the command line and in option files, as described in the following table. For information about option files used by MySQL programs, see Section 6.2.2.2, "Using Option Files".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.7 mysqld_safe Options}
\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --basedir & Path to MySQL installation directory \\
\hline --core-file-size & Size of core file that mysqld should be able to create \\
\hline --datadir & Path to data directory \\
\hline --defaults-extra-file & Read named option file in addition to usual option files \\
\hline --defaults-file & Read only named option file \\
\hline --help & Display help message and exit \\
\hline --ledir & Path to directory where server is located \\
\hline --log-error & Write error log to named file \\
\hline --malloc-lib & Alternative malloc library to use for mysqld \\
\hline --mysqld & Name of server program to start (in ledir directory) \\
\hline --mysqld-safe-log-timestamps & Timestamp format for logging \\
\hline --mysqld-version & Suffix for server program name \\
\hline --nice & Use nice program to set server scheduling priority \\
\hline --no-defaults & Read no option files \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --open-files-limit & Number of files that mysqld should be able to open \\
\hline --pid-file & Path name of server process ID file \\
\hline --plugin-dir & Directory where plugins are installed \\
\hline --port & Port number on which to listen for TCP/IP connections \\
\hline --skip-kill-mysqld & Do not try to kill stray mysqld processes \\
\hline --skip-syslog & Do not write error messages to syslog; use error log file \\
\hline --socket & Socket file on which to listen for Unix socket connections \\
\hline --syslog & Write error messages to syslog \\
\hline --syslog-tag & Tag suffix for messages written to syslog \\
\hline --timezone & Set TZ time zone environment variable to named value \\
\hline --user & Run mysqld as user having name user_name or numeric user ID user_id \\
\hline
\end{tabular}
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display a help message and exit.
- --basedir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - basedir=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

The path to the MySQL installation directory.
- --core-file-size=size

\begin{tabular}{|l|l|}
\hline Command-Line Format & --core-file-size=size \\
\hline Type & String \\
\hline
\end{tabular}

The size of the core file that mysqld should be able to create. The option value is passed to ulimit -c.

\section*{Note}

The innodb_buffer_pool_in_core_file variable can be used to reduce the size of core files on operating systems that support it. For more information, see Section 17.8.3.7, "Excluding or Including Buffer Pool Pages from Core Files".
- --datadir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --datadir=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

The path to the data directory.
- --defaults-extra-file=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

Read this option file in addition to the usual option files. If the file does not exist or is otherwise inaccessible, the server exits with an error. If file_name is not an absolute path name, it is interpreted relative to the current directory. This must be the first option on the command line if it is used.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --defaults-file=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - defaults-file=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

Use only the given option file. If the file does not exist or is otherwise inaccessible, the server exits with an error. If file_name is not an absolute path name, it is interpreted relative to the current directory. This must be the first option on the command line if it is used.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --ledir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - ledir=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

If mysqld_safe cannot find the server, use this option to indicate the path name to the directory where the server is located.

This option is accepted only on the command line, not in option files. On platforms that use systemd, the value can be specified in the value of MYSQLD_OPTS. See Section 2.5.9, "Managing MySQL Server with systemd".
- --log-error=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --log-error=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

Write the error log to the given file. See Section 7.4.2, "The Error Log".
- --mysqld-safe-log-timestamps

\begin{tabular}{|l|l|}
\hline Command-Line Format & --mysqld-safe-log-timestamps=type \\
\hline Type & Enumeration \\
\hline Default Value & utc \\
\hline Valid Values & system
\end{tabular}

\begin{tabular}{|l|l|}
\hline & hyphen \\
legacy \\
\hline
\end{tabular}

This option controls the format for timestamps in log output produced by mysqld_safe. The following list describes the permitted values. For any other value, mysqld_safe logs a warning and uses UTC format.
- UTC, utc

ISO 8601 UTC format (same as - - log_timestamps=UTC for the server). This is the default.
- SYSTEM, system

ISO 8601 local time format (same as --log_timestamps=SYSTEM for the server).
- HYPHEN, hyphen
$Y Y-M M-D D$ h:mm:ss format, as in mysqld_safe for MySQL 5.6.
- LEGACY, legacy

YYMMDD $h h: m m: s s$ format, as in mysqld_safe prior to MySQL 5.6.
- --malloc-lib=[lib_name]

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -malloc - lib=[lib - name $]$ \\
\hline Type & String \\
\hline
\end{tabular}

The name of the library to use for memory allocation instead of the system malloc ( ) library. The option value must be one of the directories /usr/lib, /usr/lib64, /usr/lib/i386-linuxgnu, or /usr/lib/x86_64-linux-gnu.

The --malloc-lib option works by modifying the LD_PRELOAD environment value to affect dynamic linking to enable the loader to find the memory-allocation library when mysqld runs:
- If the option is not given, or is given without a value (--malloc-lib=), LD_PRELOAD is not modified and no attempt is made to use tcmalloc.
- Prior to MySQL 8.0.21, if the option is given as --malloc-lib=tcmalloc, mysqld_safe looks for a tcmalloc library in /usr/lib. If tmalloc is found, its path name is added to the beginning
of the LD_PRELOAD value for mysqld. If tcmalloc is not found, mysqld_safe aborts with an error.

As of MySQL 8.0.21, tcmalloc is not a permitted value for the --malloc-lib option.
- If the option is given as --malloc-lib=/path/to/some/library, that full path is added to the beginning of the LD_PRELOAD value. If the full path points to a nonexistent or unreadable file, mysqld_safe aborts with an error.
- For cases where mysqld_safe adds a path name to LD_PRELOAD, it adds the path to the beginning of any existing value the variable already has.

\section*{Note}

On systems that manage the server using systemd, mysqld_safe is not available. Instead, specify the allocation library by setting LD_PRELOAD in / etc/sysconfig/mysql.

Linux users can use the libtcmalloc_minimal. so library on any platform for which a tcmalloc package is installed in /usr/lib by adding these lines to the my.cnf file:
```
[mysqld_safe]
malloc-lib=tcmalloc
```


To use a specific tcmalloc library, specify its full path name. Example:
```
[mysqld_safe]
malloc-lib=/opt/lib/libtcmalloc_minimal.so
```

- --mysqld=prog_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -mysqld=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

The name of the server program (in the ledir directory) that you want to start. This option is needed if you use the MySQL binary distribution but have the data directory outside of the binary distribution. If mysqld_safe cannot find the server, use the --ledir option to indicate the path name to the directory where the server is located.

This option is accepted only on the command line, not in option files. On platforms that use systemd, the value can be specified in the value of MYSQLD_OPTS. See Section 2.5.9, "Managing MySQL Server with systemd".
- --mysqld-version=suffix

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -mysqld - version=suffix \\
\hline Type & String \\
\hline
\end{tabular}

This option is similar to the --mysqld option, but you specify only the suffix for the server program name. The base name is assumed to be mysqld. For example, if you use --mysqldversion=debug, mysqld_safe starts the mysqld-debug program in the ledir directory. If the argument to --mysqld-version is empty, mysqld_safe uses mysqld in the ledir directory.

This option is accepted only on the command line, not in option files. On platforms that use systemd, the value can be specified in the value of MYSQLD_OPTS. See Section 2.5.9, "Managing MySQL
- --nice=priority

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - nice=priority \\
\hline Type & Numeric \\
\hline
\end{tabular}

Use the nice program to set the server's scheduling priority to the given value.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline Type & String \\
\hline
\end{tabular}

Do not read any option files. If program startup fails due to reading unknown options from an option file, --no-defaults can be used to prevent them from being read. This must be the first option on the command line if it is used.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --open-files-limit=count

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - open-files-limit=count \\
\hline Type & String \\
\hline
\end{tabular}

The number of files that mysqld should be able to open. The option value is passed to ulimit $-n$.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0365.jpg?height=119&width=97&top_left_y=1704&top_left_x=404)

Note
You must start mysqld_safe as root for this to function properly.
- --pid-file=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -pid-file=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

The path name that mysqld should use for its process ID file.
- --plugin-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- plugin-dir=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

The path name of the plugin directory.
- --port=port_num

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- port $=$ number \\
\hline Type & Numeric \\
\hline
\end{tabular}
- --skip-kill-mysqld

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-kill-mysqld \\
\hline
\end{tabular}

Do not try to kill stray mysqld processes at startup. This option works only on Linux.
- --socket=path

\begin{tabular}{|l|l|}
\hline Command-Line Format & --socket=file_name \\
\hline Type & File name \\
\hline
\end{tabular}

The Unix socket file that the server should use when listening for local connections.
- --syslog, --skip-syslog

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- syslog \\
\hline Deprecated & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Command-Line Format & --skip-syslog \\
\hline Deprecated & Yes \\
\hline
\end{tabular}
--syslog causes error messages to be sent to syslog on systems that support the logger program. --skip-syslog suppresses the use of syslog; messages are written to an error log file.

When syslog is used for error logging, the daemon. err facility/severity is used for all log messages.

Using these options to control mysqld logging is deprecated. To write error log output to the system log, use the instructions at Section 7.4.2.8, "Error Logging to the System Log". To control the facility, use the server log_syslog_facility system variable.
- --syslog-tag=tag

\begin{tabular}{|l|l|}
\hline Command-Line Format & --syslog-tag=tag \\
\hline Deprecated & Yes \\
\hline
\end{tabular}

For logging to syslog, messages from mysqld_safe and mysqld are written with identifiers of mysqld_safe and mysqld, respectively. To specify a suffix for the identifiers, use --syslogtag=tag, which modifies the identifiers to be mysqld_safe-tag and mysqld-tag.

Using this option to control mysqld logging is deprecated. Use the server log_syslog_tag system variable instead. See Section 7.4.2.8, "Error Logging to the System Log".
- --timezone=timezone

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -timezone=timezone \\
\hline Type & String \\
\hline
\end{tabular}
- --user=\{user_name|user_id\}

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - user=\{user_name| user_id\} \\
\hline Type & String \\
\hline Type & Numeric \\
\hline
\end{tabular}

Run the mysqld server as the user having the name user_name or the numeric user ID user_id. ("User" in this context refers to a system login account, not a MySQL user listed in the grant tables.)

If you execute mysqld_safe with the --defaults-file or --defaults-extra-file option to name an option file, the option must be the first one given on the command line or the option file is not used. For example, this command does not use the named option file:
```
mysql> mysqld_safe --port=port_num --defaults-file=file_name
```


Instead, use the following command:
```
mysql> mysqld_safe --defaults-file=file_name --port=port_num
```


The mysqld_safe script is written so that it normally can start a server that was installed from either a source or a binary distribution of MySQL, even though these types of distributions typically install the server in slightly different locations. (See Section 2.1.5, "Installation Layouts".) mysqld_safe expects one of the following conditions to be true:
- The server and databases can be found relative to the working directory (the directory from which mysqld_safe is invoked). For binary distributions, mysqld_safe looks under its working directory for bin and data directories. For source distributions, it looks for libexec and var directories. This condition should be met if you execute mysqld_safe from your MySQL installation directory (for example, /usr/local/mysql for a binary distribution).
- If the server and databases cannot be found relative to the working directory, mysqld_safe attempts to locate them by absolute path names. Typical locations are /usr/local/libexec and /usr/local/var. The actual locations are determined from the values configured into the distribution at the time it was built. They should be correct if MySQL is installed in the location specified at configuration time.

Because mysqld_safe tries to find the server and databases relative to its own working directory, you can install a binary distribution of MySQL anywhere, as long as you run mysqld_safe from the MySQL installation directory:
```
cd mysql_installation_directory
bin/mysqld_safe &
```


If mysqld_safe fails, even when invoked from the MySQL installation directory, specify the --ledir and --datadir options to indicate the directories in which the server and databases are located on your system.
mysqld_safe tries to use the sleep and date system utilities to determine how many times per second it has attempted to start. If these utilities are present and the attempted starts per second is greater than 5, mysqld_safe waits 1 full second before starting again. This is intended to prevent excessive CPU usage in the event of repeated failures. (Bug \#11761530, Bug \#54035)

When you use mysqld_safe to start mysqld, mysqld_safe arranges for error (and notice) messages from itself and from mysqld to go to the same destination.

There are several mysqld_safe options for controlling the destination of these messages:
- --log-error=file_name: Write error messages to the named error file.
- --syslog: Write error messages to syslog on systems that support the logger program.
- --skip-syslog: Do not write error messages to syslog. Messages are written to the default error log file (host_name.err in the data directory), or to a named file if the --log-error option is given.

If none of these options is given, the default is --skip-syslog.
When mysqld_safe writes a message, notices go to the logging destination (syslog or the error log file) and stdout. Errors go to the logging destination and stderr.

\section*{Note}

Controlling mysqld logging from mysqld_safe is deprecated. Use the server's native syslog support instead. For more information, see Section 7.4.2.8, "Error Logging to the System Log".

\subsection*{6.3.3 mysql.server - MySQL Server Startup Script}

MySQL distributions on Unix and Unix-like system include a script named mysql. server, which starts the MySQL server using mysqld_safe. It can be used on systems such as Linux and Solaris that use System V-style run directories to start and stop system services. It is also used by the macOS Startup Item for MySQL.
mysql. server is the script name as used within the MySQL source tree. The installed name might be different (for example, mysqld or mysql). In the following discussion, adjust the name mysql. server as appropriate for your system.

\section*{Note}

For some Linux platforms, MySQL installation from RPM or Debian packages includes systemd support for managing MySQL server startup and shutdown. On these platforms, mysql.server and mysqld_safe are not installed because they are unnecessary. For more information, see Section 2.5.9, "Managing MySQL Server with systemd".

To start or stop the server manually using the mysql. server script, invoke it from the command line with start or stop arguments:
mysql.server start
mysql.server stop
mysql. server changes location to the MySQL installation directory, then invokes mysqld_safe. To run the server as some specific user, add an appropriate user option to the [mysqld] group of the global /etc/my.cnf option file, as shown later in this section. (It is possible that you must edit mysql. server if you've installed a binary distribution of MySQL in a nonstandard location. Modify it to change location into the proper directory before it runs mysqld_safe. If you do this, your modified version of mysql. server may be overwritten if you upgrade MySQL in the future; make a copy of your edited version that you can reinstall.)
mysql. server stop stops the server by sending a signal to it. You can also stop the server manually by executing mysqladmin shutdown.

To start and stop MySQL automatically on your server, you must add start and stop commands to the appropriate places in your /etc/rc* files:
- If you use the Linux server RPM package (MySQL-server-VERSION. rpm), or a native Linux package installation, the mysql. server script may be installed in the /etc/init.d directory with the name mysqld or mysql. See Section 2.5.4, "Installing MySQL on Linux Using RPM Packages from Oracle", for more information on the Linux RPM packages.
- If you install MySQL from a source distribution or using a binary distribution format that does not install mysql. server automatically, you can install the script manually. It can be found in the support-files directory under the MySQL installation directory or in a MySQL source tree. Copy the script to the /etc/init.d directory with the name mysql and make it executable:
```
cp mysql.server /etc/init.d/mysql
chmod +x /etc/init.d/mysql
```


After installing the script, the commands needed to activate it to run at system startup depend on your operating system. On Linux, you can use chkconfig:
```
chkconfig --add mysql
```


On some Linux systems, the following command also seems to be necessary to fully enable the mysql script:
```
chkconfig --level 345 mysql on
```

- On FreeBSD, startup scripts generally should go in /usr/local/etc/rc.d/. Install the mysql.server script as /usr/local/etc/rc.d/mysql.server.sh to enable automatic startup. The rc(8) manual page states that scripts in this directory are executed only if their base name matches the *. sh shell file name pattern. Any other files or directories present within the directory are silently ignored.
- As an alternative to the preceding setup, some operating systems also use /etc/rc.local or / etc/init.d/boot.local to start additional services on startup. To start up MySQL using this method, append a command like the one following to the appropriate startup file:
```
/bin/sh -c 'cd /usr/local/mysql; ./bin/mysqld_safe --user=mysql &'
```

- For other systems, consult your operating system documentation to see how to install startup scripts.
mysql.server reads options from the [mysql.server] and [mysqld] sections of option files. For backward compatibility, it also reads [mysql_server] sections, but to be current you should rename such sections to [mysql.server].

You can add options for mysql.server in a global /etc/my.cnf file. A typical my.cnf file might look like this:
```
[mysqld]
datadir=/usr/local/mysql/var
socket=/var/tmp/mysql.sock
port=3306
user=mysql
[mysql.server]
basedir=/usr/local/mysql
```


The mysql. server script supports the options shown in the following table. If specified, they must be placed in an option file, not on the command line. mysql. server supports only start and stop as command-line arguments.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.8 mysql.server Option-File Options}
\begin{tabular}{|l|l|l|}
\hline Option Name & Description & Type \\
\hline basedir & Path to MySQL installation directory & Directory name \\
\hline datadir & Path to MySQL data directory & Directory name \\
\hline pid-file & File in which server should write its process ID & File name \\
\hline service-startup-timeout & How long to wait for server startup & Integer \\
\hline
\end{tabular}
\end{table}
- basedir=dir_name

The path to the MySQL installation directory.
- datadir=dir_name

The path to the MySQL data directory.
- pid-file=file_name

The path name of the file in which the server should write its process ID. The server creates the file in the data directory unless an absolute path name is given to specify a different directory.

If this option is not given, mysql. server uses a default value of host_name.pid. The PID file value passed to mysqld_safe overrides any value specified in the [mysqld_safe] option file group. Because mysql. server reads the [mysqld] option file group but not the [mysqld_safe] group, you can ensure that mysqld_safe gets the same value when invoked from mysql.server as when invoked manually by putting the same pid-file setting in both the [mysqld_safe] and [mysqld] groups.
- service-startup-timeout=seconds

How long in seconds to wait for confirmation of server startup. If the server does not start within this time, mysql. server exits with an error. The default value is 900 . A value of 0 means not to wait at all for startup. Negative values mean to wait forever (no timeout).

\subsection*{6.3.4 mysqld_multi - Manage Multiple MySQL Servers}
mysqld_multi is designed to manage several mysqld processes that listen for connections on different Unix socket files and TCP/IP ports. It can start or stop servers, or report their current status.

> Note
> For some Linux platforms, MySQL installation from RPM or Debian packages includes systemd support for managing MySQL server startup and shutdown. On these platforms, mysqld_multi is not installed because it is unnecessary. For information about using systemd to handle multiple MySQL instances, see Section 2.5.9, "Managing MySQL Server with systemd".

mysqld_multi searches for groups named [mysqld $N$ ] in my.cnf (or in the file named by the --defaults-file option). $N$ can be any positive integer. This number is referred to in the following discussion as the option group number, or GNR. Group numbers distinguish option groups from one another and are used as arguments to mysqld_multi to specify which servers you want to start, stop, or obtain a status report for. Options listed in these groups are the same that you would use in the [mysqld] group used for starting mysqld. (See, for example, Section 2.9.5, "Starting and Stopping MySQL Automatically".) However, when using multiple servers, it is necessary that each one use its own value for options such as the Unix socket file and TCP/IP port number. For more information on which options must be unique per server in a multiple-server environment, see Section 7.8, "Running Multiple MySQL Instances on One Machine".

To invoke mysqld_multi, use the following syntax:
```
mysqld_multi [options] {start|stop|reload|report} [GNR[,GNR] ...]
```

start, stop, reload (stop and restart), and report indicate which operation to perform. You can perform the designated operation for a single server or multiple servers, depending on the GNR list that follows the option name. If there is no list, mysqld_multi performs the operation for all servers in the option file.

Each GNR value represents an option group number or range of group numbers. The value should be the number at the end of the group name in the option file. For example, the GNR for a group named [mysqld17] is 17. To specify a range of numbers, separate the first and last numbers by a dash. The GNR value 10-13 represents groups [mysqld10] through [mysqld13]. Multiple groups or group ranges can be specified on the command line, separated by commas. There must be no whitespace characters (spaces or tabs) in the GNR list; anything after a whitespace character is ignored.

This command starts a single server using option group [mysqld17]:
mysqld_multi start 17
This command stops several servers, using option groups [mysqld8] and [mysqld10] through [mysqld13]:
mysqld_multi stop 8,10-13
For an example of how you might set up an option file, use this command:
mysqld_multi --example
mysqld_multi searches for option files as follows:
- With --no-defaults, no option files are read.

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}
- With --defaults-file=file_name, only the named file is read.

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-file=filename \\
\hline Type & File name \\
\hline Default Value & [none] \\
\hline
\end{tabular}
- Otherwise, option files in the standard list of locations are read, including any file named by the -defaults-extra-file=file_name option, if one is given. (If the option is given multiple times, the last value is used.)

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-extra-file=filename \\
\hline Type & File name \\
\hline Default Value & [none] \\
\hline
\end{tabular}

For additional information about these and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".

Option files read are searched for [mysqld_multi] and [mysqldN] option groups. The [mysqld_multi] group can be used for options to mysqld_multi itself. [mysqldN] groups can be used for options passed to specific mysqld instances.

The [mysqld] or [mysqld_safe] groups can be used for common options read by all instances of mysqld or mysqld_safe. You can specify a --defaults-file=file_name option to use a different configuration file for that instance, in which case the [mysqld] or [mysqld_safe] groups from that file are used for that instance.
mysqld_multi supports the following options.
- --help

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Display a help message and exit.
- --example

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - example \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Display a sample option file.
- --log=file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- log=path \\
\hline Type & File name \\
\hline Default Value & /var/log/mysqld_multi.log \\
\hline
\end{tabular}

Specify the name of the log file. If the file exists, log output is appended to it.
- --mysqladmin=prog_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -mysqladmin=file \\
\hline Type & File name \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

The mysqladmin binary to be used to stop servers.
- --mysqld=prog_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -mysqld=file \\
\hline Type & File name \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

The mysqld binary to be used. Note that you can specify mysqld_safe as the value for this option also. If you use mysqld_safe to start the server, you can include the mysqld or ledir options in the corresponding [mysqld $N$ ] option group. These options indicate the name of the server that mysqld_safe should start and the path name of the directory where the server is located. (See the descriptions for these options in Section 6.3.2, "mysqld_safe - MySQL Server Startup Script".) Example:
```
[mysqld38]
mysqld = mysqld-debug
ledir = /opt/local/mysql/libexec
```

- --no-log

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- no - log \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Print log information to stdout rather than to the log file. By default, output goes to the log file.
- --password=password

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - password=string \\
\hline
\end{tabular}

\begin{tabular}{|l|l|} 
Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

The password of the MySQL account to use when invoking mysqladmin. Note that the password value is not optional for this option, unlike for other MySQL programs.
- --silent

\begin{tabular}{|l|l|}
\hline Command-Line Format & --silent \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Silent mode; disable warnings.
- --tcp-ip

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - tcp-ip \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Connect to each MySQL server through the TCP/IP port instead of the Unix socket file. (If a socket file is missing, the server might still be running, but accessible only through the TCP/IP port.) By default, connections are made using the Unix socket file. This option affects stop and report operations.
- --user=user_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- user $=$ name \\
\hline Type & String \\
\hline Default Value & root \\
\hline
\end{tabular}

The user name of the MySQL account to use when invoking mysqladmin.
- --verbose

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- verbose \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Be more verbose.
- --version

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- version \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Display version information and exit.
Some notes about mysqld_multi:
- Most important: Before using mysqld_multi be sure that you understand the meanings of the options that are passed to the mysqld servers and why you would want to have separate mysqld processes. Beware of the dangers of using multiple mysqld servers with the same data directory. Use separate data directories, unless you know what you are doing. Starting multiple servers with the same data directory does not give you extra performance in a threaded system. See Section 7.8, "Running Multiple MySQL Instances on One Machine".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0374.jpg?height=111&width=97&top_left_y=536&top_left_x=344)

\section*{Important}

Make sure that the data directory for each server is fully accessible to the Unix account that the specific mysqld process is started as. Do not use the Unix root account for this, unless you know what you are doing. See Section 8.1.5, "How to Run MySQL as a Normal User".
- Make sure that the MySQL account used for stopping the mysqld servers (with the mysqladmin program) has the same user name and password for each server. Also, make sure that the account has the SHUTDOWN privilege. If the servers that you want to manage have different user names or passwords for the administrative accounts, you might want to create an account on each server that has the same user name and password. For example, you might set up a common multi_admin account by executing the following commands for each server:
```
$> mysql -u root -s /tmp/mysql.sock -p
Enter password:
mysql> CREATE USER 'multi_admin'@'localhost' IDENTIFIED BY 'multipass';
mysql> GRANT SHUTDOWN ON *.* TO 'multi_admin'@'localhost';
```


See Section 8.2, "Access Control and Account Management". You have to do this for each mysqld server. Change the connection parameters appropriately when connecting to each one. Note that the host name part of the account name must permit you to connect as multi_admin from the host where you want to run mysqld_multi.
- The Unix socket file and the TCP/IP port number must be different for every mysqld. (Alternatively, if the host has multiple network addresses, you can set the bind_address system variable to cause different servers to listen to different interfaces.)
- The --pid-file option is very important if you are using mysqld_safe to start mysqld (for example, --mysqld=mysqld_safe) Every mysqld should have its own process ID file. The advantage of using mysqld_safe instead of mysqld is that mysqld_safe monitors its mysqld process and restarts it if the process terminates due to a signal sent using kill - 9 or for other reasons, such as a segmentation fault.
- You might want to use the --user option for mysqld, but to do this you need to run the mysqld_multi script as the Unix superuser (root). Having the option in the option file doesn't matter; you just get a warning if you are not the superuser and the mysqld processes are started under your own Unix account.

The following example shows how you might set up an option file for use with mysqld_multi. The order in which the mysqld programs are started or stopped depends on the order in which they appear in the option file. Group numbers need not form an unbroken sequence. The first and fifth [mysqld $N$ ] groups were intentionally omitted from the example to illustrate that you can have "gaps" in the option file. This gives you more flexibility.
```
# This is an example of a my.cnf file for mysqld_multi.
# Usually this file is located in home dir ~/.my.cnf or /etc/my.cnf
[mysqld_multi]
mysqld = /usr/local/mysql/bin/mysqld_safe
mysqladmin = /usr/local/mysql/bin/mysqladmin
user = multi_admin
password = my_password
[mysqld2]
socket = /tmp/mysql.sock2
```

```
port = 3307
pid-file = /usr/local/mysql/data2/hostname.pid2
datadir = /usr/local/mysql/data2
language = /usr/local/mysql/share/mysql/english
user = unix_user1
[mysqld3]
mysqld = /path/to/mysqld_safe
ledir = /path/to/mysqld-binary/
mysqladmin = /path/to/mysqladmin
socket = /tmp/mysql.sock3
port = 3308
pid-file = /usr/local/mysql/data3/hostname.pid3
datadir = /usr/local/mysql/data3
language = /usr/local/mysql/share/mysql/swedish
user = unix_user2
[mysqld4]
socket = /tmp/mysql.sock4
port = 3309
pid-file = /usr/local/mysql/data4/hostname.pid4
datadir = /usr/local/mysql/data4
language = /usr/local/mysql/share/mysql/estonia
user = unix_user3
[mysqld6]
socket = /tmp/mysql.sock6
port = 3311
pid-file = /usr/local/mysql/data6/hostname.pid6
datadir = /usr/local/mysql/data6
language = /usr/local/mysql/share/mysql/japanese
user = unix_user4
```


See Section 6.2.2.2, "Using Option Files".

\subsection*{6.4 Installation-Related Programs}

The programs in this section are used when installing or upgrading MySQL.

\subsection*{6.4.1 comp_err - Compile MySQL Error Message File}
comp_err creates the errmsg. sys file that is used by mysqld to determine the error messages to display for different error codes. comp_err normally is run automatically when MySQL is built. It compiles the errmsg. sys file from text-format error information in MySQL source distributions:

The error information comes from the messages_to_error_log.txt and messages_to_clients.txt files in the share directory.

For more information about defining error messages, see the comments within those files, along with the errmsg_readme.txt file.
comp_err also generates the mysqld_error.h, mysqld_ername.h, and mysqld_errmsg.h header files.

Invoke comp_err like this:
```
comp_err [options]
```

comp_err supports the following options.
- --help, -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Display a help message and exit.
- --charset=dir_name, -C dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - charset \\
\hline Type & String \\
\hline Default Value & . ./share/charsets \\
\hline
\end{tabular}

The character set directory. The default is . ./sql/share/charsets.
- --debug=debug_options, -\# debug_options

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug=options \\
\hline Type & String \\
\hline Default Value & d:t:o,/tmp/comp_err.trace \\
\hline
\end{tabular}

Write a debugging log. A typical debug_options string is $\mathrm{d}: \mathrm{t}: 0$, file_name. The default is d:t:0,/tmp/comp_err.trace.
- --debug-info, -T

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - debug-info \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Print some debugging information when the program exits.
- --errmsg-file=file_name, -H file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --errmsg-file=name \\
\hline Type & File name \\
\hline Default Value & mysqld_errmsg.h \\
\hline
\end{tabular}

The name of the error message file. The default is mysqld_errmsg.h.
- --header-file=file_name, -H file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - header - file=name \\
\hline Type & File name \\
\hline Default Value & mysqld_error.h \\
\hline
\end{tabular}

The name of the error header file. The default is mysqld_error.h.
- --in-file-errlog=file_name, -e file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --in-file-errlog \\
\hline Type & File name \\
\hline Default Value & . ./share/messages_to_error_log.txt \\
\hline
\end{tabular}

The name of the input file that defines error messages intended to be written to the error log. The default is . ./share/messages_to_error_log.txt.
- --in-file-toclient=file_name, -c file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --in-file-toclient=path \\
\hline Type & File name \\
\hline Default Value & . ./share/messages_to_clients.txt \\
\hline
\end{tabular}

The name of the input file that defines error messages intended to be written to clients. The default is
. ./share/messages_to_clients.txt.
- --name-file=file_name, -N file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - name - file=name \\
\hline Type & File name \\
\hline Default Value & mysqld_ername. h \\
\hline
\end{tabular}

The name of the error name file. The default is mysqld_ername.h.
- --out-dir=dir_name, -D dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --out-dir=path \\
\hline Type & String \\
\hline Default Value &..$/$ share/ \\
\hline
\end{tabular}

The name of the output base directory. The default is . ./sql/share/.
- --out-file=file_name,-0 file_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & --out-file=name \\
\hline Type & File name \\
\hline Default Value & errmsg.sys \\
\hline
\end{tabular}

The name of the output file. The default is errmsg. sys.
- --version, -V

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- version \\
\hline Type & Boolean \\
\hline Default Value & false \\
\hline
\end{tabular}

Display version information and exit.

\subsection*{6.4.2 mysql_secure_installation - Improve MySQL Installation Security}

This program enables you to improve the security of your MySQL installation in the following ways:
- You can set a password for root accounts.
- You can remove root accounts that are accessible from outside the local host.
- You can remove anonymous-user accounts.
- You can remove the test database (which by default can be accessed by all users, even anonymous users), and privileges that permit anyone to access databases with names that start with test_.
mysql_secure_installation helps you implement security recommendations similar to those described at Section 2.9.4, "Securing the Initial MySQL Account".

Normal usage is to connect to the local MySQL server; invoke mysql_secure_installation without arguments:
mysql_secure_installation
When executed, mysql_secure_installation prompts you to determine which actions to perform.
The validate_password component can be used for password strength checking. If the plugin is not installed, mysql_secure_installation prompts the user whether to install it. Any passwords entered later are checked using the plugin if it is enabled.

Most of the usual MySQL client options such as --host and --port can be used on the command line and in option files. For example, to connect to the local server over IPv6 using port 3307, use this command:
mysql_secure_installation --host=::1 --port=3307
mysql_secure_installation supports the following options, which can be specified on the command line or in the [mysql_secure_installation] and [client] groups of an option file. For information about option files used by MySQL programs, see Section 6.2.2.2, "Using Option Files".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.9 mysql_secure_installation Options}
\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --defaults-extra-file & Read named option file in addition to usual option files \\
\hline --defaults-file & Read only named option file \\
\hline --defaults-group-suffix & Option group suffix value \\
\hline --help & Display help message and exit \\
\hline --host & Host on which MySQL server is located \\
\hline --no-defaults & Read no option files \\
\hline --password & Accepted but always ignored. Whenever mysql_secure_installation is invoked, the user is prompted for a password, regardless \\
\hline --port & TCP/IP port number for connection \\
\hline --print-defaults & Print default options \\
\hline --protocol & Transport protocol to use \\
\hline --socket & Unix socket file or Windows named pipe to use \\
\hline --ssl-ca & File that contains list of trusted SSL Certificate Authorities \\
\hline --ssl-capath & Directory that contains trusted SSL Certificate Authority certificate files \\
\hline --ssl-cert & File that contains X. 509 certificate \\
\hline --ssl-cipher & Permissible ciphers for connection encryption \\
\hline --ssl-crl & File that contains certificate revocation lists \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --ssl-crlpath & Directory that contains certificate revocation-list files \\
\hline --ssl-fips-mode & Whether to enable FIPS mode on client side \\
\hline --ssl-key & File that contains X. 509 key \\
\hline --ssl-mode & Desired security state of connection to server \\
\hline --ssl-session-data & File that contains SSL session data \\
\hline --ssl-session-data-continue-on-failed-reuse & Whether to establish connections if session reuse fails \\
\hline --tls-ciphersuites & Permissible TLSv1.3 ciphersuites for encrypted connections \\
\hline --tls-sni-servername & Server name supplied by the client \\
\hline --tls-version & Permissible TLS protocols for encrypted connections \\
\hline --use-default & Execute with no user interactivity \\
\hline --user & MySQL user name to use when connecting to server \\
\hline
\end{tabular}
- --help, -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display a help message and exit.
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

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --defaults-group-suffix=str

\begin{tabular}{|l|l|}
\hline Command-Line Format & --defaults-group-suffix=str \\
\hline Type & String \\
\hline
\end{tabular}

Read not only the usual option groups, but also groups with the usual names and a suffix of str. For example, mysql_secure_installation normally reads the [client] and [mysql_secure_installation] groups. If this option is given as --defaults-groupsuffix=_other, mysql_secure_installation also reads the [client_other] and [mysql_secure_installation_other] groups.

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --host=host_name, -h host_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - host \\
\hline
\end{tabular}

Connect to the MySQL server on the given host.
- --no-defaults

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - no - defaults \\
\hline
\end{tabular}

Do not read any option files. If program startup fails due to reading unknown options from an option file, --no-defaults can be used to prevent them from being read.

The exception is that the .mylogin. cnf file is read in all cases, if it exists. This permits passwords to be specified in a safer way than on the command line even when --no-defaults is used. To create .mylogin.cnf, use the mysql_config_editor utility. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

For additional information about this and other option-file options, see Section 6.2.2.3, "CommandLine Options that Affect Option-File Handling".
- --password=password, -p password

\begin{tabular}{|l|l|}
\hline Command-Line Format & -- password=password \\
\hline Type & String \\
\hline Default Value & {$[$ none $]$} \\
\hline
\end{tabular}

This option is accepted but ignored. Whether or not this option is used, mysql_secure_installation always prompts the user for a password.
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
- --socket=path, -S path

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -socket $=\{$ file_name $\mid$ pipe_name $\}$ \\
\hline Type & String \\
\hline
\end{tabular}

For connections to localhost, the Unix socket file to use, or, on Windows, the name of the named pipe to use.

On Windows, this option applies only if the server was started with the named_pipe system variable enabled to support named-pipe connections. In addition, the connection must be a member of the Windows group specified by the named_pipe_full_access_group system variable.
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
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0382.jpg?height=127&width=101&top_left_y=479&top_left_x=340)

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
- --use-default

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - use - default \\
\hline Type & Boolean \\
\hline
\end{tabular}

Execute noninteractively. This option can be used for unattended installation operations.
- --user=user_name, - u user_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - user=user_name \\
\hline Type & String \\
\hline
\end{tabular}

The user name of the MySQL account to use for connecting to the server.

\subsection*{6.4.3 mysql_tzinfo_to_sql — Load the Time Zone Tables}

The mysql_tzinfo_to_sql program loads the time zone tables in the mysql database. It is used on systems that have a zoneinfo database (the set of files describing time zones). Examples of such systems are Linux, FreeBSD, Solaris, and macOS. One likely location for these files is the /usr/ share/zoneinfo directory (/usr/share/lib/zoneinfo on Solaris). If your system does not have a zoneinfo database, you can use the downloadable package described in Section 7.1.15, "MySQL Server Time Zone Support".
mysql_tzinfo_to_sql can be invoked several ways:
```
mysql_tzinfo_to_sql tz_dir
mysql_tzinfo_to_sql tz_file tz_name
mysql_tzinfo_to_sql --leap tz_file
```


For the first invocation syntax, pass the zoneinfo directory path name to mysql_tzinfo_to_sql and send the output into the mysql program. For example:
mysql_tzinfo_to_sql /usr/share/zoneinfo | mysql -u root mysql
mysql_tzinfo_to_sql reads your system's time zone files and generates SQL statements from them. mysql processes those statements to load the time zone tables.

The second syntax causes mysql_tzinfo_to_sql to load a single time zone file tz_file that corresponds to a time zone name $t$ z_name:
mysql_tzinfo_to_sql tz_file tz_name | mysql -u root mysql
If your time zone needs to account for leap seconds, invoke mysql_tzinfo_to_sql using the third syntax, which initializes the leap second information. $t z_{-} f i l e$ is the name of your time zone file:
mysql_tzinfo_to_sql --leap tz_file | mysql -u root mysql
After running mysql_tzinfo_to_sql, it is best to restart the server so that it does not continue to use any previously cached time zone data.

\subsection*{6.5 Client Programs}

This section describes client programs that connect to the MySQL server.

\subsection*{6.5.1 mysql - The MySQL Command-Line Client}
mysql is a simple SQL shell with input line editing capabilities. It supports interactive and noninteractive use. When used interactively, query results are presented in an ASCII-table format. When used noninteractively (for example, as a filter), the result is presented in tab-separated format. The output format can be changed using command options.

If you have problems due to insufficient memory for large result sets, use the --quick option. This forces mysql to retrieve results from the server a row at a time rather than retrieving the entire result set and buffering it in memory before displaying it. This is done by returning the result set using the mysql_use_result ( ) C API function in the client/server library rather than mysql_store_result().

\section*{Note}

Alternatively, MySQL Shell offers access to the X DevAPI. For details, see MySQL Shell 8.4.

Using mysql is very easy. Invoke it from the prompt of your command interpreter as follows:
```
mysql db_name
```


Or:
mysql --user=user_name --password db_name
In this case, you'll need to enter your password in response to the prompt that mysql displays:
Enter password: your_password
Then type an SQL statement, end it with ;, \g, or \G and press Enter.
Typing Control+C interrupts the current statement if there is one, or cancels any partial input line otherwise.

You can execute SQL statements in a script file (batch file) like this:
mysql db_name < script.sql > output.tab
On Unix, the mysql client logs statements executed interactively to a history file. See Section 6.5.1.3, "mysql Client Logging".

\subsection*{6.5.1.1 mysql Client Options}
mysql supports the following options, which can be specified on the command line or in the [mysql] and [client] groups of an option file. For information about option files used by MySQL programs, see Section 6.2.2.2, "Using Option Files".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 6.10 mysql Client Options}
\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --authentication-oci-client-config-profile & Name of the OCl profile defined in the OCl config file to use \\
\hline --auto-rehash & Enable automatic rehashing \\
\hline --auto-vertical-output & Enable automatic vertical result set display \\
\hline --batch & Do not use history file \\
\hline --binary-as-hex & Display binary values in hexadecimal notation \\
\hline --binary-mode & Disable \r\n-to - ln translation and treatment of \0 as end-of-query \\
\hline --bind-address & Use specified network interface to connect to MySQL Server \\
\hline --character-sets-dir & Directory where character sets are installed \\
\hline --column-names & Write column names in results \\
\hline --column-type-info & Display result set metadata \\
\hline --commands & Enable or disable processing of local mysql client commands \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --comments & Whether to retain or strip comments in statements sent to the server \\
\hline --compress & Compress all information sent between client and server \\
\hline --compression-algorithms & Permitted compression algorithms for connections to server \\
\hline --connect-expired-password & Indicate to server that client can handle expiredpassword sandbox mode \\
\hline --connect-timeout & Number of seconds before connection timeout \\
\hline --database & The database to use \\
\hline --debug & Write debugging log; supported only if MySQL was built with debugging support \\
\hline --debug-check & Print debugging information when program exits \\
\hline --debug-info & Print debugging information, memory, and CPU statistics when program exits \\
\hline --default-auth & Authentication plugin to use \\
\hline --default-character-set & Specify default character set \\
\hline --defaults-extra-file & Read named option file in addition to usual option files \\
\hline --defaults-file & Read only named option file \\
\hline --defaults-group-suffix & Option group suffix value \\
\hline --delimiter & Set the statement delimiter \\
\hline --dns-srv-name & Use DNS SRV lookup for host information \\
\hline --enable-cleartext-plugin & Enable cleartext authentication plugin \\
\hline --execute & Execute the statement and quit \\
\hline --force & Continue even if an SQL error occurs \\
\hline --get-server-public-key & Request RSA public key from server \\
\hline --help & Display help message and exit \\
\hline --histignore & Patterns specifying which statements to ignore for logging \\
\hline --host & Host on which MySQL server is located \\
\hline --html & Produce HTML output \\
\hline --ignore-spaces & Ignore spaces after function names \\
\hline --init-command & SQL statement to execute after connecting \\
\hline --init-command-add & Add an additional SQL statement to execute after connecting or re-connecting to MySQL server \\
\hline --line-numbers & Write line numbers for errors \\
\hline --load-data-local-dir & Directory for files named in LOAD DATA LOCAL statements \\
\hline --local-infile & Enable or disable for LOCAL capability for LOAD DATA \\
\hline --login-path & Read login path options from .mylogin.cnf \\
\hline --max-allowed-packet & Maximum packet length to send to or receive from server \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --max-join-size & The automatic limit for rows in a join when using --safe-updates \\
\hline --named-commands & Enable named mysql commands \\
\hline --net-buffer-length & Buffer size for TCP/IP and socket communication \\
\hline --network-namespace & Specify network namespace \\
\hline --no-auto-rehash & Disable automatic rehashing \\
\hline --no-beep & Do not beep when errors occur \\
\hline --no-defaults & Read no option files \\
\hline --no-login-paths & Do not read login paths from the login path file \\
\hline --oci-config-file & Defines an alternate location for the Oracle Cloud Infrastructure CLI configuration file. \\
\hline --one-database & Ignore statements except those for the default database named on the command line \\
\hline --pager & Use the given command for paging query output \\
\hline --password & Password to use when connecting to server \\
\hline --password1 & First multifactor authentication password to use when connecting to server \\
\hline --password2 & Second multifactor authentication password to use when connecting to server \\
\hline --password3 & Third multifactor authentication password to use when connecting to server \\
\hline --pipe & Connect to server using named pipe (Windows only) \\
\hline --plugin-authentication-kerberos-client-mode & Permit GSSAPI pluggable authentication through the MIT Kerberos library on Windows \\
\hline --plugin-authentication-webauthn-client-preserveprivacy & Permit user to choose a key to be used for assertion \\
\hline --plugin-dir & Directory where plugins are installed \\
\hline --port & TCP/IP port number for connection \\
\hline --print-defaults & Print default options \\
\hline --prompt & Set the prompt to the specified format \\
\hline --protocol & Transport protocol to use \\
\hline --quick & Do not cache each query result \\
\hline --raw & Write column values without escape conversion \\
\hline --reconnect & If the connection to the server is lost, automatically try to reconnect \\
\hline --register-factor & Multifactor authentication factors for which registration must be done \\
\hline --safe-updates, --i-am-a-dummy & Allow only UPDATE and DELETE statements that specify key values \\
\hline --select-limit & The automatic limit for SELECT statements when using --safe-updates \\
\hline --server-public-key-path & Path name to file containing RSA public key \\
\hline --shared-memory-base-name & Shared-memory name for shared-memory connections (Windows only) \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --show-warnings & Show warnings after each statement if there are any \\
\hline --sigint-ignore & Ignore SIGINT signals (typically the result of typing Control+C) \\
\hline --silent & Silent mode \\
\hline --skip-auto-rehash & Disable automatic rehashing \\
\hline --skip-column-names & Do not write column names in results \\
\hline --skip-line-numbers & Skip line numbers for errors \\
\hline --skip-named-commands & Disable named mysql commands \\
\hline --skip-pager & Disable paging \\
\hline --skip-reconnect & Disable reconnecting \\
\hline --skip-system-command & Disable system (!!) command \\
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
\hline --syslog & Log interactive statements to syslog \\
\hline --system-command & Enable or disable system (!!) command \\
\hline --table & Display output in tabular format \\
\hline --tee & Append a copy of output to named file \\
\hline --telemetry_client & Enables the telemetry client. \\
\hline --otel_bsp_max_export_batch_size & See variable OTEL_BSP_MAX_EXPORT_BATCH_SIZE. \\
\hline --otel_bsp_max_queue_size & See variable OTEL_BSP_MAX_QUEUE_SIZE. \\
\hline --otel_bsp_schedule_delay & See variable OTEL_BSP_SCHEDULE_DELAY. \\
\hline --otel_exporter_otlp_traces_certificates & Not in use at this time. Reserved for future development. \\
\hline --otel_exporter_otlp_traces_client_certificates & Not in use at this time. Reserved for future development. \\
\hline --otel_exporter_otlp_traces_client_key & Not in use at this time. Reserved for future development. \\
\hline --otel_exporter_otlp_traces_compression & Compression type \\
\hline
\end{tabular}

\begin{tabular}{|l|l|}
\hline Option Name & Description \\
\hline --otel_exporter_otlp_traces_endpoint & The trace export endpoint \\
\hline --otel_exporter_otlp_traces_headers & Key-value pairs to be used as headers associated with HTTP requests \\
\hline --otel_exporter_otlp_traces_protocol & The OTLP transport protocol \\
\hline --otel_exporter_otlp_traces_timeout & Time OLTP exporter waits for each batch export \\
\hline --otel-help & When enabled, prints help about telemetry_client options. \\
\hline --otel_log_level & Controls which opentelemetry logs are printed in the server logs \\
\hline --otel_resource_attributes & See corresponding OpenTelemetry variable OTEL_RESOURCE_ATTRIBUTES. \\
\hline --otel-trace & This system variable controls whether telemetry traces are collected or not. \\
\hline --tls-ciphersuites & Permissible TLSv1.3 ciphersuites for encrypted connections \\
\hline --tls-sni-servername & Server name supplied by the client \\
\hline --tls-version & Permissible TLS protocols for encrypted connections \\
\hline --unbuffered & Flush the buffer after each query \\
\hline --user & MySQL user name to use when connecting to server \\
\hline --verbose & Verbose mode \\
\hline --version & Display version information and exit \\
\hline --vertical & Print query output rows vertically (one line per column value) \\
\hline --wait & If the connection cannot be established, wait and retry instead of aborting \\
\hline --xml & Produce XML output \\
\hline --zstd-compression-level & Compression level for connections to server that use zstd compression \\
\hline
\end{tabular}
- --help, -?

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - help \\
\hline
\end{tabular}

Display a help message and exit.
- --authentication-oci-client-config-profile

\begin{tabular}{|l|l|}
\hline Command-Line Format & \begin{tabular}{l}
--authentication-oci-client-config- \\
profile=profileName
\end{tabular} \\
\hline Type & String \\
\hline
\end{tabular}

Specify the name of the OCI configuration profile to use. If not set, the default profile is used.
- --auto-rehash

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - auto - rehash \\
\hline
\end{tabular}

|Disabled by |skip-auto-rehash

Enable automatic rehashing. This option is on by default, which enables database, table, and column name completion. Use --disable-auto-rehash to disable rehashing. That causes mysql to start faster, but you must issue the rehash command or its \\# shortcut if you want to use name completion.

To complete a name, enter the first part and press Tab. If the name is unambiguous, mysql completes it. Otherwise, you can press Tab again to see the possible names that begin with what you have typed so far. Completion does not occur if there is no default database.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0389.jpg?height=122&width=99&top_left_y=790&top_left_x=404)

\section*{Note}

This feature requires a MySQL client that is compiled with the readline library. Typically, the readline library is not available on Windows.
- --auto-vertical-output

\begin{tabular}{|l|l|}
\hline Command-Line Format & --auto-vertical-output \\
\hline
\end{tabular}

Cause result sets to be displayed vertically if they are too wide for the current window, and using normal tabular format otherwise. (This applies to statements terminated by ; or \G.)
- --batch, -B

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - batch \\
\hline
\end{tabular}

Print results using tab as the column separator, with each row on a new line. With this option, mysql does not use the history file.

Batch mode results in nontabular output format and escaping of special characters. Escaping may be disabled by using raw mode; see the description for the - - raw option.
- --binary-as-hex

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - binary-as-hex \\
\hline Type & Boolean \\
\hline Default Value & FALSE in noninteractive mode \\
\hline
\end{tabular}

When this option is given, mysql displays binary data using hexadecimal notation (0xvalue). This occurs whether the overall output display format is tabular, vertical, HTML, or XML.
--binary-as-hex when enabled affects display of all binary strings, including those returned by functions such as CHAR( ) and UNHEX( ). The following example demonstrates this using the ASCII code for A (65 decimal, 41 hexadecimal):
- - - binary-as - hex disabled:
```
mysql> SELECT CHAR(0x41), UNHEX('41');
+-------------+--------------+
| CHAR(0x41) | UNHEX('41') |
| A | A |
+-------------+-------------+
```

- --binary-as-hex enabled:
```
mysql> SELECT CHAR(0x41), UNHEX('41');
+--------------------------+---------------------------
| CHAR(0x41) | UNHEX('41') |
+--------------------------+---------------------------
| 0x41 | 0x41 |
+--------------------------+-------------------------+
```


To write a binary string expression so that it displays as a character string regardless of whether - -binary-as-hex is enabled, use these techniques:
- The CHAR( ) function has a USING charset clause:
```
mysql> SELECT CHAR(0x41 USING utf8mb4);
+----------------------------+
| CHAR(0x41 USING utf8mb4) |
+---------------------------+
| A
+---------------------------+
```

- More generally, use CONVERT ( ) to convert an expression to a given character set:
```
mysql> SELECT CONVERT(UNHEX('41') USING utf8mb4);
+--------------------------------------+
| CONVERT(UNHEX('41') USING utf8mb4) |
+--------------------------------------+
| A |
```


When mysql operates in interactive mode, this option is enabled by default. In addition, output from the status (or \s) command includes this line when the option is enabled implicitly or explicitly:

Binary data as: Hexadecimal
To disable hexadecimal notation, use --skip-binary-as-hex
- --binary-mode

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - binary-mode \\
\hline
\end{tabular}

This option helps when processing mysqlbinlog output that may contain BLOB values. By default, mysql translates \r\n in statement strings to \n and interprets \0 as the statement terminator. --binary-mode disables both features. It also disables all mysql commands except charset and delimiter in noninteractive mode (for input piped to mysql or loaded using the source command).
(MySQL 8.4.6 and later:) - - binary-mode, when enabled, causes the server to disregard any setting for --commands .
- --bind-address=ip_address

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - bind - address=ip_address \\
\hline
\end{tabular}

On a computer having multiple network interfaces, use this option to select which interface to use for connecting to the MySQL server.
- --character-sets-dir=dir_name

\begin{tabular}{|l|l|}
\hline Command-Line Format & - -character-sets-dir=dir_name \\
\hline Type & Directory name \\
\hline
\end{tabular}

The directory where character sets are installed. See Section 12.15, "Character Set Configuration".
- --column-names

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - column - names \\
\hline
\end{tabular}

Write column names in results.
- --column-type-info

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - column-type-info \\
\hline
\end{tabular}

Display result set metadata. This information corresponds to the contents of C API MYSQL_FIELD data structures. See C API Basic Data Structures.
- --commands

\begin{tabular}{|l|l|}
\hline Command-Line Format & - - commands \\
\hline Type & Boolean \\
\hline
\end{tabular}

\section*{Default Value}

