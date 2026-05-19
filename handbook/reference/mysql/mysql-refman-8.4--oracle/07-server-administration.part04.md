\section*{Persisting Sensitive System Variables}

MySQL 8.4 has the capability to store persisted system variable values containing sensitive data such as private keys or passwords securely, and to restrict viewing of the values. No MySQL Server system variables are currently marked as sensitive, but this capability allows system variables containing sensitive data to be persisted securely in the future. A mysqld-auto.cnf option file created by MySQL 8.4 cannot be read by older releases of MySQL Server.

> Note
> A keyring component must be enabled on the MySQL Server instance to support secure storage for persisted system variable values, rather than a keyring plugin, which do not support the function. See Section 8.4.4, "The MySQL Keyring".

In the mysqld-auto.cnf option file, the names and values of sensitive system variables are stored in an encrypted format, along with a generated file key to decrypt them. The generated file key is in turn encrypted using a master key (persisted_variables_key) that is stored in a keyring. When
the server starts up, the persisted sensitive system variables are decrypted and used. By default, if encrypted values are present in the option file but cannot be successfully decrypted at startup, their default settings are used. The optional most secure setting makes the server halt startup if the encrypted values cannot be decrypted.

The system variable persist_sensitive_variables_in_plaintext controls whether the server is permitted to store the values of sensitive system variables in an unencrypted format, if keyring component support is not available at the time when SET PERSIST is used to set the value. It also controls whether or not the server can start if the encrypted values cannot be decrypted.
- The default setting, ON, encrypts the values if keyring component support is available, and persists them unencrypted (with a warning) if it is not. The next time any persisted system variable is set, if keyring support is available at that time, the server encrypts the values of any unencrypted sensitive system variables. The ON setting also allows the server to start if encrypted system variable values cannot be decrypted, in which case a warning is issued and the default values for the system variables are used. In that situation, their values cannot be changed until they can be decrypted.
- The most secure setting, OFF, means sensitive system variable values cannot be persisted if keyring component support is unavailable. The 0FF setting also means the server does not start if encrypted system variable values cannot be decrypted.

The privilege SENSITIVE_VARIABLES_OBSERVER allows a holder to view the values of sensitive system variables in the Performance Schema tables global_variables, session_variables, variables_by_thread, and persisted_variables, to issue SELECT statements to return their values, and to track changes to them in session trackers for connections. Users without this privilege cannot view or track those system variable values.

If a SET statement is issued for a sensitive system variable, the query is rewritten to replace the value with "<redacted>" before it is logged to the general log and audit log. This takes place even if secure storage through a keyring component is not available on the server instance.

\subsection*{7.1.9.4 Nonpersistible and Persist-Restricted System Variables}

SET PERSIST and SET PERSIST_ONLY enable global system variables to be persisted to the mysqld-auto.cnf option file in the data directory (see Section 15.7.6.1, "SET Syntax for Variable Assignment"). However, not all system variables can be persisted, or can be persisted only under certain restrictive conditions. Here are some reasons why a system variable might be nonpersistible or persist-restricted:
- Session system variables cannot be persisted. Session variables cannot be set at server startup, so there is no reason to persist them.
- A global system variable might involve sensitive data such that it should be settable only by a user with direct access to the server host.
- A global system variable might be read only (that is, set only by the server). In this case, it cannot be set by users at all, whether at server startup or at runtime.
- A global system variable might be intended only for internal use.

Nonpersistible system variables cannot be persisted under any circumstances. Persist-restricted system variables can be persisted with SET PERSIST_ONLY, but only by users for which the following conditions are satisfied:
- The persist_only_admin_x509_subject system variable is set to an SSL certificate X. 509 Subject value.
- The user connects to the server using an encrypted connection and supplies an SSL certificate with the designated Subject value.
- The user has sufficient privileges to use SET PERSIST_ONLY (see Section 7.1.9.1, "System Variable Privileges").

For example, protocol_version is read only and set only by the server, so it cannot be persisted under any circumstances. On the other hand, bind_address is persist-restricted, so it can be set by users who satisfy the preceding conditions.

The following system variables are nonpersistible. This list may change with ongoing development.
```
audit_log_current_session
audit_log_filter_id
caching_sha2_password_digest_rounds
character_set_system
core_file
have_statement_timeout
have_symlink
hostname
innodb_version
keyring_hashicorp_auth_path
keyring_hashicorp_ca_path
keyring_hashicorp_caching
keyring_hashicorp_commit_auth_path
keyring_hashicorp_commit_ca_path
keyring_hashicorp_commit_caching
keyring_hashicorp_commit_role_id
keyring_hashicorp_commit_server_url
keyring_hashicorp_commit_store_path
keyring_hashicorp_role_id
keyring_hashicorp_secret_id
keyring_hashicorp_server_url
keyring_hashicorp_store_path
large_files_support
large_page_size
license
locked_in_memory
log_bin
log_bin_basename
log_bin_index
lower_case_file_system
ndb_version
ndb_version_string
persist_only_admin_x509_subject
persisted_globals_load
protocol_version
relay_log_basename
relay_log_index
server_uuid
skip_external_locking
system_time_zone
version_comment
version_compile_machine
version_compile_os
version_compile_zlib
```


Persist-restricted system variables are those that are read only and can be set on the command line or in an option file, other than persist_only_admin_x509_subject and persisted_globals_load. This list may change with ongoing development.
```
audit_log_file
audit_log_format
auto_generate_certs
basedir
bind_address
caching_sha2_password_auto_generate_rsa_keys
caching_sha2_password_private_key_path
caching_sha2_password_public_key_path
character_sets_dir
datadir
ft_stopword_file
init_file
innodb_buffer_pool_load_at_startup
innodb_data_file_path
innodb_data_home_dir
innodb_dedicated_server
```

```
innodb_directories
innodb_force_load_corrupted
innodb_log_group_home_dir
innodb_page_size
innodb_read_only
innodb_temp_data_file_path
innodb_temp_tablespaces_dir
innodb_undo_directory
innodb_undo_tablespaces
lc_messages_dir
log_error
mecab_rc_file
named_pipe
pid_file
plugin_dir
port
relay_log
replica_load_tmpdir
secure_file_priv
sha256_password_auto_generate_rsa_keys
sha256_password_private_key_path
sha256_password_public_key_path
shared_memory
shared_memory_base_name
skip_networking
slave_load_tmpdir
socket
ssl_ca
ssl_capath
ssl_cert
ssl_crl
ssl_crlpath
ssl_key
tmpdir
version_tokens_session_number
```


To configure the server to enable persisting persist-restricted system variables, use this procedure:
1. Ensure that MySQL is configured to support encrypted connections. See Section 8.3.1, "Configuring MySQL to Use Encrypted Connections".
2. Designate an SSL certificate X. 509 Subject value that signifies the ability to persist persistrestricted system variables, and generate a certificate that has that Subject. See Section 8.3.3, "Creating SSL and RSA Certificates and Keys".
3. Start the server with persist_only_admin_x509_subject set to the designated Subject value. For example, put these lines in your server my. cnf file:
```
[mysqld]
persist_only_admin_x509_subject="subject-value"
```


The format of the Subject value is the same as used for CREATE USER . . . REQUIRE SUBJECT. See Section 15.7.1.3, "CREATE USER Statement".

You must perform this step directly on the MySQL server host because persist_only_admin_x509_subject itself cannot be persisted at runtime.
4. Restart the server.
5. Distribute the SSL certificate that has the designated Subject value to users who are to be permitted to persist persist-restricted system variables.

Suppose that myclient-cert.pem is the SSL certificate to be used by clients who can persist persist-restricted system variables. Display the certificate contents using the openssl command:
```
$> openssl x509 -text -in myclient-cert.pem
Certificate:
    Data:
```

```
        Version: 3 (0x2)
        Serial Number: 2 (0x2)
    Signature Algorithm: md5WithRSAEncryption
        Issuer: C=US, ST=IL, L=Chicago, 0=MyOrg, OU=CA, CN=MyCN
        Validity
            Not Before: Oct 18 17:03:03 2018 GMT
            Not After : Oct 15 17:03:03 2028 GMT
        Subject: C=US, ST=IL, L=Chicago, 0=MyOrg, OU=client, CN=MyCN
...
```


The openssl output shows that the certificate Subject value is:
```
C=US, ST=IL, L=Chicago, 0=MyOrg, OU=client, CN=MyCN
```


To specify the Subject for MySQL, use this format:
```
/C=US/ST=IL/L=Chicago/O=MyOrg/OU=client/CN=MyCN
```


Configure the server my.cnf file with the Subject value:
```
[mysqld]
persist_only_admin_x509_subject="/C=US/ST=IL/L=Chicago/O=MyOrg/OU=client/CN=MyCN"
```


Restart the server so that the new configuration takes effect.
Distribute the SSL certificate (and any other associated SSL files) to the appropriate users. Such a user then connects to the server with the certificate and any other SSL options required to establish an encrypted connection.

To use X.509, clients must specify the--ssl-key and--ssl-cert options to connect. It is recommended but not required that--ssl-ca also be specified so that the public certificate provided by the server can be verified. For example:
```
$> mysql --ssl-key=myclient-key.pem --ssl-cert=myclient-cert.pem --ssl-ca=mycacert.pem
```


Assuming that the user has sufficient privileges to use SET PERSIST_ONLY, persist-restricted system variables can be persisted like this:
```
mysql> SET PERSIST_ONLY socket = '/tmp/mysql.sock';
Query OK, 0 rows affected (0.00 sec)
```


If the server is not configured to enable persisting persist-restricted system variables, or the user does not satisfy the required conditions for that capability, an error occurs:
```
mysql> SET PERSIST_ONLY socket = '/tmp/mysql.sock';
ERROR 1238 (HY000): Variable 'socket' is a non persistent read only variable
```


\subsection*{7.1.9.5 Structured System Variables}

A structured variable differs from a regular system variable in two respects:
- Its value is a structure with components that specify server parameters considered to be closely related.
- There might be several instances of a given type of structured variable. Each one has a different name and refers to a different resource maintained by the server.

MySQL supports one structured variable type, which specifies parameters governing the operation of key caches. A key cache structured variable has these components:
- key_buffer_size
- key_cache_block_size
- key_cache_division_limit
- key_cache_age_threshold

This section describes the syntax for referring to structured variables. Key cache variables are used for syntax examples, but specific details about how key caches operate are found elsewhere, in Section 10.10.2, "The MyISAM Key Cache".

To refer to a component of a structured variable instance, you can use a compound name in instance_name.component_name format. Examples:
```
hot_cache.key_buffer_size
hot_cache.key_cache_block_size
cold_cache.key_cache_block_size
```


For each structured system variable, an instance with the name of default is always predefined. If you refer to a component of a structured variable without any instance name, the default instance is used. Thus, default.key_buffer_size and key_buffer_size both refer to the same system variable.

Structured variable instances and components follow these naming rules:
- For a given type of structured variable, each instance must have a name that is unique within variables of that type. However, instance names need not be unique across structured variable types. For example, each structured variable has an instance named default, so default is not unique across variable types.
- The names of the components of each structured variable type must be unique across all system variable names. If this were not true (that is, if two different types of structured variables could share component member names), it would not be clear which default structured variable to use for references to member names that are not qualified by an instance name.
- If a structured variable instance name is not legal as an unquoted identifier, refer to it as a quoted identifier using backticks. For example, hot-cache is not legal, but ˋhot-cacheˋ is.
- global, session, and local are not legal instance names. This avoids a conflict with notation such as @@GLOBAL . var_name for referring to nonstructured system variables.

Currently, the first two rules have no possibility of being violated because the only structured variable type is the one for key caches. These rules may assume greater significance if some other type of structured variable is created in the future.

With one exception, you can refer to structured variable components using compound names in any context where simple variable names can occur. For example, you can assign a value to a structured variable using a command-line option:
```
$> mysqld --hot_cache.key_buffer_size=64K
```


In an option file, use this syntax:
```
[mysqld]
hot_cache.key_buffer_size=64K
```


If you start the server with this option, it creates a key cache named hot_cache with a size of 64 KB in addition to the default key cache that has a default size of 8 MB .

Suppose that you start the server as follows:
```
$> mysqld --key_buffer_size=256K \
    --extra_cache.key_buffer_size=128K \
    --extra_cache.key_cache_block_size=2048
```


In this case, the server sets the size of the default key cache to 256 KB . (You could also have written --default.key_buffer_size=256K.) In addition, the server creates a second key cache named extra_cache that has a size of 128 KB , with the size of block buffers for caching table index blocks set to 2048 bytes.

The following example starts the server with three different key caches having sizes in a 3:1:1 ratio:
```
$> mysqld --key_buffer_size=6M \
```

```
--hot_cache.key_buffer_size=2M \
--cold_cache.key_buffer_size=2M
```


Structured variable values may be set and retrieved at runtime as well. For example, to set a key cache named hot_cache to a size of 10 MB , use either of these statements:
```
mysql> SET GLOBAL hot_cache.key_buffer_size = 10*1024*1024;
mysql> SET @@GLOBAL.hot_cache.key_buffer_size = 10*1024*1024;
```


To retrieve the cache size, do this:
```
mysql> SELECT @@GLOBAL.hot_cache.key_buffer_size;
```


However, the following statement does not work. The variable is not interpreted as a compound name, but as a simple string for a LIKE pattern-matching operation:
```
mysql> SHOW GLOBAL VARIABLES LIKE 'hot_cache.key_buffer_size';
```


This is the exception to being able to use structured variable names anywhere a simple variable name may occur.

\subsection*{7.1.10 Server Status Variables}

The MySQL server maintains many status variables that provide information about its operation. You can view these variables and their values by using the SHOW [GLOBAL | SESSION] STATUS statement (see Section 15.7.7.37, "SHOW STATUS Statement"). The optional GLOBAL keyword aggregates the values over all connections, and SESSION shows the values for the current connection.
```
mysql> SHOW GLOBAL STATUS;
+-------------------------------------+-----------+
| Variable_name | Value |
+------------------------------------+-----------+
| Aborted_clients | 0
| Aborted_connects | 0
| Bytes_received | 155372598
| Bytes_sent | 1176560426 |
...
| Connections | 30023
| Created_tmp_disk_tables | 0
| Created_tmp_files | 3
| Created_tmp_tables | 2
...
| Threads_created | 217
| Threads_running | 88
| Uptime | 1389872 |
+------------------------------------+-----------+
```


Many status variables are reset to 0 by the FLUSH STATUS statement.
This section provides a description of each status variable. For a status variable summary, see Section 7.1.6, "Server Status Variable Reference". For information about status variables specific to NDB Cluster, see NDB Cluster Status Variables.

The status variables have the following meanings.
- Aborted_clients

The number of connections that were aborted because the client died without closing the connection properly. See Section B.3.2.9, "Communication Errors and Aborted Connections".
- Aborted_connects

The number of failed attempts to connect to the MySQL server. See Section B.3.2.9, "Communication Errors and Aborted Connections".

For additional connection-related information, check the Connection_errors_xxx status variables and the host_cache table.
- Authentication_ldap_sasl_supported_methods

The authentication_ldap_sasl plugin that implements SASL LDAP authentication supports multiple authentication methods, but depending on host system configuration, they might not all be available. The Authentication_ldap_sasl_supported_methods variable provides discoverability for the supported methods. Its value is a string consisting of supported method names separated by spaces. Example: "SCRAM-SHA 1 SCRAM-SHA-256 GSSAPI"
- Binlog_cache_disk_use

The number of transactions that used the temporary binary log cache but that exceeded the value of binlog_cache_size and used a temporary file to store statements from the transaction.

The number of nontransactional statements that caused the binary log transaction cache to be written to disk is tracked separately in the Binlog_stmt_cache_disk_use status variable.
- Acl_cache_items_count

The number of cached privilege objects. Each object is the privilege combination of a user and its active roles.
- Binlog_cache_use

The number of transactions that used the binary log cache.
- Binlog_stmt_cache_disk_use

The number of nontransaction statements that used the binary log statement cache but that exceeded the value of binlog_stmt_cache_size and used a temporary file to store those statements.
- Binlog_stmt_cache_use

The number of nontransactional statements that used the binary log statement cache.
- Bytes_received

The number of bytes received from all clients.
- Bytes_sent

The number of bytes sent to all clients.
- Caching_sha2_password_rsa_public_key

The public key used by the caching_sha2_password authentication plugin for RSA key pairbased password exchange. The value is nonempty only if the server successfully initializes the private and public keys in the files named by the caching_sha2_password_private_key_path and caching_sha2_password_public_key_path system variables. The value of Caching_sha2_password_rsa_public_key comes from the latter file.
- Com_xxx

The Com_xxx statement counter variables indicate the number of times each $x x x$ statement has been executed. There is one status variable for each type of statement. For example, Com_delete and Com_update count DELETE and UPDATE statements, respectively. Com_delete_multi and Com_update_multi are similar but apply to DELETE and UPDATE statements that use multipletable syntax.

All Com_stmt_ $x x x$ variables are increased even if a prepared statement argument is unknown or an error occurred during execution. In other words, their values correspond to the number of requests issued, not to the number of requests successfully completed. For example, because status variables are initialized for each server startup and do not persist across restarts, the Com_restart
and Com_shutdown variables that track RESTART and SHUTDOWN statements normally have a value of zero, but can be nonzero if RESTART or SHUTDOWN statements were executed but failed.

The Com_stmt_xxx status variables are as follows:
- Com_stmt_prepare
- Com_stmt_execute
- Com_stmt_fetch
- Com_stmt_send_long_data
- Com_stmt_reset
- Com_stmt_close

Those variables stand for prepared statement commands. Their names refer to the COM_xxx command set used in the network layer. In other words, their values increase whenever prepared statement API calls such as mysql_stmt_prepare(), mysql_stmt_execute(), and so forth are executed. However, Com_stmt_prepare, Com_stmt_execute and Com_stmt_close also increase for PREPARE, EXECUTE, or DEALLOCATE PREPARE, respectively. Additionally, the values of the older statement counter variables Com_prepare_sql, Com_execute_sql, and Com_dealloc_sql increase for the PREPARE, EXECUTE, and DEALLOCATE PREPARE statements. Com_stmt_fetch stands for the total number of network round-trips issued when fetching from cursors.

Com_stmt_reprepare indicates the number of times statements were automatically reprepared by the server, for example, after metadata changes to tables or views referred to by the statement. A reprepare operation increments Com_stmt_reprepare, and also Com_stmt_prepare.

Com_explain_other indicates the number of EXPLAIN FOR CONNECTION statements executed. See Section 10.8.4, "Obtaining Execution Plan Information for a Named Connection".

Com_change_repl_filter indicates the number of CHANGE REPLICATION FILTER statements executed.
- Compression

Whether the client connection uses compression in the client/server protocol.
This status variable is deprecated; expect it to be removed in a future version of MySQL. See Configuring Legacy Connection Compression.
- Compression_algorithm

The name of the compression algorithm in use for the current connection to the server. The value can be any algorithm permitted in the value of the protocol_compression_algorithms system variable. For example, the value is uncompressed if the connection does not use compression, or zlib if the connection uses the zlib algorithm.

For more information, see Section 6.2.8, "Connection Compression Control".
- Compression_level

The compression level in use for the current connection to the server. The value is 6 for zlib connections (the default zlib algorithm compression level), 1 to 22 for zstd connections, and 0 for uncompressed connections.

For more information, see Section 6.2.8, "Connection Compression Control".
- Connection_errors_xxx

These variables provide information about errors that occur during the client connection process. They are global only and represent error counts aggregated across connections from all hosts. These variables track errors not accounted for by the host cache (see Section 7.1.12.3, "DNS Lookups and the Host Cache"), such as errors that are not associated with TCP connections, occur very early in the connection process (even before an IP address is known), or are not specific to any particular IP address (such as out-of-memory conditions).
- Connection_errors_accept

The number of errors that occurred during calls to accept ( ) on the listening port.
- Connection_errors_internal

The number of connections refused due to internal errors in the server, such as failure to start a new thread or an out-of-memory condition.
- Connection_errors_max_connections

The number of connections refused because the server max_connections limit was reached.
- Connection_errors_peer_address

The number of errors that occurred while searching for connecting client IP addresses.
- Connection_errors_select

The number of errors that occurred during calls to select ( ) or poll( ) on the listening port. (Failure of this operation does not necessarily means a client connection was rejected.)
- Connection_errors_tcpwrap

The number of connections refused by the libwrap library.
- Connections

The number of connection attempts (successful or not) to the MySQL server.
- Created_tmp_disk_tables

The number of internal on-disk temporary tables created by the server while executing statements.
You can compare the number of internal on-disk temporary tables created to the total number of internal temporary tables created by comparing Created_tmp_disk_tables and Created_tmp_tables values.

\section*{Note}

Due to a known limitation, Created_tmp_disk_tables does not count on-disk temporary tables created in memory-mapped files. By default, the TempTable storage engine overflow mechanism creates internal temporary tables in memory-mapped files. This behavior is controlled by the temptable_use_mmap variable.

See also Section 10.4.4, "Internal Temporary Table Use in MySQL".
- Created_tmp_files

How many temporary files mysqld has created.
- Created_tmp_tables

The number of internal temporary tables created by the server while executing statements.
You can compare the number of internal on-disk temporary tables created to the total number of internal temporary tables created by comparing Created_tmp_disk_tables and Created_tmp_tables values.

See also Section 10.4.4, "Internal Temporary Table Use in MySQL".
Each invocation of the SHOW STATUS statement uses an internal temporary table and increments the global Created_tmp_tables value.
- Current_tls_ca

The active ssl_ca value in the SSL context that the server uses for new connections. This context value may differ from the current ssl_ca system variable value if the system variable has been changed but ALTER INSTANCE RELOAD TLS has not subsequently been executed to reconfigure the SSL context from the context-related system variable values and update the corresponding status variables. (This potential difference in values applies to each corresponding pair of contextrelated system and status variables. See Server-Side Runtime Configuration and Monitoring for Encrypted Connections.)

The Current_tls_xxx status variable values are also available through the Performance Schema tls_channel_status table. See Section 29.12.22.9, "The tls_channel_status Table".
- Current_tls_capath

The active ssl_capath value in the TLS context that the server uses for new connections. For notes about the relationship between this status variable and its corresponding system variable, see the description of Current_tls_ca.
- Current_tls_cert

The active ssl_cert value in the TLS context that the server uses for new connections. For notes about the relationship between this status variable and its corresponding system variable, see the description of Current_tls_ca.
- Current_tls_cipher

The active ssl_cipher value in the TLS context that the server uses for new connections. For notes about the relationship between this status variable and its corresponding system variable, see the description of Current_tls_ca.
- Current_tls_ciphersuites

The active tls_ciphersuites value in the TLS context that the server uses for new connections. For notes about the relationship between this status variable and its corresponding system variable, see the description of Current_tls_ca.
- Current_tls_crl

The active ssl_crl value in the TLS context that the server uses for new connections. For notes about the relationship between this status variable and its corresponding system variable, see the description of Current_tls_ca.

\section*{Note}

When you reload the TLS context, OpenSSL reloads the file containing the CRL (certificate revocation list) as part of the process. If the CRL file is large, the server allocates a large chunk of memory (ten times the file size), which is doubled while the new instance is being loaded and the old one has not
> yet been released. The process resident memory is not immediately reduced after a large allocation is freed, so if you issue the ALTER INSTANCE RELOAD TLS statement repeatedly with a large CRL file, the process resident memory usage may grow as a result of this.
- Current_tls_crlpath

The active ssl_crlpath value in the TLS context that the server uses for new connections. For notes about the relationship between this status variable and its corresponding system variable, see the description of Current_tls_ca.
- Current_tls_key

The active ssl_key value in the TLS context that the server uses for new connections. For notes about the relationship between this status variable and its corresponding system variable, see the description of Current_tls_ca.
- Current_tls_version

The active tls_version value in the TLS context that the server uses for new connections. For notes about the relationship between this status variable and its corresponding system variable, see the description of Current_tls_ca.
- Delayed_errors

This status variable is deprecated (because DELAYED inserts are not supported); expect it to be removed in a future release.
- Delayed_insert_threads

This status variable is deprecated (because DELAYED inserts are not supported); expect it to be removed in a future release.
- Delayed_writes

This status variable is deprecated (because DELAYED inserts are not supported); expect it to be removed in a future release.
- Deprecated_use_i_s_processlist_count

How many times the information_schema.processlist table has been accessed since the last restart.
- Deprecated_use_i_s_processlist_last_timestamp

A timestamp indicating the last time the information_schema.processlist table has been accessed since the last restart. Shows microseconds since the Unix Epoch.
- dragnet.Status

The result of the most recent assignment to the dragnet. log_error_filter_rules system variable, empty if no such assignment has occurred.
- Error_log_buffered_bytes

The number of bytes currently used in the Performance Schema error_log table. It is possible for the value to decrease, for example, if a new event cannot fit until discarding an old event, but the new event is smaller than the old one.
- Error_log_buffered_events

The number of events currently present in the Performance Schema error_log table. As with Error_log_buffered_bytes, it is possible for the value to decrease.
- Error_log_expired_events

The number of events discarded from the Performance Schema error_log table to make room for new events.
- Error_log_latest_write

The time of the last write to the Performance Schema error_log table.
- Flush_commands

The number of times the server flushes tables, whether because a user executed a FLUSH TABLES statement or due to internal server operation. It is also incremented by receipt of a COM_REFRESH packet. This is in contrast to Com_flush, which indicates how many FLUSH statements have been executed, whether FLUSH TABLES, FLUSH LOGS, and so forth.
- Global_connection_memory

The memory used by all user connections to the server. Memory used by system threads or by the MySQL root account is included in the total, but such threads or users are not subject to disconnection due to memory usage. This memory is not calculated unless global_connection_memory_tracking is enabled (disabled by default). The Performance Schema must also be enabled.

You can control (indirectly) the frequency with which this variable is updated by setting connection_memory_chunk_size.
- Handler_commit

The number of internal COMMIT statements.
- Handler_delete

The number of times that rows have been deleted from tables.
- Handler_external_lock

The server increments this variable for each call to its external_lock ( ) function, which generally occurs at the beginning and end of access to a table instance. There might be differences among storage engines. This variable can be used, for example, to discover for a statement that accesses a partitioned table how many partitions were pruned before locking occurred: Check how much the counter increased for the statement, subtract 2 ( 2 calls for the table itself), then divide by 2 to get the number of partitions locked.
- Handler_mrr_init

The number of times the server uses a storage engine's own Multi-Range Read implementation for table access.
- Handler_prepare

A counter for the prepare phase of two-phase commit operations.
- Handler_read_first

The number of times the first entry in an index was read. If this value is high, it suggests that the server is doing a lot of full index scans (for example, SELECT col1 FROM foo, assuming that col1 is indexed).
- Handler_read_key

The number of requests to read a row based on a key. If this value is high, it is a good indication that your tables are properly indexed for your queries.
- Handler_read_last

The number of requests to read the last key in an index. With ORDER BY, the server issues a firstkey request followed by several next-key requests, whereas with ORDER BY DESC, the server issues a last-key request followed by several previous-key requests.
- Handler_read_next

The number of requests to read the next row in key order. This value is incremented if you are querying an index column with a range constraint or if you are doing an index scan.
- Handler_read_prev

The number of requests to read the previous row in key order. This read method is mainly used to optimize ORDER BY ... DESC.
- Handler_read_rnd

The number of requests to read a row based on a fixed position. This value is high if you are doing a lot of queries that require sorting of the result. You probably have a lot of queries that require MySQL to scan entire tables or you have joins that do not use keys properly.
- Handler_read_rnd_next

The number of requests to read the next row in the data file. This value is high if you are doing a lot of table scans. Generally this suggests that your tables are not properly indexed or that your queries are not written to take advantage of the indexes you have.
- Handler_rollback

The number of requests for a storage engine to perform a rollback operation.
- Handler_savepoint

The number of requests for a storage engine to place a savepoint.
- Handler_savepoint_rollback

The number of requests for a storage engine to roll back to a savepoint.
- Handler_update

The number of requests to update a row in a table.
- Handler_write

The number of requests to insert a row in a table.
- Innodb_buffer_pool_dump_status

The progress of an operation to record the pages held in the InnoDB buffer pool, triggered by the setting of innodb_buffer_pool_dump_at_shutdown or innodb_buffer_pool_dump_now.

For related information and examples, see Section 17.8.3.6, "Saving and Restoring the Buffer Pool State".
- Innodb_buffer_pool_load_status

The progress of an operation to warm up the InnoDB buffer pool by reading in a set of pages corresponding to an earlier point in time, triggered by the setting of innodb_buffer_pool_load_at_startup or innodb_buffer_pool_load_now. If the operation introduces too much overhead, you can cancel it by setting innodb_buffer_pool_load_abort.

For related information and examples, see Section 17.8.3.6, "Saving and Restoring the Buffer Pool State".
- Innodb_buffer_pool_bytes_data

The total number of bytes in the InnoDB buffer pool containing data. The number includes both dirty and clean pages. For more accurate memory usage calculations than with Innodb_buffer_pool_pages_data, when compressed tables cause the buffer pool to hold pages of different sizes.
- Innodb_buffer_pool_pages_data

The number of pages in the InnoDB buffer pool containing data. The number includes both dirty and clean pages. When using compressed tables, the reported Innodb_buffer_pool_pages_data value may be larger than Innodb_buffer_pool_pages_total (Bug \#59550).
- Innodb_buffer_pool_bytes_dirty

The total current number of bytes held in dirty pages in the InnoDB buffer pool. For more accurate memory usage calculations than with Innodb_buffer_pool_pages_dirty, when compressed tables cause the buffer pool to hold pages of different sizes.
- Innodb_buffer_pool_pages_dirty

The current number of dirty pages in the InnoDB buffer pool.
- Innodb_buffer_pool_pages_flushed

The number of requests to flush pages from the InnoDB buffer pool.
- Innodb_buffer_pool_pages_free

The number of free pages in the InnoDB buffer pool.
- Innodb_buffer_pool_pages_latched

The number of latched pages in the InnoDB buffer pool. These are pages currently being read or written, or that cannot be flushed or removed for some other reason. Calculation of this variable is expensive, so it is available only when the UNIV_DEBUG system is defined at server build time.
- Innodb_buffer_pool_pages_misc

The number of pages in the InnoDB buffer pool that are busy because they have been allocated for administrative overhead, such as row locks or the adaptive hash index. This value can also be calculated as Innodb_buffer_pool_pages_total Innodb_buffer_pool_pages_free - Innodb_buffer_pool_pages_data. When using compressed tables, Innodb_buffer_pool_pages_misc may report an out-of-bounds value (Bug \#59550).
- Innodb_buffer_pool_pages_total

The total size of the InnoDB buffer pool, in pages. When using compressed tables, the reported Innodb_buffer_pool_pages_data value may be larger than Innodb_buffer_pool_pages_total (Bug \#59550)
- Innodb_buffer_pool_read_ahead

The number of pages read into the InnoDB buffer pool by the read-ahead background thread.
- Innodb_buffer_pool_read_ahead_evicted

The number of pages read into the InnoDB buffer pool by the read-ahead background thread that were subsequently evicted without having been accessed by queries.
- Innodb_buffer_pool_read_ahead_rnd

The number of "random" read-aheads initiated by InnoDB. This happens when a query scans a large portion of a table but in random order.
- Innodb_buffer_pool_read_requests

The number of logical read requests.
- Innodb_buffer_pool_reads

The number of logical reads that InnoDB could not satisfy from the buffer pool, and had to read directly from disk.
- Innodb_buffer_pool_resize_status

The status of an operation to resize the InnoDB buffer pool dynamically, triggered by setting the innodb_buffer_pool_size parameter dynamically. The innodb_buffer_pool_size parameter is dynamic, which allows you to resize the buffer pool without restarting the server. See Configuring InnoDB Buffer Pool Size Online for related information.
- Innodb_buffer_pool_resize_status_code

Reports status codes for tracking online buffer pool resizing operations. Each status code represents a stage in a resizing operation. Status codes include:
- 0 : No Resize operation in progress
- 1: Starting Resize
- 2: Disabling AHI (Adaptive Hash Index)
- 3: Withdrawing Blocks
- 4: Acquiring Global Lock
- 5: Resizing Pool
- 6: Resizing Hash
- 7: Resizing Failed

You can use this status variable in conjunction with
Innodb_buffer_pool_resize_status_progress to track the progress of each stage of a resizing operation. The Innodb_buffer_pool_resize_status_progress variable reports a percentage value indicating the progress of the current stage.

For more information, see Monitoring Online Buffer Pool Resizing Progress.
- Innodb_buffer_pool_resize_status_progress

Reports a percentage value indicating the progress of the current stage of an online buffer pool resizing operation. This variable is used in conjunction with

Innodb_buffer_pool_resize_status_code, which reports a status code indicating the current stage of an online buffer pool resizing operation.

The percentage value is updated after each buffer pool instance is processed. As the status code (reported by Innodb_buffer_pool_resize_status_code) changes from one status to another, the percentage value is reset to 0 .

For related information, see Monitoring Online Buffer Pool Resizing Progress.
- Innodb_buffer_pool_wait_free

Normally, writes to the InnoDB buffer pool happen in the background. When InnoDB needs to read or create a page and no clean pages are available, InnoDB flushes some dirty pages first and waits for that operation to finish. This counter counts instances of these waits. If innodb_buffer_pool_size has been set properly, this value should be small.
- Innodb_buffer_pool_write_requests

The number of writes done to the InnoDB buffer pool.
- Innodb_data_fsyncs

The number of fsync ( ) operations so far. The frequency of fsync ( ) calls is influenced by the setting of the innodb_flush_method configuration option.

Counts the number of fdatasync() operations if innodb_use_fdatasync is enabled.
- Innodb_data_pending_fsyncs

The current number of pending fsync ( ) operations. The frequency of fsync ( ) calls is influenced by the setting of the innodb_flush_method configuration option.
- Innodb_data_pending_reads

The current number of pending reads.
- Innodb_data_pending_writes

The current number of pending writes.
- Innodb_data_read

The amount of data read since the server was started (in bytes).
- Innodb_data_reads

The total number of data reads (OS file reads).
- Innodb_data_writes

The total number of data writes.
- Innodb_data_written

The amount of data written so far, in bytes.
- Innodb_dblwr_pages_written

The number of pages that have been written to the doublewrite buffer. See Section 17.11.1, "InnoDB Disk I/O".
- Innodb_dblwr_writes

The number of doublewrite operations that have been performed. See Section 17.11.1, "InnoDB Disk I/O".
- Innodb_have_atomic_builtins

Indicates whether the server was built with atomic instructions.
- Innodb_log_waits

The number of times that the log buffer was too small and a wait was required for it to be flushed before continuing.
- Innodb_log_write_requests

The number of write requests for the InnoDB redo log.
- Innodb_log_writes

The number of physical writes to the InnoDB redo log file.
- Innodb_num_open_files

The number of files InnoDB currently holds open.
- Innodb_os_log_fsyncs

The number of fsync ( ) writes done to the InnoDB redo log files.
- Innodb_os_log_pending_fsyncs

The number of pending fsync ( ) operations for the InnoDB redo log files.
- Innodb_os_log_pending_writes

The number of pending writes to the InnoDB redo log files.
- Innodb_os_log_written

The number of bytes written to the InnoDB redo log files.
- Innodb_page_size

InnoDB page size (default 16KB). Many values are counted in pages; the page size enables them to be easily converted to bytes.
- Innodb_pages_created

The number of pages created by operations on InnoDB tables.
- Innodb_pages_read

The number of pages read from the InnoDB buffer pool by operations on InnoDB tables.
- Innodb_pages_written

The number of pages written by operations on InnoDB tables.
- Innodb_redo_log_enabled

Whether redo logging is enabled or disabled. See Disabling Redo Logging.
- Innodb_redo_log_capacity_resized

The total redo log capacity for all redo log files, in bytes, after the last completed capacity resize operation. The value includes ordinary and spare redo log files.

If there is no pending resize down operation, Innodb_redo_log_capacity_resized should be equal to the innodb_redo_log_capacity setting if it's used, or it's ((innodb_log_files_in_group *innodb_log_file_size)) if those are used instead. See the innodb_redo_log_capacity documentation for further clarification. Resize up operations are instantaneous.

For related information, see Section 17.6.5, "Redo Log".
- Innodb_redo_log_checkpoint_lsn

The redo log checkpoint LSN. For related information, see Section 17.6.5, "Redo Log".
- Innodb_redo_log_current_lsn

The current LSN represents the last written position in the redo log buffer. InnoDB writes data to the redo log buffer inside the MySQL process before requesting that the operating system write the data to the current redo log file. For related information, see Section 17.6.5, "Redo Log".
- Innodb_redo_log_flushed_to_disk_lsn

The flushed-to-disk LSN. InnoDB first writes data to the redo log and then requests that the operating system flush the data to disk. The flushed-to-disk LSN represents the last position in the redo log that InnoDB knows has been flushed to disk. For related information, see Section 17.6.5, "Redo Log".
- Innodb_redo_log_logical_size

A data size value, in bytes, representing the LSN range containing in-use redo log data, spanning from the oldest block required by redo log consumers to the latest written block. For related information, see Section 17.6.5, "Redo Log".
- Innodb_redo_log_physical_size

The amount of disk space in bytes currently consumed by all redo log files on disk, excluding spare redo log files. For related information, see Section 17.6.5, "Redo Log".
- Innodb_redo_log_read_only

Whether the redo log is read-only.
- Innodb_redo_log_resize_status

The redo log resize status indicating the current state of the redo log capacity resize mechanism.
Possible values include:
- OK: There are no issues and no pending redo log capacity resize operations.
- Resizing down: A resize down operation is in progress.

A resize up operation is instantaneous and therefore has no pending status.
- Innodb_redo_log_uuid

The redo log UUID.
- Innodb_row_lock_current_waits

The number of row locks currently waited for by operations on InnoDB tables.
- Innodb_row_lock_time

The total time spent in acquiring row locks for InnoDB tables, in milliseconds.
- Innodb_row_lock_time_avg

The average time to acquire a row lock for InnoDB tables, in milliseconds.
- Innodb_row_lock_time_max

The maximum time to acquire a row lock for InnoDB tables, in milliseconds.
- Innodb_row_lock_waits

The number of times operations on InnoDB tables had to wait for a row lock.
- Innodb_rows_deleted

The number of rows deleted from InnoDB tables.
- Innodb_rows_inserted

The number of rows inserted into InnoDB tables.
- Innodb_rows_read

The number of rows read from InnoDB tables.
- Innodb_rows_updated

The estimated number of rows updated in InnoDB tables.

\section*{Note}

This value is not meant to be $100 \%$ accurate. For an accurate (but more expensive) result, use ROW_COUNT( ).
- Innodb_system_rows_deleted

The number of rows deleted from InnoDB tables belonging to system-created schemas.
- Innodb_system_rows_inserted

The number of rows inserted into InnoDB tables belonging to system-created schemas.
- Innodb_system_rows_updated

The number of rows updated in InnoDB tables belonging to system-created schemas.
- Innodb_system_rows_read

The number of rows read from InnoDB tables belonging to system-created schemas.
- Innodb_truncated_status_writes

The number of times output from the SHOW ENGINE INNODB STATUS statement has been truncated.
- Innodb_undo_tablespaces_active

The number of active undo tablespaces. Includes both implicit (InnoDB-created) and explicit (usercreated) undo tablespaces. For information about undo tablespaces, see Section 17.6.3.4, "Undo Tablespaces".
- Innodb_undo_tablespaces_explicit

The number of user-created undo tablespaces. For information about undo tablespaces, see Section 17.6.3.4, "Undo Tablespaces".
- Innodb_undo_tablespaces_implicit

The number of undo tablespaces created by InnoDB. Two default undo tablespaces are created by InnoDB when the MySQL instance is initialized. For information about undo tablespaces, see Section 17.6.3.4, "Undo Tablespaces".
- Innodb_undo_tablespaces_total

The total number of undo tablespaces. Includes both implicit (InnoDB-created) and explicit (usercreated) undo tablespaces, active and inactive. For information about undo tablespaces, see Section 17.6.3.4, "Undo Tablespaces".
- Key_blocks_not_flushed

The number of key blocks in the MyISAM key cache that have changed but have not yet been flushed to disk.
- Key_blocks_unused

The number of unused blocks in the MyISAM key cache. You can use this value to determine how much of the key cache is in use; see the discussion of key_buffer_size in Section 7.1.8, "Server System Variables".
- Key_blocks_used

The number of used blocks in the MyISAM key cache. This value is a high-water mark that indicates the maximum number of blocks that have ever been in use at one time.
- Key_read_requests

The number of requests to read a key block from the MyISAM key cache.
- Key_reads

The number of physical reads of a key block from disk into the MyISAM key cache. If Key_reads is large, then your key_buffer_size value is probably too small. The cache miss rate can be calculated as Key_reads/Key_read_requests.
- Key_write_requests

The number of requests to write a key block to the MyISAM key cache.
- Key_writes

The number of physical writes of a key block from the MyISAM key cache to disk.
- Last_query_cost

The total cost of the last compiled query as computed by the query optimizer. This is useful for comparing the cost of different query plans for the same query. The default value of 0 means that no query has been compiled yet. The default value is 0 . Last_query_cost has session scope.

This variable shows the cost of queries that have multiple query blocks, summing the cost estimates of each query block, estimating how many times non-cacheable subqueries are executed, and multiplying the cost of those query blocks by the number of subquery executions.
- Last_query_partial_plans

The number of iterations the query optimizer made in execution plan construction for the previous query.

Last_query_partial_plans has session scope.
- Locked_connects

The number of attempts to connect to locked user accounts. For information about account locking and unlocking, see Section 8.2.20, "Account Locking".
- Max_execution_time_exceeded

The number of SELECT statements for which the execution timeout was exceeded.
- Max_execution_time_set

The number of SELECT statements for which a nonzero execution timeout was set. This includes statements that include a nonzero MAX_EXECUTION_TIME optimizer hint, and statements that include no such hint but execute while the timeout indicated by the max_execution_time system variable is nonzero.
- Max_execution_time_set_failed

The number of SELECT statements for which the attempt to set an execution timeout failed.
- Max_used_connections

The maximum number of connections that have been in use simultaneously since the server started.
- Max_used_connections_time

The time at which Max_used_connections reached its current value.
- Not_flushed_delayed_rows

This status variable is deprecated (because DELAYED inserts are not supported); expect it to be removed in a future release.
- mecab_charset

The character set currently used by the MeCab full-text parser plugin. For related information, see Section 14.9.9, "MeCab Full-Text Parser Plugin".
- Ongoing_anonymous_transaction_count

Shows the number of ongoing transactions which have been marked as anonymous. This can be used to ensure that no further transactions are waiting to be processed.
- Ongoing_anonymous_gtid_violating_transaction_count

This status variable is only available in debug builds. Shows the number of ongoing transactions which use gtid_next=ANONYMOUS and that violate GTID consistency.
- Ongoing_automatic_gtid_violating_transaction_count

This status variable is only available in debug builds. Shows the number of ongoing transactions which use gtid_next=AUTOMATIC and that violate GTID consistency.
- Open_files

The number of files that are open. This count includes regular files opened by the server. It does not include other types of files such as sockets or pipes. Also, the count does not include files that storage engines open using their own internal functions rather than asking the server level to do so.
- Open_streams

The number of streams that are open (used mainly for logging).
- Open_table_definitions

The number of cached table definitions.
- Open_tables

The number of tables that are open.
- Opened_files

The number of files that have been opened with my_open() (a mysys library function). Parts of the server that open files without using this function do not increment the count.
- Opened_table_definitions

The number of table definitions that have been cached.
- Opened_tables

The number of tables that have been opened. If Opened_tables is big, your table_open_cache value is probably too small.
- Performance_schema_xxx

Performance Schema status variables are listed in Section 29.16, "Performance Schema Status Variables". These variables provide information about instrumentation that could not be loaded or created due to memory constraints.
- Prepared_stmt_count

The current number of prepared statements. (The maximum number of statements is given by the max_prepared_stmt_count system variable.)
- Queries

The number of statements executed by the server. This variable includes statements executed within stored programs, unlike the Questions variable. It does not count COM_PING or COM_STATISTICS commands.

The discussion at the beginning of this section indicates how to relate this statement-counting status variable to other such variables.
- Questions

The number of statements executed by the server. This includes only statements sent to the server by clients and not statements executed within stored programs, unlike the Queries variable. This variable does not count COM_PING, COM_STATISTICS, COM_STMT_PREPARE, COM_STMT_CLOSE, or COM_STMT_RESET commands.

The discussion at the beginning of this section indicates how to relate this statement-counting status variable to other such variables.
- Replica_open_temp_tables

Replica_open_temp_tables shows the number of temporary tables that the replication SQL thread currently has open. If the value is greater than zero, it is not safe to shut down the replica; see Section 19.5.1.31, "Replication and Temporary Tables". This variable reports the total count of open temporary tables for all replication channels.
- Resource_group_supported

Indicates whether the resource group feature is supported.
On some platforms or MySQL server configurations, resource groups are unavailable or have limitations. In particular, Linux systems might require a manual step for some installation methods. For details, see Resource Group Restrictions.
- Rpl_semi_sync_master_clients

The number of semisynchronous replicas.
Deprecated synonym for Rpl_semi_sync_source_clients.
- Rpl_semi_sync_master_net_avg_wait_time

Deprecated synonym for Rpl_semi_sync_source_net_avg_wait_time.
- Rpl_semi_sync_master_net_wait_time

Deprecated synonym for Rpl_semi_sync_source_net_wait_time.
- Rpl_semi_sync_master_net_waits

The total number of times the source waited for replica replies.
Deprecated synonym for Rpl_semi_sync_source_net_waits.
- Rpl_semi_sync_master_no_times

Deprecated synonym for Rpl_semi_sync_source_no_times.
- Rpl_semi_sync_master_no_tx

Deprecated synonym for Rpl_semi_sync_source_no_tx.
- Rpl_semi_sync_master_status

Deprecated synonym for Rpl_semi_sync_source_status.
- Rpl_semi_sync_master_timefunc_failures

Deprecated synonym for Rpl_semi_sync_source_timefunc_failures.
- Rpl_semi_sync_master_tx_avg_wait_time

Deprecated synonym for Rpl_semi_sync_source_tx_avg_wait_time.
- Rpl_semi_sync_master_tx_wait_time

Deprecated synonym for Rpl_semi_sync_source_tx_wait_time.
- Rpl_semi_sync_master_tx_waits

Deprecated synonym for Rpl_semi_sync_source_tx_waits.
- Rpl_semi_sync_master_wait_pos_backtraverse

Deprecated synonym for Rpl_semi_sync_source_wait_pos_backtraverse.
- Rpl_semi_sync_master_wait_sessions

Deprecated synonym for Rpl_semi_sync_source_wait_sessions.
- Rpl_semi_sync_master_yes_tx

Deprecated synonym for Rpl_semi_sync_source_yes_tx.
- Rpl_semi_sync_source_clients

The number of semisynchronous replicas.
Available when the rpl_semi_sync_source plugin (semisync_source.so library) is installed on the source.
- Rpl_semi_sync_source_net_avg_wait_time

The average time in microseconds the source waited for a replica reply. This variable is always 0 , and is deprecated; expect it to be removed in a future version.

Available when the rpl_semi_sync_source plugin (semisync_source.so library) is installed on the source.
- Rpl_semi_sync_source_net_wait_time

The total time in microseconds the source waited for replica replies. This variable is always 0 , and is deprecated; expect it to be removed in a future version.

Available when the rpl_semi_sync_source plugin (semisync_source.so library) is installed on the source.
- Rpl_semi_sync_source_net_waits

The total number of times the source waited for replica replies.
Available when the rpl_semi_sync_source plugin (semisync_source.so library) is installed on the source.
- Rpl_semi_sync_source_no_times

The number of times the source turned off semisynchronous replication.
Available when the rpl_semi_sync_source plugin (semisync_source.so library) is installed on the source.
- Rpl_semi_sync_source_no_tx

The number of commits that were not acknowledged successfully by a replica.
Available when the rpl_semi_sync_source plugin (semisync_source.so library) is installed on the source.
- Rpl_semi_sync_source_status

Whether semisynchronous replication currently is operational on the source. The value is ON if the plugin has been enabled and a commit acknowledgment has occurred. It is 0FF if the plugin is not enabled or the source has fallen back to asynchronous replication due to commit acknowledgment timeout.

Available when the rpl_semi_sync_source plugin (semisync_source.so library) is installed on the source.
- Rpl_semi_sync_source_timefunc_failures

The number of times the source failed when calling time functions such as gettimeofday().
Available when the rpl_semi_sync_source plugin (semisync_source.so library) is installed on the source.
- Rpl_semi_sync_source_tx_avg_wait_time

The average time in microseconds the source waited for each transaction.
Available when the rpl_semi_sync_source plugin (semisync_source.so library) is installed on the source.
- Rpl_semi_sync_source_tx_wait_time

The total time in microseconds the source waited for transactions.
Available when the rpl_semi_sync_source plugin (semisync_source.so library) is installed on the source.
- Rpl_semi_sync_source_tx_waits

The total number of times the source waited for transactions.
Available when the rpl_semi_sync_source plugin (semisync_source.so library) is installed on the source.
- Rpl_semi_sync_source_wait_pos_backtraverse

The total number of times the source waited for an event with binary coordinates lower than events waited for previously. This can occur when the order in which transactions start waiting for a reply is different from the order in which their binary log events are written.

Available when the rpl_semi_sync_source plugin (semisync_source.so library) is installed on the source.
- Rpl_semi_sync_source_wait_sessions

The number of sessions currently waiting for replica replies.
Available when the rpl_semi_sync_source plugin (semisync_source.so library) is installed on the source.
- Rpl_semi_sync_source_yes_tx

The number of commits that were acknowledged successfully by a replica.
Available when the rpl_semi_sync_source plugin (semisync_source.so library) is installed on the source.
- Rpl_semi_sync_replica_status

Shows whether semisynchronous replication is currently operational on the replica. This is ON if the plugin has been enabled and the replication I/O (receiver) thread is running, OFF otherwise.

Available when the rpl_semi_sync_source plugin (semisync_source.so library) is installed on the source.
- Rpl_semi_sync_slave_status

Deprecated synonym for Rpl_semi_sync_replica_status.
- Rsa_public_key

The value of this variable is the public key used by the sha256_password (deprecated) authentication plugin for RSA key pair-based password exchange. The value is nonempty only if the server successfully initializes the private and public keys in the files named by the sha256_password_private_key_path and sha256_password_public_key_path system variables. The value of Rsa_public_key comes from the latter file.

For information about sha256_password, see Section 8.4.1.3, "SHA-256 Pluggable Authentication".
- Secondary_engine_execution_count

For use with MySQL HeatWave only. See Status Variables, for more information.
- Select_full_join

The number of joins that perform table scans because they do not use indexes. If this value is not 0 , you should carefully check the indexes of your tables.
- Select_full_range_join

The number of joins that used a range search on a reference table.
- Select_range

The number of joins that used ranges on the first table. This is normally not a critical issue even if the value is quite large.
- Select_range_check

The number of joins without keys that check for key usage after each row. If this is not 0 , you should carefully check the indexes of your tables.
- Select_scan

The number of joins that did a full scan of the first table.
- Slave_open_temp_tables

Deprecated alias for Replica_open_temp_tables.
- Slave_rows_last_search_algorithm_used

Deprecated alias for Replica_rows_last_search_algorithm_used.
- Slow_launch_threads

The number of threads that have taken more than slow_launch_time seconds to create.
- Slow_queries

The number of queries that have taken more than long_query_time seconds. This counter increments regardless of whether the slow query log is enabled. For information about that log, see Section 7.4.5, "The Slow Query Log".
- Sort_merge_passes

The number of merge passes that the sort algorithm has had to do. If this value is large, you should consider increasing the value of the sort_buffer_size system variable.
- Sort_range

The number of sorts that were done using ranges.
- Sort_rows

The number of sorted rows.
- Sort_scan

The number of sorts that were done by scanning the table.
- Ssl_accept_renegotiates

The number of negotiates needed to establish the connection.
- Ssl_accepts

The number of accepted SSL connections.
- Ssl_callback_cache_hits

The number of callback cache hits.
- Ssl_cipher

The current encryption cipher (empty for unencrypted connections).
- Ssl_cipher_list

The list of possible SSL ciphers (empty for non-SSL connections). If MySQL supports TLSv1.3, the value includes the possible TLSv1.3 ciphersuites. See Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".
- Ssl_client_connects

The number of SSL connection attempts to an SSL-enabled replication source server.
- Ssl_connect_renegotiates

The number of negotiates needed to establish the connection to an SSL-enabled replication source server.
- Ssl_ctx_verify_depth

The SSL context verification depth (how many certificates in the chain are tested).
- Ssl_ctx_verify_mode

The SSL context verification mode.
- Ssl_default_timeout

The default SSL timeout.
- Ssl_finished_accepts

The number of successful SSL connections to the server.
- Ssl_finished_connects

The number of successful replica connections to an SSL-enabled replication source server.
- Ssl_server_not_after

The last date for which the SSL certificate is valid. To check SSL certificate expiration information, use this statement:
```
mysql> SHOW STATUS LIKE 'Ssl_server_not%';
+------------------------+-----------------------------
| Variable_name | Value |
+------------------------+-------------------------+
| Ssl_server_not_after | Apr 28 14:16:39 2025 GMT |
| Ssl_server_not_before | May 1 14:16:39 2015 GMT |
+------------------------+--------------------------+
```

- Ssl_server_not_before

The first date for which the SSL certificate is valid.
- Ssl_session_cache_hits

The number of SSL session cache hits.
- Ssl_session_cache_misses

The number of SSL session cache misses.
- Ssl_session_cache_mode

The SSL session cache mode. When the value of the ssl_session_cache_mode server variable is ON, the value of the Ssl_session_cache_mode status variable is SERVER.
- Ssl_session_cache_overflows

The number of SSL session cache overflows.
- Ssl_session_cache_size

The SSL session cache size.
- Ssl_session_cache_timeout

The timeout value in seconds of SSL sessions in the cache.
- Ssl_session_cache_timeouts

The number of SSL session cache timeouts.
- Ssl_sessions_reused

This is equal to 0 if TLS was not used in the current MySQL session, or if a TLS session has not been reused; otherwise it is equal to 1 .

Ssl_sessions_reused has session scope.
- Ssl_used_session_cache_entries

How many SSL session cache entries were used.
- Ssl_verify_depth

The verification depth for replication SSL connections.
- Ssl_verify_mode

The verification mode used by the server for a connection that uses SSL. The value is a bitmask; bits are defined in the openssl/ssl.h header file:
```
# define SSL_VERIFY_NONE 0x00
# define SSL_VERIFY_PEER 0x01
# define SSL_VERIFY_FAIL_IF_NO_PEER_CERT 0x02
# define SSL_VERIFY_CLIENT_ONCE 0x04
```


SSL_VERIFY_PEER indicates that the server asks for a client certificate. If the client supplies one, the server performs verification and proceeds only if verification is successful. SSL_VERIFY_CLIENT_ONCE indicates that a request for the client certificate is performed only in the initial handshake.
- Ssl_version

The SSL protocol version of the connection (for example, TLSv1.2). If the connection is not encrypted, the value is empty.
- Table_locks_immediate

The number of times that a request for a table lock could be granted immediately.
- Table_locks_waited

The number of times that a request for a table lock could not be granted immediately and a wait was needed. If this is high and you have performance problems, you should first optimize your queries, and then either split your table or tables or use replication.
- Table_open_cache_hits

The number of hits for open tables cache lookups.
- Table_open_cache_misses

The number of misses for open tables cache lookups.
- Table_open_cache_overflows

The number of overflows for the open tables cache. This is the number of times, after a table is opened or closed, a cache instance has an unused entry and the size of the instance is larger than table_open_cache / table_open_cache_instances.
- Tc_log_max_pages_used

For the memory-mapped implementation of the log that is used by mysqld when it acts as the transaction coordinator for recovery of internal XA transactions, this variable indicates the largest number of pages used for the log since the server started. If the product of Tc_log_max_pages_used and Tc_log_page_size is always significantly less than the log size, the size is larger than necessary and can be reduced. (The size is set by the --log-tcsize option. This variable is unused: It is unneeded for binary log-based recovery, and the memorymapped recovery log method is not used unless the number of storage engines that are capable of two-phase commit and that support XA transactions is greater than one. (InnoDB is the only applicable engine.)
- Tc_log_page_size

The page size used for the memory-mapped implementation of the XA recovery log. The default value is determined using getpagesize(). This variable is unused for the same reasons as described for Tc_log_max_pages_used.
- Tc_log_page_waits

For the memory-mapped implementation of the recovery log, this variable increments each time the server was not able to commit a transaction and had to wait for a free page in the log. If this value is large, you might want to increase the log size (with the --log-tc-size option). For binary log-based recovery, this variable increments each time the binary log cannot be closed because there are two-phase commits in progress. (The close operation waits until all such transactions are finished.)
- Telemetry_metrics_supported

Whether server telemetry metrics is supported.
For more information, see the Server telemetry metrics service section in the MySQL Source Code documentation.
- telemetry.live_sessions

Displays the current number of sessions instrumented with telemetry. This can be useful when unloading the Telemetry component, to monitor how many sessions are blocking the unload operation.

For more information, see the Server telemetry traces service section in the MySQL Source Code documentation and Chapter 35, Telemetry.
- Telemetry_traces_supported

Whether server telemetry traces is supported.
For more information, see the Server telemetry traces service section in the MySQL Source Code documentation.
- Threads_cached

The number of threads in the thread cache.
- Threads_connected

The number of currently open connections.
- Threads_created

The number of threads created to handle connections. If Threads_created is big, you may want to increase the thread_cache_size value. The cache miss rate can be calculated as Threads_created/Connections.
- Threads_running

The number of threads that are not sleeping.
- Tls_library_version

The runtime version of the OpenSSL library that is in use for this MySQL instance.
- Tls_sni_server_name

The Server Name Indication (SNI) that is in use for this session, if specified by the client; otherwise, empty. SNI is an extension to the TLS protocol (OpenSSL must be compiled using TLS extensions for this status variable to function). The MySQL implementation of SNI represents the client-side only.
- Uptime

The number of seconds that the server has been up.
- Uptime_since_flush_status

The number of seconds since the most recent FLUSH STATUS statement.

\subsection*{7.1.11 Server SQL Modes}

The MySQL server can operate in different SQL modes, and can apply these modes differently for different clients, depending on the value of the sql_mode system variable. DBAs can set the global

SQL mode to match site server operating requirements, and each application can set its session SQL mode to its own requirements.

Modes affect the SQL syntax MySQL supports and the data validation checks it performs. This makes it easier to use MySQL in different environments and to use MySQL together with other database servers.
- Setting the SQL Mode
- The Most Important SQL Modes
- Full List of SQL Modes
- Combination SQL Modes
- Strict SQL Mode
- Comparison of the IGNORE Keyword and Strict SQL Mode

For answers to questions often asked about server SQL modes in MySQL, see Section A.3, "MySQL 8.4 FAQ: Server SQL Mode".

When working with InnoDB tables, consider also the innodb_strict_mode system variable. It enables additional error checks for InnoDB tables.

\section*{Setting the SQL Mode}

The default SQL mode in MySQL 8.4 includes these modes: ONLY_FULL_GROUP_BY, STRICT_TRANS_TABLES, NO_ZERO_IN_DATE, NO_ZERO_DATE, ERROR_FOR_DIVISION_BY_ZERO, and NO_ENGINE_SUBSTITUTION.

To set the SQL mode at server startup, use the --sql-mode="modes" option on the command line, or sql-mode="modes" in an option file such as my.cnf (Unix operating systems) or my.ini (Windows). modes is a list of different modes separated by commas. To clear the SQL mode explicitly, set it to an empty string using --sql-mode="" on the command line, or sql-mode="" in an option file.

\section*{Note}

MySQL installation programs may configure the SQL mode during the installation process.

If the SQL mode differs from the default or from what you expect, check for a setting in an option file that the server reads at startup.

To change the SQL mode at runtime, set the global or session sql_mode system variable using a SET statement:
```
SET GLOBAL sql_mode = 'modes';
SET SESSION sql_mode = 'modes';
```


Setting the GLOBAL variable requires the SYSTEM_VARIABLES_ADMIN privilege (or the deprecated SUPER privilege) and affects the operation of all clients that connect from that time on. Setting the SESSION variable affects only the current client. Each client can change its session sql_mode value at any time.

To determine the current global or session sql_mode setting, select its value:
```
SELECT @@GLOBAL.sql_mode;
SELECT @@SESSION.sql_mode;
```


\section*{Important}

SQL mode and user-defined partitioning. Changing the server SQL mode after creating and inserting data into partitioned tables can cause major
changes in the behavior of such tables, and could lead to loss or corruption of data. It is strongly recommended that you never change the SQL mode once you have created tables employing user-defined partitioning.

When replicating partitioned tables, differing SQL modes on the source and replica can also lead to problems. For best results, you should always use the same server SQL mode on the source and replica.

For more information, see Section 26.6, "Restrictions and Limitations on Partitioning".

\section*{The Most Important SQL Modes}

The most important sql_mode values are probably these:
- ANSI

This mode changes syntax and behavior to conform more closely to standard SQL. It is one of the special combination modes listed at the end of this section.
- STRICT_TRANS_TABLES

If a value could not be inserted as given into a transactional table, abort the statement. For a nontransactional table, abort the statement if the value occurs in a single-row statement or the first row of a multiple-row statement. More details are given later in this section.
- TRADITIONAL

Make MySQL behave like a "traditional" SQL database system. A simple description of this mode is "give an error instead of a warning" when inserting an incorrect value into a column. It is one of the special combination modes listed at the end of this section.

\section*{Note}

With TRADITIONAL mode enabled, an INSERT or UPDATE aborts as soon as an error occurs. If you are using a nontransactional storage engine, this may not be what you want because data changes made prior to the error may not be rolled back, resulting in a "partially done" update.

When this manual refers to "strict mode," it means a mode with either or both STRICT_TRANS_TABLES or STRICT_ALL_TABLES enabled.

\section*{Full List of SQL Modes}

The following list describes all supported SQL modes:
- ALLOW_INVALID_DATES

Do not perform full checking of dates. Check only that the month is in the range from 1 to 12 and the day is in the range from 1 to 31 . This may be useful for Web applications that obtain year, month, and day in three different fields and store exactly what the user inserted, without date validation. This mode applies to DATE and DATETIME columns. It does not apply to TIMESTAMP columns, which always require a valid date.

With ALLOW_INVALID_DATES disabled, the server requires that month and day values be legal, and not merely in the range 1 to 12 and 1 to 31 , respectively. With strict mode disabled, invalid dates such as ' $2004-04-31^{\prime}$ are converted to '0000-00-00' and a warning is generated. With strict mode enabled, invalid dates generate an error. To permit such dates, enable ALLOW_INVALID_DATES.
- ANSI_QUOTES

Treat " as an identifier quote character (like the ˋ quote character) and not as a string quote character. You can still use ˋ to quote identifiers with this mode enabled. With ANSI_QUOTES enabled, you cannot use double quotation marks to quote literal strings because they are interpreted as identifiers.
- ERROR_FOR_DIVISION_BY_ZERO

The ERROR_FOR_DIVISION_BY_ZERO mode affects handling of division by zero, which includes MOD ( $N, 0$ ). For data-change operations (INSERT, UPDATE), its effect also depends on whether strict SQL mode is enabled.
- If this mode is not enabled, division by zero inserts NULL and produces no warning.
- If this mode is enabled, division by zero inserts NULL and produces a warning.
- If this mode and strict mode are enabled, division by zero produces an error, unless IGNORE is given as well. For INSERT IGNORE and UPDATE IGNORE, division by zero inserts NULL and produces a warning.

For SELECT, division by zero returns NULL. Enabling ERROR_FOR_DIVISION_BY_ZERO causes a warning to be produced as well, regardless of whether strict mode is enabled.

ERROR_FOR_DIVISION_BY_ZERO is deprecated. ERROR_FOR_DIVISION_BY_ZERO is not part of strict mode, but should be used in conjunction with strict mode and is enabled by default. A warning occurs if ERROR_FOR_DIVISION_BY_ZERO is enabled without also enabling strict mode or vice versa.

Because ERROR_FOR_DIVISION_BY_ZERO is deprecated, you should expect it to be removed in a future MySQL release as a separate mode name and its effect included in the effects of strict SQL mode.
- HIGH_NOT_PRECEDENCE

The precedence of the NOT operator is such that expressions such as NOT a BETWEEN b AND c are parsed as NOT (a BETWEEN b AND c). In some older versions of MySQL, the expression was parsed as (NOT a) BETWEEN b AND c. The old higher-precedence behavior can be obtained by enabling the HIGH_NOT_PRECEDENCE SQL mode.
```
mysql> SET sql_mode = '';
mysql> SELECT NOT 1 BETWEEN -5 AND 5;
    -> 0
mysql> SET sql_mode = 'HIGH_NOT_PRECEDENCE';
mysql> SELECT NOT 1 BETWEEN -5 AND 5;
    -> 1
```

- IGNORE_SPACE

Permit spaces between a function name and the ( character. This causes built-in function names to be treated as reserved words. As a result, identifiers that are the same as function names must be quoted as described in Section 11.2, "Schema Object Names". For example, because there is a COUNT ( ) function, the use of count as a table name in the following statement causes an error:
```
mysql> CREATE TABLE count (i INT);
ERROR 1064 (42000): You have an error in your SQL syntax
```


The table name should be quoted:
```
mysql> CREATE TABLE ˋcountˋ (i INT);
```


Query OK, 0 rows affected (0.00 sec)
The IGNORE_SPACE SQL mode applies to built-in functions, not to loadable functions or stored functions. It is always permissible to have spaces after a loadable function or stored function name, regardless of whether IGNORE_SPACE is enabled.

For further discussion of IGNORE_SPACE, see Section 11.2.5, "Function Name Parsing and Resolution".
- NO_AUTO_VALUE_ON_ZERO

NO_AUTO_VALUE_ON_ZERO affects handling of AUTO_INCREMENT columns. Normally, you generate the next sequence number for the column by inserting either NULL or 0 into it. NO_AUTO_VALUE_ON_ZERO suppresses this behavior for 0 so that only NULL generates the next sequence number.

This mode can be useful if 0 has been stored in a table's AUTO_INCREMENT column. (Storing 0 is not a recommended practice, by the way.) For example, if you dump the table with mysqldump and then reload it, MySQL normally generates new sequence numbers when it encounters the 0 values, resulting in a table with contents different from the one that was dumped. Enabling NO_AUTO_VALUE_ON_ZERO before reloading the dump file solves this problem. For this reason, mysqldump automatically includes in its output a statement that enables NO_AUTO_VALUE_ON_ZERO.
- NO_BACKSLASH_ESCAPES

Enabling this mode disables the use of the backslash character ( \\) as an escape character within strings and identifiers. With this mode enabled, backslash becomes an ordinary character like any other, and the default escape sequence for LIKE expressions is changed so that no escape character is used.
- NO_DIR_IN_CREATE

When creating a table, ignore all INDEX DIRECTORY and DATA DIRECTORY directives. This option is useful on replica servers.
- NO_ENGINE_SUBSTITUTION

Control automatic substitution of the default storage engine when a statement such as CREATE TABLE or ALTER TABLE specifies a storage engine that is disabled or not compiled in.

By default, NO_ENGINE_SUBSTITUTION is enabled.
Because storage engines can be pluggable at runtime, unavailable engines are treated the same way:

With NO_ENGINE_SUBSTITUTION disabled, for CREATE TABLE the default engine is used and a warning occurs if the desired engine is unavailable. For ALTER TABLE, a warning occurs and the table is not altered.

With NO_ENGINE_SUBSTITUTION enabled, an error occurs and the table is not created or altered if the desired engine is unavailable.
- NO_UNSIGNED_SUBTRACTION

Subtraction between integer values, where one is of type UNSIGNED, produces an unsigned result by default. If the result would otherwise have been negative, an error results:
```
mysql> SET sql_mode = '';
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT CAST(0 AS UNSIGNED) - 1;
ERROR 1690 (22003): BIGINT UNSIGNED value is out of range in '(cast(0 as unsigned) - 1)'
```


If the NO_UNSIGNED_SUBTRACTION SQL mode is enabled, the result is negative:
```
mysql> SET sql_mode = 'NO_UNSIGNED_SUBTRACTION';
mysql> SELECT CAST(0 AS UNSIGNED) - 1;
+--------------------------+
| CAST(0 AS UNSIGNED) - 1 |
+---------------------------+
| -1 |
+---------------------------+
```


If the result of such an operation is used to update an UNSIGNED integer column, the result is clipped to the maximum value for the column type, or clipped to 0 if NO_UNSIGNED_SUBTRACTION is enabled. With strict SQL mode enabled, an error occurs and the column remains unchanged.

When NO_UNSIGNED_SUBTRACTION is enabled, the subtraction result is signed, even if any operand is unsigned. For example, compare the type of column c2 in table t1 with that of column c2 in table t2:
```
mysql> SET sql_mode='';
mysql> CREATE TABLE test (c1 BIGINT UNSIGNED NOT NULL);
mysql> CREATE TABLE t1 SELECT c1 - 1 AS c2 FROM test;
mysql> DESCRIBE t1;
+--------+----------------------+------+-----+--------+-------+
| Field | Type | Null | Key | Default | Extra |
+--------+----------------------+------+-----+---------+-------+
| c2 | bigint(21) unsigned | NO | | 0 | | |
mysql> SET sql_mode='NO_UNSIGNED_SUBTRACTION';
mysql> CREATE TABLE t2 SELECT c1 - 1 AS c2 FROM test;
mysql> DESCRIBE t2;
+--------+-------------+------+-----+---------+-------+
| Field | Type | Null | Key | Default | Extra |
+--------+-------------+------+-----+---------+-------+
| c2 | bigint(21) | NO | | 0 |
+--------+-------------+------+-----+---------+------+
```


This means that BIGINT UNSIGNED is not 100\% usable in all contexts. See Section 14.10, "Cast Functions and Operators".
- NO_ZERO_DATE

The NO_ZERO_DATE mode affects whether the server permits '0000-00-00' as a valid date. Its effect also depends on whether strict SQL mode is enabled.
- If this mode is not enabled, '0000-00-00' is permitted and inserts produce no warning.
- If this mode is enabled, '0000-00-00' is permitted and inserts produce a warning.
- If this mode and strict mode are enabled, '0000-00-00' is not permitted and inserts produce an error, unless IGNORE is given as well. For INSERT IGNORE and UPDATE IGNORE, '0000-00-00' is permitted and inserts produce a warning.

NO_ZERO_DATE is deprecated. NO_ZERO_DATE is not part of strict mode, but should be used in conjunction with strict mode and is enabled by default. A warning occurs if NO_ZERO_DATE is enabled without also enabling strict mode or vice versa.

Because NO_ZERO_DATE is deprecated, you should expect it to be removed in a future MySQL release as a separate mode name and its effect included in the effects of strict SQL mode.
- NO_ZERO_IN_DATE

The NO_ZERO_IN_DATE mode affects whether the server permits dates in which the year part is nonzero but the month or day part is 0 . (This mode affects dates such as ${ }^{\prime} 2010-00-01^{\prime}$ or
${ }^{\prime}$ 2010-01-00 ' , but not '0000-00-00' . To control whether the server permits '0000-00-00 ' , use the NO_ZERO_DATE mode.) The effect of NO_ZERO_IN_DATE also depends on whether strict SQL mode is enabled.
- If this mode is not enabled, dates with zero parts are permitted and inserts produce no warning.
- If this mode is enabled, dates with zero parts are inserted as '0000-00-00' and produce a warning.
- If this mode and strict mode are enabled, dates with zero parts are not permitted and inserts produce an error, unless IGNORE is given as well. For INSERT IGNORE and UPDATE IGNORE, dates with zero parts are inserted as '0000-00-00' and produce a warning.

NO_ZERO_IN_DATE is deprecated. NO_ZERO_IN_DATE is not part of strict mode, but should be used in conjunction with strict mode and is enabled by default. A warning occurs if NO_ZERO_IN_DATE is enabled without also enabling strict mode or vice versa.

Because NO_ZERO_IN_DATE is deprecated, you should expect it to be removed in a future MySQL release as a separate mode name and its effect included in the effects of strict SQL mode.
- ONLY_FULL_GROUP_BY

Reject queries for which the select list, HAVING condition, or ORDER BY list refer to nonaggregated columns that are neither named in the GROUP BY clause nor are functionally dependent on (uniquely determined by) GROUP BY columns.

A MySQL extension to standard SQL permits references in the HAVING clause to aliased expressions in the select list. The HAVING clause can refer to aliases regardless of whether ONLY_FULL_GROUP_BY is enabled.

For additional discussion and examples, see Section 14.19.3, "MySQL Handling of GROUP BY".
- PAD_CHAR_TO_FULL_LENGTH

By default, trailing spaces are trimmed from CHAR column values on retrieval. If PAD_CHAR_TO_FULL_LENGTH is enabled, trimming does not occur and retrieved CHAR values are padded to their full length. This mode does not apply to VARCHAR columns, for which trailing spaces are retained on retrieval.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0969.jpg?height=122&width=95&top_left_y=1836&top_left_x=406)

Note
PAD_CHAR_TO_FULL_LENGTH is deprecated. Expect it to be removed in a future version of MySQL.
```
mysql> CREATE TABLE t1 (c1 CHAR(10));
Query OK, 0 rows affected (0.37 sec)
mysql> INSERT INTO t1 (c1) VALUES('xy');
Query OK, 1 row affected (0.01 sec)
mysql> SET sql_mode = '';
Query OK, 0 rows affected (0.00 sec)
mysql> SELECT c1, CHAR_LENGTH(c1) FROM t1;
+------+-------------------+
| c1 | CHAR_LENGTH(c1) |
+------+-------------------+
| xy | 2 |
+------+------------------+
1 row in set (0.00 sec)
mysql> SET sql_mode = 'PAD_CHAR_TO_FULL_LENGTH';
Query OK, 0 rows affected (0.00 sec)
```

```
mysql> SELECT c1, CHAR_LENGTH(c1) FROM t1;
+------------+-----------------+
| c1 | CHAR_LENGTH(c1) |
+-------------+-----------------+
| xy | 10 |
+------------+-----------------+
1 row in set (0.00 sec)
```

- PIPES_AS_CONCAT

Treat || as a string concatenation operator (same as CONCAT( )) rather than as a synonym for OR.
- REAL_AS_FLOAT

Treat REAL as a synonym for FLOAT. By default, MySQL treats REAL as a synonym for DOUBLE.
- STRICT_ALL_TABLES

Enable strict SQL mode for all storage engines. Invalid data values are rejected. For details, see Strict SQL Mode.
- STRICT_TRANS_TABLES

Enable strict SQL mode for transactional storage engines, and when possible for nontransactional storage engines. For details, see Strict SQL Mode.
- TIME_TRUNCATE_FRACTIONAL

Control whether rounding or truncation occurs when inserting a TIME, DATE, or TIMESTAMP value with a fractional seconds part into a column having the same type but fewer fractional digits. The default behavior is to use rounding. If this mode is enabled, truncation occurs instead. The following sequence of statements illustrates the difference:
```
CREATE TABLE t (id INT, tval TIME(1));
SET sql_mode='';
INSERT INTO t (id, tval) VALUES(1, 1.55);
SET sql_mode='TIME_TRUNCATE_FRACTIONAL';
INSERT INTO t (id, tval) VALUES(2, 1.55);
```


The resulting table contents look like this, where the first value has been subject to rounding and the second to truncation:
```
mysql> SELECT id, tval FROM t ORDER BY id;
+------+-------------+
| id | tval |
+-------+-------------+
| 1 | 00:00:01.6 |
| 2 | 00:00:01.5 |
+------+-------------+
```


See also Section 13.2.6, "Fractional Seconds in Time Values".

\section*{Combination SQL Modes}

The following special modes are provided as shorthand for combinations of mode values from the preceding list.
- ANSI

Equivalent to REAL_AS_FLOAT, PIPES_AS_CONCAT, ANSI_QUOTES, IGNORE_SPACE, and ONLY_FULL_GROUP_BY.

ANSI mode also causes the server to return an error for queries where a set function $S$ with an outer reference $S$ (outer_ref) cannot be aggregated in the outer query against which the outer reference has been resolved. This is such a query:

SELECT * FROM t1 WHERE t1.a IN (SELECT MAX(t1.b) FROM t2 WHERE ...);
Here, MAX( t1. b) cannot aggregated in the outer query because it appears in the WHERE clause of that query. Standard SQL requires an error in this situation. If ANSI mode is not enabled, the server treats $S$ (outer_ref) in such queries the same way that it would interpret $S$ (const).

See Section 1.7, "MySQL Standards Compliance".
- TRADITIONAL

TRADITIONAL is equivalent to STRICT_TRANS_TABLES, STRICT_ALL_TABLES, NO_ZERO_IN_DATE, NO_ZERO_DATE, ERROR_FOR_DIVISION_BY_ZERO, and NO_ENGINE_SUBSTITUTION.

\section*{Strict SQL Mode}

Strict mode controls how MySQL handles invalid or missing values in data-change statements such as INSERT or UPDATE. A value can be invalid for several reasons. For example, it might have the wrong data type for the column, or it might be out of range. A value is missing when a new row to be inserted does not contain a value for a non-NULL column that has no explicit DEFAULT clause in its definition. (For a NULL column, NULL is inserted if the value is missing.) Strict mode also affects DDL statements such as CREATE TABLE.

If strict mode is not in effect, MySQL inserts adjusted values for invalid or missing values and produces warnings (see Section 15.7.7.42, "SHOW WARNINGS Statement"). In strict mode, you can produce this behavior by using INSERT IGNORE or UPDATE IGNORE.

For statements such as SELECT that do not change data, invalid values generate a warning in strict mode, not an error.

Strict mode produces an error for attempts to create a key that exceeds the maximum key length. When strict mode is not enabled, this results in a warning and truncation of the key to the maximum key length.

Strict mode does not affect whether foreign key constraints are checked. foreign_key_checks can be used for that. (See Section 7.1.8, "Server System Variables".)

Strict SQL mode is in effect if either STRICT_ALL_TABLES or STRICT_TRANS_TABLES is enabled, although the effects of these modes differ somewhat:
- For transactional tables, an error occurs for invalid or missing values in a data-change statement when either STRICT_ALL_TABLES or STRICT_TRANS_TABLES is enabled. The statement is aborted and rolled back.
- For nontransactional tables, the behavior is the same for either mode if the bad value occurs in the first row to be inserted or updated: The statement is aborted and the table remains unchanged. If the statement inserts or modifies multiple rows and the bad value occurs in the second or later row, the result depends on which strict mode is enabled:
- For STRICT_ALL_TABLES, MySQL returns an error and ignores the rest of the rows. However, because the earlier rows have been inserted or updated, the result is a partial update. To avoid this, use single-row statements, which can be aborted without changing the table.
- For STRICT_TRANS_TABLES, MySQL converts an invalid value to the closest valid value for the column and inserts the adjusted value. If a value is missing, MySQL inserts the implicit default value for the column data type. In either case, MySQL generates a warning rather than an error and continues processing the statement. Implicit defaults are described in Section 13.6, "Data Type Default Values".

Strict mode affects handling of division by zero, zero dates, and zeros in dates as follows:
- Strict mode affects handling of division by zero, which includes MOD( $N, 0$ ):

For data-change operations (INSERT, UPDATE):
- If strict mode is not enabled, division by zero inserts NULL and produces no warning.
- If strict mode is enabled, division by zero produces an error, unless IGNORE is given as well. For INSERT IGNORE and UPDATE IGNORE, division by zero inserts NULL and produces a warning.

For SELECT, division by zero returns NULL. Enabling strict mode causes a warning to be produced as well.
- Strict mode affects whether the server permits '0000-00-00' as a valid date:
- If strict mode is not enabled, '0000-00-00' is permitted and inserts produce no warning.
- If strict mode is enabled, '0000-00-00' is not permitted and inserts produce an error, unless IGNORE is given as well. For INSERT IGNORE and UPDATE IGNORE, '0000-00-00' is permitted and inserts produce a warning.
- Strict mode affects whether the server permits dates in which the year part is nonzero but the month or day part is 0 (dates such as '2010-00-01' or '2010-01-00'):
- If strict mode is not enabled, dates with zero parts are permitted and inserts produce no warning.
- If strict mode is enabled, dates with zero parts are not permitted and inserts produce an error, unless IGNORE is given as well. For INSERT IGNORE and UPDATE IGNORE, dates with zero parts are inserted as '0000-00-00' (which is considered valid with IGNORE) and produce a warning.

For more information about strict mode with respect to IGNORE, see Comparison of the IGNORE Keyword and Strict SQL Mode.

Strict mode affects handling of division by zero, zero dates, and zeros in dates in conjunction with the ERROR_FOR_DIVISION_BY_ZERO, NO_ZERO_DATE, and NO_ZERO_IN_DATE modes.

\section*{Comparison of the IGNORE Keyword and Strict SQL Mode}

This section compares the effect on statement execution of the IGNORE keyword (which downgrades errors to warnings) and strict SQL mode (which upgrades warnings to errors). It describes which statements they affect, and which errors they apply to.

The following table presents a summary comparison of statement behavior when the default is to produce an error versus a warning. An example of when the default is to produce an error is inserting a NULL into a NOT NULL column. An example of when the default is to produce a warning is inserting a value of the wrong data type into a column (such as inserting the string ' abc' into an integer column).

\begin{tabular}{|l|l|l|}
\hline Operational Mode & When Statement Default is Error & When Statement Default is Warning \\
\hline Without IGNORE or strict SQL mode & Error & Warning \\
\hline With IGNORE & Warning & Warning (same as without IGNORE or strict SQL mode) \\
\hline With strict SQL mode & Error (same as without IGNORE or strict SQL mode) & Error \\
\hline With IGNORE and strict SQL mode & Warning & Warning \\
\hline
\end{tabular}

One conclusion to draw from the table is that when the IGNORE keyword and strict SQL mode are both in effect, IGNORE takes precedence. This means that, although IGNORE and strict SQL mode can be considered to have opposite effects on error handling, they do not cancel when used together.
- The Effect of IGNORE on Statement Execution
- The Effect of Strict SQL Mode on Statement Execution

\section*{The Effect of IGNORE on Statement Execution}

Several statements in MySQL support an optional IGNORE keyword. This keyword causes the server to downgrade certain types of errors and generate warnings instead. For a multiple-row statement, downgrading an error to a warning may enable a row to be processed. Otherwise, IGNORE causes the statement to skip to the next row instead of aborting. (For nonignorable errors, an error occurs regardless of the IGNORE keyword.)

Example: If the table $t$ has a primary key column $i$ containing unique values, attempting to insert the same value of i into multiple rows normally produces a duplicate-key error:
```
mysql> CREATE TABLE t (i INT NOT NULL PRIMARY KEY);
mysql> INSERT INTO t (i) VALUES(1),(1);
ERROR 1062 (23000): Duplicate entry '1' for key 't.PRIMARY'
```


With IGNORE, the row containing the duplicate key still is not inserted, but a warning occurs instead of an error:
```
mysql> INSERT IGNORE INTO t (i) VALUES(1),(1);
Query OK, 1 row affected, 1 warning (0.01 sec)
Records: 2 Duplicates: 1 Warnings: 1
mysql> SHOW WARNINGS;
+---------+------+----------------------------------------
| Level | Code | Message |
+---------+------+-----------------------------------------+
| Warning | 1062 | Duplicate entry '1' for key 't.PRIMARY' |
+---------+------+----------------------------------------
1 row in set (0.00 sec)
```


Example: If the table t2 has a NOT NULL column id, attempting to insert NULL produces an error in strict SQL mode:
```
mysql> CREATE TABLE t2 (id INT NOT NULL);
mysql> INSERT INTO t2 (id) VALUES(1),(NULL),(3);
ERROR 1048 (23000): Column 'id' cannot be null
mysql> SELECT * FROM t2;
Empty set (0.00 sec)
```


If the SQL mode is not strict, IGNORE causes the NULL to be inserted as the column implicit default ( 0 in this case), which enables the row to be handled without skipping it:
```
mysql> INSERT INTO t2 (id) VALUES(1),(NULL),(3);
mysql> SELECT * FROM t2;
+----+
| id |
+----+
| 1 |
| 0 |
| 3 |
+----+
```


These statements support the IGNORE keyword:
- CREATE TABLE ... SELECT: IGNORE does not apply to the CREATE TABLE or SELECT parts of the statement but to inserts into the table of rows produced by the SELECT. Rows that duplicate an existing row on a unique key value are discarded.
- DELETE: IGNORE causes MySQL to ignore errors during the process of deleting rows.
- INSERT: With IGNORE, rows that duplicate an existing row on a unique key value are discarded. Rows set to values that would cause data conversion errors are set to the closest valid values instead.

For partitioned tables where no partition matching a given value is found, IGNORE causes the insert operation to fail silently for rows containing the unmatched value.
- LOAD DATA, LOAD XML: With IGNORE, rows that duplicate an existing row on a unique key value are discarded.
- UPDATE: With IGNORE, rows for which duplicate-key conflicts occur on a unique key value are not updated. Rows updated to values that would cause data conversion errors are updated to the closest valid values instead.

The IGNORE keyword applies to the following ignorable errors:
- ER_BAD_NULL_ERROR
- ER_DUP_ENTRY
- ER_DUP_ENTRY_WITH_KEY_NAME
- ER_DUP_KEY
- ER_NO_PARTITION_FOR_GIVEN_VALUE
- ER_NO_PARTITION_FOR_GIVEN_VALUE_SILENT
- ER_NO_REFERENCED_ROW_2
- ER_ROW_DOES_NOT_MATCH_GIVEN_PARTITION_SET
- ER_ROW_IS_REFERENCED_2
- ER_SUBQUERY_NO_1_ROW
- ER_VIEW_CHECK_FAILED

\section*{The Effect of Strict SQL Mode on Statement Execution}

The MySQL server can operate in different SQL modes, and can apply these modes differently for different clients, depending on the value of the sql_mode system variable. In "strict" SQL mode, the server upgrades certain warnings to errors.

For example, in non-strict SQL mode, inserting the string ' abc ' into an integer column results in conversion of the value to 0 and a warning:
```
mysql> SET sql_mode = '';
Query OK, 0 rows affected (0.00 sec)
mysql> INSERT INTO t (i) VALUES('abc');
Query OK, 1 row affected, 1 warning (0.01 sec)
mysql> SHOW WARNINGS;
+----------+------+---------------------------------------------------------
| Level | Code | Message |
+----------+------+---------------------------------------------------------
| Warning | 1366 | Incorrect integer value: 'abc' for column 'i' at row 1 |
+----------+------+---------------------------------------------------------
1 row in set (0.00 sec)
```


In strict SQL mode, the invalid value is rejected with an error:
```
mysql> SET sql_mode = 'STRICT_ALL_TABLES';
Query OK, 0 rows affected (0.00 sec)
mysql> INSERT INTO t (i) VALUES('abc');
ERROR 1366 (HY000): Incorrect integer value: 'abc' for column 'i' at row 1
```


For more information about possible settings of the sql_mode system variable, see Section 7.1.11, "Server SQL Modes".

Strict SQL mode applies to the following statements under conditions for which some value might be out of range or an invalid row is inserted into or deleted from a table:
- ALTER TABLE
- CREATE TABLE
- CREATE TABLE ... SELECT
- DELETE (both single table and multiple table)
- INSERT
- LOAD DATA
- LOAD XML
- SELECT SLEEP()
- UPDATE (both single table and multiple table)

Within stored programs, individual statements of the types just listed execute in strict SQL mode if the program was defined while strict mode was in effect.

Strict SQL mode applies to the following errors, which represent a class of errors in which an input value is either invalid or missing. A value is invalid if it has the wrong data type for the column or might be out of range. A value is missing if a new row to be inserted does not contain a value for a NOT NULL column that has no explicit DEFAULT clause in its definition.
```
ER_BAD_NULL_ERROR
ER_CUT_VALUE_GROUP_CONCAT
ER_DATA_TOO_LONG
ER_DATETIME_FUNCTION_OVERFLOW
ER_DIVISION_BY_ZERO
ER_INVALID_ARGUMENT_FOR_LOGARITHM
ER_NO_DEFAULT_FOR_FIELD
ER_NO_DEFAULT_FOR_VIEW_FIELD
ER_TOO_LONG_KEY
ER_TRUNCATED_WRONG_VALUE
ER_TRUNCATED_WRONG_VALUE_FOR_FIELD
ER_WARN_DATA_OUT_OF_RANGE
ER_WARN_NULL_TO_NOTNULL
ER_WARN_TOO_FEW_RECORDS
ER_WRONG_ARGUMENTS
ER_WRONG_VALUE_FOR_TYPE
WARN_DATA_TRUNCATED
```


Note
Because continued MySQL development defines new errors, there may be errors not in the preceding list to which strict SQL mode applies.

\subsection*{7.1.12 Connection Management}

This section describes how MySQL Server manages connections. This includes a description of the available connection interfaces, how the server uses connection handler threads, details about the administrative connection interface, and management of DNS lookups.

\subsection*{7.1.12.1 Connection Interfaces}

This section describes aspects of how the MySQL server manages client connections.
- Network Interfaces and Connection Manager Threads
- Client Connection Thread Management
- Connection Volume Management

\section*{Network Interfaces and Connection Manager Threads}

The server is capable of listening for client connections on multiple network interfaces. Connection manager threads handle client connection requests on the network interfaces that the server listens to:
- On all platforms, one manager thread handles TCP/IP connection requests.
- On Unix, the same manager thread also handles Unix socket file connection requests.
- On Windows, one manager thread handles shared-memory connection requests, and another handles named-pipe connection requests.
- On all platforms, an additional network interface may be enabled to accept administrative TCP/IP connection requests. This interface can use the manager thread that handles "ordinary" TCP/IP requests, or a separate thread.

The server does not create threads to handle interfaces that it does not listen to. For example, a Windows server that does not have support for named-pipe connections enabled does not create a thread to handle them.

Individual server plugins or components may implement their own connection interface:
- X Plugin enables MySQL Server to communicate with clients using X Protocol. See Section 22.5, " X Plugin".

\section*{Client Connection Thread Management}

Connection manager threads associate each client connection with a thread dedicated to it that handles authentication and request processing for that connection. Manager threads create a new thread when necessary but try to avoid doing so by consulting the thread cache first to see whether it contains a thread that can be used for the connection. When a connection ends, its thread is returned to the thread cache if the cache is not full.

In this connection thread model, there are as many threads as there are clients currently connected, which has some disadvantages when server workload must scale to handle large numbers of connections. For example, thread creation and disposal becomes expensive. Also, each thread requires server and kernel resources, such as stack space. To accommodate a large number of simultaneous connections, the stack size per thread must be kept small, leading to a situation where it is either too small or the server consumes large amounts of memory. Exhaustion of other resources can occur as well, and scheduling overhead can become significant.

MySQL Enterprise Edition includes a thread pool plugin that provides an alternative thread-handling model designed to reduce overhead and improve performance. It implements a thread pool that increases server performance by efficiently managing statement execution threads for large numbers of client connections. See Section 7.6.3, "MySQL Enterprise Thread Pool".

To control and monitor how the server manages threads that handle client connections, several system and status variables are relevant. (See Section 7.1.8, "Server System Variables", and Section 7.1.10, "Server Status Variables".)
- The thread_cache_size system variable determines the thread cache size. By default, the server autosizes the value at startup, but it can be set explicitly to override this default. A value of 0 disables caching, which causes a thread to be set up for each new connection and disposed of when the connection terminates. To enable $N$ inactive connection threads to be cached, set thread_cache_size to $N$ at server startup or at runtime. A connection thread becomes inactive when the client connection with which it was associated terminates.
- To monitor the number of threads in the cache and how many threads have been created because a thread could not be taken from the cache, check the Threads_cached and Threads_created status variables.
- When the thread stack is too small, this limits the complexity of the SQL statements the server can handle, the recursion depth of stored procedures, and other memory-consuming actions. To set a stack size of $N$ bytes for each thread, start the server with thread_stack set to $N$.

\section*{Connection Volume Management}

To control the maximum number of clients the server permits to connect simultaneously, set the max_connections system variable at server startup or at runtime. It may be necessary to increase max_connections if more clients attempt to connect simultaneously then the server is configured to handle (see Section B.3.2.5, "Too many connections"). If the server refuses a connection because the max_connections limit is reached, it increments the Connection_errors_max_connections status variable.
mysqld actually permits max_connections +1 client connections. The extra connection is reserved for use by accounts that have the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege). By granting the privilege to administrators and not to normal users (who should not need it), an administrator can connect to the server and use SHOW PROCESSLIST to diagnose problems even if the maximum number of unprivileged clients are connected. See Section 15.7.7.31, "SHOW PROCESSLIST Statement".

The server also permits administrative connections on an administrative network interface, which you can set up using a dedicated IP address and port. See Section 7.1.12.2, "Administrative Connection Management".

The Group Replication plugin interacts with MySQL Server using internal sessions to perform SQL API operations. Group Replication's internal sessions are handled separately from client connections, so they do not count towards the max_connections limit and are not refused if the server has reached this limit.

The maximum number of client connections MySQL supports (that is, the maximum value to which max_connections can be set) depends on several factors:
- The quality of the thread library on a given platform.
- The amount of RAM available.
- The amount of RAM is used for each connection.
- The workload from each connection.
- The desired response time.
- The number of file descriptors available.

Linux or Solaris should be able to support at least 500 to 1000 simultaneous connections routinely and as many as 10,000 connections if you have many gigabytes of RAM available and the workload from each is low or the response time target undemanding.

Increasing the max_connections value increases the number of file descriptors that mysqld requires. If the required number of descriptors are not available, the server reduces the value of max_connections. For comments on file descriptor limits, see Section 10.4.3.1, "How MySQL Opens and Closes Tables".

Increasing the open_files_limit system variable may be necessary, which may also require raising the operating system limit on how many file descriptors can be used by MySQL. Consult your operating system documentation to determine whether it is possible to increase the limit and how to do so. See also Section B.3.2.16, "File Not Found and Similar Errors".

\subsection*{7.1.12.2 Administrative Connection Management}

As mentioned in Connection Volume Management, to allow for the need to perform administrative operations even when max_connections connections are already established on the interfaces used for ordinary connections, the MySQL server permits a single administrative connection to users who have the CONNECTION_ADMIN privilege (or the deprecated SUPER privilege).

The server also permits dedicating a TCP/IP port for administrative connections, as described in the following sections.
- Administrative Interface Characteristics
- Administrative Interface Support for Encrypted Connections

\section*{Administrative Interface Characteristics}

The administrative connection interface has these characteristics:
- The server enables the interface only if the admin_address system variable is set at startup to indicate the IP address for it. If admin_address is not set, the server maintains no administrative interface.
- The admin_port system variable specifies the interface TCP/IP port number (default 33062 ).
- There is no limit on the number of administrative connections, but connections are permitted only for users who have the SERVICE_CONNECTION_ADMIN privilege.
- The create_admin_listener_thread system variable enables DBAs to choose at startup whether the administrative interface has its own separate thread. The default is 0FF; that is, the manager thread for ordinary connections on the main interface also handles connections for the administrative interface.

These lines in the server my. cnf file enable the administrative interface on the loopback interface and configure it to use port number 33064 (that is, a port different from the default):
```
[mysqld]
admin_address=127.0.0.1
admin_port=33064
```


MySQL client programs connect to either the main or administrative interface by specifying appropriate connection parameters. If the server running on the local host is using the default TCP/IP port numbers of 3306 and 33062 for the main and administrative interfaces, these commands connect to those interfaces:
```
mysql --protocol=TCP --port=3306
mysql --protocol=TCP --port=33062
```


\section*{Administrative Interface Support for Encrypted Connections}

The administrative interface has its own configuration parameters for encrypted connections. These correspond to the main interface parameters but enable independent configuration of encrypted connections for the administrative interface:

The admin_tls_xxx and admin_ssl_xxx system variables are like the tls_xxx and ssl_xxx system variables, but they configure the TLS context for the administrative interface rather than the main interface.

For general information about configuring connection-encryption support, see Section 8.3.1, "Configuring MySQL to Use Encrypted Connections", and Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers". That discussion is written for the main connection interface, but the parameter names are similar for the administrative connection interface. Use that discussion together with the following remarks, which provide information specific to the administrative interface.

TLS configuration for the administrative interface follows these rules:
- The administrative interface supports encrypted connections. For connections on the interface, the applicable TLS context depends on whether any nondefault administrative TLS parameter is configured:
- If all administrative TLS parameters have their default values, the administrative interface uses the same TLS context as the main interface.
- If any administrative TLS parameter has a nondefault value, the administrative interface uses the TLS context defined by its own parameters. (This is the case if any admin_tls_ $x x x$ or admin_ssl_ $x x x$ system variable is set to a value different from its default.) If a valid TLS context cannot be created from those parameters, the administrative interface falls back to the main interface TLS context.
- It is possible to disable encrypted connections to the administrative interface by setting the admin_tls_version system variable to the empty value to indicate that no TLS versions are supported. For example, these lines in the server my. cnf file disable encrypted connections on the administrative interface:
```
[mysqld]
admin_tls_version=''
```


\section*{Examples:}
- This configuration in the server my. cnf file enables the administrative interface, but does not set any of the TLS parameters specific to that interface:
```
[mysqld]
admin_address=127.0.0.1
```


As a result, the administrative interface supports encrypted connections (because encryption is supported by default when the administrative interface is enabled), and uses the main interface TLS context. When clients connect to the administrative interface, they should use the same certificate and key files as for ordinary connections on the main interface. For example (enter the command on a single line):
```
mysql --protocol=TCP --port=33062
    --ssl-ca=ca.pem
    --ssl-cert=client-cert.pem
    --ssl-key=client-key.pem
```

- This server configuration enables the administrative interface and sets the TLS certificate and key file parameters specific to that interface:
```
[mysqld]
admin_address=127.0.0.1
admin_ssl_ca=admin-ca.pem
admin_ssl_cert=admin-server-cert.pem
admin_ssl_key=admin-server-key.pem
```


As a result, the administrative interface supports encrypted connections using its own TLS context. When clients connect to the administrative interface, they should use certificate and key files specific to that interface. For example (enter the command on a single line):
```
mysql --protocol=TCP --port=33062
    --ssl-ca=admin-ca.pem
    --ssl-cert=admin-client-cert.pem
    --ssl-key=admin-client-key.pem
```


\subsection*{7.1.12.3 DNS Lookups and the Host Cache}

The MySQL server maintains an in-memory host cache that contains information about clients: IP address, host name, and error information. The Performance Schema host_cache table exposes the contents of the host cache so that it can be examined using SELECT statements. This may help you diagnose the causes of connection problems. See Section 29.12.22.3, "The host_cache Table".

The following sections discuss how the host cache works, as well as other topics such as how to configure and monitor the cache.
- Host Cache Operation
- Configuring the Host Cache
- Monitoring the Host Cache
- Flushing the Host Cache
- Dealing with Blocked Hosts

\section*{Host Cache Operation}

The server uses the host cache only for non-localhost TCP connections. It does not use the cache for TCP connections established using a loopback interface address (for example, 127.0.0.1 or ::1), or for connections established using a Unix socket file, named pipe, or shared memory.

The server uses the host cache for several purposes:
- By caching the results of IP-to-host name lookups, the server avoids doing a Domain Name System (DNS) lookup for each client connection. Instead, for a given host, it needs to perform a lookup only for the first connection from that host.
- The cache contains information about errors that occur during the client connection process. Some errors are considered "blocking." If too many of these occur successively from a given host without a successful connection, the server blocks further connections from that host. The max_connect_errors system variable determines the permitted number of successive errors before blocking occurs.

For each applicable new client connection, the server uses the client IP address to check whether the client host name is in the host cache. If so, the server refuses or continues to process the connection request depending on whether or not the host is blocked. If the host is not in the cache, the server attempts to resolve the host name. First, it resolves the IP address to a host name and resolves that host name back to an IP address. Then it compares the result to the original IP address to ensure that they are the same. The server stores information about the result of this operation in the host cache. If the cache is full, the least recently used entry is discarded.

The server performs host name resolution using the getaddrinfo() system call.
The server handles entries in the host cache like this:
1. When the first TCP client connection reaches the server from a given IP address, a new cache entry is created to record the client IP, host name, and client lookup validation flag. Initially, the host name is set to NULL and the flag is false. This entry is also used for subsequent client TCP connections from the same originating IP.
2. If the validation flag for the client IP entry is false, the server attempts an IP-to-host name-to-IP DNS resolution. If that is successful, the host name is updated with the resolved host name and the validation flag is set to true. If resolution is unsuccessful, the action taken depends on whether the error is permanent or transient. For permanent failures, the host name remains NULL and the validation flag is set to true. For transient failures, the host name and validation flag remain unchanged. (In this case, another DNS resolution attempt occurs the next time a client connects from this IP.)
3. If an error occurs while processing an incoming client connection from a given IP address, the server updates the corresponding error counters in the entry for that IP. For a description of the errors recorded, see Section 29.12.22.3, "The host_cache Table".

To unblock blocked hosts, flush the host cache; see Dealing with Blocked Hosts.

It is possible for a blocked host to become unblocked even without flushing the host cache if activity from other hosts occurs:
- If the cache is full when a connection arrives from a client IP not in the cache, the server discards the least recently used cache entry to make room for the new entry.
- If the discarded entry is for a blocked host, that host becomes unblocked.

Some connection errors are not associated with TCP connections, occur very early in the connection process (even before an IP address is known), or are not specific to any particular IP address (such as out-of-memory conditions). For information about these errors, check the Connection_errors_xxx status variables (see Section 7.1.10, "Server Status Variables").

\section*{Configuring the Host Cache}

The host cache is enabled by default. The host_cache_size system variable controls its size, as well as the size of the Performance Schema host_cache table that exposes the cache contents. The cache size can be set at server startup and changed at runtime. For example, to set the size to 100 at startup, put these lines in the server my. cnf file:
[mysqld]
host_cache_size=200
To change the size to 300 at runtime, do this:
SET GLOBAL host_cache_size=300;
Setting host_cache_size to 0 , either at server startup or at runtime, disables the host cache. With the cache disabled, the server performs a DNS lookup every time a client connects.

Changing the cache size at runtime causes an implicit host cache flushing operation that clears the host cache, truncates the host_cache table, and unblocks any blocked hosts; see Flushing the Host Cache.

To disable DNS host name lookups, start the server with the skip_name_resolve system variable enabled. In this case, the server uses only IP addresses and not host names to match connecting hosts to rows in the MySQL grant tables. Only accounts specified in those tables using IP addresses can be used. (A client may not be able to connect if no account exists that specifies the client IP address.)

If you have a very slow DNS and many hosts, you might be able to improve performance either by enabling skip_name_resolve to disable DNS lookups, or by increasing the value of host_cache_size to make the host cache larger.

To disallow TCP/IP connections entirely, start the server with the skip_networking system variable enabled.

To adjust the permitted number of successive connection errors before host blocking occurs, set the max_connect_errors system variable. For example, to set the value at startup put these lines in the server my.cnf file:
[mysqld]
max_connect_errors=10000
To change the value at runtime, do this:
SET GLOBAL max_connect_errors=10000;
Monitoring the Host Cache
The Performance Schema host_cache table exposes the contents of the host cache. This table can be examined using SELECT statements, which may help you diagnose the causes of connection problems. For information about this table, see Section 29.12.22.3, "The host_cache Table".

\section*{Flushing the Host Cache}

Flushing the host cache might be advisable or desirable under these conditions:
- Some of your client hosts change IP address.
- The error message Host 'host_name' is blocked occurs for connections from legitimate hosts. (See Dealing with Blocked Hosts.)

Flushing the host cache has these effects:
- It clears the in-memory host cache.
- It removes all rows from the Performance Schema host_cache table that exposes the cache contents.
- It unblocks any blocked hosts. This enables further connection attempts from those hosts.

To flush the host cache, use any of these methods:
- Change the value of the host_cache_size system variable. This requires the SYSTEM_VARIABLES_ADMIN privilege (or the deprecated SUPER privilege).
- Execute a TRUNCATE TABLE statement that truncates the Performance Schema host_cache table. This requires the DROP privilege for the table.
- Execute a mysqladmin flush-hosts command. This requires the DROP privilege for the Performance Schema host_cache table or the RELOAD privilege.

\section*{Dealing with Blocked Hosts}

The server uses the host cache to track errors that occur during the client connection process. If the following error occurs, it means that mysqld has received many connection requests from the given host that were interrupted in the middle:

Host 'host_name' is blocked because of many connection errors.
Unblock with 'mysqladmin flush-hosts'
The value of the max_connect_errors system variable determines how many successive interrupted connection requests the server permits before blocking a host. After max_connect_errors failed requests without a successful connection, the server assumes that something is wrong (for example, that someone is trying to break in), and blocks the host from further connection requests.

To unblock blocked hosts, flush the host cache; see Flushing the Host Cache.
Alternatively, to avoid having the error message occur, set max_connect_errors as described in Configuring the Host Cache. The default value of max_connect_errors is 100. Increasing max_connect_errors to a large value makes it less likely that a host reaches the threshold and becomes blocked. However, if the Host 'host_name' is blocked error message occurs, first verify that there is nothing wrong with TCP/IP connections from the blocked hosts. It does no good to increase the value of max_connect_errors if there are network problems.

\subsection*{7.1.13 IPv6 Support}

Support for IPv6 in MySQL includes these capabilities:
- MySQL Server can accept TCP/IP connections from clients connecting over IPv6. For example, this command connects over IPv6 to the MySQL server on the local host:
```
$> mysql -h ::1
```


To use this capability, two things must be true:
- Your system must be configured to support IPv6. See Section 7.1.13.1, "Verifying System Support for IPv6".
- The default MySQL server configuration permits IPv6 connections in addition to IPv4 connections. To change the default configuration, start the server with the bind_address system variable set to an appropriate value. See Section 7.1.8, "Server System Variables".
- MySQL account names permit IPv6 addresses to enable DBAs to specify privileges for clients that connect to the server over IPv6. See Section 8.2.4, "Specifying Account Names". IPv6 addresses can be specified in account names in statements such as CREATE USER, GRANT, and REVOKE. For example:
```
mysql> CREATE USER 'bill'@'::1' IDENTIFIED BY 'secret';
mysql> GRANT SELECT ON mydb.* TO 'bill'@'::1';
```

- IPv6 functions enable conversion between string and internal format IPv6 address formats, and checking whether values represent valid IPv6 addresses. For example, INET6_ATON ( ) and INET6_NTOA( ) are similar to INET_ATON( ) and INET_NTOA( ), but handle IPv6 addresses in addition to IPv4 addresses. See Section 14.23, "Miscellaneous Functions".
- Group Replication group members can use IPv6 addresses for communications within the group. A group can contain a mix of members using IPv6 and members using IPv4. See Section 20.5.5, "Support For IPv6 And For Mixed IPv6 And IPv4 Groups".

The following sections describe how to set up MySQL so that clients can connect to the server over IPv6.

\subsection*{7.1.13.1 Verifying System Support for IPv6}

Before MySQL Server can accept IPv6 connections, the operating system on your server host must support IPv6. As a simple test to determine whether that is true, try this command:
```
$> ping6 ::1
16 bytes from ::1, icmp_seq=0 hlim=64 time=0.171 ms
16 bytes from ::1, icmp_seq=1 hlim=64 time=0.077 ms
...
```


To produce a description of your system's network interfaces, invoke ifconfig - a and look for IPv6 addresses in the output.

If your host does not support IPv6, consult your system documentation for instructions on enabling it. It might be that you need only reconfigure an existing network interface to add an IPv6 address. Or a more extensive change might be needed, such as rebuilding the kernel with IPv6 options enabled.

These links may be helpful in setting up IPv6 on various platforms:
- Windows
- Gentoo Linux
- Ubuntu Linux
- Linux (Generic)
- macOS

\subsection*{7.1.13.2 Configuring the MySQL Server to Permit IPv6 Connections}

The MySQL server listens on one or more network sockets for TCP/IP connections. Each socket is bound to one address, but it is possible for an address to map onto multiple network interfaces.

Set the bind_address system variable at server startup to specify the TCP/IP connections that a server instance accepts. You can specify multiple values for this option, including any combination of

IPv6 addresses, IPv4 addresses, and host names that resolve to IPv6 or IPv4 addresses. Alternatively, you can specify one of the wildcard address formats that permit listening on multiple network interfaces. A value of *, which is the default, or a value of : :, permit both IPv4 and IPv6 connections on all server host IPv4 and IPv6 interfaces. For more information, see the bind_address description in Section 7.1.8, "Server System Variables".

\subsection*{7.1.13.3 Connecting Using the IPv6 Local Host Address}

The following procedure shows how to configure MySQL to permit IPv6 connections by clients that connect to the local server using the ::1 local host address. The instructions given here assume that your system supports IPv6.
1. Start the MySQL server with an appropriate bind_address setting to permit it to accept IPv6 connections. For example, put the following lines in the server option file and restart the server:
```
[mysqld]
bind_address = *
```


Specifying * (or : :) as the value for bind_address permits both IPv4 and IPv6 connections on all server host IPv4 and IPv6 interfaces. If you want to bind the server to a specific list of addresses, you can do this by specifying a comma-separated list of values for bind_address. This example specifies the local host addresses for both IPv4 and IPv6:
```
[mysqld]
bind_address = 127.0.0.1,::1
```


For more information, see the bind_address description in Section 7.1.8, "Server System Variables".
2. As an administrator, connect to the server and create an account for a local user who can connect from the : : 1 local IPv6 host address:
```
mysql> CREATE USER 'ipv6user'@'::1' IDENTIFIED BY 'ipv6pass';
```


For the permitted syntax of IPv6 addresses in account names, see Section 8.2.4, "Specifying Account Names". In addition to the CREATE USER statement, you can issue GRANT statements that give specific privileges to the account, although that is not necessary for the remaining steps in this procedure.
3. Invoke the mysql client to connect to the server using the new account:
```
$> mysql -h ::1 -u ipv6user -pipv6pass
```

4. Try some simple statements that show connection information:
```
mysql> STATUS
...
Connection: ::1 via TCP/IP
...
mysql> SELECT CURRENT_USER(), @@bind_address;
+-----------------+----------------+
| CURRENT_USER() | @@bind_address |
+-----------------+----------------+
| ipv6user@::1 | :: |
+-----------------+----------------+
```


\subsection*{7.1.13.4 Connecting Using IPv6 Nonlocal Host Addresses}

The following procedure shows how to configure MySQL to permit IPv6 connections by remote clients. It is similar to the preceding procedure for local clients, but the server and client hosts are distinct and each has its own nonlocal IPv6 address. The example uses these addresses:
```
Server host: 2001:db8:0:f101::1
Client host: 2001:db8:0:f101::2
```


These addresses are chosen from the nonroutable address range recommended by IANA for documentation purposes and suffice for testing on your local network. To accept IPv6 connections from clients outside the local network, the server host must have a public address. If your network provider assigns you an IPv6 address, you can use that. Otherwise, another way to obtain an address is to use an IPv6 broker; see Section 7.1.13.5, "Obtaining an IPv6 Address from a Broker".
1. Start the MySQL server with an appropriate bind_address setting to permit it to accept IPv6 connections. For example, put the following lines in the server option file and restart the server:
```
[mysqld]
bind_address = *
```


Specifying * (or : :) as the value for bind_address permits both IPv4 and IPv6 connections on all server host IPv4 and IPv6 interfaces. If you want to bind the server to a specific list of addresses, you can do this by specifying a comma-separated list of values for bind_address. This example specifies an IPv4 address as well as the required server host IPv6 address:
```
[mysqld]
bind_address = 198.51.100.20,2001:db8:0:f101::1
```


For more information, see the bind_address description in Section 7.1.8, "Server System Variables".
2. On the server host (2001:db8:0:f101::1), create an account for a user who can connect from the client host (2001: db8:0: f101: : 2):
```
mysql> CREATE USER 'remoteipv6user'@'2001:db8:0:f101::2' IDENTIFIED BY 'remoteipv6pass';
```

3. On the client host (2001: db8:0:f101::2), invoke the mysql client to connect to the server using the new account:
```
$> mysql -h 2001:db8:0:f101::1 -u remoteipv6user -premoteipv6pass
```

4. Try some simple statements that show connection information:
```
mysql> STATUS
...
Connection: 2001:db8:0:f101::1 via TCP/IP
...
mysql> SELECT CURRENT_USER(), @@bind_address;
+------------------------------------+---------------+
| CURRENT_USER() | @@bind_address |
+-------------------------------------+----------------+
| remoteipv6user@2001:db8:0:f101::2 | :: |
+------------------------------------+---------------+
```


\subsection*{7.1.13.5 Obtaining an IPv6 Address from a Broker}

If you do not have a public IPv6 address that enables your system to communicate over IPv6 outside your local network, you can obtain one from an IPv6 broker. The Wikipedia IPv6 Tunnel Broker page lists several brokers and their features, such as whether they provide static addresses and the supported routing protocols.

After configuring your server host to use a broker-supplied IPv6 address, start the MySQL server with an appropriate bind_address setting to permit the server to accept IPv6 connections. You can specify * (or : :) as the bind_address value, or bind the server to the specific IPv6 address provided by the broker. For more information, see the bind_address description in Section 7.1.8, "Server System Variables".

Note that if the broker allocates dynamic addresses, the address provided for your system might change the next time you connect to the broker. If so, any accounts you create that name the original address become invalid. To bind to a specific address but avoid this change-of-address problem, you might be able to arrange with the broker for a static IPv6 address.

The following example shows how to use Freenet6 as the broker and the gogoc IPv6 client package on Gentoo Linux.
1. Create an account at Freenet6 by visiting this URL and signing up:
```
http://gogonet.gogo6.com
```

2. After creating the account, go to this URL, sign in, and create a user ID and password for the IPv6 broker:
```
http://gogonet.gogo6.com/page/freenet6-registration
```

3. As root, install gogoc:
```
$> emerge gogoc
```

4. Edit /etc/gogoc/gogoc.conf to set the userid and password values. For example:
```
userid=gogouser
passwd=gogopass
```

5. Start gogoc:
```
$> /etc/init.d/gogoc start
```


To start gogoc each time your system boots, execute this command:
```
$> rc-update add gogoc default
```

6. Use ping6 to try to ping a host:
```
$> ping6 ipv6.google.com
```

7. To see your IPv6 address:
```
$> ifconfig tun
```


\subsection*{7.1.14 Network Namespace Support}

A network namespace is a logical copy of the network stack from the host system. Network namespaces are useful for setting up containers or virtual environments. Each namespace has its own IP addresses, network interfaces, routing tables, and so forth. The default or global namespace is the one in which the host system physical interfaces exist.

Namespace-specific address spaces can lead to problems when MySQL connections cross namespaces. For example, the network address space for a MySQL instance running in a container or virtual network may differ from the address space of the host machine. This can produce phenomena such as a client connection from an address in one namespace appearing to the MySQL server to be coming from a different address, even for client and server running on the same machine. Suppose that both processes run on a host with IP address 203.0.113.10 but use different namespaces. A connection may produce a result like this:
```
$> mysql --user=admin --host=203.0.113.10 --protocol=tcp
mysql> SELECT USER();
+---------------------+
| USER() |
+----------------------+
| admin@198.51.100.2 |
+----------------------+
```


In this case, the expected USER( ) value is admin@203.0.113.10. Such behavior can make it difficult to assign account permissions properly if the address from which an connection originates is not what it appears.

To address this issue, MySQL enables specifying the network namespace to use for TCP/IP connections, so that both endpoints of connections use an agreed-upon common address space.

MySQL supports network namespaces on platforms that implement them. Support within MySQL applies to:
- The MySQL server, mysqld.
- X Plugin.
- The mysql client and the mysqlxtest test suite client. (Other clients are not supported. They must be invoked from within the network namespace of the server to which they are to connect.)
- Regular replication.
- Group Replication, only when using the MySQL communication stack to establish group communication connections.

The following sections describe how to use network namespaces in MySQL:
- Host System Prerequisites
- MySQL Configuration
- Network Namespace Monitoring

\section*{Host System Prerequisites}

Prior to using network namespace support in MySQL, these host system prerequisites must be satisfied:
- The host operating system must support network namespaces. (For example, Linux.)
- Any network namespace to be used by MySQL must first be created on the host system.
- Host name resolution must be configured by the system administrator to support network namespaces.

\section*{Note}

A known limitation is that, within MySQL, host name resolution does not work for names specified in network namespace-specific host files. For example, if the address for a host name in the red namespace is specified in the / etc/netns/red/hosts file, binding to the name fails on both the server and client sides. The workaround is to use the IP address rather than the host name.
- The system administrator must enable the CAP_SYS_ADMIN operating system privilege for the MySQL binaries that support network namespaces (mysqld, mysql, mysqlxtest).

\section*{Important}

Enabling CAP_SYS_ADMIN is a security sensitive operation because it enables a process to perform other privileged actions in addition to setting namespaces. For a description of its effects, see https://man7.org/linux/manpages/man7/capabilities.7.html.

Because CAP_SYS_ADMIN must be enabled explicitly by the system administrator, MySQL binaries by default do not have network namespace support enabled. The system administrator should evaluate the security implications of running MySQL processes with CAP_SYS_ADMIN before enabling it.

The instructions in the following example set up network namespaces named red and blue. The names you choose may differ, as may the network addresses and interfaces on your host system.

Invoke the commands shown here either as the root operating system user or by prefixing each command with sudo. For example, to invoke the ip or setcap command if you are not root, use sudo ip or sudo setcap.

To configure network namespaces, use the ip command. For some operations, the ip command must execute within a particular namespace (which must already exist). In such cases, begin the command like this:
```
ip netns exec namespace_name
```


For example, this command executes within the red namespace to bring up the loopback interface:
```
ip netns exec red ip link set lo up
```


To add namespaces named red and blue, each with its own virtual Ethernet device used as a link between namespaces and its own loopback interface:
```
ip netns add red
ip link add veth-red type veth peer name vpeer-red
ip link set vpeer-red netns red
ip addr add 192.0.2.1/24 dev veth-red
ip link set veth-red up
ip netns exec red ip addr add 192.0.2.2/24 dev vpeer-red
ip netns exec red ip link set vpeer-red up
ip netns exec red ip link set lo up
ip netns add blue
ip link add veth-blue type veth peer name vpeer-blue
ip link set vpeer-blue netns blue
ip addr add 198.51.100.1/24 dev veth-blue
ip link set veth-blue up
ip netns exec blue ip addr add 198.51.100.2/24 dev vpeer-blue
ip netns exec blue ip link set vpeer-blue up
ip netns exec blue ip link set lo up
# if you want to enable inter-subnet routing...
sysctl net.ipv4.ip_forward=1
ip netns exec red ip route add default via 192.0.2.1
ip netns exec blue ip route add default via 198.51.100.1
```


A diagram of the links between namespaces looks like this:
```
red global blue
192.0.2.2 <=> 192.0.2.1
(vpeer-red) (veth-red)
    198.51.100.1 <=> 198.51.100.2
    (veth-blue) (vpeer-blue)
```


To check which namespaces and links exist:
```
ip netns list
ip link list
```


To see the routing tables for the global and named namespaces:
```
ip route show
ip netns exec red ip route show
ip netns exec blue ip route show
```


To remove the red and blue links and namespaces:
```
ip link del veth-red
ip link del veth-blue
```

```
ip netns del red
ip netns del blue
sysctl net.ipv4.ip_forward=0
```


So that the MySQL binaries that include network namespace support can actually use namespaces, you must grant them the CAP_SYS_ADMIN capability. The following setcap commands assume that you have changed location to the directory containing your MySQL binaries (adjust the pathname for your system as necessary):
```
cd /usr/local/mysql/bin
```


To grant CAP_SYS_ADMIN capability to the appropriate binaries:
```
setcap cap_sys_admin+ep ./mysqld
setcap cap_sys_admin+ep ./mysql
setcap cap_sys_admin+ep ./mysqlxtest
```


To check CAP_SYS_ADMIN capability:
```
$> getcap ./mysqld ./mysql ./mysqlxtest
./mysqld = cap_sys_admin+ep
./mysql = cap_sys_admin+ep
./mysqlxtest = cap_sys_admin+ep
```


To remove CAP_SYS_ADMIN capability:
```
setcap -r ./mysqld
setcap -r ./mysql
setcap -r ./mysqlxtest
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0989.jpg?height=122&width=104&top_left_y=1398&top_left_x=365)

\section*{Important}

If you reinstall binaries to which you have previously applied setcap, you must use setcap again. For example, if you perform an in-place MySQL upgrade, failure to grant the CAP_SYS_ADMIN capability again results in namespacerelated failures. The server fails with this error for attempts to bind to an address with a named namespace:
[ERROR] [MY-013408] [Server] setns() failed with error 'Operation not permitted'
A client invoked with the - - network - namespace option fails like this:
ERROR: Network namespace error: Operation not permitted

\section*{MySQL Configuration}

Assuming that the preceding host system prerequisites have been satisfied, MySQL enables configuring the server-side namespace for the listening (inbound) side of connections and the clientside namespace for the outbound side of connections.

On the server side, the bind_address, admin_address, and mysqlx_bind_address system variables have extended syntax for specifying the network namespace to use for a given IP address or host name on which to listen for incoming connections. To specify a namespace for an address, add a slash and the namespace name. For example, a server my.cnf file might contain these lines:
```
[mysqld]
bind_address = 127.0.1.1,192.0.2.2/red,198.51.100.2/blue
admin_address = 102.0.2.2/red
mysqlx_bind_address = 102.0.2.2/red
```


These rules apply:
- A network namespace can be specified for an IP address or a host name.
- A network namespace cannot be specified for a wildcard IP address.
- For a given address, the network namespace is optional. If given, it must be specified as a /ns suffix immediately following the address.
- An address with no /ns suffix uses the host system global namespace. The global namespace is therefore the default.
- An address with a /ns suffix uses the namespace named ns.
- The host system must support network namespaces and each named namespace must previously have been set up. Naming a nonexistent namespace produces an error.
- bind_address and mysqlx_bind_address accept a list of multiple comma-separated addresses, the variable value can specify addresses in the global namespace, in named namespaces, or a mix.

If an error occurs during server startup for attempts to use a namespace, the server does not start. If errors occur for X Plugin during plugin initialization such that it is unable to bind to any address, the plugin fails its initialization sequence and the server does not load it.

On the client side, a network namespace can be specified in these contexts:
- For the mysql client and the mysqlxtest test suite client, use the --network-namespace option. For example:
```
mysql --host=192.0.2.2 --network-namespace=red
```


If the --network-namespace option is omitted, the connection uses the default (global) namespace.
- For replication connections from replica servers to source servers, use the CHANGE REPLICATION SOURCE TO statement and specify the NETWORK_NAMESPACE option. For example:
```
CHANGE REPLICATION SOURCE TO
    SOURCE_HOST = '192.0.2.2',
    NETWORK_NAMESPACE = 'red';
```


If the NETWORK_NAMESPACE option is omitted, replication connections use the default (global) namespace.

The following example sets up a MySQL server that listens for connections in the global, red, and blue namespaces, and shows how to configure accounts that connect from the red and blue namespaces. It is assumed that the red and blue namespaces have already been created as shown in Host System Prerequisites.
1. Configure the server to listen on addresses in multiple namespaces. Put these lines in the server my. cnf file and start the server:
```
[mysqld]
bind_address = 127.0.1.1,192.0.2.2/red,198.51.100.2/blue
```


The value tells the server to listen on the loopback address 127.0 .0 .1 in the global namespace, the address 192.0.2.2 in the red namespace, and the address 198.51.100.2 in the blue namespace.
2. Connect to the server in the global namespace and create accounts that have permission to connect from an address in the address space of each named namespace:
```
$> mysql -u root -h 127.0.0.1 -p
Enter password: root_password
mysql> CREATE USER 'red_user'@'192.0.2.2'
    IDENTIFIED BY 'red_user_password';
mysql> CREATE USER 'blue_user'@'198.51.100.2'
```


\section*{IDENTIFIED BY 'blue_user_password';}
3. Verify that you can connect to the server in each named namespace:
```
$> mysql -u red_user -h 192.0.2.2 --network-namespace=red -p
Enter password: red_user_password
mysql> SELECT USER();
+----------------------+
| USER() |
+---------------------+
| red_user@192.0.2.2 |
+---------------------+
```

\$> mysql -u blue_user -h 198.51.100.2 --network-namespace=blue -p
Enter password: blue_user_password
mysql> SELECT USER();
+------------------------+
| USER() |
+------------------------+
| blue_user@198.51.100.2 |
+------------------------+

Note
You might see different results from USER( ), which can return a value that includes a host name rather than an IP address if your DNS is configured to be able to resolve the address to the corresponding host name and the server is not run with the skip_name_resolve system variable enabled.

You might also try invoking mysql without the --network-namespace option to see whether the connection attempt succeeds, and, if so, how the USER() value is affected.

\section*{Network Namespace Monitoring}

For replication monitoring purposes, these information sources have a column that displays the applicable network namespace for connections:
- The Performance Schema replication_connection_configuration table. See Section 29.12.11.11, "The replication_connection_configuration Table".
- The replica server connection metadata repository. See Section 19.2.4.2, "Replication Metadata Repositories".
- The SHOW REPLICA STATUS statement.

\subsection*{7.1.15 MySQL Server Time Zone Support}

This section describes the time zone settings maintained by MySQL, how to load the system tables required for named time support, how to stay current with time zone changes, and how to enable leapsecond support.

Time zone offsets are also supported for inserted datetime values; see Section 13.2.2, "The DATE, DATETIME, and TIMESTAMP Types", for more information.

For information about time zone settings in replication setups, see Section 19.5.1.14, "Replication and System Functions" and Section 19.5.1.33, "Replication and Time Zones".
- Time Zone Variables
- Populating the Time Zone Tables
- Staying Current with Time Zone Changes
- Time Zone Leap Second Support

\section*{Time Zone Variables}

MySQL Server maintains several time zone settings:
- The server system time zone. When the server starts, it attempts to determine the time zone of the host machine and uses it to set the system_time_zone system variable.

To explicitly specify the system time zone for MySQL Server at startup, set the TZ environment variable before you start mysqld. If you start the server using mysqld_safe, its --timezone option provides another way to set the system time zone. The permissible values for TZ and - timezone are system dependent. Consult your operating system documentation to see what values are acceptable.
- The server current time zone. The global time_zone system variable indicates the time zone the server currently is operating in. The initial time_zone value is 'SYSTEM ', which indicates that the server time zone is the same as the system time zone.

\section*{Note}

If set to SYSTEM, every MySQL function call that requires a time zone calculation makes a system library call to determine the current system time zone. This call may be protected by a global mutex, resulting in contention.

The initial global server time zone value can be specified explicitly at startup with the --default-time-zone option on the command line, or you can use the following line in an option file:
default-time-zone='timezone'
If you have the SYSTEM_VARIABLES_ADMIN privilege (or the deprecated SUPER privilege), you can set the global server time zone value at runtime with this statement:
```
SET GLOBAL time_zone = timezone;
```

- Per-session time zones. Each client that connects has its own session time zone setting, given by the session time_zone variable. Initially, the session variable takes its value from the global time_zone variable, but the client can change its own time zone with this statement:

SET time_zone = timezone;
The session time zone setting affects display and storage of time values that are zone-sensitive. This includes the values displayed by functions such as NOW ( ) or CURTIME ( ), and values stored in and retrieved from TIMESTAMP columns. Values for TIMESTAMP columns are converted from the session time zone to UTC for storage, and from UTC to the session time zone for retrieval.

The session time zone setting does not affect values displayed by functions such as UTC_TIMESTAMP( ) or values in DATE, TIME, or DATETIME columns. Nor are values in those data types stored in UTC; the time zone applies for them only when converting from TIMESTAMP values. If you want locale-specific arithmetic for DATE, TIME, or DATETIME values, convert them to UTC, perform the arithmetic, and then convert back.

The current global and session time zone values can be retrieved like this:
SELECT @@GLOBAL.time_zone, @@SESSION.time_zone;
timezone values can be given in several formats, none of which are case-sensitive:
- As the value 'SYSTEM ' , indicating that the server time zone is the same as the system time zone.
- As a string indicating an offset from UTC of the form $[H] H$ : MM, prefixed with a + or -, such as ${ }^{\prime}+10: 00$ ', '-6:00', or '+05:30'. A leading zero can optionally be used for hours values less
than 10; MySQL prepends a leading zero when storing and retrieving the value in such cases. MySQL converts ' - 00:00' or ' -0:00' to '+00:00'.

This value must be in the range ' $-13: 59$ ' to ' $+14: 00$ ', inclusive.
- As a named time zone, such as 'Europe/Helsinki', 'US/Eastern', 'MET', or 'UTC'.

\section*{Note}

Named time zones can be used only if the time zone information tables in the mysql database have been created and populated. Otherwise, use of a named time zone results in an error:
```
mysql> SET time_zone = 'UTC';
ERROR 1298 (HY000): Unknown or incorrect time zone: 'UTC'
```


\section*{Populating the Time Zone Tables}

Several tables in the mysql system schema exist to store time zone information (see Section 7.3, "The mysql System Schema"). The MySQL installation procedure creates the time zone tables, but does not load them. To do so manually, use the following instructions.

\section*{Note}

Loading the time zone information is not necessarily a one-time operation because the information changes occasionally. When such changes occur, applications that use the old rules become out of date and you may find it necessary to reload the time zone tables to keep the information used by your MySQL server current. See Staying Current with Time Zone Changes.

If your system has its own zoneinfo database (the set of files describing time zones), use the mysql_tzinfo_to_sql program to load the time zone tables. Examples of such systems are Linux, macOS, FreeBSD, and Solaris. One likely location for these files is the /usr/share/zoneinfo directory. If your system has no zoneinfo database, you can use a downloadable package, as described later in this section.

To load the time zone tables from the command line, pass the zoneinfo directory path name to mysql_tzinfo_to_sql and send the output into the mysql program. For example:
mysql_tzinfo_to_sql /usr/share/zoneinfo | mysql -u root -p mysql
The mysql command shown here assumes that you connect to the server using an account such as root that has privileges for modifying tables in the mysql system schema. Adjust the connection parameters as required.
mysql_tzinfo_to_sql reads your system's time zone files and generates SQL statements from them. mysql processes those statements to load the time zone tables.
mysql_tzinfo_to_sql also can be used to load a single time zone file or generate leap second information:
- To load a single time zone file $t z_{-} f i l e$ that corresponds to a time zone name $t z \_$name, invoke mysql_tzinfo_to_sql like this:
```
mysql_tzinfo_to_sql tz_file tz_name | mysql -u root -p mysql
```


With this approach, you must execute a separate command to load the time zone file for each named zone that the server needs to know about.
- If your time zone must account for leap seconds, initialize leap second information like this, where $t z_{-} f i l e$ is the name of your time zone file:
```
mysql_tzinfo_to_sql --leap tz_file | mysql -u root -p mysql
```


After running mysql_tzinfo_to_sql, restart the server so that it does not continue to use any previously cached time zone data.

If your system has no zoneinfo database (for example, Windows), you can use a package containing SQL statements that is available for download at the MySQL Developer Zone:
https://dev.mysql.com/downloads/timezones.html

\section*{Warning}

Do not use a downloadable time zone package if your system has a zoneinfo database. Use the mysql_tzinfo_to_sql utility instead. Otherwise, you may cause a difference in datetime handling between MySQL and other applications on your system.

To use an SQL-statement time zone package that you have downloaded, unpack it, then load the unpacked file contents into the time zone tables:
mysql -u root -p mysql < file_name
Then restart the server.

\section*{Warning}

Do not use a downloadable time zone package that contains MyISAM tables. That is intended for older MySQL versions. MySQL now uses InnoDB for the time zone tables. Trying to replace them with MyISAM tables causes problems.

\section*{Staying Current with Time Zone Changes}

When time zone rules change, applications that use the old rules become out of date. To stay current, it is necessary to make sure that your system uses current time zone information is used. For MySQL, there are multiple factors to consider in staying current:
- The operating system time affects the value that the MySQL server uses for times if its time zone is set to SYSTEM. Make sure that your operating system is using the latest time zone information. For most operating systems, the latest update or service pack prepares your system for the time changes. Check the website for your operating system vendor for an update that addresses the time changes.
- If you replace the system's /etc/localtime time zone file with a version that uses rules differing from those in effect at mysqld startup, restart mysqld so that it uses the updated rules. Otherwise, mysqld might not notice when the system changes its time.
- If you use named time zones with MySQL, make sure that the time zone tables in the mysql database are up to date:
- If your system has its own zoneinfo database, reload the MySQL time zone tables whenever the zoneinfo database is updated.
- For systems that do not have their own zoneinfo database, check the MySQL Developer Zone for updates. When a new update is available, download it and use it to replace the content of your current time zone tables.

For instructions for both methods, see Populating the Time Zone Tables. mysqld caches time zone information that it looks up, so after updating the time zone tables, restart mysqld to make sure that it does not continue to serve outdated time zone data.

If you are uncertain whether named time zones are available, for use either as the server's time zone setting or by clients that set their own time zone, check whether your time zone tables are empty. The following query determines whether the table that contains time zone names has any rows:
```
mysql> SELECT COUNT(*) FROM mysql.time_zone_name;
+-----------+
| COUNT(*) |
+-----------+
| 0 |
+-----------+
```


A count of zero indicates that the table is empty. In this case, no applications currently are using named time zones, and you need not update the tables (unless you want to enable named time zone support). A count greater than zero indicates that the table is not empty and that its contents are available to be used for named time zone support. In this case, be sure to reload your time zone tables so that applications that use named time zones can obtain correct query results.

To check whether your MySQL installation is updated properly for a change in Daylight Saving Time rules, use a test like the one following. The example uses values that are appropriate for the 2007 DST 1-hour change that occurs in the United States on March 11 at 2 a.m.

The test uses this query:
```
SELECT
    CONVERT_TZ('2007-03-11 2:00:00','US/Eastern','US/Central') AS time1,
    CONVERT_TZ('2007-03-11 3:00:00','US/Eastern','US/Central') AS time2;
```


The two time values indicate the times at which the DST change occurs, and the use of named time zones requires that the time zone tables be used. The desired result is that both queries return the same result (the input time, converted to the equivalent value in the 'US/Central' time zone).

Before updating the time zone tables, you see an incorrect result like this:
```
+----------------------+---------------------
| time1 | time2 |
+----------------------+---------------------+
| 2007-03-11 01:00:00 | 2007-03-11 02:00:00 |
+----------------------+---------------------+
```


After updating the tables, you should see the correct result:
```
+----------------------+----------------------
| time1 | time2 |
+----------------------+--------------------+
| 2007-03-11 01:00:00 | 2007-03-11 01:00:00 |
+----------------------+---------------------+
```


\section*{Time Zone Leap Second Support}

Leap second values are returned with a time part that ends with $: 59: 59$. This means that a function such as NOW ( ) can return the same value for two or three consecutive seconds during the leap second. It remains true that literal temporal values having a time part that ends with :59:60 or :59:61 are considered invalid.

If it is necessary to search for TIMESTAMP values one second before the leap second, anomalous results may be obtained if you use a comparison with ' $Y Y Y Y-M M-D D$ hh:mm:ss' values. The following example demonstrates this. It changes the session time zone to UTC so there is no difference between internal TIMESTAMP values (which are in UTC) and displayed values (which have time zone correction applied).
```
mysql> CREATE TABLE t1 (
        a INT,
        ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (ts)
    );
Query OK, 0 rows affected (0.01 sec)
mysql> -- change to UTC
mysql> SET time_zone = '+00:00';
Query OK, 0 rows affected (0.00 sec)
```

```
mysql> -- Simulate NOW() = '2008-12-31 23:59:59'
mysql> SET timestamp = 1230767999;
Query OK, 0 rows affected (0.00 sec)
mysql> INSERT INTO t1 (a) VALUES (1);
Query OK, 1 row affected (0.00 sec)
mysql> -- Simulate NOW() = '2008-12-31 23:59:60'
mysql> SET timestamp = 1230768000;
Query OK, 0 rows affected (0.00 sec)
mysql> INSERT INTO t1 (a) VALUES (2);
Query OK, 1 row affected (0.00 sec)
mysql> -- values differ internally but display the same
mysql> SELECT a, ts, UNIX_TIMESTAMP(ts) FROM t1;
+-------+----------------------+-------------------+
| a | ts | UNIX_TIMESTAMP(ts) |
+-------+----------------------+-------------------+
| 1 | 2008-12-31 23:59:59 | 1230767999 |
| 2 | 2008-12-31 23:59:59 | 1230768000 |
+-------+----------------------+-------------------+
2 rows in set (0.00 sec)
mysql> -- only the non-leap value matches
mysql> SELECT * FROM t1 WHERE ts = '2008-12-31 23:59:59';
+------+----------------------+
| a | ts |
+------+----------------------+
| 1 | 2008-12-31 23:59:59 |
+------+----------------------+
1 row in set (0.00 sec)
mysql> -- the leap value with seconds=60 is invalid
mysql> SELECT * FROM t1 WHERE ts = '2008-12-31 23:59:60';
Empty set, 2 warnings (0.00 sec)
```


To work around this, you can use a comparison based on the UTC value actually stored in the column, which has the leap second correction applied:
```
mysql> -- selecting using UNIX_TIMESTAMP value return leap value
mysql> SELECT * FROM t1 WHERE UNIX_TIMESTAMP(ts) = 1230768000;
+------+----------------------+
| a | ts |
+------+----------------------+
| 2 | 2008-12-31 23:59:59 |
+------+----------------------+
1 row in set (0.00 sec)
```


\subsection*{7.1.16 Resource Groups}

MySQL supports creation and management of resource groups, and permits assigning threads running within the server to particular groups so that threads execute according to the resources available to the group. Group attributes enable control over its resources, to enable or restrict resource consumption by threads in the group. DBAs can modify these attributes as appropriate for different workloads.

Currently, CPU time is a manageable resource, represented by the concept of "virtual CPU" as a term that includes CPU cores, hyperthreads, hardware threads, and so forth. The server determines at startup how many virtual CPUs are available, and database administrators with appropriate privileges can associate these CPUs with resource groups and assign threads to groups.

For example, to manage execution of batch jobs that need not execute with high priority, a DBA can create a Batch resource group, and adjust its priority up or down depending on how busy the server is. (Perhaps batch jobs assigned to the group should run at lower priority during the day and at higher priority during the night.) The DBA can also adjust the set of CPUs available to the group. Groups can be enabled or disabled to control whether threads are assignable to them.

The following sections describe aspects of resource group use in MySQL:
- Resource Group Elements
- Resource Group Attributes
- Resource Group Management
- Resource Group Replication
- Resource Group Restrictions
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-0997.jpg?height=115&width=104&top_left_y=701&top_left_x=365)

\section*{Important}

On some platforms or MySQL server configurations, resource groups are unavailable or have limitations. In particular, Linux systems might require a manual step for some installation methods. For details, see Resource Group Restrictions.

\section*{Resource Group Elements}

These capabilities provide the SQL interface for resource group management in MySQL:
- SQL statements enable creating, altering, and dropping resource groups, and enable assigning threads to resource groups. An optimizer hint enables assigning individual statements to resource groups.
- Resource group privileges provide control over which users can perform resource group operations.
- The Information Schema RESOURCE_GROUPS table exposes information about resource group definitions and the Performance Schema threads table shows the resource group assignment for each thread.
- Status variables provide execution counts for each management SQL statement.

\section*{Resource Group Attributes}

Resource groups have attributes that define the group. All attributes can be set at group creation time. Some attributes are fixed at creation time; others can be modified any time thereafter.

These attributes are defined at resource group creation time and cannot be modified:
- Each group has a name. Resource group names are identifiers like table and column names, and need not be quoted in SQL statements unless they contain special characters or are reserved words. Group names are not case-sensitive and may be up to 64 characters long.
- Each group has a type, which is either SYSTEM or USER. The resource group type affects the range of priority values assignable to the group, as described later. This attribute together with the differences in permitted priorities enables system threads to be identified so as to protect them from contention for CPU resources against user threads.

System and user threads correspond to background and foreground threads as listed in the Performance Schema threads table.

These attributes are defined at resource group creation time and can be modified any time thereafter:
- The CPU affinity is the set of virtual CPUs the resource group can use. An affinity can be any nonempty subset of the available CPUs. If a group has no affinity, it can use all available CPUs.
- The thread priority is the execution priority for threads assigned to the resource group. Priority values range from -20 (highest priority) to 19 (lowest priority). The default priority is 0 , for both system and user groups.

System groups are permitted a higher priority than user groups, ensuring that user threads never have a higher priority than system threads:
- For system resource groups, the permitted priority range is -20 to 0 .
- For user resource groups, the permitted priority range is 0 to 19 .
- Each group can be enabled or disabled, affording administrators control over thread assignment. Threads can be assigned only to enabled groups.

\section*{Resource Group Management}

By default, there is one system group and one user group, named SYS_default and USR_default, respectively. These default groups cannot be dropped and their attributes cannot be modified. Each default group has no CPU affinity and priority 0 .

Newly created system and user threads are assigned to the SYS_default and USR_default groups, respectively.

For user-defined resource groups, all attributes are assigned at group creation time. After a group has been created, its attributes can be modified, with the exception of the name and type attributes.

To create and manage user-defined resource groups, use these SQL statements:
- CREATE RESOURCE GROUP creates a new group. See Section 15.7.2.2, "CREATE RESOURCE GROUP Statement".
- ALTER RESOURCE GROUP modifies an existing group. See Section 15.7.2.1, "ALTER RESOURCE GROUP Statement".
- DROP RESOURCE GROUP drops an existing group. See Section 15.7.2.3, "DROP RESOURCE GROUP Statement".

Those statements require the RESOURCE_GROUP_ADMIN privilege.
To manage resource group assignments, use these capabilities:
- SET RESOURCE GROUP assigns threads to a group. See Section 15.7.2.4, "SET RESOURCE GROUP Statement".
- The RESOURCE_GROUP optimizer hint assigns individual statements to a group. See Section 10.9.3, "Optimizer Hints".

Those operations require the RESOURCE_GROUP_ADMIN or RESOURCE_GROUP_USER privilege.
Resource group definitions are stored in the resource_groups data dictionary table so that groups persist across server restarts. Because resource_groups is part of the data dictionary, it is not directly accessible by users. Resource group information is available using the Information Schema RESOURCE_GROUPS table, which is implemented as a view on the data dictionary table. See Section 28.3.26, "The INFORMATION_SCHEMA RESOURCE_GROUPS Table".

Initially, the RESOURCE_GROUPS table has these rows describing the default groups:
```
mysql> SELECT * FROM INFORMATION_SCHEMA.RESOURCE_GROUPS\G
************************** 1. row *****************************
    RESOURCE_GROUP_NAME: USR_default
    RESOURCE_GROUP_TYPE: USER
RESOURCE_GROUP_ENABLED: 1
            VCPU_IDS: 0-3
        THREAD_PRIORITY: 0
************************** 2. row ******************************
    RESOURCE_GROUP_NAME: SYS_default
```

```
    RESOURCE_GROUP_TYPE: SYSTEM
RESOURCE_GROUP_ENABLED: 1
            VCPU_IDS: 0-3
        THREAD_PRIORITY: 0
```


The THREAD_PRIORITY values are 0 , indicating the default priority. The VCPU_IDS values show a range comprising all available CPUs. For the default groups, the displayed value varies depending on the system on which the MySQL server runs.

Earlier discussion mentioned a scenario involving a resource group named Batch to manage execution of batch jobs that need not execute with high priority. To create such a group, use a statement similar to this:
```
CREATE RESOURCE GROUP Batch
    TYPE = USER
    VCPU = 2-3 -- assumes a system with at least 4 CPUs
    THREAD_PRIORITY = 10;
```


To verify that the resource group was created as expected, check the RESOURCE_GROUPS table:
```
mysql> SELECT * FROM INFORMATION_SCHEMA.RESOURCE_GROUPS
        WHERE RESOURCE_GROUP_NAME = 'Batch'\G
************************* 1. rOW *******************************
    RESOURCE_GROUP_NAME: Batch
    RESOURCE_GROUP_TYPE: USER
RESOURCE_GROUP_ENABLED: 1
            VCPU_IDS: 2-3
        THREAD_PRIORITY: 10
```


If the THREAD_PRIORITY value is 0 rather than 10, check whether your platform or system configuration limits the resource group capability; see Resource Group Restrictions.

To assign a thread to the Batch group, do this:
```
SET RESOURCE GROUP Batch FOR thread_id;
```


Thereafter, statements in the named thread execute with Batch group resources.
If a session's own current thread should be in the Batch group, execute this statement within the session:
```
SET RESOURCE GROUP Batch;
```


Thereafter, statements in the session execute with Batch group resources.
To execute a single statement using the Batch group, use the RESOURCE_GROUP optimizer hint:
```
INSERT /*+ RESOURCE_GROUP(Batch) */ INTO t2 VALUES(2);
```


Threads assigned to the Batch group execute with its resources, which can be modified as desired:
- For times when the system is highly loaded, decrease the number of CPUs assigned to the group, lower its priority, or (as shown) both:
```
ALTER RESOURCE GROUP Batch
    VCPU = 3
    THREAD_PRIORITY = 19;
```

- For times when the system is lightly loaded, increase the number of CPUs assigned to the group, raise its priority, or (as shown) both:
```
ALTER RESOURCE GROUP Batch
    VCPU = 0-3
    THREAD_PRIORITY = 0;
```


\section*{Resource Group Replication}

Resource group management is local to the server on which it occurs. Resource group SQL statements and modifications to the resource_groups data dictionary table are not written to the binary log and are not replicated.

\section*{Resource Group Restrictions}

On some platforms or MySQL server configurations, resource groups are unavailable or have limitations:
- Resource groups are unavailable if the thread pool plugin is installed.
- Resource groups are unavailable on macOS, which provides no API for binding CPUs to a thread.
- On FreeBSD and Solaris, resource group thread priorities are ignored. (Effectively, all threads run at priority 0 .) Attempts to change priorities result in a warning:
```
mysql> ALTER RESOURCE GROUP abc THREAD_PRIORITY = 10;
Query OK, 0 rows affected, 1 warning (0.18 sec)
mysql> SHOW WARNINGS;
+---------+-------+------------------------------------------------------------
| Level | Code | Message |
+---------+-------+------------------------------------------------------------
| Warning | 4560 | Attribute thread_priority is ignored (using default value). |
+---------+-------+-----------------------------------------------------------
```

- On Linux, resource groups thread priorities are ignored unless the CAP_SYS_NICE capability is set. Granting CAP_SYS_NICE capability to a process enables a range of privileges; consult http:// man7.org/linux/man-pages/man7/capabilities.7.html for the full list. Please be careful when enabling this capability.

On Linux platforms using systemd and kernel support for Ambient Capabilities (Linux 4.3 or newer), the recommended way to enable CAP_SYS_NICE capability is to modify the MySQL service file and leave the mysqld binary unmodified. To adjust the service file for MySQL, use this procedure:
1. Run the appropriate command for your platform:
- Oracle Linux, Red Hat, and Fedora systems:
```
$> sudo systemctl edit mysqld
```

- SUSE, Ubuntu, and Debian systems:
```
$> sudo systemctl edit mysql
```

2. Using an editor, add the following text to the service file:
```
[Service]
AmbientCapabilities=CAP_SYS_NICE
```

3. Restart the MySQL service.

If you cannot enable the CAP_SYS_NICE capability as just described, it can be set manually using the setcap command, specifying the path name to the mysqld executable (this requires sudo access). You can check the capabilities using getcap. For example:
```
$> sudo setcap cap_sys_nice+ep /path/to/mysqld
$> getcap /path/to/mysqld
/path/to/mysqld = cap_sys_nice+ep
```


As a safety measure, restrict execution of the mysqld binary to the root user and users with mysql group membership:
```
$> sudo chown root:mysql /path/to/mysqld
$> sudo chmod 0750 /path/to/mysqld
```

![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1001.jpg?height=131&width=275&top_left_y=246&top_left_x=397)

\section*{Important}

If manual use of setcap is required, it must be performed after each reinstall.
- On Windows, threads run at one of five thread priority levels. The resource group thread priority range of 20 to 19 maps onto those levels as indicated in the following table.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 7.6 Resource Group Thread Priority on Windows}
\begin{tabular}{|l|l|}
\hline Priority Range & Windows Priority Level \\
\hline -20 to -10 & THREAD_PRIORITY_HIGHEST \\
\hline -9 to -1 & THREAD_PRIORITY_ABOVE_NORMAL \\
\hline 0 & THREAD_PRIORITY_NORMAL \\
\hline 1 to 10 & THREAD_PRIORITY_BELOW_NORMAL \\
\hline 11 to 19 & THREAD_PRIORITY_LOWEST \\
\hline
\end{tabular}
\end{table}

\subsection*{7.1.17 Server-Side Help Support}

MySQL Server supports a HELP statement that returns information from the MySQL Reference Manual (see Section 15.8.3, "HELP Statement"). This information is stored in several tables in the mysql schema (see Section 7.3, "The mysql System Schema"). Proper operation of the HELP statement requires that these help tables be initialized.

For a new installation of MySQL using a binary or source distribution on Unix, help-table content initialization occurs when you initialize the data directory (see Section 2.9.1, "Initializing the Data Directory"). For an RPM distribution on Linux or binary distribution on Windows, content initialization occurs as part of the MySQL installation process.

For a MySQL upgrade using a binary distribution, help-table content is upgraded automatically by the server. To upgrade it manually, locate the fill_help_tables.sql file in the share or share/ mysql directory. Change location into that directory and process the file with the mysql client as follows:
mysql -u root -p mysql < fill_help_tables.sql
The command shown here assumes that you connect to the server using an account such as root that has privileges for modifying tables in the mysql schema. Adjust the connection parameters as required.

\subsection*{7.1.18 Server Tracking of Client Session State}

The MySQL server implements several session state trackers. A client can enable these trackers to receive notification of changes to its session state.
- Uses for Session State Trackers
- Available Session State Trackers
- C API Session State Tracker Support
- Test Suite Session State Tracker Support

\section*{Uses for Session State Trackers}

Session state trackers have uses such as these:
- To facilitate session migration.
- To facilitate transaction switching.

The tracker mechanism provides a means for MySQL connectors and client applications to determine whether any session context is available to permit session migration from one server to another. (To change sessions in a load-balanced environment, it is necessary to detect whether there is session state to take into consideration when deciding whether a switch can be made.)

The tracker mechanism permits applications to know when transactions can be moved from one session to another. Transaction state tracking enables this, which is useful for applications that may wish to move transactions from a busy server to one that is less loaded. For example, a load-balancing connector managing a client connection pool could move transactions between available sessions in the pool.

However, session switching cannot be done at arbitrary times. If a session is in the middle of a transaction for which reads or writes have been done, switching to a different session implies a transaction rollback on the original session. A session switch must be done only when a transaction does not yet have any reads or writes performed within it.

Examples of when transactions might reasonably be switched:
- Immediately after START TRANSACTION
- After COMMIT AND CHAIN

In addition to knowing transaction state, it is useful to know transaction characteristics, so as to use the same characteristics if the transaction is moved to a different session. The following characteristics are relevant for this purpose:
```
READ ONLY
READ WRITE
ISOLATION LEVEL
WITH CONSISTENT SNAPSHOT
```


\section*{Available Session State Trackers}

To support the session-tracking activities, notification is available for these types of client session state information:
- Changes to these attributes of client session state:
- The default schema (database).
- Session-specific values for system variables.
- User-defined variables.
- Temporary tables.
- Prepared statements.

The session_track_state_change system variable controls this tracker.
- Changes to the default schema name. The session_track_schema system variable controls this tracker.
- Changes to the session values of system variables. The session_track_system_variables system variable controls this tracker. The SENSITIVE_VARIABLES_OBSERVER privilege is required to track changes to the values of sensitive system variables.
- Available GTIDs. The session_track_gtids system variable controls this tracker.
- Information about transaction state and characteristics. The session_track_transaction_info system variable controls this tracker.

For descriptions of the tracker-related system variables, see Section 7.1.8, "Server System Variables". Those system variables permit control over which change notifications occur, but do not provide a way to access notification information. Notification occurs in the MySQL client/server protocol, which includes tracker information in OK packets so that session state changes can be detected.

\section*{C API Session State Tracker Support}

To enable client applications to extract state-change information from OK packets returned by the server, the MySQL C API provides a pair of functions:
- mysql_session_track_get_first() fetches the first part of the state-change information received from the server. See mysql_session_track_get_first().
- mysql_session_track_get_next() fetches any remaining state-change information received from the server. Following a successful call to mysql_session_track_get_first (), call this function repeatedly as long as it returns success. See mysql_session_track_get_next().

\section*{Test Suite Session State Tracker Support}

The mysqltest program has disable_session_track_info and enable_session_track_info commands that control whether session tracker notifications occur. You can use these commands to see from the command line what notifications SQL statements produce. Suppose that a file testscript contains the following mysqltest script:
```
DROP TABLE IF EXISTS test.t1;
CREATE TABLE test.t1 (i INT, f FLOAT);
--enable_session_track_info
SET @@SESSION.session_track_schema=ON;
SET @@SESSION.session_track_system_variables='*';
SET @@SESSION.session_track_state_change=ON;
USE information_schema;
SET NAMES 'utf8mb4';
SET @@SESSION.session_track_transaction_info='CHARACTERISTICS';
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SET TRANSACTION READ WRITE;
START TRANSACTION;
SELECT 1;
INSERT INTO test.t1 () VALUES();
INSERT INTO test.t1 () VALUES(1, RAND());
COMMIT;
```


Run the script as follows to see the information provided by the enabled trackers. For a description of the Tracker: information displayed by mysqltest for the various trackers, see mysql_session_track_get_first().
```
$> mysqltest < testscript
DROP TABLE IF EXISTS test.t1;
CREATE TABLE test.t1 (i INT, f FLOAT);
SET @@SESSION.session_track_schema=ON;
SET @@SESSION.session_track_system_variables='*';
-- Tracker : SESSION_TRACK_SYSTEM_VARIABLES
-- session_track_system_variables
-- *
SET @@SESSION.session_track_state_change=ON;
-- Tracker : SESSION_TRACK_SYSTEM_VARIABLES
-- session_track_state_change
-- ON
USE information_schema;
-- Tracker : SESSION_TRACK_SCHEMA
-- information_schema
-- Tracker : SESSION_TRACK_STATE_CHANGE
-- 1
```

```
SET NAMES 'utf8mb4';
-- Tracker : SESSION_TRACK_SYSTEM_VARIABLES
-- character_set_client
-- utf8mb4
-- character_set_connection
-- utf8mb4
-- character_set_results
-- utf8mb4
-- Tracker : SESSION_TRACK_STATE_CHANGE
-- 1
SET @@SESSION.session_track_transaction_info='CHARACTERISTICS';
-- Tracker : SESSION_TRACK_SYSTEM_VARIABLES
-- session_track_transaction_info
-- CHARACTERISTICS
-- Tracker : SESSION_TRACK_STATE_CHANGE
-- 1
-- Tracker : SESSION_TRACK_TRANSACTION_CHARACTERISTICS
--
-- Tracker : SESSION_TRACK_TRANSACTION_STATE
-- __
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- Tracker : SESSION_TRACK_TRANSACTION_CHARACTERISTICS
-- SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SET TRANSACTION READ WRITE;
-- Tracker : SESSION_TRACK_TRANSACTION_CHARACTERISTICS
-- SET TRANSACTION ISOLATION LEVEL SERIALIZABLE; SET TRANSACTION READ WRITE;
START TRANSACTION;
-- Tracker : SESSION_TRACK_TRANSACTION_CHARACTERISTICS
-- SET TRANSACTION ISOLATION LEVEL SERIALIZABLE; START TRANSACTION READ WRITE;
-- Tracker : SESSION_TRACK_TRANSACTION_STATE
-- T
SELECT 1;
1
1
-- Tracker : SESSION_TRACK_TRANSACTION_STATE
-- T______
INSERT INTO test.t1 () VALUES();
-- Tracker : SESSION_TRACK_TRANSACTION_STATE
-- T___W_S_
INSERT INTO test.t1 () VALUES(1, RAND());
-- Tracker : SESSION_TRACK_TRANSACTION_STATE
-- T___WsS_
COMMIT;
-- Tracker : SESSION_TRACK_TRANSACTION_CHARACTERISTICS
--
-- Tracker : SESSION_TRACK_TRANSACTION_STATE
--
ok
```


Preceding the START TRANSACTION statement, two SET TRANSACTION statements execute that set the isolation level and access mode characteristics for the next transaction. The SESSION_TRACK_TRANSACTION_CHARACTERISTICS value indicates those next-transaction values that have been set.

Following the COMMIT statement that ends the transaction, the SESSION_TRACK_TRANSACTION_CHARACTERISTICS value is reported as empty. This indicates that
the next-transaction characteristics that were set preceding the start of the transaction have been reset, and that the session defaults apply. To track changes to those session defaults, track the session values of the transaction_isolation and transaction_read_only system variables.

To see information about GTIDs, enable the SESSION_TRACK_GTIDS tracker using the session_track_gtids system system variable.

\subsection*{7.1.19 The Server Shutdown Process}

The server shutdown process takes place as follows:
1. The shutdown process is initiated.

This can occur initiated several ways. For example, a user with the SHUTDOWN privilege can execute a mysqladmin shutdown command. mysqladmin can be used on any platform supported by MySQL. Other operating system-specific shutdown initiation methods are possible as well: The server shuts down on Unix when it receives a SIGTERM signal. A server running as a service on Windows shuts down when the services manager tells it to.
2. The server creates a shutdown thread if necessary.

Depending on how shutdown was initiated, the server might create a thread to handle the shutdown process. If shutdown was requested by a client, a shutdown thread is created. If shutdown is the result of receiving a SIGTERM signal, the signal thread might handle shutdown itself, or it might create a separate thread to do so. If the server tries to create a shutdown thread and cannot (for example, if memory is exhausted), it issues a diagnostic message that appears in the error log:

Error: Can't create thread to kill server
3. The server stops accepting new connections.

To prevent new activity from being initiated during shutdown, the server stops accepting new client connections by closing the handlers for the network interfaces to which it normally listens for connections: the TCP/IP port, the Unix socket file, the Windows named pipe, and shared memory on Windows.
4. The server terminates current activity.

For each thread associated with a client connection, the server breaks the connection to the client and marks the thread as killed. Threads die when they notice that they are so marked. Threads for idle connections die quickly. Threads that currently are processing statements check their state periodically and take longer to die. For additional information about thread termination, see Section 15.7.8.4, "KILL Statement", in particular for the instructions about killed REPAIR TABLE or OPTIMIZE TABLE operations on MyISAM tables.

For threads that have an open transaction, the transaction is rolled back. If a thread is updating a nontransactional table, an operation such as a multiple-row UPDATE or INSERT may leave the table partially updated because the operation can terminate before completion.

If the server is a replication source server, it treats threads associated with currently connected replicas like other client threads. That is, each one is marked as killed and exits when it next checks its state.

If the server is a replica server, it stops the replication I/O and SQL threads, if they are active, before marking client threads as killed. The SQL thread is permitted to finish its current statement (to avoid causing replication problems), and then stops. If the SQL thread is in the middle of a transaction at this point, the server waits until the current replication event group (if any) has finished executing, or until the user issues a KILL QUERY or KILL CONNECTION statement. See also Section 15.4.2.5, "STOP REPLICA Statement". Since nontransactional statements cannot be rolled back, in order to guarantee crash-safe replication, only transactional tables should be used.

\section*{Note}

To guarantee crash safety on the replica, you must run the replica with - -relay-log-recovery enabled.

See also Section 19.2.4, "Relay Log and Replication Metadata Repositories").
5. The server shuts down or closes storage engines.

At this stage, the server flushes the table cache and closes all open tables.
Each storage engine performs any actions necessary for tables that it manages. InnoDB flushes its buffer pool to disk (unless innodb_fast_shutdown is 2), writes the current LSN to the tablespace, and terminates its own internal threads. MyISAM flushes any pending index writes for a table.
6. The server exits.

To provide information to management processes, the server returns one of the exit codes described in the following list. The phrase in parentheses indicates the action taken by systemd in response to the code, for platforms on which systemd is used to manage the server.
- 0 = successful termination (no restart done)
- 1 = unsuccessful termination (no restart done)
- 2 = unsuccessful termination (restart done)

\subsection*{7.2 The MySQL Data Directory}

Information managed by the MySQL server is stored under a directory known as the data directory. The following list briefly describes the items typically found in the data directory, with cross references for additional information:
- Data directory subdirectories. Each subdirectory of the data directory is a database directory and corresponds to a database managed by the server. All MySQL installations have certain standard databases:
- The mysql directory corresponds to the mysql system schema, which contains information required by the MySQL server as it runs. This database contains data dictionary tables and system tables. See Section 7.3, "The mysql System Schema".
- The performance_schema directory corresponds to the Performance Schema, which provides information used to inspect the internal execution of the server at runtime. See Chapter 29, MySQL Performance Schema.
- The sys directory corresponds to the sys schema, which provides a set of objects to help interpret Performance Schema information more easily. See Chapter 30, MySQL sys Schema.
- The ndbinfo directory corresponds to the ndbinfo database that stores information specific to NDB Cluster (present only for installations built to include NDB Cluster). See Section 25.6.15, "ndbinfo: The NDB Cluster Information Database".

Other subdirectories correspond to databases created by users or applications.

\section*{Note}

INFORMATION_SCHEMA is a standard database, but its implementation uses no corresponding database directory.
- Log files written by the server. See Section 7.4, "MySQL Server Logs".
- InnoDB tablespace and log files. See Chapter 17, The InnoDB Storage Engine.
- Default/autogenerated SSL and RSA certificate and key files. See Section 8.3.3, "Creating SSL and RSA Certificates and Keys".
- The server process ID file (while the server is running).
- The mysqld-auto.cnf file that stores persisted global system variable settings. See Section 15.7.6.1, "SET Syntax for Variable Assignment".

Some items in the preceding list can be relocated elsewhere by reconfiguring the server. In addition, the --datadir option enables the location of the data directory itself to be changed. For a given MySQL installation, check the server configuration to determine whether items have been moved.

\subsection*{7.3 The mysql System Schema}

The mysql schema is the system schema. It contains tables that store information required by the MySQL server as it runs. A broad categorization is that the mysql schema contains data dictionary tables that store database object metadata, and system tables used for other operational purposes. The following discussion further subdivides the set of system tables into smaller categories.
- Data Dictionary Tables
- Grant System Tables
- Object Information System Tables
- Log System Tables
- Server-Side Help System Tables
- Time Zone System Tables
- Replication System Tables
- Optimizer System Tables
- Miscellaneous System Tables

The remainder of this section enumerates the tables in each category, with cross references for additional information. Data dictionary tables and system tables use the InnoDB storage engine unless otherwise indicated.
mysql system tables and data dictionary tables reside in a single InnoDB tablespace file named mysql.ibd in the MySQL data directory. Previously, these tables were created in individual tablespace files in the mysql database directory.

Data-at-rest encryption can be enabled for the mysql system schema tablespace. For more information, see Section 17.13, "InnoDB Data-at-Rest Encryption".

\section*{Data Dictionary Tables}

These tables comprise the data dictionary, which contains metadata about database objects. For additional information, see Chapter 16, MySQL Data Dictionary.
- catalogs: Catalog information.
- character_sets: Information about available character sets.
- check_constraints: Information about CHECK constraints defined on tables. See Section 15.1.20.6, "CHECK Constraints".
- collations: Information about collations for each character set.
- column_statistics: Histogram statistics for column values. See Section 10.9.6, "Optimizer Statistics".
- column_type_elements: Information about types used by columns.
- columns: Information about columns in tables.
- dd_properties: A table that identifies data dictionary properties, such as its version. The server uses this to determine whether the data dictionary must be upgraded to a newer version.
- events: Information about Event Scheduler events. See Section 27.4, "Using the Event Scheduler". If the server is started with the --skip-grant-tables option, the event scheduler is disabled and events registered in the table do not run. See Section 27.4.2, "Event Scheduler Configuration".
- foreign_keys, foreign_key_column_usage: Information about foreign keys.
- index_column_usage: Information about columns used by indexes.
- index_partitions: Information about partitions used by indexes.
- index_stats: Used to store dynamic index statistics generated when ANALYZE TABLE is executed.
- indexes: Information about table indexes.
- innodb_ddl_log: Stores DDL logs for crash-safe DDL operations.
- parameter_type_elements: Information about stored procedure and function parameters, and about return values for stored functions.
- parameters: Information about stored procedures and functions. See Section 27.2, "Using Stored Routines".
- resource_groups: Information about resource groups. See Section 7.1.16, "Resource Groups".
- routines: Information about stored procedures and functions. See Section 27.2, "Using Stored Routines".
- schemata: Information about schemata. In MySQL, a schema is a database, so this table provides information about databases.
- st_spatial_reference_systems: Information about available spatial reference systems for spatial data.
- table_partition_values: Information about values used by table partitions.
- table_partitions: Information about partitions used by tables.
- table_stats: Information about dynamic table statistics generated when ANALYZE TABLE is executed.
- tables: Information about tables in databases.
- tablespace_files: Information about files used by tablespaces.
- tablespaces: Information about active tablespaces.
- triggers: Information about triggers.
- view_routine_usage: Information about dependencies between views and stored functions used by them.
- view_table_usage: Used to track dependencies between views and their underlying tables.

Data dictionary tables are invisible. They cannot be read with SELECT, do not appear in the output of SHOW TABLES, are not listed in the INFORMATION_SCHEMA. TABLES table, and so forth. However, in most cases there are corresponding INFORMATION_SCHEMA tables that can be queried. Conceptually, the INFORMATION_SCHEMA provides a view through which MySQL exposes data dictionary metadata. For example, you cannot select from the mysql. schemata table directly:
```
mysql> SELECT * FROM mysql.schemata;
ERROR 3554 (HY000): Access to data dictionary table 'mysql.schemata' is rejected.
```


Instead, select that information from the corresponding INFORMATION_SCHEMA table:
```
mysql> SELECT * FROM INFORMATION_SCHEMA.SCHEMATA\G
************************** 1. row ******************************
            CATALOG_NAME: def
                SCHEMA_NAME: mysql
DEFAULT_CHARACTER_SET_NAME: utf8mb4
    DEFAULT_COLLATION_NAME: utf8mb4_0900_ai_ci
                    SQL_PATH: NULL
        DEFAULT_ENCRYPTION: NO
                    ********* 2. row
            CATALOG_NAME: def
                SCHEMA_NAME: information_schema
DEFAULT_CHARACTER_SET_NAME: utf8mb3
    DEFAULT_COLLATION_NAME: utf8mb3_general_ci
                    SQL_PATH: NULL
        DEFAULT_ENCRYPTION: NO
************************** 3. row *****************************************
            CATALOG_NAME: def
                SCHEMA_NAME: performance_schema
DEFAULT_CHARACTER_SET_NAME: utf8mb4
    DEFAULT_COLLATION_NAME: utf8mb4_0900_ai_ci
                    SQL_PATH: NULL
        DEFAULT_ENCRYPTION: NO
...
```


There is no Information Schema table that corresponds exactly to mysql. indexes, but INFORMATION_SCHEMA. STATISTICS contains much of the same information.

As of yet, there are no INFORMATION_SCHEMA tables that correspond exactly to mysql.foreign_keys, mysql.foreign_key_column_usage. The standard SQL way to obtain foreign key information is by using the INFORMATION_SCHEMA REFERENTIAL_CONSTRAINTS and KEY_COLUMN_USAGE tables; these tables are now implemented as views on the foreign_keys, foreign_key_column_usage, and other data dictionary tables.

\section*{Grant System Tables}

These system tables contain grant information about user accounts and the privileges held by them. For additional information about the structure, contents, and purpose of the these tables, see Section 8.2.3, "Grant Tables".

The MySQL 8.4 grant tables are InnoDB (transactional) tables. Account-management statements are transactional and either succeed for all named users or roll back and have no effect if any error occurs.
- user: User accounts, global privileges, and other nonprivilege columns.
- global_grants: Assignments of dynamic global privileges to users; see Static Versus Dynamic Privileges.
- db: Database-level privileges.
- tables_priv: Table-level privileges.
- columns_priv: Column-level privileges.
- procs_priv: Stored procedure and function privileges.
- proxies_priv: Proxy-user privileges.
- default_roles: This table lists default roles to be activated after a user connects and authenticates, or executes SET ROLE DEFAULT.
- role_edges: This table lists edges for role subgraphs.

A given user table row might refer to a user account or a role. The server can distinguish whether a row represents a user account, a role, or both by consulting the role_edges table for information about relations between authentication IDs.
- password_history: Information about password changes.

\section*{Object Information System Tables}

These system tables contain information about components, loadable functions, and server-side plugins:
- component: The registry for server components installed using INSTALL COMPONENT. Any components listed in this table are installed by a loader service during the server startup sequence. See Section 7.5.1, "Installing and Uninstalling Components".
- func: The registry for loadable functions installed using CREATE FUNCTION. During the normal startup sequence, the server loads functions registered in this table. If the server is started with the--skip-grant-tables option, functions registered in the table are not loaded and are unavailable. See Section 7.7.1, "Installing and Uninstalling Loadable Functions".

\section*{Note}

Like the mysql. func system table, the Performance Schema user_defined_functions table lists loadable functions installed using CREATE FUNCTION. Unlike the mysql. func table, the user_defined_functions table also lists functions installed automatically by server components or plugins. This difference makes user_defined_functions preferable to mysql.func for checking which functions are installed. See Section 29.12.22.10, "The user_defined_functions Table".
- plugin: The registry for server-side plugins installed using INSTALL PLUGIN. During the normal startup sequence, the server loads plugins registered in this table. If the server is started with the -skip-grant-tables option, plugins registered in the table are not loaded and are unavailable. See Section 7.6.1, "Installing and Uninstalling Plugins".

\section*{Log System Tables}

The server uses these system tables for logging:
- general_log: The general query log table.
- slow_log: The slow query log table.

Log tables use the CSV storage engine.
For more information, see Section 7.4, "MySQL Server Logs".

\section*{Server-Side Help System Tables}

These system tables contain server-side help information:
- help_category: Information about help categories.
- help_keyword: Keywords associated with help topics.
- help_relation: Mappings between help keywords and topics.
- help_topic: Help topic contents.

For more information, see Section 7.1.17, "Server-Side Help Support".

\section*{Time Zone System Tables}

These system tables contain time zone information:
- time_zone: Time zone IDs and whether they use leap seconds.
- time_zone_leap_second: When leap seconds occur.
- time_zone_name: Mappings between time zone IDs and names.
- time_zone_transition, time_zone_transition_type: Time zone descriptions.

For more information, see Section 7.1.15, "MySQL Server Time Zone Support".

\section*{Replication System Tables}

The server uses these system tables to support replication:
- gtid_executed: Table for storing GTID values. See mysql.gtid_executed Table.
- ndb_binlog_index: Binary log information for NDB Cluster replication. This table is created only if the server is built with NDBCLUSTER support. See Section 25.7.4, "NDB Cluster Replication Schema and Tables".
- slave_master_info, slave_relay_log_info, slave_worker_info: Used to store replication information on replica servers. See Section 19.2.4, "Relay Log and Replication Metadata Repositories".

All of the tables just listed use the InnoDB storage engine.

\section*{Optimizer System Tables}

These system tables are for use by the optimizer:
- innodb_index_stats, innodb_table_stats: Used for InnoDB persistent optimizer statistics. See Section 17.8.10.1, "Configuring Persistent Optimizer Statistics Parameters".
- server_cost, engine_cost: The optimizer cost model uses tables that contain cost estimate information about operations that occur during query execution. server_cost contains optimizer cost estimates for general server operations. engine_cost contains estimates for operations specific to particular storage engines. See Section 10.9.5, "The Optimizer Cost Model".

\section*{Miscellaneous System Tables}

Other system tables do not fit the preceding categories:
- audit_log_filter, audit_log_user: If MySQL Enterprise Audit is installed, these tables provide persistent storage of audit log filter definitions and user accounts. See Audit Log Tables.
- firewall_group_allowlist, firewall_groups, firewall_memebership, firewall_users, firewall_whitelist: If MySQL Enterprise Firewall is installed, these tables provide persistent storage for information used by the firewall. See Section 8.4.7, "MySQL Enterprise Firewall".
- servers: Used by the FEDERATED storage engine. See Section 18.8.2.2, "Creating a FEDERATED Table Using CREATE SERVER".
- innodb_dynamic_metadata: Used by the InnoDB storage engine to store fast-changing table metadata such as auto-increment counter values and index tree corruption flags. Replaces the data dictionary buffer table that resided in the InnoDB system tablespace.

\subsection*{7.4 MySQL Server Logs}

MySQL Server has several logs that can help you find out what activity is taking place.

\begin{tabular}{|l|l|}
\hline Log Type & Information Written to Log \\
\hline Error log & Problems encountered starting, running, or stopping mysqld \\
\hline General query log & Established client connections and statements received from clients \\
\hline Binary log & Statements that change data (also used for replication) \\
\hline Relay log & Data changes received from a replication source server \\
\hline Slow query log & Queries that took more than long_query_time seconds to execute \\
\hline DDL logs & Atomic DDL operations performed by DDL statements \\
\hline
\end{tabular}

By default, no logs are enabled, except the error log on Windows. For information about DDL log behavior, see Viewing DDL Logs. The following log-specific sections provide information about the server options that enable logging.

By default, the server writes files for all enabled logs in the data directory. You can force the server to close and reopen the log files (or in some cases switch to a new log file) by flushing the logs. Log flushing occurs when you issue a FLUSH LOGS statement; execute mysqladmin with a flush-logs or refresh argument; or execute mysqldump with a--flush-logs option. See Section 15.7.8.3, "FLUSH Statement", Section 6.5.2, "mysqladmin - A MySQL Server Administration Program", and Section 6.5.4, "mysqldump - A Database Backup Program". In addition, the binary log is flushed when its size reaches the value of the max_binlog_size system variable.

You can control the general query and slow query logs during runtime. You can enable or disable logging, or change the log file name. You can tell the server to write general query and slow query entries to log tables, log files, or both. For details, see Section 7.4.1, "Selecting General Query Log and Slow Query Log Output Destinations", Section 7.4.3, "The General Query Log", and Section 7.4.5, "The Slow Query Log".

The relay log is used only on replicas, to hold data changes from the replication source server that must also be made on the replica. For discussion of relay log contents and configuration, see Section 19.2.4.1, "The Relay Log".

For information about log maintenance operations such as expiration of old log files, see Section 7.4.6, "Server Log Maintenance".

For information about keeping logs secure, see Section 8.1.2.3, "Passwords and Logging".

\subsection*{7.4.1 Selecting General Query Log and Slow Query Log Output Destinations}

MySQL Server provides flexible control over the destination of output written to the general query log and the slow query log, if those logs are enabled. Possible destinations for log entries are log files or the general_log and slow_log tables in the mysql system database. File output, table output, or both can be selected.
- Log Control at Server Startup
- Log Control at Runtime
- Log Table Benefits and Characteristics

\section*{Log Control at Server Startup}

The log_output system variable specifies the destination for log output. Setting this variable does not in itself enable the logs; they must be enabled separately.
- If log_output is not specified at startup, the default logging destination is FILE.
- If log_output is specified at startup, its value is a list one or more comma-separated words chosen from TABLE (log to tables), FILE (log to files), or NONE (do not log to tables or files). NONE, if present, takes precedence over any other specifiers.

The general_log system variable controls logging to the general query log for the selected log destinations. If specified at server startup, general_log takes an optional argument of 1 or 0 to enable or disable the log. To specify a file name other than the default for file logging, set the general_log_file variable. Similarly, the slow_query_log variable controls logging to the slow query log for the selected destinations and setting slow_query_log_file specifies a file name for file logging. If either log is enabled, the server opens the corresponding log file and writes startup messages to it. However, further logging of queries to the file does not occur unless the FILE log destination is selected.

Examples:
- To write general query log entries to the log table and the log file, use --log_output=TABLE, FILE to select both log destinations and --general_log to enable the general query log.
- To write general and slow query log entries only to the log tables, use --log_output=TABLE to select tables as the log destination and --general_log and --slow_query_log to enable both logs.
- To write slow query log entries only to the log file, use --log_output=FILE to select files as the log destination and --slow_query_log to enable the slow query log. In this case, because the default log destination is FILE, you could omit the log_output setting.

\section*{Log Control at Runtime}

The system variables associated with log tables and files enable runtime control over logging:
- The log_output variable indicates the current logging destination. It can be modified at runtime to change the destination.
- The general_log and slow_query_log variables indicate whether the general query log and slow query log are enabled (ON) or disabled (OFF). You can set these variables at runtime to control whether the logs are enabled.
- The general_log_file and slow_query_log_file variables indicate the names of the general query log and slow query log files. You can set these variables at server startup or at runtime to change the names of the log files.
- To disable or enable general query logging for the current session, set the session sql_log_off variable to ON or OFF. (This assumes that the general query log itself is enabled.)

\section*{Log Table Benefits and Characteristics}

The use of tables for log output offers the following benefits:
- Log entries have a standard format. To display the current structure of the log tables, use these statements:

SHOW CREATE TABLE mysql.general_log;
SHOW CREATE TABLE mysql.slow_log;
- Log contents are accessible through SQL statements. This enables the use of queries that select only those log entries that satisfy specific criteria. For example, to select log contents associated with a particular client (which can be useful for identifying problematic queries from that client), it is easier to do this using a log table than a log file.
- Logs are accessible remotely through any client that can connect to the server and issue queries (if the client has the appropriate log table privileges). It is not necessary to log in to the server host and directly access the file system.

The log table implementation has the following characteristics:
- In general, the primary purpose of log tables is to provide an interface for users to observe the runtime execution of the server, not to interfere with its runtime execution.
- CREATE TABLE, ALTER TABLE, and DROP TABLE are valid operations on a log table. For ALTER TABLE and DROP TABLE, the log table cannot be in use and must be disabled, as described later.
- By default, the log tables use the CSV storage engine that writes data in comma-separated values format. For users who have access to the .CSV files that contain log table data, the files are easy to import into other programs such as spreadsheets that can process CSV input.

The log tables can be altered to use the MyISAM storage engine. You cannot use ALTER TABLE to alter a log table that is in use. The log must be disabled first. No engines other than CSV or MyISAM are legal for the log tables.

Log Tables and "Too many open files" Errors. If you select TABLE as a log destination and the log tables use the CSV storage engine, you may find that disabling and enabling the general query log or slow query log repeatedly at runtime results in a number of open file descriptors for the . CSV file, possibly resulting in a "Too many open files" error. To work around this issue, execute FLUSH TABLES or ensure that the value of open_files_limit is greater than the value of table_open_cache_instances.
- To disable logging so that you can alter (or drop) a log table, you can use the following strategy. The example uses the general query log; the procedure for the slow query log is similar but uses the slow_log table and slow_query_log system variable.

SET @old_log_state = @@GLOBAL.general_log;
SET GLOBAL general_log = 'OFF';
ALTER TABLE mysql.general_log ENGINE = MyISAM;
SET GLOBAL general_log = @old_log_state;
- TRUNCATE TABLE is a valid operation on a log table. It can be used to expire log entries.
- RENAME TABLE is a valid operation on a log table. You can atomically rename a log table (to perform log rotation, for example) using the following strategy:

USE mysql;
DROP TABLE IF EXISTS general_log2;
CREATE TABLE general_log2 LIKE general_log;
RENAME TABLE general_log TO general_log_backup, general_log2 TO general_log;
- CHECK TABLE is a valid operation on a log table.
- LOCK TABLES cannot be used on a log table.
- INSERT, DELETE, and UPDATE cannot be used on a log table. These operations are permitted only internally to the server itself.
- FLUSH TABLES WITH READ LOCK and the state of the read_only system variable have no effect on log tables. The server can always write to the log tables.
- Entries written to the log tables are not written to the binary log and thus are not replicated to replicas.
- To flush the log tables or log files, use FLUSH TABLES or FLUSH LOGS, respectively.
- Partitioning of log tables is not permitted.
- A mysqldump dump includes statements to recreate those tables so that they are not missing after reloading the dump file. Log table contents are not dumped.

\subsection*{7.4.2 The Error Log}

This section discusses how to configure the MySQL server for logging of diagnostic messages to the error log. For information about selecting the error message character set and language, see Section 12.6, "Error Message Character Set", and Section 12.12, "Setting the Error Message Language".

The error log contains a record of mysqld startup and shutdown times. It also contains diagnostic messages such as errors, warnings, and notes that occur during server startup and shutdown, and while the server is running. For example, if mysqld notices that a table needs to be automatically checked or repaired, it writes a message to the error log.

Depending on error log configuration, error messages may also populate the Performance Schema error_log table, to provide an SQL interface to the log and enable its contents to be queried. See Section 29.12.22.2, "The error_log Table".

On some operating systems, the error log contains a stack trace if mysqld exits abnormally. The trace can be used to determine where mysqld exited. See Section 7.9, "Debugging MySQL".

If used to start mysqld, mysqld_safe may write messages to the error log. For example, when mysqld_safe notices abnormal mysqld exits, it restarts mysqld and writes a mysqld restarted message to the error log.

The following sections discuss aspects of configuring error logging.

\subsection*{7.4.2.1 Error Log Configuration}

In MySQL 8.4, error logging uses the MySQL component architecture described at Section 7.5, "MySQL Components". The error log subsystem consists of components that perform log event filtering and writing, as well as a system variable that configures which components to load and enable to achieve the desired logging result.

This section discusses how to load and enable components for error logging. For instructions specific to log filters, see Section 7.4.2.4, "Types of Error Log Filtering". For instructions specific to the JSON and system log sinks, see Section 7.4.2.7, "Error Logging in JSON Format", and Section 7.4.2.8, "Error Logging to the System Log". For additional details about all available log components, see Section 7.5.3, "Error Log Components".

Component-based error logging offers these features:
- Log events that can be filtered by filter components to affect the information available for writing.
- Log events that are output by sink (writer) components. Multiple sink components can be enabled, to write error log output to multiple destinations.
- Built-in filter and sink components that implement the default error log format.
- A loadable sink that enables logging in JSON format.
- A loadable sink that enables logging to the system log.
- System variables that control which log components to load and enable and how each component operates.

Error log configuration is described under the following topics in this section:
- The Default Error Log Configuration
- Error Log Configuration Methods
- Implicit Error Log Configuration
- Explicit Error Log Configuration
- Changing the Error Log Configuration Method
- Troubleshooting Configuration Issues
- Configuring Multiple Log Sinks
- Log Sink Performance Schema Support

\section*{The Default Error Log Configuration}

The log_error_services system variable controls which loadable log components to load, and which log components to enable for error logging. By default, log_error_services has the value shown here:
```
mysql> SELECT @@GLOBAL.log_error_services;
+-----------------------------------------+
| @@GLOBAL.log_error_services |
+-----------------------------------------+
| log_filter_internal; log_sink_internal |
+-----------------------------------------+
```


That value indicates that log events first pass through the log_filter_internal filter component, then through the log_sink_internal sink component, both of which are built-in components. A filter modifies log events seen by components named later in the log_error_services value. A sink is a destination for log events. Typically, a sink processes log events into log messages that have a particular format and writes these messages to its associated output, such as a file or the system log.

The combination of log_filter_internal and log_sink_internal implements the default error log filtering and output behavior. The action of these components is affected by other server options and system variables:
- The output destination is determined by the --log-error option (and, on Windows, --pid-file and --console). These determine whether to write error messages to the console or a file and, if to a file, the error log file name. See Section 7.4.2.2, "Default Error Log Destination Configuration".
- The log_error_verbosity and log_error_suppression_list system variables affect which types of log events log_filter_internal permits or suppresses. See Section 7.4.2.5, "PriorityBased Error Log Filtering (log_filter_internal)".

When configuring log_error_services, be aware of the following characteristics:
- A list of log components may be delimited by semicolons or commas, optionally followed by spaces. A given setting cannot use both semicolon and comma separators. Component order is significant because the server executes components in the order listed.
- The final component in the log_error_services value cannot be a filter. This is an error because any changes it has on events would have no effect on output:
```
mysql> SET GLOBAL log_error_services = 'log_filter_internal';
ERROR 1231 (42000): Variable 'log_error_services' can't be set to the value
of 'log_filter_internal'
```


To correct the problem, include a sink at the end of the value:
```
mysql> SET GLOBAL log_error_services = 'log_filter_internal; log_sink_internal';
```

- The order of components named in log_error_services is significant, particularly with respect to the relative order of filters and sinks. Consider this log_error_services value:
```
log_filter_internal; log_sink_1; log_sink_2
```


In this case, log events pass to the built-in filter, then to the first sink, then to the second sink. Both sinks receive the filtered log events.

Compare that to this log_error_services value:
```
log_sink_1; log_filter_internal; log_sink_2
```


In this case, log events pass to the first sink, then to the built-in filter, then to the second sink. The first sink receives unfiltered events. The second sink receives filtered events. You might configure error logging this way if you want one log that contains messages for all log events, and another log that contains messages only for a subset of log events.

\section*{Error Log Configuration Methods}

Error log configuration involves loading and enabling error log components as necessary and performing component-specific configuration.

There are two error log configuration methods, implicit and explicit. It is recommended that one configuration method is selected and used exclusively. Using both methods can result in warnings at startup. For more information, see Troubleshooting Configuration Issues.
- Implicit Error Log Configuration

This configuration method loads and enables the log components defined by the log_error_services variable. Loadable components that are not already loaded are loaded implicitly at startup before the InnoDB storage engine is fully available. This configuration method has the following advantages:
- Log components are loaded early in the startup sequence, before the InnoDB storage engine, making logged information available sooner.
- It avoids loss of buffered log information should a failure occur during startup.
- Installing error log components using INSTALL COMPONENT is not required, simplifying error log configuration.

To use this method, see Implicit Error Log Configuration.
- Explicit Error Log Configuration

\section*{Note}

This configuration method is supported for backward compatibility. The implicit configuration method is recommended.

This configuration method requires loading error log components using INSTALL COMPONENT and then configuring log_error_services to enable the log components. INSTALL COMPONENT adds the component to the mysql. component table (an InnoDB table), and the components to load at startup are read from this table, which is only accessible after InnoDB is initialized.

Logged information is buffered during the startup sequence while the InnoDB storage engine is initialized, which is sometimes prolonged by operations such as recovery and data dictionary upgrade that occur during the InnoDB startup sequence.

To use this method, see Explicit Error Log Configuration.

\section*{Implicit Error Log Configuration}

This procedure describes how to load and enable error logging components implicitly using log_error_services. For a discussion of error log configuration methods, see Error Log Configuration Methods.

To load and enable error logging components implicitly:
1. List the error log components in the log_error_services value.

To load and enable the error log components at server startup, set log_error_services in an option file. The following example configures the use of the JSON log sink (log_sink_json) in addition to the built-in log filter and sink (log_filter_internal, log_sink_internal).
```
[mysqld]
log_error_services='log_filter_internal; log_sink_internal; log_sink_json'
```


\section*{Note}

To use the JSON log sink (log_sink_syseventlog) instead of the default sink (log_sink_internal), you would replace log_sink_internal with log_sink_json.

To load and enable the component immediately and for subsequent restarts, set log_error_services using SET PERSIST:

SET PERSIST log_error_services = 'log_filter_internal; log_sink_internal; log_sink_json';
2. If the error log component exposes any system variables that must be set for component initialization to succeed, assign those variables appropriate values. You can set these variables in an option file or using SET PERSIST.

\section*{Important}

When implementing an implicit configuration, set log_error_services first to load a component and expose its system variables, and then set component system variables afterward. This configuration order is required regardless of whether variable assignment is performed on the commandline, in an option file, or using SET PERSIST.

To disable a log component, remove it from the log_error_services value. Also remove any associated component variables settings that you have defined.

\section*{Note}

Loading a log component implicitly using log_error_services has no effect on the mysql. component table. It does not add the component to the mysql.component table, nor does it remove a component previously installed using INSTALL COMPONENT from the mysql. component table.

\section*{Explicit Error Log Configuration}

This procedure describes how to load and enable error logging components explicitly by loading components using INSTALL COMPONENT and then enabling using log_error_services. For a discussion of error log configuration methods, see Error Log Configuration Methods.

To load and enable error logging components explicitly:
1. Load the component using INSTALL COMPONENT (unless it is built in or already loaded). For example, to load the JSON log sink, issue the following statement:

INSTALL COMPONENT 'file://component_log_sink_json';
Loading a component using INSTALL COMPONENT registers it in the mysql.component system table so that the server loads it automatically for subsequent startups, after InnoDB is initialized.

The URN to use when loading a log component with INSTALL COMPONENT is the component name prefixed with file://component_. For example, for the log_sink_json component, the corresponding URN is file://component_log_sink_json. For error log component URNs, see Section 7.5.3, "Error Log Components".
2. If the error log component exposes any system variables that must be set for component initialization to succeed, assign those variables appropriate values. You can set these variables in an option file or using SET PERSIST.
3. Enable the component by listing it in the log_error_services value.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1019.jpg?height=122&width=113&top_left_y=1343&top_left_x=420)

\section*{Important}

When loading log components explicitly using INSTALL COMPONENT, do not persist or set log_error_services in an option file, which loads log components implicitly at startup. Instead, enable log components at runtime using a SET GLOBAL statement.

The following example configures the use of the JSON log sink (log_sink_json) in addition to the built-in log filter and sink (log_filter_internal, log_sink_internal).

SET GLOBAL log_error_services = 'log_filter_internal; log_sink_internal; log_sink_json';

\section*{Note}

To use the JSON log sink (log_sink_syseventlog) instead of the default sink (log_sink_internal), you would replace log_sink_internal with log_sink_json.

To disable a log component, remove it from the log_error_services value. Then, if the component is loadable and you also want to unload it, use UNINSTALL COMPONENT. Also remove any associated component variables settings that you have defined.

Attempts to use UNINSTALL COMPONENT to unload a loadable component that is still named in the log_error_services value produce an error.

\section*{Changing the Error Log Configuration Method}

If you have previously loaded error log components explicitly using INSTALL COMPONENT and want to switch to an implicit configuration, as described in Implicit Error Log Configuration, the following steps are recommended:
1. Set log_error_services back to its default configuration.

SET GLOBAL log_error_services = 'log_filter_internal,log_sink_internal';
2. Use UNINSTALL COMPONENT to uninstall any loadable logging components that you installed previously. For example, if you installed the JSON log sink previously, uninstall it as shown:
```
UNINSTALL COMPONENT 'file://component_log_sink_json';
```

3. Remove any component variable settings for the uninstalled component. For example, if component variables were set in an option file, remove the settings from the option file. If component variables were set using SET PERSIST, use RESET PERSIST to clear the settings.
4. Follow the steps in Implicit Error Log Configuration to reimplement your configuration.

If you need to revert from an implicit configuration to an explicit configuration, perform the following steps:
1. Set log_error_services back to its default configuration to unload implicitly loaded log components.
```
SET GLOBAL log_error_services = 'log_filter_internal,log_sink_internal';
```

2. Remove any component variable settings associated with the uninstalled components. For example, if component variables were set in an option file, remove the settings from the option file. If component variables were set using SET PERSIST, use RESET PERSIST to clear the settings.
3. Restart the server to uninstall the log components that were implicitly loaded.
4. Follow the steps in Explicit Error Log Configuration to reimplement your configuration.

\section*{Troubleshooting Configuration Issues}

Log components listed in the log_error_services value at startup are loaded implicitly early in the MySQL Server startup sequence. If the log component was loaded previously using INSTALL COMPONENT, the server attempts to load the component again later in the startup sequence, which produces the warning Cannot load component from specified URN: 'file:// component_component_name '.

You can check for this warning in the error log or by querying the Performance Schema error_log table using the following query:
```
SELECT error_code, data
    FROM performance_schema.error_log
WHERE data LIKE "%'file://component_%"
    AND error_code="MY-013129" AND data LIKE "%MY-003529%";
```


To prevent this warning, follow the instructions in Changing the Error Log Configuration Method to adjust your error log configuration. Either an implicit or explicit error log configuration should be used, but not both.

A similar error occurs when attempting to explicitly load a component that was implicitly loaded at startup. For example, if log_error_services lists the JSON log sink component, that component is implicitly loaded at startup. Attempting to explicitly load the same component later returns this error:
```
mysql> INSTALL COMPONENT 'file://component_log_sink_json';
ERROR 3529 (HY000): Cannot load component from specified URN: 'file://component_log_sink_json'.
```


\section*{Configuring Multiple Log Sinks}

It is possible to configure multiple log sinks, which enables sending output to multiple destinations. To enable the JSON log sink in addition to (rather than instead of) the default sink, set the log_error_services value like this:
```
SET GLOBAL log_error_services = 'log_filter_internal; log_sink_internal; log_sink_json';
```


To revert to using only the default sink and unload the system log sink, execute these statements:
```
SET GLOBAL log_error_services = 'log_filter_internal; log_sink_internal;
```


UNINSTALL COMPONENT 'file://component_log_sink_json';

\section*{Log Sink Performance Schema Support}

If enabled log components include a sink that provides Performance Schema support, events written to the error log are also written to the Performance Schema error_log table. This enables examining error log contents using SQL queries. Currently, the traditional-format log_sink_internal and JSON-format log_sink_json sinks support this capability. See Section 29.12.22.2, "The error_log Table".

\subsection*{7.4.2.2 Default Error Log Destination Configuration}

This section describes which server options configure the default error log destination, which can be the console or a named file. It also indicates which log sink components base their own output destination on the default destination.

In this discussion, "console" means stderr, the standard error output. This is your terminal or console window unless the standard error output has been redirected to a different destination.

The server interprets options that determine the default error log destination somewhat differently for Windows and Unix systems. Be sure to configure the destination using the information appropriate to your platform. After the server interprets the default error log destination options, it sets the log_error system variable to indicate the default destination, which affects where several log sink components write error messages. The following sections address these topics.
- Default Error Log Destination on Windows
- Default Error Log Destination on Unix and Unix-Like Systems
- How the Default Error Log Destination Affects Log Sinks

\section*{Default Error Log Destination on Windows}

On Windows, mysqld uses the --log-error, --pid-file, and --console options to determine whether the default error log destination is the console or a file, and, if a file, the file name:
- If --console is given, the default destination is the console. (--console takes precedence over --log-error if both are given, and the following items regarding--log-error do not apply.)
- If --log-error is not given, or is given without naming a file, the default destination is a file named host_name.err in the data directory, unless the --pid-file option is specified. In that case, the file name is the PID file base name with a suffix of .err in the data directory.
- If --log-error is given to name a file, the default destination is that file (with an .err suffix added if the name has no suffix). The file location is under the data directory unless an absolute path name is given to specify a different location.

If the default error log destination is the console, the server sets the log_error system variable to stderr. Otherwise, the default destination is a file and the server sets log_error to the file name.

\section*{Default Error Log Destination on Unix and Unix-Like Systems}

On Unix and Unix-like systems, mysqld uses the--log-error option to determine whether the default error log destination is the console or a file, and, if a file, the file name:
- If--log-error is not given, the default destination is the console.
- If--log-error is given without naming a file, the default destination is a file named host_name.err in the data directory.
- If --log-error is given to name a file, the default destination is that file (with an .err suffix added if the name has no suffix). The file location is under the data directory unless an absolute path name is given to specify a different location.
- If --log-error is given in an option file in a [mysqld], [server], or [mysqld_safe] section, on systems that use mysqld_safe to start the server, mysqld_safe finds and uses the option, and passes it to mysqld.

\section*{Note}

It is common for Yum or APT package installations to configure an error log file location under /var/log with an option like log-error=/var/log/ mysqld. log in a server configuration file. Removing the path name from the option causes the host_name. err file in the data directory to be used.

If the default error log destination is the console, the server sets the log_error system variable to stderr. Otherwise, the default destination is a file and the server sets log_error to the file name.

\section*{How the Default Error Log Destination Affects Log Sinks}

After the server interprets the error log destination configuration options, it sets the log_error system variable to indicate the default error log destination. Log sink components may base their own output destination on the log_error value, or determine their destination independently of log_error If log_error is stderr, the default error log destination is the console, and log sinks that base their output destination on the default destination also write to the console:
- log_sink_internal, log_sink_json, log_sink_test: These sinks write to the console. This is true even for sinks such as log_sink_json that can be enabled multiple times; all instances write to the console.
- log_sink_syseventlog: This sink writes to the system log, regardless of the log_error value.

If log_error is not stderr, the default error log destination is a file and log_error indicates the file name. Log sinks that base their output destination on the default destination base output file naming on that file name. (A sink might use exactly that name, or it might use some variant thereof.) Suppose that the log_error value file_name. Then log sinks use the name like this:
- log_sink_internal, log_sink_test: These sinks write to file_name.
- log_sink_json: Successive instances of this sink named in the log_error_services value write to files named file_name plus a numbered . NN. j son suffix: file_name.00.json, file_name.01.json, and so forth.
- log_sink_syseventlog: This sink writes to the system log, regardless of the log_error value.

\subsection*{7.4.2.3 Error Event Fields}

Error events intended for the error log contain a set of fields, each of which consists of a key/value pair. An event field may be classified as core, optional, or user-defined:
- A core field is set up automatically for error events. However, its presence in the event during event processing is not guaranteed because a core field, like any type of field, may be unset by a log filter. If this happens, the field cannot be found by subsequent processing within that filter and by components that execute after the filter (such as log sinks).
- An optional field is normally absent but may be present for certain event types. When present, an optional field provides additional event information as appropriate and available.
- A user-defined field is any field with a name that is not already defined as a core or optional field. A user-defined field does not exist until created by a log filter.

As implied by the preceding description, any given field may be absent during event processing, either because it was not present in the first place, or was discarded by a filter. For log sinks, the effect of field absence is sink specific. For example, a sink might omit the field from the log message, indicate
that the field is missing, or substitute a default. When in doubt, test: use a filter that unsets the field, then check what the log sink does with it.

The following sections describe the core and optional error event fields. For individual log filter components, there may be additional filter-specific considerations for these fields, or filters may add user-defined fields not listed here. For details, see the documentation for specific filters.
- Core Error Event Fields
- Optional Error Event Fields

\section*{Core Error Event Fields}

These error event fields are core fields:
- time

The event timestamp, with microsecond precision.
- msg

The event message string.
- prio

The event priority, to indicate a system, error, warning, or note/information event. This field corresponds to severity in syslog. The following table shows the possible priority levels.

\begin{tabular}{|l|l|}
\hline Event Type & Numeric Priority \\
\hline System event & 0 \\
\hline Error event & 1 \\
\hline Warning event & 2 \\
\hline Note/information event & 3 \\
\hline
\end{tabular}

The prio value is numeric. Related to it, an error event may also include an optional label field representing the priority as a string. For example, an event with a prio value of 2 may have a label value of 'Warning'.

Filter components may include or drop error events based on priority, except that system events are mandatory and cannot be dropped.

In general, message priorities are determined as follows:
Is the situation or event actionable?
- Yes: Is the situation or event ignorable?
- Yes: Priority is warning.
- No: Priority is error.
- No: Is the situation or event mandatory?
- Yes: Priority is system.
- No: Priority is note/information.
- err_code

The event error code, as a number (for example, 1022).
- err_symbol

The event error symbol, as a string (for example, 'ER_DUP_KEY').
- SQL_state

The event SQLSTATE value, as a string (for example, ' 23000 ' ).
- subsystem

The subsystem in which the event occurred. Possible values are InnoDB (the InnoDB storage engine), Repl (the replication subsystem), Server (otherwise).

\section*{Optional Error Event Fields}

Optional error event fields fall into the following categories:
- Additional information about the error, such as the error signaled by the operating system or the error label:
- OS_errno

The operating system error number.
- OS_errmsg

The operating system error message.
- label

The label corresponding to the prio value, as a string.
- Identification of the client for which the event occurred:
- user

The client user.
- host

The client host.
- thread

The ID of the thread within mysqld responsible for producing the error event. This ID indicates which part of the server produced the event, and is consistent with general query log and slow query log messages, which include the connection thread ID.
- query_id

The query ID.
- Debugging information:
- source_file

The source file in which the event occurred, without any leading path.
- source_line

The line within the source file at which the event occurred.
- function

The function in which the event occurred.
- component

The component or plugin in which the event occurred.

\subsection*{7.4.2.4 Types of Error Log Filtering}

Error log configuration normally includes one log filter component and one or more log sink components. For error log filtering, MySQL offers a choice of components:
- log_filter_internal: This filter component provides error log filtering based on log event priority and error code, in combination with the log_error_verbosity and log_error_suppression_list system variables. log_filter_internal is built in and enabled by default. See Section 7.4.2.5, "Priority-Based Error Log Filtering (log_filter_internal)".
- log_filter_dragnet: This filter component provides error log filtering based on user-supplied rules, in combination with the dragnet.log_error_filter_rules system variable. See Section 7.4.2.6, "Rule-Based Error Log Filtering (log_filter_dragnet)".

\subsection*{7.4.2.5 Priority-Based Error Log Filtering (log_filter_internal)}

The log_filter_internal log filter component implements a simple form of log filtering based on error event priority and error code. To affect how log_filter_internal permits or suppresses error, warning, and information events intended for the error log, set the log_error_verbosity and log_error_suppression_list system variables.
log_filter_internal is built in and enabled by default. If this filter is disabled, log_error_verbosity and log_error_suppression_list have no effect, so filtering must be performed using another filter service instead where desired (for example, with individual filter rules when using log_filter_dragnet). For information about filter configuration, see Section 7.4.2.1, "Error Log Configuration".
- Verbosity Filtering
- Suppression-List Filtering
- Verbosity and Suppression-List Interaction

\section*{Verbosity Filtering}

Events intended for the error log have a priority of ERROR, WARNING, or INFORMATION. The log_error_verbosity system variable controls verbosity based on which priorities to permit for messages written to the log, as shown in the following table.

\begin{tabular}{|l|l|}
\hline log_error_verbosity Value & Permitted Message Priorities \\
\hline 1 & ERROR \\
\hline 2 & ERROR, WARNING \\
\hline 3 & ERROR, WARNING, INFORMATION \\
\hline
\end{tabular}

If log_error_verbosity is 2 or greater, the server logs messages about statements that are unsafe for statement-based logging. If the value is 3 , the server logs aborted connections and accessdenied errors for new connection attempts. See Section B.3.2.9, "Communication Errors and Aborted Connections".

If you use replication, a log_error_verbosity value of 2 or greater is recommended, to obtain more information about what is happening, such as messages about network failures and reconnections.

If log_error_verbosity is 2 or greater on a replica, the replica prints messages to the error log to provide information about its status, such as the binary log and relay log coordinates where it starts its job, when it is switching to another relay log, when it reconnects after a disconnect, and so forth.

There is also a message priority of SYSTEM that is not subject to verbosity filtering. System messages about non-error situations are printed to the error log regardless of the log_error_verbosity value. These messages include startup and shutdown messages, and some significant changes to settings.

In the MySQL error log, system messages are labeled as "System". Other log sinks might or might not follow the same convention, and in the resulting logs, system messages might be assigned the label used for the information priority level, such as "Note" or "Information". If you apply any additional filtering or redirection for logging based on the labeling of messages, system messages do not override your filter, but are handled by it in the same way as other messages.

\section*{Suppression-List Filtering}

The log_error_suppression_list system variable applies to events intended for the error log and specifies which events to suppress when they occur with a priority of WARNING or INFORMATION. For example, if a particular type of warning is considered undesirable "noise" in the error log because it occurs frequently but is not of interest, it can be suppressed. log_error_suppression_list does not suppress messages with a priority of ERROR or SYSTEM.

The log_error_suppression_list value may be the empty string for no suppression, or a list of one or more comma-separated values indicating the error codes to suppress. Error codes may be specified in symbolic or numeric form. A numeric code may be specified with or without the MY - prefix. Leading zeros in the numeric part are not significant. Examples of permitted code formats:

ER_SERVER_SHUTDOWN_COMPLETE
MY-000031
000031
MY-31
31
For readability and portability, symbolic values are preferable to numeric values.
Although codes to be suppressed can be expressed in symbolic or numeric form, the numeric value of each code must be in a permitted range:
- 1 to 999: Global error codes that are used by the server as well as by clients.
- 10000 and higher: Server error codes intended to be written to the error log (not sent to clients).

In addition, each error code specified must actually be used by MySQL. Attempts to specify a code not within a permitted range or within a permitted range but not used by MySQL produce an error and the log_error_suppression_list value remains unchanged.

For information about error code ranges and the error symbols and numbers defined within each range, see Section B.1, "Error Message Sources and Elements", and MySQL 8.4 Error Message Reference.

The server can generate messages for a given error code at differing priorities, so suppression of a message associated with an error code listed in log_error_suppression_list depends on its priority. Suppose that the variable has a value of 'ER_PARSER_TRACE, MY-010001, 10002'. Then log_error_suppression_list has these effects on messages for those codes:
- Messages generated with a priority of WARNING or INFORMATION are suppressed.
- Messages generated with a priority of ERROR or SYSTEM are not suppressed.

\section*{Verbosity and Suppression-List Interaction}

The effect of log_error_verbosity combines with that of log_error_suppression_list. Consider a server started with these settings:
```
[mysqld]
log_error_verbosity=2 # error and warning messages only
log_error_suppression_list='ER_PARSER_TRACE,MY-010001,10002'
```


In this case, log_error_verbosity permits messages with ERROR or WARNING priority and discards messages with INFORMATION priority. Of the nondiscarded messages, log_error_suppression_list discards messages with WARNING priority and any of the named error codes.

\section*{Note}

The log_error_verbosity value of 2 shown in the example is also its default value, so the effect of this variable on INFORMATION messages is as just described by default, without an explicit setting. You must set log_error_verbosity to 3 if you want log_error_suppression_list to affect messages with INFORMATION priority.

Consider a server started with this setting:
```
[mysqld]
log_error_verbosity=1 # error messages only
```


In this case, log_error_verbosity permits messages with ERROR priority and discards messages with WARNING or INFORMATION priority. Setting log_error_suppression_list has no effect because all error codes it might suppress are already discarded due to the log_error_verbosity setting.

\subsection*{7.4.2.6 Rule-Based Error Log Filtering (log_filter_dragnet)}

The log_filter_dragnet log filter component enables log filtering based on user-defined rules.
To enable the log_filter_dragnet filter, first load the filter component, then modify the log_error_services value. The following example enables log_filter_dragnet in combination with the built-in log sink:
```
INSTALL COMPONENT 'file://component_log_filter_dragnet';
SET GLOBAL log_error_services = 'log_filter_dragnet; log_sink_internal';
```


To set log_error_services to take effect at server startup, use the instructions at Section 7.4.2.1, "Error Log Configuration". Those instructions apply to other error-logging system variables as well.

With log_filter_dragnet enabled, define its filter rules by setting the dragnet.log_error_filter_rules system variable. A rule set consists of zero or more rules, where each rule is an IF statement terminated by a period (.) character. If the variable value is empty (zero rules), no filtering occurs.

Example 1. This rule set drops information events, and, for other events, removes the source_line field:
```
SET GLOBAL dragnet.log_error_filter_rules =
    'IF prio>=INFORMATION THEN drop. IF EXISTS source_line THEN unset source_line.';
```


The effect is similar to the filtering performed by the log_sink_internal filter with a setting of log_error_verbosity=2.

For readability, you might find it preferable to list the rules on separate lines. For example:
```
SET GLOBAL dragnet.log_error_filter_rules = '
    IF prio>=INFORMATION THEN drop.
    IF EXISTS source_line THEN unset source_line.
';
```


Example 2: This rule limits information events to no more than one per 60 seconds:
```
SET GLOBAL dragnet.log_error_filter_rules =
    'IF prio>=INFORMATION THEN throttle 1/60.';
```


Once you have the filtering configuration set up as you desire, consider assigning dragnet.log_error_filter_rules using SET PERSIST rather than SET GLOBAL to make the setting persist across server restarts. Alternatively, add the setting to the server option file.

When using log_filter_dragnet, log_error_suppression_list is ignored.
To stop using the filtering language, first remove it from the set of error logging components. Usually this means using a different filter component rather than no filter component. For example:
```
SET GLOBAL log_error_services = 'log_filter_internal; log_sink_internal';
```


Again, consider using SET PERSIST rather than SET GLOBAL to make the setting persist across server restarts.

Then uninstall the filter log_filter_dragnet component:
```
UNINSTALL COMPONENT 'file://component_log_filter_dragnet';
```


The following sections describe aspects of log_filter_dragnet operation in more detail:
- Grammar for log_filter_dragnet Rule Language
- Actions for log_filter_dragnet Rules
- Field References in log_filter_dragnet Rules

\section*{Grammar for log_filter_dragnet Rule Language}

The following grammar defines the language for log_filter_dragnet filter rules. Each rule is an IF statement terminated by a period (.) character. The language is not case-sensitive.
```
rule:
        IF condition THEN action
        [ELSEIF condition THEN action] ...
        [ELSE action]
        .
condition: {
        field comparator value
    | [NOT] EXISTS field
    | condition {AND | OR} condition
}
action: {
        drop
    | throttle {count | count / window_size}
    | set field [:= | =] value
    | unset [field]
}
field: {
        core_field
    | optional_field
    | user_defined_field
}
core_field: {
        time
    | msg
    | prio
    | err_code
    | err_symbol
    | SQL_state
    | subsystem
}
```

```
optional_field: {
        OS_errno
    | OS_errmsg
    | label
    | user
    | host
    | thread
    | query_id
    | source_file
    | source_line
    | function
    | component
}
user_defined_field:
        sequence of characters in [a-ZA-Z0-9_] class
comparator: {== | != | <> | >= | => | <= | =< | < | >}
value: {
        string_literal
    | integer_literal
    | float_literal
    | error_symbol
    | priority
}
count: integer_literal
window_size: integer_literal
string_literal:
        sequence of characters quoted as '...' or ''..''
integer_literal:
        sequence of characters in [0-9] class
float_literal:
        integer_literal[.integer_literal]
error_symbol:
        valid MySQL error symbol such as ER_ACCESS_DENIED_ERROR or ER_STARTUP
priority: {
        ERROR
    | WARNING
    | INFORMATION
}
```


Simple conditions compare a field to a value or test field existence. To construct more complex conditions, use the AND and OR operators. Both operators have the same precedence and evaluate left to right.

To escape a character within a string, precede it by a backslash ( \\). A backslash is required to include backslash itself or the string-quoting character, optional for other characters.

For convenience, log_filter_dragnet supports symbolic names for comparisons to certain fields. For readability and portability, symbolic values are preferable (where applicable) to numeric values.
- Event priority values 1,2 , and 3 can be specified as ERROR, WARNING, and INFORMATION. Priority symbols are recognized only in comparisons with the prio field. These comparisons are equivalent:
```
IF prio == INFORMATION THEN ...
IF prio == 3 THEN ...
```

- Error codes can be specified in numeric form or as the corresponding error symbol. For example, ER_STARTUP is the symbolic name for error 1408, so these comparisons are equivalent:
```
IF err_code == ER_STARTUP THEN ...
IF err_code == 1408 THEN ...
```


Error symbols are recognized only in comparisons with the err_code field and user-defined fields.
To find the error symbol corresponding to a given error code number, use one of these methods:
- Check the list of server errors at Server Error Message Reference.
- Use the perror command. Given an error number argument, perror displays information about the error, including its symbol.

Suppose that a rule set with error numbers looks like this:
```
IF err_code == 10927 OR err_code == 10914 THEN drop.
IF err_code == 1131 THEN drop.
```


Using perror, determine the error symbols:
```
$> perror 10927 10914 1131
MySQL error code MY-010927 (ER_ACCESS_DENIED_FOR_USER_ACCOUNT_LOCKED):
Access denied for user '%-.48s'@'%-.64s'. Account is locked.
MySQL error code MY-010914 (ER_ABORTING_USER_CONNECTION):
Aborted connection %u to db: '%-.192s' user: '%-.48s' host:
'%-.64s' (%-.64s).
MySQL error code MY-001131 (ER_PASSWORD_ANONYMOUS_USER):
You are using MySQL as an anonymous user and anonymous users
are not allowed to change passwords
```


Substituting error symbols for numbers, the rule set becomes:
```
IF err_code == ER_ACCESS_DENIED_FOR_USER_ACCOUNT_LOCKED
    OR err_code == ER_ABORTING_USER_CONNECTION THEN drop.
IF err_code == ER_PASSWORD_ANONYMOUS_USER THEN drop.
```


Symbolic names can be specified as quoted strings for comparison with string fields, but in such cases the names are strings that have no special meaning and log_filter_dragnet does not resolve them to the corresponding numeric value. Also, typos may go undetected, whereas an error occurs immediately on SET for attempts to use an unquoted symbol unknown to the server.

\section*{Actions for log_filter_dragnet Rules}
log_filter_dragnet supports these actions in filter rules:
- drop: Drop the current log event (do not log it).
- throttle: Apply rate limiting to reduce log verbosity for events matching particular conditions. The argument indicates a rate, in the form count or count/window_size. The count value indicates the permitted number of event occurrences to log per time window. The window_size value is the time window in seconds; if omitted, the default window is 60 seconds. Both values must be integer literals.

This rule throttles plugin-shutdown messages to 5 occurrences per 60 seconds:
```
IF err_code == ER_PLUGIN_SHUTTING_DOWN_PLUGIN THEN throttle 5.
```


This rule throttles errors and warnings to 1000 occurrences per hour and information messages to 100 occurrences per hour:
```
IF prio <= INFORMATION THEN throttle 1000/3600 ELSE throttle 100/3600.
```

- set: Assign a value to a field (and cause the field to exist if it did not already). In subsequent rules, EXISTS tests against the field name are true, and the new value can be tested by comparison conditions.
- unset: Discard a field. In subsequent rules, EXISTS tests against the field name are false, and comparisons of the field against any value are false.

In the special case that the condition refers to exactly one field name, the field name following unset is optional and unset discards the named field. These rules are equivalent:
```
IF myfield == 2 THEN unset myfield.
IF myfield == 2 THEN unset.
```


\section*{Field References in log_filter_dragnet Rules}
log_filter_dragnet rules support references to core, optional, and user-defined fields in error events.
- Core Field References
- Optional Field References
- User-Defined Field References

\section*{Core Field References}

The log_filter_dragnet grammar at Grammar for log_filter_dragnet Rule Language names the core fields that filter rules recognize. For general descriptions of these fields, see Section 7.4.2.3, "Error Event Fields", with which you are assumed to be familiar. The following remarks provide additional information only as it pertains specifically to core field references as used within log_filter_dragnet rules.
- prio

The event priority, to indicate an error, warning, or note/information event. In comparisons, each priority can be specified as a symbolic priority name or an integer literal. Priority symbols are recognized only in comparisons with the prio field. These comparisons are equivalent:
```
IF prio == INFORMATION THEN ...
IF prio == 3 THEN ...
```


The following table shows the permitted priority levels.

\begin{tabular}{|l|l|l|}
\hline Event Type & Priority Symbol & Numeric Priority \\
\hline Error event & ERROR & 1 \\
\hline Warning event & WARNING & 2 \\
\hline Note/information event & INFORMATION & 3 \\
\hline
\end{tabular}

There is also a message priority of SYSTEM, but system messages cannot be filtered and are always written to the error log.

Priority values follow the principle that higher priorities have lower values, and vice versa. Priority values begin at 1 for the most severe events (errors) and increase for events with decreasing priority. For example, to discard events with priority lower than warnings, test for priority values higher than WARNING:
```
IF prio > WARNING THEN drop.
```


The following examples show the log_filter_dragnet rules to achieve an effect similar to each log_error_verbosity value permitted by the log_filter_internal filter:
- Errors only (log_error_verbosity=1):
```
IF prio > ERROR THEN drop.
```

- Errors and warnings (log_error_verbosity=2):
```
IF prio > WARNING THEN drop.
```

- Errors, warnings, and notes (log_error_verbosity=3):
```
IF prio > INFORMATION THEN drop.
```


This rule can actually be omitted because there are no prio values greater than INFORMATION, so effectively it drops nothing.
- err_code

The numeric event error code. In comparisons, the value to test can be specified as a symbolic error name or an integer literal. Error symbols are recognized only in comparisons with the err_code field and user-defined fields. These comparisons are equivalent:
```
IF err_code == ER_ACCESS_DENIED_ERROR THEN ...
IF err_code == 1045 THEN ...
```

- err_symbol

The event error symbol, as a string (for example, 'ER_DUP_KEY'). err_symbol values are intended more for identifying particular lines in log output than for use in filter rule comparisons because log_filter_dragnet does not resolve comparison values specified as strings to the equivalent numeric error code. (For that to occur, an error must be specified using its unquoted symbol.)

\section*{Optional Field References}

The log_filter_dragnet grammar at Grammar for log_filter_dragnet Rule Language names the optional fields that filter rules recognize. For general descriptions of these fields, see Section 7.4.2.3, "Error Event Fields", with which you are assumed to be familiar. The following remarks provide additional information only as it pertains specifically to optional field references as used within log_filter_dragnet rules.
- label

The label corresponding to the prio value, as a string. Filter rules can change the label for log sinks that support custom labels. label values are intended more for identifying particular lines in log output than for use in filter rule comparisons because log_filter_dragnet does not resolve comparison values specified as strings to the equivalent numeric priority.
- source_file

The source file in which the event occurred, without any leading path. For example, to test for the sql/gis/distance.cc file, write the comparison like this:
```
IF source_file == "distance.cc" THEN ...
```


\section*{User-Defined Field References}

Any field name in a log_filter_dragnet filter rule not recognized as a core or optional field name is taken to refer to a user-defined field.

\subsection*{7.4.2.7 Error Logging in JSON Format}

This section describes how to configure error logging using the built-in filter, log_filter_internal, and the JSON sink, log_sink_j son, to take effect immediately and for subsequent server startups. For general information about configuring error logging, see Section 7.4.2.1, "Error Log Configuration".

To enable the JSON sink, first load the sink component, then modify the log_error_services value:
```
INSTALL COMPONENT 'file://component_log_sink_json';
SET PERSIST log_error_services = 'log_filter_internal; log_sink_json';
```


To set log_error_services to take effect at server startup, use the instructions at Section 7.4.2.1, "Error Log Configuration". Those instructions apply to other error-logging system variables as well.

It is permitted to name log_sink_json multiple times in the log_error_services value. For example, to write unfiltered events with one instance and filtered events with another instance, you could set log_error_services like this:

SET PERSIST log_error_services = 'log_sink_json; log_filter_internal; log_sink_json';
The JSON sink determines its output destination based on the default error log destination, which is given by the log_error system variable. If log_error names a file, the JSON sink bases output file naming on that file name, plus a numbered.$N N$. j son suffix, with $N N$ starting at 00 . For example, if log_error is file_name, successive instances of log_sink_json named in the log_error_services value write to file_name.00.json, file_name.01.json, and so forth.

If log_error is stderr, the JSON sink writes to the console. If log_sink_json is named multiple times in the log_error_services value, they all write to the console, which is likely not useful.

\subsection*{7.4.2.8 Error Logging to the System Log}

It is possible to have mysqld write the error log to the system log (the Event Log on Windows, and syslog on Unix and Unix-like systems).

This section describes how to configure error logging using the built-in filter, log_filter_internal, and the system log sink, log_sink_syseventlog, to take effect immediately and for subsequent server startups. For general information about configuring error logging, see Section 7.4.2.1, "Error Log Configuration".

To enable the system log sink, first load the sink component, then modify the log_error_services value:

INSTALL COMPONENT 'file://component_log_sink_syseventlog'; SET PERSIST log_error_services = 'log_filter_internal; log_sink_syseventlog';

To set log_error_services to take effect at server startup, use the instructions at Section 7.4.2.1, "Error Log Configuration". Those instructions apply to other error-logging system variables as well.

\section*{Note}

Error logging to the system log may require additional system configuration. Consult the system log documentation for your platform.

On Windows, error messages written to the Event Log within the Application log have these characteristics:
- Entries marked as Error, Warning, and Note are written to the Event Log, but not messages such as information statements from individual storage engines.
- Event Log entries have a source of MySQL (or MySQL-tag if syseventlog.tag is defined as tag).

On Unix and Unix-like systems, logging to the system log uses syslog. The following system variables affect syslog messages:
- syseventlog.facility: The default facility for syslog messages is daemon. Set this variable to specify a different facility.
- syseventlog.include_pid: Whether to include the server process ID in each line of syslog output.
- syseventlog.tag: This variable defines a tag to add to the server identifier (mysqld) in syslog messages. If defined, the tag is appended to the identifier with a leading hyphen.

MySQL uses the custom label "System" for important system messages about non-error situations, such as startup, shutdown, and some significant changes to settings. In logs that do not support custom labels, including the Event Log on Windows, and syslog on Unix and Unix-like systems, system messages are assigned the label used for the information priority level. However, these messages are printed to the log even if the MySQL log_error_verbosity setting normally excludes messages at the information level.

When a log sink must fall back to a label of "Information" instead of "System" in this way, and the log event is further processed outside of the MySQL server (for example, filtered or forwarded by a syslog configuration), these events may by default be processed by the secondary application as being of "Information" priority rather than "System" priority.

\subsection*{7.4.2.9 Error Log Output Format}

Each error log sink (writer) component has a characteristic output format it uses to write messages to its destination, but other factors may influence the content of the messages:
- The information available to the log sink. If a log filter component executed prior to execution of the sink component removes a log event field, that field is not available for writing. For information about log filtering, see Section 7.4.2.4, "Types of Error Log Filtering".
- The information relevant to the log sink. Not every sink writes all fields available in error events.
- System variables may affect log sinks. See System Variables That Affect Error Log Format.

For names and descriptions of the fields in error events, see Section 7.4.2.3, "Error Event Fields". For all log sinks, the thread ID included in error log messages is that of the thread within mysqld responsible for writing the message. This ID indicates which part of the server produced the message, and is consistent with general query log and slow query log messages, which include the connection thread ID.
- log_sink_internal Output Format
- log_sink_json Output Format
- log_sink_syseventlog Output Format
- Early-Startup Logging Output Format
- System Variables That Affect Error Log Format

\section*{log_sink_internal Output Format}

The internal log sink produces traditional error log output. For example:
```
2020-08-06T14:25:02.835618Z 0 [Note] [MY-012487] [InnoDB] DDL log recovery : begin
2020-08-06T14:25:02.936146Z 0 [Warning] [MY-010068] [Server] CA certificate /var/mysql/sslinfo/cacert.pem
2020-08-06T14:25:02.963127Z 0 [Note] [MY-010253] [Server] IPv6 is available.
2020-08-06T14:25:03.109022Z 5 [Note] [MY-010051] [Server] Event Scheduler: scheduler thread started with ic
```


Traditional-format messages have these fields:
```
time thread [label] [err_code] [subsystem] msg
```


The [ and ] square bracket characters are literal characters in the message format. They do not indicate that fields are optional.

The label value corresponds to the string form of the prio error event priority field.
The [err_code] and [subsystem] fields were added in MySQL 8.0, and thus are missing from logs generated by older servers. Log parsers can treat these fields as parts of the message text that is present only for logs written by servers recent enough to include them. Parsers must treat the
err_code part of [err_code] indicators as a string value, not a number, because values such as MY-012487 and MY-010051 contain nonnumeric characters.

\section*{log_sink_json Output Format}

The JSON-format log sink produces messages as JSON objects that contain key-value pairs. For example:
```
{
    "prio": 3,
    "err_code": 10051,
    "source_line": 561,
    "source_file": "event_scheduler.cc",
    "function": "run",
    "msg": "Event Scheduler: scheduler thread started with id 5",
    "time": "2020-08-06T14:25:03.109022Z",
    "ts": 1596724012005,
    "thread": 5,
    "err_symbol": "ER_SCHEDULER_STARTED",
    "SQL_state": "HY000",
    "subsystem": "Server",
    "buffered": 1596723903109022,
    "label": "Note"
}
```


The message shown is reformatted for readability. Events written to the error log appear one message per line.

The ts (timestamp) key is unique to the JSON-format log sink. The value is an integer indicating milliseconds since the epoch ('1970-01-01 00:00:00' UTC).

The ts and buffered values are Unix timestamp values and can be converted using FROM_UNIXTIME( ) and an appropriate divisor:
```
mysql> SET time_zone = '+00:00';
mysql> SELECT FROM_UNIXTIME(1596724012005/1000.0);
+---------------------------------------+
| FROM_UNIXTIME(1596724012005/1000.0) |
+---------------------------------------+
| 2020-08-06 14:26:52.0050 |
+---------------------------------------+
mysql> SELECT FROM_UNIXTIME(1596723903109022/1000000.0);
+--------------------------------------------+
| FROM_UNIXTIME(1596723903109022/1000000.0) |
+---------------------------------------------
| 2020-08-06 14:25:03.1090
+-------------------------------------------
```


\section*{log_sink_syseventlog Output Format}

The system log sink produces output that conforms to the system log format used on the local platform.

\section*{Early-Startup Logging Output Format}

The server generates some error log messages before startup options have been processed, and thus before it knows error log settings such as the log_error_verbosity and log_timestamps system variable values, and before it knows which log components are to be used. The server handles error log messages that are generated early in the startup process as follows:
- The server buffers log events (rather than formatted log messages), which enables it to apply configuration settings to those events retroactively, after the settings are known, with the result that flushed messages use the configured settings, not the defaults. Also, messages are flushed to all configured sinks, not just the default sink.

If a fatal error occurs before log configuration is known and the server must exit, the server formats buffered messages using the logging defaults so they are not lost. If no fatal error occurs but startup is excessively slow prior to processing startup options, the server periodically formats and flushes
buffered messages using the logging defaults so as not to appear unresponsive. Although this behavior uses the defaults, it is preferable to losing messages when exceptional conditions occur.

\section*{System Variables That Affect Error Log Format}

The log_timestamps system variable controls the time zone of timestamps in messages written to the error log (as well as to general query log and slow query log files). The server applies log_timestamps to error events before they reach any log sink; it thus affects error message output from all sinks.

Permitted log_timestamps values are UTC (the default) and SYSTEM (the local system time zone). Timestamps are written using ISO 8601 / RFC 3339 format: $Y Y Y Y$ - MM-DDThh : mm : ss . uuuuuu plus a tail value of Z signifying Zulu time (UTC) or $\pm \mathrm{hh}$ : mm (an offset that indicates the local system time zone adjustment relative to UTC). For example:
```
2020-08-07T15:02:00.832521Z (UTC)
2020-08-07T10:02:00.832521-05:00 (SYSTEM)
```


\subsection*{7.4.2.10 Error Log File Flushing and Renaming}

If you flush the error log using a FLUSH ERROR LOGS or FLUSH LOGS statement, or a mysqladmin flush-logs command, the server closes and reopens any error log file to which it is writing. To rename an error log file, do so manually before flushing. Flushing the logs then opens a new file with the original file name. For example, assuming a log file name of host_name.err, use the following commands to rename the file and create a new one:
```
mv host_name.err host_name.err-old
mysqladmin flush-logs error
mv host_name.err-old backup-directory
```


On Windows, use rename rather than mv.
If the location of the error log file is not writable by the server, the log-flushing operation fails to create a new log file. For example, on Linux, the server might write the error log to the /var/log/mysqld.log file, where the /var/log directory is owned by root and is not writable by mysqld. For information about handling this case, see Section 7.4.6, "Server Log Maintenance".

If the server is not writing to a named error log file, no error log file renaming occurs when the error log is flushed.

\subsection*{7.4.3 The General Query Log}

The general query log is a general record of what mysqld is doing. The server writes information to this log when clients connect or disconnect, and it logs each SQL statement received from clients. The general query log can be very useful when you suspect an error in a client and want to know exactly what the client sent to mysqld.

Each line that shows when a client connects also includes using connection_type to indicate the protocol used to establish the connection. connection_type is one of TCP/IP (TCP/IP connection established without SSL), SSL/TLS (TCP/IP connection established with SSL), Socket (Unix socket file connection), Named Pipe (Windows named pipe connection), or Shared Memory (Windows shared memory connection).
mysqld writes statements to the query log in the order that it receives them, which might differ from the order in which they are executed. This logging order is in contrast with that of the binary log, for which statements are written after they are executed but before any locks are released. In addition, the query log may contain statements that only select data while such statements are never written to the binary log.

When using statement-based binary logging on a replication source server, statements received by its replicas are written to the query log of each replica. Statements are written to the query log of the source if a client reads events with the mysqlbinlog utility and passes them to the server.

However, when using row-based binary logging, updates are sent as row changes rather than SQL statements, and thus these statements are never written to the query log when binlog_format is ROW. A given update also might not be written to the query log when this variable is set to MIXED, depending on the statement used. See Section 19.2.1.1, "Advantages and Disadvantages of Statement-Based and Row-Based Replication", for more information.

By default, the general query log is disabled. To specify the initial general query log state explicitly, use --general_log[=\{0|1\}]. With no argument or an argument of 1, --general_log enables the log. With an argument of 0 , this option disables the log. To specify a log file name, use -general_log_file=file_name. To specify the log destination, use the log_output system variable (as described in Section 7.4.1, "Selecting General Query Log and Slow Query Log Output Destinations").
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1037.jpg?height=120&width=102&top_left_y=778&top_left_x=367)

\section*{Note}

If you specify the TABLE log destination, see Log Tables and "Too many open files" Errors.

If you specify no name for the general query log file, the default name is host_name.log. The server creates the file in the data directory unless an absolute path name is given to specify a different directory.

To disable or enable the general query log or change the log file name at runtime, use the global general_log and general_log_file system variables. Set general_log to 0 (or OFF) to disable the log or to 1 (or 0 N ) to enable it. Set general_log_file to specify the name of the log file. If a log file already is open, it is closed and the new file is opened.

When the general query log is enabled, the server writes output to any destinations specified by the log_output system variable. If you enable the log, the server opens the log file and writes startup messages to it. However, further logging of queries to the file does not occur unless the FILE log destination is selected. If the destination is NONE, the server writes no queries even if the general log is enabled. Setting the log file name has no effect on logging if the log destination value does not contain FILE.

Server restarts and log flushing do not cause a new general query log file to be generated (although flushing closes and reopens it). To rename the file and create a new one, use the following commands:
```
$> mv host_name.log host_name-old.log
$> mysqladmin flush-logs general
$> mv host_name-old.log backup-directory
```


On Windows, use rename rather than mv.
You can also rename the general query log file at runtime by disabling the log:
SET GLOBAL general_log = 'OFF';
With the log disabled, rename the log file externally (for example, from the command line). Then enable the log again:

SET GLOBAL general_log = 'ON';
This method works on any platform and does not require a server restart.
To disable or enable general query logging for the current session, set the session sql_log_off variable to ON or OFF. (This assumes that the general query log itself is enabled.)

Passwords in statements written to the general query log are rewritten by the server not to occur literally in plain text. Password rewriting can be suppressed for the general query log by starting the server with the --log-raw option. This option may be useful for diagnostic purposes, to see the exact text of statements as received by the server, but for security reasons is not recommended for production use. See also Section 8.1.2.3, "Passwords and Logging".

An implication of password rewriting is that statements that cannot be parsed (due, for example, to syntax errors) are not written to the general query log because they cannot be known to be password free. Use cases that require logging of all statements including those with errors should use the - -log-raw option, bearing in mind that this also bypasses password rewriting.

Password rewriting occurs only when plain text passwords are expected. For statements with syntax that expect a password hash value, no rewriting occurs. If a plain text password is supplied erroneously for such syntax, the password is logged as given, without rewriting.

The log_timestamps system variable controls the time zone of timestamps in messages written to the general query log file (as well as to the slow query log file and the error log). It does not affect the time zone of general query log and slow query log messages written to log tables, but rows retrieved from those tables can be converted from the local system time zone to any desired time zone with CONVERT_TZ() or by setting the session time_zone system variable.

\subsection*{7.4.4 The Binary Log}

The binary log contains "events" that describe database changes such as table creation operations or changes to table data. It also contains events for statements that potentially could have made changes (for example, a DELETE which matched no rows), unless row-based logging is used. The binary log also contains information about how long each statement took that updated data. The binary log has two important purposes:
- For replication, the binary log on a replication source server provides a record of the data changes to be sent to replicas. The source sends the information contained in its binary log to its replicas, which reproduce those transactions to make the same data changes that were made on the source. See Section 19.2, "Replication Implementation".
- Certain data recovery operations require use of the binary log. After a backup has been restored, the events in the binary log that were recorded after the backup was made are re-executed. These events bring databases up to date from the point of the backup. See Section 9.5, "Point-in-Time (Incremental) Recovery".

The binary log is not used for statements such as SELECT or SHOW that do not modify data. To log all statements (for example, to identify a problem query), use the general query log. See Section 7.4.3, "The General Query Log".

Running a server with binary logging enabled makes performance slightly slower. However, the benefits of the binary log in enabling you to set up replication and for restore operations generally outweigh this minor performance decrement.

The binary log is resilient to unexpected halts. Only complete events or transactions are logged or read back.

Passwords in statements written to the binary log are rewritten by the server not to occur literally in plain text. See also Section 8.1.2.3, "Passwords and Logging".

MySQL binary log files and relay log files can be encrypted, helping to protect these files and the potentially sensitive data contained in them from being misused by outside attackers, and also from unauthorized viewing by users of the operating system where they are stored. You enable encryption on a MySQL server by setting the binlog_encryption system variable to ON. For more information, see Section 19.3.2, "Encrypting Binary Log Files and Relay Log Files".

The following discussion describes some of the server options and variables that affect the operation of binary logging. For a complete list, see Section 19.1.6.4, "Binary Logging Options and Variables".

Binary logging is enabled by default (the log_bin system variable is set to ON). The exception is if you use mysqld to initialize the data directory manually by invoking it with the --initialize or --initialize-insecure option, when binary logging is disabled by default, but can be enabled by specifying the --log-bin option.

To disable binary logging, you can specify the --skip-log-bin or --disable-log-bin option at startup. If either of these options is specified and --log-bin is also specified, the option specified later takes precedence.

The --log-replica-updates and --replica-preserve-commit-order options require binary logging. If you disable binary logging, either omit these options, or specify - - log - replicaupdates=0FF and --skip-replica-preserve-commit-order. MySQL disables these options by default when --skip-log-bin or--disable-log-bin is specified. If you specify--log-replica-updates or --replica-preserve-commit-order together with --skip-log-bin or --disable-log-bin, a warning or error message is issued.

The --log-bin [=base_name] option is used to specify the base name for binary log files. If you do not supply the --log-bin option, MySQL uses binlog as the default base name for the binary log files. For compatibility with earlier releases, if you supply the --log-bin option with no string or with an empty string, the base name defaults to host_name-bin, using the name of the host machine. It is recommended that you specify a base name, so that if the host name changes, you can easily continue to use the same binary log file names (see Section B.3.7, "Known Issues in MySQL"). If you supply an extension in the log name (for example, --log-bin=base_name.extension), the extension is silently removed and ignored.
mysqld appends a numeric extension to the binary log base name to generate binary log file names. The number increases each time the server creates a new log file, thus creating an ordered series of files. The server creates a new file in the series each time any of the following events occurs:
- The server is started or restarted
- The server flushes the logs.
- The size of the current log file reaches max_binlog_size.

A binary log file may become larger than max_binlog_size if you are using large transactions because a transaction is written to the file in one piece, never split between files.

To keep track of which binary log files have been used, mysqld also creates a binary log index file that contains the names of the binary log files. By default, this has the same base name as the binary log file, with the extension '.index'. You can change the name of the binary log index file with the --log-bin-index[=file_name] option. You should not manually edit this file while mysqld is running; doing so would confuse mysqld.

The term "binary log file" generally denotes an individual numbered file containing database events. The term "binary log" collectively denotes the set of numbered binary log files plus the index file.

The default location for binary log files and the binary log index file is the data directory. You can use the--log-bin option to specify an alternative location, by adding a leading absolute path name to the base name to specify a different directory. When the server reads an entry from the binary log index file, which tracks the binary log files that have been used, it checks whether the entry contains a relative path. If it does, the relative part of the path is replaced with the absolute path set using the -log-bin option. An absolute path recorded in the binary log index file remains unchanged; in such a case, the index file must be edited manually to enable a new path or paths to be used. The binary log file base name and any specified path are available as the log_bin_basename system variable.

The server can be started with the default server ID when binary logging is enabled, but an informational message is issued if you do not specify a server ID explicitly using the server_id system variable. For servers that are used in a replication topology, you must specify a unique nonzero server ID for each server.

A client that has privileges sufficient to set restricted session system variables (see Section 7.1.9.1, "System Variable Privileges") can disable binary logging of its own statements by using a SET sql_log_bin=0FF statement.

By default, the server logs the length of the event as well as the event itself and uses this to verify that the event was written correctly. You can also cause the server to write checksums for the events
by setting the binlog_checksum system variable. When reading back from the binary log, the source uses the event length by default, but can be made to use checksums if available by enabling source_verify_checksum. The replication I/O (receiver) thread on the replica also verifies events received from the source. You can cause the replication SQL (applier) thread to use checksums if available when reading from the relay log by enabling replica_sql_verify_checksum.

The format of the events recorded in the binary log is dependent on the binary logging format. Three format types are supported: row-based logging, statement-based logging and mixed-base logging. The binary logging format used depends on the MySQL version. For descriptions of the logging formats, see Section 7.4.4.1, "Binary Logging Formats".

The server evaluates the --binlog-do-db and--binlog-ignore-db options in the same way as it does the --replicate-do-db and --replicate-ignore-db options. For information about how this is done, see Section 19.2.5.1, "Evaluation of Database-Level Replication and Binary Logging Options".

A replica is started with log_replica_updates enabled by default, meaning that the replica writes to its own binary log any data modifications that are received from the source. The binary log must be enabled for this setting to work (see Section 19.1.6.3, "Replica Server Options and Variables"). This setting enables the replica to act as a source to other replicas.

You can delete all binary log files with the RESET BINARY LOGS AND GTIDS statement, or a subset of them with PURGE BINARY LOGS. See Section 15.7.8.6, "RESET Statement", and Section 15.4.1.1, "PURGE BINARY LOGS Statement".

If you are using MySQL Replication, you should not delete old binary log files on the source until you are sure that no replica still needs to use them. For example, if your replicas never run more than three days behind, once a day you can execute mysqladmin flush-logs binary on the source and then remove any logs that are more than three days old. You can remove the files manually, but it is preferable to use PURGE BINARY LOGS, which also safely updates the binary log index file for you (and which can take a date argument). See Section 15.4.1.1, "PURGE BINARY LOGS Statement".

You can display the contents of binary log files with the mysqlbinlog utility. This can be useful when you want to reprocess statements in the log for a recovery operation. For example, you can update a MySQL server from the binary log as follows:
\$> mysqlbinlog log_file | mysql -h server_name
mysqlbinlog also can be used to display the contents of the relay log file on a replica, because they are written using the same format as binary log files. For more information on the mysqlbinlog utility and how to use it, see Section 6.6.9, "mysqlbinlog — Utility for Processing Binary Log Files". For more information about the binary log and recovery operations, see Section 9.5, "Point-in-Time (Incremental) Recovery".

Binary logging is done immediately after a statement or transaction completes but before any locks are released or any commit is done. This ensures that the log is logged in commit order.

Updates to nontransactional tables are stored in the binary log immediately after execution.
Within an uncommitted transaction, all updates (UPDATE, DELETE, or INSERT) that change transactional tables such as InnoDB tables are cached until a COMMIT statement is received by the server. At that point, mysqld writes the entire transaction to the binary log before the COMMIT is executed.

Modifications to nontransactional tables cannot be rolled back. If a transaction that is rolled back includes modifications to nontransactional tables, the entire transaction is logged with a ROLLBACK statement at the end to ensure that the modifications to those tables are replicated.

When a thread that handles the transaction starts, it allocates a buffer of binlog_cache_size to buffer statements. If a statement is bigger than this, the thread opens a temporary file to store the
transaction. The temporary file is deleted when the thread ends. If binary log encryption is active on the server, the temporary file is encrypted.

The Binlog_cache_use status variable shows the number of transactions that used this buffer (and possibly a temporary file) for storing statements. The Binlog_cache_disk_use status variable shows how many of those transactions actually had to use a temporary file. These two variables can be used for tuning binlog_cache_size to a large enough value that avoids the use of temporary files.

The max_binlog_cache_size system variable (default 4 GB , which is also the maximum) can be used to restrict the total size used to cache a multiple-statement transaction. If a transaction is larger than this many bytes, it fails and rolls back. The minimum value is 4096.

If you are using the binary log and row based logging, concurrent inserts are converted to normal inserts for CREATE ... SELECT or INSERT ... SELECT statements. This is done to ensure that you can re-create an exact copy of your tables by applying the log during a backup operation. If you are using statement-based logging, the original statement is written to the log.

The binary log format has some known limitations that can affect recovery from backups. See Section 19.5.1, "Replication Features and Issues".

Binary logging for stored programs is done as described in Section 27.7, "Stored Program Binary Logging".

Note that the binary log format differs in MySQL 8.4 from previous versions of MySQL, due to enhancements in replication. See Section 19.5.2, "Replication Compatibility Between MySQL Versions".

If the server is unable to write to the binary log, flush binary log files, or synchronize the binary log to disk, the binary log on the replication source server can become inconsistent and replicas can lose synchronization with the source. The binlog_error_action system variable controls the action taken if an error of this type is encountered with the binary log.
- The default setting, ABORT_SERVER, makes the server halt binary logging and shut down. At this point, you can identify and correct the cause of the error. On restart, recovery proceeds as in the case of an unexpected server halt (see Section 19.4.2, "Handling an Unexpected Halt of a Replica").
- The setting IGNORE_ERROR provides backward compatibility with older versions of MySQL. With this setting, the server continues the ongoing transaction and logs the error, then halts binary logging, but continues to perform updates. At this point, you can identify and correct the cause of the error. To resume binary logging, log_bin must be enabled again, which requires a server restart. Only use this option if you require backward compatibility, and the binary log is non-essential on this MySQL server instance. For example, you might use the binary log only for intermittent auditing or debugging of the server, and not use it for replication from the server or rely on it for point-in-time restore operations.

By default, the binary log is synchronized to disk at each write (sync_binlog=1). If sync_binlog was not enabled, and the operating system or machine (not only the MySQL server) crashed, there is a chance that the last statements of the binary log could be lost. To prevent this, enable the sync_binlog system variable to synchronize the binary log to disk after every $N$ commit groups. See Section 7.1.8, "Server System Variables". The safest value for sync_binlog is 1 (the default), but this is also the slowest.

In earlier MySQL releases, there was a chance of inconsistency between the table content and binary log content if a crash occurred, even with sync_binlog set to 1 . For example, if you are using InnoDB tables and the MySQL server processes a COMMIT statement, it writes many prepared transactions to the binary log in sequence, synchronizes the binary log, and then commits the transaction into InnoDB. If the server unexpectedly exited between those two operations, the transaction would be rolled back by InnoDB at restart but still exist in the binary log. Such an issue was resolved in previous releases by enabling InnoDB support for two-phase commit in XA transactions. In MySQL 8.4, InnoDB support for two-phase commit in XA transactions is always enabled.

InnoDB support for two-phase commit in XA transactions ensures that the binary log and InnoDB data files are synchronized. However, the MySQL server should also be configured to synchronize the binary log and the InnoDB logs to disk before committing the transaction. The InnoDB logs are synchronized by default, and sync_binlog=1 ensures the binary log is synchronized. The effect of implicit InnoDB support for two-phase commit in XA transactions and sync_binlog=1 is that at restart after a crash, after doing a rollback of transactions, the MySQL server scans the latest binary log file to collect transaction xid values and calculate the last valid position in the binary log file. The MySQL server then tells InnoDB to complete any prepared transactions that were successfully written to the to the binary log, and truncates the binary log to the last valid position. This ensures that the binary log reflects the exact data of InnoDB tables, and therefore the replica remains in synchrony with the source because it does not receive a statement which has been rolled back.

If the MySQL server discovers at crash recovery that the binary log is shorter than it should have been, it lacks at least one successfully committed InnoDB transaction. This should not happen if sync_binlog=1 and the disk/file system do an actual sync when they are requested to (some do not), so the server prints an error message The binary log file_name is shorter than its expected size. In this case, this binary log is not correct and replication should be restarted from a fresh snapshot of the source's data.

The session values of the following system variables are written to the binary log and honored by the replica when parsing the binary log:
- sql_mode (except that the NO_DIR_IN_CREATE mode is not replicated; see Section 19.5.1.39, "Replication and Variables")
- foreign_key_checks
- unique_checks
- character_set_client
- collation_connection
- collation_database
- collation_server
- sql_auto_is_null

\subsection*{7.4.4.1 Binary Logging Formats}

The server uses several logging formats to record information in the binary log:
- Replication capabilities in MySQL originally were based on propagation of SQL statements from source to replica. This is called statement-based logging. You can cause this format to be used by starting the server with --binlog-format=STATEMENT.
- In row-based logging (the default), the source writes events to the binary log that indicate how individual table rows are affected. You can cause the server to use row-based logging by starting it with --binlog-format=ROW.
- A third option is also available: mixed logging. With mixed logging, statement-based logging is used by default, but the logging mode switches automatically to row-based in certain cases as described below. You can cause MySQL to use mixed logging explicitly by starting mysqld with the option --binlog-format=MIXED.

The logging format can also be set or limited by the storage engine being used. This helps to eliminate issues when replicating certain statements between a source and replica which are using different storage engines.

With statement-based replication, there may be issues with replicating nondeterministic statements. In deciding whether or not a given statement is safe for statement-based replication, MySQL determines
whether it can guarantee that the statement can be replicated using statement-based logging. If MySQL cannot make this guarantee, it marks the statement as potentially unreliable and issues the warning, Statement may not be safe to log in statement format.

You can avoid these issues by using MySQL's row-based replication instead.

\subsection*{7.4.4.2 Setting The Binary Log Format}

You can select the binary logging format explicitly by starting the MySQL server with --binlogformat=type. The supported values for type are:
- STATEMENT causes logging to be statement based.
- ROW causes logging to be row based. This is the default.
- MIXED causes logging to use mixed format.

Setting the binary logging format does not activate binary logging for the server. The setting only takes effect when binary logging is enabled on the server, which is the case when the log_bin system variable is set to ON. In MySQL 8.4, binary logging is enabled by default, and is disabled only if you start the server with --skip-log-bin or --disable-log-bin.

The logging format also can be switched at runtime, although note that there are a number of situations in which you cannot do this, as discussed later in this section. Set the global value of the binlog_format system variable to specify the format for clients that connect subsequent to the change:
```
mysql> SET GLOBAL binlog_format = 'STATEMENT';
mysql> SET GLOBAL binlog_format = 'ROW';
mysql> SET GLOBAL binlog_format = 'MIXED';
```


An individual client can control the logging format for its own statements by setting the session value of binlog_format:
```
mysql> SET SESSION binlog_format = 'STATEMENT';
mysql> SET SESSION binlog_format = 'ROW';
mysql> SET SESSION binlog_format = 'MIXED';
```


Changing the global binlog_format value requires privileges sufficient to set global system variables. Changing the session binlog_format value requires privileges sufficient to set restricted session system variables. See Section 7.1.9.1, "System Variable Privileges".

There are several reasons why a client might want to set binary logging on a per-session basis:
- A session that makes many small changes to the database might want to use row-based logging.
- A session that performs updates that match many rows in the WHERE clause might want to use statement-based logging because it is more efficient to log a few statements than many rows.
- Some statements require a lot of execution time on the source, but result in just a few rows being modified. It might therefore be beneficial to replicate them using row-based logging.

There are exceptions when you cannot switch the replication format at runtime:
- The replication format cannot be changed from within a stored function or a trigger.
- If the NDB storage engine is enabled.
- If a session has open temporary tables, the replication format cannot be changed for the session (SET @@SESSION.binlog_format).
- If any replication channel has open temporary tables, the replication format cannot be changed globally (SET @@GLOBAL.binlog_format or SET @@PERSIST.binlog_format).
- If any replication channel applier thread is currently running, the replication format cannot be changed globally (SET @@GLOBAL.binlog_format or SET @@PERSIST.binlog_format).

Trying to switch the replication format in any of these cases (or attempting to set the current replication format) results in an error. You can, however, use PERSIST_ONLY (SET @@PERSIST_ONLY.binlog_format) to change the replication format at any time, because this action does not modify the runtime global system variable value, and takes effect only after a server restart.

Switching the replication format at runtime is not recommended when any temporary tables exist, because temporary tables are logged only when using statement-based replication, whereas with rowbased replication and mixed replication, they are not logged.

Switching the replication format while replication is ongoing can also cause issues. Each MySQL Server can set its own and only its own binary logging format (true whether binlog_format is set with global or session scope). This means that changing the logging format on a replication source server does not cause a replica to change its logging format to match. When using STATEMENT mode, the binlog_format system variable is not replicated. When using MIXED or ROW logging mode, it is replicated but is ignored by the replica.

A replica is not able to convert binary log entries received in ROW logging format to STATEMENT format for use in its own binary log. The replica must therefore use ROW or MIXED format if the source does. Changing the binary logging format on the source from STATEMENT to ROW or MIXED while replication is ongoing to a replica with STATEMENT format can cause replication to fail with errors such as Error executing row event: 'Cannot execute statement: impossible to write to binary log since statement is in row format and BINLOG_FORMAT = STATEMENT.' Changing the binary logging format on the replica to STATEMENT format when the source is still using MIXED or ROW format also causes the same type of replication failure. To change the format safely, you must stop replication and ensure that the same change is made on both the source and the replica.

If you are using InnoDB tables and the transaction isolation level is READ COMMITTED or READ UNCOMMITTED, only row-based logging can be used. It is possible to change the logging format to STATEMENT, but doing so at runtime leads very rapidly to errors because InnoDB can no longer perform inserts.

With the binary log format set to ROW, many changes are written to the binary log using the row-based format. Some changes, however, still use the statement-based format. Examples include all DDL (data definition language) statements such as CREATE TABLE, ALTER TABLE, or DROP TABLE.

When row-based binary logging is used, the binlog_row_event_max_size system variable and its corresponding startup option --binlog-row-event-max-size set a soft limit on the maximum size of row events. The default value is 8192 bytes, and the value can only be changed at server startup. Where possible, rows stored in the binary log are grouped into events with a size not exceeding the value of this setting. If an event cannot be split, the maximum size can be exceeded.

The --binlog-row-event-max-size option is available for servers that are capable of row-based replication. Rows are stored into the binary log in chunks having a size in bytes not exceeding the value of this option. The value must be a multiple of 256 . The default value is 8192.

\section*{Warning}

When using statement-based logging for replication, it is possible for the data on the source and replica to become different if a statement is designed in such a way that the data modification is nondeterministic; that is, it is left up to the query optimizer. In general, this is not a good practice even outside of replication. For a detailed explanation of this issue, see Section B.3.7, "Known Issues in MySQL".

\subsection*{7.4.4.3 Mixed Binary Logging Format}

When running in MIXED logging format, the server automatically switches from statement-based to row-based logging under the following conditions:
- When a function contains UUID().
- When one or more tables with AUTO_INCREMENT columns are updated and a trigger or stored function is invoked. Like all other unsafe statements, this generates a warning if binlog_format = STATEMENT.

For more information, see Section 19.5.1.1, "Replication and AUTO_INCREMENT".
- When the body of a view requires row-based replication, the statement creating the view also uses it. For example, this occurs when the statement creating a view uses the UUID ( ) function.
- When a call to a loadable function is involved.
- When FOUND_ROWS( ) or ROW_COUNT( ) is used. (Bug \#12092, Bug \#30244)
- When USER( ), CURRENT_USER( ), or CURRENT_USER is used. (Bug \#28086)
- When one of the tables involved is a log table in the mysql database.
- When the LOAD_FILE( ) function is used. (Bug \#39701)
- When a statement refers to one or more system variables. (Bug \#31168)

Exception. The following system variables, when used with session scope (only), do not cause the logging format to switch:
- auto_increment_increment
- auto_increment_offset
- character_set_client
- character_set_connection
- character_set_database
- character_set_server
- collation_connection
- collation_database
- collation_server
- foreign_key_checks
- identity
- last_insert_id
- lc_time_names
- pseudo_thread_id
- sql_auto_is_null
- time_zone
- timestamp
- unique_checks

For information about determining system variable scope, see Section 7.1.9, "Using System Variables".

For information about how replication treats sql_mode, see Section 19.5.1.39, "Replication and Variables".

In releases prior to MySQL 8.0, when mixed binary logging format was in use, if a statement was logged by row and the session that executed the statement had any temporary tables, all subsequent statements were treated as unsafe and logged in row-based format until all temporary tables in use by that session were dropped. In MySQL 8.4, operations on temporary tables are not logged in mixed binary logging format, and the presence of temporary tables in the session has no impact on the logging mode used for each statement.

\section*{Note}

A warning is generated if you try to execute a statement using statement-based logging that should be written using row-based logging. The warning is shown both in the client (in the output of SHOW WARNINGS) and through the mysqld error log. A warning is added to the SHOW WARNINGS table each time such a statement is executed. However, only the first statement that generated the warning for each client session is written to the error log to prevent flooding the log.

In addition to the decisions above, individual engines can also determine the logging format used when information in a table is updated. The logging capabilities of an individual engine can be defined as follows:
- If an engine supports row-based logging, the engine is said to be row-logging capable.
- If an engine supports statement-based logging, the engine is said to be statement-logging capable.

A given storage engine can support either or both logging formats. The following table lists the formats supported by each engine.

\begin{tabular}{|l|l|l|}
\hline Storage Engine & Row Logging Supported & Statement Logging Supported \\
\hline ARCHIVE & Yes & Yes \\
\hline BLACKHOLE & Yes & Yes \\
\hline CSV & Yes & Yes \\
\hline EXAMPLE & Yes & No \\
\hline FEDERATED & Yes & Yes \\
\hline HEAP & Yes & Yes \\
\hline InnoDB & Yes & Yes when the transaction isolation level is REPEATABLE READ or SERIALIZABLE; No otherwise. \\
\hline MyISAM & Yes & Yes \\
\hline MERGE & Yes & Yes \\
\hline NDB & Yes & No \\
\hline
\end{tabular}

Whether a statement is to be logged and the logging mode to be used is determined according to the type of statement (safe, unsafe, or binary injected), the binary logging format (STATEMENT, ROW, or MIXED), and the logging capabilities of the storage engine (statement capable, row capable, both, or neither). (Binary injection refers to logging a change that must be logged using ROW format.)

Statements may be logged with or without a warning; failed statements are not logged, but generate errors in the log. This is shown in the following decision table. Type, binlog_format, SLC, and RLC columns outline the conditions, and Error / Warning and Logged as columns represent the
corresponding actions. SLC stands for "statement-logging capable", and RLC stands for "row-logging capable".

\begin{tabular}{|l|l|l|l|l|l|}
\hline Type & \multicolumn{2}{|c|}{binlog_formatSLC} & RLC & Error I Warning & Logged as \\
\hline * & * & No & No & Error: Cannot execute statement: Binary logging is impossible since at least one engine is involved that is both rowincapable and statementincapable. & - \\
\hline Safe & STATEMENT & Yes & No & - & STATEMENT \\
\hline Safe & MIXED & Yes & No & - & STATEMENT \\
\hline Safe & ROW & Yes & No & Error: Cannot execute statement: Binary logging is impossible since BINLOG_FORMAT = ROW and at least one table uses a storage engine that is not capable of row-based logging. & - \\
\hline Unsafe & STATEMENT & Yes & No & Warning: Unsafe statement binlogged in statement format, since BINLOG_FORMAT = STATEMENT & STATEMENT \\
\hline Unsafe & MIXED & Yes & No & Error: Cannot execute statement: Binary logging of an unsafe statement is impossible when the storage engine is limited to statement- & - \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Type & binlog_forma & SLC & RLC & Error I Warning & Logged as \\
\hline & & & & based logging, even if BINLOG_FORMAT = MIXED. & \\
\hline Unsafe & ROW & Yes & No & Error: Cannot execute statement: Binary logging is impossible since BINLOG_FORMAT = ROW and at least one table uses a storage engine that is not capable of row-based logging. & - \\
\hline Row Injection & STATEMENT & Yes & No & Error: Cannot execute row injection: Binary logging is not possible since at least one table uses a storage engine that is not capable of row-based logging. & - \\
\hline Row Injection & MIXED & Yes & No & Error: Cannot execute row injection: Binary logging is not possible since at least one table uses a storage engine that is not capable of row-based logging. & - \\
\hline Row Injection & ROW & Yes & No & Error: Cannot execute row injection: Binary logging is not possible since at least one table uses a storage & - \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Type & \multicolumn{2}{|c|}{binlog_formatSLC} & RLC & Error I Warning & Logged as \\
\hline & & & & engine that is not capable of row-based logging. & \\
\hline Safe & STATEMENT & No & Yes & Error: Cannot execute statement: Binary logging is impossible since BINLOG_FORMAT = STATEMENT and at least one table uses a storage engine that is not capable of statementbased logging. & - \\
\hline Safe & MIXED & No & Yes & - & ROW \\
\hline Safe & ROW & No & Yes & - & ROW \\
\hline Unsafe & STATEMENT & No & Yes & Error: Cannot execute statement: Binary logging is impossible since BINLOG_FORMAT = STATEMENT and at least one table uses a storage engine that is not capable of statementbased logging. & - \\
\hline Unsafe & MIXED & No & Yes & - & ROW \\
\hline Unsafe & ROW & No & Yes & - & ROW \\
\hline Row Injection & STATEMENT & No & Yes & Error: Cannot execute row injection: Binary logging is not possible since BINLOG_FORMAT = STATEMENT. & - \\
\hline Row Injection & MIXED & No & Yes & - & ROW \\
\hline Row Injection & ROW & No & Yes & - & ROW \\
\hline
\end{tabular}

\begin{tabular}{|l|l|l|l|l|l|}
\hline Type & binlog_forma & SLC & RLC & Error I Warning & Logged as \\
\hline Safe & STATEMENT & Yes & Yes & - & STATEMENT \\
\hline Safe & MIXED & Yes & Yes & - & STATEMENT \\
\hline Safe & ROW & Yes & Yes & - & ROW \\
\hline Unsafe & STATEMENT & Yes & Yes & Warning: Unsafe statement binlogged in statement format since BINLOG_FORMAT = STATEMENT. & STATEMENT \\
\hline Unsafe & MIXED & Yes & Yes & - & ROW \\
\hline Unsafe & ROW & Yes & Yes & - & ROW \\
\hline Row Injection & STATEMENT & Yes & Yes & Error: Cannot execute row injection: Binary logging is not possible because BINLOG_FORMAT = STATEMENT. & - \\
\hline Row Injection & MIXED & Yes & Yes & - & ROW \\
\hline Row Injection & ROW & Yes & Yes & - & ROW \\
\hline
\end{tabular}

When a warning is produced by the determination, a standard MySQL warning is produced (and is available using SHOW WARNINGS). The information is also written to the mysqld error log. Only one error for each error instance per client connection is logged to prevent flooding the log. The log message includes the SQL statement that was attempted.

If a replica has log_error_verbosity set to display warnings, the replica prints messages to the error log to provide information about its status, such as the binary log and relay log coordinates where it starts its job, when it is switching to another relay log, when it reconnects after a disconnect, statements that are unsafe for statement-based logging, and so forth.

\subsection*{7.4.4.4 Logging Format for Changes to mysql Database Tables}

The contents of the grant tables in the mysql database can be modified directly (for example, with INSERT or DELETE) or indirectly (for example, with GRANT or CREATE USER). Statements that affect mysql database tables are written to the binary log using the following rules:
- Data manipulation statements that change data in mysql database tables directly are logged according to the setting of the binlog_format system variable. This pertains to statements such as INSERT, UPDATE, DELETE, REPLACE, DO, LOAD DATA, SELECT, and TRUNCATE TABLE.
- Statements that change the mysql database indirectly are logged as statements regardless of the value of binlog_format. This pertains to statements such as GRANT, REVOKE, SET PASSWORD, RENAME USER, CREATE (all forms except CREATE TABLE ... SELECT), ALTER (all forms), and DROP (all forms).

CREATE TABLE ... SELECT is a combination of data definition and data manipulation. The CREATE TABLE part is logged using statement format and the SELECT part is logged according to the value of binlog_format.

\subsection*{7.4.4.5 Binary Log Transaction Compression}

MySQL supports binary log transaction compression; when this is enabled, transaction payloads are compressed using the zstd algorithm, and then written to the server's binary log file as a single event (a Transaction_payload_event).

Compressed transaction payloads remain in a compressed state while they are sent in the replication stream to replicas, other Group Replication group members, or clients such as mysqlbinlog. They are not decompressed by receiver threads, and are written to the relay log still in their compressed state. Binary log transaction compression therefore saves storage space both on the originator of the transaction and on the recipient (and for their backups), and saves network bandwidth when the transactions are sent between server instances.

Compressed transaction payloads are decompressed when the individual events contained in them need to be inspected. For example, the Transaction_payload_event is decompressed by an applier thread in order to apply the events it contains on the recipient. Decompression is also carried out during recovery, by mysqlbinlog when replaying transactions, and by the SHOW BINLOG EVENTS and SHOW RELAYLOG EVENTS statements.

You can enable binary log transaction compression on a MySQL server instance using the binlog_transaction_compression system variable, which defaults to OFF. You can also use the binlog_transaction_compression_level_zstd system variable to set the level for the zstd algorithm that is used for compression. This value determines the compression effort, from 1 (the lowest effort) to 22 (the highest effort). As the compression level increases, the compression ratio increases, which reduces the storage space and network bandwidth required for the transaction payload. However, the effort required for data compression also increases, taking time and CPU and memory resources on the originating server. Increases in the compression effort do not have a linear relationship to increases in the compression ratio.

Setting binlog_transaction_compression or binlog_transaction_compression_level_zstd (or both) has no immediate effect but rather applies to all subsequent START REPLICA statements.

> Note
> You can enable binary logging of compressed transactions for tables using the NDB storage engine at run time using the ndb_log_transaction_compression system variable, and control the level of compression using ndb_log_transaction_compression_level_zstd. Starting mysqld with --binlog-transactioncompression on the command line or in a my.cnf file causes ndb_log_transaction_compression to be enabled automatically and any setting for the --ndb-log-transaction-compression option to be ignored; to disable binary log transaction compression for the NDB storage engine only, set ndb_log_transaction_compression=0FF in a client session after starting mysqld.

The following types of event are excluded from binary log transaction compression, so are always written uncompressed to the binary log:
- Events relating to the GTID for the transaction (including anonymous GTID events).
- Other types of control event, such as view change events and heartbeat events.
- Incident events and the whole of any transactions that contain them.
- Non-transactional events and the whole of any transactions that contain them. A transaction involving a mix of non-transactional and transactional storage engines does not have its payload compressed.
- Events that are logged using statement-based binary logging. Binary log transaction compression is only applied for the row-based binary logging format.

Binary log encryption can be used on binary log files that contain compressed transactions.

