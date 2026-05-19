\section*{Chapter 8 Security}
Table of Contents
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
When thinking about security within a MySQL installation, you should consider a wide range of possible topics and how they affect the security of your MySQL server and related applications:
- General factors that affect security. These include choosing good passwords, not granting unnecessary privileges to users, ensuring application security by preventing SQL injections and data corruption, and others. See Section 8.1, "General Security Issues".
- Security of the installation itself. The data files, log files, and the all the application files of your installation should be protected to ensure that they are not readable or writable by unauthorized parties. For more information, see Section 2.9, "Postinstallation Setup and Testing".
- Access control and security within the database system itself, including the users and databases granted with access to the databases, views and stored programs in use within the database. For more information, see Section 8.2, "Access Control and Account Management".
- The features offered by security-related plugins. See Section 8.4, "Security Components and Plugins".
- Network security of MySQL and your system. The security is related to the grants for individual users, but you may also wish to restrict MySQL so that it is available only locally on the MySQL server host, or to a limited set of other hosts.
- Ensure that you have adequate and appropriate backups of your database files, configuration and log files. Also be sure that you have a recovery solution in place and test that you are able to successfully recover the information from your backups. See Chapter 9, Backup and Recovery.

\section*{Note}

Several topics in this chapter are also addressed in the Secure Deployment Guide, which provides procedures for deploying a generic binary distribution of MySQL Enterprise Edition Server with features for managing the security of your MySQL installation.

\subsection*{8.1 General Security Issues}

This section describes general security issues to be aware of and what you can do to make your MySQL installation more secure against attack or misuse. For information specifically about the access control system that MySQL uses for setting up user accounts and checking database access, see Section 2.9, "Postinstallation Setup and Testing".

For answers to some questions that are often asked about MySQL Server security issues, see Section A.9, "MySQL 8.4 FAQ: Security".

\subsection*{8.1.1 Security Guidelines}

Anyone using MySQL on a computer connected to the Internet should read this section to avoid the most common security mistakes.

In discussing security, it is necessary to consider fully protecting the entire server host (not just the MySQL server) against all types of applicable attacks: eavesdropping, altering, playback, and denial of service. We do not cover all aspects of availability and fault tolerance here.

MySQL uses security based on Access Control Lists (ACLs) for all connections, queries, and other operations that users can attempt to perform. There is also support for SSL-encrypted connections between MySQL clients and servers. Many of the concepts discussed here are not specific to MySQL at all; the same general ideas apply to almost all applications.

When running MySQL, follow these guidelines:
- Do not ever give anyone (except MySQL root accounts) access to the user table in the mysql system database! This is critical.
- Learn how the MySQL access privilege system works (see Section 8.2, "Access Control and Account Management"). Use the GRANT and REVOKE statements to control access to MySQL. Do not grant more privileges than necessary. Never grant privileges to all hosts.

Checklist:
- Try mysql-u root. If you are able to connect successfully to the server without being asked for a password, anyone can connect to your MySQL server as the MySQL root user with full privileges! Review the MySQL installation instructions, paying particular attention to the information about setting a root password. See Section 2.9.4, "Securing the Initial MySQL Account".
- Use the SHOW GRANTS statement to check which accounts have access to what. Then use the REVOKE statement to remove those privileges that are not necessary.
- Do not store cleartext passwords in your database. If your computer becomes compromised, the intruder can take the full list of passwords and use them. Instead, use SHA2( ) or some other oneway hashing function and store the hash value.

To prevent password recovery using rainbow tables, do not use these functions on a plain password; instead, choose some string to be used as a salt, and use hash(hash(password)+salt) values.
- Assume that all passwords will be subject to automated cracking attempts using lists of known passwords, and also to targeted guessing using publicly available information about you, such as social media posts. Do not choose passwords that consist of easily cracked or guessed items such as a dictionary word, proper name, sports team name, acronym, or commonly known phrase, particularly if they are relevant to you. The use of upper case letters, number substitutions and additions, and special characters does not help if these are used in predictable ways. Also do not choose any password you have seen used as an example anywhere, or a variation on it, even if it was presented as an example of a strong password.

Instead, choose passwords that are as long and as unpredictable as possible. That does not mean the combination needs to be a random string of characters that is difficult to remember and reproduce, although this is a good approach if you have, for example, password manager software that can generate and fill such passwords and store them securely. A passphrase containing multiple words is easy to create, remember, and reproduce, and is much more secure than a typical userselected password consisting of a single modified word or a predictable sequence of characters. To create a secure passphrase, ensure that the words and other items in it are not a known phrase or quotation, do not occur in a predictable order, and preferably have no previous relationship to each other at all.
- Invest in a firewall. This protects you from at least $50 \%$ of all types of exploits in any software. Put MySQL behind the firewall or in a demilitarized zone (DMZ).

Checklist:
- Try to scan your ports from the Internet using a tool such as nmap. MySQL uses port 3306 by default. This port should not be accessible from untrusted hosts. As a simple way to check
whether your MySQL port is open, try the following command from some remote machine, where server_host is the host name or IP address of the host on which your MySQL server runs:
\$> telnet server_host 3306
If telnet hangs or the connection is refused, the port is blocked, which is how you want it to be. If you get a connection and some garbage characters, the port is open, and should be closed on your firewall or router, unless you really have a good reason to keep it open.
- Applications that access MySQL should not trust any data entered by users, and should be written using proper defensive programming techniques. See Section 8.1.7, "Client Programming Security Guidelines".
- Do not transmit plain (unencrypted) data over the Internet. This information is accessible to everyone who has the time and ability to intercept it and use it for their own purposes. Instead, use an encrypted protocol such as SSL or SSH. MySQL supports internal SSL connections. Another technique is to use SSH port-forwarding to create an encrypted (and compressed) tunnel for the communication.
- Learn to use the tcpdump and strings utilities. In most cases, you can check whether MySQL data streams are unencrypted by issuing a command like the following:
\$> tcpdump -l -i eth0 -w - src or dst port 3306 | strings
This works under Linux and should work with small modifications under other systems.

\section*{Warning}

If you do not see cleartext data, this does not always mean that the information actually is encrypted. If you need high security, consult with a security expert.

\subsection*{8.1.2 Keeping Passwords Secure}

Passwords occur in several contexts within MySQL. The following sections provide guidelines that enable end users and administrators to keep these passwords secure and avoid exposing them. In addition, the validate_password plugin can be used to enforce a policy on acceptable password. See Section 8.4.3, "The Password Validation Component".

\subsection*{8.1.2.1 End-User Guidelines for Password Security}

MySQL users should use the following guidelines to keep passwords secure.
When you run a client program to connect to the MySQL server, it is inadvisable to specify your password in a way that exposes it to discovery by other users. The methods you can use to specify your password when you run client programs are listed here, along with an assessment of the risks of each method. In short, the safest methods are to have the client program prompt for the password or to specify the password in a properly protected option file.
- Use the mysql_config_editor utility, which enables you to store authentication credentials in an encrypted login path file named .mylogin.cnf. The file can be read later by MySQL client programs to obtain authentication credentials for connecting to MySQL Server. See Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".
- Use a --password=password or -ppassword option on the command line. For example:
\$> mysql -u francis -pfrank db_name

\section*{Warning}

This is convenient but insecure. On some systems, your password becomes visible to system status programs such as ps that may be invoked by
> other users to display command lines. MySQL clients typically overwrite the command-line password argument with zeros during their initialization sequence. However, there is still a brief interval during which the value is visible. Also, on some systems this overwriting strategy is ineffective and the password remains visible to ps. (SystemV Unix systems and perhaps others are subject to this problem.)

If your operating environment is set up to display your current command in the title bar of your terminal window, the password remains visible as long as the command is running, even if the command has scrolled out of view in the window content area.
- Use the --password or -p option on the command line with no password value specified. In this case, the client program solicits the password interactively:
```
$> mysql -u francis -p db_name
Enter password: ********
```


The * characters indicate where you enter your password. The password is not displayed as you enter it.

It is more secure to enter your password this way than to specify it on the command line because it is not visible to other users. However, this method of entering a password is suitable only for programs that you run interactively. If you want to invoke a client from a script that runs noninteractively, there is no opportunity to enter the password from the keyboard. On some systems, you may even find that the first line of your script is read and interpreted (incorrectly) as your password.
- Store your password in an option file. For example, on Unix, you can list your password in the [client] section of the .my.cnf file in your home directory:
```
[client]
password=password
```


To keep the password safe, the file should not be accessible to anyone but yourself. To ensure this, set the file access mode to 400 or 600 . For example:
```
$> chmod 600 .my.cnf
```


To name from the command line a specific option file containing the password, use the -defaults-file=file_name option, where file_name is the full path name to the file. For example:
```
$> mysql --defaults-file=/home/francis/mysql-opts
```


Section 6.2.2.2, "Using Option Files", discusses option files in more detail.

On Unix, the mysql client writes a record of executed statements to a history file (see Section 6.5.1.3, "mysql Client Logging"). By default, this file is named . mysql_history and is created in your home directory. Passwords can be written as plain text in SQL statements such as CREATE USER and ALTER USER, so if you use these statements, they are logged in the history file. To keep this file safe, use a restrictive access mode, the same way as described earlier for the .my.cnf file.

If your command interpreter maintains a history, any file in which the commands are saved contains MySQL passwords entered on the command line. For example, bash uses $\sim /$. bash_history. Any such file should have a restrictive access mode.

\subsection*{8.1.2.2 Administrator Guidelines for Password Security}

Database administrators should use the following guidelines to keep passwords secure.
MySQL stores passwords for user accounts in the mysql. user system table. Access to this table should never be granted to any nonadministrative accounts.

Account passwords can be expired so that users must reset them. See Section 8.2.15, "Password Management", and Section 8.2.16, "Server Handling of Expired Passwords".

The validate_password plugin can be used to enforce a policy on acceptable password. See Section 8.4.3, "The Password Validation Component".

A user who has access to modify the plugin directory (the value of the plugin_dir system variable) or the my. cnf file that specifies the plugin directory location can replace plugins and modify the capabilities provided by plugins, including authentication plugins.

Files such as log files to which passwords might be written should be protected. See Section 8.1.2.3, "Passwords and Logging".

\subsection*{8.1.2.3 Passwords and Logging}

Passwords can be written as plain text in SQL statements such as CREATE USER, GRANT and SET PASSWORD. If such statements are logged by the MySQL server as written, passwords in them become visible to anyone with access to the logs.

Statement logging avoids writing passwords as cleartext for the following statements:
```
CREATE USER ... IDENTIFIED BY ...
ALTER USER ... IDENTIFIED BY ...
SET PASSWORD ...
START REPLICA ... PASSWORD = ...
CREATE SERVER ... OPTIONS(... PASSWORD ...)
ALTER SERVER ... OPTIONS(... PASSWORD ...)
```


Passwords in those statements are rewritten to not appear literally in statement text written to the general query log, slow query log, and binary log. Rewriting does not apply to other statements. In particular, INSERT or UPDATE statements for the mysql. user system table that refer to literal passwords are logged as is, so you should avoid such statements. (Direct modification of grant tables is discouraged, anyway.)

For the general query log, password rewriting can be suppressed by starting the server with the --log-raw option. For security reasons, this option is not recommended for production use. For diagnostic purposes, it may be useful to see the exact text of statements as received by the server.

By default, contents of audit log files produced by the audit log plugin are not encrypted and may contain sensitive information, such as the text of SQL statements. For security reasons, audit log files should be written to a directory accessible only to the MySQL server and to users with a legitimate reason to view the log. See Section 8.4.5.3, "MySQL Enterprise Audit Security Considerations".

Statements received by the server may be rewritten if a query rewrite plugin is installed (see Query Rewrite Plugins). In this case, the --log-raw option affects statement logging as follows:
- Without - - log-raw, the server logs the statement returned by the query rewrite plugin. This may differ from the statement as received.
- With - - log - raw, the server logs the original statement as received.

An implication of password rewriting is that statements that cannot be parsed (due, for example, to syntax errors) are not written to the general query log because they cannot be known to be password free. Use cases that require logging of all statements including those with errors should use the -log-raw option, bearing in mind that this also bypasses password rewriting.

Password rewriting occurs only when plain text passwords are expected. For statements with syntax that expect a password hash value, no rewriting occurs. If a plain text password is supplied erroneously for such syntax, the password is logged as given, without rewriting.

To guard log files against unwarranted exposure, locate them in a directory that restricts access to the server and the database administrator. If the server logs to tables in the mysql database, grant access to those tables only to the database administrator.

Replicas store the password for the replication source server in their connection metadata repository, which by default is a table in the mysql database named slave_master_info. The use of a file in the data directory for the connection metadata repository is now deprecated, but still possible (see Section 19.2.4, "Relay Log and Replication Metadata Repositories"). Ensure that the connection metadata repository can be accessed only by the database administrator. An alternative to storing the password in the connection metadata repository is to use the START REPLICA or START GROUP_REPLICATION statement to specify credentials for connecting to the source.

Use a restricted access mode to protect database backups that include log tables or log files containing passwords.

\subsection*{8.1.3 Making MySQL Secure Against Attackers}

When you connect to a MySQL server, you should use a password. The password is not transmitted as cleartext over the connection.

All other information is transferred as text, and can be read by anyone who is able to watch the connection. If the connection between the client and the server goes through an untrusted network, and you are concerned about this, you can use the compressed protocol to make traffic much more difficult to decipher. You can also use MySQL's internal SSL support to make the connection even more secure. See Section 8.3, "Using Encrypted Connections". Alternatively, use SSH to get an encrypted TCP/IP connection between a MySQL server and a MySQL client. You can find an Open Source SSH client at http://www.openssh.org/, and a comparison of both Open Source and Commercial SSH clients at http://en.wikipedia.org/wiki/Comparison_of_SSH_clients.

To make a MySQL system secure, you should strongly consider the following suggestions:
- Require all MySQL accounts to have a password. A client program does not necessarily know the identity of the person running it. It is common for client/server applications that the user can specify any user name to the client program. For example, anyone can use the mysql program to connect as any other person simply by invoking it as mysql - u other_user db_name if other_user has no password. If all accounts have a password, connecting using another user's account becomes much more difficult.

For a discussion of methods for setting passwords, see Section 8.2.14, "Assigning Account Passwords".
- Make sure that the only Unix user account with read or write privileges in the database directories is the account that is used for running mysqld.
- Never run the MySQL server as the Unix root user. This is extremely dangerous, because any user with the FILE privilege is able to cause the server to create files as root (for example, ~root/.bashrc). To prevent this, mysqld refuses to run as root unless that is specified explicitly using the--user=root option.
mysqld can (and should) be run as an ordinary, unprivileged user instead. You can create a separate Unix account named mysql to make everything even more secure. Use this account only for administering MySQL. To start mysqld as a different Unix user, add a user option that specifies the user name in the [mysqld] group of the my. cnf option file where you specify server options. For example:
[mysqld]
user=mysql
This causes the server to start as the designated user whether you start it manually or by using mysqld_safe or mysql. server. For more details, see Section 8.1.5, "How to Run MySQL as a Normal User".

Running mysqld as a Unix user other than root does not mean that you need to change the root user name in the user table. User names for MySQL accounts have nothing to do with user names for Unix accounts.
- Do not grant the FILE privilege to nonadministrative users. Any user that has this privilege can write a file anywhere in the file system with the privileges of the mysqld daemon. This includes the server's data directory containing the files that implement the privilege tables. To make FILEprivilege operations a bit safer, files generated with SELECT ... INTO OUTFILE do not overwrite existing files and are writable by everyone.

The FILE privilege may also be used to read any file that is world-readable or accessible to the Unix user that the server runs as. With this privilege, you can read any file into a database table. This could be abused, for example, by using LOAD DATA to load /etc/passwd into a table, which then can be displayed with SELECT.

To limit the location in which files can be read and written, set the secure_file_priv system to a specific directory. See Section 7.1.8, "Server System Variables".
- Encrypt binary log files and relay log files. Encryption helps to protect these files and the potentially sensitive data contained in them from being misused by outside attackers, and also from unauthorized viewing by users of the operating system where they are stored. You enable encryption on a MySQL server by setting the binlog_encryption system variable to 0N. For more information, see Section 19.3.2, "Encrypting Binary Log Files and Relay Log Files".
- Do not grant the PROCESS or SUPER privilege to nonadministrative users. The output of mysqladmin processlist and SHOW PROCESSLIST shows the text of any statements currently being executed, so any user who is permitted to see the server process list might be able to see statements issued by other users.
mysqld reserves an extra connection for users who have the CONNECTION_ADMIN or SUPER privilege, so that a MySQL root user can log in and check server activity even if all normal connections are in use.

The SUPER privilege can be used to terminate client connections, change server operation by changing the value of system variables, and control replication servers.
- Do not permit the use of symlinks to tables. (This capability can be disabled with the --skip-symbolic-links option.) This is especially important if you run mysqld as root, because anyone that has write access to the server's data directory then could delete any file in the system! See Section 10.12.2.2, "Using Symbolic Links for MyISAM Tables on Unix".
- Stored programs and views should be written using the security guidelines discussed in Section 27.6, "Stored Object Access Control".
- If you do not trust your DNS, you should use IP addresses rather than host names in the grant tables. In any case, you should be very careful about creating grant table entries using host name values that contain wildcards.
- If you want to restrict the number of connections permitted to a single account, you can do so by setting the max_user_connections variable in mysqld. The CREATE USER and ALTER USER statements also support resource control options for limiting the extent of server use permitted to an account. See Section 15.7.1.3, "CREATE USER Statement", and Section 15.7.1.1, "ALTER USER Statement".
- If the plugin directory is writable by the server, it may be possible for a user to write executable code to a file in the directory using SELECT ... INTO DUMPFILE. This can be prevented by making plugin_dir read only to the server or by setting secure_file_priv to a directory where SELECT writes can be made safely.

\subsection*{8.1.4 Security-Related mysqld Options and Variables}

The following table shows mysqld options and system variables that affect security. For descriptions of each of these, see Section 7.1.7, "Server Command Options", and Section 7.1.8, "Server System Variables".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.1 Security Option and Variable Summary}
\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline allow-suspiciousudfs & Yes & Yes & & & & \\
\hline automatic_sp & Mesileges & Yes & Yes & & Global & Yes \\
\hline chroot & Yes & Yes & & & & \\
\hline local_infile & Yes & Yes & Yes & & Global & Yes \\
\hline safe-usercreate & Yes & Yes & & & & \\
\hline secure_file_pr & Yes & Yes & Yes & & Global & No \\
\hline skip-granttables & Yes & Yes & & & & \\
\hline skip_name_resbesse & & Yes & Yes & & Global & No \\
\hline skip_networkin & wes & Yes & Yes & & Global & No \\
\hline skip_show_da & tabase & Yes & Yes & & Global & No \\
\hline
\end{tabular}
\end{table}

\subsection*{8.1.5 How to Run MySQL as a Normal User}

On Windows, you can run the server as a Windows service using a normal user account.
On Linux, for installations performed using a MySQL repository or RPM packages, the MySQL server mysqld should be started by the local mysql operating system user. Starting by another operating system user is not supported by the init scripts that are included as part of the MySQL repositories.

On Unix (or Linux for installations performed using tar.gz packages), the MySQL server mysqld can be started and run by any user. However, you should avoid running the server as the Unix root user for security reasons. To change mysqld to run as a normal unprivileged Unix user user_name, you must do the following:
1. Stop the server if it is running (use mysqladmin shutdown).
2. Change the database directories and files so that user_name has privileges to read and write files in them (you might need to do this as the Unix root user):
```
$> chown -R user_name /path/to/mysql/datadir
```


If you do not do this, the server cannot access databases or tables when it runs as user_name.
If directories or files within the MySQL data directory are symbolic links, chown - R might not follow symbolic links for you. If it does not, you must also follow those links and change the directories and files they point to.
3. Start the server as user user_name. Another alternative is to start mysqld as the Unix root user and use the --user=user_name option. mysqld starts, then switches to run as the Unix user user_name before accepting any connections.
4. To start the server as the given user automatically at system startup time, specify the user name by adding a user option to the [mysqld] group of the /etc/my.cnf option file or the my.cnf option file in the server's data directory. For example:
```
[mysqld]
user=user_name
```


If your Unix machine itself is not secured, you should assign passwords to the MySQL root account in the grant tables. Otherwise, any user with a login account on that machine can run the mysql client with a--user=root option and perform any operation. (It is a good idea to assign passwords to

MySQL accounts in any case, but especially so when other login accounts exist on the server host.) See Section 2.9.4, "Securing the Initial MySQL Account".

\subsection*{8.1.6 Security Considerations for LOAD DATA LOCAL}

The LOAD DATA statement loads a data file into a table. The statement can load a file located on the server host, or, if the LOCAL keyword is specified, on the client host.

The LOCAL version of LOAD DATA has two potential security issues:
- Because LOAD DATA LOCAL is an SQL statement, parsing occurs on the server side, and transfer of the file from the client host to the server host is initiated by the MySQL server, which tells the client the file named in the statement. In theory, a patched server could tell the client program to transfer a file of the server's choosing rather than the file named in the statement. Such a server could access any file on the client host to which the client user has read access. (A patched server could in fact reply with a file-transfer request to any statement, not just LOAD DATA LOCAL, so a more fundamental issue is that clients should not connect to untrusted servers.)
- In a Web environment where the clients are connecting from a Web server, a user could use LOAD DATA LOCAL to read any files that the Web server process has read access to (assuming that a user could run any statement against the SQL server). In this environment, the client with respect to the MySQL server actually is the Web server, not a remote program being run by users who connect to the Web server.

To avoid connecting to untrusted servers, clients can establish a secure connection and verify the server identity by connecting using the --ssl-mode=VERIFY_IDENTITY option and the appropriate CA certificate. To implement this level of verification, you must first ensure that the CA certificate for the server is reliably available to the replica, otherwise availability issues will result. For more information, see Command Options for Encrypted Connections.

To avoid LOAD DATA issues, clients should avoid using LOCAL unless proper client-side precautions have been taken.

For control over local data loading, MySQL permits the capability to be enabled or disabled. MySQL also enables clients to restrict local data loading operations to files located in a designated directory.
- Enabling or Disabling Local Data Loading Capability
- Restricting Files Permitted for Local Data Loading
- MySQL Shell and Local Data Loading

\section*{Enabling or Disabling Local Data Loading Capability}

Administrators and applications can configure whether to permit local data loading as follows:
- On the server side:
- The local_infile system variable controls server-side LOCAL capability. Depending on the local_infile setting, the server refuses or permits local data loading by clients that request local data loading.
- By default, local_infile is disabled. (This is a change from previous versions of MySQL.) To cause the server to refuse or permit LOAD DATA LOCAL statements explicitly (regardless of how client programs and libraries are configured at build time or runtime), start mysqld with local_infile disabled or enabled. local_infile can also be set at runtime.
- On the client side:
- The ENABLED_LOCAL_INFILE CMake option controls the compiled-in default LOCAL capability for the MySQL client library (see Section 2.8.7, "MySQL Source-Configuration Options"). Clients that make no explicit arrangements therefore have LOCAL capability disabled or enabled according to the ENABLED_LOCAL_INFILE setting specified at MySQL build time.
- By default, the client library in MySQL binary distributions is compiled with ENABLED_LOCAL_INFILE disabled. If you compile MySQL from source, configure it with ENABLED_LOCAL_INFILE disabled or enabled based on whether clients that make no explicit arrangements should have LOCAL capability disabled or enabled.
- For client programs that use the C API, local data loading capability is determined by the default compiled into the MySQL client library. To enable or disable it explicitly, invoke the mysql_options( ) C API function to disable or enable the MYSQL_OPT_LOCAL_INFILE option. See mysql_options().
- For the mysql client, local data loading capability is determined by the default compiled into the MySQL client library. To disable or enable it explicitly, use the --local-infile=0 or --localinfile[=1] option.
- For the mysqlimport client, local data loading is not used by default. To disable or enable it explicitly, use the --local=0 or --local[=1] option.
- If you use LOAD DATA LOCAL in Perl scripts or other programs that read the [client] group from option files, you can add a local-infile option setting to that group. To prevent problems for programs that do not understand this option, specify it using the loose- prefix:
```
[client]
loose-local-infile=0
```

or:
```
[client]
loose-local-infile=1
```

- In all cases, successful use of a LOCAL load operation by a client also requires that the server permits local loading.

If LOCAL capability is disabled, on either the server or client side, a client that attempts to issue a LOAD DATA LOCAL statement receives the following error message:
```
ERROR 3950 (42000): Loading local data is disabled; this must be
enabled on both the client and server side
```


\section*{Restricting Files Permitted for Local Data Loading}

The MySQL client library enables client applications to restrict local data loading operations to files located in a designated directory. Certain MySQL client programs take advantage of this capability.

Client programs that use the C API can control which files to permit for load data loading using the MYSQL_OPT_LOCAL_INFILE and MYSQL_OPT_LOAD_DATA_LOCAL_DIR options of the mysql_options() C API function (see mysql_options()).

The effect of MYSQL_OPT_LOAD_DATA_LOCAL_DIR depends on whether LOCAL data loading is enabled or disabled:
- If LOCAL data loading is enabled, either by default in the MySQL client library or by explicitly enabling MYSQL_OPT_LOCAL_INFILE, the MYSQL_OPT_LOAD_DATA_LOCAL_DIR option has no effect.
- If LOCAL data loading is disabled, either by default in the MySQL client library or by explicitly disabling MYSQL_OPT_LOCAL_INFILE, the MYSQL_OPT_LOAD_DATA_LOCAL_DIR option can be used to designate a permitted directory for locally loaded files. In this case, LOCAL data loading is permitted but restricted to files located in the designated directory. Interpretation of the MYSQL_OPT_LOAD_DATA_LOCAL_DIR value is as follows:
- If the value is the null pointer (the default), it names no directory, with the result that no files are permitted for LOCAL data loading.
- If the value is a directory path name, LOCAL data loading is permitted but restricted to files located in the named directory. Comparison of the directory path name and the path name of files to be loaded is case-sensitive regardless of the case sensitivity of the underlying file system.

MySQL client programs use the preceding mysql_options() options as follows:
- The mysql client has a--load-data-local-dir option that takes a directory path or an empty string. mysql uses the option value to set the MYSQL_OPT_LOAD_DATA_LOCAL_DIR option (with an empty string setting the value to the null pointer). The effect of--load-data-local-dir depends on whether LOCAL data loading is enabled:
- If LOCAL data loading is enabled, either by default in the MySQL client library or by specifying - -local-infile[=1], the--load-data-local-dir option is ignored.
- If LOCAL data loading is disabled, either by default in the MySQL client library or by specifying - -local-infile=0, the--load-data-local-dir option applies.

When--load-data-local-dir applies, the option value designates the directory in which local data files must be located. Comparison of the directory path name and the path name of files to be loaded is case-sensitive regardless of the case sensitivity of the underlying file system. If the option value is the empty string, it names no directory, with the result that no files are permitted for local data loading.
- mysqlimport sets MYSQL_OPT_LOAD_DATA_LOCAL_DIR for each file that it processes so that the directory containing the file is the permitted local loading directory.
- For data loading operations corresponding to LOAD DATA statements, mysqlbinlog extracts the files from the binary log events, writes them as temporary files to the local file system, and writes LOAD DATA LOCAL statements to cause the files to be loaded. By default, mysqlbinlog writes these temporary files to an operating system-specific directory. The --local-load option can be used to explicitly specify the directory where mysqlbinlog should prepare local temporary files.

Because other processes can write files to the default system-specific directory, it is advisable to specify the --local-load option to mysqlbinlog to designate a different directory for data files, and then designate that same directory by specifying the--load-data-local-dir option to mysql when processing the output from mysqlbinlog.

\section*{MySQL Shell and Local Data Loading}

MySQL Shell provides a number of utilities to dump tables, schemas, or server instances and load them into other instances. When you use these utilities to handle the data, MySQL Shell provides additional functions such as input preprocessing, multithreaded parallel loading, file compression and decompression, and handling access to Oracle Cloud Infrastructure Object Storage buckets. To get the best functionality, always use the most recent version available of MySQL Shell's dump and dump loading utilities.

MySQL Shell's data upload utilities use LOAD DATA LOCAL INFILE statements to upload data, so the local_infile system variable must be set to ON on the target server instance. You can do this before uploading the data, and remove it again afterwards. The utilities handle the file transfer requests safely to deal with the security considerations discussed in this topic.

MySQL Shell includes these dump and dump loading utilities:

Table export utility
util.exportTable()

Exports a MySQL relational table into a data file, which can be uploaded to a MySQL server instance using MySQL Shell's parallel table import utility, imported to a different application, or used as a logical backup. The utility has preset options and customization options to produce different output formats.

Parallel table import utility util.importTable()

Imports a data file to a MySQL relational table. The data file can be the output from MySQL Shell's table export utility or another
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1167.jpg?height=881&width=1607&top_left_y=239&top_left_x=340)

For details of the utilities, see MySQL Shell Utilities.

\subsection*{8.1.7 Client Programming Security Guidelines}

Client applications that access MySQL should use the following guidelines to avoid interpreting external data incorrectly or exposing sensitive information.
- Handle External Data Properly
- Handle MySQL Error Messages Properly

\section*{Handle External Data Properly}

Applications that access MySQL should not trust any data entered by users, who can try to trick your code by entering special or escaped character sequences in Web forms, URLs, or whatever application you have built. Be sure that your application remains secure if a user tries to perform SQL injection by entering something like; DROP DATABASE mysql; into a form. This is an extreme example, but large security leaks and data loss might occur as a result of hackers using similar techniques, if you do not prepare for them.

A common mistake is to protect only string data values. Remember to check numeric data as well. If an application generates a query such as SELECT * FROM table WHERE ID=234 when a user enters the value 234 , the user can enter the value 234 OR $1=1$ to cause the application to generate the query SELECT * FROM table WHERE ID=234 OR $1=1$. As a result, the server retrieves every row in the table. This exposes every row and causes excessive server load. The simplest way to protect from this type of attack is to use single quotation marks around the numeric constants: SELECT * FROM table WHERE ID='234'. If the user enters extra information, it all becomes part of the string. In a numeric context, MySQL automatically converts this string to a number and strips any trailing nonnumeric characters from it.

Sometimes people think that if a database contains only publicly available data, it need not be protected. This is incorrect. Even if it is permissible to display any row in the database, you should still protect against denial of service attacks (for example, those that are based on the technique in the preceding paragraph that causes the server to waste resources). Otherwise, your server becomes unresponsive to legitimate users.

Checklist:
- Enable strict SQL mode to tell the server to be more restrictive of what data values it accepts. See Section 7.1.11, "Server SQL Modes".
- Try to enter single and double quotation marks ( ' and ") in all of your Web forms. If you get any kind of MySQL error, investigate the problem right away.
- Try to modify dynamic URLs by adding \%22 ("), \%23 (\#), and \%27 ( ' ) to them.
- Try to modify data types in dynamic URLs from numeric to character types using the characters shown in the previous examples. Your application should be safe against these and similar attacks.
- Try to enter characters, spaces, and special symbols rather than numbers in numeric fields. Your application should remove them before passing them to MySQL or else generate an error. Passing unchecked values to MySQL is very dangerous!
- Check the size of data before passing it to MySQL.
- Have your application connect to the database using a user name different from the one you use for administrative purposes. Do not give your applications any access privileges they do not need.

Many application programming interfaces provide a means of escaping special characters in data values. Properly used, this prevents application users from entering values that cause the application to generate statements that have a different effect than you intend:
- MySQL SQL statements: Use SQL prepared statements and accept data values only by means of placeholders; see Section 15.5, "Prepared Statements".
- MySQL C API: Use the mysql_real_escape_string_quote() API call. Alternatively, use the C API prepared statement interface and accept data values only by means of placeholders; see C API Prepared Statement Interface.
- MySQL++: Use the escape and quote modifiers for query streams.
- PHP: Use either the mysqli or pdo_mysql extensions, and not the older ext/mysql extension. The preferred API's support the improved MySQL authentication protocol and passwords, as well as prepared statements with placeholders. See also MySQL and PHP.

If the older ext/mysql extension must be used, then for escaping use the mysql_real_escape_string_quote() function and not mysql_escape_string() or addslashes() because only mysql_real_escape_string_quote( ) is character set-aware; the other functions can be "bypassed" when using (invalid) multibyte character sets.
- Perl DBI: Use placeholders or the quote() method.
- Java JDBC: Use a PreparedStatement object and placeholders.

Other programming interfaces might have similar capabilities.

\section*{Handle MySQL Error Messages Properly}

It is the application's responsibility to intercept errors that occur as a result of executing SQL statements with the MySQL database server and handle them appropriately.

The information returned in a MySQL error is not gratuitous because that information is key in debugging MySQL using applications. It would be nearly impossible, for example, to debug a common 10-way join SELECT statement without providing information regarding which databases, tables, and other objects are involved with problems. Thus, MySQL errors must sometimes necessarily contain references to the names of those objects.

A simple but insecure approach for an application when it receives such an error from MySQL is to intercept it and display it verbatim to the client. However, revealing error information is a known application vulnerability type (CWE-209) and the application developer must ensure the application does not have this vulnerability.

For example, an application that displays a message such as this exposes both a database name and a table name to clients, which is information a client might attempt to exploit:

ERROR 1146 (42S02): Table 'mydb.mytable' doesn't exist
Instead, the proper behavior for an application when it receives such an error from MySQL is to log appropriate information, including the error information, to a secure audit location only accessible to trusted personnel. The application can return something more generic such as "Internal Error" to the user.

\subsection*{8.2 Access Control and Account Management}

MySQL enables the creation of accounts that permit client users to connect to the server and access data managed by the server. The primary function of the MySQL privilege system is to authenticate a user who connects from a given host and to associate that user with privileges on a database such as SELECT, INSERT, UPDATE, and DELETE. Additional functionality includes the ability to grant privileges for administrative operations.

To control which users can connect, each account can be assigned authentication credentials such as a password. The user interface to MySQL accounts consists of SQL statements such as CREATE USER, GRANT, and REVOKE. See Section 15.7.1, "Account Management Statements".

The MySQL privilege system ensures that all users may perform only the operations permitted to them. As a user, when you connect to a MySQL server, your identity is determined by the host from which you connect and the user name you specify. When you issue requests after connecting, the system grants privileges according to your identity and what you want to do.

MySQL considers both your host name and user name in identifying you because there is no reason to assume that a given user name belongs to the same person on all hosts. For example, the user joe who connects from office.example.com need not be the same person as the user joe who connects from home.example.com. MySQL handles this by enabling you to distinguish users on different hosts that happen to have the same name: You can grant one set of privileges for connections by joe from office.example.com, and a different set of privileges for connections by joe from home.example.com. To see what privileges a given account has, use the SHOW GRANTS statement.
For example:
SHOW GRANTS FOR 'joe'@'office.example.com';
SHOW GRANTS FOR 'joe'@'home.example.com';
Internally, the server stores privilege information in the grant tables of the mysql system database. The MySQL server reads the contents of these tables into memory when it starts and bases access-control decisions on the in-memory copies of the grant tables.

MySQL access control involves two stages when you run a client program that connects to the server:
Stage 1: The server accepts or rejects the connection based on your identity and whether you can verify your identity by supplying the correct password.

Stage 2: Assuming that you can connect, the server checks each statement you issue to determine whether you have sufficient privileges to perform it. For example, if you try to select rows from a table in a database or drop a table from the database, the server verifies that you have the SELECT privilege for the table or the DROP privilege for the database.

For a more detailed description of what happens during each stage, see Section 8.2.6, "Access Control, Stage 1: Connection Verification", and Section 8.2.7, "Access Control, Stage 2: Request Verification". For help in diagnosing privilege-related problems, see Section 8.2.22, "Troubleshooting Problems Connecting to MySQL".

If your privileges are changed (either by yourself or someone else) while you are connected, those changes do not necessarily take effect immediately for the next statement that you issue. For details about the conditions under which the server reloads the grant tables, see Section 8.2.13, "When Privilege Changes Take Effect".

There are some things that you cannot do with the MySQL privilege system:
- You cannot explicitly specify that a given user should be denied access. That is, you cannot explicitly match a user and then refuse the connection.
- You cannot specify that a user has privileges to create or drop tables in a database but not to create or drop the database itself.
- A password applies globally to an account. You cannot associate a password with a specific object such as a database, table, or routine.

\subsection*{8.2.1 Account User Names and Passwords}

MySQL stores accounts in the user table of the mysql system database. An account is defined in terms of a user name and the client host or hosts from which the user can connect to the server. For information about account representation in the user table, see Section 8.2.3, "Grant Tables".

An account may also have authentication credentials such as a password. The credentials are handled by the account authentication plugin. MySQL supports multiple authentication plugins. Some of them use built-in authentication methods, whereas others enable authentication using external authentication methods. See Section 8.2.17, "Pluggable Authentication".

There are several distinctions between the way user names and passwords are used by MySQL and your operating system:
- User names, as used by MySQL for authentication purposes, have nothing to do with user names (login names) as used by Windows or Unix. On Unix, most MySQL clients by default try to log in using the current Unix user name as the MySQL user name, but that is for convenience only. The default can be overridden easily, because client programs permit any user name to be specified with a - u or --user option. This means that anyone can attempt to connect to the server using any user name, so you cannot make a database secure in any way unless all MySQL accounts have passwords. Anyone who specifies a user name for an account that has no password can connect successfully to the server.
- MySQL user names are up to 32 characters long. Operating system user names may have a different maximum length.

\section*{Warning}

The MySQL user name length limit is hardcoded in MySQL servers and clients, and trying to circumvent it by modifying the definitions of the tables in the mysql database does not work.

You should never alter the structure of tables in the mysql database in any manner whatsoever except by means of the procedure that is described in Chapter 3, Upgrading MySQL. Attempting to redefine the MySQL system tables in any other fashion results in undefined and unsupported behavior. The server is free to ignore rows that become malformed as a result of such modifications.
- To authenticate client connections for accounts that use built-in authentication methods, the server uses passwords stored in the user table. These passwords are distinct from passwords for logging in to your operating system. There is no necessary connection between the "external" password you use to log in to a Windows or Unix machine and the password you use to access the MySQL server on that machine.

If the server authenticates a client using some other plugin, the authentication method that the plugin implements may or may not use a password stored in the user table. In this case, it is possible that an external password is also used to authenticate to the MySQL server.
- Passwords stored in the user table are encrypted using plugin-specific algorithms.
- If the user name and password contain only ASCII characters, it is possible to connect to the server regardless of character set settings. To enable connections when the user name or password contain non-ASCII characters, client applications should call the mysql_options ( ) C API function with the MYSQL_SET_CHARSET_NAME option and appropriate character set name as arguments. This causes authentication to take place using the specified character set. Otherwise, authentication fails unless the server default character set is the same as the encoding in the authentication defaults.

Standard MySQL client programs support a --default-character-set option that causes mysql_options( ) to be called as just described. In addition, character set autodetection is supported as described in Section 12.4, "Connection Character Sets and Collations". For programs that use a connector that is not based on the C API, the connector may provide an equivalent to mysql_options() that can be used instead. Check the connector documentation.

The preceding notes do not apply for ucs2, utf16, and utf32, which are not permitted as client character sets.

The MySQL installation process populates the grant tables with an initial root account, as described in Section 2.9.4, "Securing the Initial MySQL Account", which also discusses how to assign a password to it. Thereafter, you normally set up, modify, and remove MySQL accounts using statements such as CREATE USER, DROP USER, GRANT, and REVOKE. See Section 8.2.8, "Adding Accounts, Assigning Privileges, and Dropping Accounts", and Section 15.7.1, "Account Management Statements".

To connect to a MySQL server with a command-line client, specify user name and password options as necessary for the account that you want to use:
```
$> mysql --user=finley --password db_name
```


If you prefer short options, the command looks like this:
```
$> mysql -u finley -p db_name
```


If you omit the password value following the --password or -p option on the command line (as just shown), the client prompts for one. Alternatively, the password can be specified on the command line:
```
$> mysql --user=finley --password=password db_name
$> mysql -u finley -ppassword db_name
```


If you use the - p option, there must be no space between - p and the following password value.
Specifying a password on the command line should be considered insecure. See Section 8.1.2.1, "End-User Guidelines for Password Security". To avoid giving the password on the command line, use an option file or a login path file. See Section 6.2.2.2, "Using Option Files", and Section 6.6.7, "mysql_config_editor - MySQL Configuration Utility".

For additional information about specifying user names, passwords, and other connection parameters, see Section 6.2.4, "Connecting to the MySQL Server Using Command Options".

\subsection*{8.2.2 Privileges Provided by MySQL}

The privileges granted to a MySQL account determine which operations the account can perform. MySQL privileges differ in the contexts in which they apply and at different levels of operation:
- Administrative privileges enable users to manage operation of the MySQL server. These privileges are global because they are not specific to a particular database.
- Database privileges apply to a database and to all objects within it. These privileges can be granted for specific databases, or globally so that they apply to all databases.
- Privileges for database objects such as tables, indexes, views, and stored routines can be granted for specific objects within a database, for all objects of a given type within a database (for example, all tables in a database), or globally for all objects of a given type in all databases.

Privileges also differ in terms of whether they are static (built in to the server) or dynamic (defined at runtime). Whether a privilege is static or dynamic affects its availability to be granted to user accounts and roles. For information about the differences between static and dynamic privileges, see Static Versus Dynamic Privileges.)

Information about account privileges is stored in the grant tables in the mysql system database. For a description of the structure and contents of these tables, see Section 8.2.3, "Grant Tables". The MySQL server reads the contents of the grant tables into memory when it starts, and reloads them under the circumstances indicated in Section 8.2.13, "When Privilege Changes Take Effect". The server bases access-control decisions on the in-memory copies of the grant tables.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1172.jpg?height=96&width=104&top_left_y=699&top_left_x=301)

\section*{Important}

Some MySQL releases introduce changes to the grant tables to add new privileges or features. To make sure that you can take advantage of any new capabilities, update your grant tables to the current structure whenever you upgrade MySQL. See Chapter 3, Upgrading MySQL.

The following sections summarize the available privileges, provide more detailed descriptions of each privilege, and offer usage guidelines.
- Summary of Available Privileges
- Static Privilege Descriptions
- Dynamic Privilege Descriptions
- Privilege-Granting Guidelines
- Static Versus Dynamic Privileges
- Migrating Accounts from SUPER to Dynamic Privileges

\section*{Summary of Available Privileges}

The following table shows the static privilege names used in GRANT and REVOKE statements, along with the column name associated with each privilege in the grant tables and the context in which the privilege applies.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.2 Permissible Static Privileges for GRANT and REVOKE}
\begin{tabular}{|l|l|l|}
\hline Privilege & Grant Table Column & Context \\
\hline ALL [PRIVILEGES] & Synonym for "all privileges" & Server administration \\
\hline ALTER & Alter_priv & Tables \\
\hline ALTER ROUTINE & Alter_routine_priv & Stored routines \\
\hline CREATE & Create_priv & Databases, tables, or indexes \\
\hline CREATE ROLE & Create_role_priv & Server administration \\
\hline CREATE ROUTINE & Create_routine_priv & Stored routines \\
\hline CREATE TABLESPACE & Create_tablespace_priv & Server administration \\
\hline CREATE TEMPORARY TABLES & Create_tmp_table_priv & Tables \\
\hline CREATE USER & Create_user_priv & Server administration \\
\hline CREATE VIEW & Create_view_priv & Views \\
\hline DELETE & Delete_priv & Tables \\
\hline DROP & Drop_priv & Databases, tables, or views \\
\hline DROP ROLE & Drop_role_priv & Server administration \\
\hline EVENT & Event_priv & Databases \\
\hline EXECUTE & Execute_priv & Stored routines \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Privilege & Grant Table Column & Context \\
\hline FILE & File_priv & File access on server host \\
\hline GRANT OPTION & Grant_priv & Databases, tables, or stored routines \\
\hline INDEX & Index_priv & Tables \\
\hline INSERT & Insert_priv & Tables or columns \\
\hline LOCK TABLES & Lock_tables_priv & Databases \\
\hline PROCESS & Process_priv & Server administration \\
\hline PROXY & See proxies_priv table & Server administration \\
\hline REFERENCES & References_priv & Databases or tables \\
\hline RELOAD & Reload_priv & Server administration \\
\hline REPLICATION CLIENT & Repl_client_priv & Server administration \\
\hline REPLICATION SLAVE & Repl_slave_priv & Server administration \\
\hline SELECT & Select_priv & Tables or columns \\
\hline SHOW DATABASES & Show_db_priv & Server administration \\
\hline SHOW VIEW & Show_view_priv & Views \\
\hline SHUTDOWN & Shutdown_priv & Server administration \\
\hline SUPER & Super_priv & Server administration \\
\hline TRIGGER & Trigger_priv & Tables \\
\hline UPDATE & Update_priv & Tables or columns \\
\hline USAGE & Synonym for "no privileges" & Server administration \\
\hline
\end{tabular}

The following table shows the dynamic privilege names used in GRANT and REVOKE statements, along with the context in which the privilege applies.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.3 Permissible Dynamic Privileges for GRANT and REVOKE}
\begin{tabular}{|l|l|}
\hline Privilege & Context \\
\hline ALLOW_NONEXISTENT_DEFINER & Orphan object protection \\
\hline APPLICATION_PASSWORD_ADMIN & Dual password administration \\
\hline AUDIT_ABORT_EXEMPT & Allow queries blocked by audit log filter \\
\hline AUDIT_ADMIN & Audit log administration \\
\hline AUTHENTICATION_POLICY_ADMIN & Authentication administration \\
\hline BACKUP_ADMIN & Backup administration \\
\hline BINLOG_ADMIN & Backup and Replication administration \\
\hline BINLOG_ENCRYPTION_ADMIN & Backup and Replication administration \\
\hline CLONE_ADMIN & Clone administration \\
\hline CONNECTION_ADMIN & Server administration \\
\hline ENCRYPTION_KEY_ADMIN & Server administration \\
\hline FIREWALL_ADMIN & Firewall administration \\
\hline FIREWALL_EXEMPT & Firewall administration \\
\hline FIREWALL_USER & Firewall administration \\
\hline FLUSH_OPTIMIZER_COSTS & Server administration \\
\hline FLUSH_PRIVILEGES & Server administration \\
\hline FLUSH_STATUS & Server administration \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Privilege & Context \\
\hline FLUSH_TABLES & Server administration \\
\hline FLUSH_USER_RESOURCES & Server administration \\
\hline GROUP_REPLICATION_ADMIN & Replication administration \\
\hline GROUP_REPLICATION_STREAM & Replication administration \\
\hline INNODB_REDO_LOG_ARCHIVE & Redo log archiving administration \\
\hline INNODB_REDO_LOG_ENABLE & Redo log administration \\
\hline MASKING_DICTIONARIES_ADMIN & Server administration \\
\hline NDB_STORED_USER & NDB Cluster \\
\hline OPTIMIZE_LOCAL_TABLE & OPTIMIZE LOCAL TABLE statements \\
\hline PASSWORDLESS_USER_ADMIN & Authentication administration \\
\hline PERSIST_RO_VARIABLES_ADMIN & Server administration \\
\hline REPLICATION_APPLIER & PRIVILEGE_CHECKS_USER for a replication channel \\
\hline REPLICATION_SLAVE_ADMIN & Replication administration \\
\hline RESOURCE_GROUP_ADMIN & Resource group administration \\
\hline RESOURCE_GROUP_USER & Resource group administration \\
\hline ROLE_ADMIN & Server administration \\
\hline SENSITIVE_VARIABLES_OBSERVER & Server administration \\
\hline SESSION_VARIABLES_ADMIN & Server administration \\
\hline SET_ANY_DEFINER & Server administration \\
\hline SHOW_ROUTINE & Server administration \\
\hline SKIP_QUERY_REWRITE & Server administration \\
\hline SYSTEM_USER & Server administration \\
\hline SYSTEM_VARIABLES_ADMIN & Server administration \\
\hline TABLE_ENCRYPTION_ADMIN & Server administration \\
\hline TELEMETRY_LOG_ADMIN & Telemetry log administration for MySQL HeatWave on AWS \\
\hline TP_CONNECTION_ADMIN & Thread pool administration \\
\hline TRANSACTION_GTID_TAG & Replication administration \\
\hline VERSION_TOKEN_ADMIN & Server administration \\
\hline XA_RECOVER_ADMIN & Server administration \\
\hline
\end{tabular}

\section*{Static Privilege Descriptions}

Static privileges are built in to the server, in contrast to dynamic privileges, which are defined at runtime. The following list describes each static privilege available in MySQL.

Particular SQL statements might have more specific privilege requirements than indicated here. If so, the description for the statement in question provides the details.
- ALL, ALL PRIVILEGES

These privilege specifiers are shorthand for "all privileges available at a given privilege level" (except GRANT OPTION). For example, granting ALL at the global or table level grants all global privileges or all table-level privileges, respectively.
- ALTER

Enables use of the ALTER TABLE statement to change the structure of tables. ALTER TABLE also requires the CREATE and INSERT privileges. Renaming a table requires ALTER and DROP on the old table, CREATE, and INSERT on the new table.
- ALTER ROUTINE

Enables use of statements that alter or drop stored routines (stored procedures and functions). For routines that fall within the scope at which the privilege is granted and for which the user is not the user named as the routine DEFINER, also enables access to routine properties other than the routine definition.
- CREATE

Enables use of statements that create new databases and tables.
- CREATE ROLE

Enables use of the CREATE ROLE statement. (The CREATE USER privilege also enables use of the CREATE ROLE statement.) See Section 8.2.10, "Using Roles".

The CREATE ROLE and DROP ROLE privileges are not as powerful as CREATE USER because they can be used only to create and drop accounts. They cannot be used as CREATE USER can be modify account attributes or rename accounts. See User and Role Interchangeability.
- CREATE ROUTINE

Enables use of statements that create stored routines (stored procedures and functions). For routines that fall within the scope at which the privilege is granted and for which the user is not the user named as the routine DEFINER, also enables access to routine properties other than the routine definition.
- CREATE TABLESPACE

Enables use of statements that create, alter, or drop tablespaces and log file groups.
- CREATE TEMPORARY TABLES

Enables the creation of temporary tables using the CREATE TEMPORARY TABLE statement.
After a session has created a temporary table, the server performs no further privilege checks on the table. The creating session can perform any operation on the table, such as DROP TABLE, INSERT, UPDATE, or SELECT. For more information, see Section 15.1.20.2, "CREATE TEMPORARY TABLE Statement".
- CREATE USER

Enables use of the ALTER USER, CREATE ROLE, CREATE USER, DROP ROLE, DROP USER, RENAME USER, and REVOKE ALL PRIVILEGES statements.
- CREATE VIEW

Enables use of the CREATE VIEW statement.
- DELETE

Enables rows to be deleted from tables in a database.
- DROP

Enables use of statements that drop (remove) existing databases, tables, and views. The DROP privilege is required to use the ALTER TABLE ... DROP PARTITION statement on a partitioned table. The DROP privilege is also required for TRUNCATE TABLE.
- DROP ROLE

Enables use of the DROP ROLE statement. (The CREATE USER privilege also enables use of the DROP ROLE statement.) See Section 8.2.10, "Using Roles".

The CREATE ROLE and DROP ROLE privileges are not as powerful as CREATE USER because they can be used only to create and drop accounts. They cannot be used as CREATE USER can be modify account attributes or rename accounts. See User and Role Interchangeability.
- EVENT

Enables use of statements that create, alter, drop, or display events for the Event Scheduler.
- EXECUTE

Enables use of statements that execute stored routines (stored procedures and functions). For routines that fall within the scope at which the privilege is granted and for which the user is not the user named as the routine DEFINER, also enables access to routine properties other than the routine definition.
- FILE

Affects the following operations and server behaviors:
- Enables reading and writing files on the server host using the LOAD DATA and SELECT . . . INTO OUTFILE statements and the LOAD_FILE() function. A user who has the FILE privilege can read any file on the server host that is either world-readable or readable by the MySQL server. (This implies the user can read any file in any database directory, because the server can access any of those files.)
- Enables creating new files in any directory where the MySQL server has write access. This includes the server's data directory containing the files that implement the privilege tables.
- Enables use of the DATA DIRECTORY or INDEX DIRECTORY table option for the CREATE TABLE statement.

As a security measure, the server does not overwrite existing files.
To limit the location in which files can be read and written, set the secure_file_priv system variable to a specific directory. See Section 7.1.8, "Server System Variables".
- GRANT OPTION

Enables you to grant to or revoke from other users those privileges that you yourself possess.
- INDEX

Enables use of statements that create or drop (remove) indexes. INDEX applies to existing tables. If you have the CREATE privilege for a table, you can include index definitions in the CREATE TABLE statement.
- INSERT

Enables rows to be inserted into tables in a database. INSERT is also required for the ANALYZE TABLE, OPTIMIZE TABLE, and REPAIR TABLE table-maintenance statements.
- LOCK TABLES

Enables use of explicit LOCK TABLES statements to lock tables for which you have the SELECT privilege. This includes use of write locks, which prevents other sessions from reading the locked table.
- PROCESS

The PROCESS privilege controls access to information about threads executing within the server (that is, information about statements being executed by sessions). Thread information available using the SHOW PROCESSLIST statement, the mysqladmin processlist command, the Information Schema PROCESSLIST table, and the Performance Schema processlist table is accessible as follows:
- With the PROCESS privilege, a user has access to information about all threads, even those belonging to other users.
- Without the PROCESS privilege, nonanonymous users have access to information about their own threads but not threads for other users, and anonymous users have no access to thread information.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1177.jpg?height=211&width=268&top_left_y=788&top_left_x=402)

\section*{Note}

The Performance Schema threads table also provides thread information, but table access uses a different privilege model. See Section 29.12.22.8, "The threads Table".

The PROCESS privilege also enables use of the SHOW ENGINE statement, access to the INFORMATION_SCHEMA InnoDB tables (tables with names that begin with INNODB_), and access to the INFORMATION_SCHEMA FILES table.
- PROXY

Enables one user to impersonate or become known as another user. See Section 8.2.19, "Proxy Users".
- REFERENCES

Creation of a foreign key constraint requires the REFERENCES privilege for the parent table.
- RELOAD

The RELOAD enables the following operations:
- Use of the FLUSH statement.
- Use of mysqladmin commands that are equivalent to FLUSH operations: flush-hosts, flushlogs, flush-privileges, flush-status, flush-tables, refresh, and reload.

The reload command tells the server to reload the grant tables into memory. flushprivileges is a synonym for reload. The refresh command closes and reopens the log files and flushes all tables. The other flush- $x x x$ commands perform functions similar to refresh, but are more specific and may be preferable in some instances. For example, if you want to flush just the log files, flush-logs is a better choice than refresh.
- Use of mysqldump options that perform various FLUSH operations: --flush-logs and --source-data.
- Use of the RESET BINARY LOGS AND GTIDS and RESET REPLICA statements.
- REPLICATION CLIENT

Enables use of the SHOW BINARY LOG STATUS, SHOW REPLICA STATUS, and SHOW BINARY LOGS statements.
- REPLICATION SLAVE

Enables the account to request updates that have been made to databases on the replication source server, using the SHOW REPLICAS, SHOW RELAYLOG EVENTS, and SHOW BINLOG EVENTS
statements. This privilege is also required to use the mysqlbinlog options --read-from-remote-server (-R) and--read-from-remote-source. Grant this privilege to accounts that are used by replicas to connect to the current server as their replication source server.
- SELECT

Enables rows to be selected from tables in a database. SELECT statements require the SELECT privilege only if they actually access tables. Some SELECT statements do not access tables and can be executed without permission for any database. For example, you can use SELECT as a simple calculator to evaluate expressions that make no reference to tables:

SELECT 1+1;
SELECT PI()*2;
The SELECT privilege is also needed for other statements that read column values. For example, SELECT is needed for columns referenced on the right hand side of col_name=expr assignment in UPDATE statements or for columns named in the WHERE clause of DELETE or UPDATE statements.

The SELECT privilege is needed for tables or views used with EXPLAIN, including any underlying tables in view definitions.
- SHOW DATABASES

Enables the account to see database names by issuing the SHOW DATABASE statement. Accounts that do not have this privilege see only databases for which they have some privileges, and cannot use the statement at all if the server was started with the --skip-show-database option.

\section*{Caution}

Because any static global privilege is considered a privilege for all databases, any static global privilege enables a user to see all database names with SHOW DATABASES or by examining the SCHEMATA table of INFORMATION_SCHEMA, except databases that have been restricted at the database level by partial revokes.
- SHOW VIEW

Enables use of the SHOW CREATE VIEW statement. This privilege is also needed for views used with EXPLAIN.
- SHUTDOWN

Enables use of the SHUTDOWN and RESTART statements, the mysqladmin shutdown command, and the mysql_shutdown() C API function.
- SUPER

SUPER is a powerful and far-reaching privilege and should not be granted lightly. If an account needs to perform only a subset of SUPER operations, it may be possible to achieve the desired privilege set
by instead granting one or more dynamic privileges, each of which confers more limited capabilities. See Dynamic Privilege Descriptions.

\section*{Note}

SUPER is deprecated, and you should expect it to be removed in a future version of MySQL. See Migrating Accounts from SUPER to Dynamic Privileges.

SUPER affects the following operations and server behaviors:
- Enables system variable changes at runtime:
- Enables server configuration changes to global system variables with SET GLOBAL and SET PERSIST.

The corresponding dynamic privilege is SYSTEM_VARIABLES_ADMIN.
- Enables setting restricted session system variables that require a special privilege.

The corresponding dynamic privilege is SESSION_VARIABLES_ADMIN.
See also Section 7.1.9.1, "System Variable Privileges".
- Enables changes to global transaction characteristics (see Section 15.3.7, "SET TRANSACTION Statement").

The corresponding dynamic privilege is SYSTEM_VARIABLES_ADMIN.
- Enables the account to start and stop replication, including Group Replication.

The corresponding dynamic privilege is REPLICATION_SLAVE_ADMIN for regular replication, GROUP_REPLICATION_ADMIN for Group Replication.
- Enables use of CHANGE REPLICATION SOURCE TO and CHANGE REPLICATION FILTER statements.

The corresponding dynamic privilege is REPLICATION_SLAVE_ADMIN.
- Enables binary log control by means of the PURGE BINARY LOGS and BINLOG statements.

The corresponding dynamic privilege is BINLOG_ADMIN.
- Enables setting the effective authorization ID when executing a view or stored program. A user with this privilege can specify any account in the DEFINER attribute of a view or stored program.

The corresponding dynamic privileges are SET_ANY_DEFINER and ALLOW_NONEXISTENT_DEFINER.
- Enables use of the CREATE SERVER, ALTER SERVER, and DROP SERVER statements.
- Enables use of the mysqladmin debug command.
- Enables InnoDB encryption key rotation.

The corresponding dynamic privilege is ENCRYPTION_KEY_ADMIN.
- Enables execution of Version Tokens functions.

The corresponding dynamic privilege is VERSION_TOKEN_ADMIN.
- Enables granting and revoking roles, use of the WITH ADMIN OPTION clause of the GRANT statement, and nonempty <graphml> element content in the result from the ROLES_GRAPHML ( ) function.

The corresponding dynamic privilege is ROLE_ADMIN.
- Enables control over client connections not permitted to non-SUPER accounts:
- Enables use of the KILL statement or mysqladmin kill command to kill threads belonging to other accounts. (An account can always kill its own threads.)
- The server does not execute init_connect system variable content when SUPER clients connect.
- The server accepts one connection from a SUPER client even if the connection limit configured by the max_connections system variable is reached.
- A server in offline mode (offline_mode enabled) does not terminate SUPER client connections at the next client request, and accepts new connections from SUPER clients.
- Updates can be performed even when the read_only system variable is enabled. This applies to explicit table updates, and to use of account-management statements such as GRANT and REVOKE that update tables implicitly.

The corresponding dynamic privilege for the preceding connection control operations is CONNECTION_ADMIN.

You may also need the SUPER privilege to create or alter stored functions if binary logging is enabled, as described in Section 27.7, "Stored Program Binary Logging".
- TRIGGER

Enables trigger operations. You must have this privilege for a table to create, drop, execute, or display triggers for that table.

When a trigger is activated (by a user who has privileges to execute INSERT, UPDATE, or DELETE statements for the table associated with the trigger), trigger execution requires that the user who defined the trigger still have the TRIGGER privilege for the table.
- UPDATE

Enables rows to be updated in tables in a database.
- USAGE

This privilege specifier stands for "no privileges." It is used at the global level with GRANT to specify clauses such as WITH GRANT OPTION without naming specific account privileges in the privilege list. SHOW GRANTS displays USAGE to indicate that an account has no privileges at a privilege level.

\section*{Dynamic Privilege Descriptions}

Dynamic privileges are defined at runtime, in contrast to static privileges, which are built in to the server. The following list describes each dynamic privilege available in MySQL.

Most dynamic privileges are defined at server startup. Others are defined by a particular component or plugin, as indicated in the privilege descriptions. In such cases, the privilege is unavailable unless the component or plugin that defines it is enabled.

Particular SQL statements might have more specific privilege requirements than indicated here. If so, the description for the statement in question provides the details.
- ALLOW_NONEXISTENT_DEFINER

Enables overriding security checks designed to prevent operations that (perhaps inadvertently) cause stored objects to become orphaned or that cause adoption of stored objects that are currently orphaned. Without this privilege, any attempt to produce an orphaned SQL procedure, function, or view results in an error. An attempt to produce orphaned objects using CREATE PROCEDURE, CREATE FUNCTION, CREATE TRIGGER, CREATE EVENT, or CREATE VIEW also requires SET_ANY_DEFINER in addition to ALLOW_NONEXISTENT_DEFINER, so that a definer different from the current user is permissible.

For details, see Orphan Stored Objects.
- APPLICATION_PASSWORD_ADMIN

For dual-password capability, this privilege enables use of the RETAIN CURRENT PASSWORD and DISCARD OLD PASSWORD clauses for ALTER USER and SET PASSWORD statements that apply to your own account. This privilege is required to manipulate your own secondary password because most users require only one password.

If an account is to be permitted to manipulate secondary passwords for all accounts, it should be granted the CREATE USER privilege rather than APPLICATION_PASSWORD_ADMIN.

For more information about use of dual passwords, see Section 8.2.15, "Password Management".
- AUDIT_ABORT_EXEMPT

Allows queries blocked by an "abort" item in the audit log filter. This privilege is defined by the audit_log plugin; see Section 8.4.5, "MySQL Enterprise Audit".

Accounts created with the SYSTEM_USER privilege have the AUDIT_ABORT_EXEMPT privilege assigned automatically when they are created. The AUDIT_ABORT_EXEMPT privilege is also assigned to existing accounts with the SYSTEM_USER privilege when you carry out an upgrade procedure, if no existing accounts have that privilege assigned. Accounts with the SYSTEM_USER privilege can therefore be used to regain access to a system following an audit misconfiguration.
- AUDIT_ADMIN

Enables audit log configuration. This privilege is defined by the audit_log plugin; see Section 8.4.5, "MySQL Enterprise Audit".
- BACKUP_ADMIN

Enables execution of the LOCK INSTANCE FOR BACKUP statement and access to the Performance Schema log_status table.

\section*{Note}

Besides BACKUP_ADMIN, the SELECT privilege on the log_status table is also needed for its access.

The BACKUP_ADMIN privilege is automatically granted to users with the RELOAD privilege when performing an in-place upgrade to MySQL 8.4 from an earlier version.
- AUTHENTICATION_POLICY_ADMIN

The authentication_policy system variable places certain constraints on how the authentication-related clauses of CREATE USER and ALTER USER statements may be used. A user who has the AUTHENTICATION_POLICY_ADMIN privilege is not subject to these constraints. (A warning does occur for statements that otherwise would not be permitted.)

For details about the constraints imposed by authentication_policy, see the description of that variable.
- BINLOG_ADMIN

Enables binary log control by means of the PURGE BINARY LOGS and BINLOG statements.
- BINLOG_ENCRYPTION_ADMIN

Enables setting the system variable binlog_encryption, which activates or deactivates encryption for binary log files and relay log files. This ability is not provided by the BINLOG_ADMIN, SYSTEM_VARIABLES_ADMIN, or SESSION_VARIABLES_ADMIN privileges. The related system variable binlog_rotate_encryption_master_key_at_startup, which rotates the binary log master key automatically when the server is restarted, does not require this privilege.
- CLONE_ADMIN

Enables execution of the CLONE statements. Includes BACKUP_ADMIN and SHUTDOWN privileges.
- CONNECTION_ADMIN

Enables use of the KILL statement or mysqladmin kill command to kill threads belonging to other accounts. (An account can always kill its own threads.)

Enables setting system variables related to client connections, or circumventing restrictions related to client connections. CONNECTION_ADMIN is required to activate MySQL Server's offline mode, which is done by changing the value of the offline_mode system variable to 0 N .

The CONNECTION_ADMIN privilege enables administrators with it to bypass effects of these system variables:
- init_connect: The server does not execute init_connect system variable content when CONNECTION_ADMIN clients connect.
- max_connections: The server accepts one connection from a CONNECTION_ADMIN client even if the connection limit configured by the max_connections system variable is reached.
- offline_mode: A server in offline mode (offline_mode enabled) does not terminate CONNECTION_ADMIN client connections at the next client request, and accepts new connections from CONNECTION_ADMIN clients.
- read_only: Updates from CONNECTION_ADMIN clients can be performed even when the read_only system variable is enabled. This applies to explicit table updates, and to account management statements such as GRANT and REVOKE that update tables implicitly.

Group Replication group members need the CONNECTION_ADMIN privilege so that Group Replication connections are not terminated if one of the servers involved is placed in offline mode.
If the MySQL communication stack is in use (group_replication_communication_stack = MYSQL), without this privilege, a member that is placed in offline mode is expelled from the group.
- ENCRYPTION_KEY_ADMIN

Enables InnoDB encryption key rotation.
- FIREWALL_ADMIN

Enables a user to administer firewall rules for any user. This privilege is defined by the MYSQL_FIREWALL plugin; see Section 8.4.7, "MySQL Enterprise Firewall".
- FIREWALL_EXEMPT

A user with this privilege is exempt from firewall restrictions. This privilege is defined by the MYSQL_FIREWALL plugin; see Section 8.4.7, "MySQL Enterprise Firewall".
- FIREWALL_USER

Enables users to update their own firewall rules. This privilege is defined by the MYSQL_FIREWALL plugin; see Section 8.4.7, "MySQL Enterprise Firewall".
- FLUSH_OPTIMIZER_COSTS

Enables use of the FLUSH OPTIMIZER_COSTS statement.
- FLUSH_PRIVILEGES

Enables use of the FLUSH PRIVILEGES statement.
- FLUSH_STATUS

Enables use of the FLUSH STATUS statement.
- FLUSH_TABLES

Enables use of the FLUSH TABLES statement.
- FLUSH_USER_RESOURCES

Enables use of the FLUSH USER_RESOURCES statement.
- GROUP_REPLICATION_ADMIN

Enables the account to start and stop Group Replication using the START GROUP REPLICATION and STOP GROUP REPLICATION statements, to change the global setting for the group_replication_consistency system variable, and to use the group_replication_set_write_concurrency() and group_replication_set_communication_protocol() functions. Grant this privilege to accounts that are used to administer servers that are members of a replication group.
- GROUP_REPLICATION_STREAM

Allows a user account to be used for establishing Group Replication's group communication connections. It must be granted to a recovery user when the MySQL communication stack is used for Group Replication (group_replication_communication_stack=MYSQL).
- INNODB_REDO_LOG_ARCHIVE

Enables the account to activate and deactivate redo log archiving.
- INNODB_REDO_LOG_ENABLE

Enables use of the ALTER INSTANCE \{ENABLE|DISABLE\} INNODB REDO_LOG statement to enable or disable redo logging.

See Disabling Redo Logging.
- MASKING_DICTIONARIES_ADMIN

Enables the account to add and remove dictionary terms using the masking_dictionary_term_add() and masking_dictionary_term_remove() component functions. Accounts also require this dynamic privilege to remove a full dictionary using the masking_dictionary_remove() function, which removes all of the terms associated with the named dictionary currently in the mysql.masking_dictionaries table.

See Section 8.5, "MySQL Enterprise Data Masking and De-Identification".
- NDB_STORED_USER

Enables the user or role and its privileges to be shared and synchronized between all NDB-enabled MySQL servers as soon as they join a given NDB Cluster. This privilege is available only if the NDB storage engine is enabled.

Any changes to or revocations of privileges made for the given user or role are synchronized immediately with all connected MySQL servers (SQL nodes). You should be aware that there is no guarantee that multiple statements affecting privileges originating from different SQL nodes are executed on all SQL nodes in the same order. For this reason, it is highly recommended that all user administration be done from a single designated SQL node.

NDB_STORED_USER is a global privilege and must be granted or revoked using ON * *. Trying to set any other scope for this privilege results in an error. This privilege can be given to most application and administrative users, but it cannot be granted to system reserved accounts such as mysql.session@localhost or mysql.infoschema@localhost.

A user that has been granted the NDB_STORED_USER privilege is stored in NDB (and thus shared by all SQL nodes), as is a role with this privilege. A user that is merely granted a role that has NDB_STORED_USER is not stored in NDB; each NDB stored user must be granted the privilege explicitly.

For more detailed information about how this works in NDB, see Section 25.6.13, "Privilege Synchronization and NDB_STORED_USER".
- OPTIMIZE_LOCAL_TABLE

Enables use of OPTIMIZE LOCAL TABLE and OPTIMIZE NO_WRITE_TO_BINLOG TABLE statements.
- PASSWORDLESS_USER_ADMIN

This privilege applies to passwordless user accounts:
- For account creation, a user who executes CREATE USER to create a passwordless account must possess the PASSWORDLESS_USER_ADMIN privilege.
- In replication context, the PASSWORDLESS_USER_ADMIN privilege applies to replication users and enables replication of ALTER USER ... MODIFY statements for user accounts that are configured for passwordless authentication.

For information about passwordless authentication, see WebAuthn Passwordless Authentication.
- PERSIST_RO_VARIABLES_ADMIN

For users who also have SYSTEM_VARIABLES_ADMIN, PERSIST_RO_VARIABLES_ADMIN enables use of SET PERSIST_ONLY to persist global system variables to the mysqld-auto.cnf option file in the data directory. This statement is similar to SET PERSIST but does not modify the runtime global system variable value. This makes SET PERSIST_ONLY suitable for configuring read-only system variables that can be set only at server startup.

See also Section 7.1.9.1, "System Variable Privileges".
- REPLICATION_APPLIER

Enables the account to act as the PRIVILEGE_CHECKS_USER for a replication channel, and to execute BINLOG statements in mysqlbinlog output. Grant this privilege to accounts that are assigned using CHANGE REPLICATION SOURCE TO to provide a security context for replication channels, and to handle replication errors on those channels. As well as the REPLICATION_APPLIER privilege, you must also give the account the required privileges to execute the transactions received by the replication channel or contained in the mysqlbinlog output,
for example to update the affected tables. For more information, see Section 19.3.3, "Replication Privilege Checks".
- REPLICATION_SLAVE_ADMIN

Enables the account to connect to the replication source server, start and stop replication using the START REPLICA and STOP REPLICA statements, and use the CHANGE REPLICATION SOURCE TO and CHANGE REPLICATION FILTER statements. Grant this privilege to accounts that are used by replicas to connect to the current server as their replication source server. This privilege does not apply to Group Replication; use GROUP_REPLICATION_ADMIN for that.
- RESOURCE_GROUP_ADMIN

Enables resource group management, consisting of creating, altering, and dropping resource groups, and assignment of threads and statements to resource groups. A user with this privilege can perform any operation relating to resource groups.
- RESOURCE_GROUP_USER

Enables assigning threads and statements to resource groups. A user with this privilege can use the SET RESOURCE GROUP statement and the RESOURCE_GROUP optimizer hint.
- ROLE_ADMIN

Enables granting and revoking roles, use of the WITH ADMIN OPTION clause of the GRANT statement, and nonempty <graphml> element content in the result from the ROLES_GRAPHML() function. Required to set the value of the mandatory_roles system variable.
- SENSITIVE_VARIABLES_OBSERVER

Enables a holder to view the values of sensitive system variables in the Performance Schema tables global_variables, session_variables, variables_by_thread, and persisted_variables, to issue SELECT statements to return their values, and to track changes to them in session trackers for connections. Users without this privilege cannot view or track those system variable values. See Persisting Sensitive System Variables.
- SERVICE_CONNECTION_ADMIN

Enables connections to the network interface that permits only administrative connections (see Section 7.1.12.1, "Connection Interfaces").
- SESSION_VARIABLES_ADMIN

For most system variables, setting the session value requires no special privileges and can be done by any user to affect the current session. For some system variables, setting the session value can have effects outside the current session and thus is a restricted operation. For these, the SESSION_VARIABLES_ADMIN privilege enables the user to set the session value.

If a system variable is restricted and requires a special privilege to set the session value, the variable description indicates that restriction. Examples include binlog_format, sql_log_bin, and sql_log_off.

The SESSION_VARIABLES_ADMIN privilege is a subset of the SYSTEM_VARIABLES_ADMIN and SUPER privileges. A user who has either of those privileges is also permitted to set restricted session variables and effectively has SESSION_VARIABLES_ADMIN by implication and need not be granted SESSION_VARIABLES_ADMIN explicitly.

See also Section 7.1.9.1, "System Variable Privileges".
- SET_ANY_DEFINER

Enables setting the effective authorization ID when executing a view or stored program. A user with this privilege can specify any account as the DEFINER attribute for CREATE PROCEDURE, CREATE FUNCTION, CREATE TRIGGER, CREATE EVENT, ALTER EVENT, CREATE VIEW, and ALTER VIEW. Without this privilege, only the effective authentication ID can be specified.

Stored programs execute with the privileges of the specified account, so ensure that you follow the risk minimization guidelines listed in Section 27.6, "Stored Object Access Control".
- SHOW_ROUTINE

Enables a user to access definitions and properties of all stored routines (stored procedures and functions), even those for which the user is not named as the routine DEFINER. This access includes:
- The contents of the Information Schema ROUTINES table.
- The SHOW CREATE FUNCTION and SHOW CREATE PROCEDURE statements.
- The SHOW FUNCTION CODE and SHOW PROCEDURE CODE statements.
- The SHOW FUNCTION STATUS and SHOW PROCEDURE STATUS statements.

SHOW_ROUTINE may be granted instead as a privilege with a more restricted scope that permits access to routine definitions. (That is, an administrator can rescind global SELECT from users that do not otherwise require it and grant SHOW_ROUTINE instead.) This enables an account to back up stored routines without requiring a broad privilege.
- SKIP_QUERY_REWRITE

Queries issued by a user with this privilege are not subject to being rewritten by the Rewriter plugin (see Section 7.6.4, "The Rewriter Query Rewrite Plugin").

This privilege should be granted to users issuing administrative or control statements that should not be rewritten, as well as to PRIVILEGE_CHECKS_USER accounts (see Section 19.3.3, "Replication Privilege Checks") used to apply statements from a replication source.
- SYSTEM_USER

The SYSTEM_USER privilege distinguishes system users from regular users:
- A user with the SYSTEM_USER privilege is a system user.
- A user without the SYSTEM_USER privilege is a regular user.

The SYSTEM_USER privilege has an effect on the accounts to which a given user can apply its other privileges, as well as whether the user is protected from other accounts:
- A system user can modify both system and regular accounts. That is, a user who has the appropriate privileges to perform a given operation on regular accounts is enabled by possession of SYSTEM_USER to also perform the operation on system accounts. A system account can be modified only by system users with appropriate privileges, not by regular users.
- A regular user with appropriate privileges can modify regular accounts, but not system accounts. A regular account can be modified by both system and regular users with appropriate privileges.

This also means that database objects created by users with the SYSTEM_USER privilege cannot be modified or dropped by users without the privilege. This also applies to routines for which the definer has this privilege.

For more information, see Section 8.2.11, "Account Categories".

The protection against modification by regular accounts that is afforded to system accounts by the SYSTEM_USER privilege does not apply to regular accounts that have privileges on the mysql system schema and thus can directly modify the grant tables in that schema. For full protection, do not grant mysql schema privileges to regular accounts. See Protecting System Accounts Against Manipulation by Regular Accounts.

If the audit_log plugin is in use (see Section 8.4.5, "MySQL Enterprise Audit"), accounts with the SYSTEM_USER privilege are automatically assigned the AUDIT_ABORT_EXEMPT privilege, which permits their queries to be executed even if an "abort" item configured in the filter would block them. Accounts with the SYSTEM_USER privilege can therefore be used to regain access to a system following an audit misconfiguration.
- SYSTEM_VARIABLES_ADMIN

Affects the following operations and server behaviors:
- Enables system variable changes at runtime:
- Enables server configuration changes to global system variables with SET GLOBAL and SET PERSIST.
- Enables server configuration changes to global system variables with SET PERSIST_ONLY, if the user also has PERSIST_RO_VARIABLES_ADMIN.
- Enables setting restricted session system variables that require a special privilege. In effect, SYSTEM_VARIABLES_ADMIN implies SESSION_VARIABLES_ADMIN without explicitly granting SESSION_VARIABLES_ADMIN.

See also Section 7.1.9.1, "System Variable Privileges".
- Enables changes to global transaction characteristics (see Section 15.3.7, "SET TRANSACTION Statement").
- TABLE_ENCRYPTION_ADMIN

Enables a user to override default encryption settings when table_encryption_privilege_check is enabled; see Defining an Encryption Default for Schemas and General Tablespaces.
- TELEMETRY_LOG_ADMIN

Enables telemetry log configuration. This privilege is defined by the telemetry_log plugin, which is deployed through MySQL HeatWave on AWS.
- TP_CONNECTION_ADMIN

Enables connecting to the server with a privileged connection. When the limit defined by thread_pool_max_transactions_limit has been reached, new connections are not permitted, unless overridden by thread_pool_longrun_trx_limit. A privileged connection ignores the transaction limit and permits connecting to the server to increase the transaction limit, remove the limit, or kill running transactions. This privilege is not granted to any user by default. To establish a privileged connection, the user initiating a connection must have the TP_CONNECTION_ADMIN privilege.

A privileged connection can execute statements and start transactions when the limit defined by thread_pool_max_transactions_limit has been reached. A privileged connection is placed in the Admin thread group. See Privileged Connections.
- TRANSACTION_GTID_TAG

Required for setting the gtid_next system variable to AUTOMATIC : TAG or UUID : TAG : NUMBER on a replication source server. In addition, at least one of SYSTEM_VARIABLES_ADMIN, SESSION_VARIABLES_ADMIN, or REPLICATION_APPLIER is also required to set gtid_next to one of these values on the source.

The REPLICATION_CHECKS_APPLIER must also have this privilege as well as the REPLICATION_APPLIER privilege to set gtid_next to AUTOMATIC : TAG. This is checked when starting the replication applier thread.

This privilege is also required to set the gtid_purged server system variable.
For more information about using tagged GTIDs, see the description of gtid_next, as well as Section 19.1.4, "Changing GTID Mode on Online Servers".
- VERSION_TOKEN_ADMIN

Enables execution of Version Tokens functions. This privilege is defined by the version_tokens plugin; see Section 7.6.6, "Version Tokens".
- XA_RECOVER_ADMIN

Enables execution of the XA RECOVER statement; see Section 15.3.8.1, "XA Transaction SQL Statements".

Prior to MySQL 8.4, any user could execute the XA RECOVER statement to discover the XID values for outstanding prepared XA transactions, possibly leading to commit or rollback of an XA transaction by a user other than the one who started it. In MySQL 8.4, XA RECOVER is permitted only to users who have the XA_RECOVER_ADMIN privilege, which is expected to be granted only to administrative users who have need for it. This might be the case, for example, for administrators of an XA application if it has crashed and it is necessary to find outstanding transactions started by the application so they can be rolled back. This privilege requirement prevents users from discovering the XID values for outstanding prepared XA transactions other than their own. It does not affect normal commit or rollback of an XA transaction because the user who started it knows its XID.

\section*{Privilege-Granting Guidelines}

It is a good idea to grant to an account only those privileges that it needs. You should exercise particular caution in granting the FILE and administrative privileges:
- FILE can be abused to read into a database table any files that the MySQL server can read on the server host. This includes all world-readable files and files in the server's data directory. The table can then be accessed using SELECT to transfer its contents to the client host.
- GRANT OPTION enables users to give their privileges to other users. Two users that have different privileges and with the GRANT OPTION privilege are able to combine privileges.
- ALTER may be used to subvert the privilege system by renaming tables.
- SHUTDOWN can be abused to deny service to other users entirely by terminating the server.
- PROCESS can be used to view the plain text of currently executing statements, including statements that set or change passwords.
- SUPER can be used to terminate other sessions or change how the server operates.
- Privileges granted for the mysql system database itself can be used to change passwords and other access privilege information:
- Passwords are stored encrypted, so a malicious user cannot simply read them to know the plain text password. However, a user with write access to the mysql. user system table
authentication_string column can change an account's password, and then connect to the MySQL server using that account.
- INSERT or UPDATE granted for the mysql system database enable a user to add privileges or modify existing privileges, respectively.
- DROP for the mysql system database enables a user to remote privilege tables, or even the database itself.

\section*{Static Versus Dynamic Privileges}

MySQL supports static and dynamic privileges:
- Static privileges are built in to the server. They are always available to be granted to user accounts and cannot be unregistered.
- Dynamic privileges can be registered and unregistered at runtime. This affects their availability: A dynamic privilege that has not been registered cannot be granted.

For example, the SELECT and INSERT privileges are static and always available, whereas a dynamic privilege becomes available only if the component that implements it has been enabled.

The remainder of this section describes how dynamic privileges work in MySQL. The discussion uses the term "components" but applies equally to plugins.

> Note
> Server administrators should be aware of which server components define dynamic privileges. For MySQL distributions, documentation of components that define dynamic privileges describes those privileges.
> Third-party components may also define dynamic privileges; an administrator should understand those privileges and not install components that might conflict or compromise server operation. For example, one component conflicts with another if both define a privilege with the same name. Component developers can reduce the likelihood of this occurrence by choosing privilege names having a prefix based on the component name.

The server maintains the set of registered dynamic privileges internally in memory. Unregistration occurs at server shutdown.

Normally, a component that defines dynamic privileges registers them when it is installed, during its initialization sequence. When uninstalled, a component does not unregister its registered dynamic privileges. (This is current practice, not a requirement. That is, components could, but do not, unregister at any time privileges they register.)

No warning or error occurs for attempts to register an already registered dynamic privilege. Consider the following sequence of statements:
```
INSTALL COMPONENT 'my_component';
UNINSTALL COMPONENT 'my_component';
INSTALL COMPONENT 'my_component';
```


The first INSTALL COMPONENT statement registers any privileges defined by component my_component, but UNINSTALL COMPONENT does not unregister them. For the second INSTALL COMPONENT statement, the component privileges it registers are found to be already registered, but no warnings or errors occur.

Dynamic privileges apply only at the global level. The server stores information about current assignments of dynamic privileges to user accounts in the mysql.global_grants system table:
- The server automatically registers privileges named in global_grants during server startup (unless the--skip-grant-tables option is given).
- The GRANT and REVOKE statements modify the contents of global_grants.
- Dynamic privilege assignments listed in global_grants are persistent. They are not removed at server shutdown.

Example: The following statement grants to user u1 the privileges required to control replication (including Group Replication) on a replica, and to modify system variables:

GRANT REPLICATION_SLAVE_ADMIN, GROUP_REPLICATION_ADMIN, BINLOG_ADMIN
ON *.* TO 'u1'@'localhost';
Granted dynamic privileges appear in the output from the SHOW GRANTS statement and the INFORMATION_SCHEMA USER_PRIVILEGES table.

For GRANT and REVOKE at the global level, any named privileges not recognized as static are checked against the current set of registered dynamic privileges and granted if found. Otherwise, an error occurs to indicate an unknown privilege identifier.

For GRANT and REVOKE the meaning of ALL [PRIVILEGES] at the global level includes all static global privileges, as well as all currently registered dynamic privileges:
- GRANT ALL at the global level grants all static global privileges and all currently registered dynamic privileges. A dynamic privilege registered subsequent to execution of the GRANT statement is not granted retroactively to any account.
- REVOKE ALL at the global level revokes all granted static global privileges and all granted dynamic privileges.

The FLUSH PRIVILEGES statement reads the global_grants table for dynamic privilege assignments and registers any unregistered privileges found there.

For descriptions of the dynamic privileges provided by MySQL Server and components included in MySQL distributions, see Section 8.2.2, "Privileges Provided by MySQL".

\section*{Migrating Accounts from SUPER to Dynamic Privileges}

In MySQL 8.4, many operations that previously required the SUPER privilege are also associated with a dynamic privilege of more limited scope. (For descriptions of these privileges, see Section 8.2.2, "Privileges Provided by MySQL".) Each such operation can be permitted to an account by granting the associated dynamic privilege rather than SUPER. This change improves security by enabling DBAs to avoid granting SUPER and tailor user privileges more closely to the operations permitted. SUPER is now deprecated; expect it to be removed in a future version of MySQL.

When removal of SUPER occurs, operations that formerly required SUPER fail unless accounts granted SUPER are migrated to the appropriate dynamic privileges. Use the following instructions to accomplish that goal so that accounts are ready prior to SUPER removal:
1. Execute this query to identify accounts that are granted SUPER:

SELECT GRANTEE FROM INFORMATION_SCHEMA.USER_PRIVILEGES
WHERE PRIVILEGE_TYPE = 'SUPER';
2. For each account identified by the preceding query, determine the operations for which it needs SUPER. Then grant the dynamic privileges corresponding to those operations, and revoke SUPER.

For example, if ' u1 ' @ ' localhost ' requires SUPER for binary log purging and system variable modification, these statements make the required changes to the account:

GRANT BINLOG_ADMIN, SYSTEM_VARIABLES_ADMIN ON *.* TO 'u1'@'localhost';
REVOKE SUPER ON *.* FROM 'u1'@'localhost';
After you have modified all applicable accounts, the INFORMATION_SCHEMA query in the first step should produce an empty result set.

\subsection*{8.2.3 Grant Tables}

The mysql system database includes several grant tables that contain information about user accounts and the privileges held by them. This section describes those tables. For information about other tables in the system database, see Section 7.3, "The mysql System Schema".

The discussion here describes the underlying structure of the grant tables and how the server uses their contents when interacting with clients. However, normally you do not modify the grant tables directly. Modifications occur indirectly when you use account-management statements such as CREATE USER, GRANT, and REVOKE to set up accounts and control the privileges available to each one. See Section 15.7.1, "Account Management Statements". When you use such statements to perform account manipulations, the server modifies the grant tables on your behalf.

\section*{Note}

Direct modification of grant tables using statements such as INSERT, UPDATE, or DELETE is discouraged and done at your own risk. The server is free to ignore rows that become malformed as a result of such modifications.

For any operation that modifies a grant table, the server checks whether the table has the expected structure and produces an error if not. To update the tables to the expected structure, perform the MySQL upgrade procedure. See Chapter 3, Upgrading MySQL.
- Grant Table Overview
- The user and db Grant Tables
- The tables_priv and columns_priv Grant Tables
- The procs_priv Grant Table
- The proxies_priv Grant Table
- The global_grants Grant Table
- The default_roles Grant Table
- The role_edges Grant Table
- The password_history Grant Table
- Grant Table Scope Column Properties
- Grant Table Privilege Column Properties
- Grant Table Concurrency

\section*{Grant Table Overview}

These mysql database tables contain grant information:
- user: User accounts, static global privileges, and other nonprivilege columns.
- global_grants: Dynamic global privileges.
- db: Database-level privileges.
- tables_priv: Table-level privileges.
- columns_priv: Column-level privileges.
- procs_priv: Stored procedure and function privileges.
- proxies_priv: Proxy-user privileges.
- default_roles: Default user roles.
- role_edges: Edges for role subgraphs.
- password_history: Password change history.

For information about the differences between static and dynamic global privileges, see Static Versus Dynamic Privileges.)

Grant tables use the InnoDB storage engine and are transactional. Each statement either succeeds for all named users or rolls back and has no effect if any error occurs.

Each grant table contains scope columns and privilege columns:
- Scope columns determine the scope of each row in the tables; that is, the context in which the row applies. For example, a user table row with Host and User values of 'h1.example.net ' and 'bob ' applies to authenticating connections made to the server from the host h1. example. net by a client that specifies a user name of bob. Similarly, a db table row with Host, User, and Db column values of 'h1.example.net', 'bob' and 'reports' applies when bob connects from the host h1.example.net to access the reports database. The tables_priv and columns_priv tables contain scope columns indicating tables or table/column combinations to which each row applies. The procs_priv scope columns indicate the stored routine to which each row applies.
- Privilege columns indicate which privileges a table row grants; that is, which operations it permits to be performed. The server combines the information in the various grant tables to form a complete description of a user's privileges. Section 8.2.7, "Access Control, Stage 2: Request Verification", describes the rules for this.

In addition, a grant table may contain columns used for purposes other than scope or privilege assessment.

The server uses the grant tables in the following manner:
- The user table scope columns determine whether to reject or permit incoming connections. For permitted connections, any privileges granted in the user table indicate the user's static global privileges. Any privileges granted in this table apply to all databases on the server.

\section*{Caution}

Because any static global privilege is considered a privilege for all databases, any static global privilege enables a user to see all database names with SHOW DATABASES or by examining the SCHEMATA table of INFORMATION_SCHEMA, except databases that have been restricted at the database level by partial revokes.
- The global_grants table lists current assignments of dynamic global privileges to user accounts. For each row, the scope columns determine which user has the privilege named in the privilege column.
- The db table scope columns determine which users can access which databases from which hosts. The privilege columns determine the permitted operations. A privilege granted at the database level applies to the database and to all objects in the database, such as tables and stored programs.
- The tables_priv and columns_priv tables are similar to the db table, but are more fine-grained: They apply at the table and column levels rather than at the database level. A privilege granted at the table level applies to the table and to all its columns. A privilege granted at the column level applies only to a specific column.
- The procs_priv table applies to stored routines (stored procedures and functions). A privilege granted at the routine level applies only to a single procedure or function.
- The proxies_priv table indicates which users can act as proxies for other users and whether a user can grant the PROXY privilege to other users.
- The default_roles and role_edges tables contain information about role relationships.
- The password_history table retains previously chosen passwords to enable restrictions on password reuse. See Section 8.2.15, "Password Management".

The server reads the contents of the grant tables into memory when it starts. You can tell it to reload the tables by issuing a FLUSH PRIVILEGES statement or executing a mysqladmin flushprivileges or mysqladmin reload command. Changes to the grant tables take effect as indicated in Section 8.2.13, "When Privilege Changes Take Effect".

When you modify an account, it is a good idea to verify that your changes have the intended effect. To check the privileges for a given account, use the SHOW GRANTS statement. For example, to determine the privileges that are granted to an account with user name and host name values of bob and pc84.example.com, use this statement:

SHOW GRANTS FOR 'bob'@'pc84.example.com';
To display nonprivilege properties of an account, use SHOW CREATE USER:
SHOW CREATE USER 'bob'@'pc84.example.com';
The user and db Grant Tables
The server uses the user and db tables in the mysql database at both the first and second stages of access control (see Section 8.2, "Access Control and Account Management"). The columns in the user and db tables are shown here.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.4 user and db Table Columns}
\begin{tabular}{|l|l|l|}
\hline Table Name & user & db \\
\hline Scope columns & Host & Host \\
\hline & User & Db \\
\hline & & User \\
\hline Privilege columns & Select_priv & Select_priv \\
\hline & Insert_priv & Insert_priv \\
\hline & Update_priv & Update_priv \\
\hline & Delete_priv & Delete_priv \\
\hline & Index_priv & Index_priv \\
\hline & Alter_priv & Alter_priv \\
\hline & Create_priv & Create_priv \\
\hline & Drop_priv & Drop_priv \\
\hline & Grant_priv & Grant_priv \\
\hline & Create_view_priv & Create_view_priv \\
\hline & Show_view_priv & Show_view_priv \\
\hline & Create_routine_priv & Create_routine_priv \\
\hline & Alter_routine_priv & Alter_routine_priv \\
\hline & Execute_priv & Execute_priv \\
\hline & Trigger_priv & Trigger_priv \\
\hline & Event_priv & Event_priv \\
\hline & Create_tmp_table_priv & Create_tmp_table_priv \\
\hline & Lock_tables_priv & Lock_tables_priv \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Table Name & user & db \\
\hline & References_priv & References_priv \\
\hline & Reload_priv & \\
\hline & Shutdown_priv & \\
\hline & Process_priv & \\
\hline & File_priv & \\
\hline & Show_db_priv & \\
\hline & Super_priv & \\
\hline & Repl_slave_priv & \\
\hline & Repl_client_priv & \\
\hline & Create_user_priv & \\
\hline & Create_tablespace_priv & \\
\hline & Create_role_priv & \\
\hline & Drop_role_priv & \\
\hline Security columns & ssl_type & \\
\hline & ssl_cipher & \\
\hline & x509_issuer & \\
\hline & x509_subject & \\
\hline & plugin & \\
\hline & authentication_string & \\
\hline & password_expired & \\
\hline & password_last_changed & \\
\hline & password_lifetime & \\
\hline & account_locked & \\
\hline & Password_reuse_history & \\
\hline & Password_reuse_time & \\
\hline & Password_require_current & \\
\hline & User_attributes & \\
\hline Resource control columns & max_questions & \\
\hline & max_updates & \\
\hline & max_connections & \\
\hline & max_user_connections & \\
\hline
\end{tabular}

The user table plugin and authentication_string columns store authentication plugin and credential information.

The server uses the plugin named in the plugin column of an account row to authenticate connection attempts for the account.

The plugin column must be nonempty. At startup, and at runtime when FLUSH PRIVILEGES is executed, the server checks user table rows. For any row with an empty plugin column, the server writes a warning to the error log of this form:
[Warning] User entry 'user_name'@'host_name' has an empty plugin value. The user will be ignored and no one can login with this user anymore.

To assign a plugin to an account that is missing one, use the ALTER USER statement.

The password_expired column permits DBAs to expire account passwords and require users to reset their password. The default password_expired value is ' N ', but can be set to ' Y ' with the ALTER USER statement. After an account's password has been expired, all operations performed by the account in subsequent connections to the server result in an error until the user issues an ALTER USER statement to establish a new account password.

\section*{Note}

Although it is possible to "reset" an expired password by setting it to its current value, it is preferable, as a matter of good policy, to choose a different password. DBAs can enforce non-reuse by establishing an appropriate password-reuse policy. See Password Reuse Policy.
password_last_changed is a TIMESTAMP column indicating when the password was last changed. The value is non-NULL only for accounts that use a MySQL built-in authentication plugin (mysql_native_password which is deprecated, sha256_password which is deprecated, or caching_sha2_password). The value is NULL for other accounts, such as those authenticated using an external authentication system.
password_last_changed is updated by the CREATE USER, ALTER USER, and SET PASSWORD statements, and by GRANT statements that create an account or change an account password.
password_lifetime indicates the account password lifetime, in days. If the password is past its lifetime (assessed using the password_last_changed column), the server considers the password expired when clients connect using the account. A value of $N$ greater than zero means that the password must be changed every $N$ days. A value of 0 disables automatic password expiration. If the value is NULL (the default), the global expiration policy applies, as defined by the default_password_lifetime system variable.
account_locked indicates whether the account is locked (see Section 8.2.20, "Account Locking").
Password_reuse_history is the value of the PASSWORD HISTORY option for the account, or NULL for the default history.

Password_reuse_time is the value of the PASSWORD REUSE INTERVAL option for the account, or NULL for the default interval.

Password_require_current corresponds to the value of the PASSWORD REQUIRE option for the account, as shown by the following table.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.5 Permitted Password_require_current Values}
\begin{tabular}{|l|l|}
\hline Password_require_current Value & Corresponding PASSWORD REQUIRE Option \\
\hline ' Y ' & PASSWORD REQUIRE CURRENT \\
\hline ' N ' & PASSWORD REQUIRE CURRENT OPTIONAL \\
\hline NULL & PASSWORD REQUIRE CURRENT DEFAULT \\
\hline
\end{tabular}
\end{table}

User_attributes is a JSON-format column that stores account attributes not stored in other columns. The INFORMATION_SCHEMA exposes these attributes through the USER_ATTRIBUTES table.

The User_attributes column may contain these attributes:
- additional_password: The secondary password, if any. See Dual Password Support.
- Restrictions: Restriction lists, if any. Restrictions are added by partial-revoke operations. The attribute value is an array of elements that each have Database and Restrictions keys indicating the name of a restricted database and the applicable restrictions on it (see Section 8.2.12, "Privilege Restriction Using Partial Revokes").
- Password_locking: The conditions for failed-login tracking and temporary account locking, if any (see Failed-Login Tracking and Temporary Account Locking). The Password_locking
attribute is updated according to the FAILED_LOGIN_ATTEMPTS and PASSWORD_LOCK_TIME options of the CREATE USER and ALTER USER statements. The attribute value is a hash with failed_login_attempts and password_lock_time_days keys indicating the value of such options as have been specified for the account. If a key is missing, its value is implicitly 0 . If a key value is implicitly or explicitly 0 , the corresponding capability is disabled.
- multi_factor_authentication: Rows in the mysql.user system table have a plugin column that indicates an authentication plugin. For single-factor authentication, that plugin is the only authentication factor. For two-factor or three-factor forms of multifactor authentication, that plugin corresponds to the first authentication factor, but additional information must be stored for the second and third factors. The multi_factor_authentication attribute holds this information.

The multi_factor_authentication value is an array, where each array element is a hash that describes an authentication factor using these attributes:
- plugin: The name of the authentication plugin.
- authentication_string: The authentication string value.
- passwordless: A flag that denotes whether the user is meant to be used without a password (with a security token as the only authentication method).
- requires_registration: a flag that defines whether the user account has registered a security token.

The first and second array elements describe multifactor authentication factors 2 and 3.
If no attributes apply, User_attributes is NULL.
Example: An account that has a secondary password and partially revoked database privileges has additional_password and Restrictions attributes in the column value:
```
mysql> SELECT User_attributes FROM mysql.User WHERE User = 'u'\G
*************************** 1. row *****************************
User_attributes: {"Restrictions":
        [{"Database": "mysql", "Privileges": ["SELECT"]}],
    "additional_password": "hashed_credentials"}
```


To determine which attributes are present, use the JSON_KEYS( ) function:
```
SELECT User, Host, JSON_KEYS(User_attributes)
FROM mysql.user WHERE User_attributes IS NOT NULL;
```


To extract a particular attribute, such as Restrictions, do this:
```
SELECT User, Host, User_attributes->>'$.Restrictions'
FROM mysql.user WHERE User_attributes->>'$.Restrictions' <> '';
```


Here is an example of the kind of information stored for multi_factor_authentication:
```
{
    "multi_factor_authentication": [
        {
            "plugin": "authentication_ldap_simple",
            "passwordless": 0,
            "authentication_string": "ldap auth string",
            "requires_registration": 0
        },
        {
            "plugin": "authentication_webauthn",
            "passwordless": 0,
            "authentication_string": "",
            "requires_registration": 1
        }
    ]
}
```


\section*{The tables_priv and columns_priv Grant Tables}

During the second stage of access control, the server performs request verification to ensure that each client has sufficient privileges for each request that it issues. In addition to the user and db grant tables, the server may also consult the tables_priv and columns_priv tables for requests that involve tables. The latter tables provide finer privilege control at the table and column levels. They have the columns shown in the following table.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.6 tables_priv and columns_priv Table Columns}
\begin{tabular}{|l|l|l|}
\hline Table Name & tables_priv & columns_priv \\
\hline Scope columns & Host & Host \\
\hline & Db & Db \\
\hline & User & User \\
\hline & Table_name & Table_name \\
\hline & & Column_name \\
\hline Privilege columns & Table_priv & Column_priv \\
\hline & Column_priv & \\
\hline Other columns & Timestamp & Timestamp \\
\hline & Grantor & \\
\hline
\end{tabular}
\end{table}

The Timestamp and Grantor columns are set to the current timestamp and the CURRENT_USER value, respectively, but are otherwise unused.

\section*{The procs_priv Grant Table}

For verification of requests that involve stored routines, the server may consult the procs_priv table, which has the columns shown in the following table.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.7 procs_priv Table Columns}
\begin{tabular}{|l|l|}
\hline Table Name & procs_priv \\
\hline Scope columns & Host \\
\hline & Db \\
\hline & User \\
\hline & Routine_name \\
\hline & Routine_type \\
\hline Privilege columns & Proc_priv \\
\hline Other columns & Timestamp \\
\hline & Grantor \\
\hline
\end{tabular}
\end{table}

The Routine_type column is an ENUM column with values of 'FUNCTION ' or 'PROCEDURE' to indicate the type of routine the row refers to. This column enables privileges to be granted separately for a function and a procedure with the same name.

The Timestamp and Grantor columns are unused.

\section*{The proxies_priv Grant Table}

The proxies_priv table records information about proxy accounts. It has these columns:
- Host, User: The proxy account; that is, the account that has the PROXY privilege for the proxied account.
- Proxied_host, Proxied_user: The proxied account.
- Grantor, Timestamp: Unused.
- With_grant: Whether the proxy account can grant the PROXY privilege to other accounts.

For an account to be able to grant the PROXY privilege to other accounts, it must have a row in the proxies_priv table with With_grant set to 1 and Proxied_host and Proxied_user set to indicate the account or accounts for which the privilege can be granted. For example, the 'root'@'localhost' account created during MySQL installation has a row in the proxies_priv table that enables granting the PROXY privilege for ' '@' ', that is, for all users and all hosts. This enables root to set up proxy users, as well as to delegate to other accounts the authority to set up proxy users. See Section 8.2.19, "Proxy Users".

\section*{The global_grants Grant Table}

The global_grants table lists current assignments of dynamic global privileges to user accounts. The table has these columns:
- USER, HOST: The user name and host name of the account to which the privilege is granted.
- PRIV: The privilege name.
- WITH_GRANT_OPTION: Whether the account can grant the privilege to other accounts.

\section*{The default_roles Grant Table}

The default_roles table lists default user roles. It has these columns:
- HOST, USER: The account or role to which the default role applies.
- DEFAULT_ROLE_HOST, DEFAULT_ROLE_USER: The default role.

\section*{The role_edges Grant Table}

The role_edges table lists edges for role subgraphs. It has these columns:
- FROM_HOST, FROM_USER: The account that is granted a role.
- TO_HOST, TO_USER: The role that is granted to the account.
- WITH_ADMIN_OPTION: Whether the account can grant the role to and revoke it from other accounts by using WITH ADMIN OPTION.

\section*{The password_history Grant Table}

The password_history table contains information about password changes. It has these columns:
- Host, User: The account for which the password change occurred.
- Password_timestamp: The time when the password change occurred.
- Password: The new password hash value.

The password_history table accumulates a sufficient number of nonempty passwords per account to enable MySQL to perform checks against both the account password history length and reuse interval. Automatic pruning of entries that are outside both limits occurs when password-change attempts occur.

\section*{Note}

The empty password does not count in the password history and is subject to reuse at any time.

If an account is renamed, its entries are renamed to match. If an account is dropped or its authentication plugin is changed, its entries are removed.

\section*{Grant Table Scope Column Properties}

Scope columns in the grant tables contain strings. The default value for each is the empty string. The following table shows the number of characters permitted in each column.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.8 Grant Table Scope Column Lengths}
\begin{tabular}{|l|l|}
\hline Column Name & Maximum Permitted Characters \\
\hline Host, Proxied_host & 255 \\
\hline User, Proxied_user & 32 \\
\hline Db & 64 \\
\hline Table_name & 64 \\
\hline Column_name & 64 \\
\hline Routine_name & 64 \\
\hline
\end{tabular}
\end{table}

Host and Proxied_host values are converted to lowercase before being stored in the grant tables.
For access-checking purposes, comparisons of User, Proxied_user, authentication_string, Db, and Table_name values are case-sensitive. Comparisons of Host, Proxied_host, Column_name, and Routine_name values are not case-sensitive.

\section*{Grant Table Privilege Column Properties}

The user and db tables list each privilege in a separate column that is declared as ENUM( ' N ' , ' Y ' ) DEFAULT ' N '. In other words, each privilege can be disabled or enabled, with the default being disabled.

The tables_priv, columns_priv, and procs_priv tables declare the privilege columns as SET columns. Values in these columns can contain any combination of the privileges controlled by the table. Only those privileges listed in the column value are enabled.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.9 Set-Type Privilege Column Values}
\begin{tabular}{|l|l|l|}
\hline Table Name & Column Name & Possible Set Elements \\
\hline tables_priv & Table_priv & \begin{tabular}{l}
'Select', 'Insert', \\
'Update', 'Delete', \\
'Create', 'Drop', \\
'Grant', 'References', \\
'Index', 'Alter', \\
'Create View', 'Show view', 'Trigger'
\end{tabular} \\
\hline tables_priv & Column_priv & 'Select', 'Insert', 'Update', 'References' \\
\hline columns_priv & Column_priv & 'Select', 'Insert', 'Update', 'References' \\
\hline procs_priv & Proc_priv & 'Execute', 'Alter Routine', 'Grant' \\
\hline
\end{tabular}
\end{table}

Only the user and global_grants tables specify administrative privileges, such as RELOAD, SHUTDOWN, and SYSTEM_VARIABLES_ADMIN. Administrative operations are operations on the server itself and are not database-specific, so there is no reason to list these privileges in the other grant tables. Consequently, the server need consult only the user and global_grants tables to determine whether a user can perform an administrative operation.

The FILE privilege also is specified only in the user table. It is not an administrative privilege as such, but a user's ability to read or write files on the server host is independent of the database being accessed.

\section*{Grant Table Concurrency}

To permit concurrent DML and DDL operations on MySQL grant tables, read operations that previously acquired row locks on MySQL grant tables are executed as non-locking reads. Operations that are performed as non-locking reads on MySQL grant tables include:
- SELECT statements and other read-only statements that read data from grant tables through join lists and subqueries, including SELECT ... FOR SHARE statements, using any transaction isolation level.
- DML operations that read data from grant tables (through join lists or subqueries) but do not modify them, using any transaction isolation level.

Statements that no longer acquire row locks when reading data from grant tables report a warning if executed while using statement-based replication.

When using -binlog_format=mixed, DML operations that read data from grant tables are written to the binary log as row events to make the operations safe for mixed-mode replication.

SELECT ... FOR SHARE statements that read data from grant tables report a warning. With the FOR SHARE clause, read locks are not supported on grant tables.

DML operations that read data from grant tables and are executed using the SERIALIZABLE isolation level report a warning. Read locks that would normally be acquired when using the SERIALIZABLE isolation level are not supported on grant tables.

\subsection*{8.2.4 Specifying Account Names}

MySQL account names consist of a user name and a host name, which enables creation of distinct accounts for users with the same user name who connect from different hosts. This section describes the syntax for account names, including special values and wildcard rules.

In most respects, account names are similar to MySQL role names, with some differences described at Section 8.2.5, "Specifying Role Names".

Account names appear in SQL statements such as CREATE USER, GRANT, and SET PASSWORD and follow these rules:
- Account name syntax is 'user_name'@'host_name'.
- The @'host_name ' part is optional. An account name consisting only of a user name is equivalent to 'user_name'@'\%'. For example, 'me' is equivalent to 'me'@'\%'.
- The user name and host name need not be quoted if they are legal as unquoted identifiers. Quotes must be used if a user_name string contains special characters (such as space or -), or a host_name string contains special characters or wildcard characters (such as . or \%). For example, in the account name 'test-user'@'\%.com', both the user name and host name parts require quotes.
- Quote user names and host names as identifiers or as strings, using either backticks (ˋ), single quotation marks ( ' ), or double quotation marks ("). For string-quoting and identifier-quoting guidelines, see Section 11.1.1, "String Literals", and Section 11.2, "Schema Object Names". In SHOW statement results, user names and host names are quoted using backticks (ˋ).
- The user name and host name parts, if quoted, must be quoted separately. That is, write 'me'@'localhost', not 'me@localhost'. (The latter is actually equivalent to 'me@localhost'@'\%', although this behavior is now deprecated.)
- A reference to the CURRENT_USER or CURRENT_USER( ) function is equivalent to specifying the current client's user name and host name literally.

MySQL stores account names in grant tables in the mysql system database using separate columns for the user name and host name parts:
- The user table contains one row for each account. The User and Host columns store the user name and host name. This table also indicates which global privileges the account has.
- Other grant tables indicate privileges an account has for databases and objects within databases. These tables have User and Host columns to store the account name. Each row in these tables associates with the account in the user table that has the same User and Host values.
- For access-checking purposes, comparisons of User values are case-sensitive. Comparisons of Host values are not case-sensitive.

For additional detail about the properties of user names and host names as stored in the grant tables, such as maximum length, see Grant Table Scope Column Properties.

User names and host names have certain special values or wildcard conventions, as described following.

The user name part of an account name is either a nonblank value that literally matches the user name for incoming connection attempts, or a blank value (the empty string) that matches any user name. An account with a blank user name is an anonymous user. To specify an anonymous user in SQL statements, use a quoted empty user name part, such as ' '@'localhost'.

The host name part of an account name can take many forms, and wildcards are permitted:
- A host value can be a host name or an IP address (IPv4 or IPv6). The name ' localhost ' indicates the local host. The IP address '127.0.0.1' indicates the IPv4 loopback interface. The IP address ' : :1' indicates the IPv6 loopback interface.
- Use of the $\%$ and _ wildcard characters is permitted in host name or IP address values, but is deprecated and thus subject to removal in a future version of MySQL. These characters have the same meaning as for pattern-matching operations performed with the LIKE operator. For example, a host value of ' $\%$ ' matches any host name, whereas a value of ' $\%$. mysql. com ' matches any host in the mysql.com domain. '198.51.100.\%' matches any host in the 198.51.100 class C network.

Because IP wildcard values are permitted in host values (for example, '198.51.100.\%' to match every host on a subnet), someone could try to exploit this capability by naming a host 198.51.100. somewhere.com. To foil such attempts, MySQL does not perform matching on host names that start with digits and a dot. For example, if a host is named 1.2 . example. com, its name never matches the host part of account names. An IP wildcard value can match only IP addresses, not host names.

If partial_revokes is ON, MySQL treats \% and _ in grants as literal characters, and not as wildcards. Use of these wildcards is deprecated (regardless of this variable's value); you should expect this functionality to be removed in a future version of MySQL.
- For a host value specified as an IPv4 address, a netmask can be given to indicate how many address bits to use for the network number. Netmask notation cannot be used for IPv6 addresses.

The syntax is host_ip/netmask. For example:
CREATE USER 'david'@'198.51.100.0/255.255.255.0';
This enables david to connect from any client host having an IP address client_ip for which the following condition is true:
```
client_ip & netmask = host_ip
```


That is, for the CREATE USER statement just shown:
```
client_ip & 255.255.255.0 = 198.51.100.0
```


IP addresses that satisfy this condition range from 198.51.100.0 to 198.51.100. 255.
A netmask typically begins with bits set to 1 , followed by bits set to 0 . Examples:
- 198.0.0.0/255.0.0.0: Any host on the 198 class A network
- 198.51.0.0/255.255.0.0: Any host on the 198.51 class B network
- 198.51.100.0/255.255.255.0: Any host on the 198.51.100 class C network
- 198.51.100.1: Only the host with this specific IP address
- A host value specified as an IPv4 address can be written using CIDR notation, such as 198.51.100.44/24.

The server performs matching of host values in account names against the client host using the value returned by the system DNS resolver for the client host name or IP address. Except in the case that the account host value is specified using netmask notation, the server performs this comparison as a string match, even for an account host value given as an IP address. This means that you should specify account host values in the same format used by DNS. Here are examples of problems to watch out for:
- Suppose that a host on the local network has a fully qualified name of host1.example.com. If DNS returns name lookups for this host as host1.example.com, use that name in account host values. If DNS returns just host1, use host1 instead.
- If DNS returns the IP address for a given host as 198.51.100.2, that matches an account host value of 198.51.100.2 but not 198.051.100.2. Similarly, it matches an account host pattern like 198.51 .100 . \% but not 198.051.100.\%.

To avoid problems like these, it is advisable to check the format in which your DNS returns host names and addresses. Use values in the same format in MySQL account names.

\subsection*{8.2.5 Specifying Role Names}

MySQL role names refer to roles, which are named collections of privileges. For role usage examples, see Section 8.2.10, "Using Roles".

Role names have syntax and semantics similar to account names; see Section 8.2.4, "Specifying Account Names". As stored in the grant tables, they have the same properties as account names, which are described in Grant Table Scope Column Properties.

Role names differ from account names in these respects:
- The user part of role names cannot be blank. Thus, there is no "anonymous role" analogous to the concept of "anonymous user."
- As for an account name, omitting the host part of a role name results in a host part of ' $\%$ '. But unlike ${ }^{\prime} \%^{\prime}$ in an account name, a host part of ' $\%^{\prime}$ ' in a role name has no wildcard properties. For example, for a name 'me ' @ ' \% ' used as a role name, the host part ('\% ') is just a literal value; it has no "any host" matching property.
- Netmask notation in the host part of a role name has no significance.
- An account name is permitted to be CURRENT_USER( ) in several contexts. A role name is not.

It is possible for a row in the mysql. user system table to serve as both an account and a role. In this case, any special user or host name matching properties do not apply in contexts for which the name is used as a role name. For example, you cannot execute the following statement with the expectation that it sets the current session roles using all roles that have a user part of myrole and any host name:
```
SET ROLE 'myrole'@'%';
```


Instead, the statement sets the active role for the session to the role with exactly the name 'myrole'@'\%'.

For this reason, role names are often specified using only the user name part and letting the host name part implicitly be ' $\%$ ' . Specifying a role with a non- ${ }^{\prime} \%$ ' host part can be useful if you intend to create a name that works both as a role an as a user account that is permitted to connect from the given host.

\subsection*{8.2.6 Access Control, Stage 1: Connection Verification}

When you attempt to connect to a MySQL server, the server accepts or rejects the connection based on these conditions:
- Your identity and whether you can verify it by supplying the proper credentials.
- Whether your account is locked or unlocked.

The server checks credentials first, then account locking state. A failure at either step causes the server to deny access to you completely. Otherwise, the server accepts the connection, and then enters Stage 2 and waits for requests.

The server performs identity and credentials checking using columns in the user table, accepting the connection only if these conditions are satisfied:
- The client host name and user name match the Host and User columns in some user table row. For the rules governing permissible Host and User values, see Section 8.2.4, "Specifying Account Names".
- The client supplies the credentials specified in the row (for example, a password), as indicated by the authentication_string column. Credentials are interpreted using the authentication plugin named in the plugin column.
- The row indicates that the account is unlocked. Locking state is recorded in the account_locked column, which must have a value of ' N '. Account locking can be set or changed with the CREATE USER or ALTER USER statement.

Your identity is based on two pieces of information:
- Your MySQL user name.
- The client host from which you connect.

If the User column value is nonblank, the user name in an incoming connection must match exactly. If the User value is blank, it matches any user name. If the user table row that matches an incoming connection has a blank user name, the user is considered to be an anonymous user with no name, not a user with the name that the client actually specified. This means that a blank user name is used for all further access checking for the duration of the connection (that is, during Stage 2).

The authentication_string column can be blank. This is not a wildcard and does not mean that any password matches. It means that the user must connect without specifying a password. The authentication method implemented by the plugin that authenticates the client may or may not use the password in the authentication_string column. In this case, it is possible that an external password is also used to authenticate to the MySQL server.

Nonblank password values stored in the authentication_string column of the user table are encrypted. MySQL does not store passwords as cleartext for anyone to see. Rather, the password supplied by a user who is attempting to connect is encrypted (using the password hashing method implemented by the account authentication plugin). The encrypted password then is used during the connection process when checking whether the password is correct. This is done without the encrypted password ever traveling over the connection. See Section 8.2.1, "Account User Names and Passwords".

From the MySQL server's point of view, the encrypted password is the real password, so you should never give anyone access to it. In particular, do not give nonadministrative users read access to tables in the mysql system database.

The following table shows how various combinations of User and Host values in the user table apply to incoming connections.

\begin{tabular}{|l|l|l|}
\hline User Value & Host Value & Permissible Connections \\
\hline 'fred' & 'h1.example.net' & fred, connecting from h1.example.net \\
\hline ' ' & 'h1.example.net' & Any user, connecting from h1.example.net \\
\hline 'fred' & '\%' & fred, connecting from any host \\
\hline ''' & '\%' & Any user, connecting from any host \\
\hline 'fred' & '\%.example.net' & fred, connecting from any host in the example. net domain \\
\hline 'fred' & 'x.example.\%' & fred, connecting from x.example.net, x.example.com, x.example.edu, and so on; this is probably not useful \\
\hline 'fred' & '198.51.100.177' & fred, connecting from the host with IP address 198.51.100.177 \\
\hline 'fred' & '198.51.100.\%' & fred, connecting from any host in the 198.51 .100 class C subnet \\
\hline 'fred' & '198.51.100.0/255.255.255 & Same as previous example \\
\hline
\end{tabular}

It is possible for the client host name and user name of an incoming connection to match more than one row in the user table. The preceding set of examples demonstrates this: Several of the entries shown match a connection from h1.example. net by fred.

When multiple matches are possible, the server must determine which of them to use. It resolves this issue as follows:
- Whenever the server reads the user table intomemory, it sorts the rows.
- When a client attempts to connect, the server looks through the rows in sorted order.
- The server uses the first row that matches the client host name and user name.

The server uses sorting rules that order rows with the most-specific Host values first:
- Literal IP addresses and host names are the most specific.
- Accounts with an IP address in the host part have this order of specificity:
- Accounts that have the host part given as an IP address:
```
CREATE USER 'user_name'@'127.0.0.1';
CREATE USER 'user_name'@'198.51.100.44';
```

- Accounts that have the host part given as an IP address using CIDR notation:
```
CREATE USER 'user_name'@'192.0.2.21/8';
CREATE USER 'user_name'@'198.51.100.44/16';
```

- Accounts that have the host part given as an IP address with a subnet mask:
```
CREATE USER 'user_name'@'192.0.2.0/255.255.255.0';
```

```
CREATE USER 'user_name'@'198.51.0.0/255.255.0.0';
```

- The pattern ' $\%$ ' means "any host" and is least specific.
- The empty string ' ' also means "any host" but sorts after ' $\%$ '.

Non-TCP (socket file, named pipe, and shared memory) connections are treated as local connections and match a host part of localhost if there are any such accounts, or host parts with wildcards that match localhost otherwise (for example, local\%, 1\%, \%).

The treatment of ' $\%$ ' as equivalent to localhost is deprecated; you should expect this behavior to removed from a future version of MySQL.

Rows with the same Host value are ordered with the most-specific User values first. A blank User value means "any user" and is least specific, so for rows with the same Host value, nonanonymous users sort before anonymous users.

For rows with equally-specific Host and User values, the order is nondeterministic.
To see how this works, suppose that the user table looks like this:
```
+-----------+----------+-
| Host | User | ...
+-----------+----------+-

\begin{tabular}{|l|l|l|l}
$\mid \%$ & root & $\ldots$ \\
$\mid \%$ & jeffrey & $\ldots$ \\
$\mid$ & localhost & root & $\ldots$ \\
$\mid$ & localhost & & $\ldots$ \\
\hline
\end{tabular}
```


When the server reads the table into memory, it sorts the rows using the rules just described. The result after sorting looks like this:
```
+-----------+----------+-
+-----------+----------+-
| localhost | root | ...
| localhost | | ...
| % | jeffrey | ...
| % | root | ...
+------------+----------+-
```


When a client attempts to connect, the server looks through the sorted rows and uses the first match found. For a connection from localhost by jeffrey, two of the rows from the table match: the one with Host and User values of 'localhost' and ' ', and the one with values of ' $\%$ ' and 'jeffrey'. The 'localhost ' row appears first in sorted order, so that is the one the server uses.

Here is another example. Suppose that the user table looks like this:
```
+-----------------+----------+-

\begin{tabular}{|l|l|l|}
\hline Host & User & ... \\
\hline ![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1205.jpg?height=30\&width=34\&top_left_y=2150\&top_left_x=380) & jeffrey & ![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1205.jpg?height=30\&width=48\&top_left_y=2154\&top_left_x=855) \\
\hline h1.example.net & & ... \\
\hline
\end{tabular}
```


The sorted table looks like this:
```
+-----------------+----------+-
| Host | User | ...
+-----------------+----------+-
| h1.example.net | | ...
| % | jeffrey | ...
+-----------------+----------+-
```


The first row matches a connection by any user from h1.example.net, whereas the second row matches a connection by jeffrey from any host.

\section*{Note}

It is a common misconception to think that, for a given user name, all rows that explicitly name that user are used first when the server attempts to find a match for the connection. This is not true. The preceding example illustrates this, where a connection from h1.example. net by jeffrey is first matched not by the row containing 'jeffrey' as the User column value, but by the row with no user name. As a result, jeffrey is authenticated as an anonymous user, even though he specified a user name when connecting.

If you are able to connect to the server, but your privileges are not what you expect, you probably are being authenticated as some other account. To find out what account the server used to authenticate you, use the CURRENT_USER( ) function. (See Section 14.15, "Information Functions".) It returns a value in user_name@host_name format that indicates the User and Host values from the matching user table row. Suppose that jeffrey connects and issues the following query:
```
mysql> SELECT CURRENT_USER();
+-----------------+
| CURRENT_USER() |
+-----------------+
| @localhost |
+-----------------+
```


The result shown here indicates that the matching user table row had a blank User column value. In other words, the server is treating jeffrey as an anonymous user.

Another way to diagnose authentication problems is to print out the user table and sort it by hand to see where the first match is being made.

\subsection*{8.2.7 Access Control, Stage 2: Request Verification}

After the server accepts a connection, it enters Stage 2 of access control. For each request that you issue through the connection, the server determines what operation you want to perform, then checks whether your privileges are sufficient. This is where the privilege columns in the grant tables come into play. These privileges can come from any of the user, global_grants, db, tables_priv, columns_priv, or procs_priv tables. (You may find it helpful to refer to Section 8.2.3, "Grant Tables", which lists the columns present in each grant table.)

The user and global_grants tables grant global privileges. The rows in these tables for a given account indicate the account privileges that apply on a global basis no matter what the default database is. For example, if the user table grants you the DELETE privilege, you can delete rows from any table in any database on the server host. It is wise to grant privileges in the user table only to people who need them, such as database administrators. For other users, leave all privileges in the user table set to ' N ' and grant privileges at more specific levels only (for particular databases, tables, columns, or routines). It is also possible to grant database privileges globally but use partial revokes to restrict them from being exercised on specific databases (see Section 8.2.12, "Privilege Restriction Using Partial Revokes").

The db table grants database-specific privileges. Values in the scope columns of this table can take the following forms:
- A blank User value matches the anonymous user. A nonblank value matches literally; there are no wildcards in user names.
- The wildcard characters \% and _ can be used in the Host and Db columns. These have the same meaning as for pattern-matching operations performed with the LIKE operator. If you want to use either character literally when granting privileges, you must escape it with a backslash. For example, to include the underscore character (_) as part of a database name, specify it as \_ in the GRANT statement.
- A ' $\%^{\prime}$ or blank Host value means "any host."
- A ' $\%^{\prime}$ or blank Db value means "any database."

The server reads the db table into memory and sorts it at the same time that it reads the user table. The server sorts the db table based on the Host, Db, and User scope columns. As with the user table, sorting puts the most-specific values first and least-specific values last, and when the server looks for matching rows, it uses the first match that it finds.

The tables_priv, columns_priv, and procs_priv tables grant table-specific, column-specific, and routine-specific privileges. Values in the scope columns of these tables can take the following forms:
- The wildcard characters $\%$ and _ can be used in the Host column. These have the same meaning as for pattern-matching operations performed with the LIKE operator.
- A ' $\%^{\prime}$ or blank Host value means "any host."
- The Db, Table_name, Column_name, and Routine_name columns cannot contain wildcards or be blank.

The server sorts the tables_priv, columns_priv, and procs_priv tables based on the Host, Db, and User columns. This is similar to db table sorting, but simpler because only the Host column can contain wildcards.

The server uses the sorted tables to verify each request that it receives. For requests that require administrative privileges such as SHUTDOWN or RELOAD, the server checks only the user and global_privilege tables because those are the only tables that specify administrative privileges.
The server grants access if a row for the account in those tables permits the requested operation and denies access otherwise. For example, if you want to execute mysqladmin shutdown but your user table row does not grant the SHUTDOWN privilege to you, the server denies access without even checking the db table. (The latter table contains no Shutdown_priv column, so there is no need to check it.)

For database-related requests (INSERT, UPDATE, and so on), the server first checks the user's global privileges in the user table row (less any privilege restrictions imposed by partial revokes). If the row permits the requested operation, access is granted. If the global privileges in the user table are insufficient, the server determines the user's database-specific privileges from the db table:
- The server looks in the db table for a match on the Host, Db, and User columns.
- The Host and User columns are matched to the connecting user's host name and MySQL user name.
- The Db column is matched to the database that the user wants to access.
- If there is no row for the Host and User, access is denied.

After determining the database-specific privileges granted by the db table rows, the server adds them to the global privileges granted by the user table. If the result permits the requested operation, access is granted. Otherwise, the server successively checks the user's table and column privileges in the tables_priv and columns_priv tables, adds those to the user's privileges, and permits or denies access based on the result. For stored-routine operations, the server uses the procs_priv table rather than tables_priv and columns_priv.

Expressed in boolean terms, the preceding description of how a user's privileges are calculated may be summarized like this:
```
global privileges
OR database privileges
OR table privileges
OR column privileges
OR routine privileges
```


It may not be apparent why, if the global privileges are initially found to be insufficient for the requested operation, the server adds those privileges to the database, table, and column privileges later. The
reason is that a request might require more than one type of privilege. For example, if you execute an INSERT INTO ... SELECT statement, you need both the INSERT and the SELECT privileges. Your privileges might be such that the user table row grants one privilege global and the db table row grants the other specifically for the relevant database. In this case, you have the necessary privileges to perform the request, but the server cannot tell that from either your global or database privileges alone. It must make an access-control decision based on the combined privileges.

\subsection*{8.2.8 Adding Accounts, Assigning Privileges, and Dropping Accounts}

To manage MySQL accounts, use the SQL statements intended for that purpose:
- CREATE USER and DROP USER create and remove accounts.
- GRANT and REVOKE assign privileges to and revoke privileges from accounts.
- SHOW GRANTS displays account privilege assignments.

Account-management statements cause the server to make appropriate modifications to the underlying grant tables, which are discussed in Section 8.2.3, "Grant Tables".

\section*{Note}

Direct modification of grant tables using statements such as INSERT, UPDATE, or DELETE is discouraged and done at your own risk. The server is free to ignore rows that become malformed as a result of such modifications.

For any operation that modifies a grant table, the server checks whether the table has the expected structure and produces an error if not. To update the tables to the expected structure, perform the MySQL upgrade procedure. See Chapter 3, Upgrading MySQL.

Another option for creating accounts is to use the GUI tool MySQL Workbench. Also, several third-party programs offer capabilities for MySQL account administration. phpMyAdmin is one such program.

This section discusses the following topics:
- Creating Accounts and Granting Privileges
- Checking Account Privileges and Properties
- Revoking Account Privileges
- Dropping Accounts

For additional information about the statements discussed here, see Section 15.7.1, "Account Management Statements".

\section*{Creating Accounts and Granting Privileges}

The following examples show how to use the mysql client program to set up new accounts. These examples assume that the MySQL root account has the CREATE USER privilege and all privileges that it grants to other accounts.

At the command line, connect to the server as the MySQL root user, supplying the appropriate password at the password prompt:
```
$> mysql -u root -p
Enter password: (enter root password here)
```


After connecting to the server, you can add new accounts. The following example uses CREATE USER and GRANT statements to set up four accounts (where you see 'password', substitute an appropriate password):
```
CREATE USER 'finley'@'localhost'
```

```
    IDENTIFIED BY 'password';
GRANT ALL
    ON *.*
    TO 'finley'@'localhost'
    WITH GRANT OPTION;
CREATE USER 'finley'@'%.example.com'
    IDENTIFIED BY 'password';
GRANT ALL
    ON *.*
    TO 'finley'@'%.example.com'
    WITH GRANT OPTION;
CREATE USER 'admin'@'localhost'
    IDENTIFIED BY 'password';
GRANT RELOAD,PROCESS
    ON *.*
    TO 'admin'@'localhost';
CREATE USER 'dummy'@'localhost';
```


The accounts created by those statements have the following properties:
- Two accounts have a user name of finley. Both are superuser accounts with full global privileges to do anything. The 'finley'@'localhost' account can be used only when connecting from the local host. The 'finley'@'\%.example.com' account uses the '\%' wildcard in the host part, so it can be used to connect from any host in the example.com domain.

The 'finley'@'localhost' account is necessary if there is an anonymous-user account for localhost. Without the 'finley'@'localhost ' account, that anonymous-user account takes precedence when finley connects from the local host and finley is treated as an anonymous user. The reason for this is that the anonymous-user account has a more specific Host column value than the 'finley'@'\%' account and thus comes earlier in the user table sort order. (For information about user table sorting, see Section 8.2.6, "Access Control, Stage 1: Connection Verification".)
- The 'admin'@'localhost' account can be used only by admin to connect from the local host. It is granted the global RELOAD and PROCESS administrative privileges. These privileges enable the admin user to execute the mysqladmin reload, mysqladmin refresh, and mysqladmin flush- $x x x$ commands, as well as mysqladmin processlist. No privileges are granted for accessing any databases. You could add such privileges using GRANT statements.
- The 'dummy'@'localhost' account has no password (which is insecure and not recommended). This account can be used only to connect from the local host. No privileges are granted. It is assumed that you grant specific privileges to the account using GRANT statements.

The previous example grants privileges at the global level. The next example creates three accounts and grants them access at lower levels; that is, to specific databases or objects within databases. Each account has a user name of custom, but the host name parts differ:
```
CREATE USER 'custom'@'localhost'
    IDENTIFIED BY 'password';
GRANT ALL
    ON bankaccount.*
    TO 'custom'@'localhost';
CREATE USER 'custom'@'host47.example.com'
    IDENTIFIED BY 'password';
GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,DROP
    ON expenses.*
    TO 'custom'@'host47.example.com';
CREATE USER 'custom'@'%.example.com'
    IDENTIFIED BY 'password';
GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,DROP
    ON customer.addresses
    TO 'custom'@'%.example.com';
```


The three accounts can be used as follows:
- The 'custom'@'localhost' account has all database-level privileges to access the bankaccount database. The account can be used to connect to the server only from the local host.
- The 'custom'@'host47.example.com' account has specific database-level privileges to access the expenses database. The account can be used to connect to the server only from the host host47.example.com.
- The 'custom'@'\%.example.com' account has specific table-level privileges to access the addresses table in the customer database, from any host in the example.com domain. The account can be used to connect to the server from all machines in the domain due to use of the \% wildcard character in the host part of the account name.

\section*{Checking Account Privileges and Properties}

To see the privileges for an account, use SHOW GRANTS:
```
mysql> SHOW GRANTS FOR 'admin'@'localhost';
+--------------------------------------------------------
| Grants for admin@localhost |
+-------------------------------------------------------+
| GRANT RELOAD, PROCESS ON *.* TO ˋadminˋ@ˋlocalhostˋ |
+-------------------------------------------------------
```


To see nonprivilege properties for an account, use SHOW CREATE USER:
```
mysql> SET print_identified_with_as_hex = ON;
mysql> SHOW CREATE USER 'admin'@'localhost'\G
************************** 1. rOW ******************************
CREATE USER for admin@localhost: CREATE USER ˋadminˋ@ˋlocalhostˋ
IDENTIFIED WITH 'caching_sha2_password'
AS 0x24412430303524301D0E17054E2241362B1419313C3E44326F294133734B30792F436E77764270373039612E32445250786D4}
REQUIRE NONE PASSWORD EXPIRE DEFAULT ACCOUNT UNLOCK
PASSWORD HISTORY DEFAULT
PASSWORD REUSE INTERVAL DEFAULT
PASSWORD REQUIRE CURRENT DEFAULT
```


Enabling the print_identified_with_as_hex system variable causes SHOW CREATE USER to display hash values that contain unprintable characters as hexadecimal strings rather than as regular string literals.

\section*{Revoking Account Privileges}

To revoke account privileges, use the REVOKE statement. Privileges can be revoked at different levels, just as they can be granted at different levels.

Revoke global privileges:
```
REVOKE ALL
    ON *.*
    FROM 'finley'@'%.example.com';
REVOKE RELOAD
    ON *.*
    FROM 'admin'@'localhost';
```


Revoke database-level privileges:
```
REVOKE CREATE,DROP
    ON expenses.*
    FROM 'custom'@'host47.example.com';
```


Revoke table-level privileges:
```
REVOKE INSERT, UPDATE,DELETE
    ON customer.addresses
    FROM 'custom'@'%.example.com';
```


To check the effect of privilege revocation, use SHOW GRANTS:
```
mysql> SHOW GRANTS FOR 'admin'@'localhost';
+-----------------------------------------------
| Grants for admin@localhost |
+---------------------------------------------+
| GRANT PROCESS ON *.* TO ˋadminˋ@ˋlocalhostˋ |
+------------------------------------------------
```


\section*{Dropping Accounts}

To remove an account, use the DROP USER statement. For example, to drop some of the accounts created previously:
```
DROP USER 'finley'@'localhost';
DROP USER 'finley'@'%.example.com';
DROP USER 'admin'@'localhost';
DROP USER 'dummy'@'localhost';
```


\subsection*{8.2.9 Reserved Accounts}

One part of the MySQL installation process is data directory initialization (see Section 2.9.1, "Initializing the Data Directory"). During data directory initialization, MySQL creates user accounts that should be considered reserved:
- 'root'@'localhost: Used for administrative purposes. This account has all privileges, is a system account, and can perform any operation.

Strictly speaking, this account name is not reserved, in the sense that some installations rename the root account to something else to avoid exposing a highly privileged account with a well-known name.
- 'mysql.sys'@'localhost': Used as the DEFINER for sys schema objects. Use of the mysql.sys account avoids problems that occur if a DBA renames or removes the root account. This account is locked so that it cannot be used for client connections.
- 'mysql.session'@'localhost': Used internally by plugins to access the server. This account is locked so that it cannot be used for client connections. The account is a system account.
- 'mysql.infoschema'@'localhost': Used as the DEFINER for INFORMATION_SCHEMA views. Use of the mysql.infoschema account avoids problems that occur if a DBA renames or removes the root account. This account is locked so that it cannot be used for client connections.

\subsection*{8.2.10 Using Roles}

A MySQL role is a named collection of privileges. Like user accounts, roles can have privileges granted to and revoked from them.

A user account can be granted roles, which grants to the account the privileges associated with each role. This enables assignment of sets of privileges to accounts and provides a convenient alternative to granting individual privileges, both for conceptualizing desired privilege assignments and implementing them.

The following list summarizes role-management capabilities provided by MySQL:
- CREATE ROLE and DROP ROLE create and remove roles.
- GRANT and REVOKE assign privileges to revoke privileges from user accounts and roles.
- SHOW GRANTS displays privilege and role assignments for user accounts and roles.
- SET DEFAULT ROLE specifies which account roles are active by default.
- SET ROLE changes the active roles within the current session.
- The CURRENT_ROLE( ) function displays the active roles within the current session.
- The mandatory_roles and activate_all_roles_on_login system variables enable defining mandatory roles and automatic activation of granted roles when users log in to the server.

For descriptions of individual role-manipulation statements (including the privileges required to use them), see Section 15.7.1, "Account Management Statements". The following discussion provides examples of role usage. Unless otherwise specified, SQL statements shown here should be executed using a MySQL account with sufficient administrative privileges, such as the root account.
- Creating Roles and Granting Privileges to Them
- Defining Mandatory Roles
- Checking Role Privileges
- Activating Roles
- Revoking Roles or Role Privileges
- Dropping Roles
- User and Role Interchangeability

\section*{Creating Roles and Granting Privileges to Them}

Consider this scenario:
- An application uses a database named app_db.
- Associated with the application, there can be accounts for developers who create and maintain the application, and for users who interact with it.
- Developers need full access to the database. Some users need only read access, others need read/ write access.

To avoid granting privileges individually to possibly many user accounts, create roles as names for the required privilege sets. This makes it easy to grant the required privileges to user accounts, by granting the appropriate roles.

To create the roles, use the CREATE ROLE statement:
```
CREATE ROLE 'app_developer', 'app_read', 'app_write';
```


Role names are much like user account names and consist of a user part and host part in 'user_name'@'host_name' format. The host part, if omitted, defaults to '\%'. The user and host parts can be unquoted unless they contain special characters such as - or \%. Unlike account names, the user part of role names cannot be blank. For additional information, see Section 8.2.5, "Specifying Role Names".

To assign privileges to the roles, execute GRANT statements using the same syntax as for assigning privileges to user accounts:
```
GRANT ALL ON app_db.* TO 'app_developer';
GRANT SELECT ON app_db.* TO 'app_read';
GRANT INSERT, UPDATE, DELETE ON app_db.* TO 'app_write';
```


Now suppose that initially you require one developer account, two user accounts that need readonly access, and one user account that needs read/write access. Use CREATE USER to create the accounts:
```
CREATE USER 'dev1'@'localhost' IDENTIFIED BY 'dev1pass';
CREATE USER 'read_user1'@'localhost' IDENTIFIED BY 'read_user1pass';
CREATE USER 'read_user2'@'localhost' IDENTIFIED BY 'read_user2pass';
CREATE USER 'rw_user1'@'localhost' IDENTIFIED BY 'rw_user1pass';
```


To assign each user account its required privileges, you could use GRANT statements of the same form as just shown, but that requires enumerating individual privileges for each user. Instead, use an alternative GRANT syntax that permits granting roles rather than privileges:
```
GRANT 'app_developer' TO 'dev1'@'localhost';
GRANT 'app_read' TO 'read_user1'@'localhost', 'read_user2'@'localhost';
GRANT 'app_read', 'app_write' TO 'rw_user1'@'localhost';
```


The GRANT statement for the rw_user1 account grants the read and write roles, which combine to provide the required read and write privileges.

The GRANT syntax for granting roles to an account differs from the syntax for granting privileges: There is an ON clause to assign privileges, whereas there is no ON clause to assign roles. Because the syntaxes are distinct, you cannot mix assigning privileges and roles in the same statement. (It is permitted to assign both privileges and roles to an account, but you must use separate GRANT statements, each with syntax appropriate to what is to be granted.) Roles cannot be granted to anonymous users.

A role when created is locked, has no password, and is assigned the default authentication plugin. (These role attributes can be changed later with the ALTER USER statement, by users who have the global CREATE USER privilege.)

While locked, a role cannot be used to authenticate to the server. If unlocked, a role can be used to authenticate. This is because roles and users are both authorization identifiers with much in common and little to distinguish them. See also User and Role Interchangeability.

\section*{Defining Mandatory Roles}

It is possible to specify roles as mandatory by naming them in the value of the mandatory_roles system variable. The server treats a mandatory role as granted to all users, so that it need not be granted explicitly to any account.

To specify mandatory roles at server startup, define mandatory_roles in your server my.cnf file:
```
[mysqld]
mandatory_roles='role1,role2@localhost,r3@%.example.com'
```


To set and persist mandatory_roles at runtime, use a statement like this:
SET PERSIST mandatory_roles = 'role1,role2@localhost,r3@\%.example.com';
SET PERSIST sets a value for the running MySQL instance. It also saves the value, causing it to carry over to subsequent server restarts. To change the value for the running MySQL instance without having it carry over to subsequent restarts, use the GLOBAL keyword rather than PERSIST. See Section 15.7.6.1, "SET Syntax for Variable Assignment".

Setting mandatory_roles requires the ROLE_ADMIN privilege, in addition to the SYSTEM_VARIABLES_ADMIN privilege (or the deprecated SUPER privilege) normally required to set a global system variable.

Mandatory roles, like explicitly granted roles, do not take effect until activated (see Activating Roles). At login time, role activation occurs for all granted roles if the activate_all_roles_on_login system variable is enabled, or for roles that are set as default roles otherwise. At runtime, SET ROLE activates roles.

Roles named in the value of mandatory_roles cannot be revoked with REVOKE or dropped with DROP ROLE or DROP USER.

To prevent sessions from being made system sessions by default, a role that has the SYSTEM_USER privilege cannot be listed in the value of the mandatory_roles system variable:
- If mandatory_roles is assigned a role at startup that has the SYSTEM_USER privilege, the server writes a message to the error log and exits.
- If mandatory_roles is assigned a role at runtime that has the SYSTEM_USER privilege, an error occurs and the mandatory_roles value remains unchanged.

Even with this safeguard, it is better to avoid granting the SYSTEM_USER privilege through a role in order to guard against the possibility of privilege escalation.

If a role named in mandatory_roles is not present in the mysql. user system table, the role is not granted to users. When the server attempts role activation for a user, it does not treat the nonexistent role as mandatory and writes a warning to the error log. If the role is created later and thus becomes valid, FLUSH PRIVILEGES may be necessary to cause the server to treat it as mandatory.

SHOW GRANTS displays mandatory roles according to the rules described in Section 15.7.7.22, "SHOW GRANTS Statement".

\section*{Checking Role Privileges}

To verify the privileges assigned to an account, use SHOW GRANTS. For example:
```
mysql> SHOW GRANTS FOR 'dev1'@'localhost';
+-----------------------------------------------------
| Grants for dev1@localhost |
+---------------------------------------------------+
| GRANT USAGE ON *.* TO ˋdev1ˋ@ˋlocalhostˋ
| GRANT ˋapp_developerˋ@ˋ%ˋ TO ˋdev1ˋ@ˋlocalhostˋ |
+----------------------------------------------------
```


However, that shows each granted role without "expanding" it to the privileges the role represents. To show role privileges as well, add a USING clause naming the granted roles for which to display privileges:
```
mysql> SHOW GRANTS FOR 'dev1'@'localhost' USING 'app_developer';
+-------------------------------------------------------------
| Grants for dev1@localhost |
+-------------------------------------------------------------
    GRANT USAGE ON *.* TO ˋdev1ˋ @ˋlocalhostˋ |
    GRANT ALL PRIVILEGES ON ˋapp_dbˋ.* TO ˋdev1ˋ@ˋlocalhostˋ |
    GRANT ˋapp_developerˋ@ˋ%ˋ TO ˋdev1ˋ@ˋlocalhostˋ |
+-------------------------------------------------------------
```


Verify each other type of user similarly:
```
mysql> SHOW GRANTS FOR 'read_user1'@'localhost' USING 'app_read';
+------------------------------------------------------------
| Grants for read_user1@localhost
+----------------------------------------------------------
    GRANT USAGE ON *.* TO ˋread_user1ˋ@ˋlocalhostˋ
    GRANT SELECT ON ˋapp_dbˋ.* TO ˋread_user1ˋ@ˋlocalhostˋ |
    GRANT ˋapp_readˋ@ˋ%ˋ TO ˋread_user1ˋ@ˋlocalhostˋ
+-----------------------------------------------------------
mysql> SHOW GRANTS FOR 'rw_user1'@'localhost' USING 'app_read', 'app_write';
+--------------------------------------------------------------------------------
    Grants for rw_user1@localhost |
+-------------------------------------------------------------------------------
    GRANT USAGE ON *.* TO ˋrw_user1ˋ@ˋlocalhostˋ
    GRANT SELECT, INSERT, UPDATE, DELETE ON ˋapp_dbˋ.* TO ˋrw_user1ˋ@ˋlocalhostˋ
    GRANT ˋapp_readˋ@ˋ%ˋ,ˋapp_writeˋ@ˋ%ˋ TO ˋrw_user1ˋ@ˋlocalhost
+-------------------------------------------------------------------------------
```


SHOW GRANTS displays mandatory roles according to the rules described in Section 15.7.7.22, "SHOW GRANTS Statement".

\section*{Activating Roles}

Roles granted to a user account can be active or inactive within account sessions. If a granted role is active within a session, its privileges apply; otherwise, they do not. To determine which roles are active within the current session, use the CURRENT_ROLE( ) function.

By default, granting a role to an account or naming it in the mandatory_roles system variable value does not automatically cause the role to become active within account sessions. For example, because thus far in the preceding discussion no rw_user1 roles have been activated, if you connect to the server as rw_user1 and invoke the CURRENT_ROLE( ) function, the result is NONE (no active roles):
```
mysql> SELECT CURRENT_ROLE();
+-----------------+
| CURRENT_ROLE() |
+-----------------+
| NONE |
+-----------------+
```


To specify which roles should become active each time a user connects to the server and authenticates, use SET DEFAULT ROLE. To set the default to all assigned roles for each account created earlier, use this statement:
```
SET DEFAULT ROLE ALL TO
    'dev1'@'localhost',
    'read_user1'@'localhost',
    'read_user2'@'localhost',
    'rw_user1'@'localhost';
```


Now if you connect as rw_user1, the initial value of CURRENT_ROLE( ) reflects the new default role assignments:
```
mysql> SELECT CURRENT_ROLE();
+---------------------------------+
| CURRENT_ROLE() |
+---------------------------------+
| ˋapp_readˋ@ˋ%ˋ,ˋapp_writeˋ@ˋ%ˋ |
+---------------------------------+
```


To cause all explicitly granted and mandatory roles to be automatically activated when users connect to the server, enable the activate_all_roles_on_login system variable. By default, automatic role activation is disabled.

Within a session, a user can execute SET ROLE to change the set of active roles. For example, for rw_user1:
```
mysql> SET ROLE NONE; SELECT CURRENT_ROLE();
+-----------------+
| CURRENT_ROLE() |
+-----------------+
| NONE |
+-----------------+
mysql> SET ROLE ALL EXCEPT 'app_write'; SELECT CURRENT_ROLE();
+-----------------+
| CURRENT_ROLE() |
+-----------------+
| ˋapp_readˋ@ˋ%ˋ |
+-----------------+
mysql> SET ROLE DEFAULT; SELECT CURRENT_ROLE();
+---------------------------------+
| CURRENT_ROLE() |
+---------------------------------+
| ˋapp_readˋ@ˋ%ˋ,ˋapp_writeˋ@ˋ%ˋ |
+---------------------------------+
```


The first SET ROLE statement deactivates all roles. The second makes rw_user1 effectively read only. The third restores the default roles.

The effective user for stored program and view objects is subject to the DEFINER and SQL SECURITY attributes, which determine whether execution occurs in invoker or definer context (see Section 27.6, "Stored Object Access Control"):
- Stored program and view objects that execute in invoker context execute with the roles that are active within the current session.
- Stored program and view objects that execute in definer context execute with the default roles of the user named in their DEFINER attribute. If activate_all_roles_on_login is enabled, such objects execute with all roles granted to the DEFINER user, including mandatory roles. For stored programs, if execution should occur with roles different from the default, the program body can execute SET ROLE to activate the required roles. This must be done with caution since the privileges assigned to roles can be changed.

\section*{Revoking Roles or Role Privileges}

Just as roles can be granted to an account, they can be revoked from an account:
```
REVOKE role FROM user;
```


Roles named in the mandatory_roles system variable value cannot be revoked.
REVOKE can also be applied to a role to modify the privileges granted to it. This affects not only the role itself, but any account granted that role. Suppose that you want to temporarily make all application users read only. To do this, use REVOKE to revoke the modification privileges from the app_write role:

REVOKE INSERT, UPDATE, DELETE ON app_db.* FROM 'app_write';
As it happens, that leaves the role with no privileges at all, as can be seen using SHOW GRANTS (which demonstrates that this statement can be used with roles, not just users):
```
mysql> SHOW GRANTS FOR 'app_write';
+-----------------------------------------+
| Grants for app_write@% |
+-----------------------------------------+
| GRANT USAGE ON *.* TO ˋapp_writeˋ@ˋ%ˋ |
+----------------------------------------+
```


Because revoking privileges from a role affects the privileges for any user who is assigned the modified role, rw_user1 now has no table modification privileges (INSERT, UPDATE, and DELETE are no longer present):
```
mysql> SHOW GRANTS FOR 'rw_user1'@'localhost'
    USING 'app_read', 'app_write';
+---------------------------------------------------------------------
| Grants for rw_user1@localhost |
+--------------------------------------------------------------------
| GRANT USAGE ON *.* TO ˋrw_user1ˋ@ˋlocalhostˋ
| GRANT SELECT ON ˋapp_dbˋ.* TO ˋrw_user1ˋ@ˋlocalhostˋ
| GRANT ˋapp_readˋ@ˋ%ˋ,ˋapp_writeˋ@ˋ%ˋ TO ˋrw_user1ˋ@ˋlocalhostˋ |
+-------------------------------------------------------------------
```


In effect, the rw_user1 read/write user has become a read-only user. This also occurs for any other accounts that are granted the app_write role, illustrating how use of roles makes it unnecessary to modify privileges for individual accounts.

To restore modification privileges to the role, simply re-grant them:
GRANT INSERT, UPDATE, DELETE ON app_db.* TO 'app_write';
Now rw_user1 again has modification privileges, as do any other accounts granted the app_write role.

\section*{Dropping Roles}

To drop roles, use DROP ROLE:
```
DROP ROLE 'app_read', 'app_write';
```


Dropping a role revokes it from every account to which it was granted.
Roles named in the mandatory_roles system variable value cannot be dropped.

\section*{User and Role Interchangeability}

As has been hinted at earlier for SHOW GRANTS, which displays grants for user accounts or roles, accounts and roles can be used interchangeably.

One difference between roles and users is that CREATE ROLE creates an authorization identifier that is locked by default, whereas CREATE USER creates an authorization identifier that is unlocked by default. You should keep in mind that this distinction is not immutable; a user with appropriate privileges can lock or unlock roles or (other) users after they have been created.

If a database administrator has a preference that a specific authorization identifier must be a role, a name scheme can be used to communicate this intention. For example, you could use a r_prefix for all authorization identifiers that you intend to be roles and nothing else.

Another difference between roles and users lies in the privileges available for administering them:
- The CREATE ROLE and DROP ROLE privileges enable only use of the CREATE ROLE and DROP ROLE statements, respectively.
- The CREATE USER privilege enables use of the ALTER USER, CREATE ROLE, CREATE USER, DROP ROLE, DROP USER, RENAME USER, and REVOKE ALL PRIVILEGES statements.

Thus, the CREATE ROLE and DROP ROLE privileges are not as powerful as CREATE USER and may be granted to users who should only be permitted to create and drop roles, and not perform more general account manipulation.

With regard to privileges and interchangeability of users and roles, you can treat a user account like a role and grant that account to another user or a role. The effect is to grant the account's privileges and roles to the other user or role.

This set of statements demonstrates that you can grant a user to a user, a role to a user, a user to a role, or a role to a role:
```
CREATE USER 'u1';
CREATE ROLE 'r1';
GRANT SELECT ON db1.* TO 'u1';
GRANT SELECT ON db2.* TO 'r1';
CREATE USER 'u2';
CREATE ROLE 'r2';
GRANT 'u1', 'r1' TO 'u2';
GRANT 'u1', 'r1' TO 'r2';
```


The result in each case is to grant to the grantee object the privileges associated with the granted object. After executing those statements, each of $u 2$ and $r 2$ have been granted privileges from a user (u1) and a role (r1):
```
mysql> SHOW GRANTS FOR 'u2' USING 'u1', 'r1';
+---------------------------------------+
| Grants for u2@%
|
| GRANT \textit{-------------------+
GRANT USAGE ON *.* TO ˋu2ˋ@ˋ%ˋ
| GRANT SELECT ON ˋdb1ˋ.* TO ˋu2ˋ@ˋ%ˋ |
| GRANT SELECT ON ˋdb2ˋ.* TO ˋu2ˋ@ˋ%ˋ
| GRANT ˋu1ˋ@ˋ%ˋ,ˋr1ˋ@ˋ%ˋ TO ˋu2 ˋ@ˋ%ˋ |
+---------------------------------------+
mysql> SHOW GRANTS FOR 'r2' USING 'u1', 'r1';
+---------------------------------------+
| Grants for r2@% |
+---------------------------------------+
| GRANT USAGE ON *.* TO ˋr2ˋ@ˋ%ˋ
| GRANT SELECT ON ˋdb1ˋ.* TO ˋr2ˋ@ˋ%ˋ
| GRANT SELECT ON ˋdb2ˋ.* TO ˋr2ˋ@ˋ%ˋ
| GRANT ˋu1ˋ@ˋ%ˋ,ˋr1ˋ@ˋ%ˋ TO ˋr2ˋ@ˋ%ˋ |
+--------------------------------------+
```


The preceding example is illustrative only, but interchangeability of user accounts and roles has practical application, such as in the following situation: Suppose that a legacy application development
project began before the advent of roles in MySQL, so all user accounts associated with the project are granted privileges directly (rather than granted privileges by virtue of being granted roles). One of these accounts is a developer account that was originally granted privileges as follows:

CREATE USER 'old_app_dev'@'localhost' IDENTIFIED BY 'old_app_devpass'; GRANT ALL ON old_app.* TO 'old_app_dev'@'localhost';

If this developer leaves the project, it becomes necessary to assign the privileges to another user, or perhaps multiple users if development activities have expanded. Here are some ways to deal with the issue:
- Without using roles: Change the account password so the original developer cannot use it, and have a new developer use the account instead:

ALTER USER 'old_app_dev'@'localhost' IDENTIFIED BY 'new_password';
- Using roles: Lock the account to prevent anyone from using it to connect to the server:

ALTER USER 'old_app_dev'@'localhost' ACCOUNT LOCK;
Then treat the account as a role. For each developer new to the project, create a new account and grant to it the original developer account:

CREATE USER 'new_app_dev1'@'localhost' IDENTIFIED BY 'new_password';
GRANT 'old_app_dev'@'localhost' TO 'new_app_dev1'@'localhost';
The effect is to assign the original developer account privileges to the new account.

\subsection*{8.2.11 Account Categories}

MySQL incorporates the concept of user account categories, based on the SYSTEM_USER privilege.
- System and Regular Accounts
- Operations Affected by the SYSTEM_USER Privilege
- System and Regular Sessions
- Protecting System Accounts Against Manipulation by Regular Accounts

\section*{System and Regular Accounts}

MySQL incorporates the concept of user account categories, with system and regular users distinguished according to whether they have the SYSTEM_USER privilege:
- A user with the SYSTEM_USER privilege is a system user.
- A user without the SYSTEM_USER privilege is a regular user.

The SYSTEM_USER privilege has an effect on the accounts to which a given user can apply its other privileges, as well as whether the user is protected from other accounts:
- A system user can modify both system and regular accounts. That is, a user who has the appropriate privileges to perform a given operation on regular accounts is enabled by possession of SYSTEM_USER to also perform the operation on system accounts. A system account can be modified only by system users with appropriate privileges, not by regular users.
- A regular user with appropriate privileges can modify regular accounts, but not system accounts. A regular account can be modified by both system and regular users with appropriate privileges.

If a user has the appropriate privileges to perform a given operation on regular accounts, SYSTEM_USER enables the user to also perform the operation on system accounts. SYSTEM_USER does not imply any other privilege, so the ability to perform a given account operation remains
predicated on possession of any other required privileges. For example, if a user can grant the SELECT and UPDATE privileges to regular accounts, then with SYSTEM_USER the user can also grant SELECT and UPDATE to system accounts.

The distinction between system and regular accounts enables better control over certain account administration issues by protecting accounts that have the SYSTEM_USER privilege from accounts that do not have the privilege. For example, the CREATE USER privilege enables not only creation of new accounts, but modification and removal of existing accounts. Without the system user concept, a user who has the CREATE USER privilege can modify or drop any existing account, including the root account. The concept of system user enables restricting modifications to the root account (itself a system account) so they can be made only by system users. Regular users with the CREATE USER privilege can still modify or drop existing accounts, but only regular accounts.

\section*{Operations Affected by the SYSTEM_USER Privilege}

The SYSTEM_USER privilege affects these operations:
- Account manipulation.

Account manipulation includes creating and dropping accounts, granting and revoking privileges, changing account authentication characteristics such as credentials or authentication plugin, and changing other account characteristics such as password expiration policy.

The SYSTEM_USER privilege is required to manipulate system accounts using account-management statements such as CREATE USER and GRANT. To prevent an account from modifying system accounts this way, make it a regular account by not granting it the SYSTEM_USER privilege. (However, to fully protect system accounts against regular accounts, you must also withhold modification privileges for the mysql system schema from regular accounts. See Protecting System Accounts Against Manipulation by Regular Accounts.)
- Killing current sessions and statements executing within them.

To kill a session or statement that is executing with the SYSTEM_USER privilege, your own session must have the SYSTEM_USER privilege, in addition to any other required privilege (CONNECTION_ADMIN or the deprecated SUPER privilege).

If the user that puts a server in offline mode does not have the SYSTEM_USER privilege, connected client users who have the SYSTEM_USER privilege are also not disconnected. However, these users cannot initiate new connections to the server while it is in offline mode, unless they have the CONNECTION_ADMIN or SUPER privilege as well. It is only their existing connection that is not terminated, because the SYSTEM_USER privilege is required to do that.
- Setting the DEFINER attribute for stored objects.

To set the DEFINER attribute for a stored object to an account that has the SYSTEM_USER privilege, you must have the SYSTEM_USER privilege, in addition to any other required privilege.
- Specifying mandatory roles.

A role that has the SYSTEM_USER privilege cannot be listed in the value of the mandatory_roles system variable.
- Overriding "abort" items in MySQL Enterprise Audit's audit log filter.

Accounts with the SYSTEM_USER privilege are automatically assigned the AUDIT_ABORT_EXEMPT privilege, so that queries from the account are always executed even if an "abort" item in the audit log filter would block them. Accounts with the SYSTEM_USER privilege can therefore be used to regain access to a system following an audit misconfiguration. See Section 8.4.5, "MySQL Enterprise Audit".

\section*{System and Regular Sessions}

Sessions executing within the server are distinguished as system or regular sessions, similar to the distinction between system and regular users:
- A session that possesses the SYSTEM_USER privilege is a system session.
- A session that does not possess the SYSTEM_USER privilege is a regular session.

A regular session is able to perform only operations permitted to regular users. A system session is additionally able to perform operations permitted only to system users.

The privileges possessed by a session are those granted directly to its underlying account, plus those granted to all roles currently active within the session. Thus, a session may be a system session because its account has been granted the SYSTEM_USER privilege directly, or because the session has activated a role that has the SYSTEM_USER privilege. Roles granted to an account that are not active within the session do not affect session privileges.

Because activating and deactivating roles can change the privileges possessed by sessions, a session may change from a regular session to a system session or vice versa. If a session activates or deactivates a role that has the SYSTEM_USER privilege, the appropriate change between regular and system session takes place immediately, for that session only:
- If a regular session activates a role with the SYSTEM_USER privilege, the session becomes a system session.
- If a system session deactivates a role with the SYSTEM_USER privilege, the session becomes a regular session, unless some other role with the SYSTEM_USER privilege remains active.

These operations have no effect on existing sessions:
- If the SYSTEM_USER privilege is granted to or revoked from an account, existing sessions for the account do not change between regular and system sessions. The grant or revoke operation affects only sessions for subsequent connections by the account.
- Statements executed by a stored object invoked within a session execute with the system or regular status of the parent session, even if the object DEFINER attribute names a system account.

Because role activation affects only sessions and not accounts, granting a role that has the SYSTEM_USER privilege to a regular account does not protect that account against regular users. The role protects only sessions for the account in which the role has been activated, and protects the session only against being killed by regular sessions.

\section*{Protecting System Accounts Against Manipulation by Regular Accounts}

Account manipulation includes creating and dropping accounts, granting and revoking privileges, changing account authentication characteristics such as credentials or authentication plugin, and changing other account characteristics such as password expiration policy.

Account manipulation can be done two ways:
- By using account-management statements such as CREATE USER and GRANT. This is the preferred method.
- By direct grant-table modification using statements such as INSERT and UPDATE. This method is discouraged but possible for users with the appropriate privileges on the mysql system schema that contains the grant tables.

To fully protect system accounts against modification by a given account, make it a regular account and do not grant it modification privileges for the mysql schema:
- The SYSTEM_USER privilege is required to manipulate system accounts using account-management statements. To prevent an account from modifying system accounts this way, make it a regular account by not granting SYSTEM_USER to it. This includes not granting SYSTEM_USER to any roles granted to the account.
- Privileges for the mysql schema enable manipulation of system accounts through direct modification of the grant tables, even if the modifying account is a regular account. To restrict unauthorized direct modification of system accounts by a regular account, do not grant modification privileges for the mysql schema to the account (or any roles granted to the account). If a regular account must have global privileges that apply to all schemas, mysql schema modifications can be prevented using privilege restrictions imposed using partial revokes. See Section 8.2.12, "Privilege Restriction Using Partial Revokes".

> Note
> Unlike withholding the SYSTEM_USER privilege, which prevents an account from modifying system accounts but not regular accounts, withholding mysql schema privileges prevents an account from modifying system accounts as well as regular accounts. This should not be an issue because, as mentioned, direct grant-table modification is discouraged.

Suppose that you want to create a user u1 who has all privileges on all schemas, except that u1 should be a regular user without the ability to modify system accounts. Assuming that the partial_revokes system variable is enabled, configure u1 as follows:
```
CREATE USER u1 IDENTIFIED BY 'password';
GRANT ALL ON *.* TO u1 WITH GRANT OPTION;
-- GRANT ALL includes SYSTEM_USER, so at this point
-- u1 can manipulate system or regular accounts
REVOKE SYSTEM_USER ON *.* FROM u1;
-- Revoking SYSTEM_USER makes u1 a regular user;
-- now u1 can use account-management statements
-- to manipulate only regular accounts
REVOKE ALL ON mysql.* FROM u1;
-- This partial revoke prevents u1 from directly
-- modifying grant tables to manipulate accounts
```


To prevent all mysql system schema access by an account, revoke all its privileges on the mysql schema, as just shown. It is also possible to permit partial mysql schema access, such as read-only access. The following example creates an account that has SELECT, INSERT, UPDATE, and DELETE privileges globally for all schemas, but only SELECT for the mysql schema:
```
CREATE USER u2 IDENTIFIED BY 'password';
GRANT SELECT, INSERT, UPDATE, DELETE ON *.* TO u2;
REVOKE INSERT, UPDATE, DELETE ON mysql.* FROM u2;
```


Another possibility is to revoke all mysql schema privileges but grant access to specific mysql tables or columns. This can be done even with a partial revoke on mysql. The following statements enable read-only access to u1 within the mysql schema, but only for the db table and the Host and User columns of the user table:
```
CREATE USER u3 IDENTIFIED BY 'password';
GRANT ALL ON *.* TO u3;
REVOKE ALL ON mysql.* FROM u3;
GRANT SELECT ON mysql.db TO u3;
GRANT SELECT(Host,User) ON mysql.user TO u3;
```


\subsection*{8.2.12 Privilege Restriction Using Partial Revokes}

It is possible to grant privileges that apply globally if the partial_revokes system variable is enabled. Specifically, for users who have privileges at the global level, partial_revokes enables privileges for specific schemas to be revoked while leaving the privileges in place for other schemas. Privilege restrictions thus imposed may be useful for administration of accounts that have global privileges but should not be permitted to access certain schemas. For example, it is possible to permit an account to modify any table except those in the mysql system schema.
- Using Partial Revokes
- Partial Revokes Versus Explicit Schema Grants
- Disabling Partial Revokes
- Partial Revokes and Replication
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1222.jpg?height=126&width=99&top_left_y=539&top_left_x=306)

\section*{Note}

For brevity, CREATE USER statements shown here do not include passwords. For production use, always assign account passwords.

\section*{Using Partial Revokes}

The partial_revokes system variable controls whether privilege restrictions can be placed on accounts. By default, partial_revokes is disabled and attempts to partially revoke global privileges produce an error:
```
mysql> CREATE USER u1;
mysql> GRANT SELECT, INSERT ON *.* TO u1;
mysql> REVOKE INSERT ON world.* FROM u1;
ERROR 1141 (42000): There is no such grant defined for user 'u1' on host '%'
```


To permit the REVOKE operation, enable partial_revokes:
```
SET PERSIST partial_revokes = ON;
```


SET PERSIST sets a value for the running MySQL instance. It also saves the value, causing it to carry over to subsequent server restarts. To change the value for the running MySQL instance without having it carry over to subsequent restarts, use the GLOBAL keyword rather than PERSIST. See Section 15.7.6.1, "SET Syntax for Variable Assignment".

With partial_revokes enabled, the partial revoke succeeds:
```
mysql> REVOKE INSERT ON world.* FROM u1;
mysql> SHOW GRANTS FOR u1;
+--------------------------------------------+
| Grants for u1@% |
+--------------------------------------------+
| GRANT SELECT, INSERT ON *.* TO ˋu1ˋ@ˋ%ˋ
| REVOKE INSERT ON ˋworldˋ.* FROM ˋu1ˋ@ˋ%ˋ |
+--------------------------------------------+
```


SHOW GRANTS lists partial revokes as REVOKE statements in its output. The result indicates that u1 has global SELECT and INSERT privileges, except that INSERT cannot be exercised for tables in the world schema. That is, access by u1 to world tables is read only.

The server records privilege restrictions implemented through partial revokes in the mysql. user system table. If an account has partial revokes, its User_attributes column value has a Restrictions attribute:
```
mysql> SELECT User, Host, User_attributes->>'$.Restrictions'
    FROM mysql.user WHERE User_attributes->>'$.Restrictions' <> '';
+------+-------+----------------------------------------------------------
| User | Host | User_attributes->>'$.Restrictions' |
+------+-------+---------------------------------------------------------
| u1 | % | [{"Database": "world", "Privileges": ["INSERT"]}] |
+------+-------+---------------------------------------------------------
```


\section*{Note}

Although partial revokes can be imposed for any schema, privilege restrictions on the mysql system schema in particular are useful as part of a strategy for preventing regular accounts from modifying system accounts. See Protecting System Accounts Against Manipulation by Regular Accounts.

Partial revoke operations are subject to these conditions:
- It is possible to use partial revokes to place restrictions on nonexistent schemas, but only if the revoked privilege is granted globally. If a privilege is not granted globally, revoking it for a nonexistent schema produces an error.
- Partial revokes apply at the schema level only. You cannot use partial revokes for privileges that apply only globally (such as FILE or BINLOG_ADMIN), or for table, column, or routine privileges.
- In privilege assignments, enabling partial_revokes causes MySQL to interpret occurrences of unescaped _ and \% SQL wildcard characters in schema names as literal characters, just as if they had been escaped as \_and \\%. Because this changes how MySQL interprets privileges, it may be advisable to avoid unescaped wildcard characters in privilege assignments for installations where partial_revokes may be enabled.

As mentioned previously, partial revokes of schema-level privileges appear in SHOW GRANTS output as REVOKE statements. This differs from how SHOW GRANTS represents "plain" schema-level privileges:
- When granted, schema-level privileges are represented by their own GRANT statements in the output:
```
mysql> CREATE USER u1;
mysql> GRANT UPDATE ON mysql.* TO u1;
mysql> GRANT DELETE ON world.* TO u1;
mysql> SHOW GRANTS FOR u1;
+-----------------------------------------+
| Grants for u1@% |
+-----------------------------------------+
| GRANT USAGE ON *.* TO ˋu1ˋ@ˋ%ˋ
| GRANT UPDATE ON ˋmysqlˋ.* TO ˋu1ˋ@ˋ%ˋ |
| GRANT DELETE ON ˋworldˋ.* TO ˋu1ˋ@ˋ%ˋ
+----------------------------------------+
```

- When revoked, schema-level privileges simply disappear from the output. They do not appear as REVOKE statements:
```
mysql> REVOKE UPDATE ON mysql.* FROM u1;
mysql> REVOKE DELETE ON world.* FROM u1;
mysql> SHOW GRANTS FOR u1;
+----------------------------------+
| Grants for u1@% |
+----------------------------------+
| GRANT USAGE ON *.* TO ˋu1ˋ@ˋ%ˋ |
```


When a user grants a privilege, any restriction the grantor has on the privilege is inherited by the grantee, unless the grantee already has the privilege without the restriction. Consider the following two users, one of whom has the global SELECT privilege:
```
CREATE USER u1, u2;
GRANT SELECT ON *.* TO u2;
```


Suppose that an administrative user admin has a global but partially revoked SELECT privilege:
```
mysql> CREATE USER admin;
mysql> GRANT SELECT ON *.* TO admin WITH GRANT OPTION;
mysql> REVOKE SELECT ON mysql.* FROM admin;
mysql> SHOW GRANTS FOR admin;
+--------------------------------------------------------
| Grants for admin@% |
+---------------------------------------------------------
| GRANT SELECT ON *.* TO ˋadminˋ@ˋ%ˋ WITH GRANT OPTION
| REVOKE SELECT ON ˋmysqlˋ.* FROM ˋadminˋ@ˋ%ˋ |
+------------------------------------------------------+
```


If admin grants SELECT globally to u1 and u2, the result differs for each user:
- If admin grants SELECT globally to u1, who has no SELECT privilege to begin with, u1 inherits the admin privilege restriction:
```
mysql> GRANT SELECT ON *.* TO u1;
mysql> SHOW GRANTS FOR u1;
+--------------------------------------------+
| Grants for u1@% |
+--------------------------------------------+
| GRANT SELECT ON *.* TO ˋu1ˋ@ˋ%ˋ
| REVOKE SELECT ON ˋmysqlˋ.* FROM ˋu1ˋ@ˋ%ˋ |
+--------------------------------------------+
```

- On the other hand, u2 already holds a global SELECT privilege without restriction. GRANT can only add to a grantee's existing privileges, not reduce them, so if admin grants SELECT globally to u2, u2 does not inherit the admin restriction:
```
mysql> GRANT SELECT ON *.* TO u2;
mysql> SHOW GRANTS FOR u2;
+----------------------------------+
| Grants for u2@% |
+----------------------------------+
| GRANT SELECT ON *.* TO ˋu2ˋ@ˋ%ˋ |
```


If a GRANT statement includes an AS user clause, the privilege restrictions applied are those on the user/role combination specified by the clause, rather than those on the user who executes the statement. For information about the AS clause, see Section 15.7.1.6, "GRANT Statement".

Restrictions on new privileges granted to an account are added to any existing restrictions for that account:
```
mysql> CREATE USER u1;
mysql> GRANT SELECT, INSERT, UPDATE, DELETE ON *.* TO u1;
mysql> REVOKE INSERT ON mysql.* FROM u1;
mysql> SHOW GRANTS FOR u1;
+------------------------------------------------------------
| Grants for u1@% |
+------------------------------------------------------------
| GRANT SELECT, INSERT, UPDATE, DELETE ON *.* TO ˋu1ˋ@ˋ%ˋ |
| REVOKE INSERT ON ˋmysqlˋ.* FROM ˋu1ˋ@ˋ%ˋ |
+------------------------------------------------------------
mysql> REVOKE DELETE, UPDATE ON db2.* FROM u1;
mysql> SHOW GRANTS FOR u1;
+------------------------------------------------------------
| Grants for u1@% |
+-------------------------------------------------------------
| GRANT SELECT, INSERT, UPDATE, DELETE ON *.* TO ˋu1ˋ@ˋ%ˋ |
| REVOKE UPDATE, DELETE ON ˋdb2ˋ.* FROM ˋu1ˋ@ˋ%ˋ |
| REVOKE INSERT ON ˋmysqlˋ.* FROM ˋu1ˋ@ˋ%ˋ |
```


Aggregation of privilege restrictions applies both when privileges are partially revoked explicitly (as just shown) and when restrictions are inherited implicitly from the user who executes the statement or the user mentioned in an AS user clause.

If an account has a privilege restriction on a schema:
- The account cannot grant to other accounts a privilege on the restricted schema or any object within it.
- Another account that does not have the restriction can grant privileges to the restricted account for the restricted schema or objects within it. Suppose that an unrestricted user executes these statements:
```
CREATE USER u1;
GRANT SELECT, INSERT, UPDATE ON *.* TO u1;
REVOKE SELECT, INSERT, UPDATE ON mysql.* FROM u1;
GRANT SELECT ON mysql.user TO u1; -- grant table privilege
```

```
GRANT SELECT(Host,User) ON mysql.db TO u1; -- grant column privileges
```


The resulting account has these privileges, with the ability to perform limited operations within the restricted schema:
```
mysql> SHOW GRANTS FOR u1;
+--------------------------------------------------------------
| Grants for u1@% |
+-------------------------------------------------------------
    GRANT SELECT, INSERT, UPDATE ON *.* TO ˋu1ˋ@ˋ%ˋ
    REVOKE SELECT, INSERT, UPDATE ON ˋmysqlˋ.* FROM ˋu1ˋ@ˋ%ˋ
    GRANT SELECT (ˋHostˋ, ˋUserˋ) ON ˋmysqlˋ.ˋdbˋ TO ˋu1ˋ@ˋ%ˋ
    GRANT SELECT ON ˋmysqlˋ.ˋuserˋ TO ˋu1ˋ@ˋ%ˋ
+--------------------------------------------------------------
```


If an account has a restriction on a global privilege, the restriction is removed by any of these actions:
- Granting the privilege globally to the account by an account that has no restriction on the privilege.
- Granting the privilege at the schema level.
- Revoking the privilege globally.

Consider a user u1 who holds several privileges globally, but with restrictions on INSERT, UPDATE and DELETE:
```
mysql> CREATE USER u1;
mysql> GRANT SELECT, INSERT, UPDATE, DELETE ON *.* TO u1;
mysql> REVOKE INSERT, UPDATE, DELETE ON mysql.* FROM u1;
mysql> SHOW GRANTS FOR u1;
+--------------------------------------------------------------
| Grants for u1@% |
+-------------------------------------------------------------
| GRANT SELECT, INSERT, UPDATE, DELETE ON * * TO ˋu1ˋ@ˋ%ˋ
| REVOKE INSERT, UPDATE, DELETE ON ˋmysqlˋ.* FROM ˋu1ˋ@ˋ%ˋ |
```


Granting a privilege globally to u1 from an account with no restriction removes the privilege restriction. For example, to remove the INSERT restriction:
```
mysql> GRANT INSERT ON *.* TO u1;
mysql> SHOW GRANTS FOR u1;
+------------------------------------------------------------
| Grants for u1@% |
+--------------------------------------------------------------+
| REVOKE UPDATE, DELETE ON ˋmysqlˋ.* FROM ˋu1ˋ@ˋ%ˋ |
```


Granting a privilege at the schema level to u1 removes the privilege restriction. For example, to remove the UPDATE restriction:
```
mysql> GRANT UPDATE ON mysql.* TO u1;
mysql> SHOW GRANTS FOR u1;
+------------------------------------------------------------
| Grants for u1@%
+-----------------------------------------------------------
| GRANT SELECT, INSERT, UPDATE, DELETE ON *.* TO ˋu1ˋ@ˋ%ˋ |
| REVOKE DELETE ON ˋmysqlˋ.* FROM ˋu1ˋ@ˋ%ˋ |
+---------------------------------------------------------+
```


Revoking a global privilege removes the privilege, including any restrictions on it. For example, to remove the DELETE restriction (at the cost of removing all DELETE access):
```
mysql> REVOKE DELETE ON *.* FROM u1;
mysql> SHOW GRANTS FOR u1;
+-----------------------------------------------------
| Grants for u1@%
+-----------------------------------------------------
```

```
| GRANT SELECT, INSERT, UPDATE ON *.* TO ˋu1ˋ@ˋ%ˋ |
+----------------------------------------------------
```


If an account has a privilege at both the global and schema levels, you must revoke it at the schema level twice to effect a partial revoke. Suppose that u1 has these privileges, where INSERT is held both globally and on the world schema:
```
mysql> CREATE USER u1;
mysql> GRANT SELECT, INSERT ON *.* TO u1;
mysql> GRANT INSERT ON world.* TO u1;
mysql> SHOW GRANTS FOR u1;
+-------------------------------------------+
| Grants for u1@% |
+-------------------------------------------+
| GRANT SELECT, INSERT ON *.* TO ˋu1ˋ@ˋ%ˋ |
| GRANT INSERT ON ˋworldˋ.* TO ˋu1ˋ@ˋ%ˋ |
+-------------------------------------------
```


Revoking INSERT on world revokes the schema-level privilege (SHOW GRANTS no longer displays the schema-level GRANT statement):
```
mysql> REVOKE INSERT ON world.* FROM u1;
mysql> SHOW GRANTS FOR u1;
+-------------------------------------------+
| Grants for u1@% |
+------------------------------------------+
| GRANT SELECT, INSERT ON *.* TO ˋu1ˋ@ˋ%ˋ |
+-------------------------------------------
```


Revoking INSERT on world again performs a partial revoke of the global privilege (SHOW GRANTS now includes a schema-level REVOKE statement):
```
mysql> REVOKE INSERT ON world.* FROM u1;
mysql> SHOW GRANTS FOR u1;
+--------------------------------------------+
| Grants for u1@% |
+--------------------------------------------+
| GRANT SELECT, INSERT ON *.* TO ˋu1ˋ@ˋ%ˋ
| REVOKE INSERT ON ˋworldˋ.* FROM ˋu1ˋ@ˋ%ˋ |
+--------------------------------------------+
```


\section*{Partial Revokes Versus Explicit Schema Grants}

To provide access to accounts for some schemas but not others, partial revokes provide an alternative to the approach of explicitly granting schema-level access without granting global privileges. The two approaches have different advantages and disadvantages.

Granting schema-level privileges and not global privileges:
- Adding a new schema: The schema is inaccessible to existing accounts by default. For any account to which the schema should be accessible, the DBA must grant schema-level access.
- Adding a new account: The DBA must grant schema-level access for each schema to which the account should have access.

Granting global privileges in conjunction with partial revokes:
- Adding a new schema: The schema is accessible to existing accounts that have global privileges. For any such account to which the schema should be inaccessible, the DBA must add a partial revoke.
- Adding a new account: The DBA must grant the global privileges, plus a partial revoke on each restricted schema.

The approach that uses explicit schema-level grant is more convenient for accounts for which access is limited to a few schemas. The approach that uses partial revokes is more convenient for accounts with broad access to all schemas except a few.

\section*{Disabling Partial Revokes}

Once enabled, partial_revokes cannot be disabled if any account has privilege restrictions. If any such account exists, disabling partial_revokes fails:
- For attempts to disable partial_revokes at startup, the server logs an error message and enables partial_revokes.
- For attempts to disable partial_revokes at runtime, an error occurs and the partial_revokes value remains unchanged.

To disable partial_revokes when restrictions exist, the restrictions first must be removed:
1. Determine which accounts have partial revokes:
```
SELECT User, Host, User_attributes->>'$.Restrictions'
FROM mysql.user WHERE User_attributes->>'$.Restrictions' <> '';
```

2. For each such account, remove its privilege restrictions. Suppose that the previous step shows account u1 to have these restrictions:
```
[{"Database": "world", "Privileges": ["INSERT", "DELETE"]
```


Restriction removal can be done various ways:
- Grant the privileges globally, without restrictions:
```
GRANT INSERT, DELETE ON *.* TO u1;
```

- Grant the privileges at the schema level:
```
GRANT INSERT, DELETE ON world.* TO u1;
```

- Revoke the privileges globally (assuming that they are no longer needed):
```
REVOKE INSERT, DELETE ON *.* FROM u1;
```

- Remove the account itself (assuming that it is no longer needed):
```
DROP USER u1;
```


After all privilege restrictions are removed, it is possible to disable partial revokes:
```
SET PERSIST partial_revokes = OFF;
```


\section*{Partial Revokes and Replication}

In replication scenarios, if partial_revokes is enabled on any host, it must be enabled on all hosts. Otherwise, REVOKE statements to partially revoke a global privilege do not have the same effect for all hosts on which replication occurs, potentially resulting in replication inconsistencies or errors.

When partial_revokes is enabled, an extended syntax is recorded in the binary log for GRANT statements, including the current user that issued the statement and their currently active roles. If a user or a role recorded in this way does not exist on the replica, the replication applier thread stops at the GRANT statement with an error. Ensure that all user accounts that issue or might issue GRANT statements on the replication source server also exist on the replica, and have the same set of roles as they have on the source.

\subsection*{8.2.13 When Privilege Changes Take Effect}

If the mysqld server is started without the--skip-grant-tables option, it reads all grant table contents into memory during its startup sequence. The in-memory tables become effective for access control at that point.

If you modify the grant tables indirectly using an account-management statement, the server notices these changes and loads the grant tables into memory again immediately. Account-management statements are described in Section 15.7.1, "Account Management Statements". Examples include GRANT, REVOKE, SET PASSWORD, and RENAME USER.

If you modify the grant tables directly using statements such as INSERT, UPDATE, or DELETE (which is not recommended), the changes have no effect on privilege checking until you either tell the server to reload the tables or restart it. Thus, if you change the grant tables directly but forget to reload them, the changes have no effect until you restart the server. This may leave you wondering why your changes seem to make no difference!

To tell the server to reload the grant tables, perform a flush-privileges operation. This can be done by issuing a FLUSH PRIVILEGES statement or by executing a mysqladmin flush-privileges or mysqladmin reload command.

A grant table reload affects privileges for each existing client session as follows:
- Table and column privilege changes take effect with the client's next request.
- Database privilege changes take effect the next time the client executes a USE db_name statement.

\section*{Note}

Client applications may cache the database name; thus, this effect may not be visible to them without actually changing to a different database.
- Static global privileges and passwords are unaffected for a connected client. These changes take effect only in sessions for subsequent connections. Changes to dynamic global privileges apply immediately. For information about the differences between static and dynamic privileges, see Static Versus Dynamic Privileges.)

Changes to the set of active roles within a session take effect immediately, for that session only. The SET ROLE statement performs session role activation and deactivation (see Section 15.7.1.11, "SET ROLE Statement").

If the server is started with the--skip-grant-tables option, it does not read the grant tables or implement any access control. Any user can connect and perform any operation, which is insecure. To cause a server thus started to read the tables and enable access checking, flush the privileges.

\subsection*{8.2.14 Assigning Account Passwords}

Required credentials for clients that connect to the MySQL server can include a password. This section describes how to assign passwords for MySQL accounts.

MySQL stores credentials in the user table in the mysql system database. Operations that assign or modify passwords are permitted only to users with the CREATE USER privilege, or, alternatively, privileges for the mysql database (INSERT privilege to create new accounts, UPDATE privilege to modify existing accounts). If the read_only system variable is enabled, use of account-modification statements such as CREATE USER or ALTER USER additionally requires the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege).

The discussion here summarizes syntax only for the most common password-assignment statements. For complete details on other possibilities, see Section 15.7.1.3, "CREATE USER Statement", Section 15.7.1.1, "ALTER USER Statement", and Section 15.7.1.10, "SET PASSWORD Statement".

MySQL uses plugins to perform client authentication; see Section 8.2.17, "Pluggable Authentication". In password-assigning statements, the authentication plugin associated with an account performs any hashing required of a cleartext password specified. This enables MySQL to obfuscate passwords prior to storing them in the mysql. user system table. For the statements described here, MySQL automatically hashes the password specified. There are also syntax for CREATE USER and ALTER USER that permits hashed values to be specified literally. For details, see the descriptions of those statements.

To assign a password when you create a new account, use CREATE USER and include an IDENTIFIED BY clause:

CREATE USER 'jeffrey'@'localhost' IDENTIFIED BY 'password';
CREATE USER also supports syntax for specifying the account authentication plugin. See Section 15.7.1.3, "CREATE USER Statement".

To assign or change a password for an existing account, use the ALTER USER statement with an IDENTIFIED BY clause:
```
ALTER USER 'jeffrey'@'localhost' IDENTIFIED BY 'password';
```


If you are not connected as an anonymous user, you can change your own password without naming your own account literally:
```
ALTER USER USER() IDENTIFIED BY 'password';
```


To change an account password from the command line, use the mysqladmin command:
mysqladmin -u user_name -h host_name password "password"
The account for which this command sets the password is the one with a row in the mysql. user system table that matches user_name in the User column and the client host from which you connect in the Host column.

\section*{Warning}

Setting a password using mysqladmin should be considered insecure. On some systems, your password becomes visible to system status programs such as ps that may be invoked by other users to display command lines. MySQL clients typically overwrite the command-line password argument with zeros during their initialization sequence. However, there is still a brief interval during which the value is visible. Also, on some systems this overwriting strategy is ineffective and the password remains visible to ps. (SystemV Unix systems and perhaps others are subject to this problem.)

If you are using MySQL Replication, be aware that a password used by a replica as part of CHANGE REPLICATION SOURCE TO is effectively limited to 32 characters in length; if the password is longer, any excess characters are truncated. This is not due to any limit imposed by MySQL Server generally, but rather is an issue specific to MySQL Replication.

\subsection*{8.2.15 Password Management}

MySQL supports these password-management capabilities:
- Password expiration, to require passwords to be changed periodically.
- Password reuse restrictions, to prevent old passwords from being chosen again.
- Password verification, to require that password changes also specify the current password to be replaced.
- Dual passwords, to enable clients to connect using either a primary or secondary password.
- Password strength assessment, to require strong passwords.
- Random password generation, as an alternative to requiring explicit administrator-specified literal passwords.
- Password failure tracking, to enable temporary account locking after too many consecutive incorrectpassword login failures.

The following sections describe these capabilities, except password strength assessment, which is implemented using the validate_password component and is described in Section 8.4.3, "The Password Validation Component".
- Internal Versus External Credentials Storage
- Password Expiration Policy
- Password Reuse Policy
- Password Verification-Required Policy
- Dual Password Support
- Random Password Generation
- Failed-Login Tracking and Temporary Account Locking

\section*{Important}

MySQL implements password-management capabilities using tables in the mysql system database. If you upgrade MySQL from an earlier version, your system tables might not be up to date. In that case, the server writes messages similar to these to the error log during the startup process (the exact numbers may vary):
[ERROR] Column count of mysql.user is wrong. Expected 49, found 47. The table is probably corrupted [Warning] ACL table mysql.password_history missing.
Some operations may fail.
To correct the issue, perform the MySQL upgrade procedure. See Chapter 3, Upgrading MySQL. Until this is done, password changes are not possible.

\section*{Internal Versus External Credentials Storage}

Some authentication plugins store account credentials internally to MySQL, in the mysql. user system table:
- caching_sha2_password
- mysql_native_password (deprecated)
- sha256_password (deprecated)

Most discussion in this section applies to such authentication plugins because most passwordmanagement capabilities described here are based on internal credentials storage handled by MySQL itself. Other authentication plugins store account credentials externally to MySQL. For accounts that use plugins that perform authentication against an external credentials system, password management must be handled externally against that system as well.

The exception is that the options for failed-login tracking and temporary account locking apply to all accounts, not just accounts that use internal credentials storage, because MySQL is able to assess the status of login attempts for any account no matter whether it uses internal or external credentials storage.

For information about individual authentication plugins, see Section 8.4.1, "Authentication Plugins".

\section*{Password Expiration Policy}

MySQL enables database administrators to expire account passwords manually, and to establish a policy for automatic password expiration. Expiration policy can be established globally, and individual
accounts can be set to either defer to the global policy or override the global policy with specific peraccount behavior.

To expire an account password manually, use the ALTER USER statement:
```
ALTER USER 'jeffrey'@'localhost' PASSWORD EXPIRE;
```


This operation marks the password expired in the corresponding row in the mysql. user system table.
Password expiration according to policy is automatic and is based on password age, which for a given account is assessed from the date and time of its most recent password change. The mysql.user system table indicates for each account when its password was last changed, and the server automatically treats the password as expired at client connection time if its age is greater than its permitted lifetime. This works with no explicit manual password expiration.

To establish automatic password-expiration policy globally, use the default_password_lifetime system variable. Its default value is 0 , which disables automatic password expiration. If the value of default_password_lifetime is a positive integer $N$, it indicates the permitted password lifetime, such that passwords must be changed every $N$ days.

\section*{Examples:}
- To establish a global policy that passwords have a lifetime of approximately six months, start the server with these lines in a server my. cnf file:
```
[mysqld]
default_password_lifetime=180
```

- To establish a global policy such that passwords never expire, set default_password_lifetime to 0 :
```
[mysqld]
default_password_lifetime=0
```

- default_password_lifetime can also be set and persisted at runtime:

SET PERSIST default_password_lifetime = 180;
SET PERSIST default_password_lifetime = 0;
SET PERSIST sets a value for the running MySQL instance. It also saves the value to carry over to subsequent server restarts; see Section 15.7.6.1, "SET Syntax for Variable Assignment". To change the value for the running MySQL instance without having it carry over to subsequent restarts, use the GLOBAL keyword rather than PERSIST.

The global password-expiration policy applies to all accounts that have not been set to override it. To establish policy for individual accounts, use the PASSWORD EXPIRE option of the CREATE USER and ALTER USER statements. See Section 15.7.1.3, "CREATE USER Statement", and Section 15.7.1.1, "ALTER USER Statement".

Example account-specific statements:
- Require the password to be changed every 90 days:
```
CREATE USER 'jeffrey'@'localhost' PASSWORD EXPIRE INTERVAL 90 DAY;
ALTER USER 'jeffrey'@'localhost' PASSWORD EXPIRE INTERVAL 90 DAY;
```


This expiration option overrides the global policy for all accounts named by the statement.
- Disable password expiration:

CREATE USER 'jeffrey'@'localhost' PASSWORD EXPIRE NEVER;
ALTER USER 'jeffrey'@'localhost' PASSWORD EXPIRE NEVER;
This expiration option overrides the global policy for all accounts named by the statement.
- Defer to the global expiration policy for all accounts named by the statement:
```
CREATE USER 'jeffrey'@'localhost' PASSWORD EXPIRE DEFAULT;
ALTER USER 'jeffrey'@'localhost' PASSWORD EXPIRE DEFAULT;
```


When a client successfully connects, the server determines whether the account password has expired:
- The server checks whether the password has been manually expired.
- Otherwise, the server checks whether the password age is greater than its permitted lifetime according to the automatic password expiration policy. If so, the server considers the password expired.

If the password is expired (whether manually or automatically), the server either disconnects the client or restricts the operations permitted to it (see Section 8.2.16, "Server Handling of Expired Passwords"). Operations performed by a restricted client result in an error until the user establishes a new account password:
```
mysql> SELECT 1;
ERROR 1820 (HY000): You must reset your password using ALTER USER
statement before executing this statement.
mysql> ALTER USER USER() IDENTIFIED BY 'password';
Query OK, 0 rows affected (0.01 sec)
mysql> SELECT 1;
+---+
| 1 |
+---+
| 1 |
+---+
1 row in set (0.00 sec)
```


After the client resets the password, the server restores normal access for the session, as well as for subsequent connections that use the account. It is also possible for an administrative user to reset the account password, but any existing restricted sessions for that account remain restricted. A client using the account must disconnect and reconnect before statements can be executed successfully.

\section*{Note}

Although it is possible to "reset" an expired password by setting it to its current value, it is preferable, as a matter of good policy, to choose a different password. DBAs can enforce non-reuse by establishing an appropriate password-reuse policy. See Password Reuse Policy.

\section*{Password Reuse Policy}

MySQL enables restrictions to be placed on reuse of previous passwords. Reuse restrictions can be established based on number of password changes, time elapsed, or both. Reuse policy can be established globally, and individual accounts can be set to either defer to the global policy or override the global policy with specific per-account behavior.

The password history for an account consists of passwords it has been assigned in the past. MySQL can restrict new passwords from being chosen from this history:
- If an account is restricted on the basis of number of password changes, a new password cannot be chosen from a specified number of the most recent passwords. For example, if the minimum number of password changes is set to 3 , a new password cannot be the same as any of the most recent 3 passwords.
- If an account is restricted based on time elapsed, a new password cannot be chosen from passwords in the history that are newer than a specified number of days. For example, if the
password reuse interval is set to 60 , a new password must not be among those previously chosen within the last 60 days.

\section*{Note}

The empty password does not count in the password history and is subject to reuse at any time.

To establish password-reuse policy globally, use the password_history and password_reuse_interval system variables.

\section*{Examples:}
- To prohibit reusing any of the last 6 passwords or passwords newer than 365 days, put these lines in the server my. cnf file:
```
[mysqld]
password_history=6
password_reuse_interval=365
```

- To set and persist the variables at runtime, use statements like this:
```
SET PERSIST password_history = 6;
SET PERSIST password_reuse_interval = 365;
```


SET PERSIST sets a value for the running MySQL instance. It also saves the value to carry over to subsequent server restarts; see Section 15.7.6.1, "SET Syntax for Variable Assignment". To change the value for the running MySQL instance without having it carry over to subsequent restarts, use the GLOBAL keyword rather than PERSIST.

The global password-reuse policy applies to all accounts that have not been set to override it. To establish policy for individual accounts, use the PASSWORD HISTORY and PASSWORD REUSE INTERVAL options of the CREATE USER and ALTER USER statements. See Section 15.7.1.3, "CREATE USER Statement", and Section 15.7.1.1, "ALTER USER Statement".

Example account-specific statements:
- Require a minimum of 5 password changes before permitting reuse:
```
CREATE USER 'jeffrey'@'localhost' PASSWORD HISTORY 5;
ALTER USER 'jeffrey'@'localhost' PASSWORD HISTORY 5;
```


This history-length option overrides the global policy for all accounts named by the statement.
- Require a minimum of 365 days elapsed before permitting reuse:
```
CREATE USER 'jeffrey'@'localhost' PASSWORD REUSE INTERVAL 365 DAY;
ALTER USER 'jeffrey'@'localhost' PASSWORD REUSE INTERVAL 365 DAY;
```


This time-elapsed option overrides the global policy for all accounts named by the statement.
- To combine both types of reuse restrictions, use PASSWORD HISTORY and PASSWORD REUSE INTERVAL together:
```
CREATE USER 'jeffrey'@'localhost'
    PASSWORD HISTORY 5
    PASSWORD REUSE INTERVAL 365 DAY;
ALTER USER 'jeffrey'@'localhost'
    PASSWORD HISTORY 5
    PASSWORD REUSE INTERVAL 365 DAY;
```


These options override both global policy reuse restrictions for all accounts named by the statement.
- Defer to the global policy for both types of reuse restrictions:
```
CREATE USER 'jeffrey'@'localhost'
```

```
    PASSWORD HISTORY DEFAULT
    PASSWORD REUSE INTERVAL DEFAULT;
ALTER USER 'jeffrey'@'localhost'
    PASSWORD HISTORY DEFAULT
    PASSWORD REUSE INTERVAL DEFAULT;
```


\section*{Password Verification-Required Policy}

It is possible to require that attempts to change an account password be verified by specifying the current password to be replaced. This enables DBAs to prevent users from changing a password without proving that they know the current password. Such changes could otherwise occur, for example, if one user walks away from a terminal session temporarily without logging out, and a malicious user uses the session to change the original user's MySQL password. This can have unfortunate consequences:
- The original user becomes unable to access MySQL until the account password is reset by an administrator.
- Until the password reset occurs, the malicious user can access MySQL with the benign user's changed credentials.

Password-verification policy can be established globally, and individual accounts can be set to either defer to the global policy or override the global policy with specific per-account behavior.

For each account, its mysql. user row indicates whether there is an account-specific setting requiring verification of the current password for password change attempts. The setting is established by the PASSWORD REQUIRE option of the CREATE USER and ALTER USER statements:
- If the account setting is PASSWORD REQUIRE CURRENT, password changes must specify the current password.
- If the account setting is PASSWORD REQUIRE CURRENT OPTIONAL, password changes may but need not specify the current password.
- If the account setting is PASSWORD REQUIRE CURRENT DEFAULT, the password_require_current system variable determines the verification-required policy for the account:
- If password_require_current is enabled, password changes must specify the current password.
- If password_require_current is disabled, password changes may but need not specify the current password.

In other words, if the account setting is not PASSWORD REQUIRE CURRENT DEFAULT, the account setting takes precedence over the global policy established by the password_require_current system variable. Otherwise, the account defers to the password_require_current setting.

By default, password verification is optional: password_require_current is disabled and accounts created with no PASSWORD REQUIRE option default to PASSWORD REQUIRE CURRENT DEFAULT.

The following table shows how per-account settings interact with password_require_current system variable values to determine account password verification-required policy.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.10 Password-Verification Policy}
\begin{tabular}{|l|l|l|}
\hline Per-Account Setting & password_require_current System Variable & Password Changes Require Current Password? \\
\hline PASSWORD REQUIRE CURRENT & OFF & Yes \\
\hline PASSWORD REQUIRE CURRENT & ON & Yes \\
\hline PASSWORD REQUIRE CURRENT OPTIONAL & OFF & No \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|}
\hline Per-Account Setting & password_require_current System Variable & Password Changes Require Current Password? \\
\hline PASSWORD REQUIRE CURRENT OPTIONAL & ON & No \\
\hline PASSWORD REQUIRE CURRENT DEFAULT & OFF & No \\
\hline PASSWORD REQUIRE CURRENT DEFAULT & ON & Yes \\
\hline
\end{tabular}

\section*{Note}

Privileged users can change any account password without specifying the current password, regardless of the verification-required policy. A privileged user is one who has the global CREATE USER privilege or the UPDATE privilege for the mysql system database.

To establish password-verification policy globally, use the password_require_current system variable. Its default value is 0FF, so it is not required that account password changes specify the current password.

\section*{Examples:}
- To establish a global policy that password changes must specify the current password, start the server with these lines in a server my.cnf file:
```
[mysqld]
password_require_current=ON
```

- To set and persist password_require_current at runtime, use a statement such as one of these:
```
SET PERSIST password_require_current = ON;
SET PERSIST password_require_current = OFF;
```


SET PERSIST sets a value for the running MySQL instance. It also saves the value to carry over to subsequent server restarts; see Section 15.7.6.1, "SET Syntax for Variable Assignment". To change the value for the running MySQL instance without having it carry over to subsequent restarts, use the GLOBAL keyword rather than PERSIST.

The global password verification-required policy applies to all accounts that have not been set to override it. To establish policy for individual accounts, use the PASSWORD REQUIRE options of the CREATE USER and ALTER USER statements. See Section 15.7.1.3, "CREATE USER Statement", and Section 15.7.1.1, "ALTER USER Statement".

Example account-specific statements:
- Require that password changes specify the current password:
```
CREATE USER 'jeffrey'@'localhost' PASSWORD REQUIRE CURRENT;
ALTER USER 'jeffrey'@'localhost' PASSWORD REQUIRE CURRENT;
```


This verification option overrides the global policy for all accounts named by the statement.
- Do not require that password changes specify the current password (the current password may but need not be given):
```
CREATE USER 'jeffrey'@'localhost' PASSWORD REQUIRE CURRENT OPTIONAL;
ALTER USER 'jeffrey'@'localhost' PASSWORD REQUIRE CURRENT OPTIONAL;
```


This verification option overrides the global policy for all accounts named by the statement.
- Defer to the global password verification-required policy for all accounts named by the statement:
```
CREATE USER 'jeffrey'@'localhost' PASSWORD REQUIRE CURRENT DEFAULT;
ALTER USER 'jeffrey'@'localhost' PASSWORD REQUIRE CURRENT DEFAULT;
```


Verification of the current password comes into play when a user changes a password using the ALTER USER or SET PASSWORD statement. The examples use ALTER USER, which is preferred over SET PASSWORD, but the principles described here are the same for both statements.

In password-change statements, a REPLACE clause specifies the current password to be replaced. Examples:
- Change the current user's password:
```
ALTER USER USER() IDENTIFIED BY 'auth_string' REPLACE 'current_auth_string';
```

- Change a named user's password:
```
ALTER USER 'jeffrey'@'localhost'
    IDENTIFIED BY 'auth_string'
    REPLACE 'current_auth_string';
```

- Change a named user's authentication plugin and password:
```
ALTER USER 'jeffrey'@'localhost'
    IDENTIFIED WITH caching_sha2_password BY 'auth_string'
    REPLACE 'current_auth_string';
```


The REPLACE clause works like this:
- REPLACE must be given if password changes for the account are required to specify the current password, as verification that the user attempting to make the change actually knows the current password.
- REPLACE is optional if password changes for the account may but need not specify the current password.
- If REPLACE is specified, it must specify the correct current password, or an error occurs. This is true even if REPLACE is optional.
- REPLACE can be specified only when changing the account password for the current user. (This means that in the examples just shown, the statements that explicitly name the account for jeffrey fail unless the current user is jeffrey.) This is true even if the change is attempted for another user by a privileged user; however, such a user can change any password without specifying REPLACE.
- REPLACE is omitted from the binary log to avoid writing cleartext passwords to it.

\section*{Dual Password Support}

User accounts are permitted to have dual passwords, designated as primary and secondary passwords. Dual-password capability makes it possible to seamlessly perform credential changes in scenarios like this:
- A system has a large number of MySQL servers, possibly involving replication.
- Multiple applications connect to different MySQL servers.
- Periodic credential changes must be made to the account or accounts used by the applications to connect to the servers.

Consider how a credential change must be performed in the preceding type of scenario when an account is permitted only a single password. In this case, there must be close cooperation in the timing of when the account password change is made and propagated throughout all servers, and when all applications that use the account are updated to use the new password. This process may involve downtime during which servers or applications are unavailable.

With dual passwords, credential changes can be made more easily, in phases, without requiring close cooperation, and without downtime:
1. For each affected account, establish a new primary password on the servers, retaining the current password as the secondary password. This enables servers to recognize either the primary or secondary password for each account, while applications can continue to connect to the servers using the same password as previously (which is now the secondary password).
2. After the password change has propagated to all servers, modify applications that use any affected account to connect using the account primary password.
3. After all applications have been migrated from the secondary passwords to the primary passwords, the secondary passwords are no longer needed and can be discarded. After this change has propagated to all servers, only the primary password for each account can be used to connect. The credential change is now complete.

MySQL implements dual-password capability with syntax that saves and discards secondary passwords:
- The RETAIN CURRENT PASSWORD clause for the ALTER USER and SET PASSWORD statements saves an account current password as its secondary password when you assign a new primary password.
- The DISCARD OLD PASSWORD clause for ALTER USER discards an account secondary password, leaving only the primary password.

Suppose that, for the previously described credential-change scenario, an account named 'appuser1'@'host1.example.com' is used by applications to connect to servers, and that the account password is to be changed from 'password_a' to 'password_b'.

To perform this change of credentials, use ALTER USER as follows:
1. On each server that is not a replica, establish 'password_b' as the new appuser1 primary password, retaining the current password as the secondary password:
```
ALTER USER 'appuser1'@'host1.example.com'
    IDENTIFIED BY 'password_b'
    RETAIN CURRENT PASSWORD;
```

2. Wait for the password change to replicate throughout the system to all replicas.
3. Modify each application that uses the appuser1 account so that it connects to the servers using a password of 'password_b' rather than 'password_a'.
4. At this point, the secondary password is no longer needed. On each server that is not a replica, discard the secondary password:
```
ALTER USER 'appuser1'@'host1.example.com'
    DISCARD OLD PASSWORD;
```

5. After the discard-password change has replicated to all replicas, the credential change is complete.

The RETAIN CURRENT PASSWORD and DISCARD OLD PASSWORD clauses have the following effects:
- RETAIN CURRENT PASSWORD retains an account current password as its secondary password, replacing any existing secondary password. The new password becomes the primary password, but clients can use the account to connect to the server using either the primary or secondary password. (Exception: If the new password specified by the ALTER USER or SET PASSWORD statement is empty, the secondary password becomes empty as well, even if RETAIN CURRENT PASSWORD is given.)
- If you specify RETAIN CURRENT PASSWORD for an account that has an empty primary password, the statement fails.
- If an account has a secondary password and you change its primary password without specifying RETAIN CURRENT PASSWORD, the secondary password remains unchanged.
- For ALTER USER, if you change the authentication plugin assigned to the account, the secondary password is discarded. If you change the authentication plugin and also specify RETAIN CURRENT PASSWORD, the statement fails.
- For ALTER USER, DISCARD OLD PASSWORD discards the secondary password, if one exists. The account retains only its primary password, and clients can use the account to connect to the server only with the primary password.

Statements that modify secondary passwords require these privileges:
- The APPLICATION_PASSWORD_ADMIN privilege is required to use the RETAIN CURRENT PASSWORD or DISCARD OLD PASSWORD clause for ALTER USER and SET PASSWORD statements that apply to your own account. The privilege is required to manipulate your own secondary password because most users require only one password.
- If an account is to be permitted to manipulate secondary passwords for all accounts, it should be granted the CREATE USER privilege rather than APPLICATION_PASSWORD_ADMIN.

\section*{Random Password Generation}

The CREATE USER, ALTER USER, and SET PASSWORD statements have the capability of generating random passwords for user accounts, as an alternative to requiring explicit administrator-specified literal passwords. See the description of each statement for details about the syntax. This section describes the characteristics common to generated random passwords.

By default, generated random passwords have a length of 20 characters. This length is controlled by the generated_random_password_length system variable, which has a range from 5 to 255.

For each account for which a statement generates a random password, the statement stores the password in the mysql. user system table, hashed appropriately for the account authentication plugin. The statement also returns the cleartext password in a row of a result set to make it available to the user or application executing the statement. The result set columns are named user, host, generated password, and auth_factor indicating the user name and host name values that identify the affected row in the mysql. user system table, the cleartext generated password, and the authentication factor the displayed password value applies to.
```
mysql> CREATE USER
    'u1'@'localhost' IDENTIFIED BY RANDOM PASSWORD,
    'u2'@'%.example.com' IDENTIFIED BY RANDOM PASSWORD,
    'u3'@'%.org' IDENTIFIED BY RANDOM PASSWORD;
+------+----------------+----------------------+-------------+
| user | host | generated password | auth_factor |
+------+----------------+---------------------+--------------
| u1 | localhost | iOeqf>Mh9:;XD&qn(Hl} | 1 |
| u2 | %.example.com | sXTSAEvw3St-R+_-C3Vb | 1 |
| u3 | %.org | nEVe%Ctw/U/*Md)Exc7& | 1 |
+------+----------------+----------------------+-------------
mysql> ALTER USER
    'u1'@'localhost' IDENTIFIED BY RANDOM PASSWORD,
    'u2'@'%.example.com' IDENTIFIED BY RANDOM PASSWORD;
+------+----------------+---------------------+--------------
| user | host | generated password | auth_factor |
+------+----------------+----------------------+-------------
| u1 | localhost | Seiei:&cw}8]@30A64vh | 1 |
| u2 | %.example.com | j@&diTX8018}(NiHXSae | 1 |
mysql> SET PASSWORD FOR 'u3'@'%.org' TO RANDOM;
+-------+-------+-----------------------+-------------+
| user | host | generated password | auth_factor |
+-------+-------+----------------------+-------------+
| u3 | %.org | n&cz2xF;P3!U)+]Vw52H | 1 |
+-------+-------+-----------------------+------------+
```


A CREATE USER, ALTER USER, or SET PASSWORD statement that generates a random password for an account is written to the binary log as a CREATE USER or ALTER USER statement with an IDENTIFIED WITH auth_plugin AS 'auth_string', clause, where auth_plugin is the account authentication plugin and 'auth_string' is the account hashed password value.

If the validate_password component is installed, the policy that it implements has no effect on generated passwords. (The purpose of password validation is to help humans create better passwords.)

\section*{Failed-Login Tracking and Temporary Account Locking}

Administrators can configure user accounts such that too many consecutive login failures cause temporary account locking.
"Login failure" in this context means failure of the client to provide a correct password during a connection attempt. It does not include failure to connect for reasons such as unknown user or network issues. For accounts that have dual passwords (see Dual Password Support), either account password counts as correct.

The required number of login failures and the lock time are configurable per account, using the FAILED_LOGIN_ATTEMPTS and PASSWORD_LOCK_TIME options of the CREATE USER and ALTER USER statements. Examples:
```
CREATE USER 'u1'@'localhost' IDENTIFIED BY 'password'
    FAILED_LOGIN_ATTEMPTS 3 PASSWORD_LOCK_TIME 3;
ALTER USER 'u2'@'localhost'
    FAILED_LOGIN_ATTEMPTS 4 PASSWORD_LOCK_TIME UNBOUNDED;
```


When too many consecutive login failures occur, the client receives an error that looks like this:
```
ERROR 3957 (HY000): Access denied for user user.
Account is blocked for D day(s) (R day(s) remaining)
due to N consecutive failed logins.
```


Use the options as follows:
- FAILED_LOGIN_ATTEMPTS $N$

This option indicates whether to track account login attempts that specify an incorrect password. The number $N$ specifies how many consecutive incorrect passwords cause temporary account locking.
- PASSWORD_LOCK_TIME \{N | UNBOUNDED\}

This option indicates how long to lock the account after too many consecutive login attempts provide an incorrect password. The value is a number $N$ to specify the number of days the account remains locked, or UNBOUNDED to specify that when an account enters the temporarily locked state, the duration of that state is unbounded and does not end until the account is unlocked. The conditions under which unlocking occurs are described later.

Permitted values of $N$ for each option are in the range from 0 to 32767. A value of 0 disables the option.
Failed-login tracking and temporary account locking have these characteristics:
- For failed-login tracking and temporary locking to occur for an account, its FAILED_LOGIN_ATTEMPTS and PASSWORD_LOCK_TIME options both must be nonzero.
- For CREATE USER, if FAILED_LOGIN_ATTEMPTS or PASSWORD_LOCK_TIME is not specified, its implicit default value is 0 for all accounts named by the statement. This means that failed-login tracking and temporary account locking are disabled.
- For ALTER USER, if FAILED_LOGIN_ATTEMPTS or PASSWORD_LOCK_TIME is not specified, its value remains unchanged for all accounts named by the statement.
- For temporary account locking to occur, password failures must be consecutive. Any successful login that occurs prior to reaching the FAILED_LOGIN_ATTEMPTS value for failed logins causes failure counting to reset. For example, if FAILED_LOGIN_ATTEMPTS is 4 and three consecutive password failures have occurred, one more failure is necessary for locking to begin. But if the next login succeeds, failed-login counting for the account is reset so that four consecutive failures are again required for locking.
- Once temporary locking begins, successful login cannot occur even with the correct password until either the lock duration has passed or the account is unlocked by one of the account-reset methods listed in the following discussion.

When the server reads the grant tables, it initializes state information for each account regarding whether failed-login tracking is enabled, whether the account is currently temporarily locked and when locking began if so, and the number of failures before temporary locking occurs if the account is not locked.

An account's state information can be reset, which means that failed-login counting is reset, and the account is unlocked if currently temporarily locked. Account resets can be global for all accounts or per account:
- A global reset of all accounts occurs for any of these conditions:
- A server restart.
- Execution of FLUSH PRIVILEGES. (Starting the server with --skip-grant-tables causes the grant tables not to be read, which disables failed-login tracking. In this case, the first execution of FLUSH PRIVILEGES causes the server to read the grant tables and enable failed-login tracking, in addition to resetting all accounts.)
- A per-account reset occurs for any of these conditions:
- Successful login for the account.
- The lock duration passes. In this case, failed-login counting resets at the time of the next login attempt.
- Execution of an ALTER USER statement for the account that sets either FAILED_LOGIN_ATTEMPTS or PASSWORD_LOCK_TIME (or both) to any value (including the current option value), or execution of an ALTER USER . . . UNLOCK statement for the account.

Other ALTER USER statements for the account have no effect on its current failed-login count or its locking state.

Failed-login tracking is tied to the login account that is used to check credentials. If user proxying is in use, tracking occurs for the proxy user, not the proxied user. That is, tracking is tied to the account indicated by USER( ), not the account indicated by CURRENT_USER( ). For information about the distinction between proxy and proxied users, see Section 8.2.19, "Proxy Users".

\subsection*{8.2.16 Server Handling of Expired Passwords}

MySQL provides password-expiration capability, which enables database administrators to require that users reset their password. Passwords can be expired manually, and on the basis of a policy for automatic expiration (see Section 8.2.15, "Password Management").

The ALTER USER statement enables account password expiration. For example:
ALTER USER 'myuser'@'localhost' PASSWORD EXPIRE;
For each connection that uses an account with an expired password, the server either disconnects the client or restricts the client to "sandbox mode," in which the server permits the client to perform only those operations necessary to reset the expired password. Which action is taken by the server depends on both client and server settings, as discussed later.

If the server disconnects the client, it returns an ER_MUST_CHANGE_PASSWORD_LOGIN error:
```
$> mysql -u myuser -p
Password: ******
ERROR 1862 (HY000): Your password has expired. To log in you must
change it using a client that supports expired passwords.
```


If the server restricts the client to sandbox mode, these operations are permitted within the client session:
- The client can reset the account password with ALTER USER or SET PASSWORD. After that has been done, the server restores normal access for the session, as well as for subsequent connections that use the account.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1241.jpg?height=125&width=97&top_left_y=778&top_left_x=404)

\section*{Note}

Although it is possible to "reset" an expired password by setting it to its current value, it is preferable, as a matter of good policy, to choose a different password. DBAs can enforce non-reuse by establishing an appropriate password-reuse policy. See Password Reuse Policy.

For any operation not permitted within the session, the server returns an ER_MUST_CHANGE_PASSWORD error:
```
mysql> USE performance_schema;
ERROR 1820 (HY000): You must reset your password using ALTER USER
statement before executing this statement.
mysql> SELECT 1;
ERROR 1820 (HY000): You must reset your password using ALTER USER
statement before executing this statement.
```


That is what normally happens for interactive invocations of the mysql client because by default such invocations are put in sandbox mode. To resume normal functioning, select a new password.

For noninteractive invocations of the mysql client (for example, in batch mode), the server normally disconnects the client if the password is expired. To permit noninteractive mysql invocations to stay connected so that the password can be changed (using the statements permitted in sandbox mode), add the--connect-expired-password option to the mysql command.

As mentioned previously, whether the server disconnects an expired-password client or restricts it to sandbox mode depends on a combination of client and server settings. The following discussion describes the relevant settings and how they interact.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1241.jpg?height=110&width=99&top_left_y=1962&top_left_x=370)

\section*{Note}

This discussion applies only for accounts with expired passwords. If a client connects using a nonexpired password, the server handles the client normally.

On the client side, a given client indicates whether it can handle sandbox mode for expired passwords. For clients that use the C client library, there are two ways to do this:
- Pass the MYSQL_OPT_CAN_HANDLE_EXPIRED_PASSWORDS flag to mysql_options ( ) prior to connecting:
```
bool arg = 1;
mysql_options(mysql,
    MYSQL_OPT_CAN_HANDLE_EXPIRED_PASSWORDS,
    &arg);
```


This is the technique used within the mysql client, which enables MYSQL_OPT_CAN_HANDLE_EXPIRED_PASSWORDS if invoked interactively or with the - - connect -expired-password option.
- Pass the CLIENT_CAN_HANDLE_EXPIRED_PASSWORDS flag to mysql_real_connect ( ) at connect time:
```
MYSQL mysql;
mysql_init(&mysql);
if (!mysql_real_connect(&mysql,
        host, user, password, db,
            port, unix_socket,
        CLIENT_CAN_HANDLE_EXPIRED_PASSWORDS))
{
    ... handle error ...
}
```


Other MySQL Connectors have their own conventions for indicating readiness to handle sandbox mode. See the documentation for the Connector in which you are interested.

On the server side, if a client indicates that it can handle expired passwords, the server puts it in sandbox mode.

If a client does not indicate that it can handle expired passwords (or uses an older version of the client library that cannot so indicate), the server action depends on the value of the disconnect_on_expired_password system variable:
- If disconnect_on_expired_password is enabled (the default), the server disconnects the client with an ER_MUST_CHANGE_PASSWORD_LOGIN error.
- If disconnect_on_expired_password is disabled, the server puts the client in sandbox mode.

\subsection*{8.2.17 Pluggable Authentication}

When a client connects to the MySQL server, the server uses the user name provided by the client and the client host to select the appropriate account row from the mysql. user system table. The server then authenticates the client, determining from the account row which authentication plugin applies to the client:
- If the server cannot find the plugin, an error occurs and the connection attempt is rejected.
- Otherwise, the server invokes that plugin to authenticate the user, and the plugin returns a status to the server indicating whether the user provided the correct password and is permitted to connect.

Pluggable authentication enables these important capabilities:
- Choice of authentication methods. Pluggable authentication makes it easy for DBAs to choose and change the authentication method used for individual MySQL accounts.
- External authentication. Pluggable authentication makes it possible for clients to connect to the MySQL server with credentials appropriate for authentication methods that store credentials elsewhere than in the mysql. user system table. For example, plugins can be created to use external authentication methods such as PAM, Windows login IDs, LDAP, or Kerberos.
- Proxy users: If a user is permitted to connect, an authentication plugin can return to the server a user name different from the name of the connecting user, to indicate that the connecting user is a proxy for another user (the proxied user). While the connection lasts, the proxy user is treated, for purposes of access control, as having the privileges of the proxied user. In effect, one user impersonates another. For more information, see Section 8.2.19, "Proxy Users".

\section*{Note}

If you start the server with the --skip-grant-tables option, authentication plugins are not used even if loaded because the server performs no client authentication and permits any client to connect. Because this is insecure, if the server is started with the --skip-grant-tables option, it also disables remote connections by enabling skip_networking.
- Available Authentication Plugins
- The Default Authentication Plugin
- Authentication Plugin Usage
- Authentication Plugin Client/Server Compatibility
- Authentication Plugin Connector-Writing Considerations
- Restrictions on Pluggable Authentication

\section*{Available Authentication Plugins}

MySQL 8.4 provides these authentication plugins:
- A plugin that performs native authentication; that is, authentication based on the password hashing method in use from before the introduction of pluggable authentication in MySQL. The mysql_native_password plugin implements authentication based on this native password hashing method. See Section 8.4.1.1, "Native Pluggable Authentication".

\section*{Note}

The mysql_native_password authentication plugin is deprecated and subject to removal in a future version of MySQL.
- Plugins that perform authentication using SHA-256 password hashing. This is stronger encryption than that available with native authentication. See Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication", and Section 8.4.1.3, "SHA-256 Pluggable Authentication".
- A client-side plugin that sends the password to the server without hashing or encryption. This plugin is used in conjunction with server-side plugins that require access to the password exactly as provided by the client user. See Section 8.4.1.4, "Client-Side Cleartext Pluggable Authentication".
- A plugin that performs external authentication using PAM (Pluggable Authentication Modules), enabling MySQL Server to use PAM to authenticate MySQL users. This plugin supports proxy users as well. See Section 8.4.1.5, "PAM Pluggable Authentication".
- A plugin that performs external authentication on Windows, enabling MySQL Server to use native Windows services to authenticate client connections. Users who have logged in to Windows can connect from MySQL client programs to the server based on the information in their environment without specifying an additional password. This plugin supports proxy users as well. See Section 8.4.1.6, "Windows Pluggable Authentication".
- Plugins that perform authentication using LDAP (Lightweight Directory Access Protocol) to authenticate MySQL users by accessing directory services such as X.500. These plugins support proxy users as well. See Section 8.4.1.7, "LDAP Pluggable Authentication".
- A plugin that performs authentication using Kerberos to authenticate MySQL users that correspond to Kerberos principals. See Section 8.4.1.8, "Kerberos Pluggable Authentication".
- A plugin that prevents all client connections to any account that uses it. Use cases for this plugin include proxied accounts that should never permit direct login but are accessed only through proxy accounts and accounts that must be able to execute stored programs and views with elevated privileges without exposing those privileges to ordinary users. See Section 8.4.1.9, "No-Login Pluggable Authentication".
- A plugin that authenticates clients that connect from the local host through the Unix socket file. See Section 8.4.1.10, "Socket Peer-Credential Pluggable Authentication".
- A plugin that authenticates users to MySQL Server using WebAuthn format with a FIDO/FIDO2 device. See Section 8.4.1.11, "WebAuthn Pluggable Authentication".
- A test plugin that checks account credentials and logs success or failure to the server error log. This plugin is intended for testing and development purposes, and as an example of how to write an authentication plugin. See Section 8.4.1.12, "Test Pluggable Authentication".

\section*{Note}

For information about current restrictions on the use of pluggable authentication, including which connectors support which plugins, see Restrictions on Pluggable Authentication.

Third-party connector developers should read that section to determine the extent to which a connector can take advantage of pluggable authentication capabilities and what steps to take to become more compliant.

If you are interested in writing your own authentication plugins, see Writing Authentication Plugins.

\section*{The Default Authentication Plugin}

The CREATE USER and ALTER USER statements have syntax for specifying how an account authenticates. Some forms of this syntax do not explicitly name an authentication plugin (there is no IDENTIFIED WITH clause). For example:

CREATE USER 'jeffrey'@'localhost' IDENTIFIED BY 'password';
In such cases, the server assigns the default authentication plugin to the account. MySQL 8.4 supports multifactor authentication and up to three clauses that specify how an account authenticates. The rules that determine the default authentication plugin for authentication methods that name no plugin are factor-specific:
- Factor 1: If authentication_policy element 1 names an authentication plugin, that plugin is the default. If authentication_policy element 1 is *, caching_sha2_password is the default.

Given the rules above, the following statement creates a two-factor authentication account, with the first factor authentication method determined by authentication_policy, as shown here:
```
CREATE USER 'wei'@'localhost' IDENTIFIED BY 'password'
    AND IDENTIFIED WITH authentication_ldap_simple;
```


In the same way, this example creates a three-factor authentication account:
```
CREATE USER 'mateo'@'localhost' IDENTIFIED BY 'password'
    AND IDENTIFIED WITH authentication_ldap_simple
    AND IDENTIFIED WITH authentication_fido;
```


You can use SHOW CREATE USER to view the applied authentication methods.
- Factor 2 or 3 : If the corresponding authentication_policy element names an authentication plugin, that plugin is the default. If the authentication_policy element is * or empty, there is no default; attempting to define an account authentication method for the factor without naming a plugin is an error, as in the following examples:
```
mysql> CREATE USER 'sofia'@'localhost' IDENTIFIED WITH authentication_ldap_simple
    AND IDENTIFIED BY 'abc';
ERROR 1524 (HY000): Plugin '' is not loaded
mysql> CREATE USER 'sofia'@'localhost' IDENTIFIED WITH authentication_ldap_simple
    AND IDENTIFIED BY 'abc';
ERROR 1524 (HY000): Plugin '*' is not loaded
```


\section*{Authentication Plugin Usage}

This section provides general instructions for installing and using authentication plugins. For instructions specific to a given plugin, see the section that describes that plugin under Section 8.4.1, "Authentication Plugins".

In general, pluggable authentication uses a pair of corresponding plugins on the server and client sides, so you use a given authentication method like this:
- If necessary, install the plugin library or libraries containing the appropriate plugins. On the server host, install the library containing the server-side plugin, so that the server can use it to authenticate client connections. Similarly, on each client host, install the library containing the client-side plugin for use by client programs. Authentication plugins that are built in need not be installed.
- For each MySQL account that you create, specify the appropriate server-side plugin to use for authentication. If the account is to use the default authentication plugin, the account-creation statement need not specify the plugin explicitly. The server assigns the default authentication plugin, determined as described in The Default Authentication Plugin.
- When a client connects, the server-side plugin tells the client program which client-side plugin to use for authentication.

In the case that an account uses an authentication method that is the default for both the server and the client program, the server need not communicate to the client which client-side plugin to use, and a round trip in client/server negotiation can be avoided.

For standard MySQL clients such as mysql and mysqladmin, the --default-auth=plugin_name option can be specified on the command line as a hint about which client-side plugin the program can expect to use, although the server overrides this if the server-side plugin associated with the user account requires a different client-side plugin.

If the client program does not find the client-side plugin library file, specify a --plugindir=dir_name option to indicate the plugin library directory location.

\section*{Authentication Plugin Client/Server Compatibility}

Pluggable authentication enables flexibility in the choice of authentication methods for MySQL accounts, but in some cases client connections cannot be established due to authentication plugin incompatibility between the client and server.

The general compatibility principle for a successful client connection to a given account on a given server is that the client and server both must support the authentication method required by the account. Because authentication methods are implemented by authentication plugins, the client and server both must support the authentication plugin required by the account.

Authentication plugin incompatibilities can arise in various ways. Examples:
- Connect using a MySQL 5.7 client from 5.7.22 or lower to a MySQL 8.4 server account that authenticates with caching_sha2_password. This fails because the 5.7 client does not recognize the plugin. (This issue is addressed in MySQL 5.7 as of 5.7.23, when caching_sha2_password client-side support was added to the MySQL client library and client programs.)
- Connect using a MySQL 5.7 client to a pre-5.7 server account that authenticates with mysql_old_password. This fails for multiple reasons. First, such a connection requires - -secure-auth=0, which is no longer a supported option. Even were it supported, the 5.7 client does not recognize the plugin because it was removed in MySQL 5.7.
- Connect using a MySQL 5.7 client from a Community distribution to a MySQL 5.7 Enterprise server account that authenticates using one of the Enterprise-only LDAP authentication plugins. This fails because the Community client does not have access to the Enterprise plugin.

In general, these compatibility issues do not arise when connections are made between a client and server from the same MySQL distribution. When connections are made between a client and server from different MySQL series, issues can arise. These issues are inherent in the development process when MySQL introduces new authentication plugins or removes old ones. To minimize the potential for incompatibilities, regularly upgrade the server, clients, and connectors on a timely basis.

\section*{Authentication Plugin Connector-Writing Considerations}

Various implementations of the MySQL client/server protocol exist. The libmysqlclient C API client library is one implementation. Some MySQL connectors (typically those not written in C) provide their own implementation. However, not all protocol implementations handle plugin authentication the same way. This section describes an authentication issue that protocol implementors should take into account.

In the client/server protocol, the server tells connecting clients which authentication plugin it considers the default. If the protocol implementation used by the client tries to load the default plugin and that plugin does not exist on the client side, the load operation fails. This is an unnecessary failure if the default plugin is not the plugin actually required by the account to which the client is trying to connect.

If a client/server protocol implementation does not have its own notion of default authentication plugin and always tries to load the default plugin specified by the server, it fails with an error if that plugin is not available.

To avoid this problem, the protocol implementation used by the client should have its own default plugin and should use it as its first choice (or, alternatively, fall back to this default in case of failure to load the default plugin specified by the server). Example:
- In MySQL 5.7, libmysqlclient uses as its default choice either mysql_native_password or the plugin specified through the MYSQL_DEFAULT_AUTH option for mysql_options ( ).
- When a 5.7 client tries to connect to an 8.4 server, the server specifies caching_sha2_password as its default authentication plugin, but the client still sends credential details per either mysql_native_password or whatever is specified through MYSQL_DEFAULT_AUTH.
- The only time the client loads the plugin specified by the server is for a change-plugin request, but in that case it can be any plugin depending on the user account. In this case, the client must try to load the plugin, and if that plugin is not available, an error is not optional.

\section*{Restrictions on Pluggable Authentication}

The first part of this section describes general restrictions on the applicability of the pluggable authentication framework described at Section 8.2.17, "Pluggable Authentication". The second part describes how third-party connector developers can determine the extent to which a connector can take advantage of pluggable authentication capabilities and what steps to take to become more compliant.

The term "native authentication" used here refers to authentication against passwords stored in the mysql. user system table. This is the same authentication method provided by older MySQL servers, before pluggable authentication was implemented. "Windows native authentication" refers to authentication using the credentials of a user who has already logged in to Windows, as implemented by the Windows Native Authentication plugin ("Windows plugin" for short).
- General Pluggable Authentication Restrictions
- Pluggable Authentication and Third-Party Connectors

\section*{General Pluggable Authentication Restrictions}
- Connector/C++: Clients that use this connector can connect to the server only through accounts that use native authentication.

Exception: A connector supports pluggable authentication if it was built to link to libmysqlclient dynamically (rather than statically) and it loads the current version of libmysqlclient if that version is installed, or if the connector is recompiled from source to link against the current libmysqlclient.

For information about writing connectors to handle information from the server about the default server-side authentication plugin, see Authentication Plugin Connector-Writing Considerations.
- Connector/NET: Clients that use Connector/NET can connect to the server through accounts that use native authentication or Windows native authentication.
- Connector/PHP: Clients that use this connector can connect to the server only through accounts that use native authentication, when compiled using the MySQL native driver for PHP (mysqlnd).
- Windows native authentication: Connecting through an account that uses the Windows plugin requires Windows Domain setup. Without it, NTLM authentication is used and then only local connections are possible; that is, the client and server must run on the same computer.
- Proxy users: Proxy user support is available to the extent that clients can connect through accounts authenticated with plugins that implement proxy user capability (that is, plugins that can return a user name different from that of the connecting user). For example, the PAM and Windows plugins support proxy users. The mysql_native_password (deprecated) and sha256_password (deprecated) authentication plugins do not support proxy users by default, but can be configured to do so; see Server Support for Proxy User Mapping.
- Replication: Replicas can not only employ replication user accounts using native authentication, but can also connect through replication user accounts that use nonnative authentication if the required client-side plugin is available. If the plugin is built into libmysqlclient, it is available by default. Otherwise, the plugin must be installed on the replica side in the directory named by the replica's plugin_dir system variable.
- FEDERATED tables: A FEDERATED table can access the remote table only through accounts on the remote server that use native authentication.

\section*{Pluggable Authentication and Third-Party Connectors}

Third-party connector developers can use the following guidelines to determine readiness of a connector to take advantage of pluggable authentication capabilities and what steps to take to become more compliant:
- An existing connector to which no changes have been made uses native authentication and clients that use the connector can connect to the server only through accounts that use native authentication. However, you should test the connector against a recent version of the server to verify that such connections still work without problem.

Exception: A connector might work with pluggable authentication without any changes if it links to libmysqlclient dynamically (rather than statically) and it loads the current version of libmysqlclient if that version is installed.
- To take advantage of pluggable authentication capabilities, a connector that is libmysqlclientbased should be relinked against the current version of libmysqlclient. This enables the connector to support connections though accounts that require client-side plugins now built into libmysqlclient (such as the cleartext plugin needed for PAM authentication and the Windows plugin needed for Windows native authentication). Linking with a current libmysqlclient also enables the connector to access client-side plugins installed in the default MySQL plugin directory (typically the directory named by the default value of the local server's plugin_dir system variable).

If a connector links to libmysqlclient dynamically, it must be ensured that the newer version of libmysqlclient is installed on the client host and that the connector loads it at runtime.
- Another way for a connector to support a given authentication method is to implement it directly in the client/server protocol. Connector/NET uses this approach to provide support for Windows native authentication.
- If a connector should be able to load client-side plugins from a directory different from the default plugin directory, it must implement some means for client users to specify the directory. Possibilities for this include a command-line option or environment variable from which the connector can obtain
the directory name. Standard MySQL client programs such as mysql and mysqladmin implement a --plugin-dir option. See also C API Client Plugin Interface.
- Proxy user support by a connector depends, as described earlier in this section, on whether the authentication methods that it supports permit proxy users.

\subsection*{8.2.18 Multifactor Authentication}

Authentication involves one party establishing its identity to the satisfaction of a second party. Multifactor authentication (MFA) is the use of multiple authentication values (or "factors") during the authentication process. MFA provides greater security than one-factor/single-factor authentication (1FA/SFA), which uses only one authentication method such as a password. MFA enables additional authentication methods, such as authentication using multiple passwords, or authentication using devices like smart cards, security keys, and biometric readers.

MySQL includes support for multifactor authentication. This capability includes forms of MFA that require up to three authentication values. That is, MySQL account management supports accounts that use 2 FA or 3 FA , in addition to the existing 1FA support.

When a client attempts a connection to the MySQL server using a single-factor account, the server invokes the authentication plugin indicated by the account definition and accepts or rejects the connection depending on whether the plugin reports success or failure.

For an account that has multiple authentication factors, the process is similar. The server invokes authentication plugins in the order listed in the account definition. If a plugin reports success, the server either accepts the connection if the plugin is the last one, or proceeds to invoke the next plugin if any remain. If any plugin reports failure, the server rejects the connection.

The following sections cover multifactor authentication in MySQL in more detail.
- Elements of Multifactor Authentication Support
- Configuring the Multifactor Authentication Policy
- Getting Started with Multifactor Authentication

\section*{Elements of Multifactor Authentication Support}

Authentication factors commonly include these types of information:
- Something you know, such as a secret password or passphrase.
- Something you have, such as a security key or smart card.
- Something you are; that is, a biometric characteristic such as a fingerprint or facial scan.

The "something you know" factor type relies on information that is kept secret on both sides of the authentication process. Unfortunately, secrets may be subject to compromise: Someone might see you enter your password or fool you with a phishing attack, a password stored on the server side might be exposed by a security breach, and so forth. Security can be improved by using multiple passwords, but each may still be subject to compromise. Use of the other factor types enables improved security with less risk of compromise.

Implementation of multifactor authentication in MySQL comprises these elements:
- The authentication_policy system variable controls how many authentication factors can be used and the types of authentication permitted for each factor. That is, it places constraints on CREATE USER and ALTER USER statements with respect to multifactor authentication.
- CREATE USER and ALTER USER have syntax enabling multiple authentication methods to be specified for new accounts, and for adding, modifying, or dropping authentication methods for existing accounts. If an account uses 2FA or 3FA, the mysql. user system table stores information about the additional authentication factors in the User_attributes column.
- To enable authentication to the MySQL server using accounts that require multiple passwords, client programs have --password1, --password2, and --password3 options that permit up to three passwords to be specified. For applications that use the C API, the MYSQL_OPT_USER_PASSWORD option for the mysql_options4( ) C API function enables the same capability.
- The server-side authentication_webauthn plugin enables authentication using devices. This server-side, device-based authentication plugin is included only in MySQL Enterprise Edition distributions. It is not included in MySQL community distributions. However, the clientside authentication_webauthn_client plugin is included in all distributions, including community distributions. This enables clients from any distribution to connect to accounts that use authentication_webauthn to authenticate on a server that has that plugin loaded. See Section 8.4.1.11, "WebAuthn Pluggable Authentication".
- authentication_webauthn also enables passwordless authentication, if it is the only authentication plugin used by an account. See WebAuthn Passwordless Authentication.
- Multifactor authentication can use non-WebAuthn MySQL authentication methods, the WebAuthn authentication method, or a combination of both.
- These privileges enable users to perform certain restricted multifactor authentication-related operations:
- A user who has the AUTHENTICATION_POLICY_ADMIN privilege is not subject to the constraints imposed by the authentication_policy system variable. (A warning does occur for statements that otherwise would not be permitted.)
- The PASSWORDLESS_USER_ADMIN privilege enables creation of passwordless-authentication accounts and replication of operations on them.

\section*{Configuring the Multifactor Authentication Policy}

The authentication_policy system variable defines the multifactor authentication policy. Specifically, it defines how many authentication factors accounts may have (or are required to have) and the authentication methods that can be used for each factor.

The value of authentication_policy is a list of 1, 2, or 3 comma-separated elements. Each element in the list corresponds to an authentication factor and can be an authentication plugin name, an asterisk (*), empty, or missing. (Exception: Element 1 cannot be empty or missing.) The entire list is enclosed in single quotes. For example, the following authentication_policy value includes an asterisk, an authentication plugin name, and an empty element:
authentication_policy = '*,authentication_webauthn,'
An asterisk (*) indicates that an authentication method is required but any method is permitted. An empty element indicates that an authentication method is optional and any method is permitted. A missing element (no asterisk, empty element, or authentication plugin name) indicates that an authentication method is not permitted. When a plugin name is specified, that authentication method is required for the respective factor when creating or modifying an account.

The default authentication_policy value is '*, ' (an asterisk and two empty elements), which requires a first factor, and optionally permits second and third factors. The default authentication_policy value is thus backward compatible with existing 1FA accounts, but also permits creation or modification of accounts to use 2FA or 3FA.

A user who has the AUTHENTICATION_POLICY_ADMIN privilege is not subject to the constraints imposed by the authentication_policy setting. (A warning occurs for statements that otherwise would not be permitted.)
authentication_policy values can be defined in an option file or specified using a SET GLOBAL statement:

SET GLOBAL authentication_policy='*,*,';

There are several rules that govern how the authentication_policy value can be defined. Refer to the authentication_policy system variable description for a compete account of those rules. The following table provides several authentication_policy example values and the policy established by each.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.11 Example authentication_policy Values}
\begin{tabular}{|l|l|}
\hline authentication_policy Value & Effective Policy \\
\hline ' * ' & Permit only creating or altering accounts with one factor. \\
\hline '*,*' & Permit only creating or altering accounts with two factors. \\
\hline ' *, *, *' & Permit only creating or altering accounts with three factors. \\
\hline '*,' & Permit creating or altering accounts with one or two factors. \\
\hline '*,,' & Permit creating or altering accounts with one, two, or three factors. \\
\hline '*,*,' & Permit creating or altering accounts with two or three factors. \\
\hline '*,auth_plugin' & Permit creating or altering accounts with two factors, where the first factor can be any authentication method, and the second factor must be the named plugin. \\
\hline 'auth_plugin, *,' & Permit creating or altering accounts with two or three factors, where the first factor must be the named plugin. \\
\hline 'auth_plugin,' & Permit creating or altering accounts with one or two factors, where the first factor must be the named plugin. \\
\hline 'auth_plugin,auth_plugin,auth_plugin' & Permits creating or altering accounts with three factors, where the factors must use the named plugins. \\
\hline
\end{tabular}
\end{table}

\section*{Getting Started with Multifactor Authentication}

By default, MySQL uses a multifactor authentication policy that permits any authentication plugin for the first factor, and optionally permits second and third authentication factors. This policy is configurable; for details, see Configuring the Multifactor Authentication Policy.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1250.jpg?height=118&width=99&top_left_y=2069&top_left_x=306)

\section*{Note}

It is not permitted to use any internal credential storage plugins (caching_sha2_password or mysql_native_password) for factor 2 or 3.

Suppose that you want an account to authenticate first using the caching_sha2_password plugin, then using the authentication_ldap_sasl SASL LDAP plugin. (This assumes that LDAP authentication is already set up as described in Section 8.4.1.7, "LDAP Pluggable Authentication", and that the user has an entry in the LDAP directory corresponding to the authentication string shown in the example.) Create the account using a statement like this:
```
CREATE USER 'alice'@'localhost'
    IDENTIFIED WITH caching_sha2_password
        BY 'sha2_password'
    AND IDENTIFIED WITH authentication_ldap_sasl
        AS 'uid=u1_ldap,ou=People,dc=example,dc=com';
```


To connect, the user must supply two passwords. To enable authentication to the MySQL server using accounts that require multiple passwords, client programs have --password1, --password2, and --password3 options that permit up to three passwords to be specified. These options are similar to the --password option in that they can take a password value following the option on the command line (which is insecure) or if given without a password value cause the user to be prompted for one. For the account just created, factors 1 and 2 take passwords, so invoke the mysql client with the - password1 and --password2 options. mysql prompts for each password in turn:
```
$> mysql --user=alice --password1 --password2
Enter password: (enter factor 1 password)
Enter password: (enter factor 2 password)
```


Suppose you want to add a third authentication factor. This can be achieved by dropping and recreating the user with a third factor or by using ALTER USER user ADD factor syntax. Both methods are shown below:
```
DROP USER 'alice'@'localhost';
CREATE USER 'alice'@'localhost'
    IDENTIFIED WITH caching_sha2_password
        BY 'sha2_password'
    AND IDENTIFIED WITH authentication_ldap_sasl
        AS 'uid=u1_ldap,ou=People,dc=example,dc=com'
    AND IDENTIFIED WITH authentication_webauthn;
```


ADD factor syntax includes the factor number and FACTOR keyword:
ALTER USER 'alice'@'localhost' ADD 3 FACTOR IDENTIFIED WITH authentication_webauthn;
ALTER USER user DROP factor syntax permits dropping a factor. The following example drops the third factor (authentication_webauthn) that was added in the previous example:

ALTER USER 'alice'@'localhost' DROP 3 FACTOR;
ALTER USER user MODIFY factor syntax permits changing the plugin or authentication string for a particular factor, provided that the factor exists. The following example modifies the second factor, changing the authentication method from authentication_ldap_sasl to authetication_webauthn:

ALTER USER 'alice'@'localhost' MODIFY 2 FACTOR IDENTIFIED WITH authentication_webauthn;
Use SHOW CREATE USER to view the authentication methods defined for an account:
```
SHOW CREATE USER 'u1'@'localhost'\G
************************** 1. row *****************************
CREATE USER for u1@localhost: CREATE USER ˋu1ˋ@ˋlocalhostˋ
IDENTIFIED WITH 'caching_sha2_password' AS 'sha2_password'
AND IDENTIFIED WITH 'authentication_authn' REQUIRE NONE
PASSWORD EXPIRE DEFAULT ACCOUNT UNLOCK PASSWORD HISTORY
DEFAULT PASSWORD REUSE INTERVAL DEFAULT PASSWORD REQUIRE
CURRENT DEFAULT
```


\subsection*{8.2.19 Proxy Users}

The MySQL server authenticates client connections using authentication plugins. The plugin that authenticates a given connection may request that the connecting (external) user be treated as a different user for privilege-checking purposes. This enables the external user to be a proxy for the second user; that is, to assume the privileges of the second user:
- The external user is a "proxy user" (a user who can impersonate or become known as another user).
- The second user is a "proxied user" (a user whose identity and privileges can be assumed by a proxy user).

This section describes how the proxy user capability works. For general information about authentication plugins, see Section 8.2.17, "Pluggable Authentication". For information about specific
plugins, see Section 8.4.1, "Authentication Plugins". For information about writing authentication plugins that support proxy users, see Implementing Proxy User Support in Authentication Plugins.
- Requirements for Proxy User Support
- Simple Proxy User Example
- Preventing Direct Login to Proxied Accounts
- Granting and Revoking the PROXY Privilege
- Default Proxy Users
- Default Proxy User and Anonymous User Conflicts
- Server Support for Proxy User Mapping
- Proxy User System Variables

\section*{Note}

One administrative benefit to be gained by proxying is that the DBA can set up a single account with a set of privileges and then enable multiple proxy users to have those privileges without having to assign the privileges individually to each of those users. As an alternative to proxy users, DBAs may find that roles provide a suitable way to map users onto specific sets of named privileges. Each user can be granted a given single role to, in effect, be granted the appropriate set of privileges. See Section 8.2.10, "Using Roles".

\section*{Requirements for Proxy User Support}

For proxying to occur for a given authentication plugin, these conditions must be satisfied:
- Proxying must be supported, either by the plugin itself, or by the MySQL server on behalf of the plugin. In the latter case, server support may need to be enabled explicitly; see Server Support for Proxy User Mapping.
- The account for the external proxy user must be set up to be authenticated by the plugin. Use the CREATE USER statement to associate an account with an authentication plugin, or ALTER USER to change its plugin.
- The account for the proxied user must exist and be granted the privileges to be assumed by the proxy user. Use the CREATE USER and GRANT statements for this.
- Normally, the proxied user is configured so that it can be used only in proxying scenarios and not for direct logins.
- The proxy user account must have the PROXY privilege for the proxied account. Use the GRANT statement for this.
- For a client connecting to the proxy account to be treated as a proxy user, the authentication plugin must return a user name different from the client user name, to indicate the user name of the proxied account that defines the privileges to be assumed by the proxy user.

Alternatively, for plugins that are provided proxy mapping by the server, the proxied user is determined from the PROXY privilege held by the proxy user.

The proxy mechanism permits mapping only the external client user name to the proxied user name. There is no provision for mapping host names:
- When a client connects to the server, the server determines the proper account based on the user name passed by the client program and the host from which the client connects.
- If that account is a proxy account, the server attempts to determine the appropriate proxied account by finding a match for a proxied account using the user name returned by the authentication plugin and the host name of the proxy account. The host name in the proxied account is ignored.

\section*{Simple Proxy User Example}

Consider the following account definitions:
```
-- create proxy account
CREATE USER 'employee_ext'@'localhost'
    IDENTIFIED WITH my_auth_plugin
    AS 'my_auth_string';
-- create proxied account and grant its privileges;
-- use mysql_no_login plugin to prevent direct login
CREATE USER 'employee'@'localhost'
    IDENTIFIED WITH mysql_no_login;
GRANT ALL
    ON employees.*
    TO 'employee'@'localhost';
-- grant to proxy account the
-- PROXY privilege for proxied account
GRANT PROXY
    ON 'employee'@'localhost'
    TO 'employee_ext'@'localhost';
```


When a client connects as employee_ext from the local host, MySQL uses the plugin named my_auth_plugin to perform authentication. Suppose that my_auth_plugin returns a user name of employee to the server, based on the content of 'my_auth_string' and perhaps by consulting some external authentication system. The name employee differs from employee_ext, so returning employee serves as a request to the server to treat the employee_ext external user, for purposes of privilege checking, as the employee local user.

In this case, employee_ext is the proxy user and employee is the proxied user.
The server verifies that proxy authentication for employee is possible for the employee_ext user by checking whether employee_ext (the proxy user) has the PROXY privilege for employee (the proxied user). If this privilege has not been granted, an error occurs. Otherwise, employee_ext assumes the privileges of employee. The server checks statements executed during the client session by employee_ext against the privileges granted to employee. In this case, employee_ext can access tables in the employees database.

The proxied account, employee, uses the mysql_no_login authentication plugin to prevent clients from using the account to log in directly. (This assumes that the plugin is installed. For instructions, see Section 8.4.1.9, "No-Login Pluggable Authentication".) For alternative methods of protecting proxied accounts against direct use, see Preventing Direct Login to Proxied Accounts.

When proxying occurs, the USER( ) and CURRENT_USER( ) functions can be used to see the difference between the connecting user (the proxy user) and the account whose privileges apply during the current session (the proxied user). For the example just described, those functions return these values:
```
mysql> SELECT USER(), CURRENT_USER();
+-------------------------+-------------------+
| USER() | CURRENT_USER() |
+-------------------------+-------------------+
| employee_ext@localhost | employee@localhost |
+-------------------------+-------------------+
```


In the CREATE USER statement that creates the proxy user account, the IDENTIFIED WITH clause that names the proxy-supporting authentication plugin is optionally followed by an AS 'auth_string' clause specifying a string that the server passes to the plugin when the user connects. If present, the string provides information that helps the plugin determine how to map the proxy (external) client user name to a proxied user name. It is up to each plugin whether it requires the AS clause. If so, the format of the authentication string depends on how the plugin intends to use it.

Consult the documentation for a given plugin for information about the authentication string values it accepts.

\section*{Preventing Direct Login to Proxied Accounts}

Proxied accounts generally are intended to be used only by means of proxy accounts. That is, clients connect using a proxy account, then are mapped onto and assume the privileges of the appropriate proxied user.

There are multiple ways to ensure that a proxied account cannot be used directly:
- Associate the account with the mysql_no_login authentication plugin. In this case, the account cannot be used for direct logins under any circumstances. This assumes that the plugin is installed. For instructions, see Section 8.4.1.9, "No-Login Pluggable Authentication".
- Include the ACCOUNT LOCK option when you create the account. See Section 15.7.1.3, "CREATE USER Statement". With this method, also include a password so that if the account is unlocked later, it cannot be accessed with no password. (If the validate_password component is enabled, creating an account without a password is not permitted, even if the account is locked. See Section 8.4.3, "The Password Validation Component".)
- Create the account with a password but do not tell anyone else the password. If you do not let anyone know the password for the account, clients cannot use it to connect directly to the MySQL server.

\section*{Granting and Revoking the PROXY Privilege}

The PROXY privilege is needed to enable an external user to connect as and have the privileges of another user. To grant this privilege, use the GRANT statement. For example:

GRANT PROXY ON 'proxied_user' TO 'proxy_user';

The statement creates a row in the mysql.proxies_priv grant table.
At connect time, proxy_user must represent a valid externally authenticated MySQL user, and proxied_user must represent a valid locally authenticated user. Otherwise, the connection attempt fails.

The corresponding REVOKE syntax is:
REVOKE PROXY ON 'proxied_user' FROM 'proxy_user';
MySQL GRANT and REVOKE syntax extensions work as usual. Examples:
```
-- grant PROXY to multiple accounts
GRANT PROXY ON 'a' TO 'b', 'c', 'd';
-- revoke PROXY from multiple accounts
REVOKE PROXY ON 'a' FROM 'b', 'c', 'd';
-- grant PROXY to an account and enable the account to grant
-- PROXY to the proxied account
GRANT PROXY ON 'a' TO 'd' WITH GRANT OPTION;
-- grant PROXY to default proxy account
GRANT PROXY ON 'a' TO ''@'';
```


The PROXY privilege can be granted in these cases:
- By a user that has GRANT PROXY ... WITH GRANT OPTION for proxied_user.
- By proxied_user for itself: The value of USER( ) must exactly match CURRENT_USER( ) and proxied_user, for both the user name and host name parts of the account name.

The initial root account created during MySQL installation has the PROXY ... WITH GRANT OPTION privilege for ' '@' ', that is, for all users and all hosts. This enables root to set up proxy users, as well as to delegate to other accounts the authority to set up proxy users. For example, root can do this:
```
CREATE USER 'admin'@'localhost'
    IDENTIFIED BY 'admin_password';
GRANT PROXY
    ON ''@''
    TO 'admin'@'localhost'
    WITH GRANT OPTION;
```


Those statements create an admin user that can manage all GRANT PROXY mappings. For example, admin can do this:
```
GRANT PROXY ON sally TO joe;
```


\section*{Default Proxy Users}

To specify that some or all users should connect using a given authentication plugin, create a "blank" MySQL account with an empty user name and host name ( ' ' @ ' ' ), associate it with that plugin, and let the plugin return the real authenticated user name (if different from the blank user). Suppose that there exists a plugin named ldap_auth that implements LDAP authentication and maps connecting users onto either a developer or manager account. To set up proxying of users onto these accounts, use the following statements:
```
-- create default proxy account
CREATE USER ''@''
    IDENTIFIED WITH ldap_auth
    AS 'O=Oracle, OU=MySQL';
-- create proxied accounts; use
-- mysql_no_login plugin to prevent direct login
CREATE USER 'developer'@'localhost'
    IDENTIFIED WITH mysql_no_login;
CREATE USER 'manager'@'localhost'
    IDENTIFIED WITH mysql_no_login;
-- grant to default proxy account the
-- PROXY privilege for proxied accounts
GRANT PROXY
    ON 'manager'@'localhost'
    TO ''@'';
GRANT PROXY
    ON 'developer'@'localhost'
    TO ''@'';
```


Now assume that a client connects as follows:
```
$> mysql --user=myuser --password ...
Enter password: myuser_password
```


The server does not find myuser defined as a MySQL user, but because there is a blank user account ( ' ' @ ' ' ) that matches the client user name and host name, the server authenticates the client against that account. The server invokes the ldap_auth authentication plugin and passes myuser and myuser_password to it as the user name and password.

If the ldap_auth plugin finds in the LDAP directory that myuser_password is not the correct password for myuser, authentication fails and the server rejects the connection.

If the password is correct and ldap_auth finds that myuser is a developer, it returns the user name developer to the MySQL server, rather than myuser. Returning a user name different from the client user name of myuser signals to the server that it should treat myuser as a proxy. The server verifies that ' '@' ' can authenticate as developer (because ' '@' ' has the PROXY privilege to do so) and accepts the connection. The session proceeds with myuser having the privileges of the developer
proxied user. (These privileges should be set up by the DBA using GRANT statements, not shown.) The USER( ) and CURRENT_USER( ) functions return these values:
```
mysql> SELECT USER(), CURRENT_USER();
+--------------------+---------------------+
| USER() | CURRENT_USER() |
+--------------------+---------------------+
| myuser@localhost | developer@localhost |
+--------------------+---------------------+
```


If the plugin instead finds in the LDAP directory that myuser is a manager, it returns manager as the user name and the session proceeds with myuser having the privileges of the manager proxied user.
```
mysql> SELECT USER(), CURRENT_USER();
+--------------------+-------------------+
| USER() | CURRENT_USER() |
+--------------------+-------------------+
| myuser@localhost | manager@localhost |
+--------------------+-------------------+
```


For simplicity, external authentication cannot be multilevel: Neither the credentials for developer nor those for manager are taken into account in the preceding example. However, they are still used if a client tries to connect and authenticate directly as the developer or manager account, which is why those proxied accounts should be protected against direct login (see Preventing Direct Login to Proxied Accounts).

\section*{Default Proxy User and Anonymous User Conflicts}

If you intend to create a default proxy user, check for other existing "match any user" accounts that take precedence over the default proxy user because they can prevent that user from working as intended.

In the preceding discussion, the default proxy user account has ' ' in the host part, which matches any host. If you set up a default proxy user, take care to also check whether nonproxy accounts exist with the same user part and ' $\%$ ' in the host part, because ' $\%$ ' also matches any host, but has precedence over ' ' by the rules that the server uses to sort account rows internally (see Section 8.2.6, "Access Control, Stage 1: Connection Verification").

Suppose that a MySQL installation includes these two accounts:
```
-- create default proxy account
CREATE USER ''@''
    IDENTIFIED WITH some_plugin
    AS 'some_auth_string';
-- create anonymous account
CREATE USER ''@'%'
    IDENTIFIED BY 'anon_user_password';
```


The first account ( ' ' @ ' ' ) is intended as the default proxy user, used to authenticate connections for users who do not otherwise match a more-specific account. The second account ( ' ' @ ' \% ') is an anonymous-user account, which might have been created, for example, to enable users without their own account to connect anonymously.

Both accounts have the same user part ( ' '), which matches any user. And each account has a host part that matches any host. Nevertheless, there is a priority in account matching for connection attempts because the matching rules sort a host of ' $\%$ ' ahead of ' '. For accounts that do not match any more-specific account, the server attempts to authenticate them against ' '@'\%' (the anonymous user) rather than ' '@' ' (the default proxy user). As a result, the default proxy account is never used.

To avoid this problem, use one of the following strategies:
- Remove the anonymous account so that it does not conflict with the default proxy user.
- Use a more-specific default proxy user that matches ahead of the anonymous user. For example, to permit only localhost proxy connections, use ' '@'localhost':
```
CREATE USER ''@'localhost'
    IDENTIFIED WITH some_plugin
    AS 'some_auth_string';
```


In addition, modify any GRANT PROXY statements to name ' '@'localhost' rather than ''@' ' as the proxy user.

Be aware that this strategy prevents anonymous-user connections from localhost.
- Use a named default account rather than an anonymous default account. For an example of this technique, consult the instructions for using the authentication_windows plugin. See Section 8.4.1.6, "Windows Pluggable Authentication".
- Create multiple proxy users, one for local connections and one for "everything else" (remote connections). This can be useful particularly when local users should have different privileges from remote users.

Create the proxy users:
```
-- create proxy user for local connections
CREATE USER ''@'localhost'
    IDENTIFIED WITH some_plugin
    AS 'some_auth_string';
-- create proxy user for remote connections
CREATE USER ''@'%'
    IDENTIFIED WITH some_plugin
    AS 'some_auth_string';
```


Create the proxied users:
```
-- create proxied user for local connections
CREATE USER 'developer'@'localhost'
    IDENTIFIED WITH mysql_no_login;
-- create proxied user for remote connections
CREATE USER 'developer'@'%'
    IDENTIFIED WITH mysql_no_login;
```


Grant to each proxy account the PROXY privilege for the corresponding proxied account:
```
GRANT PROXY
    ON 'developer'@'localhost'
    TO ''@'localhost';
GRANT PROXY
    ON 'developer'@'%'
    TO ''@'%';
```


Finally, grant appropriate privileges to the local and remote proxied users (not shown).
Assume that the some_plugin/'some_auth_string' combination causes some_plugin to map the client user name to developer. Local connections match the ' '@'localhost' proxy user, which maps to the 'developer'@'localhost' proxied user. Remote connections match the ' '@'\%' proxy user, which maps to the 'developer'@'\%' proxied user.

\section*{Server Support for Proxy User Mapping}

Some authentication plugins implement proxy user mapping for themselves (for example, the PAM and Windows authentication plugins). Other authentication plugins do not support proxy users by default. Of these, some can request that the MySQL server itself map proxy users according to granted proxy privileges: mysql_native_password (deprecated), sha256_password (deprecated). If the check_proxy_users system variable is enabled, the server performs proxy user mapping for any authentication plugins that make such a request:
- By default, check_proxy_users is disabled, so the server performs no proxy user mapping even for authentication plugins that request server support for proxy users.
- If check_proxy_users is enabled, it may also be necessary to enable a plugin-specific system variable to take advantage of server proxy user mapping support:
- For the deprecated mysql_native_password plugin, enable mysql_native_password_proxy_users.
- For the deprecated sha256_password plugin, enable sha256_password_proxy_users.

For example, to enable all the preceding capabilities, start the server with these lines in the my.cnf file:
```
[mysqld]
check_proxy_users=ON
mysql_native_password_proxy_users=ON
sha256_password_proxy_users=ON
```


Assuming that the relevant system variables have been enabled, create the proxy user as usual using CREATE USER, then grant it the PROXY privilege to a single other account to be treated as the proxied user. When the server receives a successful connection request for the proxy user, it finds that the user has the PROXY privilege and uses it to determine the proper proxied user.
```
-- create proxy account
CREATE USER 'proxy_user'@'localhost'
    IDENTIFIED WITH mysql_native_password
    BY 'password';
-- create proxied account and grant its privileges;
-- use mysql_no_login plugin to prevent direct login
CREATE USER 'proxied_user'@'localhost'
    IDENTIFIED WITH mysql_no_login;
-- grant privileges to proxied account
GRANT ...
    ON ...
    TO 'proxied_user'@'localhost';
-- grant to proxy account the
-- PROXY privilege for proxied account
GRANT PROXY
    ON 'proxied_user'@'localhost'
    TO 'proxy_user'@'localhost';
```


To use the proxy account, connect to the server using its name and password:
```
$> mysql -u proxy_user -p
Enter password: (enter proxy_user password here)
```


Authentication succeeds, the server finds that proxy_user has the PROXY privilege for proxied_user, and the session proceeds with proxy_user having the privileges of proxied_user.

Proxy user mapping performed by the server is subject to these restrictions:
- The server does not proxy to or from an anonymous user, even if the associated PROXY privilege is granted.
- When a single account has been granted proxy privileges for more than one proxied account, server proxy user mapping is nondeterministic. Therefore, granting to a single account proxy privileges for multiple proxied accounts is discouraged.

\section*{Proxy User System Variables}

Two system variables help trace the proxy login process:
- proxy_user: This value is NULL if proxying is not used. Otherwise, it indicates the proxy user account. For example, if a client authenticates through the ' '@' ' proxy account, this variable is set as follows:
```
mysql> SELECT @@proxy_user;
+---------------+
| @@proxy_user |
+-- - - - - - - - - - - - -+
| ''@'' |
+---------------+
```

- external_user: Sometimes the authentication plugin may use an external user to authenticate to the MySQL server. For example, when using Windows native authentication, a plugin that authenticates using the windows API does not need the login ID passed to it. However, it still uses a Windows user ID to authenticate. The plugin may return this external user ID (or the first 512 UTF-8 bytes of it) to the server using the external_user read-only session variable. If the plugin does not set this variable, its value is NULL.

\subsection*{8.2.20 Account Locking}

MySQL supports locking and unlocking user accounts using the ACCOUNT LOCK and ACCOUNT UNLOCK clauses for the CREATE USER and ALTER USER statements:
- When used with CREATE USER, these clauses specify the initial locking state for a new account. In the absence of either clause, the account is created in an unlocked state.

If the validate_password component is enabled, creating an account without a password is not permitted, even if the account is locked. See Section 8.4.3, "The Password Validation Component".
- When used with ALTER USER, these clauses specify the new locking state for an existing account. In the absence of either clause, the account locking state remains unchanged.

ALTER USER ... UNLOCK unlocks any account named by the statement that is temporarily locked due to too many failed logins. See Section 8.2.15, "Password Management".

Account locking state is recorded in the account_locked column of the mysql. user system table. The output from SHOW CREATE USER indicates whether an account is locked or unlocked.

If a client attempts to connect to a locked account, the attempt fails. The server increments the Locked_connects status variable that indicates the number of attempts to connect to a locked account, returns an ER_ACCOUNT_HAS_BEEN_LOCKED error, and writes a message to the error log:
```
Access denied for user 'user_name'@'host_name'.
Account is locked.
```


Locking an account does not affect being able to connect using a proxy user that assumes the identity of the locked account. It also does not affect the ability to execute stored programs or views that have a DEFINER attribute naming the locked account. That is, the ability to use a proxied account or stored programs or views is not affected by locking the account.

The account-locking capability depends on the presence of the account_locked column in the mysql. user system table. For upgrades from MySQL versions older than 5.7.6, perform the MySQL upgrade procedure to ensure that this column exists. See Chapter 3, Upgrading MySQL. For nonupgraded installations that have no account_locked column, the server treats all accounts as unlocked, and using the ACCOUNT LOCK or ACCOUNT UNLOCK clauses produces an error.

\subsection*{8.2.21 Setting Account Resource Limits}

One means of restricting client use of MySQL server resources is to set the global max_user_connections system variable to a nonzero value. This limits the number of simultaneous connections that can be made by any given account, but places no limits on what a client can do once connected. In addition, setting max_user_connections does not enable management of individual accounts. Both types of control are of interest to MySQL administrators.

To address such concerns, MySQL permits limits for individual accounts on use of these server resources:
- The number of queries an account can issue per hour
- The number of updates an account can issue per hour
- The number of times an account can connect to the server per hour
- The number of simultaneous connections to the server by an account

Any statement that a client can issue counts against the query limit. Only statements that modify databases or tables count against the update limit.

An "account" in this context corresponds to a row in the mysql. user system table. That is, a connection is assessed against the User and Host values in the user table row that applies to the connection. For example, an account 'usera'@'\%.example.com' corresponds to a row in the user table that has User and Host values of usera and \%. example. com, to permit usera to connect from any host in the example. com domain. In this case, the server applies resource limits in this row collectively to all connections by usera from any host in the example.com domain because all such connections use the same account.

To establish resource limits for an account at account-creation time, use the CREATE USER statement. To modify the limits for an existing account, use ALTER USER. Provide a WITH clause that names each resource to be limited. The default value for each limit is zero (no limit). For example, to create a new account that can access the customer database, but only in a limited fashion, issue these statements:
```
mysql> CREATE USER 'francis'@'localhost' IDENTIFIED BY 'frank'
    -> WITH MAX_QUERIES_PER_HOUR 20
    -> MAX_UPDATES_PER_HOUR 10
    -> MAX_CONNECTIONS_PER_HOUR 5
    -> MAX_USER_CONNECTIONS 2;
```


The limit types need not all be named in the WITH clause, but those named can be present in any order. The value for each per-hour limit should be an integer representing a count per hour. For MAX_USER_CONNECTIONS, the limit is an integer representing the maximum number of simultaneous connections by the account. If this limit is set to zero, the global max_user_connections system variable value determines the number of simultaneous connections. If max_user_connections is also zero, there is no limit for the account.

To modify limits for an existing account, use an ALTER USER statement. The following statement changes the query limit for francis to 100 :
```
mysql> ALTER USER 'francis'@'localhost' WITH MAX_QUERIES_PER_HOUR 100;
```


The statement modifies only the limit value specified and leaves the account otherwise unchanged.
To remove a limit, set its value to zero. For example, to remove the limit on how many times per hour francis can connect, use this statement:
```
mysql> ALTER USER 'francis'@'localhost' WITH MAX_CONNECTIONS_PER_HOUR 0;
```


As mentioned previously, the simultaneous-connection limit for an account is determined from the MAX_USER_CONNECTIONS limit and the max_user_connections system variable. Suppose that the global max_user_connections value is 10 and three accounts have individual resource limits specified as follows:
```
ALTER USER 'user1'@'localhost' WITH MAX_USER_CONNECTIONS 0;
ALTER USER 'user2'@'localhost' WITH MAX_USER_CONNECTIONS 5;
ALTER USER 'user3'@'localhost' WITH MAX_USER_CONNECTIONS 20;
```

user1 has a connection limit of 10 (the global max_user_connections value) because it has a MAX_USER_CONNECTIONS limit of zero. user 2 and user 3 have connection limits of 5 and 20, respectively, because they have nonzero MAX_USER_CONNECTIONS limits.

The server stores resource limits for an account in the user table row corresponding to the account. The max_questions, max_updates, and max_connections columns store the per-hour limits, and
the max_user_connections column stores the MAX_USER_CONNECTIONS limit. (See Section 8.2.3, "Grant Tables".)

Resource-use counting takes place when any account has a nonzero limit placed on its use of any of the resources.

As the server runs, it counts the number of times each account uses resources. If an account reaches its limit on number of connections within the last hour, the server rejects further connections for the account until that hour is up. Similarly, if the account reaches its limit on the number of queries or updates, the server rejects further queries or updates until the hour is up. In all such cases, the server issues appropriate error messages.

Resource counting occurs per account, not per client. For example, if your account has a query limit of 50, you cannot increase your limit to 100 by making two simultaneous client connections to the server. Queries issued on both connections are counted together.

The current per-hour resource-use counts can be reset globally for all accounts, or individually for a given account:
- To reset the current counts to zero for all accounts, issue a FLUSH USER_RESOURCES statement. The counts also can be reset by reloading the grant tables (for example, with a FLUSH PRIVILEGES statement or a mysqladmin reload command).
- The counts for an individual account can be reset to zero by setting any of its limits again. Specify a limit value equal to the value currently assigned to the account.

Per-hour counter resets do not affect the MAX_USER_CONNECTIONS limit.
All counts begin at zero when the server starts. Counts do not carry over through server restarts.
For the MAX_USER_CONNECTIONS limit, an edge case can occur if the account currently has open the maximum number of connections permitted to it: A disconnect followed quickly by a connect can result in an error (ER_TOO_MANY_USER_CONNECTIONS or ER_USER_LIMIT_REACHED) if the server has not fully processed the disconnect by the time the connect occurs. When the server finishes disconnect processing, another connection is once more permitted.

\subsection*{8.2.22 Troubleshooting Problems Connecting to MySQL}

If you encounter problems when you try to connect to the MySQL server, the following items describe some courses of action you can take to correct the problem.
- Make sure that the server is running. If it is not, clients cannot connect to it. For example, if an attempt to connect to the server fails with a message such as one of those following, one cause might be that the server is not running:
```
$> mysql
ERROR 2003: Can't connect to MySQL server on 'host_name' (111)
$> mysql
ERROR 2002: Can't connect to local MySQL server through socket
'/tmp/mysql.sock' (111)
```

- It might be that the server is running, but you are trying to connect using a TCP/IP port, named pipe, or Unix socket file different from the one on which the server is listening. To correct this when you invoke a client program, specify a --port option to indicate the proper port number, or a --socket option to indicate the proper named pipe or Unix socket file. To find out where the socket file is, you can use this command:
```
$> netstat -ln | grep mysql
```

- Make sure that the server has not been configured to ignore network connections or (if you are attempting to connect remotely) that it has not been configured to listen only locally on its network interfaces. If the server was started with the skip_networking system variable enabled, no TCP/ IP connections are accepted. If the server was started with the bind_address system variable set
to 127.0.0.1, it listens for TCP/IP connections only locally on the loopback interface and does not accept remote connections.
- Check to make sure that there is no firewall blocking access to MySQL. Your firewall may be configured on the basis of the application being executed, or the port number used by MySQL for communication (3306 by default). Under Linux or Unix, check your IP tables (or similar) configuration to ensure that the port has not been blocked. Under Windows, applications such as ZoneAlarm or Windows Firewall may need to be configured not to block the MySQL port.
- The grant tables must be properly set up so that the server can use them for access control. For some distribution types (such as binary distributions on Windows, or RPM and DEB distributions on Linux), the installation process initializes the MySQL data directory, including the mysql system database containing the grant tables. For distributions that do not do this, you must initialize the data directory manually. For details, see Section 2.9, "Postinstallation Setup and Testing".

To determine whether you need to initialize the grant tables, look for a mysql directory under the data directory. (The data directory normally is named data or var and is located under your MySQL installation directory.) Make sure that you have a file named user . MYD in the mysql database directory. If not, initialize the data directory. After doing so and starting the server, you should be able to connect to the server.
- After a fresh installation, if you try to log on to the server as root without using a password, you might get the following error message.
```
$> mysql -u root
ERROR 1045 (28000): Access denied for user 'root'@'localhost' (using password: NO)
```


It means a root password has already been assigned during installation and it has to be supplied. See Section 2.9.4, "Securing the Initial MySQL Account" on the different ways the password could have been assigned and, in some cases, how to find it. If you need to reset the root password, see instructions in Section B.3.3.2, "How to Reset the Root Password". After you have found or reset your password, log on again as root using the --password (or -p) option:
```
$> mysql -u root -p
Enter password:
```


However, the server is going to let you connect as root without using a password if you have initialized MySQL using mysqld --initialize-insecure (see Section 2.9.1, "Initializing the Data Directory" for details). That is a security risk, so you should set a password for the root account; see Section 2.9.4, "Securing the Initial MySQL Account" for instructions.
- If you have updated an existing MySQL installation to a newer version, did you perform the MySQL upgrade procedure? If not, do so. The structure of the grant tables changes occasionally when new capabilities are added, so after an upgrade you should always make sure that your tables have the current structure. For instructions, see Chapter 3, Upgrading MySQL.
- If a client program receives the following error message when it tries to connect, it means that the server expects passwords in a newer format than the client is capable of generating:
```
$> mysql
Client does not support authentication protocol requested
by server; consider upgrading MySQL client
```

- Remember that client programs use connection parameters specified in option files or environment variables. If a client program seems to be sending incorrect default connection parameters when you have not specified them on the command line, check any applicable option files and your environment. For example, if you get Access denied when you run a client without any options, make sure that you have not specified an old password in any of your option files!

You can suppress the use of option files by a client program by invoking it with the --no-defaults option. For example:
```
$> mysqladmin --no-defaults -u root version
```


The option files that clients use are listed in Section 6.2.2.2, "Using Option Files". Environment variables are listed in Section 6.9, "Environment Variables".
- If you get the following error, it means that you are using an incorrect root password:
```
$> mysqladmin -u root -pxxxx ver
Access denied for user 'root'@'localhost' (using password: YES)
```


If the preceding error occurs even when you have not specified a password, it means that you have an incorrect password listed in some option file. Try the --no-defaults option as described in the previous item.

For information on changing passwords, see Section 8.2.14, "Assigning Account Passwords".
If you have lost or forgotten the root password, see Section B.3.3.2, "How to Reset the Root Password".
- localhost is a synonym for your local host name, and is also the default host to which clients try to connect if you specify no host explicitly.

You can use a --host $=127.0 .0 .1$ option to name the server host explicitly. This causes a TCP/IP connection to the local mysqld server. You can also use TCP/IP by specifying a --host option that uses the actual host name of the local host. In this case, the host name must be specified in a user table row on the server host, even though you are running the client program on the same host as the server.
- The Access denied error message tells you who you are trying to log in as, the client host from which you are trying to connect, and whether you were using a password. Normally, you should have one row in the user table that exactly matches the host name and user name that were given in the error message. For example, if you get an error message that contains using password: NO, it means that you tried to log in without a password.
- If you get an Access denied error when trying to connect to the database with mysql -u user_name, you may have a problem with the user table. Check this by executing mysql - u root mysql and issuing this SQL statement:

SELECT * FROM user;
The result should include a row with the Host and User columns matching your client's host name and your MySQL user name.
- If the following error occurs when you try to connect from a host other than the one on which the MySQL server is running, it means that there is no row in the user table with a Host value that matches the client host:

Host ... is not allowed to connect to this MySQL server
You can fix this by setting up an account for the combination of client host name and user name that you are using when trying to connect.

If you do not know the IP address or host name of the machine from which you are connecting, you should put a row with ' $\%$ ' as the Host column value in the user table. After trying to connect from the client machine, use a SELECT USER( ) query to see how you really did connect. Then change the ' $\%$ ' in the user table row to the actual host name that shows up in the log. Otherwise, your system is left insecure because it permits connections from any host for the given user name.

On Linux, another reason that this error might occur is that you are using a binary MySQL version that is compiled with a different version of the glibc library than the one you are using. In this case, you should either upgrade your operating system or glibc, or download a source distribution of MySQL version and compile it yourself. A source RPM is normally trivial to compile and install, so this is not a big problem.
- If you specify a host name when trying to connect, but get an error message where the host name is not shown or is an IP address, it means that the MySQL server got an error when trying to resolve the IP address of the client host to a name:
```
$> mysqladmin -u root -pxxxx -h some_hostname ver
Access denied for user 'root'@'' (using password: YES)
```


If you try to connect as root and get the following error, it means that you do not have a row in the user table with a User column value of 'root ' and that mysqld cannot resolve the host name for your client:
```
Access denied for user ''@'unknown'
```


These errors indicate a DNS problem. To fix it, execute mysqladmin flush-hosts to reset the internal DNS host cache. See Section 7.1.12.3, "DNS Lookups and the Host Cache".

Some permanent solutions are:
- Determine what is wrong with your DNS server and fix it.
- Specify IP addresses rather than host names in the MySQL grant tables.
- Put an entry for the client machine name in /etc/hosts on Unix or \windows\hosts on Windows.
- Start mysqld with the skip_name_resolve system variable enabled.
- Start mysqld with --host-cache-size=0.
- On Unix, if you are running the server and the client on the same machine, connect to localhost. For connections to localhost, MySQL programs attempt to connect to the local server by using a Unix socket file, unless there are connection parameters specified to ensure that the client makes a TCP/IP connection. For more information, see Section 6.2.4, "Connecting to the MySQL Server Using Command Options".
- On Windows, if you are running the server and the client on the same machine and the server supports named pipe connections, connect to the host name . (period). Connections to . use a named pipe rather than TCP/IP.
- If mysql -u root works but mysql -h your_hostname -u root results in Access denied (where your_hostname is the actual host name of the local host), you may not have the correct name for your host in the user table. A common problem here is that the Host value in the user table row specifies an unqualified host name, but your system's name resolution routines return a fully qualified domain name (or vice versa). For example, if you have a row with host 'pluto ' in the user table, but your DNS tells MySQL that your host name is 'pluto.example.com ', the row does not work. Try adding a row to the user table that contains the IP address of your host as the Host column value. (Alternatively, you could add a row to the user table with a Host value that contains a wildcard (for example, 'pluto. \%'). However, use of Host values ending with \% is insecure and is not recommended!)
- If mysql -u user_name works but mysql -u user_name some_db does not, you have not granted access to the given user for the database named some_db.
- If mysql - u user_name works when executed on the server host, but mysql -h host_name u user_name does not work when executed on a remote client host, you have not enabled access to the server for the given user name from the remote host.
- If you cannot figure out why you get Access denied, remove from the user table all rows that have Host values containing wildcards (rows that contain ' $\%$ ' or '_' characters). A very common error is to insert a new row with Host='\%' and User='some_user', thinking that this enables you to specify localhost to connect from the same machine. The reason that this does not work is that the default privileges include a row with Host='localhost ' and User=' '. Because that
row has a Host value ' localhost ' that is more specific than ' $\%$ ' , it is used in preference to the new row when connecting from localhost! The correct procedure is to insert a second row with Host='localhost' and User='some_user', or to delete the row with Host='localhost' and User=' ' . After deleting the row, remember to issue a FLUSH PRIVILEGES statement to reload the grant tables. See also Section 8.2.6, "Access Control, Stage 1: Connection Verification".
- If you are able to connect to the MySQL server, but get an Access denied message whenever you issue a SELECT ... INTO OUTFILE or LOAD DATA statement, your row in the user table does not have the FILE privilege enabled.
- If you change the grant tables directly (for example, by using INSERT, UPDATE, or DELETE statements) and your changes seem to be ignored, remember that you must execute a FLUSH PRIVILEGES statement or a mysqladmin flush-privileges command to cause the server to reload the privilege tables. Otherwise, your changes have no effect until the next time the server is restarted. Remember that after you change the root password with an UPDATE statement, you do not need to specify the new password until after you flush the privileges, because the server does not know until then that you have changed the password.
- If your privileges seem to have changed in the middle of a session, it may be that a MySQL administrator has changed them. Reloading the grant tables affects new client connections, but it also affects existing connections as indicated in Section 8.2.13, "When Privilege Changes Take Effect".
- If you have access problems with a Perl, PHP, Python, or ODBC program, try to connect to the server with mysql -u user_name db_name or mysql -u user_name -ppassword db_name. If you are able to connect using the mysql client, the problem lies with your program, not with the access privileges. (There is no space between - $p$ and the password; you can also use the password=password syntax to specify the password. If you use the -p or - -password option with no password value, MySQL prompts you for the password.)
- For testing purposes, start the mysqld server with the --skip-grant-tables option. Then you can change the MySQL grant tables and use the SHOW GRANTS statement to check whether your modifications have the desired effect. When you are satisfied with your changes, execute mysqladmin flush-privileges to tell the mysqld server to reload the privileges. This enables you to begin using the new grant table contents without stopping and restarting the server.
- If everything else fails, start the mysqld server with a debugging option (for example, - debug=d, general, query). This prints host and user information about attempted connections, as well as information about each command issued. See Section 7.9.4, "The DBUG Package".
- If you have any other problems with the MySQL grant tables and ask on the MySQL Community Slack, always provide a dump of the MySQL grant tables. You can dump the tables with the mysqldump mysql command. To file a bug report, see the instructions at Section 1.6, "How to Report Bugs or Problems". In some cases, you may need to restart mysqld with --skip-granttables to run mysqldump.

\subsection*{8.2.23 SQL-Based Account Activity Auditing}

Applications can use the following guidelines to perform SQL-based auditing that ties database activity to MySQL accounts.

MySQL accounts correspond to rows in the mysql. user system table. When a client connects successfully, the server authenticates the client to a particular row in this table. The User and Host column values in this row uniquely identify the account and correspond to the 'user_name'@'host_name' format in which account names are written in SQL statements.

The account used to authenticate a client determines which privileges the client has. Normally, the CURRENT_USER( ) function can be invoked to determine which account this is for the client user. Its value is constructed from the User and Host columns of the user table row for the account.

However, there are circumstances under which the CURRENT_USER( ) value corresponds not to the client user but to a different account. This occurs in contexts when privilege checking is not based the client's account:
- Stored routines (procedures and functions) defined with the SQL SECURITY DEFINER characteristic
- Views defined with the SQL SECURITY DEFINER characteristic
- Triggers and events

In those contexts, privilege checking is done against the DEFINER account and CURRENT_USER( ) refers to that account, not to the account for the client who invoked the stored routine or view or who caused the trigger to activate. To determine the invoking user, you can call the USER ( ) function, which returns a value indicating the actual user name provided by the client and the host from which the client connected. However, this value does not necessarily correspond directly to an account in the user table, because the USER( ) value never contains wildcards, whereas account values (as returned by CURRENT_USER( )) may contain user name and host name wildcards.

For example, a blank user name matches any user, so an account of ' '@'localhost ' enables clients to connect as an anonymous user from the local host with any user name. In this case, if a client connects as user1 from the local host, USER( ) and CURRENT_USER( ) return different values:
```
mysql> SELECT USER(), CURRENT_USER();
+------------------+----------------+
| USER() | CURRENT_USER() |
+-------------------+----------------+
| user1@localhost | @localhost |
+-------------------+----------------+
```


The host name part of an account can also contain wildcards. If the host name contains a '\% ' or '_' pattern character or uses netmask notation, the account can be used for clients connecting from multiple hosts and the CURRENT_USER( ) value does not indicate which one. For example, the account 'user2'@'\%.example.com' can be used by user2 to connect from any host in the example.com domain. If user2 connects from remote.example.com, USER( ) and CURRENT_USER( ) return different values:
```
mysql> SELECT USER(), CURRENT_USER();
+----------------------------+---------------------+
| USER() | CURRENT_USER() |
+----------------------------+---------------------+
| user2@remote.example.com | user2@%.example.com |
+----------------------------+--------------------+
```


If an application must invoke USER( ) for user auditing (for example, if it does auditing from within triggers) but must also be able to associate the USER( ) value with an account in the user table, it is necessary to avoid accounts that contain wildcards in the User or Host column. Specifically, do not permit User to be empty (which creates an anonymous-user account), and do not permit pattern characters or netmask notation in Host values. All accounts must have a nonempty User value and literal Host value.

With respect to the previous examples, the ' '@'localhost' and 'user2'@'\%.example.com' accounts should be changed not to use wildcards:
```
RENAME USER ''@'localhost' TO 'user1'@'localhost';
RENAME USER 'user2'@'%.example.com' TO 'user2'@'remote.example.com';
```


If user2 must be able to connect from several hosts in the example.com domain, there should be a separate account for each host.

To extract the user name or host name part from a CURRENT_USER( ) or USER( ) value, use the SUBSTRING_INDEX( ) function:
```
mysql> SELECT SUBSTRING_INDEX(CURRENT_USER(),'@',1);
+------------------------------------------+
    SUBSTRING_INDEX(CURRENT_USER(),'@',1) |
+-----------------------------------------
```

```
| user1 |
+----------------------------------------+
mysql> SELECT SUBSTRING_INDEX(CURRENT_USER(),'@',-1);
+------------------------------------------+
| SUBSTRING_INDEX(CURRENT_USER(),'@',-1) |
+------------------------------------------+
| localhost
+------------------------------------------+
```


\subsection*{8.3 Using Encrypted Connections}

With an unencrypted connection between the MySQL client and the server, someone with access to the network could watch all your traffic and inspect the data being sent or received between client and server.

When you must move information over a network in a secure fashion, an unencrypted connection is unacceptable. To make any kind of data unreadable, use encryption. Encryption algorithms must include security elements to resist many kinds of known attacks such as changing the order of encrypted messages or replaying data twice.

MySQL supports encrypted connections between clients and the server using the TLS (Transport Layer Security) protocol. TLS is sometimes referred to as SSL (Secure Sockets Layer) but MySQL does not actually use the SSL protocol for encrypted connections because its encryption is weak (see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers").

TLS uses encryption algorithms to ensure that data received over a public network can be trusted. It has mechanisms to detect data change, loss, or replay. TLS also incorporates algorithms that provide identity verification using the X. 509 standard.
X. 509 makes it possible to identify someone on the Internet. In basic terms, there should be some entity called a "Certificate Authority" (or CA) that assigns electronic certificates to anyone who needs them. Certificates rely on asymmetric encryption algorithms that have two encryption keys (a public key and a secret key). A certificate owner can present the certificate to another party as proof of identity. A certificate consists of its owner's public key. Any data encrypted using this public key can be decrypted only using the corresponding secret key, which is held by the owner of the certificate.

Support for encrypted connections in MySQL is provided using OpenSSL. For information about the encryption protocols and ciphers that OpenSSL supports, see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".

By default, MySQL instances link to an available installed OpenSSL library at runtime for support of encrypted connections and other encryption-related operations. You may compile MySQL from source and use the WITH_SSL CMake option to specify the path to a particular installed OpenSSL version or an alternative OpenSSL system package. In that case, MySQL selects that version. For instructions to do this, see Section 2.8.6, "Configuring SSL Library Support".

You can check what version of the OpenSSL library is in use at runtime using the Tls_library_version system status variable.

If you compile MySQL with one version of OpenSSL and want to change to a different version without recompiling, you may do this by editing the dynamic library loader path (LD_LIBRARY_PATH on Unix systems or PATH on Windows systems). Remove the path to the compiled version of OpenSSL, and add the path to the replacement version, placing it before any other OpenSSL libraries on the path. At startup, when MySQL cannot find the version of OpenSSL specified with WITH_SSL on the path, it uses the first version specified on the path instead.

By default, MySQL programs attempt to connect using encryption if the server supports encrypted connections, falling back to an unencrypted connection if an encrypted connection cannot be established. For information about options that affect use of encrypted connections, see Section 8.3.1, "Configuring MySQL to Use Encrypted Connections" and Command Options for Encrypted Connections.

MySQL performs encryption on a per-connection basis, and use of encryption for a given user can be optional or mandatory. This enables you to choose an encrypted or unencrypted connection according to the requirements of individual applications. For information on how to require users to use encrypted connections, see the discussion of the REQUIRE clause of the CREATE USER statement in Section 15.7.1.3, "CREATE USER Statement". See also the description of the require_secure_transport system variable at Section 7.1.8, "Server System Variables"

Encrypted connections can be used between source and replica servers. See Section 19.3.1, "Setting Up Replication to Use Encrypted Connections".

For information about using encrypted connections from the MySQL C API, see Support for Encrypted Connections.

It is also possible to connect using encryption from within an SSH connection to the MySQL server host. For an example, see Section 8.3.4, "Connecting to MySQL Remotely from Windows with SSH".

\subsection*{8.3.1 Configuring MySQL to Use Encrypted Connections}

Several configuration parameters are available to indicate whether to use encrypted connections, and to specify the appropriate certificate and key files. This section provides general guidance about configuring the server and clients for encrypted connections:
- Server-Side Startup Configuration for Encrypted Connections
- Server-Side Runtime Configuration and Monitoring for Encrypted Connections
- Client-Side Configuration for Encrypted Connections
- Configuring Certificate Validation Enforcement
- Configuring Encrypted Connections as Mandatory

Encrypted connections also can be used in other contexts, as discussed in these additional sections:
- Between source and replica replication servers. See Section 19.3.1, "Setting Up Replication to Use Encrypted Connections".
- Among Group Replication servers. See Section 20.6.2, "Securing Group Communication Connections with Secure Socket Layer (SSL)".
- By client programs that are based on the MySQL C API. See Support for Encrypted Connections.

Instructions for creating any required certificate and key files are available in Section 8.3.3, "Creating SSL and RSA Certificates and Keys".

