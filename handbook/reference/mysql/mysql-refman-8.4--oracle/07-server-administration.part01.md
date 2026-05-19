\section*{Chapter 7 MySQL Server Administration}
Table of Contents
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

MySQL Server (mysqld) is the main program that does most of the work in a MySQL installation. This chapter provides an overview of MySQL Server and covers general server administration:
- Server configuration
- The data directory, particularly the mysql system schema
- The server log files
- Management of multiple servers on a single machine

For additional information on administrative topics, see also:
- Chapter 8, Security
- Chapter 9, Backup and Recovery
- Chapter 19, Replication

\subsection*{7.1 The MySQL Server}
mysqld is the MySQL server. The following discussion covers these MySQL server configuration topics:
- Startup options that the server supports. You can specify these options on the command line, through configuration files, or both.
- Server system variables. These variables reflect the current state and values of the startup options, some of which can be modified while the server is running.
- Server status variables. These variables contain counters and statistics about runtime operation.
- How to set the server SQL mode. This setting modifies certain aspects of SQL syntax and semantics, for example for compatibility with code from other database systems, or to control the error handling for particular situations.
- How the server manages client connections.
- Configuring and using IPv6 and network namespace support.
- Configuring and using time zone support.
- Using resource groups.
- Server-side help capabilities.
- Capabilities provided to enable client session state changes.
- The server shutdown process. There are performance and reliability considerations depending on the type of table (transactional or nontransactional) and whether you use replication.

For listings of MySQL server variables and options that have been added, deprecated, or removed in MySQL 8.4, see Section 1.5, "Server and Status Variables and Options Added, Deprecated, or Removed in MySQL 8.4 since 8.0".

\section*{Note}

Not all storage engines are supported by all MySQL server binaries and configurations. To find out how to determine which storage engines your MySQL server installation supports, see Section 15.7.7.17, "SHOW ENGINES Statement".

\subsection*{7.1.1 Configuring the Server}

The MySQL server, mysqld, has many command options and system variables that can be set at startup to configure its operation. To determine the default command option and system variable values used by the server, execute this command:
```
$> mysqld --verbose --help
```


The command produces a list of all mysqld options and configurable system variables. Its output includes the default option and variable values and looks something like this:
```
activate-all-roles-on-login FALSE
admin-address (No default value)
admin-port 33062
admin-ssl TRUE
admin-ssl-ca (No default value)
admin-ssl-capath (No default value)
admin-ssl-cert (No default value)
admin-ssl-cipher (No default value)
admin-ssl-crl (No default value)
...
transaction-prealloc-size 4096
transaction-read-only FALSE
updatable-views-with-limit YES
upgrade AUTO
validate-config FALSE
validate-user-plugins TRUE
verbose TRUE
wait-timeout 28800
windowing-use-high-precision TRUE
xa-detach-on-prepare TRUE
```


To see the current system variable values actually used by the server as it runs, connect to it and execute this statement:
```
mysql> SHOW VARIABLES;
```


To see some statistical and status indicators for a running server, execute this statement:
```
mysql> SHOW STATUS;
```


System variable and status information also is available using the mysqladmin command:
```
$> mysqladmin variables
$> mysqladmin extended-status
```


For a full description of all command options, system variables, and status variables, see these sections:
- Section 7.1.7, "Server Command Options"
- Section 7.1.8, "Server System Variables"
- Section 7.1.10, "Server Status Variables"

More detailed monitoring information is available from the Performance Schema; see Chapter 29, MySQL Performance Schema. In addition, the MySQL sys schema is a set of objects that provides
convenient access to data collected by the Performance Schema; see Chapter 30, MySQL sys Schema.

If you specify an option on the command line for mysqld or mysqld_safe, it remains in effect only for that invocation of the server. To use the option every time the server runs, put it in an option file. See Section 6.2.2.2, "Using Option Files".

Windows users may execute Section 2.3.2, "Configuration: Using MySQL Configurator" to help configure a MySQL server installation. This includes tasks such as configuring MySQL users, log files, the Windows service name, and sample databases.

\subsection*{7.1.2 Server Configuration Defaults}

The MySQL server has many operating parameters, which you can change at server startup using command-line options or configuration files (option files). It is also possible to change many parameters at runtime. For general instructions on setting parameters at startup or runtime, see Section 7.1.7, "Server Command Options", and Section 7.1.8, "Server System Variables".

On Windows, MySQL Installer interacts with the user and creates a file named my. ini in the base installation directory as the default option file.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0636.jpg?height=108&width=99&top_left_y=1096&top_left_x=306)

\section*{Note}

On Windows, the .ini or .cnf option file extension might not be displayed.

After completing the installation process, you can edit the default option file at any time to modify the parameters used by the server. For example, to use a parameter setting in the file that is commented with a \# character at the beginning of the line, remove the \#, and modify the parameter value if necessary. To disable a setting, either add a \# to the beginning of the line or remove it.

For non-Windows platforms, no default option file is created during either the server installation or the data directory initialization process. Create your option file by following the instructions given in Section 6.2.2.2, "Using Option Files". Without an option file, the server just starts with its default settings-see Section 7.1.2, "Server Configuration Defaults" on how to check those settings.

For additional information about option file format and syntax, see Section 6.2.2.2, "Using Option Files".

\subsection*{7.1.3 Server Configuration Validation}

MySQL supports a --validate-config option that enables the startup configuration to be checked for problems without running the server in normal operational mode:
```
mysqld --validate-config
```


If no errors are found, the server terminates with an exit code of 0 . If an error is found, the server displays a diagnostic message and terminates with an exit code of 1 . For example:
```
$> mysqld --validate-config --no-such-option
2018-11-05T17:50:12.738919Z 0 [ERROR] [MY-000068] [Server] unknown
option '--no-such-option'.
2018-11-05T17:50:12.738962Z 0 [ERROR] [MY-010119] [Server] Aborting
```


The server terminates as soon as any error is found. For additional checks to occur, correct the initial problem and run the server with --validate-config again.

For the preceding example, where use of --validate-config results in display of an error message, the server exit code is 1 . Warning and information messages may also be displayed, depending on the log_error_verbosity value, but do not produce immediate validation termination or an exit code of 1 . For example, this command produces multiple warnings, both of which are displayed. But no error occurs, so the exit code is 0 :
```
$> mysqld --validate-config --log_error_verbosity=2
```

```
    --read-only=s --transaction_read_only=s
2018-11-05T15:43:18.445863Z 0 [Warning] [MY-000076] [Server] option
'read_only': boolean value 's' was not recognized. Set to OFF.
2018-11-05T15:43:18.445882Z 0 [Warning] [MY-000076] [Server] option
'transaction-read-only': boolean value 's' was not recognized. Set to OFF.
```


This command produces the same warnings, but also an error, so the error message is displayed along with the warnings and the exit code is 1 :
```
$> mysqld --validate-config --log_error_verbosity=2
    --no-such-option --read-only=s --transaction_read_only=s
2018-11-05T15:43:53.152886Z 0 [Warning] [MY-000076] [Server] option
'read_only': boolean value 's' was not recognized. Set to OFF.
2018-11-05T15:43:53.152913Z 0 [Warning] [MY-000076] [Server] option
'transaction-read-only': boolean value 's' was not recognized. Set to OFF.
2018-11-05T15:43:53.164889Z 0 [ERROR] [MY-000068] [Server] unknown
option '--no-such-option'.
2018-11-05T15:43:53.165053Z 0 [ERROR] [MY-010119] [Server] Aborting
```


The scope of the--validate-config option is limited to configuration checking that the server can perform without undergoing its normal startup process. As such, the configuration check does not initialize storage engines and other plugins, components, and so forth, and does not validate options associated with those uninitialized subsystems.
--validate-config can be used any time, but is particularly useful after an upgrade, to check whether any options previously used with the older server are considered by the upgraded server to be deprecated or obsolete. For example, the tx_read_only system variable was removed in 8.0. Suppose that a MySQL 5.7 server was run using that system variable in its my.cnf file and then upgraded to MySQL 8.4. Running the upgraded server with --validate-config to check the configuration produces this result:
```
$> mysqld --validate-config
2018-11-05T10:40:02.712141Z 0 [ERROR] [MY-000067] [Server] unknown variable
'tx_read_only=ON'.
2018-11-05T10:40:02.712178Z 0 [ERROR] [MY-010119] [Server] Aborting
```

--validate-config can be used with the --defaults-file option to validate only the options in a specific file:
```
$> mysqld --defaults-file=./my.cnf-test --validate-config
2018-11-05T10:40:02.712141Z 0 [ERROR] [MY-000067] [Server] unknown variable
'tx_read_only=ON'.
2018-11-05T10:40:02.712178Z 0 [ERROR] [MY-010119] [Server] Aborting
```


Remember that --defaults-file, if specified, must be the first option on the command line. (Executing the preceding example with the option order reversed produces a message that -defaults-file itself is unknown.)

\subsection*{7.1.4 Server Option, System Variable, and Status Variable Reference}

The following table lists all command-line options, system variables, and status variables applicable within mysqld.

The table lists command-line options (Cmd-line), options valid in configuration files (Option file), server system variables (System Var), and status variables (Status var) in one unified list, with an indication of where each option or variable is valid. If a server option set on the command line or in an option file differs from the name of the corresponding system variable, the variable name is noted immediately below the corresponding option. For system and status variables, the scope of the variable (Var Scope) is Global, Session, or both. Please see the corresponding item descriptions for details on setting and using the options and variables. Where appropriate, direct links to further information about the items are provided.

For a version of this table that is specific to NDB Cluster, see Section 25.4.2.5, "NDB Cluster mysqld Option and Variable Reference".

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 7.1 Command-Line Option, System Variable, and Status Variable Summary}
\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline Aborted_clients & & & & Yes & Global & No \\
\hline Aborted_connects & & & & Yes & Global & No \\
\hline Acl_cache_items_count & & & & Yes & Global & No \\
\hline activate_all_rolesson_login & & Yes & Yes & & Global & Yes \\
\hline admin_addressYes & & Yes & Yes & & Global & No \\
\hline admin_port & Yes & Yes & Yes & & Global & No \\
\hline admin_ssl_ca & Yes & Yes & Yes & & Global & Yes \\
\hline admin_ssl_capłus & & Yes & Yes & & Global & Yes \\
\hline admin_ssl_certYes & & Yes & Yes & & Global & Yes \\
\hline admin_ssl_ciphees & & Yes & Yes & & Global & Yes \\
\hline admin_ssl_crl & Yes & Yes & Yes & & Global & Yes \\
\hline admin_ssl_crlp & \&\&s & Yes & Yes & & Global & Yes \\
\hline admin_ssl_key & Yes & Yes & Yes & & Global & Yes \\
\hline admin_tls_ciph & hessuites & Yes & Yes & & Global & Yes \\
\hline admin_tls_vers & SYOB & Yes & Yes & & Global & Yes \\
\hline allow-suspiciousudfs & Yes & Yes & & & & \\
\hline ansi & Yes & Yes & & & & \\
\hline audit-log & Yes & Yes & & & & \\
\hline audit_log_buffe & eresize & Yes & Yes & & Global & No \\
\hline audit_log_com & pression & Yes & Yes & & Global & No \\
\hline audit_log_conn & Yesion_policy & Yes & Yes & & Global & Yes \\
\hline audit_log_current_session & & & Yes & & Both & No \\
\hline Audit_log_current_size & & & & Yes & Global & No \\
\hline audit_log_data & base & Yes & Yes & & Global & No \\
\hline Audit_log_direct_writes & & & & Yes & Global & No \\
\hline audit_log_disa & Mes & Yes & Yes & & Global & Yes \\
\hline audit_log_encr & Yetion & Yes & Yes & & Global & No \\
\hline Audit_log_even & t_max_drop_ & size & & Yes & Global & No \\
\hline \multicolumn{2}{|l|}{Audit_log_events} & & & Yes & Global & No \\
\hline \multicolumn{2}{|l|}{Audit_log_events_filtered} & & & Yes & Global & No \\
\hline \multicolumn{2}{|l|}{Audit_log_events_lost} & & & Yes & Global & No \\
\hline \multicolumn{2}{|l|}{Audit_log_events_written} & & & Yes & Global & No \\
\hline audit_log_excl & UYdes_accounts & Yes & Yes & & Global & Yes \\
\hline audit_log_file & Yes & Yes & Yes & & Global & No \\
\hline audit_log_filter & id & & Yes & & Both & No \\
\hline audit_log_flush & & & Yes & & Global & Yes \\
\hline \multicolumn{2}{|c|}{audit_log_flushYesterval_seco} & nds & Yes & & Global & No \\
\hline \multicolumn{2}{|l|}{audit_log_form\&es} & Yes & Yes & & Global & No \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd－Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline audit＿log＿form & \＆esunix＿timest & \＆（104） & Yes & & Global & Yes \\
\hline audit＿log＿incl & Mesaccounts & Yes & Yes & & Global & Yes \\
\hline audit＿log＿pas & sheesd＿history & Adeasp＿days & Yes & & Global & Yes \\
\hline audit＿log＿poli & cyes & Yes & Yes & & Global & No \\
\hline audit＿log＿prun & weseconds & Yes & Yes & & Global & Yes \\
\hline audit＿log＿read & Yeaffer＿size & Yes & Yes & & Both & Yes \\
\hline audit＿log＿rota & teeon＿size & Yes & Yes & & Global & Yes \\
\hline audit＿log＿stat & eYesnt＿policy & Yes & Yes & & Global & Yes \\
\hline audit＿log＿stra & 姲夕 & Yes & Yes & & Global & No \\
\hline Audit＿log＿tota & I＿size & & & Yes & Global & No \\
\hline Audit＿log＿write & ＿waits & & & Yes & Global & No \\
\hline authentication & kesberos＿serv & Nces key＿tab & Yes & & Global & No \\
\hline authentication & Kesberos＿serv & NCes principal & Yes & & Global & Yes \\
\hline authentication & Yesp＿sasl＿aut & Yesiethod＿nan & Mees & & Global & Yes \\
\hline authentication & Yesp＿sasl＿bin & d\＆esase＿dn & Yes & & Global & Yes \\
\hline authentication & Yesp＿sasl＿bin & \＆\＆sot＿dn & Yes & & Global & Yes \\
\hline authentication & Yesp＿sasl＿bin & desot＿pwd & Yes & & Global & Yes \\
\hline authentication & Ydsp＿sasl＿ca & pesh & Yes & & Global & Yes \\
\hline authentication & Ydsp＿sasl＿con & héest＿timeout & Yes & & Global & Yes \\
\hline authentication & Ydsp＿sasl＿gro & 伹通search＿att & rYes & & Global & Yes \\
\hline authentication & Ydsp＿sasl＿gro & Hessearch＿filt & Yes & & Global & Yes \\
\hline authentication & Ydsp＿sasl＿init & Yersol＿size & Yes & & Global & Yes \\
\hline authentication & Yesp＿sasl＿log & Ystatus & Yes & & Global & Yes \\
\hline authentication & Yesps＿sasl＿ma & Xepool＿size & Yes & & Global & Yes \\
\hline authentication & Yesp＿sasl＿refe & Yess & Yes & & Global & Yes \\
\hline authentication & Ydsp＿sasl＿res & Passe＿timeou & Yes & & Global & Yes \\
\hline authentication & Ydsp＿sasl＿ser & Wees host & Yes & & Global & Yes \\
\hline authentication & Ydsp＿sasl＿ser & Nersport & Yes & & Global & Yes \\
\hline Authentication & Idap＿sasl＿sup & ported＿metho & ds & Yes & Global & No \\
\hline authentication & Ydesp＿sasl＿tls & Yes & Yes & & Global & Yes \\
\hline authentication & Ydsp＿sasl＿use & Yessearch＿attr & Yes & & Global & Yes \\
\hline authentication & Ydesp＿simple＿ & aluds＿method＿r & HARS & & Global & Yes \\
\hline authentication & Yesp＿simple＿ & błres＿base＿dn & Yes & & Global & Yes \\
\hline authentication & Yesp＿simple＿ & byres＿root＿dn & Yes & & Global & Yes \\
\hline authentication & Yesp＿simple＿ & bMeb＿root＿pwd & Yes & & Global & Yes \\
\hline authentication & Yesp＿simple＿ & ckepath & Yes & & Global & Yes \\
\hline authentication & Yesp＿simple＿ & creasect＿timeo & HYes & & Global & Yes \\
\hline authentication & Yesp＿simple & gY＠sp＿search & attes & & Global & Yes \\
\hline authentication & Yesp＿simple & gYosp＿search & fittes & & Global & Yes \\
\hline authentication & Yesp＿simple＿ & inespool＿size & Yes & & Global & Yes \\
\hline authentication & Yesp＿simple＿ & doesstatus & Yes & & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline authentication & Yesp_simple_ & Mæs_pool_size & Yes & & Global & Yes \\
\hline authentication & Yesp_simple_t & \&fesral & Yes & & Global & Yes \\
\hline authentication & Yesp_simple_t & \&G19ONSe_timeo & pies & & Global & Yes \\
\hline authentication & Yesp_simple_ & sceser_host & Yes & & Global & Yes \\
\hline authentication & Yesp_simple_ & sweser_port & Yes & & Global & Yes \\
\hline authentication & Yesp_simple_ & tl8es & Yes & & Global & Yes \\
\hline authentication & Yesp_simple_ & uses_search_a & tres & & Global & Yes \\
\hline authentication & Yeusicy & Yes & Yes & & Global & Yes \\
\hline authentication & Yesbauthn_rp & Ides & Yes & & Global & Yes \\
\hline authentication & Yesdows_log & Nees! & Yes & & Global & No \\
\hline authentication & Yeisdows_use & Yeeisicipal_nam & \&es & & Global & No \\
\hline auto_generate & Yests & Yes & Yes & & Global & No \\
\hline auto_incremen & Yescrement & Yes & Yes & & Both & Yes \\
\hline auto_incremen & Yesffset & Yes & Yes & & Both & Yes \\
\hline autocommit & Yes & Yes & Yes & & Both & Yes \\
\hline automatic_sp & presileges & Yes & Yes & & Global & Yes \\
\hline back_log & Yes & Yes & Yes & & Global & No \\
\hline basedir & Yes & Yes & Yes & & Global & No \\
\hline big_tables & Yes & Yes & Yes & & Both & Yes \\
\hline bind_address & Yes & Yes & Yes & & Global & No \\
\hline Binlog_cache_ & disk_use & & & Yes & Global & No \\
\hline binlog_cache_ & Sires & Yes & Yes & & Global & Yes \\
\hline Binlog_cache_ & use & & & Yes & Global & No \\
\hline binlogchecksum & Yes & Yes & & & & \\
\hline binlog_checks & UMes & Yes & Yes & & Global & Yes \\
\hline binlog_direct_ & nores transactio & hásupdates & Yes & & Both & Yes \\
\hline binlog-do-db & Yes & Yes & & & & \\
\hline binlog_encrypt & ibes & Yes & Yes & & Global & Yes \\
\hline binlog_error_a & adtess & Yes & Yes & & Global & Yes \\
\hline binlog_expire_ & Mess_auto_pur & glæs & Yes & & Global & Yes \\
\hline binlog_expire & Mes_seconds & Yes & Yes & & Global & Yes \\
\hline binlog_format & Yes & Yes & Yes & & Both & Yes \\
\hline binlog_group & doesmit_sync_ & dessy & Yes & & Global & Yes \\
\hline binlog_group & doesmit_sync_ & nbeslelay_coun & YYes & & Global & Yes \\
\hline binlog_gtid_si & reserecovery & Yes & Yes & & Global & No \\
\hline binlog-ignore-db & Yes & Yes & & & & \\
\hline binlog_max_fl & usasqueue_tim & \&es & Yes & & Global & Yes \\
\hline binlog_order_c & coresmits & Yes & Yes & & Global & Yes \\
\hline binlog_rotate_ & efresyption_ma & stes_key_at_s & aresp & & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd－Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline binlog＿row＿ev & \＆他s max＿size & Yes & Yes & & Global & No \\
\hline binlog＿row＿im & łogs & Yes & Yes & & Both & Yes \\
\hline binlog＿row＿m & eYæsata & Yes & Yes & & Global & Yes \\
\hline binlog＿row＿va & Mesoptions & Yes & Yes & & Both & Yes \\
\hline binlog＿rows＿q & quersy＿log＿even & tses & Yes & & Both & Yes \\
\hline Binlog＿stmt＿c & ache＿disk＿use & & & Yes & Global & No \\
\hline binlog＿stmt＿ca & ałces＿size & Yes & Yes & & Global & Yes \\
\hline Binlog＿stmt＿c & ache＿use & & & Yes & Global & No \\
\hline binlog＿transac & CHE\＄＿compressi & ibes & Yes & & Both & Yes \\
\hline binlog＿transac & H⿳丗冖⿱丆⿱⿴囗⿱一一八夊𧘇）compress & ibes level＿zstd & Yes & & Both & Yes \\
\hline binlog＿transa¢ & பஸ்க dependen & ぬeshistory＿siz & yes & & Global & Yes \\
\hline block＿encrypt｜d & dresmode & Yes & Yes & & Both & Yes \\
\hline build＿id & & & Yes & & Global & No \\
\hline bulk＿insert＿bu & ffers＿size & Yes & Yes & & Both & Yes \\
\hline Bytes＿received & & & & Yes & Both & No \\
\hline Bytes＿sent & & & & Yes & Both & No \\
\hline caching＿sha2 & Yessword＿aut & degenerate＿rs & arteys & & Global & No \\
\hline caching＿sha2 & Yessword＿dig & estsrounds & Yes & & Global & Yes \\
\hline caching＿sha2 & Yessword＿priv & ＇九es＿key＿path & Yes & & Global & No \\
\hline caching＿sha2 & bessword＿pub & Yeskey＿path & Yes & & Global & No \\
\hline Caching＿sha2 & ＿password＿rsa & ＿public＿key & & Yes & Global & No \\
\hline character＿set & client & & Yes & & Both & Yes \\
\hline character＿set & connection & & Yes & & Both & Yes \\
\hline character＿set （note 1） & database & & Yes & & Both & Yes \\
\hline character＿set & Filesystem & Yes & Yes & & Both & Yes \\
\hline character＿set & results & & Yes & & Both & Yes \\
\hline character＿set & \＄es／er & Yes & Yes & & Both & Yes \\
\hline character＿set & system & & Yes & & Global & No \\
\hline character＿set\＄ & Yeis & Yes & Yes & & Global & No \\
\hline check＿proxy＿ & Usess & Yes & Yes & & Global & Yes \\
\hline check－table－ functions & Yes & Yes & & & & \\
\hline chroot & Yes & Yes & & & & \\
\hline clone＿autotune & eyesoncurrency & Yes & Yes & & Global & Yes \\
\hline clone＿block＿d & dles & Yes & Yes & & Global & Yes \\
\hline clone＿buffer＿\＄ & sizes & Yes & Yes & & Global & Yes \\
\hline clone＿ddl＿time & ebeds & Yes & Yes & & Global & Yes \\
\hline clone＿delay＿a & fYes data＿drop & Yes & Yes & & Global & Yes \\
\hline clone＿donor＿t & ihresut＿after＿n & \＆tersork＿failure & Yes & & Global & Yes \\
\hline clone＿enable & d（Asbpression & Yes & Yes & & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline clone_max_coryesrency & Yes & Yes & & Global & Yes \\
\hline clone_max_datáęsandwidth & Yes & Yes & & Global & Yes \\
\hline clone_max_netresk_bandwio & dthes & Yes & & Global & Yes \\
\hline clone_ssl_ca Yes & Yes & Yes & & Global & Yes \\
\hline clone_ssl_cert Yes & Yes & Yes & & Global & Yes \\
\hline clone_ssl_key Yes & Yes & Yes & & Global & Yes \\
\hline clone_valid_dołés_list & Yes & Yes & & Global & Yes \\
\hline collation_connection & & Yes & & Both & Yes \\
\hline collation_database (note 1) & & Yes & & Both & Yes \\
\hline collation_serveYes & Yes & Yes & & Both & Yes \\
\hline Com_admin_commands & & & Yes & Both & No \\
\hline Com_alter_db & & & Yes & Both & No \\
\hline Com_alter_event & & & Yes & Both & No \\
\hline Com_alter_function & & & Yes & Both & No \\
\hline Com_alter_procedure & & & Yes & Both & No \\
\hline Com_alter_resource_group & & & Yes & Global & No \\
\hline Com_alter_server & & & Yes & Both & No \\
\hline Com_alter_table & & & Yes & Both & No \\
\hline Com_alter_tablespace & & & Yes & Both & No \\
\hline Com_alter_user & & & Yes & Both & No \\
\hline Com_alter_user_default_role & & & Yes & Global & No \\
\hline Com_analyze & & & Yes & Both & No \\
\hline Com_assign_to_keycache & & & Yes & Both & No \\
\hline Com_begin & & & Yes & Both & No \\
\hline Com_binlog & & & Yes & Both & No \\
\hline Com_call_procedure & & & Yes & Both & No \\
\hline Com_change_db & & & Yes & Both & No \\
\hline Com_change_repl_filter & & & Yes & Both & No \\
\hline Com_change_replication_source & & & Yes & Both & No \\
\hline Com_check & & & Yes & Both & No \\
\hline Com_checksum & & & Yes & Both & No \\
\hline Com_clone & & & Yes & Global & No \\
\hline Com_commit & & & Yes & Both & No \\
\hline Com_create_db & & & Yes & Both & No \\
\hline Com_create_event & & & Yes & Both & No \\
\hline Com_create_function & & & Yes & Both & No \\
\hline Com_create_index & & & Yes & Both & No \\
\hline Com_create_procedure & & & Yes & Both & No \\
\hline Com_create_resource_group & & & Yes & Global & No \\
\hline Com_create_role & & & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline Com_create_server & & & & Yes & Both & No \\
\hline Com_create_table & & & & Yes & Both & No \\
\hline Com_create_trigger & & & & Yes & Both & No \\
\hline Com_create_udf & & & & Yes & Both & No \\
\hline Com_create_user & & & & Yes & Both & No \\
\hline Com_create_view & & & & Yes & Both & No \\
\hline Com_dealloc_sql & & & & Yes & Both & No \\
\hline Com_delete & & & & Yes & Both & No \\
\hline Com_delete_multi & & & & Yes & Both & No \\
\hline Com_do & & & & Yes & Both & No \\
\hline Com_drop_db & & & & Yes & Both & No \\
\hline Com_drop_event & & & & Yes & Both & No \\
\hline Com_drop_function & & & & Yes & Both & No \\
\hline Com_drop_index & & & & Yes & Both & No \\
\hline Com_drop_procedure & & & & Yes & Both & No \\
\hline Com_drop_resource_group & & & & Yes & Global & No \\
\hline Com_drop_role & & & & Yes & Global & No \\
\hline Com_drop_server & & & & Yes & Both & No \\
\hline Com_drop_table & & & & Yes & Both & No \\
\hline Com_drop_trigger & & & & Yes & Both & No \\
\hline Com_drop_user & & & & Yes & Both & No \\
\hline Com_drop_view & & & & Yes & Both & No \\
\hline Com_empty_query & & & & Yes & Both & No \\
\hline Com_execute_sql & & & & Yes & Both & No \\
\hline Com_explain_other & & & & Yes & Both & No \\
\hline Com_flush & & & & Yes & Both & No \\
\hline Com_get_diagnostics & & & & Yes & Both & No \\
\hline Com_grant & & & & Yes & Both & No \\
\hline Com_grant_roles & & & & Yes & Global & No \\
\hline & Com_group_replication_start & & & Yes & Global & No \\
\hline & Com_group_replication_stop & & & Yes & Global & No \\
\hline Com_ha_close & & & & Yes & Both & No \\
\hline Com_ha_open & & & & Yes & Both & No \\
\hline Com_ha_read & & & & Yes & Both & No \\
\hline Com_help & & & & Yes & Both & No \\
\hline Com_insert & & & & Yes & Both & No \\
\hline Com_insert_select & & & & Yes & Both & No \\
\hline Com_install_component & & & & Yes & Global & No \\
\hline Com_install_plugin & & & & Yes & Both & No \\
\hline Com_kill & & & & Yes & Both & No \\
\hline Com_load & & & & Yes & Both & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline Com_lock_tables & & & Yes & Both & No \\
\hline Com_optimize & & & Yes & Both & No \\
\hline Com_preload_keys & & & Yes & Both & No \\
\hline Com_prepare_sql & & & Yes & Both & No \\
\hline Com_purge & & & Yes & Both & No \\
\hline Com_purge_before_date & & & Yes & Both & No \\
\hline Com_release_savepoint & & & Yes & Both & No \\
\hline Com_rename_table & & & Yes & Both & No \\
\hline Com_rename_user & & & Yes & Both & No \\
\hline Com_repair & & & Yes & Both & No \\
\hline Com_replace & & & Yes & Both & No \\
\hline Com_replace_select & & & Yes & Both & No \\
\hline Com_replica_start & & & Yes & Both & No \\
\hline Com_replica_stop & & & Yes & Both & No \\
\hline Com_reset & & & Yes & Both & No \\
\hline Com_resignal & & & Yes & Both & No \\
\hline Com_restart & & & Yes & Both & No \\
\hline Com_revoke & & & Yes & Both & No \\
\hline Com_revoke_all & & & Yes & Both & No \\
\hline Com_revoke_roles & & & Yes & Global & No \\
\hline Com_rollback & & & Yes & Both & No \\
\hline Com_rollback_to_savepoint & & & Yes & Both & No \\
\hline Com_savepoint & & & Yes & Both & No \\
\hline Com_select & & & Yes & Both & No \\
\hline Com_set_option & & & Yes & Both & No \\
\hline Com_set_resource_group & & & Yes & Global & No \\
\hline Com_set_role & & & Yes & Global & No \\
\hline Com_show_authors & & & Yes & Both & No \\
\hline Com_show_binary_log_status & & & Yes & Both & No \\
\hline Com_show_binlog_events & & & Yes & Both & No \\
\hline Com_show_binlogs & & & Yes & Both & No \\
\hline Com_show_charsets & & & Yes & Both & No \\
\hline Com_show_collations & & & Yes & Both & No \\
\hline Com_show_contributors & & & Yes & Both & No \\
\hline Com_show_create_db & & & Yes & Both & No \\
\hline Com_show_create_event & & & Yes & Both & No \\
\hline Com_show_create_func & & & Yes & Both & No \\
\hline Com_show_create_proc & & & Yes & Both & No \\
\hline Com_show_create_table & & & Yes & Both & No \\
\hline Com_show_create_trigger & & & Yes & Both & No \\
\hline Com_show_create_user & & & Yes & Both & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline Com_show_databases & & & & Yes & Both & No \\
\hline Com_show_engine_logs & & & & Yes & Both & No \\
\hline Com_show_engine_mutex & & & & Yes & Both & No \\
\hline Com_show_engine_status & & & & Yes & Both & No \\
\hline Com_show_etrors & & & & Yes & Both & No \\
\hline Com_show_events & & & & Yes & Both & No \\
\hline Com_show_fields & & & & Yes & Both & No \\
\hline Com_show_function_code & & & & Yes & Both & No \\
\hline Com_show_function_status & & & & Yes & Both & No \\
\hline Com_show_grants & & & & Yes & Both & No \\
\hline Com_show_keys & & & & Yes & Both & No \\
\hline Com_show_ndb_status & & & & Yes & Both & No \\
\hline Com_show_open_tables & & & & Yes & Both & No \\
\hline Com_show_plugins & & & & Yes & Both & No \\
\hline Com_show_privileges & & & & Yes & Both & No \\
\hline & Com_show_procedure_code & & & Yes & Both & No \\
\hline & Com_show_procedure_status & & & Yes & Both & No \\
\hline Com_show_processlist & & & & Yes & Both & No \\
\hline Com_show_profile & & & & Yes & Both & No \\
\hline Com_show_profiles & & & & Yes & Both & No \\
\hline & Com_show_relaylog_events & & & Yes & Both & No \\
\hline Com_show_replica_status & & & & Yes & Both & No \\
\hline Com_show_replicas & & & & Yes & Both & No \\
\hline Com_show_status & & & & Yes & Both & No \\
\hline & Com_show_storage_engines & & & Yes & Both & No \\
\hline Com_show_table_status & & & & Yes & Both & No \\
\hline Com_show_tables & & & & Yes & Both & No \\
\hline Com_show_triggers & & & & Yes & Both & No \\
\hline Com_show_variables & & & & Yes & Both & No \\
\hline Com_show_warnings & & & & Yes & Both & No \\
\hline Com_shutdown & & & & Yes & Both & No \\
\hline Com_signal & & & & Yes & Both & No \\
\hline Com_stmt_close & & & & Yes & Both & No \\
\hline Com_stmt_execute & & & & Yes & Both & No \\
\hline Com_stmt_fetch & & & & Yes & Both & No \\
\hline Com_stmt_prepare & & & & Yes & Both & No \\
\hline Com_stmt_reprepare & & & & Yes & Both & No \\
\hline Com_stmt_reset & & & & Yes & Both & No \\
\hline Com_stmt_send_long_data & & & & Yes & Both & No \\
\hline Com_truncate & & & & Yes & Both & No \\
\hline Com_uninstall_component & & & & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline Com_uninstall_plugin & & & Yes & Both & No \\
\hline Com_unlock_tables & & & Yes & Both & No \\
\hline Com_update & & & Yes & Both & No \\
\hline Com_update_multi & & & Yes & Both & No \\
\hline Com_xa_commit & & & Yes & Both & No \\
\hline Com_xa_end & & & Yes & Both & No \\
\hline Com_xa_prepare & & & Yes & Both & No \\
\hline Com_xa_recover & & & Yes & Both & No \\
\hline Com_xa_rollback & & & Yes & Both & No \\
\hline Com_xa_start & & & Yes & Both & No \\
\hline completion_typłes & Yes & Yes & & Both & Yes \\
\hline component_małksing.dictiona & Yees_flush_inte & Val_seconds & & Global & No \\
\hline component_małksing.masking & gYelatabase & Yes & & Global & No \\
\hline component_scheesuler.enable & Mes & Yes & & Global & Yes \\
\hline Compression & & & Yes & Session & No \\
\hline Compression_algorithm & & & Yes & Global & No \\
\hline Compression_level & & & Yes & Global & No \\
\hline concurrent_inseres & Yes & Yes & & Global & Yes \\
\hline connect_timeoortes & Yes & Yes & & Global & Yes \\
\hline Connection_control_delay_g & enerated & & Yes & Global & No \\
\hline connection_cortesl_failed_co & Mresctions_thre & Stesdd & & Global & Yes \\
\hline connection_cortesl_max_con & irestion_delay & Yes & & Global & Yes \\
\hline connection_cortesl_min_con & neesion_delay & Yes & & Global & Yes \\
\hline Connection_errors_accept & & & Yes & Global & No \\
\hline Connection_errors_internal & & & Yes & Global & No \\
\hline Connection_errors_max_con & nections & & Yes & Global & No \\
\hline Connection_errors_peer_add & ress & & Yes & Global & No \\
\hline Connection_errors_select & & & Yes & Global & No \\
\hline Connection_errors_tcpwrap & & & Yes & Global & No \\
\hline connection_meræகry_chunk_ & SYZES & Yes & & Both & Yes \\
\hline connection_meYesry_limit & Yes & Yes & & Both & Yes \\
\hline Connections & & & Yes & Global & No \\
\hline console & Yes & & & & \\
\hline core-file & Yes & & & & \\
\hline core_file & & Yes & & Global & No \\
\hline create_admin_YHener_thread & Mes & Yes & & Global & No \\
\hline Created_tmp_disk_tables & & & Yes & Both & No \\
\hline Created_tmp_files & & & Yes & Global & No \\
\hline Created_tmp_tables & & & Yes & Both & No \\
\hline cte_max_recursiest_depth & Yes & Yes & & Both & Yes \\
\hline Current_tls_ca & & & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline Current_tls_ca & path & & & Yes & Global & No \\
\hline Current_tls_cert & & & & Yes & Global & No \\
\hline Current_tls_cipher & & & & Yes & Global & No \\
\hline Current_tls_ciphersuites & & & & Yes & Global & No \\
\hline Current_tls_crl & & & & Yes & Global & No \\
\hline Current_tls_crlpath & & & & Yes & Global & No \\
\hline Current_tls_key & & & & Yes & Global & No \\
\hline Current_tls_version & & & & Yes & Global & No \\
\hline daemonize & Yes & Yes & & & & \\
\hline datadir & Yes & Yes & Yes & & Global & No \\
\hline ddl-rewriter & Yes & Yes & & & & \\
\hline debug & Yes & Yes & Yes & & Both & Yes \\
\hline debug_sync & & & Yes & & Session & Yes \\
\hline debug-synctimeout & Yes & Yes & & & & \\
\hline & default_collation_for_utf8mb4 & & Yes & & Both & Yes \\
\hline default_passw & dres lifetime & Yes & Yes & & Global & Yes \\
\hline default_storag & A_esngine & Yes & Yes & & Both & Yes \\
\hline default_table_ & eresyption & Yes & Yes & & Both & Yes \\
\hline default-timezone & Yes & Yes & & & & \\
\hline default_tmp_s & tresse_engine & Yes & Yes & & Both & Yes \\
\hline default_week & foestat & Yes & Yes & & Both & Yes \\
\hline defaults-extra-file & Yes & & & & & \\
\hline defaults-file & Yes & & & & & \\
\hline defaults-group-suffix & Yes & & & & & \\
\hline delay_key_wri & tees & Yes & Yes & & Global & Yes \\
\hline Delayed_errors & & & & Yes & Global & No \\
\hline delayed_insert & Yessit & Yes & Yes & & Global & Yes \\
\hline Delayed_inser & t_threads & & & Yes & Global & No \\
\hline delayed_inser & Ytursieout & Yes & Yes & & Global & Yes \\
\hline delayed_queu & er esże & Yes & Yes & & Global & Yes \\
\hline Delayed_writes & & & & Yes & Global & No \\
\hline Deprecated_u & se_i_s_process & list_count & & Yes & Global & No \\
\hline Deprecated_u & use_i_s_process & list_last_times & tamp & Yes & Global & No \\
\hline disabled_stora & yesengines & Yes & Yes & & Global & No \\
\hline disconnect_or & Yespired_pass & Wesd & Yes & & Global & No \\
\hline div_precision & infesement & Yes & Yes & & Both & Yes \\
\hline dragnet.log_e & Nesfilter_rules & Yes & Yes & & Global & Yes \\
\hline dragnet.Statu\$ & & & & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline early-pluginload & Yes & Yes & & & & \\
\hline end_markers & imejson & Yes & Yes & & Both & Yes \\
\hline enforce_gtid_c & coresistency & Yes & Yes & & Global & Yes \\
\hline & enterprise_enchyestion.maxim & uhesrsa_key_s & iłes & & Global & Yes \\
\hline enterprise_enc & Mestion.rsa_su & Mrest_legacy_ & padsing & & Global & Yes \\
\hline eq_range_inde & Xedive_limit & Yes & Yes & & Both & Yes \\
\hline error_count & & & Yes & & Session & No \\
\hline Error_log_buff & ered_bytes & & & Yes & Global & No \\
\hline Error_log_buff & ered_events & & & Yes & Global & No \\
\hline Error_log_exp & ired_events & & & Yes & Global & No \\
\hline Error_log_late & st_write & & & Yes & Global & No \\
\hline event_schedul & eres & Yes & Yes & & Global & Yes \\
\hline exit-info & Yes & Yes & & & & \\
\hline \multicolumn{2}{|l|}{explain_formatYes} & Yes & Yes & & Both & Yes \\
\hline explain_json_f & fdresat_version & Yes & Yes & & Both & Yes \\
\hline explicit_defaul & t\$essor_timestan & nies & Yes & & Both & Yes \\
\hline externallocking & Yes & Yes & & & & \\
\hline - Variable: skip_external & locking & & & & & \\
\hline external_user & & & Yes & & Session & No \\
\hline federated & Yes & Yes & & & & \\
\hline Firewall_access & s_denied & & & Yes & Global & No \\
\hline Firewall_access & s_granted & & & Yes & Global & No \\
\hline Firewall_access_suspicious & & & & Yes & Global & No \\
\hline Firewall_cached_entries & & & & Yes & Global & No \\
\hline flush & Yes & Yes & Yes & & Global & Yes \\
\hline Flush_comman & nds & & & Yes & Global & No \\
\hline flush_time & Yes & Yes & Yes & & Global & Yes \\
\hline foreign_key_c & hecks & & Yes & & Both & Yes \\
\hline ft_boolean_sy & YYÆத & Yes & Yes & & Global & Yes \\
\hline ft_max_word_ & IHMS & Yes & Yes & & Global & No \\
\hline ft_min_word_le & eyes & Yes & Yes & & Global & No \\
\hline ft_query_expa & nseisn_limit & Yes & Yes & & Global & No \\
\hline ft_stopword_fil & l\&es & Yes & Yes & & Global & No \\
\hline gdb & Yes & Yes & & & & \\
\hline general_log & Yes & Yes & Yes & & Global & Yes \\
\hline general_log_fi & Iyes & Yes & Yes & & Global & Yes \\
\hline generated_ran & \& (巴s) _passwor & dYength & Yes & & Both & Yes \\
\hline Global_connec & ction_memory & & & Yes & Global & No \\
\hline global_connec & ரி்கத_memory & Mores & Yes & & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline global_connec & tí(四_memory_ & thæcking & Yes & & Both & Yes \\
\hline Gr_all_consen & sus_proposals & count & & Yes & Both & No \\
\hline Gr_all_consen & sus_time_sum & & & Yes & Both & No \\
\hline Gr_certification & h_garbage_collector_count & & & Yes & Both & No \\
\hline Gr_certification & _garbage_coll & ector_time_sum & & Yes & Both & No \\
\hline Gr_consensus & bytes_received_sum & & & Yes & Both & No \\
\hline Gr_consensus & bytes_sent_sum & & & Yes & Both & No \\
\hline Gr_control_me & ssages_sent_bytes_sum & & & Yes & Both & No \\
\hline Gr_control_me & ssages_sent_count & & & Yes & Both & No \\
\hline Gr_control_me & essages_sent_ & roundtrip_time & sum & Yes & Both & No \\
\hline Gr_data_mes\$ & ages_sent_byte & es_sum & & Yes & Both & No \\
\hline Gr_data_mes\$ & ages_sent_count & & & Yes & Both & No \\
\hline Gr_data_mes\$ & sages_sent_roun & ndtrip_time_su & um & Yes & Both & No \\
\hline Gr_empty_con & sensus_proposals_count & & & Yes & Both & No \\
\hline Gr_extended & consensus_coun & & & Yes & Both & No \\
\hline Gr_flow_control & l_throttle_active & e_count & & Yes & Global & No \\
\hline Gr_flow_control & l_throttle_count & & & Yes & Global & No \\
\hline Gr_flow_control & l_throttle_last & throttle_timesta & amp & Yes & Global & No \\
\hline Gr_flow_control & l_throttle_time & _sum & & Yes & Global & No \\
\hline Gr_last_consen & sus_end_time & stamp & & Yes & Both & No \\
\hline Gr_total_mess & ages_sent_coun & & & Yes & Both & No \\
\hline Gr_transaction & s_consistency & after_sync_cou & & Yes & Both & No \\
\hline Gr_transactions & s_consistency & after_sync_tim & e_sum & Yes & Both & No \\
\hline Gr_transactions & s_consistency & after_terminat & ion_count & Yes & Both & No \\
\hline Gr_transactions & s_consistency & after_terminat & tion_time_sum & Yes & Both & No \\
\hline Gr_transaction & s_consistency & before_begin & count & Yes & Both & No \\
\hline Gr_transactions & s_consistency & before_begin & time_sum & Yes & Both & No \\
\hline group_concat & Iffer _len & Yes & Yes & & Both & Yes \\
\hline group_replicat & iresadvertise & reesvery_endp & díess & & Global & Yes \\
\hline group_replicat & iresallow_local & Yesver_versio & Yesin & & Global & Yes \\
\hline group_replicat & iresauto_increr & Mest_increme & Yes & & Global & Yes \\
\hline group_replicat. & iresautorejoin & Veess & Yes & & Global & Yes \\
\hline group_replicat & iresbootstrap & głesip & Yes & & Global & Yes \\
\hline group_replicat & iresclone_thres & sheesd & Yes & & Global & Yes \\
\hline group_replicati & wescommunica & ariest_debug_op & ptiess & & Global & Yes \\
\hline group_replicati & irescommunica & ałiest_max_me & stase_size & & Global & Yes \\
\hline group_replicati & ion_communica & ation_stack & Yes & & Global & Yes \\
\hline group_replicat & irescomponent & tyestop_timeou & Mes & & Global & Yes \\
\hline group_replicati & 'vescompressio & oneshreshold & Yes & & Global & Yes \\
\hline group_replicat & iwesconsistenc) & Yes & Yes & & Both & Yes \\
\hline group_replicat. & iresenforce_up & Vase_everywh & eres checks & & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline group_replicatiøresexit_state & yetson & Yes & & Global & Yes \\
\hline group_replicatiøresflow_contr & OYespplier_thres & Sheedd & & Global & Yes \\
\hline group_replicatiøresflow_contr & OYesertifier_thre & ylesld & & Global & Yes \\
\hline group_replicatiøresflow_contro & OYdsold_percen & tYes & & Global & Yes \\
\hline group_replicatiøresflow_contro & oressax_quota & Yes & & Global & Yes \\
\hline group_replicatiøresflow_contro & or_essiember_qu & dłaspercent & & Global & Yes \\
\hline group_replicatiøresflow_controres & oressin_quota & Yes & & Global & Yes \\
\hline group_replicativesflow_contro & OYessin_recove & Yęsuota & & Global & Yes \\
\hline group_replicatiøresflow_contr & oressiode & Yes & & Global & Yes \\
\hline group_replicatiøresflow_contro & oreseriod & Yes & & Global & Yes \\
\hline group_replicatiøresflow_controres & OYęelease_per & deet & & Global & Yes \\
\hline group_replicatiøresforce_mem & bess & Yes & & Global & Yes \\
\hline group_replicativesgroup_nam & Mées & Yes & & Global & Yes \\
\hline group_replicatiøresgroup_see & U\&es & Yes & & Global & Yes \\
\hline group_replicatixesgtid_assig & TY resnt_block_s & iYes & & Global & Yes \\
\hline group_replicatioresip_allowlist & Yes & Yes & & Global & Yes \\
\hline group_replicatiøreslocal_addre & Esess & Yes & & Global & Yes \\
\hline group_replicatiøresmember_e & extrimeout & Yes & & Global & Yes \\
\hline group_replicatioresmember_w & weiesht & Yes & & Global & Yes \\
\hline group_replicatiøresmessage_ & chebe_size & Yes & & Global & Yes \\
\hline group_replicatiørespaxos_sing & Yeæseader & Yes & & Global & Yes \\
\hline group_replicatiørespoll_spin_ & d'caps & Yes & & Global & Yes \\
\hline group_replicatiørespreemptive & Yegarbage_coll & ycesion & & Global & Yes \\
\hline group_replicatiørespreemptive & Yegarbage_coll & \&cton_rows_t & reshold & Global & Yes \\
\hline group_replicatiøresrecovery_¢ & corepression_al & |cesthms & & Global & Yes \\
\hline group_replicatiøresrecovery_g & geespublic_key & Yes & & Global & Yes \\
\hline group_replicatiøresrecovery_p & priblic_key_pat & YYes & & Global & Yes \\
\hline group_replicatiøresrecovery_r & \&cesnnect_inter & Waes & & Global & Yes \\
\hline group_replicatiøresrecovery_r & retes_count & Yes & & Global & Yes \\
\hline group_replicatiøresrecovery_\$ & \$\$lesa & Yes & & Global & Yes \\
\hline group_replicatiøresrecovery_\$ & \$\$lesapath & Yes & & Global & Yes \\
\hline group_replicatiøresrecovery_\$ & \$\$lesert & Yes & & Global & Yes \\
\hline group_replicatiøresrecovery_\$ & \$8lesipher & Yes & & Global & Yes \\
\hline group_replicatiøresrecovery_\$ & \$8lesrl & Yes & & Global & Yes \\
\hline group_replicatiøresrecovery_\$ & \$\$lesrlpath & Yes & & Global & Yes \\
\hline group_replicatiøresrecovery_\$ & \$8legey & Yes & & Global & Yes \\
\hline group_replicatiøresrecovery_\$ & \$\$leserify_server & eresert & & Global & Yes \\
\hline group_replicatiøresrecovery_t| & t|\$esiphersuites & Yes & & Global & Yes \\
\hline group_replicatiøresrecovery_tl & t|\$esersion & Yes & & Global & Yes \\
\hline group_replicatiøresrecovery_u & ułesssl & Yes & & Global & Yes \\
\hline group_replicatioresrecovery_ \# & złtes_compressi & idreslevel & & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline group_replicat & iressingle_prim & ஒ ஒ p_pode $^{\text {® }}$ & Yes & & Global & Yes \\
\hline group_replicati & iresssl_mode & Yes & Yes & & Global & Yes \\
\hline group_replicat & iresstart_on_b & bodots & Yes & & Global & Yes \\
\hline group_replicat. & irestls_source & Yes & Yes & & Global & Yes \\
\hline group_replicat. & irestransaction & Yeize_limit & Yes & & Global & Yes \\
\hline group_replicat. & iresunreachabl & Kesnajority_tin & west & & Global & Yes \\
\hline group_replicat. & iresview_chan & gyesuuid & Yes & & Global & Yes \\
\hline gtid_executed & & & Yes & & Global & No \\
\hline gtid_executed & Yesnpression & persod & Yes & & Global & Yes \\
\hline gtid_mode & Yes & Yes & Yes & & Global & Yes \\
\hline gtid_next & & & Yes & & Session & Yes \\
\hline gtid_owned & & & Yes & & Both & No \\
\hline gtid_purged & & & Yes & & Global & Yes \\
\hline Handler_commit & & & & Yes & Both & No \\
\hline Handler_delete & & & & Yes & Both & No \\
\hline Handler_disco & ver & & & Yes & Both & No \\
\hline Handler_extern & nal_lock & & & Yes & Both & No \\
\hline Handler_mrr_i & init & & & Yes & Both & No \\
\hline Handler_prepæ & are & & & Yes & Both & No \\
\hline Handler_read & first & & & Yes & Both & No \\
\hline Handler_read & key & & & Yes & Both & No \\
\hline Handler_read & last & & & Yes & Both & No \\
\hline Handler_read & next & & & Yes & Both & No \\
\hline Handler_read & prev & & & Yes & Both & No \\
\hline Handler_read & rnd & & & Yes & Both & No \\
\hline Handler_read & rnd_next & & & Yes & Both & No \\
\hline Handler_rollbac & ck & & & Yes & Both & No \\
\hline Handler_savep & point & & & Yes & Both & No \\
\hline Handler_savep & point_rollback & & & Yes & Both & No \\
\hline Handler_update & & & & Yes & Both & No \\
\hline Handler_write & & & & Yes & Both & No \\
\hline have_compress & & & Yes & & Global & No \\
\hline have_dynamic & loading & & Yes & & Global & No \\
\hline have_geometry & & & Yes & & Global & No \\
\hline have_profiling & & & Yes & & Global & No \\
\hline have_query_c & ache & & Yes & & Global & No \\
\hline have_rtree_ke & ys & & Yes & & Global & No \\
\hline have_stateme & nt_timeout & & Yes & & Global & No \\
\hline have_symlink & & & Yes & & Global & No \\
\hline help & Yes & Yes & & & & \\
\hline histogram_gen & とestion_max_ & nyers _size & Yes & & Both & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd－Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline \multicolumn{2}{|l|}{host＿cache＿siłces} & Yes & Yes & & Global & Yes \\
\hline hostname & & & Yes & & Global & No \\
\hline identity & & & Yes & & Session & Yes \\
\hline \multicolumn{3}{|l|}{immediate＿server＿version} & Yes & & Session & Yes \\
\hline \multicolumn{3}{|l|}{information＿scHersia＿stats＿expers）} & Yes & & Both & Yes \\
\hline init＿connect & Yes & Yes & Yes & & Global & Yes \\
\hline init＿file & Yes & Yes & Yes & & Global & No \\
\hline init＿replica & Yes & Yes & Yes & & Global & Yes \\
\hline init＿slave & Yes & Yes & Yes & & Global & Yes \\
\hline initialize & Yes & Yes & & & & \\
\hline initialize－ insecure & Yes & Yes & & & & \\
\hline innodb＿adapti & Neeslushing & Yes & Yes & & Global & Yes \\
\hline innodb＿adapti & vé\＄lushing＿Iw & Mes & Yes & & Global & Yes \\
\hline innodb＿adapti & Né\＄lash＿index & Yes & Yes & & Global & Yes \\
\hline innodb＿adapti & Nę\＄ 1 ash ＿index & Yosrts & Yes & & Global & No \\
\hline innodb＿adapti & vésnax＿sleep & Ydesay & Yes & & Global & Yes \\
\hline innodb＿autoex & 婚世喑＿incremen & Yes & Yes & & Global & Yes \\
\hline innodb＿autoin & CY\＆BCk＿mode & Yes & Yes & & Global & No \\
\hline innodb＿backgr & roesd＿drop＿list & Yesnpty & Yes & & Global & Yes \\
\hline Innodb＿buffer & ＿pool＿bytes＿da & ata & & Yes & Global & No \\
\hline Innodb＿buffer＿ & ＿pool＿bytes＿di & rty & & Yes & Global & No \\
\hline innodb＿buffer＿ & ＿pesl＿chunk＿si & yes & Yes & & Global & No \\
\hline innodb＿buffer＿ & ＿besl＿debug & Yes & Yes & & Global & No \\
\hline innodb＿buffer＿ & ＿besl＿dump＿at & Y\＆sutdown & Yes & & Global & Yes \\
\hline innodb＿buffer＿ & ｜besl＿dump＿n & obres & Yes & & Global & Yes \\
\hline innodb＿buffer & ｜pesl＿dump＿p & cYes & Yes & & Global & Yes \\
\hline Innodb＿buffer＿ & ＿pool＿dump＿s & tatus & & Yes & Global & No \\
\hline innodb＿buffer & ＿pesl＿filename & Yes & Yes & & Global & Yes \\
\hline innodb＿buffer & ｜besl＿in＿core＿ & files & Yes & & Global & Yes \\
\hline innodb＿buffer＿ & ＿besl＿instances & SYes & Yes & & Global & No \\
\hline innodb＿buffer＿ & ＿pesl＿load＿abo & ortes & Yes & & Global & Yes \\
\hline innodb＿buffer＿ & ｜besl＿load＿at＿ & stastup & Yes & & Global & No \\
\hline innodb＿buffer＿ & ＿pesl＿load＿no & wres & Yes & & Global & Yes \\
\hline Innodb＿buffer＿ & pool＿load＿sta & tus & & Yes & Global & No \\
\hline Innodb＿buffer＿ & ＿pool＿pages＿d & data & & Yes & Global & No \\
\hline Innodb＿buffer＿ & ＿pool＿pages＿d & dirty & & Yes & Global & No \\
\hline Innodb＿buffer & ＿pool＿pages＿f & ushed & & Yes & Global & No \\
\hline Innodb＿buffer & ＿pool＿pages＿f & free & & Yes & Global & No \\
\hline Innodb＿buffer＿ & ＿pool＿pages＿l & atched & & Yes & Global & No \\
\hline Innodb＿buffer & ＿pool＿pages＿n & misc & & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline Innodb_buffer & \multicolumn{2}{|l|}{pool_pages_total} & & Yes & Global & No \\
\hline Innodb_buffer & \multicolumn{2}{|l|}{pool_read_ahead} & & Yes & Global & No \\
\hline Innodb_buffer & \multicolumn{2}{|l|}{pool_read_ahead_evicted} & & Yes & Global & No \\
\hline Innodb_buffer & \multicolumn{2}{|l|}{pool_read_ahead_rnd} & & Yes & Global & No \\
\hline Innodb_buffer & \multicolumn{2}{|l|}{pool_read_requests} & & Yes & Global & No \\
\hline Innodb_buffer & _pool_reads & & & Yes & Global & No \\
\hline Innodb_buffer & \multicolumn{2}{|l|}{pool_resize_status} & & Yes & Global & No \\
\hline Innodb_buffer & \multicolumn{2}{|l|}{pool_resize_status_code} & & Yes & Global & No \\
\hline Innodb_buffer & \multicolumn{2}{|c|}{pool_resize_status_progress} & & Yes & Global & No \\
\hline innodb_buffer & bebl_size & Yes & Yes & & Global & Yes \\
\hline Innodb_buffer & \multicolumn{2}{|l|}{pool_wait_free} & & Yes & Global & No \\
\hline Innodb_buffer & \multicolumn{2}{|l|}{pool_write_requests} & & Yes & Global & No \\
\hline innodb_chang & er_esuffer_max_ & SYRS & Yes & & Global & Yes \\
\hline innodb_change & er essffering & Yes & Yes & & Global & Yes \\
\hline innodb_change & ey esiffering_de & Mees & Yes & & Global & Yes \\
\hline innodb_checkp & prod_disabled & Yes & Yes & & Global & Yes \\
\hline innodb_checks & słús_algorithm & Yes & Yes & & Global & Yes \\
\hline innodb_cmp_p & reśndex_enab & Meeb & Yes & & Global & Yes \\
\hline innodb_comm & Yesncurrency & Yes & Yes & & Global & Yes \\
\hline innodb_compr & Ases_ debug & Yes & Yes & & Global & Yes \\
\hline innodb_compr & efsesion_failure & theeshold_pct & Yes & & Global & Yes \\
\hline innodb_compr & Assion_level & Yes & Yes & & Global & Yes \\
\hline innodb_compr & Assion_pad_pc & Yesax & Yes & & Global & Yes \\
\hline innodb_concu & Mersy_tickets & Yes & Yes & & Global & Yes \\
\hline innodb_data_f & filvespath & Yes & Yes & & Global & No \\
\hline Innodb_data_ & fsyncs & & & Yes & Global & No \\
\hline innodb_data_h & һγere_dir & Yes & Yes & & Global & No \\
\hline Innodb_data_p & pending_fsyncs & & & Yes & Global & No \\
\hline Innodb_data_p & pending_reads & & & Yes & Global & No \\
\hline Innodb_data_ & pending_writes & & & Yes & Global & No \\
\hline Innodb_data_ & read & & & Yes & Global & No \\
\hline Innodb_data_ & reads & & & Yes & Global & No \\
\hline Innodb_data_ & writes & & & Yes & Global & No \\
\hline Innodb_data_ & written & & & Yes & Global & No \\
\hline Innodb_dblwr & pages_written & & & Yes & Global & No \\
\hline Innodb_dblwr & writes & & & Yes & Global & No \\
\hline innodb_ddl_bu & ffes_size & Yes & Yes & & Session & Yes \\
\hline innodb_ddl_lo & gYesash_reset & Mebug & Yes & & Global & Yes \\
\hline innodb_ddl_th & reads & Yes & Yes & & Session & Yes \\
\hline innodb_deadlo & \&hesdetect & Yes & Yes & & Global & Yes \\
\hline innodb_dedica & Neels server & Yes & Yes & & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline innodb_defaultYresv_format & Yes & Yes & & Global & Yes \\
\hline innodb_directoMes & Yes & Yes & & Global & No \\
\hline innodb_disableYesert_file_cad & Nees & Yes & & Global & Yes \\
\hline innodb_doubleverise & Yes & Yes & & Global & Yes \\
\hline innodb_doubleveise_batch_si & jees & Yes & & Global & No \\
\hline innodb_doubleveise_dir & Yes & Yes & & Global & No \\
\hline innodb_doubleveise_files & Yes & Yes & & Global & No \\
\hline innodb_doubleveise_pages & Yes & Yes & & Global & No \\
\hline innodb_extendYesd_initialize & Yes & Yes & & Global & Yes \\
\hline innodb_fast_shyre\$own & Yes & Yes & & Global & Yes \\
\hline innodb_fil_makéesage_dirty & delsug & Yes & & Global & Yes \\
\hline innodb_file_peyr_esble & Yes & Yes & & Global & Yes \\
\hline innodb_fill_factøes & Yes & Yes & & Global & Yes \\
\hline innodb_flush_ldœsat_timeout & Yes & Yes & & Global & Yes \\
\hline innodb_flush_ldœsat_trx_com & Mets & Yes & & Global & Yes \\
\hline innodb_flush_nyetwod & Yes & Yes & & Global & No \\
\hline innodb_flush_nyeshbors & Yes & Yes & & Global & Yes \\
\hline innodb_flush_syes & Yes & Yes & & Global & Yes \\
\hline innodb_flushing'xavg_loops & Yes & Yes & & Global & Yes \\
\hline innodb_force_llas_corrupted & Yes & Yes & & Global & No \\
\hline innodb_force_reeovery & Yes & Yes & & Global & No \\
\hline innodb_fsync_thesshold & Yes & Yes & & Global & Yes \\
\hline innodb_ft_aux_table & & Yes & & Global & Yes \\
\hline innodb_ft_cachyésize & Yes & Yes & & Global & No \\
\hline innodb_ft_enabldesdiag_print & Yes & Yes & & Global & Yes \\
\hline innodb_ft_enablesstopword & Yes & Yes & & Both & Yes \\
\hline innodb_ft_maxYeren_size & Yes & Yes & & Global & No \\
\hline innodb_ft_min_Yelsen_size & Yes & Yes & & Global & No \\
\hline innodb_ft_numYrord_optimia & \&es & Yes & & Global & Yes \\
\hline innodb_ft_resultesache_limit & Yes & Yes & & Global & Yes \\
\hline innodb_ft_servyesstopword_t & tates & Yes & & Global & Yes \\
\hline innodb_ft_sort_yels_degree & Yes & Yes & & Global & No \\
\hline innodb_ft_totalYesche_size & Yes & Yes & & Global & No \\
\hline innodb_ft_userYessopword_tab & Mees & Yes & & Both & Yes \\
\hline Innodb_have_atomic_builtins & & & Yes & Global & No \\
\hline innodb_idle_flusasppct & Yes & Yes & & Global & Yes \\
\hline innodb_io_capłciby & Yes & Yes & & Global & Yes \\
\hline innodb_io_capł (EB)_max & Yes & Yes & & Global & Yes \\
\hline innodb_limit_optesistic_insert & Yesbug & Yes & & Global & Yes \\
\hline innodb_lock_waiestimeout & Yes & Yes & & Both & Yes \\
\hline innodb_log_buffes_size & Yes & Yes & & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline innodb_log_ch & \&espoint_fuzzy & Yeew & Yes & & Global & Yes \\
\hline innodb_log_ch & \&espoint_now & Yes & Yes & & Global & Yes \\
\hline innodb_log_ch & \&essums & Yes & Yes & & Global & Yes \\
\hline innodb_log_col & Mæsessed_pag & yes & Yes & & Global & Yes \\
\hline innodb_log_file & eYesze & Yes & Yes & & Global & No \\
\hline innodb_log_file & ebesh_group & Yes & Yes & & Global & No \\
\hline innodb_log_gr & d(eps_home_dir & Yes & Yes & & Global & No \\
\hline innodb_log_sp & imespu_abs_lw & Whes & Yes & & Global & Yes \\
\hline innodb_log_spi & piYespu_pct_hw & wifes & Yes & & Global & Yes \\
\hline innodb_log_wał & ałtésor_flush_sp & pireshwm & Yes & & Global & Yes \\
\hline Innodb_log_w & aits & & & Yes & Global & No \\
\hline innodb_log_w & Yesahead_size & eYes & Yes & & Global & Yes \\
\hline Innodb_log_w & rite_requests & & & Yes & Global & No \\
\hline innodb_log_w & Yess threads & Yes & Yes & & Global & Yes \\
\hline Innodb_log_w & rites & & & Yes & Global & No \\
\hline innodb_Iru_scà & ałneslepth & Yes & Yes & & Global & Yes \\
\hline innodb_max_d & dires_pages_pct & tYes & Yes & & Global & Yes \\
\hline innodb_max_d & IM'tys_pages_pct & Ylesm & Yes & & Global & Yes \\
\hline innodb_max_p & pdrege_lag & Yes & Yes & & Global & Yes \\
\hline innodb_max_p & Mrege_lag_delay & yYes & Yes & & Global & Yes \\
\hline innodb_max_u & lires_log_size & Yes & Yes & & Global & Yes \\
\hline innodb_merge & Ytaseshold_set & Yæll debug & Yes & & Global & Yes \\
\hline innodb_monit $\phi$ & resisable & Yes & Yes & & Global & Yes \\
\hline innodb_monit $\phi$ & oresnable & Yes & Yes & & Global & Yes \\
\hline innodb_monit $\phi$ & presset & Yes & Yes & & Global & Yes \\
\hline innodb_monit $\phi$ & Viresset_all & Yes & Yes & & Global & Yes \\
\hline Innodb_num_o & open_files & & & Yes & Global & No \\
\hline innodb_numa & Mesrleave & Yes & Yes & & Global & No \\
\hline innodb_old_blp & b) & Yes & Yes & & Global & Yes \\
\hline innodb_old_blp & bkes_time & Yes & Yes & & Global & Yes \\
\hline innodb_online & Ydter_log_max & Ygise & Yes & & Global & Yes \\
\hline innodb_open & fires & Yes & Yes & & Global & Yes \\
\hline innodb_optimiz & zeesulltext_only & Yes & Yes & & Global & Yes \\
\hline Innodb_os_log & _fsyncs & & & Yes & Global & No \\
\hline Innodb_os_log & _pending_fsyn & cs & & Yes & Global & No \\
\hline Innodb_os_log & g_pending_write & es & & Yes & Global & No \\
\hline Innodb_os_log & _written & & & Yes & Global & No \\
\hline innodb_page_ & desners & Yes & Yes & & Global & No \\
\hline Innodb_page_ & size & & & Yes & Global & No \\
\hline innodb_page_ & SYEES & Yes & Yes & & Global & No \\
\hline Innodb_pages & created & & & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline Innodb_pages_read & & & Yes & Global & No \\
\hline Innodb_pages_written & & & Yes & Global & No \\
\hline innodb_paralleV_esad_thread & Yes & Yes & & Session & Yes \\
\hline innodb_print_alYesseadlocks & Yes & Yes & & Global & Yes \\
\hline innodb_print_dule\$ogs & Yes & Yes & & Global & Yes \\
\hline innodb_purge_Kasch_size & Yes & Yes & & Global & Yes \\
\hline innodb_purge_res_truncate & Yeesquency & Yes & & Global & Yes \\
\hline innodb_purge_Yersads & Yes & Yes & & Global & No \\
\hline innodb_randomYersad_ahead & Yes & Yes & & Global & Yes \\
\hline innodb_read_akead_threshol & \&es & Yes & & Global & Yes \\
\hline innodb_read_id_ebreads & Yes & Yes & & Global & No \\
\hline innodb_read_orues & Yes & Yes & & Global & No \\
\hline innodb_redo_ldgesarchive_dir & SYes & Yes & & Global & Yes \\
\hline innodb_redo_Idgescapacity & Yes & Yes & & Global & Yes \\
\hline Innodb_redo_log_capacity_re & esized & & Yes & Global & No \\
\hline Innodb_redo_log_checkpoint & Isn & & Yes & Global & No \\
\hline Innodb_redo_log_current_Isn & & & Yes & Global & No \\
\hline Innodb_redo_log_enabled & & & Yes & Global & No \\
\hline innodb_redo_ldgeæncrypt & Yes & Yes & & Global & Yes \\
\hline Innodb_redo_log_flushed_to & disk_Isn & & Yes & Global & No \\
\hline Innodb_redo_log_logical_size & & & Yes & Global & No \\
\hline Innodb_redo_log_physical_si & ze & & Yes & Global & No \\
\hline Innodb_redo_log_read_only & & & Yes & Global & No \\
\hline Innodb_redo_log_resize_stat & us & & Yes & Global & No \\
\hline Innodb_redo_log_uuid & & & Yes & Global & No \\
\hline innodb_replicati’es_delay & Yes & Yes & & Global & Yes \\
\hline innodb_rollbackesn_timeout & Yes & Yes & & Global & No \\
\hline innodb_rollback_essegments & Yes & Yes & & Global & Yes \\
\hline Innodb_row_lock_current_wa & its & & Yes & Global & No \\
\hline Innodb_row_lock_time & & & Yes & Global & No \\
\hline Innodb_row_lock_time_avg & & & Yes & Global & No \\
\hline Innodb_row_lock_time_max & & & Yes & Global & No \\
\hline Innodb_row_lock_waits & & & Yes & Global & No \\
\hline Innodb_rows_deleted & & & Yes & Global & No \\
\hline Innodb_rows_inserted & & & Yes & Global & No \\
\hline Innodb_rows_read & & & Yes & Global & No \\
\hline Innodb_rows_updated & & & Yes & Global & No \\
\hline innodb_saved_yease_number & Ydug & Yes & & Global & Yes \\
\hline innodb_segmenreseserve_fac & CHers & Yes & & Global & Yes \\
\hline innodb_sort_bưfers_size & Yes & Yes & & Global & No \\
\hline innodb_spin_wasdelay & Yes & Yes & & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline innodb_spin_u & A\&spause_mu & Melser & Yes & & Global & Yes \\
\hline innodb_stats_ & alres_recalc & Yes & Yes & & Global & Yes \\
\hline innodb_stats_ & Yelede_delete & Yestked & Yes & & Global & Yes \\
\hline innodb_stats_ & Yer\$10d & Yes & Yes & & Global & Yes \\
\hline innodb_stats_ & płésnetadata & Yes & Yes & & Global & Yes \\
\hline innodb_stats_ & płesistent & Yes & Yes & & Global & Yes \\
\hline innodb_stats_ & presistent_sam & plespages & Yes & & Global & Yes \\
\hline innodb_stats & tharesient_samp & Méepages & Yes & & Global & Yes \\
\hline innodb-status-file & Yes & Yes & & & & \\
\hline innodb_status & Yesput & Yes & Yes & & Global & Yes \\
\hline innodb_status & Yesput_locks & Yes & Yes & & Global & Yes \\
\hline innodb_strict_ & Yresse & Yes & Yes & & Both & Yes \\
\hline innodb_sync_ & aYRES/_size & Yes & Yes & & Global & No \\
\hline innodb_sync_ & dresig & Yes & Yes & & Global & No \\
\hline innodb_sync_ & spes_loops & Yes & Yes & & Global & Yes \\
\hline Innodb_system & n_rows_deleted & & & Yes & Global & No \\
\hline Innodb_system & _rows_inserted & & & Yes & Global & No \\
\hline Innodb_system & _rows_read & & & Yes & Global & No \\
\hline Innodb_system & n_rows_updated & & & Yes & Global & No \\
\hline innodb_table_ & locess & Yes & Yes & & Both & Yes \\
\hline innodb_temp & dłata_file_path & Yes & Yes & & Global & No \\
\hline innodb_temp & tyblespaces_di & iYes & Yes & & Global & No \\
\hline innodb_thread & Yeesncurrency & Yes & Yes & & Global & Yes \\
\hline innodb_thread & Ystsep_delay & Yes & Yes & & Global & Yes \\
\hline innodb_tmpdir & Yes & Yes & Yes & & Both & Yes \\
\hline Innodb_truncat & ted_status_writ & tes & & Yes & Global & No \\
\hline innodb_trx_pur & rgesview_upda & deesonly_debug & Yes & & Global & Yes \\
\hline innodb_trx_rse & eyes_slots_deb & Mes & Yes & & Global & Yes \\
\hline innodb_undo & direstory & Yes & Yes & & Global & No \\
\hline innodb_undo & |øesencrypt & Yes & Yes & & Global & Yes \\
\hline innodb_undo & logstruncate & Yes & Yes & & Global & Yes \\
\hline innodb_undo_ & tyblespaces & Yes & Yes & & Global & Yes \\
\hline Innodb_undo_ & tablespaces_a & active & & Yes & Global & No \\
\hline Innodb_undo_ & tablespaces_e & explicit & & Yes & Global & No \\
\hline Innodb_undo_ & tablespaces_in & mplicit & & Yes & Global & No \\
\hline Innodb_undo_ & tablespaces_to & otal & & Yes & Global & No \\
\hline innodb_use_fd & dessync & Yes & Yes & & Global & Yes \\
\hline innodb_use_nà & arres_aio & Yes & Yes & & Global & No \\
\hline innodb_validate & \& tablespace & patis & Yes & & Global & No \\
\hline innodb_version & & & Yes & & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline innodb_write_ & dGdbreads & Yes & Yes & & Global & No \\
\hline insert_id & & & Yes & & Session & Yes \\
\hline install & Yes & & & & & \\
\hline installmanual & Yes & & & & & \\
\hline interactive_tim & Hast & Yes & Yes & & Both & Yes \\
\hline internal_tmp_n & M\&er_storage_ & ehesine & Yes & & Both & Yes \\
\hline join_buffer_siz & \&es & Yes & Yes & & Both & Yes \\
\hline keep_files_on & Yesate & Yes & Yes & & Both & Yes \\
\hline Key_blocks_n & ot_flushed & & & Yes & Global & No \\
\hline Key_blocks_u & unused & & & Yes & Global & No \\
\hline Key_blocks_u & sed & & & Yes & Global & No \\
\hline key_buffer_siz & \&es & Yes & Yes & & Global & Yes \\
\hline key_cache_agè & \& Gbreshold & Yes & Yes & & Global & Yes \\
\hline key_cache_blo & tessize & Yes & Yes & & Global & Yes \\
\hline key_cache_di & MSesn_limit & Yes & Yes & & Global & Yes \\
\hline Key_read_requests & & & & Yes & Global & No \\
\hline Key_reads & & & & Yes & Global & No \\
\hline Key_write_requests & & & & Yes & Global & No \\
\hline Key_writes & & & & Yes & Global & No \\
\hline keyring_aws_c & chres id & Yes & Yes & & Global & Yes \\
\hline keyring_aws_c & cores_file & Yes & Yes & & Global & No \\
\hline keyring_aws_ & daes_file & Yes & Yes & & Global & No \\
\hline keyring_aws_r & requisn & Yes & Yes & & Global & Yes \\
\hline keyring_hashic & coess_auth_path & Yes & Yes & & Global & Yes \\
\hline keyring_hashi & 69sp_ca_path & Yes & Yes & & Global & Yes \\
\hline keyring_hashi & 6as_caching & Yes & Yes & & Global & Yes \\
\hline keyring_hashi & corp_commit_a & auth_path & Yes & & Global & No \\
\hline keyring_hashi & corp_commit_ca & ca_path & Yes & & Global & No \\
\hline keyring_hashi & corp_commit_c & gaching & Yes & & Global & No \\
\hline \multicolumn{2}{|c|}{keyring_hashicorp_commit_ro} & role_id & Yes & & Global & No \\
\hline \multicolumn{2}{|c|}{keyring_hashicorp_commit_s} & server_url & Yes & & Global & No \\
\hline & corp_commit_s & store_path & Yes & & Global & No \\
\hline keyring_hashi & coas_role_id & Yes & Yes & & Global & Yes \\
\hline keyring_hashi & Cás\$_secret_id & Yes & Yes & & Global & Yes \\
\hline keyring_hashi & COES_server_ur & Yes & Yes & & Global & Yes \\
\hline keyring_hashic & 6ę\$_store_patt & Yes & Yes & & Global & Yes \\
\hline keyring-migrationdestination & Yes & Yes & & & & \\
\hline keyring-migration- & Yes & Yes & & & & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline fromcomponent & & & & & & \\
\hline keyring-migrationhost & Yes & Yes & & & & \\
\hline keyring-migrationpassword & Yes & Yes & & & & \\
\hline keyring-migrationport & Yes & Yes & & & & \\
\hline keyring-migrationsocket & Yes & Yes & & & & \\
\hline keyring-migrationsource & Yes & Yes & & & & \\
\hline keyring-migration-tocomponent & Yes & Yes & & & & \\
\hline keyring-migrationuser & Yes & Yes & & & & \\
\hline keyring_okv_o & drusdir & Yes & Yes & & Global & Yes \\
\hline keyring_opera & tions & & Yes & & Global & Yes \\
\hline large_files_su & pport & & Yes & & Global & No \\
\hline large_page_si & ize & & Yes & & Global & No \\
\hline large_pages & Yes & Yes & Yes & & Global & No \\
\hline last_insert_id & & & Yes & & Session & Yes \\
\hline Last_query_co & ost & & & Yes & Session & No \\
\hline Last_query_p & artial_plans & & & Yes & Session & No \\
\hline Ic_messages & Yes & Yes & Yes & & Both & Yes \\
\hline Ic_messages & diles & Yes & Yes & & Global & No \\
\hline Ic_time_name & Yes & Yes & Yes & & Both & Yes \\
\hline license & & & Yes & & Global & No \\
\hline local_infile & Yes & Yes & Yes & & Global & Yes \\
\hline local-service & Yes & & & & & \\
\hline lock_order & Yes & Yes & Yes & & Global & No \\
\hline lock_order_de & D)(œs_loop & Yes & Yes & & Global & No \\
\hline lock_order_de & D)(exs_missing_a & ances & Yes & & Global & No \\
\hline lock_order_de & D)(exs_missing_k & kyes & Yes & & Global & No \\
\hline lock_order_de & D)(ees_missing_u & uimlesk & Yes & & Global & No \\
\hline lock_order_de & pœrsdencies & Yes & Yes & & Global & No \\
\hline lock_order_ex & thésdependenc & yes & Yes & & Global & No \\
\hline lock_order_ou & thees_directory & Yes & Yes & & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline \multicolumn{2}{|l|}{lock_order_printestt} & Yes & Yes & & Global & No \\
\hline \multicolumn{2}{|l|}{lock_order_tradfesoop} & Yes & Yes & & Global & No \\
\hline \multicolumn{2}{|c|}{lock_order_tradeesmissing_arc} & cYes & Yes & & Global & No \\
\hline \multicolumn{2}{|c|}{lock_order_tradeesmissing_ke} & Yes & Yes & & Global & No \\
\hline \multicolumn{2}{|c|}{lock_order_tradeesmissing_un} & Mek & Yes & & Global & No \\
\hline \multicolumn{2}{|l|}{lock_wait_timeyets} & Yes & Yes & & Both & Yes \\
\hline \multicolumn{2}{|l|}{Locked_connects} & & & Yes & Global & No \\
\hline \multicolumn{2}{|l|}{locked_in_memory} & & Yes & & Global & No \\
\hline log-bin & Yes & Yes & & & & \\
\hline log_bin & & & Yes & & Global & No \\
\hline \multicolumn{2}{|l|}{log_bin_basename} & & Yes & & Global & No \\
\hline log_bin_index & Yes & Yes & Yes & & Global & No \\
\hline \multicolumn{2}{|c|}{log_bin_trust_furestion_creato} & Mses & Yes & & Global & Yes \\
\hline log_error & Yes & Yes & Yes & & Global & No \\
\hline \multicolumn{2}{|l|}{log_error_services} & Yes & Yes & & Global & Yes \\
\hline \multicolumn{2}{|l|}{log_error_suppYession_list} & Yes & Yes & & Global & Yes \\
\hline \multicolumn{2}{|l|}{log_error_verb \& GB)} & Yes & Yes & & Global & Yes \\
\hline log-isam & Yes & Yes & & & & \\
\hline log_output & Yes & Yes & Yes & & Global & Yes \\
\hline \multicolumn{2}{|c|}{log_queries_nottessing_index} & \&es & Yes & & Global & Yes \\
\hline log_raw & Yes & Yes & Yes & & Global & Yes \\
\hline \multicolumn{2}{|l|}{log_replica_updres} & Yes & Yes & & Global & No \\
\hline log-shortformat & Yes & Yes & & & & \\
\hline \multicolumn{2}{|l|}{log_slave_updætes} & Yes & Yes & & Global & No \\
\hline \multicolumn{2}{|c|}{log_slow_admixestatements} & Yes & Yes & & Global & Yes \\
\hline \multicolumn{2}{|l|}{log_slow_extraYes} & Yes & Yes & & Global & Yes \\
\hline \multicolumn{2}{|c|}{log_slow_replidæstatements} & Yes & Yes & & Global & Yes \\
\hline \multicolumn{2}{|c|}{log_slow_slaveY essatements} & Yes & Yes & & Global & Yes \\
\hline \multicolumn{2}{|c|}{log_statementsyemsafe_for_} & birfesg & Yes & & Global & Yes \\
\hline log-tc & Yes & Yes & & & & \\
\hline log-tc-size & Yes & Yes & & & & \\
\hline \multicolumn{2}{|c|}{log_throttle_quæres_not_usin} & yesidexes & Yes & & Global & Yes \\
\hline \multicolumn{2}{|l|}{log_timestampðes} & Yes & Yes & & Global & Yes \\
\hline \multicolumn{2}{|l|}{long_query_timœes} & Yes & Yes & & Both & Yes \\
\hline \multicolumn{2}{|l|}{low_priority_updases} & Yes & Yes & & Both & Yes \\
\hline \multicolumn{2}{|l|}{lower_case_file_system} & & Yes & & Global & No \\
\hline \multicolumn{2}{|l|}{lower_case_taMesnames} & Yes & Yes & & Global & No \\
\hline \multicolumn{2}{|l|}{mandatory_rol\&ses} & Yes & Yes & & Global & Yes \\
\hline master-retrycount & Yes & Yes & & & & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline master_verify & Mescksum & Yes & Yes & & Global & Yes \\
\hline max_allowed & dærsket & Yes & Yes & & Both & Yes \\
\hline max_binlog_ca & alche _size & Yes & Yes & & Global & Yes \\
\hline max-binlog-dump-events & Yes & Yes & & & & \\
\hline max_binlog_s & yees & Yes & Yes & & Global & Yes \\
\hline max_binlog_s & mescache_size & Yes & Yes & & Global & Yes \\
\hline max_connect & \& 他酸 & Yes & Yes & & Global & Yes \\
\hline max_connectio & płes & Yes & Yes & & Global & Yes \\
\hline max_delayed & Mesads & Yes & Yes & & Both & Yes \\
\hline max_digest_le & Hgis) & Yes & Yes & & Global & No \\
\hline max_error_co & Mes & Yes & Yes & & Both & Yes \\
\hline max_executio & Y \& sme & Yes & Yes & & Both & Yes \\
\hline Max_executio & n_time_exceed & ed & & Yes & Both & No \\
\hline Max_executio & h_time_set & & & Yes & Both & No \\
\hline Max_executio & _time_set_fail & ed & & Yes & Both & No \\
\hline max_heap_tab & Mésize & Yes & Yes & & Both & Yes \\
\hline max_insert_de & layed_threads & & Yes & & Both & Yes \\
\hline max_join_size & Yes & Yes & Yes & & Both & Yes \\
\hline max_length_fo & oressort_data & Yes & Yes & & Both & Yes \\
\hline max_points_in & Ygsometry & Yes & Yes & & Both & Yes \\
\hline max_prepared & Ydsnt_count & Yes & Yes & & Global & Yes \\
\hline max_relay_log & Ysise & Yes & Yes & & Global & Yes \\
\hline max_seeks_for & Y\&sy & Yes & Yes & & Both & Yes \\
\hline max_sort_leng & thes & Yes & Yes & & Both & Yes \\
\hline max_sp_recur & SYes\$_depth & Yes & Yes & & Both & Yes \\
\hline Max_used_co & nnections & & & Yes & Global & No \\
\hline Max_used_co & nnections_time & & & Yes & Global & No \\
\hline max_user_con & Mestions & Yes & Yes & & Both & Yes \\
\hline max_write_loc & A essount & Yes & Yes & & Global & Yes \\
\hline mecab_charset & & & & Yes & Global & No \\
\hline mecab_rc_file & Yes & Yes & Yes & & Global & No \\
\hline memlock & Yes & Yes & & & & \\
\hline - Variable: locked_in_memory & & & & & & \\
\hline min_examined & Yresv_limit & Yes & Yes & & Both & Yes \\
\hline myisam-block-size & Yes & Yes & & & & \\
\hline myisam_data & Proister_size & Yes & Yes & & Global & Yes \\
\hline myisam_max_ & \& fors_file_size & Yes & Yes & & Global & Yes \\
\hline myisam_mma & Yresze & Yes & Yes & & Global & No \\
\hline myisam_recov & érespoptions & Yes & Yes & & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline myisam_sort_byrer_size & Yes & Yes & & Both & Yes \\
\hline myisam_stats_Yesthod & Yes & Yes & & Both & Yes \\
\hline myisam_use_nyresp & Yes & Yes & & Global & Yes \\
\hline mysql_firewall_oabase & Yes & Yes & & Global & No \\
\hline mysql_firewall_Yesde & Yes & Yes & & Global & Yes \\
\hline mysql_firewall_Yebad_interva & alYeseconds & Yes & & Global & No \\
\hline mysql_firewall_yresce & Yes & Yes & & Global & Yes \\
\hline mysql-native- Yes password & Yes & & & & \\
\hline mysql_native_dæssword_prox & yeusers & Yes & & Global & Yes \\
\hline mysqlx & Yes & & & & \\
\hline Mysqlx_aborted_clients & & & Yes & Global & No \\
\hline Mysqlx_address & & & Yes & Global & No \\
\hline mysqlx_bind_adelsess & Yes & Yes & & Global & No \\
\hline Mysqlx_bytes_received & & & Yes & Both & No \\
\hline Mysqlx_bytes_received_compressed_payloa & & & Yes & Both & No \\
\hline Mysqlx_bytes_received_unco & mpressed_fram & & Yes & Both & No \\
\hline Mysqlx_bytes_sent & & & Yes & Both & No \\
\hline Mysqlx_bytes_sent_compres & sed_payload & & Yes & Both & No \\
\hline Mysqlx_bytes_sent_uncompr & essed_frame & & Yes & Both & No \\
\hline Mysqlx_compression_algorith & m & & Yes & Session & No \\
\hline mysqlx_compresson_algorith & hress & Yes & & Global & Yes \\
\hline Mysqlx_compression_level & & & Yes & Session & No \\
\hline mysqlx_connedtésimeout & Yes & Yes & & Global & Yes \\
\hline Mysqlx_connection_accept_errors & & & Yes & Both & No \\
\hline Mysqlx_connection_errors & & & Yes & Both & No \\
\hline Mysqlx_connections_accepted & & & Yes & Global & No \\
\hline Mysqlx_connections_closed & & & Yes & Global & No \\
\hline Mysqlx_connections_rejected & & & Yes & Global & No \\
\hline Mysqlx_crud_create_view & & & Yes & Both & No \\
\hline Mysqlx_crud_delete & & & Yes & Both & No \\
\hline Mysqlx_crud_drop_view & & & Yes & Both & No \\
\hline Mysqlx_crud_find & & & Yes & Both & No \\
\hline Mysqlx_crud_insert & & & Yes & Both & No \\
\hline Mysqlx_crud_modify_view & & & Yes & Both & No \\
\hline Mysqlx_crud_update & & & Yes & Both & No \\
\hline Mysqlx_cursor_close & & & Yes & Both & No \\
\hline Mysqlx_cursor_fetch & & & Yes & Both & No \\
\hline Mysqlx_cursor_open & & & Yes & Both & No \\
\hline mysqlx_deflateYelsfault_compYession_level & & Yes & & Global & Yes \\
\hline mysqlx_deflateYesax_client_¢ & cあとерорression_le & Yeds & & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd－Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline mysqlx＿docum & とes＿id＿unique & Yorsfix & Yes & & Global & Yes \\
\hline mysqlx＿enable & eYesllo＿notice & Yes & Yes & & Global & Yes \\
\hline Mysqlx＿errors & sent & & & Yes & Both & No \\
\hline Mysqlx＿errors & ＿unknown＿mes & ssage＿type & & Yes & Both & No \\
\hline Mysqlx＿expect & ＿close & & & Yes & Both & No \\
\hline Mysqlx＿expect & ＿open & & & Yes & Both & No \\
\hline mysqlx＿idle＿w & 婚化r＿thread＿ & tiresout & Yes & & Global & Yes \\
\hline Mysqlx＿init＿er & ror & & & Yes & Both & No \\
\hline mysqlx＿interac & CHes＿timeout & Yes & Yes & & Global & Yes \\
\hline mysqlx＿lz4＿de & fœst＿compres & SYews＿level & Yes & & Global & Yes \\
\hline mysqlx＿lz4＿ma & ałęclient＿comp & Yession＿level & Yes & & Global & Yes \\
\hline mysqlx＿max＿q & aYessed＿packet & Yes & Yes & & Global & Yes \\
\hline mysqlx＿max＿¢ & cxesections & Yes & Yes & & Global & Yes \\
\hline Mysqlx＿mess & ages＿sent & & & Yes & Both & No \\
\hline mysqlx＿min＿w & vitcer＿threads & Yes & Yes & & Global & Yes \\
\hline Mysqlx＿notice & global＿sent & & & Yes & Both & No \\
\hline Mysqlx＿notice & other＿sent & & & Yes & Both & No \\
\hline Mysqlx＿notice & warning＿sent & & & Yes & Both & No \\
\hline Mysqlx＿notified & ＿by＿group＿re & eplication & & Yes & Both & No \\
\hline Mysqlx＿port & & & & Yes & Global & No \\
\hline mysqlx＿port & Yes & Yes & Yes & & Global & No \\
\hline mysqlx＿port＿q & ores＿timeout & Yes & Yes & & Global & No \\
\hline Mysqlx＿prep＿deallocate & & & & Yes & Both & No \\
\hline Mysqlx＿prep＿execute & & & & Yes & Both & No \\
\hline Mysqlx＿prep＿prepare & & & & Yes & Both & No \\
\hline mysqlx＿read＿tiresout & & Yes & Yes & & Session & Yes \\
\hline Mysqlx＿rows＿sent & & & & Yes & Both & No \\
\hline Mysqlx＿sessions & & & & Yes & Global & No \\
\hline Mysqlx＿sessions＿accepted & & & & Yes & Global & No \\
\hline Mysqlx＿sessions＿closed & & & & Yes & Global & No \\
\hline & Mysqlx＿sessions＿fatal＿error & & & Yes & Global & No \\
\hline Mysqlx＿sessions＿killed & & & & Yes & Global & No \\
\hline Mysqlx＿sessions＿rejected & & & & Yes & Global & No \\
\hline Mysqlx＿socket & & & & Yes & Global & No \\
\hline mysqlx＿socket & tYes & Yes & Yes & & Global & No \\
\hline Mysqlx＿ssl＿a¢c & ccept＿renegotiate & & & Yes & Global & No \\
\hline Mysqlx＿ssl＿accepts & & & & Yes & Global & No \\
\hline Mysqlx＿ssl＿active & & & & Yes & Both & No \\
\hline mysqlx＿ssl＿ca & Yes & Yes & Yes & & Global & No \\
\hline mysqlx＿ssl＿cap & ↓（t\＄） & Yes & Yes & & Global & No \\
\hline mysqlx＿ssl＿ce & Mes & Yes & Yes & & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline Mysqlx＿ssl＿cipher & & & Yes & Both & No \\
\hline mysqlx＿ssl＿cipKes & Yes & Yes & & Global & No \\
\hline Mysqlx＿ssl＿cipher＿list & & & Yes & Both & No \\
\hline mysqlx＿ssl＿crlYes & Yes & Yes & & Global & No \\
\hline mysqlx＿ssl＿cr｜や』t & Yes & Yes & & Global & No \\
\hline Mysq｜x＿ssl＿ctx＿verify＿depth & & & Yes & Both & No \\
\hline Mysqlx＿ssl＿ctx＿verify＿mode & & & Yes & Both & No \\
\hline Mysqlx＿ssl＿finished＿accepts & & & Yes & Global & No \\
\hline mysqlx＿ssl＿keyres & Yes & Yes & & Global & No \\
\hline Mysqlx＿ssl＿server＿not＿after & & & Yes & Global & No \\
\hline Mysqlx＿ssl＿server＿not＿before & & & Yes & Global & No \\
\hline Mysqlx＿ssl＿verify＿depth & & & Yes & Global & No \\
\hline Mysqlx＿ssl＿verify＿mode & & & Yes & Global & No \\
\hline Mysqlx＿ssl＿version & & & Yes & Both & No \\
\hline Mysqlx＿stmt＿create＿collection & & & Yes & Both & No \\
\hline Mysqlx＿stmt＿create＿collection＿index & & & Yes & Both & No \\
\hline Mysqlx＿stmt＿disable＿notices & & & Yes & Both & No \\
\hline Mysqlx＿stmt＿drop＿collection & & & Yes & Both & No \\
\hline Mysqlx＿stmt＿drop＿collection & index & & Yes & Both & No \\
\hline Mysqlx＿stmt＿enable＿notices & & & Yes & Both & No \\
\hline Mysqlx＿stmt＿ensure＿collection & & & Yes & Both & No \\
\hline Mysqlx＿stmt＿execute＿mysqlx & & & Yes & Both & No \\
\hline Mysqlx＿stmt＿execute＿sql & & & Yes & Both & No \\
\hline Mysqlx＿stmt＿execute＿xplugin & & & Yes & Both & No \\
\hline Mysqlx＿stmt＿get＿collection & options & & Yes & Both & No \\
\hline Mysqlx＿stmt＿kill＿client & & & Yes & Both & No \\
\hline Mysqlx＿stmt＿list＿clients & & & Yes & Both & No \\
\hline Mysqlx＿stmt＿list＿notices & & & Yes & Both & No \\
\hline Mysqlx＿stmt＿list＿objects & & & Yes & Both & No \\
\hline Mysqlx＿stmt＿modify＿collection＿options & & & Yes & Both & No \\
\hline Mysqlx＿stmt＿ping & & & Yes & Both & No \\
\hline mysqlx＿wait＿timesut & Yes & Yes & & Session & Yes \\
\hline Mysqlx＿worker＿threads & & & Yes & Global & No \\
\hline Mysqlx＿worker＿threads＿active & & & Yes & Global & No \\
\hline mysqlx＿write＿tinesout & Yes & Yes & & Session & Yes \\
\hline mysqlx＿zstd＿desult＿compre & \＄sésn＿level & Yes & & Global & Yes \\
\hline mysqlx＿zstd＿mそes＿client＿com & Yesssion＿leve & IYes & & Global & Yes \\
\hline named＿pipe Yes & Yes & Yes & & Global & No \\
\hline named＿pipe＿fullesaccess＿grov & স’es & Yes & & Global & No \\
\hline ndb＿allow＿copyirs＿alter＿tab｜ & res & Yes & & Both & Yes \\
\hline Ndb＿api＿adaptive＿send＿defe & erred＿count & & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline \multicolumn{4}{|l|}{Ndb_api_adaptive_send_deferred_count_replica} & Yes & Global & No \\
\hline \multicolumn{4}{|l|}{Ndb_api_adaptive_send_deferred_count_session} & Yes & Global & No \\
\hline \multicolumn{4}{|l|}{Ndb_api_adaptive_send_deferred_count_slave} & Yes & Global & No \\
\hline \multicolumn{4}{|l|}{Ndb_api_adaptive_send_forced_count} & Yes & Global & No \\
\hline \multicolumn{4}{|l|}{Ndb_api_adaptive_send_forced_count_replica} & Yes & Global & No \\
\hline \multicolumn{4}{|l|}{Ndb_api_adaptive_send_forced_count_session} & Yes & Global & No \\
\hline \multicolumn{4}{|l|}{Ndb_api_adaptive_send_forced_count_slave} & Yes & Global & No \\
\hline \multicolumn{4}{|l|}{Ndb_api_adaptive_send_unforced_count} & Yes & Global & No \\
\hline \multicolumn{4}{|l|}{Ndb_api_adaptive_send_unforced_count_replica} & Yes & Global & No \\
\hline \multicolumn{4}{|l|}{Ndb_api_adaptive_send_unforced_count_session} & Yes & Global & No \\
\hline \multicolumn{4}{|l|}{Ndb_api_adaptive_send_unforced_count_slave} & Yes & Global & No \\
\hline \multicolumn{3}{|l|}{Ndb_api_bytes_received_count} & & Yes & Global & No \\
\hline \multicolumn{3}{|l|}{Ndb_api_bytes_received_count_replica} & & Yes & Global & No \\
\hline \multicolumn{3}{|l|}{Ndb_api_bytes_received_count_session} & & Yes & Session & No \\
\hline \multicolumn{3}{|l|}{Ndb_api_bytes_received_count_slave} & & Yes & Global & No \\
\hline Ndb_api_bytes & _sent_count & & & Yes & Global & No \\
\hline Ndb_api_bytes & \multicolumn{2}{|l|}{_sent_count_replica} & & Yes & Global & No \\
\hline Ndb_api_bytes & \multicolumn{2}{|l|}{__sent_count_session} & & Yes & Session & No \\
\hline \multicolumn{3}{|l|}{Ndb_api_bytes_sent_count_slave} & & Yes & Global & No \\
\hline Ndb_api_event & _bytes_count & & & Yes & Global & No \\
\hline Ndb_api_even & t_bytes_count & injector & & Yes & Global & No \\
\hline Ndb_api_even & t_data_count & & & Yes & Global & No \\
\hline Ndb_api_even & t_data_count_in & njector & & Yes & Global & No \\
\hline \multicolumn{3}{|l|}{Ndb_api_event_nondata_count} & & Yes & Global & No \\
\hline \multicolumn{3}{|l|}{Ndb_api_event_nondata_count_injector} & & Yes & Global & No \\
\hline Ndb_api_pk_o & p_count & & & Yes & Global & No \\
\hline \multicolumn{3}{|l|}{Ndb_api_pk_op_count_replica} & & Yes & Global & No \\
\hline \multicolumn{3}{|l|}{Ndb_api_pk_op_count_session} & & Yes & Session & No \\
\hline \multicolumn{3}{|l|}{Ndb_api_pk_op_count_slave} & & Yes & Global & No \\
\hline \multicolumn{3}{|l|}{Ndb_api_pruned_scan_count} & & Yes & Global & No \\
\hline \multicolumn{3}{|l|}{Ndb_api_pruned_scan_count_replica} & & Yes & Global & No \\
\hline \multicolumn{3}{|l|}{Ndb_api_pruned_scan_count_session} & & Yes & Session & No \\
\hline \multicolumn{3}{|l|}{Ndb_api_pruned_scan_count_slave} & & Yes & Global & No \\
\hline Ndb_api_range & _scan_count & & & Yes & Global & No \\
\hline Ndb_api_range & _scan_count & replica & & Yes & Global & No \\
\hline Ndb_api_range & _scan_count & session & & Yes & Session & No \\
\hline Ndb_api_range & e_scan_count & slave & & Yes & Global & No \\
\hline Ndb_api_read & row_count & & & Yes & Global & No \\
\hline Ndb_api_read & \multicolumn{2}{|l|}{row_count_replica} & & Yes & Global & No \\
\hline Ndb_api_read & \multicolumn{2}{|l|}{row_count_session} & & Yes & Session & No \\
\hline \multicolumn{3}{|l|}{Ndb_api_read_row_count_slave} & & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline Ndb_api_scan_batch_count & & & Yes & Global & No \\
\hline Ndb_api_scan_batch_count & replica & & Yes & Global & No \\
\hline Ndb_api_scan_batch_count_ & session & & Yes & Session & No \\
\hline Ndb_api_scan_batch_count & slave & & Yes & Global & No \\
\hline Ndb_api_table_scan_count & & & Yes & Global & No \\
\hline Ndb_api_table_scan_count_ & replica & & Yes & Global & No \\
\hline Ndb_api_table_scan_count_ & session & & Yes & Session & No \\
\hline Ndb_api_table_scan_count_ & slave & & Yes & Global & No \\
\hline Ndb_api_trans_abort_count & & & Yes & Global & No \\
\hline Ndb_api_trans_abort_count & replica & & Yes & Global & No \\
\hline Ndb_api_trans_abort_count & session & & Yes & Session & No \\
\hline Ndb_api_trans_abort_count_ & slave & & Yes & Global & No \\
\hline Ndb_api_trans_close_count & & & Yes & Global & No \\
\hline Ndb_api_trans_close_count & replica & & Yes & Global & No \\
\hline Ndb_api_trans_close_count & session & & Yes & Session & No \\
\hline Ndb_api_trans_close_count & slave & & Yes & Global & No \\
\hline Ndb_api_trans_commit_count & & & Yes & Global & No \\
\hline Ndb_api_trans_commit_count & t_replica & & Yes & Global & No \\
\hline Ndb_api_trans_commit_count & t_session & & Yes & Session & No \\
\hline Ndb_api_trans_commit_count & t_slave & & Yes & Global & No \\
\hline Ndb_api_trans_local_read_ro & ow_count & & Yes & Global & No \\
\hline Ndb_api_trans_local_read_r & row_count_replica & & Yes & Global & No \\
\hline Ndb_api_trans_local_read_ro & ow_count_sess & ion & Yes & Session & No \\
\hline Ndb_api_trans_local_read_ro & ow_count_slave & & Yes & Global & No \\
\hline Ndb_api_trans_start_count & & & Yes & Global & No \\
\hline Ndb_api_trans_start_count_ & replica & & Yes & Global & No \\
\hline Ndb_api_trans_start_count_ & session & & Yes & Session & No \\
\hline Ndb_api_trans_start_count_ & slave & & Yes & Global & No \\
\hline Ndb_api_uk_op_count & & & Yes & Global & No \\
\hline Ndb_api_uk_op_count_replica & & & Yes & Global & No \\
\hline Ndb_api_uk_op_count_sessi & on & & Yes & Session & No \\
\hline Ndb_api_uk_op_count_slave & & & Yes & Global & No \\
\hline Ndb_api_wait_exec_complete & e_count & & Yes & Global & No \\
\hline Ndb_api_wait_exec_complete & e_count_replica & & Yes & Global & No \\
\hline Ndb_api_wait_exec_complete & e_count_session & & Yes & Session & No \\
\hline Ndb_api_wait_exec_complete & ecount_slave & & Yes & Global & No \\
\hline Ndb_api_wait_meta_request & count & & Yes & Global & No \\
\hline Ndb_api_wait_meta_request & count_replica & & Yes & Global & No \\
\hline Ndb_api_wait_meta_request & count_session & & Yes & Session & No \\
\hline Ndb_api_wait_meta_request & count_slave & & Yes & Global & No \\
\hline Ndb_api_wait_nanos_count & & & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline Ndb_api_wait & nanos_count & replica & & Yes & Global & No \\
\hline Ndb_api_wait & nanos_count & session & & Yes & Session & No \\
\hline Ndb_api_wait & nanos_count & slave & & Yes & Global & No \\
\hline Ndb_api_wait & scan_result_c & count & & Yes & Global & No \\
\hline Ndb_api_wait & scan_result_c & count_replica & & Yes & Global & No \\
\hline Ndb_api_wait & scan_result_co & count_session & & Yes & Session & No \\
\hline Ndb_api_wait & scan_result_co & count_slave & & Yes & Global & No \\
\hline ndb_applier_al & IM\&s_skip_epoc & ckes & Yes & & Global & No \\
\hline ndb_autoincre & Meest_prefetch & Yes & Yes & & Both & Yes \\
\hline ndb_batch_siz & Aes & Yes & Yes & & Both & Yes \\
\hline ndb_blob_read & Yeatch_bytes & Yes & Yes & & Both & Yes \\
\hline ndb_blob_write & eY \& stch_bytes & Yes & Yes & & Both & Yes \\
\hline ndb_clear_app & Myestatus & & Yes & & Global & Yes \\
\hline ndb_cluster_cp & OYRection_pool & Yes & Yes & & Global & No \\
\hline ndb_cluster_co & preaction_pool & Yresdeids & Yes & & Global & No \\
\hline Ndb_cluster_n & ode_id & & & Yes & Global & No \\
\hline Ndb_config_fr & om_host & & & Yes & Both & No \\
\hline Ndb_config_fr & om_port & & & Yes & Both & No \\
\hline Ndb_config_g & eneration & & & Yes & Global & No \\
\hline Ndb_conflict_f & n_epoch & & & Yes & Global & No \\
\hline Ndb_conflict_f & n_epoch_trans & & & Yes & Global & No \\
\hline Ndb_conflict_t & n_epoch2 & & & Yes & Global & No \\
\hline Ndb_conflict_t & n_epoch2_trans & & & Yes & Global & No \\
\hline Ndb_conflict_t & n_max & & & Yes & Global & No \\
\hline Ndb_conflict_t & n_max_del_win & & & Yes & Global & No \\
\hline Ndb_conflict_fn & n_max_del_win & _ins & & Yes & Global & No \\
\hline Ndb_conflict_fn & n_max_ins & & & Yes & Global & No \\
\hline Ndb_conflict_fn & n_old & & & Yes & Global & No \\
\hline Ndb_conflict_las & |ast_conflict_ep & och & & Yes & Global & No \\
\hline Ndb_conflict_I & |ast_stable_epo & ch & & Yes & Global & No \\
\hline Ndb_conflict_! & eflected_op_di & scard_count & & Yes & Global & No \\
\hline Ndb_conflict_! & eflected_op_pr & epare_count & & Yes & Global & No \\
\hline Ndb_conflict_! & efresh_op_cou & nt & & Yes & Global & No \\
\hline ndb_conflict_r & pYes & Yes & Yes & & Global & Yes \\
\hline Ndb_conflict_t & rans_conflict_c & commit_count & & Yes & Global & No \\
\hline Ndb_conflict_t & rans_detect_iter & r_count & & Yes & Global & No \\
\hline Ndb_conflict_t & rans_reject_co & unt & & Yes & Global & No \\
\hline Ndb_conflict_t & rans_row_confl & lict_count & & Yes & Global & No \\
\hline Ndb_conflict_t & rans_row_reject & t_count & & Yes & Global & No \\
\hline ndbconnectstring & Yes & Yes & & & & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline ndb＿data＿nodd＇eseighbour & Yes & Yes & & Global & Yes \\
\hline ndb＿dbg＿checKeshares & Yes & Yes & & Both & Yes \\
\hline ndb＿default＿cormsin＿format & Yes & Yes & & Global & Yes \\
\hline ndb＿default＿cormsin＿format & Yes & Yes & & Global & Yes \\
\hline ndb＿deferred＿＇＇⿴囗⿰丿丨匕刂sstraints & Yes & Yes & & Both & Yes \\
\hline ndb＿deferred＿＇＇Amsstraints & Yes & Yes & & Both & Yes \\
\hline ndb＿distributioryes & Yes & Yes & & Global & Yes \\
\hline ndb＿distributiołres & Yes & Yes & & Global & Yes \\
\hline Ndb＿epoch＿delete＿delete＿c & count & & Yes & Global & No \\
\hline ndb＿eventbuffefeseree＿percen & Yes & Yes & & Global & Yes \\
\hline ndb＿eventbuffefesnax＿alloc & Yes & Yes & & Global & Yes \\
\hline Ndb＿execute＿count & & & Yes & Global & No \\
\hline ndb＿extra＿loggires & Yes & Yes & & Global & Yes \\
\hline Ndb＿fetch＿table＿stats & & & Yes & Global & No \\
\hline ndb＿force＿sendes & Yes & Yes & & Both & Yes \\
\hline ndb＿fully＿replidatsd & Yes & Yes & & Both & Yes \\
\hline ndb＿index＿statYestable & Yes & Yes & & Both & Yes \\
\hline ndb＿index＿statYesption & Yes & Yes & & Both & Yes \\
\hline ndb＿join＿pushdown & & Yes & & Both & Yes \\
\hline Ndb＿last＿commit＿epoch＿ser & ver & & Yes & Global & No \\
\hline Ndb＿last＿commit＿epoch＿ses & sion & & Yes & Session & No \\
\hline ndb＿log＿applyYststus & Yes & Yes & & Global & No \\
\hline ndb＿log＿applyYststus & Yes & Yes & & Global & No \\
\hline ndb＿log＿bin Yes & & Yes & & Both & No \\
\hline ndb＿log＿binlogYèsdex & & Yes & & Global & Yes \\
\hline ndb＿log＿cacheYesże & Yes & Yes & & Global & Yes \\
\hline ndb＿log＿emptyrespochs & Yes & Yes & & Global & Yes \\
\hline ndb＿log＿emptyrespochs & Yes & Yes & & Global & Yes \\
\hline ndb＿log＿emptyY＠spdate & Yes & Yes & & Global & Yes \\
\hline ndb＿log＿emptyYespdate & Yes & Yes & & Global & Yes \\
\hline ndb＿log＿exclusłes＿reads & Yes & Yes & & Both & Yes \\
\hline ndb＿log＿exclusłes＿reads & Yes & Yes & & Both & Yes \\
\hline ndb＿log＿fail＿teYræsinate & Yes & Yes & & Global & No \\
\hline ndb＿log＿orig Yes & Yes & Yes & & Global & No \\
\hline ndb＿log＿orig Yes & Yes & Yes & & Global & No \\
\hline ndb＿log＿transadeton＿compre & Skeisn & Yes & & Global & Yes \\
\hline ndb＿log＿transadeisn＿compre & Skeisn＿level＿zs & Mes & & Global & Yes \\
\hline ndb＿log＿transadetsn＿depend & drees／ & Yes & & Global & No \\
\hline ndb＿log＿transadeisn＿id & Yes & Yes & & Global & No \\
\hline ndb＿log＿transaction＿id & & Yes & & Global & No \\
\hline ndb＿log＿updateess＿write & Yes & Yes & & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd－Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline ndb＿log＿upda & téeninimal & Yes & Yes & & Global & Yes \\
\hline ndb＿log＿upda & tedsonly & Yes & Yes & & Global & Yes \\
\hline ndb＿metadata & Yerseck & Yes & Yes & & Global & Yes \\
\hline ndb＿metadata & Yersck＿interval & Mes & Yes & & Global & Yes \\
\hline Ndb＿metadata & ＿detected＿cou & unt & & Yes & Global & No \\
\hline Ndb＿metadata & excluded＿cou & unt & & Yes & Global & No \\
\hline ndb＿metadata & sync & & Yes & & Global & Yes \\
\hline Ndb＿metadata & ＿synced＿count & & & Yes & Global & No \\
\hline ndb＿mgm＿tls & Yes & Yes & & & Global & No \\
\hline －Variable： yes & & & Yes & & Global & No \\
\hline ndb－mgmd－ host & Yes & Yes & & & & \\
\hline ndb＿nodeid & Yes & Yes & & Yes & Global & No \\
\hline Ndb＿number＿ & of＿data＿nodes & & & Yes & Global & No \\
\hline ndb＿optimizat & dresdelay & Yes & Yes & & Global & Yes \\
\hline ndb＿optimized & Y 四sde＿selectio & Yes & Yes & & Global & Yes \\
\hline ndb＿optimized & Y佃sde＿selectio & hes & Yes & & Global & No \\
\hline Ndb＿pruned＿\＄ & scan＿count & & & Yes & Global & No \\
\hline Ndb＿pushed＿ & queries＿defined & & & Yes & Global & No \\
\hline Ndb＿pushed＿ & queries＿droppe & ed & & Yes & Global & No \\
\hline Ndb＿pushed＿qu & queries＿execut & ed & & Yes & Global & No \\
\hline Ndb＿pushed＿ & reads & & & Yes & Global & No \\
\hline ndb＿read＿bad & Aleps & Yes & Yes & & Global & Yes \\
\hline ndb＿recv＿thre & desactivation & thresshold & Yes & & Global & Yes \\
\hline ndb＿recv＿thre & acescpu＿mask & Yes & Yes & & Global & Yes \\
\hline ndb＿replica＿bà & arels＿size & Yes & Yes & & Global & Yes \\
\hline ndb＿replica＿bl & meswrite＿batch & Yesytes & Yes & & Global & Yes \\
\hline Ndb＿replica＿m & nax＿replicated & epoch & Yes & & Global & No \\
\hline ndb＿report＿thr & やsls＿binlog＿ep & ＇＇es＇s＿slip & Yes & & Global & Yes \\
\hline ndb＿report＿th & とels＿binlog＿m & ehesusage & Yes & & Global & Yes \\
\hline ndb＿row＿cheqk & ksum & & Yes & & Both & Yes \\
\hline Ndb＿scan＿co & unt & & & Yes & Global & No \\
\hline ndb＿schema＿ & dYstslock＿wait & Viresout & Yes & & Global & Yes \\
\hline ndb＿schema & drststimeout & Yes & Yes & & Global & No \\
\hline ndb＿schema & drststimeout & Yes & Yes & & Global & No \\
\hline ndb＿schema＿ & dYsts upgrade＿ & altersied & Yes & & Global & No \\
\hline Ndb＿schema & participant＿cou & unt & Yes & & Global & No \\
\hline ndb＿show＿fore & er（gsts＿key＿moc & Yesbles & Yes & & Global & Yes \\
\hline ndb＿slave＿co & Mes\＄＿role & Yes & Yes & & Global & Yes \\
\hline Ndb＿slave＿max & x＿replicated＿e & epoch & & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline Ndb_system_name & & & Yes & & Global & No \\
\hline ndb_table_no_logging & & & Yes & & Session & Yes \\
\hline ndb_table_temporary & & & Yes & & Session & Yes \\
\hline ndb_tls_searchYesth & & Yes & & & Global & No \\
\hline - Variable: yes & & & Yes & & Global & No \\
\hline & Ndb_trans_hint_count_sessio & & & Yes & Both & No \\
\hline ndb-transid-mysql-connectionmap & Yes & & & & & \\
\hline & ndb_use_copying_alter_table & & Yes & & Both & No \\
\hline ndb_use_exact_count & & & Yes & & Both & Yes \\
\hline ndb_use_transłetsons & & Yes & Yes & & Both & Yes \\
\hline ndb_version & & & Yes & & Global & No \\
\hline ndb_version_string & & & Yes & & Global & No \\
\hline ndb_wait_connyeesed & & Yes & Yes & & Global & No \\
\hline ndb_wait_setupes & & Yes & Yes & & Global & No \\
\hline ndbcluster & Yes & Yes & & & & \\
\hline ndbinfo & Yes & & & & & \\
\hline ndbinfo_database & & & Yes & & Global & No \\
\hline ndbinfo_max_byess & & & Yes & & Both & Yes \\
\hline ndbinfo_max_ryes & & & Yes & & Both & Yes \\
\hline ndbinfo_offline & & & Yes & & Global & Yes \\
\hline ndbinfo_show_Keesden & & & Yes & & Both & Yes \\
\hline ndbinfo_table_prefix & & & Yes & & Global & No \\
\hline ndbinfo_version & & & Yes & & Global & No \\
\hline net_buffer_lengtytas & & Yes & Yes & & Both & Yes \\
\hline net_read_timedus & & Yes & Yes & & Both & Yes \\
\hline net_retry_counYes & & Yes & Yes & & Both & Yes \\
\hline net_write_timedœts & & Yes & Yes & & Both & Yes \\
\hline ngram_token_S/res & & Yes & Yes & & Global & No \\
\hline no-defaults & Yes & & & & & \\
\hline no-monitor & Yes & Yes & & & & \\
\hline Not_flushed_delayed_rows & & & & Yes & Global & No \\
\hline offline_mode Yes & & Yes & Yes & & Global & Yes \\
\hline old_alter_tableYes & & Yes & Yes & & Both & Yes \\
\hline & Ongoing_anonymous_gtid_v & olating_transa & ction_count & Yes & Global & No \\
\hline & Ongoing_anonymous_transa & ction_count & & Yes & Global & No \\
\hline & Ongoing_automatic_gtid_viol & ating_transaction & on_count & Yes & Global & No \\
\hline Open_files & & & & Yes & Global & No \\
\hline open_files_limiYes & & Yes & Yes & & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline Open_stream\$ & & & & Yes & Global & No \\
\hline Open_table_definitions & & & & Yes & Global & No \\
\hline Open_tables & & & & Yes & Both & No \\
\hline Opened_files & & & & Yes & Global & No \\
\hline Opened_table & definitions & & & Yes & Both & No \\
\hline Opened_tables & & & & Yes & Both & No \\
\hline optimizer_prun & œevel & Yes & Yes & & Both & Yes \\
\hline optimizer_sear & Clesdepth & Yes & Yes & & Both & Yes \\
\hline optimizer_switd & ckes & Yes & Yes & & Both & Yes \\
\hline optimizer_trace & eYes & Yes & Yes & & Both & Yes \\
\hline optimizer_trace & Etesatures & Yes & Yes & & Both & Yes \\
\hline optimizer_trace & EYetisnit & Yes & Yes & & Both & Yes \\
\hline optimizer_trace & eresax_mem_ & sizes & Yes & & Both & Yes \\
\hline optimizer_trace & Eresfset & Yes & Yes & & Both & Yes \\
\hline original_commit & it_timestamp & & Yes & & Session & Yes \\
\hline original_server & __version & & Yes & & Session & Yes \\
\hline parser_max_n & wes_size & Yes & Yes & & Both & Yes \\
\hline partial_revoke & SYes & Yes & Yes & & Global & Yes \\
\hline password_hist & dres & Yes & Yes & & Global & Yes \\
\hline password_req & Wires_current & Yes & Yes & & Global & Yes \\
\hline password_reu & syesinterval & Yes & Yes & & Global & Yes \\
\hline performance_ & słbema & Yes & Yes & & Global & No \\
\hline Performance & schema_accou & nts_lost & & Yes & Global & No \\
\hline performance_ & słberma_accou & néssize & Yes & & Global & No \\
\hline Performance & schema_cond & classes_lost & & Yes & Global & No \\
\hline Performance & schema_cond & instances_lost & & Yes & Global & No \\
\hline performance-schema-consumer-events-stagescurrent & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-stageshistory & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-stages-history-long & Yes & Yes & & & & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline performance-schema-consumer-events-statementscpu & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-statementscurrent & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-statementshistory & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-statements-history-long & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-transactionscurrent & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-transactionshistory & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-transactions-history-long & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-waitscurrent & Yes & Yes & & & & \\
\hline performance-schema-consumer-events-waitshistory & Yes & Yes & & & & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline performance-schema-consumer-events-waits-history-long & Yes & Yes & & & & \\
\hline performance-schema-consumer-globalinstrumentation & Yes & Yes & & & & \\
\hline performance-schema-consumer-statementsdigest & Yes & Yes & & & & \\
\hline performance-schema-consumer-threadinstrumentation & Yes & Yes & & & & \\
\hline Performance_ & schema_digest & _lost & & Yes & Global & No \\
\hline performance_\$ & słbema_digest & SYesże & Yes & & Global & No \\
\hline performance_s & sclesma_error_ & SIFES & Yes & & Global & No \\
\hline performance_s & stebema_event & sYetages_histo & Yelsong_size & & Global & No \\
\hline performance_s & \multicolumn{2}{|c|}{słbema_eventsYetages_histor} & ryesize & & Global & No \\
\hline performance_s & \multicolumn{2}{|c|}{słbema_eventsYeratements_l} & \multicolumn{2}{|l|}{hisesry_long_size} & Global & No \\
\hline performance_s & \multicolumn{2}{|c|}{słbema_eventsYestements_} & history_size & & Global & No \\
\hline performance_s & \multicolumn{2}{|c|}{} & \multicolumn{2}{|l|}{Missory_long_size} & Global & No \\
\hline performance_s & \multicolumn{2}{|c|}{słbema_eventsYeransactions} & Missory_size & & Global & No \\
\hline performance_s & \multicolumn{2}{|c|}{stresma_eventsYersits_history} & Yeag_size & & Global & No \\
\hline performance_\$ & \multicolumn{2}{|c|}{syerema_eventsYeraits_history} & Yese & & Global & No \\
\hline Performance_ & \multicolumn{2}{|l|}{schema_file_classes_lost} & & Yes & Global & No \\
\hline Performance_ & \multicolumn{2}{|l|}{schema_file_handles_lost} & & Yes & Global & No \\
\hline Performance_ & \multicolumn{2}{|c|}{schema_file_instances_lost} & & Yes & Global & No \\
\hline Performance_ & \multicolumn{2}{|l|}{schema_hosts_lost} & & Yes & Global & No \\
\hline performance_ & słberma_hosts & \$1EC & Yes & & Global & No \\
\hline Performance & schema_index & stat_lost & & Yes & Global & No \\
\hline performance-schemainstrument & Yes & Yes & & & & \\
\hline Performance_ & & _lost & & Yes & Global & No \\
\hline performance_ & słberma_max_ & cored_classes & Yes & & Global & No \\
\hline performance_ & słberma_max_ & cored_instances & Yes & & Global & No \\
\hline performance_ & słbema_max_ & digesst_length & Yes & & Global & No \\
\hline performance_ & & digesst_sample & łge & & Global & Yes \\
\hline performance_ & stébema_max_ & fileesclasses & Yes & & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name Cmd－Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline performance＿stebema＿max＿ & filkeshandles & Yes & & Global & No \\
\hline performance＿sŁberma＿max＿ & fileesinstances & Yes & & Global & No \\
\hline performance＿sytesma＿max＿ & inclesx＿stat & Yes & & Global & No \\
\hline performance＿sytesma＿max＿ & ாரைகry＿classe & \＆es & & Global & No \\
\hline performance＿sytesma＿max＿ & Meesdata＿locks & SYes & & Global & No \\
\hline performance＿syとesma＿max＿ & Metsr＿classes & Yes & & Global & No \\
\hline performance＿sterema＿max＿ & Metsic＿classes & Yes & & Global & No \\
\hline performance＿sterema＿max＿ & Mesex＿classes & Yes & & Global & No \\
\hline performance＿sterema＿max＿ & Metsx＿instance & §es & & Global & No \\
\hline performance＿syterma＿max＿ & presared＿stater & Mests＿instances & & Global & No \\
\hline performance＿słbema＿max＿ & pY＠sram＿instan & ques & & Global & No \\
\hline performance＿sytesma＿max＿ & rwesck＿classes & Yes & & Global & No \\
\hline performance＿syterma＿max＿r & w）wesck＿instance & ebes & & Global & No \\
\hline performance＿sとberma＿max＿s & syelset＿classes & Yes & & Global & No \\
\hline performance＿słberma＿max＿s & søelset＿instance & ekes & & Global & No \\
\hline performance＿sとkesma＿max＿s & squesext＿length & Yes & & Global & No \\
\hline performance＿sterema＿max＿s & słrege＿classes & Yes & & Global & No \\
\hline performance＿sŁbema＿max＿s & statement＿clas & S）（ESS & & Global & No \\
\hline performance＿sとbema＿max＿s & słatement＿stad & AVes & & Global & No \\
\hline performance＿sとbema＿max＿t & taddes＿handles & Yes & & Global & No \\
\hline performance＿skbema＿max＿t & tades＿instances & Yes & & Global & No \\
\hline performance＿sytbema＿max＿t & tades＿lock＿stat & Yes & & Global & No \\
\hline performance＿syrbema＿max＿t & thresd＿classes & Yes & & Global & No \\
\hline performance＿sytbema＿max＿t & thresd＿instance & ebes & & Global & No \\
\hline Performance＿schema＿memo & ry＿classes＿lost & & Yes & Global & No \\
\hline Performance＿schema＿metad & data＿lock＿lost & & Yes & Global & No \\
\hline Performance＿schema＿meter＿ & ＿lost & & Yes & Global & No \\
\hline Performance＿schema＿metric & ＿lost & & Yes & Global & No \\
\hline Performance＿schema＿mutex & ＿classes＿lost & & Yes & Global & No \\
\hline Performance＿schema＿mutex & ＿instances＿lost & & Yes & Global & No \\
\hline Performance＿schema＿nested & d＿statement＿lo & st & Yes & Global & No \\
\hline Performance＿schema＿prepar & red＿statements & ＿lost & Yes & Global & No \\
\hline Performance＿schema＿progra & am＿lost & & Yes & Global & No \\
\hline Performance＿schema＿rwlock & ＿classes＿lost & & Yes & Global & No \\
\hline Performance＿schema＿rwlock & ＿＿instances＿lost & & Yes & Global & No \\
\hline Performance＿schema＿sessio & n＿connect＿att & rs＿longest＿se & kes & Global & No \\
\hline Performance＿schema＿sessio & n＿connect＿attr & rs＿lost & Yes & Global & No \\
\hline performance＿sとkerma＿sessio & Mesonnect＿attr & yesize & & Global & No \\
\hline performance＿sとberma＿setup & aebors＿size & Yes & & Global & No \\
\hline performance＿sとbema＿setup & beøects＿size & Yes & & Global & No \\
\hline performance＿sとbema＿show & prescesslist & Yes & & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline Performance & schema_socket & _classes_lost & & Yes & Global & No \\
\hline Performance & schema_socket & _instances_lost & & Yes & Global & No \\
\hline Performance & schema_stage & classes_lost & & Yes & Global & No \\
\hline Performance & schema_statem & ment_classes_los & & Yes & Global & No \\
\hline Performance & schema_table_ & handles_lost & & Yes & Global & No \\
\hline Performance & schema_table & instances_lost & & Yes & Global & No \\
\hline Performance & schema_table & lock_stat_lost & & Yes & Global & No \\
\hline Performance & schema_thread & _classes_lost & & Yes & Global & No \\
\hline Performance & schema_thread & _instances_lost & & Yes & Global & No \\
\hline Performance & schema_users & lost & & Yes & Global & No \\
\hline performance_ & słebema_users & SECS & Yes & & Global & No \\
\hline persist_only_a & dłresin_x509_su & Mest & Yes & & Global & No \\
\hline persist_sensiti & Mes/ariables_i & inYesaintext & Yes & & Global & No \\
\hline persisted_glob & adesload & Yes & Yes & & Global & No \\
\hline pid_file & Yes & Yes & Yes & & Global & No \\
\hline plugin_dir & Yes & Yes & Yes & & Global & No \\
\hline plugin-load & Yes & Yes & & & & \\
\hline plugin-loadadd & Yes & Yes & & & & \\
\hline plugin-xxx & Yes & Yes & & & & \\
\hline port & Yes & Yes & Yes & & Global & No \\
\hline port-opentimeout & Yes & Yes & & & & \\
\hline preload_buffer & Ysise & Yes & Yes & & Both & Yes \\
\hline Prepared_stmt & _count & & & Yes & Global & No \\
\hline print-defaults & Yes & & & & & \\
\hline print_identified & Yesh_as_hex & Yes & Yes & & Both & Yes \\
\hline profiling & & & Yes & & Both & Yes \\
\hline profiling_histo & Yesize & Yes & Yes & & Both & Yes \\
\hline protocol_comp & Meession_algorit & Mees & Yes & & Global & Yes \\
\hline protocol_versi & ion & & Yes & & Global & No \\
\hline proxy_user & & & Yes & & Session & No \\
\hline pseudo_replica & __mode & & Yes & & Session & Yes \\
\hline pseudo_slave & mode & & Yes & & Session & Yes \\
\hline pseudo_thread & _id & & Yes & & Session & Yes \\
\hline Queries & & & & Yes & Both & No \\
\hline query_alloc_b & docs_size & Yes & Yes & & Both & Yes \\
\hline query_preallo¢ & Ysise & Yes & Yes & & Both & Yes \\
\hline Questions & & & & Yes & Both & No \\
\hline rand_seed1 & & & Yes & & Session & Yes \\
\hline rand_seed2 & & & Yes & & Session & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline range_alloc_bl & lods_size & Yes & Yes & & Both & Yes \\
\hline range_optimize & erestax_mem & STES & Yes & & Both & Yes \\
\hline rbr_exec_mode & & & Yes & & Session & Yes \\
\hline read_buffer_s & ఓæs & Yes & Yes & & Both & Yes \\
\hline read_only & Yes & Yes & Yes & & Global & Yes \\
\hline read_rnd_buff & eyesize & Yes & Yes & & Both & Yes \\
\hline regexp_stack & Mest & Yes & Yes & & Global & Yes \\
\hline regexp_time_li & limets & Yes & Yes & & Global & Yes \\
\hline relay_log & Yes & Yes & Yes & & Global & No \\
\hline relay_log_bas & ename & & Yes & & Global & No \\
\hline relay_log_inde & Yes & Yes & Yes & & Global & No \\
\hline relay_log_purg & gees & Yes & Yes & & Global & Yes \\
\hline relay_log_reco & overs/ & Yes & Yes & & Global & No \\
\hline relay_log_spac & ckésimit & Yes & Yes & & Global & No \\
\hline remove & Yes & & & & & \\
\hline replica_allow & baeshing & Yes & Yes & & Global & Yes \\
\hline replica_check & pres_group & Yes & Yes & & Global & Yes \\
\hline replica_checkp & bes_period & Yes & Yes & & Global & Yes \\
\hline replica_compre & essed_protocol & Yes & Yes & & Global & Yes \\
\hline replica_exec_n & MYouse & Yes & Yes & & Global & Yes \\
\hline replica_load_tr & thyressir & Yes & Yes & & Global & No \\
\hline replica_max_a & alreesed_packet & Yes & Yes & & Global & Yes \\
\hline replica_net_tim & meesit & Yes & Yes & & Global & Yes \\
\hline Replica_open_ & temp_tables & & & Yes & Global & No \\
\hline replica_paralle & Yespe & Yes & Yes & & Global & Yes \\
\hline replica_paralleY & Yesorkers & Yes & Yes & & Global & Yes \\
\hline replica_pendind & yejsbs_size_m & Mes & Yes & & Global & Yes \\
\hline replica_preser & Węcommit_ord & dees & Yes & & Global & Yes \\
\hline replica_skip_e & Yers & Yes & Yes & & Global & No \\
\hline replica_sql_ve & Hieschecksum & Yes & Yes & & Global & Yes \\
\hline replica_transac & cłiest_retries & Yes & Yes & & Global & Yes \\
\hline replica_type_c & cơ個军ersions & Yes & Yes & & Global & Yes \\
\hline replicate-dodb & Yes & Yes & & & & \\
\hline replicate-dotable & Yes & Yes & & & & \\
\hline replicate-ignore-db & Yes & Yes & & & & \\
\hline replicate-ignore-table & Yes & Yes & & & & \\
\hline replicate-rewrite-db & Yes & Yes & & & & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline replicate-same-serverid & Yes & Yes & & & & \\
\hline replicate-wild-do-table & Yes & Yes & & & & \\
\hline replicate-wild-ignoretable & Yes & Yes & & & & \\
\hline replication_op & invèse_for_stat & dgesdugin_configy & gYes & & Global & Yes \\
\hline replication_se & ides_observe_ & chesmit_only & Yes & & Global & Yes \\
\hline report_host & Yes & Yes & Yes & & Global & No \\
\hline report_passwo & nces & Yes & Yes & & Global & No \\
\hline report_port & Yes & Yes & Yes & & Global & No \\
\hline report_user & Yes & Yes & Yes & & Global & No \\
\hline require_row_f & ormat & & Yes & & Session & Yes \\
\hline require_secure & Yersnsport & Yes & Yes & & Global & Yes \\
\hline Resource_gro & up_supported & & & Yes & Global & No \\
\hline restrict_fk_on & Mes_standard & Kes & Yes & & Both & Yes \\
\hline resultset_meta & data & & Yes & & Session & Yes \\
\hline rewriter_enabl & led & & Yes & & Global & Yes \\
\hline rewriter_enabl & led_for_threads_without_privil & & Ages_checks & & Global & Yes \\
\hline Rewriter_num & \multicolumn{2}{|l|}{ber_loaded_rules} & & Yes & Global & No \\
\hline Rewriter_num & ber_reloads & & & Yes & Global & No \\
\hline Rewriter_num & \multicolumn{2}{|l|}{ber_rewritten_queries} & & Yes & Global & No \\
\hline Rewriter_reloa & d_error & & & Yes & Global & No \\
\hline rewriter_verbo & se & & Yes & & Global & Yes \\
\hline rpl_read_size & Yes & Yes & Yes & & Global & Yes \\
\hline Rpl_semi_syn & \multicolumn{2}{|l|}{c_master_clients} & & Yes & Global & No \\
\hline rpl_semi_syno & \multicolumn{2}{|l|}{Yreaster_enabl\&ces} & Yes & & Global & Yes \\
\hline Rpl_semi_syn & c_master_net & avg_wait_time & & Yes & Global & No \\
\hline Rpl_semi_syn & c_master_net_ & wait_time & & Yes & Global & No \\
\hline Rpl_semi_syn & c_master_net & waits & & Yes & Global & No \\
\hline Rpl_semi_syn & c_master_no_ti & times & & Yes & Global & No \\
\hline Rpl_semi_syn & c_master_no_tx & & & Yes & Global & No \\
\hline Rpl_semi_syn & & s & & Yes & Global & No \\
\hline Rpl_semi_syn & c_master_timef & unc_failures & & Yes & Global & No \\
\hline rpl_semi_syno & Yeaster_timeo & ortes & Yes & & Global & Yes \\
\hline rpl_semi_syno & Yeaster_trace & Yesel & Yes & & Global & Yes \\
\hline Rpl_semi_syn & & avg_wait_time & & Yes & Global & No \\
\hline Rpl_semi_syn & & wait_time & & Yes & Global & No \\
\hline Rpl_semi_syn & c_master_tx_w & waits & & Yes & Global & No \\
\hline rpl_semi_syng & Yreaster_wait_ & Øresslave_coun & Yes & & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline rpl_semi_sync_Yeaster_wait & nesslave & Yes & & Global & Yes \\
\hline rpl_semi_sync_Yeaster_wait & phest & Yes & & Global & Yes \\
\hline Rpl_semi_sync_master_wait & _pos_backtrave & erse & Yes & Global & No \\
\hline Rpl_semi_sync_master_wait & sessions & & Yes & Global & No \\
\hline Rpl_semi_sync_master_yes & tx & & Yes & Global & No \\
\hline rpl_semi_sync Yeplica_enabl & edces & Yes & & Global & Yes \\
\hline Rpl_semi_sync_replica_statu & s & & Yes & Global & No \\
\hline rpl_semi_sync Yeplica_trace & Yeasel & Yes & & Global & Yes \\
\hline rpl_semi_sync Yesve_enable & dYes & Yes & & Global & Yes \\
\hline Rpl_semi_sync_slave_status & & & Yes & Global & No \\
\hline rpl_semi_sync_Ystsve_trace_ & leves & Yes & & Global & Yes \\
\hline Rpl_semi_sync_source_clien & ts & & Yes & Global & No \\
\hline rpl_semi_sync_Yesurce_enabl & \&ces & Yes & & Global & Yes \\
\hline Rpl_semi_sync_source_net & avg_wait_time & & Yes & Global & No \\
\hline Rpl_semi_sync_source_net_ & wait_time & & Yes & Global & No \\
\hline Rpl_semi_sync_source_net_ & waits & & Yes & Global & No \\
\hline Rpl_semi_sync_source_no_ti & times & & Yes & Global & No \\
\hline Rpl_semi_sync_source_no_tx & tx & & Yes & Global & No \\
\hline Rpl_semi_sync_source_statu & s & & Yes & Global & No \\
\hline Rpl_semi_sync_source_timef & func_failures & & Yes & Global & No \\
\hline rpl_semi_sync_Yesurce_timeo & ơtes & Yes & & Global & Yes \\
\hline rpl_semi_sync_Yesurce_trace & Yeesel & Yes & & Global & Yes \\
\hline Rpl_semi_sync_source_tx_a & g_wait_time & & Yes & Global & No \\
\hline Rpl_semi_sync_source_tx_w & ait_time & & Yes & Global & No \\
\hline Rpl_semi_sync_source_tx_w & aits & & Yes & Global & No \\
\hline rpl_semi_sync_Yesurce_wait_ & freseplica_cou & ures & & Global & Yes \\
\hline rpl_semi_sync_Yesurce_wait & nøeseplica & Yes & & Global & Yes \\
\hline rpl_semi_sync_Yesurce_wait_ & ploeist & Yes & & Global & Yes \\
\hline Rpl_semi_sync_source_wait & pos_backtrave & erse & Yes & Global & No \\
\hline Rpl_semi_sync_source_wait & sessions & & Yes & Global & No \\
\hline Rpl_semi_sync_source_yes & tx & & Yes & Global & No \\
\hline rpl_stop_replicyetsmeout & Yes & Yes & & Global & Yes \\
\hline rpl_stop_slave Yterseout & Yes & Yes & & Global & Yes \\
\hline Rsa_public_key & & & Yes & Global & No \\
\hline safe-usercreate & Yes & & & & \\
\hline schema_definitites_cache & Yes & Yes & & Global & Yes \\
\hline secondary_engine_cost_thre & shold & Yes & & Session & Yes \\
\hline Secondary_engine_execution & _count & & Yes & Both & No \\
\hline secure_file_priYes & Yes & Yes & & Global & No \\
\hline Select_full_join & & & Yes & Both & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd－Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline Select＿full＿ra & ge＿join & & & Yes & Both & No \\
\hline select＿into＿bu & fYers size & Yes & Yes & & Both & Yes \\
\hline select＿into＿dis & Kesync & Yes & Yes & & Both & Yes \\
\hline select＿into＿dis & SKesync＿delay & Yes & Yes & & Both & Yes \\
\hline Select＿range & & & & Yes & Both & No \\
\hline Select＿range & check & & & Yes & Both & No \\
\hline Select＿scan & & & & Yes & Both & No \\
\hline server＿id & Yes & Yes & Yes & & Global & Yes \\
\hline server＿id＿bits & Yes & Yes & Yes & & Global & No \\
\hline server＿uuid & & & Yes & & Global & No \\
\hline session＿track & yeds & Yes & Yes & & Both & Yes \\
\hline session＿track & belsema & Yes & Yes & & Both & Yes \\
\hline session＿track & Sese＿change & Yes & Yes & & Both & Yes \\
\hline session＿track & bestem＿variab & Mess & Yes & & Both & Yes \\
\hline session＿track & Yesisaction＿in & fores & Yes & & Both & Yes \\
\hline set＿operation\＄ & Yesffer＿size & Yes & Yes & & Both & Yes \\
\hline sha256＿passy & wes\＄auto＿gen & efabe＿rsa＿keys & Yes & & Global & No \\
\hline sha256＿passw & ひes\＄＿private＿ke & eyesath & Yes & & Global & No \\
\hline sha256＿passw & ひes\＄＿proxy＿use & Yes & Yes & & Global & Yes \\
\hline sha256＿passy & ひew＿public＿key & Yesath & Yes & & Global & No \\
\hline shared＿memo & iyes & Yes & Yes & & Global & No \\
\hline shared＿memo & Nyebase＿name & Yes & Yes & & Global & No \\
\hline show＿create＿ & taleles＿skip＿sec & obrebary＿engine & Yes & & Session & Yes \\
\hline show＿create＿ & tylels＿verbosity & Yes & Yes & & Both & Yes \\
\hline show＿gipk＿in & resate＿table＿ & ałues informatio & Yesshema & & Both & Yes \\
\hline show－replica－ auth－info & Yes & Yes & & & & \\
\hline show－slave－ auth－info & Yes & Yes & & & & \\
\hline skip＿external & reesing & Yes & Yes & & Global & No \\
\hline skip－grant－ tables & Yes & Yes & & & & \\
\hline skip＿name＿re & sbese & Yes & Yes & & Global & No \\
\hline skip－ ndbcluster & Yes & Yes & & & & \\
\hline skip＿networkin & yes & Yes & Yes & & Global & No \\
\hline skip－new & Yes & Yes & & & & \\
\hline skip＿replica＿s & taus & Yes & Yes & & Global & No \\
\hline skip＿show＿da & tabase & Yes & Yes & & Global & No \\
\hline skip＿slave＿sta & Mes & Yes & Yes & & Global & No \\
\hline skip－stack－ trace & Yes & Yes & & & & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline slave_allow_bałelsing & Yes & Yes & & Global & Yes \\
\hline slave_checkpolyesgroup & Yes & Yes & & Global & Yes \\
\hline slave_checkpołkesperiod & Yes & Yes & & Global & Yes \\
\hline slave_compres\$esl_protocol & Yes & Yes & & Global & Yes \\
\hline slave_exec_mddes & Yes & Yes & & Global & Yes \\
\hline slave_load_tmpd由s & Yes & Yes & & Global & No \\
\hline slave_max_allowesd_packet & Yes & Yes & & Global & Yes \\
\hline slave_net_timebes & Yes & Yes & & Global & Yes \\
\hline Slave_open_temp_tables & & & Yes & Global & No \\
\hline slave_parallel_Yesse & Yes & Yes & & Global & Yes \\
\hline slave_parallel_Vesskers & Yes & Yes & & Global & Yes \\
\hline slave_pendingYebs_size_ma & Xes & Yes & & Global & Yes \\
\hline slave_preserveYesmmit_orde & Yes & Yes & & Global & Yes \\
\hline Slave_rows_last_search_alg & orithm_used & & Yes & Global & No \\
\hline slave_skip_errd'es & Yes & Yes & & Global & No \\
\hline slave-sql-verifychecksum & Yes & & & & \\
\hline slave_sql_verifyeshecksum & Yes & Yes & & Global & Yes \\
\hline slave_transactiøes retries & Yes & Yes & & Global & Yes \\
\hline slave_type_corMessions & Yes & Yes & & Global & Yes \\
\hline Slow_launch_threads & & & Yes & Both & No \\
\hline slow_launch_tihres & Yes & Yes & & Global & Yes \\
\hline Slow_queries & & & Yes & Both & No \\
\hline slow_query_logyes & Yes & Yes & & Global & Yes \\
\hline slow_query_log_gse & Yes & Yes & & Global & Yes \\
\hline slow-starttimeout & Yes & & & & \\
\hline socket & Yes & Yes & & Global & No \\
\hline sort_buffer_sizwes & Yes & Yes & & Both & Yes \\
\hline Sort_merge_passes & & & Yes & Both & No \\
\hline Sort_range & & & Yes & Both & No \\
\hline Sort_rows & & & Yes & Both & No \\
\hline Sort_scan & & & Yes & Both & No \\
\hline source_verify_droscksum & Yes & Yes & & Global & Yes \\
\hline sporadic-binlog-dumpfail & Yes & & & & \\
\hline sql_auto_is_null & & Yes & & Both & Yes \\
\hline sql_big_selects & & Yes & & Both & Yes \\
\hline sql_buffer_result & & Yes & & Both & Yes \\
\hline sql_generate_irreisible_prima & Nyesey & Yes & & Both & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline sql_log_bin & & & Yes & & Session & Yes \\
\hline sql_log_off & & & Yes & & Both & Yes \\
\hline sql_mode & Yes & Yes & Yes & & Both & Yes \\
\hline sql_notes & & & Yes & & Both & Yes \\
\hline sql_quote_sho & w_create & & Yes & & Both & Yes \\
\hline sql_replica_sk & ip_counter & & Yes & & Global & Yes \\
\hline sql_require_pr & ihresy_key & Yes & Yes & & Both & Yes \\
\hline sql_safe_upda & ates & & Yes & & Both & Yes \\
\hline sql_select_limit & & & Yes & & Both & Yes \\
\hline sql_slave_skip & _counter & & Yes & & Global & Yes \\
\hline sql_warnings & & & Yes & & Both & Yes \\
\hline Ssl_accept_re & negotiates & & & Yes & Global & No \\
\hline Ssl_accepts & & & & Yes & Global & No \\
\hline ssl_ca & Yes & Yes & Yes & & Global & Yes \\
\hline Ssl_callback_ & cache_hits & & & Yes & Global & No \\
\hline ssl_capath & Yes & Yes & Yes & & Global & Yes \\
\hline ssl_cert & Yes & Yes & Yes & & Global & Yes \\
\hline Ssl_cipher & & & & Yes & Both & No \\
\hline ssl_cipher & Yes & Yes & Yes & & Global & Yes \\
\hline Ssl_cipher_list & & & & Yes & Both & No \\
\hline Ssl_client_cor & nects & & & Yes & Global & No \\
\hline Ssl_connect_r & enegotiates & & & Yes & Global & No \\
\hline ssl_crl & Yes & Yes & Yes & & Global & Yes \\
\hline ssl_crlpath & Yes & Yes & Yes & & Global & Yes \\
\hline Ssl_ctx_verify & depth & & & Yes & Global & No \\
\hline Ssl_ctx_verify & mode & & & Yes & Global & No \\
\hline Ssl_default_tir & neout & & & Yes & Both & No \\
\hline Ssl_finished_a & accepts & & & Yes & Global & No \\
\hline Ssl_finished_c & connects & & & Yes & Global & No \\
\hline ssl_fips_mode & Yes & Yes & Yes & & Global & No \\
\hline ssl_key & Yes & Yes & Yes & & Global & Yes \\
\hline Ssl_server_not & _after & & & Yes & Both & No \\
\hline Ssl_server_not & _before & & & Yes & Both & No \\
\hline Ssl_session_c & ache_hits & & & Yes & Global & No \\
\hline Ssl_session_c & aache_misses & & & Yes & Global & No \\
\hline Ssl_session_q & ache_mode & & & Yes & Global & No \\
\hline ssl_session_c & alces_mode & Yes & Yes & & Global & Yes \\
\hline Ssl_session_d & ache_overflows & & & Yes & Global & No \\
\hline Ssl_session_c & ache_size & & & Yes & Global & No \\
\hline Ssl_session_c & ache_timeout & & & Yes & Global & No \\
\hline ssl_session_c & alces_timeout & Yes & Yes & & Global & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Name & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline Ssl_session_cache_timeouts & & & Yes & Global & No \\
\hline Ssl_sessions_reused & & & Yes & Session & No \\
\hline Ssl_used_session_cache_entries & & & Yes & Global & No \\
\hline Ssl_verify_depth & & & Yes & Both & No \\
\hline Ssl_verify_mode & & & Yes & Both & No \\
\hline Ssl_version & & & Yes & Both & No \\
\hline standalone & Yes & & & & \\
\hline statement_id & & Yes & & Session & No \\
\hline stored_progranyesache & Yes & Yes & & Global & Yes \\
\hline stored_progranyę\$efinition_ca & Ykes & Yes & & Global & Yes \\
\hline super-largepages & Yes & & & & \\
\hline super_read_onKes & Yes & Yes & & Global & Yes \\
\hline symboliclinks & Yes & & & & \\
\hline sync_binlog & Yes & Yes & & Global & Yes \\
\hline sync_master_ & Yes & Yes & & Global & Yes \\
\hline sync_relay_logYes & Yes & Yes & & Global & Yes \\
\hline sync_relay_logYesso & Yes & Yes & & Global & Yes \\
\hline sync_source_infes & Yes & Yes & & Global & Yes \\
\hline sysdate-isnow & Yes & & & & \\
\hline syseventlog.fadlity & Yes & Yes & & Global & Yes \\
\hline syseventlog.incłease_pid & Yes & Yes & & Global & Yes \\
\hline syseventlog.taớes & Yes & Yes & & Global & Yes \\
\hline system_time_zone & & Yes & & Global & No \\
\hline table_definitionYeache & Yes & Yes & & Global & Yes \\
\hline table_encryptioYesprivilege_ch & hees & Yes & & Global & Yes \\
\hline Table_locks_immediate & & & Yes & Global & No \\
\hline Table_locks_waited & & & Yes & Global & No \\
\hline table_open_cadles & Yes & Yes & & Global & Yes \\
\hline Table_open_cache_hits & & & Yes & Both & No \\
\hline table_open_cadles_instances & Yes & Yes & & Global & No \\
\hline Table_open_cache_misses & & & Yes & Both & No \\
\hline Table_open_cache_overflows & & & Yes & Both & No \\
\hline tablespace_defireision_cache & Yes & Yes & & Global & Yes \\
\hline tc-heuristicrecover & Yes & & & & \\
\hline Tc_log_max_pages_used & & & Yes & Global & No \\
\hline Tc_log_page_size & & & Yes & Global & No \\
\hline Tc_log_page_waits & & & Yes & Global & No \\
\hline Telemetry_metrics_supported & & & Yes & Global & No \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline Telemetry_tra & ces_supported & & & Yes & Global & No \\
\hline telemetry.live_ & sessions & & & Yes & Global & No \\
\hline telemetry.metr & ics_enabled & & Yes & & Global & No \\
\hline telemetry.metr & ics_reader_freq & quency_1 & Yes & & Global & No \\
\hline telemetry.metr & ics_reader_freq & quency_2 & Yes & & Global & No \\
\hline telemetry.metr & ics_reader_freq & quency_3 & Yes & & Global & No \\
\hline telemetry.otel & bsp_max_exp & ort_batch_size & Yes & & Global & No \\
\hline telemetry.otel & bsp_max_que & ue_size & Yes & & Global & No \\
\hline telemetry.otel & bsp_schedule & delay & Yes & & Global & No \\
\hline telemetry.otel & exporter_otlp & metrics_certific & yres & & Global & No \\
\hline telemetry.otel & exporter_otlp & metrics_cipher & Yes & & Global & No \\
\hline telemetry.otel & exporter_otlp & metrics_cipher & Yeste & & Global & No \\
\hline telemetry.otel & exporter_otlp & metrics_client & \&estificates & & Global & No \\
\hline telemetry.otel & exporter_otlp & metrics_client & Kes & & Global & No \\
\hline telemetry.otel & exporter_otlp & metrics_compr & resion & & Global & No \\
\hline telemetry.otel & exporter_otlp & metrics_endpo & Mes & & Global & No \\
\hline telemetry.otel & exporter_otlp & metrics_heade & nses & & Global & No \\
\hline telemetry.otel & exporter_otlp & metrics_max_t & t|\$es & & Global & No \\
\hline telemetry.otel & exporter_otlp & metrics_min_tl & SYes & & Global & No \\
\hline telemetry.otel & exporter_otlp & metrics_protoc & dles & & Global & No \\
\hline telemetry.otel & exporter_otlp & metrics_timeou & HYes & & Global & No \\
\hline telemetry.otel & exporter_otlp & traces_certifica & atess & & Global & No \\
\hline telemetry.otel & exporter_otlp & traces_cipher & Yes & & Global & No \\
\hline telemetry.otel & exporter_otlp & traces_cipher_ & Mebe & & Global & No \\
\hline telemetry.otel & exporter_otlp & traces_client_ & cencicates & & Global & No \\
\hline telemetry.otel & exporter_otlp & traces_client_k & kes & & Global & No \\
\hline telemetry.otel & exporter_otlp & traces_compre & すgon & & Global & No \\
\hline telemetry.otel & exporter_otlp & traces_endpoi & Yes & & Global & No \\
\hline telemetry.otel & exporter_otlp & traces_header & syes & & Global & No \\
\hline telemetry.otel & exporter_otlp & traces_max_tls & SYes & & Global & No \\
\hline telemetry.otel & exporter_otlp & traces_min_tls & Yes & & Global & No \\
\hline telemetry.otel & exporter_otlp & traces_protoco & Yes & & Global & No \\
\hline telemetry.otel & exporter_otlp & traces_timeout & Yes & & Global & No \\
\hline telemetry.otel & log_level & & Yes & & Global & Yes \\
\hline telemetry.otel & \multicolumn{2}{|l|}{resource_attributes} & Yes & & Global & No \\
\hline telemetry.quer & y_text_enabled & & Yes & & Global & Yes \\
\hline telemetry.trace & _enabled & & Yes & & Global & Yes \\
\hline temptable_ma & XYesmap & Yes & Yes & & Global & Yes \\
\hline temptable_ma & Xfeam & Yes & Yes & & Global & Yes \\
\hline temptable_use & Yersnap & Yes & Yes & & Global & Yes \\
\hline terminology_u & syęprevious & Yes & Yes & & Both & Yes \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd－Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline thread＿cache＿ & bies & Yes & Yes & & Global & Yes \\
\hline thread＿handlinges & & Yes & Yes & & Global & No \\
\hline thread＿pool＿algesithm & & Yes & Yes & & Global & No \\
\hline & thread＿pool＿dedesated＿listen & 四猎 & Yes & & Global & No \\
\hline & thread＿pool＿higlespriority＿cor & ryesction & Yes & & Both & Yes \\
\hline & thread＿pool＿lohegun＿trx＿limit & tYes & Yes & & Global & Yes \\
\hline & thread＿pool＿m\＆sactive＿que & Meshreads & Yes & & Global & Yes \\
\hline & thread＿pool＿m\＆stransaction & yelsimit & Yes & & Global & Yes \\
\hline & thread＿pool＿m\＆sunused＿th & neess & Yes & & Global & Yes \\
\hline & thread＿pool＿priæskickup＿time & eres & Yes & & Global & Yes \\
\hline thread＿pool＿qu & quersy＿threads & płesgroup & Yes & & Global & Yes \\
\hline thread＿pool＿si & iłes & Yes & Yes & & Global & No \\
\hline thread＿pool＿s & styltingslimit & Yes & Yes & & Global & Yes \\
\hline thread＿pool＿tr & ráresaction＿dela & yes & Yes & & Global & Yes \\
\hline thread＿stack & Yes & Yes & Yes & & Global & No \\
\hline Threads＿cache & ed & & & Yes & Global & No \\
\hline Threads＿conne & ected & & & Yes & Global & No \\
\hline Threads＿create & ed & & & Yes & Global & No \\
\hline Threads＿runnin & ing & & & Yes & Global & No \\
\hline time＿zone & & & Yes & & Both & Yes \\
\hline timestamp & & & Yes & & Session & Yes \\
\hline tls＿certificates & Yersorced＿vali & dation & Yes & & Global & No \\
\hline tls＿ciphersuite & syres & Yes & Yes & & Global & Yes \\
\hline TIs＿library＿ver & sion & & & Yes & Global & No \\
\hline Tls＿sni＿server＿ & ＿name & & & Yes & Session & No \\
\hline tls＿version & Yes & Yes & Yes & & Global & Yes \\
\hline tmp＿table＿size & eYes & Yes & Yes & & Both & Yes \\
\hline tmpdir & Yes & Yes & Yes & & Global & No \\
\hline transaction＿all女 & \＆esblock＿size & Yes & Yes & & Both & Yes \\
\hline transaction＿al & low＿batching & & Yes & & Session & Yes \\
\hline transaction＿is & oYæson & Yes & Yes & & Both & Yes \\
\hline transaction＿pr & Eatbc＿size & Yes & Yes & & Both & Yes \\
\hline transaction＿re & acesonly & Yes & Yes & & Both & Yes \\
\hline unique＿checks & & & Yes & & Both & Yes \\
\hline updatable＿view & Wreswith＿limit & Yes & Yes & & Both & Yes \\
\hline upgrade & Yes & Yes & & & & \\
\hline Uptime & & & & Yes & Global & No \\
\hline Uptime＿since＿ & flush＿status & & & Yes & Global & No \\
\hline use＿secondary & ＿engine & & Yes & & Session & Yes \\
\hline user & Yes & Yes & & & & \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|l|}
\hline Name & Cmd-Line & Option File & System Var & Status Var & Var Scope & Dynamic \\
\hline validateconfig & Yes & Yes & & & & \\
\hline validatepassword & Yes & Yes & & & & \\
\hline validate_pass & Woed_check_us & festame & Yes & & Global & Yes \\
\hline validate_passy & Moxd_dictionary & Yets & Yes & & Global & Yes \\
\hline validate_passw & word_dictionary & _file_last_pars & ed & Yes & Global & No \\
\hline validate_passw & word_dictionary & _file_words_co & count & Yes & Global & No \\
\hline validate_passy & Nołd_length & Yes & Yes & & Global & Yes \\
\hline validate_passy & Woed_mixed_ca & \&escount & Yes & & Global & Yes \\
\hline validate_passy & Mœt_number_ & cheasit & Yes & & Global & Yes \\
\hline validate_passy & Woed_policy & Yes & Yes & & Global & Yes \\
\hline validate_passv & Woed_special_c & CHæs count & Yes & & Global & Yes \\
\hline validate_passy & Mœd.changed & dresacters_pe & \&estage & & Global & Yes \\
\hline validate_passv & Mœd.check_use & Yesame & Yes & & Global & Yes \\
\hline validate_passy & Moed.dictionary & Yids & Yes & & Global & Yes \\
\hline validate_passw & word.dictionary & file_last_pars & ed & Yes & Global & No \\
\hline validate_passw & word.dictionary & file_words_co & unt & Yes & Global & No \\
\hline validate_passy & wœd.length & Yes & Yes & & Global & Yes \\
\hline validate_passy & Woed.mixed_ca & Hesount & Yes & & Global & Yes \\
\hline validate_passv & Noed.number_c & corest & Yes & & Global & Yes \\
\hline validate_passw & Noxd.policy & Yes & Yes & & Global & Yes \\
\hline validate_passy & Woed.special_ch & Yéscount & Yes & & Global & Yes \\
\hline validate-userplugins & Yes & Yes & & & & \\
\hline verbose & Yes & Yes & & & & \\
\hline version & & & Yes & & Global & No \\
\hline version_comm & ent & & Yes & & Global & No \\
\hline version_comp & le_machine & & Yes & & Global & No \\
\hline version_compi & le_os & & Yes & & Global & No \\
\hline version_comp & le_zlib & & Yes & & Global & No \\
\hline version_token & Yesssion & Yes & Yes & & Both & Yes \\
\hline version_token & SYesssion_num & 16es & Yes & & Both & No \\
\hline wait_timeout & Yes & Yes & Yes & & Both & Yes \\
\hline warning_count & & & Yes & & Session & No \\
\hline windowing_use & Yesigh_precisio & OYes & Yes & & Both & Yes \\
\hline xa_detach_on & γxespare & Yes & Yes & & Both & Yes \\
\hline
\end{tabular}

\section*{Notes:}
1. This option is dynamic, but should be set only by server. You should not set this variable manually.

