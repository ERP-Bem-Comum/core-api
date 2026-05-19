\section*{MySQL 8.4 Reference Manual}

\section*{Including MySQL NDB Cluster 8.4}

\begin{abstract}
This is the MySQL Reference Manual. It documents MySQL 8.4 through 8.4.9, as well as NDB Cluster 8.4 through 8.4.9, respectively. It may include documentation of features of MySQL versions that have not yet been released. For information about which versions have been released, see the MySQL 8.4 Release Notes.

MySQL 8.4 features. This manual describes features that are not included in every edition of MySQL 8.4; such features may not be included in the edition of MySQL 8.4 licensed to you. If you have any questions about the features included in your edition of MySQL 8.4, refer to your MySQL 8.4 license agreement or contact your Oracle sales representative.

For notes detailing the changes in each release, see the MySQL 8.4 Release Notes.
For legal information, including licensing information, see the Preface and Legal Notices.
For help with using MySQL, please visit the MySQL Forums, where you can discuss your issues with other MySQL users.

Document generated on: 2026-05-07 (revision: 84608)
\end{abstract}

\section*{Table of Contents}
Preface and Legal Notices ..... xxvii
1 General Information ..... 1
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
2 Installing MySQL ..... 55
2.1 General Installation Guidance ..... 57
2.1.1 Supported Platforms ..... 57
2.1.2 Which MySQL Version and Distribution to Install ..... 57
2.1.3 How to Get MySQL ..... 58
2.1.4 Verifying Package Integrity Using MD5 Checksums or GnuPG ..... 59
2.1.5 Installation Layouts ..... 74
2.1.6 Compiler-Specific Build Characteristics ..... 75
2.2 Installing MySQL on Unix/Linux Using Generic Binaries ..... 75
2.3 Installing MySQL on Microsoft Windows ..... 78
2.3.1 Choosing an Installation Package ..... 81
2.3.2 Configuration: Using MySQL Configurator ..... 82
2.3.3 Configuration: Manually ..... 100
2.3.4 Troubleshooting a Microsoft Windows MySQL Server Installation ..... 108
2.3.5 Windows Postinstallation Procedures ..... 109
2.3.6 Windows Platform Restrictions ..... 111
2.4 Installing MySQL on macOS ..... 113
2.4.1 General Notes on Installing MySQL on macOS ..... 113
2.4.2 Installing MySQL on macOS Using Native Packages ..... 114
2.4.3 Installing and Using the MySQL Launch Daemon ..... 116
2.4.4 Installing and Using the MySQL Preference Pane ..... 119
2.5 Installing MySQL on Linux ..... 123
2.5.1 Installing MySQL on Linux Using the MySQL Yum Repository ..... 124
2.5.2 Installing MySQL on Linux Using the MySQL APT Repository ..... 129
2.5.3 Using the MySQL SLES Repository ..... 138
2.5.4 Installing MySQL on Linux Using RPM Packages from Oracle ..... 143
2.5.5 Installing MySQL on Linux Using Debian Packages from Oracle ..... 148
2.5.6 Deploying MySQL on Linux with Docker Containers ..... 149
2.5.7 Installing MySQL on Linux from the Native Software Repositories ..... 161
2.5.8 Installing MySQL on Linux with Juju ..... 163
2.5.9 Managing MySQL Server with systemd ..... 163
2.6 Installing MySQL Using Unbreakable Linux Network (ULN) ..... 168
2.7 Installing MySQL on Solaris ..... 169
2.7.1 Installing MySQL on Solaris Using a Solaris PKG ..... 169
2.8 Installing MySQL from Source ..... 170
2.8.1 Source Installation Methods ..... 171
2.8.2 Source Installation Prerequisites ..... 171
2.8.3 MySQL Layout for Source Installation ..... 173
2.8.4 Installing MySQL Using a Standard Source Distribution ..... 173
2.8.5 Installing MySQL Using a Development Source Tree ..... 177
2.8.6 Configuring SSL Library Support ..... 178
2.8.7 MySQL Source-Configuration Options ..... 179
2.8.8 Dealing with Problems Compiling MySQL ..... 204
2.8.9 MySQL Configuration and Third-Party Tools ..... 205
2.8.10 Generating MySQL Doxygen Documentation Content ..... 205
2.9 Postinstallation Setup and Testing ..... 206
2.9.1 Initializing the Data Directory ..... 207
2.9.2 Starting the Server ..... 212
2.9.3 Testing the Server ..... 215
2.9.4 Securing the Initial MySQL Account ..... 216
2.9.5 Starting and Stopping MySQL Automatically ..... 218
2.10 Perl Installation Notes ..... 219
2.10.1 Installing Perl on Unix ..... 220
2.10.2 Installing ActiveState Perl on Windows ..... 220
2.10.3 Problems Using the Perl DBI/DBD Interface ..... 221
3 Upgrading MySQL ..... 223
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
4 Downgrading MySQL ..... 245
5 Tutorial ..... 247
5.1 Connecting to and Disconnecting from the Server ..... 247
5.2 Entering Queries ..... 248
5.3 Creating and Using a Database ..... 251
5.3.1 Creating and Selecting a Database ..... 252
5.3.2 Creating a Table ..... 253
5.3.3 Loading Data into a Table ..... 254
5.3.4 Retrieving Information from a Table ..... 255
5.4 Getting Information About Databases and Tables ..... 268
5.5 Using mysql in Batch Mode ..... 269
5.6 Examples of Common Queries ..... 270
5.6.1 The Maximum Value for a Column ..... 271
5.6.2 The Row Holding the Maximum of a Certain Column ..... 271
5.6.3 Maximum of Column per Group ..... 271
5.6.4 The Rows Holding the Group-wise Maximum of a Certain Column ..... 272
5.6.5 Using User-Defined Variables ..... 273
5.6.6 Using Foreign Keys ..... 273
5.6.7 Searching on Two Keys ..... 275
5.6.8 Calculating Visits Per Day ..... 275
5.6.9 Using AUTO_INCREMENT ..... 276
5.7 Using MySQL with Apache ..... 278
6 MySQL Programs ..... 281
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
7 MySQL Server Administration ..... 603
7.1 The MySQL Server ..... 604
7.1.1 Configuring the Server ..... 605
7.1.2 Server Configuration Defaults ..... 606
7.1.3 Server Configuration Validation ..... 606
7.1.4 Server Option, System Variable, and Status Variable Reference ..... 607
7.1.5 Server System Variable Reference ..... 656
7.1.6 Server Status Variable Reference ..... 681
7.1.7 Server Command Options ..... 698
7.1.8 Server System Variables ..... 723
7.1.9 Using System Variables ..... 878
7.1.10 Server Status Variables ..... 909
7.1.11 Server SQL Modes ..... 933
7.1.12 Connection Management ..... 945
7.1.13 IPv6 Support ..... 952
7.1.14 Network Namespace Support ..... 956
7.1.15 MySQL Server Time Zone Support ..... 961
7.1.16 Resource Groups ..... 966
7.1.17 Server-Side Help Support ..... 971
7.1.18 Server Tracking of Client Session State ..... 971
7.1.19 The Server Shutdown Process ..... 975
7.2 The MySQL Data Directory ..... 976
7.3 The mysql System Schema ..... 977
7.4 MySQL Server Logs ..... 982
7.4.1 Selecting General Query Log and Slow Query Log Output Destinations ..... 983
7.4.2 The Error Log ..... 985
7.4.3 The General Query Log ..... 1006
7.4.4 The Binary Log ..... 1008
7.4.5 The Slow Query Log ..... 1024
7.4.6 Server Log Maintenance ..... 1027
7.5 MySQL Components ..... 1029
7.5.1 Installing and Uninstalling Components ..... 1029
7.5.2 Obtaining Component Information ..... 1030
7.5.3 Error Log Components ..... 1030
7.5.4 Query Attribute Components ..... 1033
7.5.5 Scheduler Component ..... 1033
7.6 MySQL Server Plugins ..... 1034
7.6.1 Installing and Uninstalling Plugins ..... 1035
7.6.2 Obtaining Server Plugin Information ..... 1039
7.6.3 MySQL Enterprise Thread Pool ..... 1039
7.6.4 The Rewriter Query Rewrite Plugin ..... 1047
7.6.5 The ddl_rewriter Plugin ..... 1055
7.6.6 Version Tokens ..... 1058
7.6.7 The Clone Plugin ..... 1069
7.6.8 The Keyring Proxy Bridge Plugin ..... 1093
7.6.9 MySQL Plugin Services ..... 1093
7.7 MySQL Server Loadable Functions ..... 1100
7.7.1 Installing and Uninstalling Loadable Functions ..... 1101
7.7.2 Obtaining Information About Loadable Functions ..... 1103
7.8 Running Multiple MySQL Instances on One Machine ..... 1103
7.8.1 Setting Up Multiple Data Directories ..... 1104
7.8.2 Running Multiple MySQL Instances on Windows ..... 1105
7.8.3 Running Multiple MySQL Instances on Unix ..... 1108
7.8.4 Using Client Programs in a Multiple-Server Environment ..... 1109
7.9 Debugging MySQL ..... 1110
7.9.1 Debugging a MySQL Server ..... 1110
7.9.2 Debugging a MySQL Client ..... 1115
7.9.3 The LOCK_ORDER Tool ..... 1116
7.9.4 The DBUG Package ..... 1121
8 Security ..... 1125
8.1 General Security Issues ..... 1126
8.1.1 Security Guidelines ..... 1126
8.1.2 Keeping Passwords Secure ..... 1128
8.1.3 Making MySQL Secure Against Attackers ..... 1131
8.1.4 Security-Related mysqld Options and Variables ..... 1132
8.1.5 How to Run MySQL as a Normal User ..... 1133
8.1.6 Security Considerations for LOAD DATA LOCAL ..... 1134
8.1.7 Client Programming Security Guidelines ..... 1137
8.2 Access Control and Account Management ..... 1139
8.2.1 Account User Names and Passwords ..... 1140
8.2.2 Privileges Provided by MySQL ..... 1141
8.2.3 Grant Tables ..... 1161
8.2.4 Specifying Account Names ..... 1170
8.2.5 Specifying Role Names ..... 1172
8.2.6 Access Control, Stage 1: Connection Verification ..... 1173
8.2.7 Access Control, Stage 2: Request Verification ..... 1176
8.2.8 Adding Accounts, Assigning Privileges, and Dropping Accounts ..... 1178
8.2.9 Reserved Accounts ..... 1181
8.2.10 Using Roles ..... 1181
8.2.11 Account Categories ..... 1188
8.2.12 Privilege Restriction Using Partial Revokes ..... 1191
8.2.13 When Privilege Changes Take Effect ..... 1197
8.2.14 Assigning Account Passwords ..... 1198
8.2.15 Password Management ..... 1199
8.2.16 Server Handling of Expired Passwords ..... 1210
8.2.17 Pluggable Authentication ..... 1212
8.2.18 Multifactor Authentication ..... 1218
8.2.19 Proxy Users ..... 1221
8.2.20 Account Locking ..... 1229
8.2.21 Setting Account Resource Limits ..... 1229
8.2.22 Troubleshooting Problems Connecting to MySQL ..... 1231
8.2.23 SQL-Based Account Activity Auditing ..... 1235
8.3 Using Encrypted Connections ..... 1237
8.3.1 Configuring MySQL to Use Encrypted Connections ..... 1238
8.3.2 Encrypted Connection TLS Protocols and Ciphers ..... 1246
8.3.3 Creating SSL and RSA Certificates and Keys ..... 1252
8.3.4 Connecting to MySQL Remotely from Windows with SSH ..... 1260
8.3.5 Reusing SSL Sessions ..... 1261
8.4 Security Components and Plugins ..... 1263
8.4.1 Authentication Plugins ..... 1264
8.4.2 Connection Control Plugins ..... 1357
8.4.3 The Password Validation Component ..... 1363
8.4.4 The MySQL Keyring ..... 1375
8.4.5 MySQL Enterprise Audit ..... 1434
8.4.6 The Audit Message Component ..... 1517
8.4.7 MySQL Enterprise Firewall ..... 1520
8.5 MySQL Enterprise Data Masking and De-Identification ..... 1549
8.5.1 Data-Masking Components Versus the Data-Masking Plugin ..... 1551
8.5.2 MySQL Enterprise Data Masking and De-Identification Components ..... 1551
8.5.3 MySQL Enterprise Data Masking and De-Identification Plugin ..... 1577
8.6 MySQL Enterprise Encryption ..... 1593
8.6.1 MySQL Enterprise Encryption Installation and Upgrading ..... 1594
8.6.2 Configuring MySQL Enterprise Encryption ..... 1595
8.6.3 MySQL Enterprise Encryption Usage and Examples ..... 1595
8.6.4 MySQL Enterprise Encryption Function Reference ..... 1597
8.6.5 MySQL Enterprise Encryption Component Function Descriptions ..... 1597
8.7 SELinux ..... 1601
8.7.1 Check if SELinux is Enabled ..... 1602
8.7.2 Changing the SELinux Mode ..... 1602
8.7.3 MySQL Server SELinux Policies ..... 1602
8.7.4 SELinux File Context ..... 1603
8.7.5 SELinux TCP Port Context ..... 1604
8.7.6 Troubleshooting SELinux ..... 1605
8.8 FIPS Support ..... 1606
9 Backup and Recovery ..... 1609
9.1 Backup and Recovery Types ..... 1610
9.2 Database Backup Methods ..... 1613
9.3 Example Backup and Recovery Strategy ..... 1615
9.3.1 Establishing a Backup Policy ..... 1615
9.3.2 Using Backups for Recovery ..... 1617
9.3.3 Backup Strategy Summary ..... 1618
9.4 Using mysqldump for Backups ..... 1618
9.4.1 Dumping Data in SQL Format with mysqldump ..... 1619
9.4.2 Reloading SQL-Format Backups ..... 1620
9.4.3 Dumping Data in Delimited-Text Format with mysqldump ..... 1620
9.4.4 Reloading Delimited-Text Format Backups ..... 1621
9.4.5 mysqldump Tips ..... 1622
9.5 Point-in-Time (Incremental) Recovery ..... 1624
9.5.1 Point-in-Time Recovery Using Binary Log ..... 1624
9.5.2 Point-in-Time Recovery Using Event Positions ..... 1625
9.6 MyISAM Table Maintenance and Crash Recovery ..... 1627
9.6.1 Using myisamchk for Crash Recovery ..... 1627
9.6.2 How to Check MyISAM Tables for Errors ..... 1628
9.6.3 How to Repair MyISAM Tables ..... 1629
9.6.4 MyISAM Table Optimization ..... 1631
9.6.5 Setting Up a MyISAM Table Maintenance Schedule ..... 1631
10 Optimization ..... 1633
10.1 Optimization Overview ..... 1635
10.2 Optimizing SQL Statements ..... 1636
10.2.1 Optimizing SELECT Statements ..... 1636
10.2.2 Optimizing Subqueries, Derived Tables, View References, and Common Table Expressions ..... 1686
10.2.3 Optimizing INFORMATION_SCHEMA Queries ..... 1699
10.2.4 Optimizing Performance Schema Queries ..... 1702
10.2.5 Optimizing Data Change Statements ..... 1704
10.2.6 Optimizing Database Privileges ..... 1705
10.2.7 Other Optimization Tips ..... 1705
10.3 Optimization and Indexes ..... 1706
10.3.1 How MySQL Uses Indexes ..... 1706
10.3.2 Primary Key Optimization ..... 1707
10.3.3 SPATIAL Index Optimization ..... 1707
10.3.4 Foreign Key Optimization ..... 1708
10.3.5 Column Indexes ..... 1708
10.3.6 Multiple-Column Indexes ..... 1709
10.3.7 Verifying Index Usage ..... 1711
10.3.8 InnoDB and MyISAM Index Statistics Collection ..... 1711
10.3.9 Comparison of B-Tree and Hash Indexes ..... 1712
10.3.10 Use of Index Extensions ..... 1714
10.3.11 Optimizer Use of Generated Column Indexes ..... 1716
10.3.12 Invisible Indexes ..... 1717
10.3.13 Descending Indexes ..... 1719
10.3.14 Indexed Lookups from TIMESTAMP Columns ..... 1721
10.4 Optimizing Database Structure ..... 1723
10.4.1 Optimizing Data Size ..... 1723
10.4.2 Optimizing MySQL Data Types ..... 1725
10.4.3 Optimizing for Many Tables ..... 1726
10.4.4 Internal Temporary Table Use in MySQL ..... 1727
10.4.5 Limits on Number of Databases and Tables ..... 1731
10.4.6 Limits on Table Size ..... 1731
10.4.7 Limits on Table Column Count and Row Size ..... 1732
10.5 Optimizing for InnoDB Tables ..... 1735
10.5.1 Optimizing Storage Layout for InnoDB Tables ..... 1735
10.5.2 Optimizing InnoDB Transaction Management ..... 1735
10.5.3 Optimizing InnoDB Read-Only Transactions ..... 1736
10.5.4 Optimizing InnoDB Redo Logging ..... 1737
10.5.5 Bulk Data Loading for InnoDB Tables ..... 1738
10.5.6 Optimizing InnoDB Queries ..... 1740
10.5.7 Optimizing InnoDB DDL Operations ..... 1740
10.5.8 Optimizing InnoDB Disk I/O ..... 1740
10.5.9 Optimizing InnoDB Configuration Variables ..... 1744
10.5.10 Optimizing InnoDB for Systems with Many Tables ..... 1745
10.6 Optimizing for MyISAM Tables ..... 1745
10.6.1 Optimizing MyISAM Queries ..... 1745
10.6.2 Bulk Data Loading for MyISAM Tables ..... 1747
10.6.3 Optimizing REPAIR TABLE Statements ..... 1748
10.7 Optimizing for MEMORY Tables ..... 1749
10.8 Understanding the Query Execution Plan ..... 1750
10.8.1 Optimizing Queries with EXPLAIN ..... 1750
10.8.2 EXPLAIN Output Format ..... 1751
10.8.3 Extended EXPLAIN Output Format ..... 1764
10.8.4 Obtaining Execution Plan Information for a Named Connection ..... 1766
10.8.5 Estimating Query Performance ..... 1767
10.9 Controlling the Query Optimizer ..... 1767
10.9.1 Controlling Query Plan Evaluation ..... 1767
10.9.2 Switchable Optimizations ..... 1768
10.9.3 Optimizer Hints ..... 1778
10.9.4 Index Hints ..... 1792
10.9.5 The Optimizer Cost Model ..... 1794
10.9.6 Optimizer Statistics ..... 1798
10.10 Buffering and Caching ..... 1801
10.10.1 InnoDB Buffer Pool Optimization ..... 1801
10.10.2 The MyISAM Key Cache ..... 1801
10.10.3 Caching of Prepared Statements and Stored Programs ..... 1805
10.11 Optimizing Locking Operations ..... 1807
10.11.1 Internal Locking Methods ..... 1807
10.11.2 Table Locking Issues ..... 1809
10.11.3 Concurrent Inserts ..... 1811
10.11.4 Metadata Locking ..... 1811
10.11.5 External Locking ..... 1814
10.12 Optimizing the MySQL Server ..... 1815
10.12.1 Optimizing Disk I/O ..... 1815
10.12.2 Using Symbolic Links ..... 1817
10.12.3 Optimizing Memory Use ..... 1820
10.13 Measuring Performance (Benchmarking) ..... 1826
10.13.1 Measuring the Speed of Expressions and Functions ..... 1827
10.13.2 Using Your Own Benchmarks ..... 1827
10.13.3 Measuring Performance with performance_schema ..... 1827
10.14 Examining Server Thread (Process) Information ..... 1828
10.14.1 Accessing the Process List ..... 1828
10.14.2 Thread Command Values ..... 1830
10.14.3 General Thread States ..... 1832
10.14.4 Replication Source Thread States ..... 1838
10.14.5 Replication I/O (Receiver) Thread States ..... 1839
10.14.6 Replication SQL Thread States ..... 1840
10.14.7 Replication Connection Thread States ..... 1842
10.14.8 NDB Cluster Thread States ..... 1842
10.14.9 Event Scheduler Thread States ..... 1843
10.15 Tracing the Optimizer ..... 1843
10.15.1 Typical Usage ..... 1843
10.15.2 System Variables Controlling Tracing ..... 1843
10.15.3 Traceable Statements ..... 1844
10.15.4 Tuning Trace Purging ..... 1845
10.15.5 Tracing Memory Usage ..... 1846
10.15.6 Privilege Checking ..... 1846
10.15.7 Interaction with the --debug Option ..... 1846
10.15.8 The optimizer_trace System Variable ..... 1846
10.15.9 The end_markers_in_json System Variable ..... 1846
10.15.10 Selecting Optimizer Features to Trace ..... 1846
10.15.11 Trace General Structure ..... 1847
10.15.12 Example ..... 1847
10.15.13 Displaying Traces in Other Applications ..... 1857
10.15.14 Preventing the Use of Optimizer Trace ..... 1857
10.15.15 Testing Optimizer Trace ..... 1858
10.15.16 Optimizer Trace Implementation ..... 1858
11 Language Structure ..... 1859
11.1 Literal Values ..... 1859
11.1.1 String Literals ..... 1859
11.1.2 Numeric Literals ..... 1862
11.1.3 Date and Time Literals ..... 1862
11.1.4 Hexadecimal Literals ..... 1867
11.1.5 Bit-Value Literals ..... 1869
11.1.6 Boolean Literals ..... 1871
11.1.7 NULL Values ..... 1871
11.2 Schema Object Names ..... 1871
11.2.1 Identifier Length Limits ..... 1873
11.2.2 Identifier Qualifiers ..... 1874
11.2.3 Identifier Case Sensitivity ..... 1875
11.2.4 Mapping of Identifiers to File Names ..... 1877
11.2.5 Function Name Parsing and Resolution ..... 1879
11.3 Keywords and Reserved Words ..... 1882
11.4 User-Defined Variables ..... 1910
11.5 Expressions ..... 1913
11.6 Query Attributes ..... 1917
11.7 Comments ..... 1920
12 Character Sets, Collations, Unicode ..... 1923
12.1 Character Sets and Collations in General ..... 1924
12.2 Character Sets and Collations in MySQL ..... 1925
12.2.1 Character Set Repertoire ..... 1927
12.2.2 UTF-8 for Metadata ..... 1929
12.3 Specifying Character Sets and Collations ..... 1930
12.3.1 Collation Naming Conventions ..... 1930
12.3.2 Server Character Set and Collation ..... 1931
12.3.3 Database Character Set and Collation ..... 1932
12.3.4 Table Character Set and Collation ..... 1933
12.3.5 Column Character Set and Collation ..... 1934
12.3.6 Character String Literal Character Set and Collation ..... 1935
12.3.7 The National Character Set ..... 1937
12.3.8 Character Set Introducers ..... 1937
12.3.9 Examples of Character Set and Collation Assignment ..... 1939
12.3.10 Compatibility with Other DBMSs ..... 1940
12.4 Connection Character Sets and Collations ..... 1940
12.5 Configuring Application Character Set and Collation ..... 1945
12.6 Error Message Character Set ..... 1947
12.7 Column Character Set Conversion ..... 1948
12.8 Collation Issues ..... 1949
12.8.1 Using COLLATE in SQL Statements ..... 1949
12.8.2 COLLATE Clause Precedence ..... 1950
12.8.3 Character Set and Collation Compatibility ..... 1950
12.8.4 Collation Coercibility in Expressions ..... 1950
12.8.5 The binary Collation Compared to _bin Collations ..... 1952
12.8.6 Examples of the Effect of Collation ..... 1954
12.8.7 Using Collation in INFORMATION_SCHEMA Searches ..... 1955
12.9 Unicode Support ..... 1957
12.9.1 The utf8mb4 Character Set (4-Byte UTF-8 Unicode Encoding) ..... 1959
12.9.2 The utf8mb3 Character Set (3-Byte UTF-8 Unicode Encoding) ..... 1960
12.9.3 The utf8 Character Set (Deprecated alias for utf8mb3) ..... 1961
12.9.4 The ucs2 Character Set (UCS-2 Unicode Encoding) ..... 1961
12.9.5 The utf16 Character Set (UTF-16 Unicode Encoding) ..... 1961
12.9.6 The utf16le Character Set (UTF-16LE Unicode Encoding) ..... 1962
12.9.7 The utf32 Character Set (UTF-32 Unicode Encoding) ..... 1962
12.9.8 Converting Between 3-Byte and 4-Byte Unicode Character Sets ..... 1962
12.10 Supported Character Sets and Collations ..... 1965
12.10.1 Unicode Character Sets ..... 1965
12.10.2 West European Character Sets ..... 1973
12.10.3 Central European Character Sets ..... 1974
12.10.4 South European and Middle East Character Sets ..... 1975
12.10.5 Baltic Character Sets ..... 1976
12.10.6 Cyrillic Character Sets ..... 1976
12.10.7 Asian Character Sets ..... 1977
12.10.8 The Binary Character Set ..... 1981
12.11 Restrictions on Character Sets ..... 1982
12.12 Setting the Error Message Language ..... 1982
12.13 Adding a Character Set ..... 1983
12.13.1 Character Definition Arrays ..... 1985
12.13.2 String Collating Support for Complex Character Sets ..... 1986
12.13.3 Multi-Byte Character Support for Complex Character Sets ..... 1986
12.14 Adding a Collation to a Character Set ..... 1986
12.14.1 Collation Implementation Types ..... 1987
12.14.2 Choosing a Collation ID ..... 1990
12.14.3 Adding a Simple Collation to an 8-Bit Character Set ..... 1991
12.14.4 Adding a UCA Collation to a Unicode Character Set ..... 1992
12.15 Character Set Configuration ..... 1998
12.16 MySQL Server Locale Support ..... 1999
13 Data Types ..... 2005
13.1 Numeric Data Types ..... 2006
13.1.1 Numeric Data Type Syntax ..... 2006
13.1.2 Integer Types (Exact Value) - INTEGER, INT, SMALLINT, TINYINT, MEDIUMINT, BIGINT ..... 2010
13.1.3 Fixed-Point Types (Exact Value) - DECIMAL, NUMERIC ..... 2010
13.1.4 Floating-Point Types (Approximate Value) - FLOAT, DOUBLE ..... 2011
13.1.5 Bit-Value Type - BIT ..... 2011
13.1.6 Numeric Type Attributes ..... 2011
13.1.7 Out-of-Range and Overflow Handling ..... 2013
13.2 Date and Time Data Types ..... 2014
13.2.1 Date and Time Data Type Syntax ..... 2015
13.2.2 The DATE, DATETIME, and TIMESTAMP Types ..... 2017
13.2.3 The TIME Type ..... 2019
13.2.4 The YEAR Type ..... 2019
13.2.5 Automatic Initialization and Updating for TIMESTAMP and DATETIME ..... 2020
13.2.6 Fractional Seconds in Time Values ..... 2023
13.2.7 What Calendar Is Used By MySQL? ..... 2024
13.2.8 Conversion Between Date and Time Types ..... 2025
13.2.9 2-Digit Years in Dates ..... 2026
13.3 String Data Types ..... 2026
13.3.1 String Data Type Syntax ..... 2026
13.3.2 The CHAR and VARCHAR Types ..... 2030
13.3.3 The BINARY and VARBINARY Types ..... 2031
13.3.4 The BLOB and TEXT Types ..... 2032
13.3.5 The ENUM Type ..... 2034
13.3.6 The SET Type ..... 2037
13.4 Spatial Data Types ..... 2039
13.4.1 Spatial Data Types ..... 2041
13.4.2 The OpenGIS Geometry Model ..... 2042
13.4.3 Supported Spatial Data Formats ..... 2047
13.4.4 Geometry Well-Formedness and Validity ..... 2050
13.4.5 Spatial Reference System Support ..... 2051
13.4.6 Creating Spatial Columns ..... 2052
13.4.7 Populating Spatial Columns ..... 2052
13.4.8 Fetching Spatial Data ..... 2053
13.4.9 Optimizing Spatial Analysis ..... 2054
13.4.10 Creating Spatial Indexes ..... 2054
13.4.11 Using Spatial Indexes ..... 2055
13.5 The JSON Data Type ..... 2057
13.6 Data Type Default Values ..... 2072
13.7 Data Type Storage Requirements ..... 2075
13.8 Choosing the Right Type for a Column ..... 2079
13.9 Using Data Types from Other Database Engines ..... 2079
14 Functions and Operators ..... 2081
14.1 Built-In Function and Operator Reference ..... 2083
14.2 Loadable Function Reference ..... 2100
14.3 Type Conversion in Expression Evaluation ..... 2104
14.4 Operators ..... 2108
14.4.1 Operator Precedence ..... 2109
14.4.2 Comparison Functions and Operators ..... 2110
14.4.3 Logical Operators ..... 2117
14.4.4 Assignment Operators ..... 2118
14.5 Flow Control Functions ..... 2120
14.6 Numeric Functions and Operators ..... 2122
14.6.1 Arithmetic Operators ..... 2123
14.6.2 Mathematical Functions ..... 2125
14.7 Date and Time Functions ..... 2134
14.8 String Functions and Operators ..... 2157
14.8.1 String Comparison Functions and Operators ..... 2172
14.8.2 Regular Expressions ..... 2176
14.8.3 Character Set and Collation of Function Results ..... 2183
14.9 Full-Text Search Functions ..... 2184
14.9.1 Natural Language Full-Text Searches ..... 2186
14.9.2 Boolean Full-Text Searches ..... 2189
14.9.3 Full-Text Searches with Query Expansion ..... 2194
14.9.4 Full-Text Stopwords ..... 2195
14.9.5 Full-Text Restrictions ..... 2199
14.9.6 Fine-Tuning MySQL Full-Text Search ..... 2200
14.9.7 Adding a User-Defined Collation for Full-Text Indexing ..... 2203
14.9.8 ngram Full-Text Parser ..... 2205
14.9.9 MeCab Full-Text Parser Plugin ..... 2207
14.10 Cast Functions and Operators ..... 2211
14.11 XML Functions ..... 2225
14.12 Bit Functions and Operators ..... 2235
14.13 Encryption and Compression Functions ..... 2245
14.14 Locking Functions ..... 2253
14.15 Information Functions ..... 2255
14.16 Spatial Analysis Functions ..... 2266
14.16.1 Spatial Function Reference ..... 2267
14.16.2 Argument Handling by Spatial Functions ..... 2269
14.16.3 Functions That Create Geometry Values from WKT Values ..... 2270
14.16.4 Functions That Create Geometry Values from WKB Values ..... 2272
14.16.5 MySQL-Specific Functions That Create Geometry Values ..... 2274
14.16.6 Geometry Format Conversion Functions ..... 2275
14.16.7 Geometry Property Functions ..... 2277
14.16.8 Spatial Operator Functions ..... 2289
14.16.9 Functions That Test Spatial Relations Between Geometry Objects ..... 2296
14.16.10 Spatial Geohash Functions ..... 2307
14.16.11 Spatial GeoJSON Functions ..... 2309
14.16.12 Spatial Aggregate Functions ..... 2311
14.16.13 Spatial Convenience Functions ..... 2313
14.17 JSON Functions ..... 2316
14.17.1 JSON Function Reference ..... 2317
14.17.2 Functions That Create JSON Values ..... 2319
14.17.3 Functions That Search JSON Values ..... 2320
14.17.4 Functions That Modify JSON Values ..... 2334
14.17.5 Functions That Return JSON Value Attributes ..... 2343
14.17.6 JSON Table Functions ..... 2345
14.17.7 JSON Schema Validation Functions ..... 2350
14.17.8 JSON Utility Functions ..... 2356
14.18 Replication Functions ..... 2361
14.18.1 Group Replication Functions ..... 2362
14.18.2 Functions Used with Global Transaction Identifiers (GTIDs) ..... 2370
14.18.3 Asynchronous Replication Channel Failover Functions ..... 2372
14.18.4 Position-Based Synchronization Functions ..... 2377
14.19 Aggregate Functions ..... 2378
14.19.1 Aggregate Function Descriptions ..... 2378
14.19.2 GROUP BY Modifiers ..... 2388
14.19.3 MySQL Handling of GROUP BY ..... 2394
14.19.4 Detection of Functional Dependence ..... 2397
14.20 Window Functions ..... 2400
14.20.1 Window Function Descriptions ..... 2401
14.20.2 Window Function Concepts and Syntax ..... 2407
14.20.3 Window Function Frame Specification ..... 2411
14.20.4 Named Windows ..... 2414
14.20.5 Window Function Restrictions ..... 2415
14.21 Performance Schema Functions ..... 2416
14.22 Internal Functions ..... 2419
14.23 Miscellaneous Functions ..... 2420
14.24 Precision Math ..... 2434
14.24.1 Types of Numeric Values ..... 2434
14.24.2 DECIMAL Data Type Characteristics ..... 2435
14.24.3 Expression Handling ..... 2436
14.24.4 Rounding Behavior ..... 2437
14.24.5 Precision Math Examples ..... 2438
15 SQL Statements ..... 2443
15.1 Data Definition Statements ..... 2444
15.1.1 Atomic Data Definition Statement Support ..... 2444
15.1.2 ALTER DATABASE Statement ..... 2448
15.1.3 ALTER EVENT Statement ..... 2453
15.1.4 ALTER FUNCTION Statement ..... 2455
15.1.5 ALTER INSTANCE Statement ..... 2455
15.1.6 ALTER LOGFILE GROUP Statement ..... 2457
15.1.7 ALTER PROCEDURE Statement ..... 2458
15.1.8 ALTER SERVER Statement ..... 2459
15.1.9 ALTER TABLE Statement ..... 2459
15.1.10 ALTER TABLESPACE Statement ..... 2482
15.1.11 ALTER VIEW Statement ..... 2484
15.1.12 CREATE DATABASE Statement ..... 2484
15.1.13 CREATE EVENT Statement ..... 2485
15.1.14 CREATE FUNCTION Statement ..... 2489
15.1.15 CREATE INDEX Statement ..... 2489
15.1.16 CREATE LOGFILE GROUP Statement ..... 2503
15.1.17 CREATE PROCEDURE and CREATE FUNCTION Statements ..... 2505
15.1.18 CREATE SERVER Statement ..... 2510
15.1.19 CREATE SPATIAL REFERENCE SYSTEM Statement ..... 2511
15.1.20 CREATE TABLE Statement ..... 2516
15.1.21 CREATE TABLESPACE Statement ..... 2574
15.1.22 CREATE TRIGGER Statement ..... 2581
15.1.23 CREATE VIEW Statement ..... 2584
15.1.24 DROP DATABASE Statement ..... 2587
15.1.25 DROP EVENT Statement ..... 2588
15.1.26 DROP FUNCTION Statement ..... 2588
15.1.27 DROP INDEX Statement ..... 2589
15.1.28 DROP LOGFILE GROUP Statement ..... 2589
15.1.29 DROP PROCEDURE and DROP FUNCTION Statements ..... 2589
15.1.30 DROP SERVER Statement ..... 2590
15.1.31 DROP SPATIAL REFERENCE SYSTEM Statement ..... 2590
15.1.32 DROP TABLE Statement ..... 2591
15.1.33 DROP TABLESPACE Statement ..... 2592
15.1.34 DROP TRIGGER Statement ..... 2593
15.1.35 DROP VIEW Statement ..... 2593
15.1.36 RENAME TABLE Statement ..... 2593
15.1.37 TRUNCATE TABLE Statement ..... 2595
15.2 Data Manipulation Statements ..... 2596
15.2.1 CALL Statement ..... 2596
15.2.2 DELETE Statement ..... 2598
15.2.3 DO Statement ..... 2602
15.2.4 EXCEPT Clause ..... 2602
15.2.5 HANDLER Statement ..... 2603
15.2.6 IMPORT TABLE Statement ..... 2605
15.2.7 INSERT Statement ..... 2607
15.2.8 INTERSECT Clause ..... 2617
15.2.9 LOAD DATA Statement ..... 2618
15.2.10 LOAD XML Statement ..... 2629
15.2.11 Parenthesized Query Expressions ..... 2636
15.2.12 REPLACE Statement ..... 2638
15.2.13 SELECT Statement ..... 2641
15.2.14 Set Operations with UNION, INTERSECT, and EXCEPT ..... 2656
15.2.15 Subqueries ..... 2661
15.2.16 TABLE Statement ..... 2676
15.2.17 UPDATE Statement ..... 2679
15.2.18 UNION Clause ..... 2682
15.2.19 VALUES Statement ..... 2683
15.2.20 WITH (Common Table Expressions) ..... 2685
15.3 Transactional and Locking Statements ..... 2696
15.3.1 START TRANSACTION, COMMIT, and ROLLBACK Statements ..... 2696
15.3.2 Statements That Cannot Be Rolled Back ..... 2699
15.3.3 Statements That Cause an Implicit Commit ..... 2699
15.3.4 SAVEPOINT, ROLLBACK TO SAVEPOINT, and RELEASE SAVEPOINT Statements ..... 2700
15.3.5 LOCK INSTANCE FOR BACKUP and UNLOCK INSTANCE Statements ..... 2701
15.3.6 LOCK TABLES and UNLOCK TABLES Statements ..... 2702
15.3.7 SET TRANSACTION Statement ..... 2707
15.3.8 XA Transactions ..... 2710
15.4 Replication Statements ..... 2715
15.4.1 SQL Statements for Controlling Source Servers ..... 2715
15.4.2 SQL Statements for Controlling Replica Servers ..... 2718
15.4.3 SQL Statements for Controlling Group Replication ..... 2740
15.5 Prepared Statements ..... 2742
15.5.1 PREPARE Statement ..... 2745
15.5.2 EXECUTE Statement ..... 2747
15.5.3 DEALLOCATE PREPARE Statement ..... 2747
15.6 Compound Statement Syntax ..... 2748
15.6.1 BEGIN ... END Compound Statement ..... 2748
15.6.2 Statement Labels ..... 2748
15.6.3 DECLARE Statement ..... 2749
15.6.4 Variables in Stored Programs ..... 2749
15.6.5 Flow Control Statements ..... 2751
15.6.6 Cursors ..... 2755
15.6.7 Condition Handling ..... 2757
15.6.8 Restrictions on Condition Handling ..... 2782
15.7 Database Administration Statements ..... 2782
15.7.1 Account Management Statements ..... 2782
15.7.2 Resource Group Management Statements ..... 2834
15.7.3 Table Maintenance Statements ..... 2837
15.7.4 Component, Plugin, and Loadable Function Statements ..... 2852
15.7.5 CLONE Statement ..... 2857
15.7.6 SET Statements ..... 2858
15.7.7 SHOW Statements ..... 2863
15.7.8 Other Administrative Statements ..... 2918
15.8 Utility Statements ..... 2931
15.8.1 DESCRIBE Statement ..... 2931
15.8.2 EXPLAIN Statement ..... 2931
15.8.3 HELP Statement ..... 2940
15.8.4 USE Statement ..... 2942
16 MySQL Data Dictionary ..... 2943
16.1 Data Dictionary Schema ..... 2943
16.2 Removal of File-based Metadata Storage ..... 2944
16.3 Transactional Storage of Dictionary Data ..... 2945
16.4 Dictionary Object Cache ..... 2945
16.5 INFORMATION_SCHEMA and Data Dictionary Integration ..... 2946
16.6 Serialized Dictionary Information (SDI) ..... 2948
16.7 Data Dictionary Usage Differences ..... 2948
16.8 Data Dictionary Limitations ..... 2950
17 The InnoDB Storage Engine ..... 2951
17.1 Introduction to InnoDB ..... 2952
17.1.1 Benefits of Using InnoDB Tables ..... 2954
17.1.2 Best Practices for InnoDB Tables ..... 2955
17.1.3 Verifying that InnoDB is the Default Storage Engine ..... 2955
17.1.4 Testing and Benchmarking with InnoDB ..... 2955
17.2 InnoDB and the ACID Model ..... 2956
17.3 InnoDB Multi-Versioning ..... 2957
17.4 InnoDB Architecture ..... 2958
17.5 InnoDB In-Memory Structures ..... 2959
17.5.1 Buffer Pool ..... 2959
17.5.2 Change Buffer ..... 2964
17.5.3 Adaptive Hash Index ..... 2967
17.5.4 Log Buffer ..... 2967
17.6 InnoDB On-Disk Structures ..... 2968
17.6.1 Tables ..... 2968
17.6.2 Indexes ..... 2992
17.6.3 Tablespaces ..... 2999
17.6.4 Doublewrite Buffer ..... 3019
17.6.5 Redo Log ..... 3021
17.6.6 Undo Logs ..... 3027
17.7 InnoDB Locking and Transaction Model ..... 3029
17.7.1 InnoDB Locking ..... 3029
17.7.2 InnoDB Transaction Model ..... 3033
17.7.3 Locks Set by Different SQL Statements in InnoDB ..... 3042
17.7.4 Phantom Rows ..... 3045
17.7.5 Deadlocks in InnoDB ..... 3046
17.7.6 Transaction Scheduling ..... 3052
17.8 InnoDB Configuration ..... 3052
17.8.1 InnoDB Startup Configuration ..... 3052
17.8.2 Configuring InnoDB for Read-Only Operation ..... 3058
17.8.3 InnoDB Buffer Pool Configuration ..... 3060
17.8.4 Configuring Thread Concurrency for InnoDB ..... 3074
17.8.5 Configuring the Number of Background InnoDB I/O Threads ..... 3075
17.8.6 Using Asynchronous I/O on Linux ..... 3076
17.8.7 Configuring InnoDB I/O Capacity ..... 3076
17.8.8 Configuring Spin Lock Polling ..... 3078
17.8.9 Purge Configuration ..... 3079
17.8.10 Configuring Optimizer Statistics for InnoDB ..... 3080
17.8.11 Configuring the Merge Threshold for Index Pages ..... 3091
17.8.12 Enabling Automatic InnoDB Configuration for a Dedicated MySQL Server ..... 3093
17.9 InnoDB Table and Page Compression ..... 3095
17.9.1 InnoDB Table Compression ..... 3095
17.9.2 InnoDB Page Compression ..... 3109
17.10 InnoDB Row Formats ..... 3112
17.11 InnoDB Disk I/O and File Space Management ..... 3118
17.11.1 InnoDB Disk I/O ..... 3119
17.11.2 File Space Management ..... 3119
17.11.3 InnoDB Checkpoints ..... 3121
17.11.4 Defragmenting a Table ..... 3121
17.11.5 Reclaiming Disk Space with TRUNCATE TABLE ..... 3122
17.12 InnoDB and Online DDL ..... 3122
17.12.1 Online DDL Operations ..... 3123
17.12.2 Online DDL Performance and Concurrency ..... 3138
17.12.3 Online DDL Space Requirements ..... 3141
17.12.4 Online DDL Memory Management ..... 3142
17.12.5 Configuring Parallel Threads for Online DDL Operations ..... 3142
17.12.6 Simplifying DDL Statements with Online DDL ..... 3143
17.12.7 Online DDL Failure Conditions ..... 3143
17.12.8 Online DDL Limitations ..... 3144
17.13 InnoDB Data-at-Rest Encryption ..... 3144
17.14 InnoDB Startup Options and System Variables ..... 3153
17.15 InnoDB INFORMATION_SCHEMA Tables ..... 3237
17.15.1 InnoDB INFORMATION_SCHEMA Tables about Compression ..... 3237
17.15.2 InnoDB INFORMATION_SCHEMA Transaction and Locking Information ..... 3239
17.15.3 InnoDB INFORMATION_SCHEMA Schema Object Tables ..... 3246
17.15.4 InnoDB INFORMATION_SCHEMA FULLTEXT Index Tables ..... 3251
17.15.5 InnoDB INFORMATION_SCHEMA Buffer Pool Tables ..... 3254
17.15.6 InnoDB INFORMATION_SCHEMA Metrics Table ..... 3258
17.15.7 InnoDB INFORMATION_SCHEMA Temporary Table Info Table ..... 3267
17.15.8 Retrieving InnoDB Tablespace Metadata from INFORMATION_SCHEMA.FILES ..... 3268
17.16 InnoDB Integration with MySQL Performance Schema ..... 3269
17.16.1 Monitoring ALTER TABLE Progress for InnoDB Tables Using Performance Schema ..... 3271
17.16.2 Monitoring InnoDB Mutex Waits Using Performance Schema ..... 3273
17.17 InnoDB Monitors ..... 3276
17.17.1 InnoDB Monitor Types ..... 3277
17.17.2 Enabling InnoDB Monitors ..... 3277
17.17.3 InnoDB Standard Monitor and Lock Monitor Output ..... 3279
17.18 InnoDB Backup and Recovery ..... 3283
17.18.1 InnoDB Backup ..... 3283
17.18.2 InnoDB Recovery ..... 3284
17.19 InnoDB and MySQL Replication ..... 3286
17.20 InnoDB Troubleshooting ..... 3288
17.20.1 Troubleshooting InnoDB I/O Problems ..... 3288
17.20.2 Troubleshooting Recovery Failures ..... 3289
17.20.3 Forcing InnoDB Recovery ..... 3289
17.20.4 Troubleshooting InnoDB Data Dictionary Operations ..... 3291
17.20.5 InnoDB Error Handling ..... 3292
17.21 InnoDB Limits ..... 3292
17.22 InnoDB Restrictions and Limitations ..... 3294
18 Alternative Storage Engines ..... 3295
18.1 Setting the Storage Engine ..... 3298
18.2 The MyISAM Storage Engine ..... 3299
18.2.1 MyISAM Startup Options ..... 3302
18.2.2 Space Needed for Keys ..... 3303
18.2.3 MyISAM Table Storage Formats ..... 3303
18.2.4 MyISAM Table Problems ..... 3306
18.3 The MEMORY Storage Engine ..... 3307
18.4 The CSV Storage Engine ..... 3312
18.4.1 Repairing and Checking CSV Tables ..... 3312
18.4.2 CSV Limitations ..... 3313
18.5 The ARCHIVE Storage Engine ..... 3313
18.6 The BLACKHOLE Storage Engine ..... 3315
18.7 The MERGE Storage Engine ..... 3317
18.7.1 MERGE Table Advantages and Disadvantages ..... 3319
18.7.2 MERGE Table Problems ..... 3320
18.8 The FEDERATED Storage Engine ..... 3322
18.8.1 FEDERATED Storage Engine Overview ..... 3322
18.8.2 How to Create FEDERATED Tables ..... 3323
18.8.3 FEDERATED Storage Engine Notes and Tips ..... 3326
18.8.4 FEDERATED Storage Engine Resources ..... 3327
18.9 The EXAMPLE Storage Engine ..... 3327
18.10 Other Storage Engines ..... 3328
18.11 Overview of MySQL Storage Engine Architecture ..... 3328
18.11.1 Pluggable Storage Engine Architecture ..... 3329
18.11.2 The Common Database Server Layer ..... 3329
19 Replication ..... 3331
19.1 Configuring Replication ..... 3333
19.1.1 Binary Log File Position Based Replication Configuration Overview ..... 3333
19.1.2 Setting Up Binary Log File Position Based Replication ..... 3334
19.1.3 Replication with Global Transaction Identifiers ..... 3345
19.1.4 Changing GTID Mode on Online Servers ..... 3367
19.1.5 MySQL Multi-Source Replication ..... 3373
19.1.6 Replication and Binary Logging Options and Variables ..... 3378
19.1.7 Common Replication Administration Tasks ..... 3475
19.2 Replication Implementation ..... 3481
19.2.1 Replication Formats ..... 3481
19.2.2 Replication Channels ..... 3489
19.2.3 Replication Threads ..... 3492
19.2.4 Relay Log and Replication Metadata Repositories ..... 3495
19.2.5 How Servers Evaluate Replication Filtering Rules ..... 3502
19.3 Replication Security ..... 3510
19.3.1 Setting Up Replication to Use Encrypted Connections ..... 3511
19.3.2 Encrypting Binary Log Files and Relay Log Files ..... 3513
19.3.3 Replication Privilege Checks ..... 3516
19.4 Replication Solutions ..... 3522
19.4.1 Using Replication for Backups ..... 3523
19.4.2 Handling an Unexpected Halt of a Replica ..... 3526
19.4.3 Monitoring Row-based Replication ..... 3529
19.4.4 Using Replication with Different Source and Replica Storage Engines ..... 3529
19.4.5 Using Replication for Scale-Out ..... 3530
19.4.6 Replicating Different Databases to Different Replicas ..... 3532
19.4.7 Improving Replication Performance ..... 3533
19.4.8 Switching Sources During Failover ..... 3534
19.4.9 Switching Sources and Replicas with Asynchronous Connection Failover ..... 3536
19.4.10 Semisynchronous Replication ..... 3540
19.4.11 Delayed Replication ..... 3545
19.5 Replication Notes and Tips ..... 3547
19.5.1 Replication Features and Issues ..... 3547
19.5.2 Replication Compatibility Between MySQL Versions ..... 3574
19.5.3 Upgrading or Downgrading a Replication Topology ..... 3575
19.5.4 Troubleshooting Replication ..... 3576
19.5.5 How to Report Replication Bugs or Problems ..... 3577
20 Group Replication ..... 3579
20.1 Group Replication Background ..... 3580
20.1.1 Replication Technologies ..... 3581
20.1.2 Group Replication Use Cases ..... 3584
20.1.3 Multi-Primary and Single-Primary Modes ..... 3585
20.1.4 Group Replication Services ..... 3589
20.1.5 Group Replication Plugin Architecture ..... 3591
20.2 Getting Started ..... 3593
20.2.1 Deploying Group Replication in Single-Primary Mode ..... 3593
20.2.2 Deploying Group Replication Locally ..... 3605
20.3 Requirements and Limitations ..... 3606
20.3.1 Group Replication Requirements ..... 3606
20.3.2 Group Replication Limitations ..... 3609
20.4 Monitoring Group Replication ..... 3611
20.4.1 GTIDs and Group Replication ..... 3612
20.4.2 Group Replication Server States ..... 3613
20.4.3 The replication_group_members Table ..... 3614
20.4.4 The replication_group_member_stats Table ..... 3615
20.5 Group Replication Operations ..... 3615
20.5.1 Configuring an Online Group ..... 3615
20.5.2 Restarting a Group ..... 3621
20.5.3 Transaction Consistency Guarantees ..... 3622
20.5.4 Distributed Recovery ..... 3629
20.5.5 Support For IPv6 And For Mixed IPv6 And IPv4 Groups ..... 3643
20.5.6 Using MySQL Enterprise Backup with Group Replication ..... 3644
20.6 Group Replication Security ..... 3650
20.6.1 Communication Stack for Connection Security Management ..... 3650
20.6.2 Securing Group Communication Connections with Secure Socket Layer (SSL) ..... 3653
20.6.3 Securing Distributed Recovery Connections ..... 3655
20.6.4 Group Replication IP Address Permissions ..... 3659
20.7 Group Replication Performance and Troubleshooting ..... 3662
20.7.1 Fine Tuning the Group Communication Thread ..... 3662
20.7.2 Flow Control ..... 3662
20.7.3 Single Consensus Leader ..... 3664
20.7.4 Message Compression ..... 3665
20.7.5 Message Fragmentation ..... 3667
20.7.6 XCom Cache Management ..... 3667
20.7.7 Responses to Failure Detection and Network Partitioning ..... 3669
20.7.8 Handling a Network Partition and Loss of Quorum ..... 3674
20.7.9 Monitoring Group Replication Memory Usage with Performance Schema Memory Instrumentation ..... 3679
20.8 Upgrading Group Replication ..... 3688
20.8.1 Combining Different Member Versions in a Group ..... 3688
20.8.2 Group Replication Offline Upgrade ..... 3690
20.8.3 Group Replication Online Upgrade ..... 3690
20.9 Group Replication Variables ..... 3694
20.9.1 Group Replication System Variables ..... 3696
20.9.2 Group Replication Status Variables ..... 3738
20.10 Frequently Asked Questions ..... 3740
21 MySQL Shell ..... 3745
22 Using MySQL as a Document Store ..... 3747
22.1 Interfaces to a MySQL Document Store ..... 3748
22.2 Document Store Concepts ..... 3748
22.3 JavaScript Quick-Start Guide: MySQL Shell for Document Store ..... 3749
22.3.1 MySQL Shell ..... 3750
22.3.2 Download and Import world_x Database ..... 3751
22.3.3 Documents and Collections ..... 3752
22.3.4 Relational Tables ..... 3762
22.3.5 Documents in Tables ..... 3768
22.4 Python Quick-Start Guide: MySQL Shell for Document Store ..... 3769
22.4.1 MySQL Shell ..... 3769
22.4.2 Download and Import world_x Database ..... 3771
22.4.3 Documents and Collections ..... 3771
22.4.4 Relational Tables ..... 3782
22.4.5 Documents in Tables ..... 3788
22.5 X Plugin ..... 3789
22.5.1 Checking X Plugin Installation ..... 3789
22.5.2 Disabling X Plugin ..... 3789
22.5.3 Using Encrypted Connections with X Plugin ..... 3789
22.5.4 Using X Plugin with the Caching SHA-2 Authentication Plugin ..... 3790
22.5.5 Connection Compression with X Plugin ..... 3791
22.5.6 X Plugin Options and Variables ..... 3794
22.5.7 Monitoring X Plugin ..... 3814
23 InnoDB Cluster ..... 3817
24 InnoDB ReplicaSet ..... 3819
25 MySQL NDB Cluster 8.4 ..... 3821
25.1 General Information ..... 3822
25.2 NDB Cluster Overview ..... 3824
25.2.1 NDB Cluster Core Concepts ..... 3826
25.2.2 NDB Cluster Nodes, Node Groups, Fragment Replicas, and Partitions ..... 3829
25.2.3 NDB Cluster Hardware, Software, and Networking Requirements ..... 3832
25.2.4 What is New in MySQL NDB Cluster 8.4 ..... 3833
25.2.5 Options, Variables, and Parameters Added, Deprecated or Removed in NDB 8.4 ..... 3837
25.2.6 MySQL Server Using InnoDB Compared with NDB Cluster ..... 3838
25.2.7 Known Limitations of NDB Cluster ..... 3840
25.3 NDB Cluster Installation ..... 3852
25.3.1 Installation of NDB Cluster on Linux ..... 3854
25.3.2 Installing NDB Cluster on Windows ..... 3862
25.3.3 Initial Configuration of NDB Cluster ..... 3871
25.3.4 Initial Startup of NDB Cluster ..... 3872
25.3.5 NDB Cluster Example with Tables and Data ..... 3873
25.3.6 Safe Shutdown and Restart of NDB Cluster ..... 3876
25.3.7 Upgrading and Downgrading NDB Cluster ..... 3877
25.4 Configuration of NDB Cluster ..... 3878
25.4.1 Quick Test Setup of NDB Cluster ..... 3878
25.4.2 Overview of NDB Cluster Configuration Parameters, Options, and Variables ..... 3880
25.4.3 NDB Cluster Configuration Files ..... 3902
25.4.4 Using High-Speed Interconnects with NDB Cluster ..... 4104
25.5 NDB Cluster Programs ..... 4105
25.5.1 ndbd - The NDB Cluster Data Node Daemon ..... 4105
25.5.2 ndbinfo_select_all — Select From ndbinfo Tables ..... 4114
25.5.3 ndbmtd - The NDB Cluster Data Node Daemon (Multi-Threaded) ..... 4119
25.5.4 ndb_mgmd - The NDB Cluster Management Server Daemon ..... 4120
25.5.5 ndb_mgm - The NDB Cluster Management Client ..... 4130
25.5.6 ndb_blob_tool — Check and Repair BLOB and TEXT columns of NDB Cluster Tables ..... 4135
25.5.7 ndb_config - Extract NDB Cluster Configuration Information ..... 4140
25.5.8 ndb_delete_all - Delete All Rows from an NDB Table ..... 4151
25.5.9 ndb_desc — Describe NDB Tables ..... 4154
25.5.10 ndb_drop_index - Drop Index from an NDB Table ..... 4163
25.5.11 ndb_drop_table - Drop an NDB Table ..... 4167
25.5.12 ndb_error_reporter — NDB Error-Reporting Utility ..... 4171
25.5.13 ndb_import — Import CSV Data Into NDB ..... 4172
25.5.14 ndb_index_stat — NDB Index Statistics Utility ..... 4185
25.5.15 ndb_move_data - NDB Data Copy Utility ..... 4191
25.5.16 ndb_perror — Obtain NDB Error Message Information ..... 4196
25.5.17 ndb_print_backup_file - Print NDB Backup File Contents ..... 4198
25.5.18 ndb_print_file - Print NDB Disk Data File Contents ..... 4202
25.5.19 ndb_print_frag_file - Print NDB Fragment List File Contents ..... 4203
25.5.20 ndb_print_schema_file - Print NDB Schema File Contents ..... 4204
25.5.21 ndb_print_sys_file - Print NDB System File Contents ..... 4204
25.5.22 ndb_redo_log_reader - Check and Print Content of Cluster Redo Log ..... 4204
25.5.23 ndb_restore - Restore an NDB Cluster Backup ..... 4206
25.5.24 ndb_secretsfile_reader — Obtain Key Information from an Encrypted NDB Data File ..... 4228
25.5.25 ndb_select_all - Print Rows from an NDB Table ..... 4230
25.5.26 ndb_select_count - Print Row Counts for NDB Tables ..... 4235
25.5.27 ndb_show_tables - Display List of NDB Tables ..... 4239
25.5.28 ndb_sign_keys - Create, Sign, and Manage TLS Keys and Certificates for NDB Cluster ..... 4243
25.5.29 ndb_size.pl - NDBCLUSTER Size Requirement Estimator ..... 4251
25.5.30 ndb_top - View CPU usage information for NDB threads ..... 4253
25.5.31 ndb_waiter - Wait for NDB Cluster to Reach a Given Status ..... 4258
25.5.32 ndbxfrm - Compress, Decompress, Encrypt, and Decrypt Files Created by NDB Cluster ..... 4264
25.6 Management of NDB Cluster ..... 4269
25.6.1 Commands in the NDB Cluster Management Client ..... 4270
25.6.2 NDB Cluster Log Messages ..... 4276
25.6.3 Event Reports Generated in NDB Cluster ..... 4294
25.6.4 Summary of NDB Cluster Start Phases ..... 4306
25.6.5 Performing a Rolling Restart of an NDB Cluster ..... 4308
25.6.6 NDB Cluster Single User Mode ..... 4310
25.6.7 Adding NDB Cluster Data Nodes Online ..... 4311
25.6.8 Online Backup of NDB Cluster ..... 4321
25.6.9 Importing Data Into MySQL Cluster ..... 4327
25.6.10 MySQL Server Usage for NDB Cluster ..... 4328
25.6.11 NDB Cluster Disk Data Tables ..... 4330
25.6.12 Online Operations with ALTER TABLE in NDB Cluster ..... 4336
25.6.13 Privilege Synchronization and NDB_STORED_USER ..... 4339
25.6.14 NDB API Statistics Counters and Variables ..... 4340
25.6.15 ndbinfo: The NDB Cluster Information Database ..... 4352
25.6.16 INFORMATION_SCHEMA Tables for NDB Cluster ..... 4440
25.6.17 NDB Cluster and the Performance Schema ..... 4441
25.6.18 Quick Reference: NDB Cluster SQL Statements ..... 4442
25.6.19 NDB Cluster Security ..... 4449
25.7 NDB Cluster Replication ..... 4462
25.7.1 NDB Cluster Replication: Abbreviations and Symbols ..... 4464
25.7.2 General Requirements for NDB Cluster Replication ..... 4464
25.7.3 Known Issues in NDB Cluster Replication ..... 4465
25.7.4 NDB Cluster Replication Schema and Tables ..... 4471
25.7.5 Preparing the NDB Cluster for Replication ..... 4478
25.7.6 Starting NDB Cluster Replication (Single Replication Channel) ..... 4480
25.7.7 Using Two Replication Channels for NDB Cluster Replication ..... 4482
25.7.8 Implementing Failover with NDB Cluster Replication ..... 4483
25.7.9 NDB Cluster Backups With NDB Cluster Replication ..... 4484
25.7.10 NDB Cluster Replication: Bidirectional and Circular Replication ..... 4490
25.7.11 NDB Cluster Replication Using the Multithreaded Applier ..... 4494
25.7.12 NDB Cluster Replication Conflict Resolution ..... 4497
25.8 NDB Cluster Release Notes ..... 4514
26 Partitioning ..... 4515
26.1 Overview of Partitioning in MySQL ..... 4516
26.2 Partitioning Types ..... 4518
26.2.1 RANGE Partitioning ..... 4520
26.2.2 LIST Partitioning ..... 4524
26.2.3 COLUMNS Partitioning ..... 4527
26.2.4 HASH Partitioning ..... 4534
26.2.5 KEY Partitioning ..... 4537
26.2.6 Subpartitioning ..... 4538
26.2.7 How MySQL Partitioning Handles NULL ..... 4540
26.3 Partition Management ..... 4544
26.3.1 Management of RANGE and LIST Partitions ..... 4545
26.3.2 Management of HASH and KEY Partitions ..... 4551
26.3.3 Exchanging Partitions and Subpartitions with Tables ..... 4552
26.3.4 Maintenance of Partitions ..... 4559
26.3.5 Obtaining Information About Partitions ..... 4560
26.4 Partition Pruning ..... 4563
26.5 Partition Selection ..... 4565
26.6 Restrictions and Limitations on Partitioning ..... 4571
26.6.1 Partitioning Keys, Primary Keys, and Unique Keys ..... 4576
26.6.2 Partitioning Limitations Relating to Storage Engines ..... 4579
26.6.3 Partitioning Limitations Relating to Functions ..... 4580
27 Stored Objects ..... 4583
27.1 Defining Stored Programs ..... 4584
27.2 Using Stored Routines ..... 4585
27.2.1 Stored Routine Syntax ..... 4586
27.2.2 Stored Routines and MySQL Privileges ..... 4586
27.2.3 Stored Routine Metadata ..... 4587
27.2.4 Stored Procedures, Functions, Triggers, and LAST_INSERT_ID() ..... 4587
27.3 Using Triggers ..... 4587
27.3.1 Trigger Syntax and Examples ..... 4588
27.3.2 Trigger Metadata ..... 4592
27.4 Using the Event Scheduler ..... 4592
27.4.1 Event Scheduler Overview ..... 4593
27.4.2 Event Scheduler Configuration ..... 4593
27.4.3 Event Syntax ..... 4596
27.4.4 Event Metadata ..... 4596
27.4.5 Event Scheduler Status ..... 4597
27.4.6 The Event Scheduler and MySQL Privileges ..... 4597
27.5 Using Views ..... 4600
27.5.1 View Syntax ..... 4600
27.5.2 View Processing Algorithms ..... 4600
27.5.3 Updatable and Insertable Views ..... 4601
27.5.4 The View WITH CHECK OPTION Clause ..... 4604
27.5.5 View Metadata ..... 4605
27.6 Stored Object Access Control ..... 4605
27.7 Stored Program Binary Logging ..... 4609
27.8 Restrictions on Stored Programs ..... 4615
27.9 Restrictions on Views ..... 4618
28 INFORMATION_SCHEMA Tables ..... 4621
28.1 Introduction ..... 4622
28.2 INFORMATION_SCHEMA Table Reference ..... 4625
28.3 INFORMATION_SCHEMA General Tables ..... 4629
28.3.1 INFORMATION_SCHEMA General Table Reference ..... 4629
28.3.2 The INFORMATION_SCHEMA ADMINISTRABLE_ROLE_AUTHORIZATIONS Table ..... 4630
28.3.3 The INFORMATION_SCHEMA APPLICABLE_ROLES Table ..... 4631
28.3.4 The INFORMATION_SCHEMA CHARACTER_SETS Table ..... 4632
28.3.5 The INFORMATION_SCHEMA CHECK_CONSTRAINTS Table ..... 4632
28.3.6 The INFORMATION_SCHEMA COLLATIONS Table ..... 4633
28.3.7 The INFORMATION_SCHEMA COLLATION_CHARACTER_SET_APPLICABILITY Table ..... 4633
28.3.8 The INFORMATION_SCHEMA COLUMNS Table ..... 4634
28.3.9 The INFORMATION_SCHEMA COLUMNS_EXTENSIONS Table ..... 4636
28.3.10 The INFORMATION_SCHEMA COLUMN_PRIVILEGES Table ..... 4637
28.3.11 The INFORMATION_SCHEMA COLUMN_STATISTICS Table ..... 4638
28.3.12 The INFORMATION_SCHEMA ENABLED_ROLES Table ..... 4638
28.3.13 The INFORMATION_SCHEMA ENGINES Table ..... 4638
28.3.14 The INFORMATION_SCHEMA EVENTS Table ..... 4639
28.3.15 The INFORMATION_SCHEMA FILES Table ..... 4643
28.3.16 The INFORMATION_SCHEMA KEY_COLUMN_USAGE Table ..... 4648
28.3.17 The INFORMATION_SCHEMA KEYWORDS Table ..... 4650
28.3.18 The INFORMATION_SCHEMA ndb_transid_mysql_connection_map Table ..... 4650
28.3.19 The INFORMATION_SCHEMA OPTIMIZER_TRACE Table ..... 4651
28.3.20 The INFORMATION_SCHEMA PARAMETERS Table ..... 4652
28.3.21 The INFORMATION_SCHEMA PARTITIONS Table ..... 4653
28.3.22 The INFORMATION_SCHEMA PLUGINS Table ..... 4656
28.3.23 The INFORMATION_SCHEMA PROCESSLIST Table ..... 4657
28.3.24 The INFORMATION_SCHEMA PROFILING Table ..... 4659
28.3.25 The INFORMATION_SCHEMA REFERENTIAL_CONSTRAINTS Table ..... 4660
28.3.26 The INFORMATION_SCHEMA RESOURCE_GROUPS Table ..... 4661
28.3.27 The INFORMATION_SCHEMA ROLE_COLUMN_GRANTS Table ..... 4662
28.3.28 The INFORMATION_SCHEMA ROLE_ROUTINE_GRANTS Table ..... 4662
28.3.29 The INFORMATION_SCHEMA ROLE_TABLE_GRANTS Table ..... 4663
28.3.30 The INFORMATION_SCHEMA ROUTINES Table ..... 4664
28.3.31 The INFORMATION_SCHEMA SCHEMATA Table ..... 4667
28.3.32 The INFORMATION_SCHEMA SCHEMATA_EXTENSIONS Table ..... 4667
28.3.33 The INFORMATION_SCHEMA SCHEMA_PRIVILEGES Table ..... 4668
28.3.34 The INFORMATION_SCHEMA STATISTICS Table ..... 4669
28.3.35 The INFORMATION_SCHEMA ST_GEOMETRY_COLUMNS Table ..... 4671
28.3.36 The INFORMATION_SCHEMA ST_SPATIAL_REFERENCE_SYSTEMS Table ..... 4672
28.3.37 The INFORMATION_SCHEMA ST_UNITS_OF_MEASURE Table ..... 4673
28.3.38 The INFORMATION_SCHEMA TABLES Table ..... 4674
28.3.39 The INFORMATION_SCHEMA TABLES_EXTENSIONS Table ..... 4677
28.3.40 The INFORMATION_SCHEMA TABLESPACES_EXTENSIONS Table ..... 4678
28.3.41 The INFORMATION_SCHEMA TABLE_CONSTRAINTS Table ..... 4678
28.3.42 The INFORMATION_SCHEMA TABLE_CONSTRAINTS_EXTENSIONS Table ..... 4679
28.3.43 The INFORMATION_SCHEMA TABLE_PRIVILEGES Table ..... 4679
28.3.44 The INFORMATION_SCHEMA TRIGGERS Table ..... 4680
28.3.45 The INFORMATION_SCHEMA USER_ATTRIBUTES Table ..... 4682
28.3.46 The INFORMATION_SCHEMA USER_PRIVILEGES Table ..... 4683
28.3.47 The INFORMATION_SCHEMA VIEWS Table ..... 4683
28.3.48 The INFORMATION_SCHEMA VIEW_ROUTINE_USAGE Table ..... 4685
28.3.49 The INFORMATION_SCHEMA VIEW_TABLE_USAGE Table ..... 4685
28.4 INFORMATION_SCHEMA InnoDB Tables ..... 4686
28.4.1 INFORMATION_SCHEMA InnoDB Table Reference ..... 4686
28.4.2 The INFORMATION_SCHEMA INNODB_BUFFER_PAGE Table ..... 4687
28.4.3 The INFORMATION_SCHEMA INNODB_BUFFER_PAGE_LRU Table ..... 4691
28.4.4 The INFORMATION_SCHEMA INNODB_BUFFER_POOL_STATS Table ..... 4694
28.4.5 The INFORMATION_SCHEMA INNODB_CACHED_INDEXES Table ..... 4697
28.4.6 The INFORMATION_SCHEMA INNODB_CMP and INNODB_CMP_RESET Tables ..... 4698
28.4.7 The INFORMATION_SCHEMA INNODB_CMPMEM and INNODB_CMPMEM_RESET Tables ..... 4699
28.4.8 The INFORMATION_SCHEMA INNODB_CMP_PER_INDEX and INNODB_CMP_PER_INDEX_RESET Tables ..... 4701
28.4.9 The INFORMATION_SCHEMA INNODB_COLUMNS Table ..... 4702
28.4.10 The INFORMATION_SCHEMA INNODB_DATAFILES Table ..... 4703
28.4.11 The INFORMATION_SCHEMA INNODB_FIELDS Table ..... 4704
28.4.12 The INFORMATION_SCHEMA INNODB_FOREIGN Table ..... 4705
28.4.13 The INFORMATION_SCHEMA INNODB_FOREIGN_COLS Table ..... 4705
28.4.14 The INFORMATION_SCHEMA INNODB_FT_BEING_DELETED Table ..... 4706
28.4.15 The INFORMATION_SCHEMA INNODB_FT_CONFIG Table ..... 4707
28.4.16 The INFORMATION_SCHEMA INNODB_FT_DEFAULT_STOPWORD Table ..... 4708
28.4.17 The INFORMATION_SCHEMA INNODB_FT_DELETED Table ..... 4709
28.4.18 The INFORMATION_SCHEMA INNODB_FT_INDEX_CACHE Table ..... 4709
28.4.19 The INFORMATION_SCHEMA INNODB_FT_INDEX_TABLE Table ..... 4711
28.4.20 The INFORMATION_SCHEMA INNODB_INDEXES Table ..... 4712
28.4.21 The INFORMATION_SCHEMA INNODB_METRICS Table ..... 4714
28.4.22 The INFORMATION_SCHEMA INNODB_SESSION_TEMP_TABLESPACES Table ..... 4716
28.4.23 The INFORMATION_SCHEMA INNODB_TABLES Table ..... 4717
28.4.24 The INFORMATION_SCHEMA INNODB_TABLESPACES Table ..... 4718
28.4.25 The INFORMATION_SCHEMA INNODB_TABLESPACES_BRIEF Table ..... 4720
28.4.26 The INFORMATION_SCHEMA INNODB_TABLESTATS View ..... 4721
28.4.27 The INFORMATION_SCHEMA INNODB_TEMP_TABLE_INFO Table ..... 4723
28.4.28 The INFORMATION_SCHEMA INNODB_TRX Table ..... 4723
28.4.29 The INFORMATION_SCHEMA INNODB_VIRTUAL Table ..... 4726
28.5 INFORMATION_SCHEMA Thread Pool Tables ..... 4727
28.5.1 INFORMATION_SCHEMA Thread Pool Table Reference ..... 4728
28.5.2 The INFORMATION_SCHEMA TP_THREAD_GROUP_STATE Table ..... 4728
28.5.3 The INFORMATION_SCHEMA TP_THREAD_GROUP_STATS Table ..... 4728
28.5.4 The INFORMATION_SCHEMA TP_THREAD_STATE Table ..... 4729
28.6 INFORMATION_SCHEMA Connection Control Tables ..... 4729
28.6.1 INFORMATION_SCHEMA Connection Control Table Reference ..... 4729
28.6.2 The INFORMATION_SCHEMA
CONNECTION_CONTROL_FAILED_LOGIN_ATTEMPTS Table ..... 4729
28.7 INFORMATION_SCHEMA MySQL Enterprise Firewall Tables ..... 4730
28.7.1 INFORMATION_SCHEMA Firewall Table Reference ..... 4730
28.7.2 The INFORMATION_SCHEMA MYSQL_FIREWALL_USERS Table ..... 4730
28.7.3 The INFORMATION_SCHEMA MYSQL_FIREWALL_WHITELIST Table ..... 4731
28.8 Extensions to SHOW Statements ..... 4731
29 MySQL Performance Schema ..... 4735
29.1 Performance Schema Quick Start ..... 4737
29.2 Performance Schema Build Configuration ..... 4743
29.3 Performance Schema Startup Configuration ..... 4743
29.4 Performance Schema Runtime Configuration ..... 4745
29.4.1 Performance Schema Event Timing ..... 4746
29.4.2 Performance Schema Event Filtering ..... 4748
29.4.3 Event Pre-Filtering ..... 4749
29.4.4 Pre-Filtering by Instrument ..... 4750
29.4.5 Pre-Filtering by Object ..... 4752
29.4.6 Pre-Filtering by Thread ..... 4753
29.4.7 Pre-Filtering by Consumer ..... 4755
29.4.8 Example Consumer Configurations ..... 4758
29.4.9 Naming Instruments or Consumers for Filtering Operations ..... 4763
29.4.10 Determining What Is Instrumented ..... 4763
29.5 Performance Schema Queries ..... 4764
29.6 Performance Schema Instrument Naming Conventions ..... 4764
29.7 Performance Schema Status Monitoring ..... 4768
29.8 Performance Schema Atom and Molecule Events ..... 4771
29.9 Performance Schema Tables for Current and Historical Events ..... 4771
29.10 Performance Schema Statement Digests and Sampling ..... 4773
29.11 Performance Schema General Table Characteristics ..... 4777
29.12 Performance Schema Table Descriptions ..... 4778
29.12.1 Performance Schema Table Reference ..... 4778
29.12.2 Performance Schema Setup Tables ..... 4782
29.12.3 Performance Schema Instance Tables ..... 4791
29.12.4 Performance Schema Wait Event Tables ..... 4796
29.12.5 Performance Schema Stage Event Tables ..... 4801
29.12.6 Performance Schema Statement Event Tables ..... 4807
29.12.7 Performance Schema Transaction Tables ..... 4817
29.12.8 Performance Schema Connection Tables ..... 4825
29.12.9 Performance Schema Connection Attribute Tables ..... 4829
29.12.10 Performance Schema User-Defined Variable Tables ..... 4833
29.12.11 Performance Schema Replication Tables ..... 4833
29.12.12 Performance Schema NDB Cluster Tables ..... 4856
29.12.13 Performance Schema Lock Tables ..... 4859
29.12.14 Performance Schema System Variable Tables ..... 4867
29.12.15 Performance Schema Status Variable Tables ..... 4871
29.12.16 Performance Schema Thread Pool Tables ..... 4873
29.12.17 Performance Schema Firewall Tables ..... 4880
29.12.18 Performance Schema Keyring Tables ..... 4881
29.12.19 Performance Schema Clone Tables ..... 4883
29.12.20 Performance Schema Summary Tables ..... 4885
29.12.21 Performance Schema Telemetry Tables ..... 4912
29.12.22 Performance Schema Miscellaneous Tables ..... 4915
29.13 Performance Schema Option and Variable Reference ..... 4934
29.14 Performance Schema Command Options ..... 4938
29.15 Performance Schema System Variables ..... 4939
29.16 Performance Schema Status Variables ..... 4959
29.17 The Performance Schema Memory-Allocation Model ..... 4962
29.18 Performance Schema and Plugins ..... 4963
29.19 Using the Performance Schema to Diagnose Problems ..... 4963
29.19.1 Query Profiling Using Performance Schema ..... 4964
29.19.2 Obtaining Parent Event Information ..... 4966
29.20 Restrictions on Performance Schema ..... 4967
30 MySQL sys Schema ..... 4969
30.1 Prerequisites for Using the sys Schema ..... 4969
30.2 Using the sys Schema ..... 4970
30.3 sys Schema Progress Reporting ..... 4971
30.4 sys Schema Object Reference ..... 4972
30.4.1 sys Schema Object Index ..... 4972
30.4.2 sys Schema Tables and Triggers ..... 4977
30.4.3 sys Schema Views ..... 4979
30.4.4 sys Schema Stored Procedures ..... 5019
30.4.5 sys Schema Stored Functions ..... 5037
31 Connectors and APIs ..... 5049
31.1 MySQL Connector/C++ ..... 5051
31.2 MySQL Connector/J ..... 5052
31.3 MySQL Connector/NET ..... 5052
31.4 MySQL Connector/ODBC ..... 5052
31.5 MySQL Connector/Python ..... 5052
31.6 MySQL Connector/Node.js ..... 5052
31.7 MySQL C API ..... 5052
31.8 MySQL PHP API ..... 5052
31.9 MySQL Perl API ..... 5052
31.10 MySQL Python API ..... 5053
31.11 MySQL Ruby APIs ..... 5053
31.11.1 The MySQL/Ruby API ..... 5054
31.11.2 The Ruby/MySQL API ..... 5054
31.12 MySQL Tcl API ..... 5054
31.13 MySQL Eiffel Wrapper ..... 5054
32 MySQL Enterprise Edition ..... 5055
32.1 MySQL Enterprise Backup Overview ..... 5055
32.2 MySQL Enterprise Security Overview ..... 5056
32.3 MySQL Enterprise Encryption Overview ..... 5056
32.4 MySQL Enterprise Audit Overview ..... 5057
32.5 MySQL Enterprise Firewall Overview ..... 5057
32.6 MySQL Enterprise Thread Pool Overview ..... 5057
32.7 MySQL Enterprise Data Masking and De-Identification Overview ..... 5057
32.8 MySQL Telemetry ..... 5057
33 MySQL Workbench ..... 5059
34 MySQL on OCI Marketplace ..... 5061
34.1 Prerequisites to Deploying MySQL EE on Oracle Cloud Infrastructure ..... 5061
34.2 Deploying MySQL EE on Oracle Cloud Infrastructure ..... 5061
34.3 Configuring Network Access ..... 5063
34.4 Connecting ..... 5063
34.5 Maintenance ..... 5064
35 Telemetry ..... 5065
35.1 Installing OpenTelemetry Support ..... 5065
35.2 Telemetry Variables ..... 5066
35.3 OpenTelemetry Trace ..... 5067
35.3.1 Configuring Trace Telemetry ..... 5067
35.3.2 Trace Format ..... 5076
35.4 OpenTelemetry Metrics ..... 5078
35.4.1 Configuring Metrics Telemetry ..... 5078
35.4.2 Server Meters ..... 5083
35.4.3 Server Metrics ..... 5084
A MySQL 8.4 Frequently Asked Questions ..... 5099
A.1 MySQL 8.4 FAQ: General ..... 5099
A.2 MySQL 8.4 FAQ: Storage Engines ..... 5101
A.3 MySQL 8.4 FAQ: Server SQL Mode ..... 5102
A.4 MySQL 8.4 FAQ: Stored Procedures and Functions ..... 5102
A.5 MySQL 8.4 FAQ: Triggers ..... 5106
A.6 MySQL 8.4 FAQ: Views ..... 5108
A.7 MySQL 8.4 FAQ: INFORMATION_SCHEMA ..... 5109
A.8 MySQL 8.4 FAQ: Migration ..... 5110
A.9 MySQL 8.4 FAQ: Security ..... 5110
A.10 MySQL 8.4 FAQ: NDB Cluster ..... 5112
A.11 MySQL 8.4 FAQ: MySQL Chinese, Japanese, and Korean Character Sets ..... 5124
A.12 MySQL 8.4 FAQ: Connectors \& APIs ..... 5135
A. 13 MySQL 8.4 FAQ: C API, libmysql ..... 5135
A.14 MySQL 8.4 FAQ: Replication ..... 5136
A.15 MySQL 8.4 FAQ: MySQL Enterprise Thread Pool ..... 5140
A.16 MySQL 8.4 FAQ: InnoDB Change Buffer ..... 5141
A.17 MySQL 8.4 FAQ: InnoDB Data-at-Rest Encryption ..... 5143
A.18 MySQL 8.4 FAQ: Virtualization Support ..... 5145
B Error Messages and Common Problems ..... 5147
B. 1 Error Message Sources and Elements ..... 5147
B. 2 Error Information Interfaces ..... 5149
B. 3 Problems and Common Errors ..... 5151
B.3.1 How to Determine What Is Causing a Problem ..... 5151
B.3.2 Common Errors When Using MySQL Programs ..... 5152
B.3.3 Administration-Related Issues ..... 5163
B.3.4 Query-Related Issues ..... 5171
B.3.5 Optimizer-Related Issues ..... 5177
B.3.6 Table Definition-Related Issues ..... 5178
B.3.7 Known Issues in MySQL ..... 5179
C Indexes ..... 5183
MySQL Glossary ..... 5955

\section*{Preface and Legal Notices}

This is the Reference Manual for the MySQL Database System, for the 8.4.9 LTS release. For license information, see the Legal Notices.

This manual is not intended for use with older versions of the MySQL software due to the many functional and other differences between MySQL 8.4 and previous versions. If you are using an earlier release of the MySQL software, please refer to the appropriate manual. For example, MySQL 8.0 Reference Manual covers the 8.0 bugfix series of MySQL software releases.

Licensing information-MySQL 8.4. This product may include third-party software, used under license. If you are using a Commercial release of MySQL 8.4, see the MySQL 8.4 Commercial Release License Information User Manual for licensing information, including licensing information relating to third-party software that may be included in this Commercial release. If you are using a Community release of MySQL 8.4, see the MySQL 8.4 Community Release License Information User Manual for licensing information, including licensing information relating to third-party software that may be included in this Community release.

Licensing information-MySQL NDB Cluster 8.4. This product may include third-party software, used under license. If you are using a Commercial release of MySQL NDB Cluster 8.4, see the MySQL NDB Cluster 8.4 Commercial Release License Information User Manual for licensing information, including licensing information relating to third-party software that may be included in this Commercial release. If you are using a Community release of MySQL NDB Cluster 8.4, see the MySQL NDB Cluster 8.4 Community Release License Information User Manual for licensing information, including licensing information relating to third-party software that may be included in this Community release.

\section*{Legal Notices}

Copyright © 1997, 2026, Oracle and/or its affiliates.

\section*{License Restrictions}

This software and related documentation are provided under a license agreement containing restrictions on use and disclosure and are protected by intellectual property laws. Except as expressly permitted in your license agreement or allowed by law, you may not use, copy, reproduce, translate, broadcast, modify, license, transmit, distribute, exhibit, perform, publish, or display any part, in any form, or by any means. Reverse engineering, disassembly, or decompilation of this software, unless required by law for interoperability, is prohibited.

\section*{Warranty Disclaimer}

The information contained herein is subject to change without notice and is not warranted to be errorfree. If you find any errors, please report them to us in writing.

\section*{Restricted Rights Notice}

If this is software, software documentation, data (as defined in the Federal Acquisition Regulation), or related documentation that is delivered to the U.S. Government or anyone licensing it on behalf of the U.S. Government, then the following notice is applicable:
U.S. GOVERNMENT END USERS: Oracle programs (including any operating system, integrated software, any programs embedded, installed, or activated on delivered hardware, and modifications of such programs) and Oracle computer documentation or other Oracle data delivered to or accessed by U.S. Government end users are "commercial computer software," "commercial computer software documentation," or "limited rights data" pursuant to the applicable Federal Acquisition Regulation and agency-specific supplemental regulations. As such, the use, reproduction, duplication, release, display, disclosure, modification, preparation of derivative works, and/or adaptation of i) Oracle programs (including any operating system, integrated software, any programs embedded, installed, or activated on delivered hardware, and modifications of such programs), ii) Oracle computer documentation and/
or iii) other Oracle data, is subject to the rights and limitations specified in the license contained in the applicable contract. The terms governing the U.S. Government's use of Oracle cloud services are defined by the applicable contract for such services. No other rights are granted to the U.S. Government.

\section*{Hazardous Applications Notice}

This software or hardware is developed for general use in a variety of information management applications. It is not developed or intended for use in any inherently dangerous applications, including applications that may create a risk of personal injury. If you use this software or hardware in dangerous applications, then you shall be responsible to take all appropriate fail-safe, backup, redundancy, and other measures to ensure its safe use. Oracle Corporation and its affiliates disclaim any liability for any damages caused by use of this software or hardware in dangerous applications.

\section*{Trademark Notice}

Oracle, Java, MySQL, and NetSuite are registered trademarks of Oracle and/or its affiliates. Other names may be trademarks of their respective owners.

Intel and Intel Inside are trademarks or registered trademarks of Intel Corporation. All SPARC trademarks are used under license and are trademarks or registered trademarks of SPARC International, Inc. AMD, Epyc, and the AMD logo are trademarks or registered trademarks of Advanced Micro Devices. UNIX is a registered trademark of The Open Group.

\section*{Third-Party Content, Products, and Services Disclaimer}

This software or hardware and documentation may provide access to or information about content, products, and services from third parties. Oracle Corporation and its affiliates are not responsible for and expressly disclaim all warranties of any kind with respect to third-party content, products, and services unless otherwise set forth in an applicable agreement between you and Oracle. Oracle Corporation and its affiliates will not be responsible for any loss, costs, or damages incurred due to your access to or use of third-party content, products, or services, except as set forth in an applicable agreement between you and Oracle.

\section*{Use of This Documentation}

This documentation is NOT distributed under a GPL license. Use of this documentation is subject to the following terms:

You may create a printed copy of this documentation solely for your own personal use. Conversion to other formats is allowed as long as the actual content is not altered or edited in any way. You shall not publish or distribute this documentation in any form or on any media, except if you distribute the documentation in a manner similar to how Oracle disseminates it (that is, electronically for download on a Web site with the software) or on a CD-ROM or similar medium, provided however that the documentation is disseminated together with the software on the same medium. Any other use, such as any dissemination of printed copies or use of this documentation, in whole or in part, in another publication, requires the prior written consent from an authorized representative of Oracle. Oracle and/ or its affiliates reserve any and all rights to this documentation not expressly granted above.

\section*{Documentation Accessibility}

For information about Oracle's commitment to accessibility, visit the Oracle Accessibility Program website at
http://www.oracle.com/pls/topic/lookup?ctx=acc\&id=docacc.

\section*{Access to Oracle Support for Accessibility}

Oracle customers that have purchased support have access to electronic support through My Oracle Support. For information, visit
http://www.oracle.com/pls/topic/lookup?ctx=acc\&id=info or visit http://www.oracle.com/pls/ topic/lookup?ctx=acc\&id=trs if you are hearing impaired.

