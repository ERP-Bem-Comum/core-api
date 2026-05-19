\section*{Server-Side Startup Configuration for Encrypted Connections}

To require that clients connect using encrypted connections, enable the require_secure_transport system variable. See Configuring Encrypted Connections as Mandatory.

These system variables on the server side specify the certificate and key files the server uses when permitting clients to establish encrypted connections:
- ssl_ca: The path name of the Certificate Authority (CA) certificate file. (ssl_capath is similar but specifies the path name of a directory of CA certificate files.)
- ssl_cert: The path name of the server public key certificate file. This certificate can be sent to the client and authenticated against the CA certificate that it has.
- ssl_key: The path name of the server private key file.

For example, to enable the server for encrypted connections, start it with these lines in the my.cnf file, changing the file names as necessary:
```
[mysqld]
ssl_ca=ca.pem
ssl_cert=server-cert.pem
ssl_key=server-key.pem
```


To specify in addition that clients are required to use encrypted connections, enable the require_secure_transport system variable:
```
[mysqld]
ssl_ca=ca.pem
ssl_cert=server-cert.pem
ssl_key=server-key.pem
require_secure_transport=ON
```


Each certificate and key system variable names a file in PEM format. Should you need to create the required certificate and key files, see Section 8.3.3, "Creating SSL and RSA Certificates and Keys". MySQL servers compiled using OpenSSL can generate missing certificate and key files automatically at startup. See Section 8.3.3.1, "Creating SSL and RSA Certificates and Keys using MySQL". Alternatively, if you have a MySQL source distribution, you can test your setup using the demonstration certificate and key files in its mysql-test/std_data directory.

The server performs certificate and key file autodiscovery. If no explicit encrypted-connection options are given to configure encrypted connections, the server attempts to enable encrypted-connection support automatically at startup:
- If the server discovers valid certificate and key files named ca.pem, server-cert.pem, and server-key.pem in the data directory, it enables support for encrypted connections by clients. (The files need not have been generated automatically; what matters is that they have those names and are valid.)
- If the server does not find valid certificate and key files in the data directory, it continues executing but without support for encrypted connections.

If the server automatically enables encrypted connection support, it writes a note to the error log. If the server discovers that the CA certificate is self-signed, it writes a warning to the error log. (The certificate is self-signed if created automatically by the server.)

MySQL also provides these system variables for server-side encrypted-connection control:
- ssl_cipher: The list of permissible ciphers for connection encryption.
- ssl_crl: The path name of the file containing certificate revocation lists. (ssl_crlpath is similar but specifies the path name of a directory of certificate revocation-list files.)
- tls_version, tls_ciphersuites: Which encryption protocols and ciphersuites the server permits for encrypted connections; see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers". For example, you can configure tls_version to prevent clients from using less-secure protocols.

If the server cannot create a valid TLS context from the system variables for server-side encryptedconnection control, the server executes without support for encrypted connections.

\section*{Server-Side Runtime Configuration and Monitoring for Encrypted Connections}

The tls_xxx and ssl_xxx system variables are dynamic and can be set at runtime, not just at startup. If changed with SET GLOBAL, the new values apply only until server restart. If changed with SET PERSIST, the new values also carry over to subsequent server restarts. See Section 15.7.6.1, "SET Syntax for Variable Assignment". However, runtime changes to these variables do not immediately affect the TLS context for new connections, as explained later in this section.

Along with the change that enables runtime changes to the TLS context-related system variables, the server enables runtime updates to the actual TLS context used for new connections. This capability may be useful, for example, to avoid restarting a MySQL server that has been running so long that its SSL certificate has expired.

To create the initial TLS context, the server uses the values that the context-related system variables have at startup. To expose the context values, the server also initializes a set of corresponding status variables. The following table shows the system variables that define the TLS context and the corresponding status variables that expose the currently active context values.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.12 System and Status Variables for Server Main Connection Interface TLS Context}
\begin{tabular}{|l|l|}
\hline System Variable Name & Corresponding Status Variable Name \\
\hline ssl_ca & Current_tls_ca \\
\hline ssl_capath & Current_tls_capath \\
\hline ssl_cert & Current_tls_cert \\
\hline ssl_cipher & Current_tls_cipher \\
\hline ssl_crl & Current_tls_crl \\
\hline ssl_crlpath & Current_tls_crlpath \\
\hline ssl_key & Current_tls_key \\
\hline tls_ciphersuites & Current_tls_ciphersuites \\
\hline tls_version & Current_tls_version \\
\hline
\end{tabular}
\end{table}

Those active TLS context values are also exposed as properties in the Performance Schema tls_channel_status table, along with the properties for any other active TLS contexts.

To reconfigure the TLS context at runtime, use this procedure:
1. Set each TLS context-related system variable that should be changed to its new value.
2. Execute ALTER INSTANCE RELOAD TLS. This statement reconfigures the active TLS context from the current values of the TLS context-related system variables. It also sets the contextrelated status variables to reflect the new active context values. The statement requires the CONNECTION_ADMIN privilege.
3. New connections established after execution of ALTER INSTANCE RELOAD TLS use the new TLS context. Existing connections remain unaffected. If existing connections should be terminated, use the KILL statement.

The members of each pair of system and status variables may have different values temporarily due to the way the reconfiguration procedure works:
- Changes to the system variables prior to ALTER INSTANCE RELOAD TLS do not change the TLS context. At this point, those changes have no effect on new connections, and corresponding context-related system and status variables may have different values. This enables you to make any changes required to individual system variables, then update the active TLS context atomically with ALTER INSTANCE RELOAD TLS after all system variable changes have been made.
- After ALTER INSTANCE RELOAD TLS, corresponding system and status variables have the same values. This remains true until the next change to the system variables.

In some cases, ALTER INSTANCE RELOAD TLS by itself may suffice to reconfigure the TLS context, without changing any system variables. Suppose that the certificate in the file named by ssl_cert has expired. It is sufficient to replace the existing file contents with a nonexpired certificate and execute ALTER INSTANCE RELOAD TLS to cause the new file contents to be read and used for new connections.

The server implements independent connection-encryption configuration for the administrative connection interface. See Administrative Interface Support for Encrypted Connections. In addition, ALTER INSTANCE RELOAD TLS is extended with a FOR CHANNEL clause that enables specifying the channel (interface) for which to reload the TLS context. See Section 15.1.5, "ALTER INSTANCE Statement". There are no status variables to expose the administrative interface TLS context, but the

Performance Schema tls_channel_status table exposes TLS properties for both the main and administrative interfaces. See Section 29.12.22.9, "The tls_channel_status Table".

Updating the main interface TLS context has these effects:
- The update changes the TLS context used for new connections on the main connection interface.
- The update also changes the TLS context used for new connections on the administrative interface unless some nondefault TLS parameter value is configured for that interface.
- The update does not affect the TLS context used by other enabled server plugins or components such as Group Replication or X Plugin:
- To apply the main interface reconfiguration to Group Replication's group communication connections, which take their settings from the server's TLS context-related system variables, you must execute STOP GROUP_REPLICATION followed by START GROUP_REPLICATION to stop and restart Group Replication.
- X Plugin initializes its TLS context at plugin initialization as described at Section 22.5.3, "Using Encrypted Connections with X Plugin". This context does not change thereafter.

By default, the RELOAD TLS action rolls back with an error and has no effect if the configuration values do not permit creation of the new TLS context. The previous context values continue to be used for new connections. If the optional NO ROLLBACK ON ERROR clause is given and the new context cannot be created, rollback does not occur. Instead, a warning is generated and encryption is disabled for new connections on the interface to which the statement applies.

Options that enable or disable encrypted connections on a connection interface have an effect only at startup. For example, the--tls-version and--admin-tls-version options affect only at startup whether the main and administrative interfaces support those TLS versions. Such options are ignored and have no effect on the operation of ALTER INSTANCE RELOAD TLS at runtime. For example, you can set tls_version= ' ' to start the server with encrypted connections disabled on the main interface, then reconfigure TLS and execute ALTER INSTANCE RELOAD TLS to enable encrypted connections at runtime.

\section*{Client-Side Configuration for Encrypted Connections}

For a complete list of client options related to establishment of encrypted connections, see Command Options for Encrypted Connections.

By default, MySQL client programs attempt to establish an encrypted connection if the server supports encrypted connections, with further control available through the--ssl-mode option:
- In the absence of an--ssl-mode option, clients attempt to connect using encryption, falling back to an unencrypted connection if an encrypted connection cannot be established. This is also the behavior with an explicit--ssl-mode=PREFERRED option.
- With--ssl-mode=REQUIRED, clients require an encrypted connection and fail if one cannot be established.
- With--ssl-mode=DISABLED, clients use an unencrypted connection.
- With --ssl-mode=VERIFY_CA or --ssl-mode=VERIFY_IDENTITY, clients require an encrypted connection, and also perform verification against the server CA certificate and (with VERIFY_IDENTITY) against the server host name in its certificate.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1271.jpg?height=101&width=104&top_left_y=2437&top_left_x=365)

\section*{Important}

The default setting,--ssl-mode=PREFERRED, produces an encrypted connection if the other default settings are unchanged. However, to help prevent sophisticated man-in-the-middle attacks, it is important for the client to verify the server's identity. The settings--ssl-mode=VERIFY_CA and --ssl-

|
mode=VERIFY_IDENTITY are a better choice than the default setting to help prevent this type of attack. VERIFY_CA makes the client check that the server's certificate is valid. VERIFY_IDENTITY makes the client check that the server's certificate is valid, and also makes the client check that the host name the client is using matches the identity in the server's certificate. To implement one of these settings, you must first ensure that the CA certificate for the server is reliably available to all the clients that use it in your environment, otherwise availability issues will result. For this reason, they are not the default setting.

Attempts to establish an unencrypted connection fail if the require_secure_transport system variable is enabled on the server side to cause the server to require encrypted connections. See Configuring Encrypted Connections as Mandatory.

The following options on the client side identify the certificate and key files clients use when establishing encrypted connections to the server. They are similar to the ssl_ca, ssl_cert, and ssl_key system variables used on the server side, but --ssl-cert and --ssl-key identify the client public and private key:
- --ssl-ca: The path name of the Certificate Authority (CA) certificate file. This option, if used, must specify the same certificate used by the server. (--ssl-capath is similar but specifies the path name of a directory of CA certificate files.)
- --ssl-cert: The path name of the client public key certificate file.
- --ssl-key: The path name of the client private key file.

For additional security relative to that provided by the default encryption, clients can supply a CA certificate matching the one used by the server and enable host name identity verification. In this way, the server and client place their trust in the same CA certificate and the client verifies that the host to which it connected is the one intended:
- To specify the CA certificate, use --ssl-ca (or --ssl-capath), and specify--sslmode=VERIFY_CA.
- To enable host name identity verification as well, use --ssl-mode=VERIFY_IDENTITY rather than --ssl-mode=VERIFY_CA.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1272.jpg?height=129&width=101&top_left_y=1692&top_left_x=306)

\section*{Note}

Host name identity verification with VERIFY_IDENTITY does not work with self-signed certificates that are created automatically by the server (see Section 8.3.3.1, "Creating SSL and RSA Certificates and Keys using MySQL"). Such self-signed certificates do not contain the server name as the Common Name value.

MySQL also provides these options for client-side encrypted-connection control:
- --ssl-cipher: The list of permissible ciphers for connection encryption.
- --ssl-crl: The path name of the file containing certificate revocation lists. (--ssl-crlpath is similar but specifies the path name of a directory of certificate revocation-list files.)
- --tls-version, --tls-ciphersuites: The permitted encryption protocols and ciphersuites; see Section 8.3.2, "Encrypted Connection TLS Protocols and Ciphers".

Depending on the encryption requirements of the MySQL account used by a client, the client may be required to specify certain options to connect using encryption to the MySQL server.

Suppose that you want to connect using an account that has no special encryption requirements or that was created using a CREATE USER statement that included the REQUIRE SSL clause. Assuming that the server supports encrypted connections, a client can connect using encryption with no--ssl-mode option or with an explicit--ssl-mode=PREFERRED option:
```
mysql
```


Or:
```
mysql --ssl-mode=PREFERRED
```


For an account created with a REQUIRE SSL clause, the connection attempt fails if an encrypted connection cannot be established. For an account with no special encryption requirements, the attempt falls back to an unencrypted connection if an encrypted connection cannot be established. To prevent fallback and fail if an encrypted connection cannot be obtained, connect like this:
```
mysql --ssl-mode=REQUIRED
```


If the account has more stringent security requirements, other options must be specified to establish an encrypted connection:
- For accounts created with a REQUIRE X509 clause, clients must specify at least --ssl-cert and--ssl-key. In addition,--ssl-ca (or--ssl-capath) is recommended so that the public certificate provided by the server can be verified. For example (enter the command on a single line):
```
mysql --ssl-ca=ca.pem
    --ssl-cert=client-cert.pem
    --ssl-key=client-key.pem
```

- For accounts created with a REQUIRE ISSUER or REQUIRE SUBJECT clause, the encryption requirements are the same as for REQUIRE X509, but the certificate must match the issue or subject, respectively, specified in the account definition.

For additional information about the REQUIRE clause, see Section 15.7.1.3, "CREATE USER Statement".

MySQL servers can generate client certificate and key files that clients can use to connect to MySQL server instances. See Section 8.3.3, "Creating SSL and RSA Certificates and Keys".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1273.jpg?height=108&width=111&top_left_y=1530&top_left_x=360)

\section*{Important}

If a client connecting to a MySQL server instance uses an SSL certificate with the extendedKeyUsage extension (an X. 509 v 3 extension), the extended key usage must include client authentication (clientAuth). If the SSL certificate is only specified for server authentication (serverAuth) and other non-client certificate purposes, certificate verification fails and the client connection to the MySQL server instance fails. There is no extendedKeyUsage extension in SSL certificates generated by MySQL Server (as described in Section 8.3.3.1, "Creating SSL and RSA Certificates and Keys using MySQL"), and SSL certificates created using the openssl command following the instructions in Section 8.3.3.2, "Creating SSL Certificates and Keys Using openssl". If you use your own client certificate created in another way, ensure any extendedKeyUsage extension includes client authentication.

To prevent use of encryption and override other --ssl- $x x x$ options, invoke the client program with --ssl-mode=DISABLED:
```
mysql --ssl-mode=DISABLED
```


To determine whether the current connection with the server uses encryption, check the session value of the Ssl_cipher status variable. If the value is empty, the connection is not encrypted. Otherwise, the connection is encrypted and the value indicates the encryption cipher. For example:
```
mysql> SHOW SESSION STATUS LIKE 'Ssl_cipher';
+----------------+---------------------------
| Variable_name | Value |
+----------------+----------------------------
| Ssl_cipher | DHE-RSA-AES128-GCM-SHA256 |
+----------------+---------------------------
```


For the mysql client, an alternative is to use the STATUS or \s command and check the SSL line:
```
mysql> \s
...
SSL: Not in use
...
```


Or:
```
mysql> \s
...
SSL: Cipher in use is DHE-RSA-AES128-GCM-SHA256
...
```


\section*{Configuring Certificate Validation Enforcement}

The --tls-certificates-enforced-validation option enables validation of the server public key certificate file, Certificate Authority (CA) certificate files, and certificate revocation-list files at server startup:
```
mysqld --tls-certificates-enforced-validation
```


If set to 0 N , the server stops execution of the startup in case of invalid certificates. The server informs DBAs by providing valid debug messages, error messages, or both depending on the status of the certificates. This capability may be useful, for example, to avoid restarting a MySQL server that has been running so long that its SSL certificate has expired.

Similarly, when you execute the ALTER INSTANCE RELOAD TLS statement to change the TLS context at runtime, the new server and CA certificate files are not used if validation fails. The server continues to use the old certificates in this case. For more information about changing the TLS context dynamically, see Server-Side Runtime Configuration and Monitoring for Encrypted Connections.

\section*{Validating CA Certificates}

For a connection using the server main interface:
- If --ssl_ca is specified, then the server validates the respective CA certificate and gives the DBA an appropriate warning message.
- If --ssl_capath is specified, then the server validates all the CA certificates in the respective folder and gives the DBA an appropriate warning message.
- If SSL parameters are not specified, by default the server validates the CA certificate present in the data directory and gives the DBA an appropriate warning message.

For a connection using the server administrative interface:
- If --admin_ssl_ca is specified, then the server validates the respective CA certificate and gives the DBA an appropriate warning message.
- If - - admin_ssl_capath is specified, then the server validates all of the CA certificates in the respective folder and gives the DBA an appropriate warning message.
- If administrative SSL parameters are not specified, by default the server validates the CA certificate present in the data directory and gives the DBA an appropriate warning message.

\section*{Validating the Server Certificate}

For a connection using the server main interface:
- If --ssl_cert is not specified, then the server validates the server certificate in default data directory.
- If --ssl_cert is given, then the server validates the server certificate, taking into consideration -ssl_crl, if specified.
- If a DBA sets the command-line option to validate certificates, then the server stops in case of invalid certificates and an appropriate error message is displayed to the DBA. Otherwise, the server emits warning messages to the DBA and the server starts.

For a connection using the server administrative interface:
- If - -admin_ssl_cert is not specified, then the server validates the server certificate in default data directory.
- If - - admin_ssl_cert is given, then the server validates the server certificate, taking into consideration --admin_ssl_crl, if specified.
- If a DBA sets the command-line option to validate certificates, then the server stops in case of invalid certificates and an appropriate error message is displayed to the DBA. Otherwise, the server emits warning messages to the DBA and the server starts.

\section*{Configuring Encrypted Connections as Mandatory}

For some MySQL deployments it may be not only desirable but mandatory to use encrypted connections (for example, to satisfy regulatory requirements). This section discusses configuration settings that enable you to do this. These levels of control are available:
- You can configure the server to require that clients connect using encrypted connections.
- You can invoke individual client programs to require an encrypted connection, even if the server permits but does not require encryption.
- You can configure individual MySQL accounts to be usable only over encrypted connections.

To require that clients connect using encrypted connections, enable the require_secure_transport system variable. For example, put these lines in the server my.cnf file:
[mysqld]
require_secure_transport=ON
Alternatively, to set and persist the value at runtime, use this statement:
SET PERSIST require_secure_transport=ON;
SET PERSIST sets a value for the running MySQL instance. It also saves the value, causing it to be used for subsequent server restarts. See Section 15.7.6.1, "SET Syntax for Variable Assignment".

With require_secure_transport enabled, client connections to the server are required to use some form of secure transport, and the server permits only TCP/IP connections that use SSL, or connections that use a socket file (on Unix) or shared memory (on Windows). The server rejects nonsecure connection attempts, which fail with an ER_SECURE_TRANSPORT_REQUIRED error.

To invoke a client program such that it requires an encrypted connection whether or not the server requires encryption, use an--ssl-mode option value of REQUIRED, VERIFY_CA, or VERIFY_IDENTITY. For example:
mysql --ssl-mode=REQUIRED
mysqldump --ssl-mode=VERIFY_CA
mysqladmin --ssl-mode=VERIFY_IDENTITY
To configure a MySQL account to be usable only over encrypted connections, include a REQUIRE clause in the CREATE USER statement that creates the account, specifying in that clause the encryption characteristics you require. For example, to require an encrypted connection and the use of a valid X. 509 certificate, use REQUIRE X509:

CREATE USER 'jeffrey'@'localhost' REQUIRE X509;
For additional information about the REQUIRE clause, see Section 15.7.1.3, "CREATE USER Statement".

To modify existing accounts that have no encryption requirements, use the ALTER USER statement.

\subsection*{8.3.2 Encrypted Connection TLS Protocols and Ciphers}

MySQL supports multiple TLS protocols and ciphers, and enables configuring which protocols and ciphers to permit for encrypted connections. It is also possible to determine which protocol and cipher the current session uses.
- Supported TLS Protocols
- Removal of Support for the TLSv1 and TLSv1.1 Protocols
- Connection TLS Protocol Configuration
- Connection Cipher Configuration
- Connection TLS Protocol Negotiation
- Monitoring Current Client Session TLS Protocol and Cipher

\section*{Supported TLS Protocols}

MySQL 8.4 supports the TLSv1.2 and TLSv1.3 protocols for connections. To use TLSv1.3, both the MySQL server and the client application must be compiled using OpenSSL 1.1.1 or higher. The Group Replication component supports TLSv1.3 from MySQL 8.0.18 (for details, see Section 20.6.2, "Securing Group Communication Connections with Secure Socket Layer (SSL)").

MySQL 8.4 does not support the old TLSv1 and TLSv1.1 protocols.
Permitted TLS protocols can be configured on both the server side and client side to include only a subset of the supported TLS protocols. The configuration on both sides must include at least one protocol in common or connection attempts cannot negotiate a protocol to use. For details, see Connection TLS Protocol Negotiation.

The host system may permit only certain TLS protocols, which means that MySQL connections cannot use protocols not allowed by the host even if MySQL itself permits them. Possible workarounds for this issue include the following:
- Change the system-wide host configuration to permit additional TLS protocols. Consult your operating system documentation for instructions. For example, your system may have an /etc/ ssl/openssl.cnf file that contains these lines to restrict TLS protocols to TLSv1.3 or higher:
[system_default_sect]
MinProtocol = TLSv1.3
Changing the value to a lower protocol version or None makes the system more permissive. This workaround has the disadvantage that permitting lower (less secure) protocols may have adverse security consequences.
- If you cannot or prefer not to change the host system TLS configuration, change MySQL applications to use higher (more secure) TLS protocols that are permitted by the host system. This may not be possible for older versions of MySQL that support only lower protocol versions. For example, TLSv1 is the only supported protocol prior to MySQL 5.6.46, so attempts to connect to a pre-5.6.46 server fail even if the client is from a newer MySQL version that supports higher protocol versions. In such cases, an upgrade to a version of MySQL that supports additional TLS versions may be required.

System-wide host configuration
- If the MySQL configuration permits TLSv1.2, and your host system configuration permits only connections that use TLSv1.2 or higher, you can establish MySQL connections using TLSv1.2 only.
- Suppose the MySQL configuration permits TLSv1.2, but your host system configuration permits only connections that use

TLSv1.3 or higher. If this is the case, you cannot establish MySQL connections at all, because no protocol permitted by MySQL is permitted by the host system.

\section*{Removal of Support for the TLSv1 and TLSv1.1 Protocols}

Support for the TLSv1 and TLSv1.1 connection protocols was deprecated and removed in MySQL 8.0. For background information, refer to RFC 8996 (Deprecating TLS 1.0 and TLS 1.1). In MySQL 8.4, connections can be made using only the more secure TLSv1.2 and TLSv1.3 protocols. TLSv1.3 requires that both the MySQL server and the client application are compiled with OpenSSL 1.1.1.

For more information, see Does MySQL 8.4 support TLS 1.0 and 1.1?

\section*{Connection TLS Protocol Configuration}

On the server side, the value of the tls_version system variable determines which TLS protocols a MySQL server permits for encrypted connections. The tls_version value applies to connections from clients, regular source/replica replication connections where this server instance is the source, Group Replication group communication connections, and Group Replication distributed recovery connections where this server instance is the donor. The administrative connection interface is configured similarly, but uses the admin_tls_version system variable (see Section 7.1.12.2, "Administrative Connection Management"). This discussion applies to admin_tls_version as well.

The tls_version value is a list of one or more comma-separated TLS protocol versions, which is not case-sensitive. By default, this variable lists all protocols that are supported by the SSL library used to compile MySQL and by the MySQL Server release. The default settings are therefore as shown in MySQL Server TLS Protocol Default Settings.

To determine the value of tls_version at runtime, use this statement:
```
mysql> SHOW GLOBAL VARIABLES LIKE 'tls_version';
+----------------+-----------------------+
| Variable_name | Value |
+----------------+-----------------------+
| tls_version | TLSv1.2,TLSv1.3 |
+----------------+-----------------------+
```


To change the value of tls_version, set it at server startup. For example, to permit connections that use the TLSv1.2 or TLSv1.3 protocol, but prohibit connections that use any other protocol, use these lines in the server my.cnf file:
```
[mysqld]
tls_version=TLSv1.2,TLSv1.3
```


To be even more restrictive and permit only TLSv1.3 connections, set tls_version like this:
```
[mysqld]
tls_version=TLSv1.3
```

tls_version can be changed at runtime. See Server-Side Runtime Configuration and Monitoring for Encrypted Connections.

On the client side, the--tls-version option specifies which TLS protocols a client program permits for connections to the server. The format of the option value is the same as for the tls_version system variable described previously (a list of one or more comma-separated protocol versions).

For source/replica replication connections where this server instance is the replica, the SOURCE_TLS_VERSION option for the CHANGE REPLICATION SOURCE TO statement specifies which TLS protocols the replica permits for connections to the source. The format of the option value is the same as for the tls_version system variable described previously. See Section 19.3.1, "Setting Up Replication to Use Encrypted Connections".

The protocols that can be specified for SOURCE_TLS_VERSION depend on the SSL library. This option is independent of and not affected by the server tls_version value. For example, a server that acts
as a replica can be configured with tls_version set to TLSv1.3 to permit only incoming connections that use TLSv1.3, but also configured with SOURCE_TLS_VERSION set to TLSv1.2 to permit only TLSv1.2 for outgoing replica connections to the source.

For Group Replication distributed recovery connections where this server instance is the joining member that initiates distributed recovery (that is, the client), the group_replication_recovery_tls_version system variable specifies which protocols are permitted by the client. Again, this option is independent of and not affected by the server tls_version value, which applies when this server instance is the donor. A Group Replication server generally participates in distributed recovery both as a donor and as a joining member over the course of its group membership, so both these system variables should be set. See Section 20.6.2, "Securing Group Communication Connections with Secure Socket Layer (SSL)".

TLS protocol configuration affects which protocol a given connection uses, as described in Connection TLS Protocol Negotiation.

Permitted protocols should be chosen such as not to leave "holes" in the list. For example, these server configuration values do not have holes:
tls_version=TLSv1.2,TLSv1.3
tls_version=TLSv1.3
The prohibition on holes also applies in other configuration contexts, such as for clients or replicas.
Unless you intend to disable encrypted connections, the list of permitted protocols should not be empty. If you set a TLS version parameter to the empty string, encrypted connections cannot be established:
- tls_version: The server does not permit encrypted incoming connections.
- --tls-version: The client does not permit encrypted outgoing connections to the server.
- SOURCE_TLS_VERSION: The replica does not permit encrypted outgoing connections to the source.
- group_replication_recovery_tls_version: The joining member does not permit encrypted connections to the distributed recovery connection.

\section*{Connection Cipher Configuration}

A default set of ciphers applies to encrypted connections, which can be overridden by explicitly configuring the permitted ciphers. During connection establishment, both sides of a connection must permit some cipher in common or the connection fails. Of the permitted ciphers common to both sides, the SSL library chooses the one supported by the provided certificate that has the highest priority.

To specify a cipher or ciphers applicable for encrypted connections that use TLSv1.2:
- Set the ssl_cipher system variable on the server side, and use the--ssl-cipher option for client programs.
- For regular source/replica replication connections, where this server instance is the source, set the ssl_cipher system variable. Where this server instance is the replica, use the SOURCE_SSL_CIPHER option for the CHANGE REPLICATION SOURCE TO statement. See Section 19.3.1, "Setting Up Replication to Use Encrypted Connections".
- For a Group Replication group member, for Group Replication group communication connections and also for Group Replication distributed recovery connections where this server instance is the donor, set the ssl_cipher system variable. For Group Replication distributed recovery connections where this server instance is the joining member, use the group_replication_recovery_ssl_cipher system variable. See Section 20.6.2, "Securing Group Communication Connections with Secure Socket Layer (SSL)".

For encrypted connections that use TLSv1.3, OpenSSL 1.1.1 and higher supports the following ciphersuites, all of which are enabled by default for use with server system variables --tlsciphersuites or--admin-tls-ciphersuites:
```
TLS_AES_128_GCM_SHA256
TLS_AES_256_GCM_SHA384
TLS_CHACHA20_POLY1305_SHA256
TLS_AES_128_CCM_SHA256
```


\section*{Note}

In MySQL 8.4, use of TLS_AES_128_CCM_8_SHA256 with server system variables --tls-ciphersuites or --admin-tls-ciphersuites generates a deprecation warning.

To configure the permitted TLSv1.3 ciphersuites explicitly, set the following parameters. In each case, the configuration value is a list of zero or more colon-separated ciphersuite names.
- On the server side, use the tls_ciphersuites system variable. If this variable is not set, its default value is NULL, which means that the server permits the default set of ciphersuites. If the variable is set to the empty string, no ciphersuites are enabled and encrypted connections cannot be established.
- On the client side, use the--tls-ciphersuites option. If this option is not set, the client permits the default set of ciphersuites. If the option is set to the empty string, no ciphersuites are enabled and encrypted connections cannot be established.
- For regular source/replica replication connections, where this server instance is the source, use the tls_ciphersuites system variable. Where this server instance is the replica, use the SOURCE_TLS_CIPHERSUITES option for the CHANGE REPLICATION SOURCE TO statement. See Section 19.3.1, "Setting Up Replication to Use Encrypted Connections".
- For a Group Replication group member, for Group Replication group communication connections and also for Group Replication distributed recovery connections where this server instance is the donor, use the tls_ciphersuites system variable. For Group Replication distributed recovery connections where this server instance is the joining member, use the group_replication_recovery_tls_ciphersuites system variable. See Section 20.6.2, "Securing Group Communication Connections with Secure Socket Layer (SSL)".

Ciphersuite support requires that both the MySQL server and the client application be compiled using OpenSSL 1.1.1 or higher.

A given cipher may work only with particular TLS protocols, which affects the TLS protocol negotiation process. See Connection TLS Protocol Negotiation.

To determine which ciphers a given server supports, check the session value of the Ssl_cipher_list status variable:

SHOW SESSION STATUS LIKE 'Ssl_cipher_list';
The Ssl_cipher_list status variable lists the possible SSL ciphers (empty for non-SSL connections). If MySQL supports TLSv1.3, the value includes the possible TLSv1.3 ciphersuites.

> Note
> ECDSA ciphers only work in combination with an SSL certificate that uses ECDSA for the digital signature, and they do not work with certificates that use RSA. MySQL Server's automatic generation process for SSL certificates does not generate ECDSA signed certificates, it generates only RSA signed certificates. Do not select ECDSA ciphers unless you have an ECDSA certificate available to you.

For encrypted connections that use TLS.v1.3, MySQL uses the SSL library default ciphersuite list.
For encrypted connections that use TLSv1.2, MySQL passes the following default cipher list to the SSL library when used with the server system variables--ssl-cipher and--admin-ssl-cipher.
```
ECDHE-ECDSA-AES128-GCM-SHA256
ECDHE-ECDSA-AES256-GCM-SHA384
ECDHE-RSA-AES128-GCM-SHA256
ECDHE-RSA-AES256-GCM-SHA384
ECDHE-ECDSA-CHACHA20-POLY1305
ECDHE-RSA-CHACHA20-POLY1305
ECDHE-ECDSA-AES256-CCM
ECDHE-ECDSA-AES128-CCM
DHE-RSA-AES128-GCM-SHA256
DHE-RSA-AES256-GCM-SHA384
DHE-RSA-AES256-CCM
DHE-RSA-AES128-CCM
DHE-RSA-CHACHA20-POLY1305
```


\section*{These cipher restrictions are in place:}
- The following ciphers are deprecated and produce a warning when used with the server system variables --ssl-cipher and --admin-ssl-cipher:
```
ECDHE-ECDSA-AES128-SHA256
ECDHE-RSA-AES128-SHA256
ECDHE-ECDSA-AES256-SHA384
ECDHE-RSA-AES256-SHA384
DHE-DSS-AES128-GCM-SHA256
DHE-RSA-AES128-SHA256
DHE -DSS -AES128 -SHA256
DHE-DSS-AES256-GCM-SHA384
DHE-RSA-AES256-SHA256
DHE - DSS -AES256 - SHA256
ECDHE-RSA-AES128-SHA
ECDHE-ECDSA-AES128-SHA
ECDHE-RSA-AES256-SHA
ECDHE-ECDSA-AES256-SHA
DHE-DSS-AES128-SHA
DHE-RSA-AES128-SHA
TLS_DHE_DSS_WITH_AES_256_CBC_SHA
DHE-RSA-AES256-SHA
AES128-GCM-SHA256
DH-DSS-AES128-GCM-SHA256
ECDH-ECDSA-AES128-GCM-SHA256
AES256-GCM-SHA384
DH-DSS-AES256-GCM-SHA384
ECDH-ECDSA-AES256-GCM-SHA384
AES128-SHA256
DH-DSS-AES128 -SHA256
ECDH-ECDSA-AES128-SHA256
AES256-SHA256
DH-DSS-AES256-SHA256
ECDH-ECDSA-AES256-SHA384
AES128-SHA
DH-DSS-AES128-SHA
ECDH-ECDSA-AES128-SHA
AES256-SHA
DH-DSS-AES256-SHA
ECDH-ECDSA-AES256-SHA
DH-RSA-AES128-GCM-SHA256
ECDH-RSA-AES128-GCM-SHA256
DH-RSA-AES256-GCM-SHA384
ECDH-RSA-AES256-GCM-SHA384
DH-RSA-AES128-SHA256
ECDH-RSA-AES128-SHA256
DH-RSA-AES256-SHA256
ECDH-RSA-AES256-SHA384
ECDHE-RSA-AES128-SHA
ECDHE-ECDSA-AES128-SHA
ECDHE-RSA-AES256-SHA
ECDHE-ECDSA-AES256-SHA
DHE-DSS-AES128-SHA
DHE-RSA-AES128-SHA
TLS_DHE_DSS_WITH_AES_256_CBC_SHA
DHE-RSA-AES256-SHA
AES128 - SHA
```

```
DH-DSS-AES128-SHA
ECDH-ECDSA-AES128-SHA
AES256-SHA
DH-DSS-AES256-SHA
ECDH-ECDSA-AES256-SHA
DH-RSA-AES128-SHA
ECDH-RSA-AES128-SHA
DH-RSA-AES256-SHA
ECDH-RSA-AES256-SHA
DES-CBC3-SHA
```

- The following ciphers are permanently restricted:
```
!DHE-DSS-DES-CBC3-SHA
! DHE-RSA-DES-CBC3-SHA
! ECDH-RSA-DES-CBC3-SHA
!ECDH-ECDSA-DES-CBC3-SHA
!ECDHE-RSA-DES-CBC3-SHA
!ECDHE-ECDSA-DES-CBC3-SHA
```

- The following categories of ciphers are permanently restricted:
```
!)NULL
!eNULL
!EXPORT
!LOW
!MD5
!DES
!RC2
!RC4
!PSK
!SSLv3
```


If the server is started with the ssl_cert system variable set to a certificate that uses any of the preceding restricted ciphers or cipher categories, the server starts with support for encrypted connections disabled.

\section*{Connection TLS Protocol Negotiation}

Connection attempts in MySQL negotiate use of the highest TLS protocol version available on both sides for which a protocol-compatible encryption cipher is available on both sides. The negotiation process depends on factors such as the SSL library used to compile the server and client, the TLS protocol and encryption cipher configuration, and which key size is used:
- For a connection attempt to succeed, the server and client TLS protocol configuration must permit some protocol in common.
- Similarly, the server and client encryption cipher configuration must permit some cipher in common. A given cipher may work only with particular TLS protocols, so a protocol available to the negotiation process is not chosen unless there is also a compatible cipher.
- If TLSv1.3 is available, it is used if possible. (This means that server and client configuration both must permit TLSv1.3, and both must also permit some TLSv1.3-compatible encryption cipher.) Otherwise, MySQL continues through the list of available protocols, using TLSv1.2 if possible, and so forth. Negotiation proceeds from more secure protocols to less secure. Negotiation order is independent of the order in which protocols are configured. For example, negotiation order is the same regardless of whether tls_version has a value of TLSv1.2, TLSv1.3 or TLSv1.3, TLSv1.2.
- For better security, use a certificate with an RSA key size of at least 2048 bits.

If the server and client do not have a permitted protocol in common, and a protocol-compatible cipher in common, the server terminates the connection request.

MySQL permits specifying a list of protocols to support. This list is passed directly down to the underlying SSL library and is ultimately up to that library what protocols it actually enables from
the supplied list. Please refer to the MySQL source code and the OpenSSL SSL_CTX_new ( ) documentation for information about how the SSL library handles this.

\section*{Monitoring Current Client Session TLS Protocol and Cipher}

To determine which encryption TLS protocol and cipher the current client session uses, check the session values of the Ssl_version and Ssl_cipher status variables:
```
mysql> SELECT * FROM performance_schema.session_status
    WHERE VARIABLE_NAME IN ('Ssl_version','Ssl_cipher');
+----------------+---------------------------+
| VARIABLE_NAME | VARIABLE_VALUE |
+----------------+---------------------------+
| Ssl_cipher | DHE-RSA-AES128-GCM-SHA256 |
| Ssl_version | TLSv1.2 |
+----------------+---------------------------+
```


If the connection is not encrypted, both variables have an empty value.

\subsection*{8.3.3 Creating SSL and RSA Certificates and Keys}

The following discussion describes how to create the files required for SSL and RSA support in MySQL. File creation can be performed using facilities provided by MySQL itself, or by invoking the openssl command directly.

SSL certificate and key files enable MySQL to support encrypted connections using SSL. See Section 8.3.1, "Configuring MySQL to Use Encrypted Connections".

RSA key files enable MySQL to support secure password exchange over unencrypted connections for accounts authenticated by the sha256_password (deprecated) or caching_sha2_password plugin. See Section 8.4.1.3, "SHA-256 Pluggable Authentication", and Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".

\subsection*{8.3.3.1 Creating SSL and RSA Certificates and Keys using MySQL}

MySQL provides these ways to create the SSL certificate and key files and RSA key-pair files required to support encrypted connections using SSL and secure password exchange using RSA over unencrypted connections, if those files are missing:
- The server can autogenerate these files at startup, for MySQL distributions.

\section*{Important}

Server autogeneration helps lower the barrier to using SSL by making it easier to generate the required files. However, certificates generated by this method are self-signed, which may not be very secure. After you gain experience using these, consider obtaining certificate and key material from a registered certificate authority.

\section*{Important}

If a client connecting to a MySQL server instance uses an SSL certificate with the extendedKeyUsage extension (an X. 509 v 3 extension), the extended key usage must include client authentication (clientAuth). If the SSL certificate is only specified for server authentication (serverAuth) and other non-client certificate purposes, certificate verification fails and the client connection to the MySQL server instance fails. There is no extendedKeyUsage extension in SSL certificates generated by MySQL Server. If you use your own client certificate created in another way, ensure any extendedKeyUsage extension includes client authentication.
- Automatic SSL and RSA File Generation
- SSL and RSA File Characteristics

\section*{Automatic SSL and RSA File Generation}

For MySQL distributions compiled using OpenSSL, the MySQL server has the capability of automatically generating missing SSL and RSA files at startup. The auto_generate_certs, sha256_password_auto_generate_rsa_keys, and caching_sha2_password_auto_generate_rsa_keys system variables control automatic generation of these files. These variables are enabled by default. They can be enabled at startup and inspected but not set at runtime.

At startup, the server automatically generates server-side and client-side SSL certificate and key files in the data directory if the auto_generate_certs system variable is enabled, no SSL options are specified, and the server-side SSL files are missing from the data directory. These files enable encrypted client connections using SSL; see Section 8.3.1, "Configuring MySQL to Use Encrypted Connections".
1. The server checks the data directory for SSL files with the following names:
```
ca.pem
server-cert.pem
server-key.pem
```

2. If any of those files are present, the server creates no SSL files. Otherwise, it creates them, plus some additional files:
```
ca.pem Self-signed CA certificate
ca-key.pem CA private key
server-cert.pem Server certificate
server-key.pem Server private key
client-cert.pem Client certificate
client-key.pem Client private key
```

3. If the server autogenerates SSL files, it uses the names of the ca.pem, server-cert.pem, and server-key.pem files to set the corresponding system variables (ssl_ca, ssl_cert, ssl_key).

At startup, the server automatically generates RSA private/public key-pair files in the data directory if all of these conditions are true: The sha256_password_auto_generate_rsa_keys or caching_sha2_password_auto_generate_rsa_keys system variable is enabled; no RSA options are specified; the RSA files are missing from the data directory. These key-pair files enable secure password exchange using RSA over unencrypted connections for accounts authenticated by the sha256_password (deprecated) or caching_sha2_password plugin; see Section 8.4.1.3, "SHA-256 Pluggable Authentication", and Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".
1. The server checks the data directory for RSA files with the following names:
```
private_key.pem Private member of private/public key pair
public_key.pem Public member of private/public key pair
```

2. If any of these files are present, the server creates no RSA files. Otherwise, it creates them.
3. If the server autogenerates the RSA files, it uses their names to set the corresponding system variables (sha256_password_private_key_path and sha256_password_public_key_path; caching_sha2_password_private_key_path and caching_sha2_password_public_key_path).

\section*{SSL and RSA File Characteristics}

SSL and RSA files created automatically by the server have these characteristics:
- SSL and RSA keys have a size of 2048 bits.
- The SSL CA certificate is self signed.
- The SSL server and client certificates are signed with the CA certificate and key, using the sha256WithRSAEncryption signature algorithm.
- SSL certificates use these Common Name (CN) values, with the appropriate certificate type (CA, Server, Client):
```
ca.pem: MySQL_Server_suffix_Auto_Generated_CA_Certificate
server-cert.pm: MySQL_Server_suffix_Auto_Generated_Server_Certificate
client-cert.pm: MySQL_Server_suffix_Auto_Generated_Client_Certificate
```


The suffix value is based on the MySQL version number.
For files generated by the server, if the resulting CN values exceed 64 characters, the _suffix portion of the name is omitted.
- SSL files have blank values for Country (C), State or Province (ST), Organization (O), Organization Unit Name (OU) and email address.
- SSL files created by the server are valid for ten years from the time of generation.
- RSA files do not expire.
- SSL files have different serial numbers for each certificate/key pair (1 for CA, 2 for Server, 3 for Client).
- Files created automatically by the server are owned by the account that runs the server.
- On Unix and Unix-like systems, the file access mode is 644 for certificate files (that is, world readable) and 600 for key files (that is, accessible only by the account that runs the server).

To see the contents of an SSL certificate (for example, to check the range of dates over which it is valid), invoke openssl directly:
```
openssl x509 -text -in ca.pem
openssl x509 -text -in server-cert.pem
openssl x509 -text -in client-cert.pem
```


It is also possible to check SSL certificate expiration information using this SQL statement:
```
mysql> SHOW STATUS LIKE 'Ssl_server_not%';
+-------------------------+----------------------------
| Variable_name | Value |
+------------------------+---------------------------
| Ssl_server_not_after | Apr 28 14:16:39 2027 GMT |
| Ssl_server_not_before | May 1 14:16:39 2017 GMT |
+------------------------+----------------------------
```


\subsection*{8.3.3.2 Creating SSL Certificates and Keys Using openssl}

This section describes how to use the openssl command to set up SSL certificate and key files for use by MySQL servers and clients. The first example shows a simplified procedure such as you might use from the command line. The second shows a script that contains more detail. The first two examples are intended for use on Unix and both use the openssl command that is part of OpenSSL. The third example describes how to set up SSL files on Windows.

\section*{Note}

An easier alternative to generating the files required for SSL than the procedure described here is to let the server autogenerate them; see Section 8.3.3.1, "Creating SSL and RSA Certificates and Keys using MySQL".

\section*{Important}

Whatever method you use to generate the certificate and key files, the Common Name value used for the server and client certificates/keys must each differ from the Common Name value used for the CA certificate. Otherwise, the certificate and key files do not work for servers compiled using OpenSSL. A typical error in this case is:
```
ERROR 2026 (HY000): SSL connection error:
error:00000001:lib(0):func(0):reason(1)
```


\section*{Important}

If a client connecting to a MySQL server instance uses an SSL certificate with the extendedKeyUsage extension (an X. 509 v 3 extension), the extended key usage must include client authentication (clientAuth). If the SSL certificate is only specified for server authentication (serverAuth) and other non-client certificate purposes, certificate verification fails and the client connection to the MySQL server instance fails. There is no extendedKeyUsage extension in SSL certificates created using the openssl command following the instructions in this topic. If you use your own client certificate created in another way, ensure any extendedKeyUsage extension includes client authentication.
- Example 1: Creating SSL Files from the Command Line on Unix
- Example 2: Creating SSL Files Using a Script on Unix
- Example 3: Creating SSL Files on Windows

\section*{Example 1: Creating SSL Files from the Command Line on Unix}

The following example shows a set of commands to create MySQL server and client certificate and key files. You must respond to several prompts by the openssl commands. To generate test files, you can press Enter to all prompts. To generate files for production use, you should provide nonempty responses.
```
# Create clean environment
rm -rf newcerts
mkdir newcerts && cd newcerts
# Create CA certificate
openssl genrsa 2048 > ca-key.pem
openssl req -new -x509 -nodes -days 3600 \
    -key ca-key.pem -out ca.pem
# Create server certificate, remove passphrase, and sign it
# server-cert.pem = public key, server-key.pem = private key
openssl req -newkey rsa:2048 -days 3600 \
    -nodes -keyout server-key.pem -out server-req.pem
openssl rsa -in server-key.pem -out server-key.pem
openssl x509 -req -in server-req.pem -days 3600 \
    -CA ca.pem -CAkey ca-key.pem -set_serial 01 -out server-cert.pem
# Create client certificate, remove passphrase, and sign it
# client-cert.pem = public key, client-key.pem = private key
openssl req -newkey rsa:2048 -days 3600 \
    -nodes -keyout client-key.pem -out client-req.pem
openssl rsa -in client-key.pem -out client-key.pem
openssl x509 -req -in client-req.pem -days 3600 \
    -CA ca.pem -CAkey ca-key.pem -set_serial 01 -out client-cert.pem
```


After generating the certificates, verify them:
```
openssl verify -CAfile ca.pem server-cert.pem client-cert.pem
```


You should see a response like this:
```
server-cert.pem: OK
client-cert.pem: OK
```


To see the contents of a certificate (for example, to check the range of dates over which a certificate is valid), invoke openssl like this:
```
openssl x509 -text -in ca.pem
openssl x509 -text -in server-cert.pem
```

```
openssl x509 -text -in client-cert.pem
```


Now you have a set of files that can be used as follows:
- ca.pem: Use this to set the ssl_ca system variable on the server side and the --ssl-ca option on the client side. (The CA certificate, if used, must be the same on both sides.)
- server-cert.pem, server-key.pem: Use these to set the ssl_cert and ssl_key system variables on the server side.
- client-cert.pem, client-key.pem: Use these as the arguments to the --ssl-cert and --ssl-key options on the client side.

For additional usage instructions, see Section 8.3.1, "Configuring MySQL to Use Encrypted Connections".

\section*{Example 2: Creating SSL Files Using a Script on Unix}

Here is an example script that shows how to set up SSL certificate and key files for MySQL. After executing the script, use the files for SSL connections as described in Section 8.3.1, "Configuring MySQL to Use Encrypted Connections".
```
DIR=ˋpwdˋ/openssl
PRIV=$DIR/private
mkdir $DIR $PRIV $DIR/newcerts
cp /usr/share/ssl/openssl.cnf $DIR
replace ./demoCA $DIR -- $DIR/openssl.cnf
# Create necessary files: $database, $serial and $new_certs_dir
# directory (optional)
touch $DIR/index.txt
echo "01" > $DIR/serial
#
# Generation of Certificate Authority(CA)
#
openssl req -new -x509 -keyout $PRIV/cakey.pem -out $DIR/ca.pem \
    -days 3600 -config $DIR/openssl.cnf
# Sample output:
# Using configuration from /home/jones/openssl/openssl.cnf
# Generating a 1024 bit RSA private key
# ................++++++
# .........++++++
# writing new private key to '/home/jones/openssl/private/cakey.pem'
# Enter PEM pass phrase:
# Verifying password - Enter PEM pass phrase:
# -----
# You are about to be asked to enter information to be
# incorporated into your certificate request.
# What you are about to enter is what is called a Distinguished Name
# or a DN.
# There are quite a few fields but you can leave some blank
# For some fields there will be a default value,
# If you enter '.', the field will be left blank.
# -----
# Country Name (2 letter code) [AU]:FI
# State or Province Name (full name) [Some-State]:.
# Locality Name (eg, city) []:
# Organization Name (eg, company) [Internet Widgits Pty Ltd]:MySQL AB
# Organizational Unit Name (eg, section) []:
# Common Name (eg, YOUR name) []:MySQL admin
# Email Address []:
#
# Create server request and key
#
```

```
openssl req -new -keyout $DIR/server-key.pem -out \
    $DIR/server-req.pem -days 3600 -config $DIR/openssl.cnf
# Sample output:
# Using configuration from /home/jones/openssl/openssl.cnf
# Generating a 1024 bit RSA private key
# ..++++++
# ..........++++++
# writing new private key to '/home/jones/openssl/server-key.pem'
# Enter PEM pass phrase:
# Verifying password - Enter PEM pass phrase:
# -----
# You are about to be asked to enter information that will be
# incorporated into your certificate request.
# What you are about to enter is what is called a Distinguished Name
# or a DN.
# There are quite a few fields but you can leave some blank
# For some fields there will be a default value,
# If you enter '.', the field will be left blank.
# -----
# Country Name (2 letter code) [AU]:FI
# State or Province Name (full name) [Some-State]:.
# Locality Name (eg, city) []:
# Organization Name (eg, company) [Internet Widgits Pty Ltd]:MySQL AB
# Organizational Unit Name (eg, section) []:
# Common Name (eg, YOUR name) []:MySQL server
# Email Address []:
#
# Please enter the following 'extra' attributes
# to be sent with your certificate request
# A challenge password []:
# An optional company name []:
#
# Remove the passphrase from the key
#
openssl rsa -in $DIR/server-key.pem -out $DIR/server-key.pem
#
# Sign server cert
#
openssl ca -cert $DIR/ca.pem -policy policy_anything \
    -out $DIR/server-cert.pem -config $DIR/openssl.cnf \
    -infiles $DIR/server-req.pem
# Sample output:
# Using configuration from /home/jones/openssl/openssl.cnf
# Enter PEM pass phrase:
# Check that the request matches the signature
# Signature ok
# The Subjects Distinguished Name is as follows
# countryName :PRINTABLE:'FI'
# organizationName :PRINTABLE:'MySQL AB'
# commonName :PRINTABLE:'MySQL admin'
# Certificate is to be certified until Sep 13 14:22:46 2003 GMT
# (365 days)
# Sign the certificate? [y/n]:y
#
#
#1 out of 1 certificate requests certified, commit? [y/n]y
# Write out database with 1 new entries
# Data Base Updated
#
# Create client request and key
#
openssl req -new -keyout $DIR/client-key.pem -out \
    $DIR/client-req.pem -days 3600 -config $DIR/openssl.cnf
# Sample output:
# Using configuration from /home/jones/openssl/openssl.cnf
# Generating a 1024 bit RSA private key
```

```
# .....................................+++++
# .............................................+++++
# writing new private key to '/home/jones/openssl/client-key.pem'
# Enter PEM pass phrase:
# Verifying password - Enter PEM pass phrase:
# -----
# You are about to be asked to enter information that will be
# incorporated into your certificate request.
# What you are about to enter is what is called a Distinguished Name
# or a DN.
# There are quite a few fields but you can leave some blank
# For some fields there will be a default value,
# If you enter '.', the field will be left blank.
# -----
# Country Name (2 letter code) [AU]:FI
# State or Province Name (full name) [Some-State]:.
# Locality Name (eg, city) []:
# Organization Name (eg, company) [Internet Widgits Pty Ltd]:MySQL AB
# Organizational Unit Name (eg, section) []:
# Common Name (eg, YOUR name) []:MySQL user
# Email Address []:
#
# Please enter the following 'extra' attributes
# to be sent with your certificate request
# A challenge password []:
# An optional company name []:
#
# Remove the passphrase from the key
#
openssl rsa -in $DIR/client-key.pem -out $DIR/client-key.pem
#
# Sign client cert
#
openssl ca -cert $DIR/ca.pem -policy policy_anything \
    -out $DIR/client-cert.pem -config $DIR/openssl.cnf \
    -infiles $DIR/client-req.pem
# Sample output:
# Using configuration from /home/jones/openssl/openssl.cnf
# Enter PEM pass phrase:
# Check that the request matches the signature
# Signature ok
# The Subjects Distinguished Name is as follows
# countryName :PRINTABLE:'FI'
# organizationName :PRINTABLE:'MySQL AB'
# commonName :PRINTABLE:'MySQL user'
# Certificate is to be certified until Sep 13 16:45:17 2003 GMT
# (365 days)
# Sign the certificate? [y/n]:y
#
#
#1 out of 1 certificate requests certified, commit? [y/n]y
# Write out database with 1 new entries
# Data Base Updated
#
# Create a my.cnf file that you can use to test the certificates
#
cat <<EOF > $DIR/my.cnf
[client]
ssl-ca=$DIR/ca.pem
ssl-cert=$DIR/client-cert.pem
ssl-key=$DIR/client-key.pem
[mysqld]
ssl_ca=$DIR/ca.pem
ssl_cert=$DIR/server-cert.pem
ssl_key=$DIR/server-key.pem
EOF
```


\section*{Example 3: Creating SSL Files on Windows}

Download OpenSSL for Windows if it is not installed on your system. An overview of available packages can be seen here:
http://www.slproweb.com/products/Win320penSSL.html
Choose the Win32 OpenSSL Light or Win64 OpenSSL Light package, depending on your architecture (32-bit or 64-bit). The default installation location is C: \OpenSSL-Win32 or C: \OpenSSL-Win64, depending on which package you downloaded. The following instructions assume a default location of C : \OpenSSL-Win32. Modify this as necessary if you are using the 64-bit package.

If a message occurs during setup indicating '...critical component is missing: Microsoft Visual C++ 2019 Redistributables', cancel the setup and download one of the following packages as well, again depending on your architecture (32-bit or 64-bit):
- Visual C++ 2008 Redistributables (x86), available at:
http://www.microsoft.com/downloads/details.aspx?familyid=9B2DA534-3E03-4391-8A4D-074B9F2BC1BF
- Visual C++ 2008 Redistributables (x64), available at:
http://www.microsoft.com/downloads/details.aspx?familyid=bd2a6171-e2d6-4230-b809-9a8d7548c1b6
After installing the additional package, restart the OpenSSL setup procedure.
During installation, leave the default C: \OpenSSL-Win32 as the install path, and also leave the default option 'Copy OpenSSL DLL files to the Windows system directory' selected.

When the installation has finished, add C: \OpenSSL-Win32\bin to the Windows System Path variable of your server (depending on your version of Windows, the following path-setting instructions might differ slightly):
1. On the Windows desktop, right-click the My Computer icon, and select Properties.
2. Select the Advanced tab from the System Properties menu that appears, and click the Environment Variables button.
3. Under System Variables, select Path, then click the Edit button. The Edit System Variable dialogue should appear.
4. Add ' ; C:\OpenSSL-Win32\bin' to the end (notice the semicolon).
5. Press OK 3 times.
6. Check that OpenSSL was correctly integrated into the Path variable by opening a new command console (Start>Run>cmd.exe) and verifying that OpenSSL is available:
```
Microsoft Windows [Version ...]
Copyright (c) 2006 Microsoft Corporation. All rights reserved.
C:\Windows\system32>cd \
C:\>openssl
OpenSSL> exit <<< If you see the OpenSSL prompt, installation was successful.
C:\>
```


After OpenSSL has been installed, use instructions similar to those from Example 1 (shown earlier in this section), with the following changes:
- Change the following Unix commands:
```
# Create clean environment
rm -rf newcerts
mkdir newcerts && cd newcerts
```


On Windows, use these commands instead:
```
# Create clean environment
md c:\newcerts
cd c:\newcerts
```

- When a ' \' character is shown at the end of a command line, this ' \' character must be removed and the command lines entered all on a single line.

After generating the certificate and key files, to use them for SSL connections, see Section 8.3.1, "Configuring MySQL to Use Encrypted Connections".

\subsection*{8.3.3.3 Creating RSA Keys Using openssl}

This section describes how to use the openssl command to set up the RSA key files that enable MySQL to support secure password exchange over unencrypted connections for accounts authenticated by the sha256_password (deprecated) and caching_sha2_password plugins.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1290.jpg?height=113&width=99&top_left_y=922&top_left_x=306)

\section*{Note}

An easier alternative to generating the files required for SSL than the procedure described here is to let the server autogenerate them; see Section 8.3.3.1, "Creating SSL and RSA Certificates and Keys using MySQL".

To create the RSA private and public key-pair files, run these commands while logged into the system account used to run the MySQL server so that the files are owned by that account:
```
openssl genrsa -out private_key.pem 2048
openssl rsa -in private_key.pem -pubout -out public_key.pem
```


Those commands create 2,048-bit keys. To create stronger keys, use a larger value.
Then set the access modes for the key files. The private key should be readable only by the server, whereas the public key can be freely distributed to client users:
```
chmod 400 private_key.pem
chmod 444 public_key.pem
```


\subsection*{8.3.4 Connecting to MySQL Remotely from Windows with SSH}

This section describes how to get an encrypted connection to a remote MySQL server with SSH. The information was provided by David Carlson <dcarlson@mplcomm.com>.
1. Install an SSH client on your Windows machine. For a comparison of SSH clients, see http:// en.wikipedia.org/wiki/Comparison_of_SSH_clients.
2. Start your Windows SSH client. Set Host_Name = yourmysqlserver_URL_Or_IP. Set userid=your_userid to log in to your server. This userid value might not be the same as the user name of your MySQL account.
3. Set up port forwarding. Either do a remote forward (Set local_port: 3306, remote_host: yourmysqlservername_or_ip, remote_port: 3306 ) or a local forward (Set port: 3306, host: localhost, remote port: 3306).
4. Save everything, otherwise you must redo it the next time.
5. Log in to your server with the SSH session you just created.
6. On your Windows machine, start some ODBC application (such as Access).
7. Create a new file in Windows and link to MySQL using the ODBC driver the same way you normally do, except type in localhost for the MySQL host server, not yourmysqlservername.

At this point, you should have an ODBC connection to MySQL, encrypted using SSH.

\subsection*{8.3.5 Reusing SSL Sessions}

MySQL client programs may elect to resume a prior SSL session, provided that the server has the session in its runtime cache. This section describes the conditions that are favorable for SSL session reuse, the server variables used for managing and monitoring the session cache, and the client command-line options for storing and reusing session data.
- Server-Side Runtime Configuration and Monitoring for SSL Session Reuse
- Client-Side Configuration for SSL Session Reuse

Each full TLS exchange can be costly both in terms of computation and network overhead, less costly if TLSv1.3 is used. By extracting a session ticket from an established session and then submitting that ticket while establishing the next connection, the overall cost is reduced if the session can be reused. For example, consider the benefit of having web pages that can open multiple connections and generate faster.

In general, the following conditions must be satisfied before SSL sessions can be reused:
- The server must keep its session cache in memory.
- The server-side session cache timeout must not have expired.
- Each client has to maintain a cache of active sessions and keep it secure.

C applications can use the C API capabilities to enable session reuse for encrypted connections (see SSL Session Reuse).

\section*{Server-Side Runtime Configuration and Monitoring for SSL Session Reuse}

To create the initial TLS context, the server uses the values that the context-related system variables have at startup. To expose the context values, the server also initializes a set of corresponding status variables. The following table shows the system variables that define the server's runtime session cache and the corresponding status variables that expose the currently active session-cache values.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.13 System and Status Variables for Session Reuse}
\begin{tabular}{|l|l|}
\hline System Variable Name & Corresponding Status Variable Name \\
\hline ssl_session_cache_mode & Ssl_session_cache_mode \\
\hline ssl_session_cache_timeout & Ssl_session_cache_timeout \\
\hline
\end{tabular}
\end{table}

Note
When the value of the ssl_session_cache_mode server variable is ON, which is the default mode, the value of the Ssl_session_cache_mode status variable is SERVER.

SSL session cache variables apply to both the mysql_main and mysql_admin TLS channels. Their values are also exposed as properties in the Performance Schema tls_channel_status table, along with the properties for any other active TLS contexts.

To reconfigure the SSL session cache at runtime, use this procedure:
1. Set each cache-related system variable that should be changed to its new value. For example, change the cache timeout value from the default ( 300 seconds) to 600 seconds:
```
mysql> SET GLOBAL ssl_session_cache_timeout = 600;
```


The members of each pair of system and status variables may have different values temporarily due to the way the reconfiguration procedure works.
```
mysql> SHOW VARIABLES LIKE 'ssl_session_cache_timeout';
```

```
+-----------------------------+-------+
| Variable_name | Value |
+----------------------------+-------+
| ssl_session_cache_timeout | 600 |
+-----------------------------+-------+
1 row in set (0.00 sec)
mysql> SHOW STATUS LIKE 'Ssl_session_cache_timeout';
+----------------------------+-------+
| Variable_name | Value |
+-----------------------------+-------+
| Ssl_session_cache_timeout | 300 |
+----------------------------+-------+
1 row in set (0.00 sec)
```


For additional information about setting variable values, see System Variable Assignment.
2. Execute ALTER INSTANCE RELOAD TLS. This statement reconfigures the active TLS context from the current values of the cache-related system variables. It also sets the cache-related status variables to reflect the new active cache values. The statement requires the CONNECTION_ADMIN privilege.
```
mysql> ALTER INSTANCE RELOAD TLS;
Query OK, 0 rows affected (0.01 sec)
mysql> SHOW VARIABLES LIKE 'ssl_session_cache_timeout';
+----------------------------+-------+
| Variable_name | Value |
+-----------------------------+-------+
| ssl_session_cache_timeout | 600 |
+----------------------------+-------+
1 row in set (0.00 sec)
mysql> SHOW STATUS LIKE 'Ssl_session_cache_timeout';
+----------------------------+-------+
| Variable_name | Value |
+----------------------------+-------+
| Ssl_session_cache_timeout | 600 |
+----------------------------+-------+
1 row in set (0.00 sec)
```


New connections established after execution of ALTER INSTANCE RELOAD TLS use the new TLS context. Existing connections remain unaffected.

\section*{Client-Side Configuration for SSL Session Reuse}

All MySQL client programs are capable of reusing a prior session for new encrypted connections made to the same server, provided that you stored the session data while the original connection was still active. Session data are stored to a file and you specify this file when you invoke the client again.

To store and reuse SSL session data, use this procedure:
1. Invoke mysql to establish an encrypted connection to a server running MySQL 8.4.
2. Use the ssl_session_data_print command to specify the path to a file where you can store the currently active session data securely. For example:
```
mysql> ssl_session_data_print ~/private-dir/session.txt
```


Session data are obtained in the form of a null-terminated, PEM encoded ANSI string. If you omit the path and file name, the string prints to standard output.
3. From the prompt of your command interpreter, invoke any MySQL client program to establish a new encrypted connection to the same server. To reuse the session data, specify the --ssl-session-data command-line option and the file argument.

For example, establish a new connection using mysql:
```
mysql -u admin -p --ssl-session-data=~/private-dir/session.txt
and then mysqlshow client:
```

```
mysqlshow -u admin -p --ssl-session-data=~/private-dir/session.txt
Enter password: *****
+---------------------+
| Databases |
+---------------------+
| information_schema |
| mysql
| performance_schema
| sys
| world
+---------------------+
```


In each example, the client attempts to resume the original session while it establishes a new connection to the same server.

To confirm whether mysql reused a session, see the output from the status command. If the currently active mysql connection did resume the session, the status information includes SSL session reused: true.

In addition to mysql and mysqlshow, SSL session reuse applies to mysqladmin, mysqlbinlog, mysqlcheck, mysqldump, mysqlimport, mysqlslap, mysqltest, mysql_migrate_keyring, and mysql_secure_installation.

Several conditions may prevent the successful retrieval of session data. For instance, if the session is not fully connected, it is not an SSL session, the server has not yet sent the session data, or the SSL session is simply not reusable. Even with properly stored session data, the server's session cache can time out. Regardless of the cause, an error is returned by default if you specify--ssl-session-data but the session cannot be reused. For example:
```
mysqlshow -u admin -p --ssl-session-data=~/private-dir/session.txt
Enter password: *****
ERROR:
--ssl-session-data specified but the session was not reused.
```


To suppress the error message, and to establish the connection by silently creating a new session instead, specify--ssl-session-data-continue-on-failed-reuse on the command line, along with--ssl-session-data. If the server's cache timeout has expired, you can store the session data again to the same file. The default server cache timeout can be extended (see ServerSide Runtime Configuration and Monitoring for SSL Session Reuse).

\subsection*{8.4 Security Components and Plugins}

MySQL includes several components and plugins that implement security features:
- Plugins for authenticating attempts by clients to connect to MySQL Server. Plugins are available for several authentication protocols. For general discussion of the authentication process, see Section 8.2.17, "Pluggable Authentication". For characteristics of specific authentication plugins, see Section 8.4.1, "Authentication Plugins".
- A password-validation component for implementing password strength policies and assessing the strength of potential passwords. See Section 8.4.3, "The Password Validation Component".
- Keyring plugins that provide secure storage for sensitive information. See Section 8.4.4, "The MySQL Keyring".
- (MySQL Enterprise Edition only) MySQL Enterprise Audit, implemented using a server plugin, uses the open MySQL Audit API to enable standard, policy-based monitoring and logging of connection and query activity executed on specific MySQL servers. Designed to meet the Oracle audit specification, MySQL Enterprise Audit provides an out of box, easy to use auditing and compliance
solution for applications that are governed by both internal and external regulatory guidelines. See Section 8.4.5, "MySQL Enterprise Audit".
- A function enables applications to add their own message events to the audit log. See Section 8.4.6, "The Audit Message Component".
- (MySQL Enterprise Edition only) MySQL Enterprise Firewall, an application-level firewall that enables database administrators to permit or deny SQL statement execution based on matching against lists of accepted statement patterns. This helps harden MySQL Server against attacks such as SQL injection or attempts to exploit applications by using them outside of their legitimate query workload characteristics. See Section 8.4.7, "MySQL Enterprise Firewall".
- (MySQL Enterprise Edition only) MySQL Enterprise Data Masking and De-Identification, implemented as a plugin library containing a plugin and a set of functions. Data masking hides sensitive information by replacing real values with substitutes. MySQL Enterprise Data Masking and De-Identification functions enable masking existing data using several methods such as obfuscation (removing identifying characteristics), generation of formatted random data, and data replacement or substitution. See Section 8.5, "MySQL Enterprise Data Masking and De-Identification".

\subsection*{8.4.1 Authentication Plugins}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1294.jpg?height=104&width=120&top_left_y=1096&top_left_x=287)

\section*{Note}

If you are looking for information about the authentication_oci plugin, it is MySQL HeatWave Service only. See authentication_oci plugin, in the MySQL HeatWave Service manual.

The following sections describe pluggable authentication methods available in MySQL and the plugins that implement these methods. For general discussion of the authentication process, see Section 8.2.17, "Pluggable Authentication".

The default authentication plugin is determined as described in The Default Authentication Plugin.

\subsection*{8.4.1.1 Native Pluggable Authentication}

MySQL includes a mysql_native_password plugin that implements native authentication; that is, authentication based on the password hashing method in use from before the introduction of pluggable authentication.

\section*{Note}

The mysql_native_password authentication plugin is deprecated as of MySQL 8.0.34, disabled by default in MySQL 8.4, and removed as of MySQL 9.0.0.

The following table shows the plugin names on the server and client sides.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.14 Plugin and Library Names for Native Password Authentication}
\begin{tabular}{|l|l|}
\hline Plugin or File & Plugin or File Name \\
\hline Server-side plugin & mysql_native_password \\
\hline Client-side plugin & mysql_native_password \\
\hline Library file & None (plugins are built in) \\
\hline
\end{tabular}
\end{table}

The following sections provide installation and usage information specific to native pluggable authentication:
- Installing Native Pluggable Authentication
- Using Native Pluggable Authentication
- Disabling Native Pluggable Authentication

For general information about pluggable authentication in MySQL, see Section 8.2.17, "Pluggable Authentication".

\section*{Installing Native Pluggable Authentication}

The mysql_native_password plugin exists in server and client forms:
- The server-side plugin is built into the server, but is disabled by default. To enable it, start the MySQL Server with --mysql-native-password=0N or by including mysql_native_password=0N in the [mysqld] section of your MySQL configuration file.
- The client-side plugin is built into the libmysqlclient client library and is available to any program linked against libmysqlclient.

\section*{Using Native Pluggable Authentication}

MySQL client programs in MySQL 8.4 (and later) use caching_sha2_password for authentication by default. Use the --default-auth option to set mysql_native_password as the default client-side authentication plugin, if that is what is desired, like this:
```
$> mysql --default-auth=mysql_native_password ...
```


\section*{Disabling Native Pluggable Authentication}

In MySQL 8.4, the mysql_native_password server-side plugin is disabled by default. To keep it disabled, be sure the server is started without specifying the --mysql-native-password option. Using--mysql-native-password=OFF also works for this purpose, but is not required. In addition, do not enable mysql_native_password in your MySQL configuration file to keep it disabled.

When the plugin is disabled, all of the operations that depend on the plugin are inaccessible. Specifically:
- Defined user accounts that authenticate with mysql_native_password encounter an error when they attempt to connect.
```
$> MYSQL -u userx -p
ERROR 1045 (28000): Access denied for user 'userx'@'localhost' (using password: NO)
```


The server writes these errors to the server log.
- Attempts to create a new user account or to alter an existing user account identified with mysql_native_password also fail and emit an error.
```
mysql> CREATE USER userxx@localhost IDENTIFIED WITH 'mysql_native_password';
ERROR 1524 (HY000): Plugin 'mysql_native_password' is not loaded
mysql> ALTER USER userxy@localhost IDENTIFIED WITH 'mysql_native_password';
ERROR 1524 (HY000): Plugin 'mysql_native_password' is not loaded
```


For instructions on enabling the plugin, see Installing Native Pluggable Authentication.

\subsection*{8.4.1.2 Caching SHA-2 Pluggable Authentication}

MySQL provides two authentication plugins that implement SHA-256 hashing for user account passwords:
- caching_sha2_password: Implements SHA-256 authentication (like sha256_password), but uses caching on the server side for better performance and has additional features for wider applicability.
- sha256_password (deprecated): Implements basic SHA-256 authentication. This is deprecated and subject to removal, do not use this authentication plugin.

This section describes the caching SHA-2 authentication plugin. For information about the original basic (noncaching) deprecated plugin, see Section 8.4.1.3, "SHA-256 Pluggable Authentication".

\section*{Important}

In MySQL 8.4, caching_sha2_password is the default authentication plugin rather than mysql_native_password (deprecated). For information about the implications of this change for server operation and compatibility of the server with clients and connectors, see caching_sha2_password as the Preferred Authentication Plugin.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1296.jpg?height=122&width=100&top_left_y=554&top_left_x=308)

\section*{Important}

To connect to the server using an account that authenticates with the caching_sha2_password plugin, you must use either a secure connection or an unencrypted connection that supports password exchange using an RSA key pair, as described later in this section. Either way, the caching_sha2_password plugin uses MySQL's encryption capabilities. See Section 8.3, "Using Encrypted Connections".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1296.jpg?height=108&width=99&top_left_y=918&top_left_x=306)

\section*{Note}

In the name sha256_password, "sha256" refers to the 256-bit digest length the plugin uses for encryption. In the name caching_sha2_password, "sha2" refers more generally to the SHA-2 class of encryption algorithms, of which 256bit encryption is one instance. The latter name choice leaves room for future expansion of possible digest lengths without changing the plugin name.

The caching_sha2_password plugin has these advantages, compared to the deprecated sha256_password plugin:
- On the server side, an in-memory cache enables faster reauthentication of users who have connected previously when they connect again.
- RSA-based password exchange is available regardless of the SSL library against which MySQL is linked.
- Support is provided for client connections that use the Unix socket-file and shared-memory protocols.

The following table shows the plugin names on the server and client sides.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.15 Plugin and Library Names for SHA-2 Authentication}
\begin{tabular}{|l|l|}
\hline Plugin or File & Plugin or File Name \\
\hline Server-side plugin & caching_sha2_password \\
\hline Client-side plugin & caching_sha2_password \\
\hline Library file & None (plugins are built in) \\
\hline
\end{tabular}
\end{table}

The following sections provide installation and usage information specific to caching SHA-2 pluggable authentication:
- Installing SHA-2 Pluggable Authentication
- Using SHA-2 Pluggable Authentication
- Cache Operation for SHA-2 Pluggable Authentication

For general information about pluggable authentication in MySQL, see Section 8.2.17, "Pluggable Authentication".

\section*{Installing SHA-2 Pluggable Authentication}

The caching_sha2_password plugin exists in server and client forms:
- The server-side plugin is built into the server, need not be loaded explicitly, and cannot be disabled by unloading it.
- The client-side plugin is built into the libmysqlclient client library and is available to any program linked against libmysqlclient.

The server-side plugin uses the sha2_cache_cleaner audit plugin as a helper to perform password cache management. sha2_cache_cleaner, like caching_sha2_password, is built in and need not be installed.

\section*{Using SHA-2 Pluggable Authentication}

To set up an account that uses the caching_sha2_password plugin for SHA-256 password hashing, use the following statement, where password is the desired account password:
```
CREATE USER 'sha2user'@'localhost'
IDENTIFIED WITH caching_sha2_password BY 'password';
```


The server assigns the caching_sha2_password plugin to the account and uses it to encrypt the password using SHA-256, storing those values in the plugin and authentication_string columns of the mysql. user system table.

The preceding instructions do not assume that caching_sha2_password is the default authentication plugin. If caching_sha2_password is the default authentication plugin, a simpler CREATE USER syntax can be used:
```
CREATE USER 'sha2user'@'localhost' IDENTIFIED BY 'password';
```


The default plugin is determined by the value of the authentication_policy system variable; the default is to use caching_sha2_password.

To use a different plugin, you must specify it using IDENTIFIED WITH. For example, to specify the deprecated mysql_native_password plugin, use this statement:
```
CREATE USER 'nativeuser'@'localhost'
IDENTIFIED WITH mysql_native_password BY 'password';
```

caching_sha2_password supports connections over secure transport. If you follow the RSA configuration procedure given later in this section, it also supports encrypted password exchange using RSA over unencrypted connections. RSA support has these characteristics:
- On the server side, two system variables name the RSA private and public key-pair files: caching_sha2_password_private_key_path and caching_sha2_password_public_key_path. The database administrator must set these variables at server startup if the key files to use have names that differ from the system variable default values.
- The server uses the caching_sha2_password_auto_generate_rsa_keys system variable to determine whether to automatically generate the RSA key-pair files. See Section 8.3.3, "Creating SSL and RSA Certificates and Keys".
- The Caching_sha2_password_rsa_public_key status variable displays the RSA public key value used by the caching_sha2_password authentication plugin.
- Clients that are in possession of the RSA public key can perform RSA key pair-based password exchange with the server during the connection process, as described later.
- For connections by accounts that authenticate with caching_sha2_password and RSA key pairbased password exchange, the server does not send the RSA public key to clients by default. Clients can use a client-side copy of the required public key, or request the public key from the server.

Use of a trusted local copy of the public key enables the client to avoid a round trip in the client/ server protocol, and is more secure than requesting the public key from the server. On the other hand, requesting the public key from the server is more convenient (it requires no management of a client-side file) and may be acceptable in secure network environments.
- For command-line clients, use the --server-public-key-path option to specify the RSA public key file. Use the--get-server-public-key option to request the public key from the server. The following programs support the two options: mysql, mysqlsh, mysqladmin, mysqlbinlog, mysqlcheck, mysqldump, mysqlimport, mysqlshow, mysqlslap, mysqltest.
- For programs that use the C API, call mysql_options() to specify the RSA public key file by passing the MYSQL_SERVER_PUBLIC_KEY option and the name of the file, or request the public key from the server by passing the MYSQL_OPT_GET_SERVER_PUBLIC_KEY option.
- For replicas, use the CHANGE REPLICATION SOURCE TO statement with the SOURCE_PUBLIC_KEY_PATH option to specify the RSA public key file, or the GET_SOURCE_PUBLIC_KEY option to request the public key from the source. For Group Replication, the group_replication_recovery_public_key_path and group_replication_recovery_get_public_key system variables serve the same purpose.

In all cases, if the option is given to specify a valid public key file, it takes precedence over the option to request the public key from the server.

For clients that use the caching_sha2_password plugin, passwords are never exposed as cleartext when connecting to the server. How password transmission occurs depends on whether a secure connection or RSA encryption is used:
- If the connection is secure, an RSA key pair is unnecessary and is not used. This applies to TCP connections encrypted using TLS, as well as Unix socket-file and shared-memory connections. The password is sent as cleartext but cannot be snooped because the connection is secure.
- If the connection is not secure, an RSA key pair is used. This applies to TCP connections not encrypted using TLS and named-pipe connections. RSA is used only for password exchange between client and server, to prevent password snooping. When the server receives the encrypted password, it decrypts it. A scramble is used in the encryption to prevent repeat attacks.

To enable use of an RSA key pair for password exchange during the client connection process, use the following procedure:
1. Create the RSA private and public key-pair files using the instructions in Section 8.3.3, "Creating SSL and RSA Certificates and Keys".
2. If the private and public key files are located in the data directory and are named private_key.pem and public_key.pem (the default values of the caching_sha2_password_private_key_path and caching_sha2_password_public_key_path system variables), the server uses them automatically at startup.

Otherwise, to name the key files explicitly, set the system variables to the key file names in the server option file. If the files are located in the server data directory, you need not specify their full path names:
```
[mysqld]
caching_sha2_password_private_key_path=myprivkey.pem
caching_sha2_password_public_key_path=mypubkey.pem
```


If the key files are not located in the data directory, or to make their locations explicit in the system variable values, use full path names:
```
[mysqld]
caching_sha2_password_private_key_path=/usr/local/mysql/myprivkey.pem
caching_sha2_password_public_key_path=/usr/local/mysql/mypubkey.pem
```

3. If you want to change the number of hash rounds used by caching_sha2_password during password generation, set the caching_sha2_password_digest_rounds system variable. For example:
```
[mysqld]
caching_sha2_password_digest_rounds=10000
```

4. Restart the server, then connect to it and check the

Caching_sha2_password_rsa_public_key status variable value. The value actually displayed differs from that shown here, but should be nonempty:
```
mysql> SHOW STATUS LIKE 'Caching_sha2_password_rsa_public_key'\G
*************************** 1. row ****************************
Variable_name: Caching_sha2_password_rsa_public_key
    Value: -----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDO9nRUDd+KvSZgY7cNBZMNpwX6
MvE1PbJFX07u18nJ9lwc99Du/E7lw6CVXw7VKrXPeHbVQUzGyUNkf45Nz/ckaaJa
aLgJOBCIDmNVnyU540T/1lcs2xiyfaDMe8fCJ64ZwTnKbY2gkt1IMjUAB50gd5kJ
g8aV7EtKwyhHb0c30QIDAQAB
-----END PUBLIC KEY-----
```


If the value is empty, the server found some problem with the key files. Check the error log for diagnostic information.

After the server has been configured with the RSA key files, accounts that authenticate with the caching_sha2_password plugin have the option of using those key files to connect to the server. As mentioned previously, such accounts can use either a secure connection (in which case RSA is not used) or an unencrypted connection that performs password exchange using RSA. Suppose that an unencrypted connection is used. For example:
```
$> mysql --ssl-mode=DISABLED -u sha2user -p
Enter password: password
```


For this connection attempt by sha2user, the server determines that caching_sha2_password is the appropriate authentication plugin and invokes it (because that was the plugin specified at CREATE USER time). The plugin finds that the connection is not encrypted and thus requires the password to be transmitted using RSA encryption. However, the server does not send the public key to the client, and the client provided no public key, so it cannot encrypt the password and the connection fails:
```
ERROR 2061 (HY000): Authentication plugin 'caching_sha2_password'
reported error: Authentication requires secure connection.
```


To request the RSA public key from the server, specify the --get-server-public-key option:
```
$> mysql --ssl-mode=DISABLED -u sha2user -p --get-server-public-key
Enter password: password
```


In this case, the server sends the RSA public key to the client, which uses it to encrypt the password and returns the result to the server. The plugin uses the RSA private key on the server side to decrypt the password and accepts or rejects the connection based on whether the password is correct.

Alternatively, if the client has a file containing a local copy of the RSA public key required by the server, it can specify the file using the --server-public-key-path option:
```
$> mysql --ssl-mode=DISABLED -u sha2user -p --server-public-key-path=file_name
Enter password: password
```


In this case, the client uses the public key to encrypt the password and returns the result to the server. The plugin uses the RSA private key on the server side to decrypt the password and accepts or rejects the connection based on whether the password is correct.

The public key value in the file named by the --server-public-key-path option should be the same as the key value in the server-side file named by the caching_sha2_password_public_key_path system variable. If the key file contains a valid public key value but the value is incorrect, an access-denied error occurs. If the key file does not contain a valid public key, the client program cannot use it.

Client users can obtain the RSA public key two ways:
- The database administrator can provide a copy of the public key file.
- A client user who can connect to the server some other way can use a SHOW STATUS LIKE 'Caching_sha2_password_rsa_public_key' statement and save the returned key value in a file.

\section*{Cache Operation for SHA-2 Pluggable Authentication}

On the server side, the caching_sha2_password plugin uses an in-memory cache for faster authentication of clients who have connected previously. Entries consist of account-name/passwordhash pairs. The cache works like this:
1. When a client connects, caching_sha2_password checks whether the client and password match some cache entry. If so, authentication succeeds.
2. If there is no matching cache entry, the plugin attempts to verify the client against the credentials in the mysql.user system table. If this succeeds, caching_sha2_password adds an entry for the client to the hash. Otherwise, authentication fails and the connection is rejected.

In this way, when a client first connects, authentication against the mysql. user system table occurs. When the client connects subsequently, faster authentication against the cache occurs.

Password cache operations other than adding entries are handled by the sha2_cache_cleaner audit plugin, which performs these actions on behalf of caching_sha2_password:
- It clears the cache entry for any account that is renamed or dropped, or any account for which the credentials or authentication plugin are changed.
- It empties the cache when the FLUSH PRIVILEGES statement is executed.
- It empties the cache at server shutdown. (This means the cache is not persistent across server restarts.)

Cache clearing operations affect the authentication requirements for subsequent client connections. For each user account, the first client connection for the user after any of the following operations must use a secure connection (made using TCP using TLS credentials, a Unix socket file, or shared memory) or RSA key pair-based password exchange:
- After account creation.
- After a password change for the account.
- After RENAME USER for the account.
- After FLUSH PRIVILEGES.

FLUSH PRIVILEGES clears the entire cache and affects all accounts that use the caching_sha2_password plugin. The other operations clear specific cache entries and affect only accounts that are part of the operation.

Once the user authenticates successfully, the account is entered into the cache and subsequent connections do not require a secure connection or the RSA key pair, until another cache clearing event occurs that affects the account. (When the cache can be used, the server uses a challengeresponse mechanism that does not use cleartext password transmission and does not require a secure connection.)

\subsection*{8.4.1.3 SHA-256 Pluggable Authentication}

MySQL provides two authentication plugins that implement SHA-256 hashing for user account passwords:
- caching_sha2_password: Implements SHA-256 authentication (like sha256_password), but uses caching on the server side for better performance and has additional features for wider applicability.
- sha256_password (deprecated): Implements basic SHA-256 authentication.

This section describes the original noncaching SHA-2 authentication plugin. For information about the caching plugin, see Section 8.4.1.2, "Caching SHA-2 Pluggable Authentication".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1301.jpg?height=111&width=104&top_left_y=440&top_left_x=365)

\section*{Important}

In MySQL 8.4, caching_sha2_password is the default authentication plugin rather than mysql_native_password (deprecated). For information about the implications of this change for server operation and compatibility of the server with clients and connectors, see caching_sha2_password as the Preferred Authentication Plugin.

Because caching_sha2_password is the default authentication plugin in MySQL 8.4 and provides a superset of the capabilities of the sha256_password authentication plugin, sha256_password is deprecated; expect it to be removed in a future version of MySQL. MySQL accounts that authenticate using sha256_password should be migrated to use caching_sha2_password instead.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1301.jpg?height=99&width=104&top_left_y=1037&top_left_x=365)

\section*{Important}

To connect to the server using an account that authenticates with the sha256_password plugin, you must use either a TLS connection or an unencrypted connection that supports password exchange using an RSA key pair, as described later in this section. Either way, the sha256_password plugin uses MySQL's encryption capabilities. See Section 8.3, "Using Encrypted Connections".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1301.jpg?height=104&width=99&top_left_y=1384&top_left_x=370)

\section*{Note}

In the name sha256_password, "sha256" refers to the 256-bit digest length the plugin uses for encryption. In the name caching_sha2_password, "sha2" refers more generally to the SHA-2 class of encryption algorithms, of which 256bit encryption is one instance. The latter name choice leaves room for future expansion of possible digest lengths without changing the plugin name.

The following table shows the plugin names on the server and client sides.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.16 Plugin and Library Names for SHA-256 Authentication}
\begin{tabular}{|l|l|}
\hline Plugin or File & Plugin or File Name \\
\hline Server-side plugin & sha256_password \\
\hline Client-side plugin & sha256_password \\
\hline Library file & None (plugins are built in) \\
\hline
\end{tabular}
\end{table}

The following sections provide installation and usage information specific to SHA-256 pluggable authentication:
- Installing SHA-256 Pluggable Authentication
- Using SHA-256 Pluggable Authentication

For general information about pluggable authentication in MySQL, see Section 8.2.17, "Pluggable Authentication".

\section*{Installing SHA-256 Pluggable Authentication}

The sha256_password (deprecated) plugin exists in server and client forms:
- The server-side plugin is built into the server, need not be loaded explicitly, and cannot be disabled by unloading it.
- The client-side plugin is built into the libmysqlclient client library and is available to any program linked against libmysqlclient.

\section*{Using SHA-256 Pluggable Authentication}

To set up an account that uses the deprecated sha256_password plugin for SHA-256 password hashing, use the following statement, where password is the desired account password:

CREATE USER 'sha256user'@'localhost'
IDENTIFIED WITH sha256_password BY 'password';
The server assigns the sha256_password plugin to the account and uses it to encrypt the password using SHA-256, storing those values in the plugin and authentication_string columns of the mysql. user system table.
(The IDENTIFIED WITH clause is not needed if sha256_password is the default plugin; this can be specified using authentication_policy.)
sha256_password supports connections over secure transport. sha256_password also supports encrypted password exchange using RSA over unencrypted connections if MySQL is compiled using OpenSSL, and the MySQL server to which you wish to connect is configured to support RSA (using the RSA configuration procedure given later in this section).

RSA support has these characteristics:
- On the server side, two system variables name the RSA private and public key-pair files: sha256_password_private_key_path and sha256_password_public_key_path. The database administrator must set these variables at server startup if the key files to use have names that differ from the system variable default values.
- The server uses the sha256_password_auto_generate_rsa_keys system variable to determine whether to automatically generate the RSA key-pair files. See Section 8.3.3, "Creating SSL and RSA Certificates and Keys".
- The Rsa_public_key status variable displays the RSA public key value used by the sha256_password authentication plugin.
- Clients that are in possession of the RSA public key can perform RSA key pair-based password exchange with the server during the connection process, as described later.
- For connections by accounts that authenticate with sha256_password and RSA public key pairbased password exchange, the server sends the RSA public key to the client as needed. However, if a copy of the public key is available on the client host, the client can use it to save a round trip in the client/server protocol:
- For these command-line clients, use the --server-public-key-path option to specify the RSA public key file: mysql, mysqladmin, mysqlbinlog, mysqlcheck, mysqldump, mysqlimport, mysqlshow, mysqlslap, mysqltest.
- For programs that use the C API, call mysql_options ( ) to specify the RSA public key file by passing the MYSQL_SERVER_PUBLIC_KEY option and the name of the file.
- For replicas, use the CHANGE REPLICATION SOURCE TO statement with the SOURCE_PUBLIC_KEY_PATH option to specify the RSA public key file. For Group Replication, the group_replication_recovery_get_public_key system variable serves the same purpose.

For clients that use the sha256_password plugin, passwords are never exposed as cleartext when connecting to the server. How password transmission occurs depends on whether a secure connection or RSA encryption is used:
- If the connection is secure, an RSA key pair is unnecessary and is not used. This applies to connections encrypted using TLS. The password is sent as cleartext but cannot be snooped because the connection is secure.

\section*{Note}

Unlike caching_sha2_password, the deprecated sha256_password plugin does not treat shared-memory connections as secure, even though share-memory transport is secure by default.
- If the connection is not secure, and an RSA key pair is available, the connection remains unencrypted. This applies to connections not encrypted using TLS. RSA is used only for password exchange between client and server, to prevent password snooping. When the server receives the encrypted password, it decrypts it. A scramble is used in the encryption to prevent repeat attacks.
- If a secure connection is not used and RSA encryption is not available, the connection attempt fails because the password cannot be sent without being exposed as cleartext.

\section*{Note}

To use RSA password encryption with the deprecated sha256_password plugin, the client and server both must be compiled using OpenSSL, not just one of them.

Assuming that MySQL has been compiled using OpenSSL, use the following procedure to enable use of an RSA key pair for password exchange during the client connection process:
1. Create the RSA private and public key-pair files using the instructions in Section 8.3.3, "Creating SSL and RSA Certificates and Keys".
2. If the private and public key files are located in the data directory and are named private_key.pem and public_key.pem (the default values of the sha256_password_private_key_path and sha256_password_public_key_path system variables), the server uses them automatically at startup.

Otherwise, to name the key files explicitly, set the system variables to the key file names in the server option file. If the files are located in the server data directory, you need not specify their full path names:
```
[mysqld]
sha256_password_private_key_path=myprivkey.pem
sha256_password_public_key_path=mypubkey.pem
```


If the key files are not located in the data directory, or to make their locations explicit in the system variable values, use full path names:
```
[mysqld]
sha256_password_private_key_path=/usr/local/mysql/myprivkey.pem
sha256_password_public_key_path=/usr/local/mysql/mypubkey.pem
```

3. Restart the server, then connect to it and check the Rsa_public_key status variable value. The value actually displayed differs from that shown here, but should be nonempty:
```
mysql> SHOW STATUS LIKE 'Rsa_public_key'\G
************************** 1. row ******************************
Variable_name: Rsa_public_key
    Value: -----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDO9nRUDd+KvSZgY7cNBZMNpwX6
MvE1PbJFX07u18nJ9lwc99Du/E7lw6CVXw7VKrXPeHbVQUzGyUNkf45Nz/ckaaJa
aLgJOBCIDmNVnyU540T/1lcs2xiyfaDMe8fCJ64ZwTnKbY2gkt1IMjUAB50gd5kJ
g8aV7EtKwyhHb0c30QIDAQAB
-----END PUBLIC KEY-----
```


If the value is empty, the server found some problem with the key files. Check the error log for diagnostic information.

After the server has been configured with the RSA key files, accounts that authenticate with the deprecated sha256_password plugin have the option of using those key files to connect to the
server. As mentioned previously, such accounts can use either a secure connection (in which case RSA is not used) or an unencrypted connection that performs password exchange using RSA. Suppose that an unencrypted connection is used. For example:
```
$> mysql --ssl-mode=DISABLED -u sha256user -p
Enter password: password
```


For this connection attempt by sha256user, the server determines that sha256_password is the appropriate authentication plugin and invokes it (because that was the plugin specified at CREATE USER time). The plugin finds that the connection is not encrypted and thus requires the password to be transmitted using RSA encryption. In this case, the plugin sends the RSA public key to the client, which uses it to encrypt the password and returns the result to the server. The plugin uses the RSA private key on the server side to decrypt the password and accepts or rejects the connection based on whether the password is correct.

The server sends the RSA public key to the client as needed. However, if the client has a file containing a local copy of the RSA public key required by the server, it can specify the file using the -server-public-key-path option:
```
$> mysql --ssl-mode=DISABLED -u sha256user -p --server-public-key-path=file_name
Enter password: password
```


The public key value in the file named by the--server-public-key-path option should be the same as the key value in the server-side file named by the sha256_password_public_key_path system variable. If the key file contains a valid public key value but the value is incorrect, an accessdenied error occurs. If the key file does not contain a valid public key, the client program cannot use it. In this case, the deprecated sha256_password plugin sends the public key to the client as if no -server-public-key-path option had been specified.

Client users can obtain the RSA public key two ways:
- The database administrator can provide a copy of the public key file.
- A client user who can connect to the server some other way can use a SHOW STATUS LIKE 'Rsa_public_key' statement and save the returned key value in a file.

\subsection*{8.4.1.4 Client-Side Cleartext Pluggable Authentication}

A client-side authentication plugin is available that enables clients to send passwords to the server as cleartext, without hashing or encryption. This plugin is built into the MySQL client library.

The following table shows the plugin name.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.17 Plugin and Library Names for Cleartext Authentication}
\begin{tabular}{|l|l|}
\hline Plugin or File & Plugin or File Name \\
\hline Server-side plugin & None, see discussion \\
\hline Client-side plugin & mysql_clear_password \\
\hline Library file & None (plugin is built in) \\
\hline
\end{tabular}
\end{table}

Many client-side authentication plugins perform hashing or encryption of a password before the client sends it to the server. This enables clients to avoid sending passwords as cleartext.

Hashing or encryption cannot be done for authentication schemes that require the server to receive the password as entered on the client side. In such cases, the client-side mysql_clear_password plugin is used, which enables the client to send the password to the server as cleartext. There is no corresponding server-side plugin. Rather, mysql_clear_password can be used on the client side in concert with any server-side plugin that needs a cleartext password. (Examples are the PAM
and simple LDAP authentication plugins; see Section 8.4.1.5, "PAM Pluggable Authentication", and Section 8.4.1.7, "LDAP Pluggable Authentication".)

The following discussion provides usage information specific to cleartext pluggable authentication. For general information about pluggable authentication in MySQL, see Section 8.2.17, "Pluggable Authentication".

\section*{Note}

Sending passwords as cleartext may be a security problem in some configurations. To avoid problems if there is any possibility that the password would be intercepted, clients should connect to MySQL Server using a method that protects the password. Possibilities include SSL (see Section 8.3, "Using Encrypted Connections"), IPsec, or a private network.

To make inadvertent use of the mysql_clear_password plugin less likely, MySQL clients must explicitly enable it. This can be done in several ways:
- Set the LIBMYSQL_ENABLE_CLEARTEXT_PLUGIN environment variable to a value that begins with $1, \mathrm{Y}$, or y . This enables the plugin for all client connections.
- The mysql, mysqladmin, mysqlcheck, mysqldump, mysqlshow, and mysqlslap client programs support an --enable-cleartext-plugin option that enables the plugin on a perinvocation basis.
- The mysql_options() C API function supports a MYSQL_ENABLE_CLEARTEXT_PLUGIN option that enables the plugin on a per-connection basis. Also, any program that uses libmysqlclient and reads option files can enable the plugin by including an enable-cleartext-plugin option in an option group read by the client library.

\subsection*{8.4.1.5 PAM Pluggable Authentication}

> Note
> PAM pluggable authentication is an extension included in MySQL Enterprise Edition, a commercial product. To learn more about commercial products, see https://www.mysql.com/products/.

MySQL Enterprise Edition supports an authentication method that enables MySQL Server to use PAM (Pluggable Authentication Modules) to authenticate MySQL users. PAM enables a system to use a standard interface to access various kinds of authentication methods, such as traditional Unix passwords or an LDAP directory.

PAM pluggable authentication provides these capabilities:
- External authentication: PAM authentication enables MySQL Server to accept connections from users defined outside the MySQL grant tables and that authenticate using methods supported by PAM.
- Proxy user support: PAM authentication can return to MySQL a user name different from the external user name passed by the client program, based on the PAM groups the external user is a member of and the authentication string provided. This means that the plugin can return the MySQL user that defines the privileges the external PAM-authenticated user should have. For example, an operating system user named joe can connect and have the privileges of a MySQL user named developer.

PAM pluggable authentication has been tested on Linux and macOS; note that Windows does not support PAM.

The following table shows the plugin and library file names. The file name suffix might differ on your system. The file must be located in the directory named by the plugin_dir system variable. For installation information, see Installing PAM Pluggable Authentication.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.18 Plugin and Library Names for PAM Authentication}
\begin{tabular}{|l|l|}
\hline Plugin or File & Plugin or File Name \\
\hline Server-side plugin & authentication_pam \\
\hline Client-side plugin & mysql_clear_password \\
\hline Library file & authentication_pam.so \\
\hline
\end{tabular}
\end{table}

The client-side mysql_clear_password cleartext plugin that communicates with the server-side PAM plugin is built into the libmysqlclient client library and is included in all distributions, including community distributions. Inclusion of the client-side cleartext plugin in all MySQL distributions enables clients from any distribution to connect to a server that has the server-side PAM plugin loaded.

The following sections provide installation and usage information specific to PAM pluggable authentication:
- How PAM Authentication of MySQL Users Works
- Installing PAM Pluggable Authentication
- Uninstalling PAM Pluggable Authentication
- Using PAM Pluggable Authentication
- PAM Unix Password Authentication without Proxy Users
- PAM LDAP Authentication without Proxy Users
- PAM Unix Password Authentication with Proxy Users and Group Mapping
- PAM Authentication Access to Unix Password Store
- PAM Authentication Debugging

For general information about pluggable authentication in MySQL, see Section 8.2.17, "Pluggable Authentication". For information about the mysql_clear_password plugin, see Section 8.4.1.4, "Client-Side Cleartext Pluggable Authentication". For proxy user information, see Section 8.2.19, "Proxy Users".

\section*{How PAM Authentication of MySQL Users Works}

This section provides an overview of how MySQL and PAM work together to authenticate MySQL users. For examples showing how to set up MySQL accounts to use specific PAM services, see Using PAM Pluggable Authentication.
1. The client program and the server communicate, with the client sending to the server the client user name (the operating system user name by default) and password:
- The client user name is the external user name.
- For accounts that use the PAM server-side authentication plugin, the corresponding client-side plugin is mysql_clear_password. This client-side plugin performs no password hashing, with the result that the client sends the password to the server as cleartext.
2. The server finds a matching MySQL account based on the external user name and the host from which the client connects. The PAM plugin uses the information passed to it by MySQL Server (such as user name, host name, password, and authentication string). When you define a MySQL account that authenticates using PAM, the authentication string contains:
- A PAM service name, which is a name that the system administrator can use to refer to an authentication method for a particular application. There can be multiple applications associated with a single database server instance, so the choice of service name is left to the SQL application developer.
- Optionally, if proxying is to be used, a mapping from PAM groups to MySQL user names.
3. The plugin uses the PAM service named in the authentication string to check the user credentials and returns 'Authentication succeeded, Username is user_name' or 'Authentication failed'. The password must be appropriate for the password store used by the PAM service. Examples:
- For traditional Unix passwords, the service looks up passwords stored in the /etc/shadow file.
- For LDAP, the service looks up passwords stored in an LDAP directory.

If the credentials check fails, the server refuses the connection.
4. Otherwise, the authentication string indicates whether proxying occurs. If the string contains no PAM group mapping, proxying does not occur. In this case, the MySQL user name is the same as the external user name.
5. Otherwise, proxying is indicated based on the PAM group mapping, with the MySQL user name determined based on the first matching group in the mapping list. The meaning of "PAM group" depends on the PAM service. Examples:
- For traditional Unix passwords, groups are Unix groups defined in the /etc/group file, possibly supplemented with additional PAM information in a file such as /etc/security/group.conf.
- For LDAP, groups are LDAP groups defined in an LDAP directory.

If the proxy user (the external user) has the PROXY privilege for the proxied MySQL user name, proxying occurs, with the proxy user assuming the privileges of the proxied user.

\section*{Installing PAM Pluggable Authentication}

This section describes how to install the server-side PAM authentication plugin. For general information about installing plugins, see Section 7.6.1, "Installing and Uninstalling Plugins".

To be usable by the server, the plugin library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup.

The plugin library file base name is authentication_pam, and is typically compiled with the .so suffix.

To load the plugin at server startup, use the --plugin-load-add option to name the library file that contains it. With this plugin-loading method, the option must be given each time the server starts. For example, put these lines in the server my. cnf file:
[mysqld]
plugin-load-add=authentication_pam.so
After modifying my.cnf, restart the server to cause the new settings to take effect.
Alternatively, to load the plugin at runtime, use this statement, adjusting the . so suffix as necessary:
INSTALL PLUGIN authentication_pam SONAME 'authentication_pam.so';
INSTALL PLUGIN loads the plugin immediately, and also registers it in the mysql.plugins system table to cause the server to load it for each subsequent normal startup without the need for - -plugin-load-add.

To verify plugin installation, examine the Information Schema PLUGINS table or use the SHOW PLUGINS statement (see Section 7.6.2, "Obtaining Server Plugin Information"). For example:
mysql> SELECT PLUGIN_NAME, PLUGIN_STATUS
```
    FROM INFORMATION_SCHEMA.PLUGINS
    WHERE PLUGIN_NAME LIKE '%pam%';
+----------------------+---------------+
| PLUGIN_NAME | PLUGIN_STATUS |
+----------------------+---------------+
| authentication_pam | ACTIVE |
+----------------------+---------------+
```


If the plugin fails to initialize, check the server error log for diagnostic messages.
To associate MySQL accounts with the PAM plugin, see Using PAM Pluggable Authentication.

\section*{Uninstalling PAM Pluggable Authentication}

The method used to uninstall the PAM authentication plugin depends on how you installed it:
- If you installed the plugin at server startup using a --plugin-load-add option, restart the server without the option.
- If you installed the plugin at runtime using an INSTALL PLUGIN statement, it remains installed across server restarts. To uninstall it, use UNINSTALL PLUGIN:
```
UNINSTALL PLUGIN authentication_pam;
```


\section*{Using PAM Pluggable Authentication}

This section describes in general terms how to use the PAM authentication plugin to connect from MySQL client programs to the server. The following sections provide instructions for using PAM authentication in specific ways. It is assumed that the server is running with the server-side PAM plugin enabled, as described in Installing PAM Pluggable Authentication.

To refer to the PAM authentication plugin in the IDENTIFIED WITH clause of a CREATE USER statement, use the name authentication_pam. For example:
```
CREATE USER user
    IDENTIFIED WITH authentication_pam
    AS 'auth_string';
```


The authentication string specifies the following types of information:
- The PAM service name (see How PAM Authentication of MySQL Users Works). Examples in the following discussion use a service name of mysql-unix for authentication using traditional Unix passwords, and mysql-ldap for authentication using LDAP.
- For proxy support, PAM provides a way for a PAM module to return to the server a MySQL user name other than the external user name passed by the client program when it connects to the server. Use the authentication string to control the mapping from external user names to MySQL user names. If you want to take advantage of proxy user capabilities, the authentication string must include this kind of mapping.

For example, if an account uses the mysql-unix PAM service name and should map operating system users in the root and users PAM groups to the developer and data_entry MySQL users, respectively, use a statement like this:
```
CREATE USER user
    IDENTIFIED WITH authentication_pam
    AS 'mysql-unix, root=developer, users=data_entry';
```


Authentication string syntax for the PAM authentication plugin follows these rules:
- The string consists of a PAM service name, optionally followed by a PAM group mapping list consisting of one or more keyword/value pairs each specifying a PAM group name and a MySQL user name:
```
pam_service_name[,pam_group_name=mysql_user_name]...
```


The plugin parses the authentication string for each connection attempt that uses the account. To minimize overhead, keep the string as short as possible.
- Each pam_group_name=mysql_user_name pair must be preceded by a comma.
- Leading and trailing spaces not inside double quotation marks are ignored.
- Unquoted pam_service_name, pam_group_name, and mysql_user_name values can contain anything except equal sign, comma, or space.
- If a pam_service_name, pam_group_name, or mysql_user_name value is quoted with double quotation marks, everything between the quotation marks is part of the value. This is necessary, for example, if the value contains space characters. All characters are legal except double quotation mark and backslash ( \\). To include either character, escape it with a backslash.

If the plugin successfully authenticates the external user name (the name passed by the client), it looks for a PAM group mapping list in the authentication string and, if present, uses it to return a different MySQL user name to the MySQL server based on which PAM groups the external user is a member of:
- If the authentication string contains no PAM group mapping list, the plugin returns the external name.
- If the authentication string does contain a PAM group mapping list, the plugin examines each pam_group_name=mysql_user_name pair in the list from left to right and tries to find a match for the pam_group_name value in a non-MySQL directory of the groups assigned to the authenticated user and returns mysql_user_name for the first match it finds. If the plugin finds no match for any PAM group, it returns the external name. If the plugin is not capable of looking up a group in a directory, it ignores the PAM group mapping list and returns the external name.

The following sections describe how to set up several authentication scenarios that use the PAM authentication plugin:
- No proxy users. This uses PAM only to check login names and passwords. Every external user permitted to connect to MySQL Server should have a matching MySQL account that is defined to use PAM authentication. (For a MySQL account of 'user_name'@'host_name' to match the external user, user_name must be the external user name and host_name must match the host from which the client connects.) Authentication can be performed by various PAM-supported methods. Later discussion shows how to authenticate client credentials using traditional Unix passwords, and passwords in LDAP.

PAM authentication, when not done through proxy users or PAM groups, requires the MySQL user name to be same as the operating system user name. MySQL user names are limited to 32 characters (see Section 8.2.3, "Grant Tables"), which limits PAM nonproxy authentication to Unix accounts with names of at most 32 characters.
- Proxy users only, with PAM group mapping. For this scenario, create one or more MySQL accounts that define different sets of privileges. (Ideally, nobody should connect using those accounts directly.) Then define a default user authenticating through PAM that uses some mapping scheme (usually based on the external PAM groups the users are members of) to map all the external user names to the few MySQL accounts holding the privilege sets. Any client who connects and specifies an external user name as the client user name is mapped to one of the MySQL accounts and uses its privileges. The discussion shows how to set this up using traditional Unix passwords, but other PAM methods such as LDAP could be used instead.

Variations on these scenarios are possible:
- You can permit some users to log in directly (without proxying) but require others to connect through proxy accounts.
- You can use one PAM authentication method for some users, and another method for other users, by using differing PAM service names among your PAM-authenticated accounts. For example, you can use the mysql-unix PAM service for some users, and mysql-ldap for others.

The examples make the following assumptions. You might need to make some adjustments if your system is set up differently.
- The login name and password are antonio and antonio_password, respectively. Change these to correspond to the user you want to authenticate.
- The PAM configuration directory is /etc/pam.d.
- The PAM service name corresponds to the authentication method (mysql-unix or mysql-ldap in this discussion). To use a given PAM service, you must set up a PAM file with the same name in the PAM configuration directory (creating the file if it does not exist). In addition, you must name the PAM service in the authentication string of the CREATE USER statement for any account that authenticates using that PAM service.

The PAM authentication plugin checks at initialization time whether the AUTHENTICATION_PAM_LOG environment value is set in the server's startup environment. If so, the plugin enables logging of diagnostic messages to the standard output. Depending on how your server is started, the message might appear on the console or in the error log. These messages can be helpful for debugging PAMrelated issues that occur when the plugin performs authentication. For more information, see PAM Authentication Debugging.

\section*{PAM Unix Password Authentication without Proxy Users}

This authentication scenario uses PAM to check external users defined in terms of operating system user names and Unix passwords, without proxying. Every such external user permitted to connect to MySQL Server should have a matching MySQL account that is defined to use PAM authentication through traditional Unix password store.

\section*{Note}

Traditional Unix passwords are checked using the /etc/shadow file. For information regarding possible issues related to this file, see PAM Authentication Access to Unix Password Store.
1. Verify that Unix authentication permits logins to the operating system with the user name antonio and password antonio_password.
2. Set up PAM to authenticate MySQL connections using traditional Unix passwords by creating a mysql-unix PAM service file named /etc/pam.d/mysql-unix. The file contents are system dependent, so check existing login-related files in the /etc/pam.d directory to see what they look like. On Linux, the mysql-unix file might look like this:
```
#%PAM-1.0
auth include password-auth
account include password-auth
```


For macOS, use login rather than password-auth.
The PAM file format might differ on some systems. For example, on Ubuntu and other Debianbased systems, use these file contents instead:
```
@include common-auth
@include common-account
@include common-session-noninteractive
```

3. Create a MySQL account with the same user name as the operating system user name and define it to authenticate using the PAM plugin and the mysql-unix PAM service:
```
CREATE USER 'antonio'@'localhost'
    IDENTIFIED WITH authentication_pam
    AS 'mysql-unix';
GRANT ALL PRIVILEGES
    ON mydb.*
    TO 'antonio'@'localhost';
```


Here, the authentication string contains only the PAM service name, mysql-unix, which authenticates Unix passwords.
4. Use the mysql command-line client to connect to the MySQL server as antonio. For example:
```
$> mysql --user=antonio --password --enable-cleartext-plugin
Enter password: antonio_password
```


The server should permit the connection and the following query returns output as shown:
```
mysql> SELECT USER(), CURRENT_USER(), @@proxy_user;
+--------------------+--------------------+--------------+
| USER() | CURRENT_USER() | @@proxy_user |
+--------------------+-------------------+--------------+
| antonio@localhost | antonio@localhost | NULL |
+--------------------+-------------------+-------------+
```


This demonstrates that the antonio operating system user is authenticated to have the privileges granted to the antonio MySQL user, and that no proxying has occurred.

> Note
> The client-side mysql_clear_password authentication plugin leaves the password untouched, so client programs send it to the MySQL server as cleartext. This enables the password to be passed as is to PAM. A cleartext password is necessary to use the server-side PAM library, but may be a security problem in some configurations. These measures minimize the risk:
> - To make inadvertent use of the mysql_clear_password plugin less likely, MySQL clients must explicitly enable it (for example, with the --enable-cleartext-plugin option). See Section 8.4.1.4, "Client-Side Cleartext Pluggable Authentication".
> - To avoid password exposure with the mysql_clear_password plugin enabled, MySQL clients should connect to the MySQL server using an encrypted connection. See Section 8.3.1, "Configuring MySQL to Use Encrypted Connections".

\section*{PAM LDAP Authentication without Proxy Users}

This authentication scenario uses PAM to check external users defined in terms of operating system user names and LDAP passwords, without proxying. Every such external user permitted to connect to MySQL Server should have a matching MySQL account that is defined to use PAM authentication through LDAP.

To use PAM LDAP pluggable authentication for MySQL, these prerequisites must be satisfied:
- An LDAP server must be available for the PAM LDAP service to communicate with.
- Each LDAP user to be authenticated by MySQL must be present in the directory managed by the LDAP server.

\begin{figure}
\includegraphics[alt={},max width=\textwidth]{https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1311.jpg?height=213&width=266&top_left_y=2234&top_left_x=367}
\captionsetup{labelformat=empty}
\caption{Note
Another way to use LDAP for MySQL user authentication is to use the LDAP-specific authentication plugins. See Section 8.4.1.7, "LDAP Pluggable Authentication".}
\end{figure}

Configure MySQL for PAM LDAP authentication as follows:
1. Verify that Unix authentication permits logins to the operating system with the user name antonio and password antonio_password.
2. Set up PAM to authenticate MySQL connections using LDAP by creating a mysql-ldap PAM service file named /etc/pam.d/mysql-ldap. The file contents are system dependent, so check existing login-related files in the /etc/pam.d directory to see what they look like. On Linux, the mysql-ldap file might look like this:
```
#%PAM-1.0
auth required pam_ldap.so
account required pam_ldap.so
```


If PAM object files have a suffix different from . so on your system, substitute the correct suffix.
The PAM file format might differ on some systems.
3. Create a MySQL account with the same user name as the operating system user name and define it to authenticate using the PAM plugin and the mysql-ldap PAM service:
```
CREATE USER 'antonio'@'localhost'
    IDENTIFIED WITH authentication_pam
    AS 'mysql-ldap';
GRANT ALL PRIVILEGES
    ON mydb.*
    TO 'antonio'@'localhost';
```


Here, the authentication string contains only the PAM service name, mysql-ldap, which authenticates using LDAP.
4. Connecting to the server is the same as described in PAM Unix Password Authentication without Proxy Users.

\section*{PAM Unix Password Authentication with Proxy Users and Group Mapping}

The authentication scheme described here uses proxying and PAM group mapping to map connecting MySQL users who authenticate using PAM onto other MySQL accounts that define different sets of privileges. Users do not connect directly through the accounts that define the privileges. Instead, they connect through a default proxy account authenticated using PAM, such that all the external users are mapped to the MySQL accounts that hold the privileges. Any user who connects using the proxy account is mapped to one of those MySQL accounts, the privileges for which determine the database operations permitted to the external user.

The procedure shown here uses Unix password authentication. To use LDAP instead, see the early steps of PAM LDAP Authentication without Proxy Users.

\section*{Note}

Traditional Unix passwords are checked using the /etc/shadow file. For information regarding possible issues related to this file, see PAM Authentication Access to Unix Password Store.
1. Verify that Unix authentication permits logins to the operating system with the user name antonio and password antonio_password.
2. Verify that antonio is a member of the root or users PAM group.
3. Set up PAM to authenticate the mysql-unix PAM service through operating system users by creating a file named /etc/pam.d/mysql-unix. The file contents are system dependent, so check existing login-related files in the /etc/pam.d directory to see what they look like. On Linux, the mysql-unix file might look like this:
```
#%PAM-1.0
auth include password-auth
account include password-auth
```


For macOS, use login rather than password-auth.

The PAM file format might differ on some systems. For example, on Ubuntu and other Debianbased systems, use these file contents instead:
```
@include common-auth
@include common-account
@include common-session-noninteractive
```

4. Create a default proxy user ( ' ' @ ' ' ) that maps external PAM users to the proxied accounts:
```
CREATE USER ''@''
    IDENTIFIED WITH authentication_pam
    AS 'mysql-unix, root=developer, users=data_entry';
```


Here, the authentication string contains the PAM service name, mysql-unix, which authenticates Unix passwords. The authentication string also maps external users in the root and users PAM groups to the developer and data_entry MySQL user names, respectively.

The PAM group mapping list following the PAM service name is required when you set up proxy users. Otherwise, the plugin cannot tell how to perform mapping from external user names to the proper proxied MySQL user names.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1313.jpg?height=103&width=100&top_left_y=1037&top_left_x=424)

Note
If your MySQL installation has anonymous users, they might conflict with the default proxy user. For more information about this issue, and ways of dealing with it, see Default Proxy User and Anonymous User Conflicts.
5. Create the proxied accounts and grant to each one the privileges it should have:
```
CREATE USER 'developer'@'localhost'
    IDENTIFIED WITH mysql_no_login;
CREATE USER 'data_entry'@'localhost'
    IDENTIFIED WITH mysql_no_login;
GRANT ALL PRIVILEGES
    ON mydevdb.*
    TO 'developer'@'localhost';
GRANT ALL PRIVILEGES
    ON mydb.*
    TO 'data_entry'@'localhost';
```


The proxied accounts use the mysql_no_login authentication plugin to prevent clients from using the accounts to log in directly to the MySQL server. Instead, users who authenticate using PAM are expected to use the developer or data_entry account by proxy based on their PAM group. (This assumes that the plugin is installed. For instructions, see Section 8.4.1.9, "No-Login Pluggable Authentication".) For alternative methods of protecting proxied accounts against direct use, see Preventing Direct Login to Proxied Accounts.
6. Grant to the proxy account the PROXY privilege for each proxied account:
```
GRANT PROXY
    ON 'developer'@'localhost'
    TO ''@'';
GRANT PROXY
    ON 'data_entry'@'localhost'
    TO ''@'';
```

7. Use the mysql command-line client to connect to the MySQL server as antonio.
```
$> mysql --user=antonio --password --enable-cleartext-plugin
Enter password: antonio_password
```


The server authenticates the connection using the default ' '@' ' proxy account. The resulting privileges for antonio depend on which PAM groups antonio is a member of. If antonio is a member of the root PAM group, the PAM plugin maps root to the developer MySQL user
name and returns that name to the server. The server verifies that ' '@' ' has the PROXY privilege for developer and permits the connection. The following query returns output as shown:
```
mysql> SELECT USER(), CURRENT_USER(), @@proxy_user;
+--------------------+---------------------+--------------+
| USER() | CURRENT_USER() | @@proxy_user |
+--------------------+---------------------+--------------+
| antonio@localhost | developer@localhost | ''@'' |
+--------------------+---------------------+--------------+
```


This demonstrates that the antonio operating system user is authenticated to have the privileges granted to the developer MySQL user, and that proxying occurs through the default proxy account.

If antonio is not a member of the root PAM group but is a member of the users PAM group, a similar process occurs, but the plugin maps user PAM group membership to the data_entry MySQL user name and returns that name to the server:
```
mysql> SELECT USER(), CURRENT_USER(), @@proxy_user;
+--------------------+----------------------+--------------+
| USER() | CURRENT_USER() | @@proxy_user |
+--------------------+----------------------+--------------+
| antonio@localhost | data_entry@localhost | ''@'' |
+--------------------+----------------------+-------------+
```


This demonstrates that the antonio operating system user is authenticated to have the privileges of the data_entry MySQL user, and that proxying occurs through the default proxy account.

\section*{Note}

The client-side mysql_clear_password authentication plugin leaves the password untouched, so client programs send it to the MySQL server as cleartext. This enables the password to be passed as is to PAM. A cleartext password is necessary to use the server-side PAM library, but may be a security problem in some configurations. These measures minimize the risk:
- To make inadvertent use of the mysql_clear_password plugin less likely, MySQL clients must explicitly enable it (for example, with the --enable-cleartext-plugin option). See Section 8.4.1.4, "Client-Side Cleartext Pluggable Authentication".
- To avoid password exposure with the mysql_clear_password plugin enabled, MySQL clients should connect to the MySQL server using an encrypted connection. See Section 8.3.1, "Configuring MySQL to Use Encrypted Connections".

\section*{PAM Authentication Access to Unix Password Store}

On some systems, Unix authentication uses a password store such as /etc/shadow, a file that typically has restricted access permissions. This can cause MySQL PAM-based authentication to fail. Unfortunately, the PAM implementation does not permit distinguishing "password could not be checked" (due, for example, to inability to read /etc/shadow) from "password does not match." If you are using Unix password store for PAM authentication, you may be able to enable access to it from MySQL using one of the following methods:
- Assuming that the MySQL server is run from the mysql operating system account, put that account in the shadow group that has /etc/shadow access:
1. Create a shadow group in /etc/group.
2. Add the mysql operating system user to the shadow group in /etc/group.
3. Assign / etc/group to the shadow group and enable the group read permission:
```
chgrp shadow /etc/shadow
chmod g+r /etc/shadow
```

4. Restart the MySQL server.
- If you are using the pam_unix module and the unix_chkpwd utility, enable password store access as follows:
```
chmod u-s /usr/sbin/unix_chkpwd
setcap cap_dac_read_search+ep /usr/sbin/unix_chkpwd
```


Adjust the path to unix_chkpwd as necessary for your platform.

\section*{PAM Authentication Debugging}

The PAM authentication plugin checks at initialization time whether the AUTHENTICATION_PAM_LOG environment value is set. If so, the plugin enables logging of diagnostic messages to the standard output. These messages may be helpful for debugging PAM-related issues that occur when the plugin performs authentication.

Setting AUTHENTICATION_PAM_LOG=1 (or some other arbitrary value) does not include any passwords. If you wish to include passwords in these messages, set AUTHENTICATION_PAM_LOG=PAM_LOG_WITH_SECRET_INFO.

Some messages include reference to PAM plugin source files and line numbers, which enables plugin actions to be tied more closely to the location in the code where they occur.

Another technique for debugging connection failures and determining what is happening during connection attempts is to configure PAM authentication to permit all connections, then check the system log files. This technique should be used only on a temporary basis, and not on a production server.

Configure a PAM service file named /etc/pam.d/mysql-any-password with these contents (the format may differ on some systems):
```
#%PAM-1.0
auth required pam_permit.so
account required pam_permit.so
```


Create an account that uses the PAM plugin and names the mysql-any-password PAM service:
```
CREATE USER 'testuser'@'localhost'
    IDENTIFIED WITH authentication_pam
    AS 'mysql-any-password';
```


The mysql-any-password service file causes any authentication attempt to return true, even for incorrect passwords. If an authentication attempt fails, that tells you the configuration problem is on the MySQL side. Otherwise, the problem is on the operating system/PAM side. To see what might be happening, check system log files such as /var/log/secure, /var/log/audit.log, /var/log/ syslog, or /var/log/messages.

After determining what the problem is, remove the mysql-any-password PAM service file to disable any-password access.

\subsection*{8.4.1.6 Windows Pluggable Authentication}
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1315.jpg?height=97&width=95&top_left_y=2339&top_left_x=372)

MySQL Enterprise Edition for Windows supports an authentication method that performs external authentication on Windows, enabling MySQL Server to use native Windows services to authenticate
client connections. Users who have logged in to Windows can connect from MySQL client programs to the server based on the information in their environment without specifying an additional password.

The client and server exchange data packets in the authentication handshake. As a result of this exchange, the server creates a security context object that represents the identity of the client in the Windows OS. This identity includes the name of the client account. Windows pluggable authentication uses the identity of the client to check whether it is a given account or a member of a group. By default, negotiation uses Kerberos to authenticate, then NTLM if Kerberos is unavailable.

Windows pluggable authentication provides these capabilities:
- External authentication: Windows authentication enables MySQL Server to accept connections from users defined outside the MySQL grant tables who have logged in to Windows.
- Proxy user support: Windows authentication can return to MySQL a user name different from the external user name passed by the client program. This means that the plugin can return the MySQL user that defines the privileges the external Windows-authenticated user should have. For example, a Windows user named joe can connect and have the privileges of a MySQL user named developer.

The following table shows the plugin and library file names. The file must be located in the directory named by the plugin_dir system variable.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.19 Plugin and Library Names for Windows Authentication}
\begin{tabular}{|l|l|}
\hline Plugin or File & Plugin or File Name \\
\hline Server-side plugin & authentication_windows \\
\hline Client-side plugin & authentication_windows_client \\
\hline Library file & authentication_windows.dll \\
\hline
\end{tabular}
\end{table}

The library file includes only the server-side plugin. The client-side plugin is built into the libmysqlclient client library.

The server-side Windows authentication plugin is included only in MySQL Enterprise Edition. It is not included in MySQL community distributions. The client-side plugin is included in all distributions, including community distributions. This enables clients from any distribution to connect to a server that has the server-side plugin loaded.

The following sections provide installation and usage information specific to Windows pluggable authentication:
- Installing Windows Pluggable Authentication
- Uninstalling Windows Pluggable Authentication
- Using Windows Pluggable Authentication

For general information about pluggable authentication in MySQL, see Section 8.2.17, "Pluggable Authentication". For proxy user information, see Section 8.2.19, "Proxy Users".

\section*{Installing Windows Pluggable Authentication}

This section describes how to install the server-side Windows authentication plugin. For general information about installing plugins, see Section 7.6.1, "Installing and Uninstalling Plugins".

To be usable by the server, the plugin library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup.

To load the plugin at server startup, use the --plugin-load-add option to name the library file that contains it. With this plugin-loading method, the option must be given each time the server starts. For example, put these lines in the server my. cnf file:
```
[mysqld]
plugin-load-add=authentication_windows.dll
```


After modifying my.cnf, restart the server to cause the new settings to take effect.
Alternatively, to load the plugin at runtime, use this statement:
INSTALL PLUGIN authentication_windows SONAME 'authentication_windows.dll';
INSTALL PLUGIN loads the plugin immediately, and also registers it in the mysql.plugins system table to cause the server to load it for each subsequent normal startup without the need for - -plugin-load-add.

To verify plugin installation, examine the Information Schema PLUGINS table or use the SHOW PLUGINS statement (see Section 7.6.2, "Obtaining Server Plugin Information"). For example:
```
mysql> SELECT PLUGIN_NAME, PLUGIN_STATUS
    FROM INFORMATION_SCHEMA.PLUGINS
    WHERE PLUGIN_NAME LIKE '%windows%';
+--------------------------+---------------+
| PLUGIN_NAME | PLUGIN_STATUS |
+--------------------------+---------------+
| authentication_windows | ACTIVE |
+-------------------------+---------------+
```


If the plugin fails to initialize, check the server error log for diagnostic messages.
To associate MySQL accounts with the Windows authentication plugin, see Using Windows Pluggable Authentication. Additional plugin control is provided by the authentication_windows_use_principal_name and authentication_windows_log_level system variables. See Section 7.1.8, "Server System Variables".

\section*{Uninstalling Windows Pluggable Authentication}

The method used to uninstall the Windows authentication plugin depends on how you installed it:
- If you installed the plugin at server startup using a --plugin-load-add option, restart the server without the option.
- If you installed the plugin at runtime using an INSTALL PLUGIN statement, it remains installed across server restarts. To uninstall it, use UNINSTALL PLUGIN:
```
UNINSTALL PLUGIN authentication_windows;
```


In addition, remove any startup options that set Windows plugin-related system variables.

\section*{Using Windows Pluggable Authentication}

The Windows authentication plugin supports the use of MySQL accounts such that users who have logged in to Windows can connect to the MySQL server without having to specify an additional password. It is assumed that the server is running with the server-side plugin enabled, as described in Installing Windows Pluggable Authentication. Once the DBA has enabled the server-side plugin and set up accounts to use it, clients can connect using those accounts with no other setup required on their part.

To refer to the Windows authentication plugin in the IDENTIFIED WITH clause of a CREATE USER statement, use the name authentication_windows. Suppose that the Windows users Rafal and Tasha should be permitted to connect to MySQL, as well as any users in the Administrators or Power Users group. To set this up, create a MySQL account named sql_admin that uses the Windows plugin for authentication:
```
CREATE USER sql_admin
    IDENTIFIED WITH authentication_windows
```

```
AS 'Rafal, Tasha, Administrators, "Power Users"';
```


The plugin name is authentication_windows. The string following the AS keyword is the authentication string. It specifies that the Windows users named Rafal or Tasha are permitted to authenticate to the server as the MySQL user sql_admin, as are any Windows users in the Administrators or Power Users group. The latter group name contains a space, so it must be quoted with double quote characters.

After you create the sql_admin account, a user who has logged in to Windows can attempt to connect to the server using that account:
```
C:\> mysql --user=sql_admin
```


No password is required here. The authentication_windows plugin uses the Windows security API to check which Windows user is connecting. If that user is named Rafal or Tasha, or is a member of the Administrators or Power Users group, the server grants access and the client is authenticated as sql_admin and has whatever privileges are granted to the sql_admin account. Otherwise, the server denies access.

Authentication string syntax for the Windows authentication plugin follows these rules:
- The string consists of one or more user mappings separated by commas.
- Each user mapping associates a Windows user or group name with a MySQL user name:
```
win_user_or_group_name=mysql_user_name
win_user_or_group_name
```


For the latter syntax, with no mysql_user_name value given, the implicit value is the MySQL user created by the CREATE USER statement. Thus, these statements are equivalent:
```
CREATE USER sql_admin
    IDENTIFIED WITH authentication_windows
    AS 'Rafal, Tasha, Administrators, "Power Users"';
CREATE USER sql_admin
    IDENTIFIED WITH authentication_windows
    AS 'Rafal=sql_admin, Tasha=sql_admin, Administrators=sql_admin,
        "Power Users"=sql_admin';
```

- Each backslash character ( \\) in a value must be doubled because backslash is the escape character in MySQL strings.
- Leading and trailing spaces not inside double quotation marks are ignored.
- Unquoted win_user_or_group_name and mysql_user_name values can contain anything except equal sign, comma, or space.
- If a win_user_or_group_name and or mysql_user_name value is quoted with double quotation marks, everything between the quotation marks is part of the value. This is necessary, for example, if the name contains space characters. All characters within double quotes are legal except double quotation mark and backslash. To include either character, escape it with a backslash.
- win_user_or_group_name values use conventional syntax for Windows principals, either local or in a domain. Examples (note the doubling of backslashes):
```
domain\\user
. \\user
domain\\group
. \\group
BUILTIN\\WellKnownGroup
```


When invoked by the server to authenticate a client, the plugin scans the authentication string left to right for a user or group match to the Windows user. If there is a match, the plugin returns the corresponding mysql_user_name to the MySQL server. If there is no match, authentication fails.

A user name match takes preference over a group name match. Suppose that the Windows user named win_user is a member of win_group and the authentication string looks like this:
'win_group = sql_user1, win_user = sql_user2'
When win_user connects to the MySQL server, there is a match both to win_group and to win_user. The plugin authenticates the user as sql_user2 because the more-specific user match takes precedence over the group match, even though the group is listed first in the authentication string.

Windows authentication always works for connections from the same computer on which the server is running. For cross-computer connections, both computers must be registered with Microsoft Active Directory. If they are in the same Windows domain, it is unnecessary to specify a domain name. It is also possible to permit connections from a different domain, as in this example:

CREATE USER sql_accounting
IDENTIFIED WITH authentication_windows
AS 'SomeDomain\\Accounting';
Here SomeDomain is the name of the other domain. The backslash character is doubled because it is the MySQL escape character within strings.

MySQL supports the concept of proxy users whereby a client can connect and authenticate to the MySQL server using one account but while connected has the privileges of another account (see Section 8.2.19, "Proxy Users"). Suppose that you want Windows users to connect using a single user name but be mapped based on their Windows user and group names onto specific MySQL accounts as follows:
- The local_user and MyDomain\domain_user local and domain Windows users should map to the local_wlad MySQL account.
- Users in the MyDomain\Developers domain group should map to the local_dev MySQL account.
- Local machine administrators should map to the local_admin MySQL account.

To set this up, create a proxy account for Windows users to connect to, and configure this account so that users and groups map to the appropriate MySQL accounts (local_wlad, local_dev, local_admin). In addition, grant the MySQL accounts the privileges appropriate to the operations they need to perform. The following instructions use win_proxy as the proxy account, and local_wlad, local_dev, and local_admin as the proxied accounts.
1. Create the proxy MySQL account:

CREATE USER win_proxy
IDENTIFIED WITH authentication_windows
AS 'local_user = local_wlad,
MyDomain\\domain_user = local_wlad,
MyDomain\\Developers = local_dev,
BUILTIN\\Administrators = local_admin';
2. For proxying to work, the proxied accounts must exist, so create them:

CREATE USER local_wlad
IDENTIFIED WITH mysql_no_login;
CREATE USER local_dev
IDENTIFIED WITH mysql_no_login;
CREATE USER local_admin
IDENTIFIED WITH mysql_no_login;
The proxied accounts use the mysql_no_login authentication plugin to prevent clients from using the accounts to log in directly to the MySQL server. Instead, users who authenticate using Windows are expected to use the win_proxy proxy account. (This assumes that the plugin is installed. For instructions, see Section 8.4.1.9, "No-Login Pluggable Authentication".) For alternative methods of protecting proxied accounts against direct use, see Preventing Direct Login to Proxied Accounts.

You should also execute GRANT statements (not shown) that grant each proxied account the privileges required for MySQL access.
3. Grant to the proxy account the PROXY privilege for each proxied account:
```
GRANT PROXY ON local_wlad TO win_proxy;
GRANT PROXY ON local_dev TO win_proxy;
GRANT PROXY ON local_admin TO win_proxy;
```


Now the Windows users local_user and MyDomain\domain_user can connect to the MySQL server as win_proxy and when authenticated have the privileges of the account given in the authentication string (in this case, local_wlad). A user in the MyDomain\Developers group who connects as win_proxy has the privileges of the local_dev account. A user in the BUILTIN \Administrators group has the privileges of the local_admin account.

To configure authentication so that all Windows users who do not have their own MySQL account go through a proxy account, substitute the default proxy account ( ' ' @ ' ' ) for win_proxy in the preceding instructions. For information about default proxy accounts, see Section 8.2.19, "Proxy Users".
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1320.jpg?height=122&width=99&top_left_y=973&top_left_x=306)

> Note
> If your MySQL installation has anonymous users, they might conflict with the default proxy user. For more information about this issue, and ways of dealing with it, see Default Proxy User and Anonymous User Conflicts.

To use the Windows authentication plugin with Connector/NET connection strings in Connector/NET 8.4 and higher, see Connector/NET Authentication.

\subsection*{8.4.1.7 LDAP Pluggable Authentication}

|

\section*{Note}

LDAP pluggable authentication is an extension included in MySQL Enterprise Edition, a commercial product. To learn more about commercial products, see https://www.mysql.com/products/.

MySQL Enterprise Edition supports an authentication method that enables MySQL Server to use LDAP (Lightweight Directory Access Protocol) to authenticate MySQL users by accessing directory services such as X.500. MySQL uses LDAP to fetch user, credential, and group information.

LDAP pluggable authentication provides these capabilities:
- External authentication: LDAP authentication enables MySQL Server to accept connections from users defined outside the MySQL grant tables in LDAP directories.
- Proxy user support: LDAP authentication can return to MySQL a user name different from the external user name passed by the client program, based on the LDAP groups the external user is a member of. This means that an LDAP plugin can return the MySQL user that defines the privileges the external LDAP-authenticated user should have. For example, an LDAP user named joe can connect and have the privileges of a MySQL user named developer, if the LDAP group for joe is developer.
- Security: Using TLS, connections to the LDAP server can be secure.

Server and client plugins are available for simple and SASL-based LDAP authentication. On Microsoft Windows, the server plugin for SASL-based LDAP authentication is not supported, but the client plugin is.

The following tables show the plugin and library file names for simple and SASL-based LDAP authentication. The file name suffix might differ on your system. The files must be located in the directory named by the plugin_dir system variable.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.20 Plugin and Library Names for Simple LDAP Authentication}
\begin{tabular}{|l|l|}
\hline Plugin or File & Plugin or File Name \\
\hline Server-side plugin name & authentication_ldap_simple \\
\hline Client-side plugin name & mysql_clear_password \\
\hline Library file name & authentication_ldap_simple.so \\
\hline
\end{tabular}
\end{table}

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.21 Plugin and Library Names for SASL-Based LDAP Authentication}
\begin{tabular}{|l|l|}
\hline Plugin or File & Plugin or File Name \\
\hline Server-side plugin name & authentication_ldap_sasl \\
\hline Client-side plugin name & authentication_ldap_sasl_client \\
\hline Library file names & authentication_ldap_sasl.so, authentication_ldap_sasl_client.so \\
\hline
\end{tabular}
\end{table}

The library files include only the authentication_ldap_ $X X X$ authentication plugins. The client-side mysql_clear_password plugin is built into the libmysqlclient client library.

Each server-side LDAP plugin works with a specific client-side plugin:
- The server-side authentication_ldap_simple plugin performs simple LDAP authentication. For connections by accounts that use this plugin, client programs use the client-side mysql_clear_password plugin, which sends the password to the server as cleartext. No password hashing or encryption is used, so a secure connection between the MySQL client and server is recommended to prevent password exposure.
- The server-side authentication_ldap_sasl plugin performs SASL-based LDAP authentication. For connections by accounts that use this plugin, client programs use the clientside authentication_ldap_sasl_client plugin. The client-side and server-side SASL LDAP plugins use SASL messages for secure transmission of credentials within the LDAP protocol, to avoid sending the cleartext password between the MySQL client and server.

On Microsoft Windows platforms, both the server plugin and the client plugin are supported for SASL-based LDAP authentication.

The server-side LDAP authentication plugins are included only in MySQL Enterprise Edition. They are not included in MySQL community distributions. The client-side SASL LDAP plugin is included in all distributions, including community distributions, and, as mentioned previously, the client-side mysql_clear_password plugin is built into the libmysqlclient client library, which also is included in all distributions. This enables clients from any distribution to connect to a server that has the appropriate server-side plugin loaded.

The following sections provide installation and usage information specific to LDAP pluggable authentication:
- Prerequisites for LDAP Pluggable Authentication
- How LDAP Authentication of MySQL Users Works
- Installing LDAP Pluggable Authentication
- Uninstalling LDAP Pluggable Authentication
- LDAP Pluggable Authentication and Idap.conf
- Setting Timeouts for LDAP Pluggable Authentication
- Using LDAP Pluggable Authentication
- Simple LDAP Authentication (Without Proxying)
- SASL-Based LDAP Authentication (Without Proxying)
- LDAP Authentication with Proxying
- LDAP Authentication Group Preference and Mapping Specification
- LDAP Authentication User DN Suffixes
- LDAP Authentication Methods
- The GSSAPI/Kerberos Authentication Method
- LDAP Search Referral

For general information about pluggable authentication in MySQL, see Section 8.2.17, "Pluggable Authentication". For information about the mysql_clear_password plugin, see Section 8.4.1.4, "Client-Side Cleartext Pluggable Authentication". For proxy user information, see Section 8.2.19, "Proxy Users".

\section*{Note}

If your system supports PAM and permits LDAP as a PAM authentication method, another way to use LDAP for MySQL user authentication is to use the server-side authentication_pam plugin. See Section 8.4.1.5, "PAM Pluggable Authentication".

\section*{Prerequisites for LDAP Pluggable Authentication}

To use LDAP pluggable authentication for MySQL, these prerequisites must be satisfied:
- An LDAP server must be available for the LDAP authentication plugins to communicate with.
- LDAP users to be authenticated by MySQL must be present in the directory managed by the LDAP server.
- An LDAP client library must be available on systems where the server-side authentication_ldap_sasl or authentication_ldap_simple plugin is used. Currently, supported libraries are the Windows native LDAP library, or the OpenLDAP library on non-Windows systems.
- To use SASL-based LDAP authentication:
- The LDAP server must be configured to communicate with a SASL server.
- A SASL client library must be available on systems where the client-side authentication_ldap_sasl_client plugin is used. Currently, the only supported library is the Cyrus SASL library.
- To use a particular SASL authentication method, any other services required by that method must be available. For example, to use GSSAPI/Kerberos, a GSSAPI library and Kerberos services must be available.

\section*{How LDAP Authentication of MySQL Users Works}

This section provides an overview of how MySQL and LDAP work together to authenticate MySQL users. For examples showing how to set up MySQL accounts to use specific LDAP authentication plugins, see Using LDAP Pluggable Authentication. For information about authentication methods available to the LDAP plugins, see LDAP Authentication Methods.

The client connects to the MySQL server, providing the MySQL client user name and a password:
- For simple LDAP authentication, the client-side and server-side plugins communicate the password as cleartext. A secure connection between the MySQL client and server is recommended to prevent password exposure.
- For SASL-based LDAP authentication, the client-side and server-side plugins avoid sending the cleartext password between the MySQL client and server. For example, the plugins might use SASL messages for secure transmission of credentials within the LDAP protocol. For the GSSAPI authentication method, the client-side and server-side plugins communicate securely using Kerberos without using LDAP messages directly.

If the client user name and host name match no MySQL account, the connection is rejected.
If there is a matching MySQL account, authentication against LDAP occurs. The LDAP server looks for an entry matching the user and authenticates the entry against the LDAP password:
- If the MySQL account names an LDAP user distinguished name (DN), LDAP authentication uses that value and the LDAP password provided by the client. (To associate an LDAP user DN with a MySQL account, include a BY clause that specifies an authentication string in the CREATE USER statement that creates the account.)
- If the MySQL account names no LDAP user DN, LDAP authentication uses the user name and LDAP password provided by the client. In this case, the authentication plugin first binds to the LDAP server using the root DN and password as credentials to find the user DN based on the client user name, then authenticates that user DN against the LDAP password. This bind using the root credentials fails if the root DN and password are set to incorrect values, or are empty (not set) and the LDAP server does not permit anonymous connections.

If the LDAP server finds no match or multiple matches, authentication fails and the client connection is rejected.

If the LDAP server finds a single match, LDAP authentication succeeds (assuming that the password is correct), the LDAP server returns the LDAP entry, and the authentication plugin determines the name of the authenticated user based on that entry:
- If the LDAP entry has a group attribute (by default, the cn attribute), the plugin returns its value as the authenticated user name.
- If the LDAP entry has no group attribute, the authentication plugin returns the client user name as the authenticated user name.

The MySQL server compares the client user name with the authenticated user name to determine whether proxying occurs for the client session:
- If the names are the same, no proxying occurs: The MySQL account matching the client user name is used for privilege checking.
- If the names differ, proxying occurs: MySQL looks for an account matching the authenticated user name. That account becomes the proxied user, which is used for privilege checking. The MySQL account that matched the client user name is treated as the external proxy user.

\section*{Installing LDAP Pluggable Authentication}

This section describes how to install the server-side LDAP authentication plugins. For general information about installing plugins, see Section 7.6.1, "Installing and Uninstalling Plugins".

To be usable by the server, the plugin library files must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup.

The server-side plugin library file base names are authentication_ldap_simple and authentication_ldap_sasl. The file name suffix differs per platform (for example, . so for Unix and Unix-like systems, . dll for Windows).

\section*{Note}

On Microsoft Windows, the server plugin for SASL-based LDAP authentication is not supported, but the client plugin is supported. On other platforms, both the server and client plugins are supported.

To load the plugins at server startup, use--plugin-load-add options to name the library files that contain them. With this plugin-loading method, the options must be given each time the server starts. Also, specify values for any plugin-provided system variables you wish to configure.

Each server-side LDAP plugin exposes a set of system variables that enable its operation to be configured. Setting most of these is optional, but you must set the variables that specify the LDAP server host (so the plugin knows where to connect) and base distinguished name for LDAP bind operations (to limit the scope of searches and obtain faster searches). For details about all LDAP system variables, see Section 8.4.1.13, "Pluggable Authentication System Variables".

To load the plugins and set the LDAP server host and base distinguished name for LDAP bind operations, put lines such as these in your my.cnf file, adjusting the .so suffix for your platform as necessary:
```
[mysqld]
plugin-load-add=authentication_ldap_simple.so
authentication_ldap_simple_server_host=127.0.0.1
authentication_ldap_simple_bind_base_dn="dc=example,dc=com"
plugin-load-add=authentication_ldap_sasl.so
authentication_ldap_sasl_server_host=127.0.0.1
authentication_ldap_sasl_bind_base_dn="dc=example,dc=com"
```


After modifying my.cnf, restart the server to cause the new settings to take effect.
Alternatively, to load the plugins at runtime, use these statements, adjusting the . so suffix for your platform as necessary:
```
INSTALL PLUGIN authentication_ldap_simple
    SONAME 'authentication_ldap_simple.so';
INSTALL PLUGIN authentication_ldap_sasl
    SONAME 'authentication_ldap_sasl.so';
```


INSTALL PLUGIN loads the plugin immediately, and also registers it in the mysql.plugins system table to cause the server to load it for each subsequent normal startup without the need for - -plugin-load-add.

After installing the plugins at runtime, the system variables that they expose become available and you can add settings for them to your my.cnf file to configure the plugins for subsequent restarts. For example:
```
[mysqld]
authentication_ldap_simple_server_host=127.0.0.1
authentication_ldap_simple_bind_base_dn="dc=example,dc=com"
authentication_ldap_sasl_server_host=127.0.0.1
authentication_ldap_sasl_bind_base_dn="dc=example,dc=com"
```


After modifying my.cnf, restart the server to cause the new settings to take effect.
To set and persist each value at runtime rather than at startup, use these statements:
```
SET PERSIST authentication_ldap_simple_server_host='127.0.0.1';
SET PERSIST authentication_ldap_simple_bind_base_dn='dc=example,dc=com';
SET PERSIST authentication_ldap_sasl_server_host='127.0.0.1';
SET PERSIST authentication_ldap_sasl_bind_base_dn='dc=example,dc=com';
```


SET PERSIST sets a value for the running MySQL instance. It also saves the value, causing it to carry over to subsequent server restarts. To change a value for the running MySQL instance without having it carry over to subsequent restarts, use the GLOBAL keyword rather than PERSIST. See Section 15.7.6.1, "SET Syntax for Variable Assignment".

To verify plugin installation, examine the Information Schema PLUGINS table or use the SHOW PLUGINS statement (see Section 7.6.2, "Obtaining Server Plugin Information"). For example:
```
mysql> SELECT PLUGIN_NAME, PLUGIN_STATUS
    FROM INFORMATION_SCHEMA.PLUGINS
    WHERE PLUGIN_NAME LIKE '%ldap%';
+------------------------------+---------------+
| PLUGIN_NAME | PLUGIN_STATUS
+------------------------------+---------------+
| authentication_ldap_sasl | ACTIVE
| authentication_ldap_simple | ACTIVE
```


If a plugin fails to initialize, check the server error log for diagnostic messages.
To associate MySQL accounts with an LDAP plugin, see Using LDAP Pluggable Authentication.

\section*{Additional Notes for SELinux}

On systems running EL6 or EL that have SELinux enabled, changes to the SELinux policy are required to enable the MySQL LDAP plugins to communicate with the LDAP service:
1. Create a file mysqlldap. te with these contents:
```
module mysqlldap 1.0;
require {
    type ldap_port_t;
    type mysqld_t;
    class tcp_socket name_connect;
}
#===========================
allow mysqld_t ldap_port_t:tcp_socket name_connect;
```

2. Compile the security policy module into a binary representation:
```
checkmodule -M -m mysqlldap.te -o mysqlldap.mod
```

3. Create an SELinux policy module package:
```
semodule_package -m mysqlldap.mod -o mysqlldap.pp
```

4. Install the module package:
```
semodule -i mysqlldap.pp
```

5. When the SELinux policy changes have been made, restart the MySQL server:
```
service mysqld restart
```


\section*{Uninstalling LDAP Pluggable Authentication}

The method used to uninstall the LDAP authentication plugins depends on how you installed them:
- If you installed the plugins at server startup using --plugin-load-add options, restart the server without those options.
- If you installed the plugins at runtime using INSTALL PLUGIN, they remain installed across server restarts. To uninstall them, use UNINSTALL PLUGIN:
```
UNINSTALL PLUGIN authentication_ldap_simple;
UNINSTALL PLUGIN authentication_ldap_sasl;
```


In addition, remove from your my. cnf file any startup options that set LDAP plugin-related system variables. If you used SET PERSIST to persist LDAP system variables, use RESET PERSIST to remove the settings.

\section*{LDAP Pluggable Authentication and Idap.conf}

For installations that use OpenLDAP, the ldap. conf file provides global defaults for LDAP clients. Options can be set in this file to affect LDAP clients, including the LDAP authentication plugins. OpenLDAP uses configuration options in this order of precedence:
- Configuration specified by the LDAP client.
- Configuration specified in the ldap.conf file. To disable use of this file, set the LDAPNOINIT environment variable.
- OpenLDAP library built-in defaults.

If the library defaults or ldap.conf values do not yield appropriate option values, an LDAP authentication plugin may be able to set related variables to affect the LDAP configuration directly. For example, LDAP plugins can override ldap. conf for parameters such as these:
- TLS configuration: System variables are available to enable TLS and control CA configuration, such as authentication_ldap_simple_tls and authentication_ldap_simple_ca_path for simple LDAP authentication, and authentication_ldap_sasl_tls and authentication_ldap_sasl_ca_path for SASL LDAP authentication.
- LDAP referral. See LDAP Search Referral.

For more information about ldap.conf consult the ldap.conf(5) man page.

\section*{Setting Timeouts for LDAP Pluggable Authentication}

For MySQL accounts to connect to a MySQL server using LDAP pluggable authentication, the LDAP server must be available and operational. The interaction between the MySQL and LDAP servers involves two steps. First, the MySQL server establishes a connection to the LDAP server over TCP. Second, the MySQL server sends an LDAP binding request over the connection to the LDAP server and waits for a reply before authenticating the account. If either step fails, the MySQL account cannot connect to the MySQL server.

Short-duration timeouts that supersede a host system's timeout values are applied to both the connection and response steps by default. In all cases, the account user receives notification that their attempt to connect to MySQL is denied if the timeout expires. Client-side and server-side logging can provide additional information. On the client side, set the following environmental variable to elevate the detail level and then restart MySQL client:

AUTHENTICATION_LDAP_CLIENT_LOG=5
export AUTHENTICATION_LDAP_CLIENT_LOG
The following system variables support default timeouts for SASL-based and simple LDAP authentication on Linux platforms only.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.22 System variables for SASL-based and simple LDAP Authentication}
\begin{tabular}{|l|l|}
\hline System Variable Name & Default Timeout Value \\
\hline authentication_ldap_sasl_connect_timeo & B0 seconds \\
\hline authentication_ldap_sasl_response_time & 30 tseconds \\
\hline authentication_ldap_simple_connect_tim & BOIseconds \\
\hline authentication_ldap_simple_response_ti & BOseconds \\
\hline
\end{tabular}
\end{table}

Timeout values for LDAP authentication are adjustable at server startup and at runtime. If you set a timeout to zero using one of these variables, you effectively disengage it and MySQL server reverts to using the host system's default timeout.

\section*{Note}

Under the following combination of conditions, the actual wait time of the authentication_ldap_sasl_connect_timeout setting doubles because (internally) the server must invoke the TCP connection twice:
- The LDAP server is offline.
- authentication_ldap_sasl_connect_timeout has a value greater than zero.
- Connection pooling is in use (specifically, the authentication_ldap_sasl_max_pool_size system variable has a value greater than zero, which enables pooling).

\section*{Using LDAP Pluggable Authentication}

This section describes how to enable MySQL accounts to connect to the MySQL server using LDAP pluggable authentication. It is assumed that the server is running with the appropriate server-side plugins enabled, as described in Installing LDAP Pluggable Authentication, and that the appropriate client-side plugins are available on the client host.

This section does not describe LDAP configuration or administration. You are assumed to be familiar with those topics.

The two server-side LDAP plugins each work with a specific client-side plugin:
- The server-side authentication_ldap_simple plugin performs simple LDAP authentication. For connections by accounts that use this plugin, client programs use the client-side mysql_clear_password plugin, which sends the password to the server as cleartext. No password hashing or encryption is used, so a secure connection between the MySQL client and server is recommended to prevent password exposure.
- The server-side authentication_ldap_sasl plugin performs SASL-based LDAP authentication. For connections by accounts that use this plugin, client programs use the clientside authentication_ldap_sasl_client plugin. The client-side and server-side SASL LDAP plugins use SASL messages for secure transmission of credentials within the LDAP protocol, to avoid sending the cleartext password between the MySQL client and server.

Overall requirements for LDAP authentication of MySQL users:
- There must be an LDAP directory entry for each user to be authenticated.
- There must be a MySQL user account that specifies a server-side LDAP authentication plugin and optionally names the associated LDAP user distinguished name (DN). (To associate an LDAP user DN with a MySQL account, include a BY clause in the CREATE USER statement that creates the account.) If an account names no LDAP string, LDAP authentication uses the user name specified by the client to find the LDAP entry.
- Client programs connect using the connection method appropriate for the server-side authentication plugin the MySQL account uses. For LDAP authentication, connections require the MySQL user name and LDAP password. In addition, for accounts that use the server-side authentication_ldap_simple plugin, invoke client programs with the --enable-cleartextplugin option to enable the client-side mysql_clear_password plugin.

The instructions here assume the following scenario:
- MySQL users betsy and boris authenticate to the LDAP entries for betsy_ldap and boris_ldap, respectively. (It is not necessary that the MySQL and LDAP user names differ. The use of different names in this discussion helps clarify whether an operation context is MySQL or LDAP.)
- LDAP entries use the uid attribute to specify user names. This may vary depending on LDAP server. Some LDAP servers use the cn attribute for user names rather than uid. To change the attribute, modify the authentication_ldap_simple_user_search_attr or authentication_ldap_sasl_user_search_attr system variable appropriately.
- These LDAP entries are available in the directory managed by the LDAP server, to provide distinguished name values that uniquely identify each user:
```
uid=betsy_ldap,ou=People,dc=example,dc=com
uid=boris_ldap,ou=People,dc=example,dc=com
```

- CREATE USER statements that create MySQL accounts name an LDAP user in the BY clause, to indicate which LDAP entry the MySQL account authenticates against.

The instructions for setting up an account that uses LDAP authentication depend on which server-side LDAP plugin is used. The following sections describe several usage scenarios.

\section*{Simple LDAP Authentication (Without Proxying)}

The procedure outlined in this section requires that authentication_ldap_simple_group_search_attr be set to an empty string, like this:

SET GLOBAL.authentication_ldap_simple_group_search_attr='';
Otherwise, proxying is used by default.
To set up a MySQL account for simple LDAP authentication, use a CREATE USER statement to specify the authentication_ldap_simple plugin, optionally including the LDAP user distinguished name (DN), as shown here:
```
CREATE USER user
    IDENTIFIED WITH authentication_ldap_simple
    [BY 'LDAP user DN'];
```


Suppose that MySQL user betsy has this entry in the LDAP directory:
```
uid=betsy_ldap,ou=People,dc=example,dc=com
```


Then the statement to create the MySQL account for betsy looks like this:
```
CREATE USER 'betsy'@'localhost'
    IDENTIFIED WITH authentication_ldap_simple
    AS 'uid=betsy_ldap,ou=People,dc=example,dc=com';
```


The authentication string specified in the BY clause does not include the LDAP password. That must be provided by the client user at connect time.

Clients connect to the MySQL server by providing the MySQL user name and LDAP password, and by enabling the client-side mysql_clear_password plugin:
```
$> mysql --user=betsy --password --enable-cleartext-plugin
Enter password: betsy_ldap_password
```


\section*{Note}

The client-side mysql_clear_password authentication plugin leaves the password untouched, so client programs send it to the MySQL server as cleartext. This enables the password to be passed as is to the LDAP server. A cleartext password is necessary to use the server-side LDAP library without SASL, but may be a security problem in some configurations. These measures minimize the risk:
- To make inadvertent use of the mysql_clear_password plugin less likely, MySQL clients must explicitly enable it (for example, with the --enable-
cleartext-plugin option). See Section 8.4.1.4, "Client-Side Cleartext Pluggable Authentication".
- To avoid password exposure with the mysql_clear_password plugin enabled, MySQL clients should connect to the MySQL server using an encrypted connection. See Section 8.3.1, "Configuring MySQL to Use Encrypted Connections".

The authentication process occurs as follows:
1. The client-side plugin sends betsy and betsy_password as the client user name and LDAP password to the MySQL server.
2. The connection attempt matches the 'betsy'@'localhost' account. The server-side LDAP plugin finds that this account has an authentication string of 'uid=betsy_ldap, ou=People,dc=example,dc=com ' to name the LDAP user DN. The plugin sends this string and the LDAP password to the LDAP server.
3. The LDAP server finds the LDAP entry for betsy_ldap and the password matches, so LDAP authentication succeeds.
4. The LDAP entry has no group attribute, so the server-side plugin returns the client user name (betsy) as the authenticated user. This is the same user name supplied by the client, so no proxying occurs and the client session uses the 'betsy'@'localhost' account for privilege checking.

Had the CREATE USER statement contained no BY clause to specify the betsy_ldap LDAP distinguished name, authentication attempts would use the user name provided by the client (in this case, betsy). In the absence of an LDAP entry for betsy, authentication would fail.

\section*{SASL-Based LDAP Authentication (Without Proxying)}

The procedure outlined in this section requires that authentication_ldap_sasl_group_search_attr be set to an empty string, like this:

SET GLOBAL.authentication_ldap_sasl_group_search_attr='';
Otherwise, proxying is used by default.
To set up a MySQL account for SALS LDAP authentication, use a CREATE USER statement to specify the authentication_ldap_sasl plugin, optionally including the LDAP user distinguished name (DN), as shown here:
```
CREATE USER user
    IDENTIFIED WITH authentication_ldap_sasl
    [BY 'LDAP user DN'];
```


Suppose that MySQL user boris has this entry in the LDAP directory:
```
uid=boris_ldap,ou=People,dc=example,dc=com
```


Then the statement to create the MySQL account for boris looks like this:
```
CREATE USER 'boris'@'localhost'
    IDENTIFIED WITH authentication_ldap_sasl
    AS 'uid=boris_ldap,ou=People,dc=example,dc=com';
```


The authentication string specified in the BY clause does not include the LDAP password. That must be provided by the client user at connect time.

Clients connect to the MySQL server by providing the MySQL user name and LDAP password:
```
$> mysql --user=boris --password
```


Enter password: boris_ldap_password
For the server-side authentication_ldap_sasl plugin, clients use the client-side authentication_ldap_sasl_client plugin. If a client program does not find the client-side plugin, specify a --plugin-dir option that names the directory where the plugin library file is installed.

The authentication process for boris is similar to that previously described for betsy with simple LDAP authentication, except that the client-side and server-side SASL LDAP plugins use SASL messages for secure transmission of credentials within the LDAP protocol, to avoid sending the cleartext password between the MySQL client and server.

\section*{LDAP Authentication with Proxying}

LDAP authentication plugins support proxying, enabling a user to connect to the MySQL server as one user but assume the privileges of a different user. This section describes basic LDAP plugin proxy support. The LDAP plugins also support specification of group preference and proxy user mapping; see LDAP Authentication Group Preference and Mapping Specification.

The proxying implementation described here is based on use of LDAP group attribute values to map connecting MySQL users who authenticate using LDAP onto other MySQL accounts that define different sets of privileges. Users do not connect directly through the accounts that define the privileges. Instead, they connect through a default proxy account authenticated with LDAP, such that all external logins are mapped to the proxied MySQL accounts that hold the privileges. Any user who connects using the proxy account is mapped to one of those proxied MySQL accounts, the privileges for which determine the database operations permitted to the external user.

The instructions here assume the following scenario:
- LDAP entries use the uid and cn attributes to specify user name and group values, respectively. To use different user and group attribute names, set the appropriate plugin-specific system variables:
- For the authentication_ldap_simple plugin: Set authentication_ldap_simple_user_search_attr and authentication_ldap_simple_group_search_attr.
- For the authentication_ldap_sasl plugin: Set authentication_ldap_sasl_user_search_attr and authentication_ldap_sasl_group_search_attr.
- These LDAP entries are available in the directory managed by the LDAP server, to provide distinguished name values that uniquely identify each user:
```
uid=basha,ou=People,dc=example,dc=com,cn=accounting
uid=basil,ou=People,dc=example,dc=com,cn=front_office
```


At connect time, the group attribute values become the authenticated user names, so they name the accounting and front_office proxied accounts.
- The examples assume use of SASL LDAP authentication. Make the appropriate adjustments for simple LDAP authentication.

Create the default proxy MySQL account:
```
CREATE USER ''@'%'
    IDENTIFIED WITH authentication_ldap_sasl;
```


The proxy account definition has no AS 'auth_string' clause to name an LDAP user DN. Thus:
- When a client connects, the client user name becomes the LDAP user name to search for.
- The matching LDAP entry is expected to include a group attribute naming the proxied MySQL account that defines the privileges the client should have.

\section*{Note}

If your MySQL installation has anonymous users, they might conflict with the default proxy user. For more information about this issue, and ways of dealing with it, see Default Proxy User and Anonymous User Conflicts.

Create the proxied accounts and grant to each one the privileges it should have:
```
CREATE USER 'accounting'@'localhost'
    IDENTIFIED WITH mysql_no_login;
CREATE USER 'front_office'@'localhost'
    IDENTIFIED WITH mysql_no_login;
GRANT ALL PRIVILEGES
    ON accountingdb.*
    TO 'accounting'@'localhost';
GRANT ALL PRIVILEGES
    ON frontdb.*
    TO 'front_office'@'localhost';
```


The proxied accounts use the mysql_no_login authentication plugin to prevent clients from using the accounts to log in directly to the MySQL server. Instead, users who authenticate using LDAP are expected to use the default ' '@'\%' proxy account. (This assumes that the mysql_no_login plugin is installed. For instructions, see Section 8.4.1.9, "No-Login Pluggable Authentication".) For alternative methods of protecting proxied accounts against direct use, see Preventing Direct Login to Proxied Accounts.

Grant to the proxy account the PROXY privilege for each proxied account:
```
GRANT PROXY
    ON 'accounting'@'localhost'
    TO ''@'%';
GRANT PROXY
    ON 'front_office'@'localhost'
    TO ''@'%';
```


Use the mysql command-line client to connect to the MySQL server as basha.
```
$> mysql --user=basha --password
Enter password: basha_password (basha LDAP password)
```


Authentication occurs as follows:
1. The server authenticates the connection using the default ' ' @ ' \% ' proxy account, for client user basha.
2. The matching LDAP entry is:
```
uid=basha,ou=People,dc=example,dc=com,cn=accounting
```

3. The matching LDAP entry has group attribute cn=accounting, so accounting becomes the authenticated proxied user.
4. The authenticated user differs from the client user name basha, with the result that basha is treated as a proxy for accounting, and basha assumes the privileges of the proxied accounting account. The following query returns output as shown:
```
mysql> SELECT USER(), CURRENT_USER(), @@proxy_user;
+------------------+----------------------+-------------+
| USER() | CURRENT_USER() | @@proxy_user |
+------------------+-----------------------+--------------+
| basha@localhost | accounting@localhost | ''@'%' |
+------------------+-----------------------+-------------+
```


This demonstrates that basha uses the privileges granted to the proxied accounting MySQL account, and that proxying occurs through the default proxy user account.

Now connect as basil instead:
```
$> mysql --user=basil --password
Enter password: basil_password (basil LDAP password)
```


The authentication process for basil is similar to that previously described for basha:
1. The server authenticates the connection using the default ' ' @ ' \% ' proxy account, for client user basil.
2. The matching LDAP entry is:
```
uid=basil,ou=People,dc=example,dc=com,cn=front_office
```

3. The matching LDAP entry has group attribute cn=front_office, so front_office becomes the authenticated proxied user.
4. The authenticated user differs from the client user name basil, with the result that basil is treated as a proxy for front_office, and basil assumes the privileges of the proxied front_office account. The following query returns output as shown:
```
mysql> SELECT USER(), CURRENT_USER(), @@proxy_user;
+------------------+------------------------+---------------
| USER() | CURRENT_USER() | @@proxy_user |
+------------------+-------------------------+--------------+
| basil@localhost | front_office@localhost | ''@'%' |
+------------------+-------------------------+--------------
```


This demonstrates that basil uses the privileges granted to the proxied front_office MySQL account, and that proxying occurs through the default proxy user account.

\section*{LDAP Authentication Group Preference and Mapping Specification}

As described in LDAP Authentication with Proxying, basic LDAP authentication proxying works by the principle that the plugin uses the first group name returned by the LDAP server as the MySQL proxied user account name. This simple capability does not enable specifying any preference about which group name to use if the LDAP server returns multiple group names, or specifying any name other than the group name as the proxied user name.

For MySQL accounts that use LDAP authentication, the authentication string can specify the following information to enable greater proxying flexibility:
- A list of groups in preference order, such that the plugin uses the first group name in the list that matches a group returned by the LDAP server.
- A mapping from group names to proxied user names, such that a group name when matched can provide a specified name to use as the proxied user. This provides an alternative to using the group name as the proxied user.

Consider the following MySQL proxy account definition:
```
CREATE USER ''@'%'
    IDENTIFIED WITH authentication_ldap_sasl
    AS '+ou=People,dc=example,dc=com#grp1=usera,grp2,grp3=userc';
```


The authentication string has a user DN suffix ou=People, dc=example, dc=com prefixed by the + character. Thus, as described in LDAP Authentication User DN Suffixes, the full user DN is constructed from the user DN suffix as specified, plus the client user name as the uid attribute.

The remaining part of the authentication string begins with \#, which signifies the beginning of group preference and mapping information. This part of the authentication string lists group names in the order grp1, grp2, grp3. The LDAP plugin compares that list with the set of group names returned by the LDAP server, looking in list order for a match against the returned names. The plugin uses the first match, or if there is no match, authentication fails.

Suppose that the LDAP server returns groups grp3, grp2, and grp7. The LDAP plugin uses grp2 because it is the first group in the authentication string that matches, even though it is not the first group returned by the LDAP server. If the LDAP server returns grp4, grp2, and grp1, the plugin uses grp1 even though grp2 also matches. grp1 has a precedence higher than grp2 because it is listed earlier in the authentication string.

Assuming that the plugin finds a group name match, it performs mapping from that group name to the MySQL proxied user name, if there is one. For the example proxy account, mapping occurs as follows:
- If the matching group name is grp1 or grp3, those are associated in the authentication string with user names usera and userc, respectively. The plugin uses the corresponding associated user name as the proxied user name.
- If the matching group name is grp2, there is no associated user name in the authentication string. The plugin uses grp2 as the proxied user name.

If the LDAP server returns a group in DN format, the LDAP plugin parses the group DN to extract the group name from it.

To specify LDAP group preference and mapping information, these principles apply:
- Begin the group preference and mapping part of the authentication string with a \# prefix character.
- The group preference and mapping specification is a list of one or more items, separated by commas. Each item has the form group_name=user_name or group_name. Items should be listed in group name preference order. For a group name selected by the plugin as a match from set of group names returned by the LDAP server, the two syntaxes differ in effect as follows:
- For an item specified as group_name=user_name (with a user name), the group name maps to the user name, which is used as the MySQL proxied user name.
- For an item specified as group_name (with no user name), the group name is used as the MySQL proxied user name.
- To quote a group or user name that contains special characters such as space, surround it by double quote (") characters. For example, if an item has group and user names of my group name and my user name, it must be written in a group mapping using quotes:
"my group name"="my user name"
If an item has group and user names of my_group_name and my_user_name (which contain no special characters), it may but need not be written using quotes. Any of the following are valid:
```
my_group_name=my_user_name
my_group_name="my_user_name"
"my_group_name"=my_user_name
"my_group_name"="my_user_name"
```

- To escape a character, precede it by a backslash ( \\). This is useful particularly to include a literal double quote or backslash, which are otherwise not included literally.
- A user DN need not be present in the authentication string, but if present, it must precede the group preference and mapping part. A user DN can be given as a full user DN, or as a user DN suffix with a + prefix character. (See LDAP Authentication User DN Suffixes.)

\section*{LDAP Authentication User DN Suffixes}

LDAP authentication plugins permit the authentication string that provides user DN information to begin with a + prefix character:
- In the absence of a + character, the authentication string value is treated as is without modification.
- If the authentication string begins with +, the plugin constructs the full user DN value from the user name sent by the client, together with the DN specified in the authentication string (with
the + removed). In the constructed DN, the client user name becomes the value of the attribute that specifies LDAP user names. This is uid by default; to change the attribute, modify the appropriate system variable (authentication_ldap_simple_user_search_attr or authentication_ldap_sasl_user_search_attr). The authentication string is stored as given in the mysql. user system table, with the full user DN constructed on the fly before authentication.

This account authentication string does not have + at the beginning, so it is taken as the full user DN:
```
CREATE USER 'baldwin'
    IDENTIFIED WITH authentication_ldap_simple
    AS 'uid=admin,ou=People,dc=example,dc=com';
```


The client connects with the user name specified in the account (baldwin). In this case, that name is not used because the authentication string has no prefix and thus fully specifies the user DN.

This account authentication string does have + at the beginning, so it is taken as just part of the user DN:
```
CREATE USER 'accounting'
    IDENTIFIED WITH authentication_ldap_simple
    AS '+ou=People,dc=example,dc=com';
```


The client connects with the user name specified in the account (accounting), which in this case is used as the uid attribute together with the authentication string to construct the user DN: uid=accounting, ou=People,dc=example,dc=com

The accounts in the preceding examples have a nonempty user name, so the client always connects to the MySQL server using the same name as specified in the account definition. If an account has an empty user name, such as the default anonymous ' ' @ ' \% ' proxy account described in LDAP Authentication with Proxying, clients might connect to the MySQL server with varying user names. But the principle is the same: If the authentication string begins with + , the plugin uses the user name sent by the client together with the authentication string to construct the user DN.

\section*{LDAP Authentication Methods}

The LDAP authentication plugins use a configurable authentication method. The appropriate system variable and available method choices are plugin-specific:
- For the authentication_ldap_simple plugin: Set the authentication_ldap_simple_auth_method_name system variable to configure the method. The permitted choices are SIMPLE and AD-FOREST.
- For the authentication_ldap_sasl plugin: Set the authentication_ldap_sasl_auth_method_name system variable to configure the method. The permitted choices are SCRAM-SHA-1, SCRAM-SHA-256, and GSSAPI. (To determine which SASL LDAP methods are actually available on the host system, check the value of the Authentication_ldap_sasl_supported_methods status variable.)

See the system variable descriptions for information about each permitted method. Also, depending on the method, additional configuration may be needed, as described in the following sections.

\section*{The GSSAPI/Kerberos Authentication Method}

Generic Security Service Application Program Interface (GSSAPI) is a security abstraction interface. Kerberos is an instance of a specific security protocol that can be used through that abstract interface. Using GSSAPI, applications authenticate to Kerberos to obtain service credentials, then use those credentials in turn to enable secure access to other services.

One such service is LDAP, which is used by the client-side and server-side SASL LDAP authentication plugins. When the authentication_ldap_sasl_auth_method_name system variable is set to GSSAPI, these plugins use the GSSAPI/Kerberos authentication method. In this case, the plugins communicate securely using Kerberos without using LDAP messages directly. The server-side plugin
then communicates with the LDAP server to interpret LDAP authentication messages and retrieve LDAP groups.

GSSAPI/Kerberos is supported as an LDAP authentication method for MySQL servers and clients on Linux. It is useful in Linux environments where applications have access to LDAP through Microsoft Active Directory, which has Kerberos enabled by default.

The following discussion provides information about the configuration requirements for using the GSSAPI method. Familiarity is assumed with Kerberos concepts and operation. The following list briefly defines several common Kerberos terms. You may also find the Glossary section of RFC 4120 helpful.
- Principal: A named entity, such as a user or server.
- KDC: The key distribution center, comprising the AS and TGS:
- AS: The authentication server; provides the initial ticket-granting ticket needed to obtain additional tickets.
- TGS: The ticket-granting server; provides additional tickets to Kerberos clients that possess a valid TGT.
- TGT: The ticket-granting ticket; presented to the TGS to obtain service tickets for service access.

LDAP authentication using Kerberos requires both a KDC server and an LDAP server. This requirement can be satisfied in different ways:
- Active Directory includes both servers, with Kerberos authentication enabled by default in the Active Directory LDAP server.
- OpenLDAP provides an LDAP server, but a separate KDC server may be needed, with additional Kerberos setup required.

Kerberos must also be available on the client host. A client contacts the AS using a password to obtain a TGT. The client then uses the TGT to obtain access from the TGS to other services, such as LDAP.

The following sections discuss the configuration steps to use GSSAPI/Kerberos for SASL LDAP authentication in MySQL:
- Verify Kerberos and LDAP Availability
- Configure the Server-Side SASL LDAP Authentication Plugin for GSSAPI/Kerberos
- Create a MySQL Account That Uses GSSAPI/Kerberos for LDAP Authentication
- Use the MySQL Account to Connect to the MySQL Server
- Client Configuration Parameters for LDAP Authentication

\section*{Verify Kerberos and LDAP Availability}

The following example shows how to test availability of Kerberos in Active Directory. The example makes these assumptions:
- Active Directory is running on the host named ldap_auth.example.com with IP address 198.51.100.10.
- MySQL-related Kerberos authentication and LDAP lookups use the MYSQL . LOCAL domain.
- A principal named bredon@MYSQL . LOCAL is registered with the KDC. (In later discussion, this principal name is also associated with the MySQL account that authenticates to the MySQL server using GSSAPI/Kerberos.)

With those assumptions satisfied, follow this procedure:
1. Verify that the Kerberos library is installed and configured correctly in the operating system. For example, to configure a MYSQL. LOCAL domain for use during MySQL authentication, the /etc/ krb5.conf Kerberos configuration file should contain something like this:
```
[realms]
    MYSQL.LOCAL = {
        kdc = ldap_auth.example.com
        admin_server = ldap_auth.example.com
        default_domain = MYSQL.LOCAL
    }
```

2. You may need to add an entry to /etc/hosts for the server host:
```
198.51.100.10 ldap_auth ldap_auth.example.com
```

3. Check whether Kerberos authentication works correctly:
a. Use kinit to authenticate to Kerberos:
```
$> kinit bredon@MYSQL.LOCAL
Password for bredon@MYSQL.LOCAL: (enter password here)
```


The command authenticates for the Kerberos principal named bredon@MYSQL . LOCAL. Enter the principal's password when the command prompts for it. The KDC returns a TGT that is cached on the client side for use by other Kerberos-aware applications.
b. Use klist to check whether the TGT was obtained correctly. The output should be similar to this:
```
$> klist
Ticket cache: FILE:/tmp/krb5cc_244306
Default principal: bredon@MYSQL.LOCAL
Valid starting Expires Service principal
03/23/2021 08:18:33 03/23/2021 18:18:33 krbtgt/MYSQL.LOCAL@MYSQL.LOCAL
```

4. Check whether ldapsearch works with the Kerberos TGT using this command, which searches for users in the MYSQL . LOCAL domain:
```
ldapsearch -h 198.51.100.10 -Y GSSAPI -b "dc=MYSQL,dc=LOCAL"
```


\section*{Configure the Server-Side SASL LDAP Authentication Plugin for GSSAPI/Kerberos}

Assuming that the LDAP server is accessible through Kerberos as just described, configure the serverside SASL LDAP authentication plugin to use the GSSAPI/Kerberos authentication method. (For general LDAP plugin installation information, see Installing LDAP Pluggable Authentication.) Here is an example of plugin-related settings the server my.cnf file might contain:
```
[mysqld]
plugin-load-add=authentication_ldap_sasl.so
authentication_ldap_sasl_auth_method_name="GSSAPI"
authentication_ldap_sasl_server_host=198.51.100.10
authentication_ldap_sasl_server_port=389
authentication_ldap_sasl_bind_root_dn="cn=admin,cn=users,dc=MYSQL,dc=LOCAL"
authentication_ldap_sasl_bind_root_pwd="password"
authentication_ldap_sasl_bind_base_dn="cn=users,dc=MYSQL,dc=LOCAL"
authentication_ldap_sasl_user_search_attr="sAMAccountName"
```


Those option file settings configure the SASL LDAP plugin as follows:
- The --plugin-load-add option loads the plugin (adjust the . so suffix for your platform as necessary). If you loaded the plugin previously using an INSTALL PLUGIN statement, this option is unnecessary.
- authentication_ldap_sasl_auth_method_name must be set to GSSAPI to use GSSAPI/ Kerberos as the SASL LDAP authentication method.
- authentication_ldap_sasl_server_host and authentication_ldap_sasl_server_port indicate the IP address and port number of the Active Directory server host for authentication.
- authentication_ldap_sasl_bind_root_dn and authentication_ldap_sasl_bind_root_pwd configure the root DN and password for group search capability. This capability is required, but users may not have privileges to search. In such cases, it is necessary to provide root DN information:
- In the DN option value, admin should be the name of an administrative LDAP account that has privileges to perform user searches.
- In the password option value, password should be the admin account password.
- authentication_ldap_sasl_bind_base_dn indicates the user DN base path, so that searches look for users in the MYSQL . LOCAL domain.
- authentication_ldap_sasl_user_search_attr specifies a standard Active Directory search attribute, sAMAccountName. This attribute is used in searches to match logon names; attribute values are not the same as the user DN values.

\section*{Create a MySQL Account That Uses GSSAPI/Kerberos for LDAP Authentication}

MySQL authentication using the SASL LDAP authentication plugin with the GSSAPI/Kerberos method is based on a user that is a Kerberos principal. The following discussion uses a principal named bredon@MYSQL. LOCAL as this user, which must be registered in several places:
- The Kerberos administrator should register the user name as a Kerberos principal. This name should include a domain name. Clients use the principal name and password to authenticate with Kerberos and obtain a TGT.
- The LDAP administrator should register the user name in an LDAP entry. For example:
uid=bredon,dc=MYSQL,dc=LOCAL

> Note
> In Active Directory (which uses Kerberos as the default authentication method), creating a user creates both the Kerberos principal and the LDAP entry.
- The MySQL DBA should create an account that has the Kerberos principal name as the user name and that authenticates using the SASL LDAP plugin.

Assume that the Kerberos principal and LDAP entry have been registered by the appropriate service administrators, and that, as previously described in Installing LDAP Pluggable Authentication, and Configure the Server-Side SASL LDAP Authentication Plugin for GSSAPI/Kerberos, the MySQL server has been started with appropriate configuration settings for the server-side SASL LDAP plugin. The MySQL DBA then creates a MySQL account that corresponds to the Kerberos principal name, including the domain name.

\section*{Note}

The SASL LDAP plugin uses a constant user DN for Kerberos authentication and ignores any user DN configured from MySQL. This has certain implications:
- For any MySQL account that uses GSSAPI/Kerberos authentication, the authentication string in CREATE USER or ALTER USER statements should contain no user DN because it has no effect.
- Because the authentication string contains no user DN, it should contain group mapping information, to enable the user to be handled as a proxy user
that is mapped onto the desired proxied user. For information about proxying with the LDAP authentication plugin, see LDAP Authentication with Proxying.

The following statements create a proxy user named bredon@MYSQL. LOCAL that assumes the privileges of the proxied user named proxied_krb_usr. Other GSSAPI/Kerberos users that should have the same privileges can similarly be created as proxy users for the same proxied user.
```
-- create proxy account
CREATE USER 'bredon@MYSQL.LOCAL'
    IDENTIFIED WITH authentication_ldap_sasl
    BY '#krb_grp=proxied_krb_user';
-- create proxied account and grant its privileges;
-- use mysql_no_login plugin to prevent direct login
CREATE USER 'proxied_krb_user'
    IDENTIFIED WITH mysql_no_login;
GRANT ALL
    ON krb_user_db.*
    TO 'proxied_krb_user';
-- grant to proxy account the
-- PROXY privilege for proxied account
GRANT PROXY
    ON 'proxied_krb_user'
    TO 'bredon@MYSQL.LOCAL';
```


Observe closely the quoting for the proxy account name in the first CREATE USER statement and the GRANT PROXY statement:
- For most MySQL accounts, the user and host are separate parts of the account name, and thus are quoted separately as 'user_name'@'host_name'.
- For LDAP Kerberos authentication, the user part of the account name includes the principal domain, so 'bredon@MYSQL. LOCAL ' is quoted as a single value. Because no host part is given, the full MySQL account name uses the default of '\%' as the host part: 'bredon@MYSQL.LOCAL'@'\%'
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1338.jpg?height=129&width=99&top_left_y=1564&top_left_x=306)

\section*{Note}

When creating an account that authenticates using the authentication_ldap_sasl SASL LDAP authentication plugin with the GSSAPI/Kerberos authentication method, the CREATE USER statement includes the realm as part of the user name. This differs from creating accounts that use the authentication_kerberos Kerberos plugin. For such accounts, the CREATE USER statement does not include the realm as part of the user name. Instead, specify the realm as the authentication string in the BY clause. See Create a MySQL Account That Uses Kerberos Authentication.

The proxied account uses the mysql_no_login authentication plugin to prevent clients from using the account to log in directly to the MySQL server. Instead, it is expected that users who authenticate using LDAP use the bredon@MYSQL. LOCAL proxy account. (This assumes that the mysql_no_login plugin is installed. For instructions, see Section 8.4.1.9, "No-Login Pluggable Authentication".) For alternative methods of protecting proxied accounts against direct use, see Preventing Direct Login to Proxied Accounts.

\section*{Use the MySQL Account to Connect to the MySQL Server}

After a MySQL account that authenticates using GSSAPI/Kerberos has been set up, clients can use it to connect to the MySQL server. Kerberos authentication can take place either prior to or at the time of MySQL client program invocation:
- Prior to invoking the MySQL client program, the client user can obtain a TGT from the KDC independently of MySQL. For example, the client user can use kinit to authenticate to Kerberos by providing a Kerberos principal name and the principal password:
```
$> kinit bredon@MYSQL.LOCAL
Password for bredon@MYSQL.LOCAL: (enter password here)
```


The resulting TGT is cached and becomes available for use by other Kerberos-aware applications, such as programs that use the client-side SASL LDAP authentication plugin. In this case, the MySQL client program authenticates to the MySQL server using the TGT, so invoke the client without specifying a user name or password:
```
mysql --default-auth=authentication_ldap_sasl_client
```


As just described, when the TGT is cached, user-name and password options are not needed in the client command. If the command includes them anyway, they are handled as follows:
- If the command includes a user name, authentication fails if that name does not match the principal name in the TGT.
- If the command includes a password, the client-side plugin ignores it. Because authentication is based on the TGT, it can succeed even if the user-provided password is incorrect. For this reason, the plugin produces a warning if a valid TGT is found that causes a password to be ignored.
- If the Kerberos cache contains no TGT, the client-side SASL LDAP authentication plugin itself can obtain the TGT from the KDC. Invoke the client with options for the name and password of the Kerberos principal associated with the MySQL account (enter the command on a single line, then enter the principal password when prompted):
```
mysql --default-auth=authentication_ldap_sasl_client
    --user=bredon@MYSQL.LOCAL
    --password
```

- If the Kerberos cache contains no TGT and the client command specifies no principal name as the user name, authentication fails.

If you are uncertain whether a TGT exists, you can use klist to check.
Authentication occurs as follows:
1. The client uses the TGT to authenticate using Kerberos.
2. The server finds the LDAP entry for the principal and uses it to authenticate the connection for the bredon@MYSQL. LOCAL MySQL proxy account.
3. The group mapping information in the proxy account authentication string ('\#krb_grp=proxied_krb_user') indicates that the authenticated proxied user should be proxied_krb_user.
4. bredon@MYSQL. LOCAL is treated as a proxy for proxied_krb_user, and the following query returns output as shown:
```
mysql> SELECT USER(), CURRENT_USER(), @@proxy_user;
+--------------------------------+--------------------+------------------------
| USER() | CURRENT_USER() | @@proxy_user |
+--------------------------------+--------------------+-------------------------
| bredon@MYSQL.LOCAL@localhost | proxied_krb_user@% | 'bredon@MYSQL.LOCAL'@'%' |
+--------------------------------+--------------------+-------------------------
```


The USER( ) value indicates the user name used for the client command (bredon@MYSQL . LOCAL) and the host from which the client connected (localhost).

The CURRENT_USER( ) value is the full name of the proxied user account, which consists of the proxied_krb_user user part and the \% host part.

The @@proxy_user value indicates the full name of the account used to make the connection to the MySQL server, which consists of the bredon@MYSQL . LOCAL user part and the \% host part.

This demonstrates that proxying occurs through the bredon@MYSQL . LOCAL proxy user account, and that bredon@MYSQL.LOCAL assumes the privileges granted to the proxied_krb_user proxied user account.

A TGT once obtained is cached on the client side and can be used until it expires without specifying the password again. However the TGT is obtained, the client-side plugin uses it to acquire service tickets and communicate with the server-side plugin.

\section*{Note}

When the client-side authentication plugin itself obtains the TGT, the client user may not want the TGT to be reused. As described in Client Configuration Parameters for LDAP Authentication, the local /etc/krb5.conf file can be used to cause the client-side plugin to destroy the TGT when done with it.

The server-side plugin has no access to the TGT itself or the Kerberos password used to obtain it.
The LDAP authentication plugins have no control over the caching mechanism (storage in a local file, in memory, and so forth), but Kerberos utilities such as kswitch may be available for this purpose.

\section*{Client Configuration Parameters for LDAP Authentication}

The authentication_ldap_sasl_client client-side SASL LDAP plugin reads the local / etc/krb5.conf file. If this file is missing or inaccessible, an error occurs. Assuming that the file is accessible, it can include an optional [appdefaults] section to provide information used by the plugin. Place the information within the mysql part of the section. For example:
```
[appdefaults]
    mysql = {
        ldap_server_host = "ldap_host.example.com"
        ldap_destroy_tgt = true
    }
```


The client-side plugin recognizes these parameters in the mysql section:
- The ldap_server_host value specifies the LDAP server host and can be useful when that host differs from the KDC server host specified in the [realms] section. By default, the plugin uses the KDC server host as the LDAP server host.
- The ldap_destroy_tgt value indicates whether the client-side plugin destroys the TGT after obtaining and using it. By default, ldap_destroy_tgt is false, but can be set to true to avoid TGT reuse. (This setting applies only to TGTs created by the client-side plugin, not TGTs created by other plugins or externally to MySQL.)

\section*{LDAP Search Referral}

An LDAP server can be configured to delegate LDAP searches to another LDAP server, a functionality known as LDAP referral. Suppose that the server a.example.com holds a "dc=example,dc=com" root DN and wishes to delegate searches to another server b.example.com. To enable this, a. example.com would be configured with a named referral object having these attributes:
```
dn: dc=subtree,dc=example,dc=com
objectClass: referral
objectClass: extensibleObject
dc: subtree
ref: ldap://b.example.com/dc=subtree,dc=example,dc=com
```


An issue with enabling LDAP referral is that searches can fail with LDAP operation errors when the search base DN is the root DN, and referral objects are not set. A MySQL DBA might wish to avoid such referral errors for the LDAP authentication plugins, even though LDAP referral might be set globally in the ldap.conf configuration file. To configure on a plugin-specific basis whether the LDAP server should use LDAP referral when communicating with each plugin, set the authentication_ldap_simple_referral and authentication_ldap_sasl_referral
system variables. Setting either variable to ON or OFF causes the corresponding LDAP authentication plugin to tell the LDAP server whether to use referral during MySQL authentication. Each variable has a plugin-specific effect and does not affect other applications that communicate with the LDAP server. Both variables are OFF by default.

\subsection*{8.4.1.8 Kerberos Pluggable Authentication}

> Note
> Kerberos pluggable authentication is an extension included in MySQL Enterprise Edition, a commercial product. To learn more about commercial products, see https://www.mysql.com/products/.

MySQL Enterprise Edition supports an authentication method that enables users to authenticate to MySQL Server using Kerberos, provided that appropriate Kerberos tickets are available or can be obtained.

This authentication method is available in MySQL 8.4 for MySQL servers and clients on Linux. It is useful in Linux environments where applications have access to Microsoft Active Directory, which has Kerberos enabled by default. The client-side plugin is supported on Windows as well. The server-side plugin is still supported only on Linux.

> Note
> Neither MySQL Shell nor MySQL Router currently support creating internally managed MySQL accounts for use with Kerberos. However, MySQL Shell supports using Kerberos to connect to MySQL Server. MySQL Router supports the use of an existing Kerberos-authenticated MySQL account for bootstrap and metadata access. MySQL Router also supports application connections that use Kerberos to authenticate to MySQL Server.

Kerberos pluggable authentication provides these capabilities:
- External authentication: Kerberos authentication enables MySQL Server to accept connections from users defined outside the MySQL grant tables who have obtained the proper Kerberos tickets.
- Security: Kerberos uses tickets together with symmetric-key cryptography, enabling authentication without sending passwords over the network. Kerberos authentication supports userless and passwordless scenarios.

The following table shows the plugin and library file names. The file name suffix might differ on your system. The file must be located in the directory named by the plugin_dir system variable. For installation information, see Installing Kerberos Pluggable Authentication.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.23 Plugin and Library Names for Kerberos Authentication}
\begin{tabular}{|l|l|}
\hline Plugin or File & Plugin or File Name \\
\hline Server-side plugin & authentication_kerberos \\
\hline Client-side plugin & authentication_kerberos_client \\
\hline Library file & authentication_kerberos.so, authentication_kerberos_client.so \\
\hline
\end{tabular}
\end{table}

The server-side Kerberos authentication plugin is included only in MySQL Enterprise Edition. It is not included in MySQL community distributions. The client-side plugin is included in all distributions, including community distributions. This enables clients from any distribution to connect to a server that has the server-side plugin loaded.

The following sections provide installation and usage information specific to Kerberos pluggable authentication:
- Prerequisites for Kerberos Pluggable Authentication
- How Kerberos Authentication of MySQL Users Works
- Installing Kerberos Pluggable Authentication
- Using Kerberos Pluggable Authentication
- Kerberos Authentication Debugging

For general information about pluggable authentication in MySQL, see Section 8.2.17, "Pluggable Authentication".

\section*{Prerequisites for Kerberos Pluggable Authentication}

To use Kerberos pluggable authentication for MySQL, these prerequisites must be satisfied:
- A Kerberos service must be available for the Kerberos authentication plugins to communicate with.
- Each Kerberos user (principal) to be authenticated by MySQL must be present in the database managed by the KDC server.
- A Kerberos client library must be available on systems where either the server-side or client-side Kerberos authentication plugin is used. In addition, GSSAPI is used as the interface for accessing Kerberos authentication, so a GSSAPI library must be available.

\section*{How Kerberos Authentication of MySQL Users Works}

This section provides an overview of how MySQL and Kerberos work together to authenticate MySQL users. For examples showing how to set up MySQL accounts to use the Kerberos authentication plugins, see Using Kerberos Pluggable Authentication.

Familiarity is assumed here with Kerberos concepts and operation. The following list briefly defines several common Kerberos terms. You may also find the Glossary section of RFC 4120 helpful.
- Principal: A named entity, such as a user or server. In this discussion, certain principal-related terms occur frequently:
- SPN: Service principal name; the name of a principal that represents a service.
- UPN: User principal name; the name of a principal that represents a user.
- KDC: The key distribution center, comprising the AS and TGS:
- AS: The authentication server; provides the initial ticket-granting ticket needed to obtain additional tickets.
- TGS: The ticket-granting server; provides additional tickets to Kerberos clients that possess a valid TGT.
- TGT: The ticket-granting ticket; presented to the TGS to obtain service tickets for service access.
- ST: A service ticket; provides access to a service such as that offered by a MySQL server.

Authentication using Kerberos requires a KDC server, for example, as provided by Microsoft Active Directory.

Kerberos authentication in MySQL uses Generic Security Service Application Program Interface (GSSAPI), which is a security abstraction interface. Kerberos is an instance of a specific security protocol that can be used through that abstract interface. Using GSSAPI, applications authenticate to Kerberos to obtain service credentials, then use those credentials in turn to enable secure access to other services.

On Windows, the authentication_kerberos_client authentication plugin supports two modes, which the client user can set at runtime or specify in an option file:
- SSPI mode: Security Support Provider Interface (SSPI) implements GSSAPI (see Commands for Windows Clients in SSPI Mode). SSPI, while being compatible with GSSAPI at the wire level, only supports the Windows single sign-on scenario and specifically refers to the logged-on user. SSPI is the default mode on most Windows clients.
- GSSAPI mode: Supports GSSAPI through the MIT Kerberos library on Windows (see Commands for Windows Clients in GSSAPI Mode).

With the Kerberos authentication plugins, applications and MySQL servers are able to use the Kerberos authentication protocol to mutually authenticate users and MySQL services. This way both the user and the server are able to verify each other's identity. No passwords are sent over the network and Kerberos protocol messages are protected against eavesdropping and replay attacks.

Kerberos authentication follows these steps, where the server-side and client-side parts are performed using the authentication_kerberos and authentication_kerberos_client authentication plugins, respectively:
1. The MySQL server sends to the client application its service principal name. This SPN must be registered in the Kerberos system, and is configured on the server side using the authentication_kerberos_service_principal system variable.
2. Using GSSAPI, the client application creates a Kerberos client-side authentication session and exchanges Kerberos messages with the Kerberos KDC:
- The client obtains a ticket-granting ticket from the authentication server.
- Using the TGT, the client obtains a service ticket for MySQL from the ticket-granting service.

This step can be skipped or partially skipped if the TGT, ST, or both are already cached locally. The client optionally may use a client keytab file to obtain a TGT and ST without supplying a password.
3. Using GSSAPI, the client application presents the MySQL ST to the MySQL server.
4. Using GSSAPI, the MySQL server creates a Kerberos server-side authentication session. The server validates the user identity and the validity of the user request. It authenticates the ST using the service key configured in its service keytab file to determine whether authentication succeeds or fails, and returns the authentication result to the client.

Applications are able to authenticate using a provided user name and password, or using a locally cached TGT or ST (for example, created using kinit or similar). This design therefore covers use cases ranging from completely userless and passwordless connections, where Kerberos service tickets are obtained from a locally stored Kerberos cache, to connections where both user name and password are provided and used to obtain a valid Kerberos service ticket from a KDC, to send to the MySQL server.

As indicated in the preceding description, MySQL Kerberos authentication uses two kinds of keytab files:
- On the client host, a client keytab file may be used to obtain a TGT and ST without supplying a password. See Client Configuration Parameters for Kerberos Authentication.
- On the MySQL server host, a server-side service keytab file is used to verify service tickets received by the MySQL server from clients. The keytab file name is configured using the authentication_kerberos_service_key_tab system variable.

For information about keytab files, see https://web.mit.edu/kerberos/krb5-latest/doc/basic/ keytab_def.html.

\section*{Installing Kerberos Pluggable Authentication}

This section describes how to install the server-side Kerberos authentication plugin. For general information about installing plugins, see Section 7.6.1, "Installing and Uninstalling Plugins".

\section*{Note}

The server-side plugin is supported only on Linux systems. On Windows systems, only the client-side plugin is supported, which can be used on a Windows system to connect to a Linux server that uses Kerberos authentication.

To be usable by the server, the plugin library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup.

The server-side plugin library file base name is authentication_kerberos. The file name suffix for Unix and Unix-like systems is .so.

To load the plugin at server startup, use the --plugin-load-add option to name the library file that contains it. With this plugin-loading method, the option must be given each time the server starts. Also, specify values for any plugin-provided system variables you wish to configure. The plugin exposes these system variables, enabling its operation to be configured:
- authentication_kerberos_service_principal: The MySQL service principal name (SPN). This name is sent to clients that attempt to authenticate using Kerberos. The SPN must be present in the database managed by the KDC server. The default is mysql/host_name@realm_name.
- authentication_kerberos_service_key_tab: The keytab file for authenticating tickets received from clients. This file must exist and contain a valid key for the SPN or authentication of clients will fail. The default is mysql. keytab in the data directory.

For details about all Kerberos authentication system variables, see Section 8.4.1.13, "Pluggable Authentication System Variables".

To load the plugin and configure it, put lines such as these in your my.cnf file, using values for the system variables that are appropriate for your installation:
```
[mysqld]
plugin-load-add=authentication_kerberos.so
authentication_kerberos_service_principal=mysql/krbauth.example.com@MYSQL.LOCAL
authentication_kerberos_service_key_tab=/var/mysql/data/mysql.keytab
```


After modifying my.cnf, restart the server to cause the new settings to take effect.
Alternatively, to load the plugin at runtime, use this statement:
```
INSTALL PLUGIN authentication_kerberos
    SONAME 'authentication_kerberos.so';
```


INSTALL PLUGIN loads the plugin immediately, and also registers it in the mysql.plugins system table to cause the server to load it for each subsequent normal startup without the need for - -plugin-load-add.

When you install the plugin at runtime without configuring its system variables in the my.cnf file, the system variable authentication_kerberos_service_key_tab is set to the default value of mysql. keytab in the data directory. The value of this system variable cannot be changed at runtime, so if you need to specify a different file, you need to add the setting to your my. cnf file then restart the MySQL server. For example:
```
[mysqld]
authentication_kerberos_service_key_tab=/var/mysql/data/mysql.keytab
```


If the keytab file is not in the correct place or does not contain a valid SPN key, the MySQL server does not validate this, but clients return authentication errors until you fix the issue.

The authentication_kerberos_service_principal system variable can be set and persisted at runtime without restarting the server, by using a SET PERSIST statement:

SET PERSIST authentication_kerberos_service_principal='mysql/krbauth.example.com@MYSQL.LOCAL';
SET PERSIST sets a value for the running MySQL instance. It also saves the value, causing it to carry over to subsequent server restarts. To change a value for the running MySQL instance without having it carry over to subsequent restarts, use the GLOBAL keyword rather than PERSIST. See Section 15.7.6.1, "SET Syntax for Variable Assignment".

To verify plugin installation, examine the Information Schema PLUGINS table or use the SHOW PLUGINS statement (see Section 7.6.2, "Obtaining Server Plugin Information"). For example:
```
mysql> SELECT PLUGIN_NAME, PLUGIN_STATUS
    FROM INFORMATION_SCHEMA.PLUGINS
    WHERE PLUGIN_NAME = 'authentication_kerberos';
+--------------------------+---------------+
| PLUGIN_NAME | PLUGIN_STATUS |
+--------------------------+---------------+
| authentication_kerberos | ACTIVE |
+--------------------------+---------------+
```


If a plugin fails to initialize, check the server error log for diagnostic messages.
To associate MySQL accounts with the Kerberos plugin, see Using Kerberos Pluggable Authentication.

\section*{Using Kerberos Pluggable Authentication}

This section describes how to enable MySQL accounts to connect to the MySQL server using Kerberos pluggable authentication. It is assumed that the server is running with the server-side plugin enabled, as described in Installing Kerberos Pluggable Authentication, and that the client-side plugin is available on the client host.
- Verify Kerberos Availability
- Create a MySQL Account That Uses Kerberos Authentication
- Use the MySQL Account to Connect to the MySQL Server
- Client Configuration Parameters for Kerberos Authentication

\section*{Verify Kerberos Availability}

The following example shows how to test availability of Kerberos in Active Directory. The example makes these assumptions:
- Active Directory is running on the host named kr bauth.example.com with IP address 198.51.100.11.
- MySQL-related Kerberos authentication uses the MYSQL . LOCAL domain, and also uses MYSQL . LOCAL as the realm name.
- A principal named karl@MYSQL . LOCAL is registered with the KDC. (In later discussion, this principal name is associated with the MySQL account that authenticates to the MySQL server using Kerberos.)

With those assumptions satisfied, follow this procedure:
1. Verify that the Kerberos library is installed and configured correctly in the operating system. For example, to configure a MYSQL. LOCAL domain and realm for use during MySQL authentication, the /etc/krb5.conf Kerberos configuration file should contain something like this:
```
[realms]
    MYSQL.LOCAL = {
        kdc = krbauth.example.com
        admin_server = krbauth.example.com
        default_domain = MYSQL.LOCAL
    }
```

2. You may need to add an entry to /etc/hosts for the server host:
198.51.100.11 krbauth krbauth.example.com
3. Check whether Kerberos authentication works correctly:
a. Use kinit to authenticate to Kerberos:
\$> kinit karl@MYSQL.LOCAL
Password for karl@MYSQL.LOCAL: (enter password here)
The command authenticates for the Kerberos principal named karl@MYSQL. LOCAL. Enter the principal's password when the command prompts for it. The KDC returns a TGT that is cached on the client side for use by other Kerberos-aware applications.
b. Use klist to check whether the TGT was obtained correctly. The output should be similar to this:
\$> klist
Ticket cache: FILE:/tmp/krb5cc_244306
Default principal: karl@MYSQL.LOCAL
Valid starting Expires Service principal
03/23/2021 08:18:33 03/23/2021 18:18:33 krbtgt/MYSQL.LOCAL@MYSQL.LOCAL

\section*{Create a MySQL Account That Uses Kerberos Authentication}

MySQL authentication using the authentication_kerberos authentication plugin is based on a Kerberos user principal name (UPN). The instructions here assume that a MySQL user named karl authenticates to MySQL using Kerberos, that the Kerberos realm is named MYSQL. LOCAL, and that the user principal name is karl@MYSQL. LOCAL. This UPN must be registered in several places:
- The Kerberos administrator should register the user name as a Kerberos principal. This name includes a realm name. Clients use the principal name and password to authenticate with Kerberos and obtain a ticket-granting ticket (TGT).
- The MySQL DBA should create an account that corresponds to the Kerberos principal name and that authenticates using the Kerberos plugin.

Assume that the Kerberos user principal name has been registered by the appropriate service administrator, and that, as previously described in Installing Kerberos Pluggable Authentication, the MySQL server has been started with appropriate configuration settings for the server-side Kerberos plugin. To create a MySQL account that corresponds to a Kerberos UPN of user@realm_name, the MySQL DBA uses a statement like this:
```
CREATE USER user
    IDENTIFIED WITH authentication_kerberos
    BY 'realm_name';
```


The account named by user can include or omit the host name part. If the host name is omitted, it defaults to \% as usual. The realm_name is stored as the authentication_string value for the account in the mysql. user system table.

To create a MySQL account that corresponds to the UPN karl@MYSQL. LOCAL, use this statement:
```
CREATE USER 'karl'
    IDENTIFIED WITH authentication_kerberos
    BY 'MYSQL.LOCAL';
```


If MySQL must construct the UPN for this account, for example, to obtain or validate tickets (TGTs or STs), it does so by combining the account name (ignoring any host name part) and the realm name. For example, the full account name resulting from the preceding CREATE USER statement is 'karl'@' $\%$ '. MySQL constructs the UPN from the user name part karl (ignoring the host name part) and the realm name MYSQL . LOCAL to produce karl@MYSQL . LOCAL.

\section*{Note}

Observe that when creating an account that authenticates using authentication_kerberos, the CREATE USER statement does not include the UPN realm as part of the user name. Instead, specify the realm (MYSQL . LOCAL in this case) as the authentication string in the BY clause. This differs from creating accounts that use the authentication_ldap_sasl SASL LDAP authentication plugin with the GSSAPI/Kerberos authentication method. For such accounts, the CREATE USER statement does include the UPN realm as part of the user name. See Create a MySQL Account That Uses GSSAPI/Kerberos for LDAP Authentication.

With the account set up, clients can use it to connect to the MySQL server. The procedure depends on whether the client host runs Linux or Windows, as indicated in the following discussion.

Use of authentication_kerberos is subject to the restriction that UPNs with the same user part but a different realm part are not supported. For example, you cannot create MySQL accounts that correspond to both these UPNs:
kate@MYSQL.LOCAL
kate@EXAMPLE.COM
Both UPNs have a user part of kate but differ in the realm part (MYSQL . LOCAL versus EXAMPLE.COM). This is disallowed.

\section*{Use the MySQL Account to Connect to the MySQL Server}

After a MySQL account that authenticates using Kerberos has been set up, clients can use it to connect to the MySQL server as follows:
1. Authenticate to Kerberos with the user principal name (UPN) and its password to obtain a ticketgranting ticket (TGT).
2. Use the TGT to obtain a service ticket (ST) for MySQL.
3. Authenticate to the MySQL server by presenting the MySQL ST.

The first step (authenticating to Kerberos) can be performed various ways:
- Prior to connecting to MySQL:
- On Linux or on Windows in GSSAPI mode, invoke kinit to obtain the TGT and save it in the Kerberos credentials cache.
- On Windows in SSPI mode, authentication may already have been done at login time, which saves the TGT for the logged-in user in the Windows in-memory cache. kinit is not used and there is no Kerberos cache.
- When connecting to MySQL, the client program itself can obtain the TGT, if it can determine the required Kerberos UPN and password:
- That information can come from sources such as command options or the operating system.
- On Linux, clients also can use a keytab file or the /etc/krb5.conf configuration file. Windows clients in GSSAPI mode use a configuration file. Windows clients in SSPI mode use neither.

Details of the client commands for connecting to the MySQL server differ for Linux and Windows, so each host type is discussed separately, but these command properties apply regardless of host type:
- Each command shown includes the following options, but each one may be omitted under certain conditions:
- The --default-auth option specifies the name of the client-side authentication plugin (authentication_kerberos_client). This option may be omitted when the - - user option is specified because in that case MySQL can determine the plugin from the user account information sent by MySQL server.
- The --plugin-dir option indicates to the client program the location of the authentication_kerberos_client plugin. This option may be omitted if the plugin is installed in the default (compiled-in) location.
- Commands should also include any other options such as --host or --port that are required to specify which MySQL server to connect to.
- Enter each command on a single line. If the command includes a --password option to solicit a password, enter the password of the Kerberos UPN associated with the MySQL user when prompted.

\section*{Connection Commands for Linux Clients}

On Linux, the appropriate client command for connecting to the MySQL server varies depending on whether the command authenticates using a TGT from the Kerberos cache, or based on command options for the MySQL user name and the UPN password:
- Prior to invoking the MySQL client program, the client user can obtain a TGT from the KDC independently of MySQL. For example, the client user can use kinit to authenticate to Kerberos by providing a Kerberos user principal name and the principal password:
```
$> kinit karl@MYSQL.LOCAL
Password for karl@MYSQL.LOCAL: (enter password here)
```


The resulting TGT for the UPN is cached and becomes available for use by other Kerberos-aware applications, such as programs that use the client-side Kerberos authentication plugin. In this case, invoke the client without specifying a user-name or password option:
```
mysql
    --default-auth=authentication_kerberos_client
    --plugin-dir=path/to/plugin/directory
```


The client-side plugin finds the TGT in the cache, uses it to obtain a MySQL ST, and uses the ST to authenticate to the MySQL server.

As just described, when the TGT for the UPN is cached, user-name and password options are not needed in the client command. If the command includes them anyway, they are handled as follows:
- This command includes a user-name option:
```
mysql
    --default-auth=authentication_kerberos_client
    --plugin-dir=path/to/plugin/directory
    --user=karl
```


In this case, authentication fails if the user name specified by the option does not match the user name part of the UPN in the TGT.
- This command includes a password option, which you enter when prompted:
```
mysql
    --default-auth=authentication_kerberos_client
    --plugin-dir=path/to/plugin/directory
    --password
```


In this case, the client-side plugin ignores the password. Because authentication is based on the TGT, it can succeed even if the user-provided password is incorrect. For this reason, the plugin produces a warning if a valid TGT is found that causes a password to be ignored.
- If the Kerberos cache contains no TGT, the client-side Kerberos authentication plugin itself can obtain the TGT from the KDC. Invoke the client with options for the MySQL user name and the password, then enter the UPN password when prompted:
```
mysql --default-auth=authentication_kerberos_client
    --plugin-dir=path/to/plugin/directory
    --user=karl
    --password
```


The client-side Kerberos authentication plugin combines the user name (karl) and the realm specified in the user account (MYSQL . LOCAL) to construct the UPN (karl@MYSQL . LOCAL). The client-side plugin uses the UPN and password to obtain a TGT, uses the TGT to obtain a MySQL ST, and uses the ST to authenticate to the MySQL server.

Or, suppose that the Kerberos cache contains no TGT and the command specifies a password option but no user-name option:
```
mysql --default-auth=authentication_kerberos_client
    --plugin-dir=path/to/plugin/directory
    --password
```


The client-side Kerberos authentication plugin uses the operating system login name as the MySQL user name. It combines that user name and the realm in the user' MySQL account to construct the UPN. The client-side plugin uses the UPN and the password to obtain a TGT, uses the TGT to obtain a MySQL ST, and uses the ST to authenticate to the MySQL server.

If you are uncertain whether a TGT exists, you can use klist to check.

> Note
> When the client-side Kerberos authentication plugin itself obtains the TGT, the client user may not want the TGT to be reused. As described in Client Configuration Parameters for Kerberos Authentication, the local /etc/ krb5. conf file can be used to cause the client-side plugin to destroy the TGT when done with it.

\section*{Connection Commands for Windows Clients in SSPI Mode}

On Windows, using the default client-side plugin option (SSPI), the appropriate client command for connecting to the MySQL server varies depending on whether the command authenticates based on command options for the MySQL user name and the UPN password, or instead uses a TGT from the Windows in-memory cache. For details about GSSAPI mode on Windows, see Commands for Windows Clients in GSSAPI Mode.

A command can explicitly specify options for the MySQL user name and the UPN password, or the command can omit those options:
- This command includes options for the MySQL user name and UPN password:
```
mysql --default-auth=authentication_kerberos_client
    --plugin-dir=path/to/plugin/directory
    --user=karl
    --password
```


The client-side Kerberos authentication plugin combines the user name (karl) and the realm specified in the user account (MYSQL. LOCAL) to construct the UPN (karl@MYSQL. LOCAL). The client-side plugin uses the UPN and password to obtain a TGT, uses the TGT to obtain a MySQL ST, and uses the ST to authenticate to the MySQL server.

Any information in the Windows in-memory cache is ignored; the user-name and password option values take precedence.
- This command includes an option for the UPN password but not for the MySQL user name:
```
mysql
    --default-auth=authentication_kerberos_client
    --plugin-dir=path/to/plugin/directory
    --password
```


The client-side Kerberos authentication plugin uses the logged-in user name as the MySQL user name and combines that user name and the realm in the user's MySQL account to construct the UPN. The client-side plugin uses the UPN and the password to obtain a TGT, uses the TGT to obtain a MySQL ST, and uses the ST to authenticate to the MySQL server.
- This command includes no options for the MySQL user name or UPN password:
```
mysql
    --default-auth=authentication_kerberos_client
    --plugin-dir=path/to/plugin/directory
```


The client-side plugin obtains the TGT from the Windows in-memory cache, uses the TGT to obtain a MySQL ST, and uses the ST to authenticate to the MySQL server.

This approach requires the client host to be part of the Windows Server Active Directory (AD) domain. If that is not the case, help the MySQL client discover the IP address for the AD domain by manually entering the AD server and realm as the DNS server and prefix:
1. Start console. exe and select Network and Sharing Center.
2. From the sidebar of the Network and Sharing Center window, select Change adapter settings.
3. In the Network Connections window, right-click the network or VPN connection to configure and select Properties.
4. From the Network tab, locate and click Internet Protocol Version 4 (TCP/IPv4), and then click Properties.
5. Click Advanced in the Internet Protocol Version 4 (TCP/IPv4) Properties dialog. The Advanced TCP/IP Settings dialog opens.
6. From the DNS tab, add the Active Directory server and realm as a DNS server and prefix.
- This command includes an option for the MySQL user name but not for the UPN password:
```
mysql
    --default-auth=authentication_kerberos_client
    --plugin-dir=path/to/plugin/directory
    --user=karl
```


The client-side Kerberos authentication plugin compares the name specified by the user-name option against the logged-in user name. If the names are the same, the plugin uses the logged-in user TGT for authentication. If the names differ, authentication fails.

\section*{Connection Commands for Windows Clients in GSSAPI Mode}

On Windows, the client user must specify GSSAPI mode explicitly using the plugin_authentication_kerberos_client_mode plugin option to enable support through the MIT Kerberos library. The default mode is SSPI (see Commands for Windows Clients in SSPI Mode).

It is possible to specify GSSAPI mode:
- Prior to invoking the MySQL client program in an option file. The plugin variable name is valid using either underscores or dashes:
```
[mysql]
plugin_authentication_kerberos_client_mode=GSSAPI
```


Or:
```
[mysql]
plugin-authentication-kerberos-client-mode=GSSAPI
```

- At runtime from the command line using the mysql or mysqldump client programs. For example, the following commands (with underscores or dashes) causes mysql to connect to the server through the MIT Kerberos library on Windows.
```
mysql [connection-options] --plugin_authentication_kerberos_client_mode=GSSAPI
```


Or:
```
mysql [connection-options] --plugin-authentication-kerberos-client-mode=GSSAPI
```

- Client users can select GSSAPI mode from MySQL Workbench and some MySQL connectors. On client hosts running Windows, you can override the default location of:
- The Kerberos configuration file by setting the KRB5_CONFIG environment variable.
- The default credential cache name with the KRB5CCNAME environment variable (for example, KRB5CCNAME=DIR:/mydir/).

For specific client-side plugin information, see the documentation at https://dev.mysql.com/doc/.
The appropriate client command for connecting to the MySQL server varies depending on whether the command authenticates using a TGT from the MIT Kerberos cache, or based on command options for the MySQL user name and the UPN password. GSSAPI support through the MIT library on Windows is similar to GSSAPI on Linux (see Commands for Linux Clients), with the following exceptions:
- Tickets are always retrieved from or placed into the MIT Kerberos cache on hosts running Windows.
- kinit runs with Functional Accounts on Windows that have narrow permissions and specific roles. The client user does not know the kinit password. For an overview, see https://docs.oracle.com/ en/java/javase/11/tools/kinit.html.
- If the client user supplies a password, the MIT Kerberos library on Windows decides whether to use it or rely on the existing ticket.
- The destroy_tickets parameter, described in Client Configuration Parameters for Kerberos Authentication, is not supported because the MIT Kerberos library on Windows does not support the required API member (get_profile_boolean) to read its value from configuration file.

\section*{Client Configuration Parameters for Kerberos Authentication}

This section applies only for client hosts running Linux, not client hosts running Windows.

> Note
> A client host running Windows with the authentication_kerberos_client client-side Kerberos plugin set to GSSAPI mode does support client configuration parameters, in general, but the MIT Kerberos library on Windows does not support the destroy_tickets parameter described in this section.

If no valid ticket-granting ticket (TGT) exists at the time of MySQL client application invocation, the application itself may obtain and cache the TGT. If during the Kerberos authentication process the client application causes a TGT to be cached, any such TGT that was added can be destroyed after it is no longer needed, by setting the appropriate configuration parameter.

The authentication_kerberos_client client-side Kerberos plugin reads the local /etc/ krb5. conf file. If this file is missing or inaccessible, an error occurs. Assuming that the file is accessible, it can include an optional [appdefaults] section to provide information used by the plugin. Place the information within the mysql part of the section. For example:
```
[appdefaults]
```

```
mysql = {
    destroy_tickets = true
}
```


The client-side plugin recognizes these parameters in the mysql section:
- The destroy_tickets value indicates whether the client-side plugin destroys the TGT after obtaining and using it. By default, destroy_tickets is false, but can be set to true to avoid TGT reuse. (This setting applies only to TGTs created by the client-side plugin, not TGTs created by other plugins or externally to MySQL.)

On the client host, a client keytab file may be used to obtain a TGT and TS without supplying a password. For information about keytab files, see https://web.mit.edu/kerberos/krb5-latest/doc/basic/ keytab_def.html.

\section*{Kerberos Authentication Debugging}

The AUTHENTICATION_KERBEROS_CLIENT_LOG environment variable enables or disables debug output for Kerberos authentication.
![](https://cdn.mathpix.com/cropped/3d8cf8cc-cc66-4dae-b696-9a5a902951f8-1352.jpg?height=109&width=99&top_left_y=1050&top_left_x=306)

\section*{Note}

Despite CLIENT in the name AUTHENTICATION_KERBEROS_CLIENT_LOG, the same environment variable applies to the server-side plugin as well as the client-side plugin.

On the server side, the permitted values are 0 (off) and 1 (on). Log messages are written to the server error log, subject to the server error-logging verbosity level. For example, if you are using prioritybased log filtering, the log_error_verbosity system variable controls verbosity, as described in Section 7.4.2.5, "Priority-Based Error Log Filtering (log_filter_internal)".

On the client side, the permitted values are from 1 to 5 and are written to the standard error output. The following table shows the meaning of each log-level value.

\begin{tabular}{|l|l|}
\hline Log Level & Meaning \\
\hline 1 or not set & No logging \\
\hline 2 & Error messages \\
\hline 3 & Error and warning messages \\
\hline 4 & Error, warning, and information messages \\
\hline 5 & Error, warning, information, and debug messages \\
\hline
\end{tabular}

\subsection*{8.4.1.9 No-Login Pluggable Authentication}

The mysql_no_login server-side authentication plugin prevents all client connections to any account that uses it. Use cases for this plugin include:
- Accounts that must be able to execute stored programs and views with elevated privileges without exposing those privileges to ordinary users.
- Proxied accounts that should never permit direct login but are intended to be accessed only through proxy accounts.

The following table shows the plugin and library file names. The file name suffix might differ on your system. The file must be located in the directory named by the plugin_dir system variable.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.24 Plugin and Library Names for No-Login Authentication}
\begin{tabular}{|l|l|}
\hline Plugin or File & Plugin or File Name \\
\hline Server-side plugin & mysql_no_login \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Plugin or File & Plugin or File Name \\
\hline Client-side plugin & None \\
\hline Library file & mysql_no_login.so \\
\hline
\end{tabular}

The following sections provide installation and usage information specific to no-login pluggable authentication:
- Installing No-Login Pluggable Authentication
- Uninstalling No-Login Pluggable Authentication
- Using No-Login Pluggable Authentication

For general information about pluggable authentication in MySQL, see Section 8.2.17, "Pluggable Authentication". For proxy user information, see Section 8.2.19, "Proxy Users".

\section*{Installing No-Login Pluggable Authentication}

This section describes how to install the no-login authentication plugin. For general information about installing plugins, see Section 7.6.1, "Installing and Uninstalling Plugins".

To be usable by the server, the plugin library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup.

The plugin library file base name is mysql_no_login. The file name suffix differs per platform (for example, . so for Unix and Unix-like systems, . dll for Windows).

To load the plugin at server startup, use the --plugin-load-add option to name the library file that contains it. With this plugin-loading method, the option must be given each time the server starts. For example, put these lines in the server my.cnf file, adjusting the . so suffix for your platform as necessary:
```
[mysqld]
plugin-load-add=mysql_no_login.so
```


After modifying my.cnf, restart the server to cause the new settings to take effect.
Alternatively, to load the plugin at runtime, use this statement, adjusting the . so suffix for your platform as necessary:

INSTALL PLUGIN mysql_no_login SONAME 'mysql_no_login.so';
INSTALL PLUGIN loads the plugin immediately, and also registers it in the mysql.plugins system table to cause the server to load it for each subsequent normal startup without the need for - -plugin-load-add.

To verify plugin installation, examine the Information Schema PLUGINS table or use the SHOW PLUGINS statement (see Section 7.6.2, "Obtaining Server Plugin Information"). For example:
```
mysql> SELECT PLUGIN_NAME, PLUGIN_STATUS
    FROM INFORMATION_SCHEMA.PLUGINS
    WHERE PLUGIN_NAME LIKE '%login%';
+-----------------+---------------+
| PLUGIN_NAME | PLUGIN_STATUS |
+-----------------+---------------+
| mysql_no_login | ACTIVE |
+-----------------+---------------+
```


If the plugin fails to initialize, check the server error log for diagnostic messages.
To associate MySQL accounts with the no-login plugin, see Using No-Login Pluggable Authentication.

\section*{Uninstalling No-Login Pluggable Authentication}

The method used to uninstall the no-login authentication plugin depends on how you installed it:
- If you installed the plugin at server startup using a --plugin-load-add option, restart the server without the option.
- If you installed the plugin at runtime using an INSTALL PLUGIN statement, it remains installed across server restarts. To uninstall it, use UNINSTALL PLUGIN:
```
UNINSTALL PLUGIN mysql_no_login;
```


\section*{Using No-Login Pluggable Authentication}

This section describes how to use the no-login authentication plugin to prevent accounts from being used for connecting from MySQL client programs to the server. It is assumed that the server is running with the no-login plugin enabled, as described in Installing No-Login Pluggable Authentication.

To refer to the no-login authentication plugin in the IDENTIFIED WITH clause of a CREATE USER statement, use the name mysql_no_login.

An account that authenticates using mysql_no_login may be used as the DEFINER for stored program and view objects. If such an object definition also includes SQL SECURITY DEFINER, it executes with that account's privileges. DBAs can use this behavior to provide access to confidential or sensitive data that is exposed only through well-controlled interfaces.

The following example illustrates these principles. It defines an account that does not permit client connections, and associates with it a view that exposes only certain columns of the mysql.user system table:
```
CREATE DATABASE nologindb;
CREATE USER 'nologin'@'localhost'
    IDENTIFIED WITH mysql_no_login;
GRANT ALL ON nologindb.*
    TO 'nologin'@'localhost';
GRANT SELECT ON mysql.user
    TO 'nologin'@'localhost';
CREATE DEFINER = 'nologin'@'localhost'
    SQL SECURITY DEFINER
    VIEW nologindb.myview
    AS SELECT User, Host FROM mysql.user;
```


To provide protected access to the view to an ordinary user, do this:
```
GRANT SELECT ON nologindb.myview
    TO 'ordinaryuser'@'localhost';
```


Now the ordinary user can use the view to access the limited information it presents:
```
SELECT * FROM nologindb.myview;
```


Attempts by the user to access columns other than those exposed by the view result in an error, as do attempts to select from the view by users not granted access to it.

\section*{Note}

Because the nologin account cannot be used directly, the operations required to set up objects that it uses must be performed by root or similar account that has the privileges required to create the objects and set DEFINER values.

The mysql_no_login plugin is also useful in proxying scenarios. (For a discussion of concepts involved in proxying, see Section 8.2.19, "Proxy Users".) An account that authenticates using mysql_no_login may be used as a proxied user for proxy accounts:
```
-- create proxied account
CREATE USER 'proxied_user'@'localhost'
    IDENTIFIED WITH mysql_no_login;
-- grant privileges to proxied account
GRANT ...
    ON ...
    TO 'proxied_user'@'localhost';
-- permit proxy_user to be a proxy account for proxied account
GRANT PROXY
    ON 'proxied_user'@'localhost'
    TO 'proxy_user'@'localhost';
```


This enables clients to access MySQL through the proxy account (proxy_user) but not to bypass the proxy mechanism by connecting directly as the proxied user (proxied_user). A client who connects using the proxy_user account has the privileges of the proxied_user account, but proxied_user itself cannot be used to connect.

For alternative methods of protecting proxied accounts against direct use, see Preventing Direct Login to Proxied Accounts.

\subsection*{8.4.1.10 Socket Peer-Credential Pluggable Authentication}

The server-side auth_socket authentication plugin authenticates clients that connect from the local host through the Unix socket file. The plugin uses the SO_PEERCRED socket option to obtain information about the user running the client program. Thus, the plugin can be used only on systems that support the SO_PEERCRED option, such as Linux.

The source code for this plugin can be examined as a relatively simple example demonstrating how to write a loadable authentication plugin.

The following table shows the plugin and library file names. The file must be located in the directory named by the plugin_dir system variable.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.25 Plugin and Library Names for Socket Peer-Credential Authentication}
\begin{tabular}{|l|l|}
\hline Plugin or File & Plugin or File Name \\
\hline Server-side plugin & auth_socket \\
\hline Client-side plugin & None, see discussion \\
\hline Library file & auth_socket . so \\
\hline
\end{tabular}
\end{table}

The following sections provide installation and usage information specific to socket pluggable authentication:
- Installing Socket Pluggable Authentication
- Uninstalling Socket Pluggable Authentication
- Using Socket Pluggable Authentication

For general information about pluggable authentication in MySQL, see Section 8.2.17, "Pluggable Authentication".

\section*{Installing Socket Pluggable Authentication}

This section describes how to install the socket authentication plugin. For general information about installing plugins, see Section 7.6.1, "Installing and Uninstalling Plugins".

To be usable by the server, the plugin library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup.

To load the plugin at server startup, use the --plugin-load-add option to name the library file that contains it. With this plugin-loading method, the option must be given each time the server starts. For example, put these lines in the server my.cnf file:
```
[mysqld]
plugin-load-add=auth_socket.so
```


After modifying my.cnf, restart the server to cause the new settings to take effect.
Alternatively, to load the plugin at runtime, use this statement:
```
INSTALL PLUGIN auth_socket SONAME 'auth_socket.so';
```


INSTALL PLUGIN loads the plugin immediately, and also registers it in the mysql.plugins system table to cause the server to load it for each subsequent normal startup without the need for - -plugin-load-add.

To verify plugin installation, examine the Information Schema PLUGINS table or use the SHOW PLUGINS statement (see Section 7.6.2, "Obtaining Server Plugin Information"). For example:
```
mysql> SELECT PLUGIN_NAME, PLUGIN_STATUS
    FROM INFORMATION_SCHEMA.PLUGINS
    WHERE PLUGIN_NAME LIKE '%socket%';
+--------------+---------------+
| PLUGIN_NAME | PLUGIN_STATUS |
+--------------+----------------+
| auth_socket | ACTIVE |
+--------------+----------------+
```


If the plugin fails to initialize, check the server error log for diagnostic messages.
To associate MySQL accounts with the socket plugin, see Using Socket Pluggable Authentication.

\section*{Uninstalling Socket Pluggable Authentication}

The method used to uninstall the socket authentication plugin depends on how you installed it:
- If you installed the plugin at server startup using a --plugin-load-add option, restart the server without the option.
- If you installed the plugin at runtime using an INSTALL PLUGIN statement, it remains installed across server restarts. To uninstall it, use UNINSTALL PLUGIN:
```
UNINSTALL PLUGIN auth_socket;
```


\section*{Using Socket Pluggable Authentication}

The socket plugin checks whether the socket user name (the operating system user name) matches the MySQL user name specified by the client program to the server. If the names do not match, the plugin checks whether the socket user name matches the name specified in the authentication_string column of the mysql. user system table row. If a match is found, the plugin permits the connection. The authentication_string value can be specified using an IDENTIFIED ...AS clause with CREATE USER or ALTER USER.

Suppose that a MySQL account is created for an operating system user named valerie who is to be authenticated by the auth_socket plugin for connections from the local host through the socket file:

CREATE USER 'valerie'@'localhost' IDENTIFIED WITH auth_socket;
If a user on the local host with a login name of stefanie invokes mysql with the option -user=valerie to connect through the socket file, the server uses auth_socket to authenticate the client. The plugin determines that the --user option value (valerie) differs from the client user's name (stephanie) and refuses the connection. If a user named valerie tries the same thing,
the plugin finds that the user name and the MySQL user name are both valerie and permits the connection. However, the plugin refuses the connection even for valerie if the connection is made using a different protocol, such as TCP/IP.

To permit both the valerie and stephanie operating system users to access MySQL through socket file connections that use the account, this can be done two ways:
- Name both users at account-creation time, one following CREATE USER, and the other in the authentication string:
```
CREATE USER 'valerie'@'localhost' IDENTIFIED WITH auth_socket AS 'stephanie';
```

- If you have already used CREATE USER to create the account for a single user, use ALTER USER to add the second user:
```
CREATE USER 'valerie'@'localhost' IDENTIFIED WITH auth_socket;
ALTER USER 'valerie'@'localhost' IDENTIFIED WITH auth_socket AS 'stephanie';
```


To access the account, both valerie and stephanie specify--user=valerie at connect time.

\subsection*{8.4.1.11 WebAuthn Pluggable Authentication}

\section*{Note}

WebAuthn authentication is an extension included in MySQL Enterprise Edition, a commercial product. To learn more about commercial products, see https:// www.mysql.com/products/.

MySQL Enterprise Edition supports an authentication method that enables users to authenticate to MySQL Server using WebAuthn authentication.

WebAuthn stands for Web Authentication, which is a web standard published by the World Wide Web Consortium (W3C) and web application APIs that add FIDO-based authentication to supported browsers and platforms.

WebAuthn pluggable authentication replaces FIDO pluggable authentication, which is deprecated. WebAuthn pluggable authentication supports both FIDO and FIDO2 devices.

WebAuthn pluggable authentication provides these capabilities:
- WebAuthn enables authentication to MySQL Server using devices such as smart cards, security keys, and biometric readers.
- Because authentication can occur other than by providing a password, WebAuthn enables passwordless authentication.
- On the other hand, device authentication is often used in conjunction with password authentication, so WebAuthn authentication can be used to good effect for MySQL accounts that use multifactor authentication; see Section 8.2.18, "Multifactor Authentication".

The following table shows the plugin and library file names. The file name suffix might differ on your system. Common suffixes are . so for Unix and Unix-like systems, and .dll for Windows. The file must be located in the directory named by the plugin_dir system variable. For installation information, see Installing WebAuthn Pluggable Authentication.

\begin{table}
\captionsetup{labelformat=empty}
\caption{Table 8.26 Plugin and Library Names for WebAuthn Authentication}
\begin{tabular}{|l|l|}
\hline Plugin or File & Plugin or File Name \\
\hline Server-side plugin & authentication_webauthn \\
\hline Client-side plugin & authentication_webauthn_client \\
\hline
\end{tabular}
\end{table}

\begin{tabular}{|l|l|}
\hline Plugin or File & Plugin or File Name \\
\hline Library file & \begin{tabular}{l} 
authentication_webauthn. so, \\
authentication_webauthn_client. so
\end{tabular} \\
\hline
\end{tabular}

\section*{Note}

A libfido2 library must be available on systems where either the server-side or client-side WebAuthn authentication plugin is used.

The server-side WebAuthn authentication plugin is included only in MySQL Enterprise Edition. It is not included in MySQL community distributions. The client-side plugin is included in all distributions, including community distributions, which enables clients from any distribution to connect to a server that has the server-side plugin loaded.

The following sections provide installation and usage information specific to WebAuthn pluggable authentication:
- Installing WebAuthn Pluggable Authentication
- Using WebAuthn Authentication
- WebAuthn Passwordless Authentication
- Device Unregistration for WebAuthn
- How WebAuthn Authentication of MySQL Users Works

For general information about pluggable authentication in MySQL, see Section 8.2.17, "Pluggable Authentication".

\section*{Installing WebAuthn Pluggable Authentication}

This section describes how to install the server-side WebAuthn authentication plugin. For general information about installing plugins, see Section 7.6.1, "Installing and Uninstalling Plugins".

To be usable by the server, the plugin library file must be located in the MySQL plugin directory (the directory named by the plugin_dir system variable). If necessary, configure the plugin directory location by setting the value of plugin_dir at server startup.

The server-side plugin library file base name is authentication_webauthn. The file name suffix differs per platform (for example, . so for Unix and Unix-like systems, . dll for Windows).

Before installing the server-side plugin, define a unique name for the relying party ID (used for device registration and authentication), which is the MySQL server. Start the server using the --loose-authentication-webauthn-rp-id=value option. The example here specifies the value mysql. com as the relying party ID. Replace this value with one that satisfies your requirements.
```
$> mysqld [options] --loose-authentication-webauthn-rp-id=mysql.com
```


\section*{Note}

For replication, use the same authentication_webauthn_rp_id value on all nodes if a user is expected to connect to multiple servers.

To define the relying party and load the plugin at server startup, use the --plugin-load-add option to name the library file that contains it, adjusting the .so suffix for your platform as necessary. With this plugin-loading method, the option must be given each time the server starts.
```
$> mysqld [options]
    --loose-authentication-webauthn-rp-id=mysql.com
    --plugin-load-add=authentication_webauthn.so
```


To define the relying party and load the plugin, put lines such as this in your my.cnf file, adjusting the . so suffix for your platform as necessary:
```
[mysqld]
plugin-load-add=authentication_webauthn.so
authentication_webauthn_rp_id=mysql.com
```


After modifying my.cnf, restart the server to cause the new setting to take effect.
Alternatively, to load the plugin at runtime, use this statement, adjusting the . so suffix for your platform as necessary:
```
INSTALL PLUGIN authentication_webauthn
    SONAME 'authentication_webauthn.so';
```


INSTALL PLUGIN loads the plugin immediately, and also registers it in the mysql.plugins system table to cause the server to load it for each subsequent normal startup without the need for - -plugin-load-add.

To verify plugin installation, examine the Information Schema PLUGINS table or use the SHOW PLUGINS statement (see Section 7.6.2, "Obtaining Server Plugin Information"). For example:
```
mysql> SELECT PLUGIN_NAME, PLUGIN_STATUS
    FROM INFORMATION_SCHEMA.PLUGINS
    WHERE PLUGIN_NAME = 'authentication_webauthn';
+--------------------------+---------------+
| PLUGIN_NAME | PLUGIN_STATUS |
+--------------------------+---------------+
| authentication_webauthn | ACTIVE |
+--------------------------+--------------+
```


If a plugin fails to initialize, check the server error log for diagnostic messages.
To associate MySQL accounts with the WebAuthn authentication plugin, see Using WebAuthn Authentication.

\section*{Using WebAuthn Authentication}

WebAuthn authentication typically is used in the context of multifactor authentication (see Section 8.2.18, "Multifactor Authentication"). This section shows how to incorporate WebAuthn devicebased authentication into a multifactor account, using the authentication_webauthn plugin.

It is assumed in the following discussion that the server is running with the server-side WebAuthn authentication plugin enabled, as described in Installing WebAuthn Pluggable Authentication, and that the client-side WebAuthn plugin is available in the plugin directory on the client host.

\section*{Note}

On Windows, WebAuthn authentication only functions if the client process runs as a user with administrator privileges. It might also be necessary to add the location of your FIDO/FIDO2 device to the client host' PATH environment variable.

It is also assumed that WebAuthn authentication is used in conjunction with non-WebAuthn authentication (which implies a 2FA or 3FA account). WebAuthn can also be used by itself to create 1FA accounts that authenticate in a passwordless manner. In this case, the setup process differs somewhat. For instructions, see WebAuthn Passwordless Authentication.

An account that is configured to use the authentication_webauthn plugin is associated with a Fast Identity Online (FIDO/FIDO2) device. Because of this, a one-time device registration step is required before WebAuthn authentication can occur. The device registration process has these characteristics:
- Any FIDO/FIDO2 device associated with an account must be registered before the account can be used.
- Registration requires that a FIDO/FIDO2 device be available on the client host, or registration fails.
- The user is expected to perform the appropriate FIDO/FIDO2 device action when prompted during registration (for example, touching the device or performing a biometric scan).
- To perform device registration, the client user must invoke the mysql client program and specify the --register-factor option to specify the factor or factors for which a device is being registered. For example, if the account is set to use WebAuthn as the second authentication factor, the user invokes mysql with the --register-factor=2 option.
- If the user account is configured with the authentication_webauthn plugin set as the second or third factor, authentication for all preceding factors must succeed before the registration step can proceed.
- The server knows from the information in the user account whether the FIDO/FIDO2 device requires registration or has already been registered. When the client program connects, the server places the client session in sandbox mode if the device must be registered, so that registration must occur before anything else can be done. Sandbox mode used for FIDO/FIDO2 device registration is similar to that used for handling of expired passwords. See Section 8.2.16, "Server Handling of Expired Passwords".
- In sandbox mode, no statements other than ALTER USER are permitted. Registration is performed using forms of this statement. When invoked with the --register-factor option, the mysql client generates the ALTER USER statements required to perform registration. After registration has been accomplished, the server switches the session out of sandbox mode, and the client can proceed normally. For information about the generated ALTER USER statements, refer to the --registerfactor description.
- When device registration has been performed for the account, the server updates the mysql.user system table row for that account to update the device registration status and to store the public key and credential ID. (The server does not retain the credential ID following FIDO2 device registration.)
- The registration step can be performed only by the user named by the account. If one user attempts to perform registration for another user, an error occurs.
- The user should use the same FIDO/FIDO2 device during registration and authentication. If, after registering a FIDO/FIDO2 device on the client host, the device is reset or a different device is inserted, authentication fails. In this case, the device associated with the account must be unregistered and registration must be done again.

Suppose that you want an account to authenticate first using the caching_sha2_password plugin, then using the authentication_webauthn plugin. Create a multifactor account using a statement like this:
```
CREATE USER 'u2'@'localhost'
    IDENTIFIED WITH caching_sha2_password
        BY 'sha2_password'
    AND IDENTIFIED WITH authentication_webauthn;
```


To connect, supply the factor 1 password to satisfy authentication for that factor, and to initiate registration of the FIDO/FIDO2 device, set the --register-factor to factor 2.
```
$> mysql --user=u2 --password1 --register-factor=2
Enter password: (enter factor 1 password)
Please insert FIDO device and follow the instruction. Depending on the device,
you may have to perform gesture action multiple times.
1. Perform gesture action (Skip this step if you are prompted to enter device PIN).
2. Enter PIN for token device:
3. Perform gesture action for registration to complete.
Welcome to the MySQL monitor. Commands end with ; or \g.
```

```
Your MySQL connection id is 8
```


After the factor 1 password is accepted, the client session enters sandbox mode so that device registration can be performed for factor 2 . During registration, you are prompted to perform the appropriate FIDO/FIDO2 device action, such as touching the device or performing a biometric scan.

After registering the device, you can authenticate to connect.
```
$> mysql --user=u2 --password1 --execute "SELECT CURRENT_USER();"
Enter password: (enter factor 1 password)
Please insert FIDO device and perform gesture action for authentication to complete.
+-----------------+
| CURRENT_USER() |
+-----------------+
| u2@127.0.0.1 |
+-----------------+
```


When authenticating, you have the option to invoke the mysql client program and specify the -plugin-authentication-webauthn-client-preserve-privacy option.

The --plugin-authentication-webauthn-client-preserve-privacy option is suitable for the following scenarios:
- You have privacy concerns that are addressed by using this option.
- A user needs to use the same device for multiple logins on a given MySQL server.
- You want to enhance optimization by only sending the information that is necessary.

If the FIDO2 device contains multiple discoverable credentials (resident keys) for a given relying party (RP) ID, this option permits choosing a key to be used for assertion. By default, the option is set to FALSE, indicating that assertions are to be created using all resident keys for a given RP ID. When specified with this option, mysql prompts you for a device PIN and lists all of the available credentials for given RP ID. Select one key and then perform the remaining online instructions to complete the authentication. The example here assumes that mysql. com is a valid RP ID:
```
$> mysql --user=u2 --password1 --plugin-authentication-webauthn-client-preserve-privacy --execute "SELE
mysql: [Warning] Using a password on the command line interface can be insecure.
2. Enter PIN for token device:
Found following credentials for RP ID: mysql.com
[1] ˋu2 ˋ@ˋ127.0.0.1ˋ
[2] ˋu2 ˋ@ˋ%ˋ
Please select one(1...N):
1
Please insert FIDO device and perform gesture action for authentication to complete.
+-----------------+
| CURRENT_USER() |
+-----------------+
| u2@127.0.0.1 |
+-----------------+
```


The --plugin-authentication-webauthn-client-preserve-privacy option has no effect on FIDO devices that do not support the resident-key feature.

When the registration process is complete, the connection to the server is permitted.

\section*{Note}

The connection to the server is permitted following registration regardless of additional authentication factors in the account's authentication chain. For example, if the account in the preceding example was defined with a third authentication factor (using non-WebAuthn authentication), the connection would be permitted after a successful registration without authenticating the third factor. However, subsequent connections would require authenticating all three factors.

\section*{WebAuthn Passwordless Authentication}

This section describes how WebAuthn can be used by itself to create 1FA accounts that authenticate in a passwordless manner. In this context, "passwordless" means that authentication occurs but uses a method other than a password, such as a security key or biometric scan. It does not refer to an account that uses a password-based authentication plugin for which the password is empty. That kind of "passwordless" is completely insecure and is not recommended.

The following prerequisites apply when using the authentication_webauthn plugin to achieve passwordless authentication:
- The user that creates a passwordless-authentication account requires the PASSWORDLESS_USER_ADMIN privilege in addition to the CREATE USER privilege.
- The first element of the authentication_policy value must be an asterisk (*) and not a plugin name. For example, the default authentication_policy value supports enabling passwordless authentication because the first element is an asterisk:
```
authentication_policy='*,,'
```


For information about configuring the authentication_policy value, see Configuring the Multifactor Authentication Policy.

To use authentication_webauthn as a passwordless authentication method, the account must be created with authentication_webauthn as the first factor authentication method. The INITIAL AUTHENTICATION IDENTIFIED BY clause must also be specified for the first factor (it is not supported with 2nd or 3rd factors). This clause specifies whether a randomly generated or userspecified password will be used for FIDO/FIDO2 device registration. After device registration, the server deletes the password and modifies the account to make authentication_webauthn the sole authentication method (the 1FA method).

The required CREATE USER syntax is as follows:
```
CREATE USER user
    IDENTIFIED WITH authentication_webauthn
    INITIAL AUTHENTICATION IDENTIFIED BY {RANDOM PASSWORD | 'auth_string'};
```


The following example uses the RANDOM PASSWORD syntax:
```
mysql> CREATE USER 'u1'@'localhost'
        IDENTIFIED WITH authentication_webauthn
        INITIAL AUTHENTICATION IDENTIFIED BY RANDOM PASSWORD;
+------+------------+----------------------+-------------
| user | host | generated password | auth_factor |
+------+------------+----------------------+-------------+
    | u1 | localhost | 9XHK]M[12rnD;VXyHzeF | 1 |
+------+------------+----------------------+------------+
```


To perform registration, the user must authenticate to the server with the password associated with the INITIAL AUTHENTICATION IDENTIFIED BY clause, either the randomly generated password, or the 'auth_string' value. If the account was created as just shown, the user executes this command and pastes in the preceding randomly generated password ( 9 XHK]M\{12rnD; VXyHzeF) at the prompt:
```
$> mysql --user=u1 --password --register-factor=2
Enter password:
Please insert FIDO device and follow the instruction. Depending on the device,
you may have to perform gesture action multiple times.
1. Perform gesture action (Skip this step if you are prompted to enter device PIN).
2. Enter PIN for token device:
3. Perform gesture action for registration to complete.
Welcome to the MySQL monitor. Commands end with ; or \g.
Your MySQL connection id is 10
```


The option --register-factor=2 is used because the INITIAL AUTHENTICATION IDENTIFIED BY clause is currently acting as the first factor authentication method. The user must therefore provide
the temporary password by using the second factor. On a successful registration, the server removes the temporary password and revises the account entry in the mysql. user system table to list authentication_webauthn as the sole ( 1 FA ) authentication method.

When creating a passwordless-authentication account, it is important to include the INITIAL AUTHENTICATION IDENTIFIED BY clause in the CREATE USER statement. The server accepts a statement without the clause, but the resulting account is unusable because there is no way to connect to the server to register the device. Suppose that you execute a statement like this:
```
CREATE USER 'u2'@'localhost'
    IDENTIFIED WITH authentication_webauthn;
```


Subsequent attempts to use the account to connect fail like this:
```
$> mysql --user=u2 --skip-password
mysql: [Warning] Using a password on the command line can be insecure.
No FIDO device on client host.
ERROR 1 (HY000): Unknown MySQL error
```


After registering the device, you can authenticate to connect.
```
$> mysql --user=u1 --password --execute "SELECT CURRENT_USER();"
Please insert FIDO device and perform gesture action for authentication to complete.
+-----------------+
| CURRENT_USER() |
+-----------------+
| u1@127.0.0.1 |
+-----------------+
```


Alternatively, use the --plugin-authentication-webauthn-client-preserve-privacy option to select a discoverable credential for authentication.
```
$> mysql --user=u1 --password --plugin-authentication-webauthn-client-preserve-privacy --execute "SELEC
Enter password:
Enter PIN for token device:
Found following credentials for RP ID: mysql.com
[1] ˋu1ˋ @ˋ127.0.0.1ˋ
[2] ˋu1 @ˋ%ˋ
Please select one(1...N):
1
Please insert FIDO device and perform gesture action for authentication to complete.
+-----------------+
| CURRENT_USER() |
+-----------------+
| u1@127.0.0.1 |
+-----------------+
```


\section*{Note}

Passwordless authentication is achieved using the Universal 2nd Factor (U2F) protocol, which does not support additional security measures such as setting a PIN on the device to be registered. It is therefore the responsibility of the device holder to ensure the device is handled in a secure manner.

