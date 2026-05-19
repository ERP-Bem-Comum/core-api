\section*{Chapter 1 General Information}
Table of Contents
1.1 About This Manual ..... 2
1.2 Overview of the MySQL Database Management System ..... 4
1.2.1 What is MySQL? ..... 4
1.2.2 The Main Features of MySQL ..... 5
1.2.3 History of MySQL ..... 8
1.3 MySQL Releases: Innovation and LTS ..... 8
1.4 What Is New in MySQL 8.4 since MySQL 8.0 ..... 10
1.5 Server and Status Variables and Options Added, Deprecated, or Removed in MySQL 8.4 since 8.0 ..... 32
1.6 How to Report Bugs or Problems ..... 40
1.7 MySQL Standards Compliance ..... 44
1.7.1 MySQL Extensions to Standard SQL ..... 45
1.7.2 MySQL Differences from Standard SQL ..... 48
1.7.3 How MySQL Deals with Constraints ..... 51

The MySQL software delivers a very fast, multithreaded, multi-user, and robust SQL (Structured Query Language) database server. MySQL Server is intended for mission-critical, heavy-load production systems as well as for embedding into mass-deployed software. Oracle is a registered trademark of Oracle Corporation and/or its affiliates. MySQL is a trademark of Oracle Corporation and/or its affiliates, and shall not be used by Customer without Oracle's express written authorization. Other names may be trademarks of their respective owners.

The MySQL software is Dual Licensed. Users can choose to use the MySQL software as an Open Source product under the terms of the GNU General Public License (http://www.fsf.org/licenses/) or can purchase a standard commercial license from Oracle. See http://www.mysql.com/company/legal/ licensing/ for more information on our licensing policies.

The following list describes some sections of particular interest in this manual:
- For a discussion of MySQL Database Server capabilities, see Section 1.2.2, "The Main Features of MySQL".
- For an overview of new MySQL features, see Section 1.4, "What Is New in MySQL 8.4 since MySQL 8.0". For information about the changes in each version, see the Release Notes.
- For installation instructions, see Chapter 2, Installing MySQL. For information about upgrading MySQL, see Chapter 3, Upgrading MySQL.
- For a tutorial introduction to the MySQL Database Server, see Chapter 5, Tutorial.
- For information about configuring and administering MySQL Server, see Chapter 7, MySQL Server Administration.
- For information about security in MySQL, see Chapter 8, Security.
- For information about setting up replication servers, see Chapter 19, Replication.
- For information about MySQL Enterprise, the commercial MySQL release with advanced features and management tools, see Chapter 32, MySQL Enterprise Edition.
- For answers to a number of questions that are often asked concerning the MySQL Database Server and its capabilities, see Appendix A, MySQL 8.4 Frequently Asked Questions.
- For a history of new features and bug fixes, see the Release Notes.

\section*{Important}

To report problems or bugs, please use the instructions at Section 1.6, "How to Report Bugs or Problems". If you find a security bug in MySQL Server, please let us know immediately by sending an email message to <secalert_us@oracle.com>. Exception: Support customers should report all problems, including security bugs, to Oracle Support.

\subsection*{1.1 About This Manual}

This is the Reference Manual for the MySQL Database System, version 8.4, through release 8.4.9. Differences between minor versions of MySQL 8.4 are noted in the present text with reference to release numbers (8.4.x). For license information, see the Legal Notices.

This manual is not intended for use with older versions of the MySQL software due to the many functional and other differences between MySQL 8.4 and previous versions. If you are using an earlier release of the MySQL software, please refer to the appropriate manual. For example, the MySQL 8.0 Reference Manual covers the 8.0 bugfix series of MySQL software releases.

Because this manual serves as a reference, it does not provide general instruction on SQL or relational database concepts. It also does not teach you how to use your operating system or command-line interpreter.

The MySQL Database Software is under constant development, and the Reference Manual is updated frequently as well. The most recent version of the manual is available online in searchable form at https://dev.mysql.com/doc/. Other formats also are available there, including downloadable HTML and PDF versions.

The source code for MySQL itself contains internal documentation written using Doxygen. The generated Doxygen content is available from https://dev.mysql.com/doc/index-other.html. It is also possible to generate this content locally from a MySQL source distribution using the instructions at Section 2.8.10, "Generating MySQL Doxygen Documentation Content".

If you have questions about using MySQL, join the MySQL Community Slack. If you have suggestions concerning additions or corrections to the manual itself, please send them to the http://www.mysql.com/ company/contact/.

\section*{Typographical and Syntax Conventions}

This manual uses certain typographical conventions:
- Text in this style is used for SQL statements; database, table, and column names; program listings and source code; and environment variables. Example: "To reload the grant tables, use the FLUSH PRIVILEGES statement."
- Text in this style indicates input that you type in examples.
- Text in this style indicates the names of executable programs and scripts, examples being mysql (the MySQL command-line client program) and mysqld (the MySQL server executable).
- Text in this style is used for variable input for which you should substitute a value of your own choosing.
- Text in this style is used for emphasis.
- Text in this style is used in table headings and to convey especially strong emphasis.
- Text in this style is used to indicate a program option that affects how the program is executed, or that supplies information that is needed for the program to function in a certain way. Example: "The --host option (short form - h) tells the mysql client program the hostname or IP address of the MySQL server that it should connect to".
- File names and directory names are written like this: "The global my. cnf file is located in the /etc directory."
- Character sequences are written like this: "To specify a wildcard, use the '\%' character."

When commands or statements are prefixed by a prompt, we use these:
```
$> type a command here
#> type a command as root here
C:\> type a command here (Windows only)
mysql> type a mysql statement here
```


Commands are issued in your command interpreter. On Unix, this is typically a program such as sh, csh, or bash. On Windows, the equivalent program is command.com or cmd.exe, typically run in a console window. Statements prefixed by mysql are issued in the mysql command-line client.

\section*{Note}

When you enter a command or statement shown in an example, do not type the prompt shown in the example.

In some areas different systems may be distinguished from each other to show that commands should be executed in two different environments. For example, while working with replication the commands might be prefixed with source and replica:
```
source> type a mysql statement on the replication source here
replica> type a mysql statement on the replica here
```


Database, table, and column names must often be substituted into statements. To indicate that such substitution is necessary, this manual uses db_name, tbl_name, and col_name. For example, you might see a statement like this:
```
mysql> SELECT col_name FROM db_name.tbl_name;
```


This means that if you were to enter a similar statement, you would supply your own database, table, and column names, perhaps like this:
```
mysql> SELECT author_name FROM biblio_db.author_list;
```


SQL keywords are not case-sensitive and may be written in any lettercase. This manual uses uppercase.

In syntax descriptions, square brackets ("[" and "]") indicate optional words or clauses. For example, in the following statement, IF EXISTS is optional:
```
DROP TABLE [IF EXISTS] tbl_name
```


When a syntax element consists of a number of alternatives, the alternatives are separated by vertical bars ("|"). When one member from a set of choices may be chosen, the alternatives are listed within square brackets ("[" and "]"):
```
TRIM([[BOTH | LEADING | TRAILING] [remstr] FROM] str)
```


When one member from a set of choices must be chosen, the alternatives are listed within braces ("\{" and "\}"):
\{DESCRIBE | DESC\} tbl_name [col_name | wild]
An ellipsis (. . . ) indicates the omission of a section of a statement, typically to provide a shorter version of more complex syntax. For example, SELECT ... INTO OUTFILE is shorthand for the form of SELECT statement that has an INTO OUTFILE clause following other parts of the statement.

An ellipsis can also indicate that the preceding syntax element of a statement may be repeated. In the following example, multiple reset_option values may be given, with each of those after the first preceded by commas:

RESET reset_option [,reset_option] ...
Commands for setting shell variables are shown using Bourne shell syntax. For example, the sequence to set the CC environment variable and run the configure command looks like this in Bourne shell syntax:
```
CC=gcc ./configure
```


If you are using csh or tcsh, you must issue commands somewhat differently:
```
$> setenv CC gcc
$> ./configure
```


\section*{Manual Authorship}

The Reference Manual source files are written in DocBook XML format. The HTML version and other formats are produced automatically, primarily using the DocBook XSL stylesheets. For information about DocBook, see http://docbook.org/

This manual was originally written by David Axmark and Michael "Monty" Widenius. It is maintained by the MySQL Documentation Team, consisting of Edward Gilmore, Sudharsana Gomadam, Kim seong Loh, Garima Sharma, Carlos Ortiz, Daniel So, and Jon Stephens.

\subsection*{1.2 Overview of the MySQL Database Management System}

\subsection*{1.2.1 What is MySQL?}

MySQL, the most popular Open Source SQL database management system, is developed, distributed, and supported by Oracle Corporation.

The MySQL website (http://www.mysql.com/) provides the latest information about MySQL software.
- MySQL is a database management system.

A database is a structured collection of data. It may be anything from a simple shopping list to a picture gallery or the vast amounts of information in a corporate network. To add, access, and process data stored in a computer database, you need a database management system such as MySQL Server. Since computers are very good at handling large amounts of data, database management systems play a central role in computing, as standalone utilities, or as parts of other applications.

\section*{- MySQL databases are relational.}

A relational database stores data in separate tables rather than putting all the data in one big storeroom. The database structures are organized into physical files optimized for speed. The logical model, with objects such as databases, tables, views, rows, and columns, offers a flexible programming environment. You set up rules governing the relationships between different data fields, such as one-to-one, one-to-many, unique, required or optional, and "pointers" between different tables. The database enforces these rules, so that with a well-designed database, your application never sees inconsistent, duplicate, orphan, out-of-date, or missing data.

The SQL part of "MySQL" stands for "Structured Query Language". SQL is the most common standardized language used to access databases. Depending on your programming environment, you might enter SQL directly (for example, to generate reports), embed SQL statements into code written in another language, or use a language-specific API that hides the SQL syntax.

SQL is defined by the ANSI/ISO SQL Standard. The SQL standard has been evolving since 1986 and several versions exist. In this manual, "SQL-92" refers to the standard released in 1992, "SQL:1999" refers to the standard released in 1999, and "SQL:2003" refers to the current version of the standard. We use the phrase "the SQL standard" to mean the current version of the SQL Standard at any time.

\section*{- MySQL software is Open Source.}

Open Source means that it is possible for anyone to use and modify the software. Anybody can download the MySQL software from the Internet and use it without paying anything. If you wish, you may study the source code and change it to suit your needs. The MySQL software uses the GPL (GNU General Public License), http://www.fsf.org/licenses/, to define what you may and may not do with the software in different situations. If you feel uncomfortable with the GPL or need to embed MySQL code into a commercial application, you can buy a commercially licensed version from us. See the MySQL Licensing Overview for more information (http://www.mysql.com/company/legal/ licensing/).
- The MySQL Database Server is very fast, reliable, scalable, and easy to use.

If that is what you are looking for, you should give it a try. MySQL Server can run comfortably on a desktop or laptop, alongside your other applications, web servers, and so on, requiring little or no attention. If you dedicate an entire machine to MySQL, you can adjust the settings to take advantage of all the memory, CPU power, and I/O capacity available. MySQL can also scale up to clusters of machines, networked together.

MySQL Server was originally developed to handle large databases much faster than existing solutions and has been successfully used in highly demanding production environments for several years. Although under constant development, MySQL Server today offers a rich and useful set of functions. Its connectivity, speed, and security make MySQL Server highly suited for accessing databases on the Internet.
- MySQL Server works in client/server or embedded systems.

The MySQL Database Software is a client/server system that consists of a multithreaded SQL server that supports different back ends, several different client programs and libraries, administrative tools, and a wide range of application programming interfaces (APIs).

We also provide MySQL Server as an embedded multithreaded library that you can link into your application to get a smaller, faster, easier-to-manage standalone product.
- A large amount of contributed MySQL software is available.

MySQL Server has a practical set of features developed in close cooperation with our users. It is very likely that your favorite application or language supports the MySQL Database Server.

\section*{- MySQL HeatWave.}

MySQL HeatWave is a fully managed database service, powered by the MySQL HeatWave inmemory query accelerator. It is the only cloud service that combines transactions, real-time analytics across data warehouses and data lakes, and machine learning in one MySQL Database; without the complexity, latency, risks, and cost of ETL duplication. It is available on OCI, AWS, and Azure. Learn more at: https://www.oracle.com/mysql/.

The official way to pronounce "MySQL" is "My Ess Que Ell" (not "my sequel"), but we do not mind if you pronounce it as "my sequel" or in some other localized way.

\subsection*{1.2.2 The Main Features of MySQL}

This section describes some of the important characteristics of the MySQL Database Software. In most respects, the roadmap applies to all versions of MySQL. For information about features as they are introduced into MySQL on a series-specific basis, see the "In a Nutshell" section of the appropriate Manual:
- MySQL 8.4: Section 1.4, "What Is New in MySQL 8.4 since MySQL 8.0"
- MySQL 8.0: What Is New in MySQL 8.0
- MySQL 5.7: What Is New in MySQL 5.7

\section*{Internals and Portability}
- Written in C and C++.
- Tested with a broad range of different compilers.
- Works on many different platforms. See https://www.mysql.com/support/supportedplatforms/ database.html.
- For portability, configured using CMake.
- Tested with Purify (a commercial memory leakage detector) as well as with Valgrind, a GPL tool (https://valgrind.org/).
- Uses multi-layered server design with independent modules.
- Designed to be fully multithreaded using kernel threads, to easily use multiple CPUs if they are available.
- Provides transactional and nontransactional storage engines.
- Uses very fast B-tree disk tables (MyISAM) with index compression.
- Designed to make it relatively easy to add other storage engines. This is useful if you want to provide an SQL interface for an in-house database.
- Uses a very fast thread-based memory allocation system.
- Executes very fast joins using an optimized nested-loop join.
- Implements in-memory hash tables, which are used as temporary tables.
- Implements SQL functions using a highly optimized class library that should be as fast as possible. Usually there is no memory allocation at all after query initialization.
- Provides the server as a separate program for use in a client/server networked environment.

\section*{Data Types}
- Many data types: signed/unsigned integers $1,2,3,4$, and 8 bytes long, FLOAT, DOUBLE, CHAR, VARCHAR, BINARY, VARBINARY, TEXT, BLOB, DATE, TIME, DATETIME, TIMESTAMP, YEAR, SET, ENUM, and OpenGIS spatial types. See Chapter 13, Data Types.
- Fixed-length and variable-length string types.

\section*{Statements and Functions}
- Full operator and function support in the SELECT list and WHERE clause of queries. For example:
```
mysql> SELECT CONCAT(first_name, ' ', last_name)
    -> FROM citizen
    -> WHERE income/dependents > 10000 AND age > 30;
```

- Full support for SQL GROUP BY and ORDER BY clauses. Support for group functions (COUNT(), AVG(), STD(), SUM(), MAX( ), MIN( ), and GROUP_CONCAT( )).
- Support for LEFT OUTER JOIN and RIGHT OUTER JOIN with both standard SQL and ODBC syntax.
- Support for aliases on tables and columns as required by standard SQL.
- Support for DELETE, INSERT, REPLACE, and UPDATE to return the number of rows that were changed (affected), or to return the number of rows matched instead by setting a flag when connecting to the server.
- Support for MySQL-specific SHOW statements that retrieve information about databases, storage engines, tables, and indexes. Support for the INFORMATION_SCHEMA database, implemented according to standard SQL.
- An EXPLAIN statement to show how the optimizer resolves a query.
- Independence of function names from table or column names. For example, ABS is a valid column name. The only restriction is that for a function call, no spaces are permitted between the function name and the "(" that follows it. See Section 11.3, "Keywords and Reserved Words".
- You can refer to tables from different databases in the same statement.

\section*{Security}
- A privilege and password system that is very flexible and secure, and that enables host-based verification.
- Password security by encryption of all password traffic when you connect to a server.

\section*{Scalability and Limits}
- Support for large databases. We use MySQL Server with databases that contain 50 million records. We also know of users who use MySQL Server with 200,000 tables and about 5,000,000,000 rows.
- Support for up to 64 indexes per table. Each index may consist of 1 to 16 columns or parts of columns. The maximum index width for InnoDB tables is either 767 bytes or 3072 bytes. See Section 17.21, "InnoDB Limits". The maximum index width for MyISAM tables is 1000 bytes. See Section 18.2, "The MyISAM Storage Engine". An index may use a prefix of a column for CHAR, VARCHAR, BLOB, or TEXT column types.

\section*{Connectivity}
- Clients can connect to MySQL Server using several protocols:
- Clients can connect using TCP/IP sockets on any platform.
- On Windows systems, clients can connect using named pipes if the server is started with the named_pipe system variable enabled. Windows servers also support shared-memory connections if started with the shared_memory system variable enabled. Clients can connect through shared memory by using the --protocol=memory option.
- On Unix systems, clients can connect using Unix domain socket files.
- MySQL client programs can be written in many languages. A client library written in C is available for clients written in C or C++, or for any language that provides C bindings.
- APIs for C, C++, Eiffel, Java, Perl, PHP, Python, Ruby, and Tcl are available, enabling MySQL clients to be written in many languages. See Chapter 31, Connectors and APIs.
- The Connector/ODBC (MyODBC) interface provides MySQL support for client programs that use ODBC (Open Database Connectivity) connections. For example, you can use MS Access to connect to your MySQL server. Clients can be run on Windows or Unix. Connector/ODBC source is available. All ODBC 2.5 functions are supported, as are many others. See MySQL Connector/ODBC Developer Guide.
- The Connector/J interface provides MySQL support for Java client programs that use JDBC connections. Clients can be run on Windows or Unix. Connector/J source is available. See MySQL Connector/J Developer Guide.
- MySQL Connector/NET enables developers to easily create .NET applications that require secure, high-performance data connectivity with MySQL. It implements the required ADO.NET interfaces and
integrates into ADO.NET aware tools. Developers can build applications using their choice of .NET languages. MySQL Connector/NET is a fully managed ADO.NET driver written in 100\% pure C\#. See MySQL Connector/NET Developer Guide.

\section*{Localization}
- The server can provide error messages to clients in many languages. See Section 12.12 , "Setting the Error Message Language".
- Full support for several different character sets, including latin1 (cp1252), german, big5, ujis, several Unicode character sets, and more. For example, the Scandinavian characters "å", "ä" and "ö" are permitted in table and column names.
- All data is saved in the chosen character set.
- Sorting and comparisons are done according to the default character set and collation. It is possible to change this when the MySQL server is started (see Section 12.3.2, "Server Character Set and Collation"). To see an example of very advanced sorting, look at the Czech sorting code. MySQL Server supports many different character sets that can be specified at compile time and runtime.
- The server time zone can be changed dynamically, and individual clients can specify their own time zone. See Section 7.1.15, "MySQL Server Time Zone Support".

\section*{Clients and Tools}
- MySQL includes several client and utility programs. These include both command-line programs such as mysqldump and mysqladmin, and graphical programs such as MySQL Workbench.
- MySQL Server has built-in support for SQL statements to check, optimize, and repair tables. These statements are available from the command line through the mysqlcheck client. MySQL also includes myisamchk, a very fast command-line utility for performing these operations on MyISAM tables. See Chapter 6, MySQL Programs.
- MySQL programs can be invoked with the --help or - ? option to obtain online assistance.

\subsection*{1.2.3 History of MySQL}

We started out with the intention of using the mSQL database system to connect to our tables using our own fast low-level (ISAM) routines. However, after some testing, we came to the conclusion that mSQL was not fast enough or flexible enough for our needs. This resulted in a new SQL interface to our database but with almost the same API interface as mSQL. This API was designed to enable third-party code that was written for use with mSQL to be ported easily for use with MySQL.

MySQL is named after co-founder Monty Widenius's daughter, My.
The name of the MySQL Dolphin (our logo) is "Sakila," which was chosen from a huge list of names suggested by users in our "Name the Dolphin" contest. The winning name was submitted by Ambrose Twebaze, an Open Source software developer from Eswatini (formerly Swaziland), Africa. According to Ambrose, the feminine name Sakila has its roots in SiSwati, the local language of Eswatini. Sakila is also the name of a town in Arusha, Tanzania, near Ambrose's country of origin, Uganda.

\subsection*{1.3 MySQL Releases: Innovation and LTS}

The MySQL release model is divided into two main tracks: LTS (Long-Term Support) and Innovation. All LTS and Innovation releases include bug and security fixes, and are considered production-grade quality.

\section*{MySQL LTS Releases}
- Audience: If your environment requires a stable set of features and a longer support period.
- Behavior: These releases only contain necessary fixes to reduce the risks associated with changes in the database software's behavior. There are no removals within an LTS release. Features can be removed (and added) only in the first LTS release (such as 8.4.0 LTS) but not later.
- Support: An LTS series follows the Oracle Lifetime Support Policy, which includes 5 years of premier support and 3 years of extended support.

\section*{MySQL Innovation Releases}
- Audience: If you want access to the latest features, improvements, and changes. These releases are ideal for developers and DBAs working in fast-paced development environments with high levels of automated tests and modern continuous integration techniques for faster upgrade cycles.
- Behavior: Apart from new features in innovation releases, behavior changes are also expected as code is refactored, deprecated functionality is removed, and when MySQL is modified to behave more in line with SQL Standards. This will not happen within an LTS release.

Behavior changes can have a big impact, especially when dealing with anything application-related, such as SQL syntax, new reserved words, query execution, and query performance. Behavior changes might require application changes which can involve considerable effort to migrate. We intend to provide the necessary tools and configuration settings to make these transitions easier.
- Support: Innovation releases are supported until the next Innovation release.

\section*{MySQL Portfolio}

MySQL Server and MySQL NDB Cluster have both Innovation and LTS releases.
MySQL Connectors, MySQL Shell, MySQL Router, MySQL Operator for Kubernetes, have one release using the latest version number but remain compatible with all supported MySQL Server versions. For example, MySQL Connector/Python 9.7.0 is compatible with supported MySQL Server 8.0, 8.4, and 9.x releases.

When a major version line advances (for example, 10.x), these products will follow the new major version while continuing to support the then-current Innovation and LTS releases of MySQL Server and MySQL NDB Cluster.

\section*{Installing, Upgrading, and Downgrading}

Having two tracks affects how MySQL is installed, upgraded, and downgraded. Typically you choose one particular track and all upgrades progress accordingly.

When using the official MySQL repository, the desired track is defined in the repository configuration. For example, with Yum choose mysql-innovation-community to install and upgrade Innovation releases or mysql-8.4-lts-community to install and upgrade MySQL 8.4.x releases.

\section*{LTS Notes}

Functionality remains the same and data format does not change in an LTS series, therefore in-place upgrades and downgrades are possible within the LTS series. For example, MySQL 8.4.0 can be upgraded to a later MySQL 8.4.x release. Additional upgrade and downgrade methods are available, such as the clone plugin.

Upgrading to the next LTS series is supported, such as 8.4.x LTS to 9.7.x LTS, while skipping an LTS series is not supported. For example, 8.4.x LTS can't skip 9.7.x LTS to directly upgrade to 10.7.x LTS.

\section*{Innovation Notes}

An Innovation installation follows similar behavior in that an Innovation release upgrades to a more recent Innovation series release. For example, MySQL 9.0.0 Innovation would upgrade to MySQL 9.3.0.

The main difference is that you cannot directly upgrade between an Innovation series of different major versions, such as 8.3.0 to 9.0.0. Instead, first upgrade to the nearest LTS series and then upgrade to the following Innovation series. For example, upgrading 8.3.0 to 8.4.0, and then 8.4.0 to 9.0.0, is a valid upgrade path.

To help make the transition easier, the official MySQL repository treats the first LTS release as both LTS and Innovation, so for example with the Innovation track enabled in your local repository configuration, MySQL 8.3.0 upgrades to 8.4.0, and later to 9.0.0.

Innovation release downgrades require a logical dump and load.

\section*{Additional Information and Examples}

For additional information and specific example supported scenarios, see Section 3.2, "Upgrade Paths" or Chapter 4, Downgrading MySQL. They describe available options to perform in-place updates (that replace binaries with the latest packages), a logical dump and load (such as using mysqldump or MySQL Shell's dump utilities), cloning data with the clone plugin, and asynchronous replication for servers in a replication topology.

\subsection*{1.4 What Is New in MySQL 8.4 since MySQL 8.0}

This section summarizes what has been added to, deprecated in, changed, and removed from MySQL 8.4 since MySQL 8.0. A companion section lists MySQL server options and variables that have been added, deprecated, or removed in MySQL 8.4; see Section 1.5, "Server and Status Variables and Options Added, Deprecated, or Removed in MySQL 8.4 since 8.0".
- Features Added or Changed in MySQL 8.4
- Features Deprecated in MySQL 8.4
- Features Removed in MySQL 8.4

\section*{Features Added or Changed in MySQL 8.4}

The following features have been added to MySQL 8.4:
- MySQL native password authentication changes. Beginning with MySQL 8.4.0, the deprecated mysql_native_password authentication plugin is no longer enabled by default. To enable it, start the server with --mysql-native-password=ON (added in MySQL 8.4.0), or by including mysql_native_password=0N in the [mysqld] section of your MySQL configuration file (added in MySQL 8.4.0).

For more information about enabling, using, and disabling mysql_native_password, see Section 8.4.1.1, "Native Pluggable Authentication".
- InnoDB system variable default value changes. The default values for a number of server system variables relating to the InnoDB storage engine were changed in MySQL 8.4.0, as shown in the following table:

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 1.1 InnoDB system variable default values in MySQL 8.4 differing from MySQL 8.0}
\begin{tabular}{|l|l|l|}
\hline InnoDB System Variable Name & New Default Value (MySQL 8.4) & Previous Default Value (MySQL 8.0) \\
\hline innodb & DOFFFFie MADD/O DONTDUMPGis Súpported, otherwise ON & ON \\
\hline innodb & bfuffieqdpolodf fiestacęssize $<=1 \mathrm{GiB}$, then innodb_buffer_pool_instances=1 & 8 (or 1 if innodb_buffer_pool_size < 1 GiB) \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline InnoDB System Variable Name & New Default Value (MySQL 8.4) & Previous Default Value (MySQL 8.0) \\
\hline & \begin{tabular}{l}
If innodb_buffer_pool_size > 1 GiB , then this is the minimum value from the following two calculated hints in the range of 1-64: \\
- Buffer pool hint: Calculated as $1 / 2$ of (innodb_buffer_pool_size / innodb_buffer_pool_chunk_size) \\
- CPU hint: Calculated as $1 / 4$ of the number of available logical processors
\end{tabular} & \\
\hline innodb & aræmege_buffering & all \\
\hline - -innodbdedicat server & If ON, the value of innodb_flush_method is no longer changed as in MySQL 8.0, but the calculation of innodb_redo_log_capacity is changed from memory-based to CPU-based. For more information, see Section 17.8.12, "Enabling Automatic InnoDB Configuration for a Dedicated MySQL Server". (The actual default value of this variable is 0FF; this is unchanged from MySQL 8.0.) & OFF \\
\hline innodb & adæptive_hash_index & ON \\
\hline innodb & @ublewrite_files & innodb_buffer_pool_instances *2 \\
\hline innodb & då\&blewrite_pages & innodb_write_io_threads, which meant a default of 4 \\
\hline innodb on Linux & fol Distremœtt iftsdpported, otherwise fsync & fsync \\
\hline innodb & 110000pacity & 200 \\
\hline innodb & 20*这apadlitýomaæpacity & 2 * innodb_io_capacity, with a minimum default value of 2000 \\
\hline innodb & 167208864 (64.7MiB & 16777216 (16 MiB) \\
\hline innodb & roNna_interleave & 0FF \\
\hline innodb & piagrædtbl_twarfefies_pool_instances & 4 \\
\hline innodb & rvaiable logiealoprobessots / 8, with a minimum default value of 4 & 4 \\
\hline innodb & pluif avaitabte togical processors is <= 16, otherwise 4 & 4 \\
\hline innodb & ravadable legicalaprocessors / 2, with a minimum default value of 4 & 4 \\
\hline innodb & wse_fdatasync & OFF \\
\hline temptab & 3\%nofotalamemory, with a default value within a range of $1-4 \mathrm{GiB}$ & 1073741824 ( 1 GiB ) \\
\hline temptab & De, which meaps OFF & 1073741824 ( 1 GiB ) \\
\hline & temptabㄱ $\mathbf{\alpha F F u s e \_ m m a p}$ (Deprecated & ON \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|}
\hline InnoDB System Variable Name & New Default Value (MySQL 8.4) & Previous Default Value (MySQL 8.0) \\
\hline in MySQL 8.0.26) & & \\
\hline
\end{tabular}
- Clone plugin. The clone plugin versioning requirement was relaxed to allow cloning between different point releases in the same series. In other words, only the major and minor version numbers must match when previously the point release number also had to match.

For example, clone functionality now permits cloning 8.4.0 to 8.4.14 and vice-versa.
- SASL-based LDAP authentication on Windows. On Microsoft Windows, the server plugin for SASL-based LDAP authentication is now supported. This means that Windows clients can now use GSSAPI/Kerberos for authenticating with the authentication_ldap_sasl_client plugin.

For more information, see SASL-Based LDAP Authentication (Without Proxying).
- MySQL Replication: SOURCE_RETRY_COUNT change. The default value for the SOURCE_RETRY_COUNT option of the CHANGE REPLICATION SOURCE TO statement was changed to 10. This means that, using the default values for this option and for SOURCE_CONNECT_RETRY (60), the replica waits 60 seconds between reconnection attempts, and keeps attempting to reconnect at this rate for 10 minutes before timing out and failing over.

This change also applies to the default value of the deprecated - -master-retry-count server option. (You should use SOURCE_RETRY_COUNT, instead.)

For more information, see Section 19.4.9.1, "Asynchronous Connection Failover for Sources".
- MySQL Replication: tagged GTIDs. The format of global transaction identifiers (GIDs) used in MySQL Replication and Group Replication has been extended to enable identification of groups of transactions, making it possible to assign a unique name to the GTIDs which belong to a specific group of transactions. For example, transactions containing data operations can easily be distinguished from those arising from administrative operations simply by comparing their GTIDs.

The new GTID format is UUID: TAG: NUMBER, where TAG is a string of up to 8 characters, which is enabled by setting the value of the gtid_next system variable to AUTOMATIC: TAG, added in this release (see the description of the variable for tag format and other information). This tag persists for all transactions originating in the current session (unless changed using SET gtid_next), and is applied at commit time for such transactions, or, when using Group Replication, at certification time. It is also possible to set gtid_next to UUID: TAG: NUMBER to set the UUID of a single transaction to an arbitrary value, along with assigning it a custom tag. The assignments of UUID and NUMBER are otherwise unchanged from previous MySQL releases. In either case, the user is responsible for making sure that the tag is unique to a given replication topology.

The original UUID: NUMBER format for GTIDs continues to be supported unchanged, as implemented in previous versions of MySQL; changes to existing replication setups using GTIDs are not required.

Setting gtid_next to AUTOMATIC : TAG or UUID: TAG: NUMBER requires a new
TRANSACTION_GTID_TAG privilege which is added in this release; this is true both on the originating server as well as for the PRIVILEGE_CHECKS_APPLIER for the replica applier thread. This also means that an administrator can now restrict the use of SET @gtid_next=AUTOMATIC : TAG or

UUID: TAG: NUMBER to a desired set of MySQL users or roles so that that only those users related to a given data or operational domain can commit new transactions with assigned tags.

\section*{Note}

When upgrading from a previous version of MySQL to MySQL 8.4, any user accounts or roles which already have the BINLOG_ADMIN privilege are automatically granted the TRANSACTION_GTID_TAG privilege.

The built-in functions GTID_SUBSET( ), GTID_SUBTRACT( ), and WAIT_FOR_EXECUTED_GTID_SET( ) are compatible with tagged GTIDs.

For more information, see the descriptions of the gtid_next system variable and the TRANSACTION_GTID_TAG privilege, as well as Section 19.1.4, "Changing GTID Mode on Online Servers".
- Replication: SQL_AFTER_GTIDS and MTA. The START REPLICA statement option SQL_AFTER_GTIDS is now compatible with the multi-threaded applier. (Previously, when MTA was enabled and the user attempted to use this option, the statement raised the warning ER_MTA_FEATURE_IS_NOT_SUPPORTED, and the replica was switched to single-threaded mode.) This means that a replica which needs to catch up with missing transactions can now do so without losing the performance advantage from multithreading.

For more information, see Section 15.4.2.4, "START REPLICA Statement", as well as the documentation for the replica_parallel_workers system variable. See also Section 19.2.3.2, "Monitoring Replication Applier Worker Threads", and Section 25.7.11, "NDB Cluster Replication Using the Multithreaded Applier".
- Replication terminology backwards compatibility. This release adds the - - output - as version option for mysqldump. This option allows you to create a dump from a MySQL 8.2 or newer server that is compatible with older versions of MySQL; its value, one of those listed here, determines the compatibility of replication terminology used in the dump:
- SERVER: Gets the version of the server and uses the latest versions of replication statements and variable names compatible with that MySQL version.
- BEFORE_8_2_0: Output is compatible with MySQL servers running versions 8.0.23 through 8.1.0, inclusive.
- BEFORE_8_0_23: Output is compatible with MySQL servers running versions prior to 8.0.23.

See the description of this option for more information.
In addition a new value is added to those already allowed for the terminology_use_previous system variable. BEFORE_8_2_0 causes the server to print DISABLE ON SLAVE (now deprecated) instead of DISABLE ON REPLICA in the output of SHOW CREATE EVENT. The existing value BEFORE_8_0_26 now also has this effect in addition to those it already had previously.
- The MySQL version number used in version-specific comments supports a major version consisting of one or two digits; this means that the entire version can be either five or six digits long. For more information about how this change affects handling of versioned comments in MySQL, see Section 11.7, "Comments".
- group_replication_set_as_primary() and DDL statements. The group_replication_set_as_primary() function waits for ongoing DDL statements such as ALTER TABLE when waiting for all transactions to complete, prior to electing a new primary.

For more information, see the description of this function.
- DDL and DCL statement tracking for group_replication_set_as_primary().
group_replication_set_as_primary( ) now waits for the following statements to complete before a new primary is elected:
- ALTER DATABASE
- ALTER FUNCTION
- ALTER INSTANCE
- ALTER PROCEDURE
- ALTER SERVER
- ALTER TABLESPACE
- ALTER USER
- ALTER VIEW
- CREATE DATABASE
- CREATE FUNCTION
- CREATE PROCEDURE
- CREATE ROLE
- CREATE SERVER
- CREATE SPATIAL REFERENCE SYSTEM
- CREATE TABLESPACE
- CREATE TRIGGER
- CREATE USER
- CREATE VIEW
- DROP DATABASE
- DROP FUNCTION
- DROP PROCEDURE
- DROP ROLE
- DROP SERVER
- DROP SPATIAL REFERENCE SYSTEM
- DROP TABLESPACE
- DROP TRIGGER
- DROP USER
- DROP VIEW
- GRANT
- RENAME TABLE
- REVOKE

These are in addition to those statements added in MySQL 8.1 or otherwise already supported in this regard. For more information, including a listing of all such statements supported in MySQL 8.3, see the description of the group_replication_set_as_primary( ) function.
- Group Replication version compatibility. Version compatibility for servers within groups has been extended as follows:

In-place downgrades of servers within groups are supported within the MySQL 8.4 LTS series. For example, a member of a group running MySQL 8.4.2 can be downgraded to MySQL 8.4.0.

Similarly, cross-version group membership is also supported within the 8.4 release series. For example, a server running MySQL 8.4.0 can join a group all of whose members currently run MySQL 8.4.2, as can a server running MySQL 8.4.3.
- Group Replication variable defaults. The default values of two server system variables relating to Group Replication have been changed in MySQL 8.4:
- The default value of the group_replication_consistency system variable was changed to BEFORE_ON_PRIMARY_FAILOVER in MySQL 8.4.0. (Previously, it was EVENTUAL.)
- The default value of the group_replication_exit_state_action system variable was changed to OFFLINE_MODE in MySQL 8.4.0. (Previously, it was READ_ONLY.)

For more information, see Section 20.5.3.2, "Configuring Transaction Consistency Guarantees", and Section 20.7.7, "Responses to Failure Detection and Network Partitioning", as well as the descriptions of the variables listed.
- Added a number of status variables specific to the Group Replication plugin that improve diagnosis and troubleshooting of network instabilities, providing statistics about network usage, control messages, and data messages for each group member.

See Section 20.9.2, "Group Replication Status Variables", for more information.
As part of this work, a new MEMBER_FAILURE_SUSPICIONS_COUNT column was added to the Performance Schema replication_group_communication_information table. The contents of this column are formatted as a JSON array whose keys are group members ID and whose values are the number of times the group member has been considered suspect. See the description of this table for more information.
- FLUSH_PRIVILEGES privilege. A new privilege is added in MySQL 8.4 .0 specifically to allow use of FLUSH PRIVILEGES statements. Unlike the RELOAD privilege, the FLUSH_PRIVILEGES privilege applies only to FLUSH PRIVILEGES statements.

In MySQL 8.4, the RELOAD privilege continues to be supported in this capacity to provide backwards compatibility.

When upgrading, a check is performed to see whether there are any users having the FLUSH_PRIVILEGES privilege; if there are none, any users having the RELOAD privilege are automatically assigned the new privilege as well.

If you downgrade from MySQL 8.4 (or later) to a version of MySQL which does not support the FLUSH_PRIVILEGES privilege, a user previously granted this privilege is unable to execute FLUSH PRIVILEGES statements unless the user has the RELOAD privilege.
- OPTIMIZE_LOCAL_TABLE privilege. MySQL 8.4.0 adds a new OPTIMIZE_LOCAL_TABLE privilege. Users must have this privilege to execute OPTIMIZE LOCAL TABLE and OPTIMIZE NO_WRITE_TO_BINLOG TABLE statements.

When upgrading from a previous release series, users having the SYSTEM_USER privilege are automatically granted the OPTIMIZE_LOCAL_TABLE privilege.
- MySQL Enterprise Data Masking and De-Identification. Data-masking components added support for specifying a dedicated schema to store the related internal table and masking functions. Previously, the mysql system schema provided the only storage option. The new component_masking.masking_database read-only variable enables setting and persisting an alternative schema name at server startup.
- Flushing of data masking dictionaries. The MySQL Enterprise Data Masking and DeIdentification component now includes the ability to flush the data on the secondary or replica into memory. This can be done in either of the ways described here:
- A flush can be performed by the user at any time using the masking_dictionaries_flush() function added in this release.
- The component can be configured to flush the memory periodically, leveraging the Scheduler component, by setting the new component_masking.dictionaries_flush_interval_seconds system variable to an appropriate value.

For more information, see Section 8.5, "MySQL Enterprise Data Masking and De-Identification", and the descriptions of these items.
- Automatic histogram updates. MySQL 8.4 .0 adds support for automatic updates of histograms. When this feature is enabled for a given histogram, it is updated whenever ANALYZE TABLE is run on the table to which it belongs. In addition, automatic recalculation of persistent statistics by InnoDB (see Section 17.8.10.1, "Configuring Persistent Optimizer Statistics Parameters") also updates the histogram. Histogram updates continue to use the same number of buckets as they were originally specified with, if any.

You can enable this feature when specifying the histogram by including the AUTO UPDATE option for the ANALYZE TABLE statement. To disable it, include MANUAL UPDATE instead. MANUAL UPDATE (no automatic updates) is the default if neither option is specified.

For more information, see Histogram Statistics Analysis.
- Added the tls-certificates-enforced-validation system variable, which permits a DBA to enforce certificate validation at server startup or when using the ALTER INSTANCE RELOAD TLS statement to reload certificates at runtime. With enforcement enabled, discovering an invalid certificate halts server invocation at startup, prevents loading invalid certificates at runtime, and emits warnings. For more information, see Configuring Certificate Validation Enforcement.
- Added server system variables to control the amount of time MySQL accounts that connect to a MySQL server using LDAP pluggable authentication must wait when the LDAP server is down or unresponsive. The default timeout became 30 seconds for the following simple and SASL-based LDAP authentication variables:
- authentication_ldap_simple_connect_timeout
- authentication_ldap_simple_response_timeout
- authentication_ldap_sasl_connect_timeout
- authentication_ldap_sasl_response_timeout

Connection and response timeouts are configurable through the system variables on Linux platforms only. For more information, see Setting Timeouts for LDAP Pluggable Authentication.
- Logging of the shutdown process was enhanced, with the addition of startup and shutdown messages for the MySQL server, plugins, and components. Such messages are now also logged for closing connections. These additions should facilitate troubleshooting and debugging problems, particularly in the event that the server takes an excessively long time to shut down.

For more information, see Section 7.4.2, "The Error Log".
- Additions to server startup and shutdown messages. Added the following types of messages to the server startup and shutdown processes as noted in this list:
- Start and end messages for server initialization when the server is started with --initialize or --initialize-insecure; these are in addition to and distinct from those shown during normal server startup and shutdown.
- Start and end messages for InnoDB initialization.
- Start and end messages for init file execution during server initialization.
- Start and end messages for for execution of compiled-in statements during server initialization.
- Start and end mesages for crash recovery during server startup (if crash recovery occurs).
- Start and end messages for initialization of dynamic plugins during server startup.
- Start and end messages for compoenents initialization step (apparent during server startup).
- Messages for shutdown of replica threads, as well as graceful and forceful shutdown of connection threads, during server shutdown.
- Start and end messages for shutdown of plugins and components during server shutdown.
- Exit code (return value) information with shutdown messages during initialization or server shutdown and end)

In addition, if the server was built using WITH_SYSTEMD, the server now includes every systemd message in the error log.
- Added the SHOW PARSE_TREE statement, which shows the JSON-formatted parse tree for a SELECT statement. This statement is intended for testing and development use only, and not in production. It is available only in debug builds, or if MySQL was built from source using the CMake DWITH_SHOW_PARSE_TREE option, and is not included or supported in release builds.
- Thread pool plugin connection information. Added thread pool connection information to the MySQL Performance Schema, as follows:
- Added a tp_connections table, with information about each thread pool connection.
- Added the following columns to the tp_thread_state table: TIME_OF_ATTACH, MARKED_STALLED, STATE, EVENT_COUNT, ACCUMULATED_EVENT_TIME, EXEC_COUNT, and ACCUMULATED_EXEC_TIME
- Added the following columns to the tp_thread_group_state table: EFFECTIVE_MAX_TRANSACTIONS_LIMIT, NUM_QUERY_THREADS, TIME_OF_LAST_THREAD_CREATION, NUM_CONNECT_HANDLER_THREAD_IN_SLEEP, THREADS_BOUND_TO_TRANSACTION, QUERY_THREADS_COUNT, and TIME_OF_EARLIEST_CON_EXPIRE.

For more information, see Section 7.6.3, "MySQL Enterprise Thread Pool", and Section 29.12.16, "Performance Schema Thread Pool Tables".
- Information Schema PROCESSLIST table usage. Although the INFORMATION_SCHEMA.PROCESSLIST table was deprecated in MySQL 8.0.35 and 8.2.0, interest remains in tracking its usage. This release adds two system status variables providing information about accesses to the PROCESSLIST table, listed here:
- Deprecated_use_i_s_processlist_count provides a count of the number of references to the PROCESSLIST table in queries since the server was last started.
- Deprecated_use_i_s_processlist_last_timestamp stores the time the PROCESSLIST table was last accessed. This is a timestamp value (number of microseconds since the Unix Epoch).
- Hash table optimization for set operations. MySQL 8.2 improves performance of statements using the set operations EXCEPT and INTERSECT by means of a new hash table optimization which is enabled automatically for such statements, and controlled by setting the hash_set_operations optimizer switch; to disable this optimization and cause the optimizer to used the old temporary table optimization from previous versions of MySQL, set this flag to off.

The amount of memory allocated for this optimization can be controlled by setting the value of the set_operations_buffer_size server system variable; increasing the buffer size can further improve execution times of some statements using these operations.

See Section 10.9.2, "Switchable Optimizations", for more information.
- WITH_LD CMake option. WITH_LD: Define whether to use the Ilvm Ild or mold linker, otherwise use the standard linker. WITH_LD also replaces the USE_LD_LLD CMake option that was removed in MySQL 8.3.0.
- MySQL Enterprise Firewall enhancements. A number of enhancements were made since MySQL 8.0 to MySQL Enterprise Firewall. These are listed here:
- Stored procedures provided by MySQL Enterprise Firewall now behave in transactional fashion. When an error occurs during execution of a firewall stored procedure, an error is reported, and all changes made by the stored procedure up to that point in time are rolled back.
- Firewall stored procedures now avoid performing unnecessary combinations of DELETE plus INSERT statements, as well as those of INSERT IGNORE plus UPDATE operations, thus consuming less time and fewer resources, making them faster and more efficient.
- User-based stored procedures and UDFs, deprecated in MySQL 8.0.26, now raise a deprecation warning. Specifically calling either of sp_set_firewall_mode( ) or sp_reload_firewall_rules() generates such a warning. See Firewall Account Profile Stored Procedures, as well as Migrating Account Profiles to Group Profiles, for more information.
- MySQL Enterprise Firewall now permits its memory cache to be reloaded periodically with data stored in the firewall tables. The mysql_firewall_reload_interval_seconds system variable sets the periodic-reload schedule to use at runtime or it disables reloads by default. Previous implementations reloaded the cache only at server startup or when the server-side plugin was reinstalled.
- Added the mysql_firewall_database server system variable to enable storing internal tables, functions, and stored procedures in a custom schema.
- Added the uninstall_firewall.sql script to simplify removing an installed firewall.

For more information about firewall stored procedures, see MySQL Enterprise Firewall Stored Procedures.
- Pluggable authentication. Added support for authentication to MySQL Server using devices such as smart cards, security keys, and biometric readers in a WebAuthn context. The new WebAuthn authentication method is based on the FIDO and FIDO2 standards. It uses a pair of plugins, authentication_webauthn on the server side and authentication_webauthn_client on the client side. The server-side WebAuthn authentication plugin is included only in MySQL Enterprise Edition distributions.
- Keyring migration. Migration from a keyring component to a keyring plugin is supported. To perform such a migration, use the --keyring-migration-from-component server option introduced in MySQL 8.4.0, setting --keyring-migration-source to the name of the source component, and --keyring-migration-destination the name of the target plugin.

See Key Migration Using a Migration Server, for more information.
- MySQL Enterprise Audit. Added the audit_log_filter_uninstall. sql script to simplify removing MySQL Enterprise Audit.
- New Keywords. Keywords added in MySQL 8.4 since MySQL 8.0. Reserved keywords are marked with (R).

AUTO, BERNOULLI, GTIDS, LOG, MANUAL (R), PARALLEL (R), PARSE_TREE, QUALIFY (R), S3, and TABLESAMPLE (R).
- Preemptive group replication certification garbage collection. A system variable added in MySQL 8.4 .0 group_replication_preemptive_garbage_collection enables preemptive garbage collection for group replication running in single-primary mode, keeping only the write sets for those transactions that have not yet been committed. This can save time and memory consumption. An additional system variable group_replication_preemptive_garbage_collection_rows_threshold (also introduced in MySQL 8.4.0) sets a lower limit on the number of certification rows needed to trigger preemptive garbage collection if it is enabled; the default is 100000.

In multi-primary mode, each write set in the certification information is required from the moment a transaction is certified until it is committed on all members, which makes it necessary to detect conflicts between transactions. In single-primary mode, where we need be concerned only about transaction dependencies, this is not an issue; this means write sets need be kept only until certification is complete.

It is not possible to change the group replication mode between single-primary and multi-primary when group_replication_preemptive_garbage_collection is enabled.

See Section 20.7.9, "Monitoring Group Replication Memory Usage with Performance Schema Memory Instrumentation", for help with obtaining information about memory consumed by this process.
- Sanitized relay log recovery. In MySQL 8.4 .0 and later, it is possible to recover the relay log with any incomplete transactions removed. The relay log is now sanitized when the server is started with --relay-log-recovery=OFF (the default), meaning that all of the following items are removed:
- Transactions which remain uncompleted at the end of the relay log
- Relay log files containing incomplete transactions or parts thereof only
- References in the relay log index file to relay log files which have thus been removed

For more information, see the description of the relay_log_recovery server system variable.
- MySQL upgrade history file. As part of the installation process in MySQL 8.4.0 and later, a file in JSON format named mysql_upgrade_history is created in the server's data directory, or updated if it already exists. This file includes information about the MySQL server version installed, when it was installed, and whether the release was part of an LTS series or an Innovation series.

A typical mysql_upgrade_history file might look something like this (formatting adjusted for readability):
```
{
    "file_format":"1",
    "upgrade_history":
    [
        {
            "date":"2024-03-15 22:02:35",
            "version":"8.4.0",
            "maturity":"LTS",
            "initialize":true
        },
        {
            "date":"2024-05-17 17:46:12",
            "version":"8.4.1",
            "maturity":"LTS",
            "initialize":false
        }
    ]
}
```


In addition, the installation process now checks for the presence of a mysql_upgrade_info file (deprecated in MySQL 8.0, and is no longer used). If found, the file is removed.
- mysql client --system-command option. The --system-command option for the mysql client, available in MySQL 8.4.3 and later, enables or disables the system command.

This option is enabled by default. To disable it, use --system-command=0FF or --skip-systemcommand, which causes the system command to be rejected with an error.
- mysql client --commands option. The mysql client --commands option, introduced in MySQL 8.4.6, enables or disables most mysql client commands.

This option is enabled by default. To disable it, start the mysql client with --commands=0FF or --skip-commands.

For more information, see Section 6.5.1.1, "mysql Client Options".
- Scalar correlated subqueries to derived tables. MySQL 8.4.0 lifts a previous restriction on transforming a correlated scalar subquery to a derived table such that an operand of the equality expression which did not contain an outer reference could be a simple column reference only.

This means that inner columns can be contained in deterministic expressions, as shown here:
```
func1(.., funcN(.., inner-column-a, ..), inner-column-b) = outside-expression
inner-column-a + inner-column-b = outside-expression
```


For example, the following query is now supported for optimization:
```
SELECT * FROM t1
    WHERE ( SELECT func(t2.a) FROM t2
        WHERE func(t2.a) = t1.a ) > 0;
```


The inner operand cannot contain outer column references; likewise, the outer operand cannot contain inner column references. In addition, the inner operand cannot contain a subquery.

If the transformed subquery has explicit grouping, functional dependency analysis may be excessively pessimistic, resulting in an error such as ERROR 1055 (42000): Expression \#2 of SELECT list is not in GROUP BY clause and contains nonaggregated
column . . . . For the InnoDB storage engine, the transform is disabled by default (that is, the subquery_to_derived flag of the optimizer_switch variable is not enabled); in this case, such queries pass without raising any errors, but are also not transformed.

See Section 15.2.15.7, "Correlated Subqueries", for more information.

\section*{Features Deprecated in MySQL 8.4}

The following features are deprecated in MySQL 8.4 and may be removed in a future series. Where alternatives are shown, applications should be updated to use them.

For applications that use features deprecated in MySQL 8.4 that have been removed in a later MySQL version, statements may fail when replicated from a MySQL 8.4 source to a replica running a later version, or may have different effects on source and replica. To avoid such problems, applications that use features deprecated in 8.4 should be revised to avoid them and use alternatives when possible.
- group_replication_allow_local_lower_version_join system variable. The group_replication_allow_local_lower_version_join system variable is deprecated, and setting it causes a warning (ER_WARN_DEPRECATED_SYNTAX_NO_REPLACEMENT) to be logged.

You should expect this variable to be removed in a future version of MySQL. Since the functionality enabled by setting group_replication_allow_local_lower_version_join is no longer useful, no replacement for it is planned.
- Group Replication recovery metadata. Group Replication recovery no longer depends on writing of view change events to the binary log to mark changes in group membership; instead, when all members of a group are MySQL version 8.3.0 or later, members share compressed recovery metadata, and no such event is logged (or assigned a GTID) when a new member joins the group.

Recovery metadata includes the GCS view ID, GTID_SET of certified transactions, and certification information, as well as a list of online members.

Since View_change_log_event no longer plays a role in recovery, the group_replication_view_change_uuid system variable is no longer needed, and so is now deprecated; expect its removal in a future MySQL release. You should be aware that no replacement or alternative for this variable or its functionality is planned, and develop your applications accordingly.
- WAIT_UNTIL_SQL_THREAD_AFTER_GTIDS() function. The WAIT_UNTIL_SQL_THREAD_AFTER_GTIDS( ) SQL function was deprecated in MySQL 8.0, and is no longer supported as of MySQL 8.2. Attempting to invoke this function now causes a syntax error.

Instead of WAIT_UNTIL_SQL_THREAD_AFTER_GTIDS( ), it is recommended that you use WAIT_FOR_EXECUTED_GTID_SET( ), which allows you to wait for specific GTIDS. This works regardless of the replication channel or the user client through which the specified transactions arrive on the server.
- GTID-based replication and IGNORE_SERVER_IDS. When global transaction identifiers (GTIDs) are used for replication, transactions that have already been applied are automatically ignored. This means that IGNORE_SERVER_IDS is not compatible with GTID mode. If gtid_mode is ON, CHANGE REPLICATION SOURCE TO with a non-empty IGNORE_SERVER_IDS list is rejected with an error. Likewise, if any existing replication channel was created with a list of server IDs to be ignored, SET gtid_mode=ON is also rejected. Before starting GTID-based replication, check for and clear any ignored server ID lists on the servers involved; you can do this by checking the output from SHOW REPLICA STATUS. In such cases, you can clear the list by issuing CHANGE REPLICATION SOURCE TO with an empty list of server IDs, as shown here:

CHANGE REPLICATION SOURCE TO IGNORE_SERVER_IDS = ();
See Section 19.1.3.7, "Restrictions on Replication with GTIDs", for more information.
- Binary log transaction dependency tracking and logging format. Using writeset information for conflict detection has been found to cause issues with dependency tracking; for this reason, we now limit the usage of writesets for conflict checks to when row-based logging is in effect.

This means that, in such cases, binlog_format must be ROW, and MIXED is no longer supported.
- expire_logs_days system variable. The expire_logs_days server system variable, deprecated in MySQL 8.0, has been removed. Attempting to get or set this variable at runtime, or to start mysqld with the equivalent option (--expire-logs-days), now results in an error.

In place of expire_logs_days, use binlog_expire_logs_seconds, which allows you to specify expiration periods other than (only) in an integral number of days.
- Wildcard characters in database grants. The use of the characters $\%$ and _ as wildcards in database grants was deprecated in MySQL 8.2.0. You should expect for the wildcard functionality to removed in a future MySQL release and for these characters always to be treated as literals, as they are already whenever the value of the partial_revokes server system variable is ON.

In addition, the treatment of \% by the server as a synonym for localhost when checking privileges is now also deprecated as of MySQL 8.2.0 and thus subject to removal in a future version of MySQL.
- --character-set-client-handshake option. The --character-set-client-handshake server option, originally intended for use with upgrades from very old versions of MySQL, is now deprecated and a warning is issued whenever it is used. You should expect this option to be removed in a future version of MySQL; applications depending on this option should begin migration away from it as soon as possible.
- Nonstandard foreign keys. The use of non-unique or partial keys as foreign keys is nonstandard, and is deprecated in MySQL. Beginning with MySQL 8.4.0, you must explicitly enable such keys by setting restrict_fk_on_non_standard_key to OFF, or by starting the server with --skip-restrict-fk-on-non-standard-key.
restrict_fk_on_non_standard_key is ON by default, which means that trying to use a nonstandard key as a foreign key in a CREATE TABLE or other SQL statement is rejected with ER_WARN_DEPRECATED_NON_STANDARD_KEY. Setting it to ON allows such statements to run, but they raise the same error as a warning.

Upgrades from MySQL 8.0 are supported even if there are tables containing foreign keys referring to non-unique or partial keys. In such cases, the server writes a list of warning messages containing the names of any foreign keys which refer to nonstandard keys.

\section*{Features Removed in MySQL 8.4}

The following items are obsolete and have been removed in MySQL 8.4. Where alternatives are shown, applications should be updated to use them.

For MySQL 8.3 applications that use features removed in MySQL 8.4, statements may fail when replicated from a MySQL 8.3 source to a MySQL 8.4 replica, or may have different effects on source and replica. To avoid such problems, applications that use features removed in MySQL 8.4 should be revised to avoid them and use alternatives when possible.
- Server options and variables removed. A number of server options and variables supported in previous versions of MySQL have been removed in MySQL 8.4. Attempting to set any of them in MySQL 8.4 raises an error. These options and variables are listed here:
- binlog_transaction_dependency_tracking: Deprecated in MySQL 8.0.35 and MySQL 8.2.0. There are no plans to replace this variable or its functionality, which has been made internal to the server. In MySQL 8.4 (and later), when multithreaded replicas are in use, the source mysqld uses always writesets to generate dependency information for the binary log; this has the same effect as setting binlog_transaction_dependency_tracking to WRITESET in previous versions of MySQL.
- group_replication_recovery_complete_at: Deprecated in MySQL 8.0.34. In MySQL 8.4 and later, the policy applied during the distributed recovery process is always to mark a new member online only after it has received, certified, and applied all transactions that took place before it joined the group; this is equivalent to setting group_replication_recovery_complete_at to TRANSACTIONS_APPLIED in previous versions of MySQL.
- avoid_temporal_upgrade and show_old_temporals: Both of these variables were deprecated in MySQL 5.6; neither of them had any effect in recent versions of MySQL. Both variables have been removed; there are no plans to replace either of them.
- - - no - dd - upgrade: Deprecated in MySQL 8.0.16, now removed. Use - - upgrade=NONE instead.
- - - old and --new: Both deprecated in MySQL 8.0.35 and MySQL 8.2.0, and now removed.
- --language: Deprecated in MySQL 5.5, and now removed.
- The --ssl and --admin-ssl server options, as well as the have_ssl and have_openssl server system variables, were deprecated in MySQL 8.0.26. They are all removed in this release. Use --tls-version and --admin-tls-version instead.
- The default_authentication_plugin system variable, deprecated in MySQL 8.0.27, is removed as of MySQL 8.4.0. Use authentication_policy instead.

As part of the removal of default_authentication_plugin, the syntax for authentication_policy has been changed. See the description of authentication_policy for more information.
- --skip-host-cache server option. This option has been removed; start the server with - -host-cache-size=0 instead. See Section 7.1.12.3, "DNS Lookups and the Host Cache".
- --innodb and --skip-innodb server options. These options have been removed. The InnoDB storage engine is always enabled, and it is not possible to disable it.
- --character-set-client-handshake and --old-style-user-limits server options. These options were formerly used for compatibility with very old versions of MySQL which are no longer supported or maintained, and thus no longer serve any useful purpose.
- FLUSH HOSTS statement. The FLUSH HOSTS statement, deprecated in MySQL 8.0.23, has been removed. To clear the host cache, issue TRUNCATE TABLE performance_schema.host_cache or mysqladmin flush-hosts.
- Obsolete replication options and variables. A number of options and variables relating to MySQL Replication were deprecated in previous versions of MySQL, and have been removed from MySQL 8.4. Attempting to use any of these now causes the server to raise a syntax error. These options and variables are listed here:
- --slave-rows-search-algorithms: The algorithm used by the replication applier to look up table rows when applying updates or deletes is now always HASH_SCAN, INDEX_SCAN, and is no longer configurable by the user.
- log_bin_use_v1_events: This allowed source servers running MySQL 5.7 and newer to replicate to earlier versions of MySQL which are no longer supported or maintained.
- --relay-log-info-file, --relay-log-info-repository, --master-info-file, --master-info-repository: The use of files for the applier metadata repository and the connection metadata repository has been superseded by crash-safe tables, and is no longer supported. See Section 19.2.4.2, "Replication Metadata Repositories".
- transaction_write_set_extraction
- group_replication_ip_whitelist: Use group_replication_ip_allowlist instead.
- group_replication_primary_member: No longer needed; check the MEMBER_ROLE column of the Performance Schema replication_group_members table instead.
- Replication SQL syntax. A number of SQL statements used in MySQL Replication which were deprecated in earlier versions of MySQL are no longer supported in MySQL 8.4. Attempting to use any of these statements now produces a syntax error. These statements can be divided into two groups those relating to source servers, and those referring to replicas, as shown here:

As part of this work, the DISABLE ON SLAVE option for CREATE EVENT and ALTER EVENT is now deprecated, and is superseded by DISABLE ON REPLICA. The corresponding term

SLAVESIDE_DISABLED is also now deprecated,and no longer used in event descriptions such as in the Information Schema EVENTS table; REPLICA_SIDE_DISABLED is now shown instead.
- Statements which have been removed, which relate to replication source servers, are listed here:
- CHANGE MASTER TO: Use CHANGE REPLICATION SOURCE TO.
- RESET MASTER: Use RESET BINARY LOGS AND GTIDS.
- SHOW MASTER STATUS: Use SHOW BINARY LOG STATUS.
- PURGE MASTER LOGS: Use PURGE BINARY LOGS.
- SHOW MASTER LOGS: Use SHOW BINARY LOGS.
- Removed SQL statements relating to replicas are listed here:
- START SLAVE: Use START REPLICA.
- STOP SLAVE: Use STOP REPLICA.
- SHOW SLAVE STATUS: Use SHOW REPLICA STATUS.
- SHOW SLAVE HOSTS: Use SHOW REPLICAS.
- RESET SLAVE: Use RESET REPLICA.

All of the statements listed previously were removed from MySQL test programs and files, as well as from any other internal use.

In addition, a number of deprecated options formerly supported by CHANGE REPLICATION SOURCE TO and START REPLICA have been removed and are no longer accepted by the server. The removed options for each of these SQL statements are listed next.
- Options removed from CHANGE REPLICATION SOURCE TO are listed here:
- MASTER_AUTO_POSITION: Use SOURCE_AUTO_POSITION.
- MASTER_HOST: Use SOURCE_HOST.
- MASTER_BIND: Use SOURCE_BIND.
- MASTER_UseR: Use SOURCE_UseR.
- MASTER_PASSWORD: Use SOURCE_PASSWORD.
- MASTER_PORT: Use SOURCE_PORT.
- MASTER_CONNECT_RETRY: Use SOURCE_CONNECT_RETRY.
- MASTER_RETRY_COUNT: Use SOURCE_RETRY_COUNT.
- MASTER_DELAY: Use SOURCE_DELAY.
- MASTER_SSL: Use SOURCE_SSL.
- MASTER_SSL_CA: Use SOURCE_SSL_CA.
- MASTER_SSL_CAPATH: Use SOURCE_SSL_CAPATH.
- MASTER_SSL_CIPHER: Use SOURCE_SSL_CIPHER.
- MASTER_SSL_CRL: Use SOURCE_SSL_CRL.
- MASTER_SSL_CRLPATH: Use SOURCE_SSL_CRLPATH.
- MASTER_SSL_KEY: Use SOURCE_SSL_KEY.
- MASTER_SSL_VERIFY_SERVER_CERT: Use SOURCE_SSL_VERIFY_SERVER_CERT.
- MASTER_TLS_VERSION: Use SOURCE_TLS_VERSION.
- MASTER_TLS_CIPHERSUITES: Use SOURCE_TLS_CIPHERSUITES.
- MASTER_SSL_CERT: Use SOURCE_SSL_CERT.
- MASTER_PUBLIC_KEY_PATH: Use SOURCE_PUBLIC_KEY_PATH.
- GET_MASTER_PUBLIC_KEY: Use GET_SOURCE_PUBLIC_KEY.
- MASTER_HEARTBEAT_PERIOD: Use SOURCE_HEARTBEAT_PERIOD.
- MASTER_COMPRESSION_ALGORITHMS: Use SOURCE_COMPRESSION_ALGORITHMS.
- MASTER_ZSTD_COMPRESSION_LEVEL: Use SOURCE_ZSTD_COMPRESSION_LEVEL.
- MASTER_LOG_FILE: Use SOURCE_LOG_FILE.
- MASTER_LOG_POS: Use SOURCE_LOG_POS.
- Options removed from the START REPLICA statement are listed here:
- MASTER_LOG_FILE: Use SOURCE_LOG_FILE.
- MASTER_LOG_POS: Use SOURCE_LOG_POS.
- System variables and NULL. It is not intended or supported for a MySQL server startup option to be set to NULL (--my-option=NULL) and have it interpreted by the server as SQL NULL, and should not be possible. MySQL 8.1 (and later) specifically disallows setting startup options to NULL in this fashion, and rejects an attempt to do with an error. Attempts to set the corresponding server system variables to NULL using SET or similar in the mysql client are also rejected.

The server system variables in the following list are excepted from the restriction just described:
- admin_ssl_ca
- admin_ssl_capath
- admin_ssl_cert
- admin_ssl_cipher
- admin_tls_ciphersuites
- admin_ssl_key
- admin_ssl_crl
- admin_ssl_crlpath
- basedir
- character_sets_dir
- ft_stopword_file
- group_replication_recovery_tls_ciphersuites
- init_file
- lc_messages_dir
- plugin_dir
- relay_log
- relay_log_info_file
- replica_load_tmpdir
- ssl_ca
- ssl_capath
- ssl_cert
- ssl_cipher
- ssl_crl
- ssl_crlpath
- ssl_key
- socket
- tls_ciphersuites
- tmpdir

See also Section 7.1.8, "Server System Variables".
- Identifiers with an initial dollar sign. The use of the dollar sign (\$) as the initial character of an unquoted identifier was deprecated in MySQL 8.0, and is restricted in MySQL 8.1 and later;
using an unquoted identifier beginning with a dollar sign and containing one or more dollar signs (in addition to the first one) now generates a syntax error.

Unquoted identifiers starting with \$ are not affected by this restriction if they do not contain any additional \$ characters.

See Section 11.2, "Schema Object Names".
Also as part of this work, the following server status variables, previously deprecated, have been removed. They are listed here, along with their replacements:
- Com_slave_start: Use Com_replica_start.
- Com_slave_stop: Use Com_replica_stop.
- Com_show_slave_status: Use Com_show_replica_status.
- Com_show_slave_hosts: Use Com_show_replicas.
- Com_show_master_status: Use Com_show_binary_log_status.
- Com_change_master: Use Com_change_replication_source.

The variables just listed as removed no longer appear in the output of statements such as SHOW STATUS. See also Com_xxx Variables.
- Plugins. A number of plugins were removed in MySQL 8.4.0, and are listed here, along with any system variables and other features associated with them which were also removed or otherwise affected by the plugin removal:
- authentication_fido and authentication_fido_client plugins: Use the authentication_webauthn plugin instead. See Section 8.4.1.11, "WebAuthn Pluggable Authentication".

The authentication_fido_rp_id server system variable, mysql client - - fido-registerfactor option, and the -DWITH_FIDO CMake option were also removed.
- keyring_file plugin: Use the component_keyring_file component instead. See Section 8.4.4.4, "Using the component_keyring_file File-Based Keyring Component".

The keyring_file_data system variable was also removed. In addition, the CMake options DINSTALL_MYSQLKEYRINGDIR and -DWITH_KEYRING_TEST were removed.
- keyring_encrypted_file plugin: Use the component_keyring_encrypted_file component instead. See Section 8.4.4.5, "Using the component_keyring_encrypted_file Encrypted File-Based Keyring Component".

The keyring_encrypted_file_data and keyring_encrypted_file_password system variables were also removed.
- keyring_oci plugin: Use the component_keyring_oci component instead. See Section 8.4.4.9, "Using the Oracle Cloud Infrastructure Vault Keyring Component".

The following server system variables were also removed: keyring_oci_ca_certificate, keyring_oci_compartment, keyring_oci_encryption_endpoint, keyring_oci_key_file, keyring_oci_key_fingerprint, keyring_oci_management_endpoint, keyring_oci_master_key,
keyring_oci_secrets_endpoint, keyring_oci_tenancy, keyring_oci_user, keyring_oci_vaults_endpoint, and keyring_oci_virtual_vault.
- openssl_udf plugin: Use the MySQL Enterprise Encryption (component_enterprise_encryption) component instead; see Section 8.6, "MySQL Enterprise Encryption".
- Support for weak ciphers. When configuring encrypted connections, MySQL 8.4.0 and later no longer allow specifying any cipher that does not meet the following requirements:
- Conforms to proper TLS version (TLS v1.2 or TLSv1.3, as appropriate)
- Provides perfect forward secrecy
- Uses SHA2 in cipher, certificate, or both
- Uses AES in GCM or any other AEAD algorithms or modes

This has implications for setting the following system variables:
- ssl_cipher
- admin_ssl_cipher
- tls_ciphersuites
- admin_tls_ciphersuites

See the descriptions of these variables for their permitted values in MySQL 8.4, and more information.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0059.jpg?height=127&width=97&top_left_y=1466&top_left_x=406)

Note
libmysqlclient continues to support additional ciphers that do not satisfy these conditions in order to retain the ability to connect to older versions of MySQL.
- INFORMATION_SCHEMA.TABLESPACES. The INFORMATION_SCHEMA. TABLESPACES table, which was not actually used, was deprecated in MySQL 8.0.22 and has now been removed.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0059.jpg?height=124&width=99&top_left_y=1836&top_left_x=404)

\section*{Note}

For NDB tables, the Information Schema FILES table provides tablespacerelated information.

For InnoDB tables, the Information Schema INNODB_TABLESPACES and INNODB_DATAFILES tables provide tablespace metadata.
- DROP TABLESPACE and ALTER TABLESPACE: ENGINE clause. The ENGINE clause for DROP TABLESPACE and ALTER TABLESPACE statements was deprecated in MySQL 8.0. In MySQL 8.4, it is no longer supported, and causes an error if you attempt to use it with DROP TABLESPACE or ALTER TABLESPACE . . . DROP DATAFILE. ENGINE is also no longer supported for all other variants of ALTER TABLESPACE, with the two exceptions listed here:
- ALTER TABLESPACE ... ADD DATAFILE ENGINE=\{NDB|NDBCLUSTER\}
- ALTER UNDO TABLESPACE ... SET \{ACTIVE|INACTIVE\} ENGINE=INNODB

For more information, see the documentation for these statements.
- LOW_PRIORITY with LOCK TABLES ... WRITE. The LOW_PRIORITY clause of the LOCK TABLES . . . WRITE statement had had no effect since MySQL 5.5, and was deprecated in MySQL 5.6. It is no longer supported in MySQL 8.4; including it in LOCK TABLES now causes a syntax error.
- EXPLAIN FORMAT=JSON format versioning. It is now possible to choose between 2 versions of the JSON output format used by EXPLAIN FORMAT=JSON statements using the explain_json_format_version server system variable introduced in this release. Setting this variable to 1 causes the server to use Version 1, which is the linear format which was always used for output from such statements in MySQL 8.2 and earlier. This is the default value and format in MySQL 8.4. Setting explain_json_format_version to 2 causes the Version 2 format to be used; this JSON output format is based on access paths, and is intended to provide better compatibility with future versions of the MySQL Optimizer.

See Obtaining Execution Plan Information, for more information and examples.
- Capturing EXPLAIN FORMAT=JSON output. EXPLAIN FORMAT=JSON was extended with an INTO option, which provides the ability to store JSON-formatted EXPLAIN output in a user variable where it can be worked with using MySQL JSON functions, like this:
```
mysql> EXPLAIN FORMAT=JSON INTO @myex SELECT name FROM a WHERE id = 2;
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT JSON_EXTRACT(@myex, "$.query_block.table.key");
+--------------------------------------------------
| JSON_EXTRACT(@myex, "$.query_block.table.key") |
+---------------------------------------------------
| "PRIMARY"
+----------------------------------------------------
1 row in set (0.01 sec)
```


This option can be used only if the EXPLAIN statement also contains FORMAT=JSON; otherwise, a syntax error results. This requirement is not affected by the value of explain_format.

INTO can be used with any explainable statement with the exception of EXPLAIN FOR CONNECTION. It cannot be used with EXPLAIN ANALYZE.

For more information and examples, see Obtaining Execution Plan Information.
- EXPLAIN FOR SCHEMA. Added a FOR SCHEMA option to the EXPLAIN statement. The syntax is as shown here, where stmt is an explainable statement:

EXPLAIN [options] FOR SCHEMA schema_name stmt
This causes stmt to be run as if in the named schema.
FOR DATABASE is also supported as a synonym.
This option is not compatible with FOR CONNECTION.
See Obtaining Execution Plan Information, for more information.
- Client comments preserved. In MySQL 8.0, the stripping of comments from the mysql client was the default behavior; the default was changed to preserve such comments.

To enable the stripping of comments as was performed in MySQL 8.0 and earlier, start the mysql client with--skip-comments.
- AUTO_INCREMENT and floating-point columns. The use of the AUTO_INCREMENT modifier with FLOAT and DOUBLE columns in CREATE TABLE and ALTER TABLE statements was
deprecated in MySQL 8.0; support for it is removed altogether in MySQL 8.4, where it raises ER_WRONG_FIELD_SPEC (Incorrect column specifier for column).

Before upgrading to MySQL 8.4 from a previous series, you must fix any table that contains a FLOAT or DOUBLE column with AUTO_INCREMENT so that the table no longer uses either of these. Otherwise, the upgrade fails .
- mysql_ssl_rsa_setup utility. The mysql_ssl_rsa_setup utility, deprecated in MySQL 8.0.34, has been removed. For MySQL distributions compiled using OpenSSL, the MySQL server can perform automatic generation of missing SSL and RSA files at startup. See Section 8.3.3.1, "Creating SSL and RSA Certificates and Keys using MySQL", for more information.
- MySQL Privileges. Added the SET_ANY_DEFINER privilege for definer object creation and the ALLOW_NONEXISTENT_DEFINER privilege for orphan object protection. Together these privileges coexist with the deprecated SET_USER_ID privilege.
- SET_USER_ID privilege. The SET_USER_ID privilege, deprecated in MySQL 8.2.0, has been removed. use in GRANT statements now causes a syntax error

Instead of SET_USER_ID, you can use the SET_ANY_DEFINER privilege for definer object creation, and the ALLOW_NONEXISTENT_DEFINER privileges for orphan object protection.

Both privileges are required to produce orphaned SQL objects using CREATE PROCEDURE, CREATE FUNCTION, CREATE TRIGGER, CREATE EVENT, or CREATE VIEW.
- --abort-slave-event-count and --disconnect-slave-event-count server options. The MySQL server startup options--abort-slave-event-count and--disconnect-slave-eventcount, formerly used in testing, were deprecated in MySQL 8.0, and have been removed in this release. Attempting to start mysqld with either of these options now results in an error.
- mysql_upgrade utility. The mysql_upgrade utility, deprecated in MySQL 8.0.16, has been removed.
- mysqlpump utility. The mysqlpump utility along with its helper utilities lz4_decompress and zlib_decompress, deprecated in MySQL 8.0.34, were removed. Instead, use mysqldump or MySQL Shell's dump utilities.
- Obsolete CMake options. The following options for compiling the server with CMake were obsolete and have been removed:
- USE_LD_LLD: Use WITH_LD=lld instead.
- WITH_BOOST, DOWNLOAD_BOOST, DOWNLOAD_BOOST_TIMEOUT: These options are no longer necessary; MySQL now includes and uses a bundled version of Boost when compiling from source.
- Removed Keywords. Keywords removed in MySQL 8.4 since MySQL 8.0. Reserved keywords are marked with (R).

GET_MASTER_PUBLIC_KEY, MASTER_AUTO_POSITION, MASTER_BIND (R), MASTER_COMPRESSION_ALGORITHMS, MASTER_CONNECT_RETRY, MASTER_DELAY, MASTER_HEARTBEAT_PERIOD, MASTER_HOST, MASTER_LOG_FILE, MASTER_LOG_POS, MASTER_PASSWORD, MASTER_PORT, MASTER_PUBLIC_KEY_PATH, MASTER_RETRY_COUNT, MASTER_SSL, MASTER_SSL_CA, MASTER_SSL_CAPATH, MASTER_SSL_CERT, MASTER_SSL_CIPHER, MASTER_SSL_CRL, MASTER_SSL_CRLPATH, MASTER_SSL_KEY, MASTER_SSL_VERIFY_SERVER_CERT (R), MASTER_TLS_CIPHERSUITES, MASTER_TLS_VERSION, MASTER_USER, and MASTER_ZSTD_COMPRESSION_LEVEL.
- Index prefixes in partitioning key. Columns with index prefixes were allowed in the partitioning key for a partitioned table in MySQL 8.0, and raised a warning with no other effects when creating, altering, or upgrading a partitioned table. Such columns are no longer permitted in partitioned tables,
and using any such columns in the partitioning key causes the CREATE TABLE or ALTER TABLE statement in they occur to be rejected with an error.

For more information, see Column index prefixes not supported for key partitioning.

\subsection*{1.5 Server and Status Variables and Options Added, Deprecated, or Removed in MySQL 8.4 since 8.0}
- Options and Variables Introduced in MySQL 8.4
- Options and Variables Deprecated in MySQL 8.4
- Options and Variables Removed in MySQL 8.4

This section lists server variables, status variables, and options that were added for the first time, have been deprecated, or have been removed in MySQL 8.4 since 8.0.

\section*{Options and Variables Introduced in MySQL 8.4}

The following system variables, status variables, and server options have been added in MySQL 8.4.
- Audit_log_direct_writes: Number of direct writes to the audit log file. Added in MySQL 8.1.0.
- Com_show_binary_log_status: Count of SHOW BINARY LOG STATUS statements; use instead of Com_show_master_status. Added in MySQL 8.2.0.
- Deprecated_use_i_s_processlist_count: Number of times Information Schema processlist table has been accessed. Added in MySQL 8.3.0.
- Deprecated_use_i_s_processlist_last_timestamp: Time of most recent access to Information Schema processlist table (timestamp). Added in MySQL 8.3.0.
- Gr_all_consensus_proposals_count: Sum of all proposals that were initiated and terminated in this node. Added in MySQL 8.1.0.
- Gr_all_consensus_time_sum: The sum of elapsed time of all consensus rounds started and finished in this node. Togheter with count_all_consensus_proposals, we can identify if the individual consensus time has a trend of going up, thus signaling a possible problem. Added in MySQL 8.1.0.
- Gr_certification_garbage_collector_count: Number of times certification garbage collection did run. Added in MySQL 8.1.0.
- Gr_certification_garbage_collector_time_sum: Sum of the time in micro-seconds that certification garbage collection runs took. Added in MySQL 8.1.0.
- Gr_consensus_bytes_received_sum: The sum of all socket-level bytes that were received to from group nodes having as a destination this node. Added in MySQL 8.1.0.
- Gr_consensus_bytes_sent_sum: Sum of all socket-level bytes that were sent to all group nodes originating on this node. Socket-level bytes mean that we will report more data here than in the sent messages, because they are multiplexed and sent to each member. As an example, if we have a group with 3 members and we send a 100 bytes message, this value will account for 300 bytes, since we send 100 bytes to each node. Added in MySQL 8.1.0.
- Gr_control_messages_sent_bytes_sum: Sum of bytes of control messages sent by this member. The size is the on-the-wire size. Added in MySQL 8.1.0.
- Gr_control_messages_sent_count: Number of control messages sent by this member. Added in MySQL 8.1.0.
- Gr_control_messages_sent_roundtrip_time_sum: Sum of the roundtrip time in microseconds of control messages sent by this member. The time is measured between the send and the delivery of the message on the sender member. This time will measure the time between the
send and the delivery of the message on the majority of the members of the group (that includes the sender). Added in MySQL 8.1.0.
- Gr_data_messages_sent_bytes_sum: Sum of bytes of data messages sent by this member. The size is the on-the-wire size. Added in MySQL 8.1.0.
- Gr_data_messages_sent_count: Number of data messages sent by this member. Counts the number of transaction data messages sent. Added in MySQL 8.1.0.
- Gr_data_messages_sent_roundtrip_time_sum: Sum of the roundtrip time in micro-seconds of data messages sent by this member. The time is measured between the send and the delivery of the message on the sender member. This time will measure the time between the send and the delivery of the message on the majority of the members of the group (that includes the sender). Added in MySQL 8.1.0.
- Gr_empty_consensus_proposals_count: Sum of all empty proposal rounds that were initiated and terminated in this node. Added in MySQL 8.1.0.
- Gr_extended_consensus_count: The number of full 3-Phase PAXOS that this node initiated. If this number grows, it means that at least of the node is having issues answering to Proposals, either by slowliness or network issues. Use togheter with count_member_failure_suspicions to try and do some diagnose. Added in MySQL 8.1.0.
- Gr_last_consensus_end_timestamp: The time in which our last consensus proposal was approved. Reported in a timestamp format. This is an indicator if the group is halted or making slow progress. Added in MySQL 8.1.0.
- Gr_total_messages_sent_count: The number of high-level messages that this node sent to the group. These messages are the ones the we receive via the API to be proposed to the group. XCom has a batching mechanism, that will gather these messages and propose them all togheter. This will acocunt the number of message before being batched. Added in MySQL 8.1.0.
- Gr_transactions_consistency_after_sync_count: Number of transactions on secondaries that waited to start, while waiting for transactions from the primary with group_replication_consistency= AFTER and BEFORE_AND_AFTER to be committed. Added in MySQL 8.1.0.
- Gr_transactions_consistency_after_sync_time_sum: Sum of the time in micro-seconds that transactions on secondaries waited to start, while waiting for transactions from the primary with group_replication_consistency= AFTER and BEFORE_AND_AFTER to be committed. Added in MySQL 8.1.0.
- Gr_transactions_consistency_after_termination_count: Number of transactions executed with group_replication_consistency=AFTER and BEFORE_AND_AFTER. Added in MySQL 8.1.0.
- Gr_transactions_consistency_after_termination_time_sum: Sum of the time in micro-seconds spent between the delivery of the transaction executed with group_replication_consistency=AFTER and BEFORE_AND_AFTER, and the acknowledge of the other group members that the transaction is prepared. It does not include the transaction send roundtrip time. Added in MySQL 8.1.0.
- Gr_transactions_consistency_before_begin_count: Number of transactions executed with group_replication_consistency= BEFORE and BEFORE_AND_AFTER. Added in MySQL 8.1.0.
- Gr_transactions_consistency_before_begin_time_sum: Sum of the time in microseconds that the member waited until its group_replication_applier channel was consumed before execute the transaction with group_replication_consistency= BEFORE and BEFORE_AND_AFTER. Added in MySQL 8.1.0.
- Performance_schema_meter_lost: Number of meter instruments that failed to be created. Added in MySQL 8.2.0.
- Performance_schema_metric_lost: Number of metric instruments that failed to be created. Added in MySQL 8.2.0.
- Telemetry_metrics_supported: Whether server telemetry metrics is supported. Added in MySQL 8.2.0.
- Tls_sni_server_name: Server name supplied by the client. Added in MySQL 8.1.0.
- authentication_ldap_sasl_connect_timeout: SASL-Based LDAP server connection timeout. Added in MySQL 8.1.0.
- authentication_ldap_sasl_response_timeout: Simple LDAP server response timeout. Added in MySQL 8.1.0.
- authentication_ldap_simple_connect_timeout: Simple LDAP server connection timeout. Added in MySQL 8.1.0.
- authentication_ldap_simple_response_timeout: Simple LDAP server response timeout. Added in MySQL 8.1.0.
- authentication_webauthn_rp_id: Relying party ID for multifactor authentication. Added in MySQL 8.2.0.
- check-table-functions: How to proceed when scanning data dictionary for functions used in table constraints and other expressions, and such a function causes an error. Use WARN to log warnings; ABORT (default) also logs warnings, and halts any upgrade in progress. Added in MySQL 8.4.5.
- component_masking.dictionaries_flush_interval_seconds: How long for scheduler to wait until attempting to schedule next execution, in seconds. Added in MySQL 8.3.0.
- component_masking.masking_database: Database to use for masking dictionaries. Added in MySQL 8.3.0.
- group_replication_preemptive_garbage_collection: Enable preemptive garbage collection in single-primary mode; no effect in multi-primary mode. Added in MySQL 8.4.0.
- group_replication_preemptive_garbage_collection_rows_threshold: Number of rows of certification information required to trigger preemptive garbage collection in single-primary mode when enabled by group_replication_preemptive_garbage_collection. Added in MySQL 8.4.0.
- keyring-migration-from-component: Keyring migration is from component to plugin. Added in MySQL 8.4.0.
- mysql-native-password: Enable mysql_native_password authentication plugin. Added in MySQL 8.4.0.
- mysql_firewall_database: Database from which MySQL Enterprise Firewall plugin sources its tables and stored procedures. Added in MySQL 8.2.0.
- mysql_firewall_reload_interval_seconds: Reload MySQL Enterprise Firewall plugin data at specified intervals. Added in MySQL 8.2.0.
- performance_schema_max_meter_classes: Maximum number of meter instruments which can be created. Added in MySQL 8.2.0.
- performance_schema_max_metric_classes: Maximum number of metric instruments which can be created. Added in MySQL 8.2.0.
- restrict_fk_on_non_standard_key: Disallow creation of foreign keys on non-unique or partial keys. Added in MySQL 8.4.0.
- set_operations_buffer_size: Amount of memory available for hashing of set operations. Added in MySQL 8.2.0.
- telemetry.live_sessions: Displays the current number of sessions instrumented with telemetry. Added in MySQL 8.1.0.
- telemetry.metrics_enabled: Controls whether telemetry metrics are collected or not. Added in MySQL 8.3.0.
- telemetry.metrics_reader_frequency_1: . Added in MySQL 8.3.0.
- telemetry.metrics_reader_frequency_2: . Added in MySQL 8.3.0.
- telemetry.metrics_reader_frequency_3: . Added in MySQL 8.3.0.
- telemetry.otel_bsp_max_export_batch_size: Maximum batch size. Added in MySQL 8.1.0.
- telemetry.otel_bsp_max_queue_size: Maximum queue size. Added in MySQL 8.1.0.
- telemetry.otel_bsp_schedule_delay: Delay interval between two consecutive exports in milliseconds. Added in MySQL 8.1.0.
- telemetry.otel_exporter_otlp_metrics_certificates: The trusted certificate to use when verifying a server's TLS credentials. Added in MySQL 8.3.0.
- telemetry.otel_exporter_otlp_metrics_cipher: TLS cipher to use for metrics (TLS 1.2). Added in MySQL 8.3.0.
- telemetry.otel_exporter_otlp_metrics_cipher_suite: TLS cipher to use for metrics (TLS 1.3). Added in MySQL 8.3.0.
- telemetry.otel_exporter_otlp_metrics_client_certificates: Client certificate/chain trust for clients private key in PEM format. Added in MySQL 8.3.0.
- telemetry.otel_exporter_otlp_metrics_client_key: Client's private key in PEM format. Added in MySQL 8.3.0.
- telemetry.otel_exporter_otlp_metrics_compression: Compression used by exporter. Added in MySQL 8.3.0.
- telemetry.otel_exporter_otlp_metrics_endpoint: Metrics endpoint URL. Added in MySQL 8.3.0.
- telemetry.otel_exporter_otlp_metrics_headers: Key-value pairs to be used as headers associated with HTTP requests. Added in MySQL 8.3.0.
- telemetry.otel_exporter_otlp_metrics_max_tls: Maximum TLS version to use for metrics. Added in MySQL 8.3.0.
- telemetry.otel_exporter_otlp_metrics_min_tls: Minimum TLS version to use for metrics. Added in MySQL 8.3.0.
- telemetry.otel_exporter_otlp_metrics_protocol: Specifies the OTLP transport protocol. Added in MySQL 8.3.0.
- telemetry.otel_exporter_otlp_metrics_timeout: Time OLTP exporter waits for each batch export. Added in MySQL 8.3.0.
- telemetry.otel_exporter_otlp_traces_certificates: The trusted certificate to use when verifying a server's TLS credentials.. Added in MySQL 8.1.0.
- telemetry.otel_exporter_otlp_traces_cipher: TLS cipher to use for traces (TLS 1.2). Added in MySQL 8.3.0.
- telemetry.otel_exporter_otlp_traces_cipher_suite: TLS cipher to use for traces (TLS 1.3). Added in MySQL 8.3.0.
- telemetry.otel_exporter_otlp_traces_client_certificates: Client certificate/chain trust for clients private key in PEM format.. Added in MySQL 8.1.0.
- telemetry.otel_exporter_otlp_traces_client_key: Client's private key in PEM format.. Added in MySQL 8.1.0.
- telemetry.otel_exporter_otlp_traces_compression: Compression used by exporter. Added in MySQL 8.1.0.
- telemetry.otel_exporter_otlp_traces_endpoint: Target URL to which the exporter sends traces. Added in MySQL 8.1.0.
- telemetry.otel_exporter_otlp_traces_headers: Key-value pairs to be used as headers associated with HTTP requests. Added in MySQL 8.1.0.
- telemetry.otel_exporter_otlp_traces_max_tls: Maximum TLS version to use for traces. Added in MySQL 8.3.0.
- telemetry.otel_exporter_otlp_traces_min_tls: Minimum TLS version to use for traces. Added in MySQL 8.3.0.
- telemetry.otel_exporter_otlp_traces_protocol: OTLP transport protocol. Added in MySQL 8.1.0.
- telemetry.otel_exporter_otlp_traces_timeout: Time OLTP exporter waits for each batch export. Added in MySQL 8.1.0.
- telemetry.otel_log_level: Controls which opentelemetry logs are printed in the server logs (Linux only). Added in MySQL 8.1.0.
- telemetry.otel_resource_attributes: See corresponding OpenTelemetry variable OTEL_RESOURCE_ATTRIBUTES.. Added in MySQL 8.1.0.
- telemetry.query_text_enabled: Controls whether the SQL query text is included in the trace (Linux only). Added in MySQL 8.1.0.
- telemetry.trace_enabled: Controls whether telemetry traces are collected or not (Linux only). Added in MySQL 8.1.0.
- thread_pool_longrun_trx_limit: When all threads using thread_pool_max_transactions_limit have been executing longer than this number of milliseconds, limit for group is suspended. Added in MySQL 8.4.0.
- tls_certificates_enforced_validation: Whether to validate server and CA certificates. Added in MySQL 8.1.0.

\section*{Options and Variables Deprecated in MySQL 8.4}

The following system variables, status variables, and options have been deprecated in MySQL 8.4.
- Com_show_master_status: Count of SHOW MASTER STATUS statements. Deprecated in MySQL 8.2.0.
- authentication_fido_rp_id: Relying party ID for FIDO multifactor authentication. Deprecated in MySQL 8.2.0.
- binlog_transaction_dependency_tracking: Source of dependency information (commit timestamps or transaction write sets) from which to assess which transactions can be executed in parallel by replica's multithreaded applier. Deprecated in MySQL 8.2.0.
- character-set-client-handshake: Do not ignore client side character set value sent during handshake. Deprecated in MySQL 8.2.0.
- group_replication_allow_local_lower_version_join: Allow current server to join group even if it has lower plugin version than group. Deprecated in MySQL 8.4.0.
- group_replication_view_change_uuid: UUID for view change event GTIDs. Deprecated in MySQL 8.3.0.
- mysql-native-password: Enable mysql_native_password authentication plugin. Deprecated in MySQL 8.4.0.
- new: Use very new, possibly 'unsafe' functions. Deprecated in MySQL 8.2.0.
- old: Cause server to revert to certain behaviors present in older versions. Deprecated in MySQL 8.2.0.
- performance_schema_show_processlist: Select SHOW PROCESSLIST implementation. Deprecated in MySQL 8.2.0.
- restrict_fk_on_non_standard_key: Disallow creation of foreign keys on non-unique or partial keys. Deprecated in MySQL 8.4.0.
- skip-character-set-client-handshake: Ignore client side character set value sent during handshake. Deprecated in MySQL 8.2.0.
- skip-new: Do not use new, possibly wrong routines. Deprecated in MySQL 8.2.0.

\section*{Options and Variables Removed in MySQL 8.4}

The following system variables, status variables, and options have been removed in MySQL 8.4.
- Com_change_master: Count of CHANGE REPLICATION SOURCE TO and CHANGE MASTER TO statements. Removed in MySQL 8.4.0.
- Com_show_master_status: Count of SHOW MASTER STATUS statements. Removed in MySQL 8.4.0.
- Com_show_slave_hosts: Count of SHOW REPLICAS and SHOW SLAVE HOSTS statements. Removed in MySQL 8.4.0.
- Com_show_slave_status: Count of SHOW REPLICA STATUS and SHOW SLAVE STATUS statements. Removed in MySQL 8.4.0.
- Com_slave_start: Count of START REPLICA and START SLAVE statements. Removed in MySQL 8.4.0.
- Com_slave_stop: Count of STOP REPLICA and STOP SLAVE statements. Removed in MySQL 8.4.0.
- Replica_rows_last_search_algorithm_used: Search algorithm most recently used by this replica to locate rows for row-based replication (index, table, or hash scan). Removed in MySQL 8.3.0.
- abort-slave-event-count: Option used by mysql-test for debugging and testing of replication. Removed in MySQL 8.2.0.
- admin-ssl: Enable connection encryption. Removed in MySQL 8.4.0.
- authentication_fido_rp_id: Relying party ID for FIDO multifactor authentication. Removed in MySQL 8.4.0.
- avoid_temporal_upgrade: Whether ALTER TABLE should upgrade pre-5.6.4 temporal columns. Removed in MySQL 8.4.0.
- binlog_transaction_dependency_tracking: Source of dependency information (commit timestamps or transaction write sets) from which to assess which transactions can be executed in parallel by replica's multithreaded applier. Removed in MySQL 8.4.0.
- character-set-client-handshake: Do not ignore client side character set value sent during handshake. Removed in MySQL 8.3.0.
- daemon_memcached_enable_binlog: . Removed in MySQL 8.3.0.
- daemon_memcached_engine_lib_name: Shared library implementing InnoDB memcached plugin. Removed in MySQL 8.3.0.
- daemon_memcached_engine_lib_path: Directory which contains shared library implementing InnoDB memcached plugin. Removed in MySQL 8.3.0.
- daemon_memcached_option: Space-separated options which are passed to underlying memcached daemon on startup. Removed in MySQL 8.3.0.
- daemon_memcached_r_batch_size: Specifies how many memcached read operations to perform before doing COMMIT to start new transaction. Removed in MySQL 8.3.0.
- daemon_memcached_w_batch_size: Specifies how many memcached write operations to perform before doing COMMIT to start new transaction. Removed in MySQL 8.3.0.
- default_authentication_plugin: Default authentication plugin. Removed in MySQL 8.4.0.
- disconnect-slave-event-count: Option used by mysql-test for debugging and testing of replication. Removed in MySQL 8.2.0.
- expire_logs_days: Purge binary logs after this many days. Removed in MySQL 8.2.0.
- group_replication_ip_whitelist: List of hosts permitted to connect to group. Removed in MySQL 8.3.0.
- group_replication_primary_member: Primary member UUID when group operates in singleprimary mode. Empty string if group is operating in multi-primary mode. Removed in MySQL 8.3.0.
- group_replication_recovery_complete_at: Recovery policies when handling cached transactions after state transfer. Removed in MySQL 8.4.0.
- have_openssl: Whether mysqld supports SSL connections. Removed in MySQL 8.4.0.
- have_ssl: Whether mysqld supports SSL connections. Removed in MySQL 8.4.0.
- innodb: Enable InnoDB (if this version of MySQL supports it). Removed in MySQL 8.3.0.
- innodb_api_bk_commit_interval: How often to auto-commit idle connections which use InnoDB memcached interface, in seconds. Removed in MySQL 8.3.0.
- innodb_api_disable_rowlock: . Removed in MySQL 8.3.0.
- innodb_api_enable_binlog: Allows use of InnoDB memcached plugin with MySQL binary log. Removed in MySQL 8.3.0.
- innodb_api_enable_mdl: Locks table used by InnoDB memcached plugin, so that it cannot be dropped or altered by DDL through SQL interface. Removed in MySQL 8.3.0.
- innodb_api_trx_level: Allows control of transaction isolation level on queries processed by memcached interface. Removed in MySQL 8.3.0.
- keyring_encrypted_file_data: keyring_encrypted_file plugin data file. Removed in MySQL 8.4.0.
- keyring_encrypted_file_password: keyring_encrypted_file plugin password. Removed in MySQL 8.4.0.
- keyring_file_data: keyring_file plugin data file. Removed in MySQL 8.4.0.
- keyring_oci_ca_certificate: CA certificate file for peer authentication. Removed in MySQL 8.4.0.
- keyring_oci_compartment: OCI compartment OCID. Removed in MySQL 8.4.0.
- keyring_oci_encryption_endpoint: OCI encryption server endpoint. Removed in MySQL 8.4.0.
- keyring_oci_key_file: OCI RSA private key file. Removed in MySQL 8.4.0.
- keyring_oci_key_fingerprint: OCI RSA private key file fingerprint. Removed in MySQL 8.4.0.
- keyring_oci_management_endpoint: OCI management server endpoint. Removed in MySQL 8.4.0.
- keyring_oci_master_key: OCI master key OCID. Removed in MySQL 8.4.0.
- keyring_oci_secrets_endpoint: OCI secrets server endpoint. Removed in MySQL 8.4.0.
- keyring_oci_tenancy: OCI tenancy OCID. Removed in MySQL 8.4.0.
- keyring_oci_user: OCI user OCID. Removed in MySQL 8.4.0.
- keyring_oci_vaults_endpoint: OCI vaults server endpoint. Removed in MySQL 8.4.0.
- keyring_oci_virtual_vault: OCI vault OCID. Removed in MySQL 8.4.0.
- language: Client error messages in given language. May be given as full path. Removed in MySQL 8.4.0.
- log_bin_use_v1_row_events: Whether server is using version 1 binary log row events. Removed in MySQL 8.3.0.
- master-info-file: Location and name of file that remembers source and where I/O replication thread is in source's binary log. Removed in MySQL 8.3.0.
- master_info_repository: Whether to write connection metadata repository, containing source information and replication I/O thread location in source's binary log, to file or table. Removed in MySQL 8.3.0.
- new: Use very new, possibly 'unsafe' functions. Removed in MySQL 8.4.0.
- no-dd-upgrade: Prevent automatic upgrade of data dictionary tables at startup. Removed in MySQL 8.4.0.
- old: Cause server to revert to certain behaviors present in older versions. Removed in MySQL 8.4.0.
- old-style-user-limits: Enable old-style user limits (before 5.0.3, user resources were counted per each user+host vs. per account). Removed in MySQL 8.3.0.
- relay_log_info_file: File name for applier metadata repository in which replica records information about relay logs. Removed in MySQL 8.3.0.
- relay_log_info_repository: Whether to write location of replication SQL thread in relay logs to file or table. Removed in MySQL 8.3.0.
- show_old_temporals: Whether SHOW CREATE TABLE should indicate pre-5.6.4 temporal columns. Removed in MySQL 8.4.0.
- skip-character-set-client-handshake: Ignore client side character set value sent during handshake. Removed in MySQL 8.3.0.
- skip-host-cache: Do not cache host names. Removed in MySQL 8.3.0.
- skip-ssl: Disable connection encryption. Removed in MySQL 8.4.0.
- slave_rows_search_algorithms: Determines search algorithms used for replica update batching. Any 2 or 3 from this list: INDEX_SEARCH, TABLE_SCAN, HASH_SCAN. Removed in MySQL 8.3.0.
- ssl: Enable connection encryption. Removed in MySQL 8.4.0.
- transaction_write_set_extraction: Defines algorithm used to hash writes extracted during transaction. Removed in MySQL 8.3.0.

\subsection*{1.6 How to Report Bugs or Problems}

Before posting a bug report about a problem, please try to verify that it is a bug and that it has not been reported already:
- Start by searching the MySQL online manual at https://dev.mysql.com/doc/. We try to keep the manual up to date by updating it frequently with solutions to newly found problems. In addition, the release notes accompanying the manual can be particularly useful since it is quite possible that a newer version contains a solution to your problem. The release notes are available at the location just given for the manual.
- If you get a parse error for an SQL statement, please check your syntax closely. If you cannot find something wrong with it, it is extremely likely that your current version of MySQL Server doesn't support the syntax you are using. If you are using the current version and the manual doesn't cover the syntax that you are using, MySQL Server doesn't support your statement.

If the manual covers the syntax you are using, but you have an older version of MySQL Server, you should check the MySQL change history to see when the syntax was implemented. In this case, you have the option of upgrading to a newer version of MySQL Server.
- For solutions to some common problems, see Section B.3, "Problems and Common Errors".
- Search the bugs database at http://bugs.mysql.com/ to see whether the bug has been reported and fixed.
- You can also use http://www.mysql.com/search/ to search all the Web pages (including the manual) that are located at the MySQL website.

If you cannot find an answer in the manual, the bugs database, or the mailing list archives, check with your local MySQL expert. If you still cannot find an answer to your question, please use the following guidelines for reporting the bug.

The normal way to report bugs is to visit http://bugs.mysql.com/, which is the address for our bugs database. This database is public and can be browsed and searched by anyone. If you log in to the system, you can enter new reports.

Bugs posted in the bugs database at http://bugs.mysql.com/ that are corrected for a given release are noted in the release notes.

If you find a security bug in MySQL Server, please let us know immediately by sending an email message to <secalert_us@oracle.com>. Exception: Support customers should report all problems, including security bugs, to Oracle Support at http://support.oracle.com/.

To discuss problems with other users, you can use the MySQL Community Slack.
Writing a good bug report takes patience, but doing it right the first time saves time both for us and for yourself. A good bug report, containing a full test case for the bug, makes it very likely that we will fix
the bug in the next release. This section helps you write your report correctly so that you do not waste your time doing things that may not help us much or at all. Please read this section carefully and make sure that all the information described here is included in your report.

Preferably, you should test the problem using the latest production or development version of MySQL Server before posting. Anyone should be able to repeat the bug by just using mysql test < script_file on your test case or by running the shell or Perl script that you include in the bug report. Any bug that we are able to repeat has a high chance of being fixed in the next MySQL release.

It is most helpful when a good description of the problem is included in the bug report. That is, give a good example of everything you did that led to the problem and describe, in exact detail, the problem itself. The best reports are those that include a full example showing how to reproduce the bug or problem. See Section 7.9, "Debugging MySQL".

Remember that it is possible for us to respond to a report containing too much information, but not to one containing too little. People often omit facts because they think they know the cause of a problem and assume that some details do not matter. A good principle to follow is that if you are in doubt about stating something, state it. It is faster and less troublesome to write a couple more lines in your report than to wait longer for the answer if we must ask you to provide information that was missing from the initial report.

The most common errors made in bug reports are (a) not including the version number of the MySQL distribution that you use, and (b) not fully describing the platform on which the MySQL server is installed (including the platform type and version number). These are highly relevant pieces of information, and in 99 cases out of 100, the bug report is useless without them. Very often we get questions like, "Why doesn't this work for me?" Then we find that the feature requested wasn't implemented in that MySQL version, or that a bug described in a report has been fixed in newer MySQL versions. Errors often are platform-dependent. In such cases, it is next to impossible for us to fix anything without knowing the operating system and the version number of the platform.

If you compiled MySQL from source, remember also to provide information about your compiler if it is related to the problem. Often people find bugs in compilers and think the problem is MySQLrelated. Most compilers are under development all the time and become better version by version. To determine whether your problem depends on your compiler, we need to know what compiler you used. Note that every compiling problem should be regarded as a bug and reported accordingly.

If a program produces an error message, it is very important to include the message in your report. If we try to search for something from the archives, it is better that the error message reported exactly matches the one that the program produces. (Even the lettercase should be observed.) It is best to copy and paste the entire error message into your report. You should never try to reproduce the message from memory.

If you have a problem with Connector/ODBC (MyODBC), please try to generate a trace file and send it with your report. See How to Report Connector/ODBC Problems or Bugs.

If your report includes long query output lines from test cases that you run with the mysql commandline tool, you can make the output more readable by using the --vertical option or the \G statement terminator. The EXPLAIN SELECT example later in this section demonstrates the use of \G.

Please include the following information in your report:
- The version number of the MySQL distribution you are using (for example, MySQL 5.7.10). You can find out which version you are running by executing mysqladmin version. The mysqladmin program can be found in the bin directory under your MySQL installation directory.
- The manufacturer and model of the machine on which you experience the problem.
- The operating system name and version. If you work with Windows, you can usually get the name and version number by double-clicking your My Computer icon and pulling down the "Help/About Windows" menu. For most Unix-like operating systems, you can get this information by executing the command uname -a.
- Sometimes the amount of memory (real and virtual) is relevant. If in doubt, include these values.
- The contents of the docs/INFO_BIN file from your MySQL installation. This file contains information about how MySQL was configured and compiled.
- If you are using a source distribution of the MySQL software, include the name and version number of the compiler that you used. If you have a binary distribution, include the distribution name.
- If the problem occurs during compilation, include the exact error messages and also a few lines of context around the offending code in the file where the error occurs.
- If mysqld died, you should also report the statement that caused mysqld to unexpectedly exit. You can usually get this information by running mysqld with query logging enabled, and then looking in the log after mysqld exits. See Section 7.9, "Debugging MySQL".
- If a database table is related to the problem, include the output from the SHOW CREATE TABLE db_name.tbl_name statement in the bug report. This is a very easy way to get the definition of any table in a database. The information helps us create a situation matching the one that you have experienced.
- The SQL mode in effect when the problem occurred can be significant, so please report the value of the sql_mode system variable. For stored procedure, stored function, and trigger objects, the relevant sql_mode value is the one in effect when the object was created. For a stored procedure or function, the SHOW CREATE PROCEDURE or SHOW CREATE FUNCTION statement shows the relevant SQL mode, or you can query INFORMATION_SCHEMA for the information:

SELECT ROUTINE_SCHEMA, ROUTINE_NAME, SQL_MODE
FROM INFORMATION_SCHEMA.ROUTINES;
For triggers, you can use this statement:
SELECT EVENT_OBJECT_SCHEMA, EVENT_OBJECT_TABLE, TRIGGER_NAME, SQL_MODE
FROM INFORMATION_SCHEMA.TRIGGERS;
- For performance-related bugs or problems with SELECT statements, you should always include the output of EXPLAIN SELECT . . ., and at least the number of rows that the SELECT statement produces. You should also include the output from SHOW CREATE TABLE tbl_name for each table that is involved. The more information you provide about your situation, the more likely it is that someone can help you.

The following is an example of a very good bug report. The statements are run using the mysql command-line tool. Note the use of the \G statement terminator for statements that would otherwise provide very long output lines that are difficult to read.
```
mysql> SHOW VARIABLES;
mysql> SHOW COLUMNS FROM ...\G
    <output from SHOW COLUMNS>
mysql> EXPLAIN SELECT ...\G
    <output from EXPLAIN>
mysql> FLUSH STATUS;
mysql> SELECT ...;
    <A short version of the output from SELECT,
    including the time taken to run the query>
mysql> SHOW STATUS;
    <output from SHOW STATUS>
```

- If a bug or problem occurs while running mysqld, try to provide an input script that reproduces the anomaly. This script should include any necessary source files. The more closely the script can reproduce your situation, the better. If you can make a reproducible test case, you should upload it to be attached to the bug report.

If you cannot provide a script, you should at least include the output from mysqladmin variables extended-status processlist in your report to provide some information on how your system is performing.
- If you cannot produce a test case with only a few rows, or if the test table is too big to be included in the bug report (more than 10 rows), you should dump your tables using mysqldump and create a README file that describes your problem. Create a compressed archive of your files using tar and gzip or zip. After you initiate a bug report for our bugs database at http://bugs.mysql.com/, click the Files tab in the bug report for instructions on uploading the archive to the bugs database.
- If you believe that the MySQL server produces a strange result from a statement, include not only the result, but also your opinion of what the result should be, and an explanation describing the basis for your opinion.
- When you provide an example of the problem, it is better to use the table names, variable names, and so forth that exist in your actual situation than to come up with new names. The problem could be related to the name of a table or variable. These cases are rare, perhaps, but it is better to be safe than sorry. After all, it should be easier for you to provide an example that uses your actual situation, and it is by all means better for us. If you have data that you do not want to be visible to others in the bug report, you can upload it using the Files tab as previously described. If the information is really top secret and you do not want to show it even to us, go ahead and provide an example using other names, but please regard this as the last choice.
- Include all the options given to the relevant programs, if possible. For example, indicate the options that you use when you start the mysqld server, as well as the options that you use to run any MySQL client programs. The options to programs such as mysqld and mysql, and to the configure script, are often key to resolving problems and are very relevant. It is never a bad idea to include them. If your problem involves a program written in a language such as Perl or PHP, please include the language processor's version number, as well as the version for any modules that the program uses. For example, if you have a Perl script that uses the DBI and DBD : : mysql modules, include the version numbers for Perl, DBI, and DBD : : mysql.
- If your question is related to the privilege system, please include the output of mysqladmin reload, and all the error messages you get when trying to connect. When you test your privileges, you should execute mysqladmin reload version and try to connect with the program that gives you trouble.
- If you have a patch for a bug, do include it. But do not assume that the patch is all we need, or that we can use it, if you do not provide some necessary information such as test cases showing the bug that your patch fixes. We might find problems with your patch or we might not understand it at all. If so, we cannot use it.

If we cannot verify the exact purpose of the patch, we will not use it. Test cases help us here. Show that the patch handles all the situations that may occur. If we find a borderline case (even a rare one) where the patch will not work, it may be useless.
- Guesses about what the bug is, why it occurs, or what it depends on are usually wrong. Even the MySQL team cannot guess such things without first using a debugger to determine the real cause of a bug.
- Indicate in your bug report that you have checked the reference manual and mail archive so that others know you have tried to solve the problem yourself.
- If your data appears corrupt or you get errors when you access a particular table, first check your tables with CHECK TABLE. If that statement reports any errors:
- The InnoDB crash recovery mechanism handles cleanup when the server is restarted after being killed, so in typical operation there is no need to "repair" tables. If you encounter an error with InnoDB tables, restart the server and see whether the problem persists, or whether the error affected only cached data in memory. If data is corrupted on disk, consider restarting with the innodb_force_recovery option enabled so that you can dump the affected tables.
- For non-transactional tables, try to repair them with REPAIR TABLE or with myisamchk. See Chapter 7, MySQL Server Administration.

If you are running Windows, please verify the value of lower_case_table_names using the SHOW VARIABLES LIKE 'lower_case_table_names' statement. This variable affects how the server handles lettercase of database and table names. Its effect for a given value should be as described in Section 11.2.3, "Identifier Case Sensitivity".
- If you often get corrupted tables, you should try to find out when and why this happens. In this case, the error log in the MySQL data directory may contain some information about what happened. (This is the file with the .err suffix in the name.) See Section 7.4.2, "The Error Log". Please include any relevant information from this file in your bug report. Normally mysqld should never corrupt a table if nothing killed it in the middle of an update. If you can find the cause of mysqld dying, it is much easier for us to provide you with a fix for the problem. See Section B.3.1, "How to Determine What Is Causing a Problem".
- If possible, download and install the most recent version of MySQL Server and check whether it solves your problem. All versions of the MySQL software are thoroughly tested and should work without problems. We believe in making everything as backward-compatible as possible, and you should be able to switch MySQL versions without difficulty. See Section 2.1.2, "Which MySQL Version and Distribution to Install".

\subsection*{1.7 MySQL Standards Compliance}

This section describes how MySQL relates to the ANSI/ISO SQL standards. MySQL Server has many extensions to the SQL standard, and here you can find out what they are and how to use them. You can also find information about functionality missing from MySQL Server, and how to work around some of the differences.

The SQL standard has been evolving since 1986 and several versions exist. In this manual, "SQL-92" refers to the standard released in 1992. "SQL:1999", "SQL:2003", "SQL:2008", and "SQL:2011" refer to the versions of the standard released in the corresponding years, with the last being the most recent version. We use the phrase "the SQL standard" or "standard SQL" to mean the current version of the SQL Standard at any time.

One of our main goals with the product is to continue to work toward compliance with the SQL standard, but without sacrificing speed or reliability. We are not afraid to add extensions to SQL or support for non-SQL features if this greatly increases the usability of MySQL Server for a large segment of our user base. The HANDLER interface is an example of this strategy. See Section 15.2.5, "HANDLER Statement".

We continue to support transactional and nontransactional databases to satisfy both mission-critical 24/7 usage and heavy Web or logging usage.

MySQL Server was originally designed to work with medium-sized databases (10-100 million rows, or about 100 MB per table) on small computer systems. Today MySQL Server handles terabyte-sized databases.

We are not targeting real-time support, although MySQL replication capabilities offer significant functionality.

MySQL supports ODBC levels 0 to 3.51 .
MySQL supports high-availability database clustering using the NDBCLUSTER storage engine. See Chapter 25, MySQL NDB Cluster 8.4.

We implement XML functionality which supports most of the W3C XPath standard. See Section 14.11, "XML Functions".

MySQL supports a native JSON data type as defined by RFC 7159, and based on the ECMAScript standard (ECMA-262). See Section 13.5, "The JSON Data Type". MySQL also implements a subset
of the SQL/JSON functions specified by a pre-publication draft of the SQL:2016 standard; see Section 14.17, "JSON Functions", for more information.

\section*{Selecting SQL Modes}

The MySQL server can operate in different SQL modes, and can apply these modes differently for different clients, depending on the value of the sql_mode system variable. DBAs can set the global SQL mode to match site server operating requirements, and each application can set its session SQL mode to its own requirements.

Modes affect the SQL syntax MySQL supports and the data validation checks it performs. This makes it easier to use MySQL in different environments and to use MySQL together with other database servers.

For more information on setting the SQL mode, see Section 7.1.11, "Server SQL Modes".

\section*{Running MySQL in ANSI Mode}

To run MySQL Server in ANSI mode, start mysqld with the --ansi option. Running the server in ANSI mode is the same as starting it with the following options:
--transaction-isolation=SERIALIZABLE --sql-mode=ANSI
To achieve the same effect at runtime, execute these two statements:
SET GLOBAL TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SET GLOBAL sql_mode = 'ANSI';
You can see that setting the sql_mode system variable to 'ANSI ' enables all SQL mode options that are relevant for ANSI mode as follows:
```
mysql> SET GLOBAL sql_mode='ANSI';
mysql> SELECT @@GLOBAL.sql_mode;
    -> 'REAL_AS_FLOAT,PIPES_AS_CONCAT,ANSI_QUOTES,IGNORE_SPACE,ANSI'
```


Running the server in ANSI mode with - - ansi is not quite the same as setting the SQL mode to 'ANSI' because the --ansi option also sets the transaction isolation level.

See Section 7.1.7, "Server Command Options".

\subsection*{1.7.1 MySQL Extensions to Standard SQL}

MySQL Server supports some extensions that you are not likely to find in other SQL DBMSs. Be warned that if you use them, your code is most likely not portable to other SQL servers. In some cases, you can write code that includes MySQL extensions, but is still portable, by using comments of the following form:
```
/*! MySQL-specific code */
```


In this case, MySQL Server parses and executes the code within the comment as it would any other SQL statement, but other SQL servers should ignore the extensions. For example, MySQL Server recognizes the STRAIGHT_JOIN keyword in the following statement, but other servers should not:
```
SELECT /*! STRAIGHT_JOIN */ col1 FROM table1,table2 WHERE ...
```


If you add a version number after the ! character, the syntax within the comment is executed only if the MySQL version is greater than or equal to the specified version number. The KEY_BLOCK_SIZE clause in the following comment is executed only by servers from MySQL 5.1.10 or higher:
```
CREATE TABLE t1(a INT, KEY (a)) /*!50110 KEY_BLOCK_SIZE=1024 */;
```


The following descriptions list MySQL extensions, organized by category.
- Organization of data on disk

MySQL Server maps each database to a directory under the MySQL data directory, and maps tables within a database to file names in the database directory. Consequently, database and table names are case-sensitive in MySQL Server on operating systems that have case-sensitive file names (such as most Unix systems). See Section 11.2.3, "Identifier Case Sensitivity".
- General language syntax
- By default, strings can be enclosed by " as well as '. If the ANSI_QUOTES SQL mode is enabled, strings can be enclosed only by ' and the server interprets strings enclosed by " as identifiers.
- \is the escape character in strings.
- In SQL statements, you can access tables from different databases with the db_name.tbl_name syntax. Some SQL servers provide the same functionality but call this User space. MySQL Server doesn't support tablespaces such as used in statements like this: CREATE TABLE ralph.my_table ... IN my_tablespace.
- SQL statement syntax
- The ANALYZE TABLE, CHECK TABLE, OPTIMIZE TABLE, and REPAIR TABLE statements.
- The CREATE DATABASE, DROP DATABASE, and ALTER DATABASE statements. See Section 15.1.12, "CREATE DATABASE Statement", Section 15.1.24, "DROP DATABASE Statement", and Section 15.1.2, "ALTER DATABASE Statement".
- The DO statement.
- EXPLAIN SELECT to obtain a description of how tables are processed by the query optimizer.
- The FLUSH and RESET statements.
- The SET statement. See Section 15.7.6.1, "SET Syntax for Variable Assignment".
- The SHOW statement. See Section 15.7.7, "SHOW Statements". The information produced by many of the MySQL-specific SHOW statements can be obtained in more standard fashion by using SELECT to query INFORMATION_SCHEMA. See Chapter 28, INFORMATION_SCHEMA Tables.
- Use of LOAD DATA. In many cases, this syntax is compatible with Oracle LOAD DATA. See Section 15.2.9, "LOAD DATA Statement".
- Use of RENAME TABLE. See Section 15.1.36, "RENAME TABLE Statement".
- Use of REPLACE instead of DELETE plus INSERT. See Section 15.2.12, "REPLACE Statement".
- Use of CHANGE col_name, DROP col_name, or DROP INDEX, IGNORE or RENAME in ALTER TABLE statements. Use of multiple ADD, ALTER, DROP, or CHANGE clauses in an ALTER TABLE statement. See Section 15.1.9, "ALTER TABLE Statement".
- Use of index names, indexes on a prefix of a column, and use of INDEX or KEY in CREATE TABLE statements. See Section 15.1.20, "CREATE TABLE Statement".
- Use of TEMPORARY or IF NOT EXISTS with CREATE TABLE.
- Use of IF EXISTS with DROP TABLE and DROP DATABASE.
- The capability of dropping multiple tables with a single DROP TABLE statement.
- The ORDER BY and LIMIT clauses of the UPDATE and DELETE statements.
- INSERT INTO tbl_name SET col_name = ...syntax.
- The DELAYED clause of the INSERT and REPLACE statements.
- The LOW_PRIORITY clause of the INSERT, REPLACE, DELETE, and UPDATE statements.
- Use of INTO OUTFILE or INTO DUMPFILE in SELECT statements. See Section 15.2.13, "SELECT Statement".
- Options such as STRAIGHT_JOIN or SQL_SMALL_RESULT in SELECT statements.
- You don't need to name all selected columns in the GROUP BY clause. This gives better performance for some very specific, but quite normal queries. See Section 14.19, "Aggregate Functions".
- You can specify ASC and DESC with GROUP BY, not just with ORDER BY.
- The ability to set variables in a statement with the : = assignment operator. See Section 11.4, "User-Defined Variables".
- Data types
- The MEDIUMINT, SET, and ENUM data types, and the various BLOB and TEXT data types.
- The AUTO_INCREMENT, BINARY, NULL, UNSIGNED, and ZEROFILL data type attributes.
- Functions and operators
- To make it easier for users who migrate from other SQL environments, MySQL Server supports aliases for many functions. For example, all string functions support both standard SQL syntax and ODBC syntax.
- MySQL Server understands the || and \&\& operators to mean logical OR and AND, as in the C programming language. In MySQL Server, | | and OR are synonyms, as are \&\& and AND. Because of this nice syntax, MySQL Server doesn't support the standard SQL | | operator for string concatenation; use CONCAT( ) instead. Because CONCAT ( ) takes any number of arguments, it is easy to convert use of the || operator to MySQL Server.
- Use of COUNT(DISTINCT value_list) where value_list has more than one element.
- String comparisons are case-insensitive by default, with sort ordering determined by the collation of the current character set, which is utf8mb4 by default. To perform case-sensitive comparisons instead, you should declare your columns with the BINARY attribute or use the BINARY cast, which causes comparisons to be done using the underlying character code values rather than a lexical ordering.
- The \% operator is a synonym for MOD( ). That is, $N \% M$ is equivalent to $\operatorname{MOD}(N, M) . \%$ is supported for C programmers and for compatibility with PostgreSQL.
- The =, <>, <=, <, >=, >, <<, >>, <=>, AND, OR, or LIKE operators may be used in expressions in the output column list (to the left of the FROM) in SELECT statements. For example:
```
mysql> SELECT col1=1 AND col2=2 FROM my_table;
```

- The LAST_INSERT_ID( ) function returns the most recent AUTO_INCREMENT value. See Section 14.15, "Information Functions".
- LIKE is permitted on numeric values.
- The REGEXP and NOT REGEXP extended regular expression operators.
- CONCAT( ) or CHAR( ) with one argument or more than two arguments. (In MySQL Server, these functions can take a variable number of arguments.)
- The BIT_COUNT( ), CASE, ELT( ), FROM_DAYS( ), FORMAT( ), IF( ), MD5( ), PERIOD_ADD( ), PERIOD_DIFF(), TO_DAYS(), and WEEKDAY( ) functions.
- Use of TRIM ( ) to trim substrings. Standard SQL supports removal of single characters only.
- The GROUP BY functions STD(), BIT_OR( ), BIT_AND( ), BIT_XOR( ), and GROUP_CONCAT( ). See Section 14.19, "Aggregate Functions".

\subsection*{1.7.2 MySQL Differences from Standard SQL}

We try to make MySQL Server follow the ANSI SQL standard and the ODBC SQL standard, but MySQL Server performs operations differently in some cases:
- There are several differences between the MySQL and standard SQL privilege systems. For example, in MySQL, privileges for a table are not automatically revoked when you delete a table. You must explicitly issue a REVOKE statement to revoke privileges for a table. For more information, see Section 15.7.1.8, "REVOKE Statement".
- The CAST( ) function does not support cast to REAL or BIGINT. See Section 14.10, "Cast Functions and Operators".

\subsection*{1.7.2.1 SELECT INTO TABLE Differences}

MySQL Server doesn't support the SELECT ... INTO TABLE Sybase SQL extension. Instead, MySQL Server supports the INSERT INTO ... SELECT standard SQL syntax, which is basically the same thing. See Section 15.2.7.1, "INSERT ... SELECT Statement". For example:
```
INSERT INTO tbl_temp2 (fld_id)
    SELECT tbl_temp1.fld_order_id
    FROM tbl_temp1 WHERE tbl_temp1.fld_order_id > 100;
```


Alternatively, you can use SELECT ... INTO OUTFILE or CREATE TABLE ... SELECT.
You can use SELECT ... INTO with user-defined variables. The same syntax can also be used inside stored routines using cursors and local variables. See Section 15.2.13.1, "SELECT ... INTO Statement".

\subsection*{1.7.2.2 UPDATE Differences}

If you access a column from the table to be updated in an expression, UPDATE uses the current value of the column. The second assignment in the following statement sets col2 to the current (updated) col1 value, not the original col1 value. The result is that col1 and col2 have the same value. This behavior differs from standard SQL.
```
UPDATE t1 SET col1 = col1 + 1, col2 = col1;
```


\subsection*{1.7.2.3 FOREIGN KEY Constraint Differences}

The MySQL implementation of foreign key constraints differs from the SQL standard in the following key respects:
- If there are several rows in the parent table with the same referenced key value, InnoDB performs a foreign key check as if the other parent rows with the same key value do not exist. For example, if you define a RESTRICT type constraint, and there is a child row with several parent rows, InnoDB does not permit the deletion of any of the parent rows. This is shown in the following example:
```
mysql> CREATE TABLE parent (
    -> id INT,
    -> INDEX (id)
    -> ) ENGINE=InnoDB;
Query OK, 0 rows affected (0.04 sec)
mysql> CREATE TABLE child (
    -> id INT,
```

```
    -> parent_id INT,
    -> INDEX par_ind (parent_id),
    -> FOREIGN KEY (parent_id)
    -> REFERENCES parent(id)
    -> ON DELETE RESTRICT
    -> ) ENGINE=InnoDB;
Query OK, 0 rows affected (0.02 sec)
mysql> INSERT INTO parent (id)
    -> VALUES ROW(1), ROW(2), ROW(3), ROW(1);
Query OK, 4 rows affected (0.01 sec)
Records: 4 Duplicates: 0 Warnings: 0
mysql> INSERT INTO child (id,parent_id)
    -> VALUES ROW(1,1), ROW(2,2), ROW(3,3);
Query OK, 3 rows affected (0.01 sec)
Records: 3 Duplicates: 0 Warnings: 0
mysql> DELETE FROM parent WHERE id=1;
ERROR 1451 (23000): Cannot delete or update a parent row: a foreign key
constraint fails (ˋtestˋ.ˋchildˋ, CONSTRAINT ˋchild_ibfk_1ˋ FOREIGN KEY
(ˋparent_idˋ) REFERENCES ˋparentˋ (ˋidˋ) ON DELETE RESTRICT)
```

- If ON UPDATE CASCADE or ON UPDATE SET NULL recurses to update the same table it has previously updated during the same cascade, it acts like RESTRICT. This means that you cannot use self-referential ON UPDATE CASCADE or ON UPDATE SET NULL operations. This is to prevent infinite loops resulting from cascaded updates. A self-referential ON DELETE SET NULL, on the other hand, is possible, as is a self-referential ON DELETE CASCADE. Cascading operations may not be nested more than 15 levels deep.
- In an SQL statement that inserts, deletes, or updates many rows, foreign key constraints (like unique constraints) are checked row-by-row. When performing foreign key checks, InnoDB sets shared rowlevel locks on child or parent records that it must examine. MySQL checks foreign key constraints immediately; the check is not deferred to transaction commit. According to the SQL standard, the default behavior should be deferred checking. That is, constraints are only checked after the entire SQL statement has been processed. This means that it is not possible to delete a row that refers to itself using a foreign key.
- No storage engine, including InnoDB, recognizes or enforces the MATCH clause used in referentialintegrity constraint definitions. Use of an explicit MATCH clause does not have the specified effect, and it causes ON DELETE and ON UPDATE clauses to be ignored. Specifying the MATCH should be avoided.

The MATCH clause in the SQL standard controls how NULL values in a composite (multiple-column) foreign key are handled when comparing to a primary key in the referenced table. MySQL essentially implements the semantics defined by MATCH SIMPLE, which permits a foreign key to be all or partially NULL. In that case, a (child table) row containing such a foreign key can be inserted even though it does not match any row in the referenced (parent) table. (It is possible to implement other semantics using triggers.)
- A FOREIGN KEY constraint that references a non-UNIQUE key is not standard SQL but rather an InnoDB extension that is now deprecated, and must be enabled by setting restrict_fk_on_non_standard_key. You should expect support for use of nonstandard keys to be removed in a future version of MySQL, and migrate away from them now.

The NDB storage engine requires an explicit unique key (or primary key) on any column referenced as a foreign key, as per the SQL standard.
- For storage engines that do not support foreign keys (such as MyISAM), MySQL Server parses and ignores foreign key specifications.
- MySQL parses but ignores "inline REFERENCES specifications" (as defined in the SQL standard) where the references are defined as part of the column specification. MySQL accepts REFERENCES clauses only when specified as part of a separate FOREIGN KEY specification.

Defining a column to use a REFERENCES tbl_name (col_name) clause has no actual effect and serves only as a memo or comment to you that the column which you are currently defining is intended to refer to a column in another table. It is important to realize when using this syntax that:
- MySQL does not perform any sort of check to make sure that col_name actually exists in tbl_name (or even that tbl_name itself exists).
- MySQL does not perform any sort of action on tbl_name such as deleting rows in response to actions taken on rows in the table which you are defining; in other words, this syntax induces no ON DELETE or ON UPDATE behavior whatsoever. (Although you can write an ON DELETE or ON UPDATE clause as part of the REFERENCES clause, it is also ignored.)
- This syntax creates a column; it does not create any sort of index or key.

You can use a column so created as a join column, as shown here:
```
CREATE TABLE person (
    id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name CHAR(60) NOT NULL,
    PRIMARY KEY (id)
);
CREATE TABLE shirt (
    id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    style ENUM('t-shirt', 'polo', 'dress') NOT NULL,
    color ENUM('red', 'blue', 'orange', 'white', 'black') NOT NULL,
    owner SMALLINT UNSIGNED NOT NULL REFERENCES person(id),
    PRIMARY KEY (id)
);
INSERT INTO person VALUES (NULL, 'Antonio Paz');
SELECT @last := LAST_INSERT_ID();
INSERT INTO shirt VALUES
    ROW(NULL, 'polo', 'blue', @last),
    ROW(NULL, 'dress', 'white', @last),
    ROW(NULL, 't-shirt', 'blue', @last);
INSERT INTO person VALUES (NULL, 'Lilliana Angelovska');
SELECT @last := LAST_INSERT_ID();
INSERT INTO shirt VALUES
    ROW(NULL, 'dress', 'orange', @last),
    ROW(NULL, 'polo', 'red', @last),
    ROW(NULL, 'dress', 'blue', @last),
    ROW(NULL, 't-shirt', 'white', @last);
SELECT * FROM person;
+----+----------------------+
| id | name |
+----+----------------------+
|1 2 | Antonio Paz Lilliana Angelovska |
+----+----------------------+
SELECT * FROM shirt;
+----+----------+--------+-------+
| id | style | color | owner |
+----+----------+--------+-------+
| 1 | polo | blue | 1 |
| 2 | dress | white | 1 |
| 3 | t-shirt | blue
| 4 | dress | orange | 2 |
| 5 | polo | red
|6 | dress | blue | 2 |
```

```
+----+----------+--------+-------+
SELECT s.* FROM person p INNER JOIN shirt s
    ON s.owner = p.id
WHERE p.name LIKE 'Lilliana%'
    AND s.color <> 'white';
+----+--------+--------+-------+
| id | style | color | owner |
+----+--------+--------+-------+
| 4 | dress | orange | 2 |
| 5 | polo | red | 2 |
| 6 | dress | blue | 2 |
+----+--------+--------+-------+
```


When used in this fashion, the REFERENCES clause is not displayed in the output of SHOW CREATE TABLE or DESCRIBE:
```
mysql> SHOW CREATE TABLE shirt\G
************************** 1. row ******************************
Table: shirt
Create Table: CREATE TABLE ˋshirtˋ (
ˋidˋ smallint(5) unsigned NOT NULL auto_increment,
ˋstyleˋ enum('t-shirt','polo','dress') NOT NULL,
ˋcolorˋ enum('red','blue','orange','white','black') NOT NULL,
ˋownerˋ smallint(5) unsigned NOT NULL,
PRIMARY KEY (ˋidˋ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
```


For information about foreign key constraints, see Section 15.1.20.5, "FOREIGN KEY Constraints".

\subsection*{1.7.2.4 '--' as the Start of a Comment}

Standard SQL uses the C syntax /* this is a comment */ for comments, and MySQL Server supports this syntax as well. MySQL also support extensions to this syntax that enable MySQL-specific SQL to be embedded in the comment; see Section 11.7, "Comments".

MySQL Server also uses \# as the start comment character. This is nonstandard.
Standard SQL also uses "- -" as a start-comment sequence. MySQL Server supports a variant of the - - comment style; the - - start-comment sequence is accepted as such, but must be followed by a whitespace character such as a space or newline. The space is intended to prevent problems with generated SQL queries that use constructs such as the following, which updates the balance to reflect a charge:
```
UPDATE account SET balance=balance-charge
WHERE account_id=user_id
```


Consider what happens when charge has a negative value such as -1 , which might be the case when an amount is credited to the account. In this case, the generated statement looks like this:
```
UPDATE account SET balance=balance--1
WHERE account_id=5752;
```

balance--1 is valid standard SQL, but - - is interpreted as the start of a comment, and part of the expression is discarded. The result is a statement that has a completely different meaning than intended:
```
UPDATE account SET balance=balance
WHERE account_id=5752;
```


This statement produces no change in value at all. To keep this from happening, MySQL requires a whitespace character following the - - for it to be recognized as a start-comment sequence in MySQL Server, so that an expression such as balance--1 is always safe to use.

\subsection*{1.7.3 How MySQL Deals with Constraints}

MySQL enables you to work both with transactional tables that permit rollback and with nontransactional tables that do not. Because of this, constraint handling is a bit different in MySQL than in other DBMSs. We must handle the case when you have inserted or updated a lot of rows in a nontransactional table for which changes cannot be rolled back when an error occurs.

The basic philosophy is that MySQL Server tries to produce an error for anything that it can detect while parsing a statement to be executed, and tries to recover from any errors that occur while executing the statement. We do this in most cases, but not yet for all.

The options MySQL has when an error occurs are to stop the statement in the middle or to recover as well as possible from the problem and continue. By default, the server follows the latter course. This means, for example, that the server may coerce invalid values to the closest valid values.

Several SQL mode options are available to provide greater control over handling of bad data values and whether to continue statement execution or abort when errors occur. Using these options, you can configure MySQL Server to act in a more traditional fashion that is like other DBMSs that reject improper input. The SQL mode can be set globally at server startup to affect all clients. Individual clients can set the SQL mode at runtime, which enables each client to select the behavior most appropriate for its requirements. See Section 7.1.11, "Server SQL Modes".

The following sections describe how MySQL Server handles different types of constraints.

\subsection*{1.7.3.1 PRIMARY KEY and UNIQUE Index Constraints}

Normally, errors occur for data-change statements (such as INSERT or UPDATE) that would violate primary-key, unique-key, or foreign-key constraints. If you are using a transactional storage engine such as InnoDB, MySQL automatically rolls back the statement. If you are using a nontransactional storage engine, MySQL stops processing the statement at the row for which the error occurred and leaves any remaining rows unprocessed.

MySQL supports an IGNORE keyword for INSERT, UPDATE, and so forth. If you use it, MySQL ignores primary-key or unique-key violations and continues processing with the next row. See the section for the statement that you are using (Section 15.2.7, "INSERT Statement", Section 15.2.17, "UPDATE Statement", and so forth).

You can get information about the number of rows actually inserted or updated with the mysql_info() C API function. You can also use the SHOW WARNINGS statement. See mysql_info(), and Section 15.7.7.42, "SHOW WARNINGS Statement".

InnoDB and NDB tables support foreign keys. See Section 1.7.3.2, "FOREIGN KEY Constraints".

\subsection*{1.7.3.2 FOREIGN KEY Constraints}

Foreign keys let you cross-reference related data across tables, and foreign key constraints help keep this spread-out data consistent.

MySQL supports ON UPDATE and ON DELETE foreign key references in CREATE TABLE and ALTER TABLE statements. The available referential actions are RESTRICT, CASCADE, SET NULL, and NO ACTION (the default).

SET DEFAULT is also supported by the MySQL Server but is currently rejected as invalid by InnoDB. Since MySQL does not support deferred constraint checking, NO ACTION is treated as RESTRICT. For the exact syntax supported by MySQL for foreign keys, see Section 15.1.20.5, "FOREIGN KEY Constraints".

MATCH FULL, MATCH PARTIAL, and MATCH SIMPLE are allowed, but their use should be avoided, as they cause the MySQL Server to ignore any ON DELETE or ON UPDATE clause used in the same statement. MATCH options do not have any other effect in MySQL, which in effect enforces MATCH SIMPLE semantics full-time.

MySQL requires that foreign key columns be indexed; if you create a table with a foreign key constraint but no index on a given column, an index is created.

You can obtain information about foreign keys from the Information Schema KEY_COLUMN_USAGE table. An example of a query against this table is shown here:
```
mysql> SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME
        > FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        > WHERE REFERENCED_TABLE_SCHEMA IS NOT NULL;
+---------------+----------------+-------------+-----------------+
    TABLE_SCHEMA | TABLE_NAME | COLUMN_NAME | CONSTRAINT_NAME |
+---------------+----------------+-------------+------------------
    | fk1 | myuser | myuser_id | f
    | fk1 | product_order | customer_id | f2
    | fk1 | product_order | product_id | f1
+---------------+----------------+-------------+------------------
3 rows in set (0.01 sec)
```


Information about foreign keys on InnoDB tables can also be found in the INNODB_FOREIGN and INNODB_FOREIGN_COLS tables, in the INFORMATION_SCHEMA database.

InnoDB and NDB tables support foreign keys.

\subsection*{1.7.3.3 ENUM and SET Constraints}

ENUM and SET columns provide an efficient way to define columns that can contain only a given set of values. See Section 13.3.5, "The ENUM Type", and Section 13.3.6, "The SET Type".

Unless strict mode is disabled (not recommended, but see Section 7.1.11, "Server SQL Modes"), the definition of a ENUM or SET column acts as a constraint on values entered into the column. An error occurs for values that do not satisfy these conditions:
- An ENUM value must be one of those listed in the column definition, or the internal numeric equivalent thereof. The value cannot be the error value (that is, 0 or the empty string). For a column defined as ENUM('a','b','c'), values such as ' ','d ', or 'ax' are invalid and are rejected.
- A SET value must be the empty string or a value consisting only of the values listed in the column definition separated by commas. For a column defined as SET( ' a ' , ' b ' , ' c ' ), values such as ' d ' or ' $\mathrm{a}, \mathrm{b}, \mathrm{c}, \mathrm{d}$ ' are invalid and are rejected.

Errors for invalid values can be suppressed in strict mode if you use INSERT IGNORE or UPDATE IGNORE. In this case, a warning is generated rather than an error. For ENUM, the value is inserted as the error member (0). For SET, the value is inserted as given except that any invalid substrings are deleted. For example, ' $\mathrm{a}, \mathrm{x}, \mathrm{b}, \mathrm{y}$ ' results in a value of ' $\mathrm{a}, \mathrm{b}$ '.

